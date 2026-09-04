/**
 * Wires the Vault teaser into the page.
 *
 * Two edits, both idempotent - run it twice and the second run reports
 * "already wired" instead of duplicating anything:
 *
 *   1. src/app/globals.css      -> import the section's stylesheet
 *   2. src/components/HomeShell -> import + mount <VaultTeaser /> as the
 *                                  last section inside <main>
 *
 * Anchored on exact substrings rather than line numbers, and it throws
 * if an anchor is missing rather than writing a half-patched file.
 *
 * Run from the project root:  node scripts/wire-vault-teaser.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const log = [];

const eolOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');

function patch(path, mutate) {
	const before = readFileSync(path, 'utf8');
	const after = mutate(before, eolOf(before));
	if (after === before) {
		log.push(`  already wired  ${path}`);
		return;
	}
	writeFileSync(path, after);
	log.push(`  patched        ${path}`);
}

/* ---------- 1. the stylesheet import ---------- */

patch('src/app/globals.css', (s, eol) => {
	const add = "@import '../styles/vault-teaser.css';";
	if (s.includes(add)) return s;

	/* Appended after rake.css so the import order still matches the
	   sections' order down the page. */
	const anchor = "@import '../styles/rake.css';";
	if (!s.includes(anchor)) {
		throw new Error('globals.css: rake.css import anchor not found');
	}
	return s.replace(anchor, anchor + eol + add);
});

/* ---------- 2. the section itself ---------- */

patch('src/components/HomeShell.tsx', (s, eol) => {
	if (s.includes('VaultTeaser')) return s;

	const importAnchor =
		"import WebsiteProjectsShowcase from './WebsiteProjectsShowcase';";
	if (!s.includes(importAnchor)) {
		throw new Error('HomeShell: showcase import anchor not found');
	}

	let out = s.replace(
		importAnchor,
		importAnchor + eol + "import VaultTeaser from './vault/VaultTeaser';"
	);

	/* Five tabs: the showcase sits inside <main> inside the gated div
	   inside the fragment. Matching the exact indentation keeps the file's
	   formatting intact. */
	const jsxAnchor = '\t\t\t\t\t<WebsiteProjectsShowcase />';
	if (!out.includes(jsxAnchor)) {
		throw new Error('HomeShell: <WebsiteProjectsShowcase /> anchor not found');
	}

	const block = [
		'',
		'\t\t\t\t\t{/* THE VAULT, teased. The hand carries the open folder in from',
		'\t\t\t\t\t    the left on scroll and the archive escapes out of it - small',
		'\t\t\t\t\t    folders on arcs, trailing lit dust. No resources are listed',
		'\t\t\t\t\t    on the landing page; the folder is a door to /vault and that',
		'\t\t\t\t\t    is the whole section.',
		'',
		'\t\t\t\t\t    Last inside <main> on purpose: PixelDissolveTransition below',
		'\t\t\t\t\t    reads the live position of #projects and dissolves the work',
		'\t\t\t\t\t    section away into --color-eerie, which is this section\u2019s own',
		'\t\t\t\t\t    background - so the dissolve lands directly on it and the',
		'\t\t\t\t\t    join is never drawn. Tuned in config/vault.ts. */}',
		'\t\t\t\t\t<VaultTeaser />',
	].join(eol);

	return out.replace(jsxAnchor, jsxAnchor + block);
});

console.log('wire-vault-teaser:');
for (const line of log) console.log(line);
