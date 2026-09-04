/**
 * Four fixes from the first real pass over the work section.
 *
 * 1. THE CUE APPEARED LATE. It was following `hovered`, which hoverIntent holds
 *    back until the pointer settles. That gate is right for the rack focus - a
 *    snap on every card the cursor sweeps past would strobe - and wrong for the
 *    cue, which is a label for what is under the cursor right now. It now
 *    follows the raw pick.
 *
 * 2. THE PAPER MOTION CAME BACK. It was never the dither: composite.js line 301
 *    is `push = trailVelocity * uTrailWarp * trailMask`, and the trail buffer is
 *    the only thing that carries pointer velocity. Switching `trail` off to kill
 *    the grain also switched off the warp that made the cards move like paper.
 *    The buffer is back on, and the GRAIN alone is zeroed - the trail dither is
 *    gated by uTrailAmount (line 387) while the warp is not.
 *
 * 3. PLUS COLOUR AND SHAPE. Terracotta on the off-white square, rounded corners.
 *
 * 4. THE CASE STUDY WOULD NOT SCROLL. Lenis binds wheel and touch on the window
 *    and calls preventDefault, so a natively scrolling element gets its events
 *    eaten - and stopping Lenis does not undo that. `data-lenis-prevent` is the
 *    documented opt-out.
 *
 *   node scripts/fix-hover-and-scroll.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const report = [];
const pending = new Map();
let failed = 0;

function read(file) {
  if (!pending.has(file)) {
    pending.set(file, readFileSync(resolve(root, file), 'utf8'));
  }
  return pending.get(file);
}

/** Regex replacement, loud if the anchor has moved or is ambiguous. */
function patch(file, label, pattern, replacement, expected = 1) {
  const source = read(file);
  const matches = source.match(new RegExp(pattern, 'g'));
  const found = matches ? matches.length : 0;

  if (found !== expected) {
    report.push(`FAIL  ${file} :: ${label} (wanted ${expected}, found ${found})`);
    failed += 1;
    return;
  }
  pending.set(file, source.replace(new RegExp(pattern), replacement));
  report.push(`OK    ${file} :: ${label}`);
}

const CONFIG = 'src/components/work/dither/gl/config.js';
const SCENE = 'src/components/work/dither/gl/scene.js';
const CUE_TSX = 'src/components/work/CardOpenCue.tsx';
const CUE_CSS = 'src/styles/work-card-cue.css';
const CS_CONFIG = 'src/config/caseStudy.ts';
const WINDOW = 'src/components/work/case-study/CaseStudyWindow.tsx';

/* =========================================================================
   1. THE PAPER MOTION
   ========================================================================= */

patch(
  CONFIG,
  'trail buffer back on (motion, not grain)',
  '\\n  trail: false,',
  `\n  // BACK ON, BUT SILENT. The trail buffer is the only thing in the pipeline
  // that remembers pointer velocity, and trailWarp below feeds that velocity
  // into the composite's uv push - which is what makes the cards bend and
  // shift like paper under the cursor. Switching this off to remove the
  // dithered trail took the motion with it. The GRAIN is killed by
  // trailAmount: 0 instead, which gates the trail's dither and nothing else.
  trail: true,`
);

patch(
  CONFIG,
  'trail dither silenced (trailAmount 0)',
  'trailAmount: 0\\.78,',
  `// ZERO ON PURPOSE - this is "remove the dither hover effect". It scales the
  // trail's posterised dither only (composite.js: trailShaped). The warp, the
  // velocity and the motion all survive it.
  trailAmount: 0,`
);

/* =========================================================================
   2. THE CUE, IMMEDIATELY
   ========================================================================= */

