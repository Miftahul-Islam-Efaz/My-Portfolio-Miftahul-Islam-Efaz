import React from 'react';
import { LinkPreview } from './ui/link-preview';

export default function Inspirations() {
  const linkClass = "font-black text-black dark:text-black";

  return (
    <section className="relative w-full bg-[var(--color-pearl)] px-[clamp(1.5rem,5vw,4rem)] py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="font-mono text-xs md:text-sm text-[var(--color-taupe)] uppercase tracking-[0.2em] mb-4">
            [ 04.5 - The Mindset ]
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl text-[var(--color-eerie)] font-black leading-[1.1]">
            The Architecture of Logic.
          </h2>
        </div>

        <div className="flex justify-center items-start flex-col gap-12">
          <div className="text-[var(--color-eerie)]/90 text-2xl md:text-4xl max-w-5xl text-left font-body leading-relaxed md:leading-normal">
            I orchestrate{" "}
            <LinkPreview
              url="https://n8n.io"
              imageSrc="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=640&auto=format&fit=crop"
              isStatic
              className={linkClass}
            >
              autonomous digital ecosystems
            </LinkPreview>{" "}
            that transform operational chaos into flawless execution. I map out{" "}
            <LinkPreview
              url="https://miro.com"
              imageSrc="https://images.unsplash.com/photo-1503437313881-503a91226402?q=80&w=640&auto=format&fit=crop"
              isStatic
              className={linkClass}
            >
              intricate automation wireframes
            </LinkPreview>{" "}
            to visualize complex data streams as living entities.
          </div>

          <div className="text-[var(--color-eerie)]/90 text-2xl md:text-4xl max-w-5xl text-left font-body leading-relaxed md:leading-normal">
            Beyond the logic, I collaborate with visionary teammates to forge{" "}
            <LinkPreview
              url="https://awwwards.com"
              imageSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop"
              isStatic
              className={linkClass}
            >
              immersive digital realities
            </LinkPreview>. 
            We reverse-engineer human psychology to craft interfaces that command attention and refuse to be ignored.
          </div>
        </div>
      </div>
    </section>
  );
}
