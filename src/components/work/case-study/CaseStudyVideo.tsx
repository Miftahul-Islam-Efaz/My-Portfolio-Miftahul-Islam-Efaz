"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A YOUTUBE PLAYER THAT DOES NOT LOOK LIKE A YOUTUBE PLAYER.
 *
 * Section 5 is a document, and a stock embed reads as an advertisement pasted
 * into one: red chrome, a channel avatar, "watch later", and a grid of
 * unrelated videos the moment it ends. So the iframe is driven headlessly -
 * `controls=0`, `modestbranding=1`, `rel=0` - and every control on screen is
 * ours, styled from the same `--cs-*` tokens as the surrounding prose.
 *
 * TWO THINGS WORTH KNOWING BEFORE CHANGING THIS FILE:
 *
 * 1. THE IFRAME IS NOT MOUNTED UNTIL PLAY IS PRESSED. Until then this is a
 *    poster image and a button - a facade. A case study can carry five of
 *    these, and five YouTube iframes on first paint is roughly a megabyte of
 *    third-party script plus five sets of cookies for a page that may never
 *    play any of them. The facade is the difference between this section
 *    loading and this section being a performance problem.
 *
 * 2. PROGRESS IS POLLED, NOT PUSHED. The IFrame API has no timeupdate event,
 *    so a rAF loop reads getCurrentTime() while playing and stops when
 *    paused. Reduced-motion users get a 4Hz interval instead, because a
 *    60Hz loop to move a progress bar is exactly the kind of thing that
 *    setting is asking us not to do.
 */

/* ---------------------------------------------------------------------------
   Minimal typings for the bits of the IFrame API this file actually touches.
   The full @types/youtube package is a large dependency for six methods.
   --------------------------------------------------------------------------- */
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* Player states we care about. The API exposes these as YT.PlayerState, but
   that object does not exist until the script has loaded, and we need to
   compare against them inside the callback that tells us it has. */
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;

/**
 * Loads the IFrame API exactly once per page, no matter how many players are
 * on it. Every caller awaits the same promise.
 *
 * `onYouTubeIframeAPIReady` is a single global callback - the API offers no
 * per-instance ready hook - so if two players both defined it, the second
 * would overwrite the first and the first would hang forever.
 */
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube API loaded without YT namespace."));
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the YouTube API."));
    document.head.appendChild(script);
  });

  return apiPromise;
}

/** 0 -> "0:00", 3725 -> "1:02:05". */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? hours + ":" + pad(minutes) + ":" + pad(secs)
    : minutes + ":" + pad(secs);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** How long the controls stay up after the last pointer movement. */
const IDLE_MS = 2600;

