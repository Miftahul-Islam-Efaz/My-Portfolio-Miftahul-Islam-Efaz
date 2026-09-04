/* ------------------------------------------------------------------
   THE VAULT TEASER - tuning

   Every number the landing-page teaser runs on. Change the look from
   this file; there are no magic numbers in the hook or the markup.

   THE IDEA IN ONE LINE: someone is handing you something. The hand
   swings up out of the bottom-left corner into the frame, the folder it
   holds is already open and lit, and the archive is escaping out of the
   mouth - five small folders lifting off close to the opening, carried
   on a widening cone of fine lit sand.

   ---------------------------------------------------------------
   PASS HISTORY. Recorded because every one of these is easy to
   reintroduce by "tidying" a number back to something rounder.

   Pass 1 -> 2:
     - hand was 0.66 of the stage, read as a photo on a page. Now full
       bleed at 1.06.
     - folders flew to 0.47 of stage width and hit the frame edges.
     - glow was a 0.44-wide radial WITH an ember stop, which washed
       brown over the whole section. Now a tight warm-white core.
     - layout was mapped straight off scroll progress, which is exact
       and feels dead. Now a spring - see VAULT_INERTIA.

   Pass 2 -> 3 (all from a zoomed screenshot, which is the only way
   these were ever going to be caught):
     - GRAINS WERE VISIBLE BLOCKS. Radii ran to 1.55, so `fillRect` drew
       ~3px squares, and additive blending saturated them into solid
       white tiles. Sizes are now sub-pixel with a squared distribution.
     - grains travelled too fast. Speeds cut 10%.
     - the glow was too weak to survive against the light already baked
       into the asset, so the opening did not read as the source.

   Pass 3 -> 4:
     - THE SAND CAME OUT OF A PINHOLE. Every grain spawned at one
       coordinate, so however wide the cone got, it still converged to a
       point at the source and read as a jet hovering near the folder
       rather than the folder emptying. Fixed with a LINE emitter -
       mouthWidth / mouthTilt below - plus lateral spread that grows
       with age (spreadAccel) so the cloud opens out as it travels.
     - the lit volume the archive escapes THROUGH was missing. Added as
       the `haze` layer.

   Pass 4 -> 5:
     - seven folders read as a pattern rather than as a few things
       escaping. Down to five, and pulled closer again.
     - the "THE VAULT" eyebrow came off the section. The photograph and
       the embossed "click me" already say what this is, and a label
       over the top of them was the one thing making it look designed
       rather than shot. The heading survives for screen readers only.
     - added CURSOR PARALLAX - see VAULT_PARALLAX.
   ---------------------------------------------------------------
   ------------------------------------------------------------------ */

/** Warm archive light against the page's void. `base` matches
 *  --color-eerie so the direct cut coming out of the work
 *  section lands on this section with no seam - the join reads
 *  that same token. Change one, change both. */
export const VAULT_THEME = {
	/** Matches --color-eerie / --color-background. */
	base: '#050505',
	/** The hot paper inside the folder. Warm white, never pure white. */
	core: '#DCD6F2',
	/** The brightest grains, for the few that catch the light head-on. */
	spark: '#F1EDFB',
	/** Site accent, terracotta. A minority of the sand only. */
	ember: '#9D8ED9',
	/** Off-white type, --color-primary. */
	textHi: '#F5F1E8',
} as const;

/** THE SPRING BETWEEN SCROLL AND LAYOUT.
 *
 *  This is the whole answer to "the motion feels static". Scroll
 *  progress is the TARGET; what actually gets drawn is a damped spring
 *  chasing it. That gives the section lag on the way in, follow-through
 *  when the wheel stops, and a small overshoot as the hand arrives -
 *  the things that read as weight.
 *
 *  zeta = damping / (2 * sqrt(stiffness)). At these values that is
 *  about 1.0 - critically damped. The hand chases the scroll with lag and
 *  follow-through but NO overshoot, which is what reads as buttery rather
 *  than springy. Drop damping toward ~10 to bring back the old single-overshoot landing. */
