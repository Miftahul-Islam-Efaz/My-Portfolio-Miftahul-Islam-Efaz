/* The WebGL engine under gl/ is plain JavaScript, ported verbatim from the
   dither-blur-carousel demo. It ships no type declarations, and this project
   does not have `allowJs` turned on.

   Rather than scatter @ts-ignore through the component - or retype ~2,000
   lines of shader plumbing that we do not otherwise need to touch - every
   untyped boundary is quarantined in this one file, and the rest of the app
   talks to the hand-written types below. */

// @ts-ignore - untyped JS module, see note above
import { setMedia as setMediaJs } from './gl/config.js';

/** Position along the helix, in card slots. A card sits dead centre at every
 *  whole number, so slot N is card N centred. */
export type Slots = number;

export type CarouselHandle = {
  /** Tears down the RAF loop, listeners, render targets and GPU resources. */
  dispose(): void;
  /** Host-driven position. The engine lerps toward this rather than snapping,
   *  so it is safe to write every frame from a scroll handler. */
  setProgress(value: Slots): void;
  /** Stops or restarts the render loop. The pipeline costs the same whether
   *  the canvas is on screen or not, so the host pauses it while the section
   *  is out of view. */
  setPaused(value: boolean): void;
  /** The raw scroll controller. Exposed so the host can seed the starting
   *  position directly: setProgress() only moves `target`, and the lerp would
   *  otherwise animate in from wherever `current` happens to start. */
  scroll: {
    state: {
      current: Slots;
      target: Slots;
    };
  };
};

export type CreateCarouselOptions = {
  /** Fired when the centred card changes - not every frame. */
  onActiveChange?: (index: number) => void;
  /** true  = the canvas listens to nothing and the host drives setProgress().
   *  false = upstream behaviour, the canvas swallows the wheel. Must be true
   *  on this site or the section traps the page scroll. */
  external?: boolean;
};

/** Point the engine at the cards to render. Must be called before
 *  createCarousel(), since the scene builds one mesh per image at construction
 *  time and never re-reads the arrays afterwards. */
export function setMedia(images: string[], projects: string[]): void {
  setMediaJs(images, projects);
}

/** three.js and the whole GL stack are browser-only and heavy. Loading the
 *  scene as a dynamic import keeps it out of the initial bundle and off the
 *  server, matching what the demo's Carousel.jsx did for the same reasons. */
export async function loadCarousel(): Promise<
  (canvas: HTMLCanvasElement, options?: CreateCarouselOptions) => CarouselHandle
> {
  // @ts-ignore - untyped JS module, see note above
  const mod = await import('./gl/scene.js');
  return mod.createCarousel;
}
