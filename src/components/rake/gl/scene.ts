import * as THREE from 'three';

import {
	RAKE_THEME,
	resolveRakeTuning,
	type RakeTuning,
} from '../../../config/rakeLight';
import { RAKE_ACCENT_WORD, RAKE_HANDOFF, statementLinesFor } from '../rakeContent';
import { RAKE_FRAGMENT, RAKE_VERTEX } from './shaders';

/* ------------------------------------------------------------------
   THE RAKE - scene

   One quad, one shader, two app-drawn canvas masks. There is no image
   fetch anywhere in this file, on purpose: the work helix lost an
   afternoon to a texture that fetched fine and failed to decode into
   GL. This section has no such surface to fail on.

   NOT 3D. One PlaneGeometry filling clip space; the camera never
   transforms anything. All depth is computed in the fragment shader.

   THE TYPE IS A MASK, NOT DOM. The statement is drawn into an offscreen
   canvas as white-on-transparent and handed to the shader, which lights
   it. That is the only way to get a true bevel and bloom out of the
   glyph edges. The readable, selectable, screen-reader copy lives in
   RakeSection.tsx as DOM, so nothing is lost.

   MASK RESOLUTION MUST MATCH THE DRAWING BUFFER. Both use the same dpr.
   Drawing the mask at a different scale than the renderer is a direct
   route back to soft type - the shader thresholds the mask assuming
   roughly one pixel of antialiasing, not three.

   ------------------------------------------------------------------
   FORM FACTOR IS RESOLVED PER RESIZE, NOT AT CONSTRUCTION.

   Every tuning number now arrives from resolveRakeTuning(innerWidth)
   and is re-applied in resize(), so one scene instance survives a
   desktop <-> portrait crossing (devtools, rotation, split view)
   without being torn down and rebuilt. The uniforms are the single
   source of truth for the look; this file never reads a config
   constant directly except the theme colours, which do not vary.

   That is why `current` exists: setProgress needs lightFrom/lightTo
   from the SAME tuning the uniforms were last written from.
   ------------------------------------------------------------------ */

export type RakeScene = {
	/** Scroll progress, 0..1, straight from ScrollTrigger. */
	setProgress: (progress: number) => void;
	/** Re-measure, re-resolve tuning, redraw the type masks, resize the
	 *  drawing buffer. Safe to call across a breakpoint change. */
	resize: () => void;
	/** Draw one frame. `seconds` only drives the grain. */
	render: (seconds: number) => void;
	dispose: () => void;
};

type TextTarget = {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
};

/** `letterSpacing` on a 2D context is not in every TS DOM lib yet but is
 *  supported in the browsers this site targets. Narrowed once here
 *  instead of cast at every call site. */
type TrackedContext = CanvasRenderingContext2D & { letterSpacing?: string };

const makeTarget = (): TextTarget | null => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	return ctx ? { canvas, ctx } : null;
};

