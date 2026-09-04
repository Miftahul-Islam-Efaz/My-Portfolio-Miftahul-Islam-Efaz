/* ------------------------------------------------------------------
   THE RAKE - tuning

   Every number the section runs on. Change the look from this file.

   THE IDEA IN ONE LINE: scroll does not play an animation, it moves a
   light. A single hard blade sweeps a corrugated wall, and the type is
   engraved into that wall - invisible until light reaches it.

   SECOND PASS, two changes:

   1. SHARPNESS. The first pass read as blurry. Not focus - contrast.
      The glyph mask fed the composite as raw antialiased alpha so edges
      dissolved, and a wide ember spill plus heavy bloom and grain laid
      a veil over everything. Fixed by maskLow/maskHigh (hard-threshold
      the mask), shadow/shadowStrength (type casts onto the wall), and
      by cutting wallSpill, bloom and grain hard. If it ever looks soft
      again, those six numbers are the place to look.

   2. LESS TEXT. Down to the statement plus the hand-off cue. The three
      proof columns and the eyebrow are gone, so the statement is much
      larger and the frame is mostly wall and light.

   ------------------------------------------------------------------
   THIRD PASS: PORTRAIT.

   The numbers below are a DESKTOP BASELINE, and a portrait phone is not
   a narrow desktop - it is a different frame with a different aspect.
   Mobile overrides live in RAKE_MOBILE and are merged by
   resolveRakeTuning(). Read WHY THE BLADE NEEDS ITS OWN NUMBER below
   before touching either.
   ------------------------------------------------------------------ */

/** Warm, not neutral. The wall is bronze-grey rather than grey, so the
 *  ember light has something to warm. `base` is the page's void,
 *  unchanged, which is what keeps both edges seamless. */
export const RAKE_THEME = {
	/** Matches --color-background. Both edges resolve to this. */
	base: '#050505',
	/** The wall's own colour where light barely reaches. */
	metal: '#3A322A',
	/** The hot centre of the blade. Warm white, never pure white. */
	core: '#F7E3C8',
	/** Site accent. Does the light's falloff and the type's first ignite. */
	ember: '#b56c4b',
} as const;

/* ------------------------------------------------------------------
   THE BREAKPOINT

   768 is not a new number. It is SMOOTH_SCROLL.mobileMaxWidth and
   useHeroIntroAnimation's MOBILE_BREAKPOINT, and it is the width below
   which Lenis is not installed at all. Crossing it therefore changes
   the SCROLLER, not just the layout, so this section has to agree with
   the rest of the site about where the line is.

   If it ever moves, move it in config/smoothScroll.ts and this follows.
   ------------------------------------------------------------------ */
export const RAKE_BREAKPOINT = 768;

/* ------------------------------------------------------------------
   Shapes. Named explicitly rather than inferred from the desktop
   objects, because the resolver merges two partial sources and an
   inferred literal type would fight that.
   ------------------------------------------------------------------ */

export type RakeScrollTuning = {
	vhPerScreen: number;
	lightFrom: number;
	lightTo: number;
	edgeFade: number;
};

export type RakeWallTuning = {
	slats: number;
	parallax: number;
	ridgePower: number;
	ridgeLift: number;
};

export type RakeLightTuning = {
	bladeWidth: number;
	glowWidth: number;
	verticalFalloff: number;
	specular: number;
	bloom: number;
	wallSpill: number;
	vignette: number;
};

export type RakeTypeTuning = {
	residual: number;
	residualRamp: number;
	bevel: number;
	maskLow: number;
	maskHigh: number;
	shadow: number;
	shadowStrength: number;
	statementScale: number;
	statementMin: number;
	statementMax: number;
	statementLeading: number;
	smallSize: number;
	smallTracking: number;
	/** Width the small copy's scale factor is measured against. */
	smallScaleRef: number;
	smallScaleMin: number;
	smallScaleMax: number;
	pad: number;
};

export type RakeLayoutTuning = {
	statementY: number;
	signoffY: number;
};

