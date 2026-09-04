/**
 * Makes the teaser's sand grains sub-pixel.
 *
 * A zoomed screenshot showed the grains rendering as identifiable
 * blocks: radii were sampled with a flat `Math.random()` across the
 * whole size range, so a large share of the population sat near the
 * maximum, and `fillRect` under additive blending turned those into
 * solid tiles.
 *
 * Squaring the sample pushes the distribution hard toward sizeMin - the
 * overwhelming majority become barely-there specks and only a handful
 * approach sizeMax, which is what reads as sand rather than confetti.
 * The size range itself was cut in config/vault.ts; this fixes the
 * SHAPE of the distribution, which is the half that config cannot
 * express.
 *
 * Idempotent. Run from the project root:
 *   node scripts/patch-vault-sand.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/hooks/useVaultTeaser.ts';
const src = readFileSync(path, 'utf8');

const before =
	'prad[i] = lerp(VAULT_DUST.sizeMin, VAULT_DUST.sizeMax, Math.random());';

const after = [
	'/* Squared sample, not flat: biases the population hard toward',
	'\t\t\t   sizeMin. A flat distribution put too many grains near the',
	'\t\t\t   maximum, and additive fillRect turned those into visible',
	'\t\t\t   blocks. Grains you can pick out individually are too big. */',
	'\t\t\tconst sizeBias = Math.random() * Math.random();',
	'\t\t\tprad[i] = lerp(VAULT_DUST.sizeMin, VAULT_DUST.sizeMax, sizeBias);',
].join('\n');

if (src.includes('sizeBias')) {
	console.log('patch-vault-sand: already applied');
} else if (!src.includes(before)) {
	throw new Error(`patch-vault-sand: anchor not found in ${path}`);
} else {
	writeFileSync(path, src.replace(before, after));
	console.log(`patch-vault-sand: patched ${path}`);
}
