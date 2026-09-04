// Scratch, idempotent. Run from repo root: node scripts/patch-plate-swap.mjs
// 1. new plate source  2. Monare big / ARK_ES small  3. readout weight fix
import { readFileSync, writeFileSync } from 'node:fs';

const edits = [];
const add = (file, label, oldStr, newStr) =>
  edits.push({ file, label, oldStr, newStr });

const CONTENT = 'src/components/compositor/compositorContent.ts';
const CONFIG = 'src/config/compositor.ts';
const CSS = 'src/styles/compositor.css';
const HOOK = 'src/hooks/useCompositor.ts';

/* ---------- 1. the new plate ---------- */

add(
  CONFIG,
  'config: new plate source',
  "  source: 'https://lh3.googleusercontent.com/d/1w6vaFXVQqF_zSLYKUZVwvL1sf9HGh-Qd',",
  "  source: 'https://lh3.googleusercontent.com/d/18CHo4_LcM3nUPxrRWbXX6vH_sBc2MIwK',",
);

add(
  CONFIG,
  'config: plate brief tells the truth',
  [
    '   The plate wants: hard raking light, no subject, no text, deep black',
    '   falloff on one side and ember heat on the other, exported as JPEG.',
    '   Anything busy reads as noise once it is clipped inside letterforms -',
    '   the fill needs ONE clear direction of light and little else.',
  ].join('\n'),
  [
    '   The plate wants: ONE broad horizontal wash of warm light, no subject,',
    '   no text, and nothing pure black anywhere - the darkest region must',
    '   stay a readable warm grey, because every region of this image ends up',
    '   being the inside of a letter.',
    '',
    '   The first plate was briefed the opposite way - a narrow diagonal beam',
    '   with deep black falloff - and the words that landed in its dark half',
    '   painted near-black glyphs on a near-black page and vanished. Half a',
    '   sentence, gone. Contrast that reads as drama in a photograph reads as',
    '   missing text once it is clipped to type.',
    '',
    '   Feature scale is the other rule: the glyph windows here are roughly',
    '   60-90px wide, so any texture finer than that gets sampled into',
    '   speckle. The smallest tonal feature must be LARGER than one letter.',
  ].join('\n'),
);

/* ---------- 2. Monare big, ARK_ES small ---------- */

add(
  CONTENT,
  'copy: pairing rationale follows the swap',
  [
    '   Line 1 - the line anyone could write - is set in ARK_ES Dense, the',
    '   same spec face as the sheet furniture around it. Line 2 - the line',
    '   about setting it - is set in Monare, a display face, and it is where',
    '   the ember and the ink fill land. Raw material against judgement,',
    '   stated in the type itself and not only in the motion.',
  ].join('\n'),
  [
    '   Line 1 is set LARGE in Monare, the display face. Line 2 is set SMALL',
    '   in ARK_ES Dense, the same spec face as the sheet furniture around it.',
    '',
    '   The fill decides this, not the semantics. Monare is a clean condensed',
    '   face whose counters hold a photographic plate; ARK_ES Dense is a',
    '   beaded face that samples the same plate into rubble at display size.',
    '   So the ink belongs on line 1, which means the display face does too.',
    '',
    '   Monare ships a single weight, so the fake weight axis cannot run on',
    '   line 1 at all. The SIZE drop between the lines carries the turn',
    '   instead: one huge opening claim, then one small exact line beneath it,',
    '   which is the one that reads as deliberate. Scale is a typesetting',
    '   decision too - arguably the first one anybody makes.',
  ].join('\n'),
);

add(
  CONTENT,
  'copy: faces swapped',
  [
    'export const COMPOSITOR_STATEMENT = [',
    "  { face: 'spec', words: ['Anyone', 'can', 'write', 'this', 'sentence.'] },",
    '  {',
    "    face: 'display',",
    "    words: ['Look', 'what', 'happens', 'when', 'I', 'set', 'it.'],",
    '  },",'.replace('",', ''),
    '] as const;',
  ].join('\n'),
  [
    'export const COMPOSITOR_STATEMENT = [',
    "  { face: 'display', words: ['Anyone', 'can', 'write', 'this', 'sentence.'] },",
    '  {',
    "    face: 'spec',",
    "    words: ['Look', 'what', 'happens', 'when', 'I', 'set', 'it.'],",
    '  },',
    '] as const;',
  ].join('\n'),
);

