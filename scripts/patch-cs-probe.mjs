/**
 * The frost probe's one rule.
 *
 * A 1px line parked just below the bar, inside the scroller. While it is in
 * view, nothing has passed under the pills yet; once it leaves, the bar frosts.
 * An IntersectionObserver watches it instead of the old scrollTop > 32 test,
 * because a smoothed scroller can report a scrollTop that lags the pixels on
 * screen - and the bar going ghost-over-paper was exactly that failure.
 *
 * Absolutely positioned, so it is out of flow and cannot shift the cover by a
 * pixel; the scroller is itself positioned, so the probe scrolls with the
 * content rather than pinning to the viewport.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles/work-case-study.css';

const oldStr = `.case-study__doc {
  background: var(--cs-paper);
}`;

const newStr = `.case-study__doc {
  background: var(--cs-paper);
}

/* Sits at the depth where content starts sliding under the bar: the bar's own
   padding plus a 40px pill, rounded down so the frost arrives a touch early
   rather than a touch late. */
.case-study__frost-probe {
  position: absolute;
  top: clamp(52px, 5vw, 74px);
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}`;

const original = readFileSync(FILE, 'utf8');
const crlf = original.includes('\r\n');
const fix = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);

const from = fix(oldStr);
const to = fix(newStr);

if (original.includes(to)) {
  console.log('SKIP frost probe rule (already applied)');
  process.exit(0);
}

const count = original.split(from).length - 1;
if (count !== 1) {
  console.log(`MISS frost probe rule - matched ${count} times, expected 1`);
  process.exit(1);
}

writeFileSync(FILE, original.replace(from, to), 'utf8');
console.log('OK   frost probe rule');
console.log('ALL PATCHES OK');
