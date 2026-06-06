import React, { useEffect, useRef, useState } from "react";

interface FaviconAnimatorProps {
  /**
   * Only triggers the initial animation once the loader has completed
   */
  loaderComplete: boolean;
}

const STATIC_FAVICON_URL = "https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780767327/favicon_image_2_yqd5w8.jpg";
const ANIMATION_VIDEO_URL = "https://res.cloudinary.com/dr2tc3dyk/video/upload/v1780767328/favicon_animation_video_oysgeo.mp4";

export default function FaviconAnimator({ loaderComplete }: FaviconAnimatorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Set up the static favicon immediately on load
  const setStaticFavicon = () => {
    const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    if (links.length > 0) {
      links.forEach((link) => {
        link.href = STATIC_FAVICON_URL;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "shortcut icon";
      link.href = STATIC_FAVICON_URL;
      document.head.appendChild(link);
    }
  };

  const updateFaviconFromCanvas = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    if (ctx && video) {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame to fill the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
        
        if (links.length > 0) {
          links.forEach((link) => {
            link.href = dataUrl;
          });
        } else {
          const link = document.createElement("link");
          link.rel = "shortcut icon";
          link.href = dataUrl;
          document.head.appendChild(link);
        }
      } catch (err) {
        console.warn("Could not draw video frame to favicon canvas: (usually cors source issue)", err);
      }
    }
  };

  // Start the frame capture loop
  const startLoop = () => {
    const loop = () => {
      updateFaviconFromCanvas();
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        animationFrameId.current = requestAnimationFrame(loop);
      } else {
        setIsPlaying(false);
        setStaticFavicon();
      }
    };
    animationFrameId.current = requestAnimationFrame(loop);
  };

  // Stop the frame capture loop
  const stopLoop = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setIsPlaying(false);
    setStaticFavicon();
  };

  // Triggers video playback safely
  const triggerFaviconAnimation = async () => {
    const video = videoRef.current;
    if (!video) return;

    // If already playing, reset the video to start
    if (isPlaying) {
      video.currentTime = 0;
      return;
    }

    try {
      video.currentTime = 0;
      setIsPlaying(true);
      await video.play();
      startLoop();
    } catch (err) {
      console.warn("Favicon video autoplay prevented or failed:", err);
      setIsPlaying(false);
      setStaticFavicon();
    }
  };

  // 1. Initial load effect
  useEffect(() => {
    setStaticFavicon();

    // Force strict override in index.html during runtime
    const removeHostFavicons = () => {
      const allIcons = document.querySelectorAll("link[rel*='icon']");
      allIcons.forEach(icon => {
        if (!icon.getAttribute("href")?.includes("dr2tc3dyk")) {
          icon.setAttribute("href", STATIC_FAVICON_URL);
        }
      });
    };
    removeHostFavicons();

    // Repeat occasionally just in case other scripts modify it
    const checkInterval = setInterval(removeHostFavicons, 5000);

    return () => {
      clearInterval(checkInterval);
      stopLoop();
    };
  }, []);

  // 2. Play on loader complete
  useEffect(() => {
    if (loaderComplete) {
      // Play after a slight delay for a highly satisfying entry feel
      const timeout = setTimeout(() => {
        triggerFaviconAnimation();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [loaderComplete]);

  // 3. Play on visibility changes (when user returns to the tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && loaderComplete) {
        // Play when user returns to focus the portfolio tab
        setTimeout(() => {
          triggerFaviconAnimation();
        }, 600);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loaderComplete, isPlaying]);

  // 4. Periodic animation play (every 25 seconds) to keep the tab alive and beautiful
  useEffect(() => {
    if (!loaderComplete) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerFaviconAnimation();
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [loaderComplete, isPlaying]);

  return (
    <>
      {/* Offscreen hidden video and canvas */}
      <div className="absolute w-0 h-0 overflow-hidden pointer-events-none select-none opacity-0" aria-hidden="true">
        <video
          ref={videoRef}
          src={ANIMATION_VIDEO_URL}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="auto"
          onEnded={stopLoop}
          className="w-8 h-8 opacity-0"
        />
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className="w-8 h-8 opacity-0"
        />
      </div>

      {/* Global Navbar listener helper to trigger on clicking the logo/home */}
      <span
        id="trigger-favicon-animator"
        style={{ display: "none" }}
        className="hidden"
        onClick={() => {
          triggerFaviconAnimation();
        }}
      />
    </>
  );
}
