'use client';

/**
 * GLASS TEST BENCH.
 *
 * This mounts the REAL CaseStudyCover with the real gdrive-host data, so the
 * composition here is the live hero by construction rather than a hand-built
 * copy that can drift from it.
 *
 * THREE MATERIALS, SWITCHABLE. All draw the same authored corner shape.
 *
 *   shader lens      The supplied Shadertoy-style shader - p6 mask, rim band,
 *                    81-tap blur of a pincushion-warped sample, gradient
 *                    lighting - ported onto the shape. Every constant is the
 *                    original. No dials, because the original exposes none.
 *                    This is the default, per instruction.
 *
 *   liquid-glass-js  A port of the fragment shader from
 *                    github.com/dashersw/liquid-glass-js onto this shape,
 *                    with its own dial names and falloff maths.
 *
 *   snell            The earlier material: Snell refraction through a slab
 *                    with a real index of refraction, per-channel dispersion
 *                    and thickness-weighted scatter. Kept intact on disk
 *                    rather than overwritten, so nothing already tuned is lost.
 *
 * NO LIGHT SOURCE, NO BORDER, in any material.
 *
 * Scoped overrides, all under [data-glass-test] so the live case study is
 * untouched:
 *
 *   1. The overlay panel ships clipped away (clip-path: inset(100% 0 0 0)) and
 *      is only opened by the cs-wipe-in animation, whose duration comes from
 *      --cs-open. Nothing defines that variable on a bare route, so without
 *      this the whole panel stays shut and the page reads as black.
 *   2. The cover takes its height from the scroll context CaseStudyWindow
 *      builds, which does not exist here, so it needs an explicit 100vh.
 *   3. The two CSS corner cards (.case-study__cover-text::before/::after) are
 *      switched off, because the material draws that corner itself.
 */

import { useState } from 'react';
import CaseStudyCover from '@/components/work/case-study/CaseStudyCover';
import GlassMaterial, {
  DEFAULT_GLASS,
  type GlassConfig,
} from '@/components/work/case-study/GlassMaterial';
import LiquidGlassJsMaterial, {
  DEFAULT_LIQUID_GLASS,
  type LiquidGlassConfig,
} from '@/components/work/case-study/LiquidGlassJsMaterial';
import ShaderLensMaterial from '@/components/work/case-study/ShaderLensMaterial';
import { WORK_CASE_STUDIES } from '@/components/work/caseStudyData';
import '@/styles/work-case-study.css';

/**
 * The cover photograph, same-origin through the drive-image proxy so the WebGL
 * texture upload does not taint. Hardcoded rather than derived, because a
 * cross-origin drive URL fails the upload silently.
 */
const BACKDROP_SRC =
  '/api/drive-image?id=1qOrVw-JArkhjMA8duwhyvgR1mpt2wHnd&opt=w2400-rj';

