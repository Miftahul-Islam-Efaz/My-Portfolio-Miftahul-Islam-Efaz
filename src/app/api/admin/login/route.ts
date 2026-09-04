import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  cookieOptions,
  createToken,
  credentialsAreCorrect,
} from "@/lib/admin/session";

/**
 * POST /api/admin/login  { username, password }
 *
 * The only endpoint that ever sees the credentials. On success it sets an
 * httpOnly signed cookie; the browser never receives the password back, nor
 * any Supabase key.
 *
 * The failure message never says WHICH of the two was wrong. Telling an
 * attacker that the username was right halves their work for free.
 *
 * The 600ms floor on a failed attempt is a deliberate brake on brute force.
 * With one account and no lockout, rate is the only defence available, and a
 * human typing a password will never notice half a second.
 */
export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    if (typeof body.username === "string") username = body.username;
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD is not set on the server. Add it to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  if (!credentialsAreCorrect(username, password)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      { error: "Those credentials are not right." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createToken(), cookieOptions());
  return response;
}