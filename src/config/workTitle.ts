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

   PARTLY SUPERSEDED SINCE - WITH THE FAILURE MODE STILL REJECTED. The GL
   pass (components/work/gl/workTitleScene.ts) draws the word when WebGL
   and the font are both available, and light IS back - but attached to
   the MOVING edge of the aperture and keyed to motion, so it reads as the
   act of opening rather than as a glow parked behind the type. The parked
   smear described above remains rejected in both versions.

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
 * where this is five letters. Giving a five-letter word the same runway as the
 * hero's departure would make the section feel like it is stalling.
 */
export const WORK_TITLE_TRAVEL = '130vh' as const;

/**
 * The word, one entry per letter.
 *
 * Split in MARKUP rather than at runtime with SplitText. Five known letters do
 * not need a splitter: SplitText exists to solve line breaking and re-splitting
 * on resize, and a single word has neither problem. Splitting it at runtime
 * would also mean waiting on `document.fonts.ready` before the glyphs exist,
 * which is a real delay for a display face this large - and the aperture reveal
 * would have nothing to reveal until it resolved.
 *
 * The GL pass (components/work/gl/workTitleScene.ts) rasterises this same list
 * into its texture atlas, so the word is edited in exactly one place.
 */
export const WORK_TITLE_LETTERS = ['W', 'O', 'R', 'K', 'S'] as const;

/**
 * Per-letter start delays for the aperture, in open-progress units.
 *
 * Hand-jittered for the same reason as the cut's column wipe: even steps
 * (`i * 0.12`) make the five letters arrive like a metronome, which reads as a
 * CSS stagger utility. Uneven steps read as choreography. Here W leads, O
 * follows close behind it, a longer gap, R, then K and S land as the closing
 * pair - so the word arrives in three gestures rather than five ticks.
 *
 * Index 0 is the left-most letter. Reverse the array to have the word assemble
 * from the right.
 */
export const WORK_TITLE_LETTER_DELAYS = [0, 0.12, 0.3, 0.44, 0.6] as const;

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

/* ==================================================================
   THE GL PASS - components/work/gl/workTitleScene.ts

   When WebGL and the display font are both available, the word is drawn
   by a shader instead of the DOM mask. Same beats, same per-letter
   choreography - the hook hands the scene `open` / `push` / `out`
   every frame and the shader derives the rest. What GL adds is what CSS
   cannot do to text: a hot rim on the moving aperture edge, anamorphic
   chromatic aberration keyed to motion, film grain, and an exit that
   breaks the word into the same ordered dither the project cards
   dissolve into in the carousel below.
   ================================================================== */
export const WORK_TITLE_GL = {
  /* Must match .wt-word's stack in work-title.css - the DOM and GL words
     swap visibility, so different faces would read as a jump. */
  fontStack: '"Boreck", "Bespoke Serif", ui-serif, Georgia, serif',
  /* Atlas rasterisation size in px. Fixed - the quad is rescaled to the
     live CSS font size on every resize, so this is pure texture
     resolution, not a layout value. */
  atlasFontPx: 512,
  /* The site palette, as literals - same reasoning as dither/gl/config.js:
     shaders cannot resolve var(--color-*). */
  ink: '#F5F1E8',
  ember: '#b56c4b',
  /* The rim on the moving aperture edge. Sigma is its half-width in uv. */
  rimStrength: 1.15,
  rimSigma: 0.016,
  /* Chromatic aberration in uv: the resting floor, and the gain on the
     motion envelope. */
  aberration: 0.0016,
  aberrationMotion: 0.03,
  /* Exit dither cell in device px - deliberately near the carousel's
     ditherScale of 7.5 so the two grains read as one material. */
  ditherScale: 7,
  /* Grain: full on the ink, a whisper on the field. */
  grain: 0.06,
  grainField: 0.016,
} as const;

export default WORK_TITLE;
