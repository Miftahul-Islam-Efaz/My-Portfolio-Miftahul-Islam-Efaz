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
import AchievementsSection from './components/AchievementsSection';
import GlitchSectionTransition from './components/ui/GlitchSectionTransition';
import SoundGate from './components/ui/SoundGate';
import FaviconAnimator from './components/FaviconAnimator';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [audioGateComplete, setAudioGateComplete] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;
    (window as any).lenis = lenis;

    // Initially stop Lenis scroll while loading to prevent user-scrolling jank
    lenis.stop();

    lenis.on('scroll', ScrollTrigger.update);

    let lenisTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisTicker);

    gsap.ticker.lagSmoothing(0);

    // Global scroll reveals
    const revealElements = document.querySelectorAll('[data-reveal]');
    revealElements.forEach((el) => {
      const type = el.getAttribute('data-reveal');
      const delay = el.getAttribute('style')?.includes('--delay') 
        ? parseFloat((el as HTMLElement).style.getPropertyValue('--delay')) 
        : 0;

      let fromVars: gsap.TweenVars = {};
      let toVars: gsap.TweenVars = {
        opacity: 1,
        duration: 0.8,
        delay: delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
        }
      };

      if (type === 'fade-up') {
        fromVars = { y: 30, opacity: 0 };
        toVars.y = 0;
      } else if (type === 'fade-left') {
        fromVars = { x: -40, opacity: 0 };
        toVars.x = 0;
        toVars.duration = 0.7;
      } else if (type === 'clip-up') {
        fromVars = { clipPath: 'inset(100% 0 0 0)' };
        toVars.clipPath = 'inset(0 0 0 0)';
      }

      gsap.fromTo(el, fromVars, toVars);
    });

    return () => {
      lenis.destroy();
      (window as any).lenis = null;
      gsap.ticker.remove(lenisTicker);
    };
  }, []);

  // Sync scroll lock and refresh ScrollTrigger once the loader completes
  useEffect(() => {
    if (lenisRef.current) {
      if (loaderComplete) {
        lenisRef.current.start();
        ScrollTrigger.refresh();
      } else {
        lenisRef.current.stop();
      }
    }
  }, [loaderComplete]);

  return (
    <>
      {!audioGateComplete && (
        <SoundGate 
          onAccept={() => setAudioGateComplete(true)} 
          onDecline={() => setAudioGateComplete(true)} 
        />
      )}

      <RevealLoader 
        onComplete={() => setLoaderComplete(true)} 
        isStarted={audioGateComplete}
      />

      <FaviconAnimator loaderComplete={loaderComplete} />
      
      <div 
        className="relative w-full"
        style={{ 
          opacity: 1,
          pointerEvents: loaderComplete ? 'auto' : 'none',
        }}
      >
        <Navigation />
        <main>
          <Hero isStarted={loaderComplete} />
          <SkillShowcase gltfPath="/assets/portfolio_2nd_section_updated.glb" />
          <WebsiteProjectsShowcase />
          <AchievementsSection />
          <Services />
          <Testimonials />
        </main>
        <TornTransition 
          topContent={<Contact />}
          bottomContent={<Footer />}
        />
        <GlitchSectionTransition />
      </div>
      <CustomCursor />
    </>
  );
}
