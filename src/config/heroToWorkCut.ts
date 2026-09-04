/* ------------------------------------------------------------------
   HERO -> WORK: "THE CUT" - tuning constants

   A cinematic hard cut, played out over scroll. The hero does not
   scroll away; it is held on screen and CONSUMED - letterboxed down to
   an anamorphic slit, flared at the closing frame, then wiped out by a
   STAGGERED COLUMN WIPE that hands off to the work section's black.

   Beat sheet, in progress units (0 = cut begins, 1 = hero is gone):

     0.00 - 0.34  squeeze   bars close from top and bottom, hero dollies
                            back, type sinks and fades
     0.10 - 0.54  flare     anamorphic light leak along the closing slit,
                            peaking at `flareCenter` - THE CUT
     0.30 - 0.72  wipe      vertical columns of black rise from below on
                            staggered delays. THE COLUMNS CARRY THE SLATE:
                            each one uncovers its own vertical band of the
                            end card as it rises, so the staircase edge is
                            what reveals the type
     0.72 - 0.90  hold      the finished slate, on black
     0.90 - 1.00  out       the slate fades, so releasing the sticky frame
                            is invisible

   THE WIPE IS THE REVEAL. Two earlier versions got this wrong. The first
   revealed the sentence inside the anamorphic slit, over the picture -
   type competing with a face. The second waited for the wipe to finish
   and then animated the words in on their own, which made the transition
   and the statement two separate events played back to back.

   Now they are ONE event: the black the columns lay down is the surface
   the type is printed on, so the words are carved out of the frame by the
   same staircase that takes the hero away. There is no separate reveal
   animation to time, because the reveal IS the wipe - see the slate
   slices in hero-to-work-cut.css for how that is done with nothing but
   transforms.

   Overlapping beats are the point. A cut is one event, not three
   animations queued up; the flare has to peak while the bars are still
   moving and the wipe has to start before the flare is done.

   REMOVED - "the rake": a slit-scan smear that hung vertical streaks of
   the slit's own light down into the black below the slit. Built,
   rebuilt with proper per-streak tapering, rejected both times - it
   read as drawn lines over the picture rather than as light. The area
   below the slit stays BLACK. Do not reintroduce streak decoration.

   ------------------------------------------------------------------
   PACING NOTE - HOW TO SLOW SOMETHING DOWN HERE
   ------------------------------------------------------------------
   Every beat is SCRUBBED, so it has no duration in seconds. Its speed
   is entirely a function of how much scroll distance it is given, which
   means there are exactly two levers:

     1. CUT_TRAVEL       - stretches the whole cut, every beat equally
     2. a beat's own range - gives that beat a bigger share of the whole

   Slowing a single beat with lever 2 alone squeezes its neighbours into
   what is left, so they speed up to compensate. Slowing with lever 1
   alone drags out beats that were already fine. Use both together.
   ------------------------------------------------------------------ */

/**
 * Scroll distance the cut plays over, on top of the hero's own 100vh.
 *
 * This is what the sticky hero is held for, so it is also the entire
 * choreography budget - and because every beat is scrubbed, it is the master
 * speed control. Below about 90vh the beats collide and it reads as a glitch
 * rather than an edit.
 *
 * Raised from 115vh: the column wipe was closing too fast to read. The old
 * comment here warned that much above 130vh the held frame would start to feel
 * like the page had stopped responding - in practice that is not what happens,
 * because the wipe is visibly progressing the whole way down, so the frame
 * never looks stalled. The ceiling is nearer 160vh, where the hero has been
 * fully black for long enough that the extra scroll is dead space.
 *
 * RETIMED, to 195vh, when the wipe became the reveal. The slate no longer
 * needs its own window after the cut - it is uncovered DURING the wipe - so
 * the travel went back down. What it buys now is a slower wipe: the columns
 * get 42% of the travel instead of 22%, because they are no longer just
 * clearing a frame, they are reading out a sentence, and a sentence cannot be
 * read at the speed of a curtain.
 */
export const CUT_TRAVEL = '195vh' as const;

/**
 * Black air after the cut completes, before the work section's own content.
 *
 * This is the old gap, carried forward: the previous spacer's
 * `clamp(5rem, 16vh, 13rem)` with all three stops scaled by 1.2. The cut
 * replaced the gap as a *transition*, but the breathing room after it is still
 * wanted - a cut needs a beat of black to land in.
 */
export const CUT_AIR = 'clamp(6rem, 19.2vh, 15.6rem)' as const;