export const VAULT_INERTIA = {
	stiffness: 48,
	damping: 14,
	/** Below these thresholds the spring is snapped to the target and
	 *  the frame loop is allowed to idle. Without this the section would
	 *  keep integrating microscopic velocities forever. */
	epsilon: 0.0004,
	epsilonVelocity: 0.0008,
} as const;

/** CURSOR PARALLAX.
 *
 *  The pointer's offset from the centre of the stage, smoothed, applied
 *  to each layer by a different amount. Two rules make this read as
 *  depth rather than as wobble:
 *
 *  1. THE AMOUNTS ARE TINY. Fractions of stage width, low single-digit
 *     percentages at most. Parallax is a depth cue, and depth cues stop
 *     working the moment they become the thing you are looking at - a
 *     photograph that visibly chases the mouse reads as a gimmick.
 *  2. NEARER THINGS MOVE MORE. The escaping folders are closest to the
 *     viewer so they move most; the hand is the anchor; the haze is the
 *     furthest thing in the frame and barely moves. Getting this order
 *     backwards inverts the space and feels wrong without being
 *     obviously wrong, which makes it very hard to debug by eye.
 *
 *  The glow and the sand are NOT given their own values - they are
 *  locked to the hand's offset, because they are emitted BY the folder.
 *  Letting them drift independently would detach the light from the
 *  opening it is supposed to be coming out of, which is the same class
 *  of bug as the mouth being mismeasured.
 *
 *  Offsets are fractions of stage width, applied per unit of pointer
 *  offset (pointer is normalised to -1..1 from the stage centre). */
export const VAULT_PARALLAX = {
	/** The hand, and with it the glow, the haze's anchor and the sand. */
	hand: 0.014,
	/** Extra offset for the escaping folders, on top of the hand's. */
	folders: 0.022,
	/** Extra offset for the haze. Negative: it moves slightly AGAINST
	 *  the pointer, which is what sells it as sitting behind everything
	 *  else rather than travelling with it. */
	haze: -0.006,
	/** Exponential smoothing rate, per second. Higher = tracks the
	 *  pointer more tightly. Low enough here that a fast flick across the
	 *  section glides rather than snaps - the lag IS the effect. */
	smoothing: 4.2,
} as const;

export const VAULT_SCROLL = {
	/** Section height as a multiple of viewport height. The stage inside
	 *  is `position: sticky`, so this number IS the scroll budget for the
	 *  whole beat. Deliberately not a GSAP pin: the work section above
	 *  already pins, and a second pin-spacer in the same document is how
	 *  the measurement bugs start. */
	vhPerScreen: 2.8,

	/* ---- the hand is HANDED to you ----

	   It does NOT slide in from the left. It swings up and in from the
	   bottom-left corner, which is the arc an arm actually makes when it
	   offers something across a table. That means x AND y both animate,
	   and the rotation unwinds as it arrives - a straight horizontal
	   translate is exactly what made the first pass feel like a slide. */

	/** Start, as fractions of stage width / height. Positive Y is DOWN,
	 *  so this begins below the frame and to the left of it. */
	handFromX: -0.42,
	handFromY: 0.66,
	/** Rest position, same units. Slightly left of centre - the mouth
	 *  needs the right side of the frame to empty into. */
	handToX: -0.04,
	handToY: 0,
	/** Progress at which the hand has finished arriving. Everything after
	 *  this is the archive escaping, with the hand held nearly still. */
	handSettleAt: 0.5,
	/** Rotation at the start, in degrees. Unwinds to 0 on arrival, so the
	 *  wrist rolls the folder flat as it is offered. */
	handTilt: 15,
	/** Scale at the start. Under 1 = further away, so it grows slightly
	 *  as it comes toward you. Keep this subtle; a big ramp reads as a
	 *  zoom rather than as reach. */
	handScaleFrom: 0.86,
	/** A little life after the hand has landed: it keeps drifting up by
	 *  this fraction of stage height across the rest of the section, so
	 *  the frame is never completely frozen while the folders leave. */
	handSettleDrift: -0.035,

	/** Window over which the small folders leave the big one. Starts
	 *  BEFORE the hand has settled on purpose - the overlap is what makes
	 *  it read as one continuous gesture instead of arrive-then-emit. */
	emitFrom: 0.32,
	emitTo: 0.99,

	/** Top/bottom fade back to `base`, as a fraction of stage height.
	 *  Kept small; a wide fade reads as a grey smear rather than a frame. */
	edgeFade: 0.06,
} as const;

