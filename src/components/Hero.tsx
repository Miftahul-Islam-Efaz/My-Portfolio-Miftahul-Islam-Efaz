'use client';

import React, { useRef } from 'react';

import { HERO_CONFIG } from './hero/heroData';
import HeroBackgroundVideo from './hero/HeroBackgroundVideo';
import useVideoPlayback from '../hooks/useVideoPlayback';
import useHeroIntroAnimation from '../hooks/useHeroIntroAnimation';
import useHeroInk from '../hooks/useHeroInk';
import useHeroPointerParallax from '../hooks/useHeroPointerParallax';
import '../styles/hero-parallax.css';

type HeroProps = {
  /** Set once the intro curtain starts lifting - drives the entry timeline. */
  isStarted?: boolean;
  /** Set once the intro is fully gone - gates video playback. */
  isComplete?: boolean;
};

/**
 * The blend mode is driven by `useHeroInk` through a custom property rather
 * than a static class, because it changes partway through the video loop. The
 * `normal` fallback matters: it is what server-rendered HTML and the pre-hook
 * first paint use, and it is the correct default since the clip opens dark.
 *
 * The double cast is required, and is not papering over a bug. csstype types
 * `mixBlendMode` as a closed union of the CSS keywords - unlike most
 * properties it has no `(string & {})` member - so a `var()` reference is not
 * assignable OR castable to it, even though `var()` is legal wherever a
 * property value is expected. Going through `unknown` is TypeScript's own
 * prescribed escape hatch for exactly this case. Declared once here so this
 * stays out of the markup below.
 */
const BLEND_STYLE = {
  mixBlendMode: 'var(--hero-blend, normal)',
} as unknown as React.CSSProperties;

/**
 * Shared treatment for every mark in the stack: the timeline ink plus the
 * timeline blend mode. Applied to the eyebrow, the headline and the accent
 * mark so all three change together rather than drifting apart.
 */
const INK_STYLE: React.CSSProperties = {
  ...BLEND_STYLE,
  color: 'var(--hero-ink)',
};

/**
 * Headline style. Boreck is set inline because the `.hero-display` rule in
 * hero-theme.css hardcodes the serif stack, and inline styles are the one thing
 * that beats it without editing shared CSS that other sections rely on.
 */
const HEADLINE_STYLE: React.CSSProperties = {
  ...INK_STYLE,
  fontFamily: 'var(--font-hero-display)',
};

/**
 * Hero section.
 *
 * Responsibilities are split five ways so each concern can be fixed in
 * isolation:
 *   - this file              : markup and layout only
 *   - useHeroIntroAnimation  : the GSAP entry timeline and the scroll parallax
 *   - useVideoPlayback       : when the background video plays or pauses
 *   - useHeroInk             : the type's colour and blend mode over time
 *   - useHeroPointerParallax : the cursor-driven parallax on the type
 *
 * ---------------------------------------------------------------------------
 * Composition
 * ---------------------------------------------------------------------------
 * The type stack sits in the BOTTOM-LEFT corner, matching the reference frame:
 *
 *   M I F T A H U L   I S L A M   - tracked to just inside the headline width
 *   E F A Z                       - the display line, set in Boreck
 *   *                             - accent mark, centred under the headline
 *
 * Deliberately absent: the two CTA buttons, the rotating tagline and the
 * scroll cue. The only control on this screen is the menu button, which lives
 * in Navigation.
 *
 * ---------------------------------------------------------------------------
 * Readability
 * ---------------------------------------------------------------------------
 * The video is NOT darkened, ever - no scrim, no tint, no drop-shadow, and no
 * cursor-driven lighting either. There used to be three pointer-driven passes
 * over the frame (a left-side darkening wash, a diagonal beam and a warm pool
 * on the subject); they were removed on purpose. The frame as shot is the
 * frame that ships, and the cursor's only job here is the type parallax below.
 * Do not re-introduce a hover treatment on the background.
 *
 * All three marks share one ink and one blend mode: accent over the dark phase,
 * then cool grey with difference blending while a blown-out light ray crosses
 * the letters. The measurement behind the switch points, and why each state
 * fails where it does, are documented in `config/heroInk.ts`.
 */
