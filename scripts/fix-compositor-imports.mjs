/* Follow-up to fix-compositor-metrics.mjs, whose "unused imports"
   anchor failed: it listed COMPOSITOR_EYEBROW and COMPOSITOR_DECISIONS
   as adjacent lines, but COMPOSITOR_NOTES sits between them in the real
   import list. Removing them one line at a time instead. */

import { readFileSync, writeFileSync } from 'node:fs';

const FILE =
  'D:\\website\\nextjs-site\\src\\components\\compositor\\CompositorSection.tsx';

let src = readFileSync(FILE, 'utf8');
let failed = 0;

for (const name of ['COMPOSITOR_EYEBROW', 'COMPOSITOR_DECISIONS']) {
  const re = new RegExp(`[ \\t]*${name},\\r?\\n`);
  if (!re.test(src)) {
    console.log(`FAIL  ${name} import (anchor not found)`);
    failed += 1;
    continue;
  }
  src = src.replace(re, '');
  console.log(`OK    ${name} import removed`);
}

writeFileSync(FILE, src, 'utf8');
console.log(failed ? `\n${failed} FAILED` : '\nALL PATCHES OK');
