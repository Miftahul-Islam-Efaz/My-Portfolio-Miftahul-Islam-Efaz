'use client';

/**
 * SHADER-LENS MATERIAL - the supplied liquid-glass fragment shader, drawn on
 * this project's authored corner shape in both bottom corners of the cover.
 *
 * THE SHADER IS THE REFERENCE, UNCHANGED. Every constant and every term is
 * verbatim. Two things differ, both forced:
 *
 * 1. SHAPE. The original mask is an analytic superellipse centred on the mouse
 *    (|x*aspect|^6 + |y|^6) and every threshold multiplies it by ~10000, so the
 *    field is only ever used NORMALISED - 0 at the centre, 1 at the outline.
 *    Here a signed distance field rasterised from FIGMA_PATH is divided by the
 *    shape's own maximum interior depth and raised to the same exponent, which
 *    reproduces roundedBox * 10000 exactly. No constant was retuned.
 *
 * 2. BACKDROP. The cover photograph is parallaxed by the DOM:
 *      transform: translate3d(0, --cs-plate-shift, 0) scale(--cs-plate-zoom)
 *    so backdrop() inverts that transform before sampling, or the glass
 *    refracts an image that is not where the browser drew it. The mask is NOT
 *    transformed: the shapes stay pinned to the frame, the picture moves.
 *
 * COST CONTROL (this runs during a window-opening animation, so it matters):
 *  - Nothing at all happens until the open flight has finished. No GL context,
 *    no decode, no rasterisation. See PREP_DELAY.
 *  - The distance field is a fixed 256-row raster, built ONCE, cached at module
 *    scope, right corner mirrored from the left. Resizing rebinds uniforms only.
 *  - The image is decoded off the main thread via createImageBitmap.
 *  - The canvas backing store is capped at 1x. The kernel is 81 taps per
 *    covered fragment; at 2x that is four times the fragments for blur nobody
 *    can see, since the output is a blur.
 *  - Redraws on load, resize, scroll, and each frame of the entrance - then
 *    stops. No idle loop: with a still photo and a fixed shape the frames
 *    in between are identical.
 *
 * ENTRANCE: borrowed from WINDOW_MOTION so it rides the same ladder as every
 * other block in the window - the easing string is parsed and solved, not
 * approximated, so it follows the config if the config changes.
 *
 * Never put a backtick in the shader strings, including in GLSL comments.
 */

import { useEffect, useRef } from 'react';
import { WINDOW_MOTION } from '@/config/caseStudy';

const FIGMA_PATH =
  'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z';
const PATH_W = 355;
const PATH_H = 199.5;
const CORNER_ASPECT = PATH_W / PATH_H;

/** Distance-field raster. The field is resolution-independent by construction,
 *  so this governs outline accuracy only - 256 rows is well under a screen
 *  pixel of error on a corner that is at most 470 tall, and a quarter of the
 *  build cost of 512. */
const SDF_H = 256;
const SDF_W = Math.round(SDF_H * CORNER_ASPECT);

/** Matches the stylesheet's own fallback for --cs-plate-zoom. */
const PLATE_ZOOM_FALLBACK = 1.16;

/** Hold ALL setup until the window wipe and the cover's flight are done.
 *  Everything here is optional decoration; none of it may compete with the
 *  one animation the user is actually looking at. */
const PREP_DELAY = Math.max(
  WINDOW_MOTION.openDuration,
  WINDOW_MOTION.plateDuration
);

const REVEAL_DURATION = WINDOW_MOTION.contentDuration;
const REVEAL_STAGGER = WINDOW_MOTION.contentStagger;
const REVEAL_RISE_PX = WINDOW_MOTION.contentRise;

/** Solves WINDOW_MOTION.openEase rather than approximating it: the four
 *  control points are parsed out of the cubic-bezier declaration and inverted
 *  by Newton iteration. Hardcoding an easeOutQuint would look the same today
 *  and drift silently the day the token is edited. */
