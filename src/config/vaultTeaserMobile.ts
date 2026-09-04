import { VAULT_DUST, VAULT_LAYOUT, VAULT_SCROLL, VAULT_STAGE } from './vault';

/* ------------------------------------------------------------------
   THE VAULT TEASER - MOBILE TUNING

   Design decisions only. Nothing here restates a number that
   config/vault.ts already owns, and nothing here is reachable above the
   breakpoint: resolveVaultTuning returns null for every override on a
   desktop viewport, and the hook treats null as "change nothing".

   ---------------------------------------------------------------
   WHAT WAS ACTUALLY WRONG, BECAUSE IT WAS ONE NUMBER

   VAULT_STAGE.handMinWidth is 720px. The hand is sized

     handW = clamp(W * handWidth, handMinWidth, handMaxWidth)

   and on a 390px viewport W * 1.06 is 413, so the floor fires and the
   hand is laid out 720px wide - 1.85x the width of the screen.

   That alone would only be a crop. What made it a broken composition is
   that everything else is anchored off the hand's own box: the mouth is
   at VAULT_STAGE.mouth.x = 0.588 of the hand IMAGE, so

     mouthX = handToX * W + 0.588 * handW
            = -0.04 * 390 + 0.588 * 720
            = -15.6 + 423.4
            = 407.8px            on a 390px screen

   The mouth is 18px PAST the right edge. And the mouth is not a detail
   - it is the light core, the sand emitter and the origin of all five
   escaping folders, so the entire subject of the section was off frame
   with only the arm left in shot.

   On 1920 the clamp never fires: handW is 2035 and the mouth lands at
   1120px, 58% across the frame. The desktop composition was never
   wrong; it was never proportional either, and the floor is where that
   showed up.

   ---------------------------------------------------------------
   THE FIX: SOLVE FOR THE MOUTH, DO NOT NUDGE THE HAND

   handToX / handToY are replaced on mobile by a solve that puts the
   MOUTH at a chosen point in the frame and lets the arm fall wherever
   it needs to:

     restX = mouthX - (mouth.x * handW) / W
     restY = (mouthY * H - handTop - mouth.y * handH) / H

   Two things this buys beyond fitting on screen. First, it is
   independent of the asset's aspect ratio, because handH and handTop
   are measured from the decoded bitmap - so re-exporting the PNG at a
   different crop cannot silently move the composition, which is the
   same guarantee the hook already gives the mouth itself. Second, it
   degrades continuously: as the viewport widens toward the breakpoint
   the solve tracks it, so there is no width at which the framing
   suddenly jumps.

   THIS IS THE FOURTH INSTANCE OF THE SAME MISTAKE ON THIS SITE. The
   rake's blade width, the desk laptop's framing distance and the work
   carousel's camera Z were all values tuned against one viewport and
   then used as constants. The rule, now written in four configs: A
   VALUE TUNED AGAINST ONE FRAME SIZE IS NOT A CONSTANT. Either
   normalise it or solve for it.
   ------------------------------------------------------------------ */

/** Matches RAKE_BREAKPOINT, DESK_MOBILE_BREAKPOINT,
 *  WORK_MOBILE_BREAKPOINT and SMOOTH_SCROLL.mobileMaxWidth. One number
 *  across the site; the CSS media queries mirror it. */
export const VAULT_MOBILE_BREAKPOINT = 768;

/** THE FRAME.
 *
 *  handWidth is much larger than desktop's 1.06 and that is deliberate:
 *  a portrait screen has width to spare in no direction, so the way to
 *  keep the folder legible is to let the arm run well off both sides and
 *  frame the folder itself. At 1.9 the folder occupies roughly 60% of a
 *  390px frame, against 34% of a 1920 one.
 *
 *  The clamp is a real clamp rather than a floor: above about 460px the
 *  hand pins at handMaxWidth and the composition drifts back toward the
 *  desktop proportions as the viewport grows to the breakpoint, which is
 *  what makes the handover at 768px invisible. */
