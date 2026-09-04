/**
 * EVERY TUNABLE FOR THE CARD OPEN CUE AND THE CASE STUDY WINDOW.
 *
 * Same arrangement as heroInk.ts / workIntroReveal.ts: no magic numbers in the
 * components, and the whole feel of the interaction can be retimed from one
 * file without reading a line of JSX.
 *
 * THE TIMINGS ARE TRACED FROM THE REFERENCE CLIP, not invented. That clip runs
 * at 30fps, so the durations below are frame counts turned into milliseconds:
 * the chip lands in about 7 frames, the window wipes open in about 21, and the
 * content ladder is fully in by about frame 40. Anything faster than the wipe
 * value and the window reads as a hard cut; anything slower and the pointer
 * gets there first.
 */

/* ------------------------------------------------------------------ */
/* THE OPEN CUE - the small square that appears next to the cursor    */
/* ------------------------------------------------------------------ */

export const CUE = {
  /** Square, in px. Minimal means small: this is a mark, not a button. */
  /** Corner radius of the square, px. Softened on request - the mark still
   *  reads as a square at 34px, which is the point. */
  radius: 9,
  size: 34,
  /** Offset from the pointer, in px. MUST clear the cursor's own hit area -
   *  the cue is pointer-events:none, but a cue drawn under the arrow reads as
   *  something you have to aim at, and the whole card is the target. */
  offsetX: 20,
  offsetY: 20,
  /** How closely the cue follows the pointer. 1 is glued, lower drags. The
   *  clip's cue lags very slightly, which is what makes it feel attached to
   *  the cursor rather than drawn at it. */
  followEase: 0.24,
  /** Appear / disappear, ms. Out is faster than in - a cue that fades slowly
   *  on the way out trails across cards during a sweep. */
  inDuration: 230,
  outDuration: 140,
  /** Scale it grows from. Not 0: the square should read as arriving, not
   *  inflating. */
  fromScale: 0.55,
  /** Degrees the plus turns while the cue lands, and again on press. 90 turns
   *  a plus into a plus, so the rotation is felt rather than seen - which is
   *  exactly what the clip does. */
  spin: 90,
  /** Press feedback before the window takes over, ms. */
  pressDuration: 110,
} as const;

/* ------------------------------------------------------------------ */
/* THE WINDOW                                                         */
/* ------------------------------------------------------------------ */

export const WINDOW_MOTION = {
  /** The panel wipe. clip-path inset from the bottom, so the window rises
   *  over the helix rather than fading on top of it. */
  openDuration: 700,
  closeDuration: 520,
  /** Quint out. Matches reveal-loader.css, which is the site's existing
   *  vocabulary for a full-screen surface arriving. */
  openEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
  closeEase: 'cubic-bezier(0.64, 0, 0.78, 0)',
  /** The cover image flying up from the cue's position into the window. In the
   *  clip the card lifts, straightens and settles - hence a rotation that
   *  resolves to zero rather than a plain scale. */
  plateDuration: 820,
  plateFromRotation: -4.5,
  plateFromScale: 0.42,
  /** The content ladder: each block rises this far, this long, this far apart
   *  after the wipe has cleared. */
  contentRise: 26,
  contentDuration: 620,
  contentStagger: 70,
  /** Delay before the ladder starts, as a fraction of the wipe. Content that
   *  begins with the wipe arrives inside a moving mask and smears. */
  contentDelayRatio: 0.45,
} as const;

/**
 * THE HERO'S HOVER CUE - "click to visit the live site".
 *
 * A follower rather than a static badge, for one reason: the hero image is the
 * biggest click target in the window and nothing about a photograph says it is
 * clickable. A label that tracks the pointer is the cheapest way to say so
 * without printing a button over the picture.
 *
 * WHY A LERP AND NOT plain `transform` ON EVERY MOVE. The pointer emits far
 * more events than there are frames, and a cue glued at 1:1 to a 120Hz
 * trackpad reads as jitter rather than as attachment. `follow` below is the
 * same easing figure as CUE.followEase, so the two cues in this interaction -
 * the card's open square and this one - drag by the same amount and feel like
 * one mechanism.
 *
 * The whole thing is suppressed on touch and under reduced motion; see the
 * markup notes in CaseStudyCover.
 */
