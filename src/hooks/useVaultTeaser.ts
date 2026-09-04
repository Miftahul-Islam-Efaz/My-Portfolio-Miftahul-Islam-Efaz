'use client';

import { useEffect } from 'react';
import type React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
	VAULT_DUST,
	VAULT_GLOW,
	VAULT_INERTIA,
	VAULT_PARALLAX,
	VAULT_SCROLL,
	VAULT_STAGE,
} from '@/config/vault';
import { resolveVaultTuning } from '@/config/vaultTeaserMobile';
import { VAULT_FOLDER_FLIGHT } from '@/components/vault/vaultContent';
import { setVaultMouth } from '@/lib/vaultOrigin';
/* Mobile-only presentation for this section. Every rule inside it is
   behind a max-width media query, so this import is inert on desktop. */
import '../styles/vault-teaser-mobile.css';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   THE VAULT TEASER - motion

   All of the section's behaviour. The component is markup only and
   every number lives in config/vault.ts, with the mobile overrides in
   config/vaultTeaserMobile.ts.

   ---------------------------------------------------------------
   HOW THIS IS PUT TOGETHER, AND WHY

   1. SCROLL IS A TARGET, NOT A POSITION.
      ScrollTrigger writes `target`. A damped spring chases it in the
      rAF loop and the DRAWN state comes from the spring, never from
      scroll directly. This one indirection is the difference between
      "correct" and "alive": the hand lags the wheel slightly, keeps
      travelling for a few frames after the wheel stops, and overshoots
      once as it lands. Mapping layout straight off progress - the
      obvious implementation - is what feels static, because the frame
      is only ever exactly where the scrollbar says and has no history.
      Tuned in VAULT_INERTIA.

   2. THE HAND IS HANDED TO YOU.
      It travels a 2D arc from off-frame bottom-left, unwinding a wrist
      tilt and growing slightly as it comes. Not a horizontal slide.

   3. LAYOUT IS A PURE FUNCTION OF TWO NUMBERS.
      apply(p) fully determines the frame from the spring's position and
      the smoothed pointer. Nothing accumulates, so scrubbing backwards
      is exact and there are no tweens to fight.

   4. NO PIN.
      The stage is CSS-sticky inside a tall section and ScrollTrigger is
      used purely as a progress meter. The work section above already
      pins; a second pin-spacer in the same document is where the
      measurement bugs come from.

   5. THE SAND LEAVES A SLIT, NOT A POINT.
      Emitting every grain from one coordinate is what made the cloud
      look like it came from a pinhole hovering near the folder rather
      than out of the folder itself - no amount of extra spread fixes
      that, because a wide cone from a point still converges to a point
      at the source. So the emitter is a LINE SEGMENT lying along the
      folder's lip: as wide as the opening, and rotated with the hand so
      it stays on the lip through the whole swing. See `lip` in apply.

   6. THE MOUTH IS COMPUTED, NOT GUESSED.
      Folders, glow and sand all originate from the folder's lit
      opening, and that point is derived through the hand's live
      transform each frame - so it stays glued to the opening while the
      hand rotates, scales and travels. Everything is computed in STAGE
      space rather than parented to the hand, otherwise the folders
      would inherit the wrist rotation and fan with it.

   7. CURSOR PARALLAX IS A SECOND, INDEPENDENT INPUT.
      The pointer's offset from the stage centre is smoothed on its own
      and added per layer, by different amounts, AFTER the scroll layout
      has been computed. Keeping the two inputs separate is what lets
      the frame respond to the mouse while the page is completely still.

      The glow and the sand do NOT get their own parallax amount - they
      are locked to the hand's, because they are emitted BY the folder.
      The sand is offset by translating the WHOLE CANVAS rather than by
      moving the grains: the grains are spawned in stage space and live
      for seconds, so shifting the emitter alone would leave everything
      already in flight behind and tear the plume apart.

   8. ON MOBILE, THE REST POSITION IS SOLVED RATHER THAN CONFIGURED.
      VAULT_SCROLL.handToX/handToY are fractions of the stage that were
      chosen against a desktop frame, and they stop meaning anything
      once VAULT_STAGE.handMinWidth forces the hand wider than the
      viewport - which it does on every phone. So below the breakpoint
      the hand's resting offset is derived from where the MOUTH should
      land instead. Full arithmetic and the failure it fixes are in
      config/vaultTeaserMobile.ts; the solve itself is in `measure`.
   ---------------------------------------------------------------
   ------------------------------------------------------------------ */

