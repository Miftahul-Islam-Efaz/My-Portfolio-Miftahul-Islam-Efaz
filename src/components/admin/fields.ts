/**
 * THE PANEL IS SCHEMA-DRIVEN.
 *
 * Every tab, every input, every hint below is data. There is exactly one form
 * component and one list component in this panel; adding a column to a table
 * means adding a line here, not writing another form. Nine bespoke forms
 * would have drifted apart within a week.
 *
 * `type` maps to a control, not to a Postgres type - `list` is a textarea that
 * the server splits on newlines, and `media` is a URL box with an upload
 * button welded to it.
 */
import type { EditableTable } from "@/lib/cms/types";

export type FieldType =
  | "text"
  | "textarea"
  | "list"
  | "media"
  | "number"
  | "bool"
  | "select"
  /** A repeating group of objects, stored as jsonb. The visual editor draws
   *  the real repeater; the schema form falls back to raw JSON. */
  | "repeater";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  /** Static options for a select. */
  options?: { value: string; label: string }[];
  /** Fill the options from a live table instead of a fixed list. */
  optionsFrom?: "vault_categories";
  /** Upload destination folder inside the bucket. */
  folder?: string;
  /** Accept filter for the upload input. */
  accept?: string;
  /** Show this field on the collapsed card, not just in the open form. */
  summary?: boolean;
  /** Hidden behind a disclosure. For columns the visitor-facing component does
   *  not draw YET - keeping them out of the main form without losing the data
   *  path, which deleting the field outright would do. */
  advanced?: boolean;
};

export type TableSpec = {
  table: EditableTable;
  tab: string;
  singular: string;
  /** Generate the id on the client instead of asking for a slug. For notes,
   *  demanding a hand-written slug before you can jot a thought is friction
   *  with no payoff - nothing links to a note by name. */
  autoId?: boolean;
  /** Prefix for the generated id. */
  idPrefix?: string;
  /** Derive the slug from this field on first save instead of asking for one.
   *  A slug nobody links to by name is pure friction. */
  slugFrom?: string;
  /** Render media previews large - for slots that ARE the picture. */
  bigPreview?: boolean;
  /** A singleton has exactly one row: no add, no delete, no reordering. */
  singleton?: boolean;
  sortable?: boolean;
  /** Fixed-slot tables can be edited but rows cannot be added or removed. */
  fixedRows?: boolean;
  /** Edited by rendering the real component instead of a list of inputs.
   *  `fields` is then advisory: CaseStudyEditor owns the layout. */
  visual?: boolean; inspector?: "media";
  blurb: string;
  fields: Field[];
};

const ID_FIELD: Field = {
  key: "id",
  label: "Slug",
  type: "text",
  hint: "Lowercase, hyphens, no spaces. This is the permanent key - changing it creates a new entry.",
};

