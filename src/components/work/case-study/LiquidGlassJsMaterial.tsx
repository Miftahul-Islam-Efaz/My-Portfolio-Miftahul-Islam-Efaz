'use client';

/**
 * LIQUID-GLASS-JS MATERIAL.
 *
 * A faithful port of the fragment shader from dashersw/liquid-glass-js
 * (container.js, setupShader) onto THIS project's authored corner shape.
 *
 * WHAT IS TAKEN VERBATIM FROM THE LIBRARY
 * ---------------------------------------
 * The whole refraction/tint/blur pipeline, term for term and in order:
 *
 *   distFromEdge      -> pixels inside the silhouette
 *   baseIntensity     = 1.0 - exp(-nd * u_baseDistance)
 *   edgeIntensity     = exp(-nd * u_edgeDistance)
 *   rimIntensity      = exp(-nd * u_rimDistance)
 *   baseComponent     = warp ? baseIntensity * u_baseIntensity : 0.0
 *   totalIntensity    = baseComponent + edgeI * u_edgeIntensity + rimI * u_rimIntensity
 *   baseRefraction    = shapeNormal * totalIntensity
 *   cornerRefraction  = shapeNormal * exp(-cornerNormalized * 0.3) * u_cornerBoost
 *   textureRefraction = perpendicular * sin(distFromEdge * 25.0) * u_rippleEffect * rimI
 *   textureCoord     += baseRefraction + cornerRefraction + textureRefraction
 *   13x13 Gaussian, sigma = u_blurRadius / 2.0, radius-culled at 6.0
 *   vertical white->0.7 gradient tint, mixed by u_tintOpacity
 *   sampled top/mid/bottom backdrop gradient, mixed by u_tintOpacity * 0.3
 *
 * ----------------------------------------------
 * 1. THE SHAPE. The library only knows three analytic shapes - rounded rect,
 *    circle, pill - and picks between them by inspecting borderRadius against
 *    the element size. None of them is this bezier corner. So its
 *    roundedRectDistance/isPill/isCircle block is replaced by the signed
 *    distance field rasterised from FIGMA_PATH, and its
 *    shapeNormal = normalize(coord - center) - which is only correct for a
 *    shape whose centre lies inside it - is replaced by the normalised SDF
 *    GRADIENT. On this blob the bounding-box centre falls outside the glass,
 *    which is precisely the failure documented as root error #15.
 *
 * 2. THE BACKDROP. The library screenshots the live DOM with html2canvas and
 *    samples that, offset by scrollY. That route is unavailable here: the
 *    backdrop is a cross-origin-proxied photograph inside a transformed,
 *    animated panel, and html2canvas would rasterise the headline text too and
 *    refract it. This samples the cover photograph directly, cover-fitted, as
 *    the existing material does.
 *
 * 3. THE FALLOFFS. The library exponential falloffs are in RAW DEVICE
 *    PIXELS, tuned on buttons roughly 50px tall, and are used here
 *    unmodified. On a 185-470px shape the bands therefore sit close to
 *    the outline. No scaling dial: the panel carries the library set only.
 *
 * The library's alpha-mask output is also composited differently: it renders
 * to a transparent canvas that floats over the real page, whereas this owns
 * the backdrop, so the mask blends glass against the pristine photograph.
 *
 * NOTE ON TEMPLATE LITERALS: never put a backtick anywhere in the shader
 * strings below, including inside GLSL comments. It closes the literal early
 * and the build fails with "Expected a semicolon" pointing at raw GLSL.
 */

import { useEffect, useRef } from 'react';

/** The corner shape, exactly as authored. 355 x 199.5 user units. */
const FIGMA_PATH =
  'M54 32C36 24.6667 12.5 9.33333 0 0V199.5H355C349.5 131 310.167 110.833 285 90C260.167 72.6667 202.737 48.1404 159.5 46C109 43.5 69.7231 38.4057 54 32Z';
const PATH_W = 355;
const PATH_H = 199.5;
const CORNER_ASPECT = PATH_W / PATH_H;

/** Distance-field supersampling. At 4 the normals stair-step visibly along the
 *  long shallow bezier; 6 clears it. One-off CPU cost, not per-frame. */
const SS = 6;

