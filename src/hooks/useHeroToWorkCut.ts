'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CUT } from '../config/heroToWorkCut';

gsap.registerPlugin(ScrollTrigger);

type UseHeroToWorkCutArgs = {
  /** The cut wrapper. Progress is measured from its own scroll position. */
  targetRef: React.RefObject<HTMLElement | null>;
};

/** Progress through a sub-range, clamped to 0-1. */
const ramp = (p: number, from: number, to: number) =>
  gsap.utils.clamp(0, 1, (p - from) / (to - from));

/**
 * Smoothstep. Used for every ramp in the cut so beats ease in and out of each
 * other instead of starting and stopping on hard linear edges - a linear
 * letterbox close reads mechanical, like a progress bar.
 */
const ease = (t: number) => t * t * (3 - 2 * t);

/** Raised-cosine bell, 1 at `center`, 0 at +/- `width`. */
const bell = (p: number, center: number, width: number) => {
  const x = Math.abs(p - center) / width;
  if (x >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * x));
};

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Drives "the cut" - the hero -> work transition - from scroll position.
 *
 * Writes finished numbers as custom properties on the cut wrapper, which the
 * layers in `hero-to-work-cut.css` read:
 *
 *   --cut-bar         letterbox bar scaleY, 0-1
 *   --cut-scale       dolly-back scale on the held frame
 *   --cut-lift        dolly drift on the held frame, px
 *   --cut-vignette    corner falloff opacity, 0-1
 *   --cut-type-lift   type stack drift, px (consumed by hero-parallax.css)
 *   --cut-type-out    type stack opacity, 1-0
 *   --cut-flare       light-leak opacity, 0-1
 *   --cut-flare-open  light-leak scaleX
 *   --cut-burn        film-burn opacity, 0-1
 *   --cut-curtain     curtain coverage, 0-1
 *
 * ---------------------------------------------------------------------------
 * Why the maths is here and not in CSS
 * ---------------------------------------------------------------------------
 * The flare's envelope is a raised-cosine bell and every other channel is a
 * smoothstepped sub-range. CSS has no bell and no smoothstep, and it would
 * still need JS to supply progress. So JS does the curves and CSS paints - the
 * same split as `useHeroPointerParallax` and `useWorkIntroReveal`.
 *
 * ---------------------------------------------------------------------------
 * Performance
 * ---------------------------------------------------------------------------
 * - No React state, so scrolling never re-renders the tree. One element's
 *   inline style is written and the layers inherit from it.
 * - ScrollTrigger's scrub is the tick; there is no second rAF loop.
 * - Only opacity and transform are animated. No `filter`, no `clip-path`, no
 *   `backdrop-filter` - the held frame is a playing video, and any of those
 *   would repaint all 1280x720 of it every frame. The letterbox is scaleY on
 *   two solid divs and the flare is scaleX on a gradient. All composited.
 * - Skipped entirely for prefers-reduced-motion, which leaves the stylesheet
 *   defaults in place: no bars, no flare, no curtain, hero simply scrolls.
 */
export default function useHeroToWorkCut({ targetRef }: UseHeroToWorkCutArgs) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const { style } = target;

    const write = (p: number) => {
      /* ---- Beat 1: the squeeze ---- */
      const close = ease(ramp(p, 0, CUT.barsClose));
      const dolly = ease(ramp(p, 0, 0.78));

      /* ---- Beat 2: the flare ---- */
      const spark = bell(p, CUT.flareCenter, CUT.flareWidth);
      // Opening is a one-way ramp, not the bell: the blade streaks WIDER as it
      // dies rather than retracting, which is how an anamorphic leak behaves.
      const open = ease(
        ramp(p, CUT.flareCenter - CUT.flareWidth, CUT.flareCenter + CUT.flareWidth * 0.6)
      );

      /* ---- Beat 3: the wipe ---- */
      const curtain = ease(ramp(p, CUT.curtainStart, CUT.curtainEnd));

      style.setProperty('--cut-bar', close.toFixed(4));
      style.setProperty('--cut-scale', mix(1, CUT.dollyScale, dolly).toFixed(4));
      style.setProperty('--cut-lift', `${mix(0, CUT.dollyLift, dolly).toFixed(2)}px`);
      style.setProperty(
        '--cut-vignette',
        (CUT.vignetteMax * ease(ramp(p, 0.08, 0.7))).toFixed(4)
      );

      style.setProperty(
        '--cut-type-lift',
        `${mix(0, CUT.typeLift, ease(ramp(p, 0.04, 0.6))).toFixed(2)}px`
      );
      style.setProperty(
        '--cut-type-out',
        (1 - ease(ramp(p, CUT.typeFadeFrom, CUT.typeFadeTo))).toFixed(4)
      );

      // Squared on the way in gives the flare a fast, hot attack and a long
      // falloff instead of a symmetrical pulse.
      style.setProperty('--cut-flare', (CUT.flareMax * Math.pow(spark, 1.35)).toFixed(4));
      style.setProperty(
        '--cut-flare-open',
        mix(CUT.flareOpenMin, CUT.flareOpenMax, open).toFixed(4)
      );
      // Tighter exponent: the burn is only present at the very peak.
      style.setProperty('--cut-burn', (CUT.burnMax * Math.pow(spark, 2.6)).toFixed(4));

      style.setProperty('--cut-curtain', curtain.toFixed(4));
    };

    const trigger = ScrollTrigger.create({
      trigger: target,
      start: CUT.start,
      end: CUT.end,
      scrub: true,
      onUpdate: (self) => write(self.progress),
      onRefresh: (self) => write(self.progress),
    });

    return () => {
      trigger.kill();

      // Safe to clear: every stylesheet default IS the neutral value, so
      // removing these cannot cause a visible pop.
      [
        '--cut-bar',
        '--cut-scale',
        '--cut-lift',
        '--cut-vignette',
        '--cut-type-lift',
        '--cut-type-out',
        '--cut-flare',
        '--cut-flare-open',
        '--cut-burn',
        '--cut-curtain',
      ].forEach((property) => style.removeProperty(property));
    };
  }, [targetRef]);
}
