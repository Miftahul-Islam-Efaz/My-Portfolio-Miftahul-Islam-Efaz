/**
 * Invert the open cue: terracotta square, off-white plus.
 *
 * The first pass read "keep the plus #b56c4b" as the strokes. It meant the
 * FILL. So --cue-paper (the square) becomes ember and --cue-ink (the two
 * hairlines of the plus) becomes the off-white accent.
 *
 * WHY THE OFF-WHITE IS THE RIGHT CONTRAST AND NOT THE VOID. Against ember
 * (#b56c4b, mid-tone) the near-black void (#050505) and the accent (#F5F1E8)
 * are both legible, but the void loses the mark entirely when the square sits
 * over a dark region of a card - the plus and the field behind the cue become
 * the same colour and the square reads as a solid terracotta chip. The
 * off-white always separates from ember AND from whatever is behind it.
 *
 *   node scripts/fix-cue-colours.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = 'src/components/work/CardOpenCue.tsx';
const path = resolve(process.cwd(), file);
let source = readFileSync(path, 'utf8');

/* Both custom properties are replaced in one go, comment included, so the
   explanation cannot drift away from the values it explains. */
const pattern =
  /\/\* The plus is the section's one terracotta point[\s\S]*?\['--cue-paper' as string\]: WORK_THEME\.accent,/;

if (!pattern.test(source)) {
  console.log(`FAIL  ${file} :: anchor not found - nothing written`);
  process.exit(1);
}

source = source.replace(
  pattern,
  `/* THE SQUARE IS THE TERRACOTTA, the plus is cut out of it. Ember is a
           mid-tone, so the off-white is the safer of the two contrasts: the
           near-black void would vanish into any dark region of a card the cue
           happens to be sitting over, leaving a solid terracotta chip with no
           plus in it. workTheme.ts allows ember on points, and a 34px mark
           under the cursor is a point. */
        ['--cue-ink' as string]: WORK_THEME.accent,
        ['--cue-paper' as string]: WORK_THEME.ember,`
);

writeFileSync(path, source, { encoding: 'utf8' });
console.log(`OK    ${file} :: cue colours inverted (square ember, plus accent)`);
`;`;
