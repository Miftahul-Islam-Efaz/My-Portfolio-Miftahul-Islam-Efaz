'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
	REDUCTION_EASE,
	REDUCTION_FIELD as F,
	REDUCTION_PROOF as P,
	REDUCTION_SCROLL as S,
	REDUCTION_STATEMENT as T,
	REDUCTION_THEME,
} from '../config/reduction';
import { REDUCTION_FRAGMENTS } from '../components/reduction/reductionData';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   THE REDUCTION - one pin, two owners

   OWNERSHIP IS THE WHOLE DESIGN OF THIS FILE. The fragment field is
   canvas, the statement and the proof columns are DOM, and they are
   driven by the same scroll progress through two different mechanisms:

     canvas  ->  read `progress` inside a rAF loop and repaint
     DOM     ->  two PAUSED timelines, scrubbed by `.progress()`

   Nothing here tweens the canvas and nothing repaints the DOM per
   frame. That split is what keeps the section cheap: the only per-frame
   work is one clearRect and ~32 fillText calls, and GSAP is left to do
   what it is good at on the text.

   WHY THE TIMELINES ARE SCRUBBED RATHER THAN PLAYED

   Scroll-driven, not time-driven. If the viewer scrolls back up, the
   sentence must come apart again - a played timeline would leave the
   statement assembled on a screen whose fragments are back to unstruck,
   which reads as a bug even though nothing errored.

   REDUCED MOTION

   Never arms. The stylesheet's defaults are the FINISHED state, so
   returning early leaves a fully readable section: statement set,
   proof columns visible, fragments drawn once at their struck alpha.
   That is the same contract the work intro reveal uses.
   ------------------------------------------------------------------ */

type Fragment = {
	text: string;
	real: boolean;
	/** Layout, in stage-relative units 0..1 so a resize is a re-measure
	 *  and not a re-layout. */
	nx: number;
	ny: number;
	size: number;
	/** When this fragment is struck, as a fraction of the strike window. */
	at: number;
};

/** Progress of `p` through the window [start, end], clamped to 0..1. */
const windowProgress = (p: number, start: number, end: number) =>
	gsap.utils.clamp(0, 1, (p - start) / (end - start));

/** Deterministic pseudo-random in 0..1. Seeded so the field is laid out
 *  identically on every load - a portfolio section that reshuffles on
 *  refresh cannot be art-directed, and cannot be screenshotted twice. */
const seeded = (i: number, salt: number) => {
	const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
	return x - Math.floor(x);
};

