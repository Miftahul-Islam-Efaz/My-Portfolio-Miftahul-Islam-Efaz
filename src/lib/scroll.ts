'use client';

/**
 * Lenis helpers.
 *
 * Lenis is installed once by `SmoothScrollProvider` and published on
 * `window.lenis` so that anything can drive it without prop-drilling an
 * instance through the tree. This module is the only place that touches that
 * global, and it is typed here rather than re-declared at each call site.
 *
 * ------------------------------------------------------------------
 * THE GLOBAL IS UNTRUSTED. VALIDATE IT, DO NOT JUST TRUTH-TEST IT.
 *
 * `window.lenis` is a global on a page that also runs a dev overlay, HMR and
 * several NESTED Lenis instances (the vault window, the work gallery, the case
 * study window), so it can hold a stale or half-destroyed instance left behind
 * by a resize or a fast refresh.
 *
 * ------------------------------------------------------------------
 * MOBILE WRITES IT NOW, AND THAT INVALIDATED THIS FILE'S OTHER ASSUMPTION.
 *
 * This module used to state that the global was never written below
 * `SMOOTH_SCROLL.mobileMaxWidth`, because mobile kept native scrolling. Since
 * SMOOTH_TOUCH.enabled that is FALSE: a phone now has a real page instance.
 *
 * So every `if (lenis) ... else native` branch in this file and at its call
 * sites began taking the LENIS path on mobile where it had always taken the
 * native one. Nothing threw - the branches just swapped, on phones only. That
 * is exactly how the nav menu stopped scrolling to #vault on mobile: see the
 * note on `force` in scrollToSelector below.
 *
 * The lesson worth keeping: "mobile has no Lenis" was load-bearing in more
 * places than it was written down, and it is no longer true anywhere.
 * ------------------------------------------------------------------
 *
 * Every call site then did `if (lenis) lenis.scrollTo(...)`, which is a
 * truthiness test standing in for a capability test. That is precisely how
 * `lenis.scrollTo is not a function` reached the visitor: the object existed,
 * the method did not, and the native fallback was skipped because the object
 * was truthy.
 *
 * So this module hands back an instance ONLY if it can actually be driven.
 * Anything else reads as "no Lenis here", which is already a fully supported
 * state - it is the mobile path - and every caller falls through to native
 * scrolling instead of throwing.
 * ------------------------------------------------------------------
 */

export type LenisLike = {
  scroll?: number;
  scrollTo: (target: number | string | HTMLElement, options?: object) => void;
  start: () => void;
  stop: () => void;
};

/** True only for an object that can be driven like a live Lenis instance. */
function isLenisLike(value: unknown): value is LenisLike {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<LenisLike>;
  return (
    typeof candidate.scrollTo === 'function' &&
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function'
  );
}

/**
 * Returns the live page Lenis instance, or undefined when there is not one:
 * during SSR, before mount, when SMOOTH_TOUCH.enabled is off and the viewport
 * is mobile, or when the global holds something that is not a usable instance.
 *
 * Callers must always keep their native fallback branch - the mobile instance
 * exists behind a flag that can be switched back off.
 */
export function getLenis(): LenisLike | undefined {
  if (typeof window === 'undefined') return undefined;
  const candidate = (window as unknown as { lenis?: unknown }).lenis;
  return isLenisLike(candidate) ? candidate : undefined;
}

/**
 * Smooth-scrolls to the first selector that resolves to an element.
 *
 * `force` IS NOT OPTIONAL HERE. Lenis silently DISCARDS a programmatic scroll
 * while it considers itself stopped, and it returns nothing to test, so the
 * failure is invisible at the call site: the click registers, the menu closes,
 * and the page simply does not move. The page instance is stopped more often
 * than it looks - it is created stopped, held there until the intro curtain
 * lifts, and stopped again for the whole time any overlay is docked.
 *
 * Falls back to native smooth scrolling when there is no usable instance.
 */
export function scrollToSelector(...selectors: string[]) {
  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (!target) continue;

    const top = target.getBoundingClientRect().top + window.scrollY;
    const lenis = getLenis();

    if (lenis) {
      lenis.scrollTo(top, { duration: 1.2, force: true });
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
    return;
  }
}

/**
 * Jump an element into view with no animation, Lenis or not.
 *
 * This is the RESTORATION case (coming back from a room to the section its
 * door is in), not a journey: being flown down the page would tell the visitor
 * they had gone back to the top, which is the impression being fixed.
 *
 * `behavior: 'instant'` on the native path is load-bearing - `scroll-behavior:
 * smooth` in the stylesheet would otherwise animate the fallback.
 */
export function jumpToElement(target: HTMLElement) {
  const lenis = getLenis();

  if (lenis) {
    /* `force` because Lenis ignores programmatic scrolls while it considers
       itself stopped, and `immediate` to skip the ease. */
    lenis.scrollTo(target, { immediate: true, force: true });
    return;
  }

  target.scrollIntoView({ block: 'start', behavior: 'instant' });
}