export type RakePerfTuning = {
	/** Upper bound on devicePixelRatio for the drawing buffer AND the type
	 *  masks - they must stay equal, see the note in gl/scene.ts. */
	dprCap: number;
};

export type RakeTuning = {
	isMobile: boolean;
	scroll: RakeScrollTuning;
	wall: RakeWallTuning;
	light: RakeLightTuning;
	type: RakeTypeTuning;
	layout: RakeLayoutTuning;
	perf: RakePerfTuning;
	grain: number;
};

/* ------------------------------------------------------------------
   DESKTOP BASELINE
   ------------------------------------------------------------------ */

export const RAKE_SCROLL = {
	/** Pin length as a multiple of viewport height. Shorter than the first
	 *  pass because there is far less to reveal now. */
	vhPerScreen: 2.1,
	/** Blade x at progress 0 and 1, in uv space. Starts off-frame left and
	 *  exits off-frame right, so no frame shows a light parked at an edge. */
	lightFrom: -0.12,
	lightTo: 1.12,
	/** Top/bottom fade back to `base`, as a fraction of stage height. Kept
	 *  small: the paper version used 0.14 and it read as a grey smear. */
	edgeFade: 0.055,
} as const;

export const RAKE_WALL = {
	/** Corrugation count across the stage. */
	slats: 40,
	/** How much the wall slides against the scroll. Small: depth, not
	 *  motion. */
	parallax: 0.05,
	/** Ridge sharpness. Higher = tighter specular line per ridge. */
	ridgePower: 1.8,
	/** How far the ridges lift out of the base colour. Lowered so the wall
	 *  competes less with the type. */
	ridgeLift: 0.42,
} as const;

export const RAKE_LIGHT = {
	/** Blade tightness - a gaussian denominator, so smaller is harder and
	 *  narrower. Tightened from 0.0055 to read as one fixture. */
	bladeWidth: 0.0042,
	/** The soft spill either side of the blade. Narrowed from 0.34, which
	 *  was the main source of the haze. */
	glowWidth: 0.26,
	/** Vertical falloff, so the light behaves like a real fixture rather
	 *  than an infinite plane. 0 = flat, 1 = strong. */
	verticalFalloff: 0.55,
	/** Specular gain on ridges directly under the blade. */
	specular: 1.15,
	/** Bloom around the blade, added after the composite. Halved. */
	bloom: 0.28,
	/** How much ember the spill adds to the WALL. Was 0.35 hardcoded in
	 *  the shader; that warm wash over everything is what killed the
	 *  type's edges. */
	wallSpill: 0.15,
	/** Vignette floor. Higher = less corner darkening. */
	vignette: 0.8,
} as const;

export const RAKE_TYPE = {
	/** Once the blade has passed a glyph it keeps this much glow - the
	 *  cooling ember. Raised, since the statement is now the only copy on
	 *  screen and must stay readable after the sweep. */
	residual: 0.55,
	/** How fast a glyph settles into its residual state, in uv distance. */
	residualRamp: 0.1,
	/** Bevel strength: highlight on the edge facing the light, shadow on
	 *  the edge facing away. */
	bevel: 0.55,

	/* ---- sharpness ---- */
	/** Mask threshold band. Canvas gives soft antialiased alpha; this
	 *  throws away all but about a pixel of it so glyph edges cut. Narrow
	 *  the band for harder edges, widen it for softer. */
	maskLow: 0.34,
	maskHigh: 0.62,
	/** Contact shadow offset in uv, and its strength. The type occludes
	 *  the wall, which is what makes it sit proud instead of floating.
	 *
	 *  NOTE this is uv, so its PIXEL size tracks the drawing buffer. That
	 *  is why mobile needs a larger number, not the same one - see
	 *  RAKE_MOBILE. */
	shadow: 0.0022,
	shadowStrength: 0.55,

	/* ---- statement ---- */
	/** Size as a fraction of stage width, then clamped in px. Much larger
	 *  now that it is the only copy in the frame. */
	statementScale: 0.076,
	statementMin: 34,
	statementMax: 152,
	/** Line height as a multiple of the statement size. */
	statementLeading: 0.96,

	/* ---- the hand-off cue ---- */
	smallSize: 11.5,
	/** Letter tracking for the mono cue, in em. */
	smallTracking: 0.2,
	/** The cue is scaled by clamp(width / ref, min, max). Was hardcoded as
	 *  1440 / 0.8 / 1.25 in the scene; named here so portrait can measure
	 *  against a portrait width instead of bottoming out at the floor. */
	smallScaleRef: 1440,
	smallScaleMin: 0.8,
	smallScaleMax: 1.25,

	/** Stage padding as a fraction of width. */
	pad: 0.055,
} as const;

