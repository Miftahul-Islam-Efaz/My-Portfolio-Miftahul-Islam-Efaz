/**
 * Shared data shapes for the work section.
 *
 * This interface used to live in WorkProjectCard.tsx, which meant the project
 * DATA imported from the project COMPONENT. That one type-only import was
 * enough to pull the card component - and the 365-line dissolve image it
 * renders, plus GSAP and ScrollTrigger - into the module graph, long after the
 * dither carousel replaced both. Types belong somewhere data and components can
 * each depend on without depending on each other.
 *
 * TWO SHAPES, ONE KEY. `WorkProjectCardData` is what the helix renders;
 * `WorkCaseStudy` is what the overlay window prints. They are joined by `id`
 * and nothing else, so a project can gain a case study, lose one, or have its
 * prose rewritten without the GL layer noticing.
 */

/** A single project on the helix. Card layer: see `workProjectsData.ts`. */
export interface WorkProjectCardData {
  id: string;
  title: string;
  category: string;
  year: string;
  badge: string; siteType?: string;
  imageUrl: string;
  /** Second image, if a real alternate shot ever exists. Currently unused -
   *  see the note at the top of workProjectsData.ts. */
  hoverImageUrl?: string;
  linkUrl: string;
  coords: string;
  accentColor?: string;
  tech?: string[];
  description?: string;
}

/**
 * ONE SCREEN IN THE SELECTED EXPERIENCE ROW.
 *
 * `caption` is the whole point of the block: a screenshot with no caption is
 * decoration, and the brief is one line per screen explaining what that screen
 * SOLVES. `label` is the short name of the screen itself (Hero, Booking,
 * Reviews), printed as the eyebrow above the caption.
 *
 * `src` is optional on purpose. Real screenshots arrive per project over time,
 * and until one does the figure falls back to the project's cover image and is
 * tagged DEMO - so the captions can be written and reviewed now, and the
 * pictures dropped in later without touching this file.
 *
 * A SCREEN CAN ALSO BE A VIDEO. Some things a build does - a transition, a
 * scroll sequence, a cursor behaviour - cannot be shown in a still, and a
 * caption saying "the menu animates" is a worse answer than showing it. When
 * `mediaType` is 'video' the figure renders CaseStudyVideo against `youtubeId`
 * instead of an image, and `src`/`orientation` are ignored.
 */
export interface CaseStudyScreen {
  /** Screenshot URL. Falls back to the project's `imageUrl`, tagged DEMO. */
  src?: string;
  /** Short name of the screen, e.g. 'Hero' or 'Reservation deck'. */
  label: string;
  /** One line: what problem this screen solves. Not what it contains. */
  caption: string;
  /** Portrait screens (phone captures) get a taller frame. */
  layout?: 'auto' | 'centered' | 'full';
  orientation?: 'landscape' | 'portrait';
  /** Defaults to 'image' everywhere it is missing, which is what keeps every
   *  existing screen rendering unchanged. */
  mediaType?: 'image' | 'video';
  /** The bare YouTube id, never a full watch URL - the admin panel and the
   *  save endpoint both reduce a pasted link to this before it is stored.
   *  Required when `mediaType` is 'video'; ignored otherwise. */
  youtubeId?: string;
  /** Optional custom still shown before playback. Falls back to YouTube's own
   *  thumbnail for that id. */
  posterUrl?: string;
}

/** One of the three principles behind the work. Title is the rule, body is
 *  the single sentence of reasoning under it. */
export interface CaseStudyPrinciple {
  title: string;
  body: string;
}

/** A real quote from a real person. Never invented - a project with no
 *  feedback simply omits this and the block does not render. */
export interface CaseStudyFeedback {
  quote: string;
  /** Who said it, and their relationship to the project. */
  attribution: string;
}

/**
 * The long-form record behind one card, printed inside the case study window.
 * Content layer: see `caseStudyData.ts`.
 *
 * `narrative` is deliberately an ordered triple rather than free prose: it is
 * what wrong / what was done / what it now is, in that order. It now feeds the
 * PROBLEM and OUTCOME sections rather than one undifferentiated overview.
 *
 * WHY SO MANY OPTIONAL FIELDS BELOW. The window prints eight sections and none
 * of them should force an edit to every project before it will render. Every
 * optional field has a documented fallback in CaseStudyBody - `industry` falls
 * back to `category`, `scope` to `tags`, `client` to a personal-project label,
 * `problem` to the first narrative paragraph, screens to the cover image.
 * Fill them in as the real material arrives; nothing breaks while they are
 * missing.
 */
