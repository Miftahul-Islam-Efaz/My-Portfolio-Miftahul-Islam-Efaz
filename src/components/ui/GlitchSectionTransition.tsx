import React, { useEffect, useRef } from 'react';

interface GlitchSectionTransitionProps {
  /** Customize the color of special glitch characters */
  accentColor?: string;
}

interface Cell {
  x: number;
  y: number;
  thresholdCover: number;
  thresholdReveal: number;
  char: string;
  isSpecial: boolean;
}

const CHARS = [
  'X', 'Y', 'Z', '0', '1', 'N', 'O', 'I', 'V', 'E', 'W', 'W', 'S', ' ', 
  '.', '&', '$', '@', '?', '<', '>', '[', ']', '3', '8'
];

export default function GlitchSectionTransition({
  accentColor = '#FF3366'
}: GlitchSectionTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<Cell[]>([]);
  const gridConfigRef = useRef({ cols: 0, rows: 0, blockSize: 24 });
  const progressRef = useRef(0);
  const isActiveRef = useRef(false);
  const outcomesTopRef = useRef<number>(0);
  const frameCounterRef = useRef(0);

  const isLoopingRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);

  const startLoop = () => {
    if (isLoopingRef.current) return;
    isLoopingRef.current = true;

    const render = () => {
      if (!isLoopingRef.current) return;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = window.innerWidth;
          const height = window.innerHeight;

          // Clear frame
          ctx.clearRect(0, 0, width, height);

          const pVal = progressRef.current;
          const { blockSize } = gridConfigRef.current;
          const cells = cellsRef.current;

          // Throttle scramble to every 4th frame to reduce CPU cost
          frameCounterRef.current = (frameCounterRef.current + 1) % 4;
          const shouldScramble = frameCounterRef.current === 0;

          // Process Phase Cover & Reveal
          let pCover = 0;
          let pReveal = 0;

          if (pVal < 0.5) {
            pCover = pVal / 0.5;
            pReveal = 0;
          } else {
            pCover = 1.0;
            pReveal = (pVal - 0.5) / 0.5;
          }

          // Set font style rules outside loop for 10x cell canvas rendering acceleration
          ctx.font = `600 ${Math.floor(blockSize * 0.65)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Paint cells
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];

            // Check covered condition
            const isCovered = pCover >= cell.thresholdCover;
            if (!isCovered) continue;

            // Check dissolved condition
            const isDissolved = pReveal >= cell.thresholdReveal;
            if (isDissolved) continue;

            // Scramble active cell characters — throttled to every 4th frame
            if (shouldScramble && Math.random() < 0.16) {
              cell.char = CHARS[Math.floor(Math.random() * CHARS.length)];
            }

            // Draw block background
            ctx.fillStyle = '#030202';
            ctx.fillRect(cell.x, cell.y, blockSize, blockSize);

            // Render character
            if (cell.isSpecial && Math.random() < 0.5) {
              ctx.fillStyle = accentColor;
            } else {
              ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
            }

            ctx.fillText(
              cell.char,
              cell.x + blockSize / 2,
              cell.y + blockSize / 2 + 1
            );
          }

          // Render horizontal linear digital glitches
          if (Math.random() < 0.14) {
            const glitchCount = Math.floor(Math.random() * 2) + 1;
            for (let g = 0; g < glitchCount; g++) {
              const gy = Math.random() * height;
              const gh = Math.random() * 6 + 2;
              ctx.fillStyle = Math.random() < 0.4 ? accentColor : 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(0, gy, width, gh);
            }
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);
  };

  const stopLoop = () => {
    isLoopingRef.current = false;
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  };

  useEffect(() => {
    // Setup high-performance resize handler
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Mobile responsive block size - larger blocks on mobile to reduce cell count & improve performance
      const blockSize = width > 768 ? 24 : 32;
      gridConfigRef.current.blockSize = blockSize;

      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);
      gridConfigRef.current.cols = cols;
      gridConfigRef.current.rows = rows;

      // Handle retina DPI displays
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Pre-generate cells with sweep thresholds EXACTLY matching video kinetics
      const cells: Cell[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ny = r / Math.max(1, rows - 1);
          const nx = c / Math.max(1, cols - 1);

          // Covering sweeps UP from the bottom (bottom cells cover first, top last):
          const verticalCover = 1.0 - ny;
          const diagonalCover = (verticalCover * 0.85) + (nx * 0.15); // subtle slant
          const thresholdCover = diagonalCover * 0.76 + Math.random() * 0.24;

          // Reveal sweeps UP from the bottom (bottom cells reveal first, top last):
          const verticalReveal = 1.0 - ny;
          const diagonalReveal = (verticalReveal * 0.85) + ((1.0 - nx) * 0.15); // subtle slant
          const thresholdReveal = diagonalReveal * 0.76 + Math.random() * 0.24;

          const isSpecial = Math.random() < 0.06;

          cells.push({
            x: c * blockSize,
            y: r * blockSize,
            thresholdCover,
            thresholdReveal,
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            isSpecial
          });
        }
      }
      cellsRef.current = cells;

      // Also quickly refresh offset on resize
      const el = document.getElementById('outcomes');
      if (el) {
        const rect = el.getBoundingClientRect();
        outcomesTopRef.current = rect.top + window.scrollY;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Quick function to resolve section position cleanly relative to document
    const updatePosition = () => {
      const el = document.getElementById('outcomes');
      if (el) {
        const rect = el.getBoundingClientRect();
        outcomesTopRef.current = rect.top + window.scrollY;
      }
    };

    const handleScroll = () => {
      // Lazy-resolve if top offset is not yet set
      if (outcomesTopRef.current === 0) {
        updatePosition();
      }

      const topOfOutcomes = outcomesTopRef.current;
      if (topOfOutcomes === 0) return; // fail-safe if section doesn't exist yet

      const currentScroll = window.scrollY;
      const height = window.innerHeight;

      // Clean mathematical offset:
      const rectTop = topOfOutcomes - currentScroll;

      let p = 0;

      if (rectTop > height) {
        // Section is completely below the viewport
        p = 0;
      } else if (rectTop > 0) {
        // Covering phase: as outcomes section approaches top of screen, p goes from 0 to 0.5
        const factor = 1.0 - (rectTop / height);
        p = factor * 0.5;
      } else {
        // Revealing phase: as section docks/sticks, p goes from 0.5 to 1.0
        const revealScrollDistance = height * 0.4;
        const factor = Math.min(1.0, -rectTop / revealScrollDistance);
        p = 0.5 + factor * 0.5;
      }

      progressRef.current = p;

      // Update visibility of container directly without React state re-renders to prevent lagging
      const container = containerRef.current;
      if (container) {
        if (p > 0.005 && p < 0.995) {
          if (!isActiveRef.current) {
            isActiveRef.current = true;
            container.style.display = 'block';
            startLoop();
          }
        } else {
          if (isActiveRef.current) {
            isActiveRef.current = false;
            container.style.display = 'none';
            stopLoop();
          }
        }
      }
    };

    // Recalculate accurately once on mount
    updatePosition();

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run initial execution
    handleScroll();

    // Setup progressive high-performance checks during page loading sequence to update position
    const t1 = setTimeout(updatePosition, 1000);
    const t2 = setTimeout(updatePosition, 3000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      stopLoop();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-[8000] overflow-hidden bg-transparent"
      style={{ display: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
      />
    </div>
  );
}
