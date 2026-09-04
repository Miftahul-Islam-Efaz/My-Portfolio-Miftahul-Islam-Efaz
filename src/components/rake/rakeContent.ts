/* ------------------------------------------------------------------
   THE RAKE - content

   Stripped to the main thing. One sentence, one cue.

   WHAT WAS REMOVED and why it is safe: the eyebrow ("01 / THE POINT")
   was labelling, and the three proof columns (DESIGN / BUILD /
   AUTOMATE) were saying what the work section immediately proves
   anyway. Nothing here is load-bearing for the copy that remains, and
   the section directly below is the evidence.

   If the columns are ever wanted back, they belong further down the
   sweep - not in this frame. Keeping them here is what made the last
   pass feel crowded and cost the statement its scale.
   ------------------------------------------------------------------ */

/** Split by hand, not measured-wrapped. At this size the line break is
 *  a typographic decision: "decoration." ends a line so the turn lands
 *  on its own. */
export const RAKE_STATEMENT_LINES = [
	'Most sites are decoration.',
	'I build the ones that earn.',
] as const;

/* ------------------------------------------------------------------
   THE SAME SENTENCE, RE-BROKEN FOR PORTRAIT.

   Not a wrap - another hand-split, for the same reason the desktop one
   is hand-split. The desktop lines are ~26 characters; at any size
   readable on a 390px screen they simply run off the frame, and the
   mask is drawn with fillText, which does not wrap. So the choice is
   an explicit break here or clipped type there.

   THE BREAKS ARE STILL DECISIONS, not arithmetic:
     - "decoration." keeps its own line, so the turn still lands alone.
     - "ones that earn." stays intact, so the accent word is never the
       only thing on a line and never separated from what it qualifies.

   The scene shrinks-to-fit as a safety net on top of this (see
   fitStatementSize in gl/scene.ts), so a longer future sentence
   degrades gracefully instead of overflowing. That net is a fallback,
   not a licence to skip the hand-split - it costs type size.

   KEEP BOTH SETS SAYING THE SAME THING. They are one sentence in two
   arrangements; if the copy changes, change it twice.
   ------------------------------------------------------------------ */
export const RAKE_STATEMENT_LINES_MOBILE = [
	'Most sites are',
	'decoration.',
	'I build the',
	'ones that earn.',
] as const;

/** The one word that takes the accent colour, matched at draw time.
 *  Word-for-word, so it works against either arrangement above without
 *  knowing which one is in play. */
export const RAKE_ACCENT_WORD = 'earn.';

export const RAKE_STATEMENT_TEXT = RAKE_STATEMENT_LINES.join(' ');

/** Pick the arrangement for the frame being drawn. The scene asks for
 *  this rather than reaching for a breakpoint itself - form-factor
 *  decisions stay in config/rakeLight.ts. */
export const statementLinesFor = (isMobile: boolean): readonly string[] =>
	isMobile ? RAKE_STATEMENT_LINES_MOBILE : RAKE_STATEMENT_LINES;

/** The only other text in the frame. Functional: it tells the viewer
 *  the sweep ends and the work begins. Sits far right, so it is the
 *  last thing the blade touches before leaving frame. */
export const RAKE_HANDOFF = 'THE PROOF STARTS BELOW';