type VaultTeaserRefs = {
	rootRef: React.RefObject<HTMLElement | null>;
	stageRef: React.RefObject<HTMLDivElement | null>;
	handRef: React.RefObject<HTMLDivElement | null>;
	glowRef: React.RefObject<HTMLDivElement | null>;
	hazeRef: React.RefObject<HTMLDivElement | null>;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	folderRefs: React.MutableRefObject<Array<HTMLImageElement | null>>;
};

const clamp = (v: number, min: number, max: number) =>
	v < min ? min : v > max ? max : v;
const clamp01 = (v: number) => clamp(v, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hard deceleration - the arm decelerates into place rather than
 *  sliding to a stop at constant speed. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const DEG = Math.PI / 180;

export const useVaultTeaser = ({
	rootRef,
	stageRef,
	handRef,
	glowRef,
	hazeRef,
	canvasRef,
	folderRefs,
}: VaultTeaserRefs) => {
	useEffect(() => {
		const root = rootRef.current;
		const stage = stageRef.current;
		const hand = handRef.current;
		const glow = glowRef.current;
		const haze = hazeRef.current;
		const canvas = canvasRef.current;
		if (!root || !stage || !hand || !glow || !haze || !canvas) return;

		const handImg = hand.querySelector<HTMLImageElement>(
			'.vault-teaser__hand-img'
		);
		const ctx = canvas.getContext('2d');
		if (!handImg || !ctx) return;

		/* THE CAPTION.

		   Queried rather than handed in as a ref, matching how the resting
		   hand frame above is resolved. Optional on purpose: the copy is not
		   load-bearing for the animation, so a markup change that renames it
		   should leave the section working rather than returning early and
		   killing the whole scene.

		   WHY THE HOOK PLACES IT AT ALL. It used to carry an inline
		   `top: 90%` written by the component from VAULT_LAYOUT.cueY, and an
		   inline style cannot be overridden from a stylesheet at any
		   specificity - so the mobile sheet had no way to move it. The
		   component no longer sets it and this does, which also puts it
		   under the same rule as every other position in this section:
		   measured values are written by the hook, static presentation lives
		   in CSS. React never writes to this element's style attribute now,
		   so these values survive re-renders on press. */
		const cue = root.querySelector<HTMLElement>('.vault-teaser__cue');

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
			.matches;
		/* Parallax is pointer-only. On a touch screen there is no hover
		   state to track, and binding it to touch would fight the scroll. */
		const canHover = window.matchMedia('(hover: hover)').matches;

		/* ---------------- measurement ---------------- */

		let W = 0;
		let H = 0;
		let dpr = 1;
		let handW = 0;
		let handH = 0;
		let handTop = 0;
		let folderSize = 0;

		/* Resolved in `measure`, so a resize across the breakpoint reframes
		   instead of keeping whichever branch was current at mount. */
		let tuning = resolveVaultTuning(window.innerWidth);

		/* ============================================================
		   EVERY ONE OF THESE IS ANNOTATED `: number`, AND HAS TO BE.

		   config/vault.ts is declared `as const`, so VAULT_SCROLL.handTilt
		   has the literal type `15` rather than `number`. A property access
		   on a const-asserted object is not a FRESH literal, and `let` only
		   widens fresh ones - so `let tiltDeg = VAULT_SCROLL.handTilt`
		   declares a variable of type `15`, which can never hold anything
		   else. These exist precisely to hold a different value per
		   viewport, so inference produces the exact opposite of what is
		   wanted, and every mobile assignment below is a type error.

		   Caught by tsc rather than at runtime, and worth stating because
		   the failure is invisible at the declaration site: it reads like an
		   ordinary default.
		   ============================================================ */

		/* The swing, resolved per viewport. On desktop these are copied
		   straight out of VAULT_SCROLL and nothing changes; on mobile the
		   two rest values are SOLVED and the rest are the mobile swing. */
		let restX: number = VAULT_SCROLL.handToX;
		let restY: number = VAULT_SCROLL.handToY;
		let fromX: number = VAULT_SCROLL.handFromX;
		let fromY: number = VAULT_SCROLL.handFromY;
		let tiltDeg: number = VAULT_SCROLL.handTilt;
		let scaleFrom: number = VAULT_SCROLL.handScaleFrom;
		let settleAt: number = VAULT_SCROLL.handSettleAt;
		let settleDrift: number = VAULT_SCROLL.handSettleDrift;

		/* ============================================================
		   THE EMISSION SCALE.

		   Every quantity belonging to the folder's emission - the glow and
		   haze sizes, the haze offset, the sand's spread, speeds,
		   spreadAccel and buoyancy, and the escaping folders' flight
		   distances - is expressed as a fraction of STAGE WIDTH. That is
		   only correct while the folder itself is a fixed fraction of stage
		   width, which it is on desktop (handWidth 1.06) and is emphatically
		   not on mobile (1.9, clamped).

		   Left uncorrected, a phone would get a folder filling 60% of the
		   frame emitting a glow sized for one filling 34% - light and sand
		   detached from their own source, which is the same class of defect
		   as the mouth being mismeasured.

		   So this is the ratio between how big the hand actually is and how
		   big config/vault.ts assumes it is. It is COMPUTED rather than
		   configured, so it cannot drift when handWidth is retuned.

		   DELIBERATELY 1 ON DESKTOP. The same correction would arguably
		   improve a >1980px window, where handMaxWidth starts clamping and
		   the same disproportion appears in miniature - but the desktop
		   composition is signed off, and silently rescaling its light and
		   sand is not a change anyone asked for. Gated on isMobile.

		   lipLen is NOT scaled here: it is already a fraction of handW
		   rather than of W, so it tracks the folder correctly on its own.
		   ============================================================ */
		let emissionScale = 1;

		/* Sand budget, resolved per viewport - see the density note in
		   config/vaultTeaserMobile.ts. */
		let liveMax: number = VAULT_DUST.max;
		let dustRate: number = VAULT_DUST.rate;
		let dustSizeMin: number = VAULT_DUST.sizeMin;
		let dustSizeMax: number = VAULT_DUST.sizeMax;

		/* Read off the decoded bitmap rather than hardcoded, so re-exporting
		   the PNG at a different crop cannot silently move the mouth. */
		const aspect = () =>
			handImg.naturalWidth && handImg.naturalHeight
				? handImg.naturalWidth / handImg.naturalHeight
				: 16 / 9;

		const measure = () => {
			const rect = stage.getBoundingClientRect();
			W = rect.width;
			H = rect.height;

			tuning = resolveVaultTuning(window.innerWidth);
			const frame = tuning.frame;
			const dust = tuning.dust;

			/* THE SCROLL BUDGET, expressed once in config as a multiple of
			   viewport height. The stylesheets carry the same value as a
			   static default so there is no layout shift before this runs.

			   SKIPPED ENTIRELY UNDER REDUCED MOTION, and that is a fix rather
			   than a tidy-up: this used to be written unconditionally, which
			   meant the inline value beat the base stylesheet's
			   `@media (prefers-reduced-motion: reduce) { height: 100vh }` at
			   every specificity. A reduced-motion visitor was given the full
			   2.8 screens of scroll for an animation the hook had already
			   decided not to play - that media query has never once taken
			   effect. Leaving the property unset is what lets CSS own it. */
			if (!reduced) {
				root.style.height = `${tuning.vhPerScreen * 100}vh`;
			}

			dpr = Math.min(window.devicePixelRatio || 1, dust ? dust.dprCap : 2);

			liveMax = dust ? dust.max : VAULT_DUST.max;
			dustRate = dust ? dust.rate : VAULT_DUST.rate;
			dustSizeMin = dust ? dust.sizeMin : VAULT_DUST.sizeMin;
			dustSizeMax = dust ? dust.sizeMax : VAULT_DUST.sizeMax;

			handW = clamp(
				W * (frame ? frame.handWidth : VAULT_STAGE.handWidth),
				frame ? frame.handMinWidth : VAULT_STAGE.handMinWidth,
				frame ? frame.handMaxWidth : VAULT_STAGE.handMaxWidth
			);
			handH = handW / aspect();
			handTop = (H - handH) / 2;

			/* ---- the rest position ---- */
			if (frame && tuning.swing && W > 0 && H > 0) {
				const swing = tuning.swing;

				/* SOLVE FOR THE MOUTH. At rest the hand is unrotated and
				   unscaled, so the mouth sits at

				     mouthX = restX * W + mouth.x * handW

				   and putting that at `frame.mouthX * W` gives the offset
				   below. Vertically the hand is centred in the stage by
				   handTop before its own translate is applied, so that term
				   has to come out too.

				   Both are independent of the asset's aspect ratio, because
				   handH and handTop are measured from the decoded bitmap -
				   the same guarantee the mouth already had. */
				restX = frame.mouthX - (VAULT_STAGE.mouth.x * handW) / W;
				restY =
					(frame.mouthY * H - handTop - VAULT_STAGE.mouth.y * handH) / H;

				/* The arc is expressed as travel FROM the solved rest
				   position, so it keeps its length whatever the solve
				   returns. A hardcoded start would no longer bear any fixed
				   relationship to the end once the end is computed. */
				fromX = restX - swing.travelX;
				fromY = restY + swing.travelY;
				tiltDeg = swing.tilt;
				scaleFrom = swing.scaleFrom;
				settleAt = swing.settleAt;
				settleDrift = swing.settleDrift;

				emissionScale = handW / W / VAULT_STAGE.handWidth;
			} else {
				restX = VAULT_SCROLL.handToX;
				restY = VAULT_SCROLL.handToY;
				fromX = VAULT_SCROLL.handFromX;
				fromY = VAULT_SCROLL.handFromY;
				tiltDeg = VAULT_SCROLL.handTilt;
				scaleFrom = VAULT_SCROLL.handScaleFrom;
				settleAt = VAULT_SCROLL.handSettleAt;
				settleDrift = VAULT_SCROLL.handSettleDrift;
				emissionScale = 1;
			}

			folderSize = clamp(
				W * (frame ? frame.folderSize : VAULT_STAGE.folderSize),
				frame ? frame.folderMinSize : VAULT_STAGE.folderMinSize,
				frame ? frame.folderMaxSize : VAULT_STAGE.folderMaxSize
			);

			hand.style.width = `${handW}px`;
			hand.style.top = `${handTop}px`;

			const glowSize = W * VAULT_GLOW.size * emissionScale;
			glow.style.width = `${glowSize}px`;
			glow.style.height = `${glowSize}px`;

			/* The haze is an ellipse: wide along the escape direction, so the
			   lit volume follows the sand up and to the right instead of
			   ringing the opening evenly. */
			const hazeW = W * VAULT_GLOW.hazeSize * emissionScale;
			haze.style.width = `${hazeW}px`;
			haze.style.height = `${hazeW * VAULT_GLOW.hazeAspect}px`;

			for (const el of folderRefs.current) {
				if (!el) continue;
				/* 1:1 asset - one number is both dimensions. */
				el.style.width = `${folderSize}px`;
				el.style.height = `${folderSize}px`;
			}

			/* The caption's vertical anchor. Desktop keeps its percentage
			   top; mobile switches to a bottom gutter that clears the home
			   indicator, so the distance below the copy is exact however many
			   lines it wraps to. Empty string removes the property and lets
			   the stylesheet decide. */
			if (cue) {
				cue.style.top = tuning.cue.top ?? '';
				cue.style.bottom = tuning.cue.bottom ?? '';
			}

			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		/* ---------------- sand ----------------

		   Parallel typed arrays, allocated once at VAULT_DUST.max and reused
		   with swap-removal. Nothing is allocated per grain per frame, which
		   is what keeps a four-figure particle count off the GC entirely.

		   ALLOCATED AT THE DESKTOP CEILING EVEN ON A PHONE. The mobile
		   budget caps how many grains may be LIVE (`liveMax`), not how much
		   pool exists - so crossing the breakpoint on a resize never has to
		   reallocate, and there is no path on which a stale index can point
		   past the end of an array. Eight arrays at 2600 entries is about
		   83KB, which is not worth a resize hazard. */

		const MAX = VAULT_DUST.max;
		const px = new Float32Array(MAX);
		const py = new Float32Array(MAX);
		const pvx = new Float32Array(MAX);
		const pvy = new Float32Array(MAX);
		const page = new Float32Array(MAX);
		const pttl = new Float32Array(MAX);
		const prad = new Float32Array(MAX);
		/* 0 = core, 1 = ember, 2 = sparkle. Kept separate so the draw can
		   run one pass per colour and set fillStyle three times a frame
		   instead of once per grain. */
		const pkind = new Uint8Array(MAX);

		let alive = 0;
		let spawnDebt = 0;

		const KIND_COLOURS = ['#DCD6F2', '#9D8ED9', '#F1EDFB'];

		/** Emits from a LINE, not a point - see note 5 at the top. `lx, ly`
		 *  is the unit vector along the folder lip and `llen` its length in
		 *  px, both already rotated with the hand. */
		const spawn = (
			mx: number,
			my: number,
			lx: number,
			ly: number,
			llen: number
		) => {
			if (alive >= liveMax) return;
			const i = alive++;

			/* Uniform along the slit, then a little scatter perpendicular to
			   it so the source has depth rather than being a hairline. */
			const along = (Math.random() - 0.5) * llen;
			const s = VAULT_DUST.spread * W * emissionScale;
			px[i] = mx + lx * along + (Math.random() - 0.5) * s;
			py[i] = my + ly * along + (Math.random() - 0.5) * s;

			/* A cone, not a drift: own angle within `cone` of `angle`, own
			   speed. Uniform speed would read as a solid expanding shell. */
			const ang =
				(VAULT_DUST.angle + (Math.random() - 0.5) * VAULT_DUST.cone) * DEG;
			const speed =
				W *
				lerp(VAULT_DUST.speedMin, VAULT_DUST.speedMax, Math.random()) *
				emissionScale;
			pvx[i] = Math.cos(ang) * speed;
			pvy[i] = Math.sin(ang) * speed;

			page[i] = 0;
			pttl[i] = lerp(VAULT_DUST.lifeMin, VAULT_DUST.lifeMax, Math.random());

			/* Squared sample, not flat: biases the population hard toward
			   sizeMin. A flat distribution put too many grains near the
			   maximum, and additive fillRect turned those into visible
			   blocks. Grains you can pick out individually are too big. */
			const sizeBias = Math.random() * Math.random();
			prad[i] = lerp(dustSizeMin, dustSizeMax, sizeBias);

			const r = Math.random();
			pkind[i] =
				r < VAULT_DUST.sparkleMix
					? 2
					: r < VAULT_DUST.sparkleMix + VAULT_DUST.emberMix
						? 1
						: 0;
		};

		const kill = (i: number) => {
			const last = --alive;
			if (i === last) return;
			px[i] = px[last];
			py[i] = py[last];
			pvx[i] = pvx[last];
			pvy[i] = pvy[last];
			page[i] = page[last];
			pttl[i] = pttl[last];
			prad[i] = prad[last];
			pkind[i] = pkind[last];
		};

		const stepDust = (
			dt: number,
			emission: number,
			mx: number,
			my: number,
			lx: number,
			ly: number,
			llen: number
		) => {
			/* Emission is scroll-gated, so scrubbing back to the top empties
			   the frame instead of leaving a cloud parked in mid-air. */
			if (emission <= 0.002) {
				alive = 0;
				spawnDebt = 0;
			} else {
				spawnDebt += dustRate * emission * dt;
				const n = Math.floor(spawnDebt);
				spawnDebt -= n;
				for (let k = 0; k < n; k++) spawn(mx, my, lx, ly, llen);
			}

			/* A shrinking budget has to be enforced on the LIVE population
			   too, not just at spawn: a desktop window dragged narrow across
			   the breakpoint would otherwise keep every grain it already had
			   until each one aged out. */
			if (alive > liveMax) alive = liveMax;

			const buoy = VAULT_DUST.buoyancy * W * emissionScale;
			const spreadAccel = VAULT_DUST.spreadAccel * W * emissionScale;
			for (let i = alive - 1; i >= 0; i--) {
				page[i] += dt;
				if (page[i] >= pttl[i]) {
					kill(i);
					continue;
				}
				/* Lateral spread grows with age, so the cloud opens out as it
				   travels instead of staying a tight beam. */
				pvx[i] += spreadAccel * dt;
				pvy[i] += buoy * dt;
				px[i] += pvx[i] * dt;
				py[i] += pvy[i] * dt;
			}
		};

		const drawDust = (emission: number) => {
			ctx.clearRect(0, 0, W, H);
			if (alive === 0) return;

			const prev = ctx.globalCompositeOperation;
			ctx.globalCompositeOperation = 'lighter';

			const gate = clamp01(emission * 3);

			for (let kind = 0; kind < 3; kind++) {
				ctx.fillStyle = KIND_COLOURS[kind];
				for (let i = 0; i < alive; i++) {
					if (pkind[i] !== kind) continue;
					const u = page[i] / pttl[i];
					/* sin gives symmetrical fade in and out over life, so no
					   grain pops into or out of existence. */
					ctx.globalAlpha = VAULT_DUST.alpha * Math.sin(Math.PI * u) * gate;
					const d = prad[i] * 2;
					/* fillRect, not arc: at sub-pixel sizes the shape is
					   indistinguishable and this costs a fraction as much. That
					   swap is what pays for the grain count. */
					ctx.fillRect(px[i], py[i], d, d);
				}
			}

			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = prev;
		};

		/* ---------------- pointer ----------------

		   Normalised to -1..1 from the stage's centre. Read in the listener,
		   spent in the frame loop - the listener never touches layout. */

		let pointerTargetX = 0;
		let pointerTargetY = 0;
		let pointerX = 0;
		let pointerY = 0;

		const onPointerMove = (event: PointerEvent) => {
			const rect = stage.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			pointerTargetX = clamp(
				((event.clientX - rect.left) / rect.width) * 2 - 1,
				-1,
				1
			);
			pointerTargetY = clamp(
				((event.clientY - rect.top) / rect.height) * 2 - 1,
				-1,
				1
			);
		};

		/* Recentre when the pointer leaves the document, otherwise the frame
		   stays permanently pushed toward whichever edge it exited. */
		const onPointerOut = () => {
			pointerTargetX = 0;
			pointerTargetY = 0;
		};

		/* ---------------- layout ---------------- */

		const apply = (p: number) => {
			const { emitFrom, emitTo } = VAULT_SCROLL;

			const settle = clamp01(p / settleAt);
			const e = easeOutExpo(settle);

			/* The arc: x and y both travel, so the hand swings up and in from
			   the corner the way an arm actually offers something. */
			const after = clamp01((p - settleAt) / (1 - settleAt));
			const hx = lerp(fromX, restX, e) * W;
			const hy = lerp(fromY, restY, e) * H + after * settleDrift * H;
			const hrot = (1 - e) * -tiltDeg;
			const hscale = lerp(scaleFrom, 1, e);

			/* PARALLAX, per layer. Computed here rather than folded into the
			   scroll layout above so the two inputs stay separable: the frame
			   answers the pointer even when the page is not moving at all.

			   The hand's offset is ALSO the glow's, the haze's anchor and the
			   sand's, because all three are emitted by the folder - see note
			   7. Only the folders and the haze add anything of their own.

			   Inert on touch: the listeners are only bound when the device
			   reports (hover: hover), so pointerX/Y stay at 0 and every term
			   below falls out to nothing. */
			const parX = pointerX * VAULT_PARALLAX.hand * W;
			const parY = pointerY * VAULT_PARALLAX.hand * W;

			hand.style.transform = `translate3d(${hx + parX}px, ${
				hy + parY
			}px, 0) rotate(${hrot}deg) scale(${hscale})`;

			/* THE MOUTH, through the hand's live transform.
			   Local point -> offset from the image's centre -> scaled ->
			   rotated -> back into stage space. transform-origin is the
			   centre, so this matches what the browser actually painted.

			   Deliberately computed from the UNPARALLAXED hx/hy: the grains
			   are spawned in stage space and live for seconds, so the whole
			   canvas is translated by parX/parY instead. Offsetting the
			   emitter here as well would double the shift on new grains and
			   tear the plume in half. */
			const cx = handW / 2;
			const cy = handH / 2;
			const ox = (VAULT_STAGE.mouth.x * handW - cx) * hscale;
			const oy = (VAULT_STAGE.mouth.y * handH - cy) * hscale;
			const r = hrot * DEG;
			const cos = Math.cos(r);
			const sin = Math.sin(r);
			const mouthX = hx + cx + (ox * cos - oy * sin);
			const mouthY = handTop + hy + cy + (ox * sin + oy * cos);

			/* THE LIP. Unit vector along the folder's opening, rotated by the
			   lip's own tilt AND by the hand's current rotation, so the
			   emitter stays lying on the opening for the whole swing.

			   Already a fraction of handW rather than of W, so unlike every
			   other emission dimension this needs no emissionScale. */
			const lipAngle = (VAULT_STAGE.mouthTilt + hrot) * DEG;
			const lipX = Math.cos(lipAngle);
			const lipY = Math.sin(lipAngle);
			const lipLen = VAULT_STAGE.mouthWidth * handW * hscale;

			const emit = clamp01((p - emitFrom) / (emitTo - emitFrom));

			/* The sand rides the hand's parallax as one sheet. */
			canvas.style.transform = `translate3d(${parX}px, ${parY}px, 0)`;

			/* Glow: a tight core pinned to the opening. It swells with
			   emission so the folder reads as a light SOURCE. */
			const glowScale = 1 + VAULT_GLOW.swell * emit;
			glow.style.transform = `translate3d(${mouthX + parX}px, ${
				mouthY + parY
			}px, 0) translate(-50%, -50%) scale(${glowScale})`;
			glow.style.opacity = `${lerp(
				VAULT_GLOW.opacityIdle,
				VAULT_GLOW.opacityPeak,
				emit
			)}`;

			/* Haze: the lit volume the archive is escaping THROUGH. Offset
			   along the escape direction and rotated to match, so it fills
			   the space the folders and sand actually occupy rather than
			   ringing the opening. Its parallax term is negative, so it
			   drifts slightly against the pointer and sits behind. */
			const hazeAngle = VAULT_DUST.angle;
			const hazeRad = hazeAngle * DEG;
			const hazeParX = parX + pointerX * VAULT_PARALLAX.haze * W;
			const hazeParY = parY + pointerY * VAULT_PARALLAX.haze * W;
			const hazeReach = VAULT_GLOW.hazeOffset * W * emissionScale;
			const hazeX = mouthX + Math.cos(hazeRad) * hazeReach + hazeParX;
			const hazeY = mouthY + Math.sin(hazeRad) * hazeReach + hazeParY;
			const hazeScale = 1 + VAULT_GLOW.hazeSwell * emit;
			haze.style.transform = `translate3d(${hazeX}px, ${hazeY}px, 0) translate(-50%, -50%) rotate(${hazeAngle}deg) scale(${hazeScale})`;
			haze.style.opacity = `${lerp(
				VAULT_GLOW.hazeOpacityIdle,
				VAULT_GLOW.hazeOpacityPeak,
				emit
			)}`;

			/* Folders. Each leaves the mouth on its own arc, emerging small
			   because a moment ago it was inside the folder. They are the
			   nearest things in the frame, so they take the largest parallax
			   offset - the hand's plus their own.

			   Flight distances are fractions of stage width, so they carry
			   emissionScale like the sand: on a phone the folder they leave
			   is far larger relative to the frame, and an unscaled arc would
			   have them clearing it in a fraction of their travel.

			   NOTE: VAULT_FOLDER_FLIGHT is currently an EMPTY array - the
			   escaping folders were removed and the glow and sand carry the
			   escape alone. This loop is therefore dormant, not dead: it is
			   correct for whatever entries are added back. */
			const folderParX = parX + pointerX * VAULT_PARALLAX.folders * W;
			const folderParY = parY + pointerY * VAULT_PARALLAX.folders * W;
			const reach = W * emissionScale;

			for (let i = 0; i < VAULT_FOLDER_FLIGHT.length; i++) {
				const el = folderRefs.current[i];
				if (!el) continue;
				const f = VAULT_FOLDER_FLIGHT[i];

				const local = clamp01((emit - f.delay) / (1 - f.delay));
				const t = easeOutCubic(local);

				const x = mouthX + f.dx * reach * t + folderParX;
				/* 4t(1-t) bows the path above the straight line without moving
				   either endpoint - a ballistic lift, zero at both ends. */
				const y =
					mouthY +
					f.dy * reach * t -
					f.arc * reach * 4 * t * (1 - t) +
					folderParY;

				const s = lerp(0.3, f.scale, t);
				const rot = f.tilt + f.spin * t;

				el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rot}deg) scale(${s})`;
				el.style.opacity = `${clamp01(local / 0.12) * lerp(1, f.fade, t)}`;
			}

			return { emit, mouthX, mouthY, lipX, lipY, lipLen, parX, parY };
		};

		/* ---------------- reduced motion ---------------- */

		if (reduced) {
			measure();
			const onReady = () => {
				measure();
				apply(1);
			};
			if (handImg.complete) onReady();
			else handImg.addEventListener('load', onReady, { once: true });

			const ro = new ResizeObserver(onReady);
			ro.observe(stage);
			return () => ro.disconnect();
		}

		/* ---------------- the loop ---------------- */

		let target = 0;
		let current = 0;
		let velocity = 0;
		let near = false;
		let raf = 0;
		let last = 0;

		const trigger = ScrollTrigger.create({
			trigger: root,
			start: 'top top',
			end: 'bottom bottom',
			onUpdate: (self) => {
				target = self.progress;
			},
		});

		/* Separate, wider trigger: gates the rAF loop so the section costs
		   nothing while it is off screen. */
		const gate = ScrollTrigger.create({
			trigger: root,
			start: 'top bottom',
			end: 'bottom top',
			onToggle: (self) => {
				near = self.isActive;
			},
		});

		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);

			/* Clamped: a backgrounded tab returns one enormous delta, which
			   would teleport every grain off screen and fire the spring. */
			const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
			last = now;
			if (!near) return;

			/* THE SPRING. Acceleration toward the target, damped by current
			   velocity. Gives lag, follow-through and a single overshoot. */
			const accel =
				(target - current) * VAULT_INERTIA.stiffness -
				velocity * VAULT_INERTIA.damping;
			velocity += accel * dt;
			current += velocity * dt;

			if (
				Math.abs(target - current) < VAULT_INERTIA.epsilon &&
				Math.abs(velocity) < VAULT_INERTIA.epsilonVelocity
			) {
				current = target;
				velocity = 0;
			}

			/* Exponential smoothing on the pointer, framed in dt so the feel
			   is identical at 60Hz and 144Hz. A plain `+= delta * 0.1` would
			   track more than twice as tightly on a fast display. */
			const k = 1 - Math.exp(-VAULT_PARALLAX.smoothing * dt);
			pointerX += (pointerTargetX - pointerX) * k;
			pointerY += (pointerTargetY - pointerY) * k;

			/* Read the stage box BEFORE apply() writes its transforms.
			   Reading layout after writing it in the same frame forces a
			   synchronous reflow - every frame, forever. */
			const box = stage.getBoundingClientRect();

			const { emit, mouthX, mouthY, lipX, lipY, lipLen, parX, parY } =
				apply(clamp01(current));
			stepDust(dt, emit, mouthX, mouthY, lipX, lipY, lipLen);
			drawDust(emit);

			/* THE MOUTH, PUBLISHED FOR THE WINDOW'S OPENING.

			   The Vault window expands out of the folder's lit opening
			   rather than out of the cursor - that is what stops the
			   window and the folder reading as two unrelated things. Only
			   this loop knows where the opening currently is, because it
			   is derived through the hand's live transform, and the window
			   is rendered by a route segment that does not exist yet - so
			   it is handed over through lib/vaultOrigin.ts.

			   Stage space -> viewport space, with the pointer parallax
			   added back in because the glow the user can SEE is offset by
			   it. `at` is what lets the reader reject a stale reading from
			   a teaser that has since been scrolled away from.

			   The radius carries emissionScale so it keeps matching the
			   glow that was actually painted - the window's opening burst
			   is sized from this, and on a phone an unscaled radius would
			   have it start from a circle noticeably smaller than the light
			   it is supposed to be continuing. */
			setVaultMouth({
				x: box.left + mouthX + parX,
				y: box.top + mouthY + parY,
				radius: (W * VAULT_GLOW.size * emissionScale) / 2,
				angle: VAULT_DUST.angle,
				at: now,
			});
		};

		const start = () => {
			measure();
			apply(clamp01(current));
			ScrollTrigger.refresh();
			if (!raf) raf = requestAnimationFrame(frame);
		};

		if (handImg.complete) start();
		else handImg.addEventListener('load', start, { once: true });

		if (canHover) {
			/* On the window rather than the stage: the pointer should keep
			   steering while it is anywhere on screen, and a listener on the
			   section itself would snap back to centre the moment the cursor
			   crossed onto the copy or the nav. */
			window.addEventListener('pointermove', onPointerMove, { passive: true });
			document.addEventListener('pointerleave', onPointerOut);
		}

		const ro = new ResizeObserver(() => {
			measure();
			apply(clamp01(current));
		});
		ro.observe(stage);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			ro.disconnect();
			trigger.kill();
			gate.kill();
			handImg.removeEventListener('load', start);
			window.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerleave', onPointerOut);
		};
	}, [rootRef, stageRef, handRef, glowRef, hazeRef, canvasRef, folderRefs]);
};

export default useVaultTeaser;
