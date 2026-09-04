'use client';

/**
 * LIQUID GLASS - the two bottom cover corners.
 *
 * Vanilla WebGL2. No three.js, no react-three-fiber, no shader library, and
 * no settings UI: the effect is tuned in settings.ts from the exported config,
 * and this file only wires it up.
 *
 * WHAT MAKES THE EFFECT MATCH, all of which is easy to get wrong:
 *
 *  - Pixel-unit dials are scaled by ref * k. Every tuning constant was fitted
 *    against a shape whose smaller side is 199.5px; these wedges render two to
 *    three times that, so without k the whole effect is proportionally too
 *    subtle. This is the single biggest thing to not drop.
 *  - uRefract is NEGATIVE. The bend is inward.
 *  - The rim width is (depth / 100) * reach, not reach.
 *  - The field carries a precomputed Float32 gradient. An 8-bit field
 *    differenced in the shader loses almost all of the signal.
 *  - The field rect passed to the shader is PADDED, because the artwork runs
 *    flush along two of its own viewBox borders.
 *
 * The backdrop is the cover photograph, fetched with CORS so it can be read
 * into a texture, because a shader cannot sample live page pixels.
 */

import { useEffect, useRef } from 'react';

import { WINDOW_MOTION } from '@/config/caseStudy';

import { buildGlassField, type GlassField } from './field';
import { FRAG, VERT } from './shader';
import {
  CORNER_ASPECT,
  FIELD_SCALE,
  GLASS,
  SHAPE,
  SIZE_REF,
  SOLVER,
  TAPS,
  TINT,
  TUNING,
} from './settings';

/** Matches --cs-plate-zoom's fallback in work-case-study.css. */
const PLATE_ZOOM_FALLBACK = 1.16;

/** Device pixel ratio cap. The reference renderer uses the same figure. */
const MAX_DPR = 1.5;

/** Hold the glass back until the plate has landed. */
const PREP_DELAY = Math.max(
  WINDOW_MOTION.openDuration,
  WINDOW_MOTION.plateDuration,
);
const REVEAL_DURATION = WINDOW_MOTION.contentDuration;
const REVEAL_STAGGER = WINDOW_MOTION.contentStagger;

/** Approximates cubic-bezier(0.22, 1, 0.36, 1) closely enough for a fade. */
function easeOut(t: number) {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 4);
}

function whenIdle(fn: () => void) {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 800 });
    return;
  }
  window.setTimeout(fn, 0);
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.error('[liquid-glass] compile failed:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const UNIFORMS = [
  'uBackdrop', 'uFieldL', 'uFieldR', 'uRectL', 'uRectR', 'uTexelL', 'uTexelR',
  'uRes', 'uImgScale', 'uImgOffset', 'uPlate', 'uReveal',
  'uRefract', 'uDisp', 'uFrost', 'uGain', 'uDark', 'uSpec', 'uSplay',
  'uLight', 'uChroma', 'uFall', 'uSpread', 'uTintAmt', 'uTint', 'uTaps',
] as const;

type UniformMap = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