const OVERRIDES = `
[data-glass-test] {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

[data-glass-test] .case-study__panel {
  clip-path: none !important;
  animation: none !important;
}

[data-glass-test] .case-study__scroller {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
}

[data-glass-test] .case-study__cover {
  height: 100vh;
  min-height: 100vh;
}

/* The canvas paints the photograph itself, so the cover's own img would
   double it underneath. */
[data-glass-test] .case-study__cover-image {
  opacity: 0 !important;
}

/* The material owns the corner now, so the CSS cards must go or the two
   treatments stack. */
[data-glass-test] .case-study__cover-text::before,
[data-glass-test] .case-study__cover-text::after {
  display: none !important;
}

[data-glass-test] .case-study__cover-text {
  z-index: 3;
}

.case-study__glass-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  display: block;
}

.glass-panel {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 60;
  width: 430px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 22px 24px 24px;
  border-radius: 18px;
  background: rgba(16, 24, 38, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(18px);
  color: #e8eef8;
  font-family: var(--font-body), system-ui, sans-serif;
}

.glass-panel h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.glass-panel__status {
  margin: 4px 0 14px;
  font-size: 0.82rem;
  color: rgba(232, 238, 248, 0.6);
}

.glass-panel__switch {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.glass-panel__switch button {
  flex: 1;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #e8eef8;
  font-size: 0.78rem;
  cursor: pointer;
}

.glass-panel__switch button[data-active='true'] {
  background: #2563eb;
  border-color: #2563eb;
}

.glass-panel__group {
  margin: 22px 0 14px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(232, 238, 248, 0.45);
}

.glass-panel__row {
  margin-bottom: 18px;
}

.glass-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.glass-panel__label {
  font-size: 0.92rem;
  font-weight: 500;
}

.glass-panel__value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
  color: #38bdf8;
}

.glass-panel__row input[type='range'] {
  width: 100%;
  accent-color: #2563eb;
}

.glass-panel__check {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 0.92rem;
}

.glass-panel__hint {
  margin: 6px 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(232, 238, 248, 0.5);
}

.glass-panel__note {
  margin: 18px 0 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: rgba(232, 238, 248, 0.62);
}

.glass-panel__reset {
  width: 100%;
  padding: 13px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: #e8eef8;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}

.glass-panel__reset:hover {
  background: rgba(255, 255, 255, 0.12);
}

.glass-panel__json {
  margin: 18px 0 0;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(232, 238, 248, 0.85);
  white-space: pre;
}
`;

interface Dial<K> {
  key: K;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  group?: string;
}

/**
 * THE LIBRARY DIALS. Names, ranges and meanings are the library's own, taken
 * from its README parameter table and its uniform list.
 */
type LiquidNumericKey = Exclude<keyof LiquidGlassConfig, 'warp'>;

const LIQUID_DIALS: Dial<LiquidNumericKey>[] = [
  {
    key: 'edgeIntensity',
    label: 'Edge Intensity',
    hint: 'Refraction strength at the shape edges. Multiplies exp(-distance * edgeDistance), so it is strongest exactly at the outline.',
    min: 0,
    max: 0.1,
    step: 0.001,
    group: 'Refraction',
  },
  {
    key: 'rimIntensity',
    label: 'Rim Intensity',
    hint: 'Second, wider exponential band. The screenshots read 0, so the rim term is off.',
    min: 0,
    max: 0.2,
    step: 0.001,
  },
  {
    key: 'baseIntensity',
    label: 'Base Intensity',
    hint: 'Centre distortion. The library gates this entirely behind the warp checkbox, so with warp off it does nothing however high it goes.',
    min: 0,
    max: 0.05,
    step: 0.001,
  },
  {
    key: 'edgeDistance',
    label: 'Edge Distance',
    hint: 'Falloff rate of the edge band. Higher pulls the effect tighter to the outline.',
    min: 0.05,
    max: 0.5,
    step: 0.005,
    group: 'Falloff',
  },
  {
    key: 'rimDistance',
    label: 'Rim Distance',
    hint: 'Falloff rate of the rim band.',
    min: 0.1,
    max: 2,
    step: 0.01,
  },
  {
    key: 'baseDistance',
    label: 'Base Distance',
    hint: 'Rise rate of the centre term.',
    min: 0.05,
    max: 0.3,
    step: 0.005,
  },
  {
    key: 'cornerBoost',
    label: 'Corner Boost',
    hint: 'Extra refraction near the corners of the shape box. Screenshots read 0.',
    min: 0,
    max: 0.1,
    step: 0.001,
    group: 'Surface',
  },
  {
    key: 'rippleEffect',
    label: 'Ripple Effect',
    hint: 'sin(depth * 25) displacement along the silhouette. Screenshots read 0.',
    min: 0,
    max: 0.5,
    step: 0.005,
  },
  {
    key: 'blurRadius',
    label: 'Blur Radius',
    hint: 'The 13x13 Gaussian, sigma = radius / 2, radius-culled at 6 taps as in the library.',
    min: 0,
    max: 15,
    step: 0.1,
    group: 'Blur and tint',
  },
  {
    key: 'tintOpacity',
    label: 'Tint Opacity',
    hint: 'Drives both tint passes: the white-to-0.7 vertical gradient at full weight, and the sampled backdrop gradient at 0.3 of it.',
    min: 0,
    max: 1,
    step: 0.005,
  },
];

