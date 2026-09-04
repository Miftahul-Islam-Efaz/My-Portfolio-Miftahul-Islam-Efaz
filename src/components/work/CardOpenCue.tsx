'use client';

import { useEffect, useRef } from 'react';
import { CUE } from '@/config/caseStudy';
import { WORK_THEME } from './workTheme';

/**
 * THE OPEN CUE. A small square that follows the cursor while a card is
 * hovered, holding a plus. Click anywhere on the card to open its case study;
 * the cue is what says so.
 *
 * WHY IT FOLLOWS THE CURSOR RATHER THAN SITTING ON THE CARD. The cards are not
 * DOM - they are eight planes wrapped around a helix by a vertex shader, and
 * their screen positions exist only on the GPU. Pinning a DOM badge to a card
 * corner would mean re-deriving the whole helix transform on the CPU every
 * frame just to place a 34px square. The reference clip attaches its cue to
 * the pointer anyway, which is the cheaper idea AND the better one: the target
 * is the entire card, so the mark belongs on the cursor.
 *
 * IT IS pointer-events:none AND NOT A BUTTON. If the cue could take the
 * pointer, the pointer would leave the canvas the instant the cue caught up
 * with it - the engine's hit test would report no card, hover would drop, and
 * the cue would vanish under the cursor that summoned it. Every frame. So the
 * canvas keeps the pointer and owns the click; this only draws. The real
 * accessible control is the button list rendered beside the helix.
 *
 * MOTION IS RAF-LERPED, NOT TRANSITIONED. A CSS transition on `transform`
 * fights per-frame pointer updates and reads as rubber. The follow is a lerp
 * toward the live pointer at CUE.followEase, so it trails by a couple of
 * frames exactly the way the clip's does.
 */
export default function CardOpenCue({
  visible,
  pressed,
}: {
  /** True while a card is hovered AND that card has a case study to open. */
  visible: boolean;
  /** True for one press, to play the plus's quarter turn. */
  pressed: boolean;
}) {
  const cueRef = useRef<HTMLDivElement | null>(null);

  /* The pointer is read straight from the event and never stored in state -
     re-rendering React 60 times a second to move a square is the one thing
     this component must not do. */
  useEffect(() => {
    const cue = cueRef.current;
    if (!cue) return;

    const target = { x: -9999, y: -9999 };
    const shown = { x: -9999, y: -9999 };
    let seeded = false;
    let frame = 0;

    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX + CUE.offsetX;
      target.y = event.clientY + CUE.offsetY;
      /* First sample jumps rather than lerping in from off-screen, otherwise
         the cue flies across the viewport the first time it appears. */
      if (!seeded) {
        shown.x = target.x;
        shown.y = target.y;
        seeded = true;
      }
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      shown.x += (target.x - shown.x) * CUE.followEase;
      shown.y += (target.y - shown.y) * CUE.followEase;
      cue.style.transform = `translate3d(${shown.x}px, ${shown.y}px, 0)`;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={cueRef}
      aria-hidden
      className="work-cue"
      data-visible={visible ? 'true' : 'false'}
      data-pressed={pressed ? 'true' : 'false'}
      style={{
        /* Colours come from workTheme.ts for the same reason the project list
           does - one source of truth for this section's palette. */
        ['--cue-size' as string]: `${CUE.size}px`,
        ['--cue-radius' as string]: `${CUE.radius}px`,
        ['--cue-in' as string]: `${CUE.inDuration}ms`,
        ['--cue-out' as string]: `${CUE.outDuration}ms`,
        ['--cue-press' as string]: `${CUE.pressDuration}ms`,
        ['--cue-from-scale' as string]: `${CUE.fromScale}`,
        ['--cue-spin' as string]: `${CUE.spin}deg`,
        /* THE SQUARE IS THE TERRACOTTA, the plus is cut out of it. Ember is a
           mid-tone, so the off-white is the safer of the two contrasts: the
           near-black void would vanish into any dark region of a card the cue
           happens to be sitting over, leaving a solid terracotta chip with no
           plus in it. workTheme.ts allows ember on points, and a 34px mark
           under the cursor is a point. */
        ['--cue-ink' as string]: WORK_THEME.accent,
        ['--cue-paper' as string]: WORK_THEME.ember,
        ['--cue-hair' as string]: WORK_THEME.borderHair,
      }}
    >
      <span className="work-cue__box">
        <span className="work-cue__plus" />
      </span>
    </div>
  );
}
