/* ------------------------------------------------------------------
   THE WORK CAROUSEL - MOBILE TUNING

   A SEPARATE FILE, AND IT HOLDS DESIGN DECISIONS ONLY.

   Nothing in here duplicates a number that already lives in the engine.
   That is deliberate and it is the main thing to preserve if this file is
   extended: the framing solve needs the camera's field of view, the
   helix radius, the card width and the fog distances, and every one of
   those is owned by dither/gl/config.js. Copying them here would create
   a second source of truth that silently rots the first time anyone
   drags a slider in the lil-gui panel.

   So the solve itself lives in dither/engine.ts, where `config` is in
   scope and can be read directly. This file supplies only the things
   that are genuine choices - what fraction of the frame the work should
   fill, how much scroll a card is worth - and the engine supplies the
   facts.

   Same shape as config/rakeLight.ts and config/deskStageMobile.ts: a
   desktop baseline, a mobile override block, and one resolver. Third
   section to follow it.

   ------------------------------------------------------------------
   THE ROOT CAUSE, AND IT IS THE THIRD TIME THIS SITE HAS HAD IT

   The camera is a PerspectiveCamera with a fixed VERTICAL fov of 48deg.
   The horizontal one is derived, so the visible WIDTH is proportional to
   the aspect ratio:

     visibleWidth = 2 * distance * tan(fov / 2) * aspect

   The front of the helix sits at cameraZ - radius = 10 - 3.8 = 6.2, so
   the visible width there is 5.52 * aspect:

     1920 x 1080   aspect 1.78   ->   9.81 units   card 3.2 = 33% of frame
      390 x  750   aspect 0.52   ->   2.87 units   card 3.2 = 111% OF FRAME

   The card is WIDER THAN EVERYTHING THE CAMERA CAN SEE. That is the
   crop on both edges, and no amount of CSS can reach it because the
   overflow happens in clip space.

   Identical in kind to the rake's blade width (a uv distance multiplied
   by aspect) and the desk laptop's framing (the same expression, same
   fix). THE RULE, NOW WRITTEN IN THREE CONFIGS: any value the renderer
   scales by aspect ratio is not a constant. Either normalise it or solve
   for it.
   ------------------------------------------------------------------ */

/* 768 across the site: SMOOTH_SCROLL.mobileMaxWidth, RAKE_BREAKPOINT,
   DESK_MOBILE_BREAKPOINT, MOBILE_BREAKPOINT in useHeroIntroAnimation.
   Crossing it changes the scroller - Lenis is not installed at or below
   this width - so it is a behavioural boundary, not just a layout one. */
export const WORK_MOBILE_BREAKPOINT = 768;

/* ==================================================================
   FIT-TO-FRAME

   Rather than shrinking the cards, the camera is pushed back until the
   card fits. That choice matters: cardWidth and cardHeight are baked
   into the PlaneGeometry at construction AND into coverRatio() (which
   crops each project image to the card) AND into entryAspect() (which
   shapes the dithered arrival front). Changing the card would move all
   three. Moving the camera moves none of them - the composition is
   identical, just further away - so the shaders never learn that
   anything happened.

   `widthFraction` is the real decision here. Desktop lands at ~0.33 of
   the frame with the empty field around it doing the compositional work.
   That ratio cannot survive portrait: 33% of 390px is a 129px card, a
   thumbnail of a website screenshot, which is illegible. So on a phone
   the work fills most of the width and the surrounding field is spent
   instead.
   ================================================================== */
export const WORK_MOBILE_FRAME = {
	/* Fraction of the viewport WIDTH the front card should span. Not 1.0:
	   the helix is shingled and the motion bend bows the card's corners
	   outward as it turns, so a card solved to exactly fill the frame
	   clips its own edges while moving. */
	widthFraction: 0.86,
	/* Never pull the camera IN from the desktop position. On a short wide
	   window the solve would otherwise zoom toward the helix and crop it
	   vertically instead - the same bug rotated ninety degrees. Read as
	   "only ever push back". */
	minCameraZ: 10,
	/* Hard ceiling, so a freak aspect ratio cannot send the helix to a
	   vanishing point. */
	maxCameraZ: 18,
} as const;

