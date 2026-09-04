/* Rebuild of the case-study bar/buttons from the reference video's frames,
   plus the claim composition and the mount-gate scroll fix.
   Run once: node scripts/patch-cs-video.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

let failed = 0;
const log = (state, label) => {
  if (state !== 'OK') failed += 1;
  console.log(`${state.padEnd(4)} ${label}`);
};

/* ---------------- the new bar + button stylesheet ---------------- */

const BAR = `.case-study__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(14px, 1.6vw, 22px) clamp(16px, 2vw, 28px);
  /* The bar is a frame, not a surface. Only the groups inside it take the
     pointer, so the middle of the cover stays clickable. */
  pointer-events: none;
}

.case-study__bar > * {
  pointer-events: auto;
}

.case-study__bar-left,
.case-study__bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* THE GLASS, read off the reference frame by frame. Three layers, in order:

     1. a blurred, slightly BRIGHTENED sample of whatever is passing under the
        bar - the background is visibly washed toward light inside the pill,
        not just dimmed;
     2. a thin milky veil, so the pill has a body of its own and does not
        disappear over an even background;
     3. a FEATHERED rim: a 1px specular top edge, a dark seat at the bottom,
        and a wide very-low-opacity halo that bleeds outward.

   The halo is the detail that matters. In the reference the pill edge dissolves
   into the image over several pixels; a crisp 1px outline is exactly what makes
   glass read as a flat rectangle of colour instead. */
.case-study__back,
.case-study__tabs,
.case-study__bar-right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  border: 1px solid rgba(245, 241, 232, 0.14);
  background: rgba(245, 241, 232, 0.09);
  backdrop-filter: blur(22px) saturate(150%) brightness(1.06);
  -webkit-backdrop-filter: blur(22px) saturate(150%) brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    inset 0 -1px 0 rgba(5, 5, 5, 0.16),
    0 10px 34px rgba(5, 5, 5, 0.3),
    0 0 0 7px rgba(245, 241, 232, 0.028);
  transition:
    background 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms ease;
}

/* OVER PAPER. The polarity flips and the container has to DARKEN, because the
   raised item inside it must stay lighter than what it sits in - that contrast
   is the whole nested-pill idea. A cream veil over cream paper is what made
   these vanish before. */
.case-study__bar[data-frosted='true'] .case-study__back,
.case-study__bar[data-frosted='true'] .case-study__tabs,
.case-study__bar[data-frosted='true'] .case-study__bar-right {
  border-color: rgba(23, 22, 20, 0.16);
  background: rgba(23, 22, 20, 0.09);
  backdrop-filter: blur(22px) saturate(118%) brightness(0.99);
  -webkit-backdrop-filter: blur(22px) saturate(118%) brightness(0.99);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -1px 0 rgba(23, 22, 20, 0.08),
    0 10px 30px rgba(12, 11, 10, 0.12),
    0 0 0 7px rgba(23, 22, 20, 0.022);
}

.case-study__back {
  width: 40px;
  height: 40px;
  padding: 0;
  justify-content: center;
  overflow: hidden;
  isolation: isolate;
  color: var(--cs-on-dark);
  cursor: pointer;
  opacity: 0.86;
  transition:
    opacity 240ms ease,
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
    background 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms ease;
}

.case-study__back:hover {
  opacity: 1;
}

.case-study__tabs {
  gap: 2px;
}

.case-study__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cs-on-dark);
  font-family: var(--cs-font-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  opacity: 0.76;
  transition:
    opacity 240ms ease,
    background 240ms ease,
    box-shadow 240ms ease,
    color 240ms ease,
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.case-study__tab:hover {
  opacity: 1;
}

/* SIBLINGS RECEDE. In the reference, hovering one tab fades the others to about
   a third rather than highlighting the hovered one - the row dims around your
   attention. The raised tab is exempt: it holds its place in the set. */
.case-study__tabs:hover .case-study__tab:not(:hover):not([data-active='true']) {
  opacity: 0.32;
}

/* THE RAISED ITEM. Brighter than its container, with a specular top edge and a
   seated shadow underneath, so it reads as sitting ON the glass rather than
   being a coloured-in area of it. */
.case-study__tab[data-active='true'],
.case-study__cta {
  opacity: 1;
  background: linear-gradient(
    180deg,
    rgba(245, 241, 232, 0.3) 0%,
    rgba(245, 241, 232, 0.14) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(5, 5, 5, 0.2),
    0 4px 12px rgba(5, 5, 5, 0.24);
}

.case-study__bar[data-frosted='true'] .case-study__tab,
.case-study__bar[data-frosted='true'] .case-study__back,
.case-study__bar[data-frosted='true'] .case-study__menu-button {
  color: var(--cs-ink);
}

.case-study__bar[data-frosted='true'] .case-study__tab {
  opacity: 0.58;
}

.case-study__bar[data-frosted='true'] .case-study__tab:hover,
.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true'] {
  opacity: 1;
}

/* Over paper the raised item goes to near-solid white on ink type. This is the
   state that was unreadable: it has to be the LIGHTEST thing in the bar, on a
   container that has gone dark. */
.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true'],
.case-study__bar[data-frosted='true'] .case-study__cta {
  color: var(--cs-ink);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.96) 0%,
    rgba(255, 255, 255, 0.74) 100%
  );
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(23, 22, 20, 0.1),
    0 4px 12px rgba(12, 11, 10, 0.16);
}

.case-study__tab-icon,
.case-study__cta-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.case-study__cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 13px;
  border: 0;
  border-radius: 999px;
  color: var(--cs-on-dark);
  font-family: var(--cs-font-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition:
    background 240ms ease,
    box-shadow 240ms ease,
    color 240ms ease,
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* An unwired link is drawn as unavailable rather than live. */
.case-study__cta[data-pending='true'] {
  opacity: 0.74;
  cursor: default;
}

/* THE DOT SWEEP - the hover texture from the video, frame by frame. It is not a
   gloss or a fade: a grid of small light DOTS appears at the leading edge of the
   pill and travels across it, then dies out. A halftone, which is already this
   site's language in the work carousel's dither.

   The dots are a repeating radial-gradient. The travel comes from a masked
   band moving across that grid, so only a slice of the dots is lit at any
   moment - animating the mask rather than the background is what keeps the grid
   itself locked to the pill instead of sliding. */
.case-study__back::after,
.case-study__tab::after,
.case-study__cta::after,
.case-study__menu-button::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0;
  background-image: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.85) 0.9px,
    transparent 1.1px
  );
  background-size: 6px 6px;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 38%,
    #000 62%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    #000 38%,
    #000 62%,
    transparent 100%
  );
  mask-size: 220% 100%;
  -webkit-mask-size: 220% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-position: -120% 0;
  -webkit-mask-position: -120% 0;
}

/* Over paper the dots invert to ink, or they would be white dots on white. */
.case-study__bar[data-frosted='true'] .case-study__back::after,
.case-study__bar[data-frosted='true'] .case-study__tab::after,
.case-study__bar[data-frosted='true'] .case-study__cta::after,
.case-study__bar[data-frosted='true'] .case-study__menu-button::after {
  background-image: radial-gradient(
    circle at center,
    rgba(23, 22, 20, 0.55) 0.9px,
    transparent 1.1px
  );
}

.case-study__back:hover::after,
.case-study__tab:hover::after,
.case-study__cta:hover::after,
.case-study__menu-button:hover::after {
  animation: cs-dot-sweep 760ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes cs-dot-sweep {
  0% {
    opacity: 0;
    mask-position: -120% 0;
    -webkit-mask-position: -120% 0;
  }
  22% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    mask-position: 120% 0;
    -webkit-mask-position: 120% 0;
  }
}

/* THE LABEL ROLL. The other half of the reference's hover: the label does not
   fade, it rolls. The live copy slides up and out while a duplicate arrives
   from below. Two stacked copies inside a one-line window, moved as one block.
   The duplicate is aria-hidden in the markup, so the label is still announced
   once. */
.case-study__roll {
  display: block;
  position: relative;
  overflow: hidden;
  height: 1em;
}

.case-study__roll > span {
  display: block;
  height: 1em;
  line-height: 1em;
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-study__tab:hover .case-study__roll > span,
.case-study__cta:hover .case-study__roll > span {
  transform: translateY(-1em);
}

/* PRESS ONLY, NO LIFT. Worth stating because the instinct is to add one: across
   nine seconds of reference the pills never rise on hover. The hover event is
   carried entirely by the dots and the label; movement is reserved for the
   click, so the press still feels physical. */
.case-study__tab:active,
.case-study__cta:active,
.case-study__menu-button:active {
  transform: scale(0.97);
}

.case-study__back:active {
  transform: scale(0.94);
}

.case-study__cta:hover .case-study__cta-icon {
  transform: translateX(1px);
}

/* ---- the overflow menu ---- */

.case-study__menu {
  position: relative;
  display: flex;
}

.case-study__menu-button {
  position: relative;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cs-on-dark);
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  opacity: 0.78;
  transition:
    opacity 240ms ease,
    background 240ms ease,
    transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.case-study__menu-button:hover {
  opacity: 1;
  background: rgba(245, 241, 232, 0.12);
}

.case-study__bar[data-frosted='true'] .case-study__menu-button:hover {
  background: rgba(23, 22, 20, 0.08);
}

.case-study__menu-button[aria-expanded='true'] {
  transform: rotate(90deg);
}

.case-study__menu-list {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 4;
  min-width: 208px;
  display: grid;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid var(--cs-hair);
  background: var(--cs-paper-raised);
  box-shadow: 0 18px 44px rgba(5, 5, 5, 0.3);
  animation: cs-menu-in 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes cs-menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.case-study__menu-list > a,
.case-study__menu-list > button {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  text-decoration: none;
  font-family: var(--cs-font-body);
  font-size: 12.5px;
  color: var(--cs-ink);
  cursor: pointer;
  transition: background 160ms ease;
}

.case-study__menu-list > a:hover,
.case-study__menu-list > button:hover {
  background: rgba(23, 22, 20, 0.06);
}

/* Texture is information, motion is decoration. Under reduced motion the pills
   keep every layer of lighting and lose the sweep, the roll and the press. */
@media (prefers-reduced-motion: reduce) {
  .case-study__back,
  .case-study__tab,
  .case-study__cta,
  .case-study__menu-button,
  .case-study__tab-icon,
  .case-study__cta-icon,
  .case-study__roll > span {
    transition:
      background 200ms ease,
      color 200ms ease,
      opacity 200ms ease;
    transform: none;
  }

  .case-study__back:hover::after,
  .case-study__tab:hover::after,
  .case-study__cta:hover::after,
  .case-study__menu-button:hover::after {
    animation: none;
    opacity: 0;
  }

  .case-study__tab:hover .case-study__roll > span,
  .case-study__cta:hover .case-study__roll > span,
  .case-study__menu-button[aria-expanded='true'] {
    transform: none;
  }
}

`;

