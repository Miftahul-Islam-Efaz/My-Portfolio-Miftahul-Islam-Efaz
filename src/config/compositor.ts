/* ------------------------------------------------------------------
   THE COMPOSITOR - tuning

   The section after THE RAKE. Its job is to prove design ability in a
   few seconds, using nothing but text.

   THE IDEA: don't show a designed thing, perform the act of designing.
   The section arrives as raw material - a monospace spec sheet, one
   size, one column, no hierarchy - and scroll applies judgement to it
   one decision at a time: grid, scale, weight, accent, and finally
   restraint, where every annotation strips away and leaves the finished
   sentence alone on the page.

   The visitor watches taste get applied to text they can still read the
   whole time. That is the argument, and it cannot be made by a picture.

   ------------------------------------------------------------------
   WHY THERE IS NO WEBGL HERE, DELIBERATELY

   The previous occupant of this slot was a 35,000-point GPU portrait. It
   froze the page, and the freeze was one line: it sized points with the
   copied `300.0 / -mv.z` idiom, where 300 is not a constant but a
   REFERENCE VIEWPORT HEIGHT. Grains drew ~900px wide instead of ~2px, so
   every frame blended 35,000 near-fullscreen quads.

   That is fixable. It is not worth fixing here, because the portrait
   also failed as an idea: a particle cloud that reassembles a photograph
   ends on a frame identical to the photograph it replaced, and it argues
   "I can do WebGL" rather than "I design well". Different claim.

   This section is DOM, CSS custom properties and one GSAP timeline. It
   cannot stall a scroll. Awwwards weights usability at 30% - second only
   to design at 40% - and analyses of its own nominees find winners
   routinely shipping 12MB+ and 400+ requests. Being spectacular AND
   instant is the rarer thing.

   ------------------------------------------------------------------
   THE TYPE MATERIAL, AND THE ONE TRICK IN HERE

   Nothing in /public/Fonts is a variable font, so `font-variation-
   settings` is not available and a real weight axis cannot be tweened.

   Cabinet Grotesk, however, ships EIGHT static cuts including Thin (100)
   and Black (900). So the statement is rendered TWICE, stacked exactly,
   once at 100 and once at 900, and the pair is cross-faded. Reading two
   coincident weights at partial opacity is perceptually very close to
   one weight interpolating - the stems thicken continuously - and it
   costs two text nodes instead of a font file.

   It is a fake axis, and it is documented as one so nobody later goes
   looking for the variable font that does not exist.

   RAW STATE uses ARK_ES Dense, which was downloaded from Type Archive,
   registered in fonts.css, and applied nowhere until now.
   ------------------------------------------------------------------ */

/* Where the composition runs against the scroll. UNPINNED - see the
   invariant in useCompositor.ts. The window is generous: the whole point
   is that a visitor can stop halfway and study a half-designed page. */
export const COMPOSITOR_SCROLL = {
  /* Trigger geometry, passed straight to ScrollTrigger. */
  start: 'top 78%',
  end: 'bottom 55%',
  /* Scrub lag in seconds. Low enough to feel connected to the wheel,
     high enough that the weight blend does not strobe on a trackpad
     flick. */
  scrub: 0.7,
} as const;

/* The five decisions, as fractions of the scroll window.

   Each is [start, end] in 0..1 progress. They OVERLAP on purpose: real
   composition is not a queue of discrete steps, and a strict sequence
   reads as a slideshow. The one hard rule is that RESTRAINT begins only
   after ACCENT has fully landed - the strip is the punchline and it must
   not remove annotations the visitor has not finished reading. */
export const COMPOSITOR_BEATS = {
  grid: [0.0, 0.22],
  scale: [0.12, 0.52],
  weight: [0.3, 0.68],
  accent: [0.6, 0.78],
  restraint: [0.8, 1.0],
} as const;