export interface LiquidGlassConfig {
  /** Refraction strength at the shape edges. Library range 0-0.1. */
  edgeIntensity: number;
  /** Intensity of the rim falloff term. Library range 0-0.2. */
  rimIntensity: number;
  /** Centre distortion strength. Only active when warp is on. */
  baseIntensity: number;
  /** Falloff rate of the edge term. Higher = tighter to the outline. */
  edgeDistance: number;
  /** Falloff rate of the rim term. */
  rimDistance: number;
  /** Rise rate of the centre term. */
  baseDistance: number;
  /** Extra refraction near the corners of the shape's own box. */
  cornerBoost: number;
  /** Sinusoidal surface texture along the silhouette. */
  rippleEffect: number;
  /** Gaussian blur radius; sigma is half this. */
  blurRadius: number;
  /** Strength of both gradient tint passes. */
  tintOpacity: number;
  /** The library's warp flag: enables the centre distortion term. */
  warp: boolean;
}

/**
 * The settings from the control panel in the supplied screenshots, read off
 * exactly as shown:
 *
 *   Edge Intensity 0.042   Rim Intensity 0.000   Base Intensity 0.008
 *   Edge Distance  0.190   Rim Distance  0.600   Base Distance  0.100
 *   Corner Boost   0.000   Ripple Effect 0.000
 *   Blur Radius    2.000   Tint Opacity  0.090
 *   Enable Center Warp: unchecked
 *
 * Note that with warp off, baseIntensity 0.008 is inert - the library gates
 * the entire centre term behind that checkbox. It is preserved so the panel
 * matches the screenshots rather than quietly reinterpreting them.
 */
export const DEFAULT_LIQUID_GLASS: LiquidGlassConfig = {
  edgeIntensity: 0.042,
  rimIntensity: 0,
  baseIntensity: 0.008,
  edgeDistance: 0.19,
  rimDistance: 0.6,
  baseDistance: 0.1,
  cornerBoost: 0,
  rippleEffect: 0,
  blurRadius: 2,
  tintOpacity: 0.09,
  warp: false,
};

/* ------------------------------------------------------------------ *
 * EUCLIDEAN DISTANCE TRANSFORM (Felzenszwalb & Huttenlocher)          *
 * ------------------------------------------------------------------ */

function edt1d(f: Float64Array, n: number) {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
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
  for (let q = 0; q < n; q++) f[q] = d[q];
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const col = new Float64Array(h);
  const row = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = grid[y * w + x];
    edt1d(col, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = col[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = grid[y * w + x];
    edt1d(row, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = row[x];
  }
}

/**
 * Rasterises the path into an 8-bit signed distance field. 128 is the outline,
 * above is inside, below is outside; the byte range spans +/- range mask
 * pixels, returned so the shader can decode it.
 */
function buildSdf(mirrored: boolean, w: number, h: number) {
  const mw = Math.max(8, Math.round(w * SS));
  const mh = Math.max(8, Math.round(h * SS));

  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, mw, mh);
  ctx.save();
  ctx.scale(mw / PATH_W, mh / PATH_H);
  if (mirrored) {
    ctx.translate(PATH_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(FIGMA_PATH));
  ctx.restore();

  const px = ctx.getImageData(0, 0, mw, mh).data;
  const n = mw * mh;

  /* Two complementary grids; the difference of their roots is the SIGNED
     distance. One grid alone gives a glow, not a field. */
  const inside = new Float64Array(n);
  const outside = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const solid = px[i * 4 + 3] > 127;
    inside[i] = solid ? 0 : Infinity;
    outside[i] = solid ? Infinity : 0;
  }

  edt2d(inside, mw, mh);
  edt2d(outside, mw, mh);

  const range = Math.max(8, Math.min(mw, mh) * 0.5);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    /* Inside must be POSITIVE here. Inverting these two terms fills the corner
       rect and cuts the shape out of it, which is the opposite of glass. The
       shader negates this to reach the library's convention. */
    const signed = Math.sqrt(outside[i]) - Math.sqrt(inside[i]);
    out[i] = Math.max(0, Math.min(255, Math.round((signed / range) * 127.5 + 127.5)));
  }

  return { data: out, w: mw, h: mh, range };
}

/* ------------------------------------------------------------------ *
 * SHADERS                                                             *
 * ------------------------------------------------------------------ */

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
uniform sampler2D u_sdfL;
uniform sampler2D u_sdfR;
uniform vec4      u_rectL;      // x, y, w, h in uv space, y up
uniform vec4      u_rectR;
uniform float     u_sdfRange;   // decode scale, in shape-height units
uniform float     u_shapePx;    // shape height in device pixels

uniform float u_edgeIntensity;
uniform float u_rimIntensity;
uniform float u_baseIntensity;
uniform float u_edgeDistance;
uniform float u_rimDistance;
uniform float u_baseDistance;
uniform float u_cornerBoost;
uniform float u_rippleEffect;
uniform float u_blurRadius;
uniform float u_tintOpacity;
uniform float u_warp;

