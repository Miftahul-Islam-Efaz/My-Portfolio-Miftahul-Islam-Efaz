'use client';

import React, { useRef } from 'react';
import { useCompositor } from '../../hooks/useCompositor';
import {
  COMPOSITOR_STATEMENT,
  COMPOSITOR_ACCENT_TARGET,
  COMPOSITOR_NOTES,
  COMPOSITOR_CLOSE,
} from './compositorContent';
import {
  COMPOSITOR_ANNOTATION,
  COMPOSITOR_INK,
} from '../../config/compositor';
import '../../styles/compositor.css';

/* ------------------------------------------------------------------
   THE COMPOSITOR - markup

   Motion lives in src/hooks/useCompositor.ts, tuning in
   src/config/compositor.ts, copy in ./compositorContent.ts, and every
   interpolation in src/styles/compositor.css. This file is structure
   only.

   ------------------------------------------------------------------
   NO SVG, NO CANVAS, ON PURPOSE

   The annotation layer looks like drafting output, so the reflex is to
   reach for SVG. It is not needed and it costs measurement:

     - The baseline grid is one element with a repeating-linear-gradient.
       An 8px rhythm needs no nodes at all, and it stays correct at any
       section height without JS measuring anything.
     - The column rules are six spans scaling on Y.
     - The dimension lines are borders on the readout rows, scaling on X.

   Nothing here reads layout, so nothing here can thrash it.

   ------------------------------------------------------------------
   THE FAKE WEIGHT AXIS, IN MARKUP

   Every word is rendered TWICE - once in Cabinet Grotesk Thin (100) and
   once in Black (900), stacked exactly - and the pair is cross-faded by
   --comp-weight. No variable font exists in /public/Fonts, so this is how
   a continuous weight ramp is possible at all. See the long note in
   src/config/compositor.ts.

   THE HEAVY LAYER IS aria-hidden. Without it every word in the statement
   is announced twice by a screen reader, which would trade an animation
   for a genuinely broken reading experience.

   ------------------------------------------------------------------
   PER-ELEMENT STAGGER FROM A SINGLE SCALAR

   Each staggered node carries `--i-frac`, its own position in its group
   as a 0..1 fraction. The stylesheet turns that plus the group's global
   progress into a local progress with clamp(), so a wipe reads as a
   sweep without the hook touching individual elements.

   Each decision row is handed the beat variable it reports on via
   `--row`, so the readout lights in step with the thing it names rather
   than on a parallel timeline that could drift.
   ------------------------------------------------------------------ */

/* The custom-property cast. Required: React's CSSProperties type has no
   index signature for `--*` keys, and this is the project's established
   way of passing them (see Hero.tsx). */
const cssVars = (vars: Record<string, string | number>): React.CSSProperties =>
  vars as unknown as React.CSSProperties;

/* ROW_SOURCES lived here, mapping each decision row to the beat
   variable it reported on. Gone with the row itself. */

/* The three measurements that tick. `data-comp-num` is the hook's
   contract - it writes textContent into these and nowhere else. The
   initial values are the RAW end of each ramp, matching the armed state. */
const DIMENSIONS = [
  { key: 'scale', label: 'Size', initial: '13px' },
  { key: 'leading', label: 'Leading', initial: '2.10' },
  { key: 'weight', label: 'Weight', initial: '300' },
] as const;