/** The earlier material's dials, unchanged. */
const SNELL_DIALS: Dial<keyof GlassConfig>[] = [
  {
    key: 'ior',
    label: 'Index of Refraction',
    hint: 'A real glass property. 1.0 is air, 1.5 is window glass, 1.9 is sapphire, 2.4 is diamond. The view ray is bent by Snell law against this.',
    min: 1,
    max: 2.5,
    step: 0.01,
    group: 'Refraction (Snell)',
  },
  {
    key: 'thickness',
    label: 'Glass Thickness',
    hint: 'How far the refracted ray travels through the body before it exits. Thicker glass lands the sample further sideways.',
    min: 0,
    max: 0.5,
    step: 0.005,
  },
  {
    key: 'dispersion',
    label: 'Dispersion (IOR spread)',
    hint: 'Red, green and blue are each refracted with their OWN index of refraction, red bending least and blue most.',
    min: 0,
    max: 0.3,
    step: 0.002,
  },
  {
    key: 'refraction',
    label: 'Surface Curvature Gain',
    hint: 'Overall gain on the surface normal feeding the refraction.',
    min: 0,
    max: 400,
    step: 1,
  },
  {
    key: 'frost',
    label: 'Frost / Scatter',
    hint: 'Scatter taken AT the refracted coordinate, with the radius growing with thickness travelled.',
    min: 0,
    max: 8,
    step: 0.05,
    group: 'Scatter',
  },
  {
    key: 'lift',
    label: 'Scattering Lift',
    hint: 'Volumetric brightening, not a light source.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'tint',
    label: 'Tint Absorption',
    hint: 'Darkening toward a cool tone. Figma reads 0 here.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'magnify',
    label: 'Thick-Lens Magnification',
    hint: 'Contracts samples toward the shape centroid, so the interior enlarges.',
    min: 0,
    max: 1,
    step: 0.01,
    group: 'Lens geometry',
  },
  {
    key: 'bodyReach',
    label: 'Body Reach',
    hint: 'How deep into the shape the lens reaches, in shape-height units.',
    min: 0.02,
    max: 1.5,
    step: 0.01,
  },
  {
    key: 'centerLens',
    label: 'Body Lens Strength',
    hint: 'Weight of the wide body lens against the narrow bevel lens.',
    min: 0,
    max: 2,
    step: 0.01,
  },
  {
    key: 'bevel',
    label: 'Bevel Width',
    hint: 'Width of the tighter curvature band just inside the silhouette.',
    min: 0,
    max: 1.5,
    step: 0.01,
  },
  {
    key: 'edgeBias',
    label: 'Edge Bias',
    hint: '0 spreads the bend evenly across the face, 1 concentrates it at the rim.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'edgeEase',
    label: 'Edge Ease',
    hint: 'How far in from the outline the bend builds up.',
    min: 0.002,
    max: 0.4,
    step: 0.002,
  },
  {
    key: 'waviness',
    label: 'Surface Waviness',
    hint: 'Animated liquid surface noise. Non-zero starts a render loop.',
    min: 0,
    max: 1,
    step: 0.01,
  },
];

type Material = 'shader-lens' | 'liquid-glass-js' | 'snell';

