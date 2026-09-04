/// <reference lib="webworker" />

/**
 * THE FIELD BUILD, OFF THE MAIN THREAD.
 *
 * Rasterise, exact EDT, thirty-two blur passes and a Sobel over roughly 400k
 * texels, twice. That is a long synchronous task, and on the main thread it
 * lands precisely while the case-study window is opening. Here it costs the
 * opening animation nothing.
 *
 * The two field buffers are TRANSFERRED rather than copied, so handing back
 * ~6.4 MB is a pointer move. They are detached here afterwards, which is safe
 * because this worker is terminated after the single build it exists for.
 */

import { buildGlassField, type GlassField } from './field';

export interface FieldRequest {
  scale: number;
  depth: number;
  profile: number;
  smooth: number;
  soften: number;
  float32: boolean;
}

export type FieldResponse =
  | { ok: true; a: GlassField; b: GlassField }
  | { ok: false; error: string };

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<FieldRequest>) => {
  const options = event.data;
  try {
    const a = buildGlassField({ ...options, mirrored: false });
    const b = buildGlassField({ ...options, mirrored: true });
    ctx.postMessage({ ok: true, a, b } satisfies FieldResponse, [
      a.data.buffer,
      b.data.buffer,
    ]);
  } catch (err) {
    ctx.postMessage({ ok: false, error: String(err) } satisfies FieldResponse);
  }
};
