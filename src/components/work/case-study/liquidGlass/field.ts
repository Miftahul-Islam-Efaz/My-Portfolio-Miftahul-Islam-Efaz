/**
 * THE GLASS HEIGHT FIELD.
 *
 * A port of the reference implementation's sdf.js, kept deliberately close to
 * it. The pipeline:
 *
 *   1. rasterise the SVG path with Path2D (exact, same curves as the artwork)
 *   2. exact Euclidean distance transform on the interior
 *   3. distance -> rounded rim profile via `depth`
 *   4. blur the height field   <- kills the medial-axis crease
 *   5. Sobel HERE, in Float32, and store the gradient
 *
 * PADDING. A path edge sitting exactly on the viewBox border has no exterior
 * pixels, so the EDT never sees a zero-distance seed there and the rim profile
 * never ramps down - no curved edge on that side at all, and with
 * CLAMP_TO_EDGE the Sobel reads slope 0, so no refraction and no dispersion
 * either. This artwork runs flush along two borders (V199.5 and H355), so
 * without PAD half the shape has no bevel. PAD must also exceed the blur
 * radius or the blur's edge clamping reintroduces a milder version.
 *
 * PRECISION. The height is ~1.0 across the interior and neighbouring texels
 * differ by ~1e-3, so differencing it in the shader throws nearly all of it
 * away. The gradient is therefore computed here, where the operands are still
 * Float32, and stored directly - worth about 100x in gradient
 * signal-to-noise, and it saves eight texture fetches per fragment.
 *
 * Output is RGBA: (gx, gy, height, coverage), Float32 or half-float.
 */

import { SHAPE } from './settings';

const INF = 1e20;

/** Exterior margin in FIELD pixels, added on all four sides. */
export const PAD = 48;

/** Box passes used to approximate a Gaussian. */
const PASSES = 8;

export interface GlassField {
  data: Float32Array | Uint16Array;
  width: number;
  height: number;
  /** Exterior margin in field px. The caller must expand its sampling rect. */
  pad: number;
  float32: boolean;
  /** Supersample factor this field was built at. */
  scale: number;
}

/* ---- Felzenszwalb & Huttenlocher exact distance transform ---- */

function edt1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  let k = 0;
  for (let q = 1; q < n; q++) {
    let s =
      (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

function edt2d(grid: Float64Array, W: number, H: number) {
  const maxWH = Math.max(W, H);
  const f = new Float64Array(maxWH);
  const d = new Float64Array(maxWH);
  const v = new Int32Array(maxWH);
  const z = new Float64Array(maxWH + 1);

  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = grid[y * W + x];
    edt1d(f, d, v, z, H);
    for (let y = 0; y < H; y++) grid[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) f[x] = grid[row + x];
    edt1d(f, d, v, z, W);
    for (let x = 0; x < W; x++) grid[row + x] = Math.sqrt(d[x]);
  }
  return grid;
}

/* ---- fractional-radius box blur ----
 *
 * An integer-radius box blur quantises the kernel to whole pixels, and several
 * such passes leave piecewise-quadratic seams aligned to the blur axes. Those
 * show up as straight horizontal and vertical lines once the field is
 * differentiated, and they get worse as sigma grows. Weighting the end taps by
 * the fractional part removes the stepping entirely.
 */

function radiusForGauss(sigma: number, n: number) {
  const want = (12 * sigma * sigma) / n + 1;
  return 0.5 * (Math.sqrt(want) - 1);
}

function boxHFrac(
  src: Float32Array,
  dst: Float32Array,
  W: number,
  H: number,
  r: number,
) {
  const ri = Math.floor(r);
  const fr = r - ri;
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let acc = 0;
    for (let i = -ri; i <= ri; i++) {
      const xx = i < 0 ? 0 : i >= W ? W - 1 : i;
      acc += src[row + xx];
    }
    for (let x = 0; x < W; x++) {
      let lo = x - ri - 1;
      let hi = x + ri + 1;
      if (lo < 0) lo = 0;
      if (hi >= W) hi = W - 1;
      dst[row + x] = (acc + fr * (src[row + lo] + src[row + hi])) * norm;

      let out = x - ri;
      let inn = x + ri + 1;
      if (out < 0) out = 0;
      if (inn >= W) inn = W - 1;
      acc += src[row + inn] - src[row + out];
    }
  }
}

function boxVFrac(
  src: Float32Array,
  dst: Float32Array,
  W: number,
  H: number,
  r: number,
) {
  const ri = Math.floor(r);
  const fr = r - ri;
  const norm = 1 / (2 * r + 1);
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let i = -ri; i <= ri; i++) {
      const yy = i < 0 ? 0 : i >= H ? H - 1 : i;
      acc += src[yy * W + x];
    }
    for (let y = 0; y < H; y++) {
      let lo = y - ri - 1;
      let hi = y + ri + 1;
      if (lo < 0) lo = 0;
      if (hi >= H) hi = H - 1;
      dst[y * W + x] =
        (acc + fr * (src[lo * W + x] + src[hi * W + x])) * norm;

      let out = y - ri;
      let inn = y + ri + 1;
      if (out < 0) out = 0;
      if (inn >= H) inn = H - 1;
      acc += src[inn * W + x] - src[out * W + x];
    }
  }
}

