/* ------------------------------------------------------------------
   THE COMPOSITOR - copy

   Data, not markup, so the timeline can index into it and a word change
   never means touching a component.

   ------------------------------------------------------------------
   WHY THIS TEXT AND NOT A DESCRIPTION OF SKILLS

   The brief for this section is "tell users how good I design", and the
   single worst way to do that is to tell them. "Passionate about design",
   "pixel-perfect", "award-winning" - all of it is a claim the visitor has
   to take on trust, and all of it is banned by the storytelling skill's
   list for exactly that reason.

   So the copy makes a claim the SECTION ITSELF then settles, in front of
   them, within about two seconds of scrolling:

       Anyone can write this sentence.
       Look what happens when I set it.

   That is a gap opened and deliberately left open - the classic move -
   and the mechanism closes it. "Set" is doing the work: it is the
   typesetter's verb, it is the one word in the sentence that only
   someone who does this for a living would choose, and it is the word
   the ember lands on during the ACCENT beat. The sentence is also
   literally true of itself, which is why it can be arrogant without
   being a boast: the visitor is reading the proof, not a description of
   it.

   STRUCTURE: single-frame. One sentence, one transformation, no journey.
   THE TURN: raw material -> judgement. Nothing is added to the text; it
   is only decided about, which is the actual definition of the craft and
   the reason this reads as design rather than as animation.

   No metrics, no client names, no invented results anywhere in here.
   ------------------------------------------------------------------ */

/* The statement, one entry per line. Split into words because the weight
   blend, the scale ramp and the accent all operate per word - a single
   string would force the timeline to re-parse the DOM. */
/* `face` selects the typeface, and the PAIRING IS THE ARGUMENT.

   Line 1 is set LARGE in Monare, the display face. Line 2 is set SMALL
   in ARK_ES Dense, the same spec face as the sheet furniture around it.

   The fill decides this, not the semantics. Monare is a clean condensed
   face whose counters hold a photographic plate; ARK_ES Dense is a
   beaded face that samples the same plate into rubble at display size.
   So the ink belongs on line 1, which means the display face does too.

   Monare ships a single weight, so the fake weight axis cannot run on
   line 1 at all. The SIZE drop between the lines carries the turn
   instead: one huge opening claim, then one small exact line beneath it,
   which is the one that reads as deliberate. Scale is a typesetting
   decision too - arguably the first one anybody makes.

   Both files were verified to cover this exact sentence before use:
   Monare 198 glyphs, ARK_ES 222, both 26/26 upper and lower, nothing
   missing. A display face that silently falls back mid-word is the
   usual way this idea fails. */
export const COMPOSITOR_STATEMENT = [
  { face: 'display', words: ['Anyone', 'can', 'write', 'this', 'sentence.'] },
  {
    face: 'spec',
    words: ['Look', 'what', 'happens', 'when', 'I', 'set', 'it.'],
  },
] as const;

/* The one word that takes the accent, addressed by line and word index
   rather than by string match - matching on 'set' would also catch a
   'set' added to the first line later. */
export const COMPOSITOR_ACCENT_TARGET = { line: 1, word: 5 } as const;

/* The eyebrow, in the raw sheet's own language. */
export const COMPOSITOR_EYEBROW = 'Sheet 02 \u2014 Composition';

/* The five decisions, in order, as the readout prints them. These are
   the beats in COMPOSITOR_BEATS and the labels must stay in that order.

   RESTRAINT is the last one and it is the only one that REMOVES
   something. Naming it as a decision is the point of the whole section:
   taking the grid away is as deliberate as drawing it. */
export const COMPOSITOR_DECISIONS = [
  { index: '01', label: 'Grid' },
  { index: '02', label: 'Scale' },
  { index: '03', label: 'Weight' },
  { index: '04', label: 'Accent' },
  { index: '05', label: 'Restraint' },
] as const;

/* Margin notes. Every one of these is a real value from
   src/config/compositor.ts or the stylesheet - an annotation layer that
   lies about its own measurements would be the exact failure this
   section is arguing against. Keep them true if the tuning changes. */
export const COMPOSITOR_NOTES = [
  'Baseline 8px',
  'Measure 62ch',
  'Leading 2.1 \u2192 1.02',
  'Weight 300 \u2192 700',
  'Accent #B56C4B \u2014 one use',
] as const;

/* The line that lands after the strip, once the sheet is bare. Quiet,
   small, and it widens the claim from this sentence to the whole site -
   which is the only sales move in the section and it arrives after the
   proof rather than before it.

   Structure: single-frame. The turn it hinges on is raw material ->
   judgement - the same turn the mechanism just performed - so the line
   reports what the visitor watched instead of asserting something new.

   "five decisions" had to go regardless: the 01-05 index row was removed
   in an earlier pass, so the sentence was counting something that is no
   longer on screen. No number replaces it. A figure about my own work is
   an invented metric and the skill forbids it. */
export const COMPOSITOR_CLOSE =
  'Nothing was added to that sentence. It was only decided about. ' +
  'So was everything else you have scrolled past.';