/* ------------------------------------------------------------------
   THE COLUMN WIPE

   Per-column start delays, in curtain-progress units, left to right.

   The wipe is not a horizontal line moving up the frame. The frame is
   split into vertical columns and each column rises from below on its
   OWN delay, so the leading edge is a staircase that assembles itself.
   That stepped edge is the whole effect - a straight edge is a wipe,
   a stepped edge is an edit.

   WHY THESE ARE HAND-WRITTEN AND NOT `i * step`
   A linear ramp gives a perfectly even diagonal, which reads as a
   graphic transition - a barn-door sweep. The jitter here keeps the
   overall left-to-right order (so the eye still reads a direction) but
   makes each step a different height, which is what makes it look
   choreographed rather than generated. Adjacent pairs are deliberately
   close together in places, so a few columns move almost as one and
   others break away alone.

   NOTE ON PACING: spreading these delays wider does NOT slow the wipe
   down - it makes the stagger more extreme while each column still
   travels at the same speed, and it steals from the tail of the range,
   so the last columns end up rushing. To slow the wipe, widen its
   progress range (curtainStart/curtainEnd) and CUT_TRAVEL instead.

   ORDER: index 0 is the LEFT-most column and leads the wipe. To make
   the wipe travel right-to-left instead, reverse the array.
   ------------------------------------------------------------------ */
export const CUT_COLUMN_DELAYS = [
  0, 0.052, 0.086, 0.148, 0.182, 0.243, 0.272, 0.331, 0.375, 0.418, 0.462, 0.523,
  0.556, 0.612, 0.648, 0.7,
] as const;

/**
 * Compensates the curtain range so the LAST column still finishes exactly at
 * progress 1.
 *
 * Each column's own progress is `curtain * span - delay`, clamped to 0-1. For
 * the last column that is `1 * span - maxDelay`, which has to equal 1 - hence
 * `1 + maxDelay`. Derived rather than typed in, so editing the delays above can
 * never leave the wipe finishing early and flashing the hero for a frame.
 */
export const CUT_COLUMN_SPAN = 1 + Math.max(...CUT_COLUMN_DELAYS);

/* ------------------------------------------------------------------
   THE SLATE - the end card the wipe uncovers

   ------------------------------------------------------------------
   TYPOGRAPHIC CONCEPT: "TWO VOICES, ONE HUE"
   ------------------------------------------------------------------
   The problem with the first two attempts was not the size of the type,
   it was that every tier was the SAME KIND of type. Caps display serif
   over caps display serif is a label: two lines of identical voice,
   separated only by scale. Nothing to read, only something to notice.

   So the slate is built on a contrast of FORM, not of size:

     STATEMENT  Boreck 700 caps, off-white. Monumental, architectural,
                impersonal. THE CLAIM, CUT IN STONE.

     CODA       Optima ITALIC, terracotta. A flared humanist: a serif's
                modulation on a sans's skeleton, and the closest relative
                Boreck has in this project - the two share a stroke logic,
                so they read as one family rather than as two downloads.
                Lowercase, italic, smaller, and IN THE WARM HUE.
                THE PROMISE, IN A HUMAN HAND.

   Stone answered by hand, claim answered by promise. That is the whole
   idea, and it is why the coda must NOT be set in Boreck at 45% - that
   version was tried and it is a label, not a card.

   THE HUE IS THE TYPE. Earlier versions spent the terracotta on furniture:
   a marker dot, a hairline rule between the tiers. Both are gone. The
   colour now does its work as LETTERFORMS - off-white statement, warm
   coda - which is the same move the EFAZ wordmark makes, and it means the
   card carries no ornament at all. Nothing on this card is decoration:
   there are two lines of type and nothing else.

   The tier break is therefore carried by three things at once - face,
   size, colour - with no divider to lean on. Do not add one back.

   THE TAPER. Measures narrow as the eye travels down: the statement gets
   54rem, the coda 34rem. The card points into the work section instead of
   sitting in a box.

   NOTE ON OPTIMA. fonts.css warns that the lightest cut is Regular -
   nothing here asks for less than 400, because synthesising a thin off a
   flared face thins the stem and leaves the flare, which is the one
   feature worth having.
   ------------------------------------------------------------------ */

export const CUT_LINE = {
  /** The claim. Caps display, off-white. */
  lead: 'I build full-stack web products',

  /**
   * The promise. Flared italic, terracotta.
   *
   * No em dash: the drop to the second tier is the punctuation.
   */
  coda: 'designed to launch, engineered to last.',
} as const;

/**
 * The sentence, flat.
 *
 * The visible slate is duplicated across sixteen slices and hidden from
 * assistive tech, so exactly one readable copy of it has to exist somewhere.
 * This is that copy.
 */
export const CUT_LINE_TEXT = `${CUT_LINE.lead} — ${CUT_LINE.coda}`;