export const CompositorSection: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useCompositor({ rootRef });

  return (
    <section
      ref={rootRef}
      id="the-method"
      aria-label="How I design"
      className="comp"
      /* The plate is named once, here, and every layer that needs it
         reads it from this variable. */
      style={cssVars({ '--comp-ink-image': `url(${COMPOSITOR_INK.source})` })}
    >
      {/* ---------------- ANNOTATION PLANE ----------------
          Behind the type, parallaxing against it. aria-hidden in full:
          a baseline grid is furniture for the eye and noise for a
          screen reader. */}
      {/* ---------------- THE VEIL ----------------
          The same plate, full bleed, at a few percent, masked to a soft
          oval. Without it the filled letters read as a floating texture
          with no source; with it they read as the one place the light is
          strong enough to come through. Set --comp-veil-max to 0 in
          compositor.css to remove it entirely. */}
      <div aria-hidden className="comp-veil" />

      <div aria-hidden className="comp-annotation">
        <div className="comp-grid" />
        <div className="comp-rules">
          {Array.from({ length: COMPOSITOR_ANNOTATION.columns }).map((_, i) => (
            <span
              key={i}
              className="comp-rule"
              style={cssVars({
                '--i-frac': i / (COMPOSITOR_ANNOTATION.columns - 1),
              })}
            />
          ))}
        </div>
      </div>

      <div className="comp-inner">
        {/* ---------------- THE STATEMENT ----------------
            The only thing on the page that survives to the end. */}
        <h2 className="comp-statement">
          {COMPOSITOR_STATEMENT.map((line, li) => (
            <span key={li} className={`comp-line comp-line--${line.face}`}>
              {line.words.map((word, wi) => {
                const isAccent =
                  li === COMPOSITOR_ACCENT_TARGET.line &&
                  wi === COMPOSITOR_ACCENT_TARGET.word;

                /* Too narrow to hold a photograph - see the
                   .comp-word--solid note in compositor.css. Punctuation
                   is stripped first so a bare "I" counts as one letter
                   while "it." counts as two and still fills. */
                const isSolid =
                  word.replace(/[^A-Za-z]/g, '').length <= 1;

                return (
                  <span
                    key={wi}
                    className={[
                      'comp-word',
                      isAccent ? 'comp-word--accent' : '',
                      isSolid ? 'comp-word--solid' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={cssVars({
                      '--i-frac':
                        line.words.length > 1
                          ? wi / (line.words.length - 1)
                          : 0,
                    })}
                  >
                    {/* SIZER. In flow, hidden, set in the heaviest cut -
                        it holds the box open at the widest metrics so
                        neither visible layer can overflow into the next
                        word. Without this, Black overflowed Thin's box
                        and the words collided at full weight. */}
                    <span aria-hidden className="comp-w comp-w--sizer">
                      {word}
                    </span>
                    {/* Thin cut - carries the text for assistive tech
                        and for text selection. */}
                    <span className="comp-w comp-w--light">{word}</span>
                    {/* Black cut - visual only. */}
                    <span aria-hidden className="comp-w comp-w--heavy">
                      {word}
                    </span>
                    {/* INK layer - the Black cut again, but filled with
                        the plate and clipped to the glyphs. Cross-fades
                        in over the flat one, because background-clip
                        cannot be tweened. Stays at opacity 0 until the
                        image has actually loaded. */}
                    <span aria-hidden className="comp-w comp-w--ink">
                      {word}
                    </span>
                  </span>
                );
              })}
            </span>
          ))}
        </h2>

        {/* ---------------- AFTER THE STRIP ----------------
            Hidden until RESTRAINT has pulled the scaffolding. It is the
            only claim in the section that is not self-evident, so it
            arrives last, after the proof. */}
        <p className="comp-close">{COMPOSITOR_CLOSE}</p>

      </div>

      {/* ---------------- MARGIN NOTES ----------------
          Every value here is real. Parallaxes downward while the grid
          rises, which is what separates the planes. */}
      <ul aria-hidden className="comp-notes" data-comp-strip>
        {COMPOSITOR_NOTES.map((note, i) => (
          <li
            key={note}
            className="comp-note"
            style={cssVars({
              '--i-frac': i / (COMPOSITOR_NOTES.length - 1),
            })}
          >
            {note}
          </li>
        ))}
      </ul>

      {/* ---------------- THE READOUT ----------------
          The decision index, lighting in step with the beats, plus the
          three live measurements. This is the section's usability
          affordance: it names what is happening while it happens, so the
          transformation reads as intentional rather than as a glitch. */}
      <div className="comp-readout" data-comp-strip>
        <dl className="comp-dims">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key} className="comp-dim">
              <dt className="comp-dim-label">{dim.label}</dt>
              <dd className="comp-dim-value" data-comp-num={dim.key}>
                {dim.initial}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default CompositorSection;
