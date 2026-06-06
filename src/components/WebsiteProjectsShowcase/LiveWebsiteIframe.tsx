import React, { useRef, useState, useEffect } from 'react';

interface LiveWebsiteIframeProps {
  url: string;
  index: number;
  activeIndex: number;
}

export default function LiveWebsiteIframe({ url, index, activeIndex }: LiveWebsiteIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 344, height: 196 });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Lazy loading: on mobile, only load the active item to prevent memory and network saturation. On desktop, load adjacent slides for instant loading feel.
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const shouldLoad = isMobile ? activeIndex === index : Math.abs(activeIndex - index) <= 1;

  useEffect(() => {
    setIsIframeLoaded(false);
  }, [url]);

  useEffect(() => {
    if (shouldLoad && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [shouldLoad, hasLoadedOnce]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const virtualWidth = 1280;
  const scale = dimensions.width / virtualWidth;
  // Compute virtual height dynamically so that when scaled, it matches the physical height exactly
  const virtualHeight = scale > 0 ? dimensions.height / scale : 720;

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#0a0a0a] rounded-[1px] md:rounded-[3px] select-none"
    >
      {hasLoadedOnce && (
        <div 
          style={{
            width: `${virtualWidth}px`,
            height: `${virtualHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            visibility: shouldLoad ? 'visible' : 'hidden',
            opacity: shouldLoad ? 1 : 0.01, // Keep slightly loaded but visually invisible & non-blocking
            pointerEvents: shouldLoad ? 'auto' : 'none',
          }}
          className="relative overflow-hidden transition-opacity duration-200"
        >
          <iframe
            src={url}
            title={`Live Showcase - ${url}`}
            className="w-full h-full border-0 select-none bg-[#030202]"
            onLoad={() => setIsIframeLoaded(true)}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
      
      {/* Loading state visual backdrop block */}
      {!isIframeLoaded && shouldLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 pointer-events-none">
          <div className="relative flex items-center justify-center mb-3">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-neutral-700 animate-spin" />
            <div className="absolute w-3 h-3 rounded-full bg-red-500/20 animate-ping" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#8e8e8e] animate-pulse">
            Establishing Link...
          </span>
        </div>
      )}
    </div>
  );
}
