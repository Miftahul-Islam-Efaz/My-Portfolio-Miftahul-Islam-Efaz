/**
 * Two unrelated fixes, one harness.
 *
 *  1. OPTIMA. Four TTFs landed in public/Fonts/optima with inconsistent
 *     casing and a space in one filename. Registered as one family at
 *     400 / 400 italic / 500 / 700, plus a --font-optima token.
 *
 *  2. THE BROKEN COVER IMAGE. A HEAD request to the Drive URL from this
 *     machine returns 200 image/png 1,250,668 bytes - so the file is public
 *     and the URL is right. It fails in the browser and nowhere else, which
 *     narrows it to one thing: lh3.googleusercontent.com refuses requests
 *     that arrive with a Referer header from another origin. curl sends no
 *     Referer and is served; the browser sends localhost and is refused.
 *     referrerPolicy="no-referrer" makes the browser behave like curl.
 *
 * Harness pattern: build the edit list, detect line endings per file, skip if
 * already applied, fail loudly on a miss, and write nothing unless every edit
 * in the file resolved exactly once.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FONTS = 'src/styles/fonts.css';
const BODY = 'src/components/work/case-study/CaseStudyBody.tsx';

const OPTIMA_FACES = `/* Optima. Four TTFs with inconsistent casing and a space in one filename -
 * hence the %20, which is required: an unescaped space in a url() token is a
 * parse error and the whole declaration is dropped. TTF rather than woff2
 * because that is what the folder holds; convert and swap the urls if the
 * ~240KB total ever matters.
 *
 * THE LIGHTEST CUT IS REGULAR. Nothing set in Optima should be asked for below
 * 400 - a request for 300 makes the browser synthesise a thin, and on a flared
 * humanist face that thins the stem and leaves the flare, which is the one
 * feature worth having. */
@font-face { font-family: "Optima"; src: url("/Fonts/optima/OPTIMA.TTF") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: "Optima"; src: url("/Fonts/optima/Optima_Italic.ttf") format("truetype"); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: "Optima"; src: url("/Fonts/optima/Optima%20Medium.ttf") format("truetype"); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: "Optima"; src: url("/Fonts/optima/OPTIMA_B.TTF") format("truetype"); font-weight: 700; font-style: normal; font-display: swap; }`;

const edits = [
  {
    file: FONTS,
    label: 'register the Optima family',
    oldStr: `@font-face { font-family: "Peace Sans"; src: url("/Fonts/peace-sans/peace-sans-webfont.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }

:root {`,
    newStr: `@font-face { font-family: "Peace Sans"; src: url("/Fonts/peace-sans/peace-sans-webfont.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }

${OPTIMA_FACES}

:root {`,
  },
  {
    file: FONTS,
    label: 'add the --font-optima token',
    oldStr: `	--font-peace-sans: "Peace Sans", ui-sans-serif, system-ui, sans-serif;
}`,
    newStr: `	--font-peace-sans: "Peace Sans", ui-sans-serif, system-ui, sans-serif;
	/* Flared humanist - a serif's modulation on a sans's skeleton. The fallback
	 * is a serif rather than a sans because losing the flare reads closer to
	 * Bespoke Serif than to Satoshi. */
	--font-optima: "Optima", "Bespoke Serif", ui-serif, Georgia, serif;
}`,
  },
  {
    file: BODY,
    label: 'no-referrer on the cover image',
    oldStr: `            className="case-study__cover-image"
            priority
            unoptimized
          />`,
    newStr: `            className="case-study__cover-image"
            priority
            unoptimized
            /* Drive's lh3 host refuses cross-origin Referer headers - see the
               note in scripts/patch-optima-and-image.mjs. Without this the
               image 404s in the browser while returning 200 to curl. */
            referrerPolicy="no-referrer"
          />`,
  },
  {
    file: BODY,
    label: 'no-referrer on the two plates',
    oldStr: `                className="case-study__plate-image"
                unoptimized
              />`,
    newStr: `                className="case-study__plate-image"
                unoptimized
                referrerPolicy="no-referrer"
              />`,
  },
];

let failed = false;
const byFile = new Map();

for (const edit of edits) {
  if (!byFile.has(edit.file)) byFile.set(edit.file, []);
  byFile.get(edit.file).push(edit);
}

for (const [file, fileEdits] of byFile) {
  const original = readFileSync(file, 'utf8');
  const crlf = original.includes('\r\n');
  const fix = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);

  let raw = original;
  let dirty = false;

  for (const edit of fileEdits) {
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
    dirty = true;
    console.log(`OK   ${edit.label}`);
  }

  if (dirty && !failed) writeFileSync(file, raw, 'utf8');
}

console.log(failed ? 'PATCH FAILED - nothing written for failing files' : 'ALL PATCHES OK');
process.exit(failed ? 1 : 0);
