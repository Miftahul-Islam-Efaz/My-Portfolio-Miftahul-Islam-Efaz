'use client';

/**
 * LIQUID GLASS CORNER.
 *
 * Three-channel displacement-map glass on the case-study corner bezier.
 *
 * REVISION 5 - kills the streak artefacts and gives the face real thickness.
 *
 * 1. FIELD SMOOTHING, which removes the sharp radial streaks.
 *    An exact EDT assigns every pixel its NEAREST BOUNDARY PIXEL. Along the
 *    medial-axis seams where that nearest site changes - and they radiate out
 *    of concave features like the notch in this blob - the gradient direction
 *    jumps discontinuously. Taking the normal straight off the raw gradient
 *    turned every one of those Voronoi seams into a hard straight streak. The
 *    signed field is now blurred (three box passes, a Gaussian approximation)
 *    before any gradient is taken, so the normal field is continuous.
 *
 * 2. A DOME THICKNESS PROFILE, which is where the sense of depth comes from.
 *    Revision 4 used amp = pow(1 - t, falloff): an arbitrary decay with no
 *    physical shape, which is why it read as a filter rather than as a solid.
 *    Glass refracts in proportion to its SURFACE SLOPE, so the profile here is
 *    a real dome - height = sqrt(1 - (1-t)^2) - and the amplitude is that
 *    dome's slope, (1-t)/sqrt(1-(1-t)^2). That rises steeply toward grazing
 *    incidence at the rim and flattens to exactly zero through the middle,
 *    which is the curve the eye reads as thickness. The slope is clamped
 *    because it is unbounded at t = 0.
 *
 * 3. DITHERED ENCODING, which removes the concentric contour banding.
 *    The map carries offsets in 8-bit R/G. One code step was worth roughly
 *    0.75px of displacement, wide enough to read as contour lines. Half an LSB
 *    of noise is now added before quantising, which converts the banding into
 *    invisible grain. The magnification term is also excluded from the scale
 *    bound so the far corners cannot inflate the step size.
 *
 * ENCODING
 * --------
 * feDisplacementMap computes  P' = P + scale * (map - 0.5). So for a wanted
 * offset of dx pixels:  scale = 2 * maxAbs  and  map = 0.5 + dx / (2 * maxAbs).
 * All three channel maps share one scale, or their relative amplitudes - the
 * dispersion itself - would be normalised away.
 *
 * NO BORDER. Nothing is stroked or drawn. The rim reads as a rim only because
 * the dome slope peaks at the outline and reaches zero by rimReach, so the
 * backdrop stays continuous across the silhouette.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Identical to #cs-corner-left. 355 x 199.5 user units. */
export const FIGMA_PATH =
  'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z';
export const PATH_W = 355;
export const PATH_H = 199.5;
export const CORNER_ASPECT = PATH_W / PATH_H;

export interface LiquidGlassConfig {
  /** Refraction offset at peak dome slope, in pixels. */
  rimStrength: number;
  /** How far in the dome rises, as a fraction of interior depth. */
  rimReach: number;
  /** Slope clamp. Lower widens and softens the grazing band. */
  rimFalloff: number;
  /** Normal-field smoothing radius, as a fraction of corner height. */
  fieldSmooth: number;
  /** Thick-lens enlargement toward the mask centroid. */
  magnify: number;
  /** Chromatic separation between the R and B sample offsets. */
  dispersion: number;
  /** Pale scattering brightening. */
  lift: number;
  /** Frost blur in pixels. */
  blur: number;
}

/** Read off the Figma render, not off Figma's dials. */
export const DEFAULT_LIQUID_GLASS: LiquidGlassConfig = {
  rimStrength: 52,
  rimReach: 0.42,
  rimFalloff: 4,
  fieldSmooth: 0.02,
  magnify: 0.32,
  dispersion: 0.5,
  lift: 0.16,
  blur: 0.4,
};

const len = (x: number, y: number): number => Math.sqrt(x * x + y * y);

/* ------------------------------------------------------------------ *
 * Exact euclidean distance transform (Felzenszwalb & Huttenlocher).
 * ------------------------------------------------------------------ */

const INF = 1e20;

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
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
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
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const size = Math.max(w, h);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}

