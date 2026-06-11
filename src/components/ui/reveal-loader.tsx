"use client";
import React, { useState, useEffect, useRef } from 'react';

interface RevealLoaderProps {
  onComplete?: () => void;
  onExitStart?: () => void;
  onExitComplete?: () => void;
  isStarted?: boolean;
}

const GREETINGS = [
  'Hello', 'হ্যালো', 'Bonjour', 'Hola',
  'Ciao', 'こんにちは', 'Hallo', '안녕',
  'Olá', 'مرحبا', 'Hej', 'Namaste'
];

const RevealLoader = ({
  onComplete,
  onExitStart,
  onExitComplete,
  isStarted = true,
}: RevealLoaderProps) => {
  const [isDone, setIsDone] = useState(false);
  const [greetingText, setGreetingText] = useState(GREETINGS[0]);
  const [counterValue, setCounterValue] = useState(0);
  
  const [greetingLeaving, setGreetingLeaving] = useState(false);
  const [nameRevealed, setNameRevealed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const curvePathRef = useRef<SVGPathElement>(null);
  const exitStartedRef = useRef(false);

  // Act I: Multilingual greetings cycling
  useEffect(() => {
    if (!isStarted || isExiting) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % GREETINGS.length;
      setGreetingText(GREETINGS[index]);
    }, 220);

    return () => clearInterval(interval);
  }, [isStarted, isExiting]);

  // Act I: Eased counter animation with organic stalls
  useEffect(() => {
    if (!isStarted) return;

    let currentProgress = 0;
    let timeoutId: NodeJS.Timeout;

    const stepCounter = () => {
      if (currentProgress >= 100) {
        // Trigger Act II: greetings and counter fade out
        setGreetingLeaving(true);
        
        // Show the name after greetings slide away
        setTimeout(() => {
          setNameRevealed(true);
        }, 350);

        // Delay 1500ms after name reveal, then trigger Act III (curtain wipe)
        setTimeout(() => {
          triggerWipe();
        }, 350 + 1500);
        return;
      }

      const remaining = 100 - currentProgress;
      // organic increments: bigger jumps early, hesitation near the end
      const jump = Math.max(1, Math.round(Math.random() * (remaining > 20 ? 9 : 3)));
      currentProgress = Math.min(100, currentProgress + jump);
      setCounterValue(currentProgress);

      const delay = 40 + Math.random() * (remaining < 15 ? 160 : 80);
      timeoutId = setTimeout(stepCounter, delay);
    };

    timeoutId = setTimeout(stepCounter, 500);
    return () => clearTimeout(timeoutId);
  }, [isStarted]);

  // Act III: Trailing curve wipe-up animation
  const triggerWipe = () => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    setIsExiting(true);
    if (onExitStart) onExitStart();
    if (onComplete) onComplete();

    // Animate SVG path curve: Q50,bulge to Q50,0
    const start = performance.now();
    const duration = 1100; // 1.1s (must match transition duration in CSS)

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // bulge peaks mid-wipe: sin curve 0 -> 10 -> 0
      const bulge = Math.sin(t * Math.PI) * 10;
      if (curvePathRef.current) {
        curvePathRef.current.setAttribute(
          'd',
          `M0,0 L100,0 L100,0 Q50,${bulge.toFixed(2)} 0,0 Z`
        );
      }
      if (t < 1) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);

    // Call onExitComplete after transition ends
    setTimeout(() => {
      setIsDone(true);
      if (onExitComplete) onExitComplete();
    }, duration);
  };

  if (isDone) return null;

  return (
    <>
      <style>{`
        :root {
          --c-black: #030202;
          --c-warm-white: #f5efe4;
          --c-warm-white-dim: rgba(245, 239, 228, 0.45);
          --c-silver: #c7c7cd;
          --ease-expo: cubic-bezier(0.87, 0, 0.13, 1);
          --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        }

        .opener-container {
          position: fixed;
          inset: 0;
          z-index: 99999;
          transition: transform 1.1s var(--ease-expo);
          pointer-events: auto;
        }

        .opener-container.exiting {
          transform: translateY(-112%);
        }

        .opener-panel {
          position: absolute;
          inset: 0;
          background: var(--c-black);
          overflow: hidden;
        }

        .opener-curve {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          height: 12vh;
          display: block;
        }

        .opener-meta {
          position: absolute;
          top: 2rem;
          font-size: 0.7rem;
          font-weight: 400;
          letter-spacing: 0.22em;
          color: var(--c-warm-white-dim);
          opacity: 0;
          animation: metaFadeIn 0.9s var(--ease-out-expo) 0.4s forwards;
        }

        .opener-meta.left { left: 2rem; }
        .opener-meta.right { right: 2rem; }

        @keyframes metaFadeIn {
          to { opacity: 1; }
        }

        .opener-greeting {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 0.9rem;
          opacity: 0;
          animation: metaFadeIn 0.5s ease-out 0.3s forwards;
          transition: opacity 0.35s ease, filter 0.35s ease;
        }

        .opener-greeting.leaving {
          opacity: 0 !important;
          filter: blur(6px);
        }

        .opener-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--c-warm-white);
          flex-shrink: 0;
        }

        .opener-word {
          font-size: clamp(1.4rem, 2.6vw, 2.2rem);
          font-weight: 400;
          color: var(--c-warm-white);
        }

        .opener-name {
          position: absolute;
          left: 2rem;
          right: 2rem;
          bottom: 2rem;
          display: flex;
          flex-direction: column;
          visibility: hidden;
        }

        .opener-name.revealed {
          visibility: visible;
        }

        .opener-name .name-line {
          display: block;
          overflow: hidden;
        }

        .opener-name .name-line-inner {
          display: block;
          font-size: clamp(2.6rem, 11.5vw, 11rem);
          font-weight: 600;
          line-height: 0.96;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: var(--c-warm-white);
          transform: translateY(110%);
        }

        .opener-name .name-line-inner em {
          font-style: italic;
          font-weight: 400;
          color: var(--c-silver);
        }

        .opener-name.revealed .name-line-inner {
          animation: nameLineUp 1.1s var(--ease-expo) forwards;
        }

        .opener-name.revealed .name-line:nth-child(1) .name-line-inner {
          animation-delay: 0s;
        }

        .opener-name.revealed .name-line:nth-child(2) .name-line-inner {
          animation-delay: 0.12s;
        }

        @keyframes nameLineUp {
          to { transform: translateY(0); }
        }

        .opener-count {
          position: absolute;
          right: 2rem;
          bottom: 2rem;
          font-size: clamp(4rem, 14vw, 13rem);
          font-weight: 300;
          line-height: 0.8;
          letter-spacing: -0.03em;
          color: var(--c-warm-white);
          opacity: 0;
          font-variant-numeric: tabular-nums;
          animation: metaFadeIn 0.6s ease-out 0.3s forwards;
          transition: opacity 0.5s ease, transform 0.5s var(--ease-out-expo);
        }

        .opener-count.leaving {
          opacity: 0 !important;
          transform: translateY(-20px);
        }
      `}</style>

      <div className={`opener-container ${isExiting ? 'exiting' : ''}`}>
        <div className="opener-panel">
          {/* Corner Metadata */}
          <div className="opener-meta left">© 2026</div>
          <div className="opener-meta right">PORTFOLIO</div>

          {/* Cycling Greetings */}
          <div className={`opener-greeting ${greetingLeaving ? 'leaving' : ''}`}>
            <span className="opener-dot" />
            <span className="opener-word">{greetingText}</span>
          </div>

          {/* The Name (Line by Line Masked Slide-up) */}
          <div className={`opener-name ${nameRevealed ? 'revealed' : ''}`} aria-label="Miftahul Islam Efaz">
            <span className="name-line">
              <span className="name-line-inner">MIFTAHUL</span>
            </span>
            <span className="name-line">
              <span className="name-line-inner">
                ISLAM <em>EFAZ</em>
              </span>
            </span>
          </div>

          {/* Huge Counter */}
          <div className={`opener-count ${greetingLeaving ? 'leaving' : ''}`}>
            {counterValue}
          </div>
        </div>

        {/* The Curved Edge Trail */}
        <svg className="opener-curve" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
          <path ref={curvePathRef} d="M0,0 L100,0 L100,0 Q50,0 0,0 Z" fill="#030202" />
        </svg>
      </div>
    </>
  );
};

export default RevealLoader;
