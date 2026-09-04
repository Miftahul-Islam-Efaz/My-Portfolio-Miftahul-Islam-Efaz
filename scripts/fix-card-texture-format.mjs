/**
 * Normalise every card texture to JPEG via lh3's own transcoder.
 *
 * WHAT WAS RULED OUT FIRST (so nobody re-tests these):
 *   - Permissions / CORS. All 8 return 200 with `Access-Control-Allow-Origin: *`
 *     and `Vary: Origin`, verified WITH an Origin header, not just without.
 *   - File size and dimensions. All 8 are ~1600x900, 1.4 MP. Type Archive is the
 *     LARGEST file of the set at 1.99 MB.
 *   - Alpha. PNG colour type is 2 (RGB) on all three PNGs - no alpha channel.
 *   - Brightness. Card and case study use the same URL, and the Bela Vista
 *     plate renders bright yellow in the overlay, so "too dark to see" is out.
 *   - A late-texture race. scene.js assigns uMap in the load callback whenever
 *     it resolves, with no deadline attached.
 *
 * WHAT IS LEFT. The only property that separates the blank cards from the
 * working ones is the codec: the blanks are PNG at 1600x900, the six that work
 * are JPEG at 1600x893. The card fragment shader keys its colour off texture
 * ALPHA - `mix(uBackground, tex.rgb, tex.a * fade)` - and the loader requests
 * mipmaps with LinearMipmapLinearFilter on a non-power-of-two texture. Both are
 * places where a PNG-decoded RGBA upload can diverge from a JPEG one, and both
 * are in the GL path only, which is exactly why the plain <img> in the case
 * study is unaffected.
 *
 * THE FIX. Append `=w1600-rj` to each Drive URL. `-rj` makes lh3 return JPEG
 * from the same origin with the same CORS headers, so all eight textures take
 * one identical decode path. It also cuts the three PNGs from 4.79 MB to
 * 0.51 MB, which is worth having on its own.
 *
 * Deliberately scoped to the CARD textures. caseStudyData.ts keeps the
 * untranscoded originals: those plates render at full width in the overlay and
 * are demonstrably working, so there is no reason to touch them.
 *
 *   node scripts/fix-card-texture-format.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = 'src/components/work/workProjectsData.ts';
const path = resolve(process.cwd(), file);
let source = readFileSync(path, 'utf8');

/* Matches the bare /d/<id> form only. Anything already carrying an `=` suffix
   is skipped, so re-running this is a no-op rather than a double-append. */
const pattern =
  /(imageUrl: 'https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+)'/g;

const matches = source.match(pattern);
const found = matches ? matches.length : 0;

if (found !== 8) {
  console.log(
    `FAIL  ${file} :: expected 8 bare card URLs, found ${found} - nothing written`
  );
  process.exit(1);
}

source = source.replace(pattern, "$1=w1600-rj'");

writeFileSync(path, source, { encoding: 'utf8' });
console.log(`OK    ${file} :: ${found} card textures pinned to =w1600-rj (JPEG)`);
