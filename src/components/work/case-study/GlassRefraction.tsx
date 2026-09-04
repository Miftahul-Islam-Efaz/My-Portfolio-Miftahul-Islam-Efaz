/*
  GLASS REFRACTION - the case study cover corner cards.

  Mapped from the Figma Glass effect on layer Vector 12:
  Refraction 100, Depth 80, Dispersion 100, Frost 0, Splay 2, Light -45 at 0%.

  WHY AN SVG FILTER AND NOT CSS

  backdrop-filter can blur, saturate and brighten what sits behind an element,
  but it cannot MOVE it. Refraction is displacement: light crossing into glass
  changes direction, so the backdrop has to be pushed sideways. Only
  feDisplacementMap does that, and feeding the filter through backdrop-filter is
  what makes it act on the page behind instead of the element's own pixels.
  No WebGL, no canvas, no rAF loop - the type on top stays selectable DOM.

  HOW A DISPLACEMENT MAP IS READ

  feDisplacementMap reads two channels as a VECTOR:

    x offset = (R - 128) / 128 * scale
    y offset = (G - 128) / 128 * scale

  So R and G must carry different numbers, and 128,128 means "do not move".

  TWO EARLIER MISTAKES, BOTH WORTH KEEPING WRITTEN DOWN

  1. A blurred greyscale silhouette. Grey means R == G == B, which forces
     x offset == y offset at every pixel: the backdrop is shoved diagonally by
     one uniform amount and never bends outward along the surface. A grey map
     cannot refract regardless of what splay, depth or dispersion say.

  2. Two linear gradient ramps across the full canvas. That fixed R != G, but
     the displacement then radiated from the CANVAS centre rather than along the
     curve's own normal, and it jumped from 0 outside the mask to full strength
     inside across a 2px edge. Tens of pixels of shove delivered over 2px is a
     tear, not a lens - which is what produced the hard neon streaks.

  WHAT IT DOES NOW - the gradient of a thickness field

  Real glass displaces light along the gradient of its own thickness. So build a
  height field h and differentiate it:

    h  = the silhouette, blurred - a smooth dome, 0 outside, 1 deep inside
    R  = 128 + gain * (h(x+d) - h(x-d))   the x slope
    G  = 128 + gain * (h(y+d) - h(y-d))   the y slope

  A central difference is a derivative, and the derivative of a height field IS
  the surface normal. This is what makes it behave:

    - it points along the true normal of the bezier, at every point, because it
      is derived from the shape rather than from an assumed centre
    - it is continuous, so no tears - the neon streaks cannot come back
    - it falls to zero on BOTH sides: outside the shape, and in the flat middle
      of a thick one, which is exactly how a bezelled sheet of glass behaves

  feOffset gives h(x+-d) and feComposite operator="arithmetic" does the
  subtraction and the +128 bias in one primitive, so the whole normal map is
  computed on the GPU inside the map's own filter. No canvas, no per-frame JS.

  Sign check: feOffset dx="-d" shifts content left, so at x it reads h(x+d).
  Near the left edge h rises with x, giving R > 128, so the backdrop is sampled
  from further right - content is pulled outward and the lens MAGNIFIES. Convex,
  which is what glass with a domed face does. Swap the k2/k3 signs to invert it.

  color-interpolation-filters="sRGB" is mandatory, and doubly so here: every
  arithmetic composite below assumes 0.5 means neutral. linearRGB would re-map
  that and inject a constant phantom displacement across the whole element.

  Chromium only. The CSS carries a plain blur/saturate declaration first and
  non-Chromium engines discard the url() one.
*/

// The Figma export, verbatim, at its authored 355 x 200 - not the normalised
// copy used by the clipPath. feImage rasterises, so it needs real coordinates.
const FIGMA_PATH =
	'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z'

/*
  DEPTH 80 -> stdDeviation 36. The BODY of the lens.

  This is the breadth of the dome: how far in from the edge the glass keeps
  bending. Wide, because the Figma layer visibly warps across most of its face
  rather than only at the rim - drag it over detailed content and the backdrop
  swells through the middle. Reduce it for a flatter sheet that only refracts at
  the boundary; raise it for a fatter, more magnifying lens.
*/
const DEPTH_BLUR = 36

