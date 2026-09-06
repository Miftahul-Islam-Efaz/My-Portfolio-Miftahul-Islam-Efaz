/**
 * THE READ LAYER.
 *
 * Server-only fetchers, one per section, each returning the SAME shape the
 * components already consume. That is the whole design goal: the work section
 * still receives WorkProjectCardData[], so DitherCarousel, CaseStudyBody and
 * the GL layer are untouched by the arrival of a database.
 *
 * EVERY FETCHER FALLS BACK TO THE HARDCODED CONTENT. If the env vars are
 * missing, or the network is down, or a query errors, the site renders exactly
 * as it does today instead of showing an empty helix. A portfolio that
 * degrades to its last-known-good content is worth more than one that proves a
 * point about data purity. The fallback also means the build never depends on
 * Supabase being reachable.
 */
import { publicClient } from "@/lib/supabase/clients";
import type {
  VaultCategoryRow,
  CaseStudyRow,
  CaseStudyFeedbackRow,
  CaseStudyPrincipleRow,
  CaseStudyScreenRow,
  HeroVideoRow,
  SiteImageRow,
  SiteIdentityRow,
  VaultToolRow,
  VaultVisualRow,
  WorkProjectRow,
} from "./types";
import type {
  CaseStudyFeedback,
  CaseStudyPrinciple,
  CaseStudyScreen,
  WorkCaseStudy,
  WorkProjectCardData,
} from "@/components/work/types";
import { WORK_PROJECTS } from "@/components/work/workProjectsData";
import { WORK_CASE_STUDIES } from "@/components/work/caseStudyData";
import { HERO_VIDEO } from "@/config/media";
import { VAULT_HERO_IMAGE } from "@/components/vault/vaultPageContent";

/** What <Hero /> needs to paint its background. */
export type HeroVideoSettings = {
  videoUrl: string;
  posterUrl: string;
  videoOpacity: number;
  multiplyOverlayOpacity: number;
  gradientFrom: number;
  gradientTo: number;
  muted: boolean;
  loop: boolean;
};

/** One AI visual in the vault gallery. `prompt` is the copyable payload. */
export type VaultVisual = {
  id: string;
  title: string;
  caption: string;
  prompt: string;
  thumbUrl: string;
  originalUrl: string;
  /** Drives the element the gallery renders. */
  mediaType: "image" | "video";
  /** Poster for a video; falls back to the thumb so there is always a still. */
  posterUrl: string;
  /** Category id, or null. Null means it only appears under "All". */
  category: string | null;
};

/** A filter chip above the vault gallery. */
export type VaultCategory = {
  id: string;
  label: string;
};

/** One hosted tool in the vault. `toolUrl` is where the card links; the rest
 *  is what the detail window prints. */
export type VaultTool = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  toolUrl: string | null;
  tagline: string;
  description: string;
  features: string[];
  tech: string[];
  repoUrl: string | null;
  /* The two things the detail window actually prints. */
  note: string;
  category: string;
};

const HERO_FALLBACK: HeroVideoSettings = {
  videoUrl: HERO_VIDEO.sources[0].src,
  posterUrl: HERO_VIDEO.poster,
  videoOpacity: 1,
  multiplyOverlayOpacity: 0,
  gradientFrom: 0,
  gradientTo: 0,
  muted: true,
  loop: true,
};

// ---------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------
export async function getHeroVideoSettings(): Promise<HeroVideoSettings> {
  const db = publicClient();
  if (!db) return HERO_FALLBACK;
  const { data, error } = await db
    .from("hero_video_settings")
    .select("*")
    .eq("id", "hero_section")
    .maybeSingle<HeroVideoRow>();
  if (error || !data) return HERO_FALLBACK;
  return {
    videoUrl: data.video_url || HERO_FALLBACK.videoUrl,
    posterUrl: data.poster_url || HERO_FALLBACK.posterUrl,
    videoOpacity: data.video_opacity,
    multiplyOverlayOpacity: data.multiply_overlay_opacity,
    gradientFrom: data.gradient_overlay_opacity_from,
    gradientTo: data.gradient_overlay_opacity_to,
    muted: data.muted,
    loop: data.loop_video,
  };
}