export const COVER_CURSOR = {
  /** How closely the label follows the pointer. Lower drags further behind. */
  follow: 0.18,
  /** Offset from the pointer, px. Clears the arrow's own hit area. */
  offsetX: 18,
  offsetY: 18,
  /** Fade and scale in / out, ms. Out is faster - see CUE. */
  inDuration: 260,
  outDuration: 160,
  /** Scale it grows from, and the press dip. */
  fromScale: 0.72,
  pressScale: 0.94,
  /** The words. Kept here rather than in the JSX so the label can be
   *  retranslated without touching a component. */
  label: 'Visit',
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
 * It has to clear 2, not 1: the image is scaled from its CENTRE, so only half
 * of what the zoom adds ends up above the frame where the slide spends it.
 */
export const COVER_PARALLAX = {
  /** 1 - 0.61. How far behind the document the photograph falls. */
  lag: 0.39,
  /** Where the lag stops accumulating, in px. */
  maxShift: 60,
  headroom: 2.3,
  /** Multiplier on cover progress for the scrim's second floor. */
  darken: 1.7,
  /**
   * PHONES DO NOT GET THE PARALLAX. Viewport width in px at or below which the
   * shift is forced to zero.
   *
   * The effect is 60px of lag. On a 1440px screen that reads as depth; on a
   * 390px one it is 60px of travel behind a frame a third the width, which is
   * not depth, it is a nudge - and it is being paid for with the most
   * expensive thing on the page: a full-screen scaled photograph on its own
   * compositor layer, transformed on every scroll frame, on the weakest GPUs
   * that will ever load this site.
   *
   * There is a second, better reason. The zoom exists ONLY to cover what the
   * shift uncovers, and CaseStudyWindow derives it from this same number - so
   * zero shift means zoom 1.0, and a phone gets the photograph UNCROPPED
   * rather than 16% enlarged and cut top and bottom.
   *
   * Matches the 640px breakpoint in work-case-study.css.
   */
  disableBelow: 640,
} as const;

/* ------------------------------------------------------------------ */
/* SECTIONS                                                          */
/* ------------------------------------------------------------------ */

/**
 * THE EIGHT SECTIONS, AND THEY ARE THE TEMPLATE.
 *
 * This is the running order every project prints, in this order, with no
 * per-project variation: hero, facts, problem, direction, selected experience,
 * build notes (which carries the palette grid), delivery, credits. A record
 * with a field missing degrades to a documented fallback inside CaseStudyBody -
 * it never reorders the document and never drops a heading, because the whole
 * value of a template is that the eighth project reads like the first.
 *
 * ADDING A PROJECT therefore means adding a record to caseStudyData.ts and
 * nothing else. Adding a SECTION means adding a line here, a block in
 * CaseStudyBody, and - if it should be reachable from the header - a tab below.
 *
 * `index` is the printed section number. The hero has none: it is the cover,
 * not chapter zero.
 */
export const CASE_STUDY_SECTIONS = [
  { id: 'hero', index: '', label: 'Hero', tab: 'cover' },
  { id: 'facts', index: '01', label: 'Project facts', tab: 'story' },
  { id: 'problem', index: '02', label: 'The problem', tab: 'story' },
  { id: 'direction', index: '03', label: 'The direction', tab: 'story' },
  { id: 'experience', index: '04', label: 'Selected experience', tab: 'work' },
  { id: 'build', index: '05', label: 'Build notes', tab: 'work' },
  { id: 'outcome', index: '06', label: 'Delivery', tab: 'outcome' },
  { id: 'credits', index: '07', label: 'Credits', tab: 'outcome' },
] as const;

export type CaseStudySectionId = (typeof CASE_STUDY_SECTIONS)[number]['id'];

/**
 * THE HEADER PILL SHOWS FOUR STOPS, NOT EIGHT - and that is a hard constraint
 * rather than a preference.
 *
 * Eight tabs is roughly 560px of labels before the back button and the call to
 * action are counted, which does not fit a laptop, let alone the 375px phone
 * the bar was already fighting for room on (see the 640px block in
 * work-case-study.css). So the sections group: the document stays eight
 * headings long and the NAVIGATION over it stays four, which is the same
 * two-tab logic that let this nav move into the header in the first place.
 *
 * `target` is the section the tab scrolls to - the first one in its group.
 * Every section's `tab` above maps back here, so a section can be added to a
 * group without touching the pill at all.
 */
export const CASE_STUDY_TABS = [
  { id: 'cover', label: 'Cover', target: 'hero' },
  { id: 'story', label: 'Story', target: 'facts' },
  { id: 'work', label: 'Work', target: 'experience' },
  { id: 'outcome', label: 'Outcome', target: 'outcome' },
] as const;

export type CaseStudyTabId = (typeof CASE_STUDY_TABS)[number]['id'];

/** Section id -> tab id. Derived rather than written twice: the observer in
 *  CaseStudyWindow watches sections and has to name a tab. */
export const SECTION_TAB: Record<CaseStudySectionId, CaseStudyTabId> =
  CASE_STUDY_SECTIONS.reduce(
    (map, section) => {
      map[section.id] = section.tab;
      return map;
    },
    {} as Record<CaseStudySectionId, CaseStudyTabId>
  );

/** Fraction of the window that must be crossed before a section takes the
 *  nav. Mid-height, so the highlighted stop is the one being read. */
export const SECTION_ACTIVE_LINE = 0.5;

/** Pixels of scroll before the header pill frosts. Small: the blur should
 *  arrive as soon as anything passes beneath the bar, not halfway down the
 *  cover. Below this the bar is transparent glass over the image. */
export const HEADER_FROST_AT = 32;

/* ------------------------------------------------------------------ */
/* SURFACE                                                            */
/* ------------------------------------------------------------------ */

/**
 * THE ONE PLACE THE WINDOW IS LIGHT.
 *
 * The site is carbon (#050505) end to end. The window is not, on purpose: a
 * case study is the only place a visitor is asked to read three paragraphs,
 * and a light page is simply easier to read that long. The reference does the
 * same - dark cover, cream document.
 *
 * BUT NOT CREAM. The reference's paper is near-white, which next to this
 * site's black reads as a different website. `paper` below is the site's own
 * bone (#F5F1E8, --color-primary) walked down about 8% - light enough to flip
 * the polarity, dim enough to stay in the family.
 *
 * WHY NOT var(--color-*). Same reason as workTheme.ts: these are handed to the
 * window as inline custom properties, and a couple are composited with
 * color-mix against a known background. Literal hex, duplicated on purpose.
 */
export const CASE_STUDY_SURFACE = {
  /** The document. Dimmed bone - light, not white. */
  paper: '#E7E3D9',
  /** Cards and the frosted bar. A step up, so a tile lifts off the page. */
  paperRaised: '#EFEBE1',
  /** Behind the plates and screens, and the cover before the image loads. */
  plate: '#141311',

  /** Type on paper. Carbon, not black: pure black on warm bone buzzes. */
  ink: '#171614',
  inkMid: '#4B4842',
  inkLow: '#8C887E',

  /** Type on the cover image, which is dark. The site's own bone, undimmed. */
  onDark: '#F5F1E8',

  /** Hairlines and the dotted leaders in the spec list. */
  hair: 'rgba(23, 22, 20, 0.14)',
  dot: 'rgba(23, 22, 20, 0.34)',

  /** The one hue. Single points only - see the note in workTheme.ts. */
  ember: '#b56c4b',
} as const;

/* ------------------------------------------------------------------ */
/* THE CALLS TO ACTION                                                */
/* ------------------------------------------------------------------ */

/**
 * The pill on the right of the header.
 *
 * `href` is the Cal.com booking page. The window opens it in a new tab, so
 * the case study is never navigated away from. Emptied again it degrades to
 * an inert button rather than an anchor to nowhere - see CaseStudyWindow.
 */
export const CASE_STUDY_CTA = {
  label: 'Book an Intro Call',
  href: 'https://cal.com/hello-miftahul/intro-call',
} as const;

/**
 * THE FOOT'S CTA - the one the brief asks for by name.
 *
 * A mailto rather than a route, deliberately: the contact section lives on the
 * landing page behind a pinned WebGL helix and a full-screen overlay, and
 * closing this window to scroll there is three interactions to send one
 * message. The address is the same one the hero's "Get In Touch" uses
 * (heroData.ts), so there is one inbox, not two.
 */
export const CASE_STUDY_START_CTA = {
  label: 'Start a project',
  href: 'mailto:webigns@gmail.com?subject=Project%20enquiry',
} as const;

/* ------------------------------------------------------------------ */
/* FACT ROW DEFAULTS                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fallbacks for the fact-row cells that are the same on almost every project.
 *
 * A per-project value in caseStudyData.ts always wins. Timeline is two months
 * because that is what most of these took; the big ones carry their own.
 *
 * 'Built by' rather than 'Director': the reference is an agency crediting a
 * creative director over a team. One person designed and built these, and
 * 'Director' on a solo project is a job title borrowed to sound larger.
 */
export const CASE_STUDY_DEFAULTS = {
  builtByLabel: 'Built by',
  builtBy: 'Miftahul Islam Efaz',
  timeline: '2 months',
  /** Where no client exists. Says the true thing rather than inventing one. */
  client: 'Self-initiated',
  role: 'Design & build',
  status: 'Live',
  /** Printed above the palette grid when a swatch has no name of its own. */
  paletteNames: ['Base', 'Accent', 'Support', 'Surface', 'Detail'],
} as const;

/**
 * The case study window is a full takeover rather than a route, so its
 * address is a hash: #work/pencillink.
 *
 * A hash and not a real /work/<slug> path for the same reason the gallery
 * uses #work - a hash reloads harmlessly onto the landing page, while a path
 * would 404 until that route actually exists. The prefix deliberately nests
 * under the gallery's own #work so the two rooms read as one place.
 */
export const CASE_STUDY_HASH_PREFIX = '#work/';
