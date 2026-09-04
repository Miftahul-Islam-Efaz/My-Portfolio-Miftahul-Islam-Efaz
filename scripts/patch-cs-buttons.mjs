/**
 * THE CASE STUDY BAR, rebuilt to the reference crops, plus Optima.
 *
 * What the crops show that the first attempt missed:
 *   - The left group is TWO pills, not one: a round back button, a gap, then
 *     the tab pill.
 *   - The active tab and the call to action are RAISED INSIDE their container -
 *     a lighter pill within a darker one, with a hairline lift. The first pass
 *     inverted the active tab to solid ink, which reads as a form control.
 *   - Both carry an icon at 13px, a step back from their label in opacity.
 *   - The right group ends in a three-dot menu.
 *
 * Also: every `font-weight: 300` in the file is raised to 400, because Optima's
 * lightest cut is Regular. Asking for 300 makes the browser synthesise a thin,
 * which on a flared humanist thins the stem and keeps the flare - losing the
 * one feature the face has.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles/work-case-study.css';

const edits = [
  {
    label: 'rewrite the type note in the file header',
    oldStr: ` * TWO FONTS, both already in the project (src/styles/fonts.css):
 *   --font-heading  Cabinet Grotesk  -> the claim, section titles, the exit.
 *      The reference's display face is a wide geometric grotesque with a
 *      near-circular O set very light. Cabinet Grotesk is the closest thing
 *      registered here and, unlike Monare or Tanker, ships 100-900 - so the
 *      cover can be set at 300 and still have weight available elsewhere.
 *   --font-body     Satoshi         -> prose, labels, tabs, spec values.
 *      Slightly narrower, and it holds together at 12px in the pill where
 *      Cabinet Grotesk starts to feel airy.
 */`,
    newStr: ` * ONE FONT: OPTIMA, registered in src/styles/fonts.css as --font-optima.
 * A flared humanist - a serif's stroke modulation on a sans's skeleton - which
 * is why it can carry both the display claim and three paragraphs of prose
 * without a second face. It replaced Cabinet Grotesk + Satoshi here.
 *
 * TWO CONSEQUENCES, both handled below:
 *   1. THE LIGHTEST CUT IS REGULAR. Nothing in this file may ask for 300 - the
 *      browser would synthesise a thin, which thins Optima's stems and leaves
 *      the flares, losing the only thing the face is for. The cover claim is
 *      set at 400 and gets its lightness from size and tracking instead.
 *   2. It is warmer and narrower than Satoshi at small sizes. If the prose
 *      reads too literary at paragraph size, set --cs-font-body back to
 *      var(--font-body) - one line, and the labels and specs follow.
 */`,
  },
  {
    label: 'point the window at Optima',
    oldStr: `  --cs-font-display: var(--font-heading);
  --cs-font-body: var(--font-body);`,
    newStr: `  /* Both, deliberately. Optima was built to hold a page on its own; pairing
     it with a grotesque for the small text would fight it. */
  --cs-font-display: var(--font-optima);
  --cs-font-body: var(--font-optima);`,
  },
  {
    label: 'split the left group into a round button and a tab pill',
    oldStr: `.case-study__tabs,
