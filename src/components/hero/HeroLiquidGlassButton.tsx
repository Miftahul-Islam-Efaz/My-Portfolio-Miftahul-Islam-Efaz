import React from 'react';

interface HeroLiquidGlassButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  text?: string;
  className?: string;
}

export const HeroLiquidGlassButton: React.FC<HeroLiquidGlassButtonProps> = ({
  href = '#contact',
  onClick,
  text = 'Get In Touch →',
  className = '',
}) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center h-[56px] px-8 text-center text-slate-900 font-body text-xs md:text-sm font-bold tracking-wider rounded-full transition-all duration-500 group select-none cursor-pointer flex-1 sm:flex-none whitespace-nowrap active:scale-[0.97] ${className}`}
      style={{
        // iOS Liquid Glass Frosted Material
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(240, 243, 248, 0.68) 50%, rgba(220, 226, 235, 0.75) 100%)',
        backdropFilter: 'blur(30px) saturate(220%)',
        WebkitBackdropFilter: 'blur(30px) saturate(220%)',
        // High-precision specular liquid edge ring
        boxShadow: `
          0 16px 36px -4px rgba(0, 0, 0, 0.5),
          0 6px 16px -2px rgba(0, 0, 0, 0.3),
          inset 0 2px 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -2px 4px 0 rgba(180, 190, 205, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.85)
        `,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
        e.currentTarget.style.background =
          'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 248, 252, 0.85) 50%, rgba(230, 236, 245, 0.88) 100%)';
        e.currentTarget.style.boxShadow = `
          0 20px 48px -4px rgba(0, 0, 0, 0.6),
          0 8px 20px -2px rgba(0, 0, 0, 0.35),
          inset 0 2px 3px 0 rgba(255, 255, 255, 1),
          inset 0 -2px 5px 0 rgba(160, 175, 195, 0.6),
          0 0 0 1.5px rgba(255, 255, 255, 0.95),
          0 0 24px rgba(255, 255, 255, 0.4)
        `;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0px) scale(1)';
        e.currentTarget.style.background =
          'linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(240, 243, 248, 0.68) 50%, rgba(220, 226, 235, 0.75) 100%)';
        e.currentTarget.style.boxShadow = `
          0 16px 36px -4px rgba(0, 0, 0, 0.5),
          0 6px 16px -2px rgba(0, 0, 0, 0.3),
          inset 0 2px 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -2px 4px 0 rgba(180, 190, 205, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.85)
        `;
      }}
    >
      {/* 1. Volumetric Glass Curvature Highlight (Top Specular Reflection) */}
      <span
        className="absolute top-0 left-2 right-2 h-[45%] rounded-t-full pointer-events-none opacity-90 transition-opacity duration-300"
        style={{
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.4) 60%, rgba(255, 255, 255, 0) 100%)',
        }}
      />

      {/* 2. Glass Lens Refraction Edge Ring (Inner Edge Glow) */}
      <span
        className="absolute inset-[1px] rounded-full pointer-events-none"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.6)',
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />

      {/* 3. Dynamic Liquid Light Sheen on Hover */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
        style={{
          background:
            'radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%)',
        }}
      />

      {/* 4. Sharp High-Contrast Black Glass Text */}
      <span className="relative z-10 text-slate-900 font-extrabold tracking-wide text-xs md:text-sm drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-1.5 group-hover:text-black transition-colors duration-300">
        {text}
      </span>
    </a>
  );
};

export default HeroLiquidGlassButton;

