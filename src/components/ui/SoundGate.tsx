"use client";
import React, { useState, useEffect } from 'react';
import gsap from 'gsap';

interface SoundGateProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function SoundGate({ onAccept, onDecline }: SoundGateProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Elegant fade-in of the gate interface
    gsap.fromTo('.gate-container',
      { opacity: 0, scale: 0.96, filter: 'blur(10px)' },
      { opacity: 1, scale: 1, filter: 'blur(0.01px)', duration: 1.4, ease: 'power3.out' }
    );
  }, []);

  const handleAction = (enableSound: boolean) => {
    // Initialize Web Audio context on the user-click thread to unlock browser rules
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch (e) {
        console.warn('AudioContext automatic unlock bypassed:', e);
      }
    }

    // Secondary layer HTML5 Audio autoplay bypass
    const dummyAudio = new Audio();
    dummyAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    dummyAudio.play().catch(() => {});

    // Save preferences
    if (enableSound) {
      localStorage.setItem('audio_atmosphere', 'enabled');
      localStorage.setItem('audio_atmosphere_asked', 'true');
    } else {
      localStorage.setItem('audio_atmosphere', 'disabled');
      localStorage.setItem('audio_atmosphere_asked', 'true');
    }
    
    // Notify application
    window.dispatchEvent(new Event('audio_preference_changed'));

    // Luxurious fade-out animation sequence
    gsap.to('.gate-container', {
      opacity: 0,
      scale: 1.04,
      filter: 'blur(12px)',
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: () => {
        setIsVisible(false);
        if (enableSound) {
          onAccept();
        } else {
          onDecline();
        }
      }
    });
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 w-full h-[100vh] bg-[#070505] z-[999999] flex flex-col items-center justify-center select-none overflow-hidden"
      id="sound-access-gate"
    >
      {/* Cinematic Ambient Flare Glow Background */}
      <div 
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[160px] pointer-events-none z-0 opacity-40" 
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 75%)",
          top: "10%",
          left: "10%",
        }}
      />

      <div className="gate-container max-w-[500px] w-full px-8 text-center flex flex-col items-center z-10 opacity-0 transform-gpu">
        
        {/* Decorative micro indicator line */}
        <div className="w-[30px] h-[1px] bg-white/20 mb-8" />

        {/* Cinematic Title using Font Michroma */}
        <h1 className="font-michroma text-[clamp(1.2rem,4vw,1.8rem)] font-light text-white tracking-[0.25em] leading-[1.4] mb-5">
          EXPERIENCE THE<br />ATMOSPHERE
        </h1>

        {/* Humble and human literal description */}
        <p className="font-sans text-[clamp(0.85rem,2vw,1.0rem)] text-neutral-400 font-normal leading-relaxed mb-10 max-w-[400px]">
          This workspace is crafted with high-fidelity mechanical transitions and cinematic audio layers for immersive spatial depth. We recommend enabling sound.
        </p>

        {/* Primary Action Button (Enter with Audio) with hover and tap scale states */}
        <button
          onClick={() => handleAction(true)}
          className="w-full md:w-auto px-8 py-4 border border-white bg-white text-black font-michroma text-[clamp(10px,1.5vw,12px)] font-bold tracking-[0.22em] transition-all duration-300 hover:bg-transparent hover:text-white hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:border-white focus:outline-none cursor-pointer rounded-none"
          id="btn-gate-accept"
        >
          ACTIVATE AUDIO
        </button>

      </div>
    </div>
  );
}
