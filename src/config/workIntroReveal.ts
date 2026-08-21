/* ------------------------------------------------------------------
   WORK INTRO REVEAL - "THE DRUM"

   Text reveal choreography for the work section's intro, the first
   thing the eye lands on after the hero -> work cut.

   THE GOVERNING IDEA: THE LINE IS WRAPPED AROUND A ROTATING DRUM.

   Each character starts lying flat, edge-on to the viewer - collapsed
   to a thin sliver - and rotates up on its own bottom edge into
   reading position, left to right along the line.

   THE ONE DETAIL THAT MAKES IT WORK, AND THE EASY WAY TO GET IT WRONG:

   The perspective belongs to the LINE, not to the character.

   `.wi-line` owns a single `perspective`, and the characters rotate
   inside that shared space (see `--roll-perspective` in
   `work-intro-reveal.css`). Because they share one vanishing point,
   characters away from the centre of the line are SHEARED by the
   projection - they lean, and they read as smaller and further away.
   That shear is what sells a line bending around a cylinder, and
   nothing in the code asks for it: it falls out of the projection.

   Writing `transform: perspective(600px) rotateX(...)` on each
   character instead gives every one its own vanishing point directly
   behind itself. They then all flip identically, with no shear and no
   depth, and the result is a row of independently flipping tiles -
   the flat, mechanical version of this effect.

   GRANULARITY: BOTH BLOCKS ROLL, AT DIFFERENT SPEEDS.

   Character-level motion on body copy is normally a mistake - it makes
   the reader wait on the animation before they are allowed to read.
   The saving grace here is that a rolled-back character is still INK
   on screen, not empty space, so the line's shape and length are
   legible the whole way through. The reader sees a line arriving, not
   a gap being filled.

   The credits still roll faster and tighter than the statement, so
   the longer block does not take proportionally longer to land.

   Every channel is transform and opacity only. No blur and no colour
   tweens - a colour tween on ~230 character spans would repaint text
   every frame, which is the one cost this cannot absorb.
   ------------------------------------------------------------------ */

