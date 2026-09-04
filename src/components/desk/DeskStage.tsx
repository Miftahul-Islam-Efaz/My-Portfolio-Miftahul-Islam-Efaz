'use client';

import React from 'react';

import {
  DESK_LAYOUT,
  DESK_STARS,
  DESK_STAR_OPACITY,
} from '../../config/deskStage';
import { useDeskStage } from '../../hooks/useDeskStage';
import {
  DESK_CANVAS_LABEL,
  DESK_STATEMENT,
  DESK_STATEMENT_LEAD,
  DESK_STAR_ALT,
} from './deskContent';
import '../../styles/desk-stage.css';

/* ------------------------------------------------------------------
   THE DESK

   The opening beat of the work section, in the slot THE COMPOSITOR used
   to hold. A laptop rises into frame and opens itself, two stars arrive
   from opposite corners, the machine steps aside and the statement comes
   out from behind it, then the whole plane leaves upward and hands over
   to WORK.

   This file is markup only. Every number lives in config/deskStage.ts,
   every interpolation in styles/desk-stage.css, all the motion in
   hooks/useDeskStage.ts and the laptop itself in gl/laptopScene.ts.

   ------------------------------------------------------------------
   THE DOM IS NOT A DECORATION OF THE CANVAS

   The statement is real text, positioned and styled in CSS, not drawn
   into the WebGL layer. It is therefore selectable, searchable, and
   available to a screen reader, and it survives every way the canvas can
   fail - no WebGL, a blocked GLB, a Draco decoder that 404s. The CSS
   defaults are the composed state, so any of those failures leaves a
   still, correctly laid out section rather than an empty black screen.

   This is the opposite decision to THE RAKE, where the type IS the mask
   and has to be drawn into a canvas for the light to bevel its edges.
   There, DOM copy is a hidden mirror of the shader. Here the type is
   never lit, so there is no reason to give up real text.

   The stars and the statement sit UNDER the canvas in the stacking
   order, and the canvas is transparent. So the laptop genuinely occludes
   both of them - the crop on each star's inner arm and the type emerging
   from behind the machine are real occlusion, not faked with masks.
   ------------------------------------------------------------------ */

const cssVars = (
  vars: Record<string, string | number>,
): React.CSSProperties => vars as unknown as React.CSSProperties;

/* The two stars differ in which insets they set - one is anchored
   top/right, the other bottom/left - so the tuple in config is a union of
   two shapes. Widened once, here, rather than narrowed at four property
   accesses inside the map. */
type StarSpec = {
  key: string;
  size: string;
  fromX: number;
  fromY: number;
  rotate: number;
  pushX: number;
  pushY: number;
  depth: number;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};

const STARS = DESK_STARS.items as unknown as readonly StarSpec[];

export const DeskStage: React.FC = () => {
  const { rootRef, canvasRef } = useDeskStage();

  return (
    <section
      id="the-desk"
      aria-label="What I build"
      className="desk"
      ref={rootRef as React.RefObject<HTMLElement>}
      style={cssVars({ '--desk-scroll-vh': `${DESK_LAYOUT.scrollVh}vh` })}
    >
      {/* Sticky, NOT pinned. The invariant is documented in
          config/deskStage.ts and useDeskStage.ts; the short version is
          that a pin here silently moves the pinned helix below it. */}
      <div className="desk-stage">
        {/* One plane, so the closing beat is a single transform rather
            than the same translate repeated on every layer. */}
        <div className="desk-plane">
          <canvas
            ref={canvasRef}
            className="desk-canvas"
            role="img"
            aria-label={DESK_CANVAS_LABEL}
          />

          {STARS.map((star) => (
            /* eslint-disable-next-line @next/next/no-img-element --
               SELF-HOSTED ON PURPOSE, AND A PLAIN <img> ON PURPOSE.

               This was first hotlinked from the Drive URL, the way
               COMPOSITOR_INK loads its plate, and it rendered NOTHING.
               The URL is not broken - fetched from a terminal it returns
               200 and a valid 1600x1600 PNG. It fails in the browser,
               because Google serves lh3.googleusercontent.com/d/<id> to
               a request with no Referer and 403s the same request when
               one is attached. Hence public/stars/star.png.

               next/image is skipped because this is a local, fixed-size
               decorative mark whose transform this section drives every
               frame; the wrapper element it returns is one more box to
               fight for that transform, in exchange for optimisation
               work already done. */
            <img
              key={star.key}
              className="desk-star"
              src={DESK_STARS.source}
              alt={DESK_STAR_ALT}
              aria-hidden="true"
              draggable={false}
              /* Decorative, but it is the first thing to arrive in the
                 section and a lazy star that decodes late is a star that
                 visibly pops in mid-beat. Same-origin and 212 KB, so
                 eager is cheap. */
              decoding="async"
              style={cssVars({
                ...(star.top ? { top: star.top } : {}),
                ...(star.right ? { right: star.right } : {}),
                ...(star.bottom ? { bottom: star.bottom } : {}),
                ...(star.left ? { left: star.left } : {}),
                '--size': star.size,
                '--from-x': `${star.fromX}%`,
                '--from-y': `${star.fromY}%`,
                '--push-x': `${star.pushX}%`,
                '--push-y': `${star.pushY}%`,
                '--rotate': `${star.rotate}deg`,
                '--depth': star.depth,
                '--star-opacity': DESK_STAR_OPACITY,
              })}
            />
          ))}

          {/* Placeholder copy from the mockup - he intends to rewrite it.
              Lives in deskContent.ts so that is a one-line change. */}
          <p className="desk-statement">
            {DESK_STATEMENT.map((line, index) => (
              <span
                key={line}
                className={`desk-line ${
                  index === DESK_STATEMENT_LEAD
                    ? 'desk-line--main'
                    : 'desk-line--lead'
                }`}
              >
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
};

export default DeskStage;
