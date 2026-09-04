/* ------------------------------------------------------------------
   Wire the Vault window's stylesheet into globals.css.

   One anchored, idempotent edit to a file that is owned by the rest of
   the site - the house pattern for touching existing files. Safe to run
   repeatedly; it reports "already wired" and changes nothing.

   The import must sit with the other feature stylesheets and BEFORE
   `@import "tailwindcss"`, matching the existing order.
   ------------------------------------------------------------------ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GLOBALS = resolve('src/app/globals.css');

const ANCHOR = "@import '../styles/vault-teaser.css';";
const LINE = "@import '../styles/vault-window.css';";

let css = readFileSync(GLOBALS, 'utf8');

if (css.includes(LINE)) {
	console.log('wire-vault-window: already wired');
	process.exit(0);
}

if (!css.includes(ANCHOR)) {
	console.error(
		`wire-vault-window: anchor not found in globals.css: ${ANCHOR}`
	);
	process.exit(1);
}

/* Preserve whatever line ending the file already uses - globals.css is
   CRLF, and writing a lone LF into it produces a mixed-ending file that
   shows up as a spurious diff for everyone else. */
const eol = css.includes('\r\n') ? '\r\n' : '\n';

css = css.replace(ANCHOR, `${ANCHOR}${eol}${LINE}`);
writeFileSync(GLOBALS, css, 'utf8');

console.log('wire-vault-window: patched src/app/globals.css');
