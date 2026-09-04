/**
 * FOUR FIXES to the case study window.
 *
 * 1. THE CLAIM WAS TOO BIG. It was set at clamp(2rem, 5.4vw, 5.2rem) - 83px at
 *    desktop - which put five lines across two thirds of the frame and left the
 *    showcase image with nowhere to be seen. It comes down to a 52px ceiling
 *    and a 17ch measure, which lands it at four lines inside the left half.
 *    The cover is a photograph with a sentence on it; at 83px it was a title
 *    card with a photograph behind it.
 *
 * 2. CONTRAST BEHIND THE TYPE. A blurred pad now sits under the text block
 *    only - a masked backdrop-filter, so it dissolves at its edges instead of
 *    ending on a visible rectangle. The scrim above it is lightened to
 *    compensate, because two full-strength darkeners stacked would flatten the
 *    plate into a grey field.
 *
 * 3. THE PILLS BROKE OVER PAPER. The frosted state filled them with
 *    paper-raised at 76% - cream on cream - so both the container and the type
 *    disappeared. The container now goes to a translucent INK wash, which is
 *    what lets the raised inner pill stay lighter than the thing it sits in.
 *    That relationship is the whole construction; over paper it was inverted.
 *
 * 4. BUTTON TEXTURE AND MOTION. Layered gradient, specular top edge, seated
 *    inner shadow, a sheen that crosses on hover, and press feedback.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles/work-case-study.css';

const TEXTURE_BLOCK = `/* ------------------------------------------------------------------ */
/* BUTTON TEXTURE + MOTION                                            */
/* ------------------------------------------------------------------ */

/* The reference's controls are not flat fills - they are lit. Three layers do
   all of it, and the order matters:
 *   1. A top-down gradient, lighter at the top edge. This alone is what makes
 *      a pill look like a physical object rather than a rounded rectangle.
 *   2. A 1px specular inset along the top - the highlight where a raised
 *      surface catches light.
 *   3. A soft drop beneath, to seat it above whatever it is floating over.
 * The colours are the site's - bone (--cs-on-dark) over carbon, ink over
 * paper. No new hues enter here. */

.case-study__back,
.case-study__tabs,
.case-study__bar-right {
  background-image: linear-gradient(
    to bottom,
    rgba(245, 241, 232, 0.14) 0%,
    rgba(245, 241, 232, 0.04) 52%,
    rgba(5, 5, 5, 0.06) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(245, 241, 232, 0.22),
    inset 0 -1px 0 rgba(5, 5, 5, 0.14),
    0 10px 30px rgba(5, 5, 5, 0.28);
}

.case-study__bar[data-frosted='true'] .case-study__back,
.case-study__bar[data-frosted='true'] .case-study__tabs,
.case-study__bar[data-frosted='true'] .case-study__bar-right {
  background-image: linear-gradient(
    to bottom,
    rgba(23, 22, 20, 0.03) 0%,
    rgba(23, 22, 20, 0.07) 100%
  );
}

/* The raised items get the same treatment one stop brighter, so they read as
   sitting ON the container rather than cut out of it. */
.case-study__tab[data-active='true'],
.case-study__cta {
  background-image: linear-gradient(
    to bottom,
    rgba(245, 241, 232, 0.16) 0%,
    rgba(245, 241, 232, 0) 60%,
    rgba(5, 5, 5, 0.08) 100%
  );
}

/* MOTION. One curve for everything that responds to a pointer - slightly
   overshooting, which is what makes a control feel sprung rather than eased.
   Kept short: 240ms, because a button that takes longer than that feels like
   it is thinking. */
.case-study__back,
.case-study__tab,
.case-study__cta,
.case-study__menu-button {
  transform: translateZ(0);
  transition:
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
    background 340ms ease,
    background-image 340ms ease,
    color 340ms ease,
    box-shadow 340ms ease,
    opacity 240ms ease;
}

.case-study__back:hover,
.case-study__cta:hover,
.case-study__menu-button:hover {
  transform: translateY(-1.5px);
}

/* Press. Both the lift and a hair of scale, so the finger feels like it has
   pushed the surface down rather than nudged it. */
.case-study__back:active,
.case-study__tab:active,
.case-study__cta:active,
.case-study__menu-button:active {
  transform: translateY(0) scale(0.97);
}

.case-study__back:active {
  transition-duration: 90ms;
}

/* THE SHEEN. A soft band that crosses the button once on hover - the moving
   highlight from the video. overflow:hidden on the button clips it to the
   pill, and the mask keeps its ends from arriving as hard edges. */
.case-study__cta,
.case-study__tab[data-active='true'] {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.case-study__cta::after,
.case-study__tab[data-active='true']::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(
    105deg,
    transparent 32%,
    rgba(245, 241, 232, 0.42) 50%,
    transparent 68%
  );
  transform: translateX(-120%);
}

.case-study__cta:hover::after,
.case-study__tab[data-active='true']:hover::after {
  opacity: 1;
  animation: cs-sheen 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Over paper the sheen is a shadow, not a light - a bone-coloured sweep across
   an ink pill would be invisible. */
.case-study__bar[data-frosted='true'] .case-study__cta::after {
  background: linear-gradient(
    105deg,
    transparent 32%,
    rgba(245, 241, 232, 0.3) 50%,
    transparent 68%
  );
}

.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true']::after {
  background: linear-gradient(
    105deg,
    transparent 32%,
    rgba(23, 22, 20, 0.08) 50%,
    transparent 68%
  );
}

@keyframes cs-sheen {
  from { transform: translateX(-120%); }
  to   { transform: translateX(120%); }
}

/* The icons pick up the motion at half amplitude - enough to feel connected to
   the label, not enough to read as a second animation. */
.case-study__cta-icon,
.case-study__tab-icon {
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 240ms ease;
}

.case-study__cta:hover .case-study__cta-icon {
  opacity: 1;
  transform: translateX(-1px) scale(1.06);
}

/* The dots turn a quarter when the menu is open, so the button reports its own
   state instead of relying on the panel to do it. */
.case-study__menu-button {
  transition:
    transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1),
    background 240ms ease,
    opacity 240ms ease;
}

