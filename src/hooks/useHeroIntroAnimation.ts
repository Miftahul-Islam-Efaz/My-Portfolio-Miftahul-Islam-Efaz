'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

import { HERO_CONFIG } from '../components/hero/heroData';
import { TAGLINE_CLASS } from '../components/hero/heroStyles';

gsap.registerPlugin(ScrollTrigger);

const TAGLINE_FIRST_SWAP_MS = 2500;
const TAGLINE_INTERVAL_MS = 3400;

/* ------------------------------------------------------------------
   DEPTH MODEL

   The reveal reads as parallax only if the layers do NOT move together.
   Previously the whole section was translated as one block (y: 30), which
   flattened every layer into a single plane - the reason it felt like a plain
   fade rather than depth.

   Now each layer gets its own travel distance and its own duration, ordered
   like real depth: the video is furthest away, so it travels the SHORTEST
   distance but takes the LONGEST time to settle. The headline is closest, so
   it travels furthest and arrives soonest. The eye reads that difference in
   velocity as space.

   Everything is transform/opacity only - deliberately no blur or filter
   animation, which would force full-frame repaints over a 1080p video layer
   and undo the scroll performance work.
   ------------------------------------------------------------------ */

const DEPTH = {
  // Furthest: barely moves, settles slowest.
  video: { scale: 1.14, yPercent: 3, duration: 2.6 },
  // Mid: the headline.
  name: { y: 90, duration: 1.7, stagger: 0.045 },
  // Nearest: tagline, buttons, scroll cue.
  foreground: { y: 60, duration: 1.5, stagger: 0.13 },
} as const;

/** Scroll-linked parallax, applied once the entry has settled. */
const SCROLL_DEPTH = {
  video: { yPercent: 12, scale: 1.05 },
  name: { yPercent: -16 },
  tagline: { yPercent: -26 },
} as const;

const MOBILE_BREAKPOINT = 768;

/**
 * The hero's entry timeline, the rotating tagline, and the scroll parallax.
 *
 * Runs when `isStarted` flips true, which happens as the intro curtain begins
 * to lift - so the hero animates in *behind* the departing curtain and the
 * handoff reads as one continuous motion.
 *
 * Everything is created inside a `gsap.context` scoped to the section, so the
 * cleanup is a single `ctx.revert()` and no tween or ScrollTrigger can leak
 * into the work section below.
 */
