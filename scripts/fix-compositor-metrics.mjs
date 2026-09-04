/* Patch: THE COMPOSITOR - word metrics, air, and two removals.

   1. WORD COLLISION. The word box was sized by the Thin (100) cut in
      normal flow while the Black (900) cut was absolute on top. Black is
      wider, so at full weight it overflowed to the right and collided
      with the next word - worse the longer the word, which is exactly
      what the screenshot shows.

      Fix: a hidden Black SIZER holds the box open at the widest cut, and
      BOTH visible layers become absolute inside it. No cut can overflow
      at any blend value.

   2. AIR. 118px at 0.92 leading with -0.028em tracking was congested.
      Down to 92px / 1.02 / -0.018em, plus a little word-spacing back
      (negative tracking eats the space glyph too).

   3. Remove the eyebrow and the decision index row.

   Anchors use \r?\n so the script survives either line ending. */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:\\website\\nextjs-site\\';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (s) => new RegExp(esc(s).replace(/\r?\n/g, '\\r?\\n'));

const patches = [
  /* ---------------- config ---------------- */
  {
    file: 'src/config/compositor.ts',
    label: 'display size down to 92px',
    find: `  sizeVw: 6.6,
  sizeMax: 118,`,
    replace: `  sizeVw: 5.4,
  sizeMax: 92,`,
  },
  {
    file: 'src/config/compositor.ts',
    label: 'leading opened to 1.02',
    find: `  /* Unitless leading for the display statement. Below 1 so the two lines
     lock into a block. */
  leading: 0.92,`,
    replace: `  /* Unitless leading for the display statement. 0.92 locked the two
     lines into a single block, which at 118px read as congestion rather
     than as tight setting - the descenders of line 1 were arriving in
     the caps of line 2. Just over 1 keeps them related without touching. */
  leading: 1.02,`,
  },
  {
    file: 'src/config/compositor.ts',
    label: 'tracking eased to -0.018em',
    find: `  tracking: -0.028,`,
    replace: `  tracking: -0.018,`,
  },

  /* ---------------- content ---------------- */
  {
    file: 'src/components/compositor/compositorContent.ts',
    label: 'margin note tells the truth about leading',
    find: `  'Leading 2.1 \\u2192 0.92',`,
    replace: `  'Leading 2.1 \\u2192 1.02',`,
  },

  /* ---------------- css ---------------- */
  {
    file: 'src/styles/compositor.css',
    label: 'css size ramp',
    find: `	--comp-size-set: clamp(34px, 6.6vw, 118px);`,
    replace: `	--comp-size-set: clamp(34px, 5.4vw, 92px);`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'css leading ramp',
    find: `	--comp-lead-set: 0.92;`,
    replace: `	--comp-lead-set: 1.02;`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'tracking ramp + word-spacing restored',
    find: `	letter-spacing: calc(0.24em - 0.268em * var(--comp-scale));
	text-wrap: balance;`,
    replace: `	letter-spacing: calc(0.24em - 0.258em * var(--comp-scale));
	/* Negative tracking shrinks the space glyph along with the letters, so
	   a little word-spacing goes back in at the composed end. Without it
	   the words read as one long string at display size. */
	word-spacing: calc(var(--comp-scale) * 0.05em);`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'word box sized by the widest cut',
    find: `/* Each word is a stack of two cuts. The box is sized by the light layer
   in normal flow; the heavy layer is absolutely positioned on top of it,
   so the two can never disagree about metrics. */`,
    replace: `/* Each word is a stack of cuts over a HIDDEN SIZER.

   The first version sized the box with the Thin layer in normal flow and
   put the Black layer on top of it absolutely. Cabinet Grotesk Black is
   WIDER than Thin, so at full weight the Black glyphs overflowed the box
   to the right and collided with the following word - and the error grew
   with word length, so long words overlapped badly and short ones barely
   did.

   Now an aria-hidden Black copy sits in flow to hold the box open at the
   widest cut, and BOTH visible layers are absolute inside it. The box is
   therefore always wide enough for whatever the blend is showing, and no
   value of --local can cause a collision. The cost is that Thin sits in
   a slightly wide box, which at raw size is invisible. */`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'layer positioning rewritten',
    find: `.comp-w {
	display: inline-block;
}`,
    replace: `.comp-w {
	display: inline-block;
}

/* Holds the box open. visibility: hidden keeps it out of the accessibility
   tree and off the screen while still occupying its metrics - display:
   none or opacity: 0 would either collapse the box or leave it clickable. */
.comp-w--sizer {
	visibility: hidden;
	font-weight: 900;
}`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'light cut absolute',
    find: `.comp-w--light {
	font-weight: 100;
	opacity: calc(1 - var(--local));
}`,
    replace: `.comp-w--light {
	position: absolute;
	top: 0;
	left: 0;
	font-weight: 100;
	opacity: calc(1 - var(--local));
}`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'heavy cut anchored, not stretched',
    find: `.comp-w--heavy {
	position: absolute;
	inset: 0;
	font-weight: 900;`,
    replace: `.comp-w--heavy {
	position: absolute;
	top: 0;
	left: 0;
	font-weight: 900;`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'decision readout css removed',
    find: `.comp-decisions {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem 1.6rem;
}`,
    replace: `/* The decision index row lived here. Removed at his request - the
   measurements at the right are enough of a readout, and the five labels
   were narrating a transformation that is already legible. */`,
  },
  {
    file: 'src/styles/compositor.css',
    label: 'readout now right-aligned only',
    find: `	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 2rem;
	flex-wrap: wrap;
	padding: clamp(1.5rem, 5vh, 3.5rem) 6vw;`,
    replace: `	display: flex;
	align-items: flex-end;
	justify-content: flex-end;
	gap: 2rem;
	flex-wrap: wrap;
	padding: clamp(1.5rem, 5vh, 3.5rem) 6vw;`,
  },

  /* ---------------- component ---------------- */
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'unused imports dropped',
    find: `  COMPOSITOR_STATEMENT,
  COMPOSITOR_ACCENT_TARGET,
  COMPOSITOR_EYEBROW,
  COMPOSITOR_DECISIONS,
  COMPOSITOR_CLOSE,`,
    replace: `  COMPOSITOR_STATEMENT,
  COMPOSITOR_ACCENT_TARGET,
  COMPOSITOR_CLOSE,`,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'ROW_SOURCES removed',
    find: `/* Which beat variable each decision row reports on, in the order the
   rows are printed. Kept adjacent to the markup that consumes it so a
   reordered list cannot silently mismatch. */
const ROW_SOURCES = [
  'var(--comp-grid)',
  'var(--comp-scale)',
  'var(--comp-weight)',
  'var(--comp-accent)',
  'var(--comp-strip)',
] as const;`,
    replace: `/* ROW_SOURCES lived here, mapping each decision row to the beat
   variable it reported on. Gone with the row itself. */`,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'eyebrow removed',
    find: `        {/* ---------------- THE SHEET HEADER ---------------- */}
        <p className="comp-eyebrow" data-comp-strip>
          {COMPOSITOR_EYEBROW}
        </p>

`,
    replace: ``,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'decision list removed',
    find: `        <ol className="comp-decisions">
          {COMPOSITOR_DECISIONS.map((decision, i) => (
            <li
              key={decision.index}
              className="comp-decision"
              style={cssVars({ '--row': ROW_SOURCES[i] })}
            >
              <span className="comp-decision-index">{decision.index}</span>
              <span className="comp-decision-label">{decision.label}</span>
              <span aria-hidden className="comp-decision-bar" />
            </li>
          ))}
        </ol>

`,
    replace: ``,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'sizer added to each word',
    find: `                    {/* Thin cut - the one that carries the text for
                        assistive tech and for text selection. */}
                    <span className="comp-w comp-w--light">{word}</span>
                    {/* Black cut - visual only. */}
                    <span aria-hidden className="comp-w comp-w--heavy">
                      {word}
                    </span>`,
    replace: `                    {/* SIZER. In flow, hidden, set in the heaviest cut -
                        it holds the box open at the widest metrics so
                        neither visible layer can overflow into the next
                        word. Without this, Black overflowed Thin's box
                        and the words collided at full weight. */}
                    <span aria-hidden className="comp-w comp-w--sizer">
                      {word}
                    </span>
                    {/* Thin cut - carries the text for assistive tech
                        and for text selection. */}
                    <span className="comp-w comp-w--light">{word}</span>
                    {/* Black cut - visual only. */}
                    <span aria-hidden className="comp-w comp-w--heavy">
                      {word}
                    </span>`,
  },
];

let failed = 0;
const cache = new Map();

for (const p of patches) {
  const path = ROOT + p.file.replace(/\//g, '\\');
  if (!cache.has(path)) cache.set(path, readFileSync(path, 'utf8'));
  const before = cache.get(path);
  const re = rx(p.find);

  if (!re.test(before)) {
    console.log(`FAIL  ${p.file} :: ${p.label} (anchor not found)`);
    failed += 1;
    continue;
  }

  cache.set(path, before.replace(re, p.replace));
  console.log(`OK    ${p.file} :: ${p.label}`);
}

for (const [path, content] of cache) writeFileSync(path, content, 'utf8');

console.log(
  failed ? `\n${failed} PATCH(ES) FAILED` : '\nALL PATCHES OK',
);
