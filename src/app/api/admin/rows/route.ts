import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { adminClient } from "@/lib/supabase/clients";
import { isEditableTable } from "@/lib/cms/types";

/**
 * GET /api/admin/rows?table=work_projects
 *
 * The panel reads through this rather than through publicClient() so that
 * UNPUBLISHED rows are visible while editing. The public RLS policy filters on
 * `published`, which is correct for visitors and useless for an editor who
 * needs to see the draft they just hid.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const table = new URL(request.url).searchParams.get("table");
  if (!isEditableTable(table)) {
    return NextResponse.json({ error: "Unknown table." }, { status: 400 });
  }

  try {
    const db = adminClient();
    const query = db.from(table).select("*");
    const { data, error } = await (table === "work_case_studies" ||
    table === "site_images" ||
    table === "site_identity" ||
    table === "hero_video_settings"
      ? query.order("id", { ascending: true })
      : query.order("sort_order", { ascending: true }));

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}