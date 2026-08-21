'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';

/** Lenis is attached to window by SmoothScrollProvider. */
type LenisLike = {
  scroll?: number;
  scrollTo: (target: number | Element, opts?: Record<string, unknown>) => void;
  start: () => void;
  stop: () => void;
};

const getLenis = (): LenisLike | undefined =>
  (window as unknown as { lenis?: LenisLike }).lenis;

/**
 * How far before the end of the hero the header is allowed to appear. Small
 * enough that the bar is still absent for the whole hero composition, but
 * early enough that it is already in place by the time the next section is
 * properly in view.
 */
const HERO_EXIT_OFFSET_PX = 120;

interface MenuLinkProps {
  label: string;
  index: number;
  color: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const MenuLink: React.FC<MenuLinkProps> = ({ label, index, color, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="#"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex items-center py-1.5 md:py-2.5 cursor-pointer select-none no-underline w-fit"
    >
      {/* The parenthesis dot bullet '( ◉ )' */}
      <div className="flex items-center gap-1 md:gap-1.5 mr-3 md:mr-6 text-neutral-400 group-hover:text-black transition-colors duration-300">
        <span className="font-sans text-[10px] md:text-xs tracking-widest font-light select-none text-neutral-400 group-hover:text-neutral-800 transition-colors">(</span >
        <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full border border-neutral-400 group-hover:border-neutral-900 group-hover:bg-neutral-900 flex items-center justify-center transition-all duration-300">
          <span className={cn(
            "w-0.5 h-0.5 rounded-full bg-transparent transition-all duration-300",
            isHovered ? "bg-white scale-110" : "bg-transparent scale-0"
          )} />
        </span>
        <span className="font-sans text-[10px] md:text-xs tracking-widest font-light select-none text-neutral-400 group-hover:text-neutral-800 transition-colors">)</span >
      </div>

      {/* Unified word slide-in animation on mount */}
      <div className="relative flex overflow-visible">
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            type: "tween",
            ease: "easeOut",
            duration: 0.4,
            delay: index * 0.05
          }}
          style={{ willChange: 'transform, opacity' }}
          className="flex font-display uppercase text-[clamp(16px,4vh,38px)] font-black tracking-tight text-neutral-400 group-hover:text-neutral-900 transition-colors duration-300 leading-[1.1]"
        >
          {label}
        </motion.div>

