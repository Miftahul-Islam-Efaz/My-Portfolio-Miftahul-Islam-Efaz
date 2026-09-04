/**
 * DATABASE ROW SHAPES.
 *
 * These are snake_case and mirror the Postgres tables exactly. They are NOT
 * what the components consume: queries.ts maps them into the existing
 * camelCase app types (WorkProjectCardData, WorkCaseStudy, VaultGalleryItem)
 * so that not a single component had to learn what a database is. If a column
 * is renamed, this file and the mapper change; the components do not.
 */

export type HeroVideoRow = {
  id: string;
  video_url: string;
  poster_url: string | null;
  video_opacity: number;
  multiply_overlay_opacity: number;
  gradient_overlay_opacity_from: number;
  gradient_overlay_opacity_to: number;
  muted: boolean;
  loop_video: boolean;
};

export type WorkProjectRow = {
  id: string;
  title: string;
  category: string;
  year: string;
  badge: string;
  image_url: string;
  site_type: string | null; hover_image_url: string | null;
  link_url: string;
  coords: string;
  accent_color: string | null;
  tech: string[];
  description: string | null;
  sort_order: number;
  published: boolean;
};

/**
 * ONE SCREEN IN SECTION 5, as stored inside the `screens` jsonb array.
 *
 * jsonb rather than parallel `screen_labels[]` / `screen_captions[]` columns:
 * a caption belongs to one picture, and parallel arrays let the two drift the
 * first time somebody deletes an entry from the middle of one of them.
 *
 * The keys are camelCase because this is a JSON document, not a column set -
 * the snake_case convention in this file applies to Postgres columns, and
 * these never become columns.
 */
export type CaseStudyScreenRow = {
  label: string;
  caption: string;
  /** Missing means 'image'. The DB CHECK allows only these two. */
  mediaType?: "image" | "video";
  src?: string;
  /** Bare 11-character id. The DB CHECK requires this when mediaType is
   *  'video', and sanitizeRow demotes a video with no id to an image. */
  youtubeId?: string;
  posterUrl?: string;
  orientation?: "landscape" | "portrait";
};

/** One entry in the `principles` jsonb array. */
export type CaseStudyPrincipleRow = {
  title: string;
  body?: string;
};

/** The `feedback` jsonb object, or NULL. The DB CHECK requires both halves,
 *  because an unattributed quote should not print. */
export type CaseStudyFeedbackRow = {
  quote: string;
  attribution: string;
};

export type CaseStudyRow = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  live_url: string;
  repo_url: string | null;
  image_url: string;
  hook: string;
  narrative: string[];
  highlights: string[];
  metrics: string[] | null;
  stack: string[];
  palette: string[];
  typefaces: string;
  tags: string[];
  location: string | null;
  credit: string | null;
  license: string | null;
  note: string | null;
  industry: string | null;
  scope: string[] | null;
  director: string | null;
  timeline: string | null;
  logo_image: string | null;
  system_image: string | null;

  /* ---- THE EIGHT-SECTION TEMPLATE. ----
     Added after the window had drifted well past what the table could store:
     CaseStudyBody was printing a client, a role, a problem list, three
     principles, a screens row, build notes and a credits block that existed
     only as hardcoded TypeScript. Every one of these is nullable and has a
     documented fallback in CaseStudyBody, so a half-filled row renders. */

  client: string | null;
  role: string | null;
  status: string | null;
  problem: string[] | null;
  /** NOT NULL, defaults to '[]'. */
  principles: CaseStudyPrincipleRow[];
  /** NOT NULL, defaults to '[]'. */
  screens: CaseStudyScreenRow[];
  build_notes: string[] | null;
  /** Index-matched to `palette`; the DB refuses a longer one. */
  palette_names: string[] | null;
  pages_delivered: string[] | null;
  outcome: string[] | null;
  feedback: CaseStudyFeedbackRow | null;
  collaborators: string[] | null;
  /** FK to work_case_studies.id, ON DELETE SET NULL. Never this row's own id. */
  next_project_id: string | null;
};

