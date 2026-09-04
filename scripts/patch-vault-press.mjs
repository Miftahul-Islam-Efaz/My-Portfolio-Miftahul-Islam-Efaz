/* ------------------------------------------------------------------
   Add the folder's PRESS state.

   Two anchored, idempotent appends - the house pattern for touching
   files that already exist. Safe to run repeatedly; it reports
   "already patched" and changes nothing.

     1. config/vault.ts       <- the VAULT_PRESS tuning block
     2. styles/vault-teaser.css <- the press rules

   Appends rather than rewrites because both files are large, settled,
   and full of hard-won values (the sand sizes, the mouth coordinates)
   that there is no reason to put back through a full rewrite.

   The CSS rules go at the END of the stylesheet deliberately: they need
   to win over the existing .vault-teaser__trigger and
   .vault-teaser__hand-glow rules at equal specificity, and in CSS that
   means arriving last.
   ------------------------------------------------------------------ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG = resolve('src/config/vault.ts');
const CSS = resolve('src/styles/vault-teaser.css');

/* ---------------- 1. the config block ---------------- */

const CONFIG_MARKER = 'VAULT_PRESS';
const CONFIG_BLOCK = `
/** THE PRESS.
 *
 *  The folder is a button, and it needs to behave like one. Two
 *  problems had to be solved together:
 *
 *  1. A LINK NAVIGATES INSTANTLY, so there is no time to feel anything.
 *     The pressed frame was already crossfading on :active, but the
 *     route change began on the same gesture and the window covered the
 *     screen before the crossfade had run a single frame. So the click
 *     is intercepted, the press is played, and navigation happens
 *     \`hold\` milliseconds later. This is the rare case where
 *     deliberately delaying a navigation is correct: the press IS the
 *     feedback that the click registered, and without it the folder
 *     feels like a dead image that happens to change the page.
 *
 *  2. :active DOES NOT SURVIVE THE GESTURE. It drops the instant the
 *     pointer is released, which on a quick click is a handful of
 *     frames. So the pressed look is driven by a data attribute held
 *     for the full duration, and :active only handles the mouse-down
 *     part of a slow, deliberate press.
 *
 *  \`hold\` is the one number to move if the press feels sluggish
 *  (lower) or unnoticed (higher). Under about 120ms it stops reading as
 *  a press at all; over about 300ms the site feels unresponsive. */
export const VAULT_PRESS = {
	/** How long the pressed state is held before navigating, in ms. */
	hold: 190,
	/** How far the folder sinks. Scale, not translate: a button pressed
	 *  into the frame recedes, it does not slide. Tiny on purpose - this
	 *  is a photograph of a hand, and anything visible enough to measure
	 *  reads as the image glitching rather than as a press. */
	scale: 0.974,
	/** How long the sink takes, in ms. Shorter than the release: things
	 *  compress fast and recover slowly. */
	sinkDuration: 110,
	/** How long the release takes, in ms. */
	releaseDuration: 260,
	/** How long after navigating before the pressed state is cleared.
	 *  Longer than \`hold\` because the teaser stays MOUNTED underneath the
	 *  window - it is never unmounted, so nothing else would ever reset
	 *  it and the folder would sit pressed forever behind the window,
	 *  waiting to be revealed on close. */
	release: 520,
} as const;
`;

let config = readFileSync(CONFIG, 'utf8');

if (config.includes(CONFIG_MARKER)) {
	console.log('patch-vault-press: config/vault.ts already patched');
} else {
	/* Preserve the file's existing line endings - vault.ts is CRLF, and
	   writing lone LFs into it produces a mixed-ending file that shows up
	   as a spurious whole-file diff. */
	const eol = config.includes('\r\n') ? '\r\n' : '\n';
	const block = CONFIG_BLOCK.replace(/\n/g, eol);
	config = config.trimEnd() + eol + block;
	writeFileSync(CONFIG, config, 'utf8');
	console.log('patch-vault-press: patched src/config/vault.ts');
}

/* ---------------- 2. the CSS ---------------- */

const CSS_MARKER = "data-pressed='true'";
const CSS_BLOCK = `
/* ---------------- THE PRESS ----------------

   The folder is a button. Three things happen on press, and they are
   deliberately all on the TRIGGER rather than on the hand wrapper:
   the wrapper's transform is written inline every frame by the hook
   (scroll layout plus cursor parallax), so anything set on it here
   would be overwritten on the very next frame. The trigger is a child,
   so its transform composes with its parent's instead of fighting it.

   transform-origin is the folder's MOUTH, not the element's centre.
   Pressing a hand-held object pivots around the thing being pressed -
   scaling from the centre of a full-bleed image makes the arm shrink,
   which reads as the photograph zooming out rather than as a press. */
.vault-teaser__trigger {
	display: block;
	transform-origin: 58.8% 34.5%;
	transition: transform var(--vault-press-release, 260ms)
		cubic-bezier(0.22, 1, 0.36, 1);
}

/* Held for the full press duration by React, because :active drops the
   moment the pointer is released - on a quick click that is a few
   frames, far too short to be seen. */
.vault-teaser__trigger[data-pressed='true'] {
	transform: scale(var(--vault-press-scale, 0.974));
	/* Compress fast, recover slowly. */
	transition-duration: var(--vault-press-sink, 110ms);
}

/* :active still handles the mouse-down phase of a slow, deliberate
   press, so the folder reacts on contact rather than only on release. */
.vault-teaser__trigger:active {
	transform: scale(var(--vault-press-scale, 0.974));
	transition-duration: var(--vault-press-sink, 110ms);
}

/* The lit "click me" frame, revealed for the whole held press. The
   existing :active rule covers the pointer-down phase; this covers the
   rest, including keyboard activation, which has no :active at all. */
.vault-teaser__trigger[data-pressed='true'] .vault-teaser__hand-glow {
	opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
	/* The lit label still confirms the click; only the movement goes. */
	.vault-teaser__trigger,
	.vault-teaser__trigger:active,
	.vault-teaser__trigger[data-pressed='true'] {
		transform: none;
	}
}
`;

let css = readFileSync(CSS, 'utf8');

if (css.includes(CSS_MARKER)) {
	console.log('patch-vault-press: vault-teaser.css already patched');
} else {
	const eol = css.includes('\r\n') ? '\r\n' : '\n';
	const block = CSS_BLOCK.replace(/\n/g, eol);
	css = css.trimEnd() + eol + block;
	writeFileSync(CSS, css, 'utf8');
	console.log('patch-vault-press: patched src/styles/vault-teaser.css');
}