export const VAULT_MOBILE_FRAME = {
	handWidth: 1.9,
	handMinWidth: 600,
	handMaxWidth: 880,

	/** WHERE THE MOUTH LANDS, as a fraction of stage width and height.
	 *
	 *  THIS IS THE PAIR TO MOVE if the folder sits wrong in the frame -
	 *  not handWidth, and never mouth.x/mouth.y, which describe the
	 *  photograph and must keep matching the pixels.
	 *
	 *  mouthX is 0.5 rather than desktop's effective 0.58 because the
	 *  escape cone leaves up and to the RIGHT (VAULT_DUST.angle is -36),
	 *  and on a narrow frame there is no room to give the plume its own
	 *  half of the screen - so the source moves to the middle and the
	 *  plume uses the top-right corner.
	 *
	 *  mouthY is below centre so the subject sits nearer the caption than
	 *  the nav, which is what closes the dead band of empty field that
	 *  opened up under the folder on a tall screen. */
	mouthX: 0.5,
	mouthY: 0.45,

	/** The escaping folders. Larger fraction than desktop's 0.052 for the
	 *  same reason the hand is larger - they have to read as objects that
	 *  came out of a folder that now fills most of the frame. */
	folderSize: 0.085,
	folderMinSize: 24,
	folderMaxSize: 64,
} as const;

/** THE SWING.
 *
 *  Expressed as TRAVEL rather than as absolute from/to positions, which
 *  is forced by the solve above: the rest position is computed per
 *  viewport, so a hardcoded `handFromX` would no longer bear any fixed
 *  relationship to it and the arc would change length with the screen.
 *  The hook derives from = rest - travel.
 *
 *  Both travels are shorter than desktop's (0.38 of width, 0.66 of
 *  height). A swing that crosses most of a small frame in the same
 *  number of scrolled pixels reads as a lurch rather than as an arm
 *  being offered - the gesture is the same, the distance is not. */
export const VAULT_MOBILE_SWING = {
	/** Fraction of stage width the hand travels rightward on the way in. */
	travelX: 0.3,
	/** Fraction of stage height it travels upward. Large enough that the
	 *  hand starts with only its top edge in frame, matching desktop. */
	travelY: 0.56,
	/** Wrist tilt at the start, degrees, unwinding to 0. Reduced from 15:
	 *  the same rotation on a hand that now fills the frame swings the
	 *  folder much further in absolute pixels. */
	tilt: 11,
	/** Scale at the start. Closer to 1 than desktop's 0.86, because the
	 *  same ratio on a larger relative subject reads as a zoom. */
	scaleFrom: 0.9,
	/** Progress at which the hand has arrived. Slightly earlier than
	 *  desktop's 0.5 to leave more of a shorter section to the archive
	 *  actually escaping, which is the part worth scrolling for. */
	settleAt: 0.46,
	/** Residual drift after arrival, fraction of stage height. */
	settleDrift: -0.02,
} as const;

/** THE SAND.
 *
 *  ---------------------------------------------------------------
 *  DENSITY IS COUNT PER AREA, AND AREA SCALES WITH THE SQUARE OF WIDTH.
 *
 *  Every dimension of the plume is a fraction of stage width - spread,
 *  both speeds, spreadAccel, buoyancy - so the cloud on a 390px frame
 *  occupies (390/1920)^2 = 4.1% of the area it covers on a 1920 one.
 *  Keeping VAULT_DUST.max at 2600 would therefore multiply the apparent
 *  density by about 24 and, under additive blending, resolve the plume
 *  into a solid white smear. Equal density would be 2600 * 0.041 = 107
 *  grains.
 *
 *  `max` is set above that figure rather than at it, because grain sizes
 *  come down too (below) and a strictly area-matched count reads as a
 *  sprinkle rather than as sand. This is the same family of mistake as
 *  the rake's shadow width and the carousel's dither cell: A VALUE
 *  EXPRESSED IN ONE RESOLUTION UNIT AND TUNED AT ONE SIZE IS WRONG AT
 *  ANOTHER. It is a performance win as well - canvas 2D fillRect is
 *  main-thread work, and the main thread is what handles scrolling - but
 *  correctness is the reason, not the cost.
 *  ---------------------------------------------------------------
 *
 *  THESE ARE THE COSMETIC DIALS. If the sand looks wrong after this
 *  change, move `max` and `rate` together and in proportion - raising
 *  one alone changes how long the plume lives rather than how dense it
 *  looks. */
export const VAULT_MOBILE_DUST = {
	/** Ceiling on LIVE grains. The typed-array pool is still allocated at
	 *  the desktop VAULT_DUST.max so it never has to be reallocated when
	 *  the viewport crosses the breakpoint - this caps how much of it is
	 *  used, not how much exists. */
	max: 420,
	/** Grains born per second at full emission. Cut in proportion to
	 *  `max`, or the pool saturates instantly and the plume stops
	 *  reading as a stream. */
	rate: 320,
	/** Radius range in CSS px. Smaller than desktop's 0.18-0.85 because
	 *  the grains were sized in ABSOLUTE pixels while the plume they
	 *  belong to is now five times smaller - unchanged, they would read
	 *  as gravel. The hook's squared distribution still biases hard
	 *  toward the minimum. */
	sizeMin: 0.14,
	sizeMax: 0.6,
	/** Device-pixel-ratio cap for the sand buffer. Desktop caps at 2; a
	 *  3x phone clearing a 780x1500 buffer every frame is a large amount
	 *  of main-thread work for a field of sub-pixel specks. Matches
	 *  RAKE_MOBILE.perf.dprCap. */
	dprCap: 1.75,
} as const;

