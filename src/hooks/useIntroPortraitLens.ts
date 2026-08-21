'use client';

import { useEffect, type RefObject } from 'react';

import { WORK_INTRO_REVEAL as R } from '../config/workIntroReveal';

/* ------------------------------------------------------------------
   THE PORTRAIT LENS

   Moves the revealed window to the cursor. That is the whole job.

   The portrait is two stacked images - a dithered treatment over the
   sharp photograph - and the sharp layer is masked down to a small,
   soft-edged circle by `.wi-lens-reveal` in `work-intro-reveal.css`.
   This hook writes only where that circle's centre is.

   WHY THIS IS NOT GSAP

   Everything else in this section is GSAP, so the exception needs a
   reason. GSAP is a TIMELINE engine: it is worth its weight when
   something has a duration, an ease and a trigger. This has none of
   those - it is a continuous follow with no start and no end, driven
   by the pointer rather than by time or scroll. `gsap.quickTo` would
   work, but it would mean a tween instance per axis, per mount, to do
   what two lines of lerp already do, and it would put a third owner on
   this element's custom properties alongside the reveal hook.

   THREE THINGS THIS FILE IS CAREFUL ABOUT

   1. NO LAYOUT READS. The position comes from `offsetX`/`offsetY` on
      the event, which are already relative to the frame. The obvious
      alternative - `clientX - getBoundingClientRect().left` - forces
      a layout on every pointer move, and this page is smooth-scrolled
      with Lenis, so the rect is moving too and could not be cached.
      The stylesheet makes both images `pointer-events: none` so the
      frame is always the event target; that is what keeps these
      coordinates trustworthy.

   2. ONE WRITE PER FRAME. Pointer events fire faster than the display
      refreshes, so the handler only records the target and a single
      rAF does the writing. Writing custom properties straight from
      the event handler would mean several style invalidations per
      frame for one visible result.

   3. THE LOOP STOPS. The rAF is cancelled as soon as the window has
      caught up to within `settleEpsilon`, and restarted on the next
      move. A follow loop that runs for the whole hover - or worse, for
      the whole session - is the standard way these effects quietly
      cost a frame budget while nothing is happening.
   ------------------------------------------------------------------ */

/**
 * Points the portrait's reveal window at the cursor.
 *
 * @param frameRef - The portrait frame. Must be the element carrying `.wi-lens`
 *   and must be the pointer hit target (its children are `pointer-events: none`
 *   in the stylesheet, which is what makes the event offsets meaningful).
 */
export function useIntroPortraitLens({
  frameRef,
}: {
  frameRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    /* Hover-capable, fine pointers only. On touch there is no cursor to
       follow: the window would either never appear or stay stranded wherever
       the last tap landed. The stylesheet hides the layer for these inputs
       too, so bailing here just avoids the listeners. */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    /* A window welded to the cursor is precisely the kind of motion this
       setting asks us to drop. The stylesheet also hides the layer. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const { ease, settleEpsilon } = R.portraitLens;

    // Where the pointer is, and where the window currently is. They differ by
    // the easing, and that gap is the entire feel of the effect.
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    let raf = 0;

    const write = () => {
      frame.style.setProperty('--lens-x', `${currentX}px`);
      frame.style.setProperty('--lens-y', `${currentY}px`);
    };

    const tick = () => {
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      write();

      // Chebyshev distance rather than a hypotenuse: same decision, no sqrt,
      // and at sub-pixel scale the two are indistinguishable.
      const settled =
        Math.max(Math.abs(targetX - currentX), Math.abs(targetY - currentY)) <
        settleEpsilon;

      if (settled) {
        // Land exactly on target, so a stationary cursor cannot leave the
        // window a fraction of a pixel off and permanently soft.
        currentX = targetX;
        currentY = targetY;
        write();
        raf = 0;
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    const onEnter = (event: PointerEvent) => {
      /* Snap on entry instead of easing in from wherever the pointer left last
         time. Easing here would drag the window across the face from its old
         position, which reads as a bug rather than as motion. */
      targetX = event.offsetX;
      targetY = event.offsetY;
      currentX = targetX;
      currentY = targetY;
      write();

      // Only now is the layer allowed to fade in - so it fades in already in
      // the right place, rather than appearing centred and then sliding.
      frame.classList.add('is-lens-on');
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.offsetX;
      targetY = event.offsetY;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      /* The class drives a CSS opacity transition, so the window fades out
         where it stands. The follow loop is deliberately NOT cancelled here:
         if it is still catching up, letting it finish means the window is
         fading and settling at once, which looks like it is being lifted away
         rather than switched off. It stops itself a few frames later. */
      frame.classList.remove('is-lens-on');
    };

    frame.addEventListener('pointerenter', onEnter);
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerleave', onLeave);

    return () => {
      frame.removeEventListener('pointerenter', onEnter);
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerleave', onLeave);

      if (raf) cancelAnimationFrame(raf);

      frame.classList.remove('is-lens-on');
      frame.style.removeProperty('--lens-x');
      frame.style.removeProperty('--lens-y');
    };
  }, [frameRef]);
}

export default useIntroPortraitLens;