export function useHeroIntroAnimation({
  sectionRef,
  nameRef,
  taglineRef,
  isStarted,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  nameRef: RefObject<HTMLHeadingElement | null>;
  taglineRef: RefObject<HTMLDivElement | null>;
  isStarted: boolean;
}) {
  useEffect(() => {
    // Hold everything hidden until the intro releases us, otherwise the hero
    // would be briefly visible under the curtain on first paint.
    if (!isStarted) {
      gsap.set(sectionRef.current, { opacity: 0 });
      gsap.set('.hero-element', { opacity: 0, y: DEPTH.foreground.y });
      if (nameRef.current) gsap.set(nameRef.current, { opacity: 0 });
      return;
    }

    let currentTagline = 0;
    let firstSwapTimeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;
    let splitText: SplitType | null = null;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = gsap.context(() => {
      // Reduced motion: reveal with no travel at all, then stop.
      if (reduceMotion) {
        gsap.set(sectionRef.current, { opacity: 1, y: 0 });
        gsap.set('.hero-element', { opacity: 1, y: 0 });
        if (nameRef.current) gsap.set(nameRef.current, { opacity: 1 });
        return;
      }

      const videoEl = sectionRef.current?.querySelector('video') ?? null;

      // The section itself only fades. It must NOT translate, or it would drag
      // every layer with it and cancel the depth separation below.
      const tl = gsap.timeline();

      tl.fromTo(
        sectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.1, ease: 'power2.out' }
      );

      // Layer 1 (furthest): the video settles out of a slow push-in. Starting
      // at the same moment as everything else, but over 2.6s, it is still
      // drifting long after the text has landed - that lag IS the parallax.
      if (videoEl) {
        tl.fromTo(
          videoEl,
          { scale: DEPTH.video.scale, yPercent: DEPTH.video.yPercent },
          {
            scale: 1,
            yPercent: 0,
            duration: DEPTH.video.duration,
            ease: 'expo.out',
            force3D: true,
          },
          0
        );
      }

      // Layer 3 (nearest): tagline, buttons, scroll cue.
      tl.fromTo(
        '.hero-element',
        { y: DEPTH.foreground.y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DEPTH.foreground.duration,
          stagger: DEPTH.foreground.stagger,
          ease: 'expo.out',
          force3D: true,
        },
        0.35
      );

      // Layer 2 (mid): the headline, character by character.
      if (nameRef.current) {
        gsap.set(nameRef.current, { opacity: 1 });
        splitText = new SplitType(nameRef.current, { types: 'chars' });

        tl.fromTo(
          splitText.chars,
          { y: DEPTH.name.y, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: DEPTH.name.stagger,
            ease: 'expo.out',
            duration: DEPTH.name.duration,
            force3D: true,
            // Drop the per-character layers as soon as the text lands. Leaving
            // dozens of promoted spans alive costs compositing work for the
            // rest of the session, including while scrolling to the work grid.
            onComplete: () => {
              if (splitText) splitText.revert();
            },
          },
          0.12
        );
      }

      /* ----------------------------------------------------------------
         Scroll-linked parallax.

         Created only after the entry has settled, so a scrubbed tween can
         never fight the entry timeline for the same transform. Desktop only:
         mobile uses native scroll, and scrubbing transforms against it is
         where the old scroll jank came from.
         ---------------------------------------------------------------- */
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        gsap.delayedCall(DEPTH.video.duration, () => {
          const section = sectionRef.current;
          if (!section) return;

          const scrollTrigger = {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          } as const;

          if (videoEl) {
            gsap.to(videoEl, {
              yPercent: SCROLL_DEPTH.video.yPercent,
              scale: SCROLL_DEPTH.video.scale,
              ease: 'none',
              force3D: true,
              scrollTrigger,
            });
          }

          if (nameRef.current) {
            gsap.to(nameRef.current, {
              yPercent: SCROLL_DEPTH.name.yPercent,
              ease: 'none',
              force3D: true,
              scrollTrigger,
            });
          }

          if (taglineRef.current) {
            gsap.to(taglineRef.current, {
              yPercent: SCROLL_DEPTH.tagline.yPercent,
              ease: 'none',
              force3D: true,
              scrollTrigger,
            });
          }
        });
      }

      firstSwapTimeout = setTimeout(() => {
        interval = setInterval(() => {
          const taglineEl = taglineRef.current;
          if (!taglineEl) return;

          // Never animate text nobody can see: a hidden tab or a visitor who
          // has already scrolled down to the work section.
          if (document.visibilityState !== 'visible') return;
          const rect = taglineEl.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;

          gsap.to(taglineEl, {
            opacity: 0,
            y: -10,
            duration: 0.4,
            force3D: true,
            onComplete: () => {
              currentTagline =
                (currentTagline + 1) % HERO_CONFIG.taglines.length;
              taglineEl.innerText = HERO_CONFIG.taglines[currentTagline];
              taglineEl.className = TAGLINE_CLASS;

              gsap.fromTo(
                taglineEl,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, force3D: true }
              );
            },
          });
        }, TAGLINE_INTERVAL_MS);
      }, TAGLINE_FIRST_SWAP_MS);

      const cards = gsap.utils.toArray<HTMLElement>('.floating-card');
      cards.forEach((card, i) => {
        gsap.to(card, {
          y: -12,
          duration: 2.5,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.4 + 2,
          force3D: true,
        });
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      clearTimeout(firstSwapTimeout);
      clearInterval(interval);
      if (splitText) splitText.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);
}

export default useHeroIntroAnimation;
