import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin/session";
import { adminClient } from "@/lib/supabase/clients";
import { isEditableTable, NEWEST_FIRST_TABLES } from "@/lib/cms/types";
import { REQUIRED, TABLE_SPECS, sanitizeRow } from "@/lib/admin/columns";

/**
 * POST /api/admin/save  { table, row }
 *
 * One upsert endpoint for every table, because the alternative is six
 * near-identical route files that drift. Safety comes from the two whitelists
 * it consults, not from having a narrow URL.
 *
 * The session check is the FIRST statement. Reading the body before
 * authenticating is how an unauthenticated request ends up doing work.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let table: unknown;
  let row: unknown;
  try {
    const body = (await request.json()) as { table?: unknown; row?: unknown };
    table = body.table;
    row = body.row;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!isEditableTable(table)) {
    return NextResponse.json({ error: "Unknown table." }, { status: 400 });
  }
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    return NextResponse.json({ error: "Row must be an object." }, { status: 400 });
  }

  const clean = sanitizeRow(table, row as Record<string, unknown>);

  const missing = REQUIRED[table].filter(
    (col) => clean[col] === null || clean[col] === undefined || clean[col] === ""
  );
  if (missing.length) {
    return NextResponse.json(
      { error: "These fields are required: " + missing.join(", ") },
      { status: 400 }
    );
  }

  // A case study narrative must be exactly three paragraphs. The DB enforces
  // it too, but catching it here produces a sentence a human can act on.
  if (table === "work_case_studies") {
    const n = clean.narrative;
    if (!Array.isArray(n) || n.length !== 3) {
      return NextResponse.json(
        {
          error:
            "The narrative must be exactly 3 paragraphs: what was wrong, what was done, what it now is. Currently " +
            (Array.isArray(n) ? n.length : 0) + ".",
        },
        { status: 400 }
      );
    }
  }

  /* ------------------------------------------------------------------
     POSITION COLLISIONS ARE RESOLVED HERE, NOT REFUSED.

     sort_order has no unique constraint, and it should not have one: two
     rows sharing a position is not corrupt data, it is just ambiguous
     ordering, and Postgres will happily store it and then order those
     two arbitrarily. That ambiguity is invisible in the panel and shows
     up as tiles swapping places for no reason between reloads.

     So a clash is absorbed rather than rejected. Asking again for a
     number the panel already knows is taken is busywork - the intent of
     "put this at 3" is unambiguous even when 3 is occupied. Everything
     at or below that position moves down one to make room, which is what
     inserting into an ordered list means everywhere else.

     ON THE SERVER, DELIBERATELY. The browser's copy of the table can be
     stale, filtered, or simply one of two tabs open at once. Only the DB
     knows what is actually taken at the moment of the write.

     DESCENDING ORDER MATTERS. Shifting upward from the lowest row would
     walk each row into the position of the one above it, one collision
     at a time. Starting from the bottom means every target is vacant as
     it is reached.
     ------------------------------------------------------------------ */
  let notice: string | null = null;

  if (
    !NEWEST_FIRST_TABLES.includes(table) &&
    TABLE_SPECS[table].numberCols.includes("sort_order") &&
    typeof clean.sort_order === "number"
  ) {
    const target = clean.sort_order;

    try {
      const db = adminClient();
      const { data: existing } = await db.from(table).select("id, sort_order");

      const others = (existing ?? []).filter(
        (r) => String(r.id) !== String(clean.id)
      );

      if (others.some((r) => Number(r.sort_order) === target)) {
        const pushed = others
          .filter((r) => Number(r.sort_order) >= target)
          .sort((a, b) => Number(b.sort_order) - Number(a.sort_order));

        for (const r of pushed) {
          await db
            .from(table)
            .update({ sort_order: Number(r.sort_order) + 1 })
            .eq("id", r.id);
        }

        notice =
          `Position ${target} was already taken, so ${pushed.length} ` +
          `${pushed.length === 1 ? "entry" : "entries"} moved down one to make room.`;
      }
    } catch {
      /* A failed reshuffle must not block the save itself. The row still
         lands at the requested position; the ordering is merely ambiguous
         until something is moved by hand. */
      notice = null;
    }
  }

  try {
    const { data, error } = await adminClient()
      .from(table)
      .upsert(clean, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // The site reads with cache: no-store, but the ROUTES themselves are
    // statically rendered, so without this the visitor-facing pages keep
    // serving the build-time HTML.
    revalidatePath("/", "layout");

    return NextResponse.json({ ok: true, row: data, notice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}