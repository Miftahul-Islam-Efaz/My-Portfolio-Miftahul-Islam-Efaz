'use client';

import React, { useRef } from 'react';

import {
  CUT_AIR,
  CUT_COLUMN_DELAYS,
  CUT_COLUMN_SPAN,
  CUT_TRAVEL,
} from '../../config/heroToWorkCut';
import useHeroToWorkCut from '../../hooks/useHeroToWorkCut';
import { WORK_THEME } from '../work/workTheme';
import '../../styles/hero-to-work-cut.css';

type HeroToWorkCutProps = {
  /** The outgoing section. The hero - this component consumes it. */
  children: React.ReactNode;
};

/**
 * "The cut" - the hero -> work transition.
 *
 * A cinematic hard cut, played out over scroll. The hero is held on screen and
 * CONSUMED: letterboxed down to an anamorphic slit, flared with a light leak at
 * the closing frame, then taken away in vertical columns that rise on staggered
 * delays and hand off to the work section's black.
 *
 * ---------------------------------------------------------------------------
 * Why the hero is a child
 * ---------------------------------------------------------------------------
 * This replaced a decorative gradient band that sat BETWEEN the two sections.
 * That could never read as cinematic, because nothing happened to the hero -
 * it scrolled away on its own while a faint glow passed by underneath.
 *
 * A cut is something that happens TO the outgoing shot. So the transition owns
 * the hero rather than sitting next to it: it takes it as a child, holds it
 * with `position: sticky`, and choreographs its exit. Everything about the
 * boundary now lives in one component, one config and one stylesheet.
 *
 * ---------------------------------------------------------------------------
 * The beats
 * ---------------------------------------------------------------------------
 *   1. squeeze - letterbox bars close from top and bottom to a 2.39:1 slit,
 *                the frame dollies back, and the type stack sinks and fades
 *                out ahead of the bars so it is never caught halfway under one
 *   2. flare   - an anamorphic light leak blooms along the closing slit and
 *                streaks wide as it dies. This is the cut.
 *   3. wipe    - the frame is taken away in vertical COLUMNS, each rising from
 *                below on its own delay, so the leading edge is a staircase
 *                that assembles itself across the frame
 *   4. hold    - solid black, so releasing the sticky frame is invisible.
 *
 * The beats overlap deliberately. A cut is one event, not three animations in
 * a queue - the flare peaks while the bars are still moving, and the wipe
 * starts before the flare is done. Timings are in `config/heroToWorkCut.ts`.
 *
 * ---------------------------------------------------------------------------
 * NO DIVIDER, NO STREAKS
 * ---------------------------------------------------------------------------
 * Nothing here draws a line across the page, and the work section's old
 * `border-t` stays removed. The bars stop at a slit instead of meeting.
 *
 * An earlier version also hung tapered vertical light streaks below the slit
 * ("the rake"). It was rejected twice for reading as drawn lines over the
 * picture rather than as light. Below the slit is BLACK - do not reintroduce
 * streak decoration there.
 *
 * Pure markup - no state, no effects beyond the one scroll hook. React never
 * re-renders while scrolling; the hook writes custom properties on the wrapper
 * and the layers derive everything they need from them.
 */
function HeroToWorkCut({ children }: HeroToWorkCutProps) {
  const cutRef = useRef<HTMLDivElement>(null);

  useHeroToWorkCut({ targetRef: cutRef });

  return (
    <div
      ref={cutRef}
      className="cut"
      style={
        {
          // Authored once in config, consumed by the stylesheet.
          '--cut-air': CUT_AIR,
          // The flare's warm bloom comes from the work theme's ember, so the
          // cut and the section it lands in can never drift apart.
          '--cut-ember': WORK_THEME.ember,
          // Column geometry and timing compensation. Set once here rather than
          // per column, and never written during scroll.
          '--cut-cols': CUT_COLUMN_DELAYS.length,
          '--cut-col-span': CUT_COLUMN_SPAN,
        } as React.CSSProperties
      }
    >
      {/* Held frame. Sticks to the top of the viewport for the whole cut. */}
      <div className="cut-holder">
        {/* The outgoing section, on its own transform layer for the dolly. */}
        <div className="cut-frame">{children}</div>

        {/* Layer order IS the composite order, so it is the shot's optics:
            vignette darkens the frame, the bars crop it, the flare and burn are
            light in front of everything, and the columns close over the lot. */}
        <div className="cut-layer cut-vignette" aria-hidden="true" />
        <div className="cut-bar cut-bar--top" aria-hidden="true" />
        <div className="cut-bar cut-bar--bottom" aria-hidden="true" />
        <div className="cut-layer cut-flare" aria-hidden="true" />
        <div className="cut-layer cut-burn" aria-hidden="true" />

        {/* The column wipe.

            Each column carries its index and its start delay as inline custom
            properties, set ONCE at mount. During scroll the hook writes a
            single number - `--cut-curtain` - and every column derives its own
            progress from it in CSS. Sixteen elements, one style write per
            frame.

            Index 0 is the left-most column and leads the wipe; reverse
            CUT_COLUMN_DELAYS to make the staircase travel the other way. */}
        <div className="cut-layer cut-curtain" aria-hidden="true">
          {CUT_COLUMN_DELAYS.map((delay, index) => (
            <div
              key={index}
              className="cut-col"
              style={
                {
                  '--i': index,
                  '--d': delay,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* Scroll distance the cut plays over. This empty element is what holds
          the sticky frame in place - the choreography budget, expressed as
          document height. */}
      <div aria-hidden="true" style={{ height: CUT_TRAVEL }} />

      {/* A beat of black for the cut to land in. */}
      <div className="cut-air" aria-hidden="true" />
    </div>
  );
}

export default React.memo(HeroToWorkCut);