export default function GlassTestPage() {
  const study = WORK_CASE_STUDIES['gdrive-host'];
  const [material, setMaterial] = useState<Material>('shader-lens');
  const [liquid, setLiquid] = useState<LiquidGlassConfig>(DEFAULT_LIQUID_GLASS);
  const [snell, setSnell] = useState<GlassConfig>(DEFAULT_GLASS);
  const [status, setStatus] = useState('initialising');

  if (!study) {
    return <main style={{ padding: 40, color: '#fff' }}>gdrive-host not found</main>;
  }

  const isLens = material === 'shader-lens';
  const isLiquid = material === 'liquid-glass-js';

  return (
    <div className="case-study" data-glass-test="true">
      <style>{OVERRIDES}</style>

      <div className="case-study__panel">
        <div className="case-study__scroller">
          <div style={{ position: 'relative' }}>
            <CaseStudyCover study={study} />
            {isLens ? (
              <ShaderLensMaterial src={BACKDROP_SRC} onStatus={setStatus} />
            ) : isLiquid ? (
              <LiquidGlassJsMaterial
                src={BACKDROP_SRC}
                config={liquid}
                onStatus={setStatus}
              />
            ) : (
              <GlassMaterial src={BACKDROP_SRC} config={snell} onStatus={setStatus} />
            )}
          </div>
        </div>
      </div>

      <aside className="glass-panel">
        <h2>
          {isLens
            ? 'Shader Lens'
            : isLiquid
              ? 'Liquid Glass Controls'
              : 'Glass Shader Properties'}
        </h2>
        <p className="glass-panel__status">status: {status}</p>

        <div className="glass-panel__switch">
          <button
            type="button"
            data-active={isLens}
            onClick={() => setMaterial('shader-lens')}
          >
            shader lens
          </button>
          <button
            type="button"
            data-active={isLiquid}
            onClick={() => setMaterial('liquid-glass-js')}
          >
            liquid-glass-js
          </button>
          <button
            type="button"
            data-active={material === 'snell'}
            onClick={() => setMaterial('snell')}
          >
            snell
          </button>
        </div>

        {isLens ? (
          <p className="glass-panel__note">
            No dials. The supplied shader hardcodes every constant - the p6 mask
            at 10000, the rim band at 9500, the gradient band at 11000, the lens
            at 5000, the 9x9 blur at half-pixel spacing - and exposes nothing to
            tune. All of them are used exactly as written. The only substitution
            is the shape itself: the superellipse is replaced by the distance
            field of the authored path, normalised by its own measured interior
            depth so the bands keep the proportions they had on the original.
          </p>
        ) : isLiquid ? (
          LIQUID_DIALS.map((d) => (
            <div key={d.key}>
              {d.group ? <div className="glass-panel__group">{d.group}</div> : null}
              <div className="glass-panel__row">
                <div className="glass-panel__head">
                  <span className="glass-panel__label">{d.label}</span>
                  <span className="glass-panel__value">{liquid[d.key].toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={liquid[d.key]}
                  onChange={(e) =>
                    setLiquid((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))
                  }
                />
                <p className="glass-panel__hint">{d.hint}</p>
              </div>
            </div>
          ))
        ) : (
          SNELL_DIALS.map((d) => (
            <div key={d.key}>
              {d.group ? <div className="glass-panel__group">{d.group}</div> : null}
              <div className="glass-panel__row">
                <div className="glass-panel__head">
                  <span className="glass-panel__label">{d.label}</span>
                  <span className="glass-panel__value">{snell[d.key].toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={snell[d.key]}
                  onChange={(e) =>
                    setSnell((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))
                  }
                />
                <p className="glass-panel__hint">{d.hint}</p>
              </div>
            </div>
          ))
        )}

        {isLiquid ? (
          <label className="glass-panel__check">
            <input
              type="checkbox"
              checked={liquid.warp}
              onChange={(e) => setLiquid((prev) => ({ ...prev, warp: e.target.checked }))}
            />
            Enable Center Warp
          </label>
        ) : null}

        {isLens ? null : (
          <button
            type="button"
            className="glass-panel__reset"
            onClick={() =>
              isLiquid ? setLiquid(DEFAULT_LIQUID_GLASS) : setSnell(DEFAULT_GLASS)
            }
          >
            {isLiquid ? 'Reset to Screenshot Config' : 'Reset to Figma-Matched Config'}
          </button>
        )}

        {isLens ? null : (
          <pre className="glass-panel__json">
            {JSON.stringify(isLiquid ? liquid : snell, null, 2)}
          </pre>
        )}
      </aside>
    </div>
  );
}
