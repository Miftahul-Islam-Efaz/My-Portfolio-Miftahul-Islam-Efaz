'use client';

/* ------------------------------------------------------------------
   THE DEVELOP - driver

   Wires the grain field to scroll and to the cursor, and owns the rAF
   loop. All numbers come from src/config/develop.ts.

   THIS TRIGGER IS NOT PINNED, AND THAT IS A DELIBERATE DECISION.

   There are already two pinned sections in this document - the rake
   above and the work helix below - and ScrollTrigger re-measures pins in
   descending refreshPriority. Mounting the rake with the default
   priority is exactly what broke the helix earlier this session: the
   helix measured its start before the rake's pin spacing existed, and
   pinned against a stale offset.

   A third pin here would mean a third number to keep ordered forever.
   This section instead scrubs against its own progress through the
   viewport, adds no pin spacing, and therefore cannot move anything
   below it. If a pin is ever genuinely needed here, it must take a
   refreshPriority HIGHER than the rake's 2.
   ------------------------------------------------------------------ */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DEVELOP_RENDER, DEVELOP_SCROLL } from '../config/develop';
import { buildGrainField } from '../components/develop/gl/grainField';
import { createDevelopScene } from '../components/develop/gl/scene';
import type { DevelopScene } from '../components/develop/gl/scene';

gsap.registerPlugin(ScrollTrigger);

type Args = {
  /** The canvas the cloud renders into. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** The 3:4 frame. Owns sizing, pointer coordinates, and the state flag. */
  frameRef: RefObject<HTMLDivElement | null>;
};

export function useDevelop({ canvasRef, frameRef }: Args) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    /* Respect reduced motion by never building the cloud at all. The
       component keeps its <img> portrait, which is a complete and
       correct version of this section - a photograph. A still point
       cloud would be a worse image than the photograph it was sampled
       from, so there is nothing to gain by rendering one frame. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let scene: DevelopScene | null = null;
    let raf = 0;
    let last = 0;

    /* Scroll progress and the eased value chasing it. The easing is what
       `scrub` buys in a gsap tween; done by hand here because the
       uniform is not a tweenable property on a DOM node. */
    let scrollProgress = 0;
    let eased = 0;

    let onScreen = true;

    let trigger: ScrollTrigger | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    /* Visible world height at the cloud's depth. Needed to map pointer
       pixels into the same units the grains live in - the cloud is 2
       units tall but the camera sees slightly more than that, so using 2
       here would make the agitation lag the cursor toward the edges. */
    const visibleHeight =
      2 *
      DEVELOP_RENDER.cameraZ *
      Math.tan((DEVELOP_RENDER.fov * Math.PI) / 360);

    const handlePointerMove = (event: PointerEvent) => {
      if (!scene) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const u = (event.clientX - rect.left) / rect.width;
      const v = (event.clientY - rect.top) / rect.height;

      const worldWidth = visibleHeight * (rect.width / rect.height);
      scene.setPointer((u - 0.5) * worldWidth, (0.5 - v) * visibleHeight);
      scene.setPointerPresent(true);
    };

    const handlePointerLeave = () => {
      scene?.setPointerPresent(false);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!scene) return;

      /* First frame has no previous timestamp; clamp so a tab that was
         backgrounded for a minute does not resolve the whole develop in
         one enormous step. */
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      const k = 1 - Math.exp(-dt / Math.max(DEVELOP_SCROLL.scrub, 0.0001));
      eased += (scrollProgress - eased) * k;
      scene.setProgress(eased);

      /* Off-screen: keep the loop alive so the eased values stay current
         and the print is correct the instant it scrolls back, but skip
         the draw. The GPU cost of this section falls to zero while the
         helix below is doing its own work. */
      if (!onScreen) return;

      scene.render(dt);
    };

    const start = async () => {
      const field = await buildGrainField();
      if (cancelled) return;

      /* No readable pixels - offline, 403, or a tainted canvas. The DOM
         portrait stays; the section is a photograph today. */
      if (!field) return;

      scene = createDevelopScene(canvas, field);
      if (!scene) return;

      if (cancelled) {
        scene.dispose();
        scene = null;
        return;
      }

      const rect = frame.getBoundingClientRect();
      scene.setSize(rect.width, rect.height);

      /* Only now is the cloud real. The stylesheet keys off this to fade
         out the fallback <img>, so it can never hide a photograph before
         there is something to replace it with. */
      frame.dataset.developState = 'live';

      resizeObserver = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (box) scene?.setSize(box.width, box.height);
      });
      resizeObserver.observe(frame);

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          onScreen = entries[0]?.isIntersecting ?? true;
        },
        { rootMargin: '20% 0px 20% 0px' },
      );
      intersectionObserver.observe(frame);

      trigger = ScrollTrigger.create({
        trigger: frame,
        start: DEVELOP_SCROLL.start,
        end: DEVELOP_SCROLL.end,
        /* No pin, no pinSpacing - see the header note. */
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          scrollProgress = self.progress;
        },
        onUpdate: (self) => {
          scrollProgress = self.progress;
        },
      });

      /* If the section is already past its develop window on load - a
         reload mid-page, or a deep link - snap rather than animate from
         nothing. Otherwise the visitor watches a print develop that,
         from their point of view, was already on the wall. */
      if (scrollProgress > 0.9) eased = scrollProgress;

      frame.addEventListener('pointermove', handlePointerMove);
      frame.addEventListener('pointerleave', handlePointerLeave);

      raf = requestAnimationFrame(tick);
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);

      frame.removeEventListener('pointermove', handlePointerMove);
      frame.removeEventListener('pointerleave', handlePointerLeave);

      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      trigger?.kill();

      scene?.dispose();
      scene = null;

      delete frame.dataset.developState;
    };
  }, [canvasRef, frameRef]);
}
