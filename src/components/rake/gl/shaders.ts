/* ------------------------------------------------------------------
   THE RAKE - shaders

   One full-screen quad. No loaded textures except a canvas the app
   draws itself, so this section has no image-decode path to fail on.

   NOT 3D. There is no geometry, no scene light, no camera transform.
   Every bit of apparent depth is computed per pixel: the corrugation
   is a fract() profile, the specular is a power curve on that profile,
   and the type's relief is the horizontal derivative of its own mask.
   That is why a full-screen effect costs one draw call.

   READ IT AS FIVE LAYERS, bottom to top:

     1. WALL     procedural corrugated metal, parallaxed with scroll
     2. BLADE    one hard gaussian light + a narrow soft spill
     3. CONTACT  a shadow cast by the type onto the wall
     4. TYPE     engraved glyphs, bevel-lit, holding a cooling ember
     5. AIR      bloom, vignette, edge fade to the page void, grain

   SHARPNESS IS LAYERS 3 AND 4. First pass read as blurry because the
   glyph mask fed the composite as raw antialiased alpha, so edges
   dissolved rather than cut, and because the type was lit by the same
   light as the wall with nothing separating them. The mask is now
   hard-thresholded (uMaskLow/uMaskHigh) and the type drops a contact
   shadow onto the wall behind it. Those two terms are the difference
   between soft and crisp - do not soften them to fix something else.
   ------------------------------------------------------------------ */

export const RAKE_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const RAKE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform float uProgress;
uniform float uLightX;

uniform sampler2D uText;
uniform sampler2D uAccent;

uniform vec3 uBase;
uniform vec3 uMetal;
uniform vec3 uCore;
uniform vec3 uEmber;

uniform float uSlats;
uniform float uParallax;
uniform float uRidgePower;
uniform float uRidgeLift;

uniform float uBladeWidth;
uniform float uGlowWidth;
uniform float uVerticalFalloff;
uniform float uSpecular;
uniform float uBloom;
uniform float uWallSpill;

uniform float uResidual;
uniform float uResidualRamp;
uniform float uBevel;
uniform float uMaskLow;
uniform float uMaskHigh;
uniform float uShadow;
uniform float uShadowStrength;

uniform float uEdgeFade;
uniform float uGrain;
uniform float uVignette;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

/* The glyph mask, hard-thresholded. Canvas hands over soft antialiased
   alpha; feeding that straight into a mix() is what made the type read
   as blurry. smoothstep across a narrow band keeps one pixel of AA and
   throws away the rest of the ramp. */
float glyph(vec2 uv) {
	return smoothstep(uMaskLow, uMaskHigh, texture2D(uText, uv).a);
}

void main() {
	float aspect = uResolution.x / max(uResolution.y, 1.0);
	vec2 uv = vUv;

	/* ---------- 1. THE WALL ---------- */
	float sx = uv.x + uProgress * uParallax;
	float cell = fract(sx * uSlats);
	float ridge = 1.0 - abs(cell - 0.5) * 2.0;
	ridge = pow(clamp(ridge, 0.0, 1.0), uRidgePower);

	float column = floor(sx * uSlats);
	float vary = 0.82 + 0.34 * hash(vec2(column, 3.0));

	/* ---------- 2. THE BLADE ---------- */
	float d = abs(uv.x - uLightX) * aspect;
	float blade = exp(-(d * d) / max(uBladeWidth, 1e-5));
	float glow = exp(-d / max(uGlowWidth, 1e-5));

	float vert = mix(
		1.0,
		smoothstep(1.15, 0.1, abs(uv.y - 0.5) * 2.0),
		uVerticalFalloff
	);
	blade *= vert;
	glow *= vert;

	float spec = pow(ridge, 3.0) * (blade * uSpecular + glow * 0.5) * vary;

	vec3 wall = mix(uBase, uMetal, ridge * uRidgeLift);
	wall += uCore * spec * 0.9;
	wall += uEmber * glow * uWallSpill * vary;

	/* ---------- 3. CONTACT SHADOW ----------
	   The type sits proud of the wall, so it occludes it. Sampling the
	   mask at a small offset and keeping only what the glyph does NOT
	   cover gives the sliver of wall in shadow. This is the cheapest
	   possible separation cue and it does most of the sharpening. */
	float m = glyph(uv);
	vec2 shadowOffset = vec2(uShadow, -uShadow);
	float shadowMask = clamp(glyph(uv - shadowOffset) - m, 0.0, 1.0);
	wall *= 1.0 - shadowMask * uShadowStrength;

	/* ---------- 4. THE TYPE ----------
	   Bevel is the signed horizontal derivative of the mask: positive on
	   the edge facing the light, negative on the edge facing away. One
	   term, and the glyphs read as cut into metal. */
	float accent = smoothstep(uMaskLow, uMaskHigh, texture2D(uAccent, uv).a);

	float e = 1.2 / max(uResolution.x, 1.0);
	float bevel = clamp((glyph(uv + vec2(e, 0.0)) - glyph(uv - vec2(e, 0.0))) * 2.0, -1.0, 1.0);

	/* Cooling ember: past the blade, a glyph keeps this much glow, so the
	   sentence accumulates behind the light instead of flashing one word
	   at a time - and is still fully legible when the sweep ends. */
	float passed = smoothstep(0.0, uResidualRamp, uLightX - uv.x);
	float lit = clamp(blade * 1.25 + glow * 0.5 + passed * uResidual, 0.0, 1.6);

	vec3 typeCol = mix(uEmber, uCore, clamp(blade * 1.1, 0.0, 1.0));
	typeCol = mix(typeCol, uEmber, accent * 0.85);

	vec3 ink = mix(uBase * 0.25, typeCol, clamp(lit, 0.0, 1.0));
	ink += uCore * max(bevel, 0.0) * lit * uBevel;
	ink -= uBase * max(-bevel, 0.0) * uBevel * 0.8;

	vec3 color = mix(wall, ink, m);

	/* ---------- 5. THE AIR ----------
	   Bloom sits on top so a hot highlight spills over the type too, but
	   it is kept low: this is what veiled the whole frame on the first
	   pass and cost the type its edges. */
	color += (uCore * 0.6 + uEmber * 0.4) * pow(blade, 3.0) * uBloom;

	float vig = smoothstep(1.3, 0.32, length((uv - 0.5) * vec2(aspect, 1.0)));
	color *= mix(uVignette, 1.0, vig);

	/* Both edges resolve to the page void, so the sections above and
	   below meet this one with no seam and no grey ramp. */
	float fade =
		smoothstep(0.0, uEdgeFade, uv.y) *
		smoothstep(0.0, uEdgeFade, 1.0 - uv.y);
	color = mix(uBase, color, fade);

	// Grain last, and quiet. Texture, not an effect.
	color += (hash(uv * uResolution + uTime) - 0.5) * uGrain;

	gl_FragColor = vec4(color, 1.0);
}
`;
