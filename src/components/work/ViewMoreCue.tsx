'use client';

/* ------------------------------------------------------------------
   THE VIEW MORE CUE

   A soft-cornered blob parked in the bottom-left corner of the
   viewport. Click it and the gallery opens; ignore it and it retires on
   its own.

   IT USED TO BE A PILL IN THE MIDDLE OF THE FRAME. That put a large
   plate over the work the visitor was still looking at, and however
   carefully it was staged it read as a popup - something interrupting,
   asking to be dealt with. The corner is where a persistent offer
   belongs: visible, ignorable, and never over the content.

   THIS COMPONENT OWNS NO LOGIC ABOUT WHETHER TO APPEAR. That is a
   question about scroll position and wheel intent, and the only thing
   holding the pinned ScrollTrigger is DitherCarousel - so the decision
   is made there and arrives here as one boolean. Same division as
   CardOpenCue.tsx.

   IT STAYS MOUNTED. Unmounting on `visible: false` would cut the exit
   off after a frame, which is the whole reason it reads as leaving
   rather than vanishing. It is always in the DOM and toggles a data
   attribute, and is taken out of the tab order while away (tabIndex -1
   plus pointer-events: none in CSS) so a keyboard user cannot land on
   an invisible button.

   THE SILHOUETTE IS FIXED AND NEVER MORPHS. It used to change shape
   on hover and on a slow keyframe loop, which is what made it look
   like it was breaking formation: the same element was drawing two
   different outlines depending on where the pointer was. There is now
   exactly one outline, and the only thing that ever changes is how it
   is STRETCHED.

   That stretch is the jelly, and it is sprung against scroll by the
   effect below - the part CSS cannot do. It is anchored at the corner
   the blob is stuck to, so the mass stays put and only the free edge
   moves.
   Styling lives in styles/work-gallery.css.
   ------------------------------------------------------------------ */

import React, { useEffect, useRef } from 'react';
import { WORK_CUE_COPY, WORK_CUE_MOTION } from '@/config/workGallery';

/* A spring, not a scroll offset.

   Mapping scrollY straight to a translate would glue the blob to the
   page and make it look like it had simply failed to be fixed. What
   reads as jelly is LAG: scrolling shoves it, and it catches up and
   overshoots slightly on its own. So scroll delta feeds a velocity,
   velocity is damped, and the whole thing is pulled back to rest -
   three numbers, tuned to be felt rather than seen.

   PUSH lower and it stops responding to a flick; DAMP higher and it
   oscillates like a spring toy; PULL lower and it drifts back too
   slowly and reads as broken sticky positioning. */
const PUSH = 0.32;
const DAMP = 0.82;
const PULL = 0.12;
/** Hard cap, in px, so a trackpad fling cannot throw it off screen. */
const MAX_DRIFT = 14;

/* THE STRETCH. Driven by the same velocity as the drift, because they are
   two symptoms of one impulse: a body shoved along its axis lags behind AND
   elongates. Deriving them separately would let them fall out of phase, and
   the illusion depends entirely on them being simultaneous.

   The counter-squash on the cross axis is volume preservation - the reason
   this reads as a soft solid rather than a picture being scaled. Without it
   the blob visibly gains area on every scroll. */
const STRETCH = 0.006;
const MAX_STRETCH = 0.09;
/** How much of the lengthwise stretch is paid back across the other axis. */
const POISSON = 0.55;

export default function ViewMoreCue({
	visible,
	onActivate,
}: {
	visible: boolean;
	onActivate: () => void;
}) {
	const rootRef = useRef<HTMLDivElement | null>(null);

	/* Runs only while the cue is on screen, so there is no permanent rAF
	   loop on the page - the offer retires itself after WORK_CUE_MOTION
	   .idleTimeout and this stops with it.

	   A custom property on the element rather than state: this writes
	   every frame, and a setState here would re-render sixty times a
	   second. Same reasoning as the refs feeding this cue in
	   DitherCarousel. */
	useEffect(() => {
		if (!visible) return;

		const el = rootRef.current;
		if (!el) return;

		/* Motion is the entire point of this effect, so when it is not
		   wanted the correct thing is to not run at all and leave the blob
		   at its resting offset. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let last = window.scrollY;
		let velocity = 0;
		let drift = 0;
		let frame = 0;

		const tick = () => {
			const y = window.scrollY;
			velocity += (y - last) * PUSH;
			last = y;

			velocity *= DAMP;
			drift += velocity;
			drift -= drift * PULL;
			drift = Math.max(-MAX_DRIFT, Math.min(MAX_DRIFT, drift));

			/* Signed, so scrolling down elongates downward and scrolling up
			   elongates upward - the blob leans the way the cards travel. */
			let stretch = velocity * STRETCH;
			stretch = Math.max(-MAX_STRETCH, Math.min(MAX_STRETCH, stretch));

			el.style.setProperty('--wc-drift', drift.toFixed(2) + 'px');
			el.style.setProperty('--wc-sy', (1 + stretch).toFixed(4));
			el.style.setProperty('--wc-sx', (1 - stretch * POISSON).toFixed(4));
			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			/* Removed rather than zeroed, so the CSS fallback owns the
			   resting value in one place. */
			el.style.removeProperty('--wc-drift');
			el.style.removeProperty('--wc-sy');
			el.style.removeProperty('--wc-sx');
		};
	}, [visible]);

	const vars = {
		'--wc-show': WORK_CUE_MOTION.showDuration + 'ms',
		'--wc-hide': WORK_CUE_MOTION.hideDuration + 'ms',
		'--wc-show-ease': WORK_CUE_MOTION.showEase,
		'--wc-hide-ease': WORK_CUE_MOTION.hideEase,
		'--wc-label-delay': WORK_CUE_MOTION.labelDelay + 'ms',
		'--wc-label-dur': WORK_CUE_MOTION.labelDuration + 'ms',
	} as React.CSSProperties;

	return (
		<div
			ref={rootRef}
			className="workcue"
			data-visible={visible ? 'true' : 'false'}
			style={vars}
		>
			<button
				type="button"
				className="workcue__pill"
				onClick={onActivate}
				tabIndex={visible ? 0 : -1}
				aria-hidden={!visible}
				aria-label={WORK_CUE_COPY.aria}
			>
				<span className="workcue__text">{WORK_CUE_COPY.label}</span>
			</button>
		</div>
	);
}
