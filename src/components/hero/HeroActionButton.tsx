import React from 'react';

interface HeroActionButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  text?: string;
  className?: string;
}

export const HeroActionButton: React.FC<HeroActionButtonProps> = ({
  href = '#projects',
  onClick,
  text = 'View My Work',
  className = '',
}) => {
  // Convert text string into letters with staggered animation delays
  const chars = text.split('');
  let delayAcc = 0.1;

  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex overflow-hidden group text-sm font-medium text-white rounded-full px-7 relative gap-x-2 items-center justify-center cursor-pointer select-none h-[56px] ${className}`}
      style={{
        background: 'linear-gradient(135deg, #2a2c31 0%, #34373d 100%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow:
          'rgba(0, 0, 0, 0.4) 0px 8px 32px, rgba(255, 255, 255, 0.15) 0px 1px 0px inset, rgba(0, 0, 0, 0.4) 0px -1px 0px inset',
        transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0px)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow =
          '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 0 2px rgba(255,77,18,0.5)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.boxShadow =
          '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.4)';
      }}
    >
      <div
        className="loader pointer-events-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          zIndex: 1,
          backgroundColor: 'transparent',
          mask: 'repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px)',
          WebkitMask:
            'repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #ff4d12 0%, transparent 50%), radial-gradient(circle at 45% 45%, #ff6a38 0%, transparent 45%), radial-gradient(circle at 55% 55%, #ff3300 0%, transparent 45%), radial-gradient(circle at 45% 55%, #ff8052 0%, transparent 45%), radial-gradient(circle at 55% 45%, #e63900 0%, transparent 45%)',
            mask: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%)',
            WebkitMask:
              'radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%)',
            animation:
              'transform-animation 2s infinite alternate, opacity-animation 4s infinite',
            animationTimingFunction: 'cubic-bezier(0.6, 0.8, 0.5, 1)',
            filter: 'drop-shadow(0 0 8px rgba(255, 77, 18, 0.8))',
          }}
        />
      </div>

      <span
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.95rem',
          fontWeight: 600,
          userSelect: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {chars.map((char, index) => {
          if (char === ' ') {
            return (
              <span
                key={index}
                style={{ display: 'inline-block', width: '0.3rem' }}
              />
            );
          }
          const currentDelay = delayAcc;
          delayAcc += 0.105;

          return (
            <span
              key={index}
              className="loader-letter"
              style={{
                display: 'inline-block',
                opacity: 0,
                animation: 'loader-letter-anim 4s infinite linear',
                animationDelay: `${currentDelay.toFixed(3)}s`,
              }}
            >
              {char}
            </span>
          );
        })}
      </span>
    </a>
  );
};

export default HeroActionButton;
