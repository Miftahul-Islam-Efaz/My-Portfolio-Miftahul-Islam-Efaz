'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { RAKE_BREAKPOINT, resolveRakeTuning } from '../config/rakeLight';
import {
	createRakeScene,
	type RakeScene,
} from '../components/rake/gl/scene';

gsap.registerPlugin(ScrollTrigger);

/* ==================================================================
   IGNORE MOBILE RESIZE. THIS IS THE FIX FOR THE SCROLL JUMP.

   On iOS and Android, scrolling collapses and expands the URL bar, and
   the browser reports that as a `resize` - repeatedly, mid-scroll,
   exactly while the visitor is moving through this pinned section.

   ScrollTrigger has its OWN resize listener, independent of anything
   this hook does, and its response is a full refresh: re-measure every
   trigger, recompute every pin's start and end. This section's `end` was
   a function of `window.innerHeight`, so each of those refreshes
   RECOMPUTED THE LENGTH OF THE PIN while the visitor was inside it. The
   pin got longer or shorter under them, and since pinSpacing pushes the
   whole rest of the document down, everything below jumped - which is
   what "the rake section jumps when I scroll on mobile" is.

   The height-only resize guard added for the canvas did not help,
   because that guard is on OUR listener. GSAP's was still firing.

   `ignoreMobileResize` tells ScrollTrigger to skip refreshes caused by a
   viewport height change on touch devices - i.e. exactly the browser
   chrome case - while still refreshing on rotation and on real width
   changes. Combined with the cached pin height below, the pin's length
   becomes immune to the URL bar.

   THIS IS A GLOBAL SETTING. It is set here because this is the section
   that suffers most (it is the earliest pin, so every trigger below it
   inherits the shift), but it applies to the whole page and that is
   wanted - the desk, the carousel and the footer all measure against the
   same document. Do not set it to false anywhere else.
   ================================================================== */
ScrollTrigger.config({ ignoreMobileResize: true });

/* ------------------------------------------------------------------
   THE RAKE - scroll wiring

   This hook does exactly three things: pin the stage, convert scroll
   progress into a light position, and run the render loop only while
   the section is on screen.

   THERE ARE NO TIMELINES HERE, and that is the point of the concept.
   Scroll moves a light; everything visible is a consequence of where
   that light is. Nothing to keep in sync, nothing to scrub backwards,
   no dead frames between phases.

   THE LOOP IS GATED. `isActive` comes from ScrollTrigger's own toggle,
   so the shader is not burning frames on a viewer three sections away.
   The grain is animated, so the loop cannot be progress-driven only -
   it has to run while visible and stop when not.

   REDUCED MOTION: never starts. The DOM copy in RakeSection is the
   fallback and is already readable, so returning early leaves a plain,
   legible statement rather than a black rectangle.
   ------------------------------------------------------------------ */

/* REFRESH ORDER IS LOAD-BEARING - DO NOT DROP THIS.

   This is a pinned section, and pinSpacing inserts roughly two and a
   half viewport heights into the document ABOVE the work carousel. Any
   trigger further down the page therefore measures a start position
   that only exists once this pin has been measured.

   ScrollTrigger refreshes in DESCENDING refreshPriority, so an earlier
   pin needs a HIGHER number than everything below it. DitherCarousel
   uses 1 for exactly this reason, so this has to beat it - shipping
   this trigger at the default 0 let the carousel measure against a
   document that was still 2.1 screens shorter than it would be, and the
   helix pinned at the wrong offset and rendered nothing at all.

   If another pinned section is ever added above this one, it needs a
   number higher again. */
const RAKE_REFRESH_PRIORITY = 2;

/* Resize work is not cheap - it redraws both type masks and reallocates
   the drawing buffer - and mobile browsers fire resize in bursts while
   the URL bar animates. */
const RESIZE_SETTLE_MS = 120;

