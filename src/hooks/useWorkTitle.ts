'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WORK_TITLE as WT } from '@/config/workTitle';
import {
  createWorkTitleScene,
  type WorkTitleScene,
} from '@/components/work/gl/workTitleScene';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   WORK TITLE - "THE APERTURE WORD", DRAWN IN GL WHEN IT CAN BE

   Drives the title transition from scroll progress. See
   `src/config/workTitle.ts` for the beat sheet and the reasoning.

   The word exists twice: DOM letters under the CSS aperture mask (the
   accessible name, the no-JS default, the fallback) and a GL quad
   drawn by `workTitleScene` (the effect - rim light on the moving
   aperture edge, chromatic aberration, grain, the dithered exit).
   Both are fed by the SAME write() below, so they can never disagree;
   the DOM copy is only hidden once the GL pass has a real frame in
   its buffer.

   WHAT THIS HOOK IS ALLOWED TO TOUCH

   Custom properties on the root element, and `scene.setBeats()`. It
   never tweens a transform, an opacity or a mask directly. One owner
   per property - the same rule every section here follows.

   THE LOOP PARKS, AND write() IS NOT A RENDER

   Same contract as useDeskStage: the rAF loop runs only while the
   section is in view, setBeats() only STORES numbers, and any path
   that changes the beats while the loop is parked must be followed
   by drawOnce() or the canvas shows a stale frame. That is why
   onRefresh calls both.

   DECLARATION ORDER IS LOAD-BEARING: the loop state, tick, wake and
   drawOnce are declared ABOVE ScrollTrigger.create(), because GSAP
   fires onRefresh and onToggle synchronously during creation. Do not
   move them below it.
   ------------------------------------------------------------------ */

/** 0 before `from`, 1 after `to`, linear between. */
const ramp = (p: number, from: number, to: number) =>
  gsap.utils.clamp(0, 1, (p - from) / (to - from));

/** Smoothstep. Takes the corners off a linear ramp without an easing curve. */
const ease = (t: number) => t * t * (3 - 2 * t);

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

export function useWorkTitle({
  rootRef,
  canvasRef,
}: {
  rootRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* Reduced motion: create nothing and write nothing. The stylesheet's
       defaults are already the finished word, and its media query drops the
       sticky holder so there is no empty scroll distance to sit through. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    /* Null when WebGL is unavailable - the DOM aperture then simply stays
       the title, which is why it is maintained rather than deleted. */
    const scene: WorkTitleScene | null = canvas
      ? createWorkTitleScene(canvas)
      : null;

    const set = gsap.quickSetter(root, 'css') as (vars: object) => void;

    /* GL is "armed" once its first frame is real - see the ready handler
       below. Until then the DOM word owns the screen. */
    let armed = false;
    let disposed = false;

    /* ---- THE LOOP ----
       Runs while the section is in view. Grain and the motion envelope
       want a frame even when the scroll is still, so it does not idle
       itself the way the desk's does - it parks only when invisible. */
    let visible = false;
    let frame = 0;

    const tick = (now: number) => {
      scene?.render(now / 1000);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (frame || !visible || !armed) return;
      frame = requestAnimationFrame(tick);
    };

    /* Paint ONE frame with the current beats without starting the loop -
       the redraw half of every refresh, so a bounds change while the
       section is parked can't leave the canvas a beat behind the DOM. */
    const drawOnce = () => {
      if (frame || !armed || !scene) return;
      scene.render(performance.now() / 1000);
    };

    const write = (p: number) => {
      /* The aperture. Smoothstepped so the letters do not begin opening at
         full rate the instant the range starts. */
      const open = ease(ramp(p, WT.openStart, WT.openEnd));

      /* The push-through and the dissolve. */
      const push = ease(ramp(p, WT.pushStart, WT.pushEnd));
      const out = ramp(p, WT.outStart, WT.outEnd);
      const scale = mix(1, WT.pushTo, push);

      set({
        '--wt-open': open,
        '--wt-push': scale,
        '--wt-out': 1 - out,
      });

      scene?.setBeats({ open, push: scale, out });
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: WT.start,
      end: WT.end,
      scrub: true,
      onUpdate: (self) => write(self.progress),
      /* Re-assert on refresh: a resize or a font swap can change where the
         holder is released, and without this the title keeps whatever state
         it held before the measurement changed. drawOnce() keeps the canvas
         in the same state as the DOM the same frame. */
      onRefresh: (self) => {
        write(self.progress);
        drawOnce();
      },
      onToggle: (self) => {
        visible = self.isActive;
        if (visible) wake();
      },
    });

    visible = trigger.isActive;
    write(trigger.progress);

    /* The atlas needs the display font, so the GL word cannot exist
       synchronously. The DOM aperture plays exactly as it always has until
       the scene reports ready; the handover then happens mid-state and is
       invisible at any scroll position, because both are driven by the same
       write(). A `false` resolution (no WebGL, no font, no 2d context)
       leaves the DOM title in charge permanently. */
    scene?.ready.then((ok) => {
      if (disposed || !scene) return;
      if (!ok) {
        scene.dispose();
        return;
      }
      armed = true;
      scene.resize();
      /* A real frame in the buffer BEFORE the DOM word is dimmed - the swap
         must never pass through a blank frame. */
      scene.render(performance.now() / 1000);
      root.dataset.wtGl = 'on';
      wake();
    });

    /* A resize changes both the fit and the backing store. The refresh
       above redraws on real layout changes; this covers the rest, same as
       the desk's resize path. */
    const onResize = () => {
      if (!armed || !scene) return;
      scene.resize();
      drawOnce();
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      trigger.kill();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      scene?.dispose();
      delete root.dataset.wtGl;
      /* Hand the element back in its finished state rather than mid-transition.
         Removing the properties falls back to the stylesheet's defaults, which
         are the resting word. */
      for (const prop of ['--wt-open', '--wt-push', '--wt-out']) {
        root.style.removeProperty(prop);
      }
    };
  }, [rootRef, canvasRef]);
}

export default useWorkTitle;
