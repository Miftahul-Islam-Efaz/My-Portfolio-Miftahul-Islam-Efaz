import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowUpRight, Cpu } from 'lucide-react';

export default function AskLLMPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isInAllowedSection, setIsInAllowedSection] = useState(true);
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  // Fallback domain, dynamically updated on mount to match portfolio address (e.g. miftahulisamefaz.xyz)
  const [baseDomain, setBaseDomain] = useState("https://www.miftahulisamefaz.xyz");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseDomain(window.location.origin);
    }
  }, []);

  const promptText = `Please read the portfolio index at ${baseDomain}/llms.txt and tell me about Miftahul Islam Efaz: his technical frontend skills, achievements, list of web projects, biophilic service design, and creative interactive portfolio layouts.`;

  // Disable / Enable body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if ((window as any).lenis) {
        try {
          (window as any).lenis.stop();
        } catch (e) {}
      }
    } else {
      document.body.style.overflow = '';
      if ((window as any).lenis) {
        try {
          (window as any).lenis.start();
        } catch (e) {}
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

  // Monitor and track visibility of allowed sections (Hero, 2nd section, Footer)
  useEffect(() => {
    // Track allowed sections (hero-section, skills, footer) for displaying trigger button
    const checkSectionVisibility = () => {
      const heroEl = document.getElementById('hero-section');
      const skillsEl = document.getElementById('skills');
      const footerEl = document.getElementById('footer');

      if (!heroEl && !skillsEl && !footerEl) return;

      let inHero = false;
      let inSkills = false;
      let inFooter = false;

      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        inHero = rect.bottom > 0 && rect.top < window.innerHeight;
      }
      if (skillsEl) {
        const rect = skillsEl.getBoundingClientRect();
        inSkills = rect.bottom > 0 && rect.top < window.innerHeight;
      }
      if (footerEl) {
        const rect = footerEl.getBoundingClientRect();
        inFooter = rect.bottom > 0 && rect.top < window.innerHeight;
      }

      setIsInAllowedSection(inHero || inSkills || inFooter);
    };

    window.addEventListener('scroll', checkSectionVisibility, { passive: true });
    const visibilityInterval = setInterval(checkSectionVisibility, 200);
    
    // Immediate check on mount
    setTimeout(checkSectionVisibility, 300);

    return () => {
      window.removeEventListener('scroll', checkSectionVisibility);
      clearInterval(visibilityInterval);
    };
  }, []);

  const handleCopyAndNavigate = async (providerName: string, url: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedProvider(providerName);

      // Brief animation sync-up before transitioning tab
      setTimeout(() => {
        setCopiedProvider(null);
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 900);
    } catch (err) {
      console.warn('Clipboard manipulation warning:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('portfolio_llm_panel_dismissed', 'true');

    // Unlock Web Audio context and enable audio atmosphere silently on user interaction
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

    // HTML5 Audio autoplay bypass
    const dummyAudio = new Audio();
    dummyAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    dummyAudio.play().catch(() => {});

    // Enable audio atmosphere
    localStorage.setItem('audio_atmosphere', 'enabled');
    localStorage.setItem('audio_atmosphere_asked', 'true');
    
    // Notify application
    window.dispatchEvent(new Event('audio_preference_changed'));
  };

  // Mapped exact vector code from your uploaded files (/LLMS-icons)
  const llmIcons = {
    // Exact match for /LLMS-icons/openai-chatgpt.svg
    chatgpt: (
      <svg className="w-5 h-5 text-zinc-400 group-hover:text-white transition-all" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
      </svg>
    ),
    // Exact match for /LLMS-icons/gemini-embed-icon.txt
    gemini: (
      <img 
        src="https://img.icons8.com/3d-fluency/1500/gemini-ai.png" 
        alt="gemini-ai" 
        className="w-[19px] h-[19px] object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
      />
    ),
    // Standard minimal sleek Claude vector to match monochrome layout
    claude: (
      <svg className="w-5 h-5 text-zinc-400 group-hover:text-white transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-1.813-5.096L2.091 14.1l5.096-1.813L9 7.187l1.813 5.096 5.096 1.813-5.096 1.813zM19.07 4.93a10 10 0 011.517 7.551M13.623 5.567a5 5 0 015.656 5.656" />
      </svg>
    ),
    // Exact match for /LLMS-icons/icons8-perplexity-ai.svg
    perplexity: (
      <svg viewBox="0 0 50 50" className="w-[18px] h-[18px] text-zinc-400 group-hover:text-white transition-all" fill="currentColor">
        <path d="M 5 5 L 5 45 L 45 45 L 45 5 L 5 5 z M 35 8.7734375 L 35 18 L 39 18 L 39 32 L 35 32 L 35 41.351562 L 26 33.351562 L 26 40 L 24 40 L 24 33.226562 L 15 41.226562 L 15 32 L 11 32 L 11 18 L 15 18 L 15 8.8984375 L 24 16.898438 L 24 9.125 L 26 9.125 L 26 16.773438 L 35 8.7734375 z M 33 13.226562 L 27.630859 18 L 33 18 L 33 13.226562 z M 17 13.351562 L 17 18 L 22.228516 18 L 17 13.351562 z M 13 20 L 13 30 L 15 30 L 15 26.550781 L 22.369141 20 L 13 20 z M 27.490234 20 L 35 26.675781 L 35 30 L 37 30 L 37 20 L 27.490234 20 z M 24 21.226562 L 17 27.449219 L 17 36.773438 L 24 30.552734 L 24 21.226562 z M 26 21.351562 L 26 30.677734 L 33 36.898438 L 33 27.574219 L 26 21.351562 z"/>
      </svg>
    ),
    // Exact match for /LLMS-icons/mistral-color.svg but styled elegantly monochrome for silver-black sync
    mistral: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-zinc-400 group-hover:text-white transition-all" fill="currentColor">
        <path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z"></path>
        <path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z"></path>
        <path d="M3.428 10.258h17.144v3.428H3.428v-3.428z"></path>
        <path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z"></path>
        <path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z"></path>
      </svg>
    ),
    // Exact match for /LLMS-icons/grok-xai.svg
    grok: (
      <svg className="w-[18px] h-[18px] text-zinc-400 group-hover:text-white transition-all" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1.000A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
      </svg>
    )
  };

  const providers = [
    {
      name: 'ChatGPT',
      icon: llmIcons.chatgpt,
      url: `https://chatgpt.com/?q=${encodeURIComponent(promptText)}`,
      tagline: 'Loads prompt instantly'
    },
    {
      name: 'Gemini',
      icon: llmIcons.gemini,
      url: 'https://gemini.google.com/app',
      tagline: 'Copies prompt, opens tool'
    },
    {
      name: 'Claude AI',
      icon: llmIcons.claude,
      url: 'https://claude.ai/new',
      tagline: 'Copies prompt, opens tool'
    },
    {
      name: 'Perplexity',
      icon: llmIcons.perplexity,
      url: `https://www.perplexity.ai/?q=${encodeURIComponent(promptText)}`,
      tagline: 'Loads prompt instantly'
    },
    {
      name: 'Mistral AI',
      icon: llmIcons.mistral,
      url: 'https://chat.mistral.ai',
      tagline: 'Copies prompt, opens tool'
    },
    {
      name: 'Grok AI',
      icon: llmIcons.grok,
      url: 'https://grok.com',
      tagline: 'Copies prompt, opens tool'
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          /* High-end Minimalist Monochromatic Backdrop Overlay */
          <motion.div
            key="llm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/20 backdrop-blur-md font-sans"
          >
            {/* White-Silver-Black Panel (Fully Responsive and Mobile friendly scrollable window if needed) */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-zinc-800/90 shadow-[0_30px_70px_rgba(0,0,0,0.95)] p-5 xs:p-6 sm:p-8 rounded-2xl text-stone-300 overflow-y-auto max-h-[92vh] mx-auto select-none scrollbar-none"
            >
              {/* Larger, comfortable touch-target close button for great responsiveness and usability on mobile */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-12 h-12 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-700"
                aria-label="Close AI Portal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Minimal header purely pairing light silver and dark graphite tones */}
              <div className="mb-5 sm:mb-6 pr-6 mt-1 sm:mt-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] tracking-[0.25em] font-mono text-zinc-500 uppercase font-medium">LLM INTEGRATION LAYER</span>
                </div>
                <h3 className="text-base sm:text-lg font-normal tracking-wide text-white">
                  Ask AI About Miftahul Islam
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-2">
                  Choose a model below. We will copy a dynamic profile prompt to your clipboard and open their official panel. Just paste (<code className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded text-[10px]">Ctrl+V</code>) inside their feed to run!
                </p>
              </div>

              {/* Minimal Silver-Black Premium Provider Grid: Explicitly force 2-columns (grid-cols-2) with compact side-by-side inner layout */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
                {providers.map((p) => {
                  const isActiveCopied = copiedProvider === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleCopyAndNavigate(p.name, p.url)}
                      className="flex items-center gap-2.5 p-2 sm:p-3 rounded-xl border border-zinc-800/60 bg-[#111111]/40 hover:bg-zinc-900/40 hover:border-zinc-400/40 transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-1 focus:ring-zinc-700 w-full text-left"
                    >
                      {/* Left align compact icon container */}
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-zinc-950 border border-zinc-850 transition-all group-hover:scale-105">
                        {p.icon}
                      </div>

                      {/* Right align structured metadata content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] sm:text-xs font-semibold text-stone-200 group-hover:text-white transition-colors truncate">
                            {p.name}
                          </span>
                          <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
                            {isActiveCopied ? (
                              <Check className="w-3.5 h-3.5 text-white animate-pulse" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-all" />
                            )}
                          </div>
                        </div>
                        <span className="block text-[9px] sm:text-[10px] text-zinc-500 font-light truncate mt-0.5">
                          {isActiveCopied ? 'Prompt copied!' : p.tagline}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clean Minimal Footer */}
              <div className="text-[10px] text-zinc-500 text-center leading-normal border-t border-zinc-900 pt-4 mt-5">
                Utilizes the official dynamic index standard <span className="text-stone-300 font-mono font-medium">llms.txt</span>.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Retro-Sleek Trigger Bar in bottom-right margin (Active once closed inside Hero, 2nd section/skills, or Footer section) */}
      <AnimatePresence>
        {!isOpen && isInAllowedSection && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 font-mono"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2.5 px-4.5 py-3 rounded-full bg-black text-stone-300 border border-zinc-850 hover:border-zinc-400 hover:text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md cursor-pointer transition-all duration-300 group focus:outline-none focus:ring-1 focus:ring-zinc-600"
            >
              <div className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </div>
              <Cpu className="w-3.5 h-3.5 text-zinc-400 group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-[9px] uppercase tracking-widest font-semibold">ASK AI</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
