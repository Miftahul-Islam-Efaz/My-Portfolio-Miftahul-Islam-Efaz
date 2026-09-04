/**
 * Rebuild the cover parallax from measurements of the reference clip.
 *
 * The clip was decomposed with ffmpeg and cross-correlated layer by layer
 * (background photograph / billboard interior / display type / overview copy),
 * one vertical shift per layer per frame. The result contradicted what was
 * shipped:
 *
 *   frames 18-40   photograph -0.61x   type -1.00x   paper edge -1.00x
 *   frames 42-74   photograph -1.00x   type -1.00x   paper edge -1.00x
 *
 * So the TYPE never parallaxes - it travels with the document and is clipped
 * away under the bar, its bottom edge holding a constant 135px above the
 * section boundary for the entire descent. The PHOTOGRAPH is the layer that
 * lags, and it lags by a clamped offset (~115px) rather than a permanent rate.
 *
 * Shipped previously: the type shifted at 0.34x and faded to 0.1 while the
 * image was nailed down. Exactly inverted, which is why it read as the text
 * sliding off on its own instead of the image holding the frame.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'src/styles/work-case-study.css';
const TSX = 'src/components/work/case-study/CaseStudyWindow.tsx';
const CFG = 'src/config/caseStudy.ts';

const edits = [
  /* ---------------------------------------------------------------- */
  /* THE TYPE STOPS MOVING                                            */
  /* ---------------------------------------------------------------- */
  {
    file: CSS,
    label: 'cover text back into normal flow',
    oldStr: `  color: var(--cs-on-dark);
  /* PARALLAX. The block rides the scroll at about a third of its rate and
     thins as the overview arrives. Both variables are written by
     CaseStudyWindow from the scroller's own position, so they follow Lenis and
     the native fallback equally - and both are compositor properties, so this
     costs no layout. */
  transform: translate3d(0, var(--cs-cover-shift, 0px), 0);
  opacity: var(--cs-cover-fade, 1);
  will-change: transform, opacity;
}`,
    newStr: `  color: var(--cs-on-dark);
  /* NO TRANSFORM HERE, deliberately.
     Measured off the reference clip frame by frame: the type travels at exactly
     the scroll rate and is clipped away under the bar - its bottom edge held a
     constant 135px above the section boundary for the whole descent, which is
     simply what static flow does. The separation the eye reads as parallax
     comes from the photograph lagging, not from the words leading. Moving both
     layers is what made this feel like two unrelated animations. */
}`,
  },

  /* ---------------------------------------------------------------- */
  /* THE PHOTOGRAPH LAGS                                              */
  /* ---------------------------------------------------------------- */
  {
    file: CSS,
    label: 'parallax moved onto the photograph',
    oldStr: `.case-study__cover-image {
  object-fit: cover;
}`,
    newStr: `/* PARALLAX, and it lives on the photograph.
   The reference holds the image at ~0.61x the scroll rate for the first third
   of a screen and then lets it travel with the document: a lag that
   accumulates to roughly 120px and stops, not a rate that runs forever.

   Sliding an image down means uncovering its top edge, so it is scaled from its
   BOTTOM edge - the zoom buys precisely the headroom the shift spends, which is
   why CaseStudyWindow derives one from the other instead of hardcoding two
   numbers that can drift apart at an unusual viewport height.

   The transform sits on the image rather than on __cover-media because the
   wrapper is mid-flight on cs-plate-land when the window opens, and a filling
   animation outranks a stylesheet transform for as long as it lasts. */
.case-study__cover-image {
  object-fit: cover;
  transform: translate3d(0, var(--cs-plate-shift, 0px), 0)
    scale(var(--cs-plate-zoom, 1.16));
  transform-origin: 50% 100%;
  will-change: transform;
}`,
  },

  /* ---------------------------------------------------------------- */
  /* THE MEASURED NUMBERS, NAMED                                      */
  /* ---------------------------------------------------------------- */
  {
    file: CFG,
    label: 'COVER_PARALLAX config',
    oldStr: `  contentDelayRatio: 0.45,
} as const;`,
    newStr: `  contentDelayRatio: 0.45,
} as const;

/**
 * The cover's scroll behaviour - measured, not guessed.
 *
 * The reference clip was decomposed frame by frame and each layer's vertical
 * shift recovered by cross-correlation. The photograph and the billboard inside
 * it both moved at 0.61x the document rate; the display type moved at 1.0x; and
 * after roughly 340px of scrolling every layer converged on 1.0x.
 *
 * That last detail is the one worth keeping. A lag expressed as a permanent
 * rate would drag the image out of its own frame on a long page, so the offset
 * is clamped and the image rejoins the document instead of sliding forever.
 *
 * The headroom factor is the safety margin on the zoom that covers the shift.
 * At 1.0 the image would be exactly tall enough at maximum offset with no
 * tolerance for rounding or for a scrollbar-driven resize; 1.15 keeps a margin
 * at a crop too small to notice.
 */
export const COVER_PARALLAX = {
  /** 1 - 0.61. How far behind the document the photograph falls. */
  lag: 0.39,
  /** Where the lag stops accumulating, in px. Measured at ~115. */
  maxShift: 130,
  headroom: 1.15,
  /** Multiplier on cover progress for the scrim's second floor. */
  darken: 1.7,
} as const;`,
  },

  {
    file: TSX,
    label: 'COVER_PARALLAX imported',
    oldStr: `
  WINDOW_MOTION,
`,
    newStr: `
  COVER_PARALLAX,
  WINDOW_MOTION,
`,
  },

  {
    file: TSX,
    label: 'section comment',
    oldStr: `  /* ---- COVER PARALLAX, and the floor that deepens under the claim. ---- */`,
    newStr: `  /* ---- COVER PARALLAX: the photograph lags, the floor deepens. ---- */`,
  },

  {
    file: TSX,
    label: 'lag written to the image, clamped, with derived zoom',
    oldStr: `      const height = cover.offsetHeight || 1;
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
      );`,
    newStr: `      const height = cover.offsetHeight || 1;
      const top = scroller.scrollTop;
      const progress = Math.min(1, Math.max(0, top / height));

      /* The photograph lags the document, and the lag is capped. Frame
         differencing the reference gave a steady 0.61x for the first ~340px of
         travel and 1.0x after that - which is a clamp on the offset, not a
         curve on the rate. Written in px off scrollTop rather than off
         progress, so the hand-off to 1.0x lands at the same place on any
         viewport height. */
      const shift = Math.min(top * COVER_PARALLAX.lag, COVER_PARALLAX.maxShift);
      cover.style.setProperty('--cs-plate-shift', \`\${shift.toFixed(2)}px\`);

      /* The zoom exists only to cover what the shift uncovers, so it is derived
         from the cap and the live height rather than typed in: a short cover
         and a tall one need different proportions to hide the same 130px. */
      cover.style.setProperty(
        '--cs-plate-zoom',
        (
          1 +
          (COVER_PARALLAX.maxShift * COVER_PARALLAX.headroom) / height
        ).toFixed(4)
      );

      cover.style.setProperty(
        '--cs-cover-dark',
        Math.min(1, progress * COVER_PARALLAX.darken).toFixed(3)
      );`,
  },
];

