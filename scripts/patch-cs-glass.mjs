/**
 * Fixes from the four reference frames:
 *   1. ONE MARGIN. The bar, the claim, the prose and the plates all hung at
 *      different insets, which is what read as crowded - not the type size.
 *   2. The glass is tinted #b3b9c9 and given a real body, so the label colour
 *      can be constant instead of flipping over the light screen.
 *   3. The highlight is the base colour LIFTED, never white, and it now slides
 *      between tabs instead of re-painting.
 *   4. Cover text parallaxes against the image; the floor under it deepens.
 *   5. A full-width blur band across the top of the bar.
 *
 * Anchored replacements, not line numbers. Run from the project root.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'src/styles/work-case-study.css';
const TSX = 'src/components/work/case-study/CaseStudyWindow.tsx';

let failed = false;
const report = (state, label) => {
  if (state !== 'OK') failed = true;
  console.log(`${state.padEnd(4)} ${label}`);
};

/* ------------------------------------------------------------------ */
/* THE BAR + BUTTONS, re-authored from the frames                      */
/* ------------------------------------------------------------------ */

const BAR_BLOCK = `/* ------------------------------------------------------------------ */
/* THE GLASS, AND THE ONE MARGIN                                      */
/* ------------------------------------------------------------------ */

/* #b3b9c9 held as a channel triple so one colour can be spent at several
   alphas without inventing three more tokens.

   THE HIGHLIGHT IS NOT WHITE. It is this colour lifted toward white, which is
   what keeps the raised pill inside the family instead of punching a hole in
   the bar - white was the reason the active tab read as a different material
   from the thing it sits in.

   ONE LABEL COLOUR FOR BOTH POLARITIES. That is only possible because the pill
   now has a body: a light blue-grey surface over the photograph AND over paper.
   The old build flipped the type from bone to ink at the overview, and every
   time that flip mistimed the controls vanished into whatever was behind them.
   A constant surface needs no flip, so there is nothing left to mistime. */
.case-study {
  --cs-gutter: clamp(28px, 8.6vw, 176px);
  --cs-gutter-top: clamp(20px, 2.6vw, 46px);
  --cs-glass: 179, 185, 201;
  --cs-glass-lift: 216, 221, 232;
  --cs-glass-ink: #151922;
  --cs-glass-ink-dim: rgba(21, 25, 34, 0.58);
}

/* A sibling of the scroller rather than a sticky child: the document has to
   pass UNDERNEATH the pills for the blur to mean anything, and backdrop-filter
   is unreliable when the blurred element is inside the scrolling ancestor it is
   sampling.

   THE BAR IS TWO THINGS. A full-width blur BAND across the top - in the
   reference everything passing under the whole strip is smeared, not only what
   passes inside a pill - and, floating over it, three glass groups. The frame
   itself takes no pointer, so the middle of the cover stays clickable. */
.case-study__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  /* THE ONE MARGIN. The back button, the first letter of the claim below it,
     the prose and the plates all start on this line. Nothing sits at a
     different inset from anything else - that misalignment, rather than the
     size of the type, is what made the frame feel crowded. */
  padding: var(--cs-gutter-top) var(--cs-gutter);
  pointer-events: none;
}

/* The band. Masked out at its lower edge so it ends in a fade rather than a
   seam, and always on - over the photograph as well as over paper. */
.case-study__bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: calc(100% + 22px);
  z-index: -1;
  backdrop-filter: blur(14px) saturate(104%);
  -webkit-backdrop-filter: blur(14px) saturate(104%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%);
  pointer-events: none;
}

.case-study__bar > * {
  pointer-events: auto;
}

.case-study__bar-left,
.case-study__bar-right {
  display: flex;
  align-items: center;
}

.case-study__bar-left {
  gap: 10px;
}

/* The right group is itself the outer pill, with the call to action raised
   inside it and the three-dot button flush - the nesting the reference uses. */
.case-study__bar-right {
  gap: 2px;
  padding: 5px;
}

/* THE CONTAINERS. Three layers, read off the frames:
     1. a blurred, slightly BRIGHTENED sample of what passes under the bar - the
        background is visibly washed toward light inside the pill, not dimmed;
     2. a veil of the base colour, so the pill has a body of its own;
     3. a FEATHERED rim - specular top edge, dark seat, and a wide very low
        opacity halo. No hard 1px outline: in the reference the edge dissolves
        over several pixels, and a crisp border is what made mine read as a flat
        rectangle of colour. */
.case-study__back,
.case-study__tabs,
.case-study__bar-right {
  position: relative;
  border-radius: 999px;
  background: rgba(var(--cs-glass), 0.58);
  backdrop-filter: blur(20px) saturate(140%) brightness(1.05);
  -webkit-backdrop-filter: blur(20px) saturate(140%) brightness(1.05);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    inset 0 -1px 0 rgba(9, 11, 16, 0.16),
    0 10px 30px rgba(5, 5, 5, 0.26),
    0 0 0 7px rgba(var(--cs-glass), 0.05);
  color: var(--cs-glass-ink);
}

/* Over paper the veil thickens slightly and stops brightening, so the group
   still separates from cream. Same colour, same type - only the alpha moves. */
.case-study__bar[data-frosted='true'] .case-study__back,
.case-study__bar[data-frosted='true'] .case-study__tabs,
.case-study__bar[data-frosted='true'] .case-study__bar-right {
  background: rgba(var(--cs-glass), 0.68);
  backdrop-filter: blur(20px) saturate(118%) brightness(0.97);
  -webkit-backdrop-filter: blur(20px) saturate(118%) brightness(0.97);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(9, 11, 16, 0.12),
    0 10px 26px rgba(12, 11, 10, 0.14),
    0 0 0 7px rgba(var(--cs-glass), 0.06);
}

/* ---- BACK ---- */

.case-study__back {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  cursor: pointer;
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ---- TABS ---- */

.case-study__tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px;
}

/* THE HIGHLIGHT. One element for the whole nav, so it can travel. Position and
   width arrive as custom properties written by CaseStudyWindow from the live
   tab's own geometry - measured rather than derived from an index, so it stays
   correct when a section is added or a label is translated. */
.case-study__tab-indicator {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 0;
  width: var(--cs-ind-w, 0px);
  transform: translate3d(var(--cs-ind-x, 0px), 0, 0);
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(var(--cs-glass-lift), 0.98),
    rgba(var(--cs-glass-lift), 0.86)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -1px 0 rgba(9, 11, 16, 0.14),
    0 4px 12px rgba(5, 5, 5, 0.22);
  transition:
    transform 460ms cubic-bezier(0.22, 1, 0.36, 1),
    width 460ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}

/* Nothing to show until it has been measured once. */
.case-study__tabs[data-ready='true'] .case-study__tab-indicator {
  opacity: 1;
}

.case-study__tab {
  position: relative;
  z-index: 1;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  padding: 9px 16px;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
  font-family: var(--cs-font-body);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cs-glass-ink-dim);
  transition:
    color 300ms ease,
    opacity 300ms ease,
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.case-study__tab[data-active='true'] {
  color: var(--cs-glass-ink);
}

/* SIBLING DIM. In the frames the cursor does not brighten what it lands on -
   the OTHER tabs drop back, and the raised one keeps its weight. */
.case-study__tabs:hover .case-study__tab:not(:hover):not([data-active='true']) {
  opacity: 0.34;
}

.case-study__tab:hover {
  color: var(--cs-glass-ink);
}

/* The icon rides the active tab, but its SLOT exists in every tab and only
   fades. Rendering it conditionally would change that tab's width, which would
   drag the indicator's target out from under it mid-transition. */
.case-study__tab-icon,
.case-study__cta-icon {
  display: grid;
  place-items: center;
  margin-right: 7px;
}

.case-study__tab-icon {
  opacity: 0;
  transform: scale(0.82);
  transition:
    opacity 300ms ease,
    transform 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-study__tab[data-active='true'] .case-study__tab-icon {
  opacity: 1;
  transform: none;
}

/* ---- CALL TO ACTION. Raised inside the right group. ---- */

.case-study__cta {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  padding: 10px 16px 10px 13px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  font-family: var(--cs-font-body);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cs-glass-ink);
  background: linear-gradient(
    180deg,
    rgba(var(--cs-glass-lift), 0.98),
    rgba(var(--cs-glass-lift), 0.86)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -1px 0 rgba(9, 11, 16, 0.14),
    0 4px 12px rgba(5, 5, 5, 0.22);
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* The link is not wired yet, so the button says so rather than going nowhere. */
.case-study__cta[data-pending='true'] {
  cursor: default;
}

/* ---- THE THREE-DOT MENU ---- */

.case-study__menu {
  position: relative;
}

.case-study__menu-button {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
  color: var(--cs-glass-ink);
  opacity: 0.72;
  transition:
    opacity 240ms ease,
    transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.case-study__menu-button:hover,
.case-study__menu-button[aria-expanded='true'] {
  opacity: 1;
}

.case-study__menu-list {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 190px;
  display: grid;
  padding: 6px;
  border-radius: 14px;
  background: var(--cs-paper-raised);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 18px 44px rgba(5, 5, 5, 0.28);
  animation: cs-menu-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cs-menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.case-study__menu-list > * {
  padding: 9px 12px;
  border: 0;
  border-radius: 9px;
  background: none;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  font-family: var(--cs-font-body);
  font-size: 12.5px;
  color: var(--cs-ink);
  transition: background 160ms ease;
}

.case-study__menu-list > *:hover {
  background: rgba(23, 22, 20, 0.07);
}

/* ------------------------------------------------------------------ */
/* BUTTON TEXTURE + MOTION                                            */
/* ------------------------------------------------------------------ */

/* THE DOT SWEEP. What the frames actually show on hover: not a gloss sheen but
   a grid of small light dots that appears at the leading edge, travels across
   the pill and dies. Same halftone language as the work carousel's dither,
   which is why it belongs here rather than being borrowed.

   Built as a masked background rather than a moving element: the mask window
   slides, so a single ::after animates one property on the compositor. */
.case-study__tab::after,
.case-study__cta::after,
.case-study__menu-button::after,
.case-study__back::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0;
  pointer-events: none;
  background-image: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.85) 0.9px,
    transparent 1.1px
  );
  background-size: 6px 6px;
  mask-image: linear-gradient(90deg, transparent, #000 38%, #000 62%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 38%, #000 62%, transparent);
  mask-size: 220% 100%;
  -webkit-mask-size: 220% 100%;
  mask-position: -120% 0;
  -webkit-mask-position: -120% 0;
}

.case-study__tab:hover::after,
.case-study__cta:hover::after,
.case-study__menu-button:hover::after,
.case-study__back:hover::after {
  animation: cs-dot-sweep 760ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes cs-dot-sweep {
  0% {
    opacity: 0;
    mask-position: -120% 0;
    -webkit-mask-position: -120% 0;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    mask-position: 120% 0;
    -webkit-mask-position: 120% 0;
  }
}

/* THE LABEL ROLL. The label does not fade between states, it rolls: the live
   copy slides up and out while a duplicate arrives from below. The duplicate is
   aria-hidden, so the roll costs nothing to a screen reader. */
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

/* PRESS ONLY. Across nine seconds of reference footage the pills never lift on
   hover - movement is reserved for the press, and the hover is carried by
   texture and by the label. The lift in the previous build was invented. */
.case-study__tab:active,
.case-study__cta:active,
.case-study__menu-button:active {
  transform: scale(0.97);
}

.case-study__back:active {
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .case-study__tab::after,
  .case-study__cta::after,
  .case-study__menu-button::after,
  .case-study__back::after {
    display: none;
  }

  .case-study__roll > span,
  .case-study__tab-indicator,
  .case-study__tab-icon {
    transition: none;
  }

  .case-study__menu-list {
    animation: none;
  }
}

`;

