
/**
 * THE GLASS MATERIAL - WebGL.
 *
 * REVISION 6. The refraction and the blur are now physically derived rather
 * than approximated, which was the remaining gap against the Figma render.
 *
 * WHAT CHANGED, AND WHY THE SVG ROUTE COULD NOT GET THERE
 * ------------------------------------------------------
 * 1. REFRACTION IS NOW SNELL'S LAW WITH A REAL INDEX OF REFRACTION.
 *    Previously the sample offset was N.xy * strength - the normal direction
 *    times an arbitrary scalar. There is no glass property in that expression.
 *    Now a view ray is refracted through the surface normal with refract(),
 *    and then MARCHED THROUGH THE GLASS THICKNESS:
 *
 *        T      = refract(viewDir, N, 1.0 / ior)
 *        offset = T.xy * (thickness / -T.z)
 *
 *    That is the actual geometry of a ray crossing a slab: the further it has
 *    to travel through the body, the further sideways it lands. Thickness now
 *    governs displacement, which is what makes the material read as a solid
 *    with volume rather than as a distortion filter.
 *
 * 2. DISPERSION IS NOW WAVELENGTH-DEPENDENT IOR, NOT AN OFFSET HACK.
 *    Real chromatic aberration happens because the index of refraction differs
 *    per wavelength. So R, G and B are each refracted with their OWN ior
 *    (ior -/+ dispersion) and each traced separately, instead of nudging one
 *    shared offset three ways. Red bends least, blue most, exactly as in glass.
 *
 * 3. BLUR IS NOW THICKNESS-WEIGHTED AND HAPPENS AT THE REFRACTED COORDINATE.
 *    This is the one that CSS and SVG filters structurally cannot do.
 *    backdrop-filter: blur() and feGaussianBlur both have a SINGLE scalar
 *    radius applied uniformly over the whole element, and they blur the
 *    composite rather than the refracted samples. Frosted glass does the
 *    opposite: light scatters along its path, so the blur radius grows with the
 *    distance travelled through the body, and it is the ALREADY-BENT light that
 *    gets scattered. Here the tap radius scales with the same thickness term
 *    that drives refraction, and every tap is taken around the refracted uv.
 *    The kernel is also widened from 9 taps to 13 (centre + 12 directions),
 *    which removes the faint rosette the 9-tap left in wide-blur regions.
 *
 * NO LIGHT SOURCE. NO BORDER. There is no specular term, no rim light, no
 * caustic, no Fresnel reflection, no edge highlight, and no dial to add one.
 * Depth comes only from thickness-driven refraction and thickness-driven
 * scatter. The edge exists solely because the bend eases off there.
 *
 * The scattering LIFT is kept: it is volumetric, not a light. Figma's glass is
 * visibly brighter than its backdrop while its fill is 2A2E30 at 2 percent -
 * essentially nothing - so that pale milky quality is light scattering inside
 * the body, not a fill colour and not a highlight.
 *
 * Deliberate differences from the reference engine:
 *
 *   - THE SHAPE. The reference uses an analytic rounded-box SDF. This uses a
 *     signed distance field rasterised from the authored corner path, sampled
 *     as a texture, so the silhouette is the real shape rather than a rectangle.
 *   - THE BACKDROP. The reference draws a generated scene; this draws the cover
 *     photograph. There is no embedded UI texture layer.
 *   - MAGNIFICATION. A thick lens ENLARGES what is behind it. Offsetting along
 *     the normal shifts and compresses the backdrop but can never magnify it,
 *     so the reference body always reads flat however high refraction goes.
 *
 * WHY REFRACTION USED TO HAPPEN ONLY AT THE EDGE.
 *
 * The reference gets full-body lensing from centerDomeNormal, built from
 * normP = p / (card_size * 0.5) - the offset from the CARD'S CENTRE. That works
 * because its card is a rectangle, so that centre sits deep inside the glass.
 *
 * This shape is a blob filling only the lower part of its bounding rectangle,
 * so THE RECTANGLE'S CENTRE LIES OUTSIDE THE GLASS. For almost every pixel
 * genuinely inside the shape, centerDistSq was large, smoothstep(0, 1.4, ...)
 * returned ~1, and the dome term multiplied out to ZERO. All that survived was
 * bevelSlope, spanning roughly 8% of the shape. Hence bending at the edge only.
 *
 * Both lenses are driven by depth into the shape, measured by the distance
 * field, so they follow the real silhouette and cannot depend on a bounding box.
 * Magnification uses the shape's true CENTROID, computed from the mask.
 *
 * Slopes are BOUNDED. The reference divides by max(profile, 0.02), which at the
 * outline gives a slope of FIFTY and smears the backdrop into a hard streak
 * that reads as a cut border - invisible on a straight-sided card, unmissable
 * on an all-curve silhouette.
 *
 * Displacement eases to ZERO exactly at the outline, so the backdrop runs
 * unbroken from outside to inside and compresses inward. Without that, maximum
 * bend sits flush against untouched backdrop and reads as a sliced border.
 *
 * WHY THIS PAINTS THE PHOTOGRAPH ITSELF. backdrop-filter cannot refract: it
 * blurs and tints what is behind an element but never bends it, so the body can
 * only ever look frosted, not lensed. Owning the backdrop is the only way to
 * get true transmission in a browser.
 *
 * NOTE ON TEMPLATE LITERALS: never put a backtick anywhere in the shader
 * strings below, including inside GLSL comments. It closes the literal early
 * and the build fails with "Expected a semicolon" pointing at raw GLSL.
 */

