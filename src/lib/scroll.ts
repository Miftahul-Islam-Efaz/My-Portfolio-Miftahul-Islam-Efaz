'use client';

/**
 * Lenis helpers.
 *
 * Lenis is installed once by `SmoothScrollProvider` and published on
 * `window.lenis` so that anything can drive it without prop-drilling an
 * instance through the tree. This module is the only place that touches that
 * global, and it is typed here rather than re-declared at each call site.
 */

export type LenisLike = {
  scroll?: number;
  scrollTo: (target: number | string | HTMLElement, options?: object) => void;
  start: () => void;
  stop: () => void;
};

/** Returns the live Lenis instance, or undefined during SSR / before mount. */
export function getLenis(): LenisLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { lenis?: LenisLike }).lenis;
}

/**
 * Smooth-scrolls to the first selector that resolves to an element.
 *
 * Falls back to native smooth scrolling when Lenis is unavailable - for example
 * on mobile, where `SmoothScrollProvider` intentionally skips Lenis and lets
 * the platform handle momentum instead.
 */
export function scrollToSelector(...selectors: string[]) {
  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (!target) continue;

    const top = target.getBoundingClientRect().top + window.scrollY;
    const lenis = getLenis();

    if (lenis) {
      lenis.scrollTo(top, { duration: 1.2 });
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
    return;
  }
}
