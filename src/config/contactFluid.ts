/* ------------------------------------------------------------------
   THE CONTACT FLUID - progress made physical

   The contact card fills with liquid as the visitor answers. Not a
   progress bar: a bar is a measurement, and measurements invite
   arithmetic ("four more questions"). A rising level is felt instead of
   counted, and by the time the brief form arrives the card is nearly
   full - which is the whole trick. Finishing something that is almost
   finished is easy; starting a form is hard.

   Numbers only in here. The colour lives in styles/contact.css with the
   rest of the palette, and the level itself arrives as the --cf-level
   custom property, written by ContactSection.tsx.
   ------------------------------------------------------------------ */

export const CONTACT_FLUID = {
	/* THE ENDOWED HEAD START, as a percentage of the card's height.
	   Nunes & Dreze (2006) turned an eight-stamp loyalty card into a
	   ten-stamp card with two stamps already filled, and watched
	   completion rates climb: identical work, but the task reframes from
	   'not yet begun' to 'underway and unfinished'.

	   Reads higher than the number. The crest rides ON TOP of this and
	   the blur spreads it further still, so the PERCEIVED pool is close
	   to double - which is why 18 sat too high in the card. */
	restingLevel: 10,

	/* The level at every question answered. Stops short of the card's top
	   so the crest always has room to move - liquid pinned flat against a
	   ceiling stops looking like liquid. */
	fullLevel: 92,

	/* THE GOAL GRADIENT. The visible level is the honest fraction raised
	   to this power. Below 1 the curve is concave, so early answers move
	   the surface much further than late ones: one click lands past
	   halfway, and from the third click on the card is permanently
	   'almost full'. Kivetz, Urminsky & Zheng (2006) named this
	   illusionary goal progress - Duolingo ships exactly this, and its
	   users notice the bar racing ahead early and crawling at the end.

	   The constraint that keeps it honest-feeling: every click still
	   moves the surface 6-13%, so no click is ever visually wasted.
	   That is the part most non-linear progress bars get wrong. */
	curve: 0.45,

	/* THE RISE. Long and eased-out, because the point is the sensation of
	   the liquid arriving rather than a value being updated. Anything
	   under a second here reads as a UI response; this should read as a
	   pour. */
	riseDuration: 0.95,
	riseEase: 'power3.out',

	/* THE SLOSH. The level overshoots by this fraction of the distance it
	   travelled, then settles back down to rest. This single detail is
	   what separates "liquid" from "fill": real water carries its own
	   momentum past the line and comes back. */
	overshoot: 0.12,
	settleDuration: 0.5,
	settleEase: 'sine.inOut',

	/* DRAINING (GO BACK) is quicker and has no slosh. Losing progress is
	   not a moment worth savouring, so it is over before it registers. */
	drainDuration: 0.42,
	drainEase: 'power2.inOut',
} as const;