.case-study__bar-right {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 999px;`,
    newStr: `/* THE LEFT GROUP is two separate pills with real space between them, as in
   the crop. Wrapping them in one pill would lose the beat between "leave" and
   "navigate", which are not the same kind of action. */
.case-study__bar-left {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* THE OUTER PILLS. Nothing in this rule is a button - these are containers the
   raised items sit inside. Padding is 5px so an inner pill's edge lands a hair
   inside the outer one; that sliver of glass is the entire reason it reads as
   raised rather than as a differently-coloured tab. */
.case-study__back,
.case-study__tabs,
.case-study__bar-right {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;`,
  },
  {
    label: 'frost the back button with the other pills',
    oldStr: `.case-study__bar[data-frosted='true'] .case-study__tabs,
.case-study__bar[data-frosted='true'] .case-study__bar-right {`,
    newStr: `.case-study__bar[data-frosted='true'] .case-study__back,
.case-study__bar[data-frosted='true'] .case-study__tabs,
.case-study__bar[data-frosted='true'] .case-study__bar-right {`,
  },
  {
    label: 'size the back button as a circle',
    oldStr: `.case-study__tab {
  appearance: none;
  border: 0;
  cursor: pointer;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  padding: 9px 17px;`,
    newStr: `/* The back chevron: the same glass as the pills, forced circular. It closes
   the window - going "back" from a case study is leaving it, and duplicating
   that as both a chevron and an X would be two controls for one outcome. */
.case-study__back {
  appearance: none;
  cursor: pointer;
  width: 40px;
  height: 40px;
  padding: 0;
  display: grid;
  place-items: center;
  opacity: 0.82;
}

.case-study__back:hover {
  opacity: 1;
  background: var(--cs-ember);
  border-color: var(--cs-ember);
  color: var(--cs-on-dark);
}

.case-study__tab {
  appearance: none;
  border: 0;
  cursor: pointer;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;`,
  },
  {
    label: 'raise the active tab instead of inverting it',
    oldStr: `.case-study__tab[data-active='true'] {
  opacity: 1;
  background: rgba(245, 241, 232, 0.18);
}

.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true'] {
  background: var(--cs-ink);
  color: var(--cs-paper-raised);
}`,
    newStr: `/* RAISED, not inverted. A lighter pill inside a darker container, with an
   inner highlight along its top edge and a soft drop under it - the whole
   trick of the reference's bar. Over the cover it lifts out of glass; over
   paper it lifts out of frost. */
.case-study__tab[data-active='true'] {
  opacity: 1;
  background: rgba(245, 241, 232, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(245, 241, 232, 0.26),
    0 6px 14px rgba(5, 5, 5, 0.24);
}

.case-study__bar[data-frosted='true'] .case-study__tab[data-active='true'] {
  background: var(--cs-paper-raised);
  color: var(--cs-ink);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 6px 14px rgba(12, 11, 10, 0.14);
}

/* The icons are markers, not a second voice - each sits a step behind the
   label it belongs to. */
.case-study__tab-icon,
.case-study__cta-icon {
  display: grid;
  place-items: center;
  opacity: 0.72;
}`,
  },
  {
    label: 'give the call to action its icon slot',
    oldStr: `.case-study__cta {
  appearance: none;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  padding: 10px 18px;`,
    newStr: `/* The action, raised inside the right-hand pill and carrying its own icon.
   The crop shows Google Meet's mark here; this uses a neutral camera in
   currentColor, because dropping four brand colours into a two-colour palette
   would make this pill the loudest thing in the window. Asymmetric padding -
   the icon needs less air on its side than the text does. */
.case-study__cta {
  appearance: none;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 13px;`,
  },
  {
    label: 'replace the close button with the three-dot menu',
    oldStr: `/* Where the reference puts a three-dot menu. */
.case-study__close {
  appearance: none;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: transparent;
  border: 1px solid currentColor;
  color: inherit;
  opacity: 0.55;
  transition: opacity 240ms ease, background 240ms ease, color 240ms ease;
}

.case-study__close:hover {
  opacity: 1;
  background: var(--cs-ember);
  border-color: var(--cs-ember);
  color: var(--cs-on-dark);
}

.case-study__close-mark {
  position: relative;
  width: 11px;
  height: 11px;
}

.case-study__close-mark::before,
.case-study__close-mark::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: currentColor;
}

.case-study__close-mark::before { transform: rotate(45deg); }
.case-study__close-mark::after  { transform: rotate(-45deg); }`,
    newStr: `/* THE OVERFLOW MENU. The crop's three dots, given real destinations - a dot
   menu that opens nothing is a button dressed up as a menu. No border: it is
   the quietest thing in the bar and should stay that way until hovered. */
.case-study__menu {
  position: relative;
}

.case-study__menu-button {
  appearance: none;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  transition: opacity 240ms ease, background 240ms ease;
}

.case-study__menu-button:hover,
.case-study__menu-button[aria-expanded='true'] {
  opacity: 1;
  background: rgba(245, 241, 232, 0.16);
}

.case-study__bar[data-frosted='true'] .case-study__menu-button:hover,
.case-study__bar[data-frosted='true'] .case-study__menu-button[aria-expanded='true'] {
  background: rgba(23, 22, 20, 0.08);
}

/* Solid, not glass. A menu is a decision surface; the document should not be
   visible through the thing you are reading options from. */
.case-study__menu-list {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 208px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 16px;
  background: var(--cs-paper-raised);
  border: 1px solid var(--cs-hair);
  box-shadow: 0 20px 50px rgba(12, 11, 10, 0.26);
  animation: cs-menu-in 180ms var(--cs-open-ease) both;
}

@keyframes cs-menu-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: none; }
}

.case-study__menu-list > a,
.case-study__menu-list > button {
  appearance: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 11px;
  background: transparent;
  color: var(--cs-ink);
  font-family: var(--cs-font-body);
  font-size: 13.5px;
  line-height: 1.2;
  transition: background 180ms ease, color 180ms ease;
}

.case-study__menu-list > a:hover,
.case-study__menu-list > button:hover {
  background: var(--cs-ink);
  color: var(--cs-paper);
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

/* Optima has no 300. Sweep the whole file rather than the claim alone, so a
   thin cannot be synthesised anywhere in the window. */
const thin = raw.split('font-weight: 300;').length - 1;
raw = raw.split('font-weight: 300;').join('font-weight: 400;');
console.log(`OK   raised ${thin} weight-300 declaration(s) to 400 for Optima`);

/* Anything still referencing the removed close button is a dead selector. */
for (const dead of ['case-study__close', 'font-weight: 300', 'font-weight: 200', 'font-weight: 100']) {
  const hits = raw.split(dead).length - 1;
  if (hits) {
    console.log(`WARN ${hits} leftover reference(s) to "${dead}"`);
  }
}

if (failed) {
  console.log('PATCH FAILED - nothing written');
  process.exit(1);
}

writeFileSync(FILE, raw, 'utf8');
console.log('ALL PATCHES OK');
