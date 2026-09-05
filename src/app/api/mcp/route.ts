/**
 * MCP SERVER FOR THE CONTENT LAYER.
 *
 * POST /api/mcp - speaks JSON-RPC 2.0 (Model Context Protocol), so any MCP
 * client (Claude, Cursor, Notion AI, VS Code) can read and edit site content.
 *
 *
 * WHY THIS EXISTS RATHER THAN JUST HANDING OUT THE SUPABASE MCP SERVER.
 *
 * Supabase publishes its own MCP server, and it works. But connecting an AI to
 * it means giving that AI the SERVICE ROLE key, which bypasses RLS completely
 * and can read every table, drop tables, and read the contact inbox. "Let an
 * assistant fix a typo in my tagline" and "let an assistant run arbitrary SQL
 * against production" are very different permissions, and the second one is
 * not recoverable if the assistant is confused or the credentials leak.
 *
 * So this server is deliberately narrow. It shares the SAME whitelists the
 * admin panel uses - isEditableTable, TABLE_SPECS, sanitizeRow, REQUIRED -
 * which means an AI writing through here has exactly the powers the panel's
 * own save button has, and not one more:
 *
 *   - only the 9 editable content tables. contact_submissions is absent, so
 *     the people who message you cannot be read out over this channel.
 *   - only known columns. sanitizeRow drops anything invented.
 *   - required fields enforced before the write, so a half-filled row is
 *     refused with a sentence instead of a Postgres constraint dump.
 *   - no SQL. No DDL. No deletes. There is no tool here that can destroy
 *     content, only create and update it. Deleting stays a human action in
 *     the panel, because "delete the old ones" is exactly the instruction an
 *     AI is most likely to over-apply.
 *
 *
 * AUTH IS OPTIONAL, AND CURRENTLY OFF.
 *
 * Set MCP_USERNAME and MCP_PASSWORD to require HTTP Basic auth. Leave either
 * one unset and this endpoint is OPEN - no credentials needed. That is the
 * configured state today, by explicit request.
 *
 * It is written as a switch rather than deleted so protection can be restored
 * by adding two environment variables, with no code change and no redeploy of
 * anything but the env.
 *
 * WHAT "OPEN" MEANS IN PRACTICE, so the tradeoff is not a surprise later:
 *
 *   - On localhost this is harmless. Nothing outside your machine can reach it.
 *   - On a PUBLIC domain, anyone who finds this path can rewrite the text and
 *     images of the live site. Automated scanners do probe /api/* on public
 *     domains, so "nobody knows the URL" is not a defence.
 *   - The blast radius is still bounded by the whitelists below: no deletes,
 *     no SQL, no access to contact_submissions. The worst case is vandalised
 *     copy, not a destroyed database or a leaked inbox.
 *   - But there is no undo. An overwritten field is gone unless you have a
 *     database backup, because this project keeps no content version history.
 *
 * robots.txt already disallows /api/, which stops honest crawlers indexing it.
 * It stops nothing that is actually looking.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";

import { adminClient } from "@/lib/supabase/clients";
import { EDITABLE_TABLES, isEditableTable, type EditableTable } from "@/lib/cms/types";
import { REQUIRED, TABLE_SPECS, sanitizeRow } from "@/lib/admin/columns";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "portfolio-content";
const SERVER_VERSION = "1.3.0";

/** Hard ceiling on rows returned, so a confused client cannot ask for the
 *  whole database and blow up its own context window. */
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

/** Constant-time compare. A plain === leaks the secret one character at a time
 *  to anyone willing to measure the response. Length is compared first because
 *  timingSafeEqual throws on a length mismatch. */
function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(request: Request): boolean {
  const user = process.env.MCP_USERNAME;
  const pass = process.env.MCP_PASSWORD;

  /* NO CREDENTIALS CONFIGURED => OPEN.

     Note this is deliberately fail-OPEN, which is the opposite of the usual
     rule and the opposite of what this function did before. It is what was
     asked for, and it is safe on localhost. The consequence on a public
     domain is spelled out in the header comment: set both variables to close
     it again. */
  if (!user || !pass) return true;

  const header = request.headers.get("authorization") ?? "";
  const encoded = header.replace(/^Basic\s+/i, "").trim();
  if (!encoded || !/^Basic\s/i.test(header)) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }

  /* Split on the FIRST colon only. A password may legitimately contain colons,
     and splitting on all of them would silently reject those. */
  const sep = decoded.indexOf(":");
  if (sep === -1) return false;

  const gotUser = decoded.slice(0, sep);
  const gotPass = decoded.slice(sep + 1);

  /* Both are always compared, and the results combined afterwards, so the
     response time does not reveal whether the username alone was correct. */
  const okUser = safeEqual(gotUser, user);
  const okPass = safeEqual(gotPass, pass);

  return okUser && okPass;
}

