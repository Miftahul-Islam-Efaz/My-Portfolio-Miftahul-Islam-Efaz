'use client';

/*
  GLASS LENS - the WebGL build of the Figma Glass effect on the cover corners.

  WHY THIS EXISTS ALONGSIDE GlassRefraction.tsx

  The SVG filter version got the architecture right in the end - a real vector
  displacement field derived from the shape - but it has a hard ceiling. An SVG
  filter can only build a height field by BLURRING a silhouette. From that you
  can infer distance-from-edge and fake a normal, but you cannot:

    - run an actual refract() against a real surface normal
    - scale dispersion by a true edge factor, so colour stays edge-only
    - multi-tap sample the backdrop for a real frost

  Those are steps 2 and 3 of the model every physically-based implementation
  uses - SDF -> normal from its gradient -> Snell refraction -> displace - and
  they are exactly the realism gap. So this file does them per pixel.

  THE ONE CONSTRAINT THAT SHAPES EVERYTHING HERE

  WebGL cannot read the live DOM backdrop; there is no equivalent of
  backdrop-filter's SourceGraphic. That is why libraries doing this to arbitrary
  DOM reach for html2canvas and pay a screenshot per frame.

  None of that is needed here, because of a fact specific to this cover: the
  only thing behind these corners is ONE <Image> plus a known CSS scrim. It is a
  static texture. The shader samples that image directly and reproduces the
  scrim analytically - exact rather than approximate, and free per frame.

  This is why the WebGL route is clean here and would be a hack almost anywhere
  else on the page.

  HOW THE BACKDROP IS ALIGNED

  The image is object-fit: cover in a full-bleed box AND carries the parallax
  transform, so its painted position moves on scroll. Rather than re-deriving
  that transform, we read the image element's own getBoundingClientRect - which
  already includes it - and pass it in as a rect; the cover crop is then
  reconstructed in the shader from the natural dimensions. Parallax, resize and
  the opening flight are therefore all handled by the same three numbers, and
  nothing in here has to know they exist.

  WHY THE SCRIM IS REPLICATED IN THE SHADER

  .case-study__cover-scrim paints over the photograph but UNDER these corners
  (they are z-index -1 inside .case-study__cover-text, which stacks above
  .case-study__cover-media). So the backdrop the old filter refracted was the
  scrimmed image. Sampling the raw texture would make the corners visibly
  lighter than their surroundings. If that CSS gradient is edited, the stops
  below must move with it - the one genuine duplication in this file.
*/

import { useEffect, useRef } from 'react';
import '@/styles/glass-lens.css';

/*
  The corner outlines, in the same normalised 0-1 space as the clipPaths in
  CaseStudyCover.tsx, and deliberately the SAME NUMBERS. Duplicated rather than
  imported because these feed Path2D on a raster canvas while those feed
  clip-path; if the curve is re-exported, both must change together.
*/
const LEFT_PATH =
	'M0.1521,0.16 C0.1014,0.1233 0.0352,0.0467 0,0 L0,1 L1,1 C0.9845,0.655 0.8737,0.5542 0.8028,0.45 C0.7329,0.3633 0.5711,0.2407 0.4493,0.23 C0.307,0.2175 0.1964,0.192 0.1521,0.16 Z';
const RIGHT_PATH =
	'M0.8479,0.16 C0.8986,0.1233 0.9648,0.0467 1,0 L1,1 L0,1 C0.0155,0.655 0.1263,0.5542 0.1972,0.45 C0.2671,0.3633 0.4289,0.2407 0.5507,0.23 C0.693,0.2175 0.8036,0.192 0.8479,0.16 Z';

/*
  THE FIGMA PANEL, MAPPED TO PHYSICS. Each of these is a real term in the model
  rather than a fudge factor, which is the whole point of moving to a shader:

    Depth 80       -> BEZEL_FRACTION. How far in from the edge the surface is
                      still tilted. The single biggest control over how much of
                      the face bends; the flat plateau inside it refracts
                      nothing, which is what keeps the centre readable.
    Refraction 100 -> IOR 1.5 (ordinary glass) at full REFRACTION_SCALE.
    Dispersion 100 -> DISPERSION. Per-channel offset, multiplied by the edge
                      factor so colour appears ONLY where the bevel curves.
    Frost 0        -> no blur taps at all. A clear magnifying lens.
    Light -45 / 0% -> LIGHT_INTENSITY 0. No specular, no fresnel rim, because
                      the Figma layer has none. Raising the dial switches the
                      Blinn-Phong term below on.

  SPLAY 2 is the smoothstep band in the shader: it is the SPREAD of the tilt,
  independent of its magnitude. A low splay means the transition from plateau to
  rim happens over a short distance - a tight, clean fringe - which is what the
  earlier builds kept getting wrong by turning dispersion up instead.
*/
const BEZEL_FRACTION = 0.8;
const IOR = 1.5;
const REFRACTION_SCALE = 1.0;
const DISPERSION = 1.0;
const LIGHT_INTENSITY = 0.0;
const LIGHT_ANGLE_DEG = -45;

