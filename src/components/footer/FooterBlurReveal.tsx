'use client';

/* ------------------------------------------------------------------
   THE FOOTER - interactive blur reveal

   Adapted from Hyperiux Vault's "Interactive Blur Reveal"
   (vault.hyperiux.com/effects/webgl-effects/interactive-blur-reveal),
   reworked for the footer's two assets:

     - The VAULT effect computes its frosted state in the shader with a
       21-tap blur of the clear image. Here the frosted state is a real
       second photograph (the blurred variant), so the shader samples
       TWO image textures and mixes them by the trail mask - no blur
       pass, which is also faster.
     - The VAULT canvas is position: fixed 100vw x 100vh - a hero.
       This one is contained in the footer section and sized from the
       section's own box, so the reveal only happens over the footer.
     - The VAULT noise texture is a remote PNG (CORS risk); the grain
       idea is dropped entirely - the photographs carry their own
       texture - so the effect has exactly two network dependencies,
       both same-origin through the site's /api/drive-image proxy.

   What survives from the original, verbatim in behaviour: the trail
   mask painted onto an offscreen canvas (line-stamped strokes with a
   soft radial head), the idle/active fade rates, the pointer lerp and
   velocity gate, the suspended RAF loop that pauses offscreen, and the
   WebGL context-loss listener.

   TWO THINGS THE FIRST ADAPTER GOT WRONG, FIXED HERE:
     - The Y-flip. WebGL's gl_FragCoord grows upward and texImage2D
       (UNPACK_FLIP_Y_WEBGL = false) lays the image's TOP row at v=0.
       Sampling straight maps screen-bottom to image-top - the photo
       hangs upside down. The original shader flipped screenUv.y for
       exactly this reason; the first pass of this file dropped the
       flip and the footer showed the photograph inverted.
     - The fit. The first pass cover-fitted, which on a 100vh footer
       crops the photograph to a sliver of its middle. The footer is
       a full screen and the whole photograph must be seen, so the
       shader contains instead: the image is scaled to fit entirely,
       and whatever band is left over is the section's black.
   ------------------------------------------------------------------ */

import React, { useCallback, useEffect, useRef } from 'react';
import { setInFooter } from '../../lib/footerVisibility';
import { getLenis } from '../../lib/scroll';
import { useFooterWordmarkReveal } from '../../hooks/useFooterWordmarkReveal';

/* The wordmark, pre-split into characters.

   Each letter needs its own element so it can carry its own animation
   delay - that is what produces the left-to-right cascade. Split at
   module scope rather than in the render: the string is a constant, so
   there is no reason to re-split it on every paint.

   Split in JSX and NOT with GSAP's SplitText, which is what this used
   to do. SplitText rewrites the DOM after mount, which means the mark
   is briefly one unsplit block, and it has to be told to wait for the
   webfont or it slices fallback metrics and leaves permanently ragged
   spacing. Characters that are authored as characters have neither
   problem, and they survive re-render. */
const WORDMARK = Array.from('Faz Digital');

const FULLSCREEN_TRIANGLE = new Float32Array([
	-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
]);

const UNIT_BLURRED = 0;
const UNIT_CLEAR = 1;
const UNIT_MASK = 2;

const DEFAULT_POINTER = 0.5;
const FRAME_MS = 16.67;
const MAX_FRAME_DELTA_MS = 64;
const POINTER_LERP = 0.001;
const STOP_VELOCITY = 0.00008;
const MASK_FADE_ACTIVE = 0.015;
const MASK_FADE_IDLE = 0.085;
/* The reveal radius, in canvas pixels. The original's 180 is a hero's
   radius; on a footer that is a portrait photograph it swallowed half
   the frame. 96 reads as a spotlight, not a floodlight. */
const MOUSE_RADIUS = 80;
const TRAIL_DURATION = 0.3;

/* Both photographs come through the site's own Drive proxy, so they
   are same-origin: no CORS header is needed for WebGL textures, and
   lh3's per-client rate limit (the bug lib/driveImage.ts exists for)
   is never hit from the browser. */