.case-study__menu-button[aria-expanded='true'] {
  transform: rotate(90deg);
}

.case-study__menu-button[aria-expanded='true']:hover {
  transform: rotate(90deg) translateY(-1.5px);
}

/* Motion is decoration here; texture is not. Under reduced motion the pills
   keep their lighting and lose every transform. */
@media (prefers-reduced-motion: reduce) {
  .case-study__back,
  .case-study__tab,
  .case-study__cta,
  .case-study__menu-button,
  .case-study__cta-icon,
  .case-study__tab-icon {
    transition: background 200ms ease, color 200ms ease;
    transform: none;
  }

  .case-study__cta:hover::after,
  .case-study__tab[data-active='true']:hover::after {
    animation: none;
    opacity: 0;
  }

  .case-study__menu-button[aria-expanded='true'] {
    transform: none;
  }
}

`;

const edits = [
  {
    label: 'lighten the scrim now that the text has its own pad',
    oldStr: `  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.9) 0%,
    rgba(5, 5, 5, 0.62) 26%,
    rgba(5, 5, 5, 0.14) 58%,
    rgba(5, 5, 5, 0.44) 100%
  );`,
    newStr: `  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.72) 0%,
    rgba(5, 5, 5, 0.46) 26%,
    rgba(5, 5, 5, 0.1) 58%,
    rgba(5, 5, 5, 0.4) 100%
  );`,
  },
  {
    label: 'add the masked blur pad behind the cover text',
    oldStr: `  gap: clamp(16px, 2vw, 28px);
  align-items: end;
  color: var(--cs-on-dark);
}`,
    newStr: `  gap: clamp(16px, 2vw, 28px);
  align-items: end;
  color: var(--cs-on-dark);
}

/* THE BLUR PAD. Contrast for the type without veiling the plate: the blur is
   confined to the text block and MASKED, so it fades out instead of ending on
   a visible rectangle - the giveaway of a frosted panel dropped over a photo.
   The radial origin sits at the bottom left, where the claim is, so the pad is
   densest under the type and gone by the far corner.

   z-index: -1 puts it behind the text but still above the plate, because
   .case-study__cover-text makes its own stacking context at z-index 2.
   brightness() as well as blur: blurring a bright plate spreads its light
   rather than dimming it, and light behind light type is the actual problem. */
.case-study__cover-text::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -4% -8% -8% -6%;
  pointer-events: none;
  backdrop-filter: blur(16px) saturate(115%) brightness(0.82);
  -webkit-backdrop-filter: blur(16px) saturate(115%) brightness(0.82);
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.34) 0%,
    rgba(5, 5, 5, 0.06) 100%
  );
  mask-image: radial-gradient(
    132% 108% at 18% 92%,
    #000 0%,
    #000 46%,
    transparent 100%
  );
  -webkit-mask-image: radial-gradient(
    132% 108% at 18% 92%,
    #000 0%,
    #000 46%,
    transparent 100%
  );
}`,
  },
  {
    label: 'bring the claim down to a composed size',
    oldStr: `/* The claim. Light, wide, uppercase, set as large as the line allows - this is
   the one piece of display type in the window. */