export default function LiquidGlassCorners({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    /* Half-float field texels quantise to ~10 bits of mantissa, which after a
       heavy blur shows as stepped contours once the field is differentiated
       and amplified by gain. Float32 removes it, but LINEAR filtering of a
       float32 texture needs this extension. */
    const floatLinear = !!gl.getExtension('OES_texture_float_linear');

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      // eslint-disable-next-line no-console
      console.error('[liquid-glass] link failed:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(prog);

    const u = {} as UniformMap;
    for (const name of UNIFORMS) u[name] = gl.getUniformLocation(prog, name);

    // No attributes at all - the vertex shader builds its triangle from
    // gl_VertexID - but core profile still wants a bound VAO.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.uniform1i(u.uBackdrop, 0);
    gl.uniform1i(u.uFieldL, 1);
    gl.uniform1i(u.uFieldR, 2);

    /* ---- the constant dials ----
       ref keeps a dial's meaning across shape sizes; k is applied per draw
       because only then is the rendered size known. */
    gl.uniform1f(u.uGain, SOLVER.gain);
    gl.uniform1f(u.uChroma, SOLVER.chroma);
    gl.uniform1f(u.uSpread, SOLVER.spread);
    gl.uniform1f(u.uFall, SOLVER.fall);
    gl.uniform1f(u.uDark, SOLVER.dark);
    gl.uniform1f(u.uTintAmt, SOLVER.tint);
    gl.uniform3f(u.uTint, TINT[0], TINT[1], TINT[2]);
    gl.uniform1f(u.uSplay, GLASS.splay);
    gl.uniform1f(u.uLight, GLASS.lightAngle);
    gl.uniform1f(u.uSpec, (GLASS.lightIntensity / 100) * TUNING.specAt100);
    gl.uniform1i(u.uTaps, TAPS);

    function makeTex(unit: number, mip: boolean) {
      const tex = gl!.createTexture();
      gl!.activeTexture(gl!.TEXTURE0 + unit);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(
        gl!.TEXTURE_2D,
        gl!.TEXTURE_MIN_FILTER,
        mip ? gl!.LINEAR_MIPMAP_LINEAR : gl!.LINEAR,
      );
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      return tex;
    }

    const texBackdrop = makeTex(0, true);
    const texFieldL = makeTex(1, false);
    const texFieldR = makeTex(2, false);

    let fieldL: GlassField | null = null;
    let fieldR: GlassField | null = null;
    let ready = false;
    let disposed = false;
    let raf = 0;
    let startedAt = 0;
    let bitmap: ImageBitmap | null = null;
    let worker: Worker | null = null;

    function uploadField(unit: number, tex: WebGLTexture | null, f: GlassField) {
      gl!.activeTexture(gl!.TEXTURE0 + unit);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.pixelStorei(gl!.UNPACK_ALIGNMENT, 1);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        f.float32 ? gl!.RGBA32F : gl!.RGBA16F,
        f.width,
        f.height,
        0,
        gl!.RGBA,
        f.float32 ? gl!.FLOAT : gl!.HALF_FLOAT,
        f.data as ArrayBufferView,
      );
    }

    /* The field depends only on the path and the dials, never on the rendered
       size - the rect mapping handles size - so this runs once. It is the
       expensive stage (rasterise, exact EDT, two multi-pass blurs, Sobel), so
       it waits for idle time rather than competing with the window's opening
       animation. */
    const fieldOptions = {
      scale: FIELD_SCALE,
      // The Depth dial MULTIPLIES reach. This is 36.4 path units, not 125.5.
      depth: (GLASS.depth / 100) * SOLVER.reach * SIZE_REF,
      profile: TUNING.profile,
      smooth: SOLVER.smooth * SIZE_REF,
      soften: SOLVER.soften * SIZE_REF,
      float32: floatLinear,
    };

    function acceptFields(a: GlassField, b: GlassField) {
      if (disposed) return;
      fieldL = a;
      fieldR = b;
      uploadField(1, texFieldL, a);
      uploadField(2, texFieldR, b);
      gl!.uniform2f(u.uTexelL, 1 / a.width, 1 / a.height);
      gl!.uniform2f(u.uTexelR, 1 / b.width, 1 / b.height);
      maybeStart();
    }

    /* Fallback for engines without Workers or OffscreenCanvas: the same
       build, blocking, deferred to idle so it at least misses the open. */
    function buildFieldsOnMain() {
      if (disposed) return;
      try {
        acceptFields(
          buildGlassField({ ...fieldOptions, mirrored: false }),
          buildGlassField({ ...fieldOptions, mirrored: true }),
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[liquid-glass] field build failed:', err);
      }
    }

    /* THE FIELD BUILD IS THE ONE EXPENSIVE STAGE, AND IT BLOCKS.
       Rasterise, exact EDT, thirty-two blur passes and a Sobel over roughly
       400k texels, twice. Run on the main thread that is a long synchronous
       task landing exactly while the window is opening, which is felt as the
       open stuttering. Nothing in it touches the DOM beyond rasterising the
       path, which OffscreenCanvas does identically, so it moves to a worker
       and the opening animation keeps the main thread to itself. */
    function startFieldBuild() {
      if (disposed) return;
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
        whenIdle(buildFieldsOnMain);
        return;
      }
      try {
        worker = new Worker(new URL('./fieldWorker.ts', import.meta.url));
      } catch {
        whenIdle(buildFieldsOnMain);
        return;
      }
      const done = () => {
        worker?.terminate();
        worker = null;
      };
      worker.onmessage = (ev: MessageEvent) => {
        const d = ev.data as
          | { ok: true; a: GlassField; b: GlassField }
          | { ok: false; error: string };
        done();
        if (!d.ok) {
          // eslint-disable-next-line no-console
          console.error('[liquid-glass] field build failed:', d.error);
          whenIdle(buildFieldsOnMain);
          return;
        }
        acceptFields(d.a, d.b);
      };
      worker.onerror = () => {
        done();
        whenIdle(buildFieldsOnMain);
      };
      worker.postMessage(fieldOptions);
    }

    function readPlate(): [number, number] {
      const host = canvas!.closest('[data-section]') as HTMLElement | null;
      if (!host) return [0, PLATE_ZOOM_FALLBACK];
      const cs = host.style;
      const shiftPx = parseFloat(cs.getPropertyValue('--cs-plate-shift')) || 0;
      const zoom =
        parseFloat(cs.getPropertyValue('--cs-plate-zoom')) ||
        PLATE_ZOOM_FALLBACK;
      // Shift is authored in px; the shader wants it in uv.
      const h = canvas!.clientHeight || 1;
      return [shiftPx / h, zoom];
    }

    function draw(now: number) {
      if (disposed || !ready || !fieldL || !fieldR) return;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const cssW = canvas!.clientWidth;
      const cssH = canvas!.clientHeight;
      const cw = Math.max(1, Math.round(cssW * dpr));
      const ch = Math.max(1, Math.round(cssH * dpr));
      if (canvas!.width !== cw || canvas!.height !== ch) {
        canvas!.width = cw;
        canvas!.height = ch;
      }

      gl!.viewport(0, 0, cw, ch);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      /* Corner size, matching --cs-corner-h / --cs-corner-w in
         work-case-study.css so the shader and the CSS fallback agree. */
      const cornerH = Math.round(Math.min(470, Math.max(185, cssH * 0.42)));
      const cornerW = Math.round(cornerH * CORNER_ASPECT);
      const rw = cornerW * dpr;
      const rh = cornerH * dpr;

      /* ---- the scale factors ----
         kx and ky map path units to device pixels. Displacement magnitudes are
         scalar, so a stretched layer uses the geometric mean. */
      const kx = rw / SHAPE.vw;
      const ky = rh / SHAPE.vh;
      const k = Math.sqrt(Math.max(kx * ky, 1e-9));

      // Padded field rects, y-down device px, anchored to the bottom corners.
      const padX = (fieldL.pad / fieldL.scale) * kx;
      const padY = (fieldL.pad / fieldL.scale) * ky;
      const yTop = ch - rh;
      gl!.uniform4f(
        u.uRectL, 0 - padX, yTop - padY, rw + padX * 2, rh + padY * 2,
      );
      gl!.uniform4f(
        u.uRectR, cw - rw - padX, yTop - padY, rw + padX * 2, rh + padY * 2,
      );

      // Cover-fit of the backdrop photograph, in y-down uv.
      const iw = bitmap?.width || cw;
      const ih = bitmap?.height || ch;
      const s = Math.max(cw / iw, ch / ih);
      const dw = iw * s;
      const dh = ih * s;
      const bx = (cw - dw) / 2;
      const by = (ch - dh) / 2;
      gl!.uniform2f(u.uImgScale, cw / dw, ch / dh);
      gl!.uniform2f(u.uImgOffset, -bx / dw, -by / dh);

      const [shift, zoom] = readPlate();
      gl!.uniform2f(u.uPlate, shift, zoom);
      gl!.uniform2f(u.uRes, cw, ch);

      // The dials, in device pixels.
      gl!.uniform1f(
        u.uRefract,
        (GLASS.refraction / 100) * TUNING.refractAt100 * SIZE_REF * k,
      );
      gl!.uniform1f(
        u.uDisp,
        (GLASS.dispersion / 100) * TUNING.dispAt100 * SIZE_REF * k,
      );
      gl!.uniform1f(
        u.uFrost,
        (GLASS.frost / 100) * TUNING.frostAt100 * SIZE_REF * k,
      );

      // Entrance, staggered left then right.
      const t = now - startedAt;
      const rl = easeOut((t - PREP_DELAY) / REVEAL_DURATION);
      const rr = easeOut((t - PREP_DELAY - REVEAL_STAGGER) / REVEAL_DURATION);
      gl!.uniform2f(u.uReveal, rl, rr);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      // Self-terminating: once settled, only an external change redraws.
      if (rl < 1 || rr < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        raf = 0;
      }
    }

    function schedule() {
      if (disposed || !ready || raf) return;
      const cover = canvas!.closest('.case-study__cover-media') as
        | HTMLElement
        | null;
      // Nothing to refract once the cover has scrolled away.
      if (cover?.dataset.coverPast === 'true') return;
      raf = requestAnimationFrame(draw);
    }

    function maybeStart() {
      if (ready || disposed) return;
      if (!bitmap || !fieldL || !fieldR) return;
      ready = true;
      startedAt = performance.now();
      canvas!.dataset.live = 'true';
      schedule();
    }

    /* A shader cannot read live page pixels, so the backdrop is fetched and
       uploaded. CORS matters: a tainted image cannot be a texture source. */
    async function loadBackdrop() {
      try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        bitmap = await createImageBitmap(await res.blob());
      } catch {
        try {
          bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => createImageBitmap(img).then(resolve, reject);
            img.onerror = () => reject(new Error('image load failed'));
            img.src = src;
          });
        } catch {
          // eslint-disable-next-line no-console
          console.warn('[liquid-glass] backdrop upload failed (CORS?)');
          return;
        }
      }
      if (disposed || !bitmap) return;
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, texBackdrop);
      gl!.texImage2D(
        gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap,
      );
      // Frost reads coarser mip levels, so the chain has to exist.
      gl!.generateMipmap(gl!.TEXTURE_2D);
      maybeStart();
    }

    void loadBackdrop();
    startFieldBuild();

    const ro = new ResizeObserver(() => schedule());
    ro.observe(canvas);

    const scroller =
      (canvas.closest('.case-study__scroller') as HTMLElement | null) ?? window;
    const onScroll = () => schedule();
    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      disposed = true;
      worker?.terminate();
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      scroller.removeEventListener('scroll', onScroll);
      bitmap?.close();
      gl.deleteTexture(texBackdrop);
      gl.deleteTexture(texFieldL);
      gl.deleteTexture(texFieldR);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className="case-study__glass-canvas"
      aria-hidden="true"
    />
  );
}