add(
  CSS,
  'css: spec line becomes the small one',
  ['.comp-line--spec {', '\tfont-family: var(--font-ark-es-dense);', '\t--w-light: 300;', '\t--w-heavy: 700;', '\t--face-scale: 0.94;', '}'].join('\n'),
  [
    '.comp-line--spec {',
    '\tfont-family: var(--font-ark-es-dense);',
    '\t--w-light: 300;',
    '\t--w-heavy: 700;',
    '\t/* The small line. This is the whole size contrast of the pairing, and',
    '\t   it lives here rather than on .comp-statement font-size because that',
    '\t   font-size IS the scale ramp the corner readout prints. */',
    '\t--face-scale: 0.52;',
    '}',
  ].join('\n'),
);

/* ---------- 3. the plate carries its own floor now ---------- */

add(
  CSS,
  'css: ink floor down to match the new plate',
  '\t--comp-ink-floor: #7d766b;',
  [
    '\t/* Minimum the plate can paint inside a glyph, via background-blend-mode:',
    '\t   lighten. It was #7d766b to rescue the first plate, whose shadows went',
    '\t   to true black - a heavy lift that flattened the darks to grey. The',
    '\t   current plate never goes below a warm charcoal on its own, so this',
    '\t   only has to catch the very bottom and contrast comes back. */',
    '\t--comp-ink-floor: #3a332c;',
  ].join('\n'),
);

/* ---------- 4. the readout stops printing a weight that does not exist ---------- */

add(
  HOOK,
  'hook: readout snaps to real cuts',
  [
    '          /* Snapped to the eight real Cabinet Grotesk cuts. The axis is',
    '             faked by blending two of them, but the number printed is a',
    '             weight that actually exists on disk - annotating a 437 would',
    '             be a lie about the material. */',
    '          const cuts = [100, 200, 300, 400, 500, 700, 800, 900];',
    '          const idx = Math.min(',
    '            cuts.length - 1,',
    '            Math.round(w * (cuts.length - 1)),',
    '          );',
    "          print(numWeight, 'weight', String(cuts[idx]));",
  ].join('\n'),
  [
    '          /* Snapped to the real ARK_ES cuts - the cuts the spec line',
    '             actually blends. The old list was the eight Cabinet Grotesk',
    '             cuts walked by INDEX, so the end of the scroll printed 900:',
    '             a weight no font in this section ships, sitting directly',
    '             under a margin note that correctly read 300 -> 700. Two',
    '             annotations disagreeing about the same type is the exact',
    '             failure this sheet argues against.',
    '',
    '             So interpolate the real axis, then snap to a file that is',
    '             on disk. Printing a blended 437 would be just as false.',
    '             Change the cut list if the pairing changes family. */',
    '          const cuts = [300, 400, 500, 700];',
    '          const exact = gsap.utils.interpolate(',
    '            COMPOSITOR_READOUT.weightFrom,',
    '            COMPOSITOR_READOUT.weightTo,',
    '            w,',
    '          );',
    '          const snapped = cuts.reduce((best, cut) =>',
    '            Math.abs(cut - exact) < Math.abs(best - exact) ? cut : best,',
    '          );',
    "          print(numWeight, 'weight', String(snapped));",
  ].join('\n'),
);

/* ---------- apply ---------- */

let failed = 0;
const cache = new Map();
const read = (f) => {
  if (!cache.has(f)) cache.set(f, readFileSync(f, 'utf8'));
  return cache.get(f);
};

for (const { file, label, oldStr, newStr } of edits) {
  const raw = read(file);
  const crlf = raw.includes('\r\n');
  const fix = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);
  const o = fix(oldStr);
  const n = fix(newStr);

  if (raw.includes(n)) {
    console.log(`SKIP  ${label}`);
    continue;
  }
  const hits = raw.split(o).length - 1;
  if (hits !== 1) {
    console.log(`MISS  ${label} (${hits} matches)`);
    failed += 1;
    continue;
  }
  cache.set(file, raw.replace(o, n));
  console.log(`OK    ${label}`);
}

if (failed) {
  console.log(`\n${failed} PATCH(ES) FAILED - nothing written`);
  process.exitCode = 1;
} else {
  for (const [file, text] of cache) writeFileSync(file, text);
  console.log('\nALL PATCHES OK');
}
