/**
 * Hero ink timeline.
 *
 * Drives the colour AND the blend mode of the hero type across the video loop,
 * so each phase of the clip gets the treatment that reads on it:
 *
 *   dark phase -> accent, `normal` blending. The backdrop is near-black, so
 *                 accent renders as itself: the warm ember of the reference.
 *   ray phase  -> a saturated ember red, `difference` blending. A blown-out
 *                 light ray crosses the type here; difference blend inverts the
 *                 type out of the ray instead of letting it wash out.
 *
 * ---------------------------------------------------------------------------
 * The blend maths
 * ---------------------------------------------------------------------------
 * Difference blend works PER CHANNEL: `|backdrop - ink|` on R, G and B
 * independently. Reasoning in luma alone is a good first approximation and is
 * how the switch points below were derived, but it is not the whole story for a
 * saturated ink - see the hue note further down.
 *
 * In luma terms, contrast against the backdrop is `|Yink - 2*Ybackdrop|`, which
 * means every flat ink has one backdrop luma where it disappears: `Yink/2`.
 * Choosing an ink for a difference blend is really choosing where to put that
 * dead spot so the footage never sits on it.
 *
 *   ink          luma   dead backdrop luma   dead spot lands...
 *   #bd3a0d        83          41            in the DARK phase - harmless
 *   #4F4F53        79          40            in the DARK phase - harmless
 *   accent        121          60            below the ray window
 *   #aeb0c5       177          88            INSIDE the ray ramp - problem
 *   primary       241         120            mid-ray - worst case
 *
 * Luma of the fixed palette (Rec.709, 0-255):
 *
 *   background #050505     5
 *   surface    #26282D    40
 *   border     #38393F    57
 *   accent     #b56c4b   121
 *   text       #D8D4C8   212
 *   primary    #F5F1E8   241
 *
 * ---------------------------------------------------------------------------
 * The ray ink
 * ---------------------------------------------------------------------------
 * #bd3a0d - a saturated ember red, luma 83 - specified directly by the user.
 *
 * Behaviour is well-conditioned: at luma 83 the ink is DARKER than every part
 * of the ray (the corner runs 90-167 average, with a clipped-white 235 core),
 * so it never crosses its own dead spot while the ray is on the type. That dead
 * spot sits at backdrop luma 41, which occurs only during the dark phase - when
 * the ink is accent in normal blending anyway. Measured contrast across the ray
 * window, computed per channel:
 *
 *   backdrop 90   -> renders rgb(99, 32, 77)    contrast ~40
 *   backdrop 120  -> renders rgb(69, 62, 107)   contrast ~53
 *   backdrop 235  -> renders rgb(46, 177, 222)  contrast ~83
 *
 * No dropout anywhere in the window, which is why the switch points below
 * could go back to the plain measured boundaries.
 *
 * HUE NOTE, because this is the surprising part: a saturated ink under a
 * difference blend does not keep its hue. Inverting a red-orange against a warm
 * white gives its near-complement, so over the blown-out ray core the letters
 * render CYAN-BLUE, not red. Over the darker parts of the frame they read close
 * to the stated ember. That swing is inherent to difference blending a
 * saturated colour - it is not a bug, and the only way to avoid it is a
 * desaturated ink (the previous #4F4F53 stayed neutral throughout).
 *
 * This is also outside the six fixed palette tokens. If it stays, promote it to
 * a real token rather than letting the literal spread.
 *
 * ---------------------------------------------------------------------------
 * The measurement behind the boundaries
 * ---------------------------------------------------------------------------
 * Average luma over the whole text block is misleading - it hides a narrow ray
 * crossing one corner. This measures the UPPER-RIGHT corner of the type, the
 * area that washed out on screen, reporting both average and peak:
 *
 *   ffmpeg -i public/video/hero-new-720.mp4 \
 *     -vf "fps=10,crop=iw*0.18:ih*0.17:iw*0.20:ih*0.58,signalstats,\
 *          metadata=print:key=lavfi.signalstats.YAVG:file=cornerAvg.txt,\
 *          metadata=print:key=lavfi.signalstats.YMAX:file=cornerMax.txt" \
 *     -f null -
 *
 * Limited-range yuv420p(tv), so YAVG/YMAX arrive as 16-235 and are rescaled
 * with (Y - 16) * 255/219. In that corner:
 *
 *   t        avg luma   peak luma
 *   0.0s        17         105    dark
 *   2.0s        53         226
 *   2.8s        90         235    <- ray arrives, peak is CLIPPED WHITE
 *   3.3s       119         235
 *   4.1s       167         235    brightest average
 *   4.8s       121         235
 *   5.4s        86         246
 *   7.0s        33         191
 *   8.1s        17         109
 *
 * Peak luma pins at 232-235 (the top of the legal range) from t=2.8s to 5.5s:
 * the ray core really is blown-out white there. The corner average crosses
 * luma 90 at t=2.82s rising and t=5.32s falling, which sets the switch points.
 *
 * The asymmetric 2.55/5.15 window used with #aeb0c5 is gone. It existed purely
 * to dodge that ink's dead spot at backdrop 88; #bd3a0d has no dead spot in
 * range, so the honest measured boundaries are correct again. Switch points sit
 * marginally before the crossings so the 500ms colour transition is settled by
 * the time the ray reaches the letters.
 */

/** Ink options, as palette tokens, palette-derived mixes, or stated literals. */
export const HERO_INK = {
	primary: 'var(--color-primary)',
	accent: 'var(--color-accent)',
	/** Border, lifted slightly toward primary. ~#4F4F53, luma 79. Unused now. */
	borderLift: 'color-mix(in srgb, var(--color-border) 88%, var(--color-primary))',
	/** Cool blue-grey, luma 177. Superseded, kept for quick A/B. */
	rayCool: '#aeb0c5',
	/** Saturated ember red for the ray phase, luma 83. Off-palette by request. */
	rayEmber: '#bd3a0d',
} as const

export type HeroInkKey = keyof typeof HERO_INK

/** Blend modes the type switches between. */
export type HeroInkBlend = 'normal' | 'difference'

export type HeroInkSegment = {
	readonly from: number
	readonly ink: HeroInkKey
	readonly blend: HeroInkBlend
}

/** Full boomerang duration. Used to wrap `currentTime` defensively. */
export const HERO_INK_LOOP_SECONDS = 8.233

/** Segment boundaries, in seconds, ordered by `from`. */
export const HERO_INK_TIMELINE: ReadonlyArray<HeroInkSegment> = [
	{ from: 0, ink: 'accent', blend: 'normal' },
	{ from: 2.75, ink: 'rayEmber', blend: 'difference' },
	{ from: 5.35, ink: 'accent', blend: 'normal' },
]

/**
 * Which segment applies at a given playback time.
 *
 * Returns the timeline entry itself, so callers can compare by identity to
 * detect a real change instead of diffing fields. The timeline is short and
 * ordered, so a linear scan beats anything cleverer.
 */
export function heroInkAt(time: number): HeroInkSegment {
	// Guard against a non-finite currentTime (can happen before metadata loads)
	// and against a clip that somehow runs past its own duration.
	const t =
		Number.isFinite(time) && time > 0 ? time % HERO_INK_LOOP_SECONDS : 0

	let segment: HeroInkSegment = HERO_INK_TIMELINE[0]
	for (const candidate of HERO_INK_TIMELINE) {
		if (t >= candidate.from) {
			segment = candidate
		} else {
			break
		}
	}
	return segment
}