/**
 * Separable box blur, run three times, which approximates a Gaussian closely
 * enough for a normal field and stays O(n) per pass.
 *
 * This is the fix for the radial streaks: the EDT gradient is discontinuous
 * across nearest-site seams, and smoothing the field before differentiating is
 * what makes those seams disappear.
 */
function blurField(src: Float64Array, w: number, h: number, radius: number) {
  const r = Math.max(0, Math.round(radius));
  if (r < 1) return src;

  let a = src;
  let b = new Float64Array(a.length);
  const win = r * 2 + 1;

  for (let pass = 0; pass < 3; pass++) {
    // Horizontal.
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let i = -r; i <= r; i++) {
        sum += a[row + Math.min(w - 1, Math.max(0, i))];
      }
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / win;
        const out = row + Math.min(w - 1, Math.max(0, x - r));
        const inc = row + Math.min(w - 1, Math.max(0, x + r + 1));
        sum += a[inc] - a[out];
      }
    }
    let t = a;
    a = b;
    b = t;

    // Vertical.
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) {
        sum += a[Math.min(h - 1, Math.max(0, i)) * w + x];
      }
      for (let y = 0; y < h; y++) {
        b[y * w + x] = sum / win;
        const out = Math.min(h - 1, Math.max(0, y - r)) * w + x;
        const inc = Math.min(h - 1, Math.max(0, y + r + 1)) * w + x;
        sum += a[inc] - a[out];
      }
    }
    t = a;
    a = b;
    b = t;
  }

  return a;
}

interface ShapeField {
  /** Signed distance in pixels, NEGATIVE INSIDE. Raw, for depth. */
  signed: Float64Array;
  /** Deepest interior distance in pixels. Normalises depth to 0..1. */
  maxDepth: number;
  /** Mask centroid in local 0..1 space. */
  cx: number;
  cy: number;
}

function buildShapeField(mirrored: boolean, w: number, h: number): ShapeField {
  const n = w * h;
  const empty: ShapeField = {
    signed: new Float64Array(n),
    maxDepth: 1,
    cx: 0.5,
    cy: 0.5,
  };

  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d');
  if (!ctx) return empty;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (mirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.scale(w / PATH_W, h / PATH_H);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(FIGMA_PATH));
  ctx.restore();

  const px = ctx.getImageData(0, 0, w, h).data;
  const inside = new Float64Array(n);
  const outside = new Float64Array(n);

  let sx = 0;
  let sy = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const on = px[i * 4 + 3] > 127;
    inside[i] = on ? INF : 0;
    outside[i] = on ? 0 : INF;
    if (on) {
      const x = i % w;
      sx += x;
      sy += (i - x) / w;
      count++;
    }
  }

  edt2d(inside, w, h);
  edt2d(outside, w, h);

  const signed = new Float64Array(n);
  let maxDepth = 1;
  for (let i = 0; i < n; i++) {
    const s = Math.sqrt(outside[i]) - Math.sqrt(inside[i]);
    signed[i] = s;
    if (-s > maxDepth) maxDepth = -s;
  }

  return {
    signed,
    maxDepth,
    cx: count ? sx / count / w : 0.5,
    cy: count ? sy / count / h : 0.5,
  };
}

/* ------------------------------------------------------------------ */

interface CornerProps {
  side: 'left' | 'right';
  config: LiquidGlassConfig;
  onStatus?: (s: string) => void;
}

