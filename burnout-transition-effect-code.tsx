/**
 * TORN PAPER SCROLL TRANSITION
 * * Instructions for AI/Developer:
 * 1. Install dependencies: `npm install three`

 */

import React, { useRef, useLayoutEffect, useEffect } from 'react';
import * as THREE from 'three';

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

    // Foreground: Pure Black
    vec3 fgColor = vec3(0.0);

    // Background: Off-white/Matte Gray with Parallax shift
    vec2 bgUv = ratioUv + vec2(0.0, u_progress * -0.3);
    vec3 bgColor = vec3(0.89, 0.89, 0.88) + fbm(bgUv * 10.0) * 0.03; 

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

export default function TornTransition({ topContent, bottomContent }) {
  const containerRef = useRef(null);
  const topLayerRef = useRef(null);
  const bottomLayerRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);

  // --- 2. SCROLL SYNC LOGIC ---
  useLayoutEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const maxScroll = rect.height - window.innerHeight;
      
      // Calculate normalized progress (0.0 to 1.0) based on sticky container position
      let p = -rect.top / maxScroll;
      p = Math.max(0, Math.min(1, p));
      
      // Update Shader Uniform ref directly for performance
      progressRef.current = p;

      // Parallax and Fade for Top Section (moves up and fades out)
      if (topLayerRef.current) {
        topLayerRef.current.style.opacity = Math.max(1.0 - (p * 2.5), 0);
        topLayerRef.current.style.transform = `translateY(${p * -100}px)`;
      }

      // Parallax and Fade for Bottom Section (moves into place and fades in)
      if (bottomLayerRef.current) {
        bottomLayerRef.current.style.opacity = Math.max((p - 0.3) * 2.0, 0);
        bottomLayerRef.current.style.transform = `translateY(${(1.0 - p) * 100}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger immediately on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- 3. PURE THREE.JS INITIALIZATION ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
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

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      material.uniforms.u_resolution.value.set(width, height);
    };
    
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId;
    let time = 0;

    const render = () => {
      time += 0.01;
      // Sync Three.js uniforms with our React Refs
      material.uniforms.u_time.value = time;
      material.uniforms.u_progress.value = progressRef.current;
      
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();

    // Cleanup WebGL context on unmount
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      material.dispose();
      plane.geometry.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-black" style={{ height: '350vh' }}>
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        
        {/* FIXED BACKGROUND LAYER (Raw Three.js Canvas) */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full z-0 pointer-events-none" 
        />

        {/* TOP LAYER (Dark Contact Section) */}
        <div 
          ref={topLayerRef} 
          className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full text-white"
        >
          {topContent || (
            <div className="text-center">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase mb-4">Contact</h1>
              <p className="text-xl opacity-70 tracking-widest uppercase">Start Scrolling</p>
            </div>
          )}
        </div>

        {/* BOTTOM LAYER (Light About/Portrait Section) */}
        <div 
          ref={bottomLayerRef} 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center w-full h-full opacity-0 text-black"
          style={{ transform: 'translateY(100px)' }}
        >
          {bottomContent || (
             <div className="text-center">
             <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase mb-4">Miftahul</h1>
             <p className="text-xl opacity-70 tracking-widest uppercase">About Section</p>
           </div>
          )}
        </div>

      </div>
    </div>
  );
}