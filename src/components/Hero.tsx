import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Github, Linkedin, Twitter, Instagram, Facebook } from 'lucide-react';
import { AnimatedDock } from './ui/animated-dock';
import SplitType from 'split-type';
import { motion, useScroll, useTransform } from 'motion/react';

const Hero = React.memo(function Hero({ 
  isStarted = false,
  isComplete = false
}: { 
  isStarted?: boolean;
  isComplete?: boolean;
}) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const taglines = [
    "Entrepreneur. Vibe-Coder. AI Orchestrator.",
    "Building digital products that outlast trends.",
    "Not a developer — a builder with a mission.",
    "Turning ideas into systems. Systems into legacy."
  ];

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      if (!isComplete) return;
      // Only try play if the video is actually intersecting
      if (videoRef.current && !videoRef.current.paused) return; // already playing
      video.play().catch((err) => {
        console.log("Mobile Hero background video play delayed for gesture interaction:", err);
      });
    };

    // Standard unlock events
    window.addEventListener('click', tryPlay, { once: true });
    window.addEventListener('touchstart', tryPlay, { once: true });
    window.addEventListener('scroll', tryPlay, { once: true });
    window.addEventListener('audio_preference_changed', tryPlay);

    // Performance optimization: pause video when out of viewport or deeply faded out
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tryPlay();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Also observe the wrapper for opacity changes manually via a MutationObserver if possible,
    // but intersection is mostly what we need (opacity might not trigger intersection, but usually when people scroll past the 800vh orbit section, Hero is out of bounds anyway).
    // Actually, OrbitSection is sticky, so Hero STAYS in viewport. It just has opacity: 0!
    // So IntersectionObserver won't pause it if it's sticky.
    // We should pause it when scroll crosses the threshold.

    return () => {
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('touchstart', tryPlay);
      window.removeEventListener('scroll', tryPlay);
      window.removeEventListener('audio_preference_changed', tryPlay);
      observer.disconnect();
    };
  }, []);

  // Performance optimization for sticky sections: 
  // Custom scroll listener to pause the video when we've scrolled past 15% of OrbitSection 
  // (which corresponds to window.innerHeight * 1.5 approx)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleScrollPause = () => {
      if (window.scrollY > window.innerHeight * 1.2) {
        if (!video.paused) video.pause();
      } else {
        if (video.paused && isComplete) {
          video.play().catch(() => {});
        }
      }
    };
    
    window.addEventListener('scroll', handleScrollPause, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollPause);
  }, [isComplete]);

  // Sync playback when isComplete changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isComplete) {
      if (window.scrollY < window.innerHeight * 1.2) {
        video.play().catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isComplete]);

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
        { opacity: 0, y: 30 }, 
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
          force3D: true,
        }
      );

      // 3. Stagger inner components smoothly drifting up like butter
      tl.fromTo('.hero-element', 
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.0,
          stagger: 0.08,
          ease: 'power3.out',
          force3D: true,
        }, 
        "-=1.0"
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

      // Tagline rotation (updates styles dynamically for each tagline segment)
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
              
              // Keep all taglines uniformly in the same font/sizes as the 1st text to maintain design consistency
              taglineEl.className = "hero-element font-michroma text-[clamp(0.85rem,2vw,1.15rem)] uppercase tracking-[0.12em] font-normal mb-8 md:mb-10 h-auto min-h-[4.5rem] md:min-h-[3rem] text-neutral-200 mix-blend-difference relative z-10";

              gsap.fromTo(taglineEl, 
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, force3D: true }
              );
            }
          });
        }, 3400); // 3.4 seconds rotation
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
      if (interval) clearInterval(interval);
      if (splitText) {
        splitText.revert();
      }
    };
  }, [isStarted]);

  const handleViewWorkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector('#outcomes');
    if (!target) return;
    const scrollTarget = target.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.1;
    (window as any).isJumping = true;
    if ((window as any).lenis) {
      (window as any).lenis.scrollTo(scrollTarget, { immediate: true });
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

  const handleGetInTouchClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector('#contact');
    if (!target) return;
    const parentTransition = target.closest('[style*="500vh"]');
    const scrollTarget = parentTransition
      ? parentTransition.getBoundingClientRect().top + window.scrollY
      : target.getBoundingClientRect().top + window.scrollY;
    (window as any).isJumping = true;
    if ((window as any).lenis) {
      (window as any).lenis.scrollTo(scrollTarget, { immediate: true });
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

  return (
    <section 
      id="hero-section"
      ref={containerRef}
      className="relative min-h-screen w-full flex flex-col justify-center md:flex-row md:justify-start items-center px-[clamp(1rem,5vw,4rem)] pt-24 pb-24 md:pt-20 md:pb-0 overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      {/* Native background video - optimized with Cloudinary auto-format/auto-quality and poster fallback */}
      <video
        ref={videoRef}
        src="https://res.cloudinary.com/dr2tc3dyk/video/upload/q_auto,f_auto/v1780723250/hero_section_video_q01df4.mp4"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        loop
        muted
        playsInline
        preload="auto"
        poster="https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780723250/hero_section_video_q01df4.jpg"
      />

      {/* LEFT COLUMN */}
      <div className="w-full md:w-[60%] lg:w-[55%] flex flex-col text-white max-w-[480px] md:max-w-none">
        
        <h2 
          ref={nameRef}
          className="font-azonix uppercase text-[clamp(1.75rem,7vw,3.5rem)] md:text-[clamp(2.5rem,5vw,5rem)] font-normal leading-[1.2] md:leading-[1.1] mb-6 cursor-default opacity-0 mix-blend-difference text-white relative z-10"
        >
          <span className="whitespace-nowrap">Miftahul Islam</span><br />
          <span className="whitespace-nowrap">Efaz</span>
        </h2>
        
        <div 
          ref={taglineRef}
          className="hero-element font-michroma text-[clamp(0.85rem,2vw,1.15rem)] uppercase tracking-[0.12em] font-normal mb-8 md:mb-10 h-auto min-h-[4.5rem] md:min-h-[3rem] text-neutral-200 mix-blend-difference relative z-10"
        >
          {taglines[0]}
        </div>
        
        <div className="hero-element flex flex-row sm:flex-row gap-4 mb-10 md:mb-12 w-full sm:w-auto items-center relative z-10">
          <a href="#outcomes" onClick={handleViewWorkClick} className="px-5 py-3.5 md:px-[34px] md:py-[15px] text-center bg-white text-black font-body font-bold text-sm md:text-base rounded transition-[transform,background-color,color,box-shadow] duration-300 hover:bg-neutral-100 hover:scale-[1.05] active:scale-[0.98] shadow-[0_4px_25px_rgba(255,255,255,0.25)] flex-1 sm:flex-none whitespace-nowrap">
            View My Work
          </a>
          <a href="#contact" onClick={handleGetInTouchClick} className="px-4 py-3 md:px-7 md:py-3.5 text-center border border-white/25 text-white/80 font-body text-xs md:text-sm rounded transition-[transform,border-color,color] duration-300 hover:border-white/70 hover:text-white flex-1 sm:flex-none whitespace-nowrap">
            Get In Touch →
          </a>
        </div>

        <div className="hero-element flex relative z-10">
          <AnimatedDock
            items={[
              {
                link: "https://github.com/Miftahul-Islam-Efaz",
                target: "_blank",
                Icon: <Github size={22} />,
                label: "GitHub",
              },
              {
                link: "https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/",
                target: "_blank",
                Icon: <Linkedin size={22} />,
                label: "LinkedIn",
              },
              {
                link: "https://x.com/Miftahul_Islam9",
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
              {
                link: "https://www.facebook.com/miftahul.islam.efaz",
                target: "_blank",
                Icon: <Facebook size={22} />,
                label: "Facebook",
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
});

export default Hero;
