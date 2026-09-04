import { useEffect, type RefObject } from 'react';

/* ------------------------------------------------------------------
   FOOTER WORDMARK REVEAL - "THE RISE"

   FAZ DIGITAL rises as ONE SOLID BLOCK from behind a clip edge as the
   footer comes into view, and RE-ARMS when the footer leaves, so it
   plays again on every return.

   WHY ONE BLOCK AND NOT PER-CHARACTER. Rebuilt after watching the
   reference clip frame by frame. In every frame of the rise, the top
   edges of all the letters sit on one straight horizontal line. A
   per-character stagger necessarily puts the letter tops on a visible
   diagonal. There is no diagonal in the reference, so there is no
   stagger. The mark is one heavy object being lifted into place, and
   the mass IS the effect.

   WHY THIS USES NO GSAP AND NO ScrollTrigger.

   It did, and it was invisible twice. SmoothScrollProvider's cleanup
   calls ScrollTrigger.getAll().forEach(t => t.kill()) - it destroys
   EVERY trigger in the application, not just its own. Under React
   Strict Mode in development, effects mount, unmount and remount, so
   that cleanup fires and takes this reveal's trigger with it. Every
   other animation in the codebase survives because they are created
   INSIDE that provider's own scan and are rebuilt with it. This one
   lived in the footer, so nothing recreated it: the trigger died, the
   tween never advanced, and the block stayed parked below its clip
   edge with no error logged anywhere.

   An IntersectionObserver is owned entirely by this component, so
   nothing else in the app can reach in and kill it. It is also the
   same mechanism already proving itself directly below this - the one
   that hides the header over the footer - so it is a known-good signal
   on this exact element.

   THE MOTION ITSELF IS CSS. A transition on an attribute this hook
   toggles keeps the animation on the compositor and off the main
   thread, so it cannot contend with Lenis's momentum for frames.

   IT REPLAYS, VIA HYSTERESIS. The observer does not disconnect after
   the first pass; it drives the attribute in both directions. But the
   reveal and the re-arm use DIFFERENT thresholds on purpose. With a
   single threshold, resting the scroll near it makes the mark flicker
   on every pixel of jitter - and with Lenis's inertia the scroll
   rarely comes to rest cleanly. Re-arming only once the footer is
   nearly gone leaves a wide dead zone where neither edge fires.

   RE-ARMING IS INSTANT, NOT ANIMATED. The reset suppresses its own
   transition, so the mark is never seen sinking back down: it cuts to
   hidden while off screen, ready to rise cleanly on the next visit.

   IT FAILS VISIBLE. The hook ARMS the hidden state itself. The
   stylesheet only hides the mark while that attribute is present, so
   if this hook never runs, or JS fails outright, the wordmark is
   simply there. Hiding by default and relying on JS to rescue it is
   fail-CLOSED, and that is exactly how this broke before.
   ------------------------------------------------------------------ */

/* Rise once 70% of the footer is in view.

   It was 0.99 - essentially "fully open" - which on a 100svh section
   means the rise could only begin at the very end of the scroll, after
   the mark itself was already on screen. You watched it arrive late.
   At 0.70 the mark is entering the frame as it lifts, which is the
   point of the gesture.

   The 0.99 also carried a real hazard worth remembering: a threshold
   that close to 1.0 is only reachable if the section is no taller than
   the viewport. A 100svh footer plus any margin, any dynamic toolbar,
   any sub-pixel rounding, and the ratio never arrives - the mark
   simply never rises, with nothing logged. 0.70 cannot be starved that
   way, which makes this both the better moment and the safer number.

   Still far above REARM_RATIO, so the hysteresis band below is intact. */
const REVEAL_RATIO = 0.7;

/* Re-arm only when the footer is nearly off screen. See the hysteresis
   note above - this gap is what stops the mark flickering. */
const REARM_RATIO = 0.08;

export function useFooterWordmarkReveal({
	rootRef,
	wordmarkRef,
}: {
	/* The footer section - what is observed. The wordmark itself is a
	   poor target: it sits near the bottom of a 100svh section, so it
	   would only cross the threshold once the footer was already fully
	   open and the moment had passed. */
	rootRef: RefObject<HTMLElement | null>;
	/* The block that moves. Used to confirm it is mounted before arming
	   the hidden state - the transform itself is CSS. */
	wordmarkRef: RefObject<HTMLElement | null>;
}) {
	useEffect(() => {
		const root = rootRef.current;
		const inner = wordmarkRef.current;
		if (!root || !inner) return;

		/* Reduced motion: never arm, so the mark is present and static. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		/* Arm the hidden resting state. The stylesheet does nothing until
		   this attribute exists - see the fail-visible note above. */
		root.dataset.wordmark = 'armed';

		const observer = new IntersectionObserver(
			(entries) => {
				/* Last entry, not first: a single callback can carry several
				   crossings on a fast flick, and only the newest is current. */
				const ratio = entries[entries.length - 1]?.intersectionRatio ?? 0;

				if (ratio >= REVEAL_RATIO) {
					root.dataset.wordmark = 'in';
					return;
				}

				if (ratio <= REARM_RATIO && root.dataset.wordmark === 'in') {
					/* Cut, do not animate, back to hidden. */
					root.dataset.wordmark = 'resetting';
					/* Force a style flush so the browser cannot collapse the
					   transition-less reset and the armed state into a single
					   recalculation - which would animate the reset after all. */
					void inner.offsetHeight;
					root.dataset.wordmark = 'armed';
				}
			},
			/* Both edges plus intermediate steps: without granular steps the
			   callback can skip the band entirely on a fast flick. */
			{ threshold: [0, REARM_RATIO, 0.2, 0.45, REVEAL_RATIO, 0.85, 1] },
		);
		observer.observe(root);

		return () => {
			observer.disconnect();
			/* Leave nothing armed-but-unrevealed behind on unmount. */
			delete root.dataset.wordmark;
		};
	}, [rootRef, wordmarkRef]);
}
