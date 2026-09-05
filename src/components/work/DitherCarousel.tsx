'use client';

import { driveImage } from '../../lib/driveImage';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORK_PROJECTS } from './workProjectsData';
import { WORK_THEME } from './workTheme';
import { getCaseStudy } from './caseStudyData';
import CardOpenCue from './CardOpenCue';
import ViewMoreCue from './ViewMoreCue';
import { useCaseStudyOverlay } from '@/hooks/useCaseStudyOverlay';
import { CUE } from '@/config/caseStudy';
import { WORK_GALLERY_MOTION } from '@/config/workGallery';
import { resolveWorkTuning } from '@/config/workCarouselMobile';
import { onWorkGalleryRequest } from '@/lib/workGalleryBus';
import type { WorkGallerySelection } from './WorkGalleryWindow';
import {
  loadCarousel,
  setMedia,
  applyMobileGl,
  type CarouselHandle,
} from './dither/engine';
/* Mobile-only layout for the project list. Every rule in it is inside a
   max-width media query, so this import is inert on desktop. */
import '../../styles/work-carousel-mobile.css';

/* The window is a few hundred lines of prose, a portal and a stylesheet's worth
   of layout that nobody sees until a card is clicked. Loaded on demand, and
   never on the server - it portals into document.body. */
const CaseStudyWindow = dynamic(
  () => import('./case-study/CaseStudyWindow'),
  { ssr: false }
);

/* Same reasoning as the case study window: a grid of full-size plates that
   nobody sees until they ask for it has no business in the first load. */
const WorkGalleryWindow = dynamic(
  () => import('./WorkGalleryWindow'),
  { ssr: false }
);

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

/* WHERE THE CUE IS ALLOWED TO EXIST, which is NOT the same span as where the
   engine is allowed to run - and folding the two onto one observer is what put
   the View more button over the vault.

   WAKE_MARGIN deliberately extends half a viewport past the section so the
   card entry animation has played out before the section is reached. Borrowing
   it for the cue meant the work section still counted as "on screen" for half a
   viewport AFTER it had left, which is exactly where the vault teaser sits.

   The negative bottom retires the cue slightly BEFORE the section's trailing
   edge, so the offer is gone by the time the next section owns the screen
   rather than handing over mid-fade. */
const CUE_MARGIN = '0px 0px -25% 0px';

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
 * MOBILE. Four things differ, all resolved through
 * config/workCarouselMobile.ts and none of them reachable on a desktop
 * viewport:
 *   - the camera is pushed back until the card fits the frame (see
 *     applyMobileGl in dither/engine.ts - at portrait aspect the card is
 *     otherwise WIDER than the entire visible frustum);
 *   - the pinned scroll budget shrinks, because a thumb moves far less
 *     document per gesture than a wheel;
 *   - the project list keeps its side of the frame but sizes to its content
 *     rather than to a 288px rail (styles/work-carousel-mobile.css);
 *   - the pin is anchored differently - see the long note on pinType at the
 *     trigger itself, which is the fix for the section bouncing as it
 *     scrolled.
 *
 * WHAT HOVER DOES NOW. Two effects used to fire together: the rack focus (the
 * card you point at stays clean while its neighbours dim and soften) and a
 * dithered cursor trail with a hover dither on top of it. The trail and the
 * hover dither are switched off in dither/gl/config.js - the grain that
 * remains is the depth treatment, which belongs to the recession rather than
 * to the pointer. What hover adds instead is the open cue: a small square that
 * follows the cursor and says the card can be opened.
 *
 * WHY THE OPEN CUE AND THE WINDOW LIVE HERE. This is the only component that
 * knows which card the engine has under the pointer - the hit test is a GPU
 * readback inside the scene, reported back through `onHoverChange`. The cue is
 * a DOM square parked on the cursor, and the window is a portal; neither can
 * live inside the GL layer, and neither should own hover state of its own.
 *
 * WHY THE GALLERY LIVES HERE TOO. Clicking a tile in the gallery opens a case
 * study, and `useCaseStudyOverlay` is the only thing that can open one - it is
 * also what pauses this helix while an opaque surface is over it. Putting the
 * gallery anywhere else would mean either a second copy of that hook or a
 * context wrapped round the whole document. The header cannot reach in here,
 * so it asks over lib/workGalleryBus.ts instead.
 */
