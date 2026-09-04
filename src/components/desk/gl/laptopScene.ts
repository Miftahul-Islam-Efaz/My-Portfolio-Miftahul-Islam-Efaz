import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { DESK_DRAG } from '../../../config/deskStage';
import {
	DESK_MOBILE_FRAME,
	resolveDeskTuning,
	type DeskTuning,
} from '../../../config/deskStageMobile';

/* ------------------------------------------------------------------
   THE DESK - laptop scene

   Raw three.js, matching rake/gl/scene.ts and work/dither/gl/*. There is
   no React Three Fiber in this project and this file is not the place to
   introduce a second rendering paradigm.

   ------------------------------------------------------------------
   MOBILE IS A RESOLVED TUNING OBJECT, NOT A BRANCH PER PROPERTY

   Every number this file used to read straight off DESK_LAPTOP or
   DESK_PARALLAX now comes from `tuning`, which resolveDeskTuning()
   produces from the viewport width. Above 768px that object is a copy of
   the desktop config and this file behaves exactly as it did before;
   below it, the mobile overrides in config/deskStageMobile.ts apply.

   The alternative - `if (mobile)` at each of the fourteen places a pose
   value is read - is how a render loop ends up with two poses that agree
   on eleven axes and disagree on three. One object, resolved once per
   resize, cannot desync from itself.

   ------------------------------------------------------------------
   THE MODEL REQUIRES DRACO. THIS IS NOT OPTIONAL.

   laptop-web-optimized.glb declares KHR_draco_mesh_compression in
   `extensionsRequired`. Without DRACOLoader wired up, GLTFLoader does not
   degrade to an uncompressed read - it throws, and the section renders an
   empty canvas. The decoder lives in /public/draco, copied out of
   node_modules/three/examples/jsm/libs/draco/gltf.

   EXT_texture_webp is also required and is handled by GLTFLoader itself,
   so it needs no setup here.

   ------------------------------------------------------------------
   TWO CLIPS, ONE TIME VALUE

   LidOpenClose (LINEAR, on LidPivot) and KeyboardHideClosed (STEP, on
   Keyboard) are both 2.5s and share an identical time range. They are
   driven by ONE scalar, so they cannot drift.

   The keyboard clip is not decoration. At the closed angle the keys
   physically pierce the screen plane, so they are scaled to zero for the
   frames where they would be inside the shell and popped back at 93.6
   degrees, still hidden behind the almost-shut lid. Scrub the lid without
   scrubbing the keyboard and the open laptop has no keys.

   ------------------------------------------------------------------
   THE SCREEN IS NOT LIT, IT EMITS

   The screen material arrives as a PBR material with the artwork on
   `emissiveMap` and a black base colour. It is swapped for a
   MeshBasicMaterial with `toneMapped: false`, so the artwork is shown at
   exactly its authored values regardless of the lighting or the
   renderer's tone curve. Anything else and the screen reads as a
   dark-grey panel with a picture faintly behind it.
   ------------------------------------------------------------------ */

export type DeskBeats = {
	arrive: number;
	displace: number;
	exit: number;
};

export type LaptopScene = {
	/** Beat scalars, straight from the scroll hook. */
	setBeats: (beats: DeskBeats) => void;
	/** Smoothed pointer OR gyro tilt, normalised -1..1 from centre. */
	setPointer: (x: number, y: number) => void;
	/** Add to the drag offset, in raw pixels of pointer travel. */
	dragBy: (dx: number, dy: number) => void;
	/** Release the gesture - the offset springs back to zero from here. */
	endDrag: () => void;
	resize: () => void;
	/** `seconds` drives the idle float, `delta` the drag spring. */
	render: (seconds: number, delta: number) => void;
	dispose: () => void;
	/** Resolves once the GLB is decoded, or rejects if it cannot be. */
	ready: Promise<void>;
};

/* The desktop camera distance, unchanged from the original build. The
   framing solve below never goes below this, so a desktop viewport is
   framed at exactly the distance it always was. */
const DESKTOP_DISTANCE = 3.4;

