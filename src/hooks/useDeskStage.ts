'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { DESK_BEATS, DESK_DRAG, DESK_SCROLL } from '../config/deskStage';
import { resolveDeskTuning } from '../config/deskStageMobile';
import { createDeskGyro, type DeskGyro } from '../lib/deskGyro';
import {
	createLaptopScene,
	type LaptopScene,
} from '../components/desk/gl/laptopScene';

/* THE MOBILE STYLESHEET IS IMPORTED HERE, NOT IN DeskStage.tsx.

   Deliberate, and it is the reason DeskStage.tsx is not in the diff for
   this work at all. The component - the markup a desktop visitor gets -
   is untouched. This hook is where the mobile behaviour already lives,
   so the mobile styles load alongside it.

   Load ORDER matters: desk-stage.css is imported by DeskStage.tsx, which
   imports this hook first, so the base sheet is emitted before this one
   and the overrides here win on load order alone - no specificity games,
   no !important. See the header of desk-stage-mobile.css. */
import '../styles/desk-stage-mobile.css';

/* ------------------------------------------------------------------
   THE DESK - motion

   ONE ScrollTrigger, FOUR style writes per frame, ONE render loop.

   The trigger writes --desk-arrive / --desk-displace / --desk-exit to
   the section root and hands the same three numbers to the GL scene.
   Every layer in desk-stage.css is a pure function of those, so adding a
   fourth star or moving the statement is a stylesheet change and never
   a change in here.

   ------------------------------------------------------------------
   MOBILE: THE GYROSCOPE REPLACES THE CURSOR, AND ONLY THE SOURCE.

   A phone has no cursor, so on mobile the parallax input is device tilt.
   The important structural decision is that the gyro is normalised to
   the SAME -1..1 pair the pointer produces (see lib/deskGyro.ts), and it
   is substituted at exactly one place: measure(). Everything downstream
   - the smoothing, the two custom properties, the stars, the statement,
   the laptop's lean - is byte-identical for both inputs.

   The alternative, a `gyro` term added alongside the pointer term in the
   scene, would have meant two sets of parallax multipliers to keep in
   agreement and a desktop code path that could be broken by a mobile
   change. This way there is one pipeline with a swappable head.

   THE POINTER PATH IS NOT REMOVED ON MOBILE. It stays as the fallback,
   because the gyro can legitimately never arrive: no HTTPS, permission
   denied on iOS, or a device without the sensor. `gyro.isLive()` only
   returns true once a real reading has landed, so the section is never
   left with a dead input - whichever source produces data wins, and
   nothing has to guess in advance which one that is.

   ------------------------------------------------------------------
   IT IS NOT PINNED, AND MUST NOT BECOME PINNED.

   The laptop is held in frame by `position: sticky` on .desk-stage. This
   trigger only READS progress - it has no `pin`, and so it adds no pin
   spacing and cannot move the pinned helix in DitherCarousel.tsx further
   down the page. That is the same rule useCompositor.ts carries, for the
   same reason: a pin here broke the carousel once already.

   Because nothing is pinned there is also no refreshPriority to declare.
   Leaving it unset keeps this section out of the pin-ordering problem
   entirely, rather than participating in it correctly.

   ------------------------------------------------------------------
   WHY THE POINTER IS NOT A SEPARATE LOOP

   The pointer feeds BOTH the DOM layers (via two custom properties) and
   the laptop's lean (via the scene). One rAF loop owns the smoothing and
   pushes to both, so they cannot disagree about where the cursor is by a
   frame - which reads as the stars sliding against the machine.

   The loop is gated on the section being in view AND still moving. It
   parks itself once the pointer settles and there is nothing to animate.

   ------------------------------------------------------------------
   write() IS NOT A RENDER. THIS IS THE ORDER THAT MATTERS.

   write() does two things: it sets the custom properties (the DOM picks
   those up on the next style recalc, with no involvement from us) and it
   calls scene.setBeats(), which only STORES numbers on the scene. The
   canvas is only ever repainted from inside tick().

   So write() alone fixes the DOM and desyncs the canvas. That is the
   second half of the first-load bug: HomeShell's ScrollTrigger.refresh()
   fired onRefresh, the statement and stars corrected themselves
   instantly, and the laptop kept displaying the last frame tick() had
   drawn - under the OLD beats - because the loop parks itself (frame = 0)
   whenever the section is out of view. Any pointer move called wake(),
   drew one frame, and the laptop snapped into place. Hence: still broken
   on arrival, fixed by wiggling the mouse.

   Every path that changes the beats without the loop necessarily running
   must therefore be followed by drawOnce(). There are three: the initial
   write, onRefresh, and the fonts.ready refresh.

   DECLARATION ORDER IS LOAD-BEARING. The loop state, tick, wake and
   drawOnce are all declared ABOVE ScrollTrigger.create(), because GSAP
   fires onRefresh (and can fire onToggle) SYNCHRONOUSLY during creation
   and on every refresh. When these lived below the trigger, those
   callbacks reached `visible` and `wake` inside their temporal dead zone
   and threw a ReferenceError. Do not move them back down.
   ------------------------------------------------------------------ */