export default function DitherCarousel() {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<CarouselHandle | undefined>(undefined);
  const [active, setActive] = useState(0);
  /* Project index under the pointer, or -1. Project index, not slot - every
     index that leaves the engine goes through slotToProject first. */
  const [hovered, setHovered] = useState(-1);
  const [pressed, setPressed] = useState(false);

  /* Touch or narrow viewport. Starts FALSE and is only ever set in an effect,
     which is deliberate: this renders on the server, where there is no
     viewport, and branching markup on a value the server cannot know is a
     hydration mismatch. The false start matches what the server emits, and the
     one thing it gates - the cursor-parked open cue - is invisible until a
     pointer hovers a card, so there is nothing to flash. */
  const [isMobile, setIsMobile] = useState(false);

  /* THE GALLERY. Two-phase like the case study overlay, for the same reason:
     the exit is an animation with somewhere to go, and unmounting on click
     would cut it off after one frame. */
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryClosing, setGalleryClosing] = useState(false);
  const galleryTimer = useRef<number | null>(null);

  /* THE VIEW MORE CUE. */
  const [cueVisible, setCueVisible] = useState(false);
  /* Mirrors of state for the same listener. Reading state directly would mean
     rebinding on every change. */
  const galleryOpenRef = useRef(false);
  const studyOpenRef = useRef(false);

  /* The helix is a full GPU pipeline. With an opaque window over it there is
     nothing to see, so it stops - the same reason the intersection observer
     pauses it when the section scrolls away. */
  const onOccludedChange = useCallback((occluded: boolean) => {
    handleRef.current?.setPaused(occluded);
    if (occluded) setHovered(-1);
  }, []);

  const overlay = useCaseStudyOverlay({ onOccludedChange });

  /* THE CONTROLLER OBJECT IS NEW ON EVERY RENDER - only its callbacks are
     stable. Anything downstream that depends on opening the window must depend
     on this, never on `overlay`, or it will change identity on every render.
     The effect that builds the GL context is downstream of exactly that, and
     rebuilding a WebGL pipeline sixty times a second renders nothing at all. */
  const requestOpen = overlay.open;

  /* Only cards with written prose can be opened, so the cue is suppressed for
     any card that has none rather than promising a window that would open
     empty. */
  const hoveredProject = hovered >= 0 ? WORK_PROJECTS[hovered] : undefined;
  const hoveredStudy = hoveredProject ? getCaseStudy(hoveredProject.id) : undefined;
  const openableHover = Boolean(hoveredStudy) && !overlay.openId;

  const openFrom = useCallback(
    (projectIndex: number, x: number, y: number) => {
      const project = WORK_PROJECTS[projectIndex];
      if (!project || !getCaseStudy(project.id)) return;

      /* The press turn plays out before the wipe starts, so the cue is seen to
         be pressed rather than simply disappearing. */
      setPressed(true);
      window.setTimeout(() => setPressed(false), CUE.pressDuration);
      requestOpen(project.id, { x, y });
    },
    [requestOpen]
  );

  /* Resolved once on mount. Only feeds the open cue below - the GL effect
     resolves its own copy, because it must not take a dependency on state. */
  useEffect(() => {
    setIsMobile(resolveWorkTuning(window.innerWidth).isMobile);
  }, []);

  /* ---------------------------- the gallery ---------------------------- */

  const openGallery = useCallback(() => {
    if (galleryTimer.current !== null) {
      window.clearTimeout(galleryTimer.current);
      galleryTimer.current = null;
    }
    setGalleryClosing(false);
    setGalleryOpen(true);
    /* DO NOT CLEAR cueVisible HERE. It was cleared when the cue was a
       one-shot offer that had now been taken. It is a permanent fixture,
       and the only thing that sets it true again is the IntersectionObserver
       - which fires on intersection changes, and opening an overlay is not
       one. So clearing it here retired the cue for good: enter the gallery
       once and it never returned.

       The render already hides it while either overlay is up, which is the
       correct place for that concern - it is a question about what is on top
       of the cue, not about whether the section wants one. */
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryClosing((already) => {
      if (already) return already;
      galleryTimer.current = window.setTimeout(() => {
        galleryTimer.current = null;
        setGalleryOpen(false);
        setGalleryClosing(false);
      }, WORK_GALLERY_MOTION.closeDuration);
      return true;
    });
  }, []);

  /* A tile click opens the study OVER the gallery - the gallery is not closed,
     so backing out of the study returns to the grid where it was left. */
  const openStudyFromGallery = useCallback(
    (selection: WorkGallerySelection) => {
      requestOpen(selection.id, { x: selection.x, y: selection.y });
    },
    [requestOpen]
  );

  /* The header asks for the gallery over a window event, because it cannot
     reach this component through the tree. */
  useEffect(() => onWorkGalleryRequest(openGallery), [openGallery]);

  /* Keep the mirrors honest for the wheel listener. */
  useEffect(() => {
    galleryOpenRef.current = galleryOpen;
  }, [galleryOpen]);

  useEffect(() => {
    studyOpenRef.current = Boolean(overlay.openId);
  }, [overlay.openId]);

  /* The helix is behind an opaque grid while the gallery is up, so it stops -
     same bargain as the case study window. It is only restarted if no study is
     open, or closing the gallery while a study is somehow still up would
     resume a pipeline nobody can see. */
  useEffect(() => {
    if (galleryOpen) {
      handleRef.current?.setPaused(true);
      setHovered(-1);
    } else if (!overlay.openId) {
      handleRef.current?.setPaused(false);
    }
  }, [galleryOpen, overlay.openId]);

  useEffect(
    () => () => {
      if (galleryTimer.current !== null) window.clearTimeout(galleryTimer.current);
    },
    []
  );

  /* ------------------------- the view more cue -------------------------
     The cue used to be EARNED: the pinned scroll had to run out and the
     visitor had to keep pushing down, and it retired itself on an idle timer.
     That machinery is gone. It is now a permanent fixture of this section,
     so its presence is simply "is the helix on screen" and the only thing
     that decides it is the IntersectionObserver below.

     Presence still has to be gated on SOMETHING, because the blob is
     position: fixed. Ungated it would sit in the corner of the hero, the
     vault and the footer, offering to open a gallery of work that is not
     on screen. */

  useEffect(() => {
    const canvas = canvasRef.current;
    const outer = outerRef.current;
    const stage = stageRef.current;
    if (!canvas || !outer || !stage) return;

    let cancelled = false;
    let handle: CarouselHandle | undefined;
    let trigger: ScrollTrigger | undefined;

    const count = WORK_PROJECTS.length;

    /* Resolved here rather than read from state, because this effect must not
       take a dependency on anything that changes after mount - see the
       dependency note at the bottom. */
    const tuning = resolveWorkTuning(window.innerWidth);

    /* CACHED, NOT READ LIVE, AND THIS IS HALF THE FIX FOR THE MOBILE JUMP.

       `end` and the dwell arithmetic below both used to read
       window.innerHeight at call time. On a phone that value CHANGES DURING
       THE SCROLL: the URL bar collapses on the first downward gesture and
       innerHeight grows by ~60-100px. With invalidateOnRefresh set, GSAP
       re-evaluates `end` on its own resize listener, so the pin length was
       being recomputed mid-sweep - and because pinSpacing pushes the document,
       everything below shifted under the reader.

       Cached once, after layout, so the pin length is a constant for the life
       of the trigger. Re-cached only on a real orientation change below.
       (ScrollTrigger.config({ ignoreMobileResize: true }) in useRakeLight.ts
       suppresses GSAP's own refresh on the same event, but that is a global
       set by a different module - this does not depend on it having run.)

       The other half is pinType, below. */
    let pinHeight = window.innerHeight;

    /* The engine reports the centred card as round(progress + count / 2) - the
       helix's front face is half a turn round from slot zero. So at progress 0
       it parks on card count/2 rather than the first project.

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
      bySlot.map((project) => driveImage(project.imageUrl)),
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
        if (!onScreen) setHovered(-1);
      },
      { rootMargin: WAKE_MARGIN }
    );
    observer.observe(outer);

    /* THE CUE'S ENTIRE VISIBILITY RULE, on its own margin. Setting it every
       callback is safe: React bails out of a re-render when the value is
       unchanged, and this fires on threshold crossings, not per frame. */
    const cueObserver = new IntersectionObserver(
      (entries) => {
        setCueVisible(entries[entries.length - 1].isIntersecting);
      },
      { rootMargin: CUE_MARGIN }
    );
    cueObserver.observe(outer);

    /* THE FRAMING SOLVE MUST LAND BEFORE THE SCENE IS CONSTRUCTED.

       scene.js copies config.cameraZ onto the camera once, at construction, so
       applying it afterwards would do nothing until the gui touched it. Hence
       Promise.all rather than chaining: both the engine module and the config
       write have to be settled before createCarousel runs.

       The aspect is taken from the viewport rather than the canvas because the
       canvas can still be at zero height this early. innerHeight is the LARGE
       viewport where the stage is sized in svh, so this errs slightly small on
       aspect - which pushes the camera a little further back than strictly
       needed. That is the safe direction: under-filled, never cropped.

       On desktop `tuning.frame` is null and applyMobileGl returns immediately
       without importing or writing anything. */
    Promise.all([
      loadCarousel(),
      applyMobileGl(
        tuning.frame,
        tuning.grain,
        window.innerWidth / Math.max(1, window.innerHeight)
      ),
    ]).then(([createCarousel]) => {
      /* The dynamic import can resolve after a fast unmount. Without this the
         engine would build a full GL context against a detached canvas and
         leak it, since the cleanup below has already run. */
      if (cancelled) return;

      handle = createCarousel(canvas, {
        external: true,
        /* The engine reports a slot; the list below is in project order. */
        onActiveChange: (slot: number) => setActive(slotToProject(slot)),
        /* -1 when the pointer is over no card at all. */
        onHoverChange: (slot: number) =>
          setHovered(slot < 0 ? -1 : slotToProject(slot)),
        /* A click on a card, with the pointer position it happened at - the
           window's hero plate flies from there. */
        onCardActivate: (slot: number, x: number, y: number) =>
          openFrom(slotToProject(slot), x, y),
      });
      handleRef.current = handle;

      /* Seed both ends of the lerp, not just the target. setProgress() only
         writes `target`, so on its own the first frame would still render at
         slot 0 and then visibly wind half a turn before the first scroll
         event arrives. */
      handle.scroll.state.current = START_SLOT;
      handle.scroll.state.target = START_SLOT;

      /* Catch up to whatever the observer decided while we were loading. */
      handle.setPaused(!onScreen);

      /* Viewport heights of pinned scroll. Mobile spends less per card - a
         thumb swipe moves far less document than a wheel notch, so the desktop
         budget reads as the page having jammed. See
         config/workCarouselMobile.ts. */
      const { perCard, cueDwell } = tuning.scroll;

      trigger = ScrollTrigger.create({
        trigger: outer,
        start: 'top top',
        end: () => `+=${Math.round(pinHeight * (perCard * count + cueDwell))}`,
        pin: stage,
        pinSpacing: true,
        /* ===============================================================
           THE OTHER HALF OF THE MOBILE JUMP FIX, AND A DELIBERATE REVERSAL
           OF AN EARLIER DECISION IN THIS FILE.

           This used to be 'transform' unconditionally, with a comment saying
           it must never be 'fixed' because a fixed element is lifted out of
           the normal flow and is therefore NOT clipped by an ancestor's
           overflow:hidden - which was what once left cards painting over the
           next section.

           THAT REASONING DOES NOT APPLY HERE, and it is worth writing down
           why so it is not "restored" later. The overflow:hidden that clips
           this section is on `.work-stage` ITSELF - the very element being
           pinned - not on an ancestor. Overflow clipping is a property of an
           element's own box, so it travels with the element regardless of how
           it is positioned. Nothing above it clips: `#projects`, the wrapper
           div and `<main>` are all plain static boxes. Nor does any ancestor
           carry a transform, filter, perspective or contain, which is the
           other way a fixed pin goes wrong - it would be positioned against
           that ancestor instead of the viewport.

           WHY IT HAD TO CHANGE. On a touch device native scrolling is driven
           by the compositor thread, but a transform pin is repositioned by
           JavaScript on `scroll` events, which are delivered on the main
           thread AFTER the compositor has already painted the frame. The
           pinned stage therefore trails the page by a frame or two on every
           frame of a momentum scroll, which is seen as the whole section
           bouncing. A fixed pin is anchored by the compositor itself and does
           not move between frames, so there is nothing left to lag.

           Desktop keeps 'transform': there the scroll is Lenis-driven on the
           main thread, so the pin and the scroll are already in the same
           frame and a transform pin composites more cheaply. The rake makes
           the same split for the same reason - see useRakeLight.ts.
           =============================================================== */
        pinType: tuning.isMobile ? 'fixed' : 'transform',
        /* anticipatePin asks GSAP to pin slightly EARLY, using scroll velocity
           to predict the crossing - it hides the one-frame gap a transform pin
           has at engagement. A fixed pin has no such gap, so on mobile the
           prediction has nothing to hide and becomes its own artefact: a flick
           has far higher instantaneous velocity than a wheel, so the estimate
           overshoots and the section visibly snaps into place ahead of the
           scroll. Off on touch, kept on desktop. */
        anticipatePin: tuning.isMobile ? 0 : 1,
        invalidateOnRefresh: true,
        /* Higher than the Services trigger below, so this one re-measures
           first. A pin earlier in the document shifts where every later
           trigger starts. Must stay BELOW the rake's priority of 2, since the
           rake pins earlier in the document still. */
        refreshPriority: 1,
        /* Written every frame. The engine eases toward it internally, so the
           motion keeps its inertia instead of following the scrub rigidly -
           and the derived velocity still drives the card bend and streak.

           DIRECTION flips the travel without touching the start, so the
           section still opens on card 0 and still covers every card once. */
        onUpdate: (self) => {
          /* The pin is now longer than the helix by the dwell, so scroll
             progress and helix progress are no longer the same number.
             Everything the cards do is driven by the first stretch; the tail
             is the hold, and the helix simply stays at its last frame.

             pinHeight, not window.innerHeight - the same cached value `end`
             uses. If these two disagreed, the hold would be measured against
             a different viewport than the pin was built from and the cue's
             timing would drift as the URL bar moved. */
          const total = self.end - self.start;
          const dwellPx = Math.round(pinHeight * cueDwell);
          const span = total > dwellPx ? (total - dwellPx) / total : 1;

          const helix = Math.min(1, self.progress / span);
          const next = START_SLOT + DIRECTION * helix * count;
          /* MOBILE: linear tracking - the cards sit exactly where the
             scroll is. The engine eases toward its target internally, so
             both ends of the lerp are written, same trick as the START_SLOT
             seed above. Desktop keeps the inertia. */
          if (tuning.isMobile && handle) {
            handle.scroll.state.current = next;
            handle.scroll.state.target = next;
          } else {
            handle?.setProgress(next);
          }

          /* How far into the hold we are, 0 to 1. */
          const dwell =
            span < 1 ? Math.max(0, (self.progress - span) / (1 - span)) : 0;

          /* THE END ZONE IS NO LONGER TRACKED AT ALL. It existed only to
             decide when to offer the cue, and the cue is permanent now -
             the IntersectionObserver is its single source of truth. Anything
             here that touched cue visibility was, by definition, a second
             source disagreeing with the first. */
        },
      });

      /* The canvas mounts at zero height until layout settles, and the pin
         distance is measured from the viewport. Re-measure once both are
         real, or the section pins against a stale height. */
      ScrollTrigger.refresh();
    });

    /* A REAL rotation, not a URL-bar collapse. This is the one event on which
       the cached pin height genuinely must change, and orientationchange fires
       for it specifically - unlike resize, which fires for browser chrome
       moving and is exactly what the cache exists to ignore.

       Deferred because the viewport dimensions are not final when the event
       fires; reading immediately gives the pre-rotation size on most mobile
       browsers. */
    let rotateTimer: number | null = null;
    const onOrientation = () => {
      if (rotateTimer !== null) window.clearTimeout(rotateTimer);
      rotateTimer = window.setTimeout(() => {
        rotateTimer = null;
        pinHeight = window.innerHeight;
        ScrollTrigger.refresh();
      }, 240);
    };
    window.addEventListener('orientationchange', onOrientation);

    return () => {
      cancelled = true;
      if (rotateTimer !== null) window.clearTimeout(rotateTimer);
      window.removeEventListener('orientationchange', onOrientation);
      observer.disconnect();
      cueObserver.disconnect();
      trigger?.kill();
      handle?.dispose();
      handleRef.current = undefined;
    };
    /* NOTHING THAT CHANGES IDENTITY PER RENDER MAY GO IN THIS LIST. This
       effect builds a WebGL context, an IntersectionObserver and a pinned
       ScrollTrigger. If it re-runs, all three are torn down and rebuilt, the
       START_SLOT seed written onto scroll.state is thrown away, and the entry
       animation never gets the second it needs to finish - which shows up as a
       black canvas parked on whichever card sits at progress 0.

       openFrom is memoised against the overlay's `open`, which the hook
       memoises with an empty dependency list, so it is stable for the life of
       the component and this runs exactly once. Do not put `overlay` here.
       The cue's setState calls above are React's own stable setters, which is
       why feeding it from onUpdate does not add a dependency. AND DO NOT PUT
       `isMobile` HERE either - the tuning is resolved from window.innerWidth
       inside the effect precisely so that this list can stay empty of it. */
  }, [openFrom]);

  const openStudy = overlay.openId ? getCaseStudy(overlay.openId) : undefined;

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
          stays the single source of truth.

          `work-stage` carries no styling of its own - it exists so the mobile
          stylesheet can qualify its selectors against an ancestor and win on
          specificity rather than on bundler-dependent sheet order.

          THE `overflow-hidden` HERE IS LOAD-BEARING FOR THE MOBILE PIN. It is
          on the pinned element itself, which is why that pin can safely be
          position:fixed on touch - the clip travels with the element. Moving
          this to an ancestor would break that; see the pinType note above. */}
      <div
        ref={stageRef}
        className="work-stage relative h-[100svh] w-full overflow-hidden"
        style={{ backgroundColor: WORK_THEME.bgVoid }}
      >
        {/* Sized by CSS, not by width/height attributes - the engine reads
            clientWidth/clientHeight and drives the drawing buffer itself. */}
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Project list, in project order. The centred card's label inverts to
            a solid block, which is how the demo marks the active one.

            NOW ALSO THE KEYBOARD PATH INTO A CASE STUDY. The cards are eight
            planes on a helix inside a canvas - there is nothing there to tab
            to, and a hit test on a GPU readback cannot be given a focus ring.
            These rows can: each one opens the same window the card does, from
            its own position on screen. That is why the container no longer
            sets pointer-events: none.

            ON TOUCH THEY ARE ALSO THE RELIABLE PATH. The card hit test is a
            GPU readback keyed to a hovering pointer, which a finger does not
            provide, so these rows are how a case study gets opened on a phone.
            They stay on this side of the frame there, but size to their own
            content instead of to the 288px `w-72` rail - which on a 390px
            screen is 74% of the width and is what put them over the artwork.
            See styles/work-carousel-mobile.css.

            COLOURS COME FROM WORK_THEME, NOT FROM TAILWIND'S PALETTE.
            These were `bg-white text-black` and `text-white/70`, which read
            colder than the section around them. WORK_THEME now resolves to the
            site palette, so the inverted block is --color-primary (#F5F1E8)
            over --color-background and the inactive rows are --color-text. */}
        <div className="work-project-list absolute bottom-6 right-0 flex w-72 flex-col items-stretch font-mono font-medium">
          {WORK_PROJECTS.map((project, index) => {
            const isActive = index === active;
            const hasStudy = Boolean(getCaseStudy(project.id));

            return (
              <button
                key={project.id}
                type="button"
                disabled={!hasStudy}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openFrom(index, rect.left, rect.top + rect.height / 2);
                }}
                className="work-project-row relative cursor-pointer px-2 py-0.5 text-left text-sm leading-none transition-colors duration-200 disabled:cursor-default"
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
                    inversion. Absolutely positioned, so it adds nothing to the
                    list's measured width - which matters on mobile, where that
                    width is now max-content. */}
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-2.5 h-1 w-1 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: WORK_THEME.ember }}
                  />
                ) : null}
                {project.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parked on the cursor, not on a card - see CardOpenCue.tsx.

          Suppressed on mobile. It is a square that follows a pointer, and a
          touch screen has none: the best it could do is park itself wherever
          the last tap landed and sit there. The list rows are the touch path
          into a case study instead. */}
      <CardOpenCue visible={openableHover && !isMobile} pressed={pressed} />

      {/* The offer at the foot of the section. Suppressed while either overlay
          is up: it is fixed to the viewport, so without this it would float
          over the gallery it just opened. */}
      <ViewMoreCue
        visible={cueVisible && !galleryOpen && !overlay.openId}
        onActivate={openGallery}
      />

      {galleryOpen ? (
        <WorkGalleryWindow
          projects={WORK_PROJECTS}
          closing={galleryClosing}
          onSelect={openStudyFromGallery}
          onClose={closeGallery}
        />
      ) : null}

      {openStudy ? (
        <CaseStudyWindow
          study={openStudy}
          origin={overlay.origin}
          closing={overlay.closing}
          onClose={overlay.close}
          onOpenStudy={overlay.open}
        />
      ) : null}
    </div>
  );
}