// ---------------------------------------------------------------------------
// TOOL DEFINITIONS
// ---------------------------------------------------------------------------

/* Descriptions are written for a model, not for a developer. An AI picks a
   tool almost entirely off this text, so each one says what it is FOR and
   what it must not be used for. */
const TOOLS = [
  {
    name: "list_content_types",
    title: "List content types",
    description:
      "List every editable content type on the site (identity/SEO, work projects, case studies, vault visuals, vault tools, vault categories, site images, hero video, notes). Returns each type's editable columns and which of them are required. ALWAYS call this first - it is how you learn the exact column names, which must be used verbatim.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorld: false },
  },
  {
    name: "get_rows",
    title: "Read content rows",
    description:
      "Read the current rows of one content type. Call this before any edit: upsert_row overwrites the columns you send, so you need the existing values to avoid blanking fields you did not mean to touch.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: [...EDITABLE_TABLES],
          description: "Which content type to read.",
        },
        id: {
          type: "string",
          description: "Optional. Fetch a single row by its id.",
        },
        limit: {
          type: "number",
          description: `Optional. Max rows to return (1-${MAX_LIMIT}, default 50).`,
        },
      },
      required: ["content_type"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorld: false },
  },
  {
    name: "upsert_row",
    title: "Create or update a content row",
    description:
      "Create a new row or update an existing one. The row's 'id' decides which: an existing id updates that row, a new id creates one. Only the columns you include are written, so send the full set of values you want a field to end up with. List columns (for example knows_about, tech, narrative) accept an array of strings. Object-shaped columns (screens, principles, feedback) accept real JSON matching json_shapes from list_content_types; a string that is not valid JSON is stored as EMPTY without raising an error, so read the row back after writing one. This CANNOT delete anything - removing content is done by a human in the admin panel.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: [...EDITABLE_TABLES],
          description: "Which content type to write to.",
        },
        row: {
          type: "object",
          description:
            "The column values, keyed by exact column name from list_content_types. Must include 'id'.",
          additionalProperties: true,
        },
      },
      required: ["content_type", "row"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotent: true, openWorld: false },
  },
] as const;

// ---------------------------------------------------------------------------
// TOOL IMPLEMENTATIONS
// ---------------------------------------------------------------------------

/** Human-readable labels so a model does not have to infer meaning from a
 *  snake_case table name. */
