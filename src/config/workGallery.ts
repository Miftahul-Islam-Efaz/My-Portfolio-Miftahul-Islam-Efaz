/* ------------------------------------------------------------------
   THE WORK GALLERY AND ITS CUE

   Every tunable number for the grid overlay and the little offer that
   opens it. Handed to CSS as inline custom properties, so the
   stylesheets hold no numbers of their own and this stays the single
   place to retime either.

   Timings are the case study window's, deliberately: the gallery is a
   sibling of that window, not a new kind of thing, and the two are seen
   one after the other constantly. The opening pair (620 / 420) is a
   little quicker than the study's (700 / 520) because the gallery is a
   step on the way somewhere rather than a destination.
   ------------------------------------------------------------------ */

export const WORK_GALLERY_MOTION = {
	openDuration: 620,
	closeDuration: 420,
	/* The site's easing. Same curve as the case study window and the
	   vault window - see config/caseStudy.ts. */
	openEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
	closeEase: 'cubic-bezier(0.64, 0, 0.78, 0)',

	/* THE INTRO REVEAL. Tiles come up in reading order, each one a step
	   behind the last. tileBase holds the whole grid back until the head
	   has arrived, so there is something to read while they land.

	   52ms is the important number. Much less and the stagger stops
	   reading as a sequence; much more and the last tile in an eight-up
	   grid arrives half a second after the first, which feels slow
	   rather than considered. */
	tileBase: 180,
	tileStagger: 52,
	tileDuration: 560,
};

/* The address the gallery answers to. A hash, not a path: this is an
   overlay on the home document rather than a route of its own, so
   /#work reloads harmlessly where /work would 404. Same idiom as the
   vault teaser, which reads /#vault while it is open. */
export const WORK_GALLERY_HASH = '#work';

export const WORK_GALLERY_COPY = {
	title: 'Selected Work',
	close: 'Close',
	aria: 'Work gallery',
	/** A project with no written case study yet. */
	soon: 'Soon',
};

/* ------------------------------------------------------------------
   THE VIEW MORE CUE

   Shown when the pinned helix has run out of scroll AND the visitor
   keeps pushing down. Both conditions matter - the first alone would
   show it to everyone who merely reaches the end of the section, which
   turns an offer into an interruption.
   ------------------------------------------------------------------ */
export const WORK_CUE_MOTION = {
	/* Slower in than out, and slower than it was. The cue arrives while
	   the visitor is mid-gesture and looking at the bottom of the frame,
	   so it has to be seen ARRIVING - a fast fade at the edge of
	   attention is what made it read as a popup rather than a reveal. */
	showDuration: 720,
	hideDuration: 320,
	showEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
	hideEase: 'cubic-bezier(0.4, 0, 1, 1)',

	/* The label wipes in behind the plate rather than with it, which is
	   what stops the whole thing appearing as one flat card. */
	labelDelay: 140,
	labelDuration: 620,

	/** No further downward intent for this long and the offer retires. */
	idleTimeout: 9000,
	/** Accumulated downward delta, in px, before it is offered at all. */
	intentThreshold: 40,
};

export const WORK_CUE_COPY = {
	label: 'View more',
	aria: 'Open the work gallery',
};