export const VAULT_STAGE = {
	/** FULL BLEED. The hand is the subject, not an illustration of one -
	 *  at 0.66 (the first pass) it sat in the middle of the screen with
	 *  air all around it and read as a stock photo. At 1.06 the arm
	 *  genuinely enters the frame from off-screen and the folder lands
	 *  near the optical centre. */
	handWidth: 1.06,
	handMinWidth: 720,
	handMaxWidth: 2100,

	/** THE MOUTH. Where the light spills out of the big folder, in
	 *  fractions of the HAND IMAGE's own box - not the stage. The glow,
	 *  the folder flight paths and the sand emitter all originate here,
	 *  so this is the single pair of numbers to nudge if any of the three
	 *  ever looks like it leaves from the wrong place. */
	mouth: { x: 0.588, y: 0.345 },

	/** THE MOUTH IS A SLIT, NOT A POINT.
	 *
	 *  This is the fix for sand that looked like it came from a pinhole.
	 *  Spawning every grain at one coordinate cannot be rescued by
	 *  widening the cone: however far it opens downstream, it still
	 *  converges to a single point at the source, which is exactly what
	 *  reads as a jet hovering near the folder instead of the folder
	 *  emptying.
	 *
	 *  So grains are emitted along a line segment lying on the folder's
	 *  opening. `mouthWidth` is its length as a fraction of the hand
	 *  image's width - roughly the visible width of the lit gap - and
	 *  `mouthTilt` is the lip's angle in degrees. The hook adds the hand's
	 *  live rotation to that tilt, so the emitter stays on the lip
	 *  throughout the swing. */
	mouthWidth: 0.2,
	mouthTilt: -8,

	/** Small-folder edge length as a fraction of stage width. The asset
	 *  is 1:1, so this is both width and height. */
	folderSize: 0.052,
	folderMinSize: 26,
	folderMaxSize: 84,
} as const;

/** THE LIGHT, IN TWO LAYERS.
 *
 *  CORE - tight, hot, pinned to the opening. Makes the folder read as a
 *  light SOURCE.
 *
 *  HAZE - large, dim, elliptical, offset along the escape direction and
 *  rotated to match it. This is the lit VOLUME the archive is travelling
 *  through, and it was the piece missing entirely: the core lit the
 *  opening but left the space above and to the right of it - where the
 *  folders and sand actually are - unlit, so they read as objects on
 *  black rather than objects in light.
 *
 *  Neither layer has an ember stop anywhere. The accent belongs on a
 *  minority of the sand, not spread across the frame. That single rule
 *  is what keeps pass 1's brown wash from coming back. */
export const VAULT_GLOW = {
	/** Core diameter as a fraction of stage width. */
	size: 0.19,
	/** Core opacity at rest and at full emission. */
	opacityIdle: 0.3,
	opacityPeak: 0.8,
	/** How much the core swells while the archive is escaping. */
	swell: 0.18,

	/** Haze width as a fraction of stage width. Large on purpose - it is
	 *  a volume, not a highlight. */
	hazeSize: 0.46,
	/** Haze height as a multiple of its width. Under 1 = an ellipse lying
	 *  along the escape direction. */
	hazeAspect: 0.52,
	/** How far the haze's centre sits from the mouth, along the escape
	 *  direction, as a fraction of stage width. */
	hazeOffset: 0.1,
	/** Haze swell over the emission window. */
	hazeSwell: 0.22,
	/** Haze opacity at rest and at full emission. Much lower than the
	 *  core - it should be felt, not seen. Raising this is the fastest way
	 *  to bring back the brown wash, so move it in small steps. */
	hazeOpacityIdle: 0.1,
	hazeOpacityPeak: 0.42,
} as const;

