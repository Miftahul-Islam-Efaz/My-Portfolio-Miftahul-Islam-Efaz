import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Github, Linkedin, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

gsap.registerPlugin(ScrollTrigger);

export default function Footer() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);

  // HTML DOM element references for direct, hardware-accelerated updating with zero re-render overhead
  const lensRef = useRef<HTMLDivElement>(null);
  const lensImgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 768) return; // Absolutely static on mobile and touchscreens
    
    const lens = lensRef.current;
    const lensImg = lensImgRef.current;
    const photo = photoRef.current;
    if (!lens || !lensImg || !photo) return;

    const rect = photo.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Center the 180px wide lens directly over the mouse coordinate (offset by 90px radius)
    lens.style.opacity = '1';
    lens.style.transform = `translate3d(${x - 90}px, ${y - 90}px, 0) scale(1)`;

    // Apply high-fidelity magnification scale (1.75x) to the inner view
    const magnify = 1.75;
    const innerW = rect.width * magnify;
    const innerH = rect.height * magnify;
    
    // Shift the reverse coordinates so the center matches the focal point
    const innerX = -(x * magnify - 90);
    const innerY = -(y * magnify - 90);

    lensImg.style.width = `${innerW}px`;
    lensImg.style.height = `${innerH}px`;
    lensImg.style.transform = `translate3d(${innerX}px, ${innerY}px, 0)`;
  };

  const handleMouseEnter = () => {
    if (window.innerWidth <= 768) return;
    const lens = lensRef.current;
    if (lens) {
      lens.style.opacity = '1';
      lens.style.transform = 'scale(1)';
    }
  };

  const handleMouseLeave = () => {
    const lens = lensRef.current;
    if (lens) {
      lens.style.opacity = '0';
      lens.style.transform = 'scale(0.75)';
    }
  };

  const handleFooterLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    
    // Unlock body overflow scroll and launch Lenis instantly so it can handle immediate jumps
    document.body.style.overflow = '';
    if ((window as any).lenis) {
      (window as any).lenis.start();
    }

    let scrollTarget = target.getBoundingClientRect().top + window.scrollY;
    if (id === 'outcomes') {
      scrollTarget = target.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.1;
    } else if (id === 'contact') {
      const parentTransition = target.closest('[style*="500vh"]');
      if (parentTransition) {
        scrollTarget = parentTransition.getBoundingClientRect().top + window.scrollY;
      }
    }
    
    (window as any).isJumping = true;
    if ((window as any).lenis) {
      (window as any).lenis.scrollTo(scrollTarget, { immediate: true, force: true });
    } else {
      window.scrollTo({
        top: scrollTarget,
        behavior: 'auto'
      });
    }
    setTimeout(() => {
      (window as any).isJumping = false;
    }, 300);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      // Since Footer is inside TornTransition, find the parent transition wrapper (500vh container)
      const parentTransition = sectionRef.current.closest('[style*="500vh"]');
      if (!parentTransition) return;
      
      const rect = parentTransition.getBoundingClientRect();
      const totalHeight = rect.height;
      const top = rect.top; // Current relative top position from viewport top
      
      // Calculate normalized overall scroll progress p (0.0 to 1.0)
      const scrollRange = totalHeight - window.innerHeight;
      if (scrollRange <= 0) return;
      
      let p = -top / scrollRange;
      p = Math.max(0, Math.min(1, p));
      
      // Calculate individual elements' parallax translations based on the scroll progress 'p'
      // Layer 1: Deep background image (slowest motion)
      if (bgImgRef.current) {
        const bgY = (p - 0.5) * -40; // 40px travel range
        bgImgRef.current.style.transform = `scale(1.08) translate3d(0, ${bgY}px, 0)`;
      }
      
      // Layer 2: Midground name text "MIFTAHUL" (medium motion)
      if (textRef.current) {
        const isMobile = window.innerWidth < 768;
        const textTravel = isMobile ? 40 : 120;
        const textY = (p - 0.5) * -textTravel; // Scaled down on mobile to prevent collisions
        const scaleY = 1.4; // Keep designed aspect ratio structure
        textRef.current.style.transform = `translate3d(0, ${textY}px, 0) scaleY(${scaleY})`;
      }
      
      // Layer 3: Foreground photo card (fastest motion)
      if (photoRef.current) {
        const isMobile = window.innerWidth < 768;
        const travelY = isMobile ? 80 : 260; // Safe tight motion window on mobile devices
        const photoY = (p - 0.5) * -travelY; 
        photoRef.current.style.transform = `translate3d(0, ${photoY}px, 0)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run initial calculation to prevent jump
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <footer id="footer" ref={sectionRef} className="relative w-full flex flex-col z-20 bg-transparent">

      {/* ========================================================== */}
      {/* MOBILE-ONLY BRUTALIST EDITORIAL DESIGN (md:hidden)         */}
      {/* ========================================================== */}
      <div className="block md:hidden w-full bg-[#f2f0f1] text-[#1f1f1f] px-6 py-8 font-sans select-none relative z-20">
        
        {/* TOP BADGE STRAP */}
        <div className="flex justify-between items-center border-b border-[#1A1A1A]/25 pb-3.5 mb-6">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-600 font-semibold text-left">
            [ CREATOR DOSSIER // VOL. 01 ]
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-600 font-semibold text-right">
            [ SYS_2026 // DHAKA ]
          </span>
        </div>

        {/* ASYMMETRICAL TYPOGRAPHY & PORTRAIT COLLAGE GRID */}
        <div className="grid grid-cols-12 gap-y-5 gap-x-3 relative items-start">
          
          {/* Left Column (7 cols): Title stacking */}
          <div className="col-span-7 flex flex-col justify-start text-left">
            <h2 className="font-display font-light text-[2.8rem] xs:text-[3.2rem] leading-[0.85] tracking-tighter uppercase text-neutral-900 select-text">
              MIFTAHUL
            </h2>
            <h2 className="font-display font-black text-[2.8rem] xs:text-[3.2rem] leading-[0.85] tracking-tighter uppercase text-neutral-900 select-text">
              ISLAM
            </h2>
            <h2 className="font-display font-light italic text-[2.5rem] xs:text-[2.9rem] leading-[0.95] tracking-tight uppercase text-[#059669] my-1 select-text">
              EFAZ.
            </h2>
            
            {/* Short Bio text */}
            <p className="font-sans text-[11px] leading-relaxed text-neutral-600 font-light mt-4 pr-1 max-w-[150px] xs:max-w-none select-text">
              Architect of intelligent automated engines, bespoke n8n pipelines, and modular enterprise backend infrastructures.
            </p>
          </div>

          {/* Right Column (5 cols): Grayscale portrait with heavy brutalist borders */}
          <div className="col-span-5 flex flex-col justify-center items-end">
            <div 
              className="w-full aspect-[4/5] bg-[#E8E7E2] border border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] p-1 overflow-hidden"
            >
              <div className="w-full h-full grayscale overflow-hidden bg-stone-200">
                <img 
                  src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1775244322/upscaled-2x-1775244293295_el2gi1.png" 
                  alt="Miftahul Efaz" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
            <span className="font-mono text-[7px] text-neutral-500 tracking-wider uppercase mt-2.5 select-none">
              [ PH_REF // 16-D5 ]
            </span>
          </div>

        </div>

        {/* STYLISH META BLOCK */}
        <div className="mt-8 border-y border-[#1A1A1A]/15 py-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-mono text-left">
            <span className="text-neutral-500 font-medium">CORE DISCIPLINE</span>
            <span className="text-neutral-950 font-bold tracking-wide text-right">SYSTEM AUTOMATION & BACKEND</span>
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase font-mono text-left">
            <span className="text-neutral-500 font-medium">PIPELINE DESIGN</span>
            <span className="text-neutral-950 font-bold tracking-wide text-right">EVENT-DRIVEN n8n ARCHITECTURE</span>
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase font-mono text-left">
            <span className="text-neutral-500 font-medium">FOCUS PREFERENCE</span>
            <span className="text-neutral-950 font-bold tracking-wide text-right">MINIMALIST COGNITIVE FLOW</span>
          </div>
        </div>

        {/* MAIN BRUTALIST 2x2 LINK NAVIGATION TILES */}
        <div className="mt-8 text-left">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-500 block mb-3 font-semibold">
            [ SECTION SELECTION // PORTAL ]
          </span>
          <div className="grid grid-cols-2 border-l border-t border-[#1A1A1A]">
            {[
              { id: 'skills', label: 'SKILLS', num: '01' },
              { id: 'services', label: 'SERVICES', num: '02' },
              { id: 'outcomes', label: 'OUTCOMES', num: '03' },
              { id: 'contact', label: 'CONTACT', num: '04' }
            ].map((item) => (
              <a 
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleFooterLinkClick(e, item.id)}
                className="border-r border-b border-[#1A1A1A] p-4 flex flex-col justify-between aspect-[1.4/1] bg-[#1A1A1A]/[0.02] hover:bg-[#1A1A1A]/[0.06] active:bg-[#1A1A1A]/[0.1] transition-all text-left"
              >
                <span className="font-mono text-[9px] text-[#1A1A1A]/40">{item.num} //</span>
                <span className="font-display font-black text-xs sm:text-sm tracking-wider text-[#1A1A1A]">{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* SOCIAL LINKS STRAP */}
        <div className="mt-10 flex flex-col xs:flex-row justify-between items-center gap-4 border-t border-[#1A1A1A]/20 pt-5 pb-2 text-left">
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] font-bold text-neutral-700 hover:text-black uppercase tracking-wider">
              GITHUB
            </a>
            <span className="text-neutral-300">/</span>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] font-bold text-neutral-700 hover:text-black uppercase tracking-wider">
              LINKEDIN
            </a>
            <span className="text-neutral-300">/</span>
            <a href="mailto:efaz@example.com" className="font-mono text-[10px] font-bold text-neutral-700 hover:text-black uppercase tracking-wider">
              EMAIL
            </a>
          </div>
          
          <span className="font-mono text-[8px] text-neutral-400 select-none">
            © 2026 MIFTATHUL ISLAM EFAZ
          </span>
        </div>

      </div>

      {/* ========================================================== */}
      {/* DESKTOP-ONLY INTERACTIVE PARALLAX DESIGN (md:flex)         */}
      {/* ========================================================== */}
      <div className="hidden md:flex relative w-full h-[80vh] md:h-screen overflow-hidden items-center justify-center">
        {/* Background Image behind everything in the section */}
        <img 
          ref={bgImgRef}
          src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780304474/18e04446-e19a-47c3-b540-8326c490e735_uvrzlw.png"
          alt="Visual Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
          referrerPolicy="no-referrer"
        />

        {/* Huge Name Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <h1 
            ref={textRef}
            className="font-display font-black text-[#1A1A1A] uppercase leading-none text-center whitespace-nowrap" 
            style={{ 
              fontSize: 'clamp(3rem, 18vw, 25rem)', 
              transformOrigin: 'center',
              letterSpacing: '-0.02em'
            }}
          >
            MIFTAHUL
          </h1>
        </div>

        {/* Image Container with Dynamic Glass Magnifying Lens Tracking */}
        <div 
          ref={photoRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="group relative w-[80%] sm:w-[60%] md:w-[40%] lg:w-[30%] aspect-[4/5] bg-[#E8E7E2] rounded-[2rem] md:rounded-[3rem] overflow-hidden z-20 shadow-2xl mt-[45vh] transition-transform duration-700 ease-out hover:scale-[1.03] select-none cursor-pointer"
        >
          {/* Main grayscale background image (kept static and perfectly sharp) */}
          <div className="w-full h-full grayscale overflow-hidden relative">
            <img 
              src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1775244322/upscaled-2x-1775244293295_el2gi1.png" 
              alt="Miftahul Islam Efaz" 
              className="w-full h-full object-cover object-top filter contrast-[1.02]"
              referrerPolicy="no-referrer"
            />
            
            {/* Elegant high-precision glass frame border */}
            <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded-[2rem] md:rounded-[3rem] transition-colors duration-700 pointer-events-none z-40" />
          </div>

          {/* Interactive Magnifying Glass Lens Orb (Desktop-Only, fully performance optimized) */}
          <div
            ref={lensRef}
            className="pointer-events-none absolute rounded-full overflow-hidden border border-white/45 shadow-[inset_0_4px_32px_rgba(255,255,255,0.9),_0_24px_55px_rgba(0,0,0,0.6)] z-30 opacity-0 scale-75 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              width: '180px',
              height: '180px',
              left: '0px',
              top: '0px',
            }}
          >
            {/* Circular Clip for Zoomed View */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <img
                ref={lensImgRef}
                src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1775244322/upscaled-2x-1775244293295_el2gi1.png"
                alt="Magnified Reflection Inside Glass Orb"
                className="absolute pointer-events-none object-cover object-top max-w-none filter brightness-110 contrast-[1.12] saturate-[1.12]"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Deep-purple/blue refraction shadow crescent on the bottom-left */}
            <div className="absolute -inset-[2px] rounded-full bg-gradient-to-tr from-indigo-700/35 via-transparent to-transparent mix-blend-overlay z-15 pointer-events-none filter blur-[3px]" />

            {/* Beautiful Cyan chromatic aberration ring on top-right shift */}
            <div className="absolute inset-[1px] rounded-full border-2 border-cyan-400/40 translate-x-[2.5px] translate-y-[-2.5px] z-15 pointer-events-none filter blur-[0.2px]" />

            {/* Beautiful Rose chromatic aberration ring on bottom-left shift */}
            <div className="absolute inset-[1px] rounded-full border-2 border-rose-500/45 -translate-x-[2.5px] -translate-y-[-2.5px] z-15 pointer-events-none filter blur-[0.2px]" />

            {/* Simulated lens depth curvature reflection & radial highlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.3)_0%,transparent_70%)] mix-blend-overlay pointer-events-none z-10" />
            
            {/* Dynamic glass spherical distortion shadow mask (Vignette) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.3)_100%)] pointer-events-none z-20" />
            
            {/* 3D Glass high-precision glossy white flash reflection curve top right */}
            <div className="absolute top-2 right-4.5 w-[55px] h-[28px] bg-white/40 rounded-full rotate-[20deg] filter blur-[0.5px] pointer-events-none z-30" />
            {/* Secondary lower reflection bottom left */}
            <div className="absolute bottom-3 left-6 w-[28px] h-[12px] bg-white/15 rounded-full rotate-[-15deg] filter blur-[1px] pointer-events-none z-30" />
          </div>
        </div>
      </div>

      {/* DESKTOP-ONLY FOOTER BOTTOM --> */}
      <div className="hidden md:flex relative z-20 w-full px-[clamp(1.5rem,5vw,4rem)] py-12 flex-col md:flex-row justify-between items-center gap-8 border-t border-[#1A1A1A]/10">
        <div className="flex flex-col items-center md:items-start gap-2 text-left">
          <span className="font-display text-2xl font-bold text-[#1A1A1A] uppercase tracking-widest">EFAZ</span>
          <span className="font-mono text-xs text-[#1A1A1A]/60 uppercase tracking-widest">Automation Specialist</span>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {['Skills', 'Services', 'Outcomes', 'Contact'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              onClick={(e) => handleFooterLinkClick(e, item.toLowerCase())}
              className="font-mono text-xs text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors uppercase tracking-wider font-semibold"
            >
              {item}
            </a>
          ))}
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-4 text-right">
          <div className="flex gap-6">
            <a href="#" className="text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"><Github size={20} /></a>
            <a href="#" className="text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"><Linkedin size={20} /></a>
            <a href="#" className="text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"><Briefcase size={20} /></a>
          </div>
          <div className="font-mono text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest">
            <a 
              href="https://www.miftahulislamefaz.xyz/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-[#b54a4a] transition-all duration-300 cursor-pointer"
            >
              © 2025 Miftahul Islam Efaz
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