/** Animated film grain. Cut by half - it was adding to the mush. */
export const RAKE_GRAIN = 0.018;

/** Vertical positions as fractions of stage height, from the top. The
 *  blade lights whatever it reaches, so an x position is a moment in
 *  the reveal and these y positions are pure composition. */
export const RAKE_LAYOUT = {
	statementY: 0.46,
	signoffY: 0.9,
} as const;

export const RAKE_PERF = {
	/** Desktop GPUs eat this full-screen fragment shader at 2x. */
	dprCap: 2,
} as const;

/* ------------------------------------------------------------------
   MOBILE OVERRIDES

   Only the numbers that actually differ. Everything absent here is
   inherited from the desktop baseline above, so retuning the shared
   look stays a one-place edit.

   ------------------------------------------------------------------
   WHY THE BLADE NEEDS ITS OWN NUMBER - THIS IS THE IMPORTANT ONE.

   The shader measures distance to the blade as:

       d = abs(uv.x - uLightX) * aspect

   so the blade's width AS A FRACTION OF SCREEN WIDTH is
   sqrt(bladeWidth) / aspect. Aspect is not a constant between form
   factors, and that is the whole problem:

       desktop 16:9   aspect 1.78   ->  sqrt(0.0042)/1.78 = ~3.6% of width
       phone portrait aspect 0.46   ->  sqrt(0.0042)/0.46 =  ~14% of width

   Same number, four times the blade. That is why the section read as a
   soft orange wash on a phone instead of a hard edge of light: not a
   layout bug and not a CSS bug, an un-normalised aspect term.

   0.0008 puts it back to about 6% of width - deliberately a little
   softer than desktop's 3.6%, because a 3-pixel blade on a phone reads
   as a rendering artefact rather than as a light. glowWidth is
   normalised the same way (it divides by aspect once, not twice, being
   exp(-d) not exp(-d^2)).

   THE RULE: any number the shader multiplies by `aspect` has to be
   re-derived per form factor. Nothing else in this block does.
   ------------------------------------------------------------------ */