/** ANIMATED SAND - the grit off the reference frame.
 *
 *  Canvas 2D, one buffer, additive.
 *
 *  ---------------------------------------------------------------
 *  THE SIZES HERE LOOK ABSURDLY SMALL. THEY ARE CORRECT.
 *
 *  Pass 2 ran radii up to 1.55, which `fillRect` drew as ~3px squares -
 *  and under additive blending those saturated to solid white tiles. A
 *  zoomed screenshot showed unmistakable pixel confetti. The lesson:
 *  if you can identify one grain individually, it is far too big.
 *
 *  So sizes are sub-pixel, and the hook picks them with a SQUARED
 *  random distribution, which pushes the population hard toward the
 *  floor - the overwhelming majority are barely-there specks and only a
 *  handful approach sizeMax. Alpha is low too, because the fix for
 *  "not dense enough" is more grains, never bigger or brighter ones.
 *  ---------------------------------------------------------------
 *
 *  THE SOURCE IS A LINE, not a point - see VAULT_STAGE.mouthWidth.
 *
 *  VELOCITY IS A CONE, not a drift. Each grain gets an angle within
 *  `cone` degrees of `angle` and its own speed. The wide speed range
 *  matters: uniform speed reads as a solid expanding shell.
 *
 *  Grains advance on their own clock so the field shimmers when the
 *  scroll is still, but emission is multiplied by scroll progress:
 *  scrub back to the top and the frame genuinely empties. */
export const VAULT_DUST = {
	/** Hard ceiling on live grains. The pool is allocated once at this
	 *  size and reused; nothing is ever garbage collected mid-scroll. */
	max: 2600,
	/** Grains born per second at full emission. */
	rate: 1900,
	/** Lifetime range in seconds. Long tails are what let the cone reach
	 *  its full length before the grains die. */
	lifeMin: 1.1,
	lifeMax: 3.4,
	/** Radius range in CSS px. Sub-pixel on purpose, and sampled squared
	 *  toward the minimum - see the note above. */
	sizeMin: 0.18,
	sizeMax: 0.85,
	/** Scatter PERPENDICULAR to the slit, as a fraction of stage width. */
	spread: 0.012,
	/** Cone direction in degrees, screen space, negative = up. -36 is up
	 *  and to the right, following the folders. The haze is rotated to
	 *  this same angle, so changing it moves the light too. */
	angle: -36,
	/** Full angular spread of the cone, in degrees. */
	cone: 92,
	/** Speed range as fractions of stage width per second. */
	speedMin: 0.027,
	speedMax: 0.108,
	/** Lateral acceleration along the escape direction, fractions of
	 *  width per second squared. Makes the plume keep OPENING as it
	 *  travels rather than holding a fixed cone angle, which is what
	 *  billowing dust does and what a constant-angle cone never looks
	 *  like. */
	spreadAccel: 0.022,
	/** Upward buoyancy over life. Negative lifts. Small: this is sand,
	 *  not smoke. */
	buoyancy: -0.005,
	/** Fraction taking the ember hue. A minority - see the accent
	 *  discipline note in workTheme.ts. */
	emberMix: 0.14,
	/** Fraction that are near-white specks catching the light head-on. */
	sparkleMix: 0.05,
	/** Peak alpha of a single grain. They accumulate additively, so this
	 *  is low by design. */
	alpha: 0.42,
} as const;

/** Copy position as a fraction of stage height, from the top.
 *
 *  Only the cue remains. The "THE VAULT" eyebrow was removed in pass 5:
 *  the photograph and the embossed "click me" already establish what
 *  this is, and a caption over the top of them was what made the
 *  section look designed rather than shot. */
export const VAULT_LAYOUT = {
	cueY: 0.9,
} as const;

/** Where the folder goes. Kept here rather than inline in the markup so
 *  the route can move without touching the component. */
export const VAULT_HREF = '/vault';

/** THE PRESS.
 *
 *  The folder is a button, and it needs to behave like one. Two
 *  problems had to be solved together:
 *
 *  1. A LINK NAVIGATES INSTANTLY, so there is no time to feel anything.
 *     The pressed frame was already crossfading on :active, but the
 *     route change began on the same gesture and the window covered the
 *     screen before the crossfade had run a single frame. So the click
 *     is intercepted, the press is played, and navigation happens
 *     `hold` milliseconds later. This is the rare case where
 *     deliberately delaying a navigation is correct: the press IS the
 *     feedback that the click registered, and without it the folder
 *     feels like a dead image that happens to change the page.
 *
 *  2. :active DOES NOT SURVIVE THE GESTURE. It drops the instant the
 *     pointer is released, which on a quick click is a handful of
 *     frames. So the pressed look is driven by a data attribute held
 *     for the full duration, and :active only handles the mouse-down
 *     part of a slow, deliberate press.
 *
 *  `hold` is the one number to move if the press feels sluggish
 *  (lower) or unnoticed (higher). Under about 120ms it stops reading as
 *  a press at all; over about 300ms the site feels unresponsive. */
