import React, { useRef, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- 1. THE SHADER MATERIAL ---
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform float u_progress;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float f = 0.0; float amp = 0.5;
    for(int i = 0; i < 5; i++) { f += amp * noise(p); p *= 2.0; amp *= 0.5; }
    return f;
  }

  void main() {
    vec2 ratioUv = vUv;
    ratioUv.x *= u_resolution.x / u_resolution.y;

    // Foreground: Dark Contact BG
    vec3 fgColor = vec3(15.0/255.0, 11.0/255.0, 10.0/255.0);

    // Background: Light Footer BG with Parallax shift
    vec2 bgUv = ratioUv + vec2(0.0, u_progress * -0.3);
    vec3 bgColor = vec3(242.0/255.0, 240.0/255.0, 241.0/255.0) + fbm(bgUv * 10.0) * 0.04; 

    // The Mask: High frequency noise for torn paper edge, swept bottom to top
    float n = fbm(ratioUv * 12.0); 
    float mask = n * 0.45 + vUv.y * 0.55; 

    float mappedProgress = u_progress * 1.5 - 0.25;

    // Sharp threshold for the tear
    float dissolve = smoothstep(mappedProgress - 0.005, mappedProgress + 0.005, mask);
    
    // Dark charred/torn rim for 3D depth
    float rim = smoothstep(mappedProgress - 0.02, mappedProgress, mask) - 
                smoothstep(mappedProgress, mappedProgress + 0.005, mask);

    vec3 edgeColor = vec3(0.1, 0.1, 0.1); 
    
    vec3 finalColor = mix(bgColor, fgColor, dissolve);
    finalColor = mix(finalColor, edgeColor, rim * 0.85);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function TornTransition({ topContent, bottomContent }: { topContent?: React.ReactNode, bottomContent?: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const topLayerRef = useRef<HTMLDivElement>(null);
  const bottomLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const inViewRef = useRef(true);
  const renderFrameRef = useRef<(() => void) | null>(null);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useLayoutEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- 2. SCROLL SYNC LOGIC ---
  useLayoutEffect(() => {
    if (isMobile) return;
    let inView = true;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        inViewRef.current = entry.isIntersecting;
      });
    }, { rootMargin: "200px 0px" });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    let cachedContainerTop = 0;
    let cachedHeight = 0;
    let cachedTopScrollable = 0;
    let cachedBottomScrollable = 0;

    const updateCache = () => {
      if (!containerRef.current || !topLayerRef.current || !bottomLayerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      cachedContainerTop = window.scrollY + rect.top;
      cachedHeight = rect.height;
      cachedTopScrollable = topLayerRef.current.scrollHeight - window.innerHeight;
      cachedBottomScrollable = bottomLayerRef.current.scrollHeight - window.innerHeight;
    };

    updateCache();
    const timeoutId = setTimeout(updateCache, 200);
    window.addEventListener('resize', updateCache);
    ScrollTrigger.addEventListener('refresh', updateCache);

    const resizeObserver = new ResizeObserver(() => {
      updateCache();
    });
    if (topLayerRef.current) resizeObserver.observe(topLayerRef.current);
    if (bottomLayerRef.current) resizeObserver.observe(bottomLayerRef.current);

    let rafId: number | null = null;

    const handleScroll = () => {
      if (!inView) return;
      
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current || !topLayerRef.current || !bottomLayerRef.current) return;
        
        const scrollY = window.scrollY;
        const rectTop = cachedContainerTop - scrollY;
        const scrollHeight = cachedHeight - window.innerHeight;
        
        if (scrollHeight <= 0) return;
        
        // Calculate normalized overall progress (0.0 to 1.0)
        let p = -rectTop / scrollHeight;
        p = Math.max(0, Math.min(1, p));

        // Phase boundaries: 
        // 0.0 -> 0.4: Scroll through Contact
        // 0.3 -> 0.7: The Transition (Tear/Burn)
        // 0.6 -> 1.0: Scroll through Footer
        const contactEnd = 0.4;
        const transitionStart = 0.3;
        const transitionEnd = 0.7;
        const footerStart = 0.6;

        // 1. SCROLL CONTACT
        if (p <= contactEnd) {
          if (cachedTopScrollable > 0) {
            topLayerRef.current.scrollTop = (p / contactEnd) * cachedTopScrollable;
          }
        } else {
          if (cachedTopScrollable > 0) topLayerRef.current.scrollTop = cachedTopScrollable;
        }

        // 2. TRANSITION (The Burn)
        let transitionP = 0;
        if (p >= transitionStart && p <= transitionEnd) {
          transitionP = (p - transitionStart) / (transitionEnd - transitionStart);
        } else if (p > transitionEnd) {
          transitionP = 1;
        }
        progressRef.current = transitionP;
        if (renderFrameRef.current) {
          renderFrameRef.current();
        }

        // 3. SCROLL FOOTER
        if (p >= footerStart) {
          if (cachedBottomScrollable > 0) {
            bottomLayerRef.current.scrollTop = ((p - footerStart) / (1.0 - footerStart)) * cachedBottomScrollable;
          }
        } else {
          bottomLayerRef.current.scrollTop = 0;
        }

        // Parallax and Fade for Top Section (moves up and fades out FASTER)
        if (topLayerRef.current) {
          // Fades out completely by ~33% progress
          topLayerRef.current.style.opacity = Math.max(1.0 - (transitionP * 3.0), 0).toString();
          topLayerRef.current.style.transform = `translateY(${transitionP * -100}px)`;
        }

        // Parallax and Fade for Bottom Section (moves into place and fades in LATER)
        if (bottomLayerRef.current) {
          // DELAYED: Starts fading in only after 60% scroll progress, fully visible near 100%
          bottomLayerRef.current.style.opacity = Math.max((transitionP - 0.6) * 2.5, 0).toString();
          // Shorter travel distance so it doesn't float up from deep inside the black area
          bottomLayerRef.current.style.transform = `translateY(${(1.0 - transitionP) * 60}px)`;
          
          // Prevent interaction during transition
          bottomLayerRef.current.style.pointerEvents = transitionP > 0.8 ? 'auto' : 'none';
          
          // NO CLIPPING ON DOM
          bottomLayerRef.current.style.clipPath = 'none';
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateCache);
      ScrollTrigger.removeEventListener('refresh', updateCache);
      clearTimeout(timeoutId);
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  // --- 3. PURE THREE.JS INITIALIZATION (ON-DEMAND RENDERING) ---
  useEffect(() => {
    if (isMobile) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_progress: { value: 0 },
        u_resolution: { value: new THREE.Vector2() }
      },
      depthWrite: false,
      depthTest: false
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    let width = innerWidth;
    let height = innerHeight;

    const renderFrame = () => {
      material.uniforms.u_progress.value = progressRef.current;
      renderer.render(scene, camera);
    };
    renderFrameRef.current = renderFrame;

    const resize = () => {
      width = innerWidth;
      height = innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0)); // Cap at 1.0 for performance
      material.uniforms.u_resolution.value.set(width, height);
      renderFrame();
    };
    
    window.addEventListener('resize', resize);
    resize();
    renderFrame();

    // Cleanup WebGL context on unmount
    return () => {
      window.removeEventListener('resize', resize);
      renderFrameRef.current = null;
      renderer.dispose();
      material.dispose();
      plane.geometry.dispose();
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="relative w-full bg-[#0F0B0A]" id="torn-transition-wrapper">
        {/* TOP LAYER (Dark Contact Section) */}
        <div className="relative w-full text-white bg-[#0F0B0A]">
          {topContent}
        </div>

        {/* BOTTOM LAYER (Light About/Portrait Section) */}
        <div className="relative w-full text-black bg-[#F2F0F1]">
          {bottomContent}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full z-30" style={{ height: '500vh' }}>
      <div className="sticky top-0 left-0 w-full h-[100dvh] md:h-screen overflow-hidden z-30">
        
        {/* FIXED BACKGROUND LAYER (Raw Three.js Canvas) */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full z-0 pointer-events-none" 
        />

        {/* TOP LAYER (Dark Contact Section) */}
        <div 
          ref={topLayerRef} 
          className="absolute inset-0 z-20 w-full h-full text-white overflow-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {topContent}
        </div>

        {/* BOTTOM LAYER (Light About/Portrait Section) */}
        <div 
          ref={bottomLayerRef} 
          className="absolute inset-0 z-20 w-full h-full opacity-0 text-black overflow-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {bottomContent}
        </div>

      </div>
    </div>
  );
}
