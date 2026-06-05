import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { ExternalLink } from 'lucide-react';

export default function AchievementsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // ========== PREMIUM INTRO TRANSITION ==========
  // When section enters (progress 0 to 0.25), scale up the main wrapper and fade it in
  // providing a high-end "reveal" after the Outcomes section
  const containerScale = useTransform(smoothProgress, [0, 0.25], [0.85, 1.0]);
  const containerOpacity = useTransform(smoothProgress, [0, 0.15], [0, 1]);
  const containerFilter = useTransform(smoothProgress, [0, 0.2], ['blur(15px)', 'blur(0px)']);
  
  // ========== ENHANCED PARALLAX EFFECTS ==========
  // Deeper 3D feeling with subtle multi-axis tracking
  const bgScale = useTransform(smoothProgress, [0, 1], [1, 1.15]);
  const bgY = useTransform(smoothProgress, [0, 1], ['-5%', '5%']);
  
  const smokeY = useTransform(smoothProgress, [0, 1], ['-8%', '8%']);
  const smokeScale = useTransform(smoothProgress, [0, 1], [0.95, 1.05]);

  const textY = useTransform(smoothProgress, [0, 1], ['-15%', '15%']);
  const textScale = useTransform(smoothProgress, [0, 1], [0.8, 0.95]);

  const trophyY = useTransform(smoothProgress, [0, 1], ['-3%', '12%']);
  const trophyScale = useTransform(smoothProgress, [0, 1], [1, 1.08]);

  // Card Parallax
  const groupLeftY = useTransform(smoothProgress, [0, 1], ['20%', '-20%']);
  const groupRightY = useTransform(smoothProgress, [0, 1], ['30%', '-30%']);

  return (
    <section
      id="achievements"
      ref={containerRef}
      className="relative w-full h-[100vh] md:h-[200vh] bg-[#030202] z-30 overflow-visible font-sans"
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
          opacity: containerOpacity, 
          filter: containerFilter 
        }}
        className="sticky top-0 w-full h-[100dvh] overflow-hidden flex items-center justify-center will-change-transform"
      >
        
        {/* ================= LAYER 1: TEXTURED COSMIC BACKGROUND ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: bgY, scale: bgScale, willChange: 'transform' }}
          className="absolute inset-0 w-full h-full select-none z-0 tracking-wider"
        >
          <img
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780561559/background_black_color_fade_effect_202606041425_vazrhc.jpg"
            alt="Atmospheric Background"
            className="w-full h-full object-cover opacity-100"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* ================= LAYER 2: TRANSPARENT PARTICLE SMOKE VIDEO ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: smokeY, scale: smokeScale, willChange: 'transform' }}
          className="absolute inset-0 flex items-end justify-center select-none z-10 mix-blend-screen pointer-events-none will-change-transform"
        >
          <video
            ref={videoRef}
            src="https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780547474/bg_video_behind_trophy_image_ikszxy.webm"
            className="h-[80vh] md:h-[90vh] w-auto max-h-[900px] object-contain pointer-events-none opacity-90 translate-x-[5%] translate-y-[1%]"
            loop
            muted
            playsInline
            autoPlay
          />
        </motion.div>

        {/* ================= LAYER 3: ACHIEVEMENTS TEXT IMAGE ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: textY, scale: textScale, willChange: 'transform' }}
          className="absolute inset-[0%] w-full h-[120%] -top-[10%] select-none z-20 pointer-events-none will-change-transform"
        >
          <img
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/achievements_text_jsavwh.png"
            alt="Achievements Typography"
            className="w-full h-full object-cover scale-[0.8] md:scale-[0.85] -translate-x-[5%] opacity-70 md:opacity-85 filter contrast-[1.1]"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* ================= LAYER 4: BRONZE TROPHY IMAGE ================= */}
        <motion.div
          style={isMobile ? { y: '0%' } : { y: trophyY, scale: trophyScale, willChange: 'transform' }}
          className="absolute inset-0 flex items-end justify-center select-none z-30 pointer-events-none will-change-transform"
        >
          <img
            src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780547474/bronze_Trophy_ep03zn.png"
            alt="Bronze Trophy Cup Model"
            className="h-[80vh] md:h-[92vh] w-auto max-h-[960px] object-contain translate-y-[11%]"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* ================= LAYER 5: DYNAMIC CARDS & WORK PIECES ================= */}
        
        {/* Left Interactive Group: 3 staggered cards + stylized text */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={isMobile ? {} : { y: groupLeftY }}
          className="absolute left-[clamp(1rem,3vw,50px)] lg:left-[5%] top-[70%] lg:top-[75%] -translate-y-1/2 z-40 hidden sm:block pointer-events-auto select-none w-[clamp(260px,28vw,380px)] h-[clamp(380px,42vw,500px)]"
        >
          {/* Image 1: Top Knight (right edge of col 1 center) */}
          <div className="absolute top-[5%] left-[28%] w-[26%] h-[20%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-10">
            <img
              src="https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=300&h=300&q=80"
              alt="Portrait of Female Knight"
              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Image 2: Middle Sage (far left) */}
          <div className="absolute top-[25%] left-0 w-[26%] h-[20%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-20">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80"
              alt="Portrait of Old Sage"
              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Image 3: Bottom Warrior (large bottom center) */}
          <div className="absolute top-[45%] left-[28%] w-[42%] h-[32%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300 z-10">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=80"
              alt="Portrait of Warrior"
              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Stylized Editorial Text Paragraph */}
          <div className="absolute top-[12%] left-[72%] w-[70%]">
            <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
              <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#b54a4a] leading-[0.75] mr-[10px] mt-[4px]">
                T
              </span>
              HE KNIGHT<br />
              WOMAN OF<br />
              CHAINS OF MORIART<br />
              AND HER HIDDEN<br />
              STRENGTHS.
            </p>
          </div>
        </motion.div>

        {/* Right Interactive Group: Stylized text + 1 larger portrait card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={isMobile ? {} : { y: groupRightY }}
          className="absolute right-[clamp(1rem,3vw,50px)] lg:right-[5%] top-[60%] lg:top-[62%] -translate-y-1/2 z-40 hidden sm:block pointer-events-auto select-none w-[clamp(260px,28vw,380px)] h-[clamp(380px,42vw,500px)]"
        >
          {/* Larger Single Portrait Card */}
          <div className="absolute top-[8%] left-[28.5%] w-[55%] h-[48%] bg-neutral-950 border border-white/10 overflow-hidden shadow-2xl group rounded-sm transition-all duration-300">
            <img
              src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&h=500&q=80"
              alt="Portrait of Heroic Leader"
              className="w-full h-full object-cover object-top opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Stylized Editorial Text Paragraph */}
          <div className="absolute top-[62%] left-[6%] w-[85%] z-20">
            <p className="text-[clamp(9.5px,1vw,13px)] font-serif tracking-[0.15em] text-neutral-300 uppercase leading-[1.9] text-left">
              <span className="float-left text-[clamp(56px,6.5vw,90px)] font-serif font-medium text-[#b54a4a] leading-[0.75] mr-[10px] mt-[4px]">
                W
              </span>
              HERE LEGENDS<br />
              BLEED AND<br />
              KINGDOMS AWAKEN.
            </p>
          </div>
        </motion.div>

        {/* ================= BOTTOM NAVIGATION & ARCHIVES LINK (Normal Fade-In, No Parallax) ================= */}
        
        {/* Giant luxury editorial counter idx '01/05' */}
        <motion.div 
          style={isMobile ? {} : { opacity: containerOpacity }}
          className="absolute bottom-6 right-[clamp(1.5rem,5vw,50px)] z-50 font-serif flex items-baseline select-none opacity-85 hover:opacity-100 transition-opacity duration-300"
        >
          <span className="text-[54px] sm:text-[76px] md:text-[110px] leading-none font-bold text-neutral-100 tracking-tighter">01</span>
          <span className="text-sm sm:text-base md:text-lg text-neutral-500 ml-2 font-light">/ 05</span>
        </motion.div>

      </motion.div>
    </section>
  );
}
