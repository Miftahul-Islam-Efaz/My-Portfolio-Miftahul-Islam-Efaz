"use client";

import { useEffect, useState } from "react";

/** The original animation, isolated from the admin document. */
export default function LogoAnimationPreview() {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
      <iframe
        title="Original ASCII M animation — 4.5 second loop"
        src={playing ? "/logo-m-loop.html" : "/logo-m-loop.html?still"}
        sandbox="allow-scripts"
        style={{ display: "block", width: "100%", aspectRatio: "1", border: 0, borderRadius: 8, background: "#000" }}
      />
      <button type="button" className="adm-btn is-small" style={{ marginTop: 12 }} onClick={() => setPlaying(p => !p)}>
        {playing ? "Pause preview" : "Play preview"}
      </button>
    </div>
  );
}
