import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate, AnimatePresence, useMotionValueEvent } from 'motion/react';
import { ExternalLink } from 'lucide-react';

export default function AchievementsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCert, setSelectedCert] = useState<{ url: string; title: string } | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up play-unlock gesture triggers for the transparent smoke WebM video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch((err) => {
        console.log("Achievements smoke WebM play pending gesture unlock:", err);
      });
    };

    tryPlay();

    window.addEventListener('click', tryPlay, { once: true });
    window.addEventListener('touchstart', tryPlay, { once: true });
    window.addEventListener('scroll', tryPlay, { once: true });
    window.addEventListener('audio_preference_changed', tryPlay);

    return () => {
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
      window.removeEventListener('scroll', tryPlay);
      window.removeEventListener('audio_preference_changed', tryPlay);
    };
  }, []);

  // Frame-motion scrolls for the desktop parallax journey
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 25,
    mass: 0.5
  });

  // Track scroll and update steps dynamically (01 <-> 02)
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Scroll ranges from 0 to 1. Threshold of 0.5 switches active achievement tiers.
    if (latest < 0.5) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  });

  // ========== PREMIUM INTRO TRANSITION ==========
  // When section enters (progress 0 to 0.25), scale up the main wrapper and fade it in
  // providing a high-end "reveal" after the Outcomes section
  const containerScale = useTransform(smoothProgress, [0, 0.25], [0.85, 1.0]);
  const containerOpacity = useTransform(smoothProgress, [0, 0.15], [0, 1]);
  
  // ========== ENHANCED SCROLL PARALLAX EFFECTS ==========
  const bgScale = useTransform(smoothProgress, [0, 1], [1, 1.12]);
  const bgY = useTransform(smoothProgress, [0, 1], ['-2%', '2%']);
  
  const smokeY = useTransform(smoothProgress, [0, 1], ['2%', '-4%']);
  const smokeScale = useTransform(smoothProgress, [0, 1], [0.98, 1.02]);

  const textY = useTransform(smoothProgress, [0, 1], ['-4%', '2%']);
  const textScale = useTransform(smoothProgress, [0, 1], [0.82, 0.88]);

  const trophyY = useTransform(smoothProgress, [0, 1], ['1%', '-5%']);
  const trophyScale = useTransform(smoothProgress, [0, 1], [0.98, 1.04]);

  // Dynamic Cinematic Vignette Overlay that intensifies depth as the sequence advances
  const vignetteOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.2, 0.5, 0.85]);

  // Card Scroll Parallax
  const groupLeftY_scroll = useTransform(smoothProgress, [0, 1], ['20%', '-20%']);
  const groupRightY_scroll = useTransform(smoothProgress, [0, 1], ['28%', '-28%']);

  // ========== SHUTTER CURTAIN TRANSITIONS (TRANSITION CHRONOLOGY TO SERVICES) ==========
  // Horizontal cover: progressive meet in the center from progress 0.63 to 0.71 (exact sticky unpin trigger point)
  const leftCurtainX = useTransform(smoothProgress, [0.63, 0.71, 1.0], ['-100%', '0%', '0%']);
  const rightCurtainX = useTransform(smoothProgress, [0.63, 0.71, 1.0], ['100%', '0%', '0%']);

  // Vertical reveal: slide apart vertically (left up, right down) from progress 0.85 to 0.97
  const leftCurtainY = useTransform(smoothProgress, [0.0, 0.85, 0.97], ['0%', '0%', '-100%']);
  const rightCurtainY = useTransform(smoothProgress, [0.0, 0.85, 0.97], ['0%', '0%', '100%']);

  // A glowing central divider line that stretches vertically when the curtains meet
  const dividerScaleY = useTransform(smoothProgress, [0.66, 0.70], [0, 1]);
  const dividerGlowOpacity = useTransform(smoothProgress, [0.67, 0.71, 0.83, 0.87], [0, 0.85, 0.85, 0]);

  // Premium transition text that fades in and scales slightly as curtains close
  const transTextOpacity = useTransform(smoothProgress, [0.64, 0.71, 0.83, 0.87], [0, 1, 1, 0]);
  const transTextScale = useTransform(smoothProgress, [0.64, 0.87], [0.96, 1.03]);

  // Performance Booster: Completely toggle CSS display to hide custom curtain/glowing assets once open (progress >= 0.98) 
  // to avoid browser layout & canvas re-composition updates during scroll on the remainder of the site.
  const curtainDisplay = useTransform(smoothProgress, (val) => val >= 0.98 ? 'none' : 'flex');
  const dividerDisplay = useTransform(smoothProgress, (val) => val >= 0.90 ? 'none' : 'block');
  const transTextDisplay = useTransform(smoothProgress, (val) => val >= 0.97 ? 'none' : 'flex');

  if (isMobile) {
    return (
      <section
        id="achievements"
        ref={containerRef}
        className="relative w-full min-h-screen bg-[#030202] z-30 py-20 px-[clamp(1rem,5vw,50px)] font-sans border-t border-neutral-900/60 overflow-hidden"
      >
        {/* Elegant organic light dividers matching high-end design */}
        <div className="absolute inset-y-0 inset-x-0 pointer-events-none flex justify-between z-10 px-6 opacity-30">
          <div className="w-[1px] h-full bg-neutral-900/50" />
          <div className="w-[1px] h-full bg-neutral-900/50" />
        </div>
        
        {/* Subtle, luxurious background glows */}
        <div className="absolute -left-1/4 top-1/4 w-96 h-96 rounded-full bg-[#b54a4a]/3 blur-[120px] pointer-events-none" />
        <div className="absolute -right-1/4 bottom-1/4 w-96 h-96 rounded-full bg-[#cfa851]/3 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Elegant Editorial Header */}
          <div className="text-center mb-10 max-w-sm">
            <span className="font-serif text-xs italic text-[#b54a4a] tracking-[0.2em] font-medium block mb-2">
              03 — Distinctions
            </span>
            <h2 className="font-serif text-3xl text-neutral-100 tracking-tight leading-tight uppercase font-medium">
              Honors & Credentials
            </h2>
            <p className="text-[9px] text-neutral-500 font-mono tracking-[0.18em] uppercase mt-2.5">
              Select any card to view credential details
            </p>
          </div>

          {/* Matte Editorial Tab Selector */}
          <div className="flex bg-[#08080a] border border-neutral-800/50 rounded-full p-1 w-full max-w-[280px] justify-between mb-8 relative z-20 shadow-lg">
            <button
              onClick={() => setActiveStep(1)}
              className="relative flex-1 py-2 text-[10px] font-mono tracking-[0.15em] uppercase rounded-full transition-all duration-300 z-10 cursor-pointer text-center text-white"
            >
              {activeStep === 1 && (
                <motion.div
                  layoutId="activeSubStepMobile"
                  className="absolute inset-0 bg-neutral-900 border border-neutral-800/80 rounded-full"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span className={activeStep === 1 ? 'relative text-neutral-100 font-medium' : 'relative text-neutral-500'}>01. Mastery</span>
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className="relative flex-1 py-2 text-[10px] font-mono tracking-[0.15em] uppercase rounded-full transition-all duration-300 z-10 cursor-pointer text-center text-white"
            >
              {activeStep === 2 && (
                <motion.div
                  layoutId="activeSubStepMobile"
                  className="absolute inset-0 bg-neutral-900 border border-neutral-800/80 rounded-full"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <span className={activeStep === 2 ? 'relative text-neutral-100 font-medium' : 'relative text-neutral-500'}>02. Hackathons</span>
            </button>
          </div>

          {/* Trophy Float Presentation */}
          <div className="w-full flex flex-col items-center mb-8 overflow-visible">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative w-40 h-40 flex items-center justify-center animate-pulse"
              style={{ animationDuration: '5s' }}
            >
              <div className={`absolute w-24 h-24 rounded-full blur-[45px] opacity-15 ${
                activeStep === 1 ? 'bg-[#b54a4a]' : 'bg-[#cfa851]'
              }`} />
              
              <img
                src={activeStep === 1 
                  ? "https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/bronze_Trophy_ep03zn.png"
                  : "https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/gold_trophy_x8he0r.png"
                }
                alt={activeStep === 1 ? "Bronze Award Trophy" : "Gold Championship Trophy"}
                className="max-w-full max-h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Step Label Editorial Badge */}
            <motion.div
              key={`badge-${activeStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-2"
            >
              <span className="font-serif italic text-xs tracking-wider text-neutral-400">
                {activeStep === 1 ? "Professional Mastery Series" : "Championship Gold & Silver"}
              </span>
            </motion.div>
          </div>

          {/* Interactive Certificates List - Stacked beautifully */}
          <div className="w-full max-w-sm flex flex-col gap-4.5 z-20 relative">
            <AnimatePresence mode="wait">
              {activeStep === 1 ? (
                <motion.div
                  key="certs-step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4.5 w-full"
                >
                  {/* UPGRAD */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780745781/Upgrad_Prompt_Engineering_yptpsq.png',
                      title: 'Upgrad - Generative AI & Prompt Engineering Masterclass Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780745781/Upgrad_Prompt_Engineering_yptpsq.png"
                        alt="Upgrad Certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 animate-fade-in">
                      <span className="font-serif text-[9px] text-[#b54a4a] tracking-[0.15em] italic font-medium block mb-0.5">
                        Upgrad Academy
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        Generative AI Masterclass
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        Prompts, LLMs & Workflow Automation
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  {/* WORDPRESS */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780746084/wordpress_certificate_znnalh.png',
                      title: 'Interactive Cares - WordPress Web Development Mastery Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780746084/wordpress_certificate_znnalh.png"
                        alt="WordPress Certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-[9px] text-[#b54a4a] tracking-[0.15em] italic font-medium block mb-0.5">
                        Interactive Cares
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        WordPress Web Development
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        Themes, Builders & Custom Plugins
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  {/* HP LIFE */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564404/Hp_life_AI_for_Beginners_z1woti.png',
                      title: 'HP LIFE - AI & Prompt Engineering for Beginners Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564404/Hp_life_AI_for_Beginners_z1woti.png"
                        alt="HP Life Certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-[9px] text-[#b54a4a] tracking-[0.15em] italic font-medium block mb-0.5">
                        HP Life Education
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        AI & Prompt Engineering
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        Expert Tech & Creative Prompts
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  {/* INTERACTIVE CARES CHATGPT */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564382/Interactive_cares_cvbdcu.png',
                      title: 'Interactive Cares - ChatGPT with Prompt Engineering Hacks Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564382/Interactive_cares_cvbdcu.png"
                        alt="ChatGPT Hacks Certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-[9px] text-[#b54a4a] tracking-[0.15em] italic font-medium block mb-0.5">
                        Interactive Cares
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        ChatGPT Prompt Hacks
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        Productivity & LLM Hacks
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="certs-step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4.5 w-full"
                >
                  {/* LABLAB WINNER */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564302/Agentic_Economy_on_Arc-certificate_rp3jwq.png',
                      title: 'LabLab.ai Vibe Coding Hackathon - 1st Place / Winner Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564302/Agentic_Economy_on_Arc-certificate_rp3jwq.png"
                        alt="Lablab ai winner certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-[9px] text-[#cfa851] tracking-[0.15em] italic font-medium block mb-0.5">
                        LabLab.ai Hackathon
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        1st Place / Global Winner
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        Agentic Economy Co-pilot App Dev
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  {/* IMPACT DHAKA */}
                  <div
                    onClick={() => setSelectedCert({
                      url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780748387/Impact_Dhaka_hackathon_Certificates_gihlbt.png',
                      title: 'Impact Dhaka AI Vibe Coding Hackathon - Winner Certificate'
                    })}
                    className="group bg-[#080809] border border-neutral-900/80 rounded-md overflow-hidden p-3.5 flex gap-4 items-center cursor-pointer transition-all duration-300 hover:border-neutral-800 hover:bg-[#0c0c0e]"
                  >
                    <div className="w-16 h-11 bg-black/60 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-900 relative">
                      <img
                        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780748387/Impact_Dhaka_hackathon_Certificates_gihlbt.png"
                        alt="Impact Dhaka winner certificate"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-[9px] text-[#cfa851] tracking-[0.15em] italic font-medium block mb-0.5">
                        Impact Dhaka Festival
                      </span>
                      <h4 className="text-[12px] font-medium text-neutral-100 tracking-tight truncate font-sans">
                        Grand Champion AI Workflows
                      </h4>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                        High Speed Full-Stack Vibe-Coding
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-900 text-neutral-400 group-hover:text-white group-hover:border-neutral-700 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Lightbox Component */}
        <AnimatePresence>
          {selectedCert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCert(null)}
              className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-xl cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 28, stiffness: 140 }}
                className="relative max-w-5xl w-full max-h-[82vh] flex items-center justify-center p-2 rounded-lg border border-white/10 bg-neutral-950/80 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedCert.url}
                  alt={selectedCert.title}
                  className="max-w-full max-h-[77vh] object-contain rounded-sm"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setSelectedCert(null)}
                  className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white/90 hover:text-white p-3 rounded-full border border-white/15 transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-6 text-xs font-serif tracking-[0.25em] text-neutral-300 uppercase text-center max-w-2xl px-4"
              >
                {selectedCert.title}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  return (
    <section
      id="achievements"
      ref={containerRef}
      className="relative w-full h-[100vh] md:h-[240vh] bg-[#030202] z-30 overflow-visible font-sans"
    >
      {/* Dynamic Grid Column Dividers representing the global aesthetic guidelines */}
      <div className="absolute inset-y-0 inset-x-0 pointer-events-none flex justify-between z-20 px-[clamp(1.5rem,5vw,50px)]">
        <div className="w-[1px] h-full bg-neutral-900/40" />
        <div className="w-[1px] h-full bg-neutral-900/40 hidden xs:block" />
        <div className="w-[1px] h-full bg-neutral-900/40 hidden md:block" />
        <div className="w-[1px] h-full bg-neutral-900/40 hidden lg:block" />
        <div className="w-[1px] h-full bg-neutral-900/40" />
      </div>

      {/* Sticky viewport locks container on desktop to display the parallax journey */}
      <motion.div 
        style={isMobile ? {} : { 
          scale: containerScale, 
          opacity: containerOpacity
        }}
        className="sticky top-0 w-full h-[100dvh] overflow-hidden flex items-center justify-center will-change-transform"
      >
        
        {/* ================= LAYER 1: TEXTURED COSMIC BACKGROUND ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: bgY, scale: bgScale, willChange: 'transform' }}
          className="absolute inset-0 w-full h-full select-none z-0 tracking-wider transform-gpu"
        >
          <img
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780561559/background_black_color_fade_effect_202606041425_vazrhc.jpg"
            alt="Atmospheric Background"
            className="w-full h-full object-cover opacity-100"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Dynamic Dramatic Vignette overlay */}
        <motion.div 
          style={{ opacity: vignetteOpacity }}
          className="absolute inset-0 bg-radial-vignette pointer-events-none z-10"
        />

        {/* ================= LAYER 2: TRANSPARENT PARTICLE SMOKE VIDEO ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: smokeY, scale: smokeScale, willChange: 'transform' }}
          className="absolute inset-0 flex items-end justify-center select-none z-10 mix-blend-screen pointer-events-none transform-gpu"
        >
          <video
            ref={videoRef}
            src="https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780547474/bg_video_behind_trophy_image_ikszxy.webm"
            className="h-[80vh] md:h-[90vh] w-auto max-h-[900px] object-contain pointer-events-none opacity-90 translate-x-[5%] translate-y-[-8%]"
            loop
            muted
            playsInline
            autoPlay
          />
        </motion.div>

        {/* ================= LAYER 3: ACHIEVEMENTS TEXT IMAGE ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: textY, scale: textScale, willChange: 'transform' }}
          className="absolute inset-[0%] w-full h-[120%] -top-[10%] select-none z-20 pointer-events-none transform-gpu"
        >
          <img
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/achievements_text_jsavwh.png"
            alt="Achievements Typography"
            className="w-full h-full object-cover scale-[0.8] md:scale-[0.85] -translate-x-[5%] opacity-70 md:opacity-85 filter contrast-[1.1]"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* ================= LAYER 4: DUAL TROPHY IMAGE CROSSFADE ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: trophyY, scale: trophyScale, willChange: 'transform' }}
          className="absolute inset-0 flex items-end justify-center select-none z-30 pointer-events-none transform-gpu"
        >
          <div className="relative w-full h-[80vh] md:h-[92vh] max-h-[960px] flex items-end justify-center">
            <motion.img
              animate={{ opacity: activeStep === 1 ? 1 : 0, scale: activeStep === 1 ? 1 : 0.95 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/bronze_Trophy_ep03zn.png"
              alt="Bronze Trophy Cup Model"
              className="absolute bottom-0 h-full w-auto object-contain translate-y-[11%]"
              referrerPolicy="no-referrer"
            />
            <motion.img
              animate={{ opacity: activeStep === 2 ? 1 : 0, scale: activeStep === 2 ? 1 : 0.95 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/gold_trophy_x8he0r.png"
              alt="Gold Trophy Cup Model"
              className="absolute bottom-0 h-full w-auto object-contain translate-y-[15%]"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* ================= LAYER 5: DYNAMIC CARDS & WORK PIECES ================= */}
        
        {/* Left Interactive Group: staggered cards + stylized text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={isMobile ? {} : { 
            y: groupLeftY_scroll,
            transformStyle: 'preserve-3d', 
            perspective: 1200,
            willChange: 'transform'
          }}
          className="absolute left-[clamp(1rem,3vw,50px)] lg:left-[5%] top-[70%] lg:top-[75%] -translate-y-1/2 z-40 hidden sm:block pointer-events-auto select-none w-[clamp(260px,28vw,380px)] h-[clamp(380px,42vw,500px)] transform-gpu"
        >
          <AnimatePresence mode="wait">
            {activeStep === 1 ? (
              <motion.div
                key="left-step1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Image 1: Bottom Layer - HP Life Prompt Engineering */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564404/Hp_life_AI_for_Beginners_z1woti.png', 
                    title: 'HP LIFE - AI & Prompt Engineering for Beginners Certificate' 
                  })}
                  className="absolute top-[5%] left-[28%] w-[32%] h-[24%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-10 cursor-zoom-in hover:border-white/30" 
                  style={{ transform: 'translateZ(-50px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564404/Hp_life_AI_for_Beginners_z1woti.png"
                    alt="HP LIFE AI for Beginners & Prompt Engineering Certificate"
                    className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
       
                {/* Image 2: Middle Sage - Upgrad Prompt Engineering */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780745781/Upgrad_Prompt_Engineering_yptpsq.png', 
                    title: 'Upgrad - Generative AI & Prompt Engineering Masterclass Certificate' 
                  })}
                  className="absolute top-[25%] left-[3%] w-[32%] h-[24%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-30 cursor-zoom-in hover:border-white/30" 
                  style={{ transform: 'translateZ(20px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780745781/Upgrad_Prompt_Engineering_yptpsq.png"
                    alt="Upgrad Prompt Engineering Certificate"
                    className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
       
                {/* Image 3: Bottom - Interactive Cares ChatGPT with Prompt Engineering Hacks */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564382/Interactive_cares_cvbdcu.png', 
                    title: 'Interactive Cares - ChatGPT with Prompt Engineering Hacks Certificate' 
                  })}
                  className="absolute top-[52%] left-[28%] w-[48%] h-[36%] bg-neutral-950 border border-white/15 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-20 cursor-zoom-in hover:border-white/40" 
                  style={{ transform: 'translateZ(70px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564382/Interactive_cares_cvbdcu.png"
                    alt="Interactive Cares ChatGPT with Prompt Engineering Hacks Certificate"
                    className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-65 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
                </div>
       
                {/* Stylized Editorial Text Paragraph */}
                <div className="absolute top-[12%] left-[72%] w-[70%]" style={{ transform: 'translateZ(100px)' }}>
                  <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
                    <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#b54a4a] leading-[0.75] mr-[10px] mt-[4px]">
                      A
                    </span>
                    I PROMPT<br />
                    ENGINEER<br />
                    GLOBAL CREDENTIALS<br />
                    AND CONTINUING<br />
                    MASTERY.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="left-step2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Image 1: LabLab Ai Vibe Coding hackathon winner certificate (9:16 aspect ratio, clean design) */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564302/Agentic_Economy_on_Arc-certificate_rp3jwq.png', 
                    title: 'LabLab.ai Vibe Coding Hackathon - 1st Place / Winner Certificate' 
                  })}
                  className="absolute top-[4%] left-[12%] w-[48%] h-[58%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-10 cursor-zoom-in hover:border-white/30 flex items-center justify-center p-0.5" 
                  style={{ transform: 'translateZ(40px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780564302/Agentic_Economy_on_Arc-certificate_rp3jwq.png"
                    alt="LabLab.ai Vibe Coding Hackathon Winner Certificate"
                    className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
       
                {/* Stylized Editorial Text Paragraph */}
                <div className="absolute top-[16%] left-[64%] w-[78%]" style={{ transform: 'translateZ(100px)' }}>
                  <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
                    <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#cfa851] leading-[0.75] mr-[10px] mt-[4px]">
                      L
                    </span>
                    ABLAB.AI<br />
                    VIBE CODING<br />
                    HACKATHON WINNER<br />
                    AGENTIC CO-PILOTS.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
 
        {/* Right Interactive Group: Stylized text + larger portrait card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={isMobile ? {} : { 
            y: groupRightY_scroll,
            transformStyle: 'preserve-3d', 
            perspective: 1200,
            willChange: 'transform'
          }}
          className="absolute right-[clamp(1rem,3vw,50px)] lg:right-[5%] top-[60%] lg:top-[62%] -translate-y-1/2 z-40 hidden sm:block pointer-events-auto select-none w-[clamp(260px,28vw,380px)] h-[clamp(380px,42vw,500px)] transform-gpu"
        >
          <AnimatePresence mode="wait">
            {activeStep === 1 ? (
              <motion.div
                key="right-step1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Larger Single Portrait Card - WordPress Web Development (scaled to avoid white margins, with grayscale filter) */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780746084/wordpress_certificate_znnalh.png', 
                    title: 'Interactive Cares - WordPress Web Development Mastery Certificate' 
                  })}
                  className="absolute top-[16%] left-[8%] w-[84%] h-[48%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 cursor-zoom-in hover:border-white/30" 
                  style={{ transform: 'translateZ(50px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780746084/wordpress_certificate_znnalh.png"
                    alt="WordPress Web Development Course Certificate"
                    className="w-full h-full object-cover object-center scale-[1.05] filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.12] transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-65 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
 
                {/* Stylized Editorial Text Paragraph */}
                <div className="absolute top-[67%] left-[6%] w-[85%] z-20" style={{ transform: 'translateZ(110px)' }}>
                  <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
                    <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#b54a4a] leading-[0.75] mr-[10px] mt-[4px]">
                      W
                    </span>
                    ORDPRESS<br />
                    DEVELOPMENT<br />
                    EXPERT ARCHITECTURE.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="right-step2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Card 2: Impact Dhaka Ai Vibe Coding Hackathon Winner certificate (4:2.5 ratio, with grayscale hover filter) */}
                <div 
                  onClick={() => setSelectedCert({ 
                    url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780748387/Impact_Dhaka_hackathon_Certificates_gihlbt.png', 
                    title: 'Impact Dhaka AI Vibe Coding Hackathon - Winner Certificate' 
                  })}
                  className="absolute top-[22%] left-[5%] w-[90%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 cursor-zoom-in hover:border-white/30 aspect-[4/2.5] flex items-center justify-center p-0.5" 
                  style={{ transform: 'translateZ(50px)' }}
                >
                  <img
                    src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780748387/Impact_Dhaka_hackathon_Certificates_gihlbt.png"
                    alt="Impact Dhaka AI Vibe Coding Hackathon Winner Certificate"
                    className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-65 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </div>
 
                {/* Stylized Editorial Text Paragraph */}
                <div className="absolute top-[75%] left-[5%] w-[90%] z-20" style={{ transform: 'translateZ(110px)' }}>
                  <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
                    <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#cfa851] leading-[0.75] mr-[10px] mt-[4px]">
                      I
                    </span>
                    MPACT DHAKA<br />
                    GRAND CHAMPION<br />
                    AI WORKFLOWS RULE.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
 
        {/* ================= BOTTOM NAVIGATION & ARCHIVES LINK (Normal Fade-In, No Parallax) ================= */}
        
        {/* Giant luxury editorial counter idx '01/02' - Interactive switch */}
        <motion.div 
          style={isMobile ? {} : { opacity: containerOpacity }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveStep(prev => prev === 1 ? 2 : 1)}
          className="absolute bottom-6 right-[clamp(1.5rem,5vw,50px)] z-50 font-serif flex items-baseline select-none opacity-85 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          title="Tap to toggle Step"
        >
          <span className="text-[54px] sm:text-[76px] md:text-[110px] leading-none font-bold text-neutral-100 tracking-tighter">
            {activeStep === 1 ? "01" : "02"}
          </span>
          <span className="text-sm sm:text-base md:text-lg text-neutral-500 ml-2 font-light">/ 02</span>
        </motion.div>

      </motion.div>

      {/* ================= PREMIUM CINEMATIC SHUTTER TRANSITION TO SERVICES ================= */}
      {/* Left Curtain Glass Slab */}
      <motion.div
        style={{ x: leftCurtainX, y: leftCurtainY, willChange: 'transform', display: curtainDisplay }}
        className="fixed inset-y-0 left-0 w-1/2 h-screen bg-[#030202] border-r border-[#b54a4a]/15 z-[60] flex items-center justify-end overflow-hidden transform-gpu"
      >
        {/* Fine cyber-grid background */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#b54a4a]/30 to-transparent absolute right-0" />
      </motion.div>

      {/* Right Curtain Glass Slab */}
      <motion.div
        style={{ x: rightCurtainX, y: rightCurtainY, willChange: 'transform', display: curtainDisplay }}
        className="fixed inset-y-0 right-0 w-1/2 h-screen bg-[#030202] border-l border-[#b54a4a]/15 z-[60] flex items-center justify-start overflow-hidden transform-gpu"
      >
        {/* Fine cyber-grid background */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#b54a4a]/30 to-transparent absolute left-0" />
      </motion.div>

      {/* Glowing Center Line */}
      <motion.div
        style={{ scaleY: dividerScaleY, opacity: dividerGlowOpacity, display: dividerDisplay }}
        className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-transparent via-[#b54a4a] to-transparent z-[65] origin-center blur-[0.5px]"
      />

      {/* Editorial Text Reveal */}
      <motion.div
        style={{ opacity: transTextOpacity, scale: transTextScale, display: transTextDisplay }}
        className="fixed inset-0 flex flex-col items-center justify-center z-[70] pointer-events-none select-none text-center px-6"
      >
        <span className="font-mono text-[9px] md:text-[10px] text-[#b54a4a] tracking-[0.45em] uppercase mb-4 font-semibold block">
          CREATIVE PORTFOLIO
        </span>
        <h2 className="font-serif text-[clamp(24px,4vw,52px)] leading-tight text-neutral-100 tracking-tight max-w-3xl">
          CORE EXPERTISE & SERVICES
        </h2>
        <span className="w-16 h-[1px] bg-neutral-800 my-6 block" />
        <p className="font-sans text-[9px] md:text-[10px] text-neutral-400 tracking-[0.25em] uppercase font-light">
          SCROLL TO EXPLORE THE GALLERY & SOLUTIONS
        </p>
      </motion.div>

      {/* ================= LIGHTBOX MODAL FOR ENLARGING CERTIFICATES ================= */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCert(null)}
            className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 140 }}
              className="relative max-w-5xl w-full max-h-[82vh] flex items-center justify-center p-2 rounded-lg border border-white/10 bg-neutral-950/80 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedCert.url}
                alt={selectedCert.title}
                className="max-w-full max-h-[77vh] object-contain rounded-sm"
                referrerPolicy="no-referrer"
              />
              {/* Close Button / Indicator */}
              <button
                onClick={() => setSelectedCert(null)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white/90 hover:text-white p-3 rounded-full border border-white/15 transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 text-xs sm:text-sm font-serif tracking-[0.25em] text-neutral-300 uppercase text-center max-w-2xl px-4"
            >
              {selectedCert.title}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
