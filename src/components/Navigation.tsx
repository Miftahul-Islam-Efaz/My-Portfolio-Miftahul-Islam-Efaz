import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import ScrambleText from './ScrambleText';
import gsap from 'gsap';
import { motion } from 'motion/react';
import GooeyNav from './GooeyNav';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = ['Skills', 'Services', 'Outcomes'];

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, item: string) => {
    e.preventDefault();
    if (isTransitioning) return;
    
    const targetId = `#${item.toLowerCase()}`;
    const target = document.querySelector(targetId);
    if (!target) return;

    setIsTransitioning(true);

    const blocks = blocksRef.current;
    const tl = gsap.timeline();
    
    tl.to(blocks, {
      scale: 1.05,
      opacity: 1,
      duration: 0.4,
      stagger: {
        amount: 0.4,
        from: "random",
      },
      ease: "power2.inOut",
      onComplete: () => {
        if (item.toLowerCase() === 'skills') {
          // Scroll past the Hero burnout portion directly to the interactive 3D Skills showcase
          const scrollTarget = target.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.5;
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(scrollTarget, { immediate: true });
          } else {
            window.scrollTo({
              top: scrollTarget,
              behavior: 'auto'
            });
          }
        } else if (item.toLowerCase() === 'outcomes') {
          // Scroll past the entry parallax assembly to center the tablet and the first project outcome beautifully
          const scrollTarget = target.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.1;
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(scrollTarget, { immediate: true });
          } else {
            window.scrollTo({
              top: scrollTarget,
              behavior: 'auto'
            });
          }
        } else {
          if ((window as any).lenis) {
            (window as any).lenis.scrollTo(target, { immediate: true });
          } else {
            target.scrollIntoView({ behavior: 'auto' });
          }
        }
      }
    })
    .to(blocks, {
      scale: 0,
      opacity: 0,
      duration: 0.4,
      stagger: {
        amount: 0.4,
        from: "random",
      },
      ease: "power2.inOut",
      onComplete: () => {
        setIsTransitioning(false);
      }
    }, "+=0.1");
  };

  const gooeyItems = menuItems.map(item => ({
    label: item,
    href: `#${item.toLowerCase()}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => handleNavigate(e, item)
  }));

  // Define grid dimensions for the pixel reveal
  const GRID_ROWS = 15;
  const GRID_COLS = 20;
  const totalBlocks = GRID_ROWS * GRID_COLS;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-[9998] flex flex-wrap",
          isTransitioning ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`
        }}
      >
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div 
            key={i} 
            ref={el => { blocksRef.current[i] = el; }}
            className="w-full h-full bg-[var(--color-eerie)] opacity-0"
            style={{ 
              transform: 'scale(0)',
              transformOrigin: 'center center'
            }}
          />
        ))}
      </div>

      <nav 
        className={cn(
          "fixed top-0 left-0 w-full z-[9999] flex justify-between items-center px-6 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] mix-blend-difference",
          scrolled ? "py-4" : "py-6"
        )}
      >
        {/* Logo */}
        <div className="flex-1 relative z-10 text-white select-none">
          <span className="font-display text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase pointer-events-none">
            EFAZ
          </span>
        </div>

        {/* Center Links */}
        <div className="hidden md:flex items-center justify-center relative flex-1 z-10">
          <GooeyNav items={gooeyItems} />
        </div>

        {/* Right CTA */}
        <div className="flex-1 flex justify-end relative z-10">
          <a 
            href="#contact"
            className="relative overflow-hidden group px-6 py-2.5 md:px-8 md:py-3 border border-white rounded-full flex items-center justify-center bg-transparent"
          >
            <span className="absolute inset-0 w-full h-full bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
            <span className="relative z-10 text-[10px] md:text-xs font-mono tracking-[0.15em] uppercase text-white group-hover:text-black transition-colors duration-500 font-semibold">
              Let's Talk
            </span>
          </a>
        </div>
      </nav>
    </>
  );
}