/* ------------------------------------------------------------------ */
/* COVER TEXT: one margin, parallax, and a blur that hugs the type     */
/* ------------------------------------------------------------------ */

const COVER_BLOCK = `.case-study__cover-text {
  position: relative;
  z-index: 2;
  width: 100%;
  /* The same margin the bar uses, so the back button and the first letter of
     the claim sit on one line. */
  padding: clamp(28px, 4vw, 56px) var(--cs-gutter) clamp(48px, 7vw, 112px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'chip  chip'
    'claim note';
  gap: clamp(18px, 2.4vw, 34px);
  align-items: end;
  color: var(--cs-on-dark);
  /* PARALLAX. The block rides the scroll at about a third of its rate and
     thins as the overview arrives. Both variables are written by
     CaseStudyWindow from the scroller's own position, so they follow Lenis and
     the native fallback equally - and both are compositor properties, so this
     costs no layout. */
  transform: translate3d(0, var(--cs-cover-shift, 0px), 0);
  opacity: var(--cs-cover-fade, 1);
  will-change: transform, opacity;
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

/* The one ember in the window, at the size of a full stop. */
.case-study__chip::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cs-ember);
}

.case-study__claim {
  grid-area: claim;
  margin: 0;
  position: relative;
  isolation: isolate;
  /* A measure, not a width. Four lines of about eighteen characters is the
     shape the reference uses, and it is what keeps the claim a caption to the
     photograph rather than a competitor to it. */
  max-width: 18ch;
  font-family: var(--cs-font-display);
  font-size: clamp(1.5rem, 2.7vw, 2.75rem);
  font-weight: 400;
  line-height: 1.14;
  letter-spacing: -0.005em;
  text-transform: uppercase;
  color: var(--cs-on-dark);
}

/* THE FLOOR, AND ONLY UNDER THE TYPE. This pad used to sit on __cover-text,
   which is a full-width grid row across the bottom of the cover - so it fogged
   the whole band including the empty half where the photograph's subject is.
   On the claim's own box it ends where the sentence ends. Radial mask so it
   fades out instead of closing on a visible rectangle. */
.case-study__claim::before {
  content: '';
  position: absolute;
  inset: -0.34em -0.9em -0.28em -0.85em;
  z-index: -1;
  border-radius: 4px;
  backdrop-filter: blur(15px) saturate(112%) brightness(0.84);
  -webkit-backdrop-filter: blur(15px) saturate(112%) brightness(0.84);
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.26),
    rgba(5, 5, 5, 0.12)
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

/* ------------------------------------------------------------------ */
/* SPAN REPLACEMENTS                                                   */
/* ------------------------------------------------------------------ */

let css = readFileSync(CSS, 'utf8');
const cssCrlf = css.includes('\r\n');
const cssFix = (s) => (cssCrlf ? s.replace(/\r?\n/g, '\r\n') : s);

function spanReplace(source, startNeedle, endNeedle, next, label) {
  const start = source.indexOf(startNeedle);
  if (start === -1) {
    report('MISS', `${label} (start anchor)`);
    return source;
  }
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    report('MISS', `${label} (end anchor)`);
    return source;
  }
  report('OK', label);
  return source.slice(0, start) + next + source.slice(end);
}

/* The bar region runs from its own comment to the SCROLLER banner. */
const scrollerBanner = css.indexOf('/* SCROLLER');
const barEnd = css.lastIndexOf('/* ------', scrollerBanner);
if (scrollerBanner === -1 || barEnd === -1) {
  report('MISS', 'bar region bounds');
} else {
  const barStart = css.indexOf('/* A sibling of the scroller rather than a sticky child:');
  if (barStart === -1 || barStart > barEnd) {
    report('MISS', 'bar region start');
  } else {
    css = css.slice(0, barStart) + cssFix(BAR_BLOCK) + css.slice(barEnd);
    report('OK', 'bar + buttons re-authored from the frames');
  }
}

css = spanReplace(
  css,
  '.case-study__cover-text {',
  '.case-study__cover-note {',
  cssFix(COVER_BLOCK),
  'cover text: one margin, parallax, blur on the claim'
);

/* ------------------------------------------------------------------ */
/* EXACT-STRING EDITS                                                  */
/* ------------------------------------------------------------------ */

const cssEdits = [
  {
    label: 'scrim deepens as the cover leaves',
    oldStr: `  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.72) 0%,
    rgba(5, 5, 5, 0.46) 26%,
    rgba(5, 5, 5, 0.1) 58%,
    rgba(5, 5, 5, 0.4) 100%
  );
}`,
    newStr: `  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.72) 0%,
    rgba(5, 5, 5, 0.46) 26%,
    rgba(5, 5, 5, 0.1) 58%,
    rgba(5, 5, 5, 0.4) 100%
  );
}