/*
  SPLAY 2 -> stdDeviation 2. The RIM of the lens.

  Figma documents Splay as controlling how light bends around an object's edges,
  i.e. the SPREAD of the refraction. It is a separate axis from Depth: Depth is
  magnitude and breadth, Splay is how tightly the rim effect is confined.

  A second, much tighter blur of the same silhouette adds a narrow steep ridge
  right at the boundary. Because it is steep, its derivative spikes, and because
  it is narrow, that spike is a thin line - so the chromatic fringe hugs the
  bezier instead of fanning across the face. Splay 100 would be a wide fan; at 2
  it is a clean continuous filament, still fully coloured.
*/
const SPLAY_BLUR = 2

/*
  How the two height fields are mixed. Mostly body, a minority rim - the rim
  term only has to be present enough to light the edge, since being steep it
  contributes far more slope per unit weight than the broad dome does.
*/
const BODY_WEIGHT = 0.72
const RIM_WEIGHT = 0.28

/*
  DERIV_D: half-width of the central difference, in map units.

  Small enough to stay a local derivative, large enough that the broad dome -
  whose slope is only about 1/(2 * DEPTH_BLUR) per pixel - produces a usable
  difference rather than rounding to nothing in 8-bit.
*/
const DERIV_D = 4

/*
  GAIN: converts that raw slope into channel range.

  The dome climbs 0 to 1 over roughly 2 * DEPTH_BLUR, so across +-DERIV_D the
  difference is around 0.11. A gain near 3 lifts that to about 0.33 either side
  of neutral, which uses most of the channel without clipping. Clipping is worth
  avoiding: a clipped normal map goes FLAT in the clipped region, which would
  reintroduce hard-edged plateaus.
*/
const GAIN = 3

/*
  MAP_SS: supersample factor for the map raster.

  With no explicit width/height the browser rasterises the map at its intrinsic
  355 x 200 and stretches that bitmap to the corner, which is roughly twice the
  size. A tight ramp then resolves across only a handful of quantised steps, and
  forcing tens of pixels of backdrop through a few hard steps is what produced
  the blocky rainbow staircase. 4x leaves the gradient room to stay smooth.
*/
const MAP_SS = 4

/**
 * Builds the displacement map as a data URI.
 *
 * encodeURIComponent rather than a hand-escaped string: the markup contains
 * `#`, quotes and spaces, all of which terminate or corrupt a data URI if left
 * raw, and hand-encoding it is how this silently breaks later.
 *
 * preserveAspectRatio="none" on both the map and the feImage that loads it: the
 * corners are a different aspect ratio at different viewport sizes, so the map
 * must stretch with them or the field would drift off the curve.
 *
 * The black backing rect is deliberately oversized. feOffset shifts sampling by
 * DERIV_D, and this silhouette runs right up to the left and bottom edges of
 * the canvas; without opaque coverage past those edges the offsets would read
 * transparent and stamp a false slope along the border.
 *
 * @param mirrored - true for the right-hand corner, which is the same curve
 *   flipped in x. Mirroring the map rather than authoring a second path keeps
 *   the two sides in sync if the curve is ever re-exported.
 */