gsap.registerPlugin(ScrollTrigger);

/** Remap a global 0..1 progress into a beat's own 0..1 window. */
const beat = (p: number, [from, to]: readonly [number, number]) => {
	if (to <= from) return p >= to ? 1 : 0;
	return Math.min(Math.max((p - from) / (to - from), 0), 1);
};

export type DeskStageHandles = {
	rootRef: React.RefObject<HTMLElement | null>;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export function useDeskStage(): DeskStageHandles {
	const rootRef = useRef<HTMLElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;

		const reduced = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;

		const scene: LaptopScene | null = createLaptopScene(canvas);

		/* No WebGL at all. The DOM layers already default to their composed
		   state in CSS, so the section is still a complete, readable frame -
		   it simply has no laptop in it. Nothing else to do. */
		if (!scene) return;

		/* ---- REDUCED MOTION ----
		   Arrive and displace are held at 1: the laptop sits open and still,
		   the statement is out, the stars rest in their corners. The section
		   is fully composed, just not animated. One render, no loop, no
		   trigger, no listeners - and no gyroscope, which would be a motion
		   effect driven by motion. */
		if (reduced) {
			scene.setBeats({ arrive: 1, displace: 1, exit: 0 });
			const drawOnce = () => scene.render(0, 0);
			scene.ready.then(drawOnce).catch(() => {});
			const onResize = () => {
				scene.resize();
				drawOnce();
			};
			window.addEventListener('resize', onResize);
			return () => {
				window.removeEventListener('resize', onResize);
				scene.dispose();
			};
		}

		/* Swap the CSS defaults (composed) for the raw state. Done here,
		   synchronously, BEFORE the trigger is built - if it were done in a
		   rAF the first painted frame would be the finished composition and
		   the section would flash its own ending. */
		root.dataset.deskState = 'armed';

		const ctx = gsap.context(() => {
			/* Resolved once per effect. The scene resolves its own copy on
			   resize; this one is only used for the DOM-side parallax amounts
			   and to decide whether to attach a gyroscope, neither of which
			   should change under a live visitor without a remount. */
			let tuning = resolveDeskTuning(window.innerWidth);

			/* quickSetter caches the property lookup. These four fire on every
			   scroll frame, and the difference against repeated style.setProperty
			   calls is measurable on a mid-range phone. */
			const setArrive = gsap.quickSetter(root, '--desk-arrive');
			const setDisplace = gsap.quickSetter(root, '--desk-displace');
			const setExit = gsap.quickSetter(root, '--desk-exit');
			const setPx = gsap.quickSetter(root, '--desk-px', 'px');
			const setPy = gsap.quickSetter(root, '--desk-py', 'px');

			/* ---- POINTER / TILT STATE ----
			   `target` is where the input is, `current` is where the section
			   has caught up to. Smoothed in the loop rather than on the event,
			   so the easing is tied to frames and not to how often the mouse
			   or the accelerometer happens to report.

			   Declared up here because drawOnce() needs `current` and runs
			   before any listener is attached. */
			const raw = { x: 0, y: 0, seen: false };
			const target = { x: 0, y: 0 };
			const current = { x: 0, y: 0 };

			/* Assigned after wake() exists, because the gyro needs to be able
			   to wake the loop - a tilt has to be able to start a frame the
			   same way a mouse move does. Declared here, above measure(), so
			   measure() can read it without a temporal dead zone. */
			let gyro: DeskGyro | null = null;

			const clampUnit = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);

			/* ---- MEASURE THE INPUT AGAINST THE STAGE AS IT IS *NOW* ----

			   THIS IS THE THIRD AND LAST HALF OF THE FIRST-LOAD BUG.

			   The listener is on WINDOW, so it keeps running while the section
			   is far below the fold, and target.y is expressed relative to the
			   sticky stage:

			     (clientY - stageTop) / innerHeight * 2 - 1

			   While the section is still off-screen, stageTop is a large
			   POSITIVE number - the stage can be two or three viewports down -
			   so a cursor resting anywhere over the hero produces target.y of
			   -4, -6, -8. Nothing clamped it, and nothing recomputed it, so the
			   moment the section scrolled into view wake() SNAPPED current to
			   that value and applied it as parallax:

			     stars   -6 * 31.5px    = ~190px of upward offset, times depth
			     laptop  -6 * 0.0473rad = ~16 deg of pitch

			   which is exactly the arrival state that looked "deformed": the
			   machine seen from below with its roll and tilt wrong, the
			   bottom-left star lifted a third of the frame, the top-right one
			   pushed clean out of it. The first cursor move recomputed target
			   with stageTop now 0, and everything snapped into place - hence
			   "broken until I wiggle the mouse".

			   So the deflection is derived from the LAST RAW CURSOR POSITION and
			   the CURRENT rect, on demand, and clamped to the -1..1 the whole
			   section is tuned against. Until the cursor has been seen at all,
			   the pointer reads as dead centre, which is the composed pose.

			   THE GYRO SHORT-CIRCUITS ALL OF THAT. Device tilt is already an
			   absolute, self-centring -1..1 with no relationship to where the
			   stage is on the page, so it needs no rect and cannot suffer the
			   bug above. It is also why the gyro branch is FIRST: on a phone
			   the pointer path below would otherwise run every frame and cost
			   a forced layout for a value that is about to be discarded. */
			const measure = () => {
				if (gyro?.isLive()) {
					const tilt = gyro.read();
					target.x = tilt.x;
					target.y = tilt.y;
					return;
				}

				if (!raw.seen) {
					target.x = 0;
					target.y = 0;
					return;
				}

				const rect = root.getBoundingClientRect();
				/* Measured against the sticky stage - one viewport - not against
				   the 340vh section, or the deflection would be a fraction of
				   what it should be near the middle. */
				const stageTop = Math.max(rect.top, 0);

				target.x = clampUnit((raw.x / Math.max(window.innerWidth, 1)) * 2 - 1);
				target.y = clampUnit(
					((raw.y - stageTop) / Math.max(window.innerHeight, 1)) * 2 - 1,
				);
			};

			/* ---- THE LOOP ----
			   Runs while the section is in view. It idles itself when the
			   pointer has settled and nothing is being dragged, because the
			   only thing left animating at that point is the idle float - which
			   is worth a frame, so the loop keeps going while visible but stops
			   dead the moment the section scrolls away.

			   See the declaration-order note at the top of the file: this block
			   must stay above ScrollTrigger.create(). */
			let visible = false;
			let frame = 0;
			let previous = performance.now();

			const tick = (now: number) => {
				const delta = Math.min((now - previous) / 1000, 0.05);
				previous = now;

				/* The gyro is a PULL source: its listener updates a value, it
				   does not push into `target`. So it has to be sampled each
				   frame. Cheap - a property read, no layout - which is exactly
				   why the branch order in measure() matters. The pointer is a
				   push source and is deliberately NOT re-measured here, because
				   its path costs a getBoundingClientRect(). */
				if (gyro?.isLive()) measure();

				current.x += (target.x - current.x) * tuning.parallax.ease;
				current.y += (target.y - current.y) * tuning.parallax.ease;

				setPx(current.x * tuning.parallax.stars);
				setPy(current.y * tuning.parallax.stars);
				scene.setPointer(current.x, current.y);

				scene.render(now / 1000, delta);

				frame = visible ? requestAnimationFrame(tick) : 0;
			};

			const wake = () => {
				if (frame || !visible) return;

				/* Re-measure BEFORE snapping. The stored target was last computed
				   against a rect that may be several viewports stale, and it is
				   about to be adopted wholesale by the line below. */
				measure();

				/* SNAP, DO NOT EASE, WHEN THE LOOP RESTARTS FROM PARKED.

				   The loop only ever parks while the section is OUT OF VIEW
				   (tick sets frame = 0 solely on !visible), but the pointer
				   listener is on WINDOW and keeps updating `target` the entire
				   time it is parked. `current` meanwhile sits wherever it was
				   left - 0,0 on a fresh load.

				   Starting the lerp from there replays that whole accumulated
				   difference ON SCREEN: at ease 0.075 it takes about a second
				   for both stars, the statement and the laptop's lean to slide
				   from the un-parallaxed rest pose into the cursor-correct one.
				   That is the 'everything is slightly moved on first arrival,
				   then the parallax kicks in and it fixes itself' bug. It only
				   showed once per load because afterwards current ~= target.

				   So converge while we are still the only ones who can see it.
				   This is NOT a shortcut around the smoothing - the lerp is
				   what makes the input feel weighted, and it still runs for
				   every move made while the section is on screen. */
				current.x = target.x;
				current.y = target.y;

				previous = performance.now();
				frame = requestAnimationFrame(tick);
			};

			/* ---- THE GYROSCOPE ----
			   Mobile only, and attached AFTER wake() exists so a tilt can
			   start a frame. Everything about why this can silently do nothing
			   - HTTPS, the iOS permission gesture, desktop browsers that own
			   the event but never fire it - is documented in lib/deskGyro.ts.
			   The pointer listener below stays attached regardless, as the
			   fallback for all of those cases. */
			if (tuning.isMobile) {
				gyro = createDeskGyro(wake);
			}

			/* Paint ONE frame with whatever the beats currently say, without
			   starting the loop and without caring whether the section is in
			   view. This is what keeps the canvas honest after a bounds change
			   while the loop is parked. If the loop is already running the next
			   rAF will draw anyway, so skip it and avoid a double render in the
			   same frame. */
			const drawOnce = () => {
				if (frame) return;
				/* Same reasoning as wake(): this single frame is painted with
				   whatever the input says, so re-derive it from the rect the
				   refresh just changed rather than trusting the old number. */
				measure();
				current.x = target.x;
				current.y = target.y;
				setPx(current.x * tuning.parallax.stars);
				setPy(current.y * tuning.parallax.stars);
				scene.setPointer(current.x, current.y);
				scene.render(performance.now() / 1000, 0);
			};

			const write = (progress: number) => {
				const arrive = beat(progress, DESK_BEATS.arrive);
				const displace = beat(progress, DESK_BEATS.displace);
				const exit = beat(progress, DESK_BEATS.exit);

				/* Eased for the DOM and the laptop alike. The Blender keyframes
				   are LINEAR on purpose so that ALL easing lives here, in one
				   place, and can be retimed without re-exporting the GLB. */
				const easedArrive = gsap.parseEase('power2.out')(arrive);
				const easedDisplace = gsap.parseEase('power2.inOut')(displace);
				const easedExit = gsap.parseEase('power2.in')(exit);

				setArrive(easedArrive);
				setDisplace(easedDisplace);
				setExit(easedExit);

				scene.setBeats({
					arrive: easedArrive,
					displace: easedDisplace,
					exit: easedExit,
				});
			};

			/* READS ONLY. No pin. See the note at the top of the file. */
			const trigger = ScrollTrigger.create({
				trigger: root,
				start: DESK_SCROLL.start,
				end: DESK_SCROLL.end,
				scrub: DESK_SCROLL.scrub,
				onUpdate: (self) => {
					write(self.progress);
					wake();
				},
				/* REWRITE AND REDRAW ON REFRESH. THIS IS WHY THE SECTION USED TO
				   ARRIVE BROKEN ON FIRST LOAD.

				   write() was called once at creation and then only ever from
				   onUpdate - that is, only on SCROLL. But the bounds this trigger
				   is measured against are wrong at creation time: HomeShell holds
				   the loader curtain up, Lenis is stopped, fonts have not swapped,
				   and the GLB has not landed. HomeShell calls ScrollTrigger.refresh()
				   when the curtain lifts, which recomputes start/end correctly -
				   but with no onRefresh here, NOTHING rewrote the beats afterwards.

				   drawOnce() is the other half, and the half that was still broken
				   after onRefresh was added: write() updates the DOM and the
				   scene's stored beats, but only tick() actually repaints the
				   canvas, and tick() is parked while the section is out of view.
				   Without the redraw the statement and stars corrected themselves
				   and the laptop stayed in its stale pose until a pointer move
				   happened to wake the loop.

				   Every other scrubbed section here already carries onRefresh:
				   useHeroToWorkCut, useWorkTitle, useRakeLight, useReduction and
				   useDevelop. The desk was the one that did not, and it is also
				   the only one with a canvas to keep in sync. Do not remove
				   either line. */
				invalidateOnRefresh: true,
				onRefresh: (self) => {
					write(self.progress);
					/* A refresh can change the answer to "is this section on
					   screen?" without onToggle firing - a reload that restores the
					   scroll position deep inside the section is measured as
					   inactive at creation and active immediately afterwards. Resync
					   here or the loop stays parked while the section is in view. */
					visible = self.isActive;
					if (visible) wake();
					drawOnce();
				},
				onToggle: (self) => {
					visible = self.isActive;
					if (visible) wake();
				},
			});

			visible = trigger.isActive;
			write(trigger.progress);
			drawOnce();

			/* Fonts swap AFTER first paint and the statement is set in two large
			   display faces, so the page above this section changes height when
			   they land - which moves where this section starts. useRakeLight
			   already guards against exactly this. Without it the first arrival
			   can be measured against pre-swap layout.

			   The refresh fires onRefresh above, which rewrites AND redraws, so
			   there is nothing extra to do here. */
			void document.fonts.ready.then(() => {
				ScrollTrigger.refresh();
			});

			const onPointerMove = (event: PointerEvent) => {
				/* Store the RAW cursor position only. Turning it into a -1..1
				   deflection is measure()'s job, because the answer depends on
				   where the stage is at the moment it is USED, not at the moment
				   the mouse happened to move.

				   Still attached on mobile. It is the fallback when the gyro
				   never becomes live, and measure() ignores it the moment tilt
				   data starts arriving, so there is no contest between them. */
				raw.x = event.clientX;
				raw.y = event.clientY;
				raw.seen = true;
				measure();
				wake();
			};

			/* ---- DRAG TO ROTATE ----
			   Pointer Events, so mouse / touch / pen are one code path. The
			   gesture is captured on the canvas, which means a drag that leaves
			   the canvas mid-swing keeps rotating instead of sticking - the
			   single most obvious tell of a half-built rotate control.

			   KEPT ON MOBILE, alongside the gyro. They add rather than
			   compete: the scene applies drag as an offset on top of the pose,
			   and tilt as a lean within it. It is also the only way to inspect
			   the machine if the motion permission was denied. */
			let dragging = false;
			let last = { x: 0, y: 0 };
			let travel = 0;

			const onDown = (event: PointerEvent) => {
				if (!event.isPrimary) return;
				dragging = true;
				travel = 0;
				last = { x: event.clientX, y: event.clientY };
				canvas.setPointerCapture(event.pointerId);
				canvas.dataset.deskDrag = 'true';
				wake();
			};

			const onMove = (event: PointerEvent) => {
				if (!dragging) return;
				const dx = event.clientX - last.x;
				const dy = event.clientY - last.y;
				last = { x: event.clientX, y: event.clientY };

				travel += Math.abs(dx) + Math.abs(dy);
				/* Below the threshold this is a click, not a drag. Without it a
				   plain click nudges the pose by a pixel or two of jitter. */
				if (travel < DESK_DRAG.threshold) return;

				/* Only now is this definitely a drag, so only now is it worth
				   suppressing the browser's own gesture handling. */
				event.preventDefault();
				scene.dragBy(dx, dy);
				wake();
			};

			const onUp = (event: PointerEvent) => {
				if (!dragging) return;
				dragging = false;
				scene.endDrag();
				delete canvas.dataset.deskDrag;
				if (canvas.hasPointerCapture(event.pointerId)) {
					canvas.releasePointerCapture(event.pointerId);
				}
				wake();
			};

			window.addEventListener('pointermove', onPointerMove, { passive: true });
			canvas.addEventListener('pointerdown', onDown);
			canvas.addEventListener('pointermove', onMove);
			canvas.addEventListener('pointerup', onUp);
			canvas.addEventListener('pointercancel', onUp);

			/* A resize changes the canvas backing store, so the frame on screen
			   is stale until something repaints it - the same parked-loop
			   problem as onRefresh. ScrollTrigger.refresh() runs on resize too
			   and will call drawOnce() via onRefresh, but resize also fires for
			   address-bar collapse on mobile where the bounds may not change,
			   so redraw here as well.

			   The tuning is re-resolved too, so a desktop window dragged
			   narrow picks up the mobile parallax amounts. Note it does NOT
			   retro-attach a gyroscope: that decision is made once per mount,
			   because a window resized past 768px on a desktop has no sensor
			   to attach and a phone cannot cross the boundary without a
			   rotation. */
			const onResize = () => {
				tuning = resolveDeskTuning(window.innerWidth);
				scene.resize();
				drawOnce();
			};
			window.addEventListener('resize', onResize);

			/* The GLB is a network fetch plus a Draco decode, so the first
			   frame worth drawing is not available synchronously. Draw one as
			   soon as it lands even if the section is out of view, so scrolling
			   back up never reveals an empty canvas. */
			scene.ready
				.then(() => {
					scene.resize();
					scene.render(performance.now() / 1000, 0);
					wake();
				})
				.catch(() => {
					/* Already reported by the scene. The DOM layers stay up, so the
					   stars and the statement still play - the section loses its
					   centrepiece but not its content. */
				});

			wake();

			return () => {
				if (frame) cancelAnimationFrame(frame);
				visible = false;
				gyro?.dispose();
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('resize', onResize);
				canvas.removeEventListener('pointerdown', onDown);
				canvas.removeEventListener('pointermove', onMove);
				canvas.removeEventListener('pointerup', onUp);
				canvas.removeEventListener('pointercancel', onUp);
			};
		}, root);

		return () => {
			ctx.revert();
			scene.dispose();
			delete root.dataset.deskState;
		};
	}, []);

	return { rootRef, canvasRef };
}

export default useDeskStage;