        {/* Luxury strike-through slash over the text */}
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
          className="absolute left-[-2%] right-[-2%] top-[50%] h-[3px] md:h-[4px] pointer-events-none rounded-full transform -rotate-[4deg] -translate-y-1/2"
          style={{ backgroundColor: color, originX: 0, transform: 'translateY(-50%) rotate(-4deg)' }}
        />
      </div>
    </a>
  );
};

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [time, setTime] = useState('');
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseLeaveMenu = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const interval = setInterval(() => {
      setActivePhraseIndex(prev => (prev === 0 ? 1 : 0));
    }, 4500);
    return () => clearInterval(interval);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);

      // The header is not part of the hero composition - it appears only once
      // the hero has essentially scrolled away. Measured against the live
      // element height rather than a hard-coded viewport figure, so it stays
      // correct on any screen and after a resize.
      const hero = document.getElementById('hero-section');
      const threshold = hero
        ? hero.offsetHeight - HERO_EXIT_OFFSET_PX
        : window.innerHeight - HERO_EXIT_OFFSET_PX;
      setPastHero(y >= threshold);
    };

    // Run once on mount so a reload part-way down the page is correct instead
    // of hiding the header until the next scroll event.
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    setIsMobile(window.innerWidth <= 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      handleScroll();
    };
    window.addEventListener('resize', handleResize);

    const updateTime = () => {
      const now = new Date();
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      setTime(`${HH}:${MM}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  // Sync scroll lock of Lenis on menu open
  useEffect(() => {
    const lenis = getLenis();
    if (isMenuOpen) {
      document.documentElement.classList.add('menu-open');
      if (lenis) {
        // Settle scroll animation immediately at current scroll position to prevent jumps
        const currentScroll = lenis.scroll ?? window.scrollY;
        lenis.scrollTo(currentScroll, { immediate: true });
        lenis.stop();
      }
    } else {
      document.documentElement.classList.remove('menu-open');
      lenis?.start();
    }
    return () => {
      document.documentElement.classList.remove('menu-open');
      getLenis()?.start();
    };
  }, [isMenuOpen]);

  /* Single-page port: the React app used react-router, and SKILL SHOWCASE 3D
     pointed at the /skill-showcase route, which is not part of this build.
     HOME kept its slash colour and WORK kept the purple it had as the third
     item, so the overlay reads the same. */
  const overlayMenuItems = [
    { label: 'HOME', target: '#hero-section', color: '#38bdf8' },
    { label: 'WORK', target: '#projects', color: '#a855f7' },
  ];

  const handleOverlayNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetSelector: string,
  ) => {
    e.preventDefault();
    if (isTransitioning) return;

    setIsMenuOpen(false);

    // Launch Lenis instantly so it can handle immediate jumps
    getLenis()?.start();

    const isMobileViewport = isMobile || window.innerWidth <= 768;

    const executePageTransition = () => {
      const target = document.querySelector(targetSelector);
      if (!target) return;
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(target, { immediate: false, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (isMobileViewport) {
      executePageTransition();
      return;
    }

    // Filter valid non-null grid blocks
    const validBlocks = blocksRef.current.filter((b): b is HTMLDivElement => b !== null);

    // If no grid blocks exist, directly jump instantly
    if (validBlocks.length === 0) {
      executePageTransition();
      return;
    }

    setIsTransitioning(true);

    const tl = gsap.timeline();

    tl.to(validBlocks, {
      scale: 1.05,
      opacity: 1,
      duration: 0.4,
      stagger: {
        amount: 0.4,
        from: "random",
      },
      ease: "power2.inOut",
      onComplete: () => {
        executePageTransition();
      }
    })
    .to(validBlocks, {
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

  // Grid dimensions for pixel transition - optimized to 48 blocks for butter-smooth scrolling
  const GRID_ROWS = 6;
  const GRID_COLS = 8;
  const totalBlocks = GRID_ROWS * GRID_COLS;

  return (
    <>
      {/* Pixel grid transition — lazy-mounted only when actively transitioning to avoid
          300 dark DOM nodes causing the black-screen flash when menu opens */}
      {!isMobile && isTransitioning && (
        <div
          className={"fixed inset-0 z-[99998] pointer-events-auto"}
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
              className="w-full h-full opacity-0"
              style={{
                backgroundColor: 'var(--color-eerie)',
                transform: 'scale(0)',
                transformOrigin: 'center center'
              }}
            />
          ))}
        </div>
      )}

      {/* Main Glass Header Navbar.

          Hidden for the whole hero and revealed once it scrolls away. The menu
          button is the only control it carries - the old WORK shortcut was
          removed so nothing competes with it. `pointer-events-none` while
          hidden matters: without it the invisible bar would still swallow
          clicks across the top of the hero. */}
      <nav
        aria-hidden={!pastHero}
        className={cn(
          "fixed top-0 left-0 w-full z-[9999] flex justify-between items-center px-6 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] mix-blend-difference",
          scrolled ? "py-4" : "py-6",
          pastHero
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-6 pointer-events-none"
        )}
      >
        {/* Logo */}
        <div
          onClick={() => document.getElementById('trigger-favicon-animator')?.click()}
          className="relative z-10 text-white select-none cursor-pointer group"
          title="Click to play logo favicon animation"
        >
          <span className="font-display text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase transition-colors duration-300 group-hover:text-[#b54a4a]">
            EFAZ
          </span>
        </div>

        {/* Hot Dog Menu Button - the only control in the header */}
        <div className="flex items-center justify-end gap-2 lg:gap-3 relative z-10">
          <button
            onClick={() => {
              handleMouseLeaveMenu();
              setIsMenuOpen(prev => !prev);
            }}
            aria-label="Toggle Menu"
            className="relative group px-3 py-2 border border-dashed border-white/80 hover:border-white hover:bg-white/10 flex items-center justify-center bg-transparent transition-all duration-150 active:scale-95 rounded-md cursor-pointer select-none"
            title="Open Menu"
          >
            <div className="flex flex-col gap-[5px] items-center justify-center">
              <span className="w-5 h-[2.5px] bg-white rounded-full transition-transform duration-300 group-hover:scale-x-110" />
              <span className="w-5 h-[2.5px] bg-white rounded-full transition-transform duration-300 group-hover:scale-x-110" />
            </div>
          </button>
        </div>
      </nav>

      {/* FULL SCREEN SPLIT MENU OVERLAY WITH CIRCULAR ANIMATION FROM HOT DOG BUTTON */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2.25rem)' }}
            animate={{ clipPath: 'circle(160% at calc(100% - 2.5rem) 2.25rem)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2.25rem)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 w-screen h-screen z-[99990] flex pointer-events-auto overflow-hidden bg-[#030202]"
          >
            {/* Dummy button to trap autofocus and prevent browser layout scroll jumps */}
            <button
              autoFocus
              aria-hidden="true"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
                outline: 'none',
                border: 'none',
                background: 'transparent'
              }}
            />

            {/* LEFT PANEL: Translucent Dark Graphic Panel */}
            <div className="hidden md:flex w-1/2 h-full bg-[#030202] relative flex-col justify-between p-12 border-r border-neutral-800/40 select-none overflow-hidden">
              {/* Top Left Label */}
              <div className="flex justify-between items-center w-full">
                <span className="font-display text-lg font-bold tracking-[0.2em] text-neutral-100">
                  EFAZ
                </span>
                <span className="font-mono text-[10px] text-neutral-400 tracking-[0.2em]">
                  ( UTC ) {time}
                </span>
              </div>

              {/* Center Static Grid Details behind text (no repaint overhead) */}
              <div
                className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"
              />

              {/* Bottom Editorial Copy with dynamic looping animation */}
              <div className="relative z-20 max-w-md min-h-[140px] flex flex-col justify-end mb-14">
                <AnimatePresence mode="wait">
                  {activePhraseIndex === 0 ? (
                    <motion.div
                      key="phrase-0"
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <h3 className="font-display font-black text-neutral-100 text-[clamp(20px,2.8vw,36px)] leading-[1.15] tracking-tight uppercase">
                        I DON&apos;T FOLLOW
                        <br />
                        THE SCRIPT.
                        <br />
                        I WRITE IT.
                      </h3>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="phrase-1"
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <h3 className="font-display font-black text-neutral-100 text-[clamp(20px,2.8vw,36px)] leading-[1.15] tracking-tight uppercase">
                        NOT A DEVELOPER.
                        <br />
                        AN ENTREPRENEUR
                        <br />
                        WHO CODES.
                      </h3>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT PANEL: Crisp White Links & Actions List */}
            <div className="w-full md:w-1/2 h-full bg-[#f2f0f1] relative flex flex-col justify-center px-6 md:px-16 lg:px-24">
              {/* Close Button at top corner */}
              <div className="absolute top-6 right-6 md:top-12 md:right-12">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="outline-none border-none bg-transparent text-neutral-800 hover:text-[#b54a4a] font-mono text-xs tracking-[0.25em] uppercase cursor-pointer py-2 px-4 transition-colors duration-300 select-none font-bold"
                >
                  CLOSE
                </button>
              </div>

              {/* Vertically Aligned Menu Items */}
              <div className="flex flex-col my-auto max-h-[68vh] overflow-y-auto pr-2 py-4 scrollbar-none gap-0.5 md:gap-1">
                {overlayMenuItems.map((item, index) => (
                  <MenuLink
                    key={item.label}
                    label={item.label}
                    index={index}
                    color={item.color}
                    onClick={(e) => handleOverlayNavigate(e, item.target)}
                  />
                ))}
              </div>

              {/* Dynamic Footer for overlay */}
              <div className="absolute bottom-6 left-6 right-6 md:bottom-12 md:left-16 md:right-16 flex justify-between items-center text-[9px] md:text-[10px] text-neutral-500 font-mono tracking-wider">
                <a
                  href="https://www.miftahulislamefaz.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#b54a4a] transition-all duration-300 select-all cursor-pointer"
                >
                  © 2026 EFAZ.COM
                </a>
                <span className="text-right uppercase">SITE BY ME.</span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