varying vec2 vUv;

/* Cover-fit sample of the photograph. */
vec3 backdrop(vec2 uv) {
  return texture2D(u_backdrop, uv * u_imgScale + u_imgOffset).rgb;
}

/* THE SHAPE, replacing the library's roundedRect/circle/pill trio.
   Signed distance, negative inside, positive outside, in shape-height units.
   Outside the corner rect it returns a large positive rather than a clamped
   edge value; clamping smears the field across the viewport. */
float shapeSdf(sampler2D sdf, vec4 rect, vec2 uv) {
  vec2 local = (uv - rect.xy) / rect.zw;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) {
    return 10.0;
  }
  return -((texture2D(sdf, local).r * 2.0 - 1.0) * u_sdfRange);
}

void main() {
  vec2 uv = vUv;

  /* Pick the nearer of the two corners. Samplers cannot be chosen by a ternary
     in GLSL ES 1.00, so both are sampled and the choice is made on floats. */
  float dL = shapeSdf(u_sdfL, u_rectL, uv);
  float dR = shapeSdf(u_sdfR, u_rectR, uv);
  float useR = 0.0;  /* marked corner only */
  float dist = mix(dL, dR, useR);
  vec4  rect = mix(u_rectL, u_rectR, useR);

  float aa = 2.0 / min(u_resolution.x, u_resolution.y);
  float mask = 1.0 - smoothstep(0.0, aa, dist);

  /* Outside glass: pristine sharp backdrop. The library instead outputs alpha
     zero, because it floats over the real page rather than owning it. */
  if (mask <= 0.0001) {
    gl_FragColor = vec4(backdrop(uv), 1.0);
    return;
  }

  /* SHAPE NORMAL. The library uses normalize(coord - center), valid only when
     the shape contains its own box centre. Here it is the SDF gradient. */
  float eps = 0.003;
  float dX  = shapeSdf(u_sdfL, u_rectL, uv + vec2(eps, 0.0)) - shapeSdf(u_sdfL, u_rectL, uv - vec2(eps, 0.0));
  float dY  = shapeSdf(u_sdfL, u_rectL, uv + vec2(0.0, eps)) - shapeSdf(u_sdfL, u_rectL, uv - vec2(0.0, eps));
  float dXR = shapeSdf(u_sdfR, u_rectR, uv + vec2(eps, 0.0)) - shapeSdf(u_sdfR, u_rectR, uv - vec2(eps, 0.0));
  float dYR = shapeSdf(u_sdfR, u_rectR, uv + vec2(0.0, eps)) - shapeSdf(u_sdfR, u_rectR, uv - vec2(0.0, eps));
  vec2 shapeNormal = normalize(mix(vec2(dX, dY), vec2(dXR, dYR), useR) + 0.00001);

  /* ---- The library's falloff trio, verbatim ----
     Its normalizedDistance is the pixel depth inside the silhouette, in raw
     device pixels, exactly as the library computes it. */
  float distFromEdge = max(-dist, 0.0);
  float normalizedDistance = distFromEdge * u_shapePx;

  float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
  float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
  float rimIntensity  = exp(-normalizedDistance * u_rimDistance);

  float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
  float totalIntensity = baseComponent
                       + edgeIntensity * u_edgeIntensity
                       + rimIntensity  * u_rimIntensity;

  vec2 baseRefraction = shapeNormal * totalIntensity;

  /* CORNER BOOST, in the shape's own box coordinates. */
  vec2 local = clamp((uv - rect.xy) / rect.zw, 0.0, 1.0);
  float cornerProximityX = min(local.x, 1.0 - local.x);
  float cornerProximityY = min(local.y, 1.0 - local.y);
  float cornerDistance = max(cornerProximityX, cornerProximityY);
  float cornerNormalized = cornerDistance * u_shapePx;
  float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
  vec2 cornerRefraction = shapeNormal * cornerBoost;

  /* RIPPLE, along the silhouette. */
  vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
  float ripple = sin(distFromEdge * 25.0) * u_rippleEffect * rimIntensity;
  vec2 textureRefraction = perpendicular * ripple;

  vec2 textureCoord = uv + baseRefraction + cornerRefraction + textureRefraction;

  /* ---- 13x13 Gaussian, exactly as the library builds it ---- */
  vec3 color = vec3(0.0);
  vec2 texelSize = 1.0 / u_resolution;
  float sigma = max(u_blurRadius / 2.0, 0.0001);
  vec2 blurStep = texelSize * sigma;
  float totalWeight = 0.0;

  for (float i = -6.0; i <= 6.0; i += 1.0) {
    for (float j = -6.0; j <= 6.0; j += 1.0) {
      float d = length(vec2(i, j));
      if (d > 6.0) continue;
      float weight = exp(-(d * d) / (2.0 * sigma * sigma));
      color += backdrop(clamp(textureCoord + vec2(i, j) * blurStep, 0.002, 0.998)) * weight;
      totalWeight += weight;
    }
  }
  color /= totalWeight;

  /* ---- Vertical gradient tint, white to 0.7 ----
     Library gradientPosition is element-space y with 0 at the top; uv here is
     y-up, so it is flipped. */
  float gradientPosition = 1.0 - local.y;
  vec3 topTint = vec3(1.0, 1.0, 1.0);
  vec3 bottomTint = vec3(0.7, 0.7, 0.7);
  vec3 gradientTint = mix(topTint, bottomTint, gradientPosition);
  color = mix(color, gradientTint, u_tintOpacity);

  /* ---- Sampled backdrop gradient ----
     Three bands averaged from the backdrop above, at and below the shape,
     then blended by gradient position. The library averages 20 columns x 11
     rows per band, which is 660 taps on top of the blur - affordable on a
     50px button and not on a 400px one, so it is 8 x 5 here. Same
     construction, coarser sampling. */
  float topY = rect.y + rect.w * 0.9;
  float midY = rect.y + rect.w * 0.5;
  float botY = rect.y + rect.w * 0.1;
  vec3 topColor = vec3(0.0);
  vec3 midColor = vec3(0.0);
  vec3 bottomColor = vec3(0.0);
  float sampleCount = 0.0;
  for (float sx = 0.0; sx < 1.0; sx += 0.125) {
    for (float yOff = -2.0; yOff <= 2.0; yOff += 1.0) {
      float cx = rect.x + sx * rect.z;
      topColor    += backdrop(vec2(cx, topY + yOff * texelSize.y));
      midColor    += backdrop(vec2(cx, midY + yOff * texelSize.y));
      bottomColor += backdrop(vec2(cx, botY + yOff * texelSize.y));
      sampleCount += 1.0;
    }
  }
  topColor /= sampleCount;
  midColor /= sampleCount;
  bottomColor /= sampleCount;

  vec3 sampledGradient;
  if (gradientPosition < 0.1) {
    sampledGradient = topColor;
  } else if (gradientPosition > 0.9) {
    sampledGradient = bottomColor;
  } else {
    float transitionPos = (gradientPosition - 0.1) / 0.8;
    if (transitionPos < 0.5) {
      sampledGradient = mix(topColor, midColor, transitionPos * 2.0);
    } else {
      sampledGradient = mix(midColor, bottomColor, (transitionPos - 0.5) * 2.0);
    }
  }
  color = mix(color, sampledGradient, u_tintOpacity * 0.3);

  /* Composite against the pristine backdrop. The library instead emits the
     mask as alpha, because it floats over the live DOM. */
  gl_FragColor = vec4(mix(backdrop(uv), color, mask), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[liquid-glass-js] compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface Props {
  /** The cover photograph. Must be same-origin, or the texture upload taints. */
  src: string;
  config?: LiquidGlassConfig;
  onStatus?: (status: string) => void;
}

export default function LiquidGlassJsMaterial({ src, config, onStatus }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cfgRef = useRef<LiquidGlassConfig>(config ?? DEFAULT_LIQUID_GLASS);
  cfgRef.current = config ?? DEFAULT_LIQUID_GLASS;

  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      statusRef.current?.('no webgl context');
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      statusRef.current?.('shader compile failed - see console');
      return;
    }

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[liquid-glass-js] link failed:', gl.getProgramInfoLog(prog));
      statusRef.current?.('shader link failed - see console');
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (name: string) => gl.getUniformLocation(prog, name);
    const u = {
      resolution: U('u_resolution'),
      backdrop: U('u_backdrop'),
      imgScale: U('u_imgScale'),
      imgOffset: U('u_imgOffset'),
      sdfL: U('u_sdfL'),
      sdfR: U('u_sdfR'),
      rectL: U('u_rectL'),
      rectR: U('u_rectR'),
      sdfRange: U('u_sdfRange'),
      shapePx: U('u_shapePx'),
      edgeIntensity: U('u_edgeIntensity'),
      rimIntensity: U('u_rimIntensity'),
      baseIntensity: U('u_baseIntensity'),
      edgeDistance: U('u_edgeDistance'),
      rimDistance: U('u_rimDistance'),
      baseDistance: U('u_baseDistance'),
      cornerBoost: U('u_cornerBoost'),
      rippleEffect: U('u_rippleEffect'),
      blurRadius: U('u_blurRadius'),
      tintOpacity: U('u_tintOpacity'),
      warp: U('u_warp'),
    };

    /* Single-channel rows are not 4-byte aligned; the default UNPACK_ALIGNMENT
       of 4 makes texImage2D reject a LUMINANCE upload whose width is not a
       multiple of 4, leaving every sample 0 - which decodes to outside
       everywhere and draws no shape at all. */
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
    const texL = makeTex();
    const texR = makeTex();

    gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 14, 18, 255])
    );

    let imgW = 1;
    let imgH = 1;

    let sdfL: ReturnType<typeof buildSdf> = null;
    let sdfR: ReturnType<typeof buildSdf> = null;
    let builtFor = -1;
    let raf = 0;

    const draw = () => {
      raf = 0;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(1, Math.round(cssW * dpr));
      const H = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, W, H);

      /* Same sizing the CSS uses for the corner cards. */
      const cornerH = Math.min(470, Math.max(185, cssH * 0.42));
      const cornerW = cornerH * CORNER_ASPECT;

      const key = Math.round(cornerH);
      if (key !== builtFor) {
        sdfL = buildSdf(false, cornerW, cornerH);
        sdfR = buildSdf(true, cornerW, cornerH);
        builtFor = key;
        for (const [tex, sdf] of [
          [texL, sdfL],
          [texR, sdfR],
        ] as const) {
          if (!sdf) continue;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.LUMINANCE, sdf.w, sdf.h, 0,
            gl.LUMINANCE, gl.UNSIGNED_BYTE, sdf.data
          );
          const err = gl.getError();
          if (err) console.error('[liquid-glass-js] sdf upload failed, gl error', err);
        }
      }
      if (!sdfL || !sdfR) return;

      const rw = cornerW / cssW;
      const rh = cornerH / cssH;
      gl.uniform4f(u.rectL, 0, 0, rw, rh);
      gl.uniform4f(u.rectR, 1 - rw, 0, rw, rh);
      gl.uniform1f(u.sdfRange, sdfL.range / sdfL.h);
      gl.uniform1f(u.shapePx, cornerH * dpr);

      /* Cover fit, matching object-fit: cover on the real image. */
      const canvasAspect = cssW / cssH;
      const imgAspect = imgW / imgH;
      let sx = 1;
      let sy = 1;
      if (imgAspect > canvasAspect) sx = canvasAspect / imgAspect;
      else sy = imgAspect / canvasAspect;
      gl.uniform2f(u.imgScale, sx, sy);
      gl.uniform2f(u.imgOffset, (1 - sx) * 0.5, (1 - sy) * 0.5);

      gl.uniform2f(u.resolution, W, H);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
      gl.uniform1i(u.backdrop, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texL);
      gl.uniform1i(u.sdfL, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texR);
      gl.uniform1i(u.sdfR, 2);

      const c = cfgRef.current;
      gl.uniform1f(u.edgeIntensity, c.edgeIntensity);
      gl.uniform1f(u.rimIntensity, c.rimIntensity);
      gl.uniform1f(u.baseIntensity, c.baseIntensity);
      gl.uniform1f(u.edgeDistance, c.edgeDistance);
      gl.uniform1f(u.rimDistance, c.rimDistance);
      gl.uniform1f(u.baseDistance, c.baseDistance);
      gl.uniform1f(u.cornerBoost, c.cornerBoost);
      gl.uniform1f(u.rippleEffect, c.rippleEffect);
      gl.uniform1f(u.blurRadius, c.blurRadius);
      gl.uniform1f(u.tintOpacity, c.tintOpacity);
      gl.uniform1f(u.warp, c.warp ? 1 : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    redrawRef.current = schedule;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, texBackdrop);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const err = gl.getError();
      if (err) {
        console.error('[liquid-glass-js] backdrop upload failed (CORS?), gl error', err);
        statusRef.current?.('backdrop upload failed - see console');
        return;
      }
      canvas.setAttribute('data-live', 'true');
      statusRef.current?.('live - liquid-glass-js port');
      schedule();
    };
    img.onerror = () => {
      console.error('[liquid-glass-js] backdrop image failed to load:', src);
      statusRef.current?.('backdrop image failed to load');
    };
    img.src = src;

    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    schedule();

    return () => {
      ro.disconnect();
      redrawRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src]);

  useEffect(() => {
    redrawRef.current?.();
  }, [config]);

  return <canvas ref={canvasRef} className="case-study__glass-canvas" aria-hidden="true" />;
}
