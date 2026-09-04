'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  COMPOSITOR_SCROLL,
  COMPOSITOR_BEATS,
  COMPOSITOR_PARALLAX,
  COMPOSITOR_READOUT,
  COMPOSITOR_INK,
  COMPOSITOR_INK_BEAT,
} from '../config/compositor';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   THE COMPOSITOR - scroll engine

   ------------------------------------------------------------------
   INVARIANT: THIS SECTION IS NEVER PINNED. DO NOT ADD `pin`.

   The pinned helix in DitherCarousel.tsx carries refreshPriority: 1, and
   ScrollTrigger measures pins in DESCENDING priority order. A pinned
   trigger EARLIER in the document silently shifts where every later
   trigger starts, so mounting a pinned section here at the default 0
   broke the carousel once already today. THE RAKE, which does pin, had
   to be given refreshPriority: 2 to fix it.

   This section needs no pin: it scrubs against its own viewport
   progress, adds zero pin spacing, and therefore cannot move anything
   below it. If a pin is ever genuinely required here it must declare a
   refreshPriority ABOVE the rake's 2, and the helix must be re-checked.

   ------------------------------------------------------------------
   WHY THIS DRIVES CSS VARIABLES INSTEAD OF TWEENING NODES

   The composition touches a lot of elements: two stacked weight layers
   per word, ~40 baselines, 6 column rules, 3 dimension lines, 5 decision
   rows, the notes column. Tweening those individually would mean a
   timeline of a few hundred tweens, all of which ScrollTrigger has to
   keep alive and invalidate on every refresh.

   Instead there is ONE trigger writing SIX scalars to the root:

     --comp-grid    the annotation layer drawing itself
     --comp-scale   raw 13px mono -> composed display setting
     --comp-weight  the fake weight axis (see config)
     --comp-accent  the ember landing on one word
     --comp-strip   the scaffolding being pulled away
     --comp-px/py   pointer lean

   Everything else is CSS interpolating off those numbers, including the
   per-element stagger (each node carries its own --i-frac and derives a
   local progress with clamp()). Six style writes per frame, no layout
   thrash, and the whole section is a pure function of scroll position -
   so scrubbing backwards un-composes it exactly the way it came in.

   ------------------------------------------------------------------
   REDUCED MOTION AND THE FAILURE DIRECTION

   Every default in compositor.css is the FINISHED, composed state:
   annotations already stripped, type already set, ember already placed.
   The raw spec sheet only exists under [data-comp-state='armed'], which
   this hook sets synchronously before it builds anything.

   Written the other way round - raw by default, composed by JS - any
   failure of this hook would leave a visitor staring at 13px uppercase
   mono and nothing else. This way the worst case is a well-set static
   sentence, which is a complete version of the section.
   ------------------------------------------------------------------ */

interface UseCompositorArgs {
  rootRef: React.RefObject<HTMLDivElement | null>;
}

/* Beat helper: turn global 0..1 progress into a local 0..1 for a beat's
   [start, end] slice, clamped at both ends. */
const beat = (p: number, range: readonly [number, number]): number => {
  const [from, to] = range;
  if (to <= from) return p >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (p - from) / (to - from)));
};

