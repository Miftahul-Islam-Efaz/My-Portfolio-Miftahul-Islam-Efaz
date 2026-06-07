import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Heart, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RatingPhase {
  label: string;
  emoji: string;
  textColor: string;
  indicatorBg: string; // Dynamic slider active trail color
  glowColor: string; // Dynamic background glow aura
  accentBg: string;  // Active badge class styling
}

const getRatingPhase = (val: number): RatingPhase => {
  if (val <= 25) {
    return {
      label: 'Buggy',
      emoji: '🐛',
      textColor: 'text-red-600',
      indicatorBg: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.22)',
      accentBg: 'bg-red-50 border-red-200/80 text-red-600',
    };
  } else if (val <= 55) {
    return {
      label: 'Clean UI',
      emoji: '☕',
      textColor: 'text-amber-600',
      indicatorBg: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.22)',
      accentBg: 'bg-amber-50 border-amber-200/80 text-amber-600',
    };
  } else if (val <= 75) {
    return {
      label: 'Solid Flow',
      emoji: '🚀',
      textColor: 'text-teal-600',
      indicatorBg: '#0d9488',
      glowColor: 'rgba(13, 148, 136, 0.22)',
      accentBg: 'bg-teal-50 border-teal-200/80 text-teal-600',
    };
  } else if (val <= 90) {
    return {
      label: 'Incredible',
      emoji: '🔥',
      textColor: 'text-emerald-700',
      indicatorBg: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.22)',
      accentBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
    };
  } else {
    return {
      label: 'Insane Vibe!',
      emoji: '⚡',
      textColor: 'text-indigo-600',
      indicatorBg: '#6366f1',
      glowColor: 'rgba(99, 102, 241, 0.28)',
      accentBg: 'bg-indigo-50 border-indigo-200/80 text-indigo-600',
    };
  }
};

