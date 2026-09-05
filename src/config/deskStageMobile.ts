/* ------------------------------------------------------------------
   THE DESK - MOBILE TUNING

   A SEPARATE FILE, ON PURPOSE, AND IT IS ADDITIVE ONLY.

   config/deskStage.ts is not touched by this work. It is imported here,
   READ, and spread into a new object. Nothing in this file mutates it,
   so there is no path by which a mobile edit can change what a desktop
   visitor sees. If you want to prove that, delete this file: the section
   still compiles and the desktop build is byte-identical in behaviour,
   because every consumer falls back to the baseline when
   `resolveDeskTuning` reports `isMobile: false`.

   The same split is used by THE RAKE (config/rakeLight.ts holds a
   desktop baseline plus a RAKE_MOBILE override block). Two sections now
   share one shape, which is the point - a third can follow it without
   inventing a third convention.

   ------------------------------------------------------------------
   THE ROOT CAUSE OF THE MOBILE FRAMING, AND IT IS NOT CSS

   The camera is a PerspectiveCamera with a fixed vertical FOV of 30 deg.
   A perspective camera's VERTICAL field of view is the constant; the
   HORIZONTAL one is derived:

     halfWidthAtDistance = distance * tan(fovY / 2) * aspect

   So the visible WIDTH is proportional to the aspect ratio, and the
   laptop is a wide object:

     desktop 16:9   aspect 1.78  ->  visible width at z=3.4  ~1.62 units
     phone portrait aspect 0.46  ->  visible width at z=3.4  ~0.42 units

   The machine is about 0.35 * 3.2 = 1.12 units across. It fits inside
   1.62 with room to spare and overflows 0.42 by nearly three times,
   which is exactly what the screenshot shows - a laptop cropped by both
   edges of a phone.

   This is the SAME CLASS OF BUG as the rake blade: a quantity the
   renderer multiplies by `aspect` was tuned once, at one aspect ratio,
   and then treated as if it were absolute. The rake fixed it by
   re-deriving the number per form factor. Here it is better fixed
   properly, by SOLVING for the distance that frames the object - see
   DESK_MOBILE_FRAME. That way there is no second magic number to keep
   in step with the first, and a foldable or a tablet in portrait is
   framed correctly without being enumerated.

   THE RULE, WHICH IS NOW WRITTEN IN TWO CONFIGS: any value the renderer
   scales by aspect ratio is not a constant. Either normalise it or solve
   for it.
   ------------------------------------------------------------------ */

import { DESK_LAPTOP, DESK_PARALLAX } from './deskStage';

/* ==================================================================
   THE TWO BREAKPOINTS, AND WHY THERE ARE TWO

   They are not redundant and collapsing them into one would regress
   something.

   768 - THE PHONE BREAKPOINT. Matches SMOOTH_SCROLL.mobileMaxWidth and
   MOBILE_BREAKPOINT in useHeroIntroAnimation.ts, and crossing it changes
   the SCROLLER: SmoothScrollProvider does not install Lenis at or below
   this width, so the page is on native momentum scroll. It is also where
   the gyroscope takes over from the pointer, because a device this width
   is being held rather than pointed at.

   900 - THE STACK BREAKPOINT. Predates this work; it lives in
   desk-stage.css and as NARROW in gl/laptopScene.ts, and it is where the
   statement stops sitting BESIDE the laptop and goes underneath it. That
   is a pure layout question about whether two things fit side by side,
   and the answer changes at a wider width than the scroller does. A
   1024x768 tablet in landscape stacks but keeps Lenis and the pointer.

   Change either and check the other. Do not merge them.
   ================================================================== */
export const DESK_MOBILE_BREAKPOINT = 768;
export const DESK_STACK_BREAKPOINT = 900;

