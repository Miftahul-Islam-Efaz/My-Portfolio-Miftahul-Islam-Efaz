#!/usr/bin/env node
/* ------------------------------------------------------------------
   Wires up THE VAULT OPENING - the shader burst that ties the window
   to the folder it comes out of - and removes the hero's bottom cue.

   Anchored and idempotent, like the other scripts in here: every edit
   checks for its own marker first and every anchor is asserted, so a
   silent no-op is impossible. Running it twice changes nothing;
   running it after an unrelated edit either applies cleanly or fails
   loudly with the anchor it could not find.

   Each file's existing line endings are preserved - useVaultTeaser.ts
   is CRLF and the rest are LF, and rewriting that would turn a
   three-line change into a whole-file diff.

     node scripts/patch-vault-opening.mjs
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

/** Replace exactly one occurrence, or fail with the anchor. */
const swap = (file, rel, find, replace) => {
	if (!file.text.includes(find)) {
		throw new Error(
			'patch-vault-opening: anchor not found in ' +
				rel +
				'\n---\n' +
				find +
				'\n---'
		);
	}
	file.text = file.text.replace(find, replace);
};

/* ------------------------------------------------------------------
   1. CONTENT - the hero's bottom cue is gone.

   "Gallery and Library below" was a caption doing a job the scroll
   already does. Removing the export as well as the usage, so it cannot
   sit around as dead copy that looks like it is still rendered.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/vaultPageContent.ts';
	const file = load(rel);
	if (file.text.includes('VAULT_HERO_CUE')) {
		const cue =
			/\/\*\* Under the fold marker[\s\S]*?VAULT_HERO_CUE = 'Gallery and Library below';\n\n/;
		if (!cue.test(file.text)) {
			throw new Error('patch-vault-opening: VAULT_HERO_CUE block not matched');
		}
		file.text = file.text.replace(cue, '');
		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   2. CONFIG - the burst's numbers.
   ------------------------------------------------------------------ */
{
	const rel = 'src/config/vaultWindow.ts';
	const file = load(rel);
	if (!file.text.includes('VAULT_OPEN_SHADER')) {
		file.text +=
			"\n/** THE OPENING BURST. The light that comes out of the folder when the\n *  Vault is opened, drawn as one full-screen WebGL pass by\n *  components/vault/VaultOpening.tsx.\n *\n *  WHY THIS EXISTS AT ALL: the window used to expand as a clean\n *  clip-path circle centred on the cursor, and it read as two unrelated\n *  things - a photograph of a folder, then a modal. The mask is still\n *  CSS (the compositor can run it while the landing page underneath is\n *  still animating), but the BOUNDARY is now light spilling out of the\n *  folder's mouth, in the same two colours as the mouth's own glow.\n *\n *  TWO OF THESE ARE DUPLICATES OF CSS VALUES, and the duplication is\n *  load-bearing. The shader front and the panel's clip-path radius have\n *  to agree to the pixel or the eye sees a hard geometric edge running\n *  alongside a glowing one - which is worse than the plain circle was.\n *  If you retime or resize the opening, change BOTH. */\nexport const VAULT_OPEN_SHADER = {\n\t/** MUST MATCH VAULT_WINDOW_MOTION.openEase above, as numbers.\n\t *  Solved as a real cubic-bezier every frame rather than\n\t *  approximated: an eyeballed curve drifts a few percent mid-flight,\n\t *  and a few percent of 150vmax is tens of pixels of daylight. */\n\tease: [0.16, 1, 0.3, 1] as [number, number, number, number],\n\t/** MUST MATCH the clip-path radius in styles/vault-window.css -\n\t *  circle(150vmax) - expressed as a multiple of the LARGER viewport\n\t *  axis, which is what vmax means. */\n\tradiusVmax: 1.5,\n\n\t/** Width of the burn front, in px. This is what hides the mask's\n\t *  geometric edge, so it wants to be generous - too narrow and the\n\t *  circle reappears through the middle of the glow. */\n\trimWidth: 120,\n\t/** Brightness of the front. Above ~1.4 it clips to white and stops\n\t *  reading as ember light. */\n\trimGain: 1.15,\n\n\t/** The flare at the origin - the folder's mouth flaring before the\n\t *  front has travelled anywhere. Without it the burst appears to\n\t *  start from a point in empty space. */\n\tbloomRadius: 260,\n\tbloomGain: 0.9,\n\n\t/** How much the front's BRIGHTNESS is warped by noise, 0-1. Never\n\t *  applied to the radius - see the note above. */\n\twarpAmp: 0.22,\n\t/** Feature size of that warp around the circle. Higher is busier. */\n\tnoiseScale: 2.4,\n\n\t/** Sand thrown ahead of the front. Cell size is in device pixels on\n\t *  purpose, so a grain stays a grain on a retina screen instead of\n\t *  growing into a visible tile - the same lesson the teaser's dust\n\t *  taught, where bigger grains turned into pixel confetti. */\n\tgrainScale: 0.55,\n\t/** Fraction of cells that light up, 0-1. Density, never size. */\n\tgrainDensity: 0.16,\n\t/** How far ahead of the front the grains scatter, in rim widths. */\n\tgrainSpread: 2.6,\n\n\t/** How much brighter the front is on the side the folder points,\n\t *  0-1, so the burst leans the way the sand already travels. */\n\tdirectionBias: 0.45,\n\t/** Progress at which the travelling light starts fading out, so it\n\t *  never parks off-screen and switches off. */\n\ttailFrom: 0.72,\n\t/** How long the burst outlives the mask, in ms, so the front does\n\t *  not vanish on the frame the panel finishes. */\n\textra: 220,\n\n\t/** Hot centre and cool extreme of the light. Same pair as the\n\t *  teaser's mouth glow, which is what makes this read as more of\n\t *  that light rather than as a new light. Literal hex: a shader\n\t *  cannot resolve a CSS custom property. */\n\tcore: '#F7E3C8',\n\tember: '#b56c4b',\n} as const;\n";
		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   3. STYLES - the burst's layer.
   ------------------------------------------------------------------ */
{
	const rel = 'src/styles/vault-window.css';
	const file = load(rel);
	if (!file.text.includes('vault-window__opening')) {
		file.text +=
			'\n/* ------------------------------------------------------------------\n   THE OPENING BURST\n\n   Sits ABOVE the panel, and that is safe because the pass draws light\n   only - alpha is zero everywhere except the travelling front, its\n   grains and the flare at the origin. It never masks or covers\n   anything, so it cannot hide the hero it is revealing.\n\n   `screen` blending, not `normal`: this is emitted light being added to\n   what is already there. With normal blending the dark parts of the\n   canvas would sit on top of the photograph as a grey film.\n\n   No transition and no opacity animation here - every value it needs is\n   animated inside the shader, and the component unmounts itself once\n   the burst is spent.\n   ------------------------------------------------------------------ */\n.vault-window__opening {\n\tposition: fixed;\n\tinset: 0;\n\twidth: 100%;\n\theight: 100%;\n\t/* Above the panel (and its close control), below nothing. */\n\tz-index: 3;\n\t/* Never eat a click: the close button is underneath this layer for\n\t   the first second of the window being open. */\n\tpointer-events: none;\n\tmix-blend-mode: screen;\n}\n\n@media (prefers-reduced-motion: reduce) {\n\t.vault-window__opening {\n\t\tdisplay: none;\n\t}\n}\n';
		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   4. THE WINDOW - render the burst, drop the cue.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/VaultWindow.tsx';
	const file = load(rel);

	if (!file.text.includes('VaultOpening')) {
		/* The origin now carries a radius and a direction as well as a
		   point, so the local type widens to the shared one. */
		swap(
			file,
			rel,
			"import { takeVaultOrigin } from '@/lib/vaultOrigin';",
			"import { takeVaultOrigin, type VaultOrigin } from '@/lib/vaultOrigin';"
		);
		swap(
			file,
			rel,
			'const originRef = useRef<{ x: number; y: number } | null>(null);',
			'const originRef = useRef<VaultOrigin | null>(null);'
		);

		swap(
			file,
			rel,
			"} from './vaultPageContent';",
			"} from './vaultPageContent';\nimport VaultOpening from './VaultOpening';"
		);

		swap(
			file,
			rel,
			'<div className="vault-window__veil" aria-hidden="true" />',
			'<div className="vault-window__veil" aria-hidden="true" />\n\n' +
				'\t\t\t{/* THE BURST. Light spilling out of the folder\'s mouth,\n' +
				"\t\t\t    travelling with the mask so the mask's own edge is never\n" +
				'\t\t\t    seen as an edge. `active` is the flip to \'open\' - the exact\n' +
				'\t\t\t    commit that starts the CSS transition - so both begin on\n' +
				'\t\t\t    the same frame rather than a couple of frames apart. */}\n' +
				"\t\t\t<VaultOpening origin={origin} active={state === 'open'} />"
		);
	}

	if (file.text.includes('VAULT_HERO_CUE')) {
		file.text = file.text.replace(/^\tVAULT_HERO_CUE,\n/m, '');
		const cue = /[\t ]*<p className="vault-window__cue">\{VAULT_HERO_CUE\}<\/p>\n/;
		if (!cue.test(file.text)) {
			throw new Error('patch-vault-opening: cue paragraph not matched');
		}
		file.text = file.text.replace(cue, '');
	}

	if (file.text.includes('VAULT_HERO_CUE')) {
		throw new Error('patch-vault-opening: VAULT_HERO_CUE still referenced');
	}

	save(rel, file);
}

/* ------------------------------------------------------------------
   5. THE TEASER HOOK - publish the folder's mouth.

   This is the piece that actually connects the two: the window can only
   open from the folder if it knows where the folder's opening is, and
   this hook is the only thing that does.
   ------------------------------------------------------------------ */
{
	const rel = 'src/hooks/useVaultTeaser.ts';
	const file = load(rel);

	if (!file.text.includes('setVaultMouth')) {
		swap(
			file,
			rel,
			"import { VAULT_FOLDER_FLIGHT } from '@/components/vault/vaultContent';",
			"import { VAULT_FOLDER_FLIGHT } from '@/components/vault/vaultContent';\n" +
				"import { setVaultMouth } from '@/lib/vaultOrigin';"
		);

		/* The parallax offsets have to come out of apply() as well: the
		   glow the user can SEE is offset by them, so the window has to
		   open from that point and not from the unparallaxed one. */
		swap(
			file,
			rel,
			'\t\t\treturn { emit, mouthX, mouthY, lipX, lipY, lipLen };',
			'\t\t\treturn { emit, mouthX, mouthY, lipX, lipY, lipLen, parX, parY };'
		);

		swap(
			file,
			rel,
			'\t\t\tconst { emit, mouthX, mouthY, lipX, lipY, lipLen } = apply(\n' +
				'\t\t\t\tclamp01(current)\n' +
				'\t\t\t);\n' +
				'\t\t\tstepDust(dt, emit, mouthX, mouthY, lipX, lipY, lipLen);\n' +
				'\t\t\tdrawDust(emit);',
			'\t\t\t/* Read the stage box BEFORE apply() writes its transforms.\n' +
				'\t\t\t   Reading layout after writing it in the same frame forces a\n' +
				'\t\t\t   synchronous reflow - every frame, forever. */\n' +
				'\t\t\tconst box = stage.getBoundingClientRect();\n' +
				'\n' +
				'\t\t\tconst { emit, mouthX, mouthY, lipX, lipY, lipLen, parX, parY } =\n' +
				'\t\t\t\tapply(clamp01(current));\n' +
				'\t\t\tstepDust(dt, emit, mouthX, mouthY, lipX, lipY, lipLen);\n' +
				'\t\t\tdrawDust(emit);\n' +
				'\n' +
				"\t\t\t/* THE MOUTH, PUBLISHED FOR THE WINDOW'S OPENING.\n" +
				'\n' +
				'\t\t\t   The Vault window expands out of the folder\'s lit opening\n' +
				'\t\t\t   rather than out of the cursor - that is what stops the\n' +
				'\t\t\t   window and the folder reading as two unrelated things. Only\n' +
				'\t\t\t   this loop knows where the opening currently is, because it\n' +
				'\t\t\t   is derived through the hand\'s live transform, and the window\n' +
				'\t\t\t   is rendered by a route segment that does not exist yet - so\n' +
				'\t\t\t   it is handed over through lib/vaultOrigin.ts.\n' +
				'\n' +
				'\t\t\t   Stage space -> viewport space, with the pointer parallax\n' +
				'\t\t\t   added back in because the glow the user can SEE is offset by\n' +
				'\t\t\t   it. `at` is what lets the reader reject a stale reading from\n' +
				'\t\t\t   a teaser that has since been scrolled away from. */\n' +
				'\t\t\tsetVaultMouth({\n' +
				'\t\t\t\tx: box.left + mouthX + parX,\n' +
				'\t\t\t\ty: box.top + mouthY + parY,\n' +
				'\t\t\t\tradius: (W * VAULT_GLOW.size) / 2,\n' +
				'\t\t\t\tangle: VAULT_DUST.angle,\n' +
				'\t\t\t\tat: now,\n' +
				'\t\t\t});'
		);

		save(rel, file);
	}
}

if (touched.length === 0) {
	console.log('patch-vault-opening: already applied, nothing to do');
} else {
	for (const rel of touched) {
		console.log('patch-vault-opening: patched ' + rel);
	}
}
