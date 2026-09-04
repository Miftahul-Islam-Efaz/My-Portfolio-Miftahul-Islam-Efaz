import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin/session";
import { adminClient } from "@/lib/supabase/clients";
import { SORTABLE_TABLES, isEditableTable, type EditableTable } from "@/lib/cms/types";

/**
 * POST /api/admin/reorder  { table, ids: string[] }
 *
 * `ids` is the full list in the new order; position in the array becomes
 * sort_order. Sending the whole list rather than a single move means the
 * client never has to reason about what the other rows now are.
 *
 * THE NEGATIVE PASS IS NOT OPTIONAL. sort_order carries a UNIQUE index, so
 * writing 1,2,3 over an existing 1,2,3 collides the moment two rows swap.
 * Every row is first parked at a negative offset (which no real row uses),
 * then written to its final value. Two passes, no collision, no need to drop
 * the constraint that keeps the ordering honest in the first place.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let table: unknown;
  let ids: unknown;
  try {
    const body = (await request.json()) as { table?: unknown; ids?: unknown };
    table = body.table;
    ids = body.ids;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!isEditableTable(table) || !SORTABLE_TABLES.includes(table as EditableTable)) {
    return NextResponse.json({ error: "That table is not reorderable." }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "ids must be an array of strings." }, { status: 400 });
  }

  const db = adminClient();
  const list = ids as string[];

  try {
    // Pass 1: park everything out of the way.
    for (let i = 0; i < list.length; i++) {
      const { error } = await db
        .from(table)
        .update({ sort_order: -(i + 1) })
        .eq("id", list[i]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Pass 2: settle into the real positions.
    for (let i = 0; i < list.length; i++) {
      const { error } = await db
        .from(table)
        .update({ sort_order: i + 1 })
        .eq("id", list[i]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}