/* ==================================================================
   FIT-TO-FRAME

   Instead of a hand-tuned mobile scale, the scene solves for the camera
   distance that makes the machine occupy a chosen fraction of the
   NARROWER axis. See gl/laptopScene.ts `applyFraming`.

   `widthFraction` is the real design decision here and it is the one
   number worth arguing about. The reference frames put the laptop at
   roughly 45% of a desktop frame's width, with the empty black around it
   doing real compositional work - it is what gives the stars somewhere
   to be. That ratio cannot survive a portrait phone: 45% of 390px is a
   152px laptop, which is a thumbnail. So on a phone the machine takes
   most of the width and the stars are shrunk to compensate (see
   styles/desk-stage-mobile.css) rather than the machine being starved to
   leave room for them.

   ------------------------------------------------------------------
   WHY THIS IS 0.92 AND NOT THE 0.82 IT STARTED AT

   The fraction is spent on the WORST-CASE extent, not the resting one.
   The scene measures hypot(width, depth) - the widest the machine can
   ever appear under any Y rotation - so that it cannot clip the frame
   mid-turn while the gyro leans it. At the resting pose the silhouette
   is narrower than that diagonal, so the machine always renders SMALLER
   than `widthFraction` literally suggests, and the gap is the safety
   margin being held in reserve.

   0.82 of the diagonal turned out to read as roughly 45% of the frame
   at rest - back to the desktop ratio the paragraph above explains does
   not work in portrait. 0.92 spends most of that reserve while keeping
   the guarantee intact. It is not raised to 1.0 because the diagonal is
   the bound for Y rotation ALONE; the roll on Z swings the corners out
   a little further still.
   ================================================================== */
export const DESK_MOBILE_FRAME = {
	/* Fraction of the viewport's WIDTH the machine's worst-case extent
	   should span. See the note above before changing this - the resting
	   silhouette is narrower than the value implies. */
	widthFraction: 0.92,
	/* Never pull the camera closer than the desktop distance - only ever
	   push it back. On a very wide short window the solve would otherwise
	   zoom IN and crop the laptop vertically, which is the same bug in the
	   other axis. */
	minDistance: 3.4,
	/* Hard ceiling, so a freak aspect ratio cannot send the machine to a
	   vanishing point. */
	maxDistance: 9,
} as const;

/* ==================================================================
   THE MOBILE POSE

   Overrides only. Everything absent is inherited from DESK_LAPTOP.

   `scale` is deliberately NOT overridden. Size is now the framing
   solve's job, and having both a scale override and a distance solve
   would be two controls fighting over one outcome - the exact trap the
   original 3.2 fell into.

   WHAT DOES CHANGE, AND WHY:

   The pose is FLATTER. baseRotX 0.35 -> 0.26 and baseRotZ -0.18 -> -0.12.
   The resting 3/4 view was solved from foreshortening against a
   desktop-shaped frame; the same angles in portrait spend their
   foreshortening on an axis that no longer has room for it, and the deck
   reads as a sliver. Less turn and less roll keep the screen - which is
   the subject, and which carries the artwork - facing the visitor.

   The DISPLACE beat moves the machine UP, not RIGHT. This already
   happened below the 900px stack breakpoint via the `narrow` branch in
   the scene, and these numbers replace the two literals that were
   inlined there (`0` and `0.34`), so that beat is finally configurable
   instead of hardcoded in a render loop.
   ================================================================== */
