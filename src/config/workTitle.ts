/* ------------------------------------------------------------------
   WORK TITLE - "THE APERTURE WORD"

   The word WORK introducing the work section, and the transition into
   it. Not a label sitting above a transition - the title IS the
   transition.

   THE GOVERNING IDEA: THE HERO CUT CLOSED INTO A SLIT, SO THE WORK
   SECTION OPENS OUT OF ONE.

   `HeroToWorkCut` ends by letterboxing the hero down to a 2.39:1
   anamorphic slit and wiping to black. This runs that optics in
   reverse, one section later: the word opens vertically off its own
   centre line, so the glyphs are revealed BY an aperture opening
   rather than by a generic fade.

   Beat sheet, in progress units (0 = title enters, 1 = handed off):

     0.14 - 0.62  open     the aperture expands off the centre line,
                           top and bottom edges of each glyph arriving
                           LAST, per-letter on staggered delays
     0.62 - 0.72  hold     the word, whole and still
     0.72 - 1.00  push     the word advances toward the viewer and
                           dissolves as the carousel takes over

   REMOVED - THE EMBER BLADE. DO NOT REINTRODUCE.

   Beat 1 used to be a spark: a hot white core with an ember bloom
   flaring across mid-height before the letters opened, meant to echo
   the hero cut's flare. It read as a red smear sitting behind the word
   rather than as light passing through an aperture, and it pulled the
   eye to the glow instead of the type. Rejected. The aperture alone is
   the effect; it does not need anything shining to announce it.

   Gone with it: `slitCenter`, `slitWidth`, `slitOpenMin`,
   `slitOpenMax`, the `--wt-slit` / `--wt-slit-open` channels, the
   `bell()` helper in the hook, and the `.wt-slit` element.

   WHY A SCALE-THROUGH IS ALLOWED HERE AND WAS NOT IN THE HERO CUT

   A dolly-through was rejected for the hero transition because it
   magnified a 1280x720 video source and read as a zoom of a picture.
   The subject here is TEXT - it has no resolution, so it scales
   arbitrarily far and stays crisp. The reason it was wrong there is
   the reason it is right here.
   ------------------------------------------------------------------ */

/**
 * Scroll distance the title plays over, on top of its own sticky 100vh.
 *
 * Like the cut, every beat here is scrubbed, so this is the master speed
 * control - see the pacing note in `heroToWorkCut.ts`. Shorter than the cut's
 * 138vh on purpose: the cut is dismantling a full-screen photographic frame,
 * where this is four letters. Giving a four-letter word the same runway as the
 * hero's departure would make the section feel like it is stalling.
 */
export const WORK_TITLE_TRAVEL = '130vh' as const;

/**
 * The word, one entry per letter.
 *
 * Split in MARKUP rather than at runtime with SplitText. Four known letters do
 * not need a splitter: SplitText exists to solve line breaking and re-splitting
 * on resize, and a single word has neither problem. Splitting it at runtime
 * would also mean waiting on `document.fonts.ready` before the glyphs exist,
 * which is a real delay for a display face this large - and the aperture reveal
 * would have nothing to reveal until it resolved.
 */
export const WORK_TITLE_LETTERS = ['W', 'O', 'R', 'K'] as const;

/**
 * Per-letter start delays for the aperture, in open-progress units.
 *
 * Hand-jittered for the same reason as the cut's column wipe: even steps
 * (`i * 0.12`) make the four letters arrive like a metronome, which reads as a
 * CSS stagger utility. Uneven steps read as choreography. Here W leads, O
 * follows close behind it, then a longer gap before R and K - so the word
 * arrives in two gestures rather than four ticks.
 *
 * Index 0 is the left-most letter. Reverse the array to have the word assemble
 * from the right.
 */
export const WORK_TITLE_LETTER_DELAYS = [0, 0.13, 0.34, 0.47] as const;

/**
 * Compensates the open range so the LAST letter still finishes at progress 1.
 *
 * Each letter's own progress is `open * span - delay`, clamped 0-1, so for the
 * last letter that is `span - maxDelay = 1`. Derived rather than typed in, so
 * editing the delays above cannot leave the final letter unfinished when the
 * hold begins - which would strand a half-open glyph on screen.
 */
export const WORK_TITLE_LETTER_SPAN = 1 + Math.max(...WORK_TITLE_LETTER_DELAYS);

export const WORK_TITLE = {
  /* ---------------- Scroll range ---------------- */

  /**
   * Measured over exactly the window where the sticky holder is held, so the
   * choreography and the sticky release are the same instant by construction
   * and cannot drift apart if `WORK_TITLE_TRAVEL` changes. Identical reasoning
   * to the cut.
   */
  start: 'top top',
  end: 'bottom bottom',

  /* ---------------- Beat 1: the aperture opens ---------------- */

  /**
   * Starts a little into the range rather than at 0, so the word is not already
   * opening the instant the holder becomes sticky - the pause is what makes the
   * opening feel like a deliberate act rather than a consequence of scrolling.
   */
  openStart: 0.14,
  openEnd: 0.62,

  /**
   * Vertical drift per letter as it opens, px. The letter rises the last few
   * pixels into place while its aperture finishes opening, so the glyph is
   * still settling as it becomes whole.
   *
   * Small on purpose. The aperture is the effect; travel this large would turn
   * it into an ordinary rise-and-fade that happens to be masked.
   */
  driftMax: 34,

  /* ---------------- Beat 3: the push-through ---------------- */

  pushStart: 0.72,
  pushEnd: 1,
  /**
   * Terminal scale. Modest: past roughly 1.5 the letterforms crop against the
   * viewport edges and the word stops being readable as a word before it has
   * finished dissolving, which reads as a glitch rather than as a camera move.
   */
  pushTo: 1.26,

  /**
   * The dissolve trails the push slightly, so the word is already moving before
   * it starts to go. Ending before 1 leaves a beat of clean black at the end of
   * the sticky window - the same trick as the cut's `curtainEnd`, and for the
   * same reason: the handoff to what follows should have nothing to see.
   */
  outStart: 0.78,
  outEnd: 0.96,
} as const;

export default WORK_TITLE;