export function useRakeLight({
	rootRef,
	stageRef,
	canvasRef,
}: {
	rootRef: RefObject<HTMLElement | null>;
	stageRef: RefObject<HTMLDivElement | null>;
	canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
	useEffect(() => {
		const root = rootRef.current;
		const stage = stageRef.current;
		const canvas = canvasRef.current;
		if (!root || !stage || !canvas) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let scene: RakeScene | null = null;
		try {
			scene = createRakeScene(canvas);
		} catch {
			scene = null;
		}

		// No WebGL, or the context was refused. Leave the DOM fallback up.
		if (!scene) return;
		const active = scene;

		// Only now is the shader definitely running, so only now is it safe
		// to hide the DOM copy.
		root.dataset.rakeState = 'live';

		let frame = 0;
		let isActive = false;
		let start = 0;

		/* ------------------------------------------------------------------
		   THE PIN LENGTH IS MEASURED ONCE, NOT READ PER REFRESH

		   `end` used to evaluate `window.innerHeight` every time it was
		   called, which is every refresh. On a phone that number changes by
		   60-100px as the URL bar collapses, so the pin's length changed
		   underneath the visitor mid-sweep - see the ignoreMobileResize note
		   at the top of this file. That is the jump.

		   Caching it here means the sweep length is decided by a DELIBERATE
		   re-measure - a width change, a breakpoint crossing, or a rotation -
		   and never by browser chrome. The value is still resolved through
		   the tuning resolver, so mobile keeps its shorter sweep.

		   Read at effect time, which is after layout, so this is the real
		   viewport height and not a server guess. ------------------------- */
		let pinHeight = window.innerHeight;

		/* Decided ONCE, here, because pinType and anticipatePin are baked in
		   at trigger creation - ScrollTrigger.refresh() will not revisit
		   them. A visitor who rotates a phone across the 768px boundary
		   keeps the pinning mode they arrived with. That is an accepted
		   limit: rebuilding the trigger on rotation would mean tearing down
		   and recreating a pin that every trigger below this one measures
		   against, which is a worse failure than a slightly non-ideal pin
		   mode in a rare case. If it ever matters, the idiomatic fix is
		   gsap.matchMedia() rather than a manual rebuild. */
		const isMobile = window.innerWidth <= RAKE_BREAKPOINT;

		// Fonts decide the mask layout. Redraw once they land, or the first
		// paint measures fallback metrics and the type sits wrong.
		if (document.fonts?.ready) {
			void document.fonts.ready.then(() => {
				active.resize();
				ScrollTrigger.refresh();
			});
		}

		const trigger = ScrollTrigger.create({
			trigger: root,
			start: 'top top',
			/* Resolved per refresh so a breakpoint crossing re-measures
			   against the right sweep length, but against the CACHED height
			   rather than the live one.

			   Mobile gets a shorter sweep: a thumb swipe moves far less
			   document than a wheel gesture, so desktop's 2.1 screens of
			   pinned scroll reads as the page having jammed. See
			   RAKE_MOBILE.scroll in config/rakeLight.ts. */
			end: () => {
				const { scroll } = resolveRakeTuning(window.innerWidth);
				return `+=${Math.round(pinHeight * scroll.vhPerScreen)}`;
			},
			pin: stage,
			pinSpacing: true,
			/* ---- PIN TYPE: THE SECOND HALF OF THE JUMP ----

			   DESKTOP - 'transform'. Matches the work carousel. Lenis owns
			   the scroll position on desktop, and `position: fixed` pinning
			   disagrees with it about who is moving the page, which shows up
			   as the pinned stage sliding against the content around it.

			   MOBILE - 'fixed'. Lenis is NOT installed at or below 768px
			   (SmoothScrollProvider checks SMOOTH_SCROLL.mobileMaxWidth and
			   only attaches a passive scroll listener), so the reason for
			   'transform' does not exist here - and 'transform' is actively
			   worse on native momentum scroll. It repositions the stage by
			   writing a transform from a scroll event, and on iOS those
			   events are delivered behind the compositor during a momentum
			   fling, so the stage visibly lags the finger and then catches
			   up. 'fixed' takes the element out of the scroll flow entirely
			   and costs nothing per frame.

			   IF THE MOBILE PIN EVER MISBEHAVES AGAIN, THIS IS THE LINE TO
			   FLIP FIRST - the two modes fail in opposite, recognisable ways:
			   'transform' lags and catches up, 'fixed' can flicker at the
			   pin boundary. */
			pinType: isMobile ? 'fixed' : 'transform',
			/* anticipatePin pins a fraction of a frame EARLY to hide the
			   flash of an unpinned element on fast wheel scrolling. That
			   trade is wrong on touch: there is no wheel, and moving the pin
			   boundary off the actual scroll position is itself a small jump
			   at the top and bottom of the sweep. */
			anticipatePin: isMobile ? 0 : 1,
			invalidateOnRefresh: true,
			// See the note above - this must stay higher than every pinned
			// trigger below it in the document.
			refreshPriority: RAKE_REFRESH_PRIORITY,
			onRefresh: (self) => {
				active.resize();
				active.setProgress(self.progress);
			},
			onUpdate: (self) => {
				active.setProgress(self.progress);
			},
			onToggle: (self) => {
				isActive = self.isActive;
			},
		});

		const tick = (now: number) => {
			if (!start) start = now;
			if (isActive) active.render((now - start) / 1000);
			frame = window.requestAnimationFrame(tick);
		};
		frame = window.requestAnimationFrame(tick);

		// One frame immediately, so the section is never an empty canvas
		// while it waits to become active.
		active.setProgress(trigger.progress);
		active.render(0);

		/* ------------------------------------------------------------------
		   RESIZE - AND WHY HEIGHT-ONLY CHANGES ARE IGNORED

		   Same reasoning as ignoreMobileResize above, applied to the canvas
		   rather than to the trigger. The URL bar fires `resize` with a
		   CHANGED HEIGHT and an unchanged width, repeatedly, mid-sweep:

		     - .rake__stage is sized in svh, so the stage did NOT resize.
		       There is nothing to re-measure.
		     - resize() reallocates the drawing buffer and redraws both type
		       masks, which is the most expensive thing this section can do,
		       on the weakest hardware it runs on, at the worst moment.

		   So: width is the trigger, plus an explicit breakpoint check for
		   the desktop <-> portrait case, plus orientationchange below, which
		   is a real geometry change that may report the same width.
		   ------------------------------------------------------------------ */
		let lastWidth = window.innerWidth;
		let lastIsMobile = isMobile;
		let settle = 0;

		const remeasure = (refreshTriggers: boolean) => {
			active.resize();
			active.render(0);
			/* Only when the SWEEP LENGTH changed. Re-cache the height in the
			   same breath: this is the deliberate re-measure the cache exists
			   to wait for, so it is the one place the pin is allowed to
			   change length. */
			if (refreshTriggers) {
				pinHeight = window.innerHeight;
				ScrollTrigger.refresh();
			}
		};

		const onResize = () => {
			const width = window.innerWidth;
			const nowMobile = width <= RAKE_BREAKPOINT;
			if (width === lastWidth && nowMobile === lastIsMobile) return;

			/* A width change on desktop is a real window resize and the pin
			   length should follow it. On mobile the width only changes on
			   rotation, which is handled below. */
			const lengthChanged = nowMobile !== lastIsMobile || !nowMobile;
			lastWidth = width;
			lastIsMobile = nowMobile;

			window.clearTimeout(settle);
			settle = window.setTimeout(
				() => remeasure(lengthChanged),
				RESIZE_SETTLE_MS,
			);
		};

		/* Rotation is a genuine geometry change and can land on the same
		   innerWidth (a square-ish tablet, or a resize event that beats the
		   metrics update), so it bypasses the width guard. Deferred because
		   the viewport is not final on the event itself. */
		const onOrientation = () => {
			window.clearTimeout(settle);
			settle = window.setTimeout(() => {
				lastWidth = window.innerWidth;
				lastIsMobile = window.innerWidth <= RAKE_BREAKPOINT;
				remeasure(true);
			}, RESIZE_SETTLE_MS * 2);
		};

		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onOrientation);

		ScrollTrigger.refresh();

		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(settle);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onOrientation);
			trigger.kill();
			active.dispose();
			delete root.dataset.rakeState;
		};
	}, [rootRef, stageRef, canvasRef]);
}

export default useRakeLight;