/* ------------------------------------------------------------------ */
/* HARNESS                                                            */
/* ------------------------------------------------------------------ */

const byFile = new Map();
for (const edit of edits) {
  if (!byFile.has(edit.file)) byFile.set(edit.file, []);
  byFile.get(edit.file).push(edit);
}

let failed = false;

for (const [file, fileEdits] of byFile) {
  const original = readFileSync(file, 'utf8');
  const crlf = original.includes('\r\n');
  const fix = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);
  let raw = original;
  let fileFailed = false;

  for (const { label, oldStr, newStr } of fileEdits) {
    const target = fix(oldStr);
    const replacement = fix(newStr);
    if (raw.includes(replacement)) {
      console.log(`SKIP ${label} (already applied)`);
      continue;
    }
    const hits = raw.split(target).length - 1;
    if (hits !== 1) {
      console.log(`MISS ${label} (${hits} matches)`);
      failed = true;
      fileFailed = true;
      continue;
    }
    raw = raw.replace(target, replacement);
    console.log(`OK   ${label}`);
  }

  if (!fileFailed && raw !== original) writeFileSync(file, raw);
}

/* The old variables are gone from the writer; make sure nothing still reads
   them, which would leave a silently dead declaration in the stylesheet. */
if (!failed) {
  for (const file of [CSS, TSX]) {
    const raw = readFileSync(file, 'utf8');
    for (const dead of ['--cs-cover-shift', '--cs-cover-fade']) {
      if (raw.includes(dead)) console.log(`WARN ${dead} still referenced in ${file}`);
    }
  }
  console.log('ALL PATCHES OK');
}

process.exit(failed ? 1 : 0);
