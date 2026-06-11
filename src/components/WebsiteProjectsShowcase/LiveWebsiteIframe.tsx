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

  // Load ONLY the active iframe to prevent concurrent network requests and layout paint lag on all devices
  const shouldLoad = activeIndex === index;

  useEffect(() => {
    setIsIframeLoaded(false);
  }, [url]);

  useEffect(() => {
    if (shouldLoad && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [shouldLoad, hasLoadedOnce]);

  // High performance dimensions tracking using layout offset dimensions to render scale-independent iframe portlet views
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };
    
    updateDimensions();
    const t = setTimeout(updateDimensions, 200);

    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useEffect(() => {
    if (shouldLoad) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          const height = containerRef.current.offsetHeight;
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          }
        }
      };
      updateDimensions();
      const t = setTimeout(updateDimensions, 100);
      return () => clearTimeout(t);
    }
  }, [shouldLoad]);

  const virtualWidth = 1280;
  // Because offsetWidth represents the layout size before any CSS transforms/scales are applied,
  // we do not need to account for parent scale factors here. It will scale uniformly across all mobile viewports!
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
            scrolling="no"
            style={{ overflow: 'hidden' }}
            className="w-full h-full border-0 select-none bg-[#030202]"
            onLoad={() => setIsIframeLoaded(true)}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />
        </div>
      )}
      
      {/* Loading state visual backdrop block */}
      {!isIframeLoaded && shouldLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 pointer-events-none p-2 text-center">
          <div className="relative flex items-center justify-center mb-1 sm:mb-3">
            <div className="w-3.5 h-3.5 sm:w-8 sm:h-8 rounded-full border border-dashed border-neutral-700 animate-spin" />
            <div className="absolute w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-full bg-red-500/20 animate-ping" />
          </div>
          <span className="font-mono text-[6px] sm:text-[9px] uppercase tracking-[0.05em] sm:tracking-[0.25em] text-[#8e8e8e] animate-pulse block truncate max-w-full">
            Establishing Link...
          </span>
        </div>
      )}
    </div>
  );
}