/* ---------------- the cover text block ---------------- */

const COVER = `.case-study__cover-text {
  position: relative;
  z-index: 2;
  width: 100%;
  /* The congestion was here, not in the type. The claim was starting one small
     pad from the frame edge and ending on the bottom edge, so it read as
     crammed into the corner however large it was set. The left inset is now the
     largest of the four, which is what gives a bottom-left composition its
     footing. */
  padding: clamp(28px, 4.5vw, 64px) clamp(28px, 4.5vw, 64px)
    clamp(44px, 6vw, 92px) clamp(32px, 5vw, 88px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'chip  chip'
    'claim note';
  gap: clamp(18px, 2.4vw, 34px);
  align-items: end;
  color: var(--cs-on-dark);
}

.case-study__chip {
  grid-area: chip;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(245, 241, 232, 0.28);
  background: rgba(245, 241, 232, 0.08);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  font-family: var(--cs-font-body);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cs-on-dark);
}

.case-study__chip::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--cs-ember);
}

/* THE CLAIM, and the composition rule it follows.
 *
 * THE RULE, in the order it binds:
 *   - MEASURE FIRST. 18ch. Display type earns its authority from the shape of
 *     the block, not the size of the glyph, and past about twenty characters a
 *     block stops being a shape.
 *   - The claim owns the LEFT HALF and the bottom third. The plate keeps the
 *     top right, which is where the product shot actually is.
 *   - Ceiling at 2.75rem / 44px. 2.7vw means it starts shrinking before the
 *     viewport does, so the block holds its line count down to a laptop.
 *   - Leading 1.14. Tighter than this and a four-line uppercase block closes
 *     into a slab - the previous 1.04 was a large part of what read as
 *     congested, independently of the size.
 *   - Tracking -0.005em, near neutral. Pulling a flared humanist tighter
 *     collides the flares and mangles the letterfit. */
.case-study__claim {
  grid-area: claim;
  position: relative;
  isolation: isolate;
  margin: 0;
  max-width: 18ch;
  font-family: var(--cs-font-display);
  font-weight: 400;
  font-size: clamp(1.5rem, 2.7vw, 2.75rem);
  line-height: 1.14;
  letter-spacing: -0.005em;
  text-transform: uppercase;
  text-wrap: balance;
}

/* THE BLUR PAD, on the claim itself.
 *
 * It used to sit on .case-study__cover-text, which is a full-width grid row -
 * so it blurred the whole bottom band of the cover, including the empty half
 * where the pencil is. It now hugs the type: the pad is the claim's own box,
 * bled out by a fraction of an em on each side, so it ends where the sentence
 * ends.
 *
 * Still masked, so it fades rather than closing on a visible rectangle - the
 * giveaway of a frosted panel dropped onto a photograph. brightness() as well
 * as blur, because blurring a bright plate SPREADS its light rather than
 * dimming it, and light behind light type is the actual problem. */
.case-study__claim::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -0.34em -0.9em -0.28em -0.85em;
  pointer-events: none;
  backdrop-filter: blur(15px) saturate(112%) brightness(0.84);
  -webkit-backdrop-filter: blur(15px) saturate(112%) brightness(0.84);
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.26) 0%,
    rgba(5, 5, 5, 0.12) 100%
  );
  mask-image: radial-gradient(
    118% 116% at 26% 52%,
    #000 0%,
    #000 52%,
    transparent 100%
  );
  -webkit-mask-image: radial-gradient(
    118% 116% at 26% 52%,
    #000 0%,
    #000 52%,
    transparent 100%
  );
}

`;

