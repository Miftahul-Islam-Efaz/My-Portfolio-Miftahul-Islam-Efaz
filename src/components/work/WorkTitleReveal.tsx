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
 * There is deliberately NOTHING here but the word. An ember blade used to flare
 * across mid-height before the letters opened; it read as a red glow sitting
 * behind the type and was removed. The aperture is the whole effect.
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

  useWorkTitle({ rootRef });

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
        <h2 className="wt-word" aria-label="Work">
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