function makeEase(declaration: string): (t: number) => number {
  const nums = declaration.match(/-?\d*\.?\d+/g);
  if (!nums || nums.length < 4) return (t) => t;
  const [x1, y1, x2, y2] = nums.slice(0, 4).map(Number);
  const at = (a: number, b: number, t: number) => {
    const i = 1 - t;
    return 3 * i * i * t * a + 3 * i * t * t * b + t * t * t;
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 20; i++) {
      const v = at(x1, x2, t);
      if (Math.abs(v - x) < 1e-4) break;
      if (v > x) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return at(y1, y2, t);
  };
}
const easeOpen = makeEase(WINDOW_MOTION.openEase);

interface Field {
  data: Uint8Array;
  w: number;
  h: number;
  /** Decode scale, in raster pixels. */
  range: number;
  /** Deepest interior point, in rect-height units. */
  maxDepth: number;
  /** Centroid of filled pixels, rect fractions, y up. Feeds the lighting; the
   *  bounding-box centre is useless here, it falls outside this blob. */
  cx: number;
  cy: number;
}

/* Depends on nothing but the path, so it outlives mounts and route changes. */
let cachedLeft: Field | null = null;
let cachedRight: Field | null = null;

/* Felzenszwalb & Huttenlocher exact euclidean distance transform. */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
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
  f.set(d.subarray(0, n));
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  /* Scratch allocated once for the whole transform rather than per scanline -
     the previous version allocated three typed arrays per row, 1300 times. */
  const line = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) line[y] = grid[y * w + x];
    edt1d(line, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = line[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) line[x] = grid[y * w + x];
    edt1d(line, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = line[x];
  }
}

function buildSdf(): Field | null {
  const mw = SDF_W;
  const mh = SDF_H;
  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.scale(mw / PATH_W, mh / PATH_H);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(FIGMA_PATH));

  const px = ctx.getImageData(0, 0, mw, mh).data;
  const n = mw * mh;
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
      const y = (i / mw) | 0;
      sumX += i - y * mw;
      sumY += y;
      count++;
    }
  }

  edt2d(inside, mw, mh);
  edt2d(outside, mw, mh);

  const range = Math.max(8, Math.min(mw, mh) * 0.5);
  const out = new Uint8Array(n);
  let maxSigned = 0;
  for (let i = 0; i < n; i++) {
    const signed = Math.sqrt(outside[i]) - Math.sqrt(inside[i]); // positive inside
    if (signed > maxSigned) maxSigned = signed;
    out[i] = Math.max(0, Math.min(255, Math.round((signed / range) * 127.5 + 127.5)));
  }

  /* Raster is y-down, the texture is uploaded flipped, so flip the centroid. */
  return {
    data: out,
    w: mw,
    h: mh,
    range,
    maxDepth: maxSigned / mh,
    cx: count ? sumX / count / mw : 0.5,
    cy: count ? 1 - sumY / count / mh : 0.5,
  };
}

/** Right corner is the left one flipped in x - a row reversal, not a second
 *  pair of distance transforms. */
function mirrorField(f: Field): Field {
  const out = new Uint8Array(f.data.length);
  for (let y = 0; y < f.h; y++) {
    const row = y * f.w;
    for (let x = 0; x < f.w; x++) out[row + x] = f.data[row + (f.w - 1 - x)];
  }
  return { ...f, data: out, cx: 1 - f.cx };
}

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
uniform vec2      u_plate;    // x: parallax shift in uv, down positive. y: zoom
uniform sampler2D u_sdfL;
uniform sampler2D u_sdfR;
uniform vec4      u_rectL;    // x, y, w, h in uv, y up
uniform vec4      u_rectR;
uniform vec2      u_centreL;
uniform vec2      u_centreR;
uniform vec2      u_reveal;   // entrance strength per corner. 1 = reference
uniform float     u_sdfRange;
uniform float     u_depth;
uniform float     u_alpha;    // 1 = transparent outside the shapes

varying vec2 vUv;

