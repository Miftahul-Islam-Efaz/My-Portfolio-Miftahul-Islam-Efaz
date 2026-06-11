import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'motion/react';

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
      href="javascript:void(0)"
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [time, setTime] = useState('');
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const blocksRef = useRef<(HTMLDivElement | null)[]>([]);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterMenu = () => {
    if (isMobile) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
    }, 80); // 80ms hover intent delay to prevent accidental trigger (feels instant but gates fast sweeps)
  };

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
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    setIsMobile(window.innerWidth <= 768);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
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
    if (isMenuOpen) {
      document.documentElement.classList.add('menu-open');
      if ((window as any).lenis) {
        // Settle scroll animation immediately at current scroll position to prevent jumps
        const currentScroll = (window as any).lenis.scroll || window.scrollY;
        (window as any).lenis.scrollTo(currentScroll, { immediate: true });
        (window as any).lenis.stop();
      }
    } else {
      document.documentElement.classList.remove('menu-open');
      if ((window as any).lenis) {
        (window as any).lenis.start();
      }
    }
    return () => {
      document.documentElement.classList.remove('menu-open');
      if ((window as any).lenis) {
        (window as any).lenis.start();
      }
    };
  }, [isMenuOpen]);

  const overlayMenuItems = [
    { label: 'SKILLS', target: '#skills' },
    { label: 'OUTCOMES', target: '#outcomes' },
    { label: 'SERVICES', target: '#services' },
    { label: 'TESTIMONIALS', target: '#testimonials' },
    { label: 'CONTACT', target: '#contact' }
  ];

  const SLASH_COLORS = [
    '#38bdf8', // SKILLS: Teal/Blue
    '#a855f7', // OUTCOMES: Purple
    '#eab308', // SERVICES: Yellow/Gold
    '#10b981', // TESTIMONIALS: Emerald Green
    '#b54a4a', // CONTACT: Red
  ];

  const handleOverlayNavigate = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string, itemName: string) => {
    e.preventDefault();
    if (isTransitioning) return;

    setIsMenuOpen(false);

    // Save immediate scroll jump trigger
    const isHero = targetId === '#hero' || targetId === '#hero-section';
    const target = isHero ? document.documentElement : document.querySelector(targetId);
    
    // Launch Lenis instantly so it can handle immediate jumps
    if ((window as any).lenis) {
      (window as any).lenis.start();
    }

    if (!target) return;

    // Helper to perform direct jump/immediate opening of the section
    const doScrollJump = () => {
      (window as any).isJumping = true;
      if (isHero) {
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(0, { immediate: true, force: true });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else if (itemName.toLowerCase() === 'skills') {
        const scrollTarget = target.getBoundingClientRect().top + window.scrollY;
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(scrollTarget, { immediate: true, force: true });
        } else {
          window.scrollTo({
            top: scrollTarget,
            behavior: 'auto'
          });
        }
      } else if (itemName.toLowerCase() === 'outcomes') {
        const scrollTarget = target.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.1;
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(scrollTarget, { immediate: true, force: true });
        } else {
          window.scrollTo({
            top: scrollTarget,
            behavior: 'auto'
          });
        }
      } else if (itemName.toLowerCase() === 'contact') {
        const parentTransition = target.closest('[style*="500vh"]');
        const scrollTarget = parentTransition
          ? parentTransition.getBoundingClientRect().top + window.scrollY
          : target.getBoundingClientRect().top + window.scrollY;
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(scrollTarget, { immediate: true, force: true });
        } else {
          window.scrollTo({
            top: scrollTarget,
            behavior: 'auto'
          });
        }
      } else if (itemName.toLowerCase() === 'footer') {
        const parentTransition = target.closest('[style*="500vh"]');
        const scrollTarget = parentTransition
          ? parentTransition.getBoundingClientRect().top + window.scrollY + parentTransition.getBoundingClientRect().height - window.innerHeight
          : target.getBoundingClientRect().top + window.scrollY;
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(scrollTarget, { immediate: true, force: true });
        } else {
          window.scrollTo({
            top: scrollTarget,
            behavior: 'auto'
          });
        }
      } else {
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(target, { immediate: true, force: true });
        } else {
          target.scrollIntoView({ behavior: 'auto' });
        }
      }
      setTimeout(() => {
        (window as any).isJumping = false;
      }, 300);
    };

    // Robust mobile viewport check to exit early and completely bypass pixel transitions and GSAP timeline triggers
    const isMobileViewport = isMobile || window.innerWidth <= 768;

    if (isMobileViewport) {
      doScrollJump();
      setIsTransitioning(false);
      return;
    }

    // Filter valid non-null grid blocks
    const validBlocks = blocksRef.current.filter((b): b is HTMLDivElement => b !== null);

    // If no grid blocks exist, directly jump instantly
    if (validBlocks.length === 0) {
      doScrollJump();
      setIsTransitioning(false);
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
        doScrollJump();
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

      {/* Main Glass Header Navbar */}
      <nav 
        className={cn(
          "fixed top-0 left-0 w-full z-[9999] flex justify-between items-center px-6 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] mix-blend-difference",
          scrolled ? "py-4" : "py-6"
        )}
      >
        {/* Logo */}
        <div 
          onClick={() => document.getElementById('trigger-favicon-animator')?.click()}
          className="flex-1 relative z-10 text-white select-none cursor-pointer group"
          title="Click to play logo favicon animation"
        >
          <span className="font-display text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase transition-colors duration-300 group-hover:text-[#b54a4a]">
            EFAZ
          </span>
        </div>

        {/* Center Hover-Activated Menu Button */}
        <div className="flex items-center justify-end md:justify-center relative flex-1 z-10">
          <button
            onMouseEnter={handleMouseEnterMenu}
            onMouseLeave={handleMouseLeaveMenu}
            onClick={() => {
              handleMouseLeaveMenu();
              setIsMenuOpen(prev => !prev);
            }}
            className="outline-none border-none bg-transparent text-white font-mono text-[11px] md:text-xs tracking-[0.3em] uppercase cursor-pointer py-2 px-4 md:px-6 relative group select-none transition-transform duration-150 active:scale-95"
          >
            <span className="relative z-10 group-hover:text-[#b54a4a] transition-colors duration-300">
              MENU
            </span>
            <span className="absolute bottom-1 left-4 right-4 md:left-6 md:right-6 h-[1px] bg-white scale-x-0 group-hover:scale-x-100 group-hover:bg-[#b54a4a] origin-left transition-all duration-500 ease-out" />
          </button>
        </div>

        {/* Right Let's Talk CTA */}
        <div className="hidden md:flex flex-1 justify-end relative z-10">
          <a 
            href="#contact"
            onClick={(e) => handleOverlayNavigate(e, '#contact', 'Join Us')}
            className="relative overflow-hidden group px-6 py-2.5 md:px-8 md:py-3 border border-white rounded-full flex items-center justify-center bg-transparent"
          >
            <span className="absolute inset-0 w-full h-full bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
            <span className="relative z-10 text-[10px] md:text-xs font-mono tracking-[0.15em] uppercase text-white group-hover:text-black transition-colors duration-500 font-semibold">
              Let's Talk
            </span>
          </a>
        </div>
      </nav>

      {/* FULL SCREEN SPLIT MENU OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 w-screen h-screen z-[99990] flex pointer-events-auto">
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
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              style={{ willChange: 'transform' }}
              className="hidden md:flex w-1/2 h-full bg-[#030202] relative flex-col justify-between p-12 border-r border-neutral-800/40 select-none overflow-hidden"
            >
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
                        I DON'T FOLLOW
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
            </motion.div>

            {/* RIGHT PANEL: Crisp White Links & Actions List */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              style={{ willChange: 'transform' }}
              className="w-full md:w-1/2 h-full bg-[#f2f0f1] relative flex flex-col justify-center px-6 md:px-16 lg:px-24"
            >
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
                    color={SLASH_COLORS[index % SLASH_COLORS.length]}
                    onClick={(e) => handleOverlayNavigate(e, item.target, item.label)}
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
            </motion.div>

          </div>
        )}
      </AnimatePresence>
    </>
  );
}
