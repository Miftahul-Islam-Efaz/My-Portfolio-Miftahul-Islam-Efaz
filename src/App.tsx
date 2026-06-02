import React, { useEffect, useState, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import CustomCursor from './components/CustomCursor';
import RevealLoader from './components/ui/reveal-loader';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import OrbitSection from './components/OrbitSection';
import SkillShowcase from './components/SkillShowcase';
import Services from './components/Services';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import TornTransition from './components/ui/torn-transition';
import WebsiteProjectsShowcase from './components/WebsiteProjectsShowcase';
import GlitchSectionTransition from './components/ui/GlitchSectionTransition';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [loaderComplete, setLoaderComplete] = useState(false);
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

  // Request native audio experience permission before the website displays using Chrome's default browser permission system
  useEffect(() => {
    const askForPermission = async () => {
      // Avoid asking repeatedly if already decided
      if (localStorage.getItem('audio_atmosphere_asked') === 'true') {
        return;
      }
      try {
        // Request the standard browser default permission system (microphone/audio)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Mark as allowed/enabled
        localStorage.setItem('audio_atmosphere', 'enabled');
        localStorage.setItem('audio_atmosphere_asked', 'true');
        
        // Instantly release/stop all tracks so the browser is not actively recording and privacy is fully protected
        stream.getTracks().forEach((track) => track.stop());
        
        // Notify all components that sound preferences have changed
        window.dispatchEvent(new Event('audio_preference_changed'));
        
        // Unlock browser audio context securely under browser autoplay specifications
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        }
      } catch (err) {
        console.warn('Native browser audio permission denied or unavailable inside parent context:', err);
        localStorage.setItem('audio_atmosphere', 'disabled');
        localStorage.setItem('audio_atmosphere_asked', 'true');
        window.dispatchEvent(new Event('audio_preference_changed'));
      }
    };

    // Prompt after loader gets underway to sync naturally before full load
    const timer = setTimeout(() => {
      askForPermission();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <CustomCursor />
      <RevealLoader 
        onComplete={() => setLoaderComplete(true)} 
      />
      
      <div 
        className="relative w-full transition-opacity duration-[1200ms] ease-out"
        style={{ 
          opacity: loaderComplete ? 1 : 0,
          pointerEvents: loaderComplete ? 'auto' : 'none',
        }}
      >
        <Navigation />
        <main>
          <OrbitSection isStarted={loaderComplete}>
            <Hero isStarted={loaderComplete} />
            <SkillShowcase gltfPath="/assets/portfolio_2nd_section.glb" />
          </OrbitSection>
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
    </>
  );
}