/* The raw state - what the text looks like before any judgement is
   applied. It must read as a WORKING DOCUMENT, not a broken page. That
   distinction is the whole risk of this concept: unstyled looks like
   failure, but a spec sheet looks deliberate. Uppercase, wide tracking,
   one flat size, hairline rules. */
export const COMPOSITOR_RAW = {
  /* px. Flat size for every line, including what becomes the display
     statement. Small enough that the scale jump later is dramatic. */
  size: 13,
  /* Tracking in em. Wide tracking is what makes small mono read as a
     specification rather than as body copy. */
  tracking: 0.24,
  /* Unitless. Loose leading in the raw state, so the collapse to 0.92
     later is felt as compression. */
  leading: 2.1,
  /* Opacity of the raw ARK_ES layer once the composed type has taken
     over. Not zero: a ghost of the specification stays under the
     finished sentence until the strip clears it. */
  ghost: 0.16,
} as const;

/* The composed state - the finished editorial setting. */
export const COMPOSITOR_TYPE = {
  /* The display statement, as a fluid clamp in px. min/preferred-vw/max.
     The preferred term is what makes it track the viewport; the max stops
     it committing suicide on an ultrawide. */
  sizeMin: 34,
  sizeVw: 5.4,
  sizeMax: 92,
  /* Unitless leading for the display statement. 0.92 locked the two
     lines into a single block, which at 118px read as congestion rather
     than as tight setting - the descenders of line 1 were arriving in
     the caps of line 2. Just over 1 keeps them related without touching. */
  leading: 1.02,
  /* Tracking in em. Negative - display sizes need the air taken out. */
  tracking: -0.018,
  /* The fake weight axis. These are ARK_ES cuts now, not Cabinet
     Grotesk's Thin and Black: the statement is set in a pairing
     (ARK_ES Dense / Monare - see compositorContent.ts) and neither
     family ships a 100 or a 900. ARK_ES has 300-700, so the ramp
     narrowed. Monare ships ONE weight, so line 2 does not ramp at all
     and carries its transformation through size, tracking and the fill.

     These two numbers are what the readout PRINTS, so they must stay
     equal to the --w-light / --w-heavy pair on .comp-line--spec in
     compositor.css. A readout advertising 100 -> 900 over type that
     cannot do it is the one failure this section cannot afford. */
  weightLight: 300,
  weightHeavy: 700,
  /* How much of the heavy cut is showing at rest, before the weight beat
     runs. Not 0 - at pure 100 the Thin cut nearly disappears against the
     background at large sizes. */
  weightFloor: 0.05,
} as const;

/* The annotation layer: baseline grid, column rules, dimension lines,
   ticking measurements. This is the part that makes the section legible
   as an act of typesetting instead of a text animation. */
export const COMPOSITOR_ANNOTATION = {
  /* Baseline grid. Rows are drawn across the whole stage at this
     spacing, in px, and they are the same 8px rhythm the composed type
     is snapped to - the annotation is TRUE, not decorative. */
  baseline: 8,
  /* Draw one baseline in this many, so the grid reads as a grid instead
     of a grey wash. */
  baselineEvery: 3,
  /* Vertical column rules across the measure. */
  columns: 6,
  /* Seconds. Per-element draw duration for rules and dimension lines. */
  drawDuration: 0.5,
  /* Seconds. Stagger between rules, so the grid sweeps in rather than
     appearing. */
  drawStagger: 0.035,
  /* Seconds. The strip at the end. Fast and single-beat: this is the
     moment the scaffolding is pulled and it should feel like a decision,
     not a fade-out. */
  stripDuration: 0.34,
  stripStagger: 0.02,
  /* Opacity of the grid at full draw. Deliberately low - it is
     information, not furniture. */
  gridOpacity: 0.3,
  ruleOpacity: 0.55,
} as const;

/* Parallax. Three planes moving at different rates against the scroll,
   which is what gives a flat DOM section depth without a camera.

   Values are px of travel across the whole window. Signed: the
   annotation layer rises while the margin notes fall, so the planes
   separate rather than sliding together. */
