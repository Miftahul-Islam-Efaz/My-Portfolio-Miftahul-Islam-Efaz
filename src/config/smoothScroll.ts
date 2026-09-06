/* ------------------------------------------------------------------
   SMOOTH SCROLL - tuning

   Lenis is already the scroller for this site; this file is only the
   numbers that decide how it FEELS. The wiring lives in
   components/SmoothScrollProvider.tsx.

   ------------------------------------------------------------------
   ONE CLOCK. LENIS DOES NOT RUN ITS OWN RAF.

   Lenis is advanced from `gsap.ticker`, so Lenis, GSAP tweens and
   ScrollTrigger all step on the same frame. `autoRaf` MUST stay false
   for that: with it true Lenis also runs its own requestAnimationFrame
   loop, gets advanced twice per frame, and the easing rate silently
   doubles - which reads as a fast, slightly jittery scroll that no
   amount of tuning the duration below will fix.

   In lenis@1.3 `autoRaf` already defaults to false, so this is currently
   belt and braces. It is passed explicitly anyway because the default
   flipped once in Lenis' history and this is the exact setting that
   would be silently wrong if it flipped back.

   ------------------------------------------------------------------
   CONTROLLED MOBILE TOUCH SCROLLING.

   A restrained touch multiplier and shorter coast slow mobile swipes
   without adding extra animation lag. Reduced motion stays native.
   Desktop wheel smoothing remains enabled.

   ------------------------------------------------------------------
   THE REAL CONSTRAINT: THIS SITE SCRUBS.

   Almost every section here is a SCRUBBED ScrollTrigger - the desk at
   0.85, the compositor at 0.7, the rake, the dither helix. Scrub is
   itself a lag: the animation chases the scroll position. Lenis is a
   second lag: the scroll position chases the wheel.

   THEY STACK. Perceived latency is roughly the sum, so raising the
   duration here makes every scrubbed section feel heavier even though
   not one of their configs changed. Past about 1.4 the desk laptop stops
   feeling weighty and starts feeling disconnected from the wheel.

   If the site ever feels like it is dragging rather than gliding, lower
   the SCRUB values in the section configs before lowering the duration
   here - the scrub is where most of the delay actually is.
   ------------------------------------------------------------------ */

export const SMOOTH_SCROLL = {
  /* Seconds for a wheel impulse to come to rest. This is the inertia
     dial, and it is the whole point of the file.

     Was 0.9, which resolved fast enough that the page read as
     "eased native scroll" rather than as weighted. 1.15 is roughly the
     Lenis reference feel and is where the glide becomes legible without
     crossing into the disconnected zone described above.

     Anything at or above ~1.5 with the scrub values this site carries
     produces visible chase on the desk laptop. Do not go there without
     dropping DESK_SCROLL.scrub to match. */
  duration: 1.15,

  /* Wheel distance per notch. Was 0.9, which shortened every gesture and
     made the longer duration read as sluggishness rather than as weight
     - a slow scroll that also goes nowhere. At 1 the gesture covers the
     distance the OS intended and the easing supplies the feel. */
  wheelMultiplier: 1,

  /* Used only when synthetic touch smoothing is explicitly enabled. */
  touchMultiplier: 0.8,

  /* Mobile profile breakpoint; also includes coarse-pointer devices. */
  mobileMaxWidth: 768,
} as const;

/* Exponential ease-out: a hard initial response that decays into a long
   tail. This is the Lenis default curve and it is the correct shape for
   the job - the scroll must answer the wheel on the FIRST frame or the
   page feels broken, and everything after that frame is the glide.

   Do not swap this for a symmetric ease (power2.inOut and friends). An
   ease-in on scroll means the first frames of every gesture are slow,
   which is indistinguishable from input lag. */
export const SMOOTH_EASE = (t: number): number =>
  Math.min(1, 1.001 - Math.pow(2, -10 * t));

/* Opt-out attribute for genuinely scrollable panels nested in the page.

   Lenis consumes wheel events at the window, so an inner scroller - a
   long overlay body, a code block, a scrollable menu - would otherwise
   scroll the PAGE behind it instead of itself. Put `data-lenis-prevent`
   on the scrolling element and its wheel events are left native.

   Nothing carries it today. It is wired up now because the failure mode
   is confusing enough to lose an hour to when the first such panel is
   added, and the hook costs nothing until it is used. */
export const LENIS_PREVENT_ATTR = 'data-lenis-prevent';

export const isLenisPrevented = (node: HTMLElement): boolean =>
  typeof node.hasAttribute === 'function' &&
  node.hasAttribute(LENIS_PREVENT_ATTR);

/* ------------------------------------------------------------------
   THE TOUCH PROFILE.

   Lenis' touch path is LERP-driven, not duration-driven: with syncTouch
   on, the `duration` and `easing` above are ignored for finger
   gestures and syncTouchLerp decides the feel. Retuning `duration` and
   wondering why the phone did not change is the trap here.
   ------------------------------------------------------------------ */
export const SMOOTH_TOUCH = {
  /* THE SWITCH BACK. false restores native mobile scrolling - momentum,
     rubber-banding, address-bar collapse - in every room at once. */
  enabled: true,

  /* Per-frame approach rate for finger gestures, 0-1. Lenis' own default
     is 0.075. Slightly higher here because this site SCRUBS: a phone
     chasing a 0.075 lerp through a 0.85 scrub reads as drift rather than
     as weight. Lower = heavier and laggier. Higher = closer to native. */
  syncTouchLerp: 0.09,

  /* Give mobile entrance reveals more time without delaying input. */
  revealDurationScale: 1.2,

  /* How much throw survives the lift-off - the length of the coast after
     the finger leaves the glass. Lenis' default is 1.7. */
  touchInertiaExponent: 1.3,
} as const;

/* True when this device should smooth touch.

   Used by the page provider AND by all three nested window scrollers, so
   one predicate decides every room and they cannot drift apart. A
   smoothed window inside a natively scrolling page - or the reverse - is
   the exact mismatch this is here to prevent.

   Shared device and reduced-motion detection keeps page and overlays
   consistent, including landscape phones and touch tablets. */
export const shouldSyncTouch = (): boolean =>
  SMOOTH_TOUCH.enabled &&
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  (window.innerWidth <= SMOOTH_SCROLL.mobileMaxWidth ||
    window.matchMedia('(pointer: coarse)').matches);