const setTracking = (ctx: CanvasRenderingContext2D, em: number, px: number) => {
	const tracked = ctx as TrackedContext;
	if ('letterSpacing' in tracked) tracked.letterSpacing = `${em * px}px`;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export function createRakeScene(canvas: HTMLCanvasElement): RakeScene | null {
	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: false,
			alpha: false,
			powerPreference: 'high-performance',
		});
	} catch {
		// No WebGL. The caller leaves the DOM fallback visible.
		return null;
	}

	const text = makeTarget();
	const accent = makeTarget();
	if (!text || !accent) {
		renderer.dispose();
		return null;
	}

	/* The tuning in force. Replaced wholesale by resize(); read by
	   setProgress and drawMasks. Seeded here so a setProgress call that
	   somehow lands before the first resize still has real numbers. */
	let current: RakeTuning = resolveRakeTuning(window.innerWidth);

	const base = new THREE.Color(RAKE_THEME.base);
	renderer.setClearColor(base, 1);

	const makeTexture = (source: HTMLCanvasElement) => {
		const texture = new THREE.CanvasTexture(source);
		// Masks are sampled about 1:1 and never minified, so mipmaps buy
		// nothing and NPOT mipmapping is a known failure path.
		texture.generateMipmaps = false;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		return texture;
	};

	const textTexture = makeTexture(text.canvas);
	const accentTexture = makeTexture(accent.canvas);

	const uniforms: Record<string, THREE.IUniform> = {
		uResolution: { value: new THREE.Vector2(1, 1) },
		uTime: { value: 0 },
		uProgress: { value: 0 },
		uLightX: { value: current.scroll.lightFrom },

		uText: { value: textTexture },
		uAccent: { value: accentTexture },

		uBase: { value: base },
		uMetal: { value: new THREE.Color(RAKE_THEME.metal) },
		uCore: { value: new THREE.Color(RAKE_THEME.core) },
		uEmber: { value: new THREE.Color(RAKE_THEME.ember) },

		/* Seeded at zero-ish and written properly by applyTuning() below,
		   which runs before the first frame. Declared here because
		   ShaderMaterial fixes its uniform set at construction. */
		uSlats: { value: 1 },
		uParallax: { value: 0 },
		uRidgePower: { value: 1 },
		uRidgeLift: { value: 0 },

		uBladeWidth: { value: 0.001 },
		uGlowWidth: { value: 0.1 },
		uVerticalFalloff: { value: 0 },
		uSpecular: { value: 1 },
		uBloom: { value: 0 },
		uWallSpill: { value: 0 },
		uVignette: { value: 1 },

		uResidual: { value: 0 },
		uResidualRamp: { value: 0.1 },
		uBevel: { value: 0 },
		uMaskLow: { value: 0.34 },
		uMaskHigh: { value: 0.62 },
		uShadow: { value: 0 },
		uShadowStrength: { value: 0 },

		uEdgeFade: { value: 0.055 },
		uGrain: { value: 0 },
	};

	const geometry = new THREE.PlaneGeometry(2, 2);
	const material = new THREE.ShaderMaterial({
		vertexShader: RAKE_VERTEX,
		fragmentShader: RAKE_FRAGMENT,
		uniforms,
		depthTest: false,
		depthWrite: false,
	});

	const scene = new THREE.Scene();
	const camera = new THREE.Camera();
	scene.add(new THREE.Mesh(geometry, material));

	/** Push a resolved tuning into the uniforms. Every look number the
	 *  shader reads passes through here, so there is exactly one place
	 *  where config becomes GL state. */
	const applyTuning = (tuning: RakeTuning) => {
		uniforms.uSlats.value = tuning.wall.slats;
		uniforms.uParallax.value = tuning.wall.parallax;
		uniforms.uRidgePower.value = tuning.wall.ridgePower;
		uniforms.uRidgeLift.value = tuning.wall.ridgeLift;

		uniforms.uBladeWidth.value = tuning.light.bladeWidth;
		uniforms.uGlowWidth.value = tuning.light.glowWidth;
		uniforms.uVerticalFalloff.value = tuning.light.verticalFalloff;
		uniforms.uSpecular.value = tuning.light.specular;
		uniforms.uBloom.value = tuning.light.bloom;
		uniforms.uWallSpill.value = tuning.light.wallSpill;
		uniforms.uVignette.value = tuning.light.vignette;

		uniforms.uResidual.value = tuning.type.residual;
		uniforms.uResidualRamp.value = tuning.type.residualRamp;
		uniforms.uBevel.value = tuning.type.bevel;
		uniforms.uMaskLow.value = tuning.type.maskLow;
		uniforms.uMaskHigh.value = tuning.type.maskHigh;
		uniforms.uShadow.value = tuning.type.shadow;
		uniforms.uShadowStrength.value = tuning.type.shadowStrength;

		uniforms.uEdgeFade.value = tuning.scroll.edgeFade;
		uniforms.uGrain.value = tuning.grain;
	};

	/* ------------------------------------------------------------------
	   Type masks

	   White fill only - the shader reads nothing but the alpha channel.
	   Two masks: everything, and the accent word alone.
	   ------------------------------------------------------------------ */

	/** Width of one hand-split line as it will actually be DRAWN - word
	 *  widths plus the inter-word spaces - so the fit check below measures
	 *  the same thing the draw loop produces. */
	const measureLine = (
		ctx: CanvasRenderingContext2D,
		line: string,
		space: number
	) => {
		const words = line.split(' ');
		let total = 0;
		for (const word of words) total += ctx.measureText(word).width;
		return total + space * Math.max(words.length - 1, 0);
	};

	/* SHRINK-TO-FIT - a safety net, not the layout.

	   fillText does not wrap, so a line wider than the frame is simply
	   drawn off the edge and silently clipped. The hand-split lines in
	   rakeContent.ts are sized to fit at both form factors, so this loop
	   normally makes zero passes; it exists so that editing the copy, a
	   fallback font with wider metrics, or an unusually narrow viewport
	   (320px, or a split-screen pane) costs type SIZE rather than
	   silently losing the end of the sentence.

	   Capped iterations because it is a multiplicative approach to a
	   target, and a font whose metrics refuse to cooperate must not spin
	   this loop inside a resize handler. */
	const fitStatementSize = (
		ctx: CanvasRenderingContext2D,
		lines: readonly string[],
		startSize: number,
		available: number,
		fontFor: (size: number) => string
	) => {
		let size = startSize;

		for (let pass = 0; pass < 12; pass += 1) {
			ctx.font = fontFor(size);
			const space = ctx.measureText(' ').width;
			let widest = 0;
			for (const line of lines) {
				widest = Math.max(widest, measureLine(ctx, line, space));
			}

			if (widest <= available || size <= 12) break;
			// Aim straight at the target, but always make progress.
			size *= Math.min(0.97, available / widest);
		}

		return size;
	};

	const drawMasks = (
		width: number,
		height: number,
		dpr: number,
		tuning: RakeTuning
	) => {
		for (const target of [text, accent]) {
			target.canvas.width = Math.max(1, Math.round(width * dpr));
			target.canvas.height = Math.max(1, Math.round(height * dpr));
			target.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			target.ctx.clearRect(0, 0, width, height);
			target.ctx.fillStyle = '#ffffff';
			target.ctx.textBaseline = 'alphabetic';
			target.ctx.textAlign = 'left';
		}

		const ink = text.ctx;
		const pad = width * tuning.type.pad;
		const available = Math.max(width - pad * 2, 1);

		/* The cue's scale factor. Measured against a reference width from
		   the tuning, so portrait compares itself to a portrait width
		   instead of bottoming out on the desktop floor. */
		const scale = clamp(
			width / tuning.type.smallScaleRef,
			tuning.type.smallScaleMin,
			tuning.type.smallScaleMax
		);

		// ---- the statement, word by word, so the accent word can be
		// captured into the second mask at exactly the same position.
		const lines = statementLinesFor(tuning.isMobile);
		const statementFont = (size: number) =>
			`700 ${size}px "Cabinet Grotesk", "Satoshi", sans-serif`;

		const requestedSize = clamp(
			width * tuning.type.statementScale,
			tuning.type.statementMin,
			tuning.type.statementMax
		);
		const statementSize = fitStatementSize(
			ink,
			lines,
			requestedSize,
			available,
			statementFont
		);

		const font = statementFont(statementSize);
		const leading = statementSize * tuning.type.statementLeading;

		ink.font = font;
		accent.ctx.font = font;

		const space = ink.measureText(' ').width;
		const firstBaseline =
			height * tuning.layout.statementY -
			((lines.length - 1) * leading) / 2;

		lines.forEach((line, lineIndex) => {
			const y = firstBaseline + lineIndex * leading;
			let x = pad;

			for (const word of line.split(' ')) {
				ink.fillText(word, x, y);
				if (word === RAKE_ACCENT_WORD) accent.ctx.fillText(word, x, y);
				x += ink.measureText(word).width + space;
			}
		});

		// ---- the hand-off cue, far right, so it is the last thing the
		// blade touches before leaving frame. The arrow alone takes accent.
		const small = tuning.type.smallSize * scale;
		const monoFont = `500 ${small}px "IBM Plex Mono", ui-monospace, monospace`;
		const signoffY = height * tuning.layout.signoffY;

		ink.font = monoFont;
		setTracking(ink, tuning.type.smallTracking, small);
		ink.textAlign = 'right';
		ink.fillText(`${RAKE_HANDOFF}  \u2193`, width - pad, signoffY);

		accent.ctx.font = monoFont;
		setTracking(accent.ctx, tuning.type.smallTracking, small);
		accent.ctx.textAlign = 'right';
		accent.ctx.fillText('\u2193', width - pad, signoffY);

		ink.textAlign = 'left';
		accent.ctx.textAlign = 'left';
		setTracking(ink, 0, small);
		setTracking(accent.ctx, 0, small);

		textTexture.needsUpdate = true;
		accentTexture.needsUpdate = true;
	};

	const resolution = uniforms.uResolution.value as THREE.Vector2;

	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		const width = Math.max(1, rect.width);
		const height = Math.max(1, rect.height);

		/* Re-resolve, because this may be the frame where the viewport
		   crossed the breakpoint. Keyed off innerWidth rather than the
		   canvas rect: the breakpoint is a statement about the DEVICE (it
		   is where Lenis stops being installed), not about this element. */
		const tuning = resolveRakeTuning(window.innerWidth);
		current = tuning;
		applyTuning(tuning);

		const dpr = Math.min(window.devicePixelRatio || 1, tuning.perf.dprCap);

		renderer.setPixelRatio(dpr);
		renderer.setSize(width, height, false);
		// Shader thresholds and offsets are in drawing-buffer pixels, so
		// uResolution must be the buffer size, not the CSS size.
		resolution.set(width * dpr, height * dpr);
		drawMasks(width, height, dpr, tuning);

		// The light's travel is tuning-dependent, so re-derive its position
		// from the progress already in flight rather than leaving a stale x.
		setProgress(uniforms.uProgress.value as number);
	};

	const setProgress = (progress: number) => {
		const clamped = clamp(progress, 0, 1);
		uniforms.uProgress.value = clamped;
		uniforms.uLightX.value =
			current.scroll.lightFrom +
			(current.scroll.lightTo - current.scroll.lightFrom) * clamped;
	};

	const render = (seconds: number) => {
		uniforms.uTime.value = seconds;
		renderer.render(scene, camera);
	};

	const dispose = () => {
		geometry.dispose();
		material.dispose();
		textTexture.dispose();
		accentTexture.dispose();
		renderer.dispose();
	};

	resize();

	return { setProgress, resize, render, dispose };
}