export const RAKE_MOBILE: {
	scroll: Partial<RakeScrollTuning>;
	wall: Partial<RakeWallTuning>;
	light: Partial<RakeLightTuning>;
	type: Partial<RakeTypeTuning>;
	layout: Partial<RakeLayoutTuning>;
	perf: Partial<RakePerfTuning>;
	grain?: number;
} = {
	scroll: {
		/* Shorter sweep. A thumb swipe covers far less document than a
		   wheel gesture, so 2.1 screens of pinned scroll that felt like a
		   held beat on desktop feels like the page has jammed on a phone. */
		vhPerScreen: 1.5,
	},

	wall: {
		/* 40 slats across ~390px is a ~10px corrugation - fine enough to
		   alias into moire against the pixel grid, and it shimmers while
		   scrolling. 16 keeps the wall reading as corrugated metal. */
		slats: 16,
		/* Wider slats, so tighten the specular line to compensate. */
		ridgePower: 2,
		ridgeLift: 0.46,
	},

	light: {
		/* Aspect-normalised - see the note above. Do not copy desktop's. */
		bladeWidth: 0.0008,
		glowWidth: 0.09,
		/* A portrait frame is tall, and the statement sits at 0.42 while the
		   cue sits at 0.88. At 0.55 the falloff starved the cue of light. */
		verticalFalloff: 0.35,
		specular: 1.25,
		/* Bloom is a per-pixel add over the whole frame and phones are
		   fill-rate bound, so this is both a look and a cost decision. */
		bloom: 0.2,
		wallSpill: 0.12,
		/* Less corner darkening: on a small screen the vignette eats a
		   meaningful share of the readable area. */
		vignette: 0.88,
	},

	type: {
		/* Bigger relative to width, smaller in absolute px, and allowed to
		   go well below the desktop floor of 34. The statement is split
		   into more, shorter lines on mobile - see rakeContent.ts. */
		statementScale: 0.108,
		statementMin: 26,
		statementMax: 60,
		/* 0.96 is a display-size leading. Four short lines at phone size
		   need air or they read as a block. */
		statementLeading: 1.04,
		/* uv, so it must grow as the buffer shrinks to keep the contact
		   shadow a similar PIXEL size. At desktop 0.0022 x 3840px = ~8px;
		   the same number on a 682px buffer is 1.5px, i.e. invisible, and
		   the type loses the separation that keeps it crisp. */
		shadow: 0.006,
		shadowStrength: 0.6,
		/* The sweep is shorter and the screen is smaller, so the sentence
		   has to stay legible behind the light for longer. */
		residual: 0.62,
		residualRamp: 0.12,
		/* 0.2em of tracking on a 390px screen throws the cue onto two
		   lines. */
		smallSize: 10.5,
		smallTracking: 0.14,
		smallScaleRef: 390,
		smallScaleMin: 0.9,
		smallScaleMax: 1.15,
		/* 0.055 of 390px is a 21px margin, which reads as the type touching
		   the bezel. */
		pad: 0.075,
	},

	layout: {
		/* Lifted, because the statement is taller here (more lines) and the
		   cue needs to clear the bottom edge fade. */
		statementY: 0.42,
		signoffY: 0.88,
	},

	perf: {
		/* Phones report dpr 3 and are fill-rate bound on a full-screen
		   fragment shader. 1.75 is the point where the thresholded glyph
		   edges still cut but the frame cost roughly halves against 3.
		   Do not raise this without profiling on a real mid-range device. */
		dprCap: 1.75,
	},

	/* Grain is per-pixel noise on a small, dense screen: less is needed. */
	grain: 0.014,
};

/* ------------------------------------------------------------------
   THE RESOLVER

   One function, so the scene and the scroll hook cannot disagree about
   which form factor they are rendering. Width in, fully merged tuning
   out - callers never branch on the breakpoint themselves.

   Pure and cheap: call it per resize, not per frame.
   ------------------------------------------------------------------ */
export const resolveRakeTuning = (viewportWidth: number): RakeTuning => {
	const isMobile = viewportWidth <= RAKE_BREAKPOINT;

	if (!isMobile) {
		return {
			isMobile: false,
			scroll: { ...RAKE_SCROLL },
			wall: { ...RAKE_WALL },
			light: { ...RAKE_LIGHT },
			type: { ...RAKE_TYPE },
			layout: { ...RAKE_LAYOUT },
			perf: { ...RAKE_PERF },
			grain: RAKE_GRAIN,
		};
	}

	return {
		isMobile: true,
		scroll: { ...RAKE_SCROLL, ...RAKE_MOBILE.scroll },
		wall: { ...RAKE_WALL, ...RAKE_MOBILE.wall },
		light: { ...RAKE_LIGHT, ...RAKE_MOBILE.light },
		type: { ...RAKE_TYPE, ...RAKE_MOBILE.type },
		layout: { ...RAKE_LAYOUT, ...RAKE_MOBILE.layout },
		perf: { ...RAKE_PERF, ...RAKE_MOBILE.perf },
		grain: RAKE_MOBILE.grain ?? RAKE_GRAIN,
	};
};