/* A second floor that arrives with the scroll rather than sitting there: the
   bottom of the image deepens as the overview approaches, so the cover hands
   over to paper instead of being cut off by it. Opacity only - the gradient
   itself never changes, so there is nothing to re-rasterise. */
.case-study__cover-scrim::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: var(--cs-cover-dark, 0);
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.9) 0%,
    rgba(5, 5, 5, 0.52) 40%,
    rgba(5, 5, 5, 0) 78%
  );
}`,
  },
  {
    label: 'overview on the one margin',
    oldStr: `  padding:
    clamp(56px, 9vw, 140px)
    clamp(20px, 5vw, 88px)
    clamp(36px, 5vw, 80px);`,
    newStr: `  padding:
    clamp(56px, 9vw, 140px)
    var(--cs-gutter)
    clamp(36px, 5vw, 80px);`,
  },
  {
    label: 'plates on the one margin',
    oldStr: `  padding: clamp(24px, 4vw, 60px) clamp(20px, 5vw, 88px) 0;`,
    newStr: `  padding: clamp(24px, 4vw, 60px) var(--cs-gutter) 0;`,
  },
  {
    label: 'foot on the one margin',
    oldStr: `  padding:
    clamp(44px, 6vw, 110px)
    clamp(20px, 5vw, 88px)
    clamp(64px, 8vw, 130px);`,
    newStr: `  padding:
    clamp(44px, 6vw, 110px)
    var(--cs-gutter)
    clamp(64px, 8vw, 130px);`,
  },
];

for (const edit of cssEdits) {
  const oldStr = cssFix(edit.oldStr);
  const newStr = cssFix(edit.newStr);
  if (css.includes(newStr)) {
    report('SKIP', edit.label);
    continue;
  }
  const hits = css.split(oldStr).length - 1;
  if (hits !== 1) {
    report('MISS', `${edit.label} (${hits} matches)`);
    continue;
  }
  css = css.replace(oldStr, newStr);
  report('OK', edit.label);
}

/* ------------------------------------------------------------------ */
/* THE COMPONENT                                                       */
/* ------------------------------------------------------------------ */

let tsx = readFileSync(TSX, 'utf8');
const tsxCrlf = tsx.includes('\r\n');
const tsxFix = (s) => (tsxCrlf ? s.replace(/\r?\n/g, '\r\n') : s);

const tsxEdits = [
  {
    label: 'tabs ref',
    oldStr: `  const menuRef = useRef<HTMLDivElement | null>(null);`,
    newStr: `  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);`,
  },
  {
    label: 'highlight geometry + cover parallax effects',
    oldStr: `  /* The overflow menu closes on any pointer outside it. Escape already closes`,
    newStr: `  /* ---- THE HIGHLIGHT'S GEOMETRY. Measured, not guessed. ---- */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const place = () => {
      const current = tabs.querySelector<HTMLElement>('[data-active="true"]');
      if (!current) return;
      /* offsetLeft is relative to the nav's border box and the indicator is
         positioned from that same origin, so there is no padding arithmetic
         here to fall out of step with the stylesheet. */
      tabs.style.setProperty('--cs-ind-x', \`\${current.offsetLeft}px\`);
      tabs.style.setProperty('--cs-ind-w', \`\${current.offsetWidth}px\`);
      tabs.dataset.ready = 'true';
    };

    const frame = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    /* Optima arrives after first paint, and the labels change width when it
       does - without this the highlight is measured against fallback metrics. */
    document.fonts?.ready.then(place).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
    };
  }, [active, mounted]);

  /* ---- COVER PARALLAX, and the floor that deepens under the claim. ---- */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const cover = scroller?.querySelector<HTMLElement>('[data-section="cover"]');
    if (!scroller || !cover) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const height = cover.offsetHeight || 1;
      const progress = Math.min(1, Math.max(0, scroller.scrollTop / height));
      /* Three properties on one element; the stylesheet decides what they
         mean. The text lags the image at about a third of the scroll rate,
         thins out as the overview arrives, and the scrim deepens. */
      cover.style.setProperty(
        '--cs-cover-shift',
        \`\${(progress * height * 0.34).toFixed(2)}px\`
      );
      cover.style.setProperty('--cs-cover-fade', (1 - progress * 0.9).toFixed(3));
      cover.style.setProperty(
        '--cs-cover-dark',
        Math.min(1, progress * 1.7).toFixed(3)
      );
    };

    /* Read in the listener, write in a frame. Lenis moves this scroller by
       setting scrollTop, so one plain scroll listener covers both the smoothed
       path and the native fallback - no second code path to keep in sync. */
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [study.id, mounted]);

  /* The overflow menu closes on any pointer outside it. Escape already closes`,
  },
  {
    label: 'sliding highlight + always-present icon slot',
    oldStr: `            <nav className="case-study__tabs" aria-label="Case study sections">
              {CASE_STUDY_SECTIONS.map((section) => {
                const isActive = active === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className="case-study__tab"
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => goToSection(section.id)}
                  >
                    {/* The icon only rides the active tab - it is what makes
                        the raised pill read as a page marker rather than a
                        highlight. */}
                    {isActive ? (
                      <span className="case-study__tab-icon">
                        <PageIcon />
                      </span>
                    ) : null}
                    <span className="case-study__roll">
                      <span>{section.label}</span>
                      <span aria-hidden>{section.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>`,
    newStr: `            <nav
              className="case-study__tabs"
              aria-label="Case study sections"
              ref={tabsRef}
            >
              {/* THE HIGHLIGHT IS ONE ELEMENT, not a state on each tab. A
                  background that re-paints on the newly active tab cannot
                  animate, however it is eased - there is nothing continuous
                  between the two boxes to interpolate. One element slides and
                  re-widths between them instead. */}
              <span className="case-study__tab-indicator" aria-hidden />

              {CASE_STUDY_SECTIONS.map((section) => {
                const isActive = active === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className="case-study__tab"
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => goToSection(section.id)}
                  >
                    {/* The icon marks the active tab, but its slot is present
                        in every tab and only fades. Mounting it on the active
                        one would change that tab's width mid-transition and
                        drag the highlight's target out from under it. */}
                    <span className="case-study__tab-icon" aria-hidden>
                      <PageIcon />
                    </span>
                    <span className="case-study__roll">
                      <span>{section.label}</span>
                      <span aria-hidden>{section.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>`,
  },
  {
    label: 'docblock: the glass, the margin, the highlight',
    oldStr: ` * WHY A PORTAL.`,
    newStr: ` * THE GLASS IS ONE SURFACE IN BOTH POLARITIES. The bar used to flip its type
 * from bone to ink when paper arrived under it, and every mistiming of that
 * flip left the controls invisible against whatever was behind them. The pills
 * now carry a #b3b9c9 body dense enough to read over the photograph AND over
 * paper, so only the veil's alpha moves at the boundary and the label colour is
 * constant. The highlight is that same colour lifted toward white rather than
 * white itself, which is what keeps it in the family.
 *
 * ONE MARGIN. --cs-gutter, set in the stylesheet, is spent by the bar, the
 * cover text, the prose and the plates. The crowding reported on the cover was
 * three different insets, not type that was set too large.
 *
 * WHY A PORTAL.`,
  },
];

