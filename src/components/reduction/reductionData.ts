/* ------------------------------------------------------------------
   THE REDUCTION - content

   Every fact here traces to the professional context page. Nothing is
   rounded up, nothing is invented, and no client outcome is claimed
   that is not already published on a live site.

   THE FRAGMENTS are the things this site could have said and did not.
   Four of them are real decisions from real projects, which is what
   keeps the field from reading as a straw man:

     "room rates"        Sonapahar led with the Miyawaki forest instead
     "five service pages" PencilLink became one climbing ladder
     "a photo grid"      Rene became a cinematic sequence
     "adjectives"        Bela Vista handed trust to real reviews

   The rest are the category's defaults. They are struck out in the
   order listed, so the four real ones land early while the viewer is
   still reading closely, and the generic ones sweep past later.
   ------------------------------------------------------------------ */

export type ReductionFragment = {
	/** The text on the page. Kept short - this is peripheral vision. */
	text: string;
	/** true marks a real decision from a shipped project rather than a
	 *  category cliche. Real ones are struck with a slightly heavier
	 *  rule, so the field has texture without needing a second colour. */
	real?: boolean;
};

export const REDUCTION_FRAGMENTS: ReductionFragment[] = [
	{ text: 'room rates', real: true },
	{ text: 'five service pages', real: true },
	{ text: 'a photo grid', real: true },
	{ text: 'adjectives', real: true },
	{ text: 'we are passionate about design' },
	{ text: 'lorem ipsum dolor' },
	{ text: 'stock photography' },
	{ text: 'a hero carousel' },
	{ text: 'scroll to explore' },
	{ text: 'trusted by industry leaders' },
	{ text: 'end-to-end solutions' },
	{ text: 'let us tell our story' },
	{ text: 'our journey began' },
	{ text: 'award-winning team' },
	{ text: 'synergy' },
	{ text: 'innovative and dynamic' },
	{ text: 'a bigger logo' },
	{ text: 'another gradient' },
	{ text: 'one more testimonial' },
	{ text: 'we think outside the box' },
	{ text: 'seamless experiences' },
	{ text: 'pixel-perfect' },
	{ text: 'passionate about pixels' },
	{ text: 'cutting-edge technology' },
	{ text: 'get in touch today' },
	{ text: 'a mission statement' },
	{ text: 'core values' },
	{ text: 'best-in-class' },
	{ text: 'a parallax section' },
	{ text: 'meet the team' },
	{ text: 'we are a leading studio' },
	{ text: 'digital transformation' },
];

/** The statement, as words, so the reveal can stagger them without a
 *  split library. `accent` marks the one word that gets the ember rule
 *  under it - one accent, used once, on the word the whole section is
 *  built to deliver. */
export type StatementWord = { text: string; accent?: boolean };

export const REDUCTION_STATEMENT_WORDS: StatementWord[] = [
	{ text: 'Most' },
	{ text: 'sites' },
	{ text: 'are' },
	{ text: 'decoration.' },
	{ text: 'I' },
	{ text: 'build' },
	{ text: 'the' },
	{ text: 'ones' },
	{ text: 'that' },
	{ text: 'earn.', accent: true },
];

/** Read by screen readers and by the page metadata, so the sentence
 *  exists once as a string and is never reassembled by hand. */
export const REDUCTION_STATEMENT_TEXT = REDUCTION_STATEMENT_WORDS.map(
	(word) => word.text
).join(' ');

export const REDUCTION_EYEBROW = '01 / THE POINT';

/** Three capabilities, each with checkable evidence rather than an
 *  adjective. "Eight sites live" is the shipped count on the context
 *  page; the stacks are the ones actually used. */
export type ProofColumn = {
	index: string;
	label: string;
	body: string;
};

export const REDUCTION_PROOF_COLUMNS: ProofColumn[] = [
	{
		index: '01',
		label: 'BUILD',
		body: 'Next.js, Supabase, shipped on Vercel. Eight sites live.',
	},
	{
		index: '02',
		label: 'DESIGN',
		body: 'One accent. Sixty, thirty, ten. Nothing decorative.',
	},
	{
		index: '03',
		label: 'AUTOMATE',
		body: 'n8n, MCP, Gemini. The half a client never sees.',
	},
];

/** The hand-off. It names the place and then points down the page, so
 *  the section ends on an instruction rather than on a summary - and
 *  the thing it points at is the next section, already built. */
export const REDUCTION_SIGNOFF = {
	place: 'Chattogram, building for clients abroad.',
	handoff: 'The proof starts below.',
} as const;