export default function CaseStudyVideo({
  youtubeId,
  label,
  posterUrl,
}: {
  youtubeId: string;
  /** Used for the accessible name, so the button is not just "Play". */
  label: string;
  /** Falls back to YouTube's own thumbnail when the CMS has no poster. */
  posterUrl?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleRef = useRef<number | null>(null);

  /* `activated` is the facade latch: false means no iframe exists yet. */
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);

  const poster =
    posterUrl || "https://i.ytimg.com/vi/" + youtubeId + "/maxresdefault.jpg";

  /* ---------------------------------------------------------------------
     Progress polling. Runs only while playing, and is torn down on pause
     so a paused video off-screen costs nothing.
     --------------------------------------------------------------------- */
  useEffect(() => {
    if (!playing || !ready) return;

    const read = () => {
      const player = playerRef.current;
      if (!player) return;
      /* While the user drags, the bar follows the pointer rather than the
         player, or it would fight them for control of its own position. */
      if (!scrubbing) setCurrent(player.getCurrentTime());
      setLoaded(player.getVideoLoadedFraction());
    };

    if (prefersReducedMotion()) {
      const id = window.setInterval(read, 250);
      return () => window.clearInterval(id);
    }

    const tick = () => {
      read();
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, ready, scrubbing]);

  /* Auto-hide the controls while playing. Any pointer movement brings them
     back; pausing pins them up, because a paused player with hidden controls
     looks broken. */
  const wakeChrome = useCallback(() => {
    setChrome(true);
    if (idleRef.current !== null) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      /* Read the live refs, not the closed-over state. */
      if (playerRef.current && !scrubbing) setChrome(false);
    }, IDLE_MS);
  }, [scrubbing]);

  useEffect(() => {
    if (!playing) {
      if (idleRef.current !== null) window.clearTimeout(idleRef.current);
      setChrome(true);
      return;
    }
    wakeChrome();
  }, [playing, wakeChrome]);

  /* Track real fullscreen state rather than assuming our button won: the user
     can also leave with Escape, which fires no click. */
  useEffect(() => {
    const sync = () =>
      setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      if (idleRef.current !== null) window.clearTimeout(idleRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    []
  );

  /**
   * First press: load the API, build the player, and start. Every press after
   * that is a plain toggle.
   */
  const activate = useCallback(async () => {
    if (playerRef.current) {
      if (playing) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
      return;
    }

    setActivated(true);

    try {
      const YT = await loadYouTubeApi();
      if (!mountRef.current) return;

      playerRef.current = new YT.Player(mountRef.current, {
        videoId: youtubeId,
        playerVars: {
          /* The whole point: no YouTube chrome, no related grid, no keyboard
             handling of its own (we do our own, on the wrapper). */
          controls: 0,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          autoplay: 1,
        },
        events: {
          onReady: (event) => {
            setReady(true);
            setDuration(event.target.getDuration());
            setMuted(event.target.isMuted());
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === PLAYING) {
              setPlaying(true);
              /* Duration is 0 until metadata arrives, which can be after
                 onReady. Re-reading here is what fills the total time. */
              const player = playerRef.current;
              if (player) setDuration(player.getDuration());
            } else if (event.data === PAUSED) {
              setPlaying(false);
            } else if (event.data === ENDED) {
              setPlaying(false);
              setCurrent(0);
            }
          },
        },
      });
    } catch {
      /* Offer the canonical link rather than a dead rectangle. */
      setFailed(true);
      setActivated(false);
    }
  }, [playing, youtubeId]);

  const seekToFraction = useCallback(
    (fraction: number, commit: boolean) => {
      const player = playerRef.current;
      const total = duration || player?.getDuration() || 0;
      if (!player || !total) return;
      const clamped = Math.min(1, Math.max(0, fraction));
      const seconds = clamped * total;
      setCurrent(seconds);
      /* allowSeekAhead false while dragging: it stops the player firing a
         network request for every intermediate pointer position. */
      player.seekTo(seconds, commit);
    },
    [duration]
  );

  const fractionFromEvent = (event: { clientX: number }, bar: HTMLElement) => {
    const rect = bar.getBoundingClientRect();
    return rect.width ? (event.clientX - rect.left) / rect.width : 0;
  };

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === rootRef.current) {
      void document.exitFullscreen();
    } else {
      void rootRef.current?.requestFullscreen?.();
    }
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    /* Never swallow Tab: this element is in a document people read through. */
    if (event.key === "Tab") return;

    const player = playerRef.current;
    const nudge = (delta: number) => {
      if (!player) return;
      const total = duration || player.getDuration() || 0;
      if (!total) return;
      seekToFraction((player.getCurrentTime() + delta) / total, true);
    };

    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        void activate();
        break;
      case "ArrowRight":
        event.preventDefault();
        nudge(5);
        break;
      case "ArrowLeft":
        event.preventDefault();
        nudge(-5);
        break;
      case "m":
        event.preventDefault();
        toggleMute();
        break;
      case "f":
        event.preventDefault();
        toggleFullscreen();
        break;
      default:
        return;
    }
    wakeChrome();
  };

  const total = duration || 0;
  const progress = total ? Math.min(1, current / total) : 0;

  if (failed) {
    return (
      <div className="cs-video is-failed">
        <p className="cs-video__fallback">
          This video could not be loaded.{" "}
          <a
            href={"https://www.youtube.com/watch?v=" + youtubeId}
            target="_blank"
            rel="noreferrer"
          >
            Watch it on YouTube
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="cs-video"
      data-playing={playing}
      data-chrome={chrome}
      data-active={activated}
      tabIndex={0}
      role="group"
      aria-label={label + " - video"}
      onKeyDown={onKeyDown}
      onPointerMove={wakeChrome}
      onPointerLeave={() => {
        if (playing && !scrubbing) setChrome(false);
      }}
      onDoubleClick={toggleFullscreen}
    >
      {/* The iframe lands here. YT.Player REPLACES this node, which is why it
          is a bare div with nothing inside it worth keeping. */}
      <div className="cs-video__stage">
        {activated ? <div ref={mountRef} /> : null}
      </div>

      {/* The facade. Removed from the tree once the real player exists. */}
      {!activated ? (
        <button
          type="button"
          className="cs-video__facade"
          onClick={() => void activate()}
          aria-label={"Play video: " + label}
        >
          {/* Plain img, not next/image: YouTube thumbnail hosts would each
             need a remotePatterns entry, and this URL is data-driven. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cs-video__poster"
            src={poster}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <span className="cs-video__scrim" />
          <span className="cs-video__play">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        </button>
      ) : null}

      {/* Controls exist only once there is something to control. */}
      {activated ? (
        <div className="cs-video__chrome">
          <div
            className="cs-video__bar"
            role="slider"
            tabIndex={-1}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(current)}
            aria-valuetext={formatTime(current) + " of " + formatTime(total)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setScrubbing(true);
              seekToFraction(
                fractionFromEvent(event, event.currentTarget),
                false
              );
            }}
            onPointerMove={(event) => {
              if (!scrubbing) return;
              seekToFraction(
                fractionFromEvent(event, event.currentTarget),
                false
              );
            }}
            onPointerUp={(event) => {
              if (!scrubbing) return;
              setScrubbing(false);
              /* Commit with allowSeekAhead so the player actually fetches
                 the frame the user chose. */
              seekToFraction(
                fractionFromEvent(event, event.currentTarget),
                true
              );
            }}
          >
            <span
              className="cs-video__buffered"
              style={{ transform: "scaleX(" + loaded + ")" }}
            />
            <span
              className="cs-video__played"
              style={{ transform: "scaleX(" + progress + ")" }}
            />
            <span
              className="cs-video__knob"
              style={{ left: progress * 100 + "%" }}
            />
          </div>

          <div className="cs-video__row">
            <button
              type="button"
              className="cs-video__btn"
              onClick={() => void activate()}
              aria-label={playing ? "Pause" : "Play"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {playing ? (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                ) : (
                  <path d="M8 5.5v13l11-6.5z" />
                )}
              </svg>
            </button>

            <button
              type="button"
              className="cs-video__btn"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {muted ? (
                  <path d="M4 9h3l4-3.5v13L7 15H4zM15.5 9.5l4 4m0-4l-4 4" />
                ) : (
                  <path d="M4 9h3l4-3.5v13L7 15H4zM15 8.5a4.5 4.5 0 010 7" />
                )}
              </svg>
            </button>

            <span className="cs-video__time">
              {formatTime(current)}
              <span className="cs-video__time-sep">/</span>
              {formatTime(total)}
            </span>

            <span className="cs-video__spacer" />

            <button
              type="button"
              className="cs-video__btn"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {fullscreen ? (
                  <path d="M10 4H6v4M14 4h4v4M10 20H6v-4M14 20h4v-4" />
                ) : (
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
