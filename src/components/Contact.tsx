import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Github, Linkedin, Briefcase, Mail } from 'lucide-react';
import { supabase, DatabaseVideoSettings } from '../lib/supabase';

export default function Contact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([{ name, email, message }]);

      if (error) throw error;

      setSubmitStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setSubmitStatus('error');
      setErrorMessage(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize contact section video settings with elegant fallback defaults
  const [settings, setSettings] = useState<DatabaseVideoSettings>({
    id: 'contact_section',
    video_url: 'https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780301975/Animate_image_with_moving_grass_202606011415_slx0sb.mp4',
    video_opacity: 1.0,
    multiply_overlay_opacity: 0.35,
    gradient_overlay_opacity_from: 0.9,
    gradient_overlay_opacity_to: 0.3,
    muted: false,
    loop_video: true
  });

  // Fetch customizable settings from Supabase database schema
  useEffect(() => {
    async function loadVideoSettings() {
      try {
        const { data, error } = await supabase
          .from('video_settings')
          .select('*')
          .eq('id', 'contact_section')
          .single();
        if (data && !error) {
          setSettings(data as DatabaseVideoSettings);
        }
      } catch (err) {
        console.warn('Supabase video settings lookup bypassed or not yet configured. Applying robust layout fallbacks:', err);
      }
    }
    loadVideoSettings();
  }, []);

  // Set up view-activated video playback with precise audio-on state handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply muted state dynamically depending on server-side settings
    video.muted = settings.muted;

    let isPlaying = false;
    let isInViewport = false;
    let intervalId: any = null;

    const updatePlayback = () => {
      const section = sectionRef.current;
      if (!section) return;

      let opacity = 1;
      const parentElement = section.parentElement;
      if (parentElement) {
        const rawOpacity = parentElement.style.opacity;
        opacity = rawOpacity !== '' ? parseFloat(rawOpacity) : 1;
        if (isNaN(opacity)) opacity = 1;
      }

      const shouldPlay = isInViewport && opacity > 0.05;

      if (shouldPlay) {
        if (!isPlaying) {
          isPlaying = true;
          video.play().catch(err => {
            console.warn("Audio autoplay policy restriction: playback will resume upon user interaction", err);
            // Standby support for user gesture activation
            const resumeAudio = () => {
              if (isPlaying) {
                video.muted = settings.muted;
                video.play().catch(e => console.error("Connection play failed:", e));
              }
              window.removeEventListener('click', resumeAudio);
              window.removeEventListener('touchstart', resumeAudio);
            };
            window.addEventListener('click', resumeAudio);
            window.addEventListener('touchstart', resumeAudio);
          });
        }
      } else {
        if (isPlaying) {
          isPlaying = false;
          video.pause();
        }
      }
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isInViewport = entry.isIntersecting;
        
        // Trigger text animation only when at least 40% of the contact section is in view
        if (entry.intersectionRatio >= 0.40) {
          setIsVisible(true);
        } else if (!entry.isIntersecting) {
          setIsVisible(false);
        }
        
        updatePlayback();

        // If visible in viewport, periodically monitor opacity of parent container
        if (entry.isIntersecting) {
          if (!intervalId) {
            intervalId = setInterval(updatePlayback, 500);
          }
        } else {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    }, { threshold: [0.01, 0.40] });

    const section = sectionRef.current;
    if (section) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [settings]);

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      setHasAnimated(true);
      gsap.fromTo('.svg-letter', 
        {
          strokeDashoffset: 600,
          fillOpacity: 0
        },
        {
          strokeDashoffset: 0,
          fillOpacity: 1,
          duration: 1.5,
          stagger: 0.05,
          ease: 'power2.inOut'
        }
      );
    }
  }, [isVisible, hasAnimated]);

  return (
    <section id="contact" ref={sectionRef} className="relative w-full px-[clamp(1.5rem,5vw,4rem)] py-24 md:py-32 overflow-hidden flex flex-col justify-center bg-transparent">
      {/* Dynamic Background Video from Supabase - uses key to force reload index on video source updates */}
      <video
        key={settings.video_url}
        ref={videoRef}
        src={settings.video_url}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-700"
        style={{ opacity: settings.video_opacity }}
        loop={settings.loop_video}
        playsInline
      />
      {/* Cinematic dark overlays configured through dynamic Supabase database properties */}
      <div 
        className="absolute inset-0 bg-[#0F0B0A] z-0 pointer-events-none mix-blend-multiply transition-opacity duration-700" 
        style={{ opacity: settings.multiply_overlay_opacity }}
      />
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          background: `linear-gradient(to top, rgba(15, 11, 10, ${settings.gradient_overlay_opacity_from}) 0%, rgba(15, 11, 10, 0) 50%, rgba(15, 11, 10, ${settings.gradient_overlay_opacity_to}) 100%)`
        }}
      />
      
      <div className="relative z-10 w-full pb-24">
        {/* SVG Text Animation */}
        <div className="mb-16 w-full max-w-4xl">
          <svg viewBox="0 0 800 250" className="w-full h-auto overflow-visible" style={{ overflow: 'visible' }}>
            <text x="0" y="105" className="font-display font-black text-7xl md:text-[8rem]">
              {"Let's".split('').map((char, i) => (
                <tspan
                  key={`lets-${i}`}
                  className="svg-letter"
                  style={{
                    stroke: '#F2F0F1',
                    fill: '#F2F0F1',
                    fillOpacity: 0,
                    strokeWidth: 1.5,
                    strokeDasharray: 600,
                    strokeDashoffset: 600
                  }}
                >
                  {char}
                </tspan>
              ))}
            </text>
            <text x="0" y="215" className="font-display font-black text-7xl md:text-[8rem]">
              {"Connect.".split('').map((char, i) => (
                <tspan
                  key={`connect-${i}`}
                  className="svg-letter"
                  style={{
                    stroke: '#F2F0F1',
                    fill: '#F2F0F1',
                    fillOpacity: 0,
                    strokeWidth: 1.5,
                    strokeDasharray: 600,
                    strokeDashoffset: 600
                  }}
                >
                  {char}
                </tspan>
              ))}
            </text>
          </svg>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-12 justify-between">
          {/* Form */}
          <div className="w-full lg:w-[48%] max-w-xl">
            <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
              <div className="relative group">
                <input 
                  type="text" 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-white/20 py-3 text-[var(--color-pearl)] font-body focus:outline-none focus:border-[var(--color-pearl)] transition-colors peer"
                  placeholder=" "
                />
                <label htmlFor="name" className="absolute left-0 top-3 text-[var(--color-taupe)] font-body transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-[var(--color-pearl)] peer-valid:-top-4 peer-valid:text-xs">
                  Name
                </label>
              </div>
              
              <div className="relative group">
                <input 
                  type="email" 
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-white/20 py-3 text-[var(--color-pearl)] font-body focus:outline-none focus:border-[var(--color-pearl)] transition-colors peer"
                  placeholder=" "
                />
                <label htmlFor="email" className="absolute left-0 top-3 text-[var(--color-taupe)] font-body transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-[var(--color-pearl)] peer-valid:-top-4 peer-valid:text-xs">
                  Email
                </label>
              </div>

              <div className="relative group">
                <textarea 
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-transparent border-b border-white/20 py-3 text-[var(--color-pearl)] font-body focus:outline-none focus:border-[var(--color-pearl)] transition-colors peer resize-none"
                  placeholder=" "
                />
                <label htmlFor="message" className="absolute left-0 top-3 text-[var(--color-taupe)] font-body transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-[var(--color-pearl)] peer-valid:-top-4 peer-valid:text-xs">
                  Message
                </label>
              </div>

              {submitStatus === 'success' && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs rounded font-body leading-relaxed">
                  Message sent successfully! I will get back to you soon.
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="p-4 bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs rounded font-body leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-[var(--color-pearl)] text-[var(--color-eerie)] font-body font-semibold rounded hover:bg-[var(--color-taupe)] transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4.5 h-4.5 border-2 border-[var(--color-eerie)] border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message →'
                )}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="w-full lg:w-[48%] flex flex-col justify-center lg:pl-12">
            <h3 className="font-display text-3xl md:text-4xl text-[var(--color-pearl)] mb-8 leading-tight">
              Currently Open <br/>for Projects.
            </h3>
            
            <div className="flex flex-col gap-4 font-mono text-sm text-[var(--color-pearl)]/80 mb-12">
              <a href="mailto:webigns@gmail.com" className="hover:text-[var(--color-pearl)] transition-colors w-fit">webigns@gmail.com</a>
              <a href="#" className="hover:text-[var(--color-pearl)] transition-colors w-fit">+880 1234 567890</a>
              <p>Dhaka, Bangladesh</p>
            </div>

            <div className="flex gap-6 mb-12">
              <a href="#" className="text-[var(--color-pearl)]/70 hover:text-[var(--color-pearl)] transition-colors hover:scale-110 transform"><Github size={24} /></a>
              <a href="#" className="text-[var(--color-pearl)]/70 hover:text-[var(--color-pearl)] transition-colors hover:scale-110 transform"><Linkedin size={24} /></a>
              <a href="#" className="text-[var(--color-pearl)]/70 hover:text-[var(--color-pearl)] transition-colors hover:scale-110 transform"><Briefcase size={24} /></a>
            </div>


          </div>
        </div>
      </div>
    </section>
  );
}
