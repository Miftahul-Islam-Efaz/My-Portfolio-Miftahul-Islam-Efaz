// Scratch, idempotent. Run from repo root: node scripts/patch-accent-fix.mjs
// 1. line 2 down 20%   2. --comp-ink collision fix (the accent bug)
// 3. one-letter words stay solid
import { readFileSync, writeFileSync } from 'node:fs';

const edits = [];
const add = (file, label, oldStr, newStr) =>
  edits.push({ file, label, oldStr, newStr });

const CSS = 'src/styles/compositor.css';
const HOOK = 'src/hooks/useCompositor.ts';
const TSX = 'src/components/compositor/CompositorSection.tsx';

/* ---------- 1. line 2 smaller by 20% ---------- */

add(
  CSS,
  'css: spec line down 20%',
  '\t--face-scale: 0.52;',
  '\t--face-scale: 0.416;',
);

/* ---------- 2. the collision ---------- */

add(
  CSS,
  'css: fill scalar renamed at declaration',
  [
    '\t/* Both default to 0. --comp-ink is driven by scroll; --comp-ink-ready',
    '\t   is set to 1 by the hook ONLY after the plate decodes. Multiplying',
    '\t   the two means every path to a visible fill requires a real image. */',
    '\t--comp-ink: 0;',
    '\t--comp-ink-ready: 0;',
  ].join('\n'),
  [
    '\t/* --comp-fill is driven by scroll; --comp-ink-ready is set to 1 by',
    '\t   the hook ONLY after the plate decodes. Multiplying the two means',
    '\t   every path to a visible fill requires a real image.',
    '',
    '\t   NAMED --comp-fill, NOT --comp-ink. This scalar used to be called',
    '\t   --comp-ink, which is ALSO the name of the cream text colour',
    '\t   declared at the top of this file - and this block, being later,',
    '\t   won. So every rule reading --comp-ink as a COLOUR was handed the',
    '\t   number 0, became invalid at computed-value time, and silently fell',
    '\t   back to inherited colour. That killed three things at once: the',
    '\t   accent color-mix on the statement (the ember never rendered once,',
    '\t   under a margin note advertising it), the statement colour itself,',
    '\t   and the margin-note row colour. Custom properties do not care',
    '\t   that one is a colour and one is a number - keep the names',
    '\t   disjoint. */',
    '\t--comp-fill: 0;',
    '\t--comp-ink-ready: 0;',
  ].join('\n'),
);

add(
  CSS,
  'css: ink layer opacity reads the scalar',
  '\topacity: calc(var(--comp-ink) * var(--comp-ink-ready));',
  '\topacity: calc(var(--comp-fill) * var(--comp-ink-ready));',
);

add(
  CSS,
  'css: heavy cut retreat reads the scalar',
  '\t\t(1 - var(--comp-ink) * var(--comp-ink-ready))',
  '\t\t(1 - var(--comp-fill) * var(--comp-ink-ready))',
);

add(
  CSS,
  'css: veil reads the scalar',
  '\t\tvar(--comp-ink) * var(--comp-ink-ready) * var(--comp-veil-max)',
  '\t\tvar(--comp-fill) * var(--comp-ink-ready) * var(--comp-veil-max)',
);

/* ---------- 3. accent opt-out + one-letter words ---------- */

add(
  CSS,
  'css: accent opt-out + solid short words',
  ['.comp-word--accent {', '\t--comp-ink: 0;', '}'].join('\n'),
  [
    '.comp-word--accent {',
    '\t--comp-fill: 0;',
    '}',
    '',
    '/* ONE-LETTER WORDS STAY SOLID. The plate is viewport-anchored so that',
    '   one continuous image reads across the whole line - which means a',
    '   word only ever samples the slice of plate sitting behind it. A word',
    '   like "I" is a single thin stem: it samples a sliver, and if that',
    '   sliver is a dark tone the word is simply not there. The reader loses',
    '   a word and blames their eyes.',
    '',
    '   Same opt-out the accent uses, so these render as the flat cream cut.',
    '   Threshold is ONE letter - set in the component - so "it." still',
    '   fills. Raise it there if two-letter words start dropping out too. */',
    '.comp-word--solid {',
    '\t--comp-fill: 0;',
    '}',
  ].join('\n'),
);

add(
  HOOK,
  'hook: quickSetter writes the renamed scalar',
  "      const setInk = gsap.quickSetter(root, '--comp-ink');",
  "      const setInk = gsap.quickSetter(root, '--comp-fill');",
);

add(
  TSX,
  'markup: one-letter words marked solid',
  [
    '                const isAccent =',
    '                  li === COMPOSITOR_ACCENT_TARGET.line &&',
    '                  wi === COMPOSITOR_ACCENT_TARGET.word;',
    '',
    '                return (',
    '                  <span',
    '                    key={wi}',
    '                    className={',
    "                      isAccent ? 'comp-word comp-word--accent' : 'comp-word'",
    '                    }',
  ].join('\n'),
  [
    '                const isAccent =',
    '                  li === COMPOSITOR_ACCENT_TARGET.line &&',
    '                  wi === COMPOSITOR_ACCENT_TARGET.word;',
    '',
    '                /* Too narrow to hold a photograph - see the',
    '                   .comp-word--solid note in compositor.css. Punctuation',
    '                   is stripped first so a bare "I" counts as one letter',
    '                   while "it." counts as two and still fills. */',
    '                const isSolid =',
    "                  word.replace(/[^A-Za-z]/g, '').length <= 1;",
    '',
    '                return (',
    '                  <span',
    '                    key={wi}',
    '                    className={[',
    "                      'comp-word',",
    "                      isAccent ? 'comp-word--accent' : '',",
    "                      isSolid ? 'comp-word--solid' : '',",
    '                    ]',
    '                      .filter(Boolean)',
    "                      .join(' ')}",
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
