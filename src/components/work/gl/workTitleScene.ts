import * as THREE from 'three';

import {
  WORK_TITLE as WT,
  WORK_TITLE_GL as GL,
  WORK_TITLE_LETTERS,
  WORK_TITLE_LETTER_DELAYS,
  WORK_TITLE_LETTER_SPAN,
} from '../../../config/workTitle';

/* ------------------------------------------------------------------
   WORK TITLE - the GL word

   Draws WORKS on a single textured quad, driven by the same three
   beats the CSS aperture uses (open / push / out), so the DOM word
   and this one can never disagree - whichever is visible is showing
   the same state. The hook (useWorkTitle) arms this only after the
   first real frame exists; until then the DOM aperture plays alone,
   and it stays the no-WebGL / no-font / reduced-motion title.

   What GL adds, none of which CSS can do to text:

     1. A hot rim riding the MOVING edge of the aperture - ember at
        its core, near-white at its peak, alive only while the reveal
        is actually working. The old ember blade failed because it
        was parked behind the word; this one is attached to the act
        of opening and dies as each letter completes.
     2. Anamorphic chromatic aberration - horizontal fringes that
        wake with motion and settle to a whisper at rest, echoing the
        2.39:1 slit the hero cut closes into.
     3. Film grain, on the ink and a whisper of it over the field, so
        the frame is never digitally dead.
     4. An exit that breaks the word into the same ordered Bayer
        dither the project cards dissolve into in the carousel below -
        the title and the work read as one material.

   ONE QUAD, NOT FIVE PLANES. The per-letter stagger lives in the
   fragment shader: the atlas records each letter's x-range and delay,
   and every fragment derives its own letter's progress. That keeps
   the whole effect one draw call with no geometry to kern by hand.
   ------------------------------------------------------------------ */

export type WorkTitleBeats = {
  /** Eased aperture progress, 0..1. Per-letter delays are applied in-shader. */
  open: number;
  /** Word scale, 1..pushTo. */
  push: number;
  /** Dissolve progress, 0..1. */
  out: number;
};

export type WorkTitleScene = {
  setBeats: (beats: WorkTitleBeats) => void;
  resize: () => void;
  render: (seconds: number) => void;
  dispose: () => void;
  /** Resolves true once the word can actually be drawn (context up, font
      loaded, atlas rasterised). False means the DOM title stays in charge;
      nothing is left half-built in that case. */
  ready: Promise<boolean>;
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* The letter count is baked into the shader as a literal: uniform array
   sizes and loop bounds must be compile-time constants. */
const buildFragment = (letterCount: number) => /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uOpen;
  uniform float uMotion;
  uniform float uOut;
  uniform float uTime;
  uniform float uDriftUv;
  uniform float uSpan;
  uniform vec4 uLetters[${letterCount}];
  uniform vec3 uInk;
  uniform vec3 uEmber;
  uniform float uAberr;
  uniform float uAberrMotion;
  uniform float uRimStrength;
  uniform float uRimSigma;
  uniform float uGrain;
  uniform float uGrainField;
  uniform float uDitherScale;

  varying vec2 vUv;

  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = vUv;

    /* Which letter this fragment belongs to. Gaps keep the last delay;
       there is no ink in a gap, so the choice is invisible either way. */
    float delay = uLetters[${letterCount} - 1].z;
    for (int i = 0; i < ${letterCount}; i++) {
      vec4 L = uLetters[i];
      if (uv.x >= L.x && uv.x < L.y) delay = L.z;
    }
    float l = clamp(uOpen * uSpan - delay, 0.0, 1.0);

    /* The last few pixels of rise. Sampling in letter space means the mask
       travels WITH the glyph, exactly as the CSS version's translate + mask
       pair does. */
    float shift = (1.0 - l) * uDriftUv;
    vec2 suv = vec2(uv.x, uv.y + shift);

    /* The aperture: a band opening off the glyph's own centre line, the top
       and bottom extremes of the letterform arriving last. */
    float band = l * 0.5;
    float feather = max(l * 0.03, 1e-5);
    float d = abs(suv.y - 0.5);
    float mask = l <= 0.0 ? 0.0 : 1.0 - smoothstep(band, band + feather, d);

    /* Anamorphic chromatic aberration: horizontal fringes that wake with
       motion and settle to a whisper at rest. */
    /* The fringes die before the dissolve begins - cells breaking apart in
       rainbow read as a rendering bug, cells breaking apart in ink read as
       grain. */
    float ca =
      (uAberr + uAberrMotion * uMotion) * (1.0 - 0.85 * smoothstep(0.0, 0.6, uOut));
    float aR = texture2D(uMap, suv + vec2(ca, 0.0)).a;
    float aG = texture2D(uMap, suv).a;
    float aB = texture2D(uMap, suv - vec2(ca, 0.0)).a;
    vec3 ink = uInk * vec3(aR, aG, aB);
    float alpha = mask * max(aG, 0.75 * max(aR, aB));

    /* The rim. The moving edge of the aperture burns where it is currently
       revealing the glyph - alive only while l is mid-flight and the scroll
       is moving, gone by the time the letter is whole. */
    float rim = exp(-pow((d - band) / max(uRimSigma, 1e-4), 2.0));
    float rimLive =
      (1.0 - smoothstep(0.82, 1.0, l)) * smoothstep(0.02, 0.2, l);
    float rimOnInk = smoothstep(0.05, 0.5, aG);
    vec3 rimCol = mix(uEmber, vec3(1.0, 0.97, 0.92), 0.62);
    ink +=
      rimCol * rim * rimLive * rimOnInk * uRimStrength *
      (0.35 + 0.65 * min(1.0, uMotion * 3.0));

    /* The exit: the word breaks into the same ordered dither the project
       cards dissolve into. Cells are hashed a touch so they don't all pop
       on the same threshold. */
    vec2 cellCoord = floor(gl_FragCoord.xy / uDitherScale);
    float cell = bayer8(cellCoord);
    /* Must clear the Bayer ceiling at uOut = 1. The grid's highest cells
       sit at 63/64, about 0.984 - a threshold that tops out below that
       (the old 0.9 + 0.25*hash) lets the strongest cells survive the exit
       and hang on the black as stray dots. 1.05 + 0.2*hash puts every
       cell's threshold past the ceiling. */
    float t = uOut * (1.05 + 0.2 * hash12(cellCoord));
    alpha *= step(t, cell);
    /* Hard zero at the very end, belt and braces: the dissolve must
       FINISH, not asymptotically approach. */
    alpha *= 1.0 - smoothstep(0.96, 1.0, uOut);
    ink *= 1.0 - 0.4 * smoothstep(0.72, 1.0, uOut);

    /* Film grain - mostly on the ink, a whisper over the black field. */
    float g = hash12(gl_FragCoord.xy + floor(uTime * 24.0) * 71.7);
    ink += (g - 0.5) * uGrain * alpha;
    float field = (g - 0.5) * 2.0 * uGrainField;

    float a = clamp(alpha + abs(field), 0.0, 1.0);
    gl_FragColor = vec4(ink + uInk * max(field, 0.0), a);
  }
