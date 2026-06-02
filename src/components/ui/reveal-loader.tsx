"use client";
import React, { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "../../lib/utils";

gsap.registerPlugin(useGSAP);

interface RevealLoaderProps {
  onComplete?: () => void;
}

const RevealLoader = ({
  onComplete,
}: RevealLoaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [exitPhase, setExitPhase] = useState<"loading" | "animating-out">("loading");

  // Premium GSAP-powered loading sequence
  useGSAP(() => {
    if (!nameRef.current || !barRef.current) return;

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
    const tl = gsap.timeline({
      onUpdate: () => {
        setProgress(Math.round(obj.val));
      },
      onComplete: () => {
        setProgress(100);
        // Clean readability delay before transition starts
        setTimeout(() => {
          setExitPhase("animating-out");
          // Callback after the curtain slide finishes
          setTimeout(() => {
            setIsDone(true);
            if (onComplete) onComplete();
          }, 1200); // Match curtain-pull transition duration perfectly
        }, 500);
      }
    });

    // 1. Smoothly animate progress percentage from 0 to 100 with an elegant deceleration
    tl.to(obj, {
      val: 100,
      duration: 3.2,
      ease: "power2.out",
    }, 0);

    // 2. Animate the progress bar line cleanly in perfect sync
    tl.to(barRef.current, {
      width: "100%",
      duration: 3.2,
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
      duration: 2.2,
      ease: "power3.out",
      stagger: {
        each: 0.05,
        from: "start",
      }
    }, 0.2);

  }, { scope: containerRef });

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
        className={cn(
          "fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-black select-none overflow-hidden transition-transform duration-[1200ms]",
          exitPhase === "animating-out" ? "-translate-y-full" : "translate-y-0"
        )}
        style={{
          // Hardware-accelerated sliding transition timing function
          transitionTimingFunction: "cubic-bezier(0.85, 0, 0.15, 1)",
        }}
      >
        {/* Soft, Luxurious Ambient Glow behind the cursive layout */}
        <div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[140px] pointer-events-none transition-transform duration-300 ease-out z-0" 
          style={{
            background: "radial-gradient(circle, rgba(235,235,245,0.04) 0%, rgba(255,255,255,0) 70%)",
            top: "20%",
            left: "20%",
            transform: `scale(${1 + progress / 350})`,
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
                className="char-span inline-block select-none"
                style={{
                  color: progress >= 95 ? "#FFFFFF" : "#E5E7EB",
                }}
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
            <span className="text-[22px] font-bold leading-none select-none">{progress}</span>
            <span className="text-[11px] text-white/50 select-none">%</span>
          </div>

        </div>

      </div>
    </>
  );
};

export default RevealLoader;
