/* ------------------------------------------------------------------
   THE DEVELOP - grain sampler

   Turns two photographs into one interleaved set of vertex attributes.
   No Three.js in here and no rendering: this file is pure CPU work,
   runs exactly once per mount, and is the only place that touches
   pixel data.

   WHY BOTH IMAGES ARE SAMPLED AT ONCE

   Every grain carries two colours - the dithered treatment it shows at
   rest, and the sharp photograph it resolves to inside the cursor's
   agitation. Sampling them together guarantees the two reads come from
   the same grid coordinate, so a grain cannot show its neighbour's
   sharp colour. That register is the whole illusion; if the two sources
   were sampled in separate passes at separate resolutions it would
   drift by a pixel and the reveal would look like a double exposure.

   WHY THIS CAN RETURN NULL, AND WHY THAT IS FINE

   getImageData throws a SecurityError on a canvas tainted by a
   cross-origin draw. Our sources are Google-hosted and were measured
   serving `access-control-allow-origin: *`, but that is a header on
   someone else's server, not a guarantee. If it disappears - or the
   file 403s, or WebGL is unavailable - this returns null, the caller
   never builds a scene, and the plain <img> portrait stays on screen.
   A visitor sees a photograph instead of an effect. Nobody sees a hole.
   ------------------------------------------------------------------ */

import { DEVELOP_SAMPLE, DEVELOP_SOURCE } from '../../../config/develop';

export type GrainField = {
  /** Final resting position of each grain, xyz, world units. */
  target: Float32Array;
  /** Per-grain random unit-ish vector driving the scatter, xyz. */
  random: Float32Array;
  /** Colour from the dithered source, rgb 0-1. */
  colorBase: Float32Array;
  /** Colour from the sharp source, rgb 0-1. */
  colorSharp: Float32Array;
  /** Per-grain 0-1 used for develop stagger and drift phase. */
  seed: Float32Array;
  count: number;
};

/* Loads an image with CORS requested up front.

   crossOrigin MUST be set before src, otherwise the browser starts the
   fetch without the header and the resulting image taints the canvas
   even if the server would have allowed it. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Draws an image into an offscreen canvas at the sample grid's size and
   reads it back. Returns null on a tainted or unreadable canvas. */
function readPixels(
  img: HTMLImageElement,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  /* Let the browser do the downscale filtering. The sources are ~640px
     wide and the grid is ~225, so this is a real minification and
     nearest-neighbour sampling would alias the dither pattern into
     moire. */
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  try {
    return ctx.getImageData(0, 0, width, height).data;
  } catch {
    /* Tainted canvas. The caller falls back to the DOM portrait. */
    return null;
  }
}

/**
 * Samples both portraits into a single grain field.
 *
 * Returns null if either image fails to load, if the canvas is tainted,
 * or if the cutoff left too few grains to be worth a draw call.
 */
export async function buildGrainField(): Promise<GrainField | null> {
  const rows = DEVELOP_SAMPLE.samplesY;
  const cols = Math.round(rows * DEVELOP_SAMPLE.aspect);

  const [baseImg, sharpImg] = await Promise.all([
    loadImage(DEVELOP_SOURCE.base),
    loadImage(DEVELOP_SOURCE.sharp),
  ]);

  /* The base treatment is required - it is what the section shows at
     rest. Without it there is no portrait to develop. */
  if (!baseImg) return null;

  const basePixels = readPixels(baseImg, cols, rows);
  if (!basePixels) return null;

  /* The sharp layer is optional. If it is missing or unreadable, grains
     resolve to their own base colour inside the agitation, so the cursor
     still displaces the suspension - it just has nothing sharper to
     show. Degrades quietly instead of failing. */
  const sharpPixels = sharpImg ? readPixels(sharpImg, cols, rows) : null;

  const height = DEVELOP_SAMPLE.height;
  const width = height * DEVELOP_SAMPLE.aspect;
  const cutoff = DEVELOP_SAMPLE.luminanceCutoff;

  /* Upper bound on kept grains. Allocating at full size and trimming
     once at the end avoids growing five arrays inside the sample loop. */
  const max = cols * rows;
  const target = new Float32Array(max * 3);
  const random = new Float32Array(max * 3);
  const colorBase = new Float32Array(max * 3);
  const colorSharp = new Float32Array(max * 3);
  const seed = new Float32Array(max);

  let n = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = (y * cols + x) * 4;

      const r = basePixels[px] / 255;
      const g = basePixels[px + 1] / 255;
      const b = basePixels[px + 2] / 255;
      const a = basePixels[px + 3] / 255;

      /* Rec. 709 luma. Perceptual weighting matters here because the
         cutoff decides the silhouette: an even average would clip the
         dark side of the face before it clipped the blue-grey backdrop. */
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) * a;
      if (lum < cutoff) continue;

      const i3 = n * 3;

      /* Grid coordinate -> world position, centred on the origin.
         y is flipped because image rows run downward and world y runs up. */
      const u = (x + 0.5) / cols;
      const v = (y + 0.5) / rows;
      target[i3] = (u - 0.5) * width;
      target[i3 + 1] = (0.5 - v) * height;
      target[i3 + 2] = 0;

      /* Scatter direction. Signed, unnormalised on purpose - normalising
         would put every suspended grain on a shell of identical radius,
         which reads as a hollow bubble rather than a cloud. */
      random[i3] = Math.random() * 2 - 1;
      random[i3 + 1] = Math.random() * 2 - 1;
      random[i3 + 2] = Math.random() * 2 - 1;

      colorBase[i3] = r;
      colorBase[i3 + 1] = g;
      colorBase[i3 + 2] = b;

      if (sharpPixels) {
        colorSharp[i3] = sharpPixels[px] / 255;
        colorSharp[i3 + 1] = sharpPixels[px + 1] / 255;
        colorSharp[i3 + 2] = sharpPixels[px + 2] / 255;
      } else {
        colorSharp[i3] = r;
        colorSharp[i3 + 1] = g;
        colorSharp[i3 + 2] = b;
      }

      seed[n] = Math.random();
      n++;
    }
  }

  /* If the cutoff ate nearly everything, the source is not what we
     think it is - a dark or failed placeholder, say. Better to show the
     DOM portrait than a handful of floating dots. */
  if (n < 2000) return null;

  return {
    target: target.subarray(0, n * 3),
    random: random.subarray(0, n * 3),
    colorBase: colorBase.subarray(0, n * 3),
    colorSharp: colorSharp.subarray(0, n * 3),
    seed: seed.subarray(0, n),
    count: n,
  };
}