export interface WorkCaseStudy {
  /** Must match a `WorkProjectCardData.id`. */
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  liveUrl: string;
  /** Omitted where no public repository exists. */
  repoUrl?: string;
  imageUrl: string;
  /** ONE LINE, AND IT IS THE HERO'S RIGHT-HAND COLUMN. The problem or the
   *  impact, stated before any solution. The project TITLE carries the left
   *  side now, so this is free to be a sentence rather than a name. */
  hook: string;
  /** [ the problem, the move, the outcome ] */
  narrative: [string, string, string];
  highlights: string[];
  metrics?: string[];
  stack: string[];
  /** Hex strings. Printed as the palette grid inside the build section. */
  palette: string[];
  /** Optional human names for the palette swatches, index-matched to
   *  `palette`. Falls back to Base / Accent / Support. */
  paletteNames?: string[];
  typefaces: string;
  tags: string[];
  location?: string;
  credit?: string;
  license?: string;
  /** Standing caveat - printed as a footnote, e.g. fictional concept metrics. */
  note?: string;

  /* ---- SECTION 2. PROJECT FACTS - the one compact row. ---- */

  /** Who it was for. Falls back to a personal-project label. */
  client?: string;
  /** Short trade description, e.g. 'Hospitality' or 'Web3 & AI'. Falls back
   *  to `category`, which is longer and carries a channel suffix. */
  industry?: string;
  /** What was actually done, e.g. 'Design & build'. Falls back to the
   *  default in CASE_STUDY_DEFAULTS. */
  role?: string;
  /** What was supplied, e.g. ['Brand Identity', 'Product Design'].
   *  Falls back to `tags`, which are lowercase slugs and read worse. */
  scope?: string[];
  /** How long it took, e.g. '3 months'. Falls back to the default of two. */
  timeline?: string;
  /** 'Live', 'Live · in maintenance', 'Concept'. Falls back to 'Live'. */
  status?: string;
  /** Who led the work. Falls back to CASE_STUDY_DEFAULTS.builtBy. */
  director?: string;

  /* ---- SECTION 3. THE PROBLEM. Two or three short lines. ---- */

  /** What was wrong before, and who it affected. Falls back to the first
   *  narrative paragraph. */
  problem?: string[];

  /* ---- SECTION 4. THE DIRECTION. Exactly three principles. ---- */

  principles?: CaseStudyPrinciple[];

  /* ---- SECTION 5. SELECTED EXPERIENCE. Four to six screens. ---- */

  screens?: CaseStudyScreen[];

  /* ---- SECTION 6. BUILD NOTES. Short factual bullets. ---- */

  /** Stack, responsive work, integrations, performance, animation. Falls back
   *  to `highlights`, which are adjacent but softer. */
  buildNotes?: string[];

  /* ---- SECTION 7. DELIVERY / OUTCOME. Never invent metrics. ---- */

  /** Pages or surfaces actually shipped. */
  pagesDelivered?: string[];
  /** Factual outcome lines. Anything numeric here must be real - illustrative
   *  numbers belong in `metrics` with a `note`. */
  outcome?: string[];
  /** A real quote from a real person, or omitted entirely. */
  feedback?: CaseStudyFeedback;

  /* ---- SECTION 8. CREDITS + NEXT. ---- */

  /** Anyone else involved, with their contribution. */
  collaborators?: string[];
  /** `id` of the case study the foot should offer next. Falls back to the next
   *  record in the data file, so the loop never dead-ends. */
  nextProjectId?: string;

  /* ---- THE TWO PLATES, kept for records that still use them. ---- */

  /** The finished lockup: mark plus wordmark on the project's brand field. */
  logoImage?: string;
  /** The same mark taken apart - construction grid, pattern tile or macro
   *  crop. */
  systemImage?: string;
}
