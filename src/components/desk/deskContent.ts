/* ------------------------------------------------------------------
   THE DESK - copy

   Kept in its own file so the wording can be refined without touching
   the component, the motion or the stylesheet. Marked as placeholder
   copy from the mockup - he intends to rewrite it.
   ------------------------------------------------------------------ */

/* The statement that comes out from behind the laptop during DISPLACE.
   One entry per line: the two lines are set at different sizes, so they
   are separate nodes rather than one string with a <br>. */
export const DESK_STATEMENT: readonly string[] = [
  "Hi, I'm a",
  'Full-Stack Product Builder',
];

/* Which line index is the emphasised one. Line 2 carries the weight;
   line 1 is the lead-in. */
export const DESK_STATEMENT_LEAD = 1;

/* Alt text for the stars is deliberately empty - they are decorative
   marks, and describing them to a screen reader adds noise, not
   information. They are aria-hidden in the markup for the same reason.
   This constant exists only so nobody "fixes" that by inventing alt
   text later. */
export const DESK_STAR_ALT = '';

/* Announced to assistive tech in place of the 3D canvas, which is
   otherwise an unlabelled blank element. */
export const DESK_CANVAS_LABEL =
  'A laptop opening to show the portfolio homepage on its screen.';
