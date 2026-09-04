/**
 * COLUMN WHITELIST, PER TABLE.
 *
 * The save endpoint takes a table name and a row object from the browser. Both
 * are attacker-controlled in principle, so both are checked against a list
 * rather than trusted. Without this, a request could set `published` on a
 * table that has no such concept, or invent a column and get a 500 that leaks
 * the schema in the error text.
 *
 * `arrayCols` exists because the admin panel edits list fields as multi-line
 * textareas. One line becomes one array element. Doing that split on the
 * server means the panel never has to hand-assemble Postgres array literals,
 * and an empty textarea reliably becomes [] rather than [""] - which is the
 * bug that puts a single blank bullet in a case study.
 *
 * `jsonCols` is the same idea for the shapes that are not flat lists. A
 * screen is { label, caption, mediaType, ... } and a principle is
 * { title, body }, and the alternative - parallel `screen_labels` and
 * `screen_captions` arrays - lets a caption drift onto the wrong picture the
 * first time somebody deletes a row from the middle. These are jsonb in
 * Postgres and are normalised here, because the DB CHECK constraints on them
 * are deliberately strict and a 400 from Postgres reads like a crash.
 */
import type { EditableTable } from "@/lib/cms/types";

type TableSpec = {
  cols: readonly string[];
  arrayCols: readonly string[];
  numberCols: readonly string[];
  boolCols: readonly string[];
  /** Optional: only work_case_studies has jsonb columns today. */
  jsonCols?: readonly string[];
};

export const TABLE_SPECS: Record<EditableTable, TableSpec> = {
  hero_video_settings: {
    cols: [
      "id",
      "video_url",
      "poster_url",
      "video_opacity",
      "multiply_overlay_opacity",
      "gradient_overlay_opacity_from",
      "gradient_overlay_opacity_to",
      "muted",
      "loop_video",
    ],
    arrayCols: [],
    numberCols: [
      "video_opacity",
      "multiply_overlay_opacity",
      "gradient_overlay_opacity_from",
      "gradient_overlay_opacity_to",
    ],
    boolCols: ["muted", "loop_video"],
  },
  work_projects: {
    cols: [
      "id",
      "title",
      "category",
      "year",
      "badge",
      "image_url",
      "site_type", "hover_image_url",
      "link_url",
      "coords",
      "accent_color",
      "tech",
      "description",
      "sort_order",
      "published",
    ],
    arrayCols: ["tech"],
    numberCols: ["sort_order"],
    boolCols: ["published"],
  },
  work_case_studies: {
    cols: [
      "id",
      "title",
      "subtitle",
      "category",
      "year",
      "live_url",
      "repo_url",
      "image_url",
      "hook",
      "narrative",
      "highlights",
      "metrics",
      "stack",
      "palette",
      "typefaces",
      "tags",
      "location",
      "credit",
      "license",
      "note",
      "industry",
      "scope",
      "director",
      "timeline",
      "logo_image",
      "system_image",
      /* The eight-section template, added once the window had drifted well
         past what the table could store. Every one of these is optional and
         has a documented fallback in CaseStudyBody. */
      "client",
      "role",
      "status",
      "problem",
      "principles",
      "screens",
      "build_notes",
      "palette_names",
      "pages_delivered",
      "outcome",
      "feedback",
      "collaborators",
      "next_project_id",
    ],
    arrayCols: [
      "narrative",
      "highlights",
      "metrics",
      "stack",
      "palette",
      "tags",
      "scope",
      "problem",
      "build_notes",
      "palette_names",
      "pages_delivered",
      "outcome",
      "collaborators",
    ],
    numberCols: [],
    boolCols: [],
    jsonCols: ["principles", "screens", "feedback"],
  },
  vault_visuals: {
    cols: [
      "id",
      "title",
      "caption",
      "prompt",
      "thumb_url",
      "original_url",
      "media_type",
      "poster_url",
      "category",
      "sort_order",
      "published",
    ],
    arrayCols: [],
    numberCols: ["sort_order"],
    boolCols: ["published"],
  },
  vault_categories: {
    cols: ["id", "label", "sort_order", "published"],
    arrayCols: [],
    numberCols: ["sort_order"],
    boolCols: ["published"],
  },
  vault_tools: {
    cols: [
      "id",
      "title",
      "caption",
      "image_url",
      "tool_url",
      "tagline",
      "description",
      "features",
      "tech",
      "repo_url",
      "note",
      "category",
      "sort_order",
      "published",
    ],
    arrayCols: ["features", "tech"],
    numberCols: ["sort_order"],
    boolCols: ["published"],
  },
  admin_notes: {
    cols: ["id", "title", "body", "pinned", "sort_order"],
    arrayCols: [],
    numberCols: ["sort_order"],
    boolCols: ["pinned"],
  },
  site_images: {
    cols: ["id", "label", "image_url", "alt_text", "note"],
    arrayCols: [],
    numberCols: [],
    boolCols: [],
  },
  site_identity: {
    cols: [
      "id",
      "job_title",
      "site_title",
      "og_title",
      "meta_description",
      "tagline",
      "location",
      "email",
      "knows_about", "instagram_url", "x_url", "linkedin_url", "github_url", "facebook_url", "whatsapp_username", "craft_summary",
    ],
    arrayCols: ["knows_about"],
    numberCols: [],
    boolCols: [],
  },
};