// ---------------------------------------------------------------------------
// WORK
// ---------------------------------------------------------------------------
function toCard(r: WorkProjectRow): WorkProjectCardData {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    year: r.year,
    badge: r.badge, siteType: r.site_type ?? undefined,
    imageUrl: r.image_url,
    hoverImageUrl: r.hover_image_url ?? undefined,
    linkUrl: r.link_url,
    coords: r.coords,
    accentColor: r.accent_color ?? undefined,
    tech: r.tech ?? [],
    description: r.description ?? undefined,
  };
}

export async function getWorkProjects(): Promise<WorkProjectCardData[]> {
  const db = publicClient();
  if (!db) return [...WORK_PROJECTS];
  const { data, error } = await db
    .from("work_projects")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false }).order("sort_order", { ascending: true }).order("id", { ascending: true });
  if (error || !data || data.length === 0) return [...WORK_PROJECTS];
  return (data as WorkProjectRow[]).map(toCard);
}

/* ---------------------------------------------------------------------------
   THE JSONB COLUMNS.

   Three of the case study columns are jsonb rather than text[], because a
   screen and a principle are objects and parallel arrays let a caption drift
   onto the wrong picture. supabase-js hands these back already parsed, so the
   only work left is defending against a hand-edited row: anything that is not
   the shape we expect is dropped rather than rendered as "undefined".

   EACH OF THESE RETURNS undefined RATHER THAN [] WHEN EMPTY. That is load
   bearing - CaseStudyBody tests these fields for absence to decide whether to
   fall back (screens to the cover image, buildNotes to highlights, problem to
   the first narrative paragraph). An empty array is present, and would defeat
   every one of those fallbacks and print an empty section instead.
   --------------------------------------------------------------------------- */

function toScreens(value: unknown): CaseStudyScreen[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const screens = (value as CaseStudyScreenRow[]).reduce<CaseStudyScreen[]>(
    (out, raw) => {
      if (!raw || typeof raw !== "object") return out;
      const label = String(raw.label ?? "").trim();
      if (!label) return out;

      /* A video needs an id to be playable. Without one it is treated as an
         image, which falls back to the cover shot tagged DEMO - the same
         graceful path an image screen with no src already takes. */
      const isVideo = raw.mediaType === "video" && Boolean(raw.youtubeId);

      out.push({
        label,
        caption: String(raw.caption ?? "").trim(),
        mediaType: isVideo ? "video" : "image",
        src: raw.src || undefined,
        youtubeId: isVideo ? raw.youtubeId : undefined,
        posterUrl: raw.posterUrl || undefined,
        layout: raw.layout === "centered" || raw.layout === "full" || raw.layout === "auto" ? raw.layout : undefined,
        orientation: raw.orientation === "portrait" ? "portrait" : undefined,
      });
      return out;
    },
    []
  );

  return screens.length ? screens : undefined;
}

function toPrinciples(value: unknown): CaseStudyPrinciple[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const principles = (value as CaseStudyPrincipleRow[]).reduce<CaseStudyPrinciple[]>(
    (out, raw) => {
      if (!raw || typeof raw !== "object") return out;
      const title = String(raw.title ?? "").trim();
      if (!title) return out;
      out.push({ title, body: String(raw.body ?? "").trim() });
      return out;
    },
    []
  );

  return principles.length ? principles : undefined;
}

function toFeedback(value: unknown): CaseStudyFeedback | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as CaseStudyFeedbackRow;
  const quote = String(raw.quote ?? "").trim();
  const attribution = String(raw.attribution ?? "").trim();
  /* Both halves or neither: an unattributed quote does not print. */
  return quote && attribution ? { quote, attribution } : undefined;
}

/** Empty text[] columns come back as [] from Postgres, which is "present" as
 *  far as the fallbacks are concerned. Collapse them to undefined. */
function toList(value: string[] | null): string[] | undefined {
  return value && value.length ? value : undefined;
}

