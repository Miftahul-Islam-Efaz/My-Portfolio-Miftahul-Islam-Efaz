/**
 * PUBLIC CONTACT INTAKE.
 *
 * The one route on the site that a stranger is allowed to write through, so
 * it is the one that has to be paranoid.
 *
 * It uses adminClient() (service role) even though the caller is anonymous.
 * That is deliberate: contact_submissions has RLS enabled with no policies,
 * so the anon key cannot touch it at all. Letting the browser insert directly
 * would mean an anon INSERT policy, and an anon policy on a table holding
 * other people's phone numbers is one misconfigured SELECT away from a leak.
 * Instead the key stays on the server and this handler is the only door.
 *
 * Because the service role bypasses RLS, nothing here may trust the body.
 * Every field is whitelisted by name, coerced to a string, trimmed, and
 * length-capped. The client cannot name a column, cannot set `status`, and
 * cannot set `created_at`.
 */
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/clients";

/** Must match the CHECK constraint on contact_submissions.kind. */
const KINDS = new Set(["project", "sayHi"]);

/** Free prose gets room; a name or a budget label does not. */
const PROSE = 4000;
const SHORT = 300;

/** A trimmed, capped string, or null. Null rather than "" so an untouched
 *  optional field reads as absent in the database instead of as an empty
 *  answer the visitor deliberately gave. */
function text(value: unknown, limit = SHORT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

/** The services array, defended against both wrong types and absurd lengths. */
function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const kind = typeof body.kind === "string" && KINDS.has(body.kind) ? body.kind : null;
  if (!kind) {
    return NextResponse.json({ error: "Unknown submission kind." }, { status: 400 });
  }

  const email = text(body.email, SHORT);
  const message = text(body.message, PROSE);
  const description = text(body.description, PROSE);

  /* A submission with no way to reply and nothing said is a bounced form, not
     a lead. Rejecting it here keeps the inbox worth opening. */
  if (!email && !message && !description) {
    return NextResponse.json(
      { error: "Add an email or a message before sending." },
      { status: 400 }
    );
  }

  const row = {
    kind,

    full_name: text(body.fullName),
    email,
    company: text(body.company),
    phone: text(body.phone),

    message,
    description,

    services: list(body.services),
    site_type: text(body.siteType, 80),
    site_type_other: text(body.siteTypeOther),
    app_stack: text(body.appStack, 80),
    budget: text(body.budget, 80),
    stack: text(body.stack, 80),

    /* Context, taken rather than asked for. The country is the same signal
       the greeting already uses, so the inbox agrees with what the visitor
       was shown. */
    locale_country: text(body.country, 80),
    user_agent: text(request.headers.get("user-agent"), 500),
    referrer: text(request.headers.get("referer"), 500),
  };

  try {
    const db = adminClient();
    const { error } = await db.from("contact_submissions").insert(row);
    if (error) {
      /* Log the real reason, return a vague one: the visitor cannot act on a
         Postgres message and it should not be echoed back to the internet. */
      console.error("[contact] insert failed", error.message);
      return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unexpected error.";
    console.error("[contact] route failed", detail);
    return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
  }
}