.case-study__claim {
  grid-area: claim;
  margin: 0;
  max-width: 20ch;
  font-family: var(--cs-font-display);
  font-weight: 400;
  font-size: clamp(2rem, 5.4vw, 5.2rem);
  line-height: 0.98;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  text-wrap: balance;
}`,
    newStr: `/* THE CLAIM, and the composition rule it follows.
 *
 * It was set at 5.4vw with an 83px ceiling, which is what broke the frame: five
 * lines running two thirds of the way across left the showcase image with
 * nowhere to be. The cover is a photograph with a sentence on it, and the
 * sentence had become the photograph.
 *
 * THE RULE, in the order it binds:
 *   - MEASURE FIRST. 17ch. Display type earns its authority from the shape of
 *     the block, not the size of the glyph, and a block wider than about 20
 *     characters stops being a shape.
 *   - The claim occupies the LEFT HALF and the bottom third. The plate keeps
 *     the top right, which is where the product shot actually is.
 *   - Ceiling at 3.25rem / 52px. 3.1vw means it starts shrinking before the
 *     viewport does, so the four-line block survives down to a laptop.
 *   - Leading 1.04, just over solid. Optima's uppercase has no descenders to
 *     speak of, so tighter than this closes the lines up.
 *   - Tracking -0.005em, near neutral. The -0.02em here was borrowed from the
 *     grotesque this used to be set in; pulling a flared humanist that tight
 *     collides the flares and mangles the letterfit. */
.case-study__claim {
  grid-area: claim;
  margin: 0;
  max-width: 17ch;
  font-family: var(--cs-font-display);
  font-weight: 400;
  font-size: clamp(1.6rem, 3.1vw, 3.25rem);
  line-height: 1.04;
  letter-spacing: -0.005em;
  text-transform: uppercase;
  text-wrap: balance;
}`,
  },
  {
    label: 'fix the frosted pills breaking over paper',
    oldStr: `  color: var(--cs-ink);
  background: color-mix(in srgb, var(--cs-paper-raised) 76%, transparent);
  border-color: var(--cs-hair);
  box-shadow: 0 12px 34px rgba(12, 11, 10, 0.16);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}`,
    newStr: `  color: var(--cs-ink);
  /* AN INK WASH, NOT PAPER. This was paper-raised at 76% - cream on cream -
     which erased the container and everything in it the moment the overview
     slid under the bar. The construction depends on the RAISED item being
     lighter than the container it sits in; over paper that only works if the
     container darkens. */
  background: rgba(23, 22, 20, 0.07);
  border-color: rgba(23, 22, 20, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 10px 30px rgba(12, 11, 10, 0.1);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}

/* Ink at 60% on paper is grey mush. The inactive tabs and the chevron need
   more of themselves back once the polarity flips. */
.case-study__bar[data-frosted='true'] .case-study__tab {
  opacity: 0.72;
}

.case-study__bar[data-frosted='true'] .case-study__tab:hover,
.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true'] {
  opacity: 1;
}

.case-study__bar[data-frosted='true'] .case-study__back {
  opacity: 0.9;
}`,
  },
  {
    label: 'append the texture and motion block',
    oldStr: `/* ------------------------------------------------------------------ */
/* SCROLLER                                                           */
/* ------------------------------------------------------------------ */`,
    newStr: `${TEXTURE_BLOCK}/* ------------------------------------------------------------------ */
/* SCROLLER                                                           */
/* ------------------------------------------------------------------ */`,
  },
  {
    label: 'let the claim fill the width on small screens',
    oldStr: `  .case-study__claim {
    max-width: none;
  }`,
    newStr: `  /* One column now, so the measure comes from the viewport and the ceiling
     drops again - 52px over a 360px-wide plate is a different proportion
     entirely. */
  .case-study__claim {
    max-width: 22ch;
    font-size: clamp(1.5rem, 7.4vw, 2.4rem);
  }`,
  },
];

const original = readFileSync(FILE, 'utf8');
const crlf = original.includes('\r\n');
const fix = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);

let raw = original;
let failed = false;

for (const edit of edits) {
  const oldStr = fix(edit.oldStr);
  const newStr = fix(edit.newStr);

  if (raw.includes(newStr)) {
    console.log(`SKIP ${edit.label} (already applied)`);
    continue;
  }

  const count = raw.split(oldStr).length - 1;
  if (count !== 1) {
    console.log(`MISS ${edit.label} - matched ${count} times, expected 1`);
    failed = true;
    continue;
  }

  raw = raw.replace(oldStr, newStr);
  console.log(`OK   ${edit.label}`);
}

if (failed) {
  console.log('PATCH FAILED - nothing written');
  process.exit(1);
}

writeFileSync(FILE, raw, 'utf8');
console.log('ALL PATCHES OK');