export type VaultVisualRow = {
  id: string;
  title: string;
  caption: string;
  /** The generation prompt. Copied to the clipboard from the card on hover.
   *  This field is the whole reason the table exists. */
  prompt: string;
  thumb_url: string;
  original_url: string | null;
  /** "image" or "video". Decides whether the gallery renders <img> or <video>. */
  media_type: "image" | "video";
  /** Still frame for a video, so the grid is not a wall of black boxes. */
  poster_url: string | null;
  /** FK to vault_categories.id, nullable - an uncategorised visual still shows. */
  category: string | null;
  sort_order: number;
  published: boolean;
};

export type VaultCategoryRow = {
  id: string;
  label: string;
  sort_order: number;
  published: boolean;
};

export type VaultToolRow = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  tool_url: string | null;
  tagline: string | null;
  description: string | null;
  features: string[];
  tech: string[];
  repo_url: string | null;
  note: string | null;
  category: string | null;
  sort_order: number;
  published: boolean;
};

/**
 * A private working note. NOT public content: admin_notes has RLS enabled with
 * no select policy for anon, so the publishable key cannot read it at all.
 */
export type AdminNoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  sort_order: number;
  updated_at: string;
};

export type SiteImageRow = {
  id: string;
  label: string;
  image_url: string;
  alt_text: string | null;
  note: string | null;
};

/**
 * The tables the admin API is allowed to touch. A whitelist rather than a
 * passthrough: without it, the table name in a request body becomes an
 * arbitrary-table write primitive, which is a hole big enough to drive a truck
 * through even behind a password.
 */
export const EDITABLE_TABLES = [
  "hero_video_settings",
  "work_projects",
  "work_case_studies",
  "vault_visuals",
  "vault_tools",
  "vault_categories",
  "admin_notes",
  "site_images",
  "site_identity",
] as const;

export type EditableTable = (typeof EDITABLE_TABLES)[number];

export function isEditableTable(value: unknown): value is EditableTable {
  return (
    typeof value === "string" &&
    (EDITABLE_TABLES as readonly string[]).includes(value)
  );
}

/** Tables whose rows carry a sort_order the admin panel can reorder. */
export const SORTABLE_TABLES: readonly EditableTable[] = [
  "work_projects",
  "vault_visuals",
  "vault_tools",
  "vault_categories",
];

/**
 * A CONTACT SUBMISSION.
 *
 * Deliberately absent from EDITABLE_TABLES above. That whitelist exists so the
 * admin panel can write arbitrary columns on content tables, and there is no
 * version of this feature where the panel should be able to edit what a
 * visitor wrote about themselves. The inbox gets its own route with three
 * verbs instead: read, refile, delete.
 */
export const SUBMISSION_STATUSES = [
  "new",
  "read",
  "replied",
  "archived",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return (
    typeof value === "string" &&
    (SUBMISSION_STATUSES as readonly string[]).includes(value)
  );
}

export type ContactSubmissionRow = {
  id: string;
  created_at: string;
  /** "project" is the full brief; "sayHi" is the two-beat detour. */
  kind: "project" | "sayHi";
  status: SubmissionStatus;
  full_name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  /** From the say-hi form. */
  message: string | null;
  /** From the project brief. Kept apart from message so the origin of the
   *  text is never ambiguous. */
  description: string | null;
  services: string[];
  site_type: string | null;
  site_type_other: string | null;
  app_stack: string | null;
  budget: string | null;
  stack: string | null;
  locale_country: string | null;
  user_agent: string | null;
  referrer: string | null;
};

/** The single identity row (id = "main"). Drives <title>, the meta
 *  description, the OG card and the Person JSON-LD in app/layout.tsx. */
export type SiteIdentityRow = {
  id: string;
  job_title: string | null;
  site_title: string | null;
  og_title: string | null;
  meta_description: string | null;
  tagline: string | null;
  location: string | null;
  email: string | null;
  knows_about: string[] | null; instagram_url: string | null; x_url: string | null; linkedin_url: string | null; github_url: string | null; facebook_url: string | null; whatsapp_username: string | null; craft_summary: string | null;
};