function toCaseStudy(r: CaseStudyRow): WorkCaseStudy {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    category: r.category,
    year: r.year,
    liveUrl: r.live_url,
    repoUrl: r.repo_url ?? undefined,
    imageUrl: r.image_url,
    hook: r.hook,
    // The DB guarantees three elements via a check constraint, but the type
    // system cannot see a constraint, so the tuple is asserted once, here,
    // rather than everywhere it is read.
    narrative: [r.narrative[0], r.narrative[1], r.narrative[2]] as [string, string, string],
    highlights: r.highlights ?? [],
    metrics: r.metrics ?? undefined,
    stack: r.stack ?? [],
    palette: r.palette ?? [],
    typefaces: r.typefaces,
    tags: r.tags ?? [],
    location: r.location ?? undefined,
    credit: r.credit ?? undefined,
    license: r.license ?? undefined,
    note: r.note ?? undefined,
    industry: r.industry ?? undefined,
    scope: r.scope ?? undefined,
    director: r.director ?? undefined,
    timeline: r.timeline ?? undefined,
    logoImage: r.logo_image ?? undefined,
    systemImage: r.system_image ?? undefined,

    /* The eight-section template. */
    client: r.client ?? undefined,
    role: r.role ?? undefined,
    status: r.status ?? undefined,
    problem: toList(r.problem),
    principles: toPrinciples(r.principles),
    screens: toScreens(r.screens),
    buildNotes: toList(r.build_notes),
    paletteNames: toList(r.palette_names),
    pagesDelivered: toList(r.pages_delivered),
    outcome: toList(r.outcome),
    feedback: toFeedback(r.feedback),
    collaborators: toList(r.collaborators),
    nextProjectId: r.next_project_id ?? undefined,
  };
}

export async function getCaseStudies(): Promise<Record<string, WorkCaseStudy>> {
  const db = publicClient();
  if (!db) return { ...WORK_CASE_STUDIES };
  const { data, error } = await db.from("work_case_studies").select("*");
  if (error || !data || data.length === 0) return { ...WORK_CASE_STUDIES };
  const out: Record<string, WorkCaseStudy> = {};
  for (const row of data as CaseStudyRow[]) {
    if (!Array.isArray(row.narrative) || row.narrative.length !== 3) continue;
    out[row.id] = toCaseStudy(row);
  }
  return Object.keys(out).length ? out : { ...WORK_CASE_STUDIES };
}

// ---------------------------------------------------------------------------
// VAULT
// ---------------------------------------------------------------------------
export async function getVaultVisuals(): Promise<VaultVisual[]> {
  const db = publicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("vault_visuals")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false }).order("sort_order", { ascending: true }).order("id", { ascending: true });
  if (error || !data) return [];
  return (data as VaultVisualRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    caption: r.caption ?? "",
    prompt: r.prompt ?? "",
    thumbUrl: r.thumb_url,
    originalUrl: r.original_url || r.thumb_url,
    mediaType: r.media_type === "video" ? "video" : "image",
    posterUrl: r.poster_url || r.thumb_url,
    category: r.category ?? null,
  }));
}

/**
 * The category chips, in admin-defined order.
 *
 * Only categories that actually have at least one published visual are
 * returned. An empty filter chip is a dead end for the visitor - it looks like
 * a broken page rather than an empty set - so the taxonomy can be as long as
 * you like in the panel without littering the gallery.
 */
export async function getVaultCategories(): Promise<VaultCategory[]> {
  const db = publicClient();
  if (!db) return [];

  const [cats, visuals] = await Promise.all([
    db
      .from("vault_categories")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }).order("sort_order", { ascending: true }).order("id", { ascending: true }),
    db.from("vault_visuals").select("category").eq("published", true),
  ]);

  if (cats.error || !cats.data) return [];

  const used = new Set(
    (visuals.data ?? [])
      .map((r) => (r as { category: string | null }).category)
      .filter((v): v is string => Boolean(v))
  );

  return (cats.data as VaultCategoryRow[])
    .filter((c) => used.has(c.id))
    .map((c) => ({ id: c.id, label: c.label }));
}

export async function getVaultTools(): Promise<VaultTool[]> {
  const db = publicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("vault_tools")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false }).order("sort_order", { ascending: true }).order("id", { ascending: true });
  if (error || !data) return [];
  return (data as VaultToolRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    caption: r.caption ?? "",
    imageUrl: r.image_url,
    toolUrl: r.tool_url,
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    features: r.features ?? [],
    tech: r.tech ?? [],
    repoUrl: r.repo_url,
    note: r.note ?? "",
    category: r.category ?? "",
  }));
}

// ---------------------------------------------------------------------------
// SITE IMAGES (keyed singletons)
// ---------------------------------------------------------------------------
export async function getSiteImages(): Promise<Record<string, string>> {
  const db = publicClient();
  const fallback: Record<string, string> = { vault_hero: VAULT_HERO_IMAGE };
  if (!db) return fallback;
  const { data, error } = await db.from("site_images").select("*");
  if (error || !data) return fallback;
  const out: Record<string, string> = { ...fallback };
  for (const row of data as SiteImageRow[]) {
    if (row.image_url) out[row.id] = row.image_url;
  }
  return out;
}

/** One keyed image, with a caller-supplied fallback. */
export async function getSiteImage(id: string, fallback = ""): Promise<string> {
  const all = await getSiteImages();
  return all[id] || fallback;
}

// ---------------------------------------------------------------------------
// SITE IDENTITY (one row, id = "main")
// ---------------------------------------------------------------------------

/** What the root layout turns into <title>, the meta description, the OG card
 *  and the Person JSON-LD. */
export type SiteIdentity = {
  jobTitle: string;
  siteTitle: string;
  ogTitle: string;
  metaDescription: string;
  tagline: string;
  location: string;
  email: string;
  knowsAbout: string[]; instagram: string; x: string; linkedin: string; github: string; facebook: string; whatsapp: string; craftSummary: string;
};

/** Last-known-good, used when Supabase is unreachable OR a single box has been
 *  cleared in the panel. Same contract as every other fetcher in this file. */
export const SITE_IDENTITY_FALLBACK: SiteIdentity = {
  instagram: "https://www.instagram.com/miftahul_islam_efaz/", x: "https://x.com/Miftahul_Islam9", linkedin: "https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/", github: "https://github.com/Miftahul-Islam-Efaz", facebook: "https://www.facebook.com/miftahul.islam.efaz", whatsapp: "miftahulislamefaz", craftSummary: "A WebGL, GSAP and Lenis-driven interactive site with a 3D scrolling work gallery, held to a 60fps motion budget. Built with the Next.js App Router, TypeScript and Supabase, server-rendered, with a custom CMS behind every image and line of copy.",  jobTitle: "Full-Stack Product Builder",
  siteTitle:
    "Miftahul Islam Efaz - Full-Stack Product Builder | Website Design & Development",
  ogTitle: "Miftahul Islam Efaz - Full-Stack Product Builder",
  metaDescription:
    "I design and build award-level websites and custom web apps. Full-stack product builder based in Chattogram, Bangladesh, working with clients worldwide.",
  tagline: "Turning ideas into systems. Systems into legacy.",
  location: "Chattogram, Bangladesh",
  email: "hello@miftahulislamefaz.xyz",
  knowsAbout: [
    "Website Design",
    "Website Development",
    "Full-Stack Development",
    "Custom Web Applications",
  ],
};

export async function getSiteIdentity(): Promise<SiteIdentity> {
  const db = publicClient();
  if (!db) return SITE_IDENTITY_FALLBACK;

  const { data, error } = await db
    .from("site_identity")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error || !data) return SITE_IDENTITY_FALLBACK;

  const row = data as SiteIdentityRow;
  const fb = SITE_IDENTITY_FALLBACK;

  /* Field by field, not all or nothing: clearing one box in the panel must not
     empty the entire document head. */
  return {
    instagram: row.instagram_url?.trim() || fb.instagram, x: row.x_url?.trim() || fb.x, linkedin: row.linkedin_url?.trim() || fb.linkedin, github: row.github_url?.trim() || fb.github, facebook: row.facebook_url?.trim() || fb.facebook, whatsapp: (row.whatsapp_username ?? "").trim().replace(/^@+/, "") || fb.whatsapp, craftSummary: row.craft_summary?.trim() || fb.craftSummary,    jobTitle: row.job_title?.trim() || fb.jobTitle,
    siteTitle: row.site_title?.trim() || fb.siteTitle,
    ogTitle: row.og_title?.trim() || fb.ogTitle,
    metaDescription: row.meta_description?.trim() || fb.metaDescription,
    tagline: row.tagline?.trim() || fb.tagline,
    location: row.location?.trim() || fb.location,
    email: row.email?.trim() || fb.email,
    knowsAbout:
      row.knows_about && row.knows_about.length > 0
        ? row.knows_about
        : fb.knowsAbout,
  };
}