const Hero = React.memo(function Hero({
  isStarted = true,
  isComplete = true,
}: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  // Retained so the intro hook keeps its contract. The rotating tagline is not
  // rendered in this composition, and every use of this ref is null-guarded.
  const taglineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useHeroIntroAnimation({ sectionRef, nameRef, taglineRef, isStarted });

  useVideoPlayback({ videoRef, sectionRef, enabled: isComplete });

  // Writes --hero-ink and --hero-blend on the section; the type inherits both.
  useHeroInk({ videoRef, targetRef: sectionRef });

  // Writes --hero-shift-x / --hero-shift-y on the section; the parallax wrapper
  // below inherits them. Zero displacement unless the cursor moves, and inert
  // on touch and for prefers-reduced-motion.
  useHeroPointerParallax({ targetRef: sectionRef });

  const eyebrowCharacters = Array.from(HERO_CONFIG.name.firstLine);

  return (
    <section
      id="hero-section"
      ref={sectionRef}
      // items-end anchors the stack to the bottom; the bottom padding keeps it
      // clear of the viewport edge and scales with viewport height.
      className="relative min-h-screen w-full flex items-end overflow-hidden px-[clamp(1.5rem,5vw,6rem)] pb-[clamp(2.5rem,9vh,7rem)]"
    >
      <HeroBackgroundVideo
        videoRef={videoRef}
        settings={HERO_CONFIG.defaultVideoSettings}
      />

      <div className="relative z-10 flex flex-col items-start w-full">
        {/* This wrapper hugs the headline (`w-fit`), which lets both the eyebrow
            and the accent mark align to the headline's exact width rather than
            to the section. `items-center` is what centres them within it.

            It also carries the pointer parallax, via the `translate` property
            rather than `transform` - GSAP owns `transform` on these layers, so
            sharing it would mean one silently wiping the other. Applying it
            here rather than on the h1 moves the eyebrow, headline and accent
            mark as one plane, which is what keeps them optically aligned.

            NOTE ON CENTRING: there is deliberately NO negative right margin on
            the headline any more. Letter-spacing does add a trailing space after
            the final Z, and cancelling it is the right move for a normal face -
            but Boreck's Z is a swash form whose ink overhangs its advance width
            and fills that trailing space. So the compensation double-counted:
            it shrank this wrapper by 0.3em while the visible glyphs still
            spanned the full box, pushing everything centred inside it left by
            half the tracking. That is exactly the offset that showed up on
            screen. Do not re-add it without checking the Z's overhang. */}
        <div className="hero-parallax-layer flex flex-col items-center w-fit">
          {/* Eyebrow, distributed across the headline width and held just
              inside it.

              Rendered as one span per character with `justify-between` rather
              than a tuned `letter-spacing`. Tracking could only ever be correct
              at one viewport width, because the eyebrow and headline scale on
              different clamp curves; distributing with flexbox stays exact at
              every width with no magic number to re-tune.

              The 92% width is the "stays inside EFAZ" constraint, and it is now
              measured against the headline's true box.

              The single space keeps a fixed width so the two words stay
              separate; even distribution would otherwise erase the word break. */}
          <span
            className="hero-element w-[92%] flex justify-between font-sans uppercase text-[clamp(0.58rem,0.95vw,0.8rem)] font-light transition-colors duration-500"
            style={INK_STYLE}
            aria-label={HERO_CONFIG.name.firstLine}
          >
            {eyebrowCharacters.map((character, index) => (
              <span
                key={`${character}-${index}`}
                aria-hidden="true"
                className={character === ' ' ? 'w-[0.45em]' : undefined}
              >
                {character === ' ' ? '\u00A0' : character}
              </span>
            ))}
          </span>

          {/* Split into characters by the intro hook.

              `font-bold` is not a style choice - Boreck ships a single 700
              file, so asking for anything lighter makes the browser synthesise
              a fake weight and smear the stroke contrast that makes this face
              worth using. */}
          <h1
            ref={nameRef}
            className="hero-display uppercase opacity-0 mt-[clamp(0.5rem,1.2vw,1rem)] text-[clamp(2.4rem,8.8vw,6.8rem)] font-bold leading-[1] tracking-[0.3em] cursor-default transition-colors duration-500"
            style={HEADLINE_STYLE}
          >
            {HERO_CONFIG.name.secondLine}
          </h1>

          {/* Accent mark. Follows --hero-ink like the type, so it switches to
              the cool grey with the rest of the stack under the ray. It reads
              as the warm ember for most of the loop simply because accent IS
              the ink during the dark phase. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="hero-element mt-[clamp(0.9rem,2.2vw,1.8rem)] w-[clamp(11px,1.2vw,16px)] h-[clamp(11px,1.2vw,16px)] transition-colors duration-500"
            style={INK_STYLE}
          >
            <path
              d="M12 0 L13.4 10.6 L24 12 L13.4 13.4 L12 24 L10.6 13.4 L0 12 L10.6 10.6 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </section>
  );
});

export default Hero;