/* ---------------- apply ---------------- */

const cssPath = 'src/styles/work-case-study.css';
let css = readFileSync(cssPath, 'utf8');

/* 1. the whole bar/button section, from .case-study__bar up to the SCROLLER
      header. Anchored on strings, not line numbers. */
{
  const start = css.indexOf('\n.case-study__bar {');
  const scroller = css.indexOf('/* SCROLLER');
  const end = scroller === -1 ? -1 : css.lastIndexOf('/* ------', scroller);
  if (start === -1 || end === -1 || end <= start) {
    log('MISS', 'bar/button section anchors');
  } else if (css.includes('cs-dot-sweep')) {
    log('SKIP', 'bar/button section already rebuilt');
  } else {
    css = css.slice(0, start + 1) + BAR + css.slice(end);
    log('OK', 'bar/button section rebuilt from the video');
  }
}

/* 2. cover-text through the claim, replaced wholesale. */
{
  const start = css.indexOf('\n.case-study__cover-text {');
  const end = css.indexOf('\n.case-study__cover-note {');
  if (start === -1 || end === -1 || end <= start) {
    log('MISS', 'cover-text section anchors');
  } else if (css.includes('.case-study__claim::before')) {
    log('SKIP', 'cover-text section already rebuilt');
  } else {
    css = css.slice(0, start + 1) + COVER + css.slice(end + 1);
    log('OK', 'cover text recomposed, blur pad moved onto the claim');
  }
}

