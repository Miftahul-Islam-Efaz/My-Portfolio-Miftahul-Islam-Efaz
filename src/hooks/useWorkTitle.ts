'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORK_TITLE as WT } from '@/config/workTitle';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   WORK TITLE - "THE APERTURE WORD"

   Drives the title transition from scroll progress. See
   `src/config/workTitle.ts` for the beat sheet and the reasoning.

   Three channels, down from five: the ember blade that used to flare
   across mid-height before the letters opened is gone, along with its
   `--wt-slit` / `--wt-slit-open` writes and the `bell()` helper that
   shaped them. It read as a red smear behind the word instead of light
   through an aperture. Do not reintroduce it.

   WHAT THIS HOOK IS ALLOWED TO TOUCH

   Custom properties on the root element. Nothing else. It never tweens
   a transform, an opacity or a mask directly, and it never touches the
   letters individually - `work-title.css` owns all of that and derives
   each letter's share of `--wt-open` in `calc()`.

   That split is what keeps this cheap: four letters and the word
   wrapper all update from THREE property writes per frame, not from a
   tween per element. It is the same architecture as
   `useHeroToWorkCut`, and mixing the two - a hook that writes
   properties AND tweens the same elements - is what caused the static
   underline bug in the intro reveal. One owner per property.

   NO TIMELINE, ON PURPOSE

   Every beat is a pure function of scroll position, so there is no
   playhead to keep in sync and scrubbing backwards is exact rather
   than a reversed tween. A GSAP timeline with `scrub` would add an
   interpolation layer between the scroll position and the frame for no
   benefit here.
   ------------------------------------------------------------------ */

/** 0 before `from`, 1 after `to`, linear between. */
const ramp = (p: number, from: number, to: number) =>
  gsap.utils.clamp(0, 1, (p - from) / (to - from));

/** Smoothstep. Takes the corners off a linear ramp without an easing curve. */
const ease = (t: number) => t * t * (3 - 2 * t);

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

export function useWorkTitle({
  rootRef,
}: {
  rootRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* Reduced motion: create nothing and write nothing. The stylesheet's
       defaults are already the finished word, and its media query drops the
       sticky holder so there is no empty scroll distance to sit through. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const set = gsap.quickSetter(root, 'css') as (vars: object) => void;

    const write = (p: number) => {
      /* The aperture. Smoothstepped so the letters do not begin opening at full
         rate the instant the range starts. */
      const open = ease(ramp(p, WT.openStart, WT.openEnd));

      /* The push-through and the dissolve. */
      const push = ease(ramp(p, WT.pushStart, WT.pushEnd));
      const out = ramp(p, WT.outStart, WT.outEnd);

      set({
        '--wt-open': open,
        '--wt-push': mix(1, WT.pushTo, push),
        '--wt-out': 1 - out,
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: WT.start,
      end: WT.end,
      scrub: true,
      onUpdate: (self) => write(self.progress),
      /* Re-assert on refresh: a resize or a font swap can change where the
         holder is released, and without this the title keeps whatever state it
         held before the measurement changed. */
      onRefresh: (self) => write(self.progress),
    });

    write(trigger.progress);

    return () => {
      trigger.kill();
      /* Hand the element back in its finished state rather than mid-transition.
         Removing the properties falls back to the stylesheet's defaults, which
         are the resting word. */
      for (const prop of ['--wt-open', '--wt-push', '--wt-out']) {
        root.style.removeProperty(prop);
      }
    };
  }, [rootRef]);
}

export default useWorkTitle;
