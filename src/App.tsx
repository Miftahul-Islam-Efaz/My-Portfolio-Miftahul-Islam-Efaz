import React, { useEffect, useState, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import CustomCursor from './components/CustomCursor';
import RevealLoader from './components/ui/reveal-loader';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import SkillShowcase from './components/SkillShowcase';
import Services from './components/Services';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import TornTransition from './components/ui/torn-transition';
import WebsiteProjectsShowcase from './components/WebsiteProjectsShowcase';

import GlitchSectionTransition from './components/ui/GlitchSectionTransition';
import FaviconAnimator from './components/FaviconAnimator';
import AskLLMPopup from './components/AskLLMPopup';
import VibeCheckPopup from './components/VibeCheckPopup';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [introExiting, setIntroExiting] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;
    const lenis = new Lenis({
      duration: isMobileDevice ? 1.2 : 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: isMobileDevice ? 0.8 : 1.8,
      syncTouch: isMobileDevice ? true : false,
    });

    lenisRef.current = lenis;
    (window as any).lenis = lenis;

    // Initially stop Lenis scroll while loading to prevent user-scrolling jank
    lenis.stop();

    lenis.on('scroll', ScrollTrigger.update);

    const lenisTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisTicker);

    gsap.ticker.lagSmoothing(0);

    // Defer global scroll reveals to not block critical-path rendering
    // Use a short timeout so the initial paint can happen first
    const revealTimeout = setTimeout(() => {
      const revealElements = document.querySelectorAll('[data-reveal]');
      revealElements.forEach((el) => {
        const type = el.getAttribute('data-reveal');
        const delay = el.getAttribute('style')?.includes('--delay') 
          ? parseFloat((el as HTMLElement).style.getPropertyValue('--delay')) 
          : 0;

        let fromVars: gsap.TweenVars = {};
        let toVars: gsap.TweenVars = {
          opacity: 1,
          duration: 0.7,
          delay: delay,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true, // Fire only once — no re-animation on scroll-back
          }
        };

        if (type === 'fade-up') {
          fromVars = { y: 25, opacity: 0 };
          toVars.y = 0;
        } else if (type === 'fade-left') {
          fromVars = { x: -30, opacity: 0 };
          toVars.x = 0;
          toVars.duration = 0.6;
        } else if (type === 'clip-up') {
          fromVars = { clipPath: 'inset(100% 0 0 0)' };
          toVars.clipPath = 'inset(0 0 0 0)';
        }

        gsap.fromTo(el, fromVars, toVars);
      });
    }, 100);

    return () => {
      clearTimeout(revealTimeout);
      lenis.destroy();
      (window as any).lenis = null;
      gsap.ticker.remove(lenisTicker);
    };
  }, []);

  // Sync scroll lock and refresh ScrollTrigger once the loader starts exiting
  useEffect(() => {
    if (lenisRef.current) {
      if (introExiting) {
        lenisRef.current.start();
        ScrollTrigger.refresh();
      } else {
        lenisRef.current.stop();
      }
    }
  }, [introExiting]);

  return (
    <>
      <RevealLoader 
        onExitStart={() => setIntroExiting(true)}
        onExitComplete={() => setIntroComplete(true)}
        isStarted={true}
      />

      <FaviconAnimator loaderComplete={introComplete} />
      
      <div 
        className="relative w-full"
        style={{ 
          opacity: 1,
          pointerEvents: introExiting ? 'auto' : 'none',
        }}
      >
        <Navigation />
        <main>
          <Hero isStarted={introExiting} isComplete={introComplete} />
          <SkillShowcase 
            gltfPath="/portfolio_2nd_section_eiyd6w.glb" 
            isStarted={introComplete}
          />
          <WebsiteProjectsShowcase />

          <Services />
          <Testimonials />
        </main>
        <TornTransition 
          topContent={<Contact />}
          bottomContent={<Footer />}
        />
        <GlitchSectionTransition />
      </div>
      <AskLLMPopup />
      <VibeCheckPopup />
      <CustomCursor />
    </>
  );
}
