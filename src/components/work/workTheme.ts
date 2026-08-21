/**
 * Single source of truth for the Work / Projects section palette.
 *
 * REPOINTED AT THE SITE PALETTE. This file used to hold a section-only palette
 * ("Option C - Bone & Ember": #EDE6D6 bone, #C7502A ember, #0C0B0A warm
 * carbon). It was close enough to the real one to look intentional, which is
 * exactly why it was a problem: the work section was running on a SECOND
 * palette, warm-shifted a few degrees off everything else on the site. Every
 * value below is now one of the six tokens declared on :root in globals.css.
 *
 *   --color-background  #050505   -> bgVoid
 *   --color-surface     #26282D   -> bgPanel
 *   --color-border      #38393F   -> borderHair
 *   --color-primary     #F5F1E8   -> accent / accentGlow / textHi
 *   --color-text        #D8D4C8   -> accentSoft / textMid
 *   --color-accent      #b56c4b   -> ember / emberSoft
 *
 * WHY LITERAL HEX AND NOT var(--color-*). These values are consumed by inline
 * styles AND by the WebGL layer (dither/gl/config.js), which needs concrete
 * colour strings it can parse into floats - it cannot resolve a CSS custom
 * property. So the hex is duplicated here on purpose. If the tokens in
 * globals.css change, change these too; nothing detects the drift for you.
 * That drift is what this rewrite was fixing.
 *
 * ACCENT DISCIPLINE. The palette has exactly ONE hue: terracotta #b56c4b.
 * Everything else is carbon and off-white, so that hue is the only thing on
 * screen capable of signalling. Spend it on single points - a status dot, one
 * mark - not on borders, underlines or fills. Note that the key is still named
 * `ember` rather than `accent` because `accent` was already taken by the bone
 * off-white; the names are historical, the values are canonical.
 */
export const WORK_THEME = {
  /* Surfaces */
  bgVoid: '#050505',
  bgPanel: '#26282D',
  borderHair: '#38393F',

  /* Primary accent - off-white */
  accent: '#F5F1E8',
  accentSoft: '#D8D4C8',
  accentGlow: '#F5F1E8',

  /* The one hue - terracotta. Use sparingly; see the note above. */
  ember: '#b56c4b',
  /* The palette declares a single accent, so there is no lighter tint to point
     this at. Deliberately identical rather than an invented hex - a made-up
     tint here is how the second palette started last time. */
  emberSoft: '#b56c4b',

  /* Type */
  textHi: '#F5F1E8',
  textMid: '#D8D4C8',
  /* Derived rather than a token: the palette has no third type value, and a
     lower step is needed for de-emphasised captions. --color-text at 46%, which
     composites to roughly #6C6A64 over bgVoid. Translucent, so it is only valid
     over a dark surface - do not use it as a fill. */
  textLow: 'rgba(216, 212, 200, 0.46)',
} as const;

export type WorkTheme = typeof WORK_THEME;

export default WORK_THEME;