patch(
  SCENE,
  'cue follows the raw pick',
  'if \\(hovered !== lastHovered\\) \\{\\r?\\n\\s*lastHovered = hovered;\\r?\\n\\s*onHoverChange\\?\\.\\(hovered\\);\\r?\\n\\s*\\}',
  `// REPORT THE RAW PICK, NOT \`hovered\`. hoverIntent holds \`hovered\` back
    // until the pointer settles, which is what stops the rack focus strobing
    // across every card a fast cursor sweeps over. The cue is not a focus
    // decision though - it is a label for whatever is under the pointer right
    // now - so gating it made it look broken until the cursor stopped moving.
    const cueTarget = locked >= 0 ? locked : picked;
    if (cueTarget !== lastHovered) {
      lastHovered = cueTarget;
      onHoverChange?.(cueTarget);
    }`
);

/* A click has to land whenever the cue is showing, so it uses the same value
   the cue does when the intent gate has not committed yet. */
patch(
  SCENE,
  'click uses the cue target',
  'const onPointerUp = \\(event\\) => \\{\\r?\\n\\s*if \\(hovered < 0\\) return;',
  `const onPointerUp = (event) => {
    // Whatever the cue is pointing at is what a click must open. \`hovered\` is
    // intent-gated and can still be -1 at the moment of a quick click, so fall
    // back to the raw pick that was last reported out.
    const target = hovered >= 0 ? hovered : lastHovered;
    if (target < 0) return;`
);

patch(
  SCENE,
  'activate with target',
  'onCardActivate\\?\\.\\(hovered, event\\.clientX, event\\.clientY\\);',
  'onCardActivate?.(target, event.clientX, event.clientY);'
);

patch(SCENE, 'lock the target', 'locked = hovered;', 'locked = target;');
patch(SCENE, 'focus the target', 'focusCard\\(hovered\\);', 'focusCard(target);');

/* =========================================================================
   3. CUE COLOUR AND CORNERS
   ========================================================================= */

patch(
  CS_CONFIG,
  'CUE.radius',
  '(\\r?\\n)(\\s*)size: 34,',
  `$1$2/** Corner radius of the square, px. Softened on request - the mark still
$2 *  reads as a square at 34px, which is the point. */
$2radius: 9,
$2size: 34,`
);

patch(
  CUE_TSX,
  'cue radius variable',
  "\\['--cue-size' as string\\]: `\\$\\{CUE\\.size\\}px`,",
  "['--cue-size' as string]: `${CUE.size}px`,\n        ['--cue-radius' as string]: `${CUE.radius}px`,"
);

patch(
  CUE_TSX,
  'plus drawn in ember',
  "\\['--cue-ink' as string\\]: WORK_THEME\\.bgVoid,",
  `/* The plus is the section's one terracotta point, on the off-white
           square. WORK_THEME caps ember at points rather than areas, and a
           34px mark under the cursor is exactly a point. */
        ['--cue-ink' as string]: WORK_THEME.ember,`
);

patch(
  CUE_CSS,
  'cue corner radius',
  'border-radius: 0;',
  'border-radius: var(--cue-radius);'
);

/* =========================================================================
   4. SCROLL INSIDE THE WINDOW
   ========================================================================= */

patch(
  WINDOW,
  'data-lenis-prevent on the scroller',
  '<div className="case-study__scroller" ref=\\{scrollerRef\\}>',
  `{/* data-lenis-prevent IS LOAD-BEARING. Lenis binds wheel and touch on the
            window and calls preventDefault on them, so an element that scrolls
            natively inside the page never sees its own events - which is why
            this panel would not scroll even though Lenis was stopped. Stopping
            Lenis stops it moving the page; it does not stop it swallowing the
            events. This attribute is Lenis's documented opt-out: anything
            originating inside the element is left alone. */}
        <div
          className="case-study__scroller"
          ref={scrollerRef}
          data-lenis-prevent
        >`
);

/* ---- write only if every patch landed ---- */

if (!failed) {
  for (const [file, source] of pending) {
    writeFileSync(resolve(root, file), source, { encoding: 'utf8' });
  }
}

console.log(report.join('\n'));
console.log(
  failed ? `\n${failed} PATCH(ES) FAILED - nothing written` : '\nALL PATCHES APPLIED'
);
process.exit(failed ? 1 : 0);
