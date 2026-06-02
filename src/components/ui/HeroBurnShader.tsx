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

  // --- ASHIMA 3D SIMPLEX NOISE ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; 
      vec3 x3 = x0 - D.yyy;      
      i = mod289(i);
      vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857; 
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

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

      vec2 screenUv = baseUv;
      screenUv.x *= uResolution.x / uResolution.y;

      float n1 = snoise(vec3(screenUv * 2.5, uTime * 0.1));
      float n2 = snoise(vec3(screenUv * 6.0, uTime * 0.15));
      float noise = (n1 * 0.7 + n2 * 0.3) * 0.5 + 0.5;

      // Adjust threshold so that it burns completely when uProgress reaches 1.0.
      float threshold = uProgress * 2.5 - 0.75; 
      float diff = noise - threshold;

      float edgeWidth = 0.25; 
      float edgeMask = 1.0 - smoothstep(0.0, edgeWidth, abs(diff));

      vec2 center = vec2(0.5);
      vec2 dirToCenter = normalize(vUv - center);
      
      float distortionStrength = 0.15;
      vec2 distortedUv = coverUv + dirToCenter * edgeMask * distortionStrength 
                       + vec2(n1, n2) * edgeMask * distortionStrength * 0.4;

      float ca = 0.02 * edgeMask;
      vec4 colorR = texture2D(uTexture, distortedUv + vec2(ca, -ca*0.5));
      vec4 colorG = texture2D(uTexture, distortedUv);
      vec4 colorB = texture2D(uTexture, distortedUv - vec2(ca, -ca*0.5));
      
      vec4 finalColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
      finalColor.rgb += vec3(0.15, 0.2, 0.25) * edgeMask * 0.6; // Glitch color injection

      // Subtly enhance color intensity / contrast as pixelation shrinks, matching video aesthetics
      if (uPixelation > 1.01) {
          float strengthFactor = clamp((uPixelation - 1.0) / 96.0, 0.0, 1.0);
          finalColor.rgb = mix(finalColor.rgb, finalColor.rgb * 1.15, strengthFactor);
      }

      float alpha = smoothstep(-0.02, 0.04, diff);

      gl_FragColor = finalColor * alpha;
  }
`;

export default function HeroBurnShader({ progress, isStarted = false, videoUrl }: HeroBurnShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const activeRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumeRenderRef = useRef<(() => void) | null>(null);

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
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (latest >= 1.0) {
      if (activeRef.current) {
        activeRef.current = false;
        if (canvas) canvas.style.display = 'none';
        if (video) {
          video.pause();
        }
      }
    } else {
      if (!activeRef.current) {
        activeRef.current = true;
        if (canvas) canvas.style.display = 'block';
        if (video) {
          video.play().catch(() => {});
        }
        if (resumeRenderRef.current) {
          resumeRenderRef.current();
        }
      }
    }
  });

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

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

    // Load Video
    const video = document.createElement('video');
    videoRef.current = video;
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    // Only play if active initially
    if (progress.get() < 1.0) {
      video.play().catch(()=>console.log('Video autoplay prevented'));
    } else {
      activeRef.current = false;
      canvas.style.display = 'none';
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
