import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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
  customContainerRef
}: { 
  gltfPath: string; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  customContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { scene, materials } = useGLTF(gltfPath) as any;
  const pathMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const currentTRef = useRef(0);
  const layoutRef = useRef({
    top: 0,
    maxScroll: 1
  });

  useEffect(() => {
    const handleLayout = () => {
      const target = customContainerRef?.current || containerRef.current;
      if (target) {
        let offsetTop = 0;
        let obj: HTMLElement | null = target;
        while (obj) {
          offsetTop += obj.offsetTop;
          obj = obj.offsetParent as HTMLElement | null;
        }
        const height = target.offsetHeight || (window.innerHeight * 8);
        const maxScroll = Math.max(1, height - window.innerHeight);
        layoutRef.current = {
          top: offsetTop,
          maxScroll
        };
      }
    };

    handleLayout();
    window.addEventListener('resize', handleLayout);
    // Double-checks to handle delayed layout offsets
    const t1 = setTimeout(handleLayout, 500);
    const t2 = setTimeout(handleLayout, 2500);

    return () => {
      window.removeEventListener('resize', handleLayout);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [customContainerRef, containerRef]);

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
    }

    // 2. Initialize and structure dynamic lights and materials
    SKILL_DATA.forEach((skill) => {
      // Setup dynamic point lights in Three.js attached to the placeholders
      const placeholder = scene.getObjectByName(skill.placeholderName);
      if (placeholder) {
        let light = placeholder.userData.pointLight as THREE.PointLight;
        if (!light) {
          // Remove any existing point lights to avoid double-allocation on hot reload
          placeholder.children = placeholder.children.filter(child => !(child instanceof THREE.PointLight));
          
          // Create new physical point light
          light = new THREE.PointLight(skill.lightColor, 0.0, 15.0, 1.5);
          light.position.set(0, 0.5, 0); // Position slightly above the object center
          placeholder.add(light);
          placeholder.userData.pointLight = light;
        }
      }

      // Initialize glow materials (WebDev, API, Supabase, n8n, MCP, AIDev, Android logos)
      skill.glowMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 0.0;
          mat.roughness = 0.15;
          mat.metalness = 0.1;
          
          // Explicitly override base color and emissive color to brand colors
          // to prevent them from looking purely white or washed out.
          mat.color = new THREE.Color(skill.lightColor);
          mat.emissive = new THREE.Color(skill.lightColor);
          mat.emissiveIntensity = 0.0;
        }
      });

      // Initialize fade materials (like phone casing, screens) to be transparent
      skill.fadeMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 0.0;
          
          // Silver phone body override!
          if (matName === 'UIUX_PhoneBody_Material') {
            mat.color = new THREE.Color('#E8E8E8'); // Clean bright silver body
            mat.metalness = 0.95;
            mat.roughness = 0.12;
          } else if (matName === 'UIUX_Material') {
            mat.color = new THREE.Color('#F5F5F5'); // Silver phone outline
            mat.metalness = 0.85;
            mat.roughness = 0.15;
          } else if (matName === 'UIUX_PhoneScreen_Material') {
            // Keep original screen texture, but make sure it has no metallic look
            mat.metalness = 0.05;
            mat.roughness = 0.4;
          }

          // Generic fallback to bright silver/white if too dark
          if (matName !== 'UIUX_PhoneScreen_Material' && mat.color.r < 0.15 && mat.color.g < 0.15 && mat.color.b < 0.15) {
            mat.color = new THREE.Color('#E0E0E0');
            mat.metalness = 0.9;
            mat.roughness = 0.15;
          }

          if (mat.color && !mat.emissive) {
            // Screen gets self-emissive screen light
            if (matName === 'UIUX_PhoneScreen_Material') {
              mat.emissive = mat.color.clone();
            }
          }
          mat.emissiveIntensity = 0.0;
        }
      });

      // Setup cloned individual materials for text elements
      const textMeshName = `Text_${skill.name}`;
      const textMesh = scene.getObjectByName(textMeshName) as THREE.Mesh;
      if (textMesh && textMesh.material) {
        let clonedMat = textMesh.userData.clonedMaterial as THREE.MeshStandardMaterial;
        if (!clonedMat) {
          clonedMat = (textMesh.material as THREE.MeshStandardMaterial).clone();
          clonedMat.transparent = true;
          clonedMat.opacity = 0.0;
          clonedMat.emissive = clonedMat.color.clone();
          clonedMat.emissiveIntensity = 0.0;
          textMesh.material = clonedMat;
          textMesh.userData.clonedMaterial = clonedMat;
        }
      }
    });

    // 3. Optimize floor reflection
    const floor = scene.getObjectByName('Floor') as THREE.Mesh;
    if (floor && floor.material) {
      const floorMat = floor.material as THREE.MeshStandardMaterial;
      floorMat.roughness = 0.05;
      floorMat.metalness = 0.95;
      floorMat.color = new THREE.Color(0.005, 0.005, 0.008);
    }
  }, [scene, materials]);

  useFrame((state) => {
    // Dynamically adjust Perspective Camera FOV on mobile portrait screens to keep horizontal field of view constant
    const aspect = state.size.width / state.size.height;
    let targetFov = 45;
    if (aspect < 1.0) {
      // Standard landscape FOV is 45. We scale it up progressively as the display gets narrower.
      targetFov = Math.min(80, 45 + (1.0 - aspect) * 55);
    }
    if ((state.camera as THREE.PerspectiveCamera).fov !== targetFov) {
      (state.camera as THREE.PerspectiveCamera).fov = targetFov;
      (state.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    let targetT = 0;
    const refToUse = customContainerRef || containerRef;
    if (refToUse && refToUse.current) {
      const rect = refToUse.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalHeight = rect.height;
      const scrolled = -rect.top;
      const maxScroll = totalHeight - viewportHeight;
      if (maxScroll > 0) {
        const rawPercent = Math.max(0, Math.min(1, scrolled / maxScroll));
        
        // Map OrbitSection scroll percentage to camera path progression
        if (customContainerRef) {
          if (rawPercent < 0.15) {
            targetT = 0;
          } else if (rawPercent > 0.95) {
            targetT = 1;
          } else {
            targetT = (rawPercent - 0.15) / 0.80; // Map range [0.15, 0.95] to [0.0, 1.0]
          }
        } else {
          targetT = rawPercent;
        }
      }
    }

    // High-responsiveness scroll damping (factor 0.20 provides direct tactile control, stopping exactly when you stop)
    currentTRef.current = THREE.MathUtils.lerp(currentTRef.current, targetT, 0.20);
    const t = currentTRef.current;

    // --- STATION-TO-STATION CAMERA SYSTEM ---
    // Decouples layout and camera angle so that each skill is perfectly centered when viewed,
    // and never shifts off to the side or clips the edges of the screen.
    const stations = [
      { cam: [0.0, 2.4, 18.0], look: [0.0, 0.8, 12.0] }, // Start (Hub)
      { cam: [-3.0, 1.8, 10.0], look: [-3.0, 0.8, 5.0] }, // WebDev
      { cam: [2.4, 1.8, 2.0], look: [2.4, 0.8, -3.0] }, // UIUX
      { cam: [-3.7, 1.8, -6.0], look: [-3.7, 0.8, -11.0] }, // API
      { cam: [3.0, 1.8, -14.0], look: [3.0, 0.8, -19.0] }, // Supabase
      { cam: [-3.0, 1.8, -22.0], look: [-3.0, 0.8, -27.0] }, // n8n
      { cam: [3.0, 1.8, -30.0], look: [3.0, 0.8, -35.0] }, // MCP
      { cam: [-3.0, 1.8, -38.0], look: [-3.0, 0.8, -43.0] }, // AIDev
      { cam: [3.0, 1.8, -46.0], look: [3.0, 0.8, -51.0] } // Android
    ];

    const numStations = stations.length;
    const scaledT = t * (numStations - 1);
    const index = Math.min(numStations - 2, Math.max(0, Math.floor(scaledT)));
    const fraction = scaledT - index;

    // Smooth ease-in-out translation between stations
    const smoothFraction = THREE.MathUtils.smoothstep(fraction, 0, 1);

    const stA = stations[index];
    const stB = stations[index + 1];

    // Interpolate camera position
    const camX = THREE.MathUtils.lerp(stA.cam[0], stB.cam[0], smoothFraction);
    const camY = THREE.MathUtils.lerp(stA.cam[1], stB.cam[1], smoothFraction);
    const camZ = THREE.MathUtils.lerp(stA.cam[2], stB.cam[2], smoothFraction);

    // Interpolate lookAt target
    const lookX = THREE.MathUtils.lerp(stA.look[0], stB.look[0], smoothFraction);
    const lookY = THREE.MathUtils.lerp(stA.look[1], stB.look[1], smoothFraction);
    const lookZ = THREE.MathUtils.lerp(stA.look[2], stB.look[2], smoothFraction);

    state.camera.position.set(camX, camY, camZ);
    state.camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

    // --- DECOUPLED PATH PROGRESSION FOR TRIGGER GLOWS ---
    // Ensures glow calculations and shader triggers remain perfectly linear.
    const pathZ = THREE.MathUtils.lerp(18.0, -56.0, t);
    
    if (pathMatRef.current) {
      pathMatRef.current.uniforms.uCameraZ.value = pathZ;
    }

    // --- SKILL PROXIMITY GLOWS & SOLID TRANSITIONS ---
    SKILL_DATA.forEach((skill) => {
      const relativeZ = pathZ - skill.z;

      // Calculate activation factor
      let factor = 0.0;
      if (relativeZ < 6.5) {
        factor = Math.min(1.0, (6.5 - relativeZ) / 7.5);
      }

      // Glow Material Transition (set solid opaque once fully reached to avoid transparency glitches)
      skill.glowMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = factor < 0.99;
          mat.opacity = factor;
          mat.emissiveIntensity = factor * 2.0;
        }
      });

      // Fade Material Transition (solid phone casing, screen textures)
      skill.fadeMaterialNames.forEach((matName) => {
        const mat = materials[matName] as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = factor < 0.99;
          mat.opacity = factor;
          if (matName === 'UIUX_PhoneScreen_Material') {
            mat.emissiveIntensity = factor * 0.45; // Crisp self-lit screen backlight
          }
        }
      });

      // Cloned Text Material Transition
      const textMeshName = `Text_${skill.name}`;
      const textMesh = scene.getObjectByName(textMeshName) as THREE.Mesh;
      if (textMesh && textMesh.userData.clonedMaterial) {
        const clonedMat = textMesh.userData.clonedMaterial as THREE.MeshStandardMaterial;
        clonedMat.transparent = factor < 0.99;
        clonedMat.opacity = factor;
        clonedMat.emissiveIntensity = factor * 1.5;
      }

      // Point Light Transition
      const placeholder = scene.getObjectByName(skill.placeholderName);
      if (placeholder && placeholder.userData.pointLight) {
        const light = placeholder.userData.pointLight as THREE.PointLight;
        light.intensity = factor * skill.maxLightIntensity;
      }
    });
  });

  return <primitive object={scene} />;
}