export const VAULT_PRESS = {
	/** THE LEAST time the pressed frame must have been on screen
	 *  before the navigation is allowed through, in ms.
	 *
	 *  This replaced a flat `hold` that delayed EVERY click by 190ms.
	 *  The distinction matters: an ordinary click already holds the
	 *  button down longer than this, so it now navigates on its own
	 *  click event with nothing added at all. Only a very fast flick
	 *  of a click borrows the few milliseconds it is short by.
	 *
	 *  Under about 120ms the press stops registering as a press. */
	minHold: 120,
	/** How far the folder sinks. Scale, not translate: a button pressed
	 *  into the frame recedes, it does not slide. Tiny on purpose - this
	 *  is a photograph of a hand, and anything visible enough to measure
	 *  reads as the image glitching rather than as a press. */
	scale: 0.974,
	/** How long the sink takes, in ms. Shorter than the release: things
	 *  compress fast and recover slowly. */
	sinkDuration: 110,
	/** How long the release takes, in ms. */
	releaseDuration: 260,
	/** SAFETY NET ONLY, in ms - not the normal path.
	 *
	 *  THE DEFECT THIS USED TO CAUSE: the pressed frame was turned on
	 *  by the click and off by this timer, so the folder stayed lit
	 *  long after the mouse button was back up - and since the window
	 *  took longer than this to arrive, the last thing you saw before
	 *  it appeared was a folder glowing at nothing. A pressed state
	 *  must follow the FINGER: pointerdown lights it, pointerup
	 *  releases it. That is now what drives it.
	 *
	 *  This remains only for the case where a pointerup never arrives
	 *  at all - the pointer is captured elsewhere, or the gesture is
	 *  interrupted by the OS. The teaser is never unmounted (the
	 *  window opens over it), so without a floor like this a stuck
	 *  press would sit lit behind the window until it was closed. */
	release: 520,
} as const;

/** THE SPILL - the flare that carries the press into the window.
 *
 *  WHY IT EXISTS. The window is rendered by a route segment, so there
 *  is a genuine gap between releasing the folder and the window
 *  existing: the router has to fetch that segment first. In development
 *  - on-demand compilation, and no link prefetching at all - that gap
 *  is around a second. In production, with the link prefetched, it is
 *  close to nothing.
 *
 *  The gap cannot be removed from here, so it is FILLED. On release a
 *  flare swells at the folder's mouth and holds, which means the
 *  reaction is immediate and what the user is watching is the folder
 *  opening rather than a page doing nothing. The window's shader burst
 *  then starts from that same point in the same two colours, so this is
 *  not a spinner that gets replaced - it is the first half of one
 *  continuous event.
 *
 *  Do NOT make this a recognisable loading indicator. The moment it
 *  reads as "waiting", it stops covering the wait and starts
 *  advertising it. */
export const VAULT_SPILL = {
	/** Flare diameter as a multiple of the mouth glow's radius, so it
	 *  scales with the folder rather than with the viewport. */
	sizeFactor: 3.2,
	/** How long the flare takes to swell to full, in ms. Fast: this is
	 *  the acknowledgement of the release. */
	growDuration: 380,
	/** Period of the slow pulse it holds on afterwards, in ms. Something
	 *  perfectly still for a second reads as a frozen page. */
	breatheDuration: 2400,
	/** Crossfade out once the window announces itself, in ms. */
	fade: 260,
	/** Hard ceiling on how long the flare may burn if the window never
	 *  announces itself - a failed or cancelled navigation. A flare left
	 *  burning over the landing page forever is far worse than none. */
	maxWait: 3200,
} as const;
