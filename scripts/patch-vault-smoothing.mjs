#!/usr/bin/env node
/* ------------------------------------------------------------------
   "IT IS INSTANT BUT SHARP" + "THE FIRST CLICK TAKES THREE SECONDS".

   Two unrelated causes, fixed together:

     - config/vaultWindow.ts   the opening was an EXPO-OUT curve, which
                               covers half its distance in the first 7%
                               of its duration. That is a snap followed
                               by a crawl, and "sharp" is exactly what
                               it looks like. Retimed, and the shader's
                               duplicate of the curve retimed with it.
     - VaultTeaser.tsx         wired to the warm-up hook, so the route,
                               its chunks and the hero image are all
                               fetched before the first click.

   Anchored and idempotent, every anchor asserted, per-file line endings
   preserved.

     node scripts/patch-vault-smoothing.mjs
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
	writeFileSync(
		resolve(root, rel),
		file.crlf ? file.text.replace(/\n/g, '\r\n') : file.text,
		'utf8'
	);
	touched.push(rel);
};

const swap = (file, rel, find, replace) => {
	if (!file.text.includes(find)) {
		throw new Error(
			'patch-vault-smoothing: anchor not found in ' +
				rel +
				'\n---\n' +
				find +
				'\n---'
		);
	}
	file.text = file.text.replace(find, replace);
};

/* ------------------------------------------------------------------
   1. THE CURVE.

   cubic-bezier(0.16, 1, 0.3, 1) is easeOutExpo. It is the right curve
   for something ARRIVING - a card, a line of type - because almost all
   of the motion is over before you can track it and what you perceive
   is the settle. It is the wrong curve for something OPENING, where the
   travel itself is the event: the mask jumps most of the way across the
   screen in the first hundred milliseconds and then creeps, which reads
   as a hard cut with a slow tail glued to it.

   cubic-bezier(0.65, 0, 0.35, 1) is easeInOutCubic - symmetric, gentle
   at both ends, fastest in the middle. The mask now gathers, sweeps and
   settles, which is how a physical thing opens.

   The slow start would normally be a responsiveness problem - nothing
   visibly happening for the first ~120ms after a click is a long time.
   It is not one here, because the teaser's flare is already burning at
   the folder's mouth by then: the light gathers, THEN the window opens
   out of it. The two changes only work together.
   ------------------------------------------------------------------ */
{
	const rel = 'src/config/vaultWindow.ts';
	const file = load(rel);

	if (!file.text.includes('cubic-bezier(0.65, 0, 0.35, 1)')) {
		swap(
			file,
			rel,
			'\t *  than a cut; short enough that it never feels like waiting. */\n' +
				'\topenDuration: 1150,',
			'\t *  than a cut; short enough that it never feels like waiting.\n' +
				'\t *\n' +
				'\t *  Raised from 1150 when the curve below stopped being\n' +
				'\t *  front-loaded. An easeOutExpo opening is effectively over long\n' +
				'\t *  before its stated duration, so 1150 was never really 1150;\n' +
				'\t *  a symmetric curve spends the whole budget, and needs a\n' +
				'\t *  slightly larger one to avoid feeling hurried through the\n' +
				'\t *  middle where it is now fastest. */\n' +
				'\topenDuration: 1400,'
		);

		swap(
			file,
			rel,
			'\t/** Custom easing for the expansion: quick commitment, long settle.\n' +
				'\t *  The overshoot-free curve matters here because a clip-path that\n' +
				'\t *  overshoots reveals the page edge behind it. */\n' +
				"\topenEase: 'cubic-bezier(0.16, 1, 0.3, 1)',",
			'\t/** easeInOutCubic. Gentle at both ends, fastest through the\n' +
				'\t *  middle - the mask gathers, sweeps, and settles.\n' +
				'\t *\n' +
				'\t *  THE DEFECT THIS REPLACES, because it looks like a downgrade\n' +
				'\t *  and will be "fixed" back otherwise: this was\n' +
				'\t *  cubic-bezier(0.16, 1, 0.3, 1), easeOutExpo. That curve is\n' +
				'\t *  correct for something ARRIVING, where the settle is what you\n' +
				'\t *  perceive - and it is used all over this site for exactly\n' +
				'\t *  that. It is wrong for something OPENING, where the travel IS\n' +
				'\t *  the event: it covers half the distance in the first ~7% of\n' +
				'\t *  the duration, so the window snapped open and then crawled.\n' +
				'\t *  Reported, accurately, as "instant but sharp".\n' +
				'\t *\n' +
				'\t *  Still overshoot-free, which is non-negotiable: a clip-path\n' +
				'\t *  that overshoots reveals the page edge behind it.\n' +
				'\t *\n' +
				'\t *  IF YOU CHANGE THIS, CHANGE VAULT_OPEN_SHADER.ease TOO. */\n' +
				"\topenEase: 'cubic-bezier(0.65, 0, 0.35, 1)',"
		);

		/* The shader solves the same curve numerically every frame. If the
		   two drift, the glowing front and the geometric mask edge travel
		   at different speeds and you see both - which is the one failure
		   mode worse than the plain circle this replaced. */
		swap(
			file,
			rel,
			'\tease: [0.16, 1, 0.3, 1] as [number, number, number, number],',
			'\tease: [0.65, 0, 0.35, 1] as [number, number, number, number],'
		);

		/* A wider, softer front. With the mask no longer sprinting away
		   from the light in the first few frames, the front can afford to
		   be broad and dim rather than narrow and hot - and a broad front
		   is what stops the eye finding the circle's edge inside it. Gain
		   comes down because a wider band with the same gain reads as a
		   flash. */
		swap(
			file,
			rel,
			'\trimWidth: 120,\n' +
				'\t/** Brightness of the front. Above ~1.4 it clips to white and stops\n' +
				'\t *  reading as ember light. */\n' +
				'\trimGain: 1.15,',
			'\trimWidth: 210,\n' +
				'\t/** Brightness of the front. Above ~1.4 it clips to white and stops\n' +
				'\t *  reading as ember light. Lowered when rimWidth went up: the\n' +
				'\t *  band is what you see, so widening it at the same gain turns\n' +
				'\t *  the front into a flash. */\n' +
				'\trimGain: 1.05,'
		);

		/* The mouth flare has longer to live now that the front leaves
		   slowly, so it can be larger without being outrun. */
		swap(file, rel, '\tbloomRadius: 260,', '\tbloomRadius: 320,');

		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   2. THE WARM-UP, wired into the teaser.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/VaultTeaser.tsx';
	const file = load(rel);

	if (!file.text.includes('useVaultWarmup')) {
		swap(
			file,
			rel,
			"import { useVaultTeaser } from '@/hooks/useVaultTeaser';",
			"import { useVaultTeaser } from '@/hooks/useVaultTeaser';\n" +
				"import { useVaultWarmup } from '@/hooks/useVaultWarmup';"
		);

		swap(
			file,
			rel,
			'\tuseVaultTeaser({\n' +
				'\t\trootRef,\n' +
				'\t\tstageRef,\n' +
				'\t\thandRef,\n' +
				'\t\tglowRef,\n' +
				'\t\thazeRef,\n' +
				'\t\tcanvasRef,\n' +
				'\t\tfolderRefs,\n' +
				'\t});',
			'\tuseVaultTeaser({\n' +
				'\t\trootRef,\n' +
				'\t\tstageRef,\n' +
				'\t\thandRef,\n' +
				'\t\tglowRef,\n' +
				'\t\thazeRef,\n' +
				'\t\tcanvasRef,\n' +
				'\t\tfolderRefs,\n' +
				'\t});\n' +
				'\n' +
				'\t/* The first click on the folder used to cost about three\n' +
				'\t   seconds and every click after it was free - the signature of\n' +
				'\t   a cold route, a cold chunk and a cold hero image rather than\n' +
				'\t   of anything in the animation. All three are fetched while the\n' +
				'\t   user is still scrolling toward this section; see the hook. */\n' +
				'\tconst warm = useVaultWarmup(rootRef);'
		);

		swap(
			file,
			rel,
			'\t\t\t\t\t\tonPointerDown={onPointerDown}',
			'\t\t\t\t\t\t/* Last chance to warm the path: anyone who arrived by\n' +
				'\t\t\t\t\t\t   anchor link, or scrolled faster than the observer\'s\n' +
				'\t\t\t\t\t\t   lead time, still gets a hover before a click. Safe to\n' +
				'\t\t\t\t\t\t   fire repeatedly - the hook is one-shot. */\n' +
				'\t\t\t\t\t\tonPointerEnter={warm}\n' +
				'\t\t\t\t\t\tonPointerDown={onPointerDown}'
		);

		save(rel, file);
	}
}

if (touched.length === 0) {
	console.log('patch-vault-smoothing: already applied, nothing to do');
} else {
	for (const rel of touched) {
		console.log('patch-vault-smoothing: patched ' + rel);
	}
}