`;

type Atlas = {
  texture: THREE.CanvasTexture;
  ranges: THREE.Vector4[];
  width: number;
  height: number;
  fontPx: number;
};

/* sRGB hex -> vec3 with NO colour management. The shader writes straight
   to the default framebuffer, so the values must be exactly the CSS ones
   or the GL word and the DOM word would be two different off-whites. */
const hexVec3 = (hex: string) =>
  new THREE.Vector3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );

function buildAtlas(): Atlas {
  const word = WORK_TITLE_LETTERS.join('');
  const fontPx = GL.atlasFontPx;
  const font = `700 ${fontPx}px ${GL.fontStack}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.font = font;

  /* Cumulative measureText widths, so pair kerning is included in every
     advance. Letter-by-letter drawing at those positions preserves it. */
  const cumulative: number[] = [];
  for (let i = 1; i <= word.length; i++) {
    cumulative.push(ctx.measureText(word.slice(0, i)).width);
  }
  /* The CSS version's letter-spacing: -0.02em, in atlas px. */
  const gap = -0.02 * fontPx;
  const inkWidth = cumulative[cumulative.length - 1] + gap * (word.length - 1);

  const metrics = ctx.measureText(word);
  const ascent = metrics.actualBoundingBoxAscent || fontPx * 0.76;
  const descent = metrics.actualBoundingBoxDescent || 0;

  /* Headroom on all sides: the drift samples past the glyph top while the
     letters settle, and ClampToEdge must read transparent pad, never ink. */
  const padX = Math.ceil(fontPx * 0.08);
  const padY = Math.ceil(fontPx * 0.2);

  const width = Math.ceil(inkWidth + padX * 2);
  const height = Math.ceil(ascent + descent + padY * 2);
  canvas.width = width;
  canvas.height = height;

  /* Resizing the canvas resets the context state - re-apply. */
  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const ranges: THREE.Vector4[] = [];
  let x = padX;
  for (let i = 0; i < word.length; i++) {
    const advance =
      i === 0 ? cumulative[0] : cumulative[i] - cumulative[i - 1];
    ctx.fillText(word[i], x, padY + ascent);
    ranges.push(
      new THREE.Vector4(
        x / width,
        (x + advance) / width,
        WORK_TITLE_LETTER_DELAYS[i],
        0,
      ),
    );
    x += advance + gap;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return { texture, ranges, width, height, fontPx };
}