export const useCompositor = ({ rootRef }: UseCompositorArgs): void => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduced) return;

    /* Hand the section over to the raw state BEFORE the trigger exists,
       so there is no frame where the composed default is visible. */
    root.dataset.compState = 'armed';

    /* Easing. `power2.inOut` on scale and weight so the middle of the
       scroll window carries most of the change - the beats read as
       decisions being made rather than as linear sliders. The grid draws
       and the strip pulls on `power2.out`, front-loaded, because both are
       mechanical actions rather than judgements. */
    const easeDraw = gsap.parseEase('power2.out');
    const easeJudge = gsap.parseEase('power2.inOut');

    /* Readout nodes. Queried once - these are the only nodes this hook
       writes text into, and writing textContent every frame regardless of
       change is what makes number tickers expensive, so each keeps its
       last printed string. */
    const numScale = root.querySelector<HTMLElement>('[data-comp-num="scale"]');
    const numLead = root.querySelector<HTMLElement>('[data-comp-num="leading"]');
    const numWeight = root.querySelector<HTMLElement>(
      '[data-comp-num="weight"]',
    );
    const last = { scale: '', lead: '', weight: '' };

    const print = (
      node: HTMLElement | null,
      key: keyof typeof last,
      value: string,
    ): void => {
      if (!node || last[key] === value) return;
      last[key] = value;
      node.textContent = value;
    };

    /* ---------------- INK PLATE PRELOAD ----------------

       THE GUARD THAT MAKES THE FILL SAFE. The ink layer paints text at
       color: transparent with the plate showing through it, so if the
       plate is missing the words are INVISIBLE, not unstyled. Nothing is
       allowed to reveal that layer until a real decode has happened.

       On failure the section degrades to precisely what it is today - a
       well-set statement in flat off-white - and says why in the console
       instead of blanking the sentence. */
    /* Two candidates, tried in order: the Drive-hosted plate, then the
       self-hosted copy. Anything that stops the remote file arriving - a
       429, an offline dev box, a revoked share - falls through to /public
       rather than silently dropping the fill. */
    const inkSources: readonly string[] = [
      COMPOSITOR_INK.source,
      COMPOSITOR_INK.fallback,
    ];
    const inkPlate = new Image();
    let inkAttempt = 0;

    const loadInkSource = (): void => {
      const next = inkSources[inkAttempt];
      if (next) inkPlate.src = next;
    };

    inkPlate.onload = () => {
      /* The section carries --comp-ink-image inline from the PRIMARY
         source, so a successful fallback must rewrite it or every CSS
         layer would still point at the URL that just failed. */
      root.style.setProperty(
        '--comp-ink-image',
        `url(${inkSources[inkAttempt]})`,
      );
      root.style.setProperty('--comp-ink-ready', '1');
    };
    inkPlate.onerror = () => {
      const failed = inkSources[inkAttempt];
      inkAttempt += 1;
      if (inkAttempt < inkSources.length) {
        console.warn(
          `[compositor] ink plate failed from ${failed} - ` +
            `retrying ${inkSources[inkAttempt]}`,
        );
        loadInkSource();
        return;
      }
      console.warn(
        `[compositor] ink plate unavailable from every source ` +
          `(${inkSources.join(", ")}) - statement stays flat off-white.`,
      );
    };
    loadInkSource();

    const ctx = gsap.context(() => {
      const setGrid = gsap.quickSetter(root, '--comp-grid');
      const setScale = gsap.quickSetter(root, '--comp-scale');
      const setWeight = gsap.quickSetter(root, '--comp-weight');
      const setAccent = gsap.quickSetter(root, '--comp-accent');
      const setStrip = gsap.quickSetter(root, '--comp-strip');
      const setShiftA = gsap.quickSetter(root, '--comp-shift-annotation', 'px');
      const setShiftN = gsap.quickSetter(root, '--comp-shift-notes', 'px');
      const setShiftS = gsap.quickSetter(root, '--comp-shift-statement', 'px');
      const setShiftR = gsap.quickSetter(root, '--comp-shift-readout', 'px');
      const setInk = gsap.quickSetter(root, '--comp-fill');
      const setInkShift = gsap.quickSetter(root, '--comp-ink-shift', 'px');

      ScrollTrigger.create({
        trigger: root,
        start: COMPOSITOR_SCROLL.start,
        end: COMPOSITOR_SCROLL.end,
        scrub: COMPOSITOR_SCROLL.scrub,
        invalidateOnRefresh: true,
        /* NO PIN. See the invariant at the top of this file. */
        onUpdate: (self) => {
          const p = self.progress;

          const g = easeDraw(beat(p, COMPOSITOR_BEATS.grid));
          const s = easeJudge(beat(p, COMPOSITOR_BEATS.scale));
          const w = easeJudge(beat(p, COMPOSITOR_BEATS.weight));
          const a = easeDraw(beat(p, COMPOSITOR_BEATS.accent));
          const r = easeDraw(beat(p, COMPOSITOR_BEATS.restraint));

          setGrid(g);
          setScale(s);
          setWeight(w);
          setAccent(a);
          setStrip(r);

          /* THE FILL. Eased like a judgement rather than a wipe - it
             arrives with the accent and completes under restraint, so
             the last thing that happens to the type is the light
             entering it. */
          setInk(easeJudge(beat(p, COMPOSITOR_INK_BEAT)));

          /* Plate drift. The fill is viewport-anchored, so moving the
             background position against scroll makes the light travel
             THROUGH the letterforms instead of sitting in them. Centred
             on the section midpoint so the drift is symmetrical. */
          setInkShift(COMPOSITOR_INK.drift * (p - 0.5));

          /* Parallax planes. Driven by raw progress, not by the eased
             beats - depth should track the scroll itself, otherwise the
             planes stall whenever a beat finishes. */
          setShiftA(COMPOSITOR_PARALLAX.annotation * p);
          setShiftN(COMPOSITOR_PARALLAX.notes * p);
          setShiftS(COMPOSITOR_PARALLAX.statement * p);
          setShiftR(COMPOSITOR_PARALLAX.readout * p);

          /* The measurements tick with the beats they describe, so the
             numbers are true at every scroll position rather than only
             at the ends. */
          const px = Math.round(
            gsap.utils.interpolate(
              COMPOSITOR_READOUT.scaleFrom,
              COMPOSITOR_READOUT.scaleTo,
              s,
            ),
          );
          print(numScale, 'scale', `${px}px`);

          const lead = gsap.utils.interpolate(
            COMPOSITOR_READOUT.leadingFrom,
            COMPOSITOR_READOUT.leadingTo,
            s,
          );
          print(numLead, 'lead', lead.toFixed(2));

          /* Snapped to the real ARK_ES cuts - the cuts the spec line
             actually blends. The old list was the eight Cabinet Grotesk
             cuts walked by INDEX, so the end of the scroll printed 900:
             a weight no font in this section ships, sitting directly
             under a margin note that correctly read 300 -> 700. Two
             annotations disagreeing about the same type is the exact
             failure this sheet argues against.

             So interpolate the real axis, then snap to a file that is
             on disk. Printing a blended 437 would be just as false.
             Change the cut list if the pairing changes family. */
          const cuts = [300, 400, 500, 700];
          const exact = gsap.utils.interpolate(
            COMPOSITOR_READOUT.weightFrom,
            COMPOSITOR_READOUT.weightTo,
            w,
          );
          const snapped = cuts.reduce((best, cut) =>
            Math.abs(cut - exact) < Math.abs(best - exact) ? cut : best,
          );
          print(numWeight, 'weight', String(snapped));
        },
      });

      /* ---------------- POINTER LEAN ----------------

         Gated rAF: the loop only runs while there is a delta left to
         close, so an idle section costs nothing. Targets are normalised
         -1..1 from the section centre. */
      const target = { x: 0, y: 0 };
      const current = { x: 0, y: 0 };
      let raf = 0;

      const frame = (): void => {
        current.x += (target.x - current.x) * COMPOSITOR_PARALLAX.pointerEase;
        current.y += (target.y - current.y) * COMPOSITOR_PARALLAX.pointerEase;

        root.style.setProperty(
          '--comp-px',
          `${(current.x * COMPOSITOR_PARALLAX.pointerAnnotation).toFixed(2)}px`,
        );
        root.style.setProperty(
          '--comp-py',
          `${(current.y * COMPOSITOR_PARALLAX.pointerAnnotation).toFixed(2)}px`,
        );
        root.style.setProperty(
          '--comp-sx',
          `${(current.x * COMPOSITOR_PARALLAX.pointerStatement).toFixed(2)}px`,
        );

        const settled =
          Math.abs(target.x - current.x) < 0.0015 &&
          Math.abs(target.y - current.y) < 0.0015;

        raf = settled ? 0 : requestAnimationFrame(frame);
      };

      const wake = (): void => {
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const onMove = (e: PointerEvent): void => {
        const rect = root.getBoundingClientRect();
        target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        wake();
      };

      const onLeave = (): void => {
        target.x = 0;
        target.y = 0;
        wake();
      };

      root.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('pointerleave', onLeave, { passive: true });

      return () => {
        if (raf) cancelAnimationFrame(raf);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerleave', onLeave);
      };
    }, root);

    return () => {
      ctx.revert();
      delete root.dataset.compState;
    };
  }, [rootRef]);
};
