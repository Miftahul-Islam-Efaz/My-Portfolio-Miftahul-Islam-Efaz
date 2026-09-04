/* THE COMPOSITOR - INK FILL

   The chosen imagery concept: at the accent beat the display statement
   stops being flat off-white and FILLS with a photographic plate,
   clipped to the glyphs. The type becomes the image.

   FOUR DESIGN DECISIONS WORTH READING BEFORE CHANGING ANY OF THIS:

   1. A THIRD LAYER, NOT A TWEENED CLIP.
      `background-clip` and `-webkit-text-fill-color` cannot be
      interpolated - flipping them mid-scroll snaps. So each word now
      carries a third absolute layer, identical metrics, filled with the
      plate, and the flat Black layer cross-fades into it. Same trick as
      the fake weight axis: blend two real states instead of animating an
      un-animatable property.

   2. THE FILL CANNOT SHOW BEFORE THE IMAGE EXISTS.
      Text with `color: transparent` and a background that failed to load
      is INVISIBLE TEXT. So `--comp-ink-ready` is 0 until an Image()
      preload actually fires onload. If the file is missing, absent, or
      403s, the section silently stays exactly as it is now and logs why.
      This is the whole reason the mechanism is safe to ship before the
      plate is generated.

   3. `background-attachment: fixed` FOR CONTINUITY.
      Each word is its own box, so a per-word background would restart
      the image inside every word. Anchoring to the viewport makes one
      continuous plate read across all the words, and gives the fill a
      genuine parallax against the letters for free. Where it is not
      supported (touch, small screens) the ink layer is disabled outright
      rather than rendered wrongly.

   4. THE ACCENT WORD DOES NOT FILL.
      `.comp-word--accent` sets --comp-ink to 0 for itself, so `set`
      stays ember while everything around it turns photographic. One
      accent, one use - and the contrast makes the fill legible as a
      decision rather than a texture. */

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const ROOT = 'D:\\website\\nextjs-site\\';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (s) => new RegExp(esc(s).replace(/\r?\n/g, '\\r?\\n'));