export const TABLES: TableSpec[] = [
  {
    table: "hero_video_settings",
    tab: "Hero",
    singular: "Hero background",
    singleton: true,
    blurb:
      "The video behind your name on the landing page. Paste a URL or upload the file - keep it under about 3 MB or the first paint will crawl on mobile.",
    fields: [
      { key: "video_url", label: "Video URL", type: "media", folder: "hero", accept: "video/mp4,video/webm", summary: true },
      { key: "poster_url", label: "Poster image", type: "media", folder: "hero", accept: "image/*", hint: "The still shown while the video loads. Without it the hero flashes black." },
      { key: "video_opacity", label: "Video opacity", type: "number", hint: "0 to 1." },
      { key: "multiply_overlay_opacity", label: "Multiply overlay", type: "number", hint: "0 to 1. Darkens the footage so the type stays readable." },
      { key: "gradient_overlay_opacity_from", label: "Gradient from", type: "number" },
      { key: "gradient_overlay_opacity_to", label: "Gradient to", type: "number" },
      { key: "muted", label: "Muted", type: "bool", hint: "Leave on. Browsers block autoplay for videos with sound." },
      { key: "loop_video", label: "Loop", type: "bool" },
    ],
  },
  {
    table: "work_projects",
    tab: "Work cards",
    singular: "Project card",
    sortable: true,
    blurb:
      "A card in the carousel is an image and a title - that is all it draws. The words live in the case study, so they are edited there. Order here is the order on the site; unpublish to hide one without deleting it.",
    fields: [
      { key: "image_url", label: "Card image", type: "media", folder: "work", accept: "image/*", summary: true },
      { key: "title", label: "Title", type: "text", summary: true, hint: "Printed under the card in the carousel." }, { key: "site_type", label: "Category", type: "text", summary: true, hint: "What kind of site this is - Portfolio Website, E-commerce Site, Booking Website. Printed over the cover image in the 3D gallery, in place of the title." },
      ID_FIELD,
      { key: "sort_order", label: "Position", type: "number", hint: "Lower numbers come first. If this position is already taken, everything from there down shifts one to make room - you will be told when that happens." },
      { key: "published", label: "Published", type: "bool", summary: true },
    ],
  },
  {
    table: "work_case_studies",
    tab: "Case studies",
    singular: "Case study",
    fixedRows: true,
    visual: true,
    blurb:
      "The long-form window behind each work card. The slug must match a project card exactly, which is why rows are edited here rather than created. Every one of the eight printed sections is editable below - facts, problem, direction, screens, build notes, delivery and credits.",
    fields: [
      ID_FIELD,
      { key: "title", label: "Title", type: "text", summary: true },
      { key: "subtitle", label: "Subtitle", type: "text" },
      { key: "category", label: "Category", type: "text", summary: true },
      { key: "year", label: "Year", type: "text" },
      { key: "live_url", label: "Live URL", type: "text" },
      { key: "repo_url", label: "Repo URL", type: "text" },
      { key: "image_url", label: "Hero image", type: "media", folder: "cases", accept: "image/*" },
      { key: "hook", label: "Hook", type: "textarea", hint: "ONE line stating the problem. Not a boast." },
      { key: "narrative", label: "Narrative", type: "list", hint: "EXACTLY 3 paragraphs, one per line: what was wrong, what you did, what it is now. The save will be refused otherwise." },
      { key: "highlights", label: "Highlights", type: "list", hint: "4 to 5 fragments. Sentence case, no full stops. Also the stand-in for Build notes when that is left empty." },
      { key: "metrics", label: "Metrics", type: "list", hint: "Real numbers only. Leave empty rather than inventing one." },
      { key: "stack", label: "Stack", type: "list" },
      { key: "palette", label: "Palette", type: "list", hint: "Max 3 hex values, in usage order." },
      { key: "palette_names", label: "Palette names", type: "list", hint: "One per swatch, matching the order above. Falls back to Base / Accent / Support." },
      { key: "typefaces", label: "Typefaces", type: "text" },
      { key: "tags", label: "Tags", type: "list" },

      /* ---- SECTION 2. PROJECT FACTS. ---- */
      { key: "client", label: "Client", type: "text", hint: "Who it was for. Leave empty for self-initiated work." },
      { key: "industry", label: "Industry", type: "text", hint: "Short trade description. Falls back to Category." },
      { key: "role", label: "Role", type: "text", hint: "What you actually did, e.g. Design & build." },
      { key: "scope", label: "Scope", type: "list", hint: "What was supplied, written for print. Falls back to Tags." },
      { key: "timeline", label: "Timeline", type: "text", hint: "How long it took, e.g. 3 months." },
      { key: "status", label: "Status", type: "text", hint: "Live, Concept, Live - in maintenance." },
      { key: "director", label: "Built by", type: "text", hint: "Name shown in the Built by credit." },
      { key: "location", label: "Location", type: "text" },

      /* ---- SECTIONS 3 to 5. ---- */
      { key: "problem", label: "The problem", type: "list", hint: "Two or three short lines: what was wrong, and to whom. Falls back to the first narrative paragraph." },
      { key: "principles", label: "The direction", type: "repeater", hint: "Three principles, each a title and one sentence of reasoning. A principle with no title is discarded." },
      { key: "screens", label: "Selected experience", type: "repeater", hint: "Four to six screens, one caption each on what that screen solves. Each can be an image or a YouTube clip." },

      /* ---- SECTIONS 6 to 8. ---- */
      { key: "build_notes", label: "Build notes", type: "list", hint: "Short factual bullets: stack, responsive work, integrations, performance, motion." },
      { key: "pages_delivered", label: "Delivered", type: "list", hint: "Pages or surfaces actually shipped." },
      { key: "outcome", label: "Outcome", type: "list", hint: "Factual result lines. Anything numeric here must be real - illustrative figures belong in Metrics with a Note." },
      { key: "feedback", label: "Feedback", type: "repeater", hint: "One real quote and its attribution, or nothing. Both halves are required - an unattributed quote is not printed." },
      { key: "collaborators", label: "Collaborators", type: "list", hint: "Anyone else involved, with their contribution." },
      { key: "next_project_id", label: "Next project", type: "text", hint: "The slug the foot of the window should offer next. Leave empty to follow the natural order." },

      { key: "credit", label: "Credit", type: "text" },
      { key: "license", label: "License", type: "text" },
      { key: "note", label: "Note", type: "textarea", hint: "The standing caveat, printed as a footnote where the numbers are." },
      { key: "logo_image", label: "Logo image", type: "media", folder: "cases", accept: "image/*" },
      { key: "system_image", label: "System image", type: "media", folder: "cases", accept: "image/*" },
    ],
  },
  {
    table: "vault_visuals", inspector: "media",
    tab: "Vault visuals",
    singular: "Visual",
    sortable: true,
    slugFrom: "title",
    idPrefix: "new",
    bigPreview: true,
    blurb:
      "The gallery tiles. A tile draws three things and only three: the file, the title and the caption. The prompt is not drawn - it is copied to the visitor clipboard when they hover, so an empty prompt copies nothing.",
    fields: [
      { key: "media_type", label: "Type", type: "select", options: [{ value: "image", label: "Image" }, { value: "video", label: "Video" }], summary: true, hint: "Decides what the tile does with the file below: Image draws a still, Video draws a muted loop that plays on hover." },
      { key: "thumb_url", label: "File", type: "media", folder: "vault", accept: "image/*,video/mp4,video/webm", summary: true, hint: "One file, one URL. An mp4 or webm needs Type set to Video." },
      { key: "title", label: "Title", type: "text", summary: true, hint: "Caption line one." },
      { key: "caption", label: "Caption", type: "text", hint: "Caption line two. Leave empty to print nothing." },
      { key: "prompt", label: "Prompt", type: "textarea", hint: "Never shown. This is what hover-to-copy hands the visitor." },
      { key: "category", label: "Category", type: "select", optionsFrom: "vault_categories", summary: true, hint: "Drives the filter chips. Manage the list in the Categories tab." },
      { key: "sort_order", label: "Position", type: "number", hint: "Lower numbers come first. If this position is already taken, everything from there down shifts one to make room - you will be told when that happens." },
      { key: "published", label: "Published", type: "bool", summary: true },
    ],
  },
  {
    table: "vault_categories",
    tab: "Categories",
    singular: "Category",
    sortable: true,
    blurb:
      "The filter chips above the gallery. A category with no published visuals is hidden automatically, so an empty chip never dead-ends a visitor. Deleting one un-files its visuals; it never deletes the images.",
    fields: [
      ID_FIELD,
      { key: "label", label: "Label", type: "text", summary: true, hint: "What the visitor reads on the chip." },
      { key: "sort_order", label: "Position", type: "number", hint: "Lower numbers come first. If this position is already taken, everything from there down shifts one to make room - you will be told when that happens." },
      { key: "published", label: "Published", type: "bool", summary: true },
    ],
  },
  {
    table: "vault_tools", inspector: "media",
    tab: "Vault tools",
    singular: "Tool",
    sortable: true,
    slugFrom: "title",
    idPrefix: "new",
    bigPreview: true,
    blurb:
      "Your hosted projects, shown as tiles beside the visuals. The tile draws the image, the title and the caption. Clicking it opens a detail window, which prints the image, the title, the category and the note - nothing else. Everything below the disclosure is unused for now.",
    fields: [
      { key: "image_url", label: "Tool image", type: "media", folder: "tools", accept: "image/*", summary: true },
      { key: "title", label: "Title", type: "text", summary: true, hint: "Caption line one." },
      { key: "caption", label: "Caption", type: "text", hint: "Caption line two." },
      { key: "category", label: "Category", type: "text", summary: true, hint: "One or two words. Printed in the detail window." },
      { key: "note", label: "Note", type: "textarea", hint: "The only prose the detail window draws. What the tool is and why it exists." },
      { key: "tool_url", label: "Live URL", type: "text", summary: true, hint: "Where the visitor lands when they open the tool." },
      { key: "sort_order", label: "Position", type: "number", hint: "Lower numbers come first. If this position is already taken, everything from there down shifts one to make room - you will be told when that happens." },
      { key: "published", label: "Published", type: "bool", summary: true },
      { key: "tagline", label: "Tagline", type: "text", advanced: true },
      { key: "description", label: "Description", type: "textarea", advanced: true, hint: "What it does and who it is for." },
      { key: "features", label: "Features", type: "list", advanced: true, hint: "One per line." },
      { key: "tech", label: "Tech", type: "list", advanced: true },
      { key: "repo_url", label: "Repo URL", type: "text", advanced: true },
    ],
  },
  {
    table: "admin_notes",
    tab: "Notes",
    singular: "Note",
    sortable: true,
    autoId: true,
    idPrefix: "note",
    blurb:
      "Your private scratchpad - ideas, prompts to try, things to fix. These are never shown on the site, and the public key cannot read them: the table denies anonymous access outright. Pin a note to keep it at the top.",
    fields: [
      { key: "title", label: "Title", type: "text", summary: true },
      { key: "body", label: "Note", type: "textarea", hint: "Plain text. Saves to Postgres, so it survives redeploys and follows you to any device." },
      { key: "pinned", label: "Pinned", type: "bool", summary: true },
      { key: "sort_order", label: "Position", type: "number", hint: "Lower numbers come first. If this position is already taken, everything from there down shifts one to make room - you will be told when that happens." },
    ],
  },
  {
    table: "site_images", inspector: "media",
    tab: "Site images",
    singular: "Image slot",
    fixedRows: true,
    bigPreview: true,
    blurb:
      "Fixed image slots - the vault hero, the two footer photographs, the hand and folder art. These are edited, never added or deleted, because a missing slot leaves a section with nothing to draw. The footer needs BOTH photos to be the same picture at the same size: one blurred, one sharp. The sharp one is revealed under the cursor, so a mismatch shows as the image jumping.",
    fields: [
      ID_FIELD,
      { key: "label", label: "Label", type: "text", summary: true },
      { key: "image_url", label: "Image", type: "media", folder: "site", accept: "image/*", summary: true },
      { key: "alt_text", label: "Alt text", type: "text", hint: "Described for screen readers. Not decorative filler." },
      { key: "note", label: "Note", type: "textarea", hint: "A reminder to yourself about where this appears." },
    ],
  },
  {
    table: "site_identity",
    tab: "Identity & SEO",
    singular: "Identity",
    singleton: true,
    blurb:
      "Who the site says you are - to Google, to ChatGPT, to Claude, and to anyone pasting your link into a chat. This is the ONLY place these words are written down. Everything below fills the browser tab, the Google result, the social card, the machine-readable Person graph in the page head, the hidden text summary AI crawlers read, and /llms.txt - all from these boxes, with no redeploy. Say the same thing in every box: a site that describes itself three different ways gets summarised wrongly. Read top to bottom it is: who you are, then how the site is built, then how to reach you, then what you do.",
    fields: [
      { key: "job_title", label: "Job title", type: "text", summary: true, hint: "One phrase, reused everywhere - the tab, the schema, the social card. Changing it here changes all of them." },
      { key: "site_title", label: "Browser tab title", type: "text", summary: true, hint: "The tab label, and the blue headline in a Google result. Name first, then what you do. Google cuts it off past roughly 60 characters." },
      { key: "og_title", label: "Social card title", type: "text", hint: "The bold line when your link is pasted into WhatsApp, X or LinkedIn. Keep it shorter than the tab title." },
      { key: "meta_description", label: "Description", type: "textarea", hint: "The grey paragraph under your search result, and the sentence an AI quotes when asked what you do. Aim for 150 to 160 characters and write it about yourself, not about the website." },
      { key: "tagline", label: "Tagline", type: "text", hint: "Your one-liner. Printed on the social card under the title." },
      { key: "craft_summary", label: "How this site is built", type: "textarea", hint: "The paragraph an AI quotes when asked what KIND of site this is - the WebGL canvas, the 3D scrolling gallery, the motion, the stack. Your visual work is drawn in a canvas, which a crawler cannot see, so this is the only place the craft is stated in words. Write verifiable fact and name real technology. Do NOT claim awards you have not won - one unbacked claim makes an assistant distrust the whole page." },
      { key: "location", label: "Location", type: "text", hint: "City, Country. Split into a machine-readable address, which is what location-based searches match on - so keep the comma." },
      { key: "email", label: "Contact email", type: "text", hint: "Published in the structured data so crawlers and assistants can find it without reading the page." },
      { key: "whatsapp_username", label: "WhatsApp username", type: "text", hint: "Without the @ - it is added for you. Published as a contact identifier rather than a wa.me link, because wa.me needs a phone number and a username link would break for everyone who clicked it." },
      { key: "instagram_url", label: "Instagram", type: "text", hint: "Full profile URL. These five links are the sameAs list: the claim that all these accounts and this site are ONE person. Without them your GitHub, your LinkedIn and this site are three strangers who happen to share a name. Leave a box empty and it is simply left out." },
      { key: "x_url", label: "X (Twitter)", type: "text", hint: "Full profile URL." },
      { key: "linkedin_url", label: "LinkedIn", type: "text", hint: "Full profile URL." },
      { key: "github_url", label: "GitHub", type: "text", hint: "Full profile URL. Weighted heavily for a working developer." },
      { key: "facebook_url", label: "Facebook", type: "text", hint: "Full profile URL." },
      { key: "knows_about", label: "Skills", type: "list", hint: "One per line. This is the list an AI reads to answer what you are good at, so keep them real and specific. Twelve solid entries beat forty vague ones." },
    ],
  },
];