/** Split a textarea value into a clean array. Blank lines are dropped, so a
 *  trailing newline never becomes an empty bullet. */
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * REDUCE ANYTHING YOUTUBE-SHAPED TO THE BARE ID.
 *
 * Nobody types an id. They paste whatever is in the address bar, and that is
 * one of five things: a watch URL, a youtu.be short link, an /embed/ URL, a
 * /shorts/ URL, or - if they copied from the wrong place - a URL with a
 * playlist and a timestamp welded onto it. Storing the id rather than the URL
 * is what lets the player build its own embed with `controls=0`, so this
 * normalisation has to happen before the write, not at render time.
 *
 * Returns "" when there is no id in there at all, which the caller treats as
 * "this is not a video".
 */
export function youtubeIdFrom(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // Already a bare id: 11 chars of the YouTube alphabet, nothing else.
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
    /\/live\/([A-Za-z0-9_-]{11})/, // /live/ID
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1];
  }

  return "";
}

/** One entry in the `screens` jsonb array, after normalisation. */
type ScreenRow = {
  label: string;
  caption: string;
  mediaType: "image" | "video";
  src?: string;
  youtubeId?: string;
  posterUrl?: string;
  orientation?: "landscape" | "portrait";
};

/**
 * Normalise the screens array so it always satisfies the DB CHECK.
 *
 * The constraint requires a non-empty label, and requires a youtubeId whenever
 * mediaType is 'video'. Rather than surface that as a Postgres error, a video
 * row whose id will not parse is DEMOTED to an image row - the caption and
 * label the editor wrote are kept, and the figure falls back to the cover
 * image tagged DEMO, exactly as an image screen with no src already does.
 * Losing the broken URL is better than losing the writing.
 */
function toScreens(value: unknown): ScreenRow[] {
  const list = Array.isArray(value) ? value : [];

  return list.reduce<ScreenRow[]>((out, entry) => {
    if (!entry || typeof entry !== "object") return out;
    const raw = entry as Record<string, unknown>;

    const label = String(raw.label ?? "").trim();
    // A screen with no label is an empty repeater row the editor left behind.
    if (!label) return out;

    const caption = String(raw.caption ?? "").trim();
    const youtubeId = youtubeIdFrom(raw.youtubeId ?? raw.youtube_id);
    const wantsVideo = String(raw.mediaType ?? raw.media_type ?? "image") === "video";

    const screen: ScreenRow = {
      label,
      caption,
      mediaType: wantsVideo && youtubeId ? "video" : "image",
    };

    if (screen.mediaType === "video") {
      screen.youtubeId = youtubeId;
      const poster = String(raw.posterUrl ?? raw.poster_url ?? "").trim();
      if (poster) screen.posterUrl = poster;
    } else {
      const src = String(raw.src ?? "").trim();
      if (src) screen.src = src;
      const orientation = String(raw.orientation ?? "").trim();
      if (orientation === "portrait") screen.orientation = "portrait";
    }

    out.push(screen);
    return out;
  }, []);
}

/** Principles are { title, body }. A row with no title is an empty repeater
 *  row, not a principle. */
function toPrinciples(value: unknown): Array<{ title: string; body: string }> {
  const list = Array.isArray(value) ? value : [];

  return list.reduce<Array<{ title: string; body: string }>>((out, entry) => {
    if (!entry || typeof entry !== "object") return out;
    const raw = entry as Record<string, unknown>;
    const title = String(raw.title ?? "").trim();
    if (!title) return out;
    out.push({ title, body: String(raw.body ?? "").trim() });
    return out;
  }, []);
}

