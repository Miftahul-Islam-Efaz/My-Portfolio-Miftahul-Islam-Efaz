/**
 * Class strings shared between the hero markup and the animation hook.
 *
 * `TAGLINE_CLASS` has to live outside the component because the tagline
 * rotator reassigns `className` wholesale when it swaps the text. Keeping the
 * single source of truth here means the markup and the rotator can never drift
 * apart - which previously showed up as the tagline losing its styling after
 * the first swap.
 */
export const TAGLINE_CLASS =
  'hero-element hero-tagline text-[clamp(0.85rem,2vw,1.15rem)] uppercase tracking-[0.12em] font-normal mb-8 md:mb-10 h-auto min-h-[4.5rem] md:min-h-[3rem] text-neutral-200 mix-blend-difference relative z-10';