for (const edit of tsxEdits) {
  const oldStr = tsxFix(edit.oldStr);
  const newStr = tsxFix(edit.newStr);
  if (tsx.includes(newStr)) {
    report('SKIP', edit.label);
    continue;
  }
  const hits = tsx.split(oldStr).length - 1;
  if (hits !== 1) {
    report('MISS', `${edit.label} (${hits} matches)`);
    continue;
  }
  tsx = tsx.replace(oldStr, newStr);
  report('OK', edit.label);
}

/* ------------------------------------------------------------------ */
/* WRITE, then look for anything the deletions left behind             */
/* ------------------------------------------------------------------ */

if (failed) {
  console.log('NOTHING WRITTEN - fix the misses above first.');
  process.exit(1);
}

writeFileSync(CSS, css);
writeFileSync(TSX, tsx);

/* The bar region was replaced wholesale, so anything that used to live in it
   and is still referenced elsewhere would now be a dangling name. */
for (const dead of ['cs-sheen', 'case-study__close', 'case-study__tab-pill']) {
  if (css.includes(dead) || tsx.includes(dead)) {
    console.log(`WARN retired identifier still referenced: ${dead}`);
  }
}
for (const needed of [
  '--cs-gutter',
  'case-study__tab-indicator',
  'cs-dot-sweep',
  '--cs-cover-shift',
  '--cs-cover-dark',
]) {
  if (!css.includes(needed)) console.log(`WARN stylesheet never spends: ${needed}`);
}

console.log('ALL PATCHES OK');
