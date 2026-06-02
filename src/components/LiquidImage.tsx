import React, { useRef, useId, useEffect } from 'react';
import gsap from 'gsap';
import { cn } from '../lib/utils';

interface LiquidImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LiquidImage({ src, alt, className }: LiquidImageProps) {
  const id = useId();
  const filterId = `liquid-${id.replace(/:/g, '')}`;
  const maskId = `brush-mask-${id.replace(/:/g, '')}`;
  const edgeFilterId = `brush-edge-${id.replace(/:/g, '')}`;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const maskCircleRef = useRef<SVGCircleElement>(null);
  
  const primitiveValues = useRef({ scale: 0, radius: 0, x: 50, y: 50 });
  const targetCoords = useRef({ x: 50, y: 50 });
  const mouseMovesRafId = useRef<number | null>(null);

  const updateMask = () => {
    if (maskCircleRef.current) {
      const { x, y, radius } = primitiveValues.current;
      maskCircleRef.current.setAttribute('cx', `${x}%`);
      maskCircleRef.current.setAttribute('cy', `${y}%`);
      maskCircleRef.current.setAttribute('r', `${radius}`);
    }
  };

  const updateMaskCoordsLoop = () => {
    primitiveValues.current.x += (targetCoords.current.x - primitiveValues.current.x) * 0.15;
    primitiveValues.current.y += (targetCoords.current.y - primitiveValues.current.y) * 0.15;
    updateMask();

    const diff = Math.abs(targetCoords.current.x - primitiveValues.current.x) + Math.abs(targetCoords.current.y - primitiveValues.current.y);
    if (diff > 0.05) {
      mouseMovesRafId.current = requestAnimationFrame(updateMaskCoordsLoop);
    } else {
      mouseMovesRafId.current = null;
    }
  };

  const hoverRectRef = useRef<DOMRect | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    let rect = hoverRectRef.current;
    if (!rect && containerRef.current) {
      rect = containerRef.current.getBoundingClientRect();
      hoverRectRef.current = rect;
    }
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    targetCoords.current = { x, y };
    if (mouseMovesRafId.current === null) {
      mouseMovesRafId.current = requestAnimationFrame(updateMaskCoordsLoop);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    hoverRectRef.current = rect;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    primitiveValues.current.x = x;
    primitiveValues.current.y = y;
    targetCoords.current = { x, y };
    updateMask();

    gsap.killTweensOf(primitiveValues.current);
    gsap.killTweensOf(containerRef.current);

    gsap.to(primitiveValues.current, {
      scale: 40, // Paint distortion amount
      radius: 120, // Size of the brush dab
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (displacementRef.current) {
          displacementRef.current.setAttribute('scale', primitiveValues.current.scale.toString());
        }
        updateMask();
      }
    });

    gsap.to(containerRef.current, {
      scale: 1.02,
      duration: 1.2,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    hoverRectRef.current = null;
    if (mouseMovesRafId.current !== null) {
      cancelAnimationFrame(mouseMovesRafId.current);
      mouseMovesRafId.current = null;
    }

    gsap.killTweensOf(primitiveValues.current);
    gsap.killTweensOf(containerRef.current);

    gsap.to(primitiveValues.current, {
      scale: 0,
      radius: 0,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (displacementRef.current) {
          displacementRef.current.setAttribute('scale', primitiveValues.current.scale.toString());
        }
        updateMask();
      }
    });

    gsap.to(containerRef.current, {
      scale: 1,
      duration: 1.2,
      ease: "power2.out"
    });
  };

  // Continuous turbulence animation for a "flowing paint" feel
  useEffect(() => {
    const turbulenceObj = { baseFreq: 0.02 };
    const tween = gsap.to(turbulenceObj, {
      baseFreq: 0.03,
      duration: 8,
      repeat: -1,
      yoyo: true,
      paused: true,
      ease: "sine.inOut",
      onUpdate: () => {
        if (turbulenceRef.current) {
          // Asymmetric frequency for brush stroke look
          turbulenceRef.current.setAttribute('baseFrequency', `${turbulenceObj.baseFreq} ${turbulenceObj.baseFreq + 0.04}`);
        }
      }
    });

    const container = containerRef.current;
    if (!container) return;

    const onEnter = () => tween.play();
    const onLeave = () => tween.pause();

    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      tween.kill();
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      if (mouseMovesRafId.current !== null) {
        cancelAnimationFrame(mouseMovesRafId.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          {/* Filter for the wet paint distortion on the image */}
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feTurbulence 
              ref={turbulenceRef}
              type="fractalNoise" 
              baseFrequency="0.02 0.06" 
              numOctaves="3" 
              result="noise" 
            />
            <feDisplacementMap 
              ref={displacementRef}
              in="SourceGraphic" 
              in2="noise" 
              scale="0" 
              xChannelSelector="R" 
              yChannelSelector="G" 
            />
          </filter>

          {/* Filter for the jagged brush edge on the mask */}
          <filter id={edgeFilterId} colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="60" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
          </filter>

          <mask id={maskId}>
            <rect width="100%" height="100%" fill="black" />
            <circle 
              ref={maskCircleRef}
              cx="50%" 
              cy="50%" 
              r="0" 
              fill="white" 
              filter={`url(#${edgeFilterId})`}
            />
          </mask>
        </defs>
      </svg>
      
      {/* Base Image (Undistorted) */}
      <img 
        src={src} 
        alt={alt} 
        className={cn("absolute inset-0 w-full h-full will-change-transform", className)}
        referrerPolicy="no-referrer"
      />

      {/* Distorted Overlay Image (Water Paint Reveal) */}
      <img 
        src={src} 
        alt={alt} 
        className={cn("absolute inset-0 w-full h-full will-change-transform scale-105", className)}
        style={{ 
          filter: `url(#${filterId})`,
          WebkitMask: `url(#${maskId})`,
          mask: `url(#${maskId})`
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
