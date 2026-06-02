import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Github, Linkedin, Twitter, Instagram } from 'lucide-react';
import { AnimatedDock } from './ui/animated-dock';
import SplitType from 'split-type';

export default function Hero({ isStarted = false }: { isStarted?: boolean }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const taglines = [
    "Currently the best website designer in Bangladesh",
    "Expert n8n automation & backend integration",
    "Figma UI/UX design & system architecture",
    "Transforming businesses with custom workflows",
    "Bangladesh's go-to automation specialist & creative developer"
  ];

  useEffect(() => {
    if (!isStarted) {
      // Keep everything purely hidden with GSAP before intro finishes to prevent FOUC/flashes
      gsap.set(containerRef.current, { opacity: 0 });
      gsap.set('.hero-element', { opacity: 0, y: 40 });
      if (nameRef.current) {
        gsap.set(nameRef.current, { opacity: 0 });
      }
      return;
    }

    let currentTagline = 0;
    let interval: NodeJS.Timeout;
    let splitText: SplitType | null = null;

    // Entrance Animation Context
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 1. Butter-smooth fade in of the entire section background with parallax feeling
      tl.fromTo(containerRef.current, 
        { opacity: 0, y: 50 }, 
        {
          opacity: 1,
          y: 0,
          duration: 1.8,
          ease: 'power3.out',
          force3D: true,
        }
      );

      // 3. Stagger inner components smoothly drifting up like butter
      tl.fromTo('.hero-element', 
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.5,
          stagger: 0.1,
          ease: 'power3.out',
          force3D: true,
        }, 
        "-=1.4"
      );

      if (nameRef.current) {
        // Prevent FOUC by making sure its visible only when animating
        gsap.set(nameRef.current, { opacity: 1 });
        splitText = new SplitType(nameRef.current, { types: 'chars' });
        
        // 4. Reveal the name text smoothly following the rhythm with character stagger
        tl.fromTo(splitText.chars, 
          { y: 45, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.04,
            ease: 'power3.out',
            duration: 1.2,
            force3D: true,
          }, 
          "-=1.2"
        );
      }

      // Tagline rotation (delayed out to allow entry animation to completely settle)
      setTimeout(() => {
        interval = setInterval(() => {
          const taglineEl = taglineRef.current;
          if (!taglineEl) return;
          
          gsap.to(taglineEl, {
            opacity: 0,
            y: -10,
            duration: 0.4,
            force3D: true,
            onComplete: () => {
              currentTagline = (currentTagline + 1) % taglines.length;
              taglineEl.innerText = taglines[currentTagline];
              gsap.fromTo(taglineEl, 
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, force3D: true }
              );
            }
          });
        }, 3000);
      }, 2500);

      // Assure existing floating cards logic is preserved and properly sequenced
      const cards = document.querySelectorAll('.floating-card');
      if(cards.length > 0) {
        cards.forEach((card, i) => {
          gsap.to(card, {
            y: -12,
            duration: 2.5,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
            delay: i * 0.4 + 2, // Start after entrance finishes
            force3D: true,
          });
        });
      }

    }, containerRef);

    return () => {
      ctx.revert();
      if(interval) clearInterval(interval);
      if (splitText) {
        splitText.revert();
      }
    };
  }, [isStarted]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col justify-center md:flex-row md:justify-start items-center px-[clamp(1rem,5vw,4rem)] pt-24 pb-24 md:pt-20 md:pb-0 overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {/* Mobile-only subtle dark backdrop wash to keep text ultra-legible over video while preserving the portrait */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent md:hidden pointer-events-none z-0" />

      {/* LEFT COLUMN */}
      <div className="w-full md:w-1/2 flex flex-col z-10 text-white max-w-[480px] md:max-w-none">
        
        <h2 
          ref={nameRef}
          className="font-michroma text-[clamp(1.75rem,7vw,3.5rem)] md:text-[clamp(2.5rem,5vw,5rem)] font-normal leading-[1.2] md:leading-[1.1] mb-6 cursor-default opacity-0"
        >
          Miftahul Islam<br />Efaz
        </h2>
        
        <div 
          ref={taglineRef}
          className="hero-element font-body text-[clamp(0.9rem,2.2vw,1.3rem)] md:text-[clamp(1.1rem,2.5vw,1.5rem)] font-normal mb-8 md:mb-10 h-auto min-h-[3.5rem] md:h-8 text-neutral-100 drop-shadow-[0_4px_12px_rgba(0,0,0,1)]"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.6)" }}
        >
          {taglines[0]}
        </div>
        
        <div className="hero-element flex flex-row sm:flex-row gap-4 mb-10 md:mb-12 w-full sm:w-auto items-center">
          <a href="#work" className="px-5 py-3.5 md:px-[34px] md:py-[15px] text-center bg-white text-black font-body font-bold text-sm md:text-base rounded transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.05] active:scale-[0.98] shadow-[0_4px_25px_rgba(255,255,255,0.25)] flex-1 sm:flex-none whitespace-nowrap">
            View My Work
          </a>
          <a href="#contact" className="px-4 py-3 md:px-7 md:py-3.5 text-center border border-white/25 text-white/80 font-body text-xs md:text-sm rounded transition-all duration-300 hover:border-white/70 hover:text-white flex-1 sm:flex-none whitespace-nowrap">
            Get In Touch →
          </a>
        </div>

        <div className="hero-element flex">
          <AnimatedDock
            items={[
              {
                link: "https://github.com/Miftahul-Islam",
                target: "_blank",
                Icon: <Github size={22} />,
                label: "GitHub",
              },
              {
                link: "https://www.linkedin.com/in/s-m-miftahul-islam-a91373284/",
                target: "_blank",
                Icon: <Linkedin size={22} />,
                label: "LinkedIn",
              },
              {
                link: "https://x.com/efaz_i",
                target: "_blank",
                Icon: <Twitter size={22} />,
                label: "Twitter",
              },
              {
                link: "https://www.instagram.com/miftahul_islam_efaz/",
                target: "_blank",
                Icon: <Instagram size={22} />,
                label: "Instagram",
              },
            ]}
          />
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-element z-10 absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 backdrop-blur-[6px] bg-black/45 px-5 py-2.5 rounded-full border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] select-none">
        <span className="font-mono text-[9px] text-white/70 tracking-[0.16em] uppercase">Scroll to explore</span>
        <div className="w-3.5 h-3.5 border-r-2 border-b-2 border-white/80 rotate-45 animate-bounce" style={{ animationDuration: "2s" }} />
      </div>

    </section>
  );
}
