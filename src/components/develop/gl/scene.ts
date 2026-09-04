/* ------------------------------------------------------------------
   THE DEVELOP - scene

   Owns the renderer, the one Points object, and the uniforms. Knows
   nothing about scroll or React: the hook drives it through setters and
   calls render() from its own rAF loop.

   Returns null on any failure - no WebGL, a lost context at creation,
   or an unusable grain field. The caller keeps the DOM portrait on
   screen in that case, so the section degrades to a photograph rather
   than to a hole. This mirrors the rake's scene contract exactly.
   ------------------------------------------------------------------ */

import * as THREE from 'three';
import {
  DEVELOP_AGITATION,
  DEVELOP_EMBER,
  DEVELOP_MOTION,
  DEVELOP_RENDER,
} from '../../../config/develop';
import { DEVELOP_FRAGMENT, DEVELOP_VERTEX } from './shaders';
import type { GrainField } from './grainField';

export type DevelopScene = {
  /** 0 = suspension, 1 = developed print. */
  setProgress: (p: number) => void;
  /** Pointer in world units, and whether it is present. */
  setPointer: (x: number, y: number) => void;
  setPointerPresent: (present: boolean) => void;
  setSize: (width: number, height: number) => void;
  /** One frame. `dt` in seconds, used to ease the pointer influence. */
  render: (dt: number) => void;
  dispose: () => void;
};

export function createDevelopScene(
  canvas: HTMLCanvasElement,
  field: GrainField,
): DevelopScene | null {
  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      /* Transparent so the section background shows through. The cloud
         has no backdrop of its own - the black around the figure is the
         page, which is why the silhouette can bleed into the section
         instead of ending at a canvas edge. */
      alpha: true,
      /* Points are round via a fragment discard, so MSAA has almost
         nothing to smooth here and costs real fill rate at this count. */
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  /* If the context died between construction and here, bail before we
     allocate 35,000 grains' worth of buffers. */
  if (!renderer.getContext()) {
    renderer.dispose();
    return null;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, DEVELOP_RENDER.maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(DEVELOP_RENDER.fov, 1, 0.1, 100);
  camera.position.z = DEVELOP_RENDER.cameraZ;

  const geometry = new THREE.BufferGeometry();

  const targetAttr = new THREE.BufferAttribute(field.target, 3);

  /* THE SAME ATTRIBUTE OBJECT IS BOUND TWICE, ON PURPOSE.

     Three requires a `position` attribute on any geometry to establish
     the draw count, and the shader wants the resting position as
     `aTarget`. They are the same numbers. Binding one BufferAttribute
     under both names uploads a single buffer to the GPU - Three keys its
     attribute cache on the attribute object, not the name - so this
     costs nothing while keeping the shader readable. Setting
     `field.target` twice as two attributes would duplicate ~400 KB. */
  geometry.setAttribute('position', targetAttr);
  geometry.setAttribute('aTarget', targetAttr);

  geometry.setAttribute('aRandom', new THREE.BufferAttribute(field.random, 3));
  geometry.setAttribute('aColorBase', new THREE.BufferAttribute(field.colorBase, 3));
  geometry.setAttribute('aColorSharp', new THREE.BufferAttribute(field.colorSharp, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(field.seed, 1));

  /* Culling is off and the bounding sphere is set by hand.

     Grains fly well outside the resting silhouette while suspended, and
     a bounding volume computed from the resting positions would let the
     whole cloud be culled - or worse, popped in and out - exactly during
     the scattered part of the develop. */
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, 0, 0),
    3 + DEVELOP_MOTION.scatterDepth,
  );

  const uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uStagger: { value: DEVELOP_MOTION.stagger },
    uScatter: { value: DEVELOP_MOTION.scatter },
    uScatterDepth: { value: DEVELOP_MOTION.scatterDepth },
    uDriftAmount: { value: DEVELOP_MOTION.driftAmount },
    uDriftSpeed: { value: DEVELOP_MOTION.driftSpeed },

    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerOn: { value: 0 },
    uAgitRadius: { value: DEVELOP_AGITATION.radius },
    uAgitPush: { value: DEVELOP_AGITATION.push },
    uRippleAmount: { value: DEVELOP_AGITATION.rippleAmount },
    uRippleFreq: { value: DEVELOP_AGITATION.rippleFrequency },
    uRippleSpeed: { value: DEVELOP_AGITATION.rippleSpeed },
    uAgitLift: { value: DEVELOP_AGITATION.lift },
    uSharpen: { value: DEVELOP_AGITATION.sharpen },

    uPointSize: { value: DEVELOP_RENDER.pointSize },
    uPointSizeScatter: { value: DEVELOP_RENDER.pointSizeScatter },
    uDpr: { value: dpr },
    uSoftness: { value: DEVELOP_RENDER.pointSoftness },
    uExposure: { value: DEVELOP_RENDER.exposure },
    uEmberTint: { value: DEVELOP_RENDER.emberTint },
    uEmber: { value: new THREE.Color(DEVELOP_EMBER) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: DEVELOP_VERTEX,
    fragmentShader: DEVELOP_FRAGMENT,
    uniforms,
    transparent: true,
    /* Normal blending, not additive.

       Additive is the reflex for particles and it is wrong here: it
       cannot produce a value darker than the background, so every
       shadow on the face would wash out and the portrait would come
       back as a glowing ghost instead of a photograph. */
    blending: THREE.NormalBlending,
    /* Depth off. The cloud is one unsorted object with no geometry to
       occlude, and depth writes between overlapping transparent points
       would punch holes where nearer grains reject farther ones. */
    depthTest: false,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  /* Eased pointer influence. The raw present/absent flag is a step;
     easing it here - rather than in the hook - keeps the smoothing next
     to the thing it smooths, and means a dropped frame cannot leave the
     disturbance half-applied. */
  let pointerTargetOn = 0;
  let time = 0;

  const setSize = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    /* false: never let Three write inline width/height styles onto the
       canvas. The element is sized by CSS to fill its frame, and letting
       the renderer own the style fights the layout on every resize. */
    renderer.setSize(width, height, false);
  };

  return {
    setProgress: (p: number) => {
      uniforms.uProgress.value = Math.min(Math.max(p, 0), 1);
    },
    setPointer: (x: number, y: number) => {
      uniforms.uPointer.value.set(x, y);
    },
    setPointerPresent: (present: boolean) => {
      pointerTargetOn = present ? 1 : 0;
    },
    setSize,
    render: (dt: number) => {
      time += dt;
      uniforms.uTime.value = time;

      /* Exponential approach, frame-rate independent. The config value is
         a time constant in seconds, so the fade feels the same at 60 and
         at 144 Hz. */
      const k = 1 - Math.exp(-dt / Math.max(DEVELOP_AGITATION.ease, 0.0001));
      uniforms.uPointerOn.value += (pointerTargetOn - uniforms.uPointerOn.value) * k;

      renderer.render(scene, camera);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