import { useEffect, useRef } from 'react';

/** The corner shape, exactly as authored. 355 x 199.5 user units. */
const FIGMA_PATH =
  'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z';
const PATH_W = 355;
const PATH_H = 199.5;
const CORNER_ASPECT = PATH_W / PATH_H;

/** Distance-field supersampling. At 4 the normals stair-step visibly along the
 *  long shallow bezier; 6 clears it. One-off CPU cost, not per-frame. */
const SS = 6;

export interface GlassConfig {
  /** Index of refraction. 1.0 is air, 1.5 is window glass, 2.4 is diamond. */
  ior: number;
  /** Glass thickness. Scales how far a refracted ray travels sideways. */
  thickness: number;
  /** Overall surface curvature gain feeding the normal. */
  refraction: number;
  centerLens: number;
  /** Spread between the per-channel indices of refraction. */
  dispersion: number;
  /** Scatter amount. Radius grows with thickness travelled. */
  frost: number;
  bevel: number;
  waviness: number;
  tint: number;
  /** How deep into the shape the body lens reaches, in shape-height units. */
  bodyReach: number;
  /** 0 = bend spread evenly across the face, 1 = concentrated at the edge. */
  edgeBias: number;
  /** How far in from the outline the bend builds up. */
  edgeEase: number;
  /** Thick-lens enlargement of the backdrop toward the body centroid. */
  magnify: number;
  /** Pale scattering lift, the milky brightening seen in Figma. */
  lift: number;
}

/**
 * FIGMA-MATCHED CONFIG.
 *
 * Derived by reading the reference render rather than the Figma dials, since
 * Figma's Depth/Refraction/Splay do not map linearly onto these terms:
 *   - ior 1.5     : ordinary glass. Figma's Refraction 100 is not an IOR.
 *   - thickness .1: tuned so the bend at the rim matches the render.
 *   - tint 0      : Figma's glass is BRIGHTER than the backdrop, not darker.
 *                   Its fill is 2A2E30 at 2%, which is visually nothing.
 *   - magnify 0.42: the desk edge and reflections inside the shape are clearly
 *                   ENLARGED, which only a thick-lens term can do.
 *   - lift 0.22   : the pale milky scattering across the face.
 *   - bodyReach .8: bending runs across the entire face, not near the outline.
 *   - edgeBias .12: almost no edge weighting; Figma's face bends evenly.
 *   - edgeEase .05: the bend runs right up to the silhouette, still unbroken.
 *   - frost 1.2   : Figma reads Frost 0, but its internal reflections are
 *                   slightly creamy rather than photographically sharp.
 */