/** The 2 percent charcoal body tone from the Figma fill, unchanged. */
const BODY_TINT = [42 / 255, 46 / 255, 48 / 255] as const;
const BODY_TINT_ALPHA = 0.02;

/** Scrim colour, transcribed from .case-study__cover-scrim (rgba(5,5,5,...)). */
const SCRIM_RGB = [5 / 255, 5 / 255, 5 / 255] as const;

const VERTEX_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
	vUv = aPos * 0.5 + 0.5;
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/*
  The fragment shader. Four steps, in order:

    1. read the signed distance field
    2. reconstruct the surface normal from its gradient
    3. refract a view ray through that normal by the index of refraction
    4. sample the backdrop where the bent ray lands, per colour channel

  Note the SDF is a TEXTURE, not an analytic function. Every published version
  of this uses an analytic rounded-rect or squircle, which cannot describe this
  shape - the outline is a hand-authored bezier. So the field is built once on
  the CPU by exact euclidean distance transform (buildSdf) and uploaded. Same
  maths downstream, arbitrary silhouette upstream.
*/
const FRAGMENT_SRC = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uSdf;
uniform sampler2D uScene;

uniform vec2 uRes;         // canvas size, device px
uniform float uSdfRange;   // px spanned by the SDF's encoded 0-1 range
uniform vec4 uImgRect;     // photograph's painted box, canvas-local px
uniform vec2 uImgNatural;  // intrinsic pixel size of the photograph
uniform vec4 uSectionRect; // cover section box, canvas-local px (for the scrim)

uniform float uBezel;      // px
uniform float uIor;
uniform float uRefraction;
uniform float uDispersion;
uniform float uLight;
uniform vec2 uLightDir;

/** Decode the signed distance. Negative is inside the shape. */
float sdfAt(vec2 uv) {
	return (texture2D(uSdf, uv).r * 2.0 - 1.0) * uSdfRange;
}

/**
 * Canvas-local pixel -> photograph UV, reproducing object-fit: cover.
 * uImgRect already carries the parallax transform, so this only undoes the
 * cover crop: the image fills the box on its tighter axis and overflows on the
 * other, so the overflowing axis is remapped about the centre.
 */
vec2 sceneUv(vec2 px) {
	vec2 rel = (px - uImgRect.xy) / uImgRect.zw;
	float boxAspect = uImgRect.z / uImgRect.w;
	float imgAspect = uImgNatural.x / uImgNatural.y;
	vec2 s = boxAspect > imgAspect
		? vec2(1.0, imgAspect / boxAspect)
		: vec2(boxAspect / imgAspect, 1.0);
	return (rel - 0.5) / s + 0.5;
}

/** The cover scrim, evaluated analytically. Stops mirror the CSS gradient. */
float scrimAlpha(vec2 px) {
	// Distance up from the bottom of the section, 0-1 (the CSS gradient is "to top").
	float t = 1.0 - clamp((px.y - uSectionRect.y) / uSectionRect.w, 0.0, 1.0);
	if (t < 0.26) return mix(0.72, 0.46, t / 0.26);
	if (t < 0.58) return mix(0.46, 0.1, (t - 0.26) / 0.32);
	return mix(0.1, 0.4, (t - 0.58) / 0.42);
}

/** The backdrop as it actually appears: photograph under the scrim. */
vec3 backdrop(vec2 px) {
	vec3 photo = texture2D(uScene, sceneUv(px)).rgb;
	return mix(photo, vec3(${SCRIM_RGB[0]}, ${SCRIM_RGB[1]}, ${SCRIM_RGB[2]}), scrimAlpha(px));
}