export function createLaptopScene(
	canvas: HTMLCanvasElement,
): LaptopScene | null {
	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			/* Transparent: the section's own background shows through, so the
			   canvas never has to agree with a CSS colour. This is also what
			   lets the stars and the statement sit BEHIND the laptop and be
			   genuinely occluded by it rather than clipped against a box. */
			alpha: true,
			powerPreference: 'high-performance',
		});
	} catch {
		// No WebGL. The caller leaves the DOM layers visible on their own.
		return null;
	}

	renderer.setClearAlpha(0);
	/* NO TONE MAPPING. The screen is the subject and it is emissive; a tone
	   curve would crush exactly the highlights the artwork is made of. The
	   body of the machine is lit by an environment map instead, which does
	   not need tone mapping to read correctly. */
	renderer.toneMapping = THREE.NoToneMapping;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
	camera.position.set(0, 0, DESKTOP_DISTANCE);

	/* Resolved here and re-resolved on every resize. Never read per frame -
	   it is a pure function of the viewport width and calling it in the
	   render loop would be sixty allocations a second for an answer that
	   only changes when the window does. */
	let tuning: DeskTuning = resolveDeskTuning(window.innerWidth);

	/* ---------------- LIGHTING ----------------

	   The model uses KHR_materials_clearcoat on its shell. Clearcoat is a
	   reflection of the surroundings by definition, so with lights alone
	   and no environment it resolves to near-black and the laptop looks
	   like matte plastic. RoomEnvironment is a procedural scene - no
	   texture fetch, nothing to 404 - baked once into a PMREM here.

	   The directional light on top of it is what gives the lid edge its
	   single hard highlight; the environment alone is too even to describe
	   the form. */
	const pmrem = new THREE.PMREMGenerator(renderer);
	const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
	scene.environment = envRT.texture;
	pmrem.dispose();

	const key = new THREE.DirectionalLight(0xffffff, 2.1);
	key.position.set(1.4, 2.2, 1.8);
	scene.add(key);

	const fill = new THREE.DirectionalLight(0xb56c4b, 0.5);
	fill.position.set(-2, -0.4, 0.8);
	scene.add(fill);

	scene.add(new THREE.AmbientLight(0xffffff, 0.25));

	/* ---------------- RIG ----------------

	   Three nested groups, so each concern owns exactly one transform and
	   nothing has to compose matrices by hand:

	     root   - beat-driven position and scale (arrive / displace / exit)
	     lean   - the resting 3/4 pose, pointer parallax, drag offset
	     model  - the GLB, re-centred on its own bounding box

	   Flattening these would mean every frame recomputing a single
	   transform from four independent sources, which is where sign errors
	   and gimbal surprises come from. */
	const root = new THREE.Group();
	const lean = new THREE.Group();
	root.add(lean);
	scene.add(root);

	/* THE ROLL IS APPLIED IN ZYX ORDER, NOT THE DEFAULT XYZ.

	   The resting pose tips the machine on Z (the roll that stops it
	   looking diagrammed) and also turns it on Y. Under three's default
	   'XYZ' order the Y turn is applied in the already-rolled frame, so
	   the roll axis drags round with the turn and the machine appears to
	   tumble as it settles instead of pivoting on the spot.

	   'ZYX' applies the roll LAST, in screen space, which is what the
	   reference frames show: a level 3/4 view with the whole image tipped
	   a few degrees. */
	lean.rotation.order = 'ZYX';

	let mixer: THREE.AnimationMixer | null = null;
	let lidAction: THREE.AnimationAction | null = null;
	let keyAction: THREE.AnimationAction | null = null;
	let clipDuration = 0;

	/* The machine's worst-case horizontal extent, in world units, measured
	   once when the GLB lands. Zero until then, which the framing solve
	   treats as "not yet known" and skips. */
	let frameWidth = 0;

	const beats: DeskBeats = { arrive: 0, displace: 0, exit: 0 };
	const pointer = { x: 0, y: 0 };
	const drag = { x: 0, y: 0, active: false };

	const disposables: Array<{ dispose: () => void }> = [];

	/* ---------------- FIT TO FRAME ----------------

	   THIS IS THE FIX FOR THE LAPTOP OVERFLOWING A PHONE, AND IT IS THE
	   SAME BUG CLASS AS THE RAKE BLADE.

	   A PerspectiveCamera's VERTICAL fov is the constant; the horizontal
	   one is derived from it and the aspect ratio:

	     visibleWidth = 2 * distance * tan(fovY / 2) * aspect

	   So the visible width is PROPORTIONAL TO ASPECT. At the fixed
	   distance of 3.4 the frame is ~1.62 units wide on a 16:9 desktop and
	   ~0.42 units wide on a portrait phone - a quarter of the room - while
	   the laptop stayed the same 1.1-odd units across. Hence a machine
	   cropped by both edges of the screen.

	   Rather than add a mobile `scale` override to compensate (a second
	   magic number that has to be kept in step with the first, and that
	   would still be wrong on a foldable), this SOLVES the above for
	   distance given the fraction of the frame the machine should occupy.

	   The extent used is hypot(width, depth), not width. The laptop is
	   turned on its Y axis by the pose and by the pointer, and a rotating
	   box's apparent width sweeps between its width and its diagonal. Using
	   the diagonal means the machine cannot clip the frame at ANY turn
	   angle, at the cost of a slightly smaller resting size than the strict
	   minimum. That trade is worth it: a laptop that is 4% smaller than it
	   could be is invisible, and one whose corner leaves the screen when it
	   turns is not.

	   DESKTOP IS UNTOUCHED. Above the breakpoint this returns the original
	   3.4 and nothing else in this function runs. */
	const applyFraming = () => {
		if (!tuning.isMobile || frameWidth <= 0) {
			camera.position.z = DESKTOP_DISTANCE;
			return;
		}

		const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
		const aspect = Math.max(camera.aspect, 0.05);

		const needed =
			frameWidth /
			(2 * DESK_MOBILE_FRAME.widthFraction * Math.tan(halfFov) * aspect);

		camera.position.z = THREE.MathUtils.clamp(
			needed,
			DESK_MOBILE_FRAME.minDistance,
			DESK_MOBILE_FRAME.maxDistance,
		);
	};

	/* ---------------- LOAD ----------------

	   The loaders are torn down as soon as the parse resolves. DRACOLoader
	   holds a worker pool open until it is explicitly disposed, and this
	   section decodes exactly one file exactly once - leaving the pool
	   alive would keep idle workers around for the life of the page. */
	const draco = new DRACOLoader().setDecoderPath(tuning.laptop.dracoPath);
	const loader = new GLTFLoader().setDRACOLoader(draco);

	const ready = new Promise<void>((resolve, reject) => {
		loader.load(
			tuning.laptop.model,
			(gltf) => {
				const model = gltf.scene;

				/* ---- ANIMATION ----
				   Both actions are played and immediately paused: an action that
				   has never been played does not contribute to the mixer's
				   output, so setting `.time` on it would do nothing. */
				mixer = new THREE.AnimationMixer(model);

				const findClip = (name: string) =>
					gltf.animations.find((c) => c.name === name) ?? null;

				const lidClip = findClip(tuning.laptop.clipLid);
				const keyClip = findClip(tuning.laptop.clipKeyboard);

				if (!lidClip) {
					console.warn(
						`[desk] clip "${tuning.laptop.clipLid}" is missing from the ` +
							`GLB - the laptop will render in its rest pose (closed). ` +
							`Check the Blender export used export_animations=True.`,
					);
				}

				if (lidClip) {
					lidAction = mixer.clipAction(lidClip);
					lidAction.play();
					lidAction.paused = true;
					clipDuration = lidClip.duration;
				}

				if (keyClip) {
					keyAction = mixer.clipAction(keyClip);
					keyAction.play();
					keyAction.paused = true;
					clipDuration = Math.max(clipDuration, keyClip.duration);
				} else {
					console.warn(
						`[desk] clip "${tuning.laptop.clipKeyboard}" is missing - the ` +
							`keyboard will be stuck at its rest scale of zero and the ` +
							`open laptop will have no keys.`,
					);
				}

				/* ---- THE SCREEN ----
				   Swap the PBR material for an unlit one carrying the same map.
				   Matched by object name, which survived compression - never by
				   object identity, which is not stable across three's wrappers. */
				model.traverse((child) => {
					if (!(child instanceof THREE.Mesh)) return;
					child.frustumCulled = false;

					if (child.name !== 'Screen') return;

					const source = child.material as THREE.MeshStandardMaterial;
					const art = source.emissiveMap ?? source.map;

					if (!art) {
						console.warn(
							'[desk] the Screen mesh has no emissive map - the screen will ' +
								'render flat black. Check that ScreenMat still carries ' +
								'Website-image on Emission Color.',
						);
						return;
					}

					art.colorSpace = THREE.SRGBColorSpace;
					art.anisotropy = Math.min(
						8,
						renderer.capabilities.getMaxAnisotropy(),
					);
					/* Do NOT touch art.flipY. GLTFLoader has already set it false
					   for glTF's UV convention, and the ScreenUV layer was built
					   and orientation-checked against that convention in Blender.
					   Flipping it here turns the artwork upside down. */
					art.needsUpdate = true;

					const unlit = new THREE.MeshBasicMaterial({
						map: art,
						toneMapped: false,
					});
					child.material = unlit;
					disposables.push(unlit);
					source.dispose();
				});

				/* ---- RE-CENTRE ----
				   The GLB's origin is the Sketchfab scene root, not the middle of
				   the machine, so dropped in as-is the laptop sits off-centre and
				   every rotation swings it around a point outside itself.

				   Measured at the OPEN pose. The bounding box changes as the lid
				   moves, so it has to be sampled at one defined moment, and open
				   is the pose the section spends most of its time in.

				   NOTE the scale is taken from the resolved tuning, but mobile
				   deliberately does NOT override it - size is the framing
				   solve's job. Because this runs once, a resize that crosses the
				   breakpoint would not re-apply a scale override anyway, which
				   is a second reason not to add one. */
				model.scale.setScalar(tuning.laptop.scale);
				if (mixer && clipDuration > 0) {
					if (lidAction) lidAction.time = clipDuration;
					if (keyAction) keyAction.time = clipDuration;
					mixer.update(0);
				}
				model.updateWorldMatrix(true, true);

				const box = new THREE.Box3().setFromObject(model);
				const centre = box.getCenter(new THREE.Vector3());
				model.position.sub(centre);

				/* The extent the framing solve needs. Diagonal of the footprint,
				   for the reason given on applyFraming. */
				const size = box.getSize(new THREE.Vector3());
				frameWidth = Math.hypot(size.x, size.z);

				lean.add(model);

				/* The measurement the solve was waiting for has arrived, so
				   re-frame now. Without this the first frames after the GLB
				   lands are drawn at the desktop distance on a phone - a
				   visible pop, since the model appears at the same moment. */
				applyFraming();

				resolve();
			},
			undefined,
			(error) => {
				console.error(
					`[desk] could not load ${tuning.laptop.model}. If this is a ` +
						`Draco error, check that /draco/draco_decoder.wasm is being ` +
						`served.`,
					error,
				);
				reject(error as Error);
			},
		);
	});

	ready.finally(() => {
		draco.dispose();
	});

	/* ---------------- FRAME ---------------- */

	const setBeats = (next: DeskBeats) => {
		beats.arrive = next.arrive;
		beats.displace = next.displace;
		beats.exit = next.exit;
	};

	const setPointer = (x: number, y: number) => {
		pointer.x = x;
		pointer.y = y;
	};

	const dragBy = (dx: number, dy: number) => {
		drag.active = true;
		drag.y += dx * DESK_DRAG.speedY;
		drag.x = THREE.MathUtils.clamp(
			drag.x + dy * DESK_DRAG.speedX,
			-DESK_DRAG.clampX,
			DESK_DRAG.clampX,
		);
	};

	const endDrag = () => {
		drag.active = false;
	};

	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		const width = Math.max(1, rect.width);
		const height = Math.max(1, rect.height);

		/* Re-resolved here and nowhere else. A resize is the only event that
		   can change the answer, and every consumer below reads the result
		   rather than re-deriving it. */
		tuning = resolveDeskTuning(window.innerWidth);

		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		/* Order matters: the framing solve reads camera.aspect, so it has to
		   run after the assignment above and before the projection matrix is
		   rebuilt from it. */
		applyFraming();
		camera.updateProjectionMatrix();
	};

	const render = (seconds: number, delta: number) => {
		/* Locals for the two resolved blocks. Reads clearly, and it makes it
		   obvious that every pose value below comes from ONE resolved object
		   rather than from a mix of config imports. */
		const L = tuning.laptop;
		const P = tuning.parallax;

		/* ---- LID ----
		   Scrubbed by ARRIVE, so the machine opens exactly as it rises and
		   is fully open the instant it lands. Both clips are set from the
		   same value. */
		if (mixer && clipDuration > 0) {
			const time = THREE.MathUtils.clamp(beats.arrive, 0, 1) * clipDuration;
			if (lidAction) lidAction.time = time;
			if (keyAction) keyAction.time = time;
			mixer.update(0);
		}

		/* ---- BEAT TRANSFORM ----
		   Stacked viewports move the laptop UP rather than to the side, since
		   there is no room for type beside it. Matches the 900px media query
		   in desk-stage.css.

		   The upward shove is a literal here ONLY for the stacked-but-not-
		   mobile band (768-900px: a small tablet, which keeps Lenis and the
		   pointer). Below 768 the same movement comes from
		   DESK_MOBILE_LAPTOP.displaceY, which is configurable. Keeping the
		   old literal for the tablet band means this change cannot alter how
		   that band already behaves. */
		const stacked = tuning.isStacked;
		const d = beats.displace;
		const tabletLift = stacked && !tuning.isMobile ? 0.34 * d : 0;

		const float = Math.sin(seconds * L.floatSpeed) * L.floatY;

		root.position.x = stacked ? 0 : L.displaceX * d;
		root.position.y =
			THREE.MathUtils.lerp(L.fromY, L.toY, beats.arrive) +
			L.displaceY * d +
			tabletLift +
			L.exitY * beats.exit +
			float;

		const scale = THREE.MathUtils.lerp(1, L.displaceScale, d);
		root.scale.setScalar(scale);

		/* ---- POSE ----
		   Scroll owns the base pose. Pointer lean and the drag offset are
		   ADDED to it, never substituted for it, which is what lets the drag
		   spring back to "wherever the scroll is now" instead of to a
		   remembered pose that may no longer be correct.

		   On mobile the `pointer` values are the GYROSCOPE's, normalised to
		   the same -1..1 by lib/deskGyro.ts. Nothing here needs to know
		   which input produced them - that is the entire reason the gyro is
		   normalised at its source rather than applied as its own term. */
		const baseRotY =
			THREE.MathUtils.lerp(L.fromRotY, L.toRotY, beats.arrive) +
			(L.displaceRotY - L.toRotY) * d;

		lean.rotation.y =
			baseRotY +
			pointer.x * P.laptopRotY +
			drag.y +
			Math.sin(seconds * L.floatSpeed * 0.7) * L.floatRot;

		/* The resting downward tilt is faded in with ARRIVE: at the bottom of
		   the rise the machine is closer to edge-on, and it settles into the
		   reference 3/4 view as it lands. */
		lean.rotation.x =
			L.baseRotX * beats.arrive +
			L.displaceRotX * d +
			pointer.y * P.laptopRotX +
			drag.x;

		/* The roll. Faded in the same way, and NOT touched by drag - the
		   visitor turns the machine, they do not tip the composition. */
		lean.rotation.z = L.baseRotZ * beats.arrive + L.displaceRotZ * d;

		/* ---- DRAG SPRING ----
		   Frame-rate independent decay. A raw `offset *= 0.94` per frame
		   springs back roughly twice as fast on a 120Hz display as on a
		   60Hz one, which is the kind of bug that only shows up on someone
		   else's machine. */
		if (!drag.active && (drag.x !== 0 || drag.y !== 0)) {
			const decay = Math.pow(1 - DESK_DRAG.release, delta * 60);
			drag.x *= decay;
			drag.y *= decay;
			if (Math.abs(drag.x) < 1e-4) drag.x = 0;
			if (Math.abs(drag.y) < 1e-4) drag.y = 0;
		}

		renderer.render(scene, camera);
	};

	const dispose = () => {
		for (const item of disposables) item.dispose();

		/* Walk what is actually in the graph rather than trusting a list -
		   the GLB brings its own nine materials and thirty geometries, none
		   of which this file created. */
		scene.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;
			child.geometry.dispose();
			const material = child.material;
			if (Array.isArray(material)) material.forEach((m) => m.dispose());
			else material.dispose();
		});

		envRT.dispose();
		mixer?.stopAllAction();
		draco.dispose();
		renderer.dispose();
	};

	resize();

	return {
		setBeats,
		setPointer,
		dragBy,
		endDrag,
		resize,
		render,
		dispose,
		ready,
	};
}