/* 3. the mobile claim follows the new ceiling. */
{
  const oldStr = `    max-width: 22ch;\n    font-size: clamp(1.5rem, 7.4vw, 2.4rem);`;
  const newStr = `    max-width: 20ch;\n    font-size: clamp(1.35rem, 6.6vw, 2.1rem);`;
  if (css.includes(newStr)) log('SKIP', 'mobile claim');
  else if (css.split(oldStr).length - 1 !== 1) log('MISS', 'mobile claim');
  else {
    css = css.replace(oldStr, newStr);
    log('OK', 'mobile claim');
  }
}

writeFileSync(cssPath, css, 'utf8');

/* ---------------- the component ---------------- */

const tsxPath = 'src/components/work/case-study/CaseStudyWindow.tsx';
let tsx = readFileSync(tsxPath, 'utf8');

const edits = [
  {
    label: 'scroll root cause note',
    oldStr: ` * The attribute cannot simply be dropped from the markup either: it is what`,
    newStr: ` * AND THEN IT WAS STILL FLAT, for a second and much dumber reason: this
 * component returns null until \`mounted\` is true, because the portal needs a
 * DOM to aim at. So on the only pass where the effect ran, the scroller did not
 * exist yet and the effect returned early - and its dependency list was
 * [study.id], which does not change when \`mounted\` flips. The instance was
 * never constructed at all. \`mounted\` is now in the deps of all three
 * effects, which is also why the frost was mistiming: same bug, same list.
 *
 * The attribute cannot simply be dropped from the markup either: it is what`,
  },
  {
    label: 'reduced-motion bail removed for parity',
    oldStr: `    /* Honour the OS setting rather than smoothing over it - and bail before
       touching the attribute, so the native fallback keeps its opt-out. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

`,
    newStr: `    /* No reduced-motion bail here, deliberately. The brief is that this
       scroller must feel like the landing page, and SmoothScrollProvider runs
       Lenis unconditionally on desktop - so bailing here would reintroduce the
       exact mismatch being reported, on any machine with the OS setting on. */
`,
  },
  {
    label: 'page instance told to skip this subtree',
    oldStr: `    scroller.removeAttribute('data-lenis-prevent');
`,
    newStr: `    scroller.removeAttribute('data-lenis-prevent');

    /* With the attribute gone, the page's Lenis would start seeing these wheel
       events itself. It is stopped, and a stopped instance calls
       preventDefault and drops them - harmless here, but only by luck of
       listener order. Its \`prevent\` predicate is checked BEFORE that branch
       (lenis.mjs:609 vs :613), so pointing it at this subtree makes the page
       instance ignore these events outright, whichever listener runs first. */
    const pageLenis = (window as unknown as { lenis?: Lenis }).lenis;
    const previousPrevent = pageLenis?.options.prevent;
    if (pageLenis) {
      pageLenis.options.prevent = (node: HTMLElement) =>
        Boolean(node.closest?.('.case-study__scroller'));
    }
`,
  },
  {
    label: 'prevent predicate restored on teardown',
    oldStr: `      lenisRef.current = null;
      scroller.setAttribute('data-lenis-prevent', '');`,
    newStr: `      lenisRef.current = null;
      if (pageLenis) pageLenis.options.prevent = previousPrevent;
      scroller.setAttribute('data-lenis-prevent', '');`,
  },
  {
    label: 'tab label rolls',
    oldStr: `                    {section.label}
                  </button>`,
    newStr: `                    <span className="case-study__roll">
                      <span>{section.label}</span>
                      <span aria-hidden>{section.label}</span>
                    </span>
                  </button>`,
  },
];