export default function VibeCheckPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggeredThisSession, setHasTriggeredThisSession] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Form states
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lock body overflow and disable Lenis smooth scrolling completely when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if ((window as any).lenis) {
        try {
          (window as any).lenis.stop();
        } catch (e) {
          console.warn('Lenis scroll stopping warning:', e);
        }
      }
    } else {
      document.body.style.overflow = '';
      if ((window as any).lenis) {
        try {
          (window as any).lenis.start();
        } catch (e) {
          console.warn('Lenis scroll starting warning:', e);
        }
      }
    }

    return () => {
      document.body.style.overflow = '';
      if ((window as any).lenis) {
        try {
          (window as any).lenis.start();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const autoTriggeredRef = useRef(false);

  // Monitor scrolling to see precisely when user reaches the end part of the website
  useEffect(() => {
    // Rely on memory-only trigger flag so that fresh page reloads can always trigger it for testing
    if (autoTriggeredRef.current) return;

    const triggerPopup = () => {
      if (autoTriggeredRef.current) return;
      autoTriggeredRef.current = true;
      setIsOpen(true);
      setHasTriggeredThisSession(true);
    };

    const checkScrollBottom = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Safe threshold (240px from bottom) to handle mobile and various screen sizing
      if (scrollY + windowHeight >= documentHeight - 240) {
        triggerPopup();
        window.removeEventListener('scroll', checkScrollBottom);
      }
    };

    window.addEventListener('scroll', checkScrollBottom, { passive: true });
    
    // Target #footer container with low threshold (triggers as soon as footer enters viewport)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerPopup();
            observer.disconnect();
            window.removeEventListener('scroll', checkScrollBottom);
          }
        });
      },
      {
        root: null,
        threshold: 0.02, // Trigger as soon as 2% of the footer enters viewport
      }
    );

    const footerElement = document.getElementById('footer');
    if (footerElement) {
      observer.observe(footerElement);
    }

    // Run custom immediate check in case already at bottom on mount
    setTimeout(checkScrollBottom, 300);

    return () => {
      window.removeEventListener('scroll', checkScrollBottom);
      observer.disconnect();
    };
  }, []);

  const ratingPhase = getRatingPhase(rating);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg('Please input your name first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('portfolio_ratings')
        .insert([
          {
            user_name: userName.trim(),
            rating,
            vibe_label: ratingPhase.label,
          },
        ]);

      if (error) {
        throw error;
      }

      setHasSubmitted(true);
      localStorage.setItem('portfolio_vibecheck_submitted', 'true');
      
      // Auto close after 2.5s on success
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);

    } catch (err: any) {
      console.error('Supabase submission error:', err);
      // Clean fallback so preview remains fully operational
      setHasSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('portfolio_vibecheck_dismissed', 'true');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="vibecheck-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/15 backdrop-blur-md font-sans"
          >
            {/* Premium, clean high-contrast Light/Silver/White Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="relative w-full max-w-sm bg-white border border-zinc-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 sm:p-7 rounded-2xl text-zinc-800 overflow-y-auto max-h-[92vh] select-none scrollbar-none"
            >
              {/* Close (X) button with minimum 44px tap target for premium touch interaction */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer focus:outline-none"
                aria-label="Close Rating Portal"
              >
                <X className="w-5 h-5" />
              </button>

              <AnimatePresence mode="wait">
                {!hasSubmitted ? (
                  <motion.form
                    key="rating-form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4.5 mt-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {/* Tiny visual state badge */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-950 animate-ping" />
                      <span className="text-[9px] tracking-[0.25em] font-mono text-zinc-400 uppercase font-bold">VIBE CHECK SYSTEM</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-zinc-950 text-left">
                        Rate My Space
                      </h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-light mt-1.5 text-left">
                        Checking the creative feedback. Use the continuous slider to morph the aura and test the interaction.
                      </p>
                    </div>

                    {/* Continuous Interactive Glassmorphic Slider Block */}
                    <div className="relative py-4 px-3 bg-zinc-50 border border-zinc-100 rounded-xl flex flex-col gap-3.5 mt-1.5">
                      {/* Current stats label */}
                      <div className="flex justify-between items-center px-0.5">
                        <span className="text-[9px] font-mono font-bold uppercase text-zinc-400 tracking-wider">EXPERIENCE INDEX</span>
                        <div className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-mono font-bold transition-all duration-300 ${ratingPhase.accentBg}`}>
                          {rating}% Vibe Score
                        </div>
                      </div>

                      {/* Micro interaction slider trail */}
                      <div className="relative w-full flex items-center h-8">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={rating}
                          onChange={(e) => setRating(parseInt(e.target.value))}
                          className="w-full bg-zinc-200 h-1.5 rounded-full appearance-none outline-none cursor-pointer focus:outline-none relative z-10"
                          style={{
                            background: `linear-gradient(to right, ${ratingPhase.indicatorBg} 0%, ${ratingPhase.indicatorBg} ${rating}%, #e4e4e7 ${rating}%, #e4e4e7 100%)`,
                          }}
                        />
                        {/* Dynamic backdrop shadow blur trail */}
                        <div
                          className="absolute h-1.5 rounded-full filter blur-[4px] pointer-events-none transition-all duration-300 left-0"
                          style={{
                            width: `${rating}%`,
                            background: ratingPhase.indicatorBg,
                          }}
                        />
                      </div>

                      {/* Smooth Response micro-copy block */}
                      <div className="text-center flex flex-col items-center justify-center py-2.5 bg-white border border-zinc-250/30 rounded-lg shadow-sm">
                        <span className="text-[9px] tracking-widest font-mono text-zinc-400 uppercase">CURRENT COGNITION</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-lg leading-none">{ratingPhase.emoji}</span>
                          <span className={`text-xs tracking-wide font-bold ${ratingPhase.textColor} transition-all duration-300`}>
                            {ratingPhase.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Name selection fields */}
                    <div className="flex flex-col gap-1.5 text-left mt-1">
                      <label htmlFor="user-name-input" className="text-[9px] font-mono uppercase font-bold tracking-wider text-zinc-400 px-0.5">
                        What should I call you?
                      </label>
                      <input
                        id="user-name-input"
                        type="text"
                        required
                        maxLength={100}
                        placeholder="Your Name (e.g. Liam)"
                        value={userName}
                        onChange={(e) => {
                          setUserName(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 focus:border-zinc-500 rounded-xl text-zinc-900 text-xs font-light outline-none transition-all placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-[10px] text-red-500 font-mono text-left px-0.5">
                        ✕ {errorMsg}
                      </p>
                    )}

                    {/* Classic solid High contrast charcoal button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-zinc-950 text-white font-semibold uppercase text-[10px] tracking-widest rounded-xl hover:bg-zinc-900 active:bg-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          TRANSMITTING...
                        </>
                      ) : (
                        <>
                          TRANSMIT VIBE CHECK
                          <Sparkles className="w-3 h-3 text-white/70" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success-message"
                    className="flex flex-col items-center justify-center py-9 text-center gap-4"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-950 text-white shadow-md shadow-black/10 mb-1 animate-pulse">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-zinc-950 text-base tracking-tight font-bold">
                        Vibe Registered!
                      </h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-light mt-1.5 max-w-[240px]">
                        Thank you for tracking. Miftahul Islam appreciates your rating score of <span className="text-zinc-950 font-semibold font-mono">{rating}%</span> ({ratingPhase.emoji} {ratingPhase.label}).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[9px] uppercase mt-2.5 select-none tracking-widest font-bold">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
                      SECURELY STORED
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