/** Feedback is one { quote, attribution } or NULL. A half-filled quote is
 *  NULL: the DB rejects it, and an unattributed quote should not print. */
function toFeedback(value: unknown): { quote: string; attribution: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const quote = String(raw.quote ?? "").trim();
  const attribution = String(raw.attribution ?? "").trim();
  return quote && attribution ? { quote, attribution } : null;
}

/**
 * Parse a jsonb column and normalise it to something the CHECK will accept.
 * Accepts a real object/array from the panel, or a JSON string - the schema
 * driven form edits some of these as raw JSON in a textarea.
 */
function toJson(col: string, value: unknown): unknown {
  let parsed: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) parsed = null;
    else {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        /* Unparseable JSON is treated as empty rather than as a 400. The
           column is optional and the window falls back cleanly. */
        parsed = null;
      }
    }
  }

  if (col === "feedback") return toFeedback(parsed);
  if (col === "screens") return toScreens(parsed);
  if (col === "principles") return toPrinciples(parsed);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Reduce an arbitrary object to a safe, correctly typed row for one table.
 * Unknown keys are dropped silently rather than rejected: the panel sends the
 * whole form, and a field the DB does not have is a UI concern, not a request
 * error.
 */
export function sanitizeRow(
  table: EditableTable,
  input: Record<string, unknown>
): Record<string, unknown> {
  const spec = TABLE_SPECS[table];
  const out: Record<string, unknown> = {};

  for (const col of spec.cols) {
    if (!Object.prototype.hasOwnProperty.call(input, col)) continue;
    const raw = input[col];

    if (spec.jsonCols?.includes(col)) {
      out[col] = toJson(col, raw);
      continue;
    }

    if (spec.arrayCols.includes(col)) {
      const arr = toArray(raw);
      // Nullable array columns: an empty list is more honestly NULL, which is
      // what the optional-field fallbacks in CaseStudyBody already test for.
      const nullableArrays = [
        "metrics",
        "scope",
        "problem",
        "build_notes",
        "palette_names",
        "pages_delivered",
        "outcome",
        "collaborators",
      ];
      out[col] = arr.length === 0 && nullableArrays.includes(col) ? null : arr;
      continue;
    }

    if (spec.numberCols.includes(col)) {
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      out[col] = Number.isFinite(n) ? n : 0;
      continue;
    }

    if (spec.boolCols.includes(col)) {
      out[col] = raw === true || raw === "true" || raw === 1 || raw === "1";
      continue;
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      out[col] = trimmed === "" ? null : trimmed;
      continue;
    }

    out[col] = raw ?? null;
  }

  // body is NOT NULL in Postgres but is legitimately empty while you are still
  // typing a note, so an emptied textarea must become "" and not NULL.
  if (table === "admin_notes" && out.body === null) out.body = "";

  /* palette_names is index-matched to palette and the DB refuses a longer
     one. Trimming here means renaming three swatches down to two does not
     have to be done in a particular order to be accepted. */
  if (table === "work_case_studies") {
    const names = out.palette_names;
    const palette = out.palette;
    if (Array.isArray(names) && Array.isArray(palette) && names.length > palette.length) {
      out.palette_names = names.slice(0, palette.length);
    }
    /* A row may never point at itself as "next", which is a dead end in the
       foot of the window rather than a constraint the editor should meet. */
    if (out.next_project_id && out.next_project_id === out.id) {
      out.next_project_id = null;
    }
  }

  return out;
}

/** Columns that must never be null, per table, checked before the write so the
 *  panel gets a readable message instead of a Postgres constraint dump. */
export const REQUIRED: Record<EditableTable, readonly string[]> = {
  hero_video_settings: ["id", "video_url"],
  work_projects: ["id", "title", "category", "year", "badge", "image_url", "link_url", "coords"],
  work_case_studies: ["id", "title", "subtitle", "category", "year", "live_url", "image_url", "hook"],
  vault_visuals: ["id", "title", "thumb_url"],
  vault_categories: ["id", "label"],
  vault_tools: ["id", "title", "image_url"],
  admin_notes: ["id", "title"],
  site_images: ["id", "label", "image_url"],
  /* Only the key is mandatory. Every other field legitimately empties out, and
     a blank one falls back to the hardcoded string in queries.ts rather than
     blocking the save or shipping an empty <title>. */
  site_identity: ["id"],
};
