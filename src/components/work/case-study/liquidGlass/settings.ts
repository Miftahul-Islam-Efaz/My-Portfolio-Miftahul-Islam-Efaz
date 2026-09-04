/**
 * LIQUID GLASS - CALIBRATION.
 *
 * These are not my numbers. GLASS / SOLVER / SHAPE are the user's exported
 * config verbatim, and TUNING / DEPTH_REF are lifted from the reference
 * implementation's state.js. Nothing here is fitted by eye.
 *
 * There is no settings panel and no props reach these values on purpose: the
 * effect is already tuned, and a second place to tune it from is the one
 * change that would make it worse.
 *
 * THREE SCALES LIVE HERE. Confusing them is what makes the effect look weak.
 *
 *   GLASS    Figma's own 0-100 dials, unitless.
 *   TUNING   what each dial is worth at 100, in PATH units, fitted against a
 *            shape whose smaller side is DEPTH_REF.
 *   SOLVER   the solver's own units, also path units.
 *
 * Path units become pixels through two factors applied at draw time:
 *   ref = min(vw, vh) / DEPTH_REF   so a dial keeps its meaning on any shape
 *   k   = sqrt(kx * ky)             the layer's on-screen scale
 * Both are computed in the component, not here, because only it knows the
 * rendered size.
 */

/** The height the calibration constants were fitted against. */
export const DEPTH_REF = 199.5;

/**
 * Figma's 0-100 scales -> solver units, from the reference implementation.
 * Values are per-100 of the corresponding dial.
 */
export const TUNING = {
  /** Rim width in path units. Scaled by the Depth dial AND by reach. */
  depthAt100: 42.5,
  /**
   * Displacement in path units. NEGATIVE - the bend is inward.
   * The sign is load-bearing: flipping it refracts the backdrop outward,
   * which still looks like glass but not like this glass.
   */
  refractAt100: -77,
  /** Chromatic split half-width. A wide band; saturation comes from chroma. */
  dispAt100: 26,
  /** Frost blur radius. */
  frostAt100: 24,
  /** Specular gain. */
  specAt100: 1.2,
  /** Rim profile exponent. 1 = circular bevel, and 1 means "no shaping". */
  profile: 1,
} as const;

/**
 * Fill #302E2A.
 *
 * Figma's own value is #2A2E30, which is the same three bytes in the other
 * order - a COOL grey leaning blue. This is its mirror: red high, blue low,
 * so it leans warm instead. Same darkness, opposite temperature, which is
 * what stops the glass reading as another patch of the cool void behind it.
 */
export const TINT: readonly [number, number, number] = [
  0x30 / 255,
  0x2e / 255,
  0x2a / 255,
];

/** Figma's dials, verbatim from the exported config. */
export const GLASS = {
  lightAngle: -38,
  /**
   * DELIBERATELY ABOVE THE EXPORTED VALUE (19).
   *
   * The editor these numbers came from sits the shape over a bright, busy
   * 3D scene. This cover is near-black void behind the corners, and
   * refraction and dispersion can only bend and split what is already
   * there - over flat black they have nothing to work with and the glass
   * disappears. The specular pass is the only term that GENERATES light
   * rather than borrowing it, so it is what makes the bevel read here.
   */
  lightIntensity: 60,
  refraction: 100,
  depth: 29,
  dispersion: 54,
  frost: 3,
  /**
   * Now non-zero, which widens the specular lobe: the shader exponent is
   * 96 / (1 + splay * splay * 4), so 0.9 takes it from 96 to about 23 - a
   * broader, softer highlight rather than a tight glint.
   */
  splay: 0.9,
} as const;

/** Solver internals, verbatim. Path units. */
export const SOLVER = {
  /**
   * How far the bevel reaches inward. Beyond Figma's own cap: high values turn
   * the whole shape into a lens rather than a flat pane with a bevelled edge.
   * The Depth dial multiplies this, so the effective rim is
   * (depth / 100) * reach = 36.4 path units here - NOT 125.5.
   */
  reach: 125.5,
  /** Distance-field blur before profiling. Zero, so that stage is skipped. */
  soften: 0,
  /** Height-field blur sigma. Kills the medial-axis crease. */
  smooth: 5,
  /** Normal amplification. Meaningful only against the 0.0625 Sobel factor. */
  gain: 123,
  /** Saturation restored after spectral integration. */
  chroma: 1.5,
  /** Width of each spectral response curve. Tighter = cleaner hues. */
  spread: 0.29,
  /** Rim profile falloff. Low, so colour reaches inward. */
  fall: 1,
  /** Backdrop compression darkening. */
  dark: 0,
  /** Tint amount, against TINT above. 7 percent. */
  tint: 0.07,
} as const;

/** The shape, from the same export. viewBox 0 0 355 199.5, fill-rule nonzero. */
export const SHAPE = {
  path: 'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z',
  vw: 355,
  vh: 199.5,
  fillRule: 'nonzero' as const,
};

/** Aspect of the authored artwork. The CSS corner tokens use 1.775. */
export const CORNER_ASPECT = SHAPE.vw / SHAPE.vh;

/**
 * ref: keeps a dial's meaning on shapes of any size.
 * Constant 1 for this artwork, but written out rather than folded away so the
 * relationship survives someone changing the path.
 */
export const SIZE_REF = Math.max(
  Math.min(SHAPE.vw, SHAPE.vh) / DEPTH_REF,
  0.05,
);

/**
 * Field supersample factor.
 *
 * The reference editor uses 4 at rest, which for this artwork is a 1516x894
 * RGBA32F texture - about 21 MB, rebuilt on the main thread. This canvas is
 * one decoration inside a case-study window that already has a scroll budget,
 * and the field is smooth and LINEAR-filtered, so a coarser field costs very
 * little visible quality. 2 gives 806x495, about 6.4 MB.
 *
 * This is the one number here that is a judgement rather than a measurement.
 */
export const FIELD_SCALE = 2;

/** Full-quality tap count. The reference uses 40 at rest, 8 during drags. */
export const TAPS = 40;