/* ==================================================================
   THE SCROLL BUDGET

   Viewport heights of pinned scroll per card, plus the hold at the end
   that keeps the View more offer on screen.

   Desktop spends 0.9 per card across eight cards plus 1.6 of hold: 8.8
   viewport heights of pinned scroll. That is tuned to a wheel, which
   moves a lot of document per gesture. A thumb swipe moves far less, so
   the same budget on a phone is roughly twenty swipes to cross one
   section - which reads as the page having jammed rather than as a slow
   reveal.

   Below about 0.45 per card the dither has no time to resolve between
   cards and the whole effect reads as a blur, so this is a floor as well
   as a preference.
   ================================================================== */
export const WORK_DESKTOP_SCROLL = {
	perCard: 0.9,
	cueDwell: 1.6,
} as const;

export const WORK_MOBILE_SCROLL = {
	perCard: 0.55,
	/* The hold also shrinks, but proportionally less. It exists so the cue
	   is not carried off screen by the same gesture that revealed it, and
	   that is a fixed amount of reading time rather than a fraction of the
	   section. */
	cueDwell: 1.1,
} as const;

/* ==================================================================
   GRAIN

   ditherScale is a cell size in DEVICE PIXELS, which makes it the same
   family of bug as the rake's `shadow` (a uv offset) - a resolution-
   dependent unit tuned at one resolution.

   The engine caps its pixel ratio at 1.5. A desktop at dpr 1 therefore
   gets 7.5 device px = 7.5 CSS px cells; a phone at dpr 3 is capped to
   1.5, so the same 7.5 becomes 5 CSS px. Finer cells on the screen where
   the pattern has the least room to be read, which is backwards.

   9 device px / 1.5 = 6 CSS px: slightly coarser than desktop in
   physical terms, so the grain still reads as a pattern at arm's length
   rather than dissolving into noise.

   THIS IS THE COSMETIC ONE. If the mobile grain looks wrong, revert this
   to 7.5 first - it is independent of the framing solve above and
   changing it cannot affect the layout.
   ================================================================== */
export const WORK_MOBILE_GRAIN = {
	ditherScale: 9,
} as const;

/* ==================================================================
   THE RESOLVER
   ================================================================== */

export type WorkScrollTuning = {
	perCard: number;
	cueDwell: number;
};

export type WorkFrameTuning = {
	widthFraction: number;
	minCameraZ: number;
	maxCameraZ: number;
};

export type WorkGrainTuning = {
	ditherScale: number;
};

export type WorkTuning = {
	isMobile: boolean;
	scroll: WorkScrollTuning;
	/* Null on desktop, and the engine treats null as "change nothing".
	   That is the whole isolation story for the GL layer: on a desktop
	   viewport no value is written to `config` at all, so the pipeline runs
	   on exactly the numbers it shipped with. */
	frame: WorkFrameTuning | null;
	grain: WorkGrainTuning | null;
};

export function resolveWorkTuning(viewportWidth: number): WorkTuning {
	const isMobile = viewportWidth <= WORK_MOBILE_BREAKPOINT;

	if (!isMobile) {
		return {
			isMobile: false,
			/* Spread rather than returned by reference, so a consumer cannot
			   reach back into the baseline and edit it. */
			scroll: { ...WORK_DESKTOP_SCROLL },
			frame: null,
			grain: null,
		};
	}

	return {
		isMobile: true,
		scroll: { ...WORK_MOBILE_SCROLL },
		frame: { ...WORK_MOBILE_FRAME },
		grain: { ...WORK_MOBILE_GRAIN },
	};
}