const patches = [
  /* ---------------- component ---------------- */
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'ink config imported',
    find: `import { COMPOSITOR_ANNOTATION } from '../../config/compositor';`,
    replace: `import {
  COMPOSITOR_ANNOTATION,
  COMPOSITOR_INK,
} from '../../config/compositor';`,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'plate url handed to css',
    find: `      className="comp"
    >`,
    replace: `      className="comp"
      /* The plate is named once, here, and every layer that needs it
         reads it from this variable. */
      style={cssVars({ '--comp-ink-image': \`url(\${COMPOSITOR_INK.source})\` })}
    >`,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'veil plane added',
    find: `      <div aria-hidden className="comp-annotation">`,
    replace: `      {/* ---------------- THE VEIL ----------------
          The same plate, full bleed, at a few percent, masked to a soft
          oval. Without it the filled letters read as a floating texture
          with no source; with it they read as the one place the light is
          strong enough to come through. Set --comp-veil-max to 0 in
          compositor.css to remove it entirely. */}
      <div aria-hidden className="comp-veil" />

      <div aria-hidden className="comp-annotation">`,
  },
  {
    file: 'src/components/compositor/CompositorSection.tsx',
    label: 'ink layer added to each word',
    find: `                    {/* Black cut - visual only. */}
                    <span aria-hidden className="comp-w comp-w--heavy">
                      {word}
                    </span>`,
    replace: `                    {/* Black cut - visual only. */}
                    <span aria-hidden className="comp-w comp-w--heavy">
                      {word}
                    </span>
                    {/* INK layer - the Black cut again, but filled with
                        the plate and clipped to the glyphs. Cross-fades
                        in over the flat one, because background-clip
                        cannot be tweened. Stays at opacity 0 until the
                        image has actually loaded. */}
                    <span aria-hidden className="comp-w comp-w--ink">
                      {word}
                    </span>`,
  },

  /* ---------------- hook ---------------- */
  {
    file: 'src/hooks/useCompositor.ts',
    label: 'ink config imported into hook',
    find: `  COMPOSITOR_READOUT,
} from '../config/compositor';`,
    replace: `  COMPOSITOR_READOUT,
  COMPOSITOR_INK,
  COMPOSITOR_INK_BEAT,
} from '../config/compositor';`,
  },
  {
    file: 'src/hooks/useCompositor.ts',
    label: 'ink preload guard',
    find: `    const ctx = gsap.context(() => {`,
    replace: `    /* ---------------- INK PLATE PRELOAD ----------------

       THE GUARD THAT MAKES THE FILL SAFE. The ink layer paints text at
       color: transparent with the plate showing through it, so if the
       plate is missing the words are INVISIBLE, not unstyled. Nothing is
       allowed to reveal that layer until a real decode has happened.

       On failure the section degrades to precisely what it is today - a
       well-set statement in flat off-white - and says why in the console
       instead of blanking the sentence. */
    const inkPlate = new Image();
    inkPlate.onload = () => {
      root.style.setProperty('--comp-ink-ready', '1');
    };
    inkPlate.onerror = () => {
      console.warn(
        \`[compositor] ink plate not found at \${COMPOSITOR_INK.source} - \` +
          'statement stays flat off-white. Drop a JPEG there to enable the fill.',
      );
    };
    inkPlate.src = COMPOSITOR_INK.source;

    const ctx = gsap.context(() => {`,
  },
  {
    file: 'src/hooks/useCompositor.ts',
    label: 'ink setters',
    find: `      const setShiftR = gsap.quickSetter(root, '--comp-shift-readout', 'px');`,
    replace: `      const setShiftR = gsap.quickSetter(root, '--comp-shift-readout', 'px');
      const setInk = gsap.quickSetter(root, '--comp-ink');
      const setInkShift = gsap.quickSetter(root, '--comp-ink-shift', 'px');`,
  },
  {
    file: 'src/hooks/useCompositor.ts',
    label: 'ink beat driven',
    find: `          setStrip(r);`,
    replace: `          setStrip(r);

          /* THE FILL. Eased like a judgement rather than a wipe - it
             arrives with the accent and completes under restraint, so
             the last thing that happens to the type is the light
             entering it. */
          setInk(easeJudge(beat(p, COMPOSITOR_INK_BEAT)));

          /* Plate drift. The fill is viewport-anchored, so moving the
             background position against scroll makes the light travel
             THROUGH the letterforms instead of sitting in them. Centred
             on the section midpoint so the drift is symmetrical. */
          setInkShift(COMPOSITOR_INK.drift * (p - 0.5));`,
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

/* ---------------- appended: config ----------------
   Appended rather than anchored: these are new exports, so there is
   nothing to match against and nothing existing to break. */

appendFileSync(
  ROOT + 'src\\config\\compositor.ts',
  `
/* ==================================================================
   INK FILL

   The statement fills with a photographic plate at the accent beat.

   \`source\` is the ONLY place the file path is written. It is loaded
   through an Image() preload in useCompositor.ts before anything is
   allowed to reveal the filled layer - see the guard there and the
   reason it exists.

   The plate wants: hard raking light, no subject, no text, deep black
   falloff on one side and ember heat on the other, exported as JPEG.
   Anything busy reads as noise once it is clipped inside letterforms -
   the fill needs ONE clear direction of light and little else.
   ================================================================== */
export const COMPOSITOR_INK = {
  /* Self-hosted under /public on purpose. Hotlinked Drive URLs are what
     produced today's 429s and blank cards; an image this section cannot
     render without does not go through a third party. */
  source: '/plate/ink-fill.jpg',

  /* Vertical travel of the fill across the whole scroll window, in px.
     Applied to background-position, not to a transform, so it costs
     nothing and cannot move the glyphs. */
  drift: 90,

  /* Full-bleed copy of the plate behind everything. Deliberately tiny -
     this is here so the filled letters have a visible source of light,
     not to put a photograph in the section. Set to 0 to remove. */
  veilOpacity: 0.07,
} as const;

/* Where the fill happens. Overlaps the accent beat and finishes with
   restraint, so the light entering the type is the closing move. */
export const COMPOSITOR_INK_BEAT: readonly [number, number] = [0.58, 0.94];
`,
  'utf8',
);

/* ---------------- appended: css ---------------- */

appendFileSync(
  ROOT + 'src\\styles\\compositor.css',
  `
/* ==================================================================
   INK FILL

   Appended deliberately: the two rules below OVERRIDE earlier ones at
   equal specificity, which only works from later in the file.
   ================================================================== */

.comp {
	/* Both default to 0. --comp-ink is driven by scroll; --comp-ink-ready
	   is set to 1 by the hook ONLY after the plate decodes. Multiplying
	   the two means every path to a visible fill requires a real image. */
	--comp-ink: 0;
	--comp-ink-ready: 0;
	--comp-ink-shift: 0px;
	--comp-veil-max: 0.07;
}

/* The filled cut. Same font, same metrics, same position as the heavy
   layer - the only difference is that the paint comes from the plate. */
.comp-w--ink {
	position: absolute;
	top: 0;
	left: 0;
	font-weight: 900;
	background-image: var(--comp-ink-image);
	background-size: cover;
	/* Viewport-anchored, so ONE continuous plate reads across every word
	   instead of restarting inside each word box. */
	background-attachment: fixed;
	background-position: center calc(50% + var(--comp-ink-shift));
	background-repeat: no-repeat;
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	-webkit-text-fill-color: transparent;
	opacity: calc(var(--comp-ink) * var(--comp-ink-ready));
}

/* The flat Black cut retreats as the filled one arrives. Overrides the
   earlier rule; the (0.05 + 0.95 * --local) term is unchanged. */
.comp-w--heavy {
	opacity: calc(
		(0.05 + 0.95 * var(--local)) *
		(1 - var(--comp-ink) * var(--comp-ink-ready))
	);
}

/* ONE ACCENT, ONE USE. The accent word opts itself out of the fill, so
   'set' holds the ember while every word around it turns photographic.
   Scoping the variable rather than the rule means the heavy layer above
   automatically stays at full opacity for this word - no second
   override, nothing to keep in sync. */
.comp-word--accent {
	--comp-ink: 0;
}

/* The plate itself, full bleed, masked to a soft oval so it never reads
   as a rectangle with an edge. Sticky in the same grid cell as the other
   planes - see the stage comment above; it adds no pin spacing. */
.comp-veil {
	grid-row: 1;
	grid-column: 1;
	position: sticky;
	top: 0;
	height: 100svh;
	background-image: var(--comp-ink-image);
	background-size: cover;
	background-position: center calc(50% + var(--comp-ink-shift) * 0.4);
	-webkit-mask-image: radial-gradient(
		70% 60% at 50% 45%,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 0) 100%
	);
	mask-image: radial-gradient(
		70% 60% at 50% 45%,
		rgba(0, 0, 0, 1) 0%,
		rgba(0, 0, 0, 0) 100%
	);
	opacity: calc(
		var(--comp-ink) * var(--comp-ink-ready) * var(--comp-veil-max)
	);
	pointer-events: none;
}

/* WHERE THE FILL IS TURNED OFF ENTIRELY.

   background-attachment: fixed is ignored on iOS Safari and is expensive
   on touch hardware generally. Rendering it anyway would restart the
   plate inside every word - visibly wrong. !important beats the hook's
   inline value, which is the point: JS cannot switch this back on. */
@media (max-width: 900px), (hover: none) {
	.comp {
		--comp-ink-ready: 0 !important;
	}
}

/* Same reasoning as the rest of the section: no motion, no mechanism. */
@media (prefers-reduced-motion: reduce) {
	.comp {
		--comp-ink-ready: 0 !important;
	}
}
`,
  'utf8',
);

console.log('OK    src/config/compositor.ts :: COMPOSITOR_INK appended');
console.log('OK    src/styles/compositor.css :: ink fill rules appended');
console.log(failed ? `\n${failed} PATCH(ES) FAILED` : '\nALL PATCHES OK');
