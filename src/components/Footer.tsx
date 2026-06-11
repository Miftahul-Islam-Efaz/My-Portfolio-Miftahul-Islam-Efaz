import React, { useEffect, useRef } from 'react';
import { Github, Linkedin, Briefcase, Instagram, Facebook, Twitter } from 'lucide-react';
import { motion } from 'motion/react';

const socials = [
  {
    name: 'Instagram',
    icon: Instagram,
    url: 'https://www.instagram.com/miftahul_islam_efaz/',
    handle: '@miftahul_islam_efaz',
    colorClass: 'hover:text-[#E1306C]',
  },
  {
    name: 'GitHub',
    icon: Github,
    url: 'https://github.com/Miftahul-Islam-Efaz',
    handle: 'Miftahul-Islam-Efaz',
    colorClass: 'hover:text-[#000000]',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    url: 'https://www.facebook.com/miftahul.islam.efaz',
    handle: 'miftahul.islam.efaz',
    colorClass: 'hover:text-[#1877F2]',
  },
  {
    name: 'Twitter',
    icon: Twitter,
    url: 'https://x.com/Miftahul_Islam9',
    colorClass: 'hover:text-[#1DA1F2]',
    handle: '@Miftahul_Islam9',
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    url: 'https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/',
    colorClass: 'hover:text-[#0A66C2]',
    handle: 'miftahul-islam',
  }
];