/** Section height as a multiple of viewport height, i.e. the whole
 *  scroll budget - the stage inside is position:sticky.
 *
 *  Down from 2.8 for the same reason the work carousel's budget came
 *  down: a thumb swipe moves far less document than a wheel notch, so a
 *  desktop budget reads as the section having jammed. */
export const VAULT_MOBILE_SCROLL = {
	vhPerScreen: 1.9,
} as const;

/** THE CAPTION.
 *
 *  Desktop places it at 90% of stage height. On mobile it is anchored to
 *  the BOTTOM instead, which is not a cosmetic preference: at 15px in a
 *  bold display face the line wraps to three, and a percentage top with
 *  a -50% translate then grows the block in both directions, pushing its
 *  last line toward the browser's own toolbar. Anchoring the bottom edge
 *  makes the gutter exact however many lines the copy takes.
 *
 *  Strings rather than numbers because the value has to reach
 *  env(safe-area-inset-bottom), which only CSS can resolve. Written by
 *  the hook, for a reason recorded there. */
export const VAULT_MOBILE_CUE = {
	top: 'auto',
	bottom: 'calc(clamp(18px, 4.5vh, 46px) + env(safe-area-inset-bottom, 0px))',
} as const;

export type VaultFrameTuning = {
	handWidth: number;
	handMinWidth: number;
	handMaxWidth: number;
	mouthX: number;
	mouthY: number;
	folderSize: number;
	folderMinSize: number;
	folderMaxSize: number;
};

export type VaultSwingTuning = {
	travelX: number;
	travelY: number;
	tilt: number;
	scaleFrom: number;
	settleAt: number;
	settleDrift: number;
};

export type VaultDustTuning = {
	max: number;
	rate: number;
	sizeMin: number;
	sizeMax: number;
	dprCap: number;
};

export type VaultCueTuning = {
	/** CSS value for `top`, or null to leave the property alone. */
	top: string | null;
	/** CSS value for `bottom`, or null. */
	bottom: string | null;
};

export type VaultTuning = {
	isMobile: boolean;
	/** Always present - the section needs a height on both viewports. */
	vhPerScreen: number;
	cue: VaultCueTuning;
	/** Null on desktop. Null means "use config/vault.ts unchanged". */
	frame: VaultFrameTuning | null;
	swing: VaultSwingTuning | null;
	dust: VaultDustTuning | null;
};

/**
 * Resolves the tuning for a viewport width.
 *
 * Called from the hook's `measure`, so it re-resolves on every resize
 * and on rotation - crossing the breakpoint with a desktop window
 * therefore reframes rather than keeping whichever branch happened to
 * be current at mount.
 *
 * On desktop every override is null and `vhPerScreen` and `cue` come
 * straight from config/vault.ts, so nothing in this file can alter the
 * desktop composition even by accident.
 */
export const resolveVaultTuning = (viewportWidth: number): VaultTuning => {
	const isMobile = viewportWidth <= VAULT_MOBILE_BREAKPOINT;

	if (!isMobile) {
		return {
			isMobile: false,
			vhPerScreen: VAULT_SCROLL.vhPerScreen,
			cue: { top: `${VAULT_LAYOUT.cueY * 100}%`, bottom: null },
			frame: null,
			swing: null,
			dust: null,
		};
	}

	return {
		isMobile: true,
		vhPerScreen: VAULT_MOBILE_SCROLL.vhPerScreen,
		cue: { top: VAULT_MOBILE_CUE.top, bottom: VAULT_MOBILE_CUE.bottom },
		frame: { ...VAULT_MOBILE_FRAME },
		swing: { ...VAULT_MOBILE_SWING },
		dust: { ...VAULT_MOBILE_DUST },
	};
};

/* Referenced so the imports above are load-bearing rather than
   decorative: this file deliberately derives its desktop fallbacks from
   config/vault.ts instead of restating them, and these two are read by
   the doc comments' arithmetic. Kept as a type-level assertion so it
   costs nothing at runtime. */
export type VaultMobileSourceCheck = {
	desktopHandWidth: typeof VAULT_STAGE.handWidth;
	desktopDustMax: typeof VAULT_DUST.max;
};

export default resolveVaultTuning;
