"use client" 

import * as React from "react"
import { useRef } from "react";
import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
 
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
 
const cn = (...args: any[]) => twMerge(clsx(args));
 
export interface AnimatedDockProps {
  className?: string;
  items: DockItemData[];
}
 
export interface DockItemData {
  link: string;
  Icon: React.ReactNode;
  target?: string;
  label?: string;
}
 
export const AnimatedDock = ({ className, items }: AnimatedDockProps) => {
  const mouseX = useMotionValue(Infinity);
  const targetX = useRef<number>(Infinity);
  const isMoving = useRef(false);

  React.useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (isMoving.current) {
        const current = mouseX.get();
        if (current !== targetX.current) {
          mouseX.set(targetX.current);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mouseX]);
 
  return (
    <motion.div
      onMouseMove={(e) => {
        isMoving.current = true;
        targetX.current = e.pageX;
      }}
      onMouseLeave={() => {
        targetX.current = Infinity;
        mouseX.set(Infinity);
        isMoving.current = false;
      }}
      className={cn(
        "flex h-16 items-center gap-6",
        className,
      )}
    >
      {items.map((item, index) => (
        <DockItem key={index} mouseX={mouseX}>
          <a
            href={item.link}
            target={item.target}
            className="group relative grow flex items-center justify-center w-full h-full text-white hover:text-white/70 transition-colors"
          >
            {item.Icon}
            {item.label && (
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-[10px] text-white/90 font-mono tracking-wider px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform scale-90 group-hover:scale-100 whitespace-nowrap shadow-lg">
                {item.label}
              </span>
            )}
          </a>
        </DockItem>
      ))}
    </motion.div>
  );
};
 
interface DockItemProps {
  mouseX: MotionValue<number>;
  children: React.ReactNode;
}
 
export const DockItem = ({ mouseX, children }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<{ x: number; width: number } | null>(null);

  React.useEffect(() => {
    const updateBounds = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        boundsRef.current = { x: rect.x + window.scrollX, width: rect.width };
      }
    };
    
    // Defer a bit to let any page entry slide animations finish and stabilize layout positions
    updateBounds();
    const timer = setTimeout(updateBounds, 1000);
    const timer2 = setTimeout(updateBounds, 3000); // safety fallback

    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, { passive: true });
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds);
    };
  }, []);

  const distance = useTransform(mouseX, (val) => {
    if (val === Infinity) return Infinity;
    const bounds = boundsRef.current || (ref.current ? (() => {
      const rect = ref.current.getBoundingClientRect();
      const b = { x: rect.x + window.scrollX, width: rect.width };
      boundsRef.current = b;
      return b;
    })() : { x: 0, width: 0 });
    return val - bounds.x - bounds.width / 2;
  });

  // Only scale the icon, do not change the container width.
  // This prevents layout shifts that cause the "vibrating" feedback loop.
  const scaleSync = useTransform(distance, [-100, 0, 100], [1, 1.4, 1]);
  const scale = useSpring(scaleSync, {
    mass: 0.1,
    stiffness: 200,
    damping: 20,
  });

  return (
    <motion.div
      ref={ref}
      className="aspect-square w-10 rounded-full bg-transparent flex items-center justify-center"
    >
      <motion.div
        style={{ scale }}
        className="flex items-center justify-center w-full h-full grow"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
