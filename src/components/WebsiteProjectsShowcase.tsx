import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionTemplate } from 'motion/react';
import { ArrowLeft, ArrowRight, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { PROJECTS_DATA } from './WebsiteProjectsShowcase/projectsData';
import LiveWebsiteIframe from './WebsiteProjectsShowcase/LiveWebsiteIframe';
import { supabase } from '../lib/supabase';
import { ProjectItem } from './WebsiteProjectsShowcase/types';

export default function WebsiteProjectsShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<ProjectItem[]>(PROJECTS_DATA);
  const [activeIndex, setActiveIndex] = useState(0);
  const [settledActiveIndex, setSettledActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('audio_atmosphere') !== 'enabled';
    } catch (_) {
      return true;
    }
  });
  const [glitchTrigger, setGlitchTrigger] = useState(0); // increments to trigger flash animation
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Capture precise scroll progress for the multi-stage track inside sticky bounds
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Decelerate values elegantly — higher stiffness means fewer frames to settle
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 38,
    mass: 0.7,
  });

  // Load custom projects directly from Supabase
  useEffect(() => {
    async function fetchSupabaseProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) {
          console.warn('Could not load projects from Supabase rules/table, falling back to static schema:', error);
          return;
        }

        if (data && data.length > 0) {
          const formatted: ProjectItem[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category || '',
            accentColor: item.accent_color,
            badge: item.badge,
            tech: item.tech || [],
            description: item.description,
            linkText: item.link_text,
            linkUrl: item.link_url,
            glow: item.glow || ''
          }));
          setProjects(formatted);
        }
      } catch (err) {
        console.warn('Network issue connecting to Supabase client, using local bundle static projects:', err);
      }
    }
    fetchSupabaseProjects();
  }, []);

  // Listen for audio preference changed globally (from the start of the website)
  useEffect(() => {
    const handlePrefChange = () => {
      try {
        setIsMuted(localStorage.getItem('audio_atmosphere') !== 'enabled');
      } catch (_) {}
    };
    window.addEventListener('audio_preference_changed', handlePrefChange);
    return () => {
      window.removeEventListener('audio_preference_changed', handlePrefChange);
    };
  }, []);

  // Initialize and preload the audio clip
  useEffect(() => {
    const audio = new Audio('https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780237960/one-single-mechanica-1-1780237577036_ag7N6WSq_x7uthh.mp3');
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, []);

  const prevIndexRef = useRef(0);

  // Trigger cinematic mechanical sounds and transition glitches on slide changes
  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      if (!(window as any).isJumping) {
        // Trigger temporary glitch flash
        setGlitchTrigger(prev => prev + 1);

        // Play slide-shift sound
        if (!isMuted) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.volume = 0.6;
            audioRef.current.play().catch(err => {
              console.log('Audio element playback error:', err);
            });
          }
        }
      }
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex, isMuted]);

  // PARALLAX STAGE COORDINATE TRANSFORMS (Relative to stuck scroll range)

  // Layer 1: Textured cosmic background (slight travel to keep deep negative space organic)
  const bgY = useTransform(smoothProgress, [0, 0.5, 1], ['-8%', '0%', '8%']);
  const bgScale = useTransform(smoothProgress, [0, 0.5, 1], [1.10, 1.0, 1.10]);

  // Layer 2: Person (rises from deep up at start, reaches perfect hand placement by 0.12, remains stationary till unlocked)
  const personY = useTransform(
    smoothProgress,
    (v) => {
      if (isMobile) {
        if (v < -0.15) return '115vh';
        if (v > 0.12) return '-8.5vh';
        const progress = (v + 0.15) / 0.27;
        return `${115 - progress * (115 - (-8.5))}vh`;
      } else {
        if (v < -0.15) return '115vh';
        if (v > 0.12) return '0vh';
        const progress = (v + 0.15) / 0.27;
        return `${115 - progress * 115}vh`;
      }
    }
  );
  const personScale = useTransform(
    smoothProgress,
    (v) => {
      const base = v < -0.15 ? 0.85 : v > 0.12 ? 1.0 : 0.85 + ((v + 0.15) * 0.15) / 0.27;
      return base * (isMobile ? 1.35 : 1.0);
    }
  );

  // Layer 3: Tablet Bezel Chassis (synced perfectly with Miftahul's hands, stabilized by 0.12)
  const tabletY = useTransform(
    smoothProgress,
    (v) => {
      if (isMobile) {
        if (v < -0.15) return '85vh';
        if (v > 0.12) return '-8.5vh';
        const progress = (v + 0.15) / 0.27;
        return `${85 - progress * (85 - (-8.5))}vh`;
      } else {
        if (v < -0.15) return '85vh';
        if (v > 0.12) return '0vh';
        const progress = (v + 0.15) / 0.27;
        return `${85 - progress * 85}vh`;
      }
    }
  );
  const tabletScale = useTransform(
    smoothProgress,
    (v) => {
      const base = v < -0.15 ? 0.78 : v > 0.12 ? 1.0 : 0.78 + ((v + 0.15) * 0.22) / 0.27;
      return base * (isMobile ? 1.35 : 1.0);
    }
  );
  const tabletRotate = useTransform(
    smoothProgress,
    [-0.15, 0.12, 1],
    [-10, 0, 0]
  );

  // High performance active index tracker using ref comparison to bypass 99% of React state reconciliations per scroll tick
  const lastIndexRef = useRef(0);

  // Dynamic active index parser according to scroll progression and projects list count
  useEffect(() => {
    return smoothProgress.on("change", (latest) => {
      if (projects.length === 0) return;
      const count = projects.length;
      
      // We want to divide the scroll range [0.0, 0.85] into segments for the projects.
      // The last project (count - 1) will remain active from 0.85 all the way to 1.0,
      // which gives the user a massive 15% section of the scroll depth to view it fully
      // and interact with it comfortably while the card is pinned, before it scrolls away.
      const thresholdEnd = 0.85;
      const step = thresholdEnd / Math.max(1, count - 1);
      
      let idx = Math.floor(latest / step);
      idx = Math.min(Math.max(0, idx), count - 1);
      
      if (idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        setActiveIndex(idx);
      }
    });
  }, [smoothProgress, projects]);

  // Debounce the iframe activation during active scrolling to prevent layout locks
  useEffect(() => {
    const handler = setTimeout(() => {
      setSettledActiveIndex(activeIndex);
    }, 280);
    return () => clearTimeout(handler);
  }, [activeIndex]);

  // Helper for mobile horizontal swipes
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Action function to manually trigger smooth scrolling to specific state height
  const scrollToStage = (direction: 'next' | 'prev') => {
    const count = projects.length;
    const targetIndex = direction === 'next' 
      ? Math.min(activeIndex + 1, count - 1) 
      : Math.max(activeIndex - 1, 0);

    if (!containerRef.current) return;
    const element = containerRef.current;
    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    const thresholdEnd = 0.85;
    const step = thresholdEnd / Math.max(1, count - 1);

    // Centered targeted scroll progression value inside the active zone
    const targetProgress = targetIndex === count - 1
      ? 0.92
      : (targetIndex + 0.5) * step;

    const sectionTop = scrollTop + rect.top;
    const scrollRange = rect.height - window.innerHeight;
    const absoluteTargetY = sectionTop + (scrollRange * targetProgress);

    window.scrollTo({
      top: absoluteTargetY,
      behavior: 'smooth'
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe if deltaX is significant and primarily horizontal
    if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 60) {
      if (deltaX > 0) {
        scrollToStage('prev');
      } else {
        scrollToStage('next');
      }
    }
  };

  const activeProj = projects[activeIndex] || PROJECTS_DATA[0];

  return (
    <div 
      id="outcomes"
      ref={containerRef} 
      className="relative w-full h-[480vh] md:h-[750vh] bg-[#030202] z-30 overflow-visible"
    >
      {/* Sticky viewing container that locks the viewport while scrolling through the effect */}
      <div 
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        className="sticky top-0 w-full h-[100dvh] md:h-screen overflow-hidden flex items-center justify-center pointer-events-none"
      >
        
        {/* Section Heading "OUTCOMES" */}
        <div className="absolute top-[9vh] sm:top-[12vh] left-[1.5rem] sm:left-[clamp(1.5rem,5vw,50px)] pointer-events-none z-30 flex items-center gap-2 sm:gap-3.5 select-none font-sans">
          <span className="w-3 sm:w-5 h-[1px] bg-stone-600" />
          <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.35em] text-stone-400 font-medium">
            OUTCOMES
          </h2>
        </div>

        {/* Ambient Dark Spotlight Glow in Center */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#030202]/35 to-[#030202] z-20 pointer-events-none" />

        {/* ================= LAYER 1: TEXTURED COSMIC BACKGROUND ================= */}
        <motion.div 
          style={{ y: bgY, scale: bgScale, willChange: 'transform' }}
          className="absolute inset-0 w-full h-[120%] -top-[10%] select-none z-0 transform-gpu"
        >
          <img 
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780231556/Background_wpwatv.jpg" 
            alt="Textured Background"
            className="w-full h-full object-cover opacity-50 md:filter md:contrast-[1.12] md:brightness-[0.7] md:saturate-[0.8]"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Soft elegant backlight behind the device representing a luxury gallery light leak */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vw] h-[58vw] max-w-[700px] rounded-full blur-[180px] pointer-events-none z-10 transition-all duration-[1000ms] ease-out-expo"
          style={{
            backgroundColor: activeProj.accentColor,
            opacity: 0.04
          }}
        />

        {/* ================= LAYER 2: MYSELF ================= */}
        <motion.div 
          style={{ y: personY, scale: personScale, willChange: 'transform' }}
          className="absolute inset-0 w-full h-full flex items-center justify-center select-none z-10 transform-gpu"
        >
          <div className="w-full h-full flex items-center justify-center scale-[1.35] sm:scale-100 origin-center transition-transform duration-300">
            <img 
              src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780231578/my_image_hthdxq.png" 
              alt="Miftahul Islam"
              className="w-full h-full max-w-[1240px] max-h-[85vh] object-contain md:filter md:drop-shadow-[0_28px_55px_rgba(0,0,0,0.92)] md:contrast-[1.04]"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* ================= LAYER 3: TABLET CHASSIS & SCREEN ================= */}
        <motion.div 
          style={{ y: tabletY, scale: tabletScale, rotate: tabletRotate, willChange: 'transform' }}
          className="absolute inset-0 w-full h-full flex items-center justify-center select-none z-20 overflow-visible transform-gpu"
        >
          <div className="scale-[1.35] sm:scale-100 origin-center flex items-center justify-center overflow-visible w-full h-full">
            <div 
              className="relative flex items-center justify-center overflow-visible w-[171px] sm:w-[350px] md:w-[410px] h-[116.78px] sm:h-auto aspect-[410/280] mt-[55px] sm:mt-[40px] md:mt-[146.742px] pl-[1px] sm:pl-0"
            >
            
            {/* Subtle, thin framing border */}
            <div className="absolute -inset-8 border border-white/[0.03] rounded-3xl pointer-events-none z-10 animate-fade-in" />

            {/* ONE SINGLE UNIFIED DYNAMIC PORTAL IFRAME SECTION WITH AESTHETIC SLIDING SCENE LAYOUT */}
            {/* Fits absolutely perfectly within the tablet chassis with a smaller centered custom framing window */}
            <div 
              className="absolute top-[15.8%] sm:top-[16.2%] left-[11.4%] sm:left-[11.8%] w-[77.2%] sm:w-[76.4%] h-[64.8%] sm:h-[64.0%] rounded-[1px] sm:rounded-[3px] md:rounded-[4px] overflow-hidden bg-black z-10 p-0 shadow-[0_8px_16px_rgba(0,0,0,0.6)] border border-stone-900/50"
            >
              <div className="relative w-full h-full overflow-hidden bg-black">
                {projects.map((proj, idx) => {
                  // Only mount the iframe component for the active and adjacent slides to keep DOM clean
                  const isClose = Math.abs(idx - activeIndex) <= 1;
                  
                  return (
                    <motion.div
                      key={proj.id || idx}
                      initial={false}
                      animate={{
                        x: `${(idx - activeIndex) * 100}%`,
                        scale: idx === activeIndex ? 1 : 0.94,
                        opacity: idx === activeIndex ? 1 : 0.15,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 120,
                        damping: 19,
                        mass: 0.85,
                      }}
                      className="absolute inset-0 w-full h-full transform-gpu"
                      style={{
                        zIndex: idx === activeIndex ? 10 : 5,
                        pointerEvents: idx === activeIndex ? "auto" : "none",
                        backfaceVisibility: 'hidden',
                        willChange: 'transform, opacity',
                      }}
                    >
                      {isClose ? (
                        <LiveWebsiteIframe 
                          url={proj.linkUrl} 
                          index={idx} 
                          activeIndex={settledActiveIndex} 
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#0a0a0a]" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Cinematic Fade Transition Layer inside display boundaries */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute top-[15.8%] sm:top-[16.2%] left-[11.4%] sm:left-[11.8%] w-[77.2%] sm:w-[76.4%] h-[64.8%] sm:h-[64.0%] bg-[#030202] rounded-[1px] sm:rounded-[3px] md:rounded-[4px] pointer-events-none z-20"
              />
            </AnimatePresence>

            {/* G. CHASSIS CONTAINER OVERLAY (BEZEL FRAMING ON TOP to mask iframe overflow beautifully) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-30">
              <img 
                src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780235422/ChatGPT_Image_May_31_2026_07_37_49_PM_fsjkar.png" 
                alt="Floating Predator Tablet chassis border"
                className="w-full h-full object-fill md:filter md:drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
              />
            </div>

             {/* GLASS HEAVY GLARE OVERLAY (Sits right over screen content inside Bezel framework) */}
            <div className="absolute top-[15.8%] sm:top-[16.2%] left-[11.4%] sm:left-[11.8%] w-[77.2%] sm:w-[76.4%] h-[64.8%] sm:h-[64.0%] bg-gradient-to-tr from-white/[0.015] via-transparent to-white/[0.04] rounded-[1px] sm:rounded-[3px] md:rounded-[4px] pointer-events-none z-40 mix-blend-overlay" />

             {/* HOVER CURSOR VIEW LIVE INTERACTIVE TRIGGERS OVERLAY */}
             <div 
               data-cursor="view-live"
               onClick={() => {
                 if (activeProj.linkUrl) {
                   window.open(activeProj.linkUrl, '_blank', 'noopener,noreferrer');
                 }
               }}
               className="absolute top-[15.8%] sm:top-[16.2%] left-[11.4%] sm:left-[11.8%] w-[77.2%] sm:w-[76.4%] h-[64.8%] sm:h-[64.0%] rounded-[1px] sm:rounded-[3px] md:rounded-[4px] z-45 cursor-none bg-transparent pointer-events-auto"
             />

            {/* INTUITIVE STEP CONTROLS WITH EDITORIAL REFINEMENT */}
            <div className="absolute -bottom-[35px] sm:-bottom-16 w-[185px] sm:w-full left-1/2 -translate-x-1/2 flex justify-between items-center px-1 sm:px-8 z-50 pointer-events-auto scale-[0.8] sm:scale-100 origin-center">
              <button 
                id="slide-control-prev"
                onClick={() => scrollToStage('prev')}
                disabled={activeIndex === 0}
                className="flex items-center gap-0.5 font-sans text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] text-stone-400 disabled:opacity-20 disabled:pointer-events-none transition-all duration-300 hover:text-white cursor-pointer"
              >
                Prev
              </button>

              {/* Elegant desaturated dots */}
              <div className="flex gap-1.5 sm:gap-2.5 items-center">
                {projects.map((_, i) => (
                  <span 
                    key={i} 
                    className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: activeIndex === i ? '#F5F5F4' : '#292524',
                      transform: activeIndex === i ? 'scale(1.25)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>

              <button 
                id="slide-control-next"
                onClick={() => scrollToStage('next')}
                disabled={activeIndex === projects.length - 1}
                className="flex items-center gap-0.5 font-sans text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] text-stone-400 disabled:opacity-20 disabled:pointer-events-none transition-all duration-300 hover:text-white cursor-pointer"
              >
                Next
              </button>
            </div>

          </div>
          </div>
         </motion.div>

        {/* ================= EDITORIAL SIDE TEXT PANEL ================= */}

        {/* LEFT TEXT PANEL: BEAUTIFUL EDITORIAL SECTION BRANDING */}
        <div 
          className="absolute left-[clamp(1rem,4vw,50px)] bottom-[3.5vh] sm:bottom-[6vh] md:bottom-[12vh] max-w-[280px] md:max-w-md z-30 pointer-events-auto flex flex-col items-start justify-end text-left select-text"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start w-full text-left"
            >
              <span 
                className="font-sans text-[10px] uppercase tracking-[0.25em] mb-4 font-semibold text-stone-400 hidden sm:block"
              >
                — {activeProj.badge}
              </span>
              
              <h2 className="font-display text-[clamp(1.5rem,4.5vw,2.5rem)] md:text-[clamp(2.1rem,3.8vw,3.2rem)] leading-[1.05] font-light text-white tracking-tight uppercase mb-2.5 sm:mb-5">
                {activeProj.title}
              </h2>
              
              <p className="font-sans text-[10px] md:text-[11px] sm:text-xs text-stone-400 font-light leading-relaxed max-w-[240px] md:max-w-[280px]">
                {activeProj.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT SIDE BRANDING & PAGE INDEX */}
        <div 
          className="absolute right-[1.5rem] sm:right-[clamp(1.5rem,5vw,50px)] top-[9vh] sm:top-[12vh] pointer-events-none z-30 select-none text-right"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,1)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 sm:gap-3.5 justify-end"
            >
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="font-mono text-[7px] sm:text-[9px] text-stone-500 tracking-[0.2em] sm:tracking-[0.25em] uppercase block font-medium leading-none mb-1">
                  SHOWCASE
                </span>
                <span className="font-sans text-[10px] sm:text-[11px] md:text-xs text-[#A69F95] tracking-[0.18em] uppercase hidden sm:block font-medium leading-none">
                  Vibe-Coded Websites
                </span>
              </div>
              <span className="hidden sm:block w-3 sm:w-5 h-[1px] bg-stone-700" />
              <span className="font-display text-[1.4rem] sm:text-[2.2rem] md:text-[2.8rem] tracking-tighter text-stone-100 font-extralight leading-none">
                0{activeIndex + 1}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

         {/* Subtle top/bottom standard aesthetic section gradients */}
        <div className="absolute bottom-0 left-0 w-full h-[15vh] bg-gradient-to-t from-[#030202] to-transparent pointer-events-none z-30" />
        <div className="absolute top-0 left-0 w-full h-[15vh] bg-gradient-to-b from-[#030202] to-transparent pointer-events-none z-30" />


      </div>
    </div>
  );
}