export const COMPOSITOR_PARALLAX = {
  annotation: -70,
  notes: 46,
  statement: -18,
  readout: 26,
  /* Pointer parallax, in px at full deflection. Small. The cursor should
     feel like it is leaning the sheet, not dragging it. */
  pointerAnnotation: 14,
  pointerStatement: 5,
  /* Exponential smoothing factor per frame for the pointer, 0..1. Lower
     is heavier. */
  pointerEase: 0.075,
} as const;

/* The single accent, used exactly once in the section. Same ember as the
   hero, the rake, and the card cue - this is the 60/30/10 discipline the
   annotation layer is claiming out loud, so breaking it here would be
   visible hypocrisy. */
export const COMPOSITOR_EMBER = '#b56c4b';

/* Tabular measurements that tick during the SCALE beat. Each is a real
   number this section actually uses, pulled from the constants above at
   build time where possible so the annotation cannot drift away from the
   truth it is annotating. */
export const COMPOSITOR_READOUT = {
  /* Rounded for display only. */
  scaleFrom: COMPOSITOR_RAW.size,
  scaleTo: COMPOSITOR_TYPE.sizeMax,
  leadingFrom: COMPOSITOR_RAW.leading,
  leadingTo: COMPOSITOR_TYPE.leading,
  weightFrom: COMPOSITOR_TYPE.weightLight,
  weightTo: COMPOSITOR_TYPE.weightHeavy,
} as const;

/* ==================================================================
   INK FILL

   The statement fills with a photographic plate at the accent beat.

   `source` is the ONLY place the file path is written. It is loaded
   through an Image() preload in useCompositor.ts before anything is
   allowed to reveal the filled layer - see the guard there and the
   reason it exists.

   The plate wants: ONE broad horizontal wash of warm light, no subject,
   no text, and nothing pure black anywhere - the darkest region must
   stay a readable warm grey, because every region of this image ends up
   being the inside of a letter.

   The first plate was briefed the opposite way - a narrow diagonal beam
   with deep black falloff - and the words that landed in its dark half
   painted near-black glyphs on a near-black page and vanished. Half a
   sentence, gone. Contrast that reads as drama in a photograph reads as
   missing text once it is clipped to type.

   Feature scale is the other rule: the glyph windows here are roughly
   60-90px wide, so any texture finer than that gets sampled into
   speckle. The smallest tonal feature must be LARGER than one letter.
   ================================================================== */
export const COMPOSITOR_INK = {
  /* Primary is the public Drive-hosted plate. Unlike the work helix -
     which uploads its images as WebGL textures and therefore needs them
     CORS-readable - this plate is only ever a CSS background-image plus
     an Image() preload. Neither requires CORS, which is why a Drive URL
     is safe HERE and was not safe there.

     `fallback` is the self-hosted copy under /public. If Drive throttles
     the hotlink (the 429s from earlier) the preload retries locally, so a
     rate-limited third party can never cost us the fill. */
  source: 'https://lh3.googleusercontent.com/d/18CHo4_LcM3nUPxrRWbXX6vH_sBc2MIwK',
  fallback: '/plate/ink-fill.jpg',

  /* Vertical travel of the fill across the whole scroll window, in px.
     Applied to background-position, not to a transform, so it costs
     nothing and cannot move the glyphs. */
  drift: 90,

  /* Full-bleed copy of the plate behind everything. Now 0: its radial
     mask had a visible edge and read as a grey rectangle sitting behind
     the type. The control that the stylesheet actually reads is
     --comp-veil-max in compositor.css, set to 0 to match. */
  veilOpacity: 0,
} as const;

/* Where the fill happens. Overlaps the accent beat and finishes with
   restraint, so the light entering the type is the closing move. */
export const COMPOSITOR_INK_BEAT: readonly [number, number] = [0.58, 0.94];
