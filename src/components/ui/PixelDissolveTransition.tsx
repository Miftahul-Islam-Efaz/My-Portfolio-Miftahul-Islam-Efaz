'use client';

import { useEffect, useRef } from 'react';
import { WORK_THEME } from '../work/workTheme';

/* Size of one block, in CSS pixels. Small values stop reading as "pixels" and
   just look like film grain; large ones look like a checkerboard wipe. */
const CELL = 26;

/* Thickness of the ragged dissolve front, as a fraction of viewport height.
   This is what makes the edge a scattered band instead of a straight line -
   at 0 the transition is a hard horizontal wipe. */
const BAND = 0.42;

/* How much viewport height of scrolling the transition plays over, measured up
   from the bottom of the work section.

   This MUST exceed 1, and by a specific margin. The bottom edge of the work
   section enters the viewport at rectBottom === height, which is the moment
   the next section first becomes visible underneath. Progress at that instant
   is (TRAVEL - 1) / TRAVEL, and the bottom row of cells is not fully covered
   until progress reaches BAND / (1 + BAND) - about 0.3 at the current band.

   Solving (TRAVEL - 1) / TRAVEL >= BAND / (1 + BAND) gives TRAVEL >= ~1.42, so
   anything at or below 1 lets the incoming section show through the gaps in
   the dissolve before the front has closed over it. 1.5 leaves some margin. */
const TRAVEL = 1.5;

/* Progress at which the field is fully covered. The remaining window is held
   solid, which is what gives the transition a settled ending instead of the
   canvas switching off while blocks are still resolving. */
const FULL_AT = 0.92;

/* Block palette, brightest first. These are the only colours in the effect -
   everything behind the front settles to the incoming section's own colour.
   Cool greys, deliberately: a warm accent here fought the neutral sections. */
const BLOCK_BRIGHT = '#EDEEF2';
const BLOCK_ACCENT = '#B3B9C9';
const BLOCK_DIM = '#3A3F4A';

/**
 * Deterministic per-cell noise in [0, 1).
 *
 * Has to be a hash of the coordinates rather than Math.random(), or every cell
 * would be re-rolled on every frame and the whole field would boil instead of
 * holding a stable dissolve pattern.
 */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Work -> Services section transition: a blocky dither dissolve that climbs the
 * viewport from the bottom, replacing the pinned carousel with the incoming
 * section behind a scattered front of square cells.
 *
 * Drawn on a single canvas rather than a grid of divs. At this cell size a
 * 1440x900 viewport is roughly 1900 cells, and mutating that many DOM nodes
 * per scroll frame would not hold 60fps.
 *
 * Progress is derived from the live position of #projects rather than from a
 * ScrollTrigger of its own. The work section is pinned, so its scroll extent
 * is not a fixed distance in the document - measuring the element directly
 * stays correct no matter how the pin re-measures.
 */