function fastBlur(
  src: Float32Array,
  W: number,
  H: number,
  sigma: number,
  scratchA: Float32Array,
  scratchB: Float32Array,
  passes: number,
) {
  if (sigma <= 0.02) return src;
  const r = radiusForGauss(sigma, passes);
  if (r < 0.02) return src;
  let a = src;
  let b = scratchA;
  const tmp = scratchB;
  for (let i = 0; i < passes; i++) {
    boxHFrac(a, tmp, W, H, r);
    boxVFrac(tmp, b, W, H, r);
    const t = a;
    a = b;
    b = t;
  }
  return a;
}

/* ---- float32 -> float16 ---- */
const _b = new ArrayBuffer(4);
const _f = new Float32Array(_b);
const _i = new Uint32Array(_b);
function toHalf(val: number) {
  _f[0] = val;
  const x = _i[0];
  let bits = (x >> 16) & 0x8000;
  let m = (x >> 12) & 0x07ff;
  const e = (x >> 23) & 0xff;
  if (e < 103) return bits;
  if (e > 142) {
    bits |= 0x7c00;
    bits |= (e === 255 ? 0 : 1) && x & 0x007fffff;
    return bits;
  }
  if (e < 113) {
    m |= 0x0800;
    bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
    return bits;
  }
  bits |= ((e - 112) << 10) | (m >> 1);
  bits += m & 1;
  return bits;
}

/* ---- cached rasterise + EDT ----
 * Depends only on the path, its box, the mirror flag and the supersample
 * scale - never on the dials - so it survives every rebuild.
 */

interface Prepared {
  key: string;
  W: number;
  H: number;
  dist: Float32Array;
  cov: Float32Array;
  h: Float32Array;
  dsm: Float32Array;
  scratchA: Float32Array;
  scratchB: Float32Array;
  out: Float32Array | Uint16Array;
}

const slots = new Map<string, Prepared>();

function prepare(
  pathD: string,
  viewW: number,
  viewH: number,
  fillRule: CanvasFillRule,
  scale: number,
  mirrored: boolean,
  float32: boolean,
): Prepared {
  const key = [
    pathD, viewW, viewH, fillRule, scale, mirrored, PAD, float32,
  ].join('|');
  const hit = slots.get(key);
  if (hit) return hit;

  const W = Math.max(8, Math.round(viewW * scale) + PAD * 2);
  const H = Math.max(8, Math.round(viewH * scale) + PAD * 2);

  /* Runs in a worker as well as on the main thread, and a worker has no
     document. OffscreenCanvas rasterises identically - same Path2D, same
     curves - so the field is bit-for-bit the same either way. */
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    ctx = c.getContext('2d', { willReadFrequently: true });
  } else {
    const c = new OffscreenCanvas(W, H);
    ctx = c.getContext('2d', { willReadFrequently: true });
  }
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  // Shift inward so all four path edges have exterior pixels.
  ctx.translate(PAD, PAD);
  ctx.scale(scale, scale);
  /* The right-hand corner is the same artwork mirrored. Mirroring HERE, before
     the distance transform, means the gradient is computed on the mirrored
     shape and its sign comes out right on its own. Mirroring the finished
     field instead would need gx negated by hand, which is the kind of thing
     that reads as a lighting bug rather than a coordinate one. */
  if (mirrored) {
    ctx.translate(viewW, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(pathD), fillRule);
  ctx.restore();

  const img = ctx.getImageData(0, 0, W, H).data;
  const n = W * H;

  const grid = new Float64Array(n);
  const cov0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = img[i * 4 + 3] / 255;
    cov0[i] = a;
    grid[i] = a > 0.5 ? INF : 0;
  }
  edt2d(grid, W, H);

  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = grid[i];

  const sA = new Float32Array(n);
  const sB = new Float32Array(n);
  // Coverage blur never changes with the dials, so it happens once.
  const cov = fastBlur(cov0.slice(), W, H, 0.9, sA, sB, PASSES);

  const entry: Prepared = {
    key,
    W,
    H,
    dist,
    cov,
    h: new Float32Array(n),
    dsm: new Float32Array(n),
    scratchA: new Float32Array(n),
    scratchB: new Float32Array(n),
    out: float32 ? new Float32Array(n * 4) : new Uint16Array(n * 4),
  };
  // Two shapes only (left and right), so the map never needs eviction.
  if (slots.size > 4) slots.clear();
  slots.set(key, entry);
  return entry;
}