export default function Footer() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);
  const cachedAbsoluteTopRef = useRef(0);
  const cachedTotalHeightRef = useRef(0);

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
    const updateCache = () => {
      if (!sectionRef.current) return;
      const parentTransition = sectionRef.current.closest('[style*="500vh"]');
      if (!parentTransition) return;
      const rect = parentTransition.getBoundingClientRect();
      cachedAbsoluteTopRef.current = rect.top + window.scrollY;
      cachedTotalHeightRef.current = rect.height;
    };

    updateCache();
    const timeoutId = setTimeout(updateCache, 150);

    let rafId: number | null = null;

    const handleScroll = () => {
      if (window.innerWidth < 768) return;
      const absoluteTop = cachedAbsoluteTopRef.current;
      const totalHeight = cachedTotalHeightRef.current;
      if (totalHeight <= 0) return;

      const top = absoluteTop - window.scrollY;
      
      // Performance Optimization: Only run updates when the footer container is in/near the viewport
      if (top > window.innerHeight || top + totalHeight < 0) {
        return;
      }

      // RAF guard: only update DOM once per animation frame
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const top2 = cachedAbsoluteTopRef.current - window.scrollY;
        const totalHeight2 = cachedTotalHeightRef.current;
        
        // Calculate normalized overall scroll progress p (0.0 to 1.0)
        const scrollRange = totalHeight2 - window.innerHeight;
        if (scrollRange <= 0) return;
        
        let p = -top2 / scrollRange;
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
          const textY = (p - 0.5) * -textTravel;
          const scaleY = 1.4;
          textRef.current.style.transform = `translate3d(0, ${textY}px, 0) scaleY(${scaleY})`;
        }
        
        // Layer 3: Foreground photo card (fastest motion)
        if (photoRef.current) {
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            const travelY = 80;
            const photoY = (p - 0.5) * -travelY; 
            photoRef.current.style.transform = `translate3d(0, ${photoY}px, 0)`;
          } else {
            // Pinned to bottom, scrolling up dynamically so that at p=1 (the very bottom of page) it has exactly 0px offset (touches the bottom line exactly).
            const travelY = 160; 
            const photoY = (1 - p) * travelY;
            photoRef.current.style.transform = `translate3d(0, ${photoY}px, 0)`;
          }
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateCache);
    // Run initial calculation to prevent jump
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateCache);
      clearTimeout(timeoutId);
      if (rafId !== null) cancelAnimationFrame(rafId);
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
                  src="https://res.cloudinary.com/dr2tc3dyk/image/upload/w_300,h_375,c_fill,q_auto,f_auto/v1775244322/upscaled-2x-1775244293295_el2gi1.png" 
                  alt="Miftahul Efaz" 
                  className="w-full h-full object-cover object-top"
                  decoding="async"
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

        {/* SOCIAL LINKS STRAP (MOBILE) */}
        <div className="mt-10 border-t border-[#1A1A1A] pt-8 pb-4 text-left">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-500 block mb-4 font-semibold">
            [ SECURE CONNECT // ARCHIVES ]
          </span>
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
            {socials.map((soc) => {
              const Icon = soc.icon;
              return (
                <a
                  key={soc.name}
                  href={soc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#1A1A1A] p-4 bg-white shadow-[2px_2px_0px_#1A1A1A] flex flex-col justify-between aspect-square active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <span className="font-mono text-[7px] text-[#1A1A1A]/40 uppercase tracking-widest">{soc.name} //</span>
                  <div className="text-[#1A1A1A] my-auto">
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[8px] text-[#1A1A1A]/60 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{soc.handle}</span>
                </a>
              );
            })}
            
            {/* Direct Contact Button fallback to match symmetric layout of 6 cells */}
            <a
              href="mailto:webigns@gmail.com"
              className="border border-[#1A1A1A] p-4 bg-[#b54a4a] text-white shadow-[2px_2px_0px_#1A1A1A] flex flex-col justify-between aspect-square active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <span className="font-mono text-[7px] text-white/50 uppercase tracking-widest">DIRECT //</span>
              <div className="text-white my-auto">
                <Briefcase size={24} strokeWidth={1.5} />
              </div>
              <span className="font-mono text-[8px] text-white/80 tracking-tight">EMAIL EFAZ</span>
            </a>
          </div>
          
          <div className="mt-8 flex justify-between items-center">
            <span className="font-mono text-[8px] text-neutral-400 select-none">
              © 2026 MIFTAHUL ISLAM EFAZ
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================== */}
      {/* DESKTOP-ONLY WRAPPER WITH INTEGRATED IMAGE BACKGROUND      */}
      {/* ========================================================== */}
      <div className="hidden md:flex relative w-full h-[80vh] md:h-screen overflow-hidden select-none">
        
        {/* Background Image behind everything in the section */}
        <img 
          ref={bgImgRef}
          src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780304474/18e04446-e19a-47c3-b540-8326c490e735_uvrzlw.png"
          alt="Visual Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
          referrerPolicy="no-referrer"
          decoding="async"
          style={{ willChange: 'transform' }}
        />

        {/* Parallax Content Area */}
        <div className="relative w-full h-full flex items-end justify-center z-10">
          {/* Huge Name Text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <h1 
              ref={textRef}
              className="font-display font-black text-[#1A1A1A] uppercase leading-none text-center whitespace-nowrap" 
              style={{ 
                fontSize: 'clamp(3rem, 18vw, 25rem)', 
                transformOrigin: 'center',
                letterSpacing: '-0.02em',
                willChange: 'transform'
              }}
            >
              MIFTAHUL
            </h1>
          </div>

          {/* Image Container */}
          <div 
            ref={photoRef}
            className="group relative w-[80%] sm:w-[60%] md:w-[40%] lg:w-[30%] aspect-[4/5] bg-[#E8E7E2] rounded-t-[2rem] md:rounded-t-[3rem] rounded-b-none overflow-hidden z-20 shadow-2xl transition-transform duration-700 ease-out hover:scale-[1.03] select-none cursor-pointer mb-0"
            style={{ willChange: 'transform' }}
          >
            {/* Main grayscale background image (kept static and perfectly sharp) */}
            <div className="w-full h-full grayscale overflow-hidden relative">
              <img 
                src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1775244322/upscaled-2x-1775244293295_el2gi1.png" 
                alt="Miftahul Islam Efaz" 
                className="w-full h-full object-cover object-top filter contrast-[1.02]"
                referrerPolicy="no-referrer"
                decoding="async"
              />
              
              {/* Elegant high-precision glass frame border with bottom curves removed */}
              <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded-t-[2rem] md:rounded-t-[3rem] rounded-b-none transition-colors duration-700 pointer-events-none z-40" />
            </div>
          </div>
        </div>

        {/* DESKTOP-ONLY FOOTER BOTTOM --> POSITIONED ABSOLUTE TO MINIMIZE GAP */}
        <div className="absolute bottom-10 left-0 w-full z-20 px-[clamp(1.5rem,5vw,4rem)] flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="flex flex-col items-center md:items-start gap-2 text-left z-20">
            <span className="font-display text-2xl font-bold text-[#1A1A1A] uppercase tracking-widest">EFAZ</span>
            <span className="font-mono text-xs text-[#1A1A1A]/60 uppercase tracking-widest">Automation Specialist</span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4 text-right z-20">
            <div className="font-mono text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest mt-1">
              <a 
                href="https://www.miftahulislamefaz.xyz/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#b54a4a] transition-all duration-300 cursor-pointer font-bold"
              >
                © 2026 Miftahul Islam Efaz
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
