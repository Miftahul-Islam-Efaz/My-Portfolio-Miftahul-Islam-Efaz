'use client';

import React from 'react';
import { HERO_VIDEO } from '../../config/media';
import type { DatabaseVideoSettings } from '../../lib/videoSettings';

type HeroBackgroundVideoProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  settings: DatabaseVideoSettings;
};

/**
 * Full-bleed background video for the hero, plus its two tint overlays.
 *
 * Playback is deliberately NOT handled here - this component only renders the
 * element and its overlays. Play/pause policy lives in `useVideoPlayback`, so
 * there is exactly one place to look when the video misbehaves.
 *
 * `loop` restarts the clip seamlessly. The current hero clip is a short slow
 * light drift, so it reads as continuous; see `config/media.ts` for how the
 * file is produced and why it ships as H.264 rather than the HEVC master.
 */
function HeroBackgroundVideo({ videoRef, settings }: HeroBackgroundVideoProps) {
  return (
    <>
      <video
        ref={videoRef}
        poster={HERO_VIDEO.poster}
        loop
        muted={settings.muted}
        playsInline
        preload="auto"
        // Hints the compositor to keep the video on its own layer instead of
        // repainting it against the hero content on every scroll frame.
        style={{ opacity: settings.video_opacity, willChange: 'transform' }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 transition-opacity duration-700"
      >
        {HERO_VIDEO.sources.map((source) => {
          // `media` is optional and only present when more than one cut is
          // offered. Reading it through an optional-property cast keeps this
          // working whether the registry lists one source or several - an
          // `'media' in source` check narrows to `unknown` when no member of
          // the union declares the key.
          const media = (source as { media?: string }).media;

          return (
            <source
              key={source.src}
              src={source.src}
              type={source.type}
              {...(media ? { media } : {})}
            />
          );
        })}
      </video>

      {/* Multiply pass: deepens the video without crushing the headline. */}
      <div
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none z-[1] bg-[#0F0B0A] mix-blend-multiply"
        style={{ opacity: settings.multiply_overlay_opacity }}
      />

      {/* Vertical gradient: anchors the top nav and the bottom scroll cue. */}
      <div
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
        style={{
          background: `linear-gradient(to top, rgba(15,11,10,${settings.gradient_overlay_opacity_from}) 0%, rgba(15,11,10,0) 50%, rgba(15,11,10,${settings.gradient_overlay_opacity_to}) 100%)`,
        }}
      />
    </>
  );
}

export default React.memo(HeroBackgroundVideo);
