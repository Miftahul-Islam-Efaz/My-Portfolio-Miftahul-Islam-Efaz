/**
 * The typed boundary around the WebGL carousel.
 *
 * Everything under ./gl is untyped JavaScript, lifted from a standalone demo
 * and kept in that form on purpose - it is a Three.js render pipeline with its
 * own shader plumbing, and rewriting it in TypeScript would mean maintaining a
 * fork of it. So the loose typing lives HERE, in one file, and nothing outside
 * this module ever touches the raw engine. React components import these types
 * and only these types.
 */

export type Slots = {
  /** Eased position, in card slots. What is actually rendered this frame. */
  current: number;
  /** Where the ease is heading. Written by setProgress. */
  target: number;
};

export type CarouselHandle = {
  dispose: () => void;
  /** Position in card slots. Fractional values are valid - the helix is
   *  continuous, and the fraction is what produces the bend and streak. */
  setProgress: (value: number) => void;
  /** Stops the render loop without tearing down the GL context. */
  setPaused: (paused: boolean) => void;
  scroll: { state: Slots };
};

export type CreateCarouselOptions = {
  /** Fires when a different card settles at the centre of the frame. The
   *  argument is a SLOT index, not a project index - see slotToProject in
   *  DitherCarousel.tsx. */
  onActiveChange?: (slot: number) => void;
  /**
   * Fires when the card under the pointer changes, with the slot index, or a
   * negative value when the pointer is over no card.
   *
   * The hit test is a GPU readback: the scene renders card ids to an offscreen
   * buffer and reads the pixel under the cursor. There is no DOM element per
   * card to hover, which is why hover has to be reported out of the engine at
   * all rather than handled in React.
   */
  onHoverChange?: (slot: number) => void;
  /**
   * Fires on a click that resolves to a card, with the slot index and the
   * pointer's viewport coordinates. The coordinates are passed through because
   * the case study window's hero plate flies from the click point, and the card
   * itself has no DOM rect to fly from.
   *
   * Only fires for real clicks: a drag that travels further than
   * config.clickSlop is not one.
   */
  onCardActivate?: (slot: number, clientX: number, clientY: number) => void;
  /**
   * External scroll mode. The engine binds no wheel or touch listeners of its
   * own and moves only when setProgress is called, which is what lets a pinned
   * ScrollTrigger drive it and lets the page scroll past the section normally.
   */
  external?: boolean;
};

type CreateCarousel = (
  canvas: HTMLCanvasElement,
  options: CreateCarouselOptions
) => CarouselHandle;

/**
 * Hands the engine its images and captions.
 *
 * MUST be called before createCarousel. The scene reads these arrays once, at
 * construction, to build its card meshes and texture loads - a later call has
 * nothing to update. Both arrays are indexed by SLOT.
 */
export function setMedia(images: string[], projects: string[]): void {
  // @ts-ignore - untyped JS module; config.js exports live bindings.
  import('./gl/config.js').then((mod) => mod.setMedia(images, projects));
}

/* ==========================================================================
   MOBILE FRAMING

   WHY THIS IS HERE AND NOT IN THE CONFIG FILE

   The solve needs four numbers the engine owns - the camera's field of view,
   the helix radius, the card width and the current fog distances - and
   `config` is in scope here. Doing the arithmetic in src/config would mean
   copying those four values into a second file, where they would silently rot
   the first time anyone dragged a slider in the lil-gui panel. So the design
   decisions live in config/workCarouselMobile.ts and the FACTS stay in the
   engine, which is the only place that can be authoritative about them.

   WHY IT MUTATES `config` RATHER THAN PASSING AN OVERRIDE

   Mutating a shared config object is normally the wrong move, and it is the
   opposite of what config/deskStageMobile.ts does (which spreads and never
   mutates). It is right here because `config` IS this engine's designed
   extension point: gl/gui.js exists to mutate exactly these fields live, and
   scene.js re-reads most of them every frame precisely so that it can. Writing
   to it is using the seam that is already there rather than cutting a new one.

   The isolation is that this function is only ever CALLED on a mobile
   viewport. `config` is a per-page-load singleton, so a desktop visitor never
   executes a line of it and the pipeline runs on the numbers it shipped with.
   Pass a null frame and it returns without touching anything.

   ONE KNOWN LIMITATION, STATED PLAINLY: camera.position.z is read by scene.js
   ONCE, at construction (and thereafter only by the gui's onCameraChange), so
   this has to run BEFORE createCarousel and cannot re-solve afterwards. A
   phone rotated from portrait to landscape mid-visit keeps the portrait
   framing, which leaves the helix smaller than it could be - it does NOT crop,
   because the solve only ever pushes the camera back. Fixing that properly
   means exposing a reframe() from scene.js; it is deliberately not done here,
   because it would mean editing the render loop to solve a problem nobody has
   while the section is being looked at.
   ========================================================================== */

