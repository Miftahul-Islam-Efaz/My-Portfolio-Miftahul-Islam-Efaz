import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export default function LiquidTransition() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Premium optical zoom and dissolve mask
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0, 1, 1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.5, 1], ["blur(20px)", "blur(0px)", "blur(20px)"]);
  const clipPath = useTransform(
    scrollYProgress, 
    [0.2, 0.8], 
    ["circle(0% at 50% 50%)", "circle(150% at 50% 50%)"]
  );

  return (
    <div ref={containerRef} className="relative w-full h-[150vh] bg-[#030202] -z-10 -my-[50vh]">
      <motion.div 
        style={{ 
          scale, 
          opacity, 
          filter: blur,
          willChange: "transform, opacity, filter"
        }}
        className="sticky top-0 w-full h-[100vh] flex items-center justify-center overflow-hidden pointer-events-none"
      >
        {/* High-end Flare / Glare effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[150vw] h-[20vh] bg-red-900/20 rotate-45 blur-[80px]" />
          <div className="w-[50vw] h-[10vh] bg-neutral-100/10 -rotate-45 blur-[60px]" />
        </div>
      </motion.div>
    </div>
  );
}