function Corner({ side, config, onStatus }: CornerProps) {
  const mirrored = side === 'right';
  const uid = useMemo(
    () => 'lgc-' + side + '-' + Math.random().toString(36).slice(2, 9),
    [side],
  );
  const filterId = uid + '-filter';
  const clipId = uid + '-clip';

  const feImgR = useRef<SVGFEImageElement>(null);
  const feImgG = useRef<SVGFEImageElement>(null);
  const feImgB = useRef<SVGFEImageElement>(null);
  const feDispR = useRef<SVGFEDisplacementMapElement>(null);
  const feDispG = useRef<SVGFEDisplacementMapElement>(null);
  const feDispB = useRef<SVGFEDisplacementMapElement>(null);
  const fieldRef = useRef<{ key: number; field: ShapeField } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });

  /** Mirrors the CSS: --cs-corner-h: clamp(185px, 42vh, 470px). */
  useEffect(() => {
    const measure = () => {
      const ch = Math.min(470, Math.max(185, window.innerHeight * 0.42));
      setSize({ w: Math.round(ch * CORNER_ASPECT), h: Math.round(ch) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const bake = useCallback(() => {
    const w = size.w;
    const h = size.h;
    if (!feImgR.current || !feImgG.current || !feImgB.current) return;
    if (!feDispR.current || !feDispG.current || !feDispB.current) return;
    if (w < 2 || h < 2) return;

    if (!fieldRef.current || fieldRef.current.key !== h) {
      fieldRef.current = { key: h, field: buildShapeField(mirrored, w, h) };
    }
    const { signed, maxDepth, cx, cy } = fieldRef.current.field;

    const n = w * h;

    // Smooth a COPY of the field, then differentiate that. The raw field still
    // supplies depth, which needs to stay geometrically honest.
    const smooth = blurField(
      Float64Array.from(signed),
      w,
      h,
      h * Math.max(0, config.fieldSmooth),
    );

    const nx = new Float64Array(n);
    const ny = new Float64Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const xa = x > 0 ? i - 1 : i;
        const xb = x < w - 1 ? i + 1 : i;
        const ya = y > 0 ? i - w : i;
        const yb = y < h - 1 ? i + w : i;
        let gx = (smooth[xb] - smooth[xa]) * 0.5;
        let gy = (smooth[yb] - smooth[ya]) * 0.5;
        const m = len(gx, gy);
        if (m > 1e-6) {
          gx /= m;
          gy /= m;
        } else {
          gx = 0;
          gy = 0;
        }
        nx[i] = gx;
        ny[i] = gy;
      }
    }

    const reach = Math.max(config.rimReach, 0.01);
    const clampSlope = Math.max(config.rimFalloff, 0.2);

    /**
     * Dome surface slope at normalised depth t.
     *
     * height = sqrt(1 - (1-t)^2)  ->  slope = (1-t) / sqrt(1 - (1-t)^2)
     *
     * Unbounded at t = 0, hence the clamp. Exactly zero at t >= 1, so the face
     * flattens out and the backdrop passes through the middle untouched.
     */
    const domeSlope = (t: number): number => {
      if (t >= 1) return 0;
      const u = 1 - t;
      const d = Math.sqrt(Math.max(1e-6, 1 - u * u));
      return Math.min(u / d, clampSlope) / clampSlope;
    };

    /** Refraction offset in pixels. mult applies to refraction only. */
    const refractAt = (i: number, mult: number): [number, number] => {
      const depth = Math.max(0, Math.min(1, -signed[i] / maxDepth));
      const amp = config.rimStrength * domeSlope(Math.min(1, depth / reach)) * mult;
      return [nx[i] * amp, ny[i] * amp];
    };

    /** Achromatic thick-lens term. Enlargement is not a wavelength effect. */
    const magnifyAt = (i: number): [number, number] => {
      const x = i % w;
      const y = (i - x) / w;
      const depth = Math.max(0, Math.min(1, -signed[i] / maxDepth));
      const s = config.magnify * depth * 0.35;
      return [-(x / w - cx) * w * s, -(y / h - cy) * h * s];
    };

    const disp = Math.max(0, config.dispersion);
    const mults: [number, number, number] = [1 - disp * 0.5, 1, 1 + disp * 0.5];
    const strongest = Math.max(mults[0], mults[1], mults[2]);

    // Bound the scale on the REFRACTION term only. Letting the far-corner
    // magnification set the bound inflated the 8-bit step size, which is what
    // produced the concentric contour banding.
    let maxAbs = 1e-6;
    for (let i = 0; i < n; i++) {
      const [dx, dy] = refractAt(i, strongest);
      const a = Math.max(Math.abs(dx), Math.abs(dy));
      if (a > maxAbs) maxAbs = a;
    }
    const scale = 2 * maxAbs;

    const refs = [feImgR.current, feImgG.current, feImgB.current];
    for (let c = 0; c < 3; c++) {
      const cvs = document.createElement('canvas');
      cvs.width = w;
      cvs.height = h;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const data = new Uint8ClampedArray(n * 4);
      for (let i = 0; i < n; i++) {
        const [rx, ry] = refractAt(i, mults[c]);
        const [mx, my] = magnifyAt(i);
        // Half an LSB of dither turns quantisation contours into grain.
        const jx = Math.random() - 0.5;
        const jy = Math.random() - 0.5;
        data[i * 4] = (0.5 + (rx + mx) / scale) * 255 + jx;
        data[i * 4 + 1] = (0.5 + (ry + my) / scale) * 255 + jy;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 255;
      }
      ctx.putImageData(new ImageData(data, w, h), 0, 0);
      refs[c].setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href',
        cvs.toDataURL(),
      );
    }

    const s = String(scale);
    feDispR.current.setAttribute('scale', s);
    feDispG.current.setAttribute('scale', s);
    feDispB.current.setAttribute('scale', s);

    onStatus?.(
      'live ' +
        w +
        'x' +
        h +
        ', dome slope, peak ' +
        maxAbs.toFixed(1) +
        'px, smoothed ' +
        Math.round(h * config.fieldSmooth) +
        'px',
    );
  }, [size.w, size.h, mirrored, config, onStatus]);

  useEffect(() => {
    bake();
  }, [bake]);

  const pos = side === 'left' ? { left: 0 } : { right: 0 };
  const backdrop =
    'url(#' +
    filterId +
    ') blur(' +
    config.blur +
    'px) contrast(1.06) saturate(1.12)';
  const clip = 'url(#' + clipId + ')';
  const sx = 1 / PATH_W;
  const sy = 1 / PATH_H;

  return (
    <>
      <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path
              d={FIGMA_PATH}
              transform={
                mirrored
                  ? 'translate(1,0) scale(-1,1) scale(' + sx + ',' + sy + ')'
                  : 'scale(' + sx + ',' + sy + ')'
              }
            />
          </clipPath>

          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width={size.w}
            height={size.h}
          >
            {/* Three maps, three amplitudes. One map cannot separate colours. */}
            <feImage ref={feImgR} width={size.w} height={size.h} result="mapR" />
            <feImage ref={feImgG} width={size.w} height={size.h} result="mapG" />
            <feImage ref={feImgB} width={size.w} height={size.h} result="mapB" />

            <feDisplacementMap
              ref={feDispR}
              in="SourceGraphic"
              in2="mapR"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              result="dispR"
            />
            <feDisplacementMap
              ref={feDispG}
              in="SourceGraphic"
              in2="mapG"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              result="dispG"
            />
            <feDisplacementMap
              ref={feDispB}
              in="SourceGraphic"
              in2="mapB"
              xChannelSelector="R"
              yChannelSelector="G"
              scale="0"
              result="dispB"
            />

            {/* Keep one channel from each differently-displaced copy. */}
            <feColorMatrix
              in="dispR"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="onlyR"
            />
            <feColorMatrix
              in="dispG"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="onlyG"
            />
            <feColorMatrix
              in="dispB"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="onlyB"
            />

            {/* Screen recombines disjoint channels without wrecking alpha. */}
            <feBlend in="onlyR" in2="onlyG" mode="screen" result="rg" />
            <feBlend in="rg" in2="onlyB" mode="screen" result="rgb" />

            {/* Scattering lift: the glass is brighter than its backdrop. */}
            <feComponentTransfer in="rgb">
              <feFuncR type="linear" slope="1" intercept={config.lift * 0.14} />
              <feFuncG type="linear" slope="1" intercept={config.lift * 0.15} />
              <feFuncB type="linear" slope="1" intercept={config.lift * 0.18} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div
        className={'case-study__liquid-corner case-study__liquid-corner--' + side}
        style={{
          position: 'absolute',
          bottom: 0,
          ...pos,
          width: size.w,
          height: size.h,
          pointerEvents: 'none',
          clipPath: clip,
          WebkitClipPath: clip,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
        }}
      />
    </>
  );
}

interface LiquidGlassCornerProps {
  config?: LiquidGlassConfig;
  onStatus?: (s: string) => void;
}

export default function LiquidGlassCorner({
  config = DEFAULT_LIQUID_GLASS,
  onStatus,
}: LiquidGlassCornerProps) {
  return (
    <div
      className="case-study__liquid-layer"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <Corner side="left" config={config} onStatus={onStatus} />
      <Corner side="right" config={config} />
    </div>
  );
}
