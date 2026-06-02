import React, { useEffect, useRef } from 'react';

interface ScrambleTextProps {
  text: string;
  className?: string;
  animateOnLoad?: boolean;
}

const CHARS = '*|%#@!$^*()_+-=[]{}';

export default function ScrambleText({ text, className, animateOnLoad = true }: ScrambleTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const isAnimating = useRef(false);

  const scramble = () => {
    if (isAnimating.current || !textRef.current) return;
    isAnimating.current = true;

    let frame = 0;
    const totalFrames = text.length * 3 + 30; // Total duration based on text length
    
    const update = () => {
      if (!textRef.current) return;

      if (frame >= totalFrames) {
        textRef.current.innerText = text;
        isAnimating.current = false;
        return;
      }

      // Update text every 3 frames for a readable but fast scramble
      if (frame % 3 === 0) {
        const currentIteration = frame / 3;
        textRef.current.innerText = text
          .split('')
          .map((letter, index) => {
            if (letter === ' ' || letter === '\n') return letter;
            if (index < currentIteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('');
      }

      frame++;
      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  };

  useEffect(() => {
    if (animateOnLoad) {
      const timer = setTimeout(scramble, 500);
      return () => clearTimeout(timer);
    }
  }, [animateOnLoad]);

  return (
    <span 
      ref={textRef}
      className={className} 
      onMouseEnter={scramble}
    >
      {text}
    </span>
  );
}
