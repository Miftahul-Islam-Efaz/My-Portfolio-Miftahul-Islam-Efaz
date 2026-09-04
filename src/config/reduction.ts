/* ------------------------------------------------------------------
   THE REDUCTION - choreography and reasoning

   The section that answers "who is this and what does he do" in the
   two seconds after the hero. It is the only LIGHT section on the
   site, sitting between the black hero and the black work helix. That
   inversion is the point: the page holds its breath here.

   THE ARGUMENT THE MOTION CARRIES

   A field of the things a site could say - room rates, service pages,
   adjectives, stock photography - is struck out one item at a time
   until a single sentence is left standing. The animation IS the
   service being described: finding the one true thing and building
   everything around it. Per the site's own rule, motion that does not
   carry the argument is decoration, so nothing here moves that is not
   either being eliminated or being resolved.

   THREE ACTS, ONE PIN

   The stage pins once and the three acts are windows on the same
   scroll progress, deliberately OVERLAPPING. The statement starts
   assembling while the last fragments are still being struck, so the
   viewer never watches an empty screen waiting for the next beat.

   Overlap is why these are ranges and not a sequence of durations. If
   you retune, keep `assemble.start` inside the strike window or the
   section develops a dead spot in the middle.
   ------------------------------------------------------------------ */

/** Warm, unbleached neutrals. `paper` is the section ground, `void` is
 *  the colour of the sections either side of it - both ends of the
 *  stage fade to it so there is never a drawn seam, the same rule the
 *  work section follows. */
export const REDUCTION_THEME = {
	paper: '#EDE7DA',
	paperDeep: '#E1D8C6',
	ink: '#26282D',
	ember: '#b56c4b',
	void: '#050505',
} as const;

/** Scroll geometry. `vhPerScreen` multiplies viewport height to set the
 *  pinned scroll distance: 2.6 screens of scroll for one screen of
 *  content. Lower it and the acts trip over each other; raise it and
 *  the section feels like a toll booth. */
export const REDUCTION_SCROLL = {
	vhPerScreen: 2.6,
	/** Fragments are struck across this window of pin progress. */
	strike: { start: 0.04, end: 0.56 },
	/** The statement assembles here - note it opens BEFORE strike ends. */
	assemble: { start: 0.38, end: 0.74 },
	/** Proof columns and the sign-off. */
	proof: { start: 0.72, end: 0.94 },
	/** Top and bottom fade to `void`, as a fraction of stage height. */
	edgeFade: 0.14,
} as const;

/** The fragment field. Canvas 2D, not WebGL: it is flat text on a flat
 *  ground, a shader would buy nothing, and this keeps the section free
 *  of the texture-decode failure modes the card helix has. */
export const REDUCTION_FIELD = {
	/** Fragments live on a jittered grid so the field reads as a spread
	 *  rather than a list, without the clumping pure random gives. */
	columns: 4,
	jitter: 0.28,
	/** Type size range in px at a 1440px stage; scaled by stage width. */
	sizeMin: 11,
	sizeMax: 15,
	/** Resting opacity of an unstruck fragment. Low on purpose - this is
	 *  noise, and it must never compete with the statement. */
	inkAlpha: 0.36,
	/** Opacity a struck fragment settles at, rather than 0: the evidence
	 *  of what was considered and rejected stays faintly on the page. */
	struckAlpha: 0.09,
	/** Seconds for one strike-through to draw. */
	strikeDuration: 0.34,
	/** Vertical drift, in px, across the whole pin. Slow enough to feel
	 *  like paper settling, not enough to be read as scrolling. */
	drift: 26,
	/** Strike rule thickness in px, and how far it overshoots the text. */
	ruleWidth: 1.25,
	ruleOverhang: 3,
} as const;

/** The statement. Words rise out of the baseline and tighten as they
 *  land - the tightening is what makes it read as "resolving" instead
 *  of "appearing". */
export const REDUCTION_STATEMENT = {
	riseFrom: 34,
	spacingFrom: 0.14,
	duration: 0.9,
	stagger: 0.055,
	/** The accent word scales its own underline rule after it lands. */
	underlineDelay: 0.34,
	underlineDuration: 0.5,
} as const;

/** Proof columns and the hand-off line. */
export const REDUCTION_PROOF = {
	rise: 22,
	duration: 0.62,
	stagger: 0.09,
	/** The rule above each column draws left to right. */
	ruleDuration: 0.5,
	/** The final hand-off line, which points at the work section. */
	signoffDelay: 0.22,
} as const;

export const REDUCTION_EASE = 'expo.out';
