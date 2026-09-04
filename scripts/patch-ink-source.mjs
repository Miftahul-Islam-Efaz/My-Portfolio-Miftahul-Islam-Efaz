// Scratch, idempotent. Points the ink plate at the public Drive URL and
// gives the preload a local fallback. Safe to delete after verifying.
import { readFileSync, writeFileSync } from 'node:fs';

const L = (...lines) => lines.join('\n');

const patches = [
  {
    file: 'src/config/compositor.ts',
    name: 'config: drive source + fallback',
    old: L(
      "  /* Self-hosted under /public on purpose. Hotlinked Drive URLs are what",
      "     produced today's 429s and blank cards; an image this section cannot",
      '     render without does not go through a third party. */',
      "  source: '/plate/ink-fill.jpg',",
    ),
    new: L(
      '  /* Primary is the public Drive-hosted plate. Unlike the work helix -',
      '     which uploads its images as WebGL textures and therefore needs them',
      '     CORS-readable - this plate is only ever a CSS background-image plus',
      '     an Image() preload. Neither requires CORS, which is why a Drive URL',
      '     is safe HERE and was not safe there.',
      '',
      '     `fallback` is the self-hosted copy under /public. If Drive throttles',
      "     the hotlink (the 429s from earlier) the preload retries locally, so a",
      '     rate-limited third party can never cost us the fill. */',
      "  source: 'https://lh3.googleusercontent.com/d/1w6vaFXVQqF_zSLYKUZVwvL1sf9HGh-Qd',",
      "  fallback: '/plate/ink-fill.jpg',",
    ),
  },
  {
    file: 'src/hooks/useCompositor.ts',
    name: 'hook: preload chain + var rewrite',
    old: L(
      '    const inkPlate = new Image();',
      '    inkPlate.onload = () => {',
      "      root.style.setProperty('--comp-ink-ready', '1');",
      '    };',
      '    inkPlate.onerror = () => {',
      '      console.warn(',
      '        `[compositor] ink plate not found at ${COMPOSITOR_INK.source} - ` +',
      "          'statement stays flat off-white. Drop a JPEG there to enable the fill.',",
      '      );',
      '    };',
      '    inkPlate.src = COMPOSITOR_INK.source;',
    ),
    new: L(
      '    /* Two candidates, tried in order: the Drive-hosted plate, then the',
      '       self-hosted copy. Anything that stops the remote file arriving - a',
      '       429, an offline dev box, a revoked share - falls through to /public',
      '       rather than silently dropping the fill. */',
      '    const inkSources: readonly string[] = [',
      '      COMPOSITOR_INK.source,',
      '      COMPOSITOR_INK.fallback,',
      '    ];',
      '    const inkPlate = new Image();',
      '    let inkAttempt = 0;',
      '',
      '    const loadInkSource = (): void => {',
      '      const next = inkSources[inkAttempt];',
      '      if (next) inkPlate.src = next;',
      '    };',
      '',
      '    inkPlate.onload = () => {',
      '      /* The section carries --comp-ink-image inline from the PRIMARY',
      '         source, so a successful fallback must rewrite it or every CSS',
      '         layer would still point at the URL that just failed. */',
      '      root.style.setProperty(',
      "        '--comp-ink-image',",
      '        `url(${inkSources[inkAttempt]})`,',
      '      );',
      "      root.style.setProperty('--comp-ink-ready', '1');",
      '    };',
      '    inkPlate.onerror = () => {',
      '      const failed = inkSources[inkAttempt];',
      '      inkAttempt += 1;',
      '      if (inkAttempt < inkSources.length) {',
      '        console.warn(',
      '          `[compositor] ink plate failed from ${failed} - ` +',
      '            `retrying ${inkSources[inkAttempt]}`,',
      '        );',
      '        loadInkSource();',
      '        return;',
      '      }',
      '      console.warn(',
      '        `[compositor] ink plate unavailable from every source ` +',
      '          `(${inkSources.join(", ")}) - statement stays flat off-white.`,',
      '      );',
      '    };',
      '    loadInkSource();',
    ),
  },
];

let failed = false;
for (const p of patches) {
  const raw = readFileSync(p.file, 'utf8');
  const crlf = raw.includes('\r\n');
  const fix = (s) => (crlf ? s.replace(/\n/g, '\r\n') : s);
  const oldStr = fix(p.old);
  const newStr = fix(p.new);

  if (raw.includes(newStr)) {
    console.log(`SKIP  ${p.name}`);
    continue;
  }
  if (!raw.includes(oldStr)) {
    console.log(`MISS  ${p.name}  <- anchor not found`);
    failed = true;
    continue;
  }
  writeFileSync(p.file, raw.replace(oldStr, newStr));
  console.log(`OK    ${p.name}`);
}
console.log(failed ? 'SOME PATCHES MISSED' : 'ALL PATCHES OK');