void main() {
	vec2 px = vUv * uRes;
	float d = sdfAt(vUv);

	// One pixel of feather across the outline. A CSS clip-path would hard-edge
	// this box; doing it here keeps the bezier antialiased.
	float inside = smoothstep(1.0, -1.0, d);
	if (inside <= 0.001) discard;

	// --- 2. surface normal, from the gradient of the field ------------------
	// Central differences. Because the field is a TRUE distance, this gradient is
	// a unit vector along the outward normal of the curve - which is what makes
	// the bend follow the bezier instead of an assumed axis. This is the step the
	// SVG builds could only ever approximate.
	vec2 e = 1.0 / uRes;
	float gx = sdfAt(vUv + vec2(e.x, 0.0)) - sdfAt(vUv - vec2(e.x, 0.0));
	float gy = sdfAt(vUv + vec2(0.0, e.y)) - sdfAt(vUv - vec2(0.0, e.y));
	vec2 grad = normalize(vec2(gx, gy) + vec2(1e-6));

	// 1 at the rim, 0 on the flat plateau. The plateau is the readable centre.
	float bevel = 1.0 - smoothstep(-uBezel, 0.0, d);

	// Tilt the normal outward inside the bevel band, keep it facing the viewer in
	// the middle.
	vec3 n = normalize(vec3(grad * bevel, 1.0 - bevel * 0.5));

	// --- 3. Snell refraction ------------------------------------------------
	vec3 viewDir = vec3(0.0, 0.0, 1.0);
	vec3 refracted = refract(-viewDir, n, 1.0 / uIor);

	// Where the bent ray lands, scaled by the bezel width because that is the
	// physical thickness the ray travels through.
	vec2 offset = refracted.xy * uBezel * uRefraction;
	vec2 base = px + offset;

	// --- 4. per-channel sampling, dispersion weighted by the edge factor -----
	// Red bends least, blue most. Multiplying by bevel is what confines colour to
	// the rim: on the plateau bevel is 0, so all three channels agree exactly.
	float spread = uDispersion * uBezel * 0.05 * bevel;
	vec3 col = vec3(
		backdrop(base - grad * spread).r,
		backdrop(base).g,
		backdrop(base + grad * spread).b
	);

	// The 2 percent body tone.
	col = mix(col, vec3(${BODY_TINT[0]}, ${BODY_TINT[1]}, ${BODY_TINT[2]}), ${BODY_TINT_ALPHA});

	// Specular. Off at Light 0%, present so raising the dial is a one-line change.
	if (uLight > 0.0) {
		vec3 lightDir = normalize(vec3(uLightDir, 0.6));
		vec3 halfVec = normalize(viewDir + lightDir);
		float ndoth = max(dot(n, halfVec), 0.0);
		col += vec3(pow(ndoth, 64.0) * uLight * bevel);
	}

	gl_FragColor = vec4(col, inside);
}
`;

/**
 * Exact euclidean distance transform, Felzenszwalb & Huttenlocher: the 1D
 * lower-envelope transform, run along rows then columns.
 *
 * Exact rather than the usual chamfer approximation, and that matters here for
 * a specific reason - the shader takes the GRADIENT of this field, so any
 * approximation error shows up directly as a wobble in the surface normal.
 */
function edt1d(f: Float64Array, n: number): Float64Array {
	const d = new Float64Array(n);
	const v = new Int32Array(n);
	const z = new Float64Array(n + 1);
	let k = 0;
	v[0] = 0;
	z[0] = -Infinity;
	z[1] = Infinity;

	for (let q = 1; q < n; q++) {
		let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
		while (s <= z[k]) {
			k--;
			s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
		}
		k++;
		v[k] = q;
		z[k] = s;
		z[k + 1] = Infinity;
	}

	k = 0;
	for (let q = 0; q < n; q++) {
		while (z[k + 1] < q) k++;
		const dist = q - v[k];
		d[q] = dist * dist + f[v[k]];
	}
	return d;
}

function edt2d(grid: Float64Array, w: number, h: number): Float64Array {
	const out = new Float64Array(w * h);
	const row = new Float64Array(w);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) row[x] = grid[y * w + x];
		const r = edt1d(row, w);
		for (let x = 0; x < w; x++) out[y * w + x] = r[x];
	}
	const col = new Float64Array(h);
	for (let x = 0; x < w; x++) {
		for (let y = 0; y < h; y++) col[y] = out[y * w + x];
		const c = edt1d(col, h);
		for (let y = 0; y < h; y++) out[y * w + x] = c[y];
	}
	return out;
}

/**
 * Rasterises a normalised path and returns a signed distance field encoded to
 * bytes, plus the pixel range that 0-1 spans.
 *
 * A byte per pixel loses precision, but the field is smooth and the range is
 * only a little wider than the bevel, so the gradient stays clean; a float
 * texture would need an extension for no visible gain.
 */
function buildSdf(pathD: string, w: number, h: number) {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return null;

	// Path2D has no scale method, so the CONTEXT is scaled instead and the
	// normalised path filled through it. Same numbers as the clipPaths, no
	// pixel coordinates anywhere.
	ctx.save();
	ctx.scale(w, h);
	ctx.fillStyle = '#ffffff';
	ctx.fill(new Path2D(pathD));
	ctx.restore();

	const { data } = ctx.getImageData(0, 0, w, h);
	const n = w * h;
	const insideGrid = new Float64Array(n);
	const outsideGrid = new Float64Array(n);

	for (let i = 0; i < n; i++) {
		// Alpha above half counts as inside; the feather is the shader's job.
		const solid = data[i * 4 + 3] > 127;
		insideGrid[i] = solid ? 1e12 : 0;
		outsideGrid[i] = solid ? 0 : 1e12;
	}

	const distToOutside = edt2d(insideGrid, w, h);
	const distToInside = edt2d(outsideGrid, w, h);

	const range = Math.max(8, Math.min(w, h));
	const bytes = new Uint8Array(n * 4);
	for (let i = 0; i < n; i++) {
		// Positive outside, negative inside.
		const signed = Math.sqrt(distToInside[i]) - Math.sqrt(distToOutside[i]);
		const encoded = Math.max(
			0,
			Math.min(255, Math.round((signed / range) * 127.5 + 127.5))
		);
		bytes[i * 4] = encoded;
		bytes[i * 4 + 1] = encoded;
		bytes[i * 4 + 2] = encoded;
		bytes[i * 4 + 3] = 255;
	}

	return { bytes, range };
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		// Surfaced rather than swallowed: a silent shader failure looks identical
		// to "the effect just does not work", which has cost hours already.
		console.error('[GlassLens] shader compile failed', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

type LensSide = 'left' | 'right';

/**
 * One corner. Owns its canvas, context, SDF and redraw scheduling.
 *
 * Renders on demand - scroll, resize, image load - not on a permanent rAF loop,
 * because nothing here animates by itself: the only thing that moves is the
 * parallax offset of the photograph behind it.
 *
 * data-live is set only once a context, shaders and program have all succeeded.
 * The stylesheet keys the handover off that attribute, so if any of this fails
 * the original frosted CSS corners keep painting rather than the corners simply
 * disappearing.
 */
function Lens({ side, imageSelector }: { side: LensSide; imageSelector: string }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: false,
			antialias: false,
		});
		if (!gl) return;

		const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
		if (!vs || !fs) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('[GlassLens] link failed', gl.getProgramInfoLog(program));
			return;
		}
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
			gl.STATIC_DRAW
		);
		const aPos = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		const u = {
			sdf: gl.getUniformLocation(program, 'uSdf'),
			scene: gl.getUniformLocation(program, 'uScene'),
			res: gl.getUniformLocation(program, 'uRes'),
			sdfRange: gl.getUniformLocation(program, 'uSdfRange'),
			imgRect: gl.getUniformLocation(program, 'uImgRect'),
			imgNatural: gl.getUniformLocation(program, 'uImgNatural'),
			sectionRect: gl.getUniformLocation(program, 'uSectionRect'),
			bezel: gl.getUniformLocation(program, 'uBezel'),
			ior: gl.getUniformLocation(program, 'uIor'),
			refraction: gl.getUniformLocation(program, 'uRefraction'),
			dispersion: gl.getUniformLocation(program, 'uDispersion'),
			light: gl.getUniformLocation(program, 'uLight'),
			lightDir: gl.getUniformLocation(program, 'uLightDir'),
		};

		const sceneTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, sceneTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		const sdfTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, sdfTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		let sdfRange = 1;
		let sdfKey = '';
		let imageReady = false;
		let natural = { w: 1, h: 1 };

		const img = document.querySelector<HTMLImageElement>(imageSelector);

		const uploadImage = () => {
			if (!img || !img.complete || img.naturalWidth === 0) return;
			natural = { w: img.naturalWidth, h: img.naturalHeight };
			try {
				gl.bindTexture(gl.TEXTURE_2D, sceneTex);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
				imageReady = true;
			} catch {
				// A cross-origin image without CORS headers taints the context. The
				// cover art comes from Drive via driveImage(), so this is a real
				// possibility, and the honest outcome is to stay dark and let the CSS
				// fallback show rather than paint something wrong.
				console.warn('[GlassLens] cover image is not readable by WebGL (CORS)');
				imageReady = false;
				canvas.dataset.live = 'false';
			}
		};

		const render = () => {
			const rect = canvas.getBoundingClientRect();
			if (rect.width < 2 || rect.height < 2) return;

			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.round(rect.width * dpr);
			const h = Math.round(rect.height * dpr);

			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}

			// The SDF is resolution-dependent, so rebuild only when the pixel size
			// actually changes - it is the one expensive thing in here.
			const key = `${w}x${h}`;
			if (key !== sdfKey) {
				const built = buildSdf(side === 'left' ? LEFT_PATH : RIGHT_PATH, w, h);
				if (built) {
					sdfRange = built.range;
					gl.bindTexture(gl.TEXTURE_2D, sdfTex);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGBA,
						w,
						h,
						0,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						built.bytes
					);
					sdfKey = key;
				}
			}

			if (!imageReady) uploadImage();
			if (!imageReady || !img) return;

			const imgRect = img.getBoundingClientRect();
			const section = canvas.closest('.case-study__cover');
			const secRect = section ? section.getBoundingClientRect() : rect;

			gl.viewport(0, 0, w, h);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, sdfTex);
			gl.uniform1i(u.sdf, 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, sceneTex);
			gl.uniform1i(u.scene, 1);

			gl.uniform2f(u.res, w, h);
			gl.uniform1f(u.sdfRange, sdfRange);

			// Everything is expressed in the canvas's own device-pixel space, so
			// viewport coordinates are converted once, here, and the shader never
			// has to know about page scroll.
			gl.uniform4f(
				u.imgRect,
				(imgRect.left - rect.left) * dpr,
				(imgRect.top - rect.top) * dpr,
				imgRect.width * dpr,
				imgRect.height * dpr
			);
			gl.uniform2f(u.imgNatural, natural.w, natural.h);
			gl.uniform4f(
				u.sectionRect,
				(secRect.left - rect.left) * dpr,
				(secRect.top - rect.top) * dpr,
				secRect.width * dpr,
				secRect.height * dpr
			);

			gl.uniform1f(u.bezel, Math.min(w, h) * BEZEL_FRACTION);
			gl.uniform1f(u.ior, IOR);
			gl.uniform1f(u.refraction, REFRACTION_SCALE);
			gl.uniform1f(u.dispersion, DISPERSION);
			gl.uniform1f(u.light, LIGHT_INTENSITY);
			const rad = (LIGHT_ANGLE_DEG * Math.PI) / 180;
			gl.uniform2f(u.lightDir, Math.cos(rad), Math.sin(rad));

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			canvas.dataset.live = 'true';
		};

		let queued = false;
		const schedule = () => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				render();
			});
		};

		uploadImage();
		schedule();

		if (img && !img.complete) img.addEventListener('load', schedule);
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);

		const observer = new ResizeObserver(schedule);
		observer.observe(canvas);

		// The opening flight moves the plate for its whole duration, so keep
		// redrawing until it has settled. Cheaper than a permanent rAF loop, and it
		// stops the corners lagging a frame behind the animation.
		const settle = window.setInterval(schedule, 60);
		const stopSettle = window.setTimeout(() => window.clearInterval(settle), 2200);

		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			if (img) img.removeEventListener('load', schedule);
			window.clearInterval(settle);
			window.clearTimeout(stopSettle);
			canvas.dataset.live = 'false';
			gl.deleteTexture(sceneTex);
			gl.deleteTexture(sdfTex);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
		};
	}, [side, imageSelector]);

	return (
		<canvas
			ref={canvasRef}
			className={`case-study__cover-lens case-study__cover-lens--${side}`}
			data-live="false"
			aria-hidden="true"
		/>
	);
}

/**
 * Both corners.
 *
 * Rendered as real elements inside .case-study__cover-text, because the existing
 * corners are ::before/::after pseudo-elements and a pseudo-element cannot
 * contain a canvas. The stylesheet gives these the same box and stacking, and
 * stands the old backdrop-filter down once data-live is true.
 */
export default function GlassLens() {
	return (
		<>
			<Lens side="left" imageSelector=".case-study__cover-image" />
			<Lens side="right" imageSelector=".case-study__cover-image" />
		</>
	);
}
