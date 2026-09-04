'use client';

import { useRef } from 'react';
import {
  WORK_TITLE as WT,
  WORK_TITLE_LETTERS,
  WORK_TITLE_LETTER_DELAYS,
  WORK_TITLE_LETTER_SPAN,
  WORK_TITLE_TRAVEL,
} from '@/config/workTitle';
import { useWorkTitle } from '@/hooks/useWorkTitle';
import { WORK_THEME } from './workTheme';
import '@/styles/work-title.css';

/**
 * WORK - "The Aperture Word".
 *
 * The work section's title, and the transition into it. The hero cut closes
 * into an anamorphic slit; the word opens back out of one, off its own centre
 * line, so the two read as the same camera rather than two separate effects.
 * Beat sheet and reasoning are in `src/config/workTitle.ts`.
 *
 * The word is drawn twice. The DOM letters below are the accessible name, the
 * no-JS default and the fallback; when WebGL is available and the display font
 * has loaded, `workTitleScene` takes over the drawing (same beats, same
 * choreography) and adds what CSS cannot: a hot rim riding the moving aperture
 * edge, anamorphic chromatic aberration while anything is in motion, film
 * grain, and an ordered-dither exit that dissolves the word into the same
 * grain the project cards are made of. The hook arms the GL layer only once
 * its first frame is real, so the two never disagree and never flash.
 *
 * MARKUP ONLY. Every moving value is a CSS custom property: the static ones are
 * set inline here, the animated ones are written by `useWorkTitle`, and
 * `work-title.css` turns them into masks and transforms. Nothing in this file
 * measures, tweens or reads layout.
 *
 * PLACEMENT IS CONSTRAINED. This must sit between `WorkIntroHeader` and
 * `DitherCarousel` and OUTSIDE the carousel's wrapper. The carousel pins itself
 * when its own wrapper reaches the top of the viewport, so anything added
 * inside that wrapper pushes the stage below the fold at the moment it pins and
 * the section jumps.
 */
export default function WorkTitleReveal() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useWorkTitle({ rootRef, canvasRef });

  return (
    <div
      ref={rootRef}
      className="wt"
      style={
        {
          /* Static inputs to the CSS maths. `--wt-span` is derived in the config
             from the delay list, so editing the delays cannot strand a
             half-open letter. */
          '--wt-span': WORK_TITLE_LETTER_SPAN,
          '--wt-drift': `${WT.driftMax}px`,
          '--wt-ink': WORK_THEME.textHi,
        } as React.CSSProperties
      }
    >
      <div className="wt-holder">
        {/*
          The accessible name lives on the heading; the letter spans are
          decorative duplicates of it. Without this, a screen reader announces
          the heading as four separate letters - "W", "O", "R", "K" - because
          each glyph is its own inline-block element.
        */}
        <h2 className="wt-word" aria-label="Works">
          {WORK_TITLE_LETTERS.map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="wt-letter"
              aria-hidden
              style={{ '--d': WORK_TITLE_LETTER_DELAYS[i] } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </h2>

        {/* The GL word. Transparent until the hook arms it via
            [data-wt-gl='on'] - see work-title.css. */}
        <canvas ref={canvasRef} className="wt-canvas" aria-hidden="true" />
      </div>

      {/*
        Scroll distance the sticky holder is held for. It has to be a sibling
        of the holder inside this wrapper - sticky is released by the wrapper's
        own bottom edge, so without this the holder would unstick immediately
        and every beat would fire at once.
      */}
      <div aria-hidden style={{ height: WORK_TITLE_TRAVEL }} />
    </div>
  );
}
