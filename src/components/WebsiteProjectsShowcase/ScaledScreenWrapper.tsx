import React, { useEffect, useState, useRef } from 'react';

export default function ScaledScreenWrapper({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Native design resolution is 1280px width (16:9 ratio)
        setScale(width / 1280);
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="absolute inset-0 w-full h-full overflow-hidden bg-[#050505] select-none rounded-[1px] md:rounded-[3px]">
      <div 
        style={{
          width: '1280px',
          height: '720px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="relative w-[1280px] h-[720px] overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