const float NUM_ZERO = 0.0;
const float NUM_ONE = 1.0;
const float NUM_HALF = 0.5;
const float NUM_TWO = 2.0;
const float POWER_EXPONENT = 6.0;
const float MASK_MULTIPLIER_1 = 10000.0;
const float MASK_MULTIPLIER_2 = 9500.0;
const float MASK_MULTIPLIER_3 = 11000.0;
const float LENS_MULTIPLIER = 5000.0;
const float MASK_STRENGTH_1 = 8.0;
const float MASK_STRENGTH_2 = 16.0;
const float MASK_STRENGTH_3 = 2.0;
const float MASK_THRESHOLD_1 = 0.95;
const float MASK_THRESHOLD_2 = 0.9;
const float MASK_THRESHOLD_3 = 1.5;
const float SAMPLE_RANGE = 4.0;
const float SAMPLE_OFFSET = 0.5;
const float GRADIENT_RANGE = 0.2;
const float GRADIENT_OFFSET = 0.1;
const float GRADIENT_EXTREME = -1000.0;
const float LIGHTING_INTENSITY = 0.3;

/* Cover-fit sample of the photograph, with the DOM parallax undone. */
vec3 backdrop(vec2 uv) {
  vec2 q = (uv - NUM_HALF + vec2(NUM_ZERO, u_plate.x)) / u_plate.y + NUM_HALF;
  return texture2D(u_backdrop, q * u_imgScale + u_imgOffset).rgb;
}

/* Signed distance to one corner, negative inside, in rect-height units.
   Returns a large positive outside the rect - clamping smears the field. */
float shapeSdf(sampler2D sdf, vec4 rect, vec2 uv) {
  vec2 local = (uv - rect.xy) / rect.zw;
  if (local.x < NUM_ZERO || local.x > NUM_ONE || local.y < NUM_ZERO || local.y > NUM_ONE) {
    return 10.0;
  }
  return -((texture2D(sdf, local).r * NUM_TWO - NUM_ONE) * u_sdfRange);
}

