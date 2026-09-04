/**
 * Second half of the rebuild-loop fix.
 *
 * WHY A SECOND SCRIPT. The first one applied three of five patches and reported
 * the other two as "anchor not found" - correctly. DitherCarousel.tsx is stored
 * with CRLF line endings and the anchors were written with LF, so the two
 * multi-line anchors could never match while the single-line ones did. That is
 * the failure mode the loud FAIL was there to catch.
 *
 * This pass matches line endings with \r?\n instead of assuming either, and
 * normalises the file to CRLF at the end so the block inserted by the first
 * script stops being the only LF region in the file.
 *
 *   node scripts/fix-carousel-rebuild-2.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'src/components/work/DitherCarousel.tsx');
let source = readFileSync(path, 'utf8');
const report = [];
let failed = 0;

/** Regex replacement with a loud failure if the pattern has moved. */
function patch(label, pattern, replacement, expected = 1) {
  const matches = source.match(new RegExp(pattern, 'g'));
  const found = matches ? matches.length : 0;

  if (found !== expected) {
    report.push(`FAIL  ${label} (expected ${expected} match, found ${found})`);
    failed += 1;
    return;
  }
  source = source.replace(new RegExp(pattern), replacement);
  report.push(`OK    ${label}`);
}

/* 1. Call the stable reference the first script introduced. */
patch(
  'openFrom calls requestOpen',
  'overlay\\.open\\(project\\.id, \\{ x, y \\}\\);',
  'requestOpen(project.id, { x, y });'
);

/* 2. And depend on it rather than on the whole controller object - this is the
      actual fix. `[overlay]` was a new object every render, so openFrom was a
      new function every render, so the GL effect below re-ran every render. */
patch(
  'openFrom dependency list',
  '\\[overlay\\](\\r?\\n\\s*)\\);',
  '[requestOpen]$1);'
);

/* 3. Replace the comment that claimed this was already safe. */
patch(
  'GL effect dependency warning',
  '/\\* openFrom is stable per overlay controller[\\s\\S]*?\\*/',
  `/* NOTHING THAT CHANGES IDENTITY PER RENDER MAY GO IN THIS LIST. This
       effect builds a WebGL context, an IntersectionObserver and a pinned
       ScrollTrigger. If it re-runs, all three are torn down and rebuilt, the
       START_SLOT seed written onto scroll.state is thrown away, and the entry
       animation never gets the second it needs to finish - which shows up as a
       black canvas parked on whichever card sits at progress 0.

       openFrom is memoised against the overlay's \`open\`, which the hook
       memoises with an empty dependency list, so it is stable for the life of
       the component and this runs exactly once. Do not put \`overlay\` here. */`
);

/* 4. One line ending per file. */
const before = source;
source = source.replace(/\r?\n/g, '\r\n');
report.push(
  before === source ? 'SKIP  line endings (already CRLF)' : 'OK    line endings normalised to CRLF'
);

if (!failed) writeFileSync(path, source, { encoding: 'utf8' });

console.log(report.join('\n'));
console.log(failed ? `\n${failed} PATCH(ES) FAILED - nothing written` : '\nALL PATCHES APPLIED');
process.exit(failed ? 1 : 0);
