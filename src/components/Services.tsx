import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useVelocity, useSpring, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Services() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  const x = useMotionValue(0);
  const xVelocity = useVelocity(x);
  
  // Optimized spring parameters for high-performance fluid rendering, reducing calculation drag/ticks on frame loop
  const xVelocitySpring = useSpring(xVelocity, { damping: 25, stiffness: 140, mass: 0.5, restDelta: 0.1, restSpeed: 0.1 });
  
  // Map velocity to rotation (tilt). Higher boundaries to allow for faster intro speed air-dragging.
  const skew = useTransform(xVelocitySpring, [-4000, 4000], [-30, 30]);

  // Elegant progress-bar transformation based on cards-container scroll value
  const progressBarX = useTransform(
    x,
    [constraints.left === 0 ? -1200 : constraints.left, 0],
    [128, 0]
  );

  useEffect(() => {
    const updateConstraints = () => {
      if (containerRef.current) {
        const scrollWidth = containerRef.current.scrollWidth;
        const clientWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
        const maxScroll = Math.max(0, scrollWidth - clientWidth); 
        setConstraints({ left: -maxScroll, right: 0 });
      }
    };

    updateConstraints();
    const timeoutId = setTimeout(updateConstraints, 100);
    window.addEventListener('resize', updateConstraints);
    
    // Card Intro Animation with real physics (Framer hook integration) mapping to ScrollTrigger
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && containerRef.current) {
      // Start container far right for right-to-left intro. No opacity fade, cards are fully firm and present.
      const proxy = { x: window.innerWidth * 1.5 };
      x.set(proxy.x);
      
      gsap.to(proxy, {
        x: 0,
        duration: 1.3, // Increased speed for realistic inertia and sudden stop simulation
        ease: 'power3.out', // Snaps fast out but gracefully decelerates, causing physics spring to catch intense inertia
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 10%', // Triggers exactly when 90% of the section is visible in top of UI
          once: true
        },
        onUpdate: () => {
          x.set(proxy.x); // Fast X updates push heavy velocity right-to-left, causing natural tilt & bounce on halt
        }
      });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateConstraints);
    };
  }, [x]);

  return (
    <section id="services" ref={sectionRef} className="hanging-services-section">
      {/* Background Image */}
      <img 
        loading="lazy"
        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780328743/services_bg_dftwtt.png"
        alt="Services Background"
        className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none transform-gpu will-change-transform"
        referrerPolicy="no-referrer"
      />
      <style>{`
        .hanging-services-section {
            background: var(--color-eerie);
            padding: 120px 0 120px;
            position: relative;
            overflow: hidden;
        }
        .hanging-services-section .section-header {
            max-width: 1400px;
            margin: 0 auto 60px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 0 clamp(1.5rem, 5vw, 4rem);
            position: relative;
            z-index: 10;
        }
        @media (min-width: 768px) {
            .hanging-services-section .section-header {
                flex-direction: row;
                align-items: flex-end;
                justify-content: space-between;
            }
        }
        .hanging-services-section .section-title {
            font-size: clamp(40px, 8vw, 90px);
            font-weight: 400;
            color: var(--color-pearl);
            line-height: 1;
            letter-spacing: -0.02em;
            margin: 0;
            font-family: 'Backstreet', sans-serif;
            text-decoration-line: none;
            text-align: left;
        }
        
        .hanging-services-section .gallery-viewport {
            position: relative;
            width: 100%;
            height: 630px;
            cursor: grab;
            padding-top: 20px;
            z-index: 10;
        }
        .hanging-services-section .gallery-viewport:active {
            cursor: grabbing;
        }
        
        /* The Track Line passing through the eyelets */
        .hanging-services-section .track-line {
            position: absolute;
            top: 77px;
            left: 0;
            width: 100%;
            height: 6px;
            background: #C0C0C0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            /* Z-index must be LOWER than the cards so the left side of cards cover it */
            z-index: 5;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            pointer-events: none;
        }

        .hanging-services-section .card-slot {
            position: relative;
            width: 380px;
            height: 570px;
            flex-shrink: 0;
        }
        
        .hanging-services-section .track-overlay {
            position: absolute;
            top: 77px;
            left: calc(50% + 14px); /* Starts right at the right edge of the hole */
            width: calc(50% - 14px); /* Ends exactly at right edge of slot */
            height: 6px;
            background: #C0C0C0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 15; /* OVER the card */
            pointer-events: none;
        }

        /* The hole must be masked in the pad, but the rod goes INTO it. */
        /* To create the illusion of going INTO the hole, we need a small mask on the track-line itself 
           However, a simpler and more robust CSS approach to "in through the hole" is:
           1. Track z-index is higher than the card body. (It covers the card).
           2. The pad has a hole cut out of it.
           3. Inside the hole, we render a small "shadow" or dark circle that sits OVER the track line
              but UNDER the pad mask, or we just rely on the track line passing across the card, 
              but being masked *out* by the hole's "interior". 
              
           The simplest way to perfectly replicate the video:
           The card is at z-index 10.
           The rod is at z-index 15 (it is drawn over everything).
           BUT to make it look like it goes *into* the hole, we create an absolutely positioned circle 
           (the "hole interior") that sits at z-index 20 (on top of the rod), 
           which renders the dark background color and inner shadow, effectively "hiding" the rod where the hole is.
        */
        
        .hanging-services-section .cards-container {
            display: flex;
            gap: 60px;
            padding: 0 clamp(1.5rem, 5vw, 4rem);
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: max-content;
            z-index: 10;
            will-change: transform;
            transform: translate3d(0, 0, 0);
        }
        
        .hanging-services-section .card-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transform-origin: 50% 80px;
            z-index: 10;
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
        }
        
        .hanging-services-section .card-container {
            background: var(--color-charcoal);
            border-radius: 20px;
            padding: 12px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.05);
            height: 100%;
            position: relative;
            z-index: 10;
            /* Punch hole at 50% X and 80px Y for the rod */
            -webkit-mask-image: radial-gradient(circle at 50% 80px, transparent 15px, black 16px);
            mask-image: radial-gradient(circle at 50% 80px, transparent 15px, black 16px);
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
        }
        
        .hanging-services-section .service-card {
            background-color: var(--card-bg);
            background-image: var(--card-bg-img);
            background-size: 100% 100%;
            background-position: center;
            border-radius: 12px;
            padding: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
        }
        
        /* The Flat Attachment Pad (Squircle) */
        .hanging-services-section .attachment-pad {
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            border-radius: 20px;
            background: #EFEFED;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            padding: 10px 0 12px 0;
            /* Must be lower than rod (15) so rod goes OVER the pad. */
            z-index: 10; 
            box-shadow: 0 8px 20px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.2);
            border: 1px solid rgba(0,0,0,0.05);
        }
        
        .hanging-services-section .attachment-pad span {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px;
            font-weight: 700;
            color: #1A1A1A;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1;
        }

        /* Reverted pad colors to website's theme instead of bright colors */
        .hanging-services-section .card-wrapper[data-service="figma"] {
            --card-bg: var(--color-pearl);
            --card-bg-img: url('https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780339447/Card1_rgdcyn.png');
            --card-text: var(--color-eerie);
            --card-title-color: rgba(15, 11, 10, 0.15);
            --card-footer-bg: rgba(15, 11, 10, 0.03);
            --card-border: rgba(15, 11, 10, 0.1);
            --pad-bg: #EFEFED; 
            --pad-text: #1A1A1A;
        }
        .hanging-services-section .card-wrapper[data-service="dev"] {
            --card-bg: var(--color-taupe);
            --card-bg-img: url('https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780763649/card2_vqgco6.png');
            --card-text: var(--color-eerie);
            --card-title-color: rgba(15, 11, 10, 0.2);
            --card-footer-bg: rgba(15, 11, 10, 0.05);
            --card-border: rgba(15, 11, 10, 0.1);
            --pad-bg: #EFEFED; 
            --pad-text: #1A1A1A;
        }
        .hanging-services-section .card-wrapper[data-service="auto"] {
            --card-bg: var(--color-mist);
            --card-bg-img: url('https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780340033/card3_nobkmx.png');
            --card-text: var(--color-eerie);
            --card-title-color: rgba(15, 11, 10, 0.15);
            --card-footer-bg: rgba(15, 11, 10, 0.03);
            --card-border: rgba(15, 11, 10, 0.1);
            --pad-bg: #EFEFED; 
            --pad-text: #1A1A1A;
        }
        .hanging-services-section .card-wrapper[data-service="backend"] {
            --card-bg: var(--color-eerie);
            --card-bg-img: url('https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780764050/card4_daktqg.png');
            --card-text: var(--color-pearl);
            --card-title-color: rgba(242, 240, 241, 0.1);
            --card-footer-bg: rgba(242, 240, 241, 0.03);
            --card-border: rgba(242, 240, 241, 0.1);
            --pad-bg: #EFEFED; 
            --pad-text: #1A1A1A;
        }
        .hanging-services-section .card-wrapper[data-service="gen"] {
            --card-bg: var(--color-eerie);
            --card-bg-img: url('https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780763780/card5_udnbhw.png');
            --card-text: var(--color-pearl);
            --card-title-color: rgba(242, 240, 241, 0.1);
            --card-footer-bg: rgba(242, 240, 241, 0.03);
            --card-border: rgba(242, 240, 241, 0.1);
            --pad-bg: #EFEFED; 
            --pad-text: #1A1A1A;
        }
        
        .hanging-services-section .card-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            z-index: 2;
            padding-top: 140px; /* Space for eyelet tag and hole */
        }
        
        .hanging-services-section .card-title {
            font-size: clamp(40px, 8vw, 80px);
            font-weight: 400;
            color: var(--card-title-color);
            line-height: 0.9;
            letter-spacing: -0.05em;
            margin: 0;
            text-align: center;
            font-family: 'Backstreet', sans-serif;
            text-transform: uppercase;
            padding: 0 20px;
            word-break: break-word;
        }
        
        .hanging-services-section .card-footer {
            background: var(--card-footer-bg);
            margin-top: auto;
            padding: 30px 24px;
            border-top: 1px solid var(--card-border);
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .hanging-services-section .service-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--card-text);
            opacity: 0.5;
            display: block;
            font-family: 'IBM Plex Mono', monospace;
        }
        
        .hanging-services-section .service-name {
            font-size: 20px;
            font-weight: 400;
            color: var(--card-text);
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            font-family: 'Backstreet', sans-serif;
        }
        
        .hanging-services-section .skills-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .hanging-services-section .skills-list li {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: var(--card-text);
            opacity: 0.8;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .hanging-services-section .skills-list li::before {
            content: '';
            width: 4px;
            height: 4px;
            background: var(--card-text);
            border-radius: 50%;
            opacity: 0.5;
        }
        
        @media (max-width: 900px) {
            .hanging-services-section .gallery-viewport { height: 560px; }
            .hanging-services-section .card-slot { width: 330px; height: 495px; }
            .hanging-services-section .card-title { font-size: clamp(32px, 6vw, 60px); }
        }
      `}</style>

      <div className="section-header">
        <div>
          <h2 className="section-title">Core Expertise</h2>
        </div>
        <motion.div 
          animate={{
            opacity: hasDragged ? 0.25 : [0.7, 1, 0.7],
            scale: hasDragged ? 0.96 : [1, 1.02, 1],
          }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          }}
          className="flex items-center gap-2.5 bg-[#0e0e11]/60 border border-white/10 px-3.5 py-1.5 rounded-full select-none backdrop-blur-md transition-all duration-300 hover:border-white/20 mt-4 md:mt-0"
        >
          <div className="relative w-1.5 h-1.5 flex items-center justify-center">
            <span className="absolute w-2 h-2 rounded-full bg-[#b54a4a] opacity-75 animate-ping" />
            <span className="relative w-1 h-1 rounded-full bg-[#b54a4a]" />
          </div>
          <span className="font-mono text-[8px] tracking-[0.25em] text-[#EFEFED]/90 uppercase font-bold flex items-center gap-1.5">
            DRAG TO EXPLORE 
            <span className="inline-flex text-[#b54a4a] text-[10px] items-center">
              ↔
            </span>
          </span>
        </motion.div>
      </div>
      
      <div className="gallery-viewport">
        <div className="track-line"></div>
        
        <motion.div 
          ref={containerRef}
          className="cards-container"
          drag="x"
          dragConstraints={constraints}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
          style={{ x }}
          onDragStart={() => setHasDragged(true)}
          onTouchStart={() => setHasDragged(true)}
          onMouseDown={() => setHasDragged(true)}
        >
          
          {/* CARD 1: FIGMA */}
          <div className="card-slot">
            <motion.div className="card-wrapper" data-service="figma" style={{ rotate: skew }}>
              <div className="card-container">
                <div className="service-card">
                  <div className="attachment-pad">
                    <span>CRAFT</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="track-overlay"></div>
          </div>
        
          {/* CARD 2: DEV */}
          <div className="card-slot">
            <motion.div className="card-wrapper" data-service="dev" style={{ rotate: skew }}>
              <div className="card-container">
                <div className="service-card">
                  <div className="attachment-pad">
                    <span>RENDER</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="track-overlay"></div>
          </div>
        
          {/* CARD 3: AUTO */}
          <div className="card-slot">
            <motion.div className="card-wrapper" data-service="auto" style={{ rotate: skew }}>
              <div className="card-container">
                <div className="service-card">
                  <div className="attachment-pad">
                    <span>SYNC</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="track-overlay"></div>
          </div>
        
          {/* CARD 4: BACKEND */}
          <div className="card-slot">
            <motion.div className="card-wrapper" data-service="backend" style={{ rotate: skew }}>
              <div className="card-container">
                <div className="service-card">
                  <div className="attachment-pad">
                    <span>CORE</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="track-overlay"></div>
          </div>
        
          {/* CARD 5: GEN */}
          <div className="card-slot">
            <motion.div className="card-wrapper" data-service="gen" style={{ rotate: skew }}>
              <div className="card-container">
                <div className="service-card">
                  <div className="attachment-pad">
                    <span>GEN</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="track-overlay"></div>
          </div>
        
      </motion.div>
      </div>

      {/* Horizontal HUD Progress Bar */}
      <div className="flex justify-center mt-8 z-20 relative select-none pointer-events-none">
        <div className="relative w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="absolute top-0 bottom-0 left-0 w-16 bg-[#b54a4a]/85 rounded-full"
            style={{ x: progressBarX }}
          />
        </div>
      </div>

      {/* Premium Minimal Side Hint */}
      <motion.div 
        animate={{ 
          opacity: hasDragged ? 0 : [0, 0.45, 0],
          x: hasDragged ? 15 : [10, -5, 10]
        }}
        transition={{ 
          repeat: hasDragged ? 0 : Infinity, 
          duration: 2.5, 
          ease: "easeInOut" 
        }}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-25 pointer-events-none hidden md:flex flex-col items-center gap-1.5"
      >
        <span className="font-mono text-[8px] tracking-[0.3em] font-extrabold text-white/40 uppercase [writing-mode:vertical-lr] select-none">
          SWIPE TRACK
        </span>
        <span className="text-[#b54a4a] text-xs font-bold mt-1">→</span>
      </motion.div>
    </section>
  );
}