const IMAGE_BLURRED =
	'/api/drive-image?id=1dI0X8ErQVz_EfvvJl8T5ETe48pGpZBTS';
const IMAGE_CLEAR =
	'/api/drive-image?id=1gSnxaHPFuQuFjoe4YJIYWmvvSCaUnkGo';

const VERT = /* glsl */ `#version 300 es
in vec2 position;

void main() {
	gl_Position = vec4(position, 0.0, 1.0);
}
`;

/* Two photographs, one mask. The mask's alpha is the trail: 1 where
   the pointer has recently been, fading to 0. smoothstep softens the
   edge so the reveal feathers rather than cutting a hard line.

   CONTAIN, not cover: the photograph is scaled until it fits the
   canvas entirely, letterboxed onto the section's black. Pixels that
   fall outside the photograph get the background colour, not a
   stretched edge - CLAMP_TO_EDGE would smear the border pixels across
   the band. */
const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2      iResolution;
uniform sampler2D iBlurred;
uniform sampler2D iClear;
uniform sampler2D iMask;
uniform float     iImageAspect;

out vec4 fragColor;

void main() {
	vec2 screenUv = gl_FragCoord.xy / iResolution;
	/* gl_FragCoord grows upward; the image's top row is at v=0. Without
	   this flip the photograph renders upside down. */
	screenUv.y = 1.0 - screenUv.y;

	/* Contain-fit: expand the sampled window past [0,1] on the SHORT
	   side of the canvas, so the whole photograph is always visible. */
	float canvasAspect = iResolution.x / iResolution.y;
	vec2 scale = vec2(1.0);
	if (canvasAspect > iImageAspect) {
		scale.x = canvasAspect / iImageAspect;
	} else {
		scale.y = iImageAspect / canvasAspect;
	}
	/* X stays centred. Y is anchored to the BOTTOM, not centred:
	   v=1 (the image's bottom row) is pinned to the bottom of the
	   canvas, so the photograph sits flush on the end of the page and
	   the entire letterbox remainder is pushed above it. Centring
	   instead left half the remainder as a dead black strip below the
	   portrait, which read as a gap after the footer. */
	vec2 imageUv;
	imageUv.x = (screenUv.x - 0.5) * scale.x + 0.5;
	imageUv.y = 1.0 - (1.0 - screenUv.y) * scale.y;

	bool outside =
		imageUv.x < 0.0 || imageUv.x > 1.0 ||
		imageUv.y < 0.0 || imageUv.y > 1.0;

	if (outside) {
		fragColor = vec4(vec3(0.0196), 1.0); // #050505, the section's black
		return;
	}

	vec4 blurred = texture(iBlurred, imageUv);
	vec4 clear = texture(iClear, imageUv);

	float mask = texture(iMask, screenUv).a;
	float reveal = smoothstep(0.04, 0.95, mask);

	/* Edge feather: the photograph dissolves into the section's black
	over the outer 7% of each side, so the frame never ends on a
	hard edge against the page. */
	float feather = 0.07;
	float blend =
		smoothstep(0.0, feather, imageUv.x) *
		smoothstep(1.0, 1.0 - feather, imageUv.x) *
		smoothstep(0.0, feather, imageUv.y);

	vec3 photo = mix(blurred.rgb, clear.rgb, reveal);
	fragColor = vec4(mix(vec3(0.0196), photo, blend), 1.0);
}
`;

/* ---------------- small helpers, as in the original ---------------- */

function createShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('Shader allocation failed.');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) || 'Shader compile failed.';
		gl.deleteShader(shader);
		throw new Error(message);
	}
	return shader;
}

function createProgram(
	gl: WebGL2RenderingContext,
	vertSource: string,
	fragSource: string,
): WebGLProgram {
	const vert = createShader(gl, gl.VERTEX_SHADER, vertSource);
	const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSource);
	const program = gl.createProgram();
	if (!program) throw new Error('Program allocation failed.');
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	gl.deleteShader(vert);
	gl.deleteShader(frag);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const message = gl.getProgramInfoLog(program) || 'Program link failed.';
		gl.deleteProgram(program);
		throw new Error(message);
	}
	return program;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () =>
			reject(new Error(`Unable to load texture image: ${src}.`));
		image.src = src;
	});
}

function uploadTexture(
	gl: WebGL2RenderingContext,
	source: TexImageSource,
	unit: number,
): WebGLTexture {
	const texture = gl.createTexture();
	if (!texture) throw new Error('Texture allocation failed.');
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	return texture;
}

/* ---------------- the component ---------------- */

export const FooterBlurReveal: React.FC = () => {
	const rootRef = useRef<HTMLElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wordmarkRef = useRef<HTMLSpanElement>(null);

	/* FAZ DIGITAL rises as one solid block from behind its own clip
	   edge, scrubbed by scroll position. The footer section is the
	   trigger, not the wordmark - see the hook for why. */
	useFooterWordmarkReveal({ rootRef, wordmarkRef });

	/* Everything pointer-side lives in a ref: the trail is drawn every
	   frame, and state would re-render the section sixty times a second
	   for nothing. */
	const pointerRef = useRef({
		isInside: false,
		targetX: DEFAULT_POINTER,
		targetY: DEFAULT_POINTER,
		x: DEFAULT_POINTER,
		y: DEFAULT_POINTER,
		previousX: DEFAULT_POINTER,
		previousY: DEFAULT_POINTER,
		lastTime: 0,
		lastMoveTime: 0,
		hasDrawn: false,
	});

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;

		let disposed = false;
		let rafId: number | null = null;
		let onscreen = true;
		let cleanup: (() => void) | undefined;

		async function init() {
			if (!root || !canvas) return;
			const gl = canvas.getContext('webgl2', {
				alpha: false,
				antialias: false,
			});
			if (!gl) {
				console.warn('[footer] WebGL2 unavailable.');
				return;
			}

			const maskCanvas = document.createElement('canvas');
			const maskCtx = maskCanvas.getContext('2d', { alpha: true });
			if (!maskCtx) return;

			/* The narrowing above does not survive into the closures below;
			   alias it once and the whole effect type-checks. */
			const mask2d = maskCtx;

			const program = createProgram(gl, VERT, FRAG);
			const buffer = gl.createBuffer();
			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
			const positionLoc = gl.getAttribLocation(program, 'position');
			gl.enableVertexAttribArray(positionLoc);
			gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

			const resolutionLoc = gl.getUniformLocation(program, 'iResolution');
			const imageAspectLoc = gl.getUniformLocation(program, 'iImageAspect');
			const blurredLoc = gl.getUniformLocation(program, 'iBlurred');
			const clearLoc = gl.getUniformLocation(program, 'iClear');
			const maskLoc = gl.getUniformLocation(program, 'iMask');

			const [blurredImage, clearImage] = await Promise.all([
				loadImage(IMAGE_BLURRED),
				loadImage(IMAGE_CLEAR),
			]);
			if (disposed) {
				gl.deleteBuffer(buffer);
				gl.deleteProgram(program);
				return;
			}

			const blurredTex = uploadTexture(gl, blurredImage, UNIT_BLURRED);
			const clearTex = uploadTexture(gl, clearImage, UNIT_CLEAR);
			const maskTex = uploadTexture(gl, maskCanvas, UNIT_MASK);

			gl.uniform1i(blurredLoc, UNIT_BLURRED);
			gl.uniform1i(clearLoc, UNIT_CLEAR);
			gl.uniform1i(maskLoc, UNIT_MASK);
			/* THE PORTRAIT'S ASPECT, PUBLISHED TO CSS.

			   The shader contain-fits, so on a narrow viewport the
			   photograph fits by WIDTH and occupies a band at the bottom
			   whose height is exactly canvasWidth / imageAspect. The type
			   layer has to end above that band - on a phone the type runs
			   full width, so the "portrait owns the right" rule that keeps
			   them apart on desktop no longer separates anything.

			   CSS cannot know that height: it is a property of the asset.
			   Hardcoding it in the stylesheet would make the layout quietly
			   wrong the day the photograph is recropped. So the number is
			   published from the one place that actually measures it, and
			   footer.css derives the reserve from it. Same contract as the
			   gallery lattice: JS owns the number, CSS consumes it. */
			const imageAspect = blurredImage.width / blurredImage.height;
			gl.uniform1f(imageAspectLoc, imageAspect);
			root?.style.setProperty(
				'--footer-image-aspect',
				String(imageAspect)
			);

			function resize() {
				if (!root || !canvas || !gl) return;
				/* MEASURE THE CANVAS, NOT THE SECTION.

				   These were the same rectangle for as long as the canvas
				   was inset: 0 on the section, which is why measuring the
				   section worked. They are not the same on a phone any
				   more - the canvas is a panel in the right field - and
				   sizing the drawing buffer from the section would stretch
				   the render across a box it does not occupy. Measure the
				   element you are actually drawing into. */
				const rect = canvas.getBoundingClientRect();
				/* The original caps DPR at 2; the photograph is full-bleed
				   on a wide screen, so the same cap applies. */
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const w = Math.max(1, Math.floor(rect.width * dpr));
				const h = Math.max(1, Math.floor(rect.height * dpr));
				if (canvas.width === w && canvas.height === h) return;
				canvas.width = w;
				canvas.height = h;
				maskCanvas.width = w;
				maskCanvas.height = h;
				mask2d.clearRect(0, 0, w, h);
				gl.viewport(0, 0, w, h);
				gl.activeTexture(gl.TEXTURE0 + UNIT_MASK);
				gl.bindTexture(gl.TEXTURE_2D, maskTex);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					maskCanvas,
				);
			}

			function stamp(x: number, y: number, radius: number) {
				const soft = radius * 1.17;
				const gradient = mask2d.createRadialGradient(
					x,
					y,
					radius * 0.1,
					x,
					y,
					soft,
				);
				gradient.addColorStop(0, 'rgba(255,255,255,1)');
				gradient.addColorStop(0.35, 'rgba(255,255,255,0.72)');
				gradient.addColorStop(1, 'rgba(255,255,255,0)');
				mask2d.fillStyle = gradient;
				mask2d.beginPath();
				mask2d.arc(x, y, soft, 0, Math.PI * 2);
				mask2d.fill();
			}

			function render() {
				if (!gl || !canvas) return;
				resize();

				const now = performance.now();
				const pointer = pointerRef.current;
				const frameDelta = pointer.lastTime
					? Math.min(MAX_FRAME_DELTA_MS, now - pointer.lastTime)
					: FRAME_MS;
				pointer.lastTime = now;

				/* The lerp, the velocity gate and the fade rates are the
				   original's, unchanged - they are what make the reveal feel
				   earned rather than instant. */
				const smoothing = 1 - Math.pow(POINTER_LERP, frameDelta / 1000);
				pointer.previousX = pointer.x;
				pointer.previousY = pointer.y;
				pointer.x += (pointer.targetX - pointer.x) * smoothing;
				pointer.y += (pointer.targetY - pointer.y) * smoothing;
				const velocity = Math.hypot(
					pointer.x - pointer.previousX,
					pointer.y - pointer.previousY,
				);

				/* Fade the whole mask a touch each frame - faster once the
				   pointer has been idle past the trail duration. */
				const idleAge = now - pointer.lastMoveTime;
				const fade =
					idleAge > TRAIL_DURATION * 1000
						? MASK_FADE_IDLE
						: MASK_FADE_ACTIVE;
				mask2d.save();
				mask2d.globalCompositeOperation = 'destination-out';
				mask2d.fillStyle = `rgba(0,0,0,${fade})`;
				mask2d.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
				mask2d.restore();

				/* Draw the trail only while the pointer is moving - a still
				   pointer lets the reveal fade back to frost. */
				const shouldDraw =
					pointer.isInside &&
					idleAge <= TRAIL_DURATION * 1000 &&
					velocity > STOP_VELOCITY;
				if (shouldDraw) {
					const cx = pointer.x * maskCanvas.width;
					const cy = pointer.y * maskCanvas.height;
					mask2d.save();
					mask2d.globalCompositeOperation = 'source-over';
					mask2d.lineCap = 'round';
					mask2d.lineJoin = 'round';
					mask2d.strokeStyle = 'rgba(255,255,255,0.72)';
					mask2d.lineWidth = MOUSE_RADIUS * 1.05;
					if (pointer.hasDrawn) {
						mask2d.beginPath();
						mask2d.moveTo(
							pointer.previousX * maskCanvas.width,
							pointer.previousY * maskCanvas.height,
						);
						mask2d.lineTo(cx, cy);
						mask2d.stroke();
					}
					stamp(cx, cy, MOUSE_RADIUS);
					mask2d.restore();
					pointer.hasDrawn = true;
				} else if (!pointer.isInside) {
					pointer.hasDrawn = false;
				}

				gl.activeTexture(gl.TEXTURE0 + UNIT_MASK);
				gl.bindTexture(gl.TEXTURE_2D, maskTex);
				gl.texSubImage2D(
					gl.TEXTURE_2D,
					0,
					0,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					maskCanvas,
				);

				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}

			/* The suspended loop: frames are only requested while the
			   footer is on screen and the tab is visible. */
			const observer = new IntersectionObserver(
				(entries) => {
					onscreen = entries[0]?.isIntersecting ?? true;
				},
				{ rootMargin: '256px' },
			);
			observer.observe(root);

			const tick = () => {
				rafId = null;
				if (disposed) return;
				if (onscreen && !document.hidden) render();
				rafId = requestAnimationFrame(tick);
			};
			rafId = requestAnimationFrame(tick);

			const onLost = (event: Event) => {
				event.preventDefault();
				if (rafId != null) cancelAnimationFrame(rafId);
				rafId = null;
			};
			canvas.addEventListener('webglcontextlost', onLost, false);

			return () => {
				observer.disconnect();
				canvas.removeEventListener('webglcontextlost', onLost, false);
				if (rafId != null) cancelAnimationFrame(rafId);
				gl.deleteTexture(blurredTex);
				gl.deleteTexture(clearTex);
				gl.deleteTexture(maskTex);
				gl.deleteBuffer(buffer);
				gl.deleteProgram(program);
			};
		}

		init()
			.then((teardown) => {
				if (disposed) {
					teardown?.();
					return;
				}
				cleanup = teardown;
			})
			.catch((error) =>
				console.warn('[footer] blur reveal could not initialize.', error),
			);

		return () => {
			disposed = true;
			cleanup?.();
		};
	}, []);

	/* THE HEADER STEPS ASIDE.

	   The footer carries its own FAZ DIGITAL wordmark, so the fixed
	   header's EFAZ floating over it would be two wordmarks in one
	   frame. This observer is separate from the RAF one above on
	   purpose: that one uses a 256px rootMargin so the loop is already
	   warm before the footer arrives, which is far too eager for a
	   visual decision - the header would vanish while the footer was
	   still offscreen. This one waits until the footer genuinely owns
	   the view.

	   The header's own 700ms transition does the fading; nothing here
	   animates. Reported false on unmount so a client navigation away
	   from the landing page cannot leave the header stranded. */
	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				setInFooter((entry?.intersectionRatio ?? 0) >= 0.35);
			},
			{ threshold: [0, 0.35, 0.6, 1] },
		);
		observer.observe(root);

		return () => {
			observer.disconnect();
			setInFooter(false);
		};
	}, []);

	/* Pointer tracking LISTENS on the section but MEASURES against the
	   canvas, and the split is deliberate.

	   Listening on the section is the original reason: the canvas is
	   behind everything, so any element laid on top would otherwise
	   swallow the trail.

	   Measuring against the canvas is new, and necessary for the same
	   reason resize() changed. The mask texture covers the CANVAS, so a
	   pointer position only means something once it is normalised to
	   that box. While the canvas was inset: 0 the two boxes were
	   identical and the distinction did not exist; now that the phone
	   layout puts the photograph in a panel, normalising against the
	   section would smear the reveal across a region the picture does
	   not occupy. Outside the panel the values simply leave [0,1] and
	   the stamp lands off-texture - correct, because there is nothing
	   there to reveal. */
	const track = useCallback((event: React.PointerEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const pointer = pointerRef.current;
		pointer.isInside = true;
		pointer.targetX = (event.clientX - rect.left) / rect.width;
		pointer.targetY = (event.clientY - rect.top) / rect.height;
		pointer.lastMoveTime = performance.now();
	}, []);

	const release = useCallback(() => {
		const pointer = pointerRef.current;
		pointer.isInside = false;
		pointer.hasDrawn = false;
	}, []);

	return (
		<footer
			ref={rootRef}
			className="footer"
			aria-label="Site footer"
			onContextMenu={(event) => event.preventDefault()}
			onPointerEnter={track}
			onPointerMove={track}
			onPointerLeave={release}
		>
			<canvas ref={canvasRef} className="footer__canvas" aria-hidden="true" />

			{/* THE TYPE. Confined to the left field; the portrait owns the
			    right and nothing overlaps the face. Four tiers, dimmest to
			    brightest: top row, nav columns, wordmark, baseline row -
			    the brightness hierarchy is in styles/footer.css and it is
			    what keeps the wordmark unrivalled.

			    aria-hidden is NOT set here: this is the real site footer
			    and its links are the only ones on the page. The layer is
			    pointer-events: none so the reveal trail survives beneath
			    it; the anchors opt back in. */}
			<div className="footer__content">
				<div className="footer__row footer__row--top">
					<span>Turning ideas into systems</span>
					<span>Chattogram, Bangladesh</span>
				</div>

								{/* BACK TO TOP. Sits in the empty left field between the top
				    row and the nav - the one place in the footer with nothing
				    to say, so the button owns it. Icon-first: the arrow IS the
				    message, no label to read. Two stacked arrows roll through
				    the mask on hover, the gesture borrowed from the header
				    pill. Entrance is tied to the wordmark's data-wordmark
				    attribute (set by useFooterWordmarkReveal), so the button
				    materialises as part of the same moment the mark rises -
				    see footer.css. The scroll is handed to Lenis when it is
				    running; native smooth is the fallback. */}
				<div className="footer__actions">
					<button
						type="button"
						className="footer__totop"
						aria-label="Back to top"
						title="Back to top"
						onClick={() => {
							const lenis = getLenis();
							if (lenis) {
								lenis.scrollTo(0, { duration: 1.6, force: true });
							} else {
								window.scrollTo({ top: 0, behavior: 'smooth' });
							}
						}}
					>
						<span className="footer__totop-track" aria-hidden="true"><span className="footer__totop-roll">
							<span className="footer__totop-arrow">&#8593;</span>
							<span className="footer__totop-arrow">&#8593;</span>
						</span></span>
					</button>

					{/* THE ONE ASK. Sat on the blob's right so the empty left field
					    becomes a single action cluster instead of two loose objects -
					    and so the ask lands at eye level, level with the picture,
					    rather than being filed away above the nav columns.

					    Not a pill. Pills are what every site's CTA is. This is a
					    notched plate - corners cut top-left and bottom-right, a 1px
					    outline, and the spec-list's dotted leader running from the
					    label to a circular arrow node. It reads like a row in a
					    system, which is what the top row promises we build.

					    Hover wipes pearl across the plate from the left and flips
					    the type to eerie a beat later, so the fill leads and the
					    words follow it - see footer.css. */}
					<a
						className="footer__cta"
						href="https://cal.com/hello-miftahul/intro-call"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Book a 15 minute intro call on Cal.com"
					>
						<span className="footer__cta-plate" aria-hidden="true" />
						<span className="footer__cta-inner">
							<span className="footer__cta-dot" aria-hidden="true" />
							<span className="footer__cta-track" aria-hidden="true"><span className="footer__cta-roll">
								<span className="footer__cta-label">Book an intro call</span>
								<span className="footer__cta-label">Book an intro call</span>
							</span></span>
							<span className="footer__cta-leader" aria-hidden="true" />
							<span className="footer__cta-meta" aria-hidden="true">15 min</span>
							<span className="footer__cta-node" aria-hidden="true">
								<span className="footer__cta-node-track"><span className="footer__cta-node-roll">
									<span className="footer__cta-arrow">&#8599;</span>
									<span className="footer__cta-arrow">&#8599;</span>
								</span></span>
							</span>
						</span>
					</a>

				</div>
			<div className="footer__lower">
					<nav className="footer__nav" aria-label="Footer">
						<ul>
							<li>
								<a className="footer__link" href="#projects">
									Work
								</a>
							</li>
							<li>
								<a className="footer__link" href="#vault">
									Vault
								</a>
							</li>
							<li>
								<a className="footer__link" href="#contact">
									Contact
								</a>
							</li>
						</ul>
						<ul>
							<li>
								<a
									className="footer__link"
									href="https://x.com/Miftahul_Islam9"
									target="_blank"
									rel="noreferrer"
								>
									X
								</a>
							</li>
							<li>
								<a
									className="footer__link"
									href="https://github.com/Miftahul-Islam-Efaz"
									target="_blank"
									rel="noreferrer"
								>
									GitHub
								</a>
							</li>
							<li>
								<a
									className="footer__link"
									href="https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/"
									target="_blank"
									rel="noreferrer"
								>
									LinkedIn
								</a>
							</li>
						</ul>
					</nav>

					{/* Gradient-clipped in CSS: the name dissolves into the same
					    falloff the face dissolves into. It is a <p>, not an
					    <h2> - the page heading outline does not need a brand
					    stamp in it. */}
					{/* The <p> is the CLIP BOX. Every character rises from
						    behind its bottom edge, one after the next, left to
						    right - the cascade in the reference clip. One clip box
						    serves all of them: they share a single line box, so
						    the parent's overflow: hidden already hides every
						    letter below the baseline and no per-letter mask is
						    needed.

						    --i is the character's index. CSS turns it into that
						    letter's delay, so the stagger is declarative: no
						    timeline, nothing to keep in sync. */}
					<p className="footer__wordmark">
						<span ref={wordmarkRef} className="footer__wordmark-inner">
							{WORDMARK.map((char, i) => (
								<span
									key={`${char}-${i}`}
									className="footer__wordmark-char"
									style={{ '--i': i } as React.CSSProperties}
								>
									{/* A real space would collapse between two
									    inline-blocks and close up "FAZ DIGITAL" into
									    one word - the same collapse that produced
									    "FAZDIGITAL" once already. */}
									{char === ' ' ? '\u00A0' : char}
								</span>
							))}
						</span>
					</p>

					<div className="footer__row footer__row--base">
						<a className="footer__link" href="mailto:hello@miftahulislamefaz.xyz">
							hello@miftahulislamefaz.xyz
						</a>
						<span>&copy; 2026</span>
					</div>
				</div>
			</div>

			{/* Above the canvas AND above the type, at overlay - identical
			    grain across photograph and letterforms, so they read as one
			    exposure rather than vector pasted onto a grainy plate. */}
			<div className="footer__grain" aria-hidden="true" />
		</footer>
	);
};

export default FooterBlurReveal;
