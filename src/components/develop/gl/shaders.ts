/* ------------------------------------------------------------------
   THE DEVELOP - point cloud shaders

   One draw call. ~35,000 points, no lights, no geometry, no textures
   fetched at runtime beyond the two portraits the sampler already read
   on the CPU.

   THE WHOLE EFFECT IS IN THE VERTEX SHADER. The fragment shader only
   shapes a soft disc and applies colour. Every grain computes its own
   position from four inputs - its target, its random vector, its seed,
   and the develop progress - so there is no simulation state, nothing
   to step, and nothing that can drift out of sync if a frame is
   dropped. Scrub the progress backwards and the print un-develops
   exactly the way it came in.

   WHY NOT GPGPU PING-PONG: a real particle simulation would buy
   collisions and inertia that nobody can see at this scale, and would
   cost two render targets plus a second material. The scatter here is
   deterministic - a function of progress, not an integration over it.
   ------------------------------------------------------------------ */

export const DEVELOP_VERTEX = /* glsl */ `
precision highp float;

attribute vec3 aTarget;
attribute vec3 aRandom;
attribute vec3 aColorBase;
attribute vec3 aColorSharp;
attribute float aSeed;

uniform float uProgress;      // 0 = suspension, 1 = developed print
uniform float uTime;
uniform float uStagger;
uniform float uScatter;
uniform float uScatterDepth;
uniform float uDriftAmount;
uniform float uDriftSpeed;

uniform vec2  uPointer;       // world-space xy, portrait is 2 units tall
uniform float uPointerOn;     // eased 0-1 presence of the cursor
uniform float uAgitRadius;
uniform float uAgitPush;
uniform float uRippleAmount;
uniform float uRippleFreq;
uniform float uRippleSpeed;
uniform float uAgitLift;
uniform float uSharpen;

uniform float uPointSize;
uniform float uPointSizeScatter;
uniform float uDpr;

varying vec3  vColor;
varying float vSettle;
varying float vSharp;

void main() {
  /* ---- DEVELOP PROGRESS, PER GRAIN ----------------------------------
     Each grain gets its own slice of the timeline, offset by its seed.
     With uStagger at 0.55 the last grain only starts settling 45% of
     the way through, so the print precipitates instead of snapping. */
  float startAt = aSeed * uStagger;
  float settle = clamp((uProgress - startAt) / max(1.0 - uStagger, 0.0001), 0.0, 1.0);

  /* Ease out cubic. Grains decelerate into place, which is what makes
     the arrival read as settling in liquid rather than as a fly-in. */
  float e = 1.0 - pow(1.0 - settle, 3.0);

  /* ---- SUSPENSION ---------------------------------------------------
     Undeveloped grains sit offset from their target along their random
     vector. Depth is scaled harder than the lateral spread: a cloud
     deeper than it is wide reads as suspension, not as an exploded
     sheet. */
  vec3 scatter = aRandom * uScatter;
  scatter.z = aRandom.z * uScatterDepth;

  /* Brownian drift, damped to nothing as the grain settles. Without
     this, a half-developed cloud is a frozen mess; with it, the
     suspension is alive and the stillness of the finished print becomes
     meaningful by contrast. Phase is per-grain so nothing pulses in
     unison. */
  float phase = aSeed * 6.2831853;
  vec3 drift = vec3(
    sin(uTime * uDriftSpeed + phase),
    cos(uTime * uDriftSpeed * 0.85 + phase * 1.7),
    sin(uTime * uDriftSpeed * 1.2 + phase * 0.6)
  ) * uDriftAmount;

  vec3 pos = aTarget + (scatter + drift) * (1.0 - e);

  /* ---- AGITATION ----------------------------------------------------
     The cursor is a hand in the developer tray. Distance is measured
     against the grain's TARGET, not its current position, so the
     disturbance stays anchored to the picture plane while suspended
     grains are still moving through it - otherwise the influence would
     smear around with the cloud and lose its shape. */
  float d = distance(aTarget.xy, uPointer);
  float infl = smoothstep(uAgitRadius, 0.0, d) * uPointerOn;

  /* Radial push, with a ripple riding it so the displacement is a wave
     travelling through the suspension rather than a static bulge. */
  vec2 away = d > 0.0001 ? (aTarget.xy - uPointer) / d : vec2(0.0, 1.0);
  float ripple = sin(d * uRippleFreq - uTime * uRippleSpeed);

  pos.xy += away * (uAgitPush + ripple * uRippleAmount) * infl;

  /* Lift toward the viewer. Perspective catches this as extra point
     size, so the touched area brightens as well as parts. */
  pos.z += uAgitLift * infl;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  /* ---- SIZE ---------------------------------------------------------
     Suspended grains draw larger - nearer the lens, out of focus.
     Perspective division keeps world-space size consistent, and the
     300.0 is the conventional Three.js reference distance scalar. */
  float sizeMul = mix(uPointSizeScatter, 1.0, e);
  gl_PointSize = uPointSize * uDpr * sizeMul * (300.0 / max(-mv.z, 0.0001));

  /* ---- COLOUR -------------------------------------------------------
     Grains inside the agitation resolve toward the sharp photograph.
     This IS the hover reveal, re-expressed as physics: it replaces the
     CSS radial mask that used to cross-fade two stacked <img>s. Squaring
     the influence tightens the resolved core so the sharp region has a
     defined edge instead of a wide gradient - the previous version of
     this section was rejected for reading soft, and a broad mix is
     exactly how that happens. */
  vSharp = infl * infl * uSharpen;
  vColor = mix(aColorBase, aColorSharp, vSharp);
  vSettle = e;
}
`;

export const DEVELOP_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uSoftness;
uniform float uExposure;
uniform float uEmberTint;
uniform vec3  uEmber;

varying vec3  vColor;
varying float vSettle;
varying float vSharp;

void main() {
  /* Round grain out of a square point sprite. Discarding the corners
     matters at this density: 35,000 overlapping squares read as a woven
     texture, 35,000 discs read as grain. */
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;

  /* Soft edge, kept tight on purpose - see uSoftness in the config. */
  float alpha = 1.0 - smoothstep(1.0 - uSoftness, 1.0, r);

  vec3 color = vColor * uExposure;

  /* Ember pushed into the brightest grains only, tying the portrait to
     the site accent and to the rake's light above it. Weighted by
     luminance so it lands on highlights rather than flooding the frame -
     a photograph with a warm key, not a graded panel. */
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, uEmber, uEmberTint * smoothstep(0.35, 1.0, lum));

  /* Resolved grains get a touch more punch, so the agitated region
     reads as sharper and not merely different. */
  color *= 1.0 + 0.18 * vSharp;

  /* Suspended grains are fainter - thinner coverage, out of focus.
     Never fully transparent, or an undeveloped print is an empty frame
     and the section looks broken before it looks intentional. */
  alpha *= mix(0.42, 1.0, vSettle);

  gl_FragColor = vec4(color, alpha);
}
`;