export function specFor(table: string): TableSpec | undefined {
  return TABLES.find((t) => t.table === table);
}

/** A blank row, so "Add" produces a form with the right keys already present. */
export function emptyRow(spec: TableSpec): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  // Auto-id tables get a key up front so the very first save is an insert with
  // a stable primary key, rather than an upsert against an empty string.
  if (spec.autoId || spec.slugFrom) {
    row.id = (spec.idPrefix ?? "row") + "-" + Date.now().toString(36);
  }
  for (const f of spec.fields) {
    if (f.type === "bool") row[f.key] = f.key === "published";
    else if (f.type === "number") row[f.key] = 0;
    else if (f.type === "select") row[f.key] = f.options?.[0]?.value ?? "";
    // A repeater is a jsonb array, and `feedback` is the one that is a single
    // object or NULL rather than a list.
    else if (f.type === "repeater") row[f.key] = f.key === "feedback" ? null : [];
    else row[f.key] = "";
  }
  return row;
}
/** Title -> slug. Kept deliberately blunt: anything that is not a letter or a
 *  digit becomes a hyphen. Slugs are a filing reference, not copy. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Anything the panel no longer asks for but Postgres still wants.
 *
 *  Two jobs. First, the slug: rows created in a slugFrom table carry a throwaway
 *  "new-xxxx" id until their first save, at which point it is derived from the
 *  title and de-duplicated against what is already there - a collision would
 *  silently upsert OVER a real row, which is the worst possible failure here.
 *  Second, media_type: the visuals tab asks for one file, so the image/video
 *  distinction is read off the extension instead of being a question. */
export function prepareRow(
  spec: TableSpec,
  row: Record<string, unknown>,
  takenIds: string[]
): Record<string, unknown> {
  const out = { ...row };

  if (spec.slugFrom && /^new-[0-9a-z]+$/.test(String(out.id ?? ""))) {
    const base = slugify(String(out[spec.slugFrom] ?? "")) || "untitled";
    let candidate = base;
    let n = 2;
    while (takenIds.includes(candidate)) candidate = base + "-" + n++;
    out.id = candidate;
  }

  if (spec.table === "vault_visuals") {
    const url = String(out.thumb_url ?? "");
    const chosen = String(out.media_type ?? "");
    // The panel asks outright now, so the answer is obeyed. Sniffing the
    // extension survives only as the fallback for rows saved before the
    // question existed, and for a URL that ends in no extension at all.
    out.media_type =
      chosen === "image" || chosen === "video"
        ? chosen
        : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
          ? "video"
          : "image";
    // The tile opens the full-size file when clicked; with one URL on offer,
    // that is the same file.
    out.original_url = url;
  }

  return out;
}