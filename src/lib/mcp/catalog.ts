import { EDITABLE_TABLES, NEWEST_FIRST_TABLES, type EditableTable } from "@/lib/cms/types";
import { REQUIRED, TABLE_SPECS, sanitizeRow } from "@/lib/admin/columns";

/* Object-shaped jsonb columns, reported separately by list_content_types because a model that treats screens as a string writes a JSON.parse failure, and toJson turns that into an empty column with no error. */ const JSON_SHAPES: Partial<Record<EditableTable, string>> = { work_case_studies: "screens: array of { label (required - missing labels are rejected), caption, mediaType: image or video, src (image only), youtubeId (required when mediaType is video; paste a full YouTube URL and it is reduced to the id for you), posterUrl, orientation: landscape or portrait, layout: auto (masonry column), centered (own row), or full (full-width row) }. Invalid video ids are rejected without changing the existing data. principles: array of { title (required), body }. feedback: one object { quote, attribution } or null - both halves are required, a half-filled quote is rejected." }; const LABELS: Record<EditableTable, string> = {
  site_identity:
    "Identity & SEO. The single source of the site title, meta description, social-card title, job title, location, contact email, skills list, social profile URLs, WhatsApp username and the craft_summary paragraph. Drives the <title>, the Google result, the social preview, the JSON-LD @graph (Person + WebSite + ProfilePage), the screen-reader summary section that AI crawlers read, and /llms.txt. IMPORTANT: the home page renders one client component behind an intro gate, so a crawler that does not run JavaScript sees NONE of the visual site - these columns are the only textual description of this person and this work that reaches it. craft_summary must stay verifiable technical fact and must never claim awards that have not been won. The five *_url columns form the sameAs identity list; whatsapp_username is stored WITHOUT a leading @ and is published as a ContactPoint identifier, not a wa.me link.",
  site_images: "Fixed image slots, including the social share thumbnail (og_image).",
  hero_video_settings: "The hero background video and its overlay opacities.",
  work_projects: "The project cards on the home page. Three fields are easy to confuse: site_type is the Category (for example Business Website, Resort Website) and prints as the card TITLE in the scrolling 3D gallery; category is the tagline printed under it; badge is a short label used as the fallback title when site_type is empty.",
  work_case_studies: "Long-form case studies. narrative must be exactly 3 paragraphs. screens is the image and video section of the window - consult json_shapes from list_content_types before writing it. principles and feedback are object-shaped too, not lists of strings.",
  vault_visuals: "Images and videos in the Vault.",
  vault_tools: "Tools listed in the Vault.",
  vault_categories: "Category labels used to filter the Vault.",
  admin_notes: "Private notes to self. Not shown on the public site.",
};

export function listContentTypes() {
  return EDITABLE_TABLES.map((table) => ({
    content_type: table,
    what_it_is: LABELS[table],
    columns: TABLE_SPECS[table].cols.filter(col => !(col === "sort_order" && NEWEST_FIRST_TABLES.includes(table))), read_only_columns: ['created_at','updated_at','_revision',...(NEWEST_FIRST_TABLES.includes(table)?['sort_order']:[])], supports_delete: !["site_identity","site_images","hero_video_settings"].includes(table),
    required: REQUIRED[table],
    list_columns: TABLE_SPECS[table].arrayCols,
    number_columns: TABLE_SPECS[table].numberCols.filter(col => !(col === 'sort_order' && NEWEST_FIRST_TABLES.includes(table))),
    checkbox_columns: TABLE_SPECS[table].boolCols, json_columns: TABLE_SPECS[table].jsonCols ?? [], json_shapes: JSON_SHAPES[table],
  }));
}

