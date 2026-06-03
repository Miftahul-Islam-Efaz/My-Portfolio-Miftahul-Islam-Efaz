import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useMotionValueEvent, MotionValue } from 'motion/react';
import gsap from 'gsap';

interface HeroBurnShaderProps {
  progress: MotionValue<number>;
  isStarted?: boolean;
  videoUrl: string;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uImageRes;
  uniform float uPixelation;

  varying vec2 vUv;

  void main() {
      vec2 s = uResolution;
      vec2 i = uImageRes;
      float rs = s.x / s.y;
      float ri = i.x / i.y;
      vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
      vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
      
      // Calculate screen pixelation grid
      vec2 baseUv = vUv;
      if (uPixelation > 1.01) {
          vec2 tiles = uResolution / uPixelation;
          baseUv = (floor(vUv * tiles) + 0.5) / tiles;
      }

      vec2 coverUv = baseUv * s / new + offset;

      vec4 finalColor = texture2D(uTexture, coverUv);

      // Subtly enhance color intensity / contrast as pixelation shrinks, matching video aesthetics
      if (uPixelation > 1.01) {
          float strengthFactor = clamp((uPixelation - 1.0) / 96.0, 0.0, 1.0);
          finalColor.rgb = mix(finalColor.rgb, finalColor.rgb * 1.15, strengthFactor);
      }

      // Smooth curtain wipe from bottom to top as scroll progress increases
      float feather = 0.15;
      float t = -feather + uProgress * (1.0 + feather);
      float alpha = smoothstep(t, t + feather, vUv.y);

      gl_FragColor = finalColor * alpha;
  }
`;

export default function HeroBurnShader({ progress, isStarted = false, videoUrl }: HeroBurnShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const activeRef = useRef(true);
  const isIntersectingRef = useRef(true);
  const isTabVisibleRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeRenderRef = useRef<(() => void) | null>(null);

  const updateActiveState = () => {
    const video = videoRef.current;
    const currentProgress = progress.get();

    const shouldBeActive = currentProgress < 1.0 && isIntersectingRef.current && isTabVisibleRef.current;

    if (shouldBeActive !== activeRef.current) {
      activeRef.current = shouldBeActive;
      if (shouldBeActive) {
        if (video && video.paused) {
          video.play().catch(() => {});
        }
        if (resumeRenderRef.current) {
          resumeRenderRef.current();
        }
      } else {
        if (video && !video.paused) {
          video.pause();
        }
      }
    }
  };

  // Trigger the premium pixel-dissolve/depixelation effect on start
  useEffect(() => {
    if (isStarted && materialRef.current) {
      gsap.fromTo(materialRef.current.uniforms.uPixelation,
        { value: 128.0 },
        {
          value: 1.0,
          duration: 2.2, // 2.2s buttery transition matching the target reference video kinetics
          ease: 'power3.out'
        }
      );
    }
  }, [isStarted]);

  // Sync the framer-motion progress to the shader
  useMotionValueEvent(progress, "change", (latest) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = latest;
    }
    updateActiveState();
  });

  // Unlock video autoplay once user clicks, touches, or triggers the sound selection.
  // This guarantees browser strict autoplay bypasses on production/hosted domains.
  useEffect(() => {
    const handleUnlock = () => {
      const video = videoRef.current;
      if (video && video.paused && activeRef.current) {
        video.play().catch((err) => console.log("Video play unlock failed:", err));
      }
    };
    window.addEventListener('click', handleUnlock, { once: true });
    window.addEventListener('touchstart', handleUnlock, { once: true });
    window.addEventListener('audio_preference_changed', handleUnlock);
    
    return () => {
      window.removeEventListener('click', handleUnlock);
      window.removeEventListener('touchstart', handleUnlock);
      window.removeEventListener('audio_preference_changed', handleUnlock);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
      depth: false,
      stencil: false
    });
    const isMobile = window.innerWidth <= 768;
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uProgress: { value: progress.get() },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageRes: { value: new THREE.Vector2(1920, 1080) }, // Default fallback
        uPixelation: { value: isStarted ? 1.0 : 128.0 }
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    // Load Video with highly-optimized hardware-acceleration parameters
    const video = document.createElement('video');
    videoRef.current = video;
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('disablepictureinpicture', 'true');
    video.setAttribute('disableremoteplayback', 'true');
    video.preload = "auto";
    
    // Only play if active initially
    if (progress.get() < 1.0) {
      video.play().catch(()=>console.log('Video autoplay prevented'));
    } else {
      activeRef.current = false;
    }

    video.addEventListener('loadedmetadata', () => {
      material.uniforms.uImageRes.value.set(video.videoWidth, video.videoHeight);
    });

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    
    material.uniforms.uTexture.value = videoTexture;

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', resize);
    resize();

    // IntersectionObserver to pause when the canvas leaves view
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]) {
        isIntersectingRef.current = entries[0].isIntersecting;
        updateActiveState();
      }
    }, { threshold: 0 });
    observer.observe(canvas);

    // Visibility Listener for tab switches
    const handleVisibility = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible';
      updateActiveState();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const clock = new THREE.Clock();
    let frameId: number;
    let isLooping = progress.get() < 1.0;

    const render = () => {
      if (!activeRef.current) {
        isLooping = false;
        return;
      }
      material.uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    resumeRenderRef.current = () => {
      if (!isLooping) {
        isLooping = true;
        clock.getDelta(); // Restart elapsed timers smoothly
        render();
      }
    };

    if (isLooping) {
      render();
    }

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      material.dispose();
      mesh.geometry.dispose();
      videoTexture.dispose();
      video.pause();
      video.src = "";
    };
  }, [videoUrl]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}