export function buildGlassField({
  pathD = SHAPE.path,
  viewW = SHAPE.vw,
  viewH = SHAPE.vh,
  fillRule = SHAPE.fillRule as CanvasFillRule,
  scale,
  depth,
  profile,
  smooth,
  soften = 0,
  mirrored = false,
  float32 = false,
}: {
  pathD?: string;
  viewW?: number;
  viewH?: number;
  fillRule?: CanvasFillRule;
  scale: number;
  /** Rim width in path units. Already (depth / 100) * reach * ref. */
  depth: number;
  profile: number;
  smooth: number;
  soften?: number;
  mirrored?: boolean;
  float32?: boolean;
}): GlassField {
  const p = prepare(
    pathD, viewW, viewH, fillRule, scale, mirrored, float32,
  );
  const { W, H, dist, cov, scratchA, scratchB, out } = p;
  const n = W * H;

  const depthPx = Math.max(depth, 0.001) * scale;
  const inv = 1 / depthPx;
  const expo = profile && profile !== 1 ? 2 / (1 + profile) : 0;

  /* The exact distance field has a real gradient discontinuity along the
     shape's medial axis. At a narrow rim the profile has already flattened
     before the ramp reaches it, so the crease is multiplied by zero and never
     shows; widen the rim into a full lens and the creases surface as fans
     radiating from the corners. Blurring `dist` before profiling rounds the
     skeleton away.

     It has to be TAPERED, not global. Nearly all of the slope - and so all of
     the refraction - lives in the narrow band next to the border, while the
     medial axis is always interior. The two regions do not overlap, so a
     global blur pays for the interior fix by flattening the rim, which reads
     as the glass going flat-frosted. Blending back to the exact distance near
     the border keeps full rim strength.

     soften is 0 in this config, so this is skipped entirely. */
  let src = dist;
  if (soften > 0) {
    const ds = p.dsm;
    ds.set(dist);
    const db = fastBlur(ds, W, H, soften * scale, scratchA, scratchB, PASSES);
    const kInv = 1 / Math.max(0.5 * depthPx, 1e-6);
    for (let i = 0; i < n; i++) {
      const d0 = dist[i];
      let w = d0 * kInv;
      if (w > 1) w = 1;
      w = w * w * (3 - 2 * w);
      db[i] = d0 + (db[i] - d0) * w;
    }
    src = db;
  }

  // Rounded rim profile: height = sqrt(1 - (1 - t)^2).
  const h = p.h;
  for (let i = 0; i < n; i++) {
    let t = src[i] * inv;
    if (t > 1) t = 1;
    const u = 1 - t;
    let v = Math.sqrt(1 - u * u);
    if (expo) v = Math.pow(v, expo);
    h[i] = v;
  }

  // Smooth the height field before differentiating it.
  const hb = fastBlur(
    h, W, H, Math.max(smooth, 0) * scale, scratchA, scratchB, PASSES,
  );

  /* Sobel over a TWO-texel baseline. The wider baseline averages out residual
     quantisation and blur seams, which is what otherwise produces straight
     sharp lines at high smoothness. The 0.0625 folds together the Sobel 0.125
     and the 0.5 compensating for the widened baseline, which is what gives
     `gain` its calibrated meaning - change it and gain: 123 means something
     else. */
  const B = 2;
  for (let y = 0; y < H; y++) {
    const rm = (y - B < 0 ? 0 : y - B) * W;
    const r0 = y * W;
    const rp = (y + B >= H ? H - 1 : y + B) * W;
    for (let x = 0; x < W; x++) {
      const xm = x - B < 0 ? 0 : x - B;
      const xp = x + B >= W ? W - 1 : x + B;
      const h00 = hb[rm + xm];
      const h10 = hb[rm + x];
      const h20 = hb[rm + xp];
      const h01 = hb[r0 + xm];
      const h21 = hb[r0 + xp];
      const h02 = hb[rp + xm];
      const h12 = hb[rp + x];
      const h22 = hb[rp + xp];
      const gx = (h20 + 2 * h21 + h22 - (h00 + 2 * h01 + h02)) * 0.0625;
      const gy = (h02 + 2 * h12 + h22 - (h00 + 2 * h10 + h20)) * 0.0625;
      const i = r0 + x;
      const o = i * 4;
      if (float32) {
        out[o] = gx;
        out[o + 1] = gy;
        out[o + 2] = hb[i];
        out[o + 3] = cov[i];
      } else {
        out[o] = toHalf(gx);
        out[o + 1] = toHalf(gy);
        out[o + 2] = toHalf(hb[i]);
        out[o + 3] = toHalf(cov[i]);
      }
    }
  }

  return { data: out, width: W, height: H, pad: PAD, float32, scale };
}
