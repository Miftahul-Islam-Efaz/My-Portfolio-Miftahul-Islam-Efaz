import React from 'react';

/**
 * Hero scroll cue.
 *
 * Two nodes on purpose. The wrapper carries `hero-element`, so GSAP owns its
 * transform during the intro tween, and the button underneath is never
 * transformed. The previous version put `hero-element` and `-translate-x-1/2`
 * on the same node: GSAP's `y` tween writes its own transform, wiping the
 * centring translate and leaving the cue parked half its own width right of
 * centre for the rest of the session. Centring is flex now, not transform.
 *
 * All motion lives in src/styles/hero-theme.css as CSS animations. No rAF, no
 * GSAP ticker, no scroll listener: the hero is exactly where frame budget is
 * scarcest.
 */
export const HeroScrollIndicator: React.FC = () => {
  const handleClick = () => {
    const target = document.querySelector('#projects');
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY;
    const lenis = (window as any).lenis;

    if (lenis) {
      lenis.scrollTo(top, { duration: 1.2 });
    } else {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="hero-element hero-scroll-cue-wrap">
      <button
        type="button"
        onClick={handleClick}
        className="hero-scroll-cue"
        aria-label="Scroll to work"
      >
        <span className="hero-scroll-cue__label">Scroll</span>

        <span className="hero-scroll-cue__rail" aria-hidden="true">
          <span className="hero-scroll-cue__beam" />
        </span>

        <span className="hero-scroll-cue__dot" aria-hidden="true" />
      </button>
    </div>
  );
};

export default HeroScrollIndicator;
