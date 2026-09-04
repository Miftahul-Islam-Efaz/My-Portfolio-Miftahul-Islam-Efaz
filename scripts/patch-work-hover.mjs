/**
 * One-shot patch script: wires the case study window into the WebGL carousel.
 *
 * WHY A SCRIPT. Three of the files that need changing are large and only need a
 * handful of exact lines touched - scene.js is 648 lines of shader plumbing,
 * config.js is 363 lines of tuning, globals.css is the site's import root.
 * Rewriting them wholesale to change eight lines is how comments and tuning
 * get silently lost, so the edits are expressed as exact string replacements
 * that fail loudly if their anchor has moved.
 *
 * Safe to delete after it has run. Kept in scripts/ so it is obvious it is not
 * part of the app.
 *
 *   node scripts/patch-work-hover.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const report = [];
let failed = 0;

/** Applies one exact replacement, or reports that its anchor has moved. */
function patch(file, label, find, replace) {
  const path = resolve(root, file);
  const before = readFileSync(path, 'utf8');

  if (before.includes(replace) && !before.includes(find)) {
    report.push(`SKIP  ${file} :: ${label} (already applied)`);
    return;
  }
  if (!before.includes(find)) {
    report.push(`FAIL  ${file} :: ${label} (anchor not found)`);
    failed += 1;
    return;
  }

  // Written back without a BOM - a BOM in a JS module is a parse error in the
  // Next build, and this project has been bitten by it before.
  writeFileSync(path, before.replace(find, replace), { encoding: 'utf8' });
  report.push(`OK    ${file} :: ${label}`);
}

/* =========================================================================
   1. config.js - switch off the two dither effects that answered to the
      pointer, and hand the click over to the case study window.

      WHAT STAYS ON: the depth dither (dither, ditherAmount ...), the entry
      dither, and the whole rack-focus block (dimFade, hoverBlur, hoverClean,
      hoverIntent, focusFalloff). Those are the hover effect that was asked to
      be kept - the card you point at stays clean while its neighbours dim and
      soften. Only the pointer-driven GRAIN goes.
   ========================================================================= */

patch(
  'src/components/work/dither/gl/config.js',
  'trail: dithered cursor trail off',
  'trail: true',
  'trail: false'
);

patch(
  'src/components/work/dither/gl/config.js',
  'hoverDither: hover grain off',
  'hoverDither: 0.3',
  'hoverDither: 0'
);

patch(
  'src/components/work/dither/gl/config.js',
  'clickToFocus: click opens the case study instead',
  'clickToFocus: true',
  'clickToFocus: false'
);

/* =========================================================================
   2. scene.js - report hover out of the engine, and route clicks.
   ========================================================================= */

patch(
  'src/components/work/dither/gl/scene.js',
  'createCarousel signature: hover + activate callbacks',
  'export function createCarousel(canvas, { onActiveChange, external = false } = {}) {',
  `export function createCarousel(
  canvas,
  { onActiveChange, onHoverChange, onCardActivate, external = false } = {}
) {`
);

patch(
  'src/components/work/dither/gl/scene.js',
  'lastHovered guard',
  '  let hovered = -1;',
  `  let hovered = -1;
  // Last value reported out. The pick runs every frame; React only needs to
  // hear about it when it actually changes, or the open cue would re-render
  // sixty times a second saying the same thing.
  let lastHovered = -1;`
);

patch(
  'src/components/work/dither/gl/scene.js',
  'hover reporting in tick()',
  '    canvas.style.cursor = hovered >= 0 ? "pointer" : "default";',
  `    canvas.style.cursor = hovered >= 0 ? "pointer" : "default";

    // The cards are planes on a helix inside a canvas: there is no element to
    // fire a mouseenter, and the hit test is a GPU readback. So hover has to
    // leave the engine by hand for the DOM cue to follow the cursor.
    if (hovered !== lastHovered) {
      lastHovered = hovered;
      onHoverChange?.(hovered);
    }`
);

patch(
  'src/components/work/dither/gl/scene.js',
  'onPointerUp: route the click to the case study',
  `  const onPointerUp = (event) => {
    if (!config.clickToFocus || hovered < 0) return;`,
  `  const onPointerUp = (event) => {
    if (hovered < 0) return;`
);

patch(
  'src/components/work/dither/gl/scene.js',
  'onPointerUp: activate before focus',
  `    locked = hovered;
    lockOrigin.x = event.clientX;
    lockOrigin.y = event.clientY;
    focusCard(hovered);`,
  `    // A click on a card opens its case study. The pointer position goes with
    // it because the window's hero plate flies from the click point - the card
    // itself is on the GPU and has no rect to fly from.
    onCardActivate?.(hovered, event.clientX, event.clientY);

    // Sending the card to the centre as well would only be seen after the
    // window closes, and it moves the helix under a stationary cursor. Off by
    // default now; the tuning below is kept in case focus mode is wanted back.
    if (!config.clickToFocus) return;

    locked = hovered;
    lockOrigin.x = event.clientX;
    lockOrigin.y = event.clientY;
    focusCard(hovered);`
);

/* =========================================================================
   3. globals.css - register the two new stylesheets next to the other work
      section styles, so the import root stays the map of the site's CSS.
   ========================================================================= */

patch(
  'src/app/globals.css',
  'stylesheet imports',
  "@import '../styles/work-theme.css';",
  `@import '../styles/work-theme.css';
@import '../styles/work-card-cue.css';
@import '../styles/work-case-study.css';`
);

/* ---- report ---- */

console.log(report.join('\n'));
console.log(failed ? `\n${failed} PATCH(ES) FAILED` : '\nALL PATCHES APPLIED');
process.exit(failed ? 1 : 0);
