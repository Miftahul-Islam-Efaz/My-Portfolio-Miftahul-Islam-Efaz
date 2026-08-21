'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Drives a looping background <video> so it only ever decodes frames the
 * visitor can actually see.
 *
 * The hero video is a pre-rendered palindrome (forward leg + reversed leg
 * baked into one file by ffmpeg), so the "boomerang" effect costs nothing at
 * runtime: it is plain forward playback with `loop`. There is no seeking.
 *
 * This replaces the previous approach, which stepped `video.currentTime`
 * backwards on a rAF loop to fake the reverse leg. Every one of those writes
 * forced the decoder to jump to the preceding keyframe and re-decode forward
 * to the requested frame, which is why scrolling felt like it stuttered.
 *
 * Playback is gated on three independent conditions, all of which must hold:
 *   - `enabled`  - the caller is ready (e.g. the intro curtain has lifted)
 *   - in view    - tracked by IntersectionObserver, not by reading scrollY
 *   - tab active - tracked by visibilitychange
 */
export function useVideoPlayback({
  videoRef,
  sectionRef,
  enabled,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}) {
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video) return;

    let inView = true;

    const sync = () => {
      const shouldPlay =
        enabled && inView && document.visibilityState === 'visible';

      if (shouldPlay) {
        if (video.paused) {
          // Autoplay may be blocked until the visitor interacts with the page.
          // The one-shot listeners below retry after the first gesture.
          video.play().catch(() => {});
        }
      } else if (!video.paused) {
        video.pause();
      }
    };

    // A paused <video> still holds its decoded frame, so pausing off-screen is
    // enough - no need to unload the source.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
        }
        sync();
      },
      { threshold: 0.1 }
    );

    if (section) observer.observe(section);

    document.addEventListener('visibilitychange', sync);

    // Retried once per gesture type, then removed automatically.
    window.addEventListener('click', sync, { once: true });
    window.addEventListener('touchstart', sync, { once: true });

    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('click', sync);
      window.removeEventListener('touchstart', sync);
    };
  }, [videoRef, sectionRef, enabled]);
}

export default useVideoPlayback;