export default function SkillShowcase({ 
  gltfPath = '/assets/portfolio_2nd_section.glb', 
  height = '300vh',
  customContainerRef
}: { 
  gltfPath?: string; 
  height?: string;
  customContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = customContainerRef?.current || containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      rootMargin: '2000px', // start building/rendering 2000px before entering viewport to avoid scrolling stutters on canvas mount
      threshold: 0
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [customContainerRef]);
  
  if (customContainerRef) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }} ref={containerRef}>
        {isVisible ? (
          <Canvas
            camera={{ position: [0, 2.5, 18], fov: 45 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={0.08} />
            {/* Studio three-point lighting for glossy highlights and well-lit silver models */}
            <directionalLight position={[0, 10, -5]} intensity={0.3} />
            <directionalLight position={[0, 5, 15]} intensity={0.7} color="#ffffff" />
            <Scene gltfPath={gltfPath} containerRef={containerRef} customContainerRef={customContainerRef} />
          </Canvas>
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#000' }} />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: height, background: '#000' }}>
      <div style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
        {isVisible ? (
          <Canvas
            camera={{ position: [0, 2.5, 18], fov: 45 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={0.08} />
            <directionalLight position={[0, 10, -5]} intensity={0.3} />
            <directionalLight position={[0, 5, 15]} intensity={0.7} color="#ffffff" />
            <Scene gltfPath={gltfPath} containerRef={containerRef} />
          </Canvas>
        ) : (
          <div style={{ width: '100%', height: '100vh', background: '#000' }} />
        )}
      </div>
    </div>
  );
}

useGLTF.preload('/assets/portfolio_2nd_section.glb');