export const DESK_MOBILE_LAPTOP = {
	baseRotX: 0.26,
	baseRotZ: -0.12,

	/* Rises from below, as on desktop, but a shorter travel - the whole
	   frame is shorter, so the same distance reads as a longer journey. */
	fromY: -0.95,
	toY: 0.02,
	fromRotY: 0.82,
	toRotY: 0.6,

	/* Steps UP and back rather than sideways. displaceX is zeroed because
	   there is nowhere sideways to go. */
	displaceX: 0,
	displaceY: 0.3,
	displaceRotY: -0.42,
	displaceRotX: -0.03,
	displaceRotZ: 0.12,
	/* Recedes on displace, but far less than the 0.72 this started at.

	   0.72 was chosen on the assumption that the statement needed most of
	   the lower frame, because it is underneath the machine here rather
	   than beside it. In practice the type sets to two lines and sits
	   higher (see the `bottom` offset in styles/desk-stage-mobile.css),
	   which leaves a large band of empty black between the two - so the
	   machine was giving up size to clear space that nothing occupies.

	   THIS IS THE NUMBER THAT CONTROLS THE LAPTOP'S SIZE IN THE FINISHED
	   COMPOSITION - the frame where the statement is fully out. It
	   multiplies the fit-to-frame result rather than replacing it, so
	   DESK_MOBILE_FRAME.widthFraction sets the size on ARRIVAL and this
	   sets how much of that survives the displace beat. Both matter, and
	   this is the one to reach for if the machine looks small next to the
	   statement. */
	displaceScale: 0.88,

	exitY: 1.7,

	/* The idle float is halved. It is a fraction of a world unit, so on a
	   frame this size the desktop amplitude is a visible bob rather than
	   the intended breathing. */
	floatY: 0.009,
	floatRot: 0.008,
} as const;

/* ==================================================================
   MOBILE PARALLAX AMOUNTS

   Driven by the gyroscope rather than a cursor, so these are read
   against a tilt in degrees rather than a pointer position - but the
   units are the same as desktop, because the gyro is normalised to the
   same -1..1 the pointer produces. That normalisation is the whole
   reason the scene needs no second code path for it.

   The DOM travel SHRINKS (31.5px -> 16px: the same absolute offset is a
   far larger share of a 390px frame) while the laptop's ROTATION GROWS
   (0.0788 -> 0.17 rad). That asymmetry is deliberate. On desktop the
   lean is a garnish on top of a drag gesture that shares the same input;
   on a phone the tilt IS the interaction, there is no cursor competing
   with it, and a rotation the eye cannot detect is not worth spending a
   sensor on. 0.17 rad is about 10 degrees at full deflection, which
   clears the visibility floor documented in config/deskStage.ts.
   ================================================================== */
export const DESK_MOBILE_PARALLAX = {
	/* ALL FOUR AMOUNTS ARE THE PREVIOUS VALUE x 1.1.

	   Raised together on purpose. These four are one effect seen at
	   four depths - stars furthest, statement nearest, the machine
	   between them - and the RATIOS between them are what read as
	   depth. Scaling them by one factor makes the effect stronger;
	   scaling one alone would flatten it. */
	stars: 17.6,
	statement: 6.6,
	laptopRotY: 0.187,
	laptopRotX: 0.11,
	/* Heavier smoothing than the pointer's 0.075. A hand holding a phone
	   is never still, and an accelerometer reports that honestly - at the
	   desktop ease the machine visibly trembles. This is the single most
	   important number in this block for whether the effect feels
	   expensive or cheap. */
	ease: 0.055,
} as const;

/* ==================================================================
   THE GYROSCOPE

   Read lib/deskGyro.ts alongside this - the constraints that shape
   these numbers (iOS permission, HTTPS, calibration) are documented
   there, because they are behaviour rather than tuning.
   ================================================================== */
