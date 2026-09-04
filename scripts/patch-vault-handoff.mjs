#!/usr/bin/env node
/* ------------------------------------------------------------------
   THE PRESS / OPEN HANDOFF.

   Two defects, one cause: the press was on a stopwatch instead of on
   the pointer, and the window's arrival was left as dead time.

     - config/vault.ts        hold -> minHold, plus VAULT_SPILL
     - lib/vaultOrigin.ts     peekVaultMouth(), a non-consuming read
     - VaultWindow.tsx        announces itself so the flare can hand over
     - styles/vault-teaser.css the flare

   Anchored and idempotent, and every anchor is asserted so a silent
   no-op is impossible. Line endings are preserved per file.

     node scripts/patch-vault-handoff.mjs
   ------------------------------------------------------------------ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const touched = [];

const load = (rel) => {
	const raw = readFileSync(resolve(root, rel), 'utf8');
	return { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
};

const save = (rel, file) => {
	const out = file.crlf ? file.text.replace(/\n/g, '\r\n') : file.text;
	writeFileSync(resolve(root, rel), out, 'utf8');
	touched.push(rel);
};

const swap = (file, rel, find, replace) => {
	if (!file.text.includes(find)) {
		throw new Error(
			'patch-vault-handoff: anchor not found in ' +
				rel +
				'\n---\n' +
				find +
				'\n---'
		);
	}
	file.text = file.text.replace(find, replace);
};

/* ------------------------------------------------------------------
   1. CONFIG - `hold` becomes `minHold`, and the flare gets its numbers.

   The rename is not cosmetic. `hold` was "how long to wait before
   navigating", which is a delay applied to EVERY click. `minHold` is
   "the least time the press must have been visible", which for any
   normal click is already satisfied and therefore costs nothing.
   ------------------------------------------------------------------ */
{
	const rel = 'src/config/vault.ts';
	const file = load(rel);

	if (!file.text.includes('minHold')) {
		swap(
			file,
			rel,
			'/** How long the pressed state is held before navigating, in ms. */\n' +
				'\thold: 190,',
			'/** THE LEAST time the pressed frame must have been on screen\n' +
				'\t *  before the navigation is allowed through, in ms.\n' +
				'\t *\n' +
				'\t *  This replaced a flat `hold` that delayed EVERY click by 190ms.\n' +
				'\t *  The distinction matters: an ordinary click already holds the\n' +
				'\t *  button down longer than this, so it now navigates on its own\n' +
				'\t *  click event with nothing added at all. Only a very fast flick\n' +
				'\t *  of a click borrows the few milliseconds it is short by.\n' +
				'\t *\n' +
				'\t *  Under about 120ms the press stops registering as a press. */\n' +
				'\tminHold: 120,'
		);

		/* The old release timer's rationale is now wrong in an actively
		   misleading way, so it is rewritten rather than left to be
		   trusted by the next reader. */
		swap(
			file,
			rel,
			'/** How long after navigating before the pressed state is cleared.\n' +
				'\t *  Longer than `hold` because the teaser stays MOUNTED underneath the\n' +
				'\t *  window - it is never unmounted, so nothing else would ever reset\n' +
				'\t *  it and the folder would sit pressed forever behind the window,\n' +
				'\t *  waiting to be revealed on close. */\n' +
				'\trelease: 520,',
			'/** SAFETY NET ONLY, in ms - not the normal path.\n' +
				'\t *\n' +
				'\t *  THE DEFECT THIS USED TO CAUSE: the pressed frame was turned on\n' +
				'\t *  by the click and off by this timer, so the folder stayed lit\n' +
				'\t *  long after the mouse button was back up - and since the window\n' +
				'\t *  took longer than this to arrive, the last thing you saw before\n' +
				'\t *  it appeared was a folder glowing at nothing. A pressed state\n' +
				'\t *  must follow the FINGER: pointerdown lights it, pointerup\n' +
				'\t *  releases it. That is now what drives it.\n' +
				'\t *\n' +
				'\t *  This remains only for the case where a pointerup never arrives\n' +
				'\t *  at all - the pointer is captured elsewhere, or the gesture is\n' +
				'\t *  interrupted by the OS. The teaser is never unmounted (the\n' +
				'\t *  window opens over it), so without a floor like this a stuck\n' +
				'\t *  press would sit lit behind the window until it was closed. */\n' +
				'\trelease: 520,'
		);

		file.text +=
			"\n/** THE SPILL - the flare that carries the press into the window.\n *\n *  WHY IT EXISTS. The window is rendered by a route segment, so there\n *  is a genuine gap between releasing the folder and the window\n *  existing: the router has to fetch that segment first. In development\n *  - on-demand compilation, and no link prefetching at all - that gap\n *  is around a second. In production, with the link prefetched, it is\n *  close to nothing.\n *\n *  The gap cannot be removed from here, so it is FILLED. On release a\n *  flare swells at the folder's mouth and holds, which means the\n *  reaction is immediate and what the user is watching is the folder\n *  opening rather than a page doing nothing. The window's shader burst\n *  then starts from that same point in the same two colours, so this is\n *  not a spinner that gets replaced - it is the first half of one\n *  continuous event.\n *\n *  Do NOT make this a recognisable loading indicator. The moment it\n *  reads as \"waiting\", it stops covering the wait and starts\n *  advertising it. */\nexport const VAULT_SPILL = {\n\t/** Flare diameter as a multiple of the mouth glow's radius, so it\n\t *  scales with the folder rather than with the viewport. */\n\tsizeFactor: 3.2,\n\t/** How long the flare takes to swell to full, in ms. Fast: this is\n\t *  the acknowledgement of the release. */\n\tgrowDuration: 380,\n\t/** Period of the slow pulse it holds on afterwards, in ms. Something\n\t *  perfectly still for a second reads as a frozen page. */\n\tbreatheDuration: 2400,\n\t/** Crossfade out once the window announces itself, in ms. */\n\tfade: 260,\n\t/** Hard ceiling on how long the flare may burn if the window never\n\t *  announces itself - a failed or cancelled navigation. A flare left\n\t *  burning over the landing page forever is far worse than none. */\n\tmaxWait: 3200,\n} as const;\n";

		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   2. ORIGIN - a non-consuming read of the mouth.

   takeVaultOrigin() is deliberately consuming, because the window must
   never inherit a stale coordinate. The teaser needs the same point
   WITHOUT consuming it, on the landing page, while the window does not
   exist yet.
   ------------------------------------------------------------------ */
{
	const rel = 'src/lib/vaultOrigin.ts';
	const file = load(rel);

	if (!file.text.includes('peekVaultMouth')) {
		file.text +=
			"\n/** Read the live mouth WITHOUT consuming anything, for the landing\n *  page's own use - the flare that fills the gap before the window\n *  arrives has to be placed on the same point the window will open\n *  from, and it is drawn while the teaser is still the only thing on\n *  screen.\n *\n *  Returns null when there is no fresh reading, which is a meaningful\n *  answer rather than a failure: it means the teaser is not on screen,\n *  and a flare should not be drawn at all. Never falls back to a\n *  guess - a flare in the wrong place is worse than no flare. */\nexport const peekVaultMouth = (): VaultOrigin | null => {\n\tif (!mouth) return null;\n\tconst now = typeof performance === 'undefined' ? 0 : performance.now();\n\tif (now - mouth.at >= MOUTH_MAX_AGE) return null;\n\treturn {\n\t\tx: mouth.x,\n\t\ty: mouth.y,\n\t\tradius: mouth.radius,\n\t\tangle: mouth.angle,\n\t};\n};\n";
		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   3. THE WINDOW - announce the open.

   A DOM event rather than shared state, for the same reason
   lib/vaultOrigin.ts is module scope: the producer and the consumer are
   in different route segments with no common provider, and nothing here
   should cause a re-render.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/VaultWindow.tsx';
	const file = load(rel);

	if (!file.text.includes("vault:opened")) {
		swap(
			file,
			rel,
			"\t\t\tinner = requestAnimationFrame(() => setState('open'));",
			'\t\t\tinner = requestAnimationFrame(() => {\n' +
				"\t\t\t\tsetState('open');\n" +
				'\n' +
				'\t\t\t\t/* THE HANDOFF. The teaser lit a flare at the folder\'s mouth\n' +
				'\t\t\t\t   on release and has been holding it while this segment\n' +
				'\t\t\t\t   loaded. Announcing it on THIS commit - the same one that\n' +
				'\t\t\t\t   starts the mask and the burst - means the flare fades out\n' +
				'\t\t\t\t   underneath light that is already growing from the same\n' +
				'\t\t\t\t   point. Handing over on a timer instead would either\n' +
				'\t\t\t\t   double the brightness for a moment or leave a gap, and\n' +
				'\t\t\t\t   both read as two separate effects rather than one.\n' +
				'\n' +
				'\t\t\t\t   A DOM event because the teaser is in another route\n' +
				'\t\t\t\t   segment: there is no shared provider, and nothing here\n' +
				'\t\t\t\t   should trigger a re-render of the page underneath. */\n' +
				"\t\t\t\twindow.dispatchEvent(new Event('vault:opened'));\n" +
				'\t\t\t});'
		);
		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   4. STYLES - the flare.
   ------------------------------------------------------------------ */
{
	const rel = 'src/styles/vault-teaser.css';
	const file = load(rel);

	if (!file.text.includes('vault-teaser__spill')) {
		file.text +=
			"\n/* ------------------------------------------------------------------\n   THE SPILL\n\n   The folder's light, held at the mouth between the release and the\n   window arriving. Fixed rather than absolute: the sticky stage can\n   scroll away underneath while the route resolves, and the light has to\n   stay on the point the window will open from.\n\n   `screen` blending, like every other light in this section - this is\n   emitted light being added to the frame, not a white shape laid over\n   it. Sizes and timings all arrive as inline custom properties from\n   VAULT_SPILL, so there are no numbers here to drift out of sync.\n\n   Two animations, and the order is deliberate: it swells once, then\n   holds on a slow pulse. Perfectly still light during a wait reads as a\n   frozen page, which is the exact impression this exists to prevent.\n   ------------------------------------------------------------------ */\n.vault-teaser__spill {\n\tposition: fixed;\n\t/* left/top are the mouth, so the box has to be centred on them. */\n\tmargin-left: calc(var(--vault-spill-w, 0px) * -0.5);\n\tpointer-events: none;\n\tz-index: 8600;\n\ttransform: translate(-50%, -50%) scale(0.55);\n\topacity: 0;\n\tmix-blend-mode: screen;\n\tborder-radius: 50%;\n\t/* Warm-white core falling off to nothing well inside the box, so the\n\t   edge of the element is never visible as an edge. */\n\tbackground: radial-gradient(\n\t\tcircle at 50% 50%,\n\t\tcolor-mix(in srgb, var(--vault-spill-core) 92%, transparent) 0%,\n\t\tcolor-mix(in srgb, var(--vault-spill-core) 46%, transparent) 26%,\n\t\tcolor-mix(in srgb, var(--vault-spill-core) 12%, transparent) 52%,\n\t\ttransparent 72%\n\t);\n\ttransition: opacity var(--vault-spill-fade, 260ms) linear;\n}\n\n.vault-teaser__spill[data-live='true'] {\n\topacity: 1;\n\tanimation:\n\t\tvault-spill-in var(--vault-spill-grow, 380ms)\n\t\t\tcubic-bezier(0.16, 1, 0.3, 1) forwards,\n\t\tvault-spill-breathe var(--vault-spill-breathe, 2400ms)\n\t\t\tvar(--vault-spill-grow, 380ms) ease-in-out infinite;\n}\n\n@keyframes vault-spill-in {\n\tfrom {\n\t\ttransform: translate(-50%, -50%) scale(0.55);\n\t}\n\tto {\n\t\ttransform: translate(-50%, -50%) scale(1);\n\t}\n}\n\n@keyframes vault-spill-breathe {\n\t0%,\n\t100% {\n\t\ttransform: translate(-50%, -50%) scale(1);\n\t}\n\t50% {\n\t\ttransform: translate(-50%, -50%) scale(1.08);\n\t}\n}\n\n@media (prefers-reduced-motion: reduce) {\n\t.vault-teaser__spill {\n\t\tdisplay: none;\n\t}\n}\n";
		save(rel, file);
	}
}

if (touched.length === 0) {
	console.log('patch-vault-handoff: already applied, nothing to do');
} else {
	for (const rel of touched) {
		console.log('patch-vault-handoff: patched ' + rel);
	}
}
