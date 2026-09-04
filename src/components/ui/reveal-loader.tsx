'use client';

import React, { useState, useEffect, useRef } from 'react';

// Rules live in a real stylesheet rather than an inline <style> tag: React 19
// hoists <style> into <head> on the client, which did not match the
// server-rendered markup and produced a hydration attribute mismatch.
import '../../styles/reveal-loader.css';

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

/**
 * Must stay in sync with the .opener-container transition in reveal-loader.css.
 *
 * The reference capture measured ~560ms, but that was across a 1920px
 * horizontal travel. This curtain covers 100vh - a shorter distance - so at
 * 560ms the wave crossed the screen faster than the eye could follow it.
 * 1000ms is the readable equivalent at this travel distance.
 */
const WIPE_DURATION_MS = 1000;
const GREETING_INTERVAL_MS = 176;
const NAME_REVEAL_DELAY_MS = 280;
const NAME_HOLD_MS = 1200;

/* ------------------------------------------------------------------
   THE TRAILING WAVE

   Measured off the reference capture frame by frame (1920x806, 30fps):

     - the panel clears frame in ~16 frames  -> ~520-560ms
     - remaining distance shrinks by a near-constant ~0.77 per frame,
       i.e. exponential decay -> ease-OUT, fast off the mark with a long
       settling tail
     - the leading edge is a clean sinusoid, peak-to-peak 186px on a
       1920px travel axis -> amplitude 4.84% of the travel dimension
     - exactly 2.0 full periods across the cross axis

   The single most important detail: the wave amplitude is CONSTANT for the
   whole exit. The panel is a rigid body that simply slides. The previous
   implementation grew and shrank the bulge with `Math.sin(t * Math.PI)` on a
   requestAnimationFrame loop, which is what made it read as a soft blob
   rather than a cut edge.

   Because the shape never changes, the path is a module-level constant and
   the exit is a single CSS transform transition. No rAF loop, no per-frame
   attribute writes, and - since the string is deterministic - no risk of a
   server/client hydration mismatch.
   ------------------------------------------------------------------ */

const WAVE_PERIODS = 2;
const WAVE_SAMPLES = 180;

/**
 * Builds the wavy bottom edge of the curtain.
 *
 * Drawn in a 100x100 viewBox with `preserveAspectRatio="none"`, so the SVG
 * stretches to the full width and to `--wave-height` tall. The wave is centred
 * at y=50 with amplitude 50, which means the rendered amplitude is exactly half
 * of the element height.
 */
const buildWavePath = (): string => {
  const segments: string[] = [];

  // Trace the wave from right back to left, then close to the top-left corner.
  for (let i = WAVE_SAMPLES; i >= 0; i -= 1) {
    const x = (i / WAVE_SAMPLES) * 100;
    const y = 50 + 50 * Math.sin((x / 100) * WAVE_PERIODS * Math.PI * 2);
    segments.push(`L${x.toFixed(3)},${y.toFixed(3)}`);
  }

  return `M0,0 L100,0 ${segments.join(' ')} Z`;
};

const WAVE_PATH = buildWavePath();

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

  const exitStartedRef = useRef(false);

  // Act I: Multilingual greetings cycling
  useEffect(() => {
    if (!isStarted || isExiting) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % GREETINGS.length;
      setGreetingText(GREETINGS[index]);
    }, GREETING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isStarted, isExiting]);

  // Act I: Eased counter animation with organic stalls
  useEffect(() => {
    if (!isStarted) return;

    let currentProgress = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let revealTimeoutId: ReturnType<typeof setTimeout>;
    let wipeTimeoutId: ReturnType<typeof setTimeout>;

    const stepCounter = () => {
      if (currentProgress >= 100) {
        // Trigger Act II: greetings and counter fade out
        setGreetingLeaving(true);

        // Show the name after greetings slide away
        revealTimeoutId = setTimeout(() => {
          setNameRevealed(true);
        }, NAME_REVEAL_DELAY_MS);

        // Hold on the name, then trigger Act III (curtain wipe)
        wipeTimeoutId = setTimeout(() => {
          triggerWipe();
        }, NAME_REVEAL_DELAY_MS + NAME_HOLD_MS);
        return;
      }

      const remaining = 100 - currentProgress;
      // organic increments: bigger jumps early, hesitation near the end
      const jump = Math.max(1, Math.round(Math.random() * (remaining > 20 ? 9 : 3)));
      currentProgress = Math.min(100, currentProgress + jump);
      setCounterValue(currentProgress);

      const delay = 32 + Math.random() * (remaining < 15 ? 128 : 64);
      timeoutId = setTimeout(stepCounter, delay);
    };

    timeoutId = setTimeout(stepCounter, 120);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(revealTimeoutId);
      clearTimeout(wipeTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  /**
   * Act III: the curtain slides up and off, trailing its wavy edge.
   *
   * All the motion is the CSS transform transition on `.opener-container`.
   * This only flips the class and schedules the handoff, so the hero entry
   * timeline starts while the curtain is still travelling.
   */
  const triggerWipe = () => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    setIsExiting(true);
    if (onExitStart) onExitStart();
    if (onComplete) onComplete();

    setTimeout(() => {
      setIsDone(true);
      if (onExitComplete) onExitComplete();
    }, WIPE_DURATION_MS);
  };

  if (isDone) return null;

  return (
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
        <div
          className={`opener-name ${nameRevealed ? 'revealed' : ''}`}
          aria-label="Miftahul Islam Efaz"
        >
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

      {/* The trailing wave. Sits directly below the panel and travels with it. */}
      <svg
        className="opener-curve"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={WAVE_PATH} fill="currentColor" />
      </svg>
    </div>
  );
};

export default RevealLoader;
