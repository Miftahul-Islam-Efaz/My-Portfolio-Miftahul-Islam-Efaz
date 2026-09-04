/**
 * THE GLASS SHADER.
 *
 * A port of the reference implementation's FS_GLASS, adapted in exactly three
 * ways and otherwise left alone:
 *
 *   1. TWO fields, not one. The cover has a glass wedge in each bottom corner,
 *      the right one being the same artwork mirrored.
 *   2. The backdrop is the cover photograph with the DOM parallax undone,
 *      rather than a full-canvas background blit.
 *   3. The canvas is a TRANSPARENT overlay, so the composite writes coverage
 *      to alpha instead of mixing against an opaque base. The browser does the
 *      source-over that the reference did in the shader.
 *
 * Everything else - the precomputed gradient, the tanh slope limit, the
 * thin-feature gating, the single loop with two accumulators, the chroma
 * restore, the slope-gated specular - is the reference maths.
 *
 * Never put a backtick in these strings, including in GLSL comments.
 *
 * Do not rename tapColour to sample. `sample` is a reserved word in GLSL ES
 * 3.00 and using it fails compilation with a bare syntax error.
 */

/* Full-screen triangle from gl_VertexID - no attributes, no buffers. */
export const VERT = `#version 300 es
void main() {
  int id = gl_VertexID;
  vec2 p = vec2(float((id << 1) & 2), float(id & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uBackdrop;
uniform sampler2D uFieldL;
uniform sampler2D uFieldR;

// Padded field rects, in y-DOWN device pixels: x, y, w, h.
uniform vec4  uRectL;
uniform vec4  uRectR;
uniform vec2  uTexelL;
uniform vec2  uTexelR;

uniform vec2  uRes;        // drawing buffer size, px
uniform vec2  uImgScale;   // cover-fit of the backdrop photograph
uniform vec2  uImgOffset;
uniform vec2  uPlate;      // x: parallax shift in uv, down positive. y: zoom
uniform vec2  uReveal;     // entrance strength, per corner. 1 = settled

uniform float uRefract;    // NEGATIVE - the bend is inward
uniform float uDisp;
uniform float uFrost;
uniform float uGain;
uniform float uDark;
uniform float uSpec;
uniform float uSplay;
uniform float uLight;      // degrees
uniform float uChroma;
uniform float uFall;
uniform float uSpread;
uniform float uTintAmt;
uniform vec3  uTint;
uniform int   uTaps;

out vec4 frag;

const int   NS_MAX = 40;
const float TAU  = 6.28318530718;
const vec3  LUMA = vec3(0.2126, 0.7152, 0.0722);

/* ------------------------------------------------------------------ *
 * THE BACKDROP.
 *
 * Sampled from the cover photograph with the DOM parallax UNDONE. The image
 * element carries translate3d(0, --cs-plate-shift, 0) scale(--cs-plate-zoom),
 * so without inverting that transform this glass would refract pixels from
 * somewhere the browser is not drawing them.
 *
 * The mask is deliberately NOT transformed: the shapes stay pinned to the
 * frame and the picture moves underneath them.
 *
 * px is y-DOWN throughout this shader, matching the field rasteriser, so
 * nothing needs flipping anywhere.
 * ------------------------------------------------------------------ */
vec2 bgUv(vec2 px) {
  vec2 uv = px / uRes;
  uv = (uv - vec2(0.0, uPlate.x) - 0.5) / uPlate.y + 0.5;
  return clamp(uv * uImgScale + uImgOffset, 0.002, 0.998);
}

/* Pre-filtered fetch. Frost needs an AREA average, not point samples; reading
   from a coarser mip means each tap already carries the average of the gap to
   its neighbours, so a sparse disc reads as a smooth blur. Without it, point
   samples leave visible ghosts however they are arranged - and per-pixel
   dither is not the fix, it only trades banding for grain. */
vec3 sbgL(vec2 px, float lod) {
  return textureLod(uBackdrop, bgUv(px), lod).rgb;
}

/* RGB response for a normalised wavelength t (0 = red, 1 = blue). Narrow
   curves keep the three channels reading genuinely different offsets, which is
   what produces saturated hue separation rather than a grey average. */
vec3 spectralWeight(float t) {
  vec3 c = vec3(0.0, 0.5, 1.0);
  vec3 x = (vec3(t) - c) / uSpread;
  return exp(-x * x) + 1e-4;
}

/* Evaluate the glass for one corner. Returns rgb in .xyz and coverage in .w.
   Coverage 0 means this fragment is outside the shape. */
vec4 glassAt(sampler2D field, vec4 rect, vec2 texel, vec2 px) {
  // rect is the PADDED field rect, so a path edge flush with its own viewBox
  // border is still interior to the texture and has a real gradient.
  vec2 g = (px - rect.xy) / rect.zw;
  if (any(lessThan(g, vec2(0.0))) || any(greaterThan(g, vec2(1.0)))) {
    return vec4(0.0);
  }

  vec4 hg4 = texture(field, g);
  float cov = hg4.a;
  if (cov <= 0.002) return vec4(0.0);

  /* The gradient arrives PRECOMPUTED in RG. It used to be differenced from the
     height here, but height sits near 1.0 while neighbouring texels differ by
     ~1e-3, so that subtraction kept only a few bits and banded into
     iso-distance contours. Storing the derivative keeps full relative
     precision and costs 8 fewer texture fetches per fragment. */
  float gx = hg4.r;
  float gy = hg4.g;

  /* Soft-limit the slope. Where a feature is THINNER than the rim width - a
     thin tip, the inside of a tight corner - the whole ramp is squeezed into a
     couple of texels, the raw gradient explodes, and the displacement jumps
     many pixels between neighbours. That is what reads as a hard sharp wedge.
     tanh caps it smoothly, so no new hard edge appears where the limit
     engages; broad rims sit far below the limit and are untouched. */
  float gm = length(vec2(gx, gy)) * uGain;
  if (gm > 1e-5) {
    float lim = 1.35;
    float sc = lim * tanh(gm / lim) / gm;
    gx *= sc;
    gy *= sc;
  }

  vec3 n = normalize(vec3(-gx * uGain, -gy * uGain, 1.0));

  /* Slope magnitude localises every rim feature: ~0 across the flat interior,
     peaking in the narrow boundary band. Smoothstep rather than a raw clamp,
     or the slope discontinuity reads as a hard line where rim meets
     interior. */
  float slope = clamp(length(vec2(gx, gy)) * uGain, 0.0, 1.0);
  slope = slope * slope * (3.0 - 2.0 * slope);

  vec2 d = n.xy * uRefract;

  /* The chromatic split direction is the SURFACE GRADIENT; its width is gated
     by the RIM PROFILE, not by slope - slope peaks in a narrow ridge and would
     confine the dispersion to a thin line. */
  vec2 dir = normalize(vec2(gx, gy) + vec2(1e-6));
  float edge = clamp(1.0 - hg4.b, 0.0, 1.0);
  edge = pow(edge, uFall);

  /* Local thickness. A thin tip and a broad rim BOTH have height ~0 at the
     very edge, so per-pixel height cannot tell them apart - the neighbourhood
     average can. Four wide taps: a low average means the feature is thinner
     than the rim width, so the dispersion has to shrink with it. Without this
     the red-shifted tap at a tip travels the full band width into bright
     content and comes back as a hard orange streak. */
  float sp = 40.0;
  float nbr =
      texture(field, g + vec2(-texel.x * sp, 0.0)).b
    + texture(field, g + vec2( texel.x * sp, 0.0)).b
    + texture(field, g + vec2(0.0, -texel.y * sp)).b
    + texture(field, g + vec2(0.0,  texel.y * sp)).b;
  float thick = smoothstep(0.06, 0.42, nbr * 0.25);

  /* The hard wedge at a tip is REFRACTION, not dispersion, so the same
     thin-feature factor gates the displacement too. thick is ~1 across the
     broad rim, so the calibrated body of the match is unaffected. */
  d *= mix(0.45, 1.0, thick);
  float w = uDisp * edge * thick;

  float taps = float(uTaps);

  /* Mip level matched to the spacing between frost taps. The glass carries a
     baseline blur even at Frost 0, because physically the backdrop is gathered
     over a refracted cone, never a single ray. */
  float fr = uFrost + 2.2;
  float flod = log2(max(1.0, fr * 2.5 / sqrt(taps)));

  /* ONE loop, TWO accumulators.

     This is the part worth being precise about: the frost ring and the
     spectral weight share a loop index, but they accumulate into SEPARATE
     sums. num is spectrally weighted and carries the dispersion; blur is
     unweighted and carries the frost. Collapsing them into a single sum is
     what would tint every frost tap and paint rainbow rings across the
     interior. Keeping them separate is what matters, not running two loops. */
  vec3  num  = vec3(0.0);
  vec3  den  = vec3(0.0);
  vec3  blur = vec3(0.0);
  float bden = 0.0;

  for (int i = 0; i < NS_MAX; i++) {
    if (i >= uTaps) break;
    float t = (float(i) + 0.5) / taps;
    // s in [-1, 1]: red bends least, blue bends most
    float s = t * 2.0 - 1.0;
    /* Golden angle: consecutive taps never line up, so the disc fills evenly
       instead of clustering into the spokes a fixed turn count produces. */
    float ga = float(i) * 2.39996323;
    vec2  o = vec2(cos(ga), sin(ga)) * fr * sqrt(t);
    vec3  wt = spectralWeight(t);
    vec3  tapColour = sbgL(px + d + o + dir * (w * s), flod);
    num  += wt * tapColour;
    blur += sbgL(px + d + o, flod);
    bden += 1.0;
    den  += wt;
  }

  vec3 disp = num / den;
  blur /= max(bden, 1.0);
  float fringe = clamp(edge * 1.35, 0.0, 1.0);
  vec3 col = mix(blur, disp, fringe);

  /* Integrating a spectrum is an AVERAGING operation, so it inherently pulls
     the result toward grey. The reference band is vividly saturated, so chroma
     is restored explicitly: keep the integrated luminance, scale only the
     colour difference from it. Weighted by edge, so the interior is left
     alone. */
  float lum = dot(col, LUMA);
  float boost = mix(1.0, uChroma, edge);
  col = clamp(vec3(lum) + (col - vec3(lum)) * boost, 0.0, 1.0);

  // Steep glass compresses the backdrop and loses light.
  col *= (1.0 - uDark * slope);

  /* Fill #2A2E30 at 2.5 percent. This tints toward a DARK grey, not white -
     mixing toward white instead reads as haze sitting on top of the glass. */
  col = mix(col, uTint, uTintAmt);

  /* Projected light. Splay sets how widely it spreads, so it maps to the
     specular lobe width. Gated by slope, because a flat face has no slope to
     catch a highlight on. */
  if (uSpec > 0.001) {
    float la = radians(uLight);
    vec3 L = normalize(vec3(cos(la), sin(la), 0.75));
    float shine = 96.0 / (1.0 + uSplay * uSplay * 4.0);
    col += pow(max(dot(n, L), 0.0), shine) * uSpec * slope;
  }

  return vec4(col, cov);
}

void main() {
  // y-down device pixels, matching the field rasteriser.
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);

  vec4 L = glassAt(uFieldL, uRectL, uTexelL, px);
  vec4 R = glassAt(uFieldR, uRectR, uTexelR, px);

  // The two corners never overlap, so whichever has coverage wins.
  float useR = step(L.w, R.w) * step(0.002, R.w);
  vec4  G = mix(L, R, useR);
  float cov = G.w * mix(uReveal.x, uReveal.y, useR);

  if (cov <= 0.002) {
    frag = vec4(0.0);
    return;
  }

  /* Straight (non-premultiplied) alpha - the context is created with
     premultipliedAlpha: false, and the browser composites this canvas over the
     photograph beneath it. */
  frag = vec4(G.rgb, cov);
}
`;