void main() {
  vec2 uv = vUv;

  float dL = shapeSdf(u_sdfL, u_rectL, uv);
  float dR = shapeSdf(u_sdfR, u_rectR, uv);
  float useR = step(dR, dL);
  vec2 centre = mix(u_centreL, u_centreR, useR);
  vec2 m2 = uv - centre;
  float dist = min(dL, dR);

  /* 0 at the deepest interior point, 1 at the outline: exactly the original
     roundedBox * MASK_MULTIPLIER_1. */
  float depthNorm = clamp(NUM_ONE - max(-dist, NUM_ZERO) / max(u_depth, 0.00001), NUM_ZERO, NUM_ONE);
  float rbScaled = pow(depthNorm, POWER_EXPONENT);

  float rbMask2 = rbScaled * (MASK_MULTIPLIER_2 / MASK_MULTIPLIER_1);
  float rbMask3 = rbScaled * (MASK_MULTIPLIER_3 / MASK_MULTIPLIER_1);
  float rbLens  = rbScaled * (LENS_MULTIPLIER  / MASK_MULTIPLIER_1);

  float rb1 = clamp((NUM_ONE - rbScaled) * MASK_STRENGTH_1, NUM_ZERO, NUM_ONE);
  float rb2 = clamp((MASK_THRESHOLD_1 - rbMask2) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE) -
    clamp((MASK_THRESHOLD_2 - rbMask2) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE);
  float rb3 = clamp((MASK_THRESHOLD_3 - rbMask3) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE) -
    clamp((NUM_ONE - rbMask3) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE);

  float transition = smoothstep(NUM_ZERO, NUM_ONE, rb1 + rb2) * mix(u_reveal.x, u_reveal.y, useR);

  /* THE EARLY OUT. Most of the viewport is outside both shapes, and this is
     what keeps the 81-tap kernel off those fragments. */
  if (transition <= NUM_ZERO) {
    gl_FragColor = mix(vec4(backdrop(uv), NUM_ONE), vec4(NUM_ZERO), u_alpha);
    return;
  }

  vec2 lens = ((uv - NUM_HALF) * (NUM_ONE - rbLens) + NUM_HALF);

  vec3 colour = vec3(NUM_ZERO);
  float total = NUM_ZERO;
  for (float x = -SAMPLE_RANGE; x <= SAMPLE_RANGE; x++) {
    for (float y = -SAMPLE_RANGE; y <= SAMPLE_RANGE; y++) {
      vec2 offset = vec2(x, y) * SAMPLE_OFFSET / u_resolution;
      colour += backdrop(clamp(offset + lens, 0.002, 0.998));
      total += NUM_ONE;
    }
  }
  colour /= total;

  float gradient = clamp((clamp(m2.y, NUM_ZERO, GRADIENT_RANGE) + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE) +
    clamp((clamp(-m2.y, GRADIENT_EXTREME, GRADIENT_RANGE) * rb3 + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE);
  vec3 lighting = clamp(colour + vec3(rb1) * gradient + vec3(rb2) * LIGHTING_INTENSITY, NUM_ZERO, NUM_ONE);

  vec4 opaque = vec4(mix(backdrop(uv), lighting, transition), NUM_ONE);
  vec4 over = vec4(lighting, transition);
  gl_FragColor = mix(opaque, over, u_alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[shader-lens] compile failed:', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

/** Idle callback where it exists, macrotask where it does not (Safari). */
function whenIdle(fn: () => void) {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 800 });
  else window.setTimeout(fn, 0);
}

interface Props {
  /** The cover photograph. Same-origin, or the texture upload taints. */
  src: string;
  onStatus?: (status: string) => void;
  /** Clear to nothing and paint only the corners, for use over the real cover. */
  transparent?: boolean;
}

export default function ShaderLensMaterial({ src, onStatus, transparent = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let raf = 0;
    let teardown: (() => void) | null = null;

    /* EVERYTHING below is deferred past the opening animation. The component
       mounts, renders an empty canvas, and does not touch the CPU or the GPU
       until the window has finished arriving. */
    const startTimer = window.setTimeout(() => whenIdle(start), PREP_DELAY);

    function start() {
      if (disposed) return;

      const gl = canvas!.getContext('webgl', {
        antialias: false,
        alpha: transparent,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) {
        statusRef.current?.('no webgl context');
        return;
      }

      const vs = compile(gl, gl.VERTEX_SHADER, VS);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
      const prog = gl.createProgram();
      if (!vs || !fs || !prog) {
        statusRef.current?.('shader compile failed - see console');
        return;
      }
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('[shader-lens] link failed:', gl.getProgramInfoLog(prog));
        statusRef.current?.('shader link failed - see console');
        return;
      }
      gl.useProgram(prog);

      if (transparent) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const U = (n: string) => gl.getUniformLocation(prog, n);
      const u = {
        resolution: U('u_resolution'),
        backdrop: U('u_backdrop'),
        imgScale: U('u_imgScale'),
        imgOffset: U('u_imgOffset'),
        plate: U('u_plate'),
        sdfL: U('u_sdfL'),
        sdfR: U('u_sdfR'),
        rectL: U('u_rectL'),
        rectR: U('u_rectR'),
        centreL: U('u_centreL'),
        centreR: U('u_centreR'),
        reveal: U('u_reveal'),
        sdfRange: U('u_sdfRange'),
        depth: U('u_depth'),
        alpha: U('u_alpha'),
      };

      /* CaseStudyWindow writes these with setProperty, so reading them back
         off the inline declaration is a property read - no getComputedStyle,
         no style recalculation, safe every frame. No cover section (the test
         bench) means no parallax to undo. */
      const plateEl = canvas!.closest('[data-section]') as HTMLElement | null;
      const readPlate = () => {
        if (!plateEl) return { shift: 0, zoom: 1 };
        const s = parseFloat(plateEl.style.getPropertyValue('--cs-plate-shift'));
        const z = parseFloat(plateEl.style.getPropertyValue('--cs-plate-zoom'));
        return {
          shift: Number.isFinite(s) ? s : 0,
          zoom: Number.isFinite(z) && z > 0 ? z : PLATE_ZOOM_FALLBACK,
        };
      };

      const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');

      /* LUMINANCE rows are not 4-byte aligned; without this the upload is
         rejected and every sample reads 0 - no shape at all. */
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
      const texSdfL = makeTex();
      const texSdfR = makeTex();

      let imgW = 1;
      let imgH = 1;
      let fieldsReady = false;
      let backdropReady = false;
      let revealStart = 0;

      const schedule = () => {
        if (!raf && !disposed) raf = requestAnimationFrame(draw);
      };

      const beginReveal = () => {
        if (revealStart || !fieldsReady || !backdropReady) return;
        revealStart = performance.now();
        schedule();
      };

      function draw() {
        raf = 0;
        if (disposed || !fieldsReady || !cachedLeft || !cachedRight) return;

        const cssW = canvas!.clientWidth;
        const cssH = canvas!.clientHeight;
        if (cssW < 2 || cssH < 2) return;

        /* 1x ON PURPOSE. The kernel is 81 taps per covered fragment; at 2x that
           is four times the work to sharpen a blur. */
        const W = Math.round(cssW);
        const H = Math.round(cssH);
        if (canvas!.width !== W || canvas!.height !== H) {
          canvas!.width = W;
          canvas!.height = H;
        }
        gl!.viewport(0, 0, W, H);
        if (transparent) gl!.clear(gl!.COLOR_BUFFER_BIT);

        /* Read from the clock, never accumulated, so a dropped frame cannot
           leave the two corners out of step. */
        let revealL = 1;
        let revealR = 1;
        if (!stillness.matches) {
          if (!revealStart) {
            revealL = 0;
            revealR = 0;
          } else {
            const t = performance.now() - revealStart;
            revealL = easeOpen(t / REVEAL_DURATION);
            revealR = easeOpen((t - REVEAL_STAGGER) / REVEAL_DURATION);
          }
        }

        /* Same sizing as the CSS corner cards. Only the rects depend on size,
           so a resize is a few uniforms, never a rebuild. */
        const cornerH = Math.min(470, Math.max(185, cssH * 0.42));
        const cornerW = cornerH * CORNER_ASPECT;
        const rw = cornerW / cssW;
        const rh = cornerH / cssH;

        /* The rise moves the SHAPE, not the sampled photograph, so the
           refraction stays honest mid-flight. */
        const rise = REVEAL_RISE_PX / cssH;
        const offL = -(1 - revealL) * rise;
        const offR = -(1 - revealR) * rise;

        gl!.uniform4f(u.rectL, 0, offL, rw, rh);
        gl!.uniform4f(u.rectR, 1 - rw, offR, rw, rh);
        gl!.uniform2f(u.centreL, cachedLeft.cx * rw, offL + cachedLeft.cy * rh);
        gl!.uniform2f(u.centreR, 1 - rw + cachedRight.cx * rw, offR + cachedRight.cy * rh);
        gl!.uniform2f(u.reveal, revealL, revealR);
        gl!.uniform1f(u.sdfRange, cachedLeft.range / cachedLeft.h);
        gl!.uniform1f(u.depth, cachedLeft.maxDepth);
        gl!.uniform1f(u.alpha, transparent ? 1 : 0);

        const plate = readPlate();
        gl!.uniform2f(u.plate, plate.shift / cssH, plate.zoom);

        /* Cover fit, matching object-fit: cover on the real image. */
        const canvasAspect = cssW / cssH;
        const imgAspect = imgW / imgH;
        const sx = imgAspect > canvasAspect ? canvasAspect / imgAspect : 1;
        const sy = imgAspect > canvasAspect ? 1 : imgAspect / canvasAspect;
        gl!.uniform2f(u.imgScale, sx, sy);
        gl!.uniform2f(u.imgOffset, (1 - sx) * 0.5, (1 - sy) * 0.5);
        gl!.uniform2f(u.resolution, W, H);

        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, texBackdrop);
        gl!.uniform1i(u.backdrop, 0);
        gl!.activeTexture(gl!.TEXTURE1);
        gl!.bindTexture(gl!.TEXTURE_2D, texSdfL);
        gl!.uniform1i(u.sdfL, 1);
        gl!.activeTexture(gl!.TEXTURE2);
        gl!.bindTexture(gl!.TEXTURE_2D, texSdfR);
        gl!.uniform1i(u.sdfR, 2);

        gl!.drawArrays(gl!.TRIANGLES, 0, 6);

        /* The only thing that keeps a loop alive, and it ends itself. */
        if (revealL < 1 || revealR < 1) schedule();
      }

      const upload = (tex: WebGLTexture | null, f: Field) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, f.w, f.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, f.data);
      };

      if (!cachedLeft) {
        const built = buildSdf();
        if (!built) {
          statusRef.current?.('could not rasterise the shape');
          return;
        }
        cachedLeft = built;
        cachedRight = mirrorField(built);
      }
      if (!cachedRight) cachedRight = mirrorField(cachedLeft);
      upload(texSdfL, cachedLeft);
      upload(texSdfR, cachedRight);
      fieldsReady = true;

      /* DECODED OFF THE MAIN THREAD. The cover has already fetched this URL,
         so it is a cache hit; createImageBitmap keeps the decode and the
         colour conversion off the thread that is running the animation. */
      let bitmap: ImageBitmap | null = null;
      const useBackdrop = (source: TexImageSource, w: number, h: number) => {
        if (disposed) return;
        imgW = w;
        imgH = h;
        gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        const err = gl.getError();
        if (err) {
          console.error('[shader-lens] backdrop upload failed (CORS?), gl error', err);
          statusRef.current?.('backdrop upload failed - see console');
          return;
        }
        backdropReady = true;
        canvas!.setAttribute('data-live', 'true');
        statusRef.current?.('live - shadertoy lens, tracking the parallax');
        beginReveal();
      };

      fetch(src, { mode: 'cors', credentials: 'omit' })
        .then((r) => r.blob())
        .then((b) => createImageBitmap(b))
        .then((bm) => {
          bitmap = bm;
          useBackdrop(bm, bm.width, bm.height);
        })
        .catch(() => {
          /* Fallback for anything the bitmap path cannot do. */
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.decoding = 'async';
          img.onload = () => useBackdrop(img, img.naturalWidth, img.naturalHeight);
          img.onerror = () => {
            console.error('[shader-lens] backdrop image failed to load:', src);
            statusRef.current?.('backdrop image failed to load');
          };
          img.src = src;
        });

      const ro = new ResizeObserver(schedule);
      ro.observe(canvas!);

      /* The scroller, not the window: this document scrolls inside the case
         study window. Passive and frame-coalesced, so it rides along with the
         parallax handler already running rather than adding a second loop. */
      const scroller = canvas!.closest('.case-study__scroller') as HTMLElement | null;
      const scrollTarget: HTMLElement | Window = scroller ?? window;
      scrollTarget.addEventListener('scroll', schedule, { passive: true });

      teardown = () => {
        ro.disconnect();
        scrollTarget.removeEventListener('scroll', schedule);
        bitmap?.close();
        /* Free the GPU objects rather than waiting for the context to be
           garbage collected - reopening case studies otherwise stacks up
           contexts until the browser drops the oldest. */
        gl.deleteTexture(texBackdrop);
        gl.deleteTexture(texSdfL);
        gl.deleteTexture(texSdfR);
        gl.deleteProgram(prog);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    }

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      if (raf) cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [src, transparent]);

  return <canvas ref={canvasRef} className="case-study__glass-canvas" aria-hidden="true" />;
}
