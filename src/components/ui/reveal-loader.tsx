"use client";
import React, { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "../../lib/utils";

gsap.registerPlugin(useGSAP);

interface RevealLoaderProps {
  onComplete?: () => void;
  isStarted?: boolean;
}

const RevealLoader = ({
  onComplete,
  isStarted = true,
}: RevealLoaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const percentSpanRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  
  const [isDone, setIsDone] = useState(false);

  // High performance, 60fps loader sequence
  useGSAP(() => {
    if (!isStarted) return;
    if (!nameRef.current || !barRef.current || !contentRef.current) return;

    const charsDom = nameRef.current.querySelectorAll(".char-span");

    // Initial scattered state for letters (gorgeous wave-like scattering)
    gsap.set(charsDom, {
      opacity: 0,
      filter: "blur(12px)",
      scale: 0.65,
      x: (i) => Math.cos(i * 1.6) * 75,
      y: (i) => Math.sin(i * 1.3) * 50,
      rotation: (i) => Math.sin(i * 2.1) * 35,
    });

    const obj = { val: 0 };
    const tl = gsap.timeline();

    // 1. Smoothly animate progress percentage from 0 to 100 with an elegant deceleration
    tl.to(obj, {
      val: 100,
      duration: 3.0,
      ease: "power2.out",
      onUpdate: () => {
        const currentProgress = Math.round(obj.val);
        if (percentSpanRef.current) {
          percentSpanRef.current.innerText = String(currentProgress);
        }
        if (glowRef.current) {
          glowRef.current.style.transform = `scale(${1 + currentProgress / 350})`;
        }
        // Change colors slightly towards the very end
        if (currentProgress >= 95) {
          gsap.to(charsDom, { color: "#FFFFFF", duration: 0.2, overwrite: "auto" });
        }
      }
    }, 0);

    // 2. Animate the progress bar line cleanly in perfect sync
    tl.to(barRef.current, {
      width: "100%",
      duration: 3.0,
      ease: "power2.out",
    }, 0);

    // 3. Stagger-assemble the letters into place beautifully and with buttery 60fps fluidity
    tl.to(charsDom, {
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      duration: 2.0,
      ease: "power3.out",
      stagger: {
        each: 0.05,
        from: "start",
      }
    }, 0.2);

    // 4. Curtain Pull up exit transition (with a luxurious 0.3s pause)
    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 1.5,
      ease: "power4.inOut",
      onStart: () => {
        if (onComplete) onComplete();
      },
      onComplete: () => {
        setIsDone(true);
      }
    }, "+=0.3");

  }, { scope: containerRef, dependencies: [isStarted] });

  const nameChars = "Miftahul Islam Efaz".split("");

  if (isDone) return null;

  return (
    <>
      <style>{`
        .text-glow-silver {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.15), 0 0 40px rgba(220, 220, 230, 0.08);
        }
      `}</style>

      <div 
        ref={containerRef}
        className="fixed top-0 left-0 w-full h-[120vh] z-[99998] select-none overflow-visible will-change-transform"
        style={{ pointerEvents: "auto" }}
      >
        {/* Curved SVG curtain background */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none fill-[#0a0a0a]"
          viewBox="0 0 100 120" 
          preserveAspectRatio="none"
        >
          <path d="M 0 0 L 100 0 L 100 100 Q 50 115 0 100 Z" />
        </svg>

        {/* Content Layer (perfectly centered on screen in the first 100vh) */}
        <div 
          ref={contentRef} 
          className="absolute top-0 left-0 w-full h-[100vh] flex flex-col items-center justify-center z-10"
        >
          
          {/* Soft, Luxurious Ambient Glow behind the cursive layout */}
          <div 
            ref={glowRef}
            className="absolute w-[60vw] h-[60vw] rounded-full blur-[140px] pointer-events-none z-0" 
            style={{
              background: "radial-gradient(circle, rgba(235,235,245,0.04) 0%, rgba(255,255,255,0) 70%)",
              top: "20%",
              left: "20%",
              transform: "scale(1)",
            }}
          />

          {/* Centered Name Signature */}
          <div 
            ref={nameRef} 
            className="flex flex-row justify-center items-center flex-wrap px-8 text-center select-none max-w-full relative z-20 font-backstreet text-[clamp(2.4rem,7vw,5.2rem)] font-normal text-white text-glow-silver leading-[1.1]"
          >
            {nameChars.map((char, index) => {
              if (char === " ") {
                return <span key={index} className="w-[0.24em]" />;
              }
              return (
                <span
                  key={index}
                  className="char-span inline-block select-none text-gray-200 will-change-[transform,opacity,filter] transform-gpu"
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* Progress Tracker Slider Section */}
          <div className="absolute bottom-[16%] flex flex-col items-center z-30 w-[180px] md:w-[240px]">
            
            {/* Tracking line container */}
            <div className="w-full h-[2.5px] bg-white/10 rounded-full relative overflow-hidden">
              <div 
                ref={barRef}
                className="absolute left-0 top-0 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.65)]"
                style={{ width: "0%" }}
              />
            </div>

            {/* Centered Percentage count beneath the line */}
            <div className="font-sans text-[18px] font-semibold text-white/90 tracking-widest flex items-baseline gap-0.5 select-none mt-3.5 pl-2">
              <span ref={percentSpanRef} className="text-[22px] font-bold leading-none select-none">0</span>
              <span className="text-[11px] text-white/50 select-none">%</span>
            </div>

          </div>

        </div>

      </div>
    </>
  );
};

export default RevealLoader;
