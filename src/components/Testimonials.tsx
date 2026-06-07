import React from 'react';
import TestimonialCards from './ui/testimonial';

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative w-full bg-[var(--color-eerie)] border-t border-[rgba(255,255,255,0.05)] py-32 overflow-hidden">
      {/* Background Image */}
      <img 
        src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780328872/testimonials_bg_an2upi.png"
        alt="Testimonials Background"
        className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
        referrerPolicy="no-referrer"
      />

      <div className="relative z-10 px-[clamp(1.5rem,5vw,4rem)] mb-16 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="font-mono text-[0.75rem] text-[var(--color-taupe)] mb-6 tracking-widest uppercase">
          [ 05 — Testimonials ]
        </div>
        <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] text-[var(--color-pearl)] font-medium leading-[1.1] tracking-tight">
          Words From Clients.
        </h2>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6">
        <TestimonialCards />
      </div>
    </section>
  );
}