export function useReduction({
	rootRef,
	stageRef,
	canvasRef,
}: {
	rootRef: RefObject<HTMLElement | null>;
	stageRef: RefObject<HTMLElement | null>;
	canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
	useEffect(() => {
		const root = rootRef.current;
		const stage = stageRef.current;
		const canvas = canvasRef.current;
		if (!root || !stage || !canvas) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// Arm only once motion is known to be allowed, so CSS never hides the
		// copy on its own.
		root.dataset.reductionState = 'armed';

		const context = canvas.getContext('2d');
		if (!context) return;
		const ctx = context;

		let progress = 0;
		let frame = 0;
		let width = 0;
		let height = 0;
		let fragments: Fragment[] = [];

		/* ---------------- layout ---------------- */

		const layout = () => {
			const rect = stage.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);

			width = rect.width;
			height = rect.height;
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			// One column on narrow screens: four columns of 11px type on a
			// phone is unreadable noise rather than legible noise.
			const columns = width < 720 ? 2 : F.columns;
			const rows = Math.ceil(REDUCTION_FRAGMENTS.length / columns);
			const scale = gsap.utils.clamp(0.78, 1.15, width / 1440);

			fragments = REDUCTION_FRAGMENTS.map((fragment, i) => {
				const column = i % columns;
				const row = Math.floor(i / columns);

				// Jittered grid: even spread, no clumping, no grid look.
				const jx = (seeded(i, 1) - 0.5) * F.jitter;
				const jy = (seeded(i, 2) - 0.5) * F.jitter;

				return {
					text: fragment.text,
					real: Boolean(fragment.real),
					nx: (column + 0.5 + jx) / columns,
					ny: (row + 0.5 + jy) / rows,
					size:
						(F.sizeMin + seeded(i, 3) * (F.sizeMax - F.sizeMin)) * scale,
					// List order drives strike order, so the four real decisions
					// (first in the data file) are struck first.
					at: i / REDUCTION_FRAGMENTS.length,
				};
			});
		};

		/* ---------------- paint ---------------- */

		const paint = () => {
			ctx.clearRect(0, 0, width, height);

			const strike = windowProgress(progress, S.strike.start, S.strike.end);
			const drift = progress * F.drift;

			// Each fragment owns a slice of the strike window. `spread` is how
			// much of the window one strike occupies - without it every rule
			// would draw at once at the end.
			const spread = F.strikeDuration / REDUCTION_FRAGMENTS.length + 0.04;

			for (const fragment of fragments) {
				const local = gsap.utils.clamp(
					0,
					1,
					(strike - fragment.at * (1 - spread)) / spread
				);

				const x = fragment.nx * width;
				const y = fragment.ny * height + drift;

				ctx.font = `${fragment.size}px "IBM Plex Mono", ui-monospace, monospace`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				// Ink fades toward - never to - nothing. What was rejected stays
				// faintly legible, which is the difference between an argument
				// and a magic trick.
				const alpha = gsap.utils.interpolate(
					F.inkAlpha,
					F.struckAlpha,
					local
				);
				ctx.globalAlpha = alpha;
				ctx.fillStyle = REDUCTION_THEME.ink;
				ctx.fillText(fragment.text, x, y);

				if (local <= 0) continue;

				// The rule. Drawn from the text's own measured width so it fits
				// the phrase rather than the grid cell.
				const measured = ctx.measureText(fragment.text).width;
				const half = measured / 2 + F.ruleOverhang;

				ctx.globalAlpha = gsap.utils.clamp(0, 1, local) * 0.9;
				ctx.strokeStyle = REDUCTION_THEME.ember;
				ctx.lineWidth = fragment.real ? F.ruleWidth * 1.8 : F.ruleWidth;
				ctx.beginPath();
				ctx.moveTo(x - half, y);
				ctx.lineTo(x - half + half * 2 * local, y);
				ctx.stroke();
			}

			ctx.globalAlpha = 1;
		};

		/* ---------------- DOM timelines ---------------- */

		const ctxGsap = gsap.context(() => {
			const q = gsap.utils.selector(root);

			const words = q('[data-reduction="word"]');
			const underline = q('[data-reduction="underline"]');
			const columns = q('[data-reduction="column"]');
			const rules = q('[data-reduction="rule"]');
			const signoff = q('[data-reduction="signoff"]');

			const statementTl = gsap.timeline({ paused: true });

			if (words.length) {
				statementTl.fromTo(
					words,
					{ yPercent: T.riseFrom, opacity: 0, letterSpacing: `${T.spacingFrom}em` },
					{
						yPercent: 0,
						opacity: 1,
						letterSpacing: '0em',
						duration: T.duration,
						ease: REDUCTION_EASE,
						stagger: T.stagger,
						force3D: true,
					},
					0
				);
			}

			if (underline.length) {
				statementTl.fromTo(
					underline,
					{ scaleX: 0 },
					{
						scaleX: 1,
						duration: T.underlineDuration,
						ease: REDUCTION_EASE,
						transformOrigin: 'left center',
					},
					T.underlineDelay
				);
			}

			const proofTl = gsap.timeline({ paused: true });

			if (columns.length) {
				proofTl.fromTo(
					columns,
					{ y: P.rise, opacity: 0 },
					{
						y: 0,
						opacity: 1,
						duration: P.duration,
						ease: REDUCTION_EASE,
						stagger: P.stagger,
						force3D: true,
					},
					0
				);
			}

			if (rules.length) {
				proofTl.fromTo(
					rules,
					{ scaleX: 0 },
					{
						scaleX: 1,
						duration: P.ruleDuration,
						ease: 'none',
						stagger: P.stagger,
						transformOrigin: 'left center',
					},
					0
				);
			}

			if (signoff.length) {
				proofTl.fromTo(
					signoff,
					{ y: P.rise * 0.6, opacity: 0 },
					{
						y: 0,
						opacity: 1,
						duration: P.duration,
						ease: REDUCTION_EASE,
						stagger: P.stagger * 0.7,
					},
					P.signoffDelay
				);
			}

			/* ---------------- the pin ---------------- */

			layout();
			paint();

			const trigger = ScrollTrigger.create({
				trigger: root,
				start: 'top top',
				end: () => `+=${Math.round(window.innerHeight * S.vhPerScreen)}`,
				pin: stage,
				pinSpacing: true,
				// transform, matching the carousel: `fixed` pinning and Lenis
				// disagree about who owns the scroll position.
				pinType: 'transform',
				anticipatePin: 1,
				invalidateOnRefresh: true,
				onRefresh: () => {
					layout();
					paint();
				},
				onUpdate: (self) => {
					progress = self.progress;

					statementTl.progress(
						windowProgress(progress, S.assemble.start, S.assemble.end)
					);
					proofTl.progress(
						windowProgress(progress, S.proof.start, S.proof.end)
					);
				},
			});

			// Repaint only while the pin is anywhere near the viewport. The
			// field is cheap, but not free, and it must not burn frames while
			// the viewer is three sections away.
			const tick = () => {
				if (trigger.isActive || Math.abs(progress) > 0.0001) paint();
				frame = window.requestAnimationFrame(tick);
			};
			frame = window.requestAnimationFrame(tick);

			ScrollTrigger.refresh();
		}, root);

		const onResize = () => {
			layout();
			paint();
		};
		window.addEventListener('resize', onResize);

		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
			ctxGsap.revert();
			delete root.dataset.reductionState;
		};
	}, [rootRef, stageRef, canvasRef]);
}

export default useReduction;
