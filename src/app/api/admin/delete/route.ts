import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin/session";
import { adminClient } from "@/lib/supabase/clients";
import { isEditableTable } from "@/lib/cms/types";

/**
 * POST /api/admin/delete  { table, id }
 *
 * Singleton tables are refused: there is no sensible "delete the hero video"
 * or "delete the footer image", and allowing it would let one stray click
 * leave a section with nothing to render. Those are edited, never removed.
 */
const UNDELETABLE = new Set(["hero_video_settings", "site_images"]);

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let table: unknown;
  let id: unknown;
  try {
    const body = (await request.json()) as { table?: unknown; id?: unknown };
    table = body.table;
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!isEditableTable(table)) {
    return NextResponse.json({ error: "Unknown table." }, { status: 400 });
  }
  if (UNDELETABLE.has(table)) {
    return NextResponse.json(
      { error: "This entry is a fixed slot and can be edited but not deleted." },
      { status: 400 }
    );
  }
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    const { error } = await adminClient().from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}