'use client';

/**
 * THE HERO IMAGE'S "CLICK TO VISIT LIVE SITE" FOLLOWER.
 *
 * The hero is one large photograph wrapped in an anchor. Nothing about a
 * photograph announces that it is a link, and printing a permanent button over
 * it would cost the picture the full-bleed quality that makes the cover work.
 * So the affordance is transient: it exists only while the pointer is over the
 * image, and it tracks the pointer so it reads as attached to the cursor rather
 * than pinned to the frame.
 *
 * WHY THE POSITION IS LERPED IN A rAF LOOP INSTEAD OF SET ON pointermove.
 * A trackpad emits pointer events faster than the display refreshes, and a
 * label written straight from the event lands on a slightly different pixel
 * every event - which reads as jitter, not as attachment. Here pointermove only
 * records a TARGET; a single animation frame walks the rendered position toward
 * it by COVER_CURSOR.follow each tick. One write per frame, and the small
 * residual lag is the entire perceived smoothness.
 *
 * The loop also stops itself. It runs only between pointerenter and the frame
 * on which the follower has converged after pointerleave, so a case study
 * sitting open with the pointer elsewhere is not paying for an idle rAF.
 *
 * WHERE IT DOES NOT RUN:
 *  - Touch. `pointerenter` from a finger fires on tap, one frame before
 *    navigation, so the cue would flash on the way out. Coarse pointers are
 *    filtered by event.pointerType and by the (hover: none) block in CSS.
 *  - prefers-reduced-motion. The cue still appears - it is an affordance, not
 *    decoration - but it is pinned to the pointer with no easing and no scale,
 *    which is handled in CSS. This hook simply skips the lerp.
 */

import { useEffect, useRef } from 'react';
import { COVER_CURSOR } from '@/config/caseStudy';

interface CoverCursorRefs {
  /** The hover surface - the anchor wrapping the cover image. */
  areaRef: React.RefObject<HTMLAnchorElement | null>;
  /** The follower itself. Positioned with a transform, never with top/left. */
  cueRef: React.RefObject<HTMLSpanElement | null>;
}

export function useCoverCursor({ areaRef, cueRef }: CoverCursorRefs): void {
  /** Rendered vs. desired position, in area-local px. Refs, not state: this
   *  changes every frame and must never queue a React render. */
  const shown = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const area = areaRef.current;
    const cue = cueRef.current;
    if (!area || !cue) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const write = () => {
      cue.style.transform = `translate3d(${shown.current.x}px, ${shown.current.y}px, 0)`;
    };

    const tick = () => {
      const ease = reduced ? 1 : COVER_CURSOR.follow;
      const dx = target.current.x - shown.current.x;
      const dy = target.current.y - shown.current.y;

      shown.current.x += dx * ease;
      shown.current.y += dy * ease;
      write();

      /* Converged AND the pointer has left: nothing left to animate, so give
       * the frame back rather than looping on sub-pixel deltas forever. */
      if (!active.current && Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf.current === null) raf.current = requestAnimationFrame(tick);
    };

    const setTarget = (event: PointerEvent) => {
      const box = area.getBoundingClientRect();
      target.current.x = event.clientX - box.left + COVER_CURSOR.offsetX;
      target.current.y = event.clientY - box.top + COVER_CURSOR.offsetY;
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      active.current = true;
      setTarget(event);
      /* Land the follower AT the pointer, not at wherever it was last seen -
       * otherwise re-entering the image drags the label across the frame. */
      shown.current.x = target.current.x;
      shown.current.y = target.current.y;
      write();
      area.dataset.cue = 'on';
      start();
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !active.current) return;
      setTarget(event);
      start();
    };

    const onLeave = () => {
      active.current = false;
      area.dataset.cue = 'off';
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      area.dataset.cuePress = 'true';
    };

    const onUp = () => {
      area.dataset.cuePress = 'false';
    };

    area.addEventListener('pointerenter', onEnter);
    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);
    area.addEventListener('pointerdown', onDown);
    area.addEventListener('pointerup', onUp);

    return () => {
      area.removeEventListener('pointerenter', onEnter);
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      area.removeEventListener('pointerdown', onDown);
      area.removeEventListener('pointerup', onUp);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      active.current = false;
    };
  }, [areaRef, cueRef]);
}