function displacementMap(mirrored: boolean): string {
	const transform = mirrored ? ' transform="translate(355,0) scale(-1,1)"' : ''

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${355 * MAP_SS}" height="${200 * MAP_SS}" viewBox="0 0 355 200" preserveAspectRatio="none">
		<defs>
			<filter id="normals" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
				<feGaussianBlur in="SourceGraphic" stdDeviation="${DEPTH_BLUR}" result="hBody" />
				<feGaussianBlur in="SourceGraphic" stdDeviation="${SPLAY_BLUR}" result="hRim" />
				<feComposite in="hBody" in2="hRim" operator="arithmetic" k1="0" k2="${BODY_WEIGHT}" k3="${RIM_WEIGHT}" k4="0" result="h" />

				<feOffset in="h" dx="-${DERIV_D}" dy="0" result="hxPlus" />
				<feOffset in="h" dx="${DERIV_D}" dy="0" result="hxMinus" />
				<feComposite in="hxPlus" in2="hxMinus" operator="arithmetic" k1="0" k2="${GAIN}" k3="-${GAIN}" k4="0.5" result="slopeX" />

				<feOffset in="h" dx="0" dy="-${DERIV_D}" result="hyPlus" />
				<feOffset in="h" dx="0" dy="${DERIV_D}" result="hyMinus" />
				<feComposite in="hyPlus" in2="hyMinus" operator="arithmetic" k1="0" k2="${GAIN}" k3="-${GAIN}" k4="0.5" result="slopeY" />

				<feColorMatrix in="slopeX" type="matrix" values="0.333 0.333 0.333 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="intoR" />
				<feColorMatrix in="slopeY" type="matrix" values="0 0 0 0 0  0.333 0.333 0.333 0 0  0 0 0 0 0  0 0 0 0 1" result="intoG" />
				<feComposite in="intoR" in2="intoG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
			</filter>
		</defs>
		<g filter="url(#normals)">
			<rect x="-40" y="-40" width="435" height="280" fill="#000000" />
			<path d="${FIGMA_PATH}" fill="#ffffff"${transform} />
		</g>
	</svg>`

	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * One refraction filter. Two are rendered, one per corner, because the map is
 * mirrored per side.
 */
function RefractionFilter({ id, mirrored }: { id: string; mirrored: boolean }) {
	const map = displacementMap(mirrored)

	/*
	  SCALES: lens strength per channel, in pixels at full push.

	  Refraction 100 and Depth 80 set the magnitude. Dispersion 100 sets the
	  SPREAD between the three: blue highest, red lowest, because blue has the
	  higher effective index of refraction and so bends most. Following that
	  ordering is what makes the fringe read as glass rather than as a
	  registration error.

	  The spread is deliberately tighter than before. Colour separation is the
	  DIFFERENCE between these numbers, and a wide split throws visibly separate
	  red/green/blue copies of the backdrop - which reads as broken rather than as
	  glass. Figma at Dispersion 100 still shows only a fine fringe, because its
	  base displacement is smooth. Raise the spread for more rainbow, but move all
	  three together to change strength.
	*/
	const SCALE_R = 38
	const SCALE_G = 44
	const SCALE_B = 50

	return (
		<filter
			id={id}
			x="0"
			y="0"
			width="100%"
			height="100%"
			/* See the note at the top of this file: without sRGB here, neutral grey
			   stops meaning zero and the whole sheet acquires a constant shift. */
			colorInterpolationFilters="sRGB"
		>
			<feImage
				href={map}
				preserveAspectRatio="none"
				x="0"
				y="0"
				width="100%"
				height="100%"
				result="map"
			/>

			{/* Three displacements of the SAME backdrop at three strengths. Under
			    backdrop-filter, SourceGraphic IS the content behind the element,
			    which is what makes this refraction rather than self-distortion. */}
			<feDisplacementMap
				in="SourceGraphic"
				in2="map"
				scale={SCALE_R}
				xChannelSelector="R"
				yChannelSelector="G"
				result="pushR"
			/>
			<feDisplacementMap
				in="SourceGraphic"
				in2="map"
				scale={SCALE_G}
				xChannelSelector="R"
				yChannelSelector="G"
				result="pushG"
			/>
			<feDisplacementMap
				in="SourceGraphic"
				in2="map"
				scale={SCALE_B}
				xChannelSelector="R"
				yChannelSelector="G"
				result="pushB"
			/>

			{/* Keep one channel from each pass and discard the rest. Alpha is held
			    at 1 in all three so the screen blend below sums colour only. */}
			<feColorMatrix
				in="pushR"
				type="matrix"
				values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="onlyR"
			/>
			<feColorMatrix
				in="pushG"
				type="matrix"
				values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
				result="onlyG"
			/>
			<feColorMatrix
				in="pushB"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
				result="onlyB"
			/>

			{/* screen is additive, so the three channels recombine to the original
			    colour wherever they agree and separate into a fringe where the
			    displacements differ - steepest at the rim. That is chromatic
			    dispersion, and it is why the colour appears at the edge. */}
			<feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
			<feBlend in="rg" in2="onlyB" mode="screen" />
		</filter>
	)
}

/**
 * The two filters, for the left and right cover corners.
 *
 * Rendered into the existing zero-size carrier <svg> in CaseStudyCover next to
 * the clipPaths, so the definitions live beside the geometry they belong to and
 * nothing new occupies layout.
 */
export default function GlassRefraction() {
	return (
		<>
			<RefractionFilter id="cs-glass-left" mirrored={false} />
			<RefractionFilter id="cs-glass-right" mirrored />
		</>
	)
}