export const DESK_MOBILE_GYRO = {
	/* Degrees of tilt, from the calibrated neutral, that count as full
	   deflection. 18 is about as far as a wrist rotates without the
	   visitor consciously moving their arm, which is the gesture we are
	   trying to reward. Larger values make the effect feel dead; smaller
	   ones make it feel twitchy and amplify sensor noise. */
	/* 18 -> 13. LOWER IS MORE SENSITIVE, which reads backwards until you
	   see what the number is: the tilt that counts as FULL deflection.
	   The reading is divided by it, so a smaller window means the same
	   wrist movement travels further through the effect.

	   This is the right control for sensitivity rather than raising the
	   amounts above again. The amounts set how far the scene can move at
	   the extremes; this sets how easily the visitor reaches them. It
	   cannot overshoot either, because the normalised value is still
	   clamped to -1..1 - a larger tilt now simply arrives at the end of
	   the range sooner instead of pushing past it. */
	maxTiltDeg: 13,
	/* A dead zone, in degrees, around neutral. Hand tremor lives here.
	   Without it the section never fully settles, which also means the
	   render loop never parks and the battery pays for it. */
	/* 1.2 -> 0.8. The dead zone has to come down with the tilt window or
	   it would quietly eat a larger share of it: 1.2 of 18 degrees is 7%
	   of the range, but 1.2 of 13 is over 9%, and a more sensitive effect
	   with a proportionally wider dead patch around neutral feels like it
	   sticks before it moves. Kept wide enough that hand tremor still
	   parks the render loop at rest. */
	deadZoneDeg: 0.8,
	/* How many readings are averaged into the neutral baseline. Nobody
	   holds a phone flat, so raw beta at rest is 30-60 deg depending on
	   posture; the baseline is whatever they were already doing when the
	   section armed. deviceorientation fires at ~60Hz, so this is about a
	   sixth of a second. */
	calibrationSamples: 10,
	/* If the tilt sits beyond full deflection for this long, the neutral
	   is quietly re-centred. Covers the visitor who stands up, lies down,
	   or hands the phone to someone else mid-section - without it the
	   parallax is pinned to a rail and never comes back. */
	recalibrateAfterMs: 2500,
} as const;

/* ==================================================================
   THE RESOLVER

   One function, so the scene and the scroll hook cannot disagree about
   which form factor they are rendering. Pure and cheap - call it on
   resize, not per frame.

   Identical in shape to resolveRakeTuning in config/rakeLight.ts.
   ================================================================== */

export type DeskLaptopTuning = {
	model: string;
	dracoPath: string;
	clipLid: string;
	clipKeyboard: string;
	scale: number;
	baseRotX: number;
	baseRotZ: number;
	fromY: number;
	toY: number;
	fromRotY: number;
	toRotY: number;
	displaceX: number;
	displaceY: number;
	displaceRotY: number;
	displaceRotX: number;
	displaceRotZ: number;
	displaceScale: number;
	exitY: number;
	floatY: number;
	floatSpeed: number;
	floatRot: number;
};

export type DeskParallaxTuning = {
	stars: number;
	statement: number;
	laptopRotY: number;
	laptopRotX: number;
	ease: number;
};

export type DeskTuning = {
	/* At or below DESK_MOBILE_BREAKPOINT. Gyro input, fitted framing,
	   mobile pose. */
	isMobile: boolean;
	/* At or below DESK_STACK_BREAKPOINT. Statement goes under the laptop
	   and the displace beat moves upward. TRUE FOR EVERY MOBILE WIDTH,
	   since 768 < 900 - but also true for tablets that are not mobile. */
	isStacked: boolean;
	laptop: DeskLaptopTuning;
	parallax: DeskParallaxTuning;
};

export function resolveDeskTuning(viewportWidth: number): DeskTuning {
	const isMobile = viewportWidth <= DESK_MOBILE_BREAKPOINT;
	const isStacked = viewportWidth <= DESK_STACK_BREAKPOINT;

	if (!isMobile) {
		/* Spread rather than returned by reference, so a consumer that
		   assigns to the returned object cannot reach back into the
		   desktop config. */
		return {
			isMobile: false,
			isStacked,
			laptop: { ...DESK_LAPTOP },
			parallax: { ...DESK_PARALLAX },
		};
	}

	return {
		isMobile: true,
		isStacked,
		laptop: { ...DESK_LAPTOP, ...DESK_MOBILE_LAPTOP },
		parallax: { ...DESK_PARALLAX, ...DESK_MOBILE_PARALLAX },
	};
}