export const CUT = {
  /* ---------------- Scroll range ---------------- */

  /**
   * The sticky hero is released when the wrapper's bottom reaches the
   * viewport's bottom, so the choreography is measured over exactly the window
   * where the hero is actually held. `bottom bottom` and the sticky release
   * point are the same instant by construction - they cannot drift apart if
   * CUT_TRAVEL changes.
   */
  start: 'top top',
  end: 'bottom bottom',

  /* ---------------- Beat 1: the squeeze ---------------- */

  /** Progress at which the letterbox bars reach their full height. */
  barsClose: 0.34,

  /**
   * Height of each bar at full close, as a fraction of the viewport.
   *
   * 0.37 a side leaves a 26% slit - roughly 2.39:1 on a 16:9 viewport, which
   * is the anamorphic ratio the eye reads as "film". Deliberately NOT 0.5:
   * closing to a hairline would make the bars the subject and would leave a
   * black line across the page at the exact moment of the cut, which is the
   * thing being avoided in the first place. The wipe finishes the job.
   *
   * NOTE: `hero-to-work-cut.css` hard-codes 37vh as the bar height. Change
   * this and change that.
   */
  barHeight: 0.37,

  /** Dolly-back on the held frame. Subtle - it is a camera move, not a zoom. */
  dollyScale: 0.93,
  /** Upward drift of the held frame at full close, px. */
  dollyLift: -36,

  /** Corner falloff as the frame closes, so the slit reads as lit from within. */
  vignetteMax: 0.6,

  /**
   * The type stack sinks and fades before the bars reach it, so the headline is
   * never caught halfway under a bar - the frame empties, THEN it closes.
   */
  typeLift: -120,
  typeFadeFrom: 0.1,
  typeFadeTo: 0.26,

  /* ---------------- Beat 2: the flare ---------------- */

  /**
   * Anamorphic light leak along the closing slit. This is the cut itself: a
   * horizontal blade of white-hot light that blooms, streaks wide, and is gone.
   *
   * `flareCenter` sits just before the bars finish so the flare peaks INTO the
   * closing frame rather than after it - the light is what closes the shot.
   */
  flareCenter: 0.32,
  flareWidth: 0.22,
  flareMax: 0.95,
  /** scaleX of the blade, from first spark to full streak. */
  flareOpenMin: 0.18,
  flareOpenMax: 1.35,

  /** Full-frame film burn at the peak. Low - it is a bloom, not a white flash. */
  burnMax: 0.2,

  /* ---------------- Beat 3: the column wipe ---------------- */

  /**
   * Columns of pure black rising from the bottom of the frame on the staggered
   * delays in CUT_COLUMN_DELAYS.
   *
   * `curtainStart` pulled back from 0.58 to 0.54 to slow the wipe: it widens
   * the range from 0.36 to 0.40 of the cut, and combined with the longer
   * CUT_TRAVEL the columns now get about a third more scroll distance than
   * before. Pulled back rather than pushed out at the far end because
   * `curtainEnd` has a job to do (see below).
   *
   * Only the LEFT-most column starts at 0.54 - the rest are still held back by
   * their own delays - so beginning slightly earlier does not bury the flare.
   * The columns rise from the bottom, and the flare sits at mid-height, so the
   * blade stays visible until a column is more than half way up.
   *
   * Reaching full coverage at 0.94 rather than 1.0 leaves a held window of
   * solid black at the end, which is what makes the handoff to the work
   * section invisible - the columns and the section are the same colour, so
   * there is nothing to see when the sticky frame is finally released. Do not
   * raise this to 1.0 to slow the wipe; it would put the last column's arrival
   * on the exact frame the sticky frame is released.
   */
  /* THE WIPE IS NOW THE REVEAL, so this range is the most important pair of
     numbers in the file. It is not clearing a frame any more, it is reading
     out a sentence: each column uncovers its own band of the slate as it
     rises, so the speed of the columns IS the speed of the reading.

     0.30 -> 0.72 gives the wipe 42% of a 195vh travel, roughly 82vh of scroll,
     which is about twice what it had when it was only taking the hero away.
     Tighten this and the words arrive faster than they can be read; widen it
     much further and the staircase stops feeling like an edit.

     The paragraphs above still describe the SHAPE of the wipe correctly; the
     numbers they quote (0.54 / 0.94) are historical.

     Ending at 0.72 rather than 1.0 is what leaves the finished card held on
     black for a beat before it fades - see lineOutFrom. */
  curtainStart: 0.3,
  curtainEnd: 0.72,

  /* ---------------- Beat 5: the slate goes ---------------- */

  /*
   * There is deliberately NO reveal range here any more.
   *
   * The slate has no animation of its own: its sixteen slices ride
   * --cut-curtain, the same channel the black columns ride, because they are
   * the same motion. Adding a second timeline for the type is exactly the
   * mistake this version removed - it made the transition and the statement
   * two events instead of one.
   */

  /**
   * The finished card holds from 0.72, then fades over the last stretch, so
   * the moment the sticky frame is released there is nothing on screen to jump.
   *
   * Do not shorten this to a snap: a title card that vanishes on one frame
   * reads as a bug, not an edit.
   */
  lineOutFrom: 0.9,
  lineOutTo: 1,
} as const;

export default CUT;
