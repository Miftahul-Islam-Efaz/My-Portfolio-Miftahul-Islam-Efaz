import React, { useEffect, useRef, useState, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface GlitchGridTransitionProps {
  /** The element that triggers the scroll animation */
  triggerRef: RefObject<HTMLElement | null>;
  /** Background color of the glitch blocks */
  bgColor?: string;
  /** Text color of the glitch characters */
  textColor?: string;
  /** Height of the transition overlay in pixels or responsive calculation (default is 80vh) */
  coverageHeight?: number;
}

export default function GlitchGridTransition({
  triggerRef,
  bgColor = '#F3F2ED',
  textColor = 'var(--color-eerie)',
  coverageHeight
}: GlitchGridTransitionProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [gridConfig, setGridConfig] = useState<{cols: number, rows: number, blockSize: number, blocks: {char: string}[]}>({ cols: 0, rows: 0, blockSize: 20, blocks: [] });

  useEffect(() => {
    const calculateGrid = () => {
      const blockSize = window.innerWidth > 768 ? 24 : 16; 
      const MathCols = Math.ceil(window.innerWidth / blockSize);
      const height = coverageHeight || window.innerHeight * 0.8;
      const rows = Math.ceil(height / blockSize);
      const totalBlocks = MathCols * rows;

      const chars = ['+', '-', '.', ':', '%', ' ', '@', '#', '=', '4', 'R', 'x', '<', '>'];
      const blocks = Array.from({ length: totalBlocks }).map(() => {
        // ~60% solid white, ~40% with a possible character
        const isSolid = Math.random() > 0.4;
        return {
          char: isSolid ? '' : chars[Math.floor(Math.random() * chars.length)]
        };
      });

      setGridConfig({ cols: MathCols, rows, blockSize, blocks });
    };

    calculateGrid();
    
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateGrid, 150);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [coverageHeight]);

  useEffect(() => {
    if (gridConfig.cols === 0) return;
    const container = gridContainerRef.current;
    if (!container) return;

    const chars = ['+', '-', '.', ':', '%', '@', '#', '=', '4', 'R', 'x', '<', '>'];
    
    // The Glitch Scrambler
    const interval = setInterval(() => {
      const spans = container.querySelectorAll('.pixel-char');
      spans.forEach(span => {
        // Only scramble ~30% of spans per tick for a chaotic but readable glitch
        if (Math.random() > 0.7) {
          span.textContent = chars[Math.floor(Math.random() * chars.length)];
          
          // Randomize orientation/scale to "change shape"
          const transforms = ['scaleX(1)', 'scaleX(-1)', 'scaleY(-1)', 'rotate(90deg)', 'rotate(180deg)'];
          if (Math.random() > 0.4) {
             (span as HTMLElement).style.transform = transforms[Math.floor(Math.random() * transforms.length)];
          }
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gridConfig]);

  useEffect(() => {
    if (gridConfig.cols === 0) return;

    const section = triggerRef.current;
    const gridContainer = gridContainerRef.current;

    if (!section || !gridContainer) return;

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray('.footer-pixel-block', gridContainer) as HTMLElement[];
      
      // Initial state
      gsap.set(blocks, { opacity: 0, scale: 0.5 });
      gsap.set('.pixel-char', { opacity: 0.8 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 140%', 
          end: 'top 20%', 
          scrub: true,
        }
      });

      blocks.forEach((block, index) => {
        const row = Math.floor(index / gridConfig.cols);
        const col = index % gridConfig.cols;
        const reverseRow = (gridConfig.rows - 1) - row;
        
        // Pure random glitch effect timing (restoring irregular shape)
        const startTime = (reverseRow * 0.05) + (Math.random() * 1.5);
        
        // Pop the block in
        tl.to(block, { opacity: 1, scale: 1.05, duration: 0.01 }, startTime);

        const span = block.querySelector('.pixel-char');
        if (span) {
           // Text character disappears shortly after the block appears
           tl.to(span, { opacity: 0, duration: 0.01 }, startTime + 0.1 + (Math.random() * 0.1));
        }
      });
    }, section);

    return () => ctx.revert();
  }, [gridConfig, triggerRef]);

  if (gridConfig.cols === 0) return null;

  return (
    <div 
      ref={gridContainerRef}
      className="absolute left-0 w-full z-50 pointer-events-none flex flex-wrap"
      style={{
        top: `-${gridConfig.rows * gridConfig.blockSize}px`,
        height: `${gridConfig.rows * gridConfig.blockSize}px`,
      }}
    >
      {gridConfig.blocks.map((block, i) => (
        <div 
          key={i} 
          className="footer-pixel-block flex items-center justify-center font-mono font-bold overflow-hidden" 
          style={{ 
            width: `${gridConfig.blockSize}px`, 
            height: `${gridConfig.blockSize}px`,
            fontSize: `${gridConfig.blockSize * 0.6}px`,
            transform: 'scale(0.5)',
            opacity: 0,
            willChange: 'transform, opacity',
            backgroundColor: bgColor,
            color: textColor
          }} 
        >
          {block.char && <span className="pixel-char opacity-80 inline-block">{block.char}</span>}
        </div>
      ))}
    </div>
  );
}