export const WORK_INTRO_REVEAL = {
  /**
   * Shared ease for everything that fires once on enter.
   *
   * expo.out is the house ease: it matches the hero's entry timeline, so the
   * page has one motion signature rather than a different feel per section. It
   * suits the roll especially well - most of the rotation is spent in the first
   * part of the move, so the character arrives and settles rather than easing
   * gently into place the whole way.
   */
  ease: 'expo.out',

  /* ---------------- The roll ---------------- */

  roll: {
    /**
     * Starting rotation on X, degrees. The character lies flat, tipped away
     * from the viewer, and rotates up to 0.
     *
     * Slightly PAST -90 on purpose. At exactly -90 the glyph is perfectly
     * edge-on and collapses to a zero-height line, which on some GPUs drops the
     * layer entirely for a frame and makes the character flash in. A couple of
     * degrees over means it is always very slightly past vertical, so it is
     * always rendering something - and the extra couple of degrees also reads
     * as the character having come from BEHIND the line rather than from
     * exactly under it.
     *
     * Do not push much past -110: the glyph starts to show its underside and
     * the roll begins to read as a tumble.
     */
    rotateFrom: -92,

    /**
     * Rise, px, applied alongside the rotation. Small - the rotation is the
     * effect. This exists so the character is still travelling as it lands,
     * rather than pivoting perfectly in place like a hinge.
     */
    yFrom: 26,

    /**
     * Where each character pivots. The bottom edge, so the glyph unfurls
     * upward off the baseline - which is what makes the line look like it is
     * being unrolled off a drum rather than flipped like a card.
     *
     * Set from JS rather than CSS: GSAP owns `transform` on these elements, and
     * it writes `transform-origin` alongside it. Declaring it in CSS as well
     * would give one property two owners.
     */
    origin: '50% 100%',

    statement: {
      /** Late enough that the line is comfortably on screen before it moves. */
      start: 'top 84%',
      duration: 1,
      /**
       * Per-character offset. The whole line is in flight at once at this
       * value, which is the point: the drum is turning, and every character on
       * it is at a different phase of the same rotation. Widen it and the
       * characters stop belonging to one object and start arriving as
       * individuals.
       */
      stagger: 0.022,
    },

    credits: {
      start: 'top 88%',
      /**
       * Tighter and quicker than the statement. This block is longer, and at
       * the statement's settings the tail of the paragraph would still be
       * rolling in long after the reader had reached it.
       */
      duration: 0.95,
      stagger: 0.016,
    },
  },

  /* ---------------- Link underlines ---------------- */

  /**
   * The underlines live on the SAME timeline as the credits' roll (see the
   * hook). They used to be a separate `once: true` trigger, which is how they
   * ended up as static, fully-drawn rules under animating text: SplitText
   * re-splits on resize, and slices any link that wraps across two lines, so
   * the spans the tween was armed against no longer existed while the trigger
   * had already fired. Anything that touches split output has to be rebuilt
   * WITH the split, which means it belongs on that timeline.
   *
   * `at` and `span` are fractions of the roll's own length rather than fixed
   * seconds, so the draws stay in proportion when the copy or the stagger
   * changes.
   */
  links: {
    /** Length of a single underline's draw, in timeline seconds. */
    duration: 0.55,
    /** Where the first draw starts, as a fraction of the roll's length. */
    at: 0.34,
    /** Fraction of the roll the draws are spread across. */
    span: 0.55,
  },

  /* ---------------- The portrait ---------------- */

  frame: {
    start: 'top 88%',
    duration: 1.35,
    /**
     * Counter-drift: the image starts pushed in and settles to 1 while the mask
     * opens. Without it the reveal is just a wipe - the drift is what gives the
     * frame depth, and it is the same trick as the hero video's entry.
     *
     * IMPORTANT, because the portrait is a two-layer lens: the hook applies
     * this to EVERY `[data-reveal="frame-media"]` element as one set, so both
     * the dithered base and the sharp reveal drift identically. They have to -
     * the lens only works while the two layers are in exact register. Never
     * animate one layer's scale/position without the other.
     */
    imageFrom: 1.14,
  },

  /* ---------------- The portrait lens (hover reveal) ---------------- */

  /**
   * The portrait is two stacked images: a dithered/stippled treatment on top of
   * the sharp photograph. A soft-edged circular window follows the cursor and
   * reveals the photograph only inside that window - so the hover is a
   * discovery, not a crossfade.
   *
   * WHY IT IS A MASK AND NOT A CLIP OR A BACKDROP-FILTER
   * `clip-path: circle()` gives a hard aliased edge, and the whole point of the
   * effect is the blurred border. `backdrop-filter` would blur whatever is
   * behind the layer every frame across the full element, which is a
   * full-element repaint on a moving cursor. A radial-gradient `mask-image` is
   * composited, and the feather is free because it is just gradient stops.
   *
   * THE RADIUS AND FEATHER LIVE IN CSS, NOT HERE.
   * They are lengths and gradient stops (`--lens-r`, `--lens-solid` on
   * `.wi-lens`) that only CSS ever consumes - JS never reads them, so putting
   * them here would mean shipping numbers to JS just to write them straight
   * back out as strings. Only what the hook actually computes lives here. The
   * roll's `perspective` is in CSS for the same reason.
   */
  portraitLens: {
    /**
     * Positional easing per frame, 0-1. The window trails the cursor slightly
     * instead of being welded to it, which is what makes it feel like a lens
     * with weight rather than a DOM node parented to the mouse.
     *
     * Higher than the hero's 0.085 on purpose: this window sits directly under
     * the cursor, so too much lag reads as the effect being broken or laggy,
     * where the hero's light is ambient and can afford to drift.
     */
    ease: 0.22,
    /**
     * Distance in px below which the follow loop stops. Without a cutoff the
     * lerp runs forever, chasing a target it never quite reaches, and holds a
     * rAF open for the whole hover.
     */
    settleEpsilon: 0.4,
  },

  /* ---------------- The signature ---------------- */

  signature: {
    start: 'top 80%',
    duration: 1.05,
    /** Lands last, as the flourish it is. */
    delay: 0.35,
  },
} as const;

export default WORK_INTRO_REVEAL;
