'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORK_PROJECTS } from './workProjectsData';
import { WORK_THEME } from './workTheme';
import {
  loadCarousel,
  setMedia,
  type CarouselHandle,
} from './dither/engine';

/* Viewport heights of scroll per card. The helix is the only thing happening
   while this section is pinned, so it can afford to be slower than the old
   sliders - under about 0.6 the dither never gets time to resolve between
   cards and the whole effect reads as a blur. */
const SCROLL_PER_CARD = 0.9;

/* Which way the helix turns as the page scrolls down.

      1 = cards rise from the bottom of the frame
     -1 = cards descend from the top

   Flipping the sign is all that is needed - the start slot and the slot-to-
   project mapping below are both derived from it, so card 0 stays centred at
   the top of the section and the projects stay in order either way. */
const DIRECTION = -1;

/* How early the engine wakes up, as a fraction of the viewport. The entry
   animation is roughly a second long, so it needs a head start to have played
   out by the time the section is actually reached - resuming exactly on entry
   would show the cards snapping into place. */
const WAKE_MARGIN = '50% 0px 50% 0px';

/**
 * The work section's scroll presentation: a WebGL helix of project cards that
 * dissolve into an ordered dither as they recede.
 *
 * The engine came from a fullscreen demo that owned the wheel and never let
 * the page scroll. Here it runs in `external` mode instead - it listens to no
 * scroll input at all, and this component feeds it a position derived from a
 * pinned ScrollTrigger. That is what lets the section hand off cleanly to
 * Services underneath instead of trapping the page.
 *
 * Pin settings deliberately mirror the sliders they replaced: pinType
 * 'transform' rather than the default 'fixed', because a fixed pin is lifted
 * out of the normal flow and is NOT clipped by an ancestor's overflow:hidden -
 * which is what left the old cards painting over the next section.
 */