export type WorkMobileFrame = {
  widthFraction: number;
  minCameraZ: number;
  maxCameraZ: number;
};

export type WorkMobileGrain = {
  ditherScale: number;
};

/**
 * The seven fields of gl/config.js this module reads or writes, and nothing
 * else.
 *
 * A narrow view rather than Record<string, number>, which does not typecheck:
 * config also holds booleans (`snap`, `dither`, `entry`) and colour strings
 * (`ditherInk`, `background`), so an index signature of number does not
 * overlap it. Naming the fields is better than widening through `unknown`
 * anyway - it makes the blast radius of this function readable at a glance,
 * and it means a rename in config.js surfaces here as a type error instead of
 * as a silent undefined at runtime.
 */
type FramingFields = {
  cameraZ: number;
  fov: number;
  radius: number;
  cardWidth: number;
  fogNear: number;
  fogFar: number;
  ditherScale: number;
};

/* Multiplicative fog scaling is not idempotent, and React effects can run
   twice in development under StrictMode. Latched so a second call is a no-op
   rather than a helix lost in fog. */
let mobileApplied = false;

/**
 * Pushes the camera back until the front card fits the frame, and scales the
 * fog to match.
 *
 * MUST be awaited before createCarousel - see the note above.
 *
 * @param aspect  Canvas width / height. Pass the viewport's own ratio if the
 *                canvas has not been laid out yet; erring on the LARGER height
 *                errs toward a smaller aspect, which pushes the camera further
 *                back and under-fills rather than cropping.
 */
export async function applyMobileGl(
  frame: WorkMobileFrame | null,
  grain: WorkMobileGrain | null,
  aspect: number
): Promise<void> {
  if (!frame || mobileApplied) return;
  if (!Number.isFinite(aspect) || aspect <= 0) return;

  // @ts-ignore - untyped JS module.
  const mod = await import('./gl/config.js');
  const config: FramingFields = mod.config;

  /* Read the desktop geometry BEFORE writing anything - the fog scale is
     derived from the distance the fog was tuned against, so it has to be
     measured against the old cameraZ. */
  const desktopFront = config.cameraZ - config.radius;
  if (desktopFront <= 0) return;

  /* visibleWidth = 2 * distance * tan(fov / 2) * aspect, solved for the
     distance at which the card spans `widthFraction` of it. The fov is
     VERTICAL, which is the whole reason the width drifts with aspect. */
  const halfFov = Math.tan(((config.fov * Math.PI) / 180) / 2);
  const front = config.cardWidth / (2 * frame.widthFraction * halfFov * aspect);

  const cameraZ = Math.min(
    frame.maxCameraZ,
    Math.max(frame.minCameraZ, front + config.radius)
  );

  /* Fog is measured in world distance from the camera, so pushing the camera
     back without moving the fog would bring the whole recession forward - the
     near cards would arrive already hazed. Scaling both planes by the same
     ratio keeps the atmosphere sitting where it was tuned to sit, relative to
     the helix rather than to the camera. */
  const fogScale = (cameraZ - config.radius) / desktopFront;

  config.cameraZ = cameraZ;
  config.fogNear *= fogScale;
  config.fogFar *= fogScale;

  /* Cell size in device pixels - see the note in config/workCarouselMobile.ts.
     Read every frame by scene.js, so this takes effect even though it is
     written before construction. */
  if (grain) config.ditherScale = grain.ditherScale;

  mobileApplied = true;
}

/**
 * Loads the engine on demand.
 *
 * Three.js plus the shader pipeline is the single largest dependency on the
 * site. Importing it statically would put all of it in the first load for every
 * visitor, including the ones who never scroll to the work section, so it is
 * fetched only when this component mounts.
 */
export async function loadCarousel(): Promise<CreateCarousel> {
  // @ts-ignore - untyped JS module.
  const mod = await import('./gl/scene.js');
  return mod.createCarousel as CreateCarousel;
}