export default function PixelDissolveTransition() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* alpha is required (the page shows through ahead of the front), but the
       context is told it does not need to read back or antialias. */
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    /* The destination colour is a themed CSS variable, so it is read from the
       document instead of hard-coded - otherwise the dissolve would settle to
       near-black over the light theme's near-white Services section. */
    const styles = getComputedStyle(document.documentElement);
    const dest =
      styles.getPropertyValue('--color-eerie').trim() || WORK_THEME.bgVoid;

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = false;
    let lastDrawn = -1;

    const resize = () => {
      /* Backing store is scaled by DPR so the block edges stay crisp. Without
         this the squares get a soft half-pixel border on retina displays and
         the effect loses its hard, digital quality. Capped at 2 because the
         cost is quadratic and the blocks are large. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawn = -1;
    };

    const draw = (p: number) => {
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);

      /* Jittering a cell's flip point by +/- BAND/2 widens the range of
         possible thresholds to [-BAND/2, 1 + BAND/2], so thresholds are
         renormalised back into [0, 1].

         Without this the transition is broken at BOTH ends: cells whose
         threshold fell below 0 are already covered at p = 0 (it pops in), and
         cells above 1 never flip at all, leaving the top band of the screen
         still dissolving at p = 1. */
      const spread = 1 + BAND;
      const bandNorm = BAND / spread;

      /* Everything from this row down has finished dissolving and is flat
         destination colour, so it goes out as ONE rect instead of ~1300
         individual fills. Solved from the settle condition
         p - maxThreshold(row) >= bandNorm, where the row's worst-case
         threshold is (dist + BAND) / spread.

         This is what keeps the effect affordable: per-cell work is confined to
         the moving band, so cost stays flat instead of growing as the front
         climbs the screen. */
      const settledRow = Math.max(
        0,
        Math.ceil(rows * (1 - p * spread + 2 * BAND) - 0.5)
      );

      if (settledRow < rows) {
        const y = settledRow * CELL;
        ctx.fillStyle = dest;
        ctx.fillRect(0, y, width, height - y);
      }

      for (let row = 0; row < Math.min(settledRow, rows); row++) {
        /* Distance from the bottom of the viewport, 0 at the bottom edge and 1
           at the top. The front travels along this axis, so a cell's own
           position doubles as the progress value at which it flips. */
        const dist = 1 - (row + 0.5) / rows;

        for (let col = 0; col < cols; col++) {
          /* Jittering each cell's flip point by its noise is the whole trick:
             it turns one moving line into a scattered band of blocks. */
          const threshold =
            (dist + (hash(col, row) - 0.5) * BAND + BAND / 2) / spread;
          if (p <= threshold) continue;

          /* How long ago this cell flipped, in units of the band width. Cells
             still inside the front get an accent colour; everything behind it
             settles to the destination so it reads as solid coverage. */
          const age = (p - threshold) / bandNorm;

          let color = dest;
          if (age < 1) {
            const pick = hash(col * 1.7 + 3.3, row * 2.3 + 7.1);
            if (pick > 0.9) color = BLOCK_BRIGHT;
            else if (pick > 0.72) color = BLOCK_ACCENT;
            else if (pick > 0.64) color = BLOCK_DIM;
          }

          ctx.fillStyle = color;
          ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
        }
      }
    };

    const update = () => {
      raf = 0;

      const leaving = document.getElementById('projects');
      if (!leaving) return;

      /* rectBottom === travel -> 0 (not started)
         rectBottom === 0      -> 1 (work section fully gone)

         Because travel is more than one viewport, this starts building while
         the work section still fills the screen, so the front has already
         closed over the bottom of the viewport by the time the seam with the
         next section rises into view. */
      const travel = height * TRAVEL;
      const rectBottom = leaving.getBoundingClientRect().bottom;
      const p = Math.min(Math.max((travel - rectBottom) / travel, 0), 1);

      /* Outside the active range the canvas is hidden rather than drawn empty,
         so it costs nothing to composite for the rest of the page. */
      const shouldShow = p > 0.001 && p < 0.999;
      if (shouldShow !== visible) {
        visible = shouldShow;
        canvas.style.visibility = shouldShow ? 'visible' : 'hidden';
      }
      if (!shouldShow) return;

      /* Reaching full coverage early leaves a window where the overlay is a
         solid plate of the destination colour. The work section's last sliver
         is still on screen underneath during that window, so this is what lets
         the canvas switch off unnoticed rather than blinking away. */
      const eased = Math.min(p / FULL_AT, 1);

      /* Sub-block movement cannot change the picture, so redrawing for it is
         pure waste. One CELL of travel is the smallest visible step. */
      if (Math.abs(eased - lastDrawn) * height < CELL * 0.5) return;
      lastDrawn = eased;

      draw(eased);
    };

    /* Scroll events can outpace paint, so work is coalesced into one rAF. */
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const handleResize = () => {
      resize();
      schedule();
    };

    resize();
    update();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', handleResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 h-screen w-screen pointer-events-none z-[8000]"
      style={{ visibility: 'hidden' }}
    />
  );
}