export default function DitherCarousel() {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const outer = outerRef.current;
    const stage = stageRef.current;
    if (!canvas || !outer || !stage) return;

    let cancelled = false;
    let handle: CarouselHandle | undefined;
    let trigger: ScrollTrigger | undefined;

    const count = WORK_PROJECTS.length;

    /* The engine reports the centred card as round(progress + count / 2) - the
       helix's front face is half a turn round from slot zero. So at progress 0
       it parks on card count/2 (card 4 of 8, Rene Architect Studio) rather
       than the first project.

       Offsetting by half a turn puts card 0 dead centre at the top of the
       section. The offset is signed by DIRECTION so that reversing the turn
       does not also change which card you land on: half a turn forwards and
       half a turn backwards both centre card 0, since the helix is a loop of
       `count` slots and the two differ by exactly one full turn. */
    const START_SLOT = (-count / 2) * DIRECTION;

    /**
     * Which project belongs in a given helix slot.
     *
     * Turning the helix backwards makes it visit slots in DESCENDING order
     * (0, 7, 6, 5 ...), so loading the projects in natural order would play
     * them back to front after the first card. Reversing the slot order
     * cancels that out, leaving the motion reversed but the projects in
     * order. Forwards, slots are visited ascending and this is the identity.
     */
    const slotToProject = (slot: number) =>
      DIRECTION < 0 ? (count - slot) % count : slot;

    /* Labels and images are indexed by SLOT, not by project order, so both have
       to go through the same mapping or the picture and the caption drift
       apart. */
    const bySlot = Array.from(
      { length: count },
      (_, slot) => WORK_PROJECTS[slotToProject(slot)]
    );

    setMedia(
      bySlot.map((project) => project.imageUrl),
      bySlot.map((project) => project.title)
    );

    /* Tracked outside the engine because the observer can fire before the
       dynamic import resolves. The engine starts its loop the moment it is
       constructed, so the desired state has to be applied on arrival. */
    let onScreen = false;

    /* The pipeline - blur chain, cursor trail, composite - costs the same
       whether the canvas is visible or not, and it was previously running from
       page load. That is a full GPU pipeline competing with Lenis for the frame
       budget for the entire time the visitor is in the hero, which is what made
       scrolling feel heavy well before this section. */
    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        handle?.setPaused(!onScreen);
      },
      { rootMargin: WAKE_MARGIN }
    );
    observer.observe(outer);

    loadCarousel().then((createCarousel) => {
      /* The dynamic import can resolve after a fast unmount. Without this the
         engine would build a full GL context against a detached canvas and
         leak it, since the cleanup below has already run. */
      if (cancelled) return;

      handle = createCarousel(canvas, {
        external: true,
        /* The engine reports a slot; the list below is in project order. */
        onActiveChange: (slot: number) => setActive(slotToProject(slot)),
      });

      /* Seed both ends of the lerp, not just the target. setProgress() only
         writes `target`, so on its own the first frame would still render at
         slot 0 and then visibly wind half a turn before the first scroll
         event arrives. */
      handle.scroll.state.current = START_SLOT;
      handle.scroll.state.target = START_SLOT;

      /* Catch up to whatever the observer decided while we were loading. */
      handle.setPaused(!onScreen);

      trigger = ScrollTrigger.create({
        trigger: outer,
        start: 'top top',
        end: () =>
          `+=${Math.round(window.innerHeight * SCROLL_PER_CARD * count)}`,
        pin: stage,
        pinSpacing: true,
        pinType: 'transform',
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /* Higher than the Services trigger below, so this one re-measures
           first. A pin earlier in the document shifts where every later
           trigger starts. */
        refreshPriority: 1,
        /* Written every frame. The engine eases toward it internally, so the
           motion keeps its inertia instead of following the scrub rigidly -
           and the derived velocity still drives the card bend and streak.

           DIRECTION flips the travel without touching the start, so the
           section still opens on card 0 and still covers every card once. */
        onUpdate: (self) =>
          handle?.setProgress(START_SLOT + DIRECTION * self.progress * count),
      });

      /* The canvas mounts at zero height until layout settles, and the pin
         distance is measured from the viewport. Re-measure once both are
         real, or the section pins against a stale height. */
      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      trigger?.kill();
      handle?.dispose();
    };
  }, []);

  return (
    <div ref={outerRef} className="relative z-10 w-full">
      {/* THE STAGE FIELD. This was `bg-black`. It is now WORK_THEME.bgVoid
          (#050505, --color-background) because three surfaces have to agree
          exactly or a hairline seam appears at the canvas edge: this div, the
          GL clear colour (`background` in dither/gl/config.js) and the section
          field in WebsiteProjectsShowcase.tsx. All three moved off pure black
          together, and they now also match the body background, which was
          #050505 all along. Change one without the other two and the seam is
          back. Inline rather than a Tailwind arbitrary value so workTheme.ts
          stays the single source of truth. */}
      <div
        ref={stageRef}
        className="relative h-[100svh] w-full overflow-hidden"
        style={{ backgroundColor: WORK_THEME.bgVoid }}
      >
        {/* Sized by CSS, not by width/height attributes - the engine reads
            clientWidth/clientHeight and drives the drawing buffer itself. */}
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Project list, in project order. The centred card's label inverts to
            a solid block, which is how the demo marks the active one.

            COLOURS COME FROM WORK_THEME, NOT FROM TAILWIND'S PALETTE.
            These were `bg-white text-black` and `text-white/70`, which read
            colder than the section around them. WORK_THEME now resolves to the
            site palette, so the inverted block is --color-primary (#F5F1E8)
            over --color-background and the inactive rows are --color-text.
            The inversion itself is unchanged; only the two ends of it are the
            palette's.

            Set as inline styles rather than Tailwind arbitrary values so the
            single source of truth stays workTheme.ts - the same reason the
            WORK title takes its ink from it. */}
        <div className="pointer-events-none absolute bottom-6 right-0 w-72 font-mono font-medium">
          {WORK_PROJECTS.map((project, index) => {
            const isActive = index === active;

            return (
              <p
                key={project.id}
                className="relative px-2 py-0.5 text-sm leading-none transition-colors duration-200"
                style={{
                  backgroundColor: isActive ? WORK_THEME.accent : 'transparent',
                  color: isActive ? WORK_THEME.bgVoid : WORK_THEME.textMid,
                }}
              >
                {/* The one place ember is allowed in this section: a single
                    point marking the centred card. workTheme.ts caps ember at
                    ~1% of visible surface and says points, never areas - so it
                    is a 4px dot OUTSIDE the off-white block rather than
                    anything tinted inside it, where it would fight the
                    inversion. */}
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-2.5 h-1 w-1 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: WORK_THEME.ember }}
                  />
                ) : null}
                {project.title}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
