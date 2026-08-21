/* ------------------------------------------------------------------
   HERO POINTER PARALLAX - tuning constants

   Every number the pointer interaction depends on lives here, so the
   hook stays readable and the feel can be tuned without touching logic.

   SCOPE: the cursor moves the TYPE and nothing else. This file used to
   also tune three lighting passes over the background video - a
   left-side darkening wash, a diagonal beam and a warm pool anchored on
   the subject's face (HERO_SUBJECT). All of that was removed on
   purpose: the footage as shot is what ships. Do not re-add a hover
   treatment on the background here.

   THE GOVERNING RULE: at rest, this system contributes NOTHING. A
   centred or still cursor resolves to zero displacement, and the
   stylesheet declares those zeros as its defaults.
   ------------------------------------------------------------------ */

export const HERO_POINTER = {
  /* ---------------- Smoothing ---------------- */

  /** Per-frame lerp factor for the smoothed cursor position. */
  positionEase: 0.085,

  /**
   * Once the position is within this of its target, snap and stop. Prevents
   * an asymptotic rAF loop that never quite arrives and so never lets the
   * main thread go.
   */
  settleEpsilon: 0.0015,

  /* ---------------- Heading parallax ---------------- */

  /**
   * Heading travel in px across the full cursor range. "A very small amount"
   * is the brief, and single digits is what that means at this type size -
   * enough to feel like the type sits in front of the frame, not enough to
   * read as the layout moving. Applied INVERTED (the type counter-moves
   * against the cursor), which is what sells depth.
   */
  headingShiftX: 10,
  headingShiftY: 6,
} as const