export const DEFAULT_GLASS: GlassConfig = {
  ior: 1.5,
  thickness: 0.06,
  refraction: 129,
  centerLens: 0.9,
  dispersion: 0.04,
  frost: 1.2,
  bevel: 0.34,
  waviness: 0,
  tint: 0,
  bodyReach: 0.8,
  edgeBias: 0.12,
  edgeEase: 0.05,
  magnify: 0.42,
  lift: 0.22,
};

/* ------------------------------------------------------------------ *
 * EUCLIDEAN DISTANCE TRANSFORM (Felzenszwalb & Huttenlocher)          *
 * ------------------------------------------------------------------ */

function edt1d(f: Float64Array, n: number) {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = 0;
    while (k >= 0) {
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      if (s > z[k]) break;
      k--;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  for (let q = 0; q < n; q++) f[q] = d[q];
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const col = new Float64Array(h);
  const row = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = grid[y * w + x];
    edt1d(col, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = col[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = grid[y * w + x];
    edt1d(row, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = row[x];
  }
}

/**
 * Rasterises the path into an 8-bit signed distance field. 128 is the outline,
 * above is inside, below is outside; the byte range spans +/- `range` mask
 * pixels, returned so the shader can decode it.
 *
 * Also returns the mask CENTROID in local 0..1 texture coordinates, which is
 * where magnification pulls toward. The bounding-box centre is useless here -
 * it falls outside this shape.
 */
function buildSdf(mirrored: boolean, w: number, h: number) {
  const mw = Math.max(8, Math.round(w * SS));
  const mh = Math.max(8, Math.round(h * SS));

  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, mw, mh);
  ctx.save();
  ctx.scale(mw / PATH_W, mh / PATH_H);
  if (mirrored) {
    ctx.translate(PATH_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(FIGMA_PATH));
  ctx.restore();

  const px = ctx.getImageData(0, 0, mw, mh).data;
  const n = mw * mh;

  /* Two complementary grids; the difference of their roots is the SIGNED
     distance. One grid alone gives a glow, not a field. */
  const inside = new Float64Array(n);
  const outside = new Float64Array(n);

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const solid = px[i * 4 + 3] > 127;
    inside[i] = solid ? 0 : Infinity;
    outside[i] = solid ? Infinity : 0;
    if (solid) {
      sumX += i % mw;
      sumY += Math.floor(i / mw);
      count++;
    }
  }

  edt2d(inside, mw, mh);
  edt2d(outside, mw, mh);

  const range = Math.max(8, Math.min(mw, mh) * 0.5);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    /* Inside must be POSITIVE here. Inverting these two terms fills the corner
       rect and cuts the shape out of it, which is the opposite of glass. The
       shader negates this to reach the reference convention. */
    const signed = Math.sqrt(outside[i]) - Math.sqrt(inside[i]);
    out[i] = Math.max(0, Math.min(255, Math.round((signed / range) * 127.5 + 127.5)));
  }

  /* Texture v is flipped on upload (UNPACK_FLIP_Y_WEBGL), so the centroid's
     row index must be flipped to match. */
  const cx = count ? sumX / count / mw : 0.5;
  const cy = count ? 1 - sumY / count / mh : 0.5;

  return { data: out, w: mw, h: mh, range, cx, cy };
}

/* ------------------------------------------------------------------ *
 * SHADERS                                                             *
 * ------------------------------------------------------------------ */

const VS = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FS = `
precision highp float;

uniform vec2      u_resolution;
uniform sampler2D u_backdrop;
uniform vec2      u_imgScale;
uniform vec2      u_imgOffset;
uniform sampler2D u_sdfL;
uniform sampler2D u_sdfR;
uniform vec4      u_rectL;     // x, y, w, h in uv space, y up
uniform vec4      u_rectR;
uniform vec2      u_centL;     // mask centroid, local 0..1
uniform vec2      u_centR;
uniform float     u_sdfRange;  // decode scale, in shape-height units
uniform float     u_time;

uniform float u_ior;
uniform float u_thickness;
uniform float u_refraction;
uniform float u_centerLens;
uniform float u_dispersion;
uniform float u_frost;
uniform float u_bevel;
uniform float u_waviness;
uniform float u_tint;
uniform float u_bodyReach;
uniform float u_edgeBias;
uniform float u_edgeEase;
uniform float u_magnify;
uniform float u_lift;

varying vec2 vUv;

/* ---- Simplex noise, as in the reference ---- */
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

/* Cover-fit sample of the photograph. */
vec3 backdrop(vec2 uv) {
  return texture2D(u_backdrop, uv * u_imgScale + u_imgOffset).rgb;
}

/* THE SHAPE. Signed distance in the REFERENCE CONVENTION: negative inside,
   positive outside, in shape-height units. Outside the corner rect it returns a
   large positive rather than a clamped edge value; clamping smears the field
   across the viewport. */
float shapeSdf(sampler2D sdf, vec4 rect, vec2 uv) {
  vec2 local = (uv - rect.xy) / rect.zw;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
    return 10.0;
  }
  float d = -((texture2D(sdf, local).r * 2.0 - 1.0) * u_sdfRange);

  if (u_waviness > 0.01) {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 pAsp = vec2(uv.x * aspect, uv.y);
    float wave1 = snoise(pAsp * 4.5 + vec2(u_time * 0.45, u_time * 0.28)) * 0.022;
    float wave2 = sin(pAsp.x * 10.0 + u_time * 1.0) * 0.009;
    d += (wave1 + wave2) * u_waviness;
  }
  return d;
}

/* A CONVEX MENISCUS SLOPE from depth into the body.

   depth is 0 at the outline and 1 at reach and beyond. The profile is a
   spherical cap, so slope is steepest just inside the surface and eases to zero
   deep in the body - a real lens, whatever the silhouette.

   BOUNDED. The reference guard max(profile, 0.02) yields a slope of 50 at the
   outline, which smears into a hard streak that reads as a border. */
float meniscusSlope(float dist, float reach) {
  float depth = clamp(-dist / max(reach, 0.004), 0.0, 1.0);
  float inv = 1.0 - depth;
  float profile = sqrt(max(1.0 - inv * inv, 0.0));
  return min(inv / max(profile, 0.22), 4.0);
}

/* THICKNESS of the slab at this point, as a spherical cap height.

   0 at the outline, rising to 1 deep in the body. This is what the refracted
   ray is marched through, and what scales the scatter radius. It is the single
   term that makes the material read as having volume. */
float slabThickness(float dist, float reach) {
  float depth = clamp(-dist / max(reach, 0.004), 0.0, 1.0);
  float inv = 1.0 - depth;
  return sqrt(max(1.0 - inv * inv, 0.0));
}

/* Multi-tap scatter: centre plus 12 directions.

   This is called AT THE REFRACTED COORDINATE, so it is the already-bent light
   that gets scattered, and the radius passed in grows with slab thickness.
   Neither is expressible in CSS or SVG: backdrop-filter blur() and
   feGaussianBlur have one scalar radius for the whole element and operate on
   the composite, not on the refracted samples. */
vec3 sampleBlurredBackdrop(vec2 uv, float blur) {
  if (blur <= 0.001) return backdrop(uv);

  vec2 texel = (1.0 / u_resolution) * blur;

  vec3 sum = backdrop(uv);
  float wsum = 1.0;

  /* Four axes at full radius. */
  sum += backdrop(uv + vec2( texel.x, 0.0)); wsum += 1.0;
  sum += backdrop(uv + vec2(-texel.x, 0.0)); wsum += 1.0;
  sum += backdrop(uv + vec2(0.0,  texel.y)); wsum += 1.0;
  sum += backdrop(uv + vec2(0.0, -texel.y)); wsum += 1.0;

  /* Four diagonals. */
  sum += backdrop(uv + vec2( texel.x,  texel.y) * 0.707); wsum += 1.0;
  sum += backdrop(uv + vec2(-texel.x,  texel.y) * 0.707); wsum += 1.0;
  sum += backdrop(uv + vec2( texel.x, -texel.y) * 0.707); wsum += 1.0;
  sum += backdrop(uv + vec2(-texel.x, -texel.y) * 0.707); wsum += 1.0;

  /* Four intercardinals at half radius, which fill in the rosette the 8-tap
     ring leaves behind once the radius gets wide. */
  sum += backdrop(uv + vec2( texel.x * 0.5,  texel.y)); wsum += 1.0;
  sum += backdrop(uv + vec2(-texel.x * 0.5, -texel.y)); wsum += 1.0;
  sum += backdrop(uv + vec2( texel.x, -texel.y * 0.5)); wsum += 1.0;
  sum += backdrop(uv + vec2(-texel.x,  texel.y * 0.5)); wsum += 1.0;

  return sum / wsum;
}

/* Trace a view ray through the slab and return the uv offset where it lands.

   T = refract(I, N, eta) is the real refracted direction. Marching it through
   the slab gives the sideways travel: the deeper the glass at this point, the
   further the ray walks before it exits. -T.z is guarded because at grazing
   angles it approaches zero and the offset would explode.

   refract() returns the zero vector on total internal reflection; the length
   check falls back to a straight-through ray so those pixels stay continuous
   rather than collapsing to the texture origin. */
vec2 refractOffset(vec3 N, float eta, float thick) {
  vec3 I = vec3(0.0, 0.0, -1.0);
  vec3 T = refract(I, N, eta);
  if (dot(T, T) < 0.0001) {
    return vec2(0.0);
  }
  vec2 off = T.xy * (thick / max(-T.z, 0.35));
  float mag = length(off);
  if (mag > 0.05) off *= 0.05 / mag;
  return off;
}

void main() {
  vec2 uv = vUv;

  /* Pick the nearer of the two corners. Samplers cannot be chosen by a ternary
     in GLSL ES 1.00, so both are sampled and the choice is made on floats. */
  float dL = shapeSdf(u_sdfL, u_rectL, uv);
  float dR = shapeSdf(u_sdfR, u_rectR, uv);
  float useR = step(dR, dL);
  float dist = mix(dL, dR, useR);
  vec4  rect = mix(u_rectL, u_rectR, useR);
  vec2  cent = mix(u_centL, u_centR, useR);

  /* Anti-aliased outer mask. Narrow: the edge is meant to disappear because the
     BEND eases off, not because the shape fades out. */
  float aa = 2.0 / min(u_resolution.x, u_resolution.y);
  float glassMask = 1.0 - smoothstep(0.0, aa, dist);

  /* Outside glass: pristine sharp backdrop. */
  if (glassMask <= 0.0001) {
    gl_FragColor = vec4(backdrop(uv), 1.0);
    return;
  }

  /* Depth into the body, 0 at the outline, 1 at full reach. */
  float bodyDepth = clamp(-dist / max(u_bodyReach, 0.004), 0.0, 1.0);

  /* CONTINUITY. Displacement reaches ZERO exactly at the outline, so the
     backdrop runs unbroken across the silhouette and compresses inward.
     Without it, maximum bend sits against untouched backdrop and the
     discontinuity reads as a sliced border. */
  float edgeEase = smoothstep(0.0, max(u_edgeEase, 0.002), -dist);

  /* ---------------------------------------------------------------
     1. LENS SURFACE NORMALS - across the WHOLE body

     Everything comes from the distance field, so it follows the real
     silhouette. Nothing refers to the bounding rectangle: its centre
     lies outside this shape, which is what previously zeroed the body
     term and left bending only at the edge.
     --------------------------------------------------------------- */
  float eps = 0.003;
  float dX  = shapeSdf(u_sdfL, u_rectL, uv + vec2(eps, 0.0)) - shapeSdf(u_sdfL, u_rectL, uv - vec2(eps, 0.0));
  float dY  = shapeSdf(u_sdfL, u_rectL, uv + vec2(0.0, eps)) - shapeSdf(u_sdfL, u_rectL, uv - vec2(0.0, eps));
  float dXR = shapeSdf(u_sdfR, u_rectR, uv + vec2(eps, 0.0)) - shapeSdf(u_sdfR, u_rectR, uv - vec2(eps, 0.0));
  float dYR = shapeSdf(u_sdfR, u_rectR, uv + vec2(0.0, eps)) - shapeSdf(u_sdfR, u_rectR, uv - vec2(0.0, eps));
  vec2 grad = normalize(mix(vec2(dX, dY), vec2(dXR, dYR), useR) + 0.00001);

  /* BODY LENS - reaches deep, so the entire face bends. */
  float bodySlope = meniscusSlope(dist, u_bodyReach);

  /* BEVEL LENS - narrow, the tighter curvature near the silhouette. */
  float bevelZone = max(u_bevel * 0.25, 0.015);
  float bevelSlope = meniscusSlope(dist, bevelZone);
  float edgeNorm = clamp(-dist / bevelZone, 0.0, 1.0);

  /* Liquid surface flow across the whole face. */
  vec2 fluidFlow = vec2(0.0);
  if (u_waviness > 0.01) {
    float n1 = snoise(uv * 8.0 + vec2(u_time * 0.35, -u_time * 0.25));
    float n2 = snoise(uv * 14.0 - vec2(u_time * 0.45, u_time * 0.35));
    fluidFlow = vec2(n1, n2) * (u_waviness * 0.55);
  }

  /* EDGE BIAS. The reference hardcodes (0.65 + 0.95 * rimFactor), weighting
     refraction toward the rim. At 0 this is flat across the face; at 1 it is
     the reference's edge-heavy behaviour. */
  float rimFactor = (1.0 - edgeNorm) * u_edgeBias;

  vec2 normalXY = -grad * (bodySlope * u_centerLens * 2.2 + bevelSlope * 0.55)
                  * (u_refraction / 129.0) * (0.65 + 0.95 * rimFactor)
                  + fluidFlow;
  vec3 N = normalize(vec3(normalXY, 1.0));

  /* ---------------------------------------------------------------
     2. THICK-LENS MAGNIFICATION

     NOT IN THE REFERENCE. It only offsets samples along the surface
     normal, which shifts and compresses the backdrop but can NEVER
     enlarge it - so its body reads flat at any refraction value.

     A thick converging lens magnifies: sample positions contract toward
     the optical centre, so a smaller region of backdrop is spread across
     the face. The centre used here is the shape's MASK CENTROID, not its
     bounding-box centre, which for this blob falls outside the glass.
     --------------------------------------------------------------- */
  vec2 centUv = rect.xy + cent * rect.zw;
  vec2 lensUv = mix(uv, centUv, u_magnify * bodyDepth * edgeEase);

  /* ---------------------------------------------------------------
     3. SNELL REFRACTION THROUGH A SLAB, WITH WAVELENGTH-DEPENDENT IOR

     The offset is no longer normal-direction times an arbitrary scalar.
     A view ray is refracted by refract() and marched through the local
     slab thickness, so THICKNESS governs displacement - which is what
     reads as volume.

     Dispersion is a per-channel IOR, not three nudges of one shared
     offset. Real chromatic aberration exists because the index differs
     per wavelength: red bends least, blue most.
     --------------------------------------------------------------- */
  float thick = slabThickness(dist, u_bodyReach)
              * u_thickness * (0.35 + 0.65 * rimFactor) * edgeEase;

  float iorR = max(u_ior - u_dispersion, 1.0);
  float iorG = max(u_ior,               1.0);
  float iorB = max(u_ior + u_dispersion, 1.0);

  vec2 refrR = lensUv + refractOffset(N, 1.0 / iorR, thick);
  vec2 refrG = lensUv + refractOffset(N, 1.0 / iorG, thick);
  vec2 refrB = lensUv + refractOffset(N, 1.0 / iorB, thick);

  refrR = clamp(refrR, 0.002, 0.998);
  refrG = clamp(refrG, 0.002, 0.998);
  refrB = clamp(refrB, 0.002, 0.998);

  /* ---------------------------------------------------------------
     4. THICKNESS-WEIGHTED SCATTER

     Light scatters along its path through the body, so the radius grows
     with the distance travelled, and it is the REFRACTED sample that is
     scattered. A uniform CSS blur can express neither.
     --------------------------------------------------------------- */
  float pathLen = slabThickness(dist, u_bodyReach);
  float bodyBlur = u_frost * (0.25 + 1.35 * pathLen) * edgeEase;

  float rCol = sampleBlurredBackdrop(refrR, bodyBlur).r;
  float gCol = sampleBlurredBackdrop(refrG, bodyBlur).g;
  float bCol = sampleBlurredBackdrop(refrB, bodyBlur).b;

  vec3 glassBody = vec3(rCol, gCol, bCol);

  /* ---------------------------------------------------------------
     5. SCATTERING LIFT, then TINT ABSORPTION

     Volumetric, NOT a light source and not a highlight. Figma's glass is
     visibly BRIGHTER than its backdrop while its fill is 2A2E30 at 2% -
     essentially nothing - so that pale milky quality is scattering
     inside the body. Screen-style so it lifts shadows without
     flattening highlights.

     Both terms fade with the continuity term, so the body never
     brightens or darkens against the backdrop along a visible line.
     --------------------------------------------------------------- */
  float liftAmt = u_lift * (0.35 + 0.65 * bodyDepth) * edgeEase;
  vec3 pale = vec3(0.80, 0.88, 0.97);
  glassBody = glassBody + (pale - glassBody * pale) * liftAmt;

  glassBody = mix(glassBody, vec3(0.06, 0.09, 0.14), u_tint * edgeEase);

  // Composite with pristine backdrop
  gl_FragColor = vec4(mix(backdrop(uv), glassBody, glassMask), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[glass] compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface GlassMaterialProps {
  /** The cover photograph. Must be same-origin, or the texture upload taints. */
  src: string;
  /** Live material configuration. */
  config?: GlassConfig;
  /** Called once the backdrop texture is uploaded and the first frame drawn. */
  onStatus?: (status: string) => void;
}

export default function GlassMaterial({ src, config, onStatus }: GlassMaterialProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* The config is read through a ref inside the draw loop, so moving a slider
     repaints rather than tearing down the GL context and rebuilding the fields. */
  const cfgRef = useRef<GlassConfig>(config ?? DEFAULT_GLASS);
  cfgRef.current = config ?? DEFAULT_GLASS;

  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      statusRef.current?.('no webgl context');
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      statusRef.current?.('shader compile failed - see console');
      return;
    }

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[glass] link failed:', gl.getProgramInfoLog(prog));
      statusRef.current?.('shader link failed - see console');
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (name: string) => gl.getUniformLocation(prog, name);
    const u = {
      resolution: U('u_resolution'),
      backdrop: U('u_backdrop'),
      imgScale: U('u_imgScale'),
      imgOffset: U('u_imgOffset'),
      sdfL: U('u_sdfL'),
      sdfR: U('u_sdfR'),
      rectL: U('u_rectL'),
      rectR: U('u_rectR'),
      centL: U('u_centL'),
      centR: U('u_centR'),
      sdfRange: U('u_sdfRange'),
      time: U('u_time'),
      ior: U('u_ior'),
      thickness: U('u_thickness'),
      refraction: U('u_refraction'),
      centerLens: U('u_centerLens'),
      dispersion: U('u_dispersion'),
      frost: U('u_frost'),
      bevel: U('u_bevel'),
      waviness: U('u_waviness'),
      tint: U('u_tint'),
      bodyReach: U('u_bodyReach'),
      edgeBias: U('u_edgeBias'),
      edgeEase: U('u_edgeEase'),
      magnify: U('u_magnify'),
      lift: U('u_lift'),
    };

    /* Single-channel rows are not 4-byte aligned; the default UNPACK_ALIGNMENT
       of 4 makes texImage2D reject a LUMINANCE upload whose width is not a
       multiple of 4, leaving every sample 0 - which decodes to "outside"
       everywhere and draws no shape at all. */
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    const texBackdrop = makeTex();
    const texL = makeTex();
    const texR = makeTex();

    gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 14, 18, 255])
    );

    let imgW = 1;
    let imgH = 1;

    let sdfL: ReturnType<typeof buildSdf> = null;
    let sdfR: ReturnType<typeof buildSdf> = null;
    let builtFor = -1;
    let raf = 0;
    let loop = 0;
    const t0 = performance.now();

    const draw = () => {
      raf = 0;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(1, Math.round(cssW * dpr));
      const H = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, W, H);

      /* Same sizing the CSS uses for the corner cards. */
      const cornerH = Math.min(470, Math.max(185, cssH * 0.42));
      const cornerW = cornerH * CORNER_ASPECT;

      const key = Math.round(cornerH);
      if (key !== builtFor) {
        sdfL = buildSdf(false, cornerW, cornerH);
        sdfR = buildSdf(true, cornerW, cornerH);
        builtFor = key;
        for (const [tex, sdf] of [
          [texL, sdfL],
          [texR, sdfR],
        ] as const) {
          if (!sdf) continue;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.LUMINANCE, sdf.w, sdf.h, 0,
            gl.LUMINANCE, gl.UNSIGNED_BYTE, sdf.data
          );
          const err = gl.getError();
          if (err) console.error('[glass] sdf upload failed, gl error', err);
        }
      }
      if (!sdfL || !sdfR) return;

      const rw = cornerW / cssW;
      const rh = cornerH / cssH;
      gl.uniform4f(u.rectL, 0, 0, rw, rh);
      gl.uniform4f(u.rectR, 1 - rw, 0, rw, rh);
      gl.uniform2f(u.centL, sdfL.cx, sdfL.cy);
      gl.uniform2f(u.centR, sdfR.cx, sdfR.cy);
      gl.uniform1f(u.sdfRange, sdfL.range / sdfL.h);

      /* Cover fit, matching object-fit: cover on the real image. */
      const canvasAspect = cssW / cssH;
      const imgAspect = imgW / imgH;
      let sx = 1;
      let sy = 1;
      if (imgAspect > canvasAspect) sx = canvasAspect / imgAspect;
      else sy = imgAspect / canvasAspect;
      gl.uniform2f(u.imgScale, sx, sy);
      gl.uniform2f(u.imgOffset, (1 - sx) * 0.5, (1 - sy) * 0.5);

      gl.uniform2f(u.resolution, W, H);
      gl.uniform1f(u.time, (performance.now() - t0) / 1000);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
      gl.uniform1i(u.backdrop, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texL);
      gl.uniform1i(u.sdfL, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texR);
      gl.uniform1i(u.sdfR, 2);

      const c = cfgRef.current;
      gl.uniform1f(u.ior, c.ior);
      gl.uniform1f(u.thickness, c.thickness);
      gl.uniform1f(u.refraction, c.refraction);
      gl.uniform1f(u.centerLens, c.centerLens);
      gl.uniform1f(u.dispersion, c.dispersion);
      gl.uniform1f(u.frost, c.frost);
      gl.uniform1f(u.bevel, c.bevel);
      gl.uniform1f(u.waviness, c.waviness);
      gl.uniform1f(u.tint, c.tint);
      gl.uniform1f(u.bodyReach, c.bodyReach);
      gl.uniform1f(u.edgeBias, c.edgeBias);
      gl.uniform1f(u.edgeEase, c.edgeEase);
      gl.uniform1f(u.magnify, c.magnify);
      gl.uniform1f(u.lift, c.lift);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      /* Only animate while there is something to animate. */
      if (c.waviness > 0.01) {
        loop = requestAnimationFrame(draw);
      } else if (loop) {
        cancelAnimationFrame(loop);
        loop = 0;
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    redrawRef.current = schedule;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const err = gl.getError();
      if (err) {
        console.error('[glass] backdrop upload failed (CORS?), gl error', err);
        statusRef.current?.('backdrop upload failed - see console');
        return;
      }
      canvas.setAttribute('data-live', 'true');
      statusRef.current?.('live - snell + thickness scatter');
      schedule();
    };
    img.onerror = () => {
      console.error('[glass] backdrop image failed to load:', src);
      statusRef.current?.('backdrop image failed to load');
    };
    img.src = src;

    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    schedule();

    return () => {
      ro.disconnect();
      redrawRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      if (loop) cancelAnimationFrame(loop);
    };
  }, [src]);

  /* Any config change repaints with the existing context and fields. */
  useEffect(() => {
    redrawRef.current?.();
  }, [config]);

  return <canvas ref={canvasRef} className="case-study__glass-canvas" aria-hidden="true" />;
}
