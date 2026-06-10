import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, invalidate } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';

interface Skill {
  name: string;
  x: number; // glTF X coordinate
  z: number; // glTF Z coordinate (corresponds to Blender negative Y)
  placeholderName: string;
  glowMaterialNames: string[];
  fadeMaterialNames: string[];
  lightColor: string;
  maxLightIntensity: number;
}

const SKILL_DATA: Skill[] = [
  { 
    name: 'WebDev', 
    x: -3.0,
    z: 5.0, 
    placeholderName: 'Placeholder_WebDev', 
    glowMaterialNames: ['WebDev_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#50A0FF', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'UIUX', 
    x: 2.4,
    z: -3.0, 
    placeholderName: 'Placeholder_UIUX', 
    glowMaterialNames: ['UIUX_GlowBlue_Material', 'UIUX_GlowWhite_Material'], 
    fadeMaterialNames: ['UIUX_PhoneBody_Material', 'UIUX_PhoneScreen_Material', 'UIUX_Material'], 
    lightColor: '#80C0FF', 
    maxLightIntensity: 25.0 
  },
  { 
    name: 'API', 
    x: -3.7,
    z: -11.0, 
    placeholderName: 'Placeholder_API', 
    glowMaterialNames: ['API_Material', 'API_GlowBlue_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#3090FF', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'Supabase', 
    x: 3.0,
    z: -19.0, 
    placeholderName: 'Placeholder_Supabase', 
    glowMaterialNames: ['Supabase_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#3ECF8E', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'n8n', 
    x: -3.0,
    z: -27.0, 
    placeholderName: 'Placeholder_n8n', 
    glowMaterialNames: ['n8n_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#FF6F61', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'MCP', 
    x: 3.0,
    z: -35.0, 
    placeholderName: 'Placeholder_MCP', 
    glowMaterialNames: ['MCP_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#A050FF', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'AIDev', 
    x: -3.0,
    z: -43.0, 
    placeholderName: 'Placeholder_AIDev', 
    glowMaterialNames: ['AIDev_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#E0A0FF', 
    maxLightIntensity: 15.0 
  },
  { 
    name: 'Android', 
    x: 3.0,
    z: -51.0, 
    placeholderName: 'Placeholder_Android', 
    glowMaterialNames: ['Android_Material'], 
    fadeMaterialNames: [], 
    lightColor: '#3DDC84', 
    maxLightIntensity: 15.0 
  }
];

// Custom Shader for the path. Maps glTF Z coordinate.
const PathGlowShader = {
  uniforms: {
    uCameraZ: { value: 18.0 },
    uGlowColor: { value: new THREE.Color(0.6, 0.8, 1.0) },
    uBaseColor: { value: new THREE.Color(0.01, 0.01, 0.02) }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uCameraZ;
    uniform vec3 uGlowColor;
    uniform vec3 uBaseColor;
    varying vec3 vWorldPosition;
    void main() {
      // Behind the camera: vWorldPosition.z > uCameraZ (larger Z).
      // In front of the camera: vWorldPosition.z < uCameraZ.
      // Light up the path behind the camera and fade out smoothly in front of the camera.
      float progressGlow = smoothstep(uCameraZ - 6.5, uCameraZ + 1.5, vWorldPosition.z);
      
      vec3 finalColor = mix(uBaseColor, uGlowColor * 3.5, progressGlow);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

function Scene({ 
  gltfPath, 
  containerRef,
  customContainerRef,
  waitFirstStage = false,
  isVisible = true,
  onLoad
}: { 
  gltfPath: string; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  customContainerRef?: React.RefObject<HTMLDivElement | null>;
  waitFirstStage?: boolean;
  isVisible?: boolean;
  onLoad?: () => void;
}) {
  const { scene, materials } = useGLTF(gltfPath) as any;

  useEffect(() => {
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);
  const pathMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const currentTRef = useRef(0);
  const lastFactorsRef = useRef<number[]>(new Array(SKILL_DATA.length).fill(-1));
  const layoutRef = useRef({
    top: 0,
    maxScroll: 1,
    initialized: false
  });

  const firstFrameSnapRef = useRef(true);
  const frameCountRef = useRef(0);

  // High-performance dynamic point light references
  const light1Ref = useRef<THREE.PointLight | null>(null);
  const light2Ref = useRef<THREE.PointLight | null>(null);

  // High-performance caching refs to avoid scene.getObjectByName and deep materials lookup during 60fps frame ticks
  const materialsCacheRef = useRef<Record<string, THREE.MeshStandardMaterial>>({});
  const textMatsCacheRef = useRef<Record<string, THREE.MeshStandardMaterial>>({});
  const sceneObjectsCacheRef = useRef<Record<string, THREE.Object3D>>({});

  useEffect(() => {
    const handleResize = () => {
      layoutRef.current.initialized = false;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // 1. Setup Custom Path Material
    const pathMesh = scene.getObjectByName('SkillPath') as THREE.Mesh;
    if (pathMesh) {
      let pathShaderMaterial = pathMesh.userData.shaderMaterial as THREE.ShaderMaterial;
      if (!pathShaderMaterial) {
        pathShaderMaterial = new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.clone(PathGlowShader.uniforms),
          vertexShader: PathGlowShader.vertexShader,
          fragmentShader: PathGlowShader.fragmentShader
        });
        pathMesh.material = pathShaderMaterial;
        pathMesh.userData.shaderMaterial = pathShaderMaterial;
      }
      pathMatRef.current = pathShaderMaterial;
      sceneObjectsCacheRef.current['SkillPath'] = pathMesh;
    }

    // Traversal to hide any point, spot, or directional lights exported from Blender to prevent redundant calculations
    scene.traverse((child: any) => {
      if (child.isLight && child.name !== 'ActivePointLight1' && child.name !== 'ActivePointLight2') {
        child.visible = false;
      }
    });

    // 2. Setup 2 global performance-optimized point lights
    let light1 = scene.getObjectByName('ActivePointLight1') as THREE.PointLight;
    if (!light1) {
      light1 = new THREE.PointLight('#ffffff', 0, 15, 1.5);
      light1.name = 'ActivePointLight1';
      scene.add(light1);
    }
    light1Ref.current = light1;

    let light2 = scene.getObjectByName('ActivePointLight2') as THREE.PointLight;
    if (!light2) {
      light2 = new THREE.PointLight('#ffffff', 0, 15, 1.5);
      light2.name = 'ActivePointLight2';
      scene.add(light2);
    }
    light2Ref.current = light2;

    // 3. Initialize and structure materials with permanent transparency
    SKILL_DATA.forEach((skill) => {
      const placeholder = scene.getObjectByName(skill.placeholderName);
      if (placeholder) {
        placeholder.visible = false; // Start hidden to prevent clumping on first render
        sceneObjectsCacheRef.current[skill.placeholderName] = placeholder;
        
        // Remove any existing point lights on the child hierarchy to enforce the 2-light limit
        placeholder.children = placeholder.children.filter(child => !(child instanceof THREE.PointLight));
      }

      // Initialize glow materials (WebDev, API, Supabase, n8n, MCP, AIDev, Android logos)
      skill.glowMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true; // Set permanently to true to prevent on-the-fly shader recompilation
          mat.opacity = 0.0;
          mat.roughness = 0.15;
          mat.metalness = 0.1;
          
          mat.color = new THREE.Color(skill.lightColor);
          mat.emissive = new THREE.Color(skill.lightColor);
          mat.emissiveIntensity = 0.0;

          materialsCacheRef.current[matName] = mat;
        }
      });

      // Initialize fade materials (like phone casing, screens) to be transparent
      skill.fadeMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true; // Set permanently to true to prevent on-the-fly shader recompilation
          mat.opacity = 0.0;
          
          if (matName === 'UIUX_PhoneBody_Material') {
            mat.color = new THREE.Color('#E8E8E8');
            mat.metalness = 0.95;
            mat.roughness = 0.12;
          } else if (matName === 'UIUX_Material') {
            mat.color = new THREE.Color('#F5F5F5');
            mat.metalness = 0.85;
            mat.roughness = 0.15;
          } else if (matName === 'UIUX_PhoneScreen_Material') {
            mat.metalness = 0.05;
            mat.roughness = 0.4;
          }

          if (matName !== 'UIUX_PhoneScreen_Material' && mat.color.r < 0.15 && mat.color.g < 0.15 && mat.color.b < 0.15) {
            mat.color = new THREE.Color('#E0E0E0');
            mat.metalness = 0.9;
            mat.roughness = 0.15;
          }

          if (mat.color && !mat.emissive) {
            if (matName === 'UIUX_PhoneScreen_Material') {
              mat.emissive = mat.color.clone();
            }
          }
          mat.emissiveIntensity = 0.0;

          materialsCacheRef.current[matName] = mat;
        }
      });

      // Setup cloned individual materials for text elements
      const textMeshName = `Text_${skill.name}`;
      const textMesh = scene.getObjectByName(textMeshName) as THREE.Mesh;
      if (textMesh) {
        textMesh.visible = false;
        sceneObjectsCacheRef.current[textMeshName] = textMesh;
        if (textMesh.material) {
          let clonedMat = textMesh.userData.clonedMaterial as THREE.MeshStandardMaterial;
          if (!clonedMat) {
            clonedMat = (textMesh.material as THREE.MeshStandardMaterial).clone();
            clonedMat.transparent = true; // Set permanently to true to prevent material recompilation
            clonedMat.opacity = 0.0;
            clonedMat.emissive = clonedMat.color.clone();
            clonedMat.emissiveIntensity = 0.0;
            textMesh.material = clonedMat;
            textMesh.userData.clonedMaterial = clonedMat;
          }
          textMatsCacheRef.current[skill.name] = clonedMat;
        }
      }
    });

    // 4. Optimize floor reflection
    const floor = scene.getObjectByName('Floor') as THREE.Mesh;
    if (floor && floor.material) {
      const floorMat = floor.material as THREE.MeshStandardMaterial;
      floorMat.roughness = 0.05;
      floorMat.metalness = 0.95;
      floorMat.color = new THREE.Color(0.005, 0.005, 0.008);
      sceneObjectsCacheRef.current['Floor'] = floor;
    }
  }, [scene, materials]);

  useFrame((state) => {
    if (!isVisible && frameCountRef.current > 5) {
      return;
    }
    frameCountRef.current++;

    const aspect = state.size.width / state.size.height;
    let targetFov = 45;
    if (aspect < 1.0) {
      targetFov = Math.min(80, 45 + (1.0 - aspect) * 55);
    }
    if ((state.camera as THREE.PerspectiveCamera).fov !== targetFov) {
      (state.camera as THREE.PerspectiveCamera).fov = targetFov;
      (state.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    if (!layoutRef.current.initialized) {
      const target = customContainerRef?.current || containerRef.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const offsetTop = rect.top + window.scrollY;
        const height = target.offsetHeight || (window.innerHeight * 8);
        const maxScroll = Math.max(1, height - window.innerHeight);
        
        layoutRef.current = {
          top: offsetTop,
          maxScroll,
          initialized: true
        };
      }
    }

    let targetT = 0;
    const { top: layoutTop, maxScroll, initialized } = layoutRef.current;
    
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    
    if (initialized && maxScroll > 0) {
      const scrolled = currentScrollY - layoutTop;
      const rawPercent = Math.max(0, Math.min(1, scrolled / maxScroll));
      
      if (customContainerRef || waitFirstStage) {
        if (rawPercent < 0.15) {
          targetT = 0;
        } else if (rawPercent > 0.95) {
          targetT = 1;
        } else {
          targetT = (rawPercent - 0.15) / 0.80;
        }
      } else {
        targetT = rawPercent;
      }
      
      if (firstFrameSnapRef.current) {
        currentTRef.current = targetT;
        firstFrameSnapRef.current = false;
      }
    }

    currentTRef.current = Math.min(1, Math.max(0, THREE.MathUtils.lerp(currentTRef.current, targetT, 0.20)));
    const t = currentTRef.current;

    // Invalidate to request next frame only if scroll is still changing (demand rendering)
    if (Math.abs(currentTRef.current - targetT) > 0.0005) {
      state.invalidate();
    }

    // --- STATION-TO-STATION CAMERA SYSTEM ---
    const stations = [
      { cam: [0.0, 2.4, 18.0], look: [0.0, 0.8, 12.0] },
      { cam: [-3.0, 1.8, 10.0], look: [-3.0, 0.8, 5.0] },
      { cam: [2.4, 1.8, 2.0], look: [2.4, 0.8, -3.0] },
      { cam: [-3.7, 1.8, -6.0], look: [-3.7, 0.8, -11.0] },
      { cam: [3.0, 1.8, -14.0], look: [3.0, 0.8, -19.0] },
      { cam: [-3.0, 1.8, -22.0], look: [-3.0, 0.8, -27.0] },
      { cam: [3.0, 1.8, -30.0], look: [3.0, 0.8, -35.0] },
      { cam: [-3.0, 1.8, -38.0], look: [-3.0, 0.8, -43.0] },
      { cam: [3.0, 1.8, -46.0], look: [3.0, 0.8, -51.0] }
    ];

    const numStations = stations.length;
    const scaledT = t * (numStations - 1);
    const index = Math.min(numStations - 2, Math.max(0, Math.floor(scaledT)));
    const fraction = scaledT - index;

    const smoothFraction = THREE.MathUtils.smoothstep(fraction, 0, 1);

    const stA = stations[index];
    const stB = stations[index + 1];

    const camX = THREE.MathUtils.lerp(stA.cam[0], stB.cam[0], smoothFraction);
    const camY = THREE.MathUtils.lerp(stA.cam[1], stB.cam[1], smoothFraction);
    const camZ = THREE.MathUtils.lerp(stA.cam[2], stB.cam[2], smoothFraction);

    const lookX = THREE.MathUtils.lerp(stA.look[0], stB.look[0], smoothFraction);
    const lookY = THREE.MathUtils.lerp(stA.look[1], stB.look[1], smoothFraction);
    const lookZ = THREE.MathUtils.lerp(stA.look[2], stB.look[2], smoothFraction);

    state.camera.position.set(camX, camY, camZ);
    state.camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

    // --- DECOUPLED PATH PROGRESSION FOR TRIGGER GLOWS ---
    const pathZ = THREE.MathUtils.lerp(18.0, -56.0, t);
    
    if (pathMatRef.current) {
      pathMatRef.current.uniforms.uCameraZ.value = pathZ;
    }

    // Reset our two high-performance dynamic point lights at the start of each frame tick
    if (light1Ref.current) {
      light1Ref.current.intensity = 0;
    }
    if (light2Ref.current) {
      light2Ref.current.intensity = 0;
    }

    let activeLightIndex = 0;

    // --- SKILL PROXIMITY GLOWS & SOLID TRANSITIONS ---
    SKILL_DATA.forEach((skill, idx) => {
      const relativeZ = pathZ - skill.z;

      // Calculate activation factor
      let factor = 0.0;
      if (relativeZ < 6.5) {
        factor = Math.min(1.0, (6.5 - relativeZ) / 7.5);
      }

      // Optimize: Only write to material properties and toggle visibility if the factor changed significantly
      const lastFactor = lastFactorsRef.current[idx];
      if (Math.abs(lastFactor - factor) > 0.001) {
        lastFactorsRef.current[idx] = factor;

        // Proactive Visibility Culling: Make meshes completely invisible if out of view
        const placeholder = sceneObjectsCacheRef.current[skill.placeholderName];
        if (placeholder) {
          placeholder.visible = factor > 0.005;
        }
        const textMesh = sceneObjectsCacheRef.current[`Text_${skill.name}`];
        if (textMesh) {
          textMesh.visible = factor > 0.005;
        }

        // Glow Material Transition (smooth opacity, no rebuild instructions)
        skill.glowMaterialNames.forEach((matName) => {
          const mat = materialsCacheRef.current[matName];
          if (mat) {
            mat.opacity = factor;
            mat.emissiveIntensity = factor * 2.0;
          }
        });

        // Fade Material Transition (solid phone casing, screen textures)
        skill.fadeMaterialNames.forEach((matName) => {
          const mat = materialsCacheRef.current[matName];
          if (mat) {
            mat.opacity = factor;
            if (matName === 'UIUX_PhoneScreen_Material') {
              mat.emissiveIntensity = factor * 0.45;
            }
          }
        });

        // Cloned Text Material Transition
        const clonedMat = textMatsCacheRef.current[skill.name];
        if (clonedMat) {
          clonedMat.opacity = factor;
          clonedMat.emissiveIntensity = factor * 1.5;
        }
      }

      // Dynamically hand-off one of the 2 dynamic point lights to this skill if it is active (needs to run every frame since lights are reset)
      if (factor > 0.01 && activeLightIndex < 2) {
        const targetLight = activeLightIndex === 0 ? light1Ref.current : light2Ref.current;
        if (targetLight) {
          targetLight.color.set(skill.lightColor);
          targetLight.position.set(skill.x, 0.8, skill.z);
          targetLight.intensity = factor * skill.maxLightIntensity;
        }
        activeLightIndex++;
      }
    });
  });

  return <primitive object={scene} />;
}

export default function SkillShowcase({ 
  gltfPath = '/portfolio_2nd_section_eiyd6w.glb', 
  height = '800vh',
  customContainerRef,
  isStarted = false
}: { 
  gltfPath?: string; 
  height?: string;
  customContainerRef?: React.RefObject<HTMLDivElement | null>;
  isStarted?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const target = customContainerRef?.current || containerRef.current;
    if (!target) return;

    const margin = isMobile ? '200px 0px' : '600px 0px';

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      rootMargin: margin,
      threshold: 0
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [customContainerRef, isMobile]);

  useEffect(() => {
    if (!isStarted || !isVisible) return;
    const handleScroll = () => {
      invalidate();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isStarted, isVisible]);
  
  const { progress } = useProgress();
  const [modelLoaded, setModelLoaded] = useState(false);
  const showLoader = isStarted && !modelLoaded;

  if (customContainerRef) {
    return (
      <div id="skills" style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }} ref={containerRef}>
        {showLoader && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 pointer-events-none transition-opacity duration-300">
            <div className="font-michroma text-[9px] text-neutral-400 tracking-[0.2em] uppercase mb-3 select-none">
              Loading Skills 3D Engine
            </div>
            <div className="w-48 h-[2px] bg-neutral-900 relative overflow-hidden rounded-full">
              <div 
                className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="font-mono text-[9px] text-neutral-500 mt-2 tracking-widest select-none">
              {Math.round(progress)}%
            </div>
          </div>
        )}
        {isStarted && (
          <Canvas
            camera={{ position: [0, 2.5, 18], fov: 45 }}
            frameloop="demand"
            gl={{ 
              antialias: false, 
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              alpha: true
            }}
            dpr={isMobile ? 0.75 : 1}
          >
            <ambientLight intensity={0.08} />
            {/* Studio three-point lighting for glossy highlights and well-lit silver models */}
            <directionalLight position={[0, 10, -5]} intensity={0.3} />
            <directionalLight position={[0, 5, 15]} intensity={0.7} color="#ffffff" />
            <Scene gltfPath={gltfPath} containerRef={containerRef} customContainerRef={customContainerRef} isVisible={isVisible} onLoad={() => setModelLoaded(true)} />
          </Canvas>
        )}
      </div>
    );
  }

  return (
    <div id="skills" ref={containerRef} style={{ position: 'relative', width: '100%', height: height, background: '#000' }}>
      <div style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
        
        {showLoader && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 pointer-events-none transition-opacity duration-300">
            <div className="font-michroma text-[9px] text-neutral-400 tracking-[0.2em] uppercase mb-3 select-none">
              Loading Skills 3D Engine
            </div>
            <div className="w-48 h-[2px] bg-neutral-900 relative overflow-hidden rounded-full">
              <div 
                className="absolute top-0 left-0 h-full bg-white transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="font-mono text-[9px] text-neutral-500 mt-2 tracking-widest select-none">
              {Math.round(progress)}%
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          {isStarted && (
            <Canvas
              camera={{ position: [0, 2.5, 18], fov: 45 }}
              frameloop="demand"
              gl={{ 
                antialias: false, 
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                alpha: true
              }}
              dpr={isMobile ? 0.75 : 1}
            >
              <ambientLight intensity={0.08} />
              <directionalLight position={[0, 10, -5]} intensity={0.3} />
              <directionalLight position={[0, 5, 15]} intensity={0.7} color="#ffffff" />
              <Scene gltfPath={gltfPath} containerRef={containerRef} waitFirstStage={false} isVisible={isVisible} onLoad={() => setModelLoaded(true)} />
            </Canvas>
          )}
        </div>
      </div>
    </div>
  );
}

// Defer preload to avoid competing with loader for bandwidth on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useGLTF.preload('/portfolio_2nd_section_eiyd6w.glb');
  }, window.innerWidth <= 768 ? 2500 : 1000); // 1s delay for desktop, 2.5s delay for mobile to run background load after paint settles
}
