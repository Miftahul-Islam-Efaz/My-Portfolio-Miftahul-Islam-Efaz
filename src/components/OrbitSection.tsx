import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue, useSpring, useMotionValueEvent } from 'motion/react';
import { useRef } from 'react';
import OrbitImages from './OrbitImages';
import HeroBurnShader from './ui/HeroBurnShader';

const orbitImagesData = [
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776966860/202604232047_gxyqne.jpg",
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776966856/202604232052_ihyslg.jpg",
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776966299/15112343_tuzrbg.jpg",
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776966299/202604232043_vhb6u9.jpg",
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776967124/02604232058_nh1qd1.jpg",
  "https://res.cloudinary.com/daklr2whx/image/upload/v1776967611/202604232105_lv3fhp.jpg",
];

export default function OrbitSection({ children, isStarted = false }: { children?: React.ReactNode; isStarted?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const [render3D, setRender3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const video = mobileVideoRef.current;
    if (!video) return;

    let isPlaying = false;
    const tryPlay = () => {
      if (!isPlaying && video) {
        video.play()
          .then(() => { isPlaying = true; })
          .catch(e => console.log("Mobile video autoplay pending user gesture:", e));
      }
    };

    tryPlay();

    window.addEventListener('click', tryPlay);
    window.addEventListener('touchstart', tryPlay);
    window.addEventListener('audio_preference_changed', tryPlay);

    return () => {
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
      window.removeEventListener('audio_preference_changed', tryPlay);
    };
  }, [isMobile]);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Apply a physical spring to absorb mousewheel stutters and give the liquid a buttery inertia.
  // Using balanced stiffness and damping for a buttery smooth transition without lag
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 30,
    mass: 1,
    restDelta: 0.001
  });

  useEffect(() => {
    if (window.scrollY > 50) {
      setRender3D(true);
    }
    const unsubscribe = smoothProgress.on("change", (latest) => {
      if (latest > 0.005) {
        setRender3D(true);
      } else {
        setRender3D(false);
      }
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // We'll use the first 15% of scroll for the reveal transition
  const burnProgress = useTransform(smoothProgress, [0, 0.15], [0, 1], { clamp: true });

  // Create a synchronized curtain-wipe mask image for the DOM elements to match the background WebGL shader's curtain wipe
  const maskImage = useTransform(burnProgress, (p) => {
    const feather = 0.15;
    const t = -feather + p * (1.0 + feather);
    const opaquePercent = Math.max(0, Math.min(100, (1.0 - (t + feather)) * 100));
    const transPercent = Math.max(0, Math.min(100, (1.0 - t) * 100));
    return `linear-gradient(to bottom, black ${opaquePercent}%, transparent ${transPercent}%)`;
  });

  // STRICT FUNCTIONAL TRANSFORMS to avoid interpolation bugs
  const heroOpacity = useTransform(smoothProgress, (v) => {
    if (v <= 0) return 1;
    if (v >= 0.15) return 0; // Fade out DOM text exactly when the curtain finishes
    return 1 - (v / 0.15);
  });
  
  const heroPointerEvents = useTransform(smoothProgress, (v) => v < 0.15 ? 'auto' : 'none');

  // Buttery-smooth scroll parallax mappings for the hero section
  const bgY = 0;
  const textY = useTransform(smoothProgress, [0, 0.15], [0, -60]);

  const targetRadius = 380; // Optimal distance between items
  
  // Extend the zoomed in state to 90% of scroll so it doesn't snap out of it too soon
  const orbitItemSize = useTransform(smoothProgress, [0.15, 0.45, 0.85, 1], [80, 260, 260, 80], { clamp: true });
  const orbitRx = useTransform(smoothProgress,       [0.15, 0.45, 0.85, 1], [330, targetRadius, targetRadius, 330], { clamp: true });
  const orbitRy = useTransform(smoothProgress,       [0.15, 0.45, 0.85, 1], [140, targetRadius, targetRadius, 140], { clamp: true });
  const orbitRotation = useTransform(smoothProgress, [0.15, 0.45, 0.85, 1], [-15, 0, 0, -15], { clamp: true });
  const orbitTx = useTransform(smoothProgress,       [0.15, 0.45, 0.85, 1], [0, -targetRadius, -targetRadius, 0], { clamp: true });

  const textOpacity = useTransform(smoothProgress, [0.15, 0.45, 0.85, 1], [1, 0.35, 0.35, 1], { clamp: true });
  const textBlurVal = useTransform(smoothProgress, [0.15, 0.45, 0.85, 1], [0, 12, 12, 0], { clamp: true });
  
  // Keep the pointer events logic to allow clicking underlying elements before reveal
  const pointerEvents = useTransform(smoothProgress, (v) => v > 0.05 && v < 0.95 ? 'auto' : 'none');

  // Split children to extract SkillShowcase component to Layer 1, and render remainder in Layer 3
  const childrenArray = React.Children.toArray(children);
  const skillChild = childrenArray.find((child: any) => child.props && child.props.hasOwnProperty('gltfPath')) as React.ReactElement | undefined;
  const nonSkillChildren = childrenArray.filter((child: any) => !(child.props && child.props.hasOwnProperty('gltfPath')));

  const orbitProgress = useMotionValue(0);
  const prevScroll = useRef(0);

  useAnimationFrame((time, delta) => {
     if (skillChild) return;
     const pos = smoothProgress.get();
     const scrollDelta = pos - prevScroll.current;
     prevScroll.current = pos;

     let frameSpeed = 0;
     if (pos > 0.15 && pos < 0.9) {
        frameSpeed = (scrollDelta * 140.0); // increased speed for full revolution
     } else {
        frameSpeed = (delta / 1000) * 3; 
     }
     
     orbitProgress.set(orbitProgress.get() + frameSpeed);
  });

  // Orbit always visible now, Hero WebGL hides it initially
  const orbitOpacity = 1;

  return (
    <section id="skills" ref={containerRef} className="relative w-full h-[800vh] bg-transparent">
      <div className="sticky top-0 w-full h-screen overflow-hidden text-[#1a1a1a]">
        
        {/* Layer 1 (z-0): Orbit Section Content or SkillShowcase Content */}
        <motion.div 
          className="absolute inset-0 z-0 w-full h-full"
          style={{ 
            opacity: orbitOpacity,
            backgroundColor: skillChild ? '#000000' : '#fbfbfb'
          }}
        >
          {skillChild ? (
            React.cloneElement(skillChild as any, { customContainerRef: containerRef })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                 <div className="flex flex-col items-center whitespace-nowrap">
                    <div className="flex items-baseline text-black leading-none mb-1">
                      <span className="font-serif text-[45px] md:text-[55px] italic tracking-tight text-[#1a1a1a]">Digital</span>
                    </div>
                    <span className="font-serif text-[28px] md:text-[36px] tracking-tight text-[#1a1a1a] mt-[-5px]">
                      crafts
                    </span>
                 </div>
              </div>

              <div className="absolute top-32 right-[calc(6vw+150px)] md:right-[214px] flex flex-col items-start text-left text-[#1a1a1a] z-10">
                <span className="font-serif text-[40px] leading-none mb-3 text-[#1a1a1a]">2026</span>
                <span className="font-serif text-[16px] uppercase tracking-widest text-[#666] leading-[20px] text-left">
                  SELECTED WORKS &<br />PROJECTS
                </span>
              </div>

              <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16 flex flex-col items-start text-[#1a1a1a] z-10">
                <span className="font-serif text-[40px] leading-none mb-1 text-[#1a1a1a]">01</span>
                <span className="font-serif text-[16px] uppercase tracking-widest text-[#666]">PORTFOLIO</span>
              </div>

              <div className="absolute bottom-16 right-[6vw] md:right-[10vw] flex flex-col items-start z-10" style={{ pointerEvents: 'auto' }}>
                <p className="font-serif text-[16px] uppercase tracking-widest text-[#666] leading-[20px] mb-6 text-left w-[240px]">
                  EXPLORE A CURATED SELECTION OF MY RECENT PROJECTS. CRAFTING DIGITAL EXPERIENCES WITH PASSION AND PRECISION.
                </p>
                <button className="bg-black hover:bg-black/90 transition-colors text-[#fbfbfb] rounded-[40px] px-8 py-3.5 font-serif tracking-[0.1em] uppercase text-[12px] md:text-[14px] cursor-pointer">
                  EXPLORE WORK
                </button>
              </div>
              
              <motion.div 
                className="absolute w-[90vw] max-w-[1200px] aspect-square z-20 pointer-events-none"
                style={{ rotate: -15 }}
              >
                <OrbitImages 
                  images={orbitImagesData}
                  shape="ellipse"
                  direction="normal"
                  duration={40}
                  fill={true}
                  showPath={false}
                  responsive={true}
                  baseWidth={800}
                  progressOverride={orbitProgress}
                  radiusXOverride={orbitRx}
                  radiusYOverride={orbitRy}
                  itemSizeOverride={orbitItemSize}
                  rotationOverride={orbitRotation}
                  translateXOverride={orbitTx}
                />
              </motion.div>

            </div>
          )}
        </motion.div>

        {/* Layer 2 (z-10): WebGL Burnout Overlay or Native Mobile Video */}
        {isMobile ? (
          <div className="absolute inset-0 z-10 w-full h-full pointer-events-none overflow-hidden">
            <video
              ref={mobileVideoRef}
              src="https://res.cloudinary.com/dhuc35uhc/video/upload/q_auto/f_auto/v1778255226/Hero_section_video_clpku3.mp4"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loop
              muted
              playsInline
              autoPlay
            />
          </div>
        ) : (
          <motion.div 
            className="absolute inset-0 z-10 w-full h-full pointer-events-none"
            style={{ y: bgY }}
          >
            <HeroBurnShader 
              progress={burnProgress} 
              isStarted={isStarted}
              videoUrl="https://res.cloudinary.com/dhuc35uhc/video/upload/q_auto/f_auto/v1778255226/Hero_section_video_clpku3.mp4" 
            />
          </motion.div>
        )}

        {/* Layer 3 (z-20): Hero DOM Elements (Smoothly fades out so the canvas takes over) */}
        <motion.div 
          className="absolute inset-0 z-20 w-full h-full overflow-hidden mix-blend-normal md:mix-blend-difference text-white"
          style={{ 
            opacity: heroOpacity,
            pointerEvents: heroPointerEvents,
            y: textY,
            maskImage: maskImage,
            WebkitMaskImage: maskImage
          }}
        >
          {nonSkillChildren}
        </motion.div>

      </div>
    </section>
  );
}