for (const { label, oldStr, newStr } of edits) {
  if (tsx.includes(newStr)) log('SKIP', label);
  else if (tsx.split(oldStr).length - 1 !== 1) log('MISS', label);
  else {
    tsx = tsx.replace(oldStr, newStr);
    log('OK', label);
  }
}

/* Both CTA labels - the live link and the pending button - take the roll. */
{
  const oldStr = `                {CASE_STUDY_CTA.label}`;
  const newStr = `                <span className="case-study__roll">
                  <span>{CASE_STUDY_CTA.label}</span>
                  <span aria-hidden>{CASE_STUDY_CTA.label}</span>
                </span>`;
  const hits = tsx.split(oldStr).length - 1;
  if (tsx.includes('case-study__roll">\n                  <span>{CASE_STUDY_CTA.label}')) {
    log('SKIP', 'cta label rolls');
  } else if (hits !== 2) {
    log('MISS', `cta label rolls (expected 2 hits, found ${hits})`);
  } else {
    tsx = tsx.split(oldStr).join(newStr);
    log('OK', 'cta label rolls');
  }
}

/* The three observers/instances all keyed on study.id alone - the bug. */
{
  const oldStr = `  }, [study.id]);`;
  const hits = tsx.split(oldStr).length - 1;
  if (hits === 0 && tsx.includes(`  }, [study.id, mounted]);`)) {
    log('SKIP', 'effect deps');
  } else if (hits !== 3) {
    log('MISS', `effect deps (expected 3 hits, found ${hits})`);
  } else {
    tsx = tsx.split(oldStr).join(`  }, [study.id, mounted]);`);
    log('OK', 'effect deps now include mounted (3 effects)');
  }
}

writeFileSync(tsxPath, tsx, 'utf8');

/* Anything left pointing at the removed sheen animation. */
for (const [file, raw] of [
  [cssPath, css],
  [tsxPath, tsx],
]) {
  for (const dead of ['cs-sheen', 'HEADER_FROST_AT']) {
    if (raw.includes(dead)) console.log(`WARN ${file} still references ${dead}`);
  }
}

console.log(failed ? `${failed} PATCH(ES) FAILED` : 'ALL PATCHES OK');
process.exit(failed ? 1 : 0);