export function createWorkTitleScene(
  canvas: HTMLCanvasElement,
): WorkTitleScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      /* Transparent: the section's own black shows through, so the canvas
         never has to agree with a CSS colour. Same rule as the desk. */
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.setClearAlpha(0);
  /* The shader outputs display-space values by construction - a tone curve
     would only move the ink off the CSS colour it must match. */
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  /* Orthographic: the word is flat type, and the px-to-world mapping for
     matching the CSS font size is trivial when there is no perspective. */
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  const beats: WorkTitleBeats = { open: 1, push: 1, out: 0 };
  const prev = { open: 1, push: 1, out: 0 };
  /* Smoothed scroll-velocity envelope. Drives the aberration and the rim:
     both should be loud while anything moves and calm when it rests. */
  let motion = 0;

  let atlas: Atlas | null = null;
  let mesh: THREE.Mesh | null = null;
  let uniforms: Record<string, THREE.IUniform> | null = null;
  let fitW = 0;
  let fitH = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = -aspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();

    if (!atlas || !uniforms) return;

    /* Match the CSS clamp(3.5rem, 19vw, 18rem) exactly, then convert to
       world units: the camera's visible height is 2, so one css px is
       2/h world units. */
    const cssFontPx = Math.min(Math.max(56, 0.19 * w), 288);
    const worldPerPx = 2 / h;
    const atlasScale = cssFontPx / atlas.fontPx;
    fitW = atlas.width * atlasScale * worldPerPx;
    fitH = atlas.height * atlasScale * worldPerPx;

    /* The CSS drift is WT.driftMax screen px; in uv of the quad's height. */
    uniforms.uDriftUv.value = (WT.driftMax * worldPerPx) / fitH;
  };

  const ready = (async (): Promise<boolean> => {
    try {
      const word = WORK_TITLE_LETTERS.join('');
      const spec = `700 ${GL.atlasFontPx}px "Boreck"`;
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3000),
      );

      /* Empty array = the face isn't registered; give it one more chance
         after the full font set settles, then give up to the DOM title. */
      let faces = await Promise.race([
        document.fonts.load(spec, word),
        timeout,
      ]);
      if (!faces || faces.length === 0) {
        await document.fonts.ready;
        faces = await Promise.race([document.fonts.load(spec, word), timeout]);
      }
      if (!faces || faces.length === 0) return false;

      atlas = buildAtlas();

      uniforms = {
        uMap: { value: atlas.texture },
        uOpen: { value: 1 },
        uMotion: { value: 0 },
        uOut: { value: 0 },
        uTime: { value: 0 },
        uDriftUv: { value: 0 },
        uSpan: { value: WORK_TITLE_LETTER_SPAN },
        uLetters: { value: atlas.ranges },
        uInk: { value: hexVec3(GL.ink) },
        uEmber: { value: hexVec3(GL.ember) },
        uAberr: { value: GL.aberration },
        uAberrMotion: { value: GL.aberrationMotion },
        uRimStrength: { value: GL.rimStrength },
        uRimSigma: { value: GL.rimSigma },
        uGrain: { value: GL.grain },
        uGrainField: { value: GL.grainField },
        uDitherScale: { value: GL.ditherScale },
      };

      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: buildFragment(atlas.ranges.length),
          uniforms,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      );
      mesh.frustumCulled = false;
      scene.add(mesh);

      resize();
      return true;
    } catch {
      return false;
    }
  })();

  const render = (seconds: number) => {
    if (!mesh || !uniforms) return;

    const d =
      Math.abs(beats.open - prev.open) +
      Math.abs(beats.push - prev.push) * 0.7 +
      Math.abs(beats.out - prev.out) * 0.9;
    prev.open = beats.open;
    prev.push = beats.push;
    prev.out = beats.out;
    /* Fast attack, slow release: the fringes and the rim should catch the
       first pixel of movement and then settle, not snap off. */
    const instant = Math.min(d * 14, 1);
    motion += (instant - motion) * (instant > motion ? 0.5 : 0.08);

    uniforms.uOpen.value = beats.open;
    uniforms.uMotion.value = motion;
    uniforms.uOut.value = beats.out;
    uniforms.uTime.value = seconds;

    mesh.scale.set(fitW * beats.push, fitH * beats.push, 1);

    renderer.render(scene, camera);
  };

  const dispose = () => {
    atlas?.texture.dispose();
    if (mesh) {
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    }
    renderer.dispose();
  };

  resize();

  return {
    setBeats: (next) => {
      beats.open = next.open;
      beats.push = next.push;
      beats.out = next.out;
    },
    resize,
    render,
    dispose,
    ready,
  };
}
