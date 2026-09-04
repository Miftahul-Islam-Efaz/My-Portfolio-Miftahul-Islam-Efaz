/**
 * ADMIN INBOX ROUTE.
 *
 * Deliberately NOT routed through /api/admin/save and /api/admin/rows.
 * Those two take a table name from the request body and check it against
 * the EDITABLE_TABLES whitelist. contact_submissions is kept out of that
 * whitelist on purpose: those routes exist to rewrite arbitrary columns,
 * and there is no version of this feature where the admin panel should be
 * able to edit what a visitor wrote about themselves.
 *
 * So this route offers exactly three verbs and no more:
 *   GET    - read the inbox, newest first
 *   PATCH  - move one row between inbox states (new/read/replied/archived)
 *   DELETE - remove one row for good
 *
 * There is no column-name passthrough anywhere in this file. `status` is
 * checked against a fixed set, and `id` is the only other input.
 */
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import { adminClient } from "@/lib/supabase/clients";
import { SUBMISSION_STATUSES, isSubmissionStatus } from "@/lib/cms/types";

const TABLE = "contact_submissions";

/** Every column, named explicitly. select("*") would silently start shipping
 *  any column added later, which is how a private note ends up in a browser. */
const COLUMNS = [
  "id",
  "created_at",
  "kind",
  "status",
  "full_name",
  "email",
  "company",
  "phone",
  "message",
  "description",
  "services",
  "site_type",
  "site_type_other",
  "app_stack",
  "budget",
  "stack",
  "locale_country",
  "user_agent",
  "referrer",
].join(", ");

/** A UUID and nothing else. The id reaches Postgres, so it is validated by
 *  shape before it gets there rather than trusted because it came from our
 *  own UI. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");

  try {
    const db = adminClient();
    let query = db.from(TABLE).select(COLUMNS).order("created_at", { ascending: false });

    /* An unrecognised status is ignored rather than rejected: the filter is a
       convenience, and a bad query string should not blank the inbox. */
    if (status && isSubmissionStatus(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = data ?? [];

    /* The counts are computed for the whole table, not the filtered view, so
       the tab can show "3 new" while you are looking at the archive. */
    const { data: all, error: countError } = await db.from(TABLE).select("status");
    const counts: Record<string, number> = { total: 0 };
    for (const key of SUBMISSION_STATUSES) counts[key] = 0;
    if (!countError && all) {
      counts.total = all.length;
      for (const entry of all as Array<{ status: string }>) {
        if (entry.status in counts) counts[entry.status] += 1;
      }
    }

    return NextResponse.json({ ok: true, rows, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  if (!isSubmissionStatus(body.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  try {
    const db = adminClient();
    const { data, error } = await db
      .from(TABLE)
      .update({ status: body.status })
      .eq("id", id)
      .select(COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, row: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  try {
    const db = adminClient();
    const { error } = await db.from(TABLE).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