/* Object-shaped jsonb columns, reported separately by list_content_types because a model that treats screens as a string writes a JSON.parse failure, and toJson turns that into an empty column with no error. */ const JSON_SHAPES: Partial<Record<EditableTable, string>> = { work_case_studies: "screens: array of { label (required - a screen with no label is dropped), caption, mediaType: image or video, src (image only), youtubeId (required when mediaType is video; paste a full YouTube URL and it is reduced to the id for you), posterUrl, orientation: landscape or portrait, layout: auto (masonry column), centered (own row), or full (full-width row) }. A video screen whose youtubeId cannot be parsed is saved as an IMAGE screen instead, so read the row back and check. principles: array of { title (required), body }. feedback: one object { quote, attribution } or null - both halves are required, a half-filled quote is stored as null." }; const LABELS: Record<EditableTable, string> = {
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

function listContentTypes() {
  return EDITABLE_TABLES.map((table) => ({
    content_type: table,
    what_it_is: LABELS[table],
    columns: TABLE_SPECS[table].cols,
    required: REQUIRED[table],
    list_columns: TABLE_SPECS[table].arrayCols,
    number_columns: TABLE_SPECS[table].numberCols,
    checkbox_columns: TABLE_SPECS[table].boolCols, json_columns: TABLE_SPECS[table].jsonCols ?? [], json_shapes: JSON_SHAPES[table],
  }));
}

async function getRows(args: Record<string, unknown>) {
  const table = args.content_type;
  if (!isEditableTable(table)) {
    throw new Error(
      `Unknown content type. Valid values: ${EDITABLE_TABLES.join(", ")}`
    );
  }

  const limit = Math.min(
    Math.max(Number(args.limit) || 50, 1),
    MAX_LIMIT
  );

  let query = adminClient().from(table).select("*").limit(limit);
  if (typeof args.id === "string" && args.id.trim()) {
    query = query.eq("id", args.id.trim());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { content_type: table, count: data?.length ?? 0, rows: data ?? [] };
}

async function upsertRow(args: Record<string, unknown>) {
  const table = args.content_type;
  if (!isEditableTable(table)) {
    throw new Error(
      `Unknown content type. Valid values: ${EDITABLE_TABLES.join(", ")}`
    );
  }

  const raw = args.row;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("'row' must be an object of column values.");
  }

  // Same sanitizer the admin panel's save button uses. Unknown columns are
  // dropped here, which is why this endpoint cannot be used to probe the
  // schema or write to a column that is not meant to be editable.
  const clean = sanitizeRow(table, raw as Record<string, unknown>);

  if (!clean.id) {
    throw new Error(
      "'id' is required. Use the id of an existing row to update it, or a new slug-style id to create one."
    );
  }

  const missing = REQUIRED[table].filter(
    (col) => clean[col] === null || clean[col] === undefined || clean[col] === ""
  );
  if (missing.length) {
    throw new Error(
      `Missing required field(s): ${missing.join(", ")}. Call get_rows first and resend the existing values along with your change.`
    );
  }

  // Mirrors the panel's rule. Enforced here too so the failure is a sentence
  // rather than a database error.
  if (table === "work_case_studies") {
    const n = clean.narrative;
    if (!Array.isArray(n) || n.length !== 3) {
      throw new Error(
        `A case study narrative must be exactly 3 paragraphs (what was wrong, what was done, what it now is). Received ${
          Array.isArray(n) ? n.length : 0
        }.`
      );
    }
  }

  const { data, error } = await adminClient()
    .from(table)
    .upsert(clean, { onConflict: "id" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // The public routes are statically rendered, so without this the visitor
  // keeps seeing the old HTML and the edit looks like it silently failed.
  revalidatePath("/", "layout");

  return {
    ok: true,
    content_type: table,
    written: data,
    note: "Saved and the site was revalidated. Social platforms cache link previews, so changes to the share image or title may need a re-scrape to show in chats.",
  };
}

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_content_types":
      return listContentTypes();
    case "get_rows":
      return await getRows(args);
    case "upsert_row":
      return await upsertRow(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC PLUMBING
// ---------------------------------------------------------------------------

type RpcId = string | number | null;

function result(id: RpcId, value: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result: value });
}

function rpcError(id: RpcId, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message:
            "Unauthorized. This server is configured with HTTP Basic auth - send the username and password. (When MCP_USERNAME/MCP_PASSWORD are unset, no credentials are required at all.)",
        },
      },
      {
        status: 401,
        /* Tells a client which scheme to use, which is how some MCP clients
           know to prompt for a username and password rather than a token. */
        headers: { "WWW-Authenticate": 'Basic realm="Portfolio content MCP"' },
      }
    );
  }

  let body: { method?: string; id?: RpcId; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error.");
  }

  const { method, params } = body;
  const id = body.id ?? null;

  // Notifications carry no id and expect no body.
  if (method?.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "Edits the content of Miftahul Islam Efaz's portfolio site. Call list_content_types first to learn exact column names, then get_rows before any edit so you resend existing values instead of blanking them. Nothing here can delete content.",
      });

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, { tools: TOOLS });

    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;

      try {
        const value = await callTool(name, args);
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        });
      } catch (err) {
        /* A tool failure is reported INSIDE a successful result with
           isError, not as a JSON-RPC error. That is what lets the model read
           the message and correct itself, instead of the client treating it
           as a transport fault and giving up. */
        const message = err instanceof Error ? err.message : "Unexpected error.";
        return result(id, {
          content: [{ type: "text", text: message }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/** MCP clients sometimes probe with GET for a streaming transport. Say no
 *  clearly rather than 404-ing, which reads as a wrong URL. */
export async function GET() {
  return NextResponse.json(
    { error: "This MCP server speaks JSON-RPC over POST only." },
    { status: 405 }
  );
}
