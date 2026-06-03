import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { cn } from '../lib/utils';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;

    const cursor = cursorRef.current;
    const text = textRef.current;
    if (!cursor || !text) return;

    // Initially hide cursor until first interaction to prevent it being stuck top-left
    gsap.set(cursor, { opacity: 0, scale: 1, xPercent: -50, yPercent: -50 });

    const xTo = gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3.out" });
    
    let isVisible = false;
    let currentCursorState = 'default';
    let currentHoverText = '';
    let isInHeroSection = true;

    const checkHeroSection = () => {
      const scrollY = window.scrollY;
      const threshold = window.innerHeight * 0.95;
      const currentlyInHero = scrollY < threshold;

      if (currentlyInHero !== isInHeroSection) {
        isInHeroSection = currentlyInHero;
        if (currentlyInHero) {
          document.documentElement.classList.add('in-hero-section');
          gsap.to(cursor, { opacity: 0, duration: 0.2, ease: 'power2.out' });
          isVisible = false;
        } else {
          document.documentElement.classList.remove('in-hero-section');
          // Will fade back in on next mousemove outside hero
        }
      }
    };

    // Set initial class on mount
    document.documentElement.classList.add('in-hero-section');
    checkHeroSection();

    const onScroll = () => {
      checkHeroSection();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      if (isInHeroSection) {
        if (isVisible) {
          gsap.to(cursor, { opacity: 0, duration: 0.1 });
          isVisible = false;
        }
        return;
      }

      if (!isVisible) {
        gsap.to(cursor, { opacity: 1, duration: 0.3 });
        isVisible = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const handleMouseOver = (e: MouseEvent) => {
      if (isInHeroSection) {
        return;
      }

      const target = e.target as HTMLElement;
      if (!target) return;

      let state = 'default';
      let hoverText = '';

      if (target.closest('[data-cursor="drag"]')) {
        state = 'drag';
        hoverText = 'DRAG';
      } else if (target.closest('[data-cursor="view-live"]')) {
        state = 'view-live';
        hoverText = 'VIEW LIVE ↗';
      } else if (target.closest('[data-cursor="view"]')) {
        state = 'view';
        hoverText = 'VIEW';
      } else if (target.closest('a') || target.closest('button')) {
        state = 'link';
      } else if (target.closest('input') || target.closest('textarea')) {
        state = 'text';
      }

      if (state === currentCursorState && hoverText === currentHoverText) {
        return;
      }

      currentCursorState = state;
      currentHoverText = hoverText;

      let width = '14px';
      let height = '14px';
      let borderRadius = '9999px';
      let textOpacity = 0;

      if (state === 'link') {
        width = '64px';
        height = '64px';
      } else if (state === 'drag' || state === 'view') {
        width = '80px';
        height = '80px';
        textOpacity = 1;
      } else if (state === 'view-live') {
        width = '110px';
        height = '110px';
        textOpacity = 1;
      } else if (state === 'text') {
        width = '3px';
        height = '32px';
        borderRadius = '3px';
      }

      // Smooth custom cursor size/shape transition using high performance GSAP matching the user's timing request
      gsap.to(cursor, {
        width: width,
        height: height,
        borderRadius: borderRadius,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      
      if (hoverText) {
        text.innerText = hoverText;
      }
      text.style.opacity = textOpacity.toString();
    };

    window.addEventListener('mouseover', handleMouseOver, { passive: true });

    const handleMouseLeave = () => {
      if (!isInHeroSection) {
        gsap.to(cursor, { scale: 0, duration: 0.3, ease: 'power2.inOut' });
      }
    };
    
    const handleMouseEnter = () => {
      if (!isInHeroSection) {
        gsap.to(cursor, { scale: 1, duration: 0.3, ease: 'power2.inOut' });
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      document.documentElement.classList.remove('in-hero-section');
    };
  }, []);

  return (
    <div 
      ref={cursorRef}
      className={cn(
        "hidden md:flex pointer-events-none fixed top-0 left-0 z-[100000] bg-white items-center justify-center will-change-transform mix-blend-difference"
      )}
      style={{ width: '14px', height: '14px', borderRadius: '9999px' }}
    >
      <span 
        ref={textRef}
        className="text-black font-mono text-[9px] tracking-[0.15em] font-medium uppercase transition-opacity duration-200"
        style={{ opacity: 0, whiteSpace: 'nowrap' }}
      />
    </div>
  );
}
