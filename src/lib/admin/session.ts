/**
 * ADMIN SESSION - a signed cookie, nothing more.
 *
 * There is no user table and no Supabase Auth here, by choice: there is
 * exactly one admin and the password lives in .env.local. What this module
 * adds over "compare the password on every request" is that the password is
 * sent ONCE, at login, and every subsequent request carries a signed,
 * expiring token instead.
 *
 * The token is <expiry>.<hmac(expiry)>. It carries no identity because there
 * is only one identity, and no secrets because the signature is over the
 * expiry alone. A tampered expiry fails the HMAC; a valid but stale one fails
 * the time check. timingSafeEqual on both the password and the signature so
 * neither can be recovered a byte at a time.
 *
 * WHY NOT JWT. A dependency and a spec to hold a single integer. This is 40
 * lines of node:crypto and it is auditable in one sitting.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "efaz_admin_session";

/** Eight hours. Long enough for a working session, short enough that a
 *  forgotten open tab on someone else machine is not a standing invitation. */
const TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Falling back to the password keeps a fresh clone working before the extra
  // variable is set. It is weaker (rotating the password invalidates every
  // session) so it warns rather than passing silently.
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[admin] ADMIN_SESSION_SECRET is unset - signing sessions with ADMIN_PASSWORD instead. Set a separate 32+ char secret in .env.local."
      );
    }
    return "derived:" + pw;
  }
  throw new Error("Neither ADMIN_SESSION_SECRET nor ADMIN_PASSWORD is set.");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Constant-time string compare that does not throw on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still do a comparison so the timing does not leak the length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** True when the supplied password matches ADMIN_PASSWORD. */
export function passwordIsCorrect(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/**
 * Both halves must match. The username is compared case-insensitively because
 * a login that fails on a capital E is a support ticket, not security - while
 * the password is compared byte for byte, because there it genuinely matters.
 *
 * Both comparisons run unconditionally: returning early on a bad username
 * would leak, through timing, that the username was the part that was wrong.
 */
export function credentialsAreCorrect(
  username: string,
  password: string
): boolean {
  const expectedUser = (process.env.ADMIN_USERNAME || "efaz").toLowerCase();
  const userOk = safeEqual(username.trim().toLowerCase(), expectedUser);
  const passOk = passwordIsCorrect(password);
  return userOk && passOk;
}

export function createToken(): string {
  const expiry = String(Date.now() + TTL_MS);
  return expiry + "." + sign(expiry);
}

export function tokenIsValid(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const expiry = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^[0-9]+$/.test(expiry)) return false;
  if (!safeEqual(mac, sign(expiry))) return false;
  return Number(expiry) > Date.now();
}

/** Read the cookie jar and say whether this request is an authenticated admin.
 *  Every /api/admin route calls this FIRST, before reading the body. */
export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return tokenIsValid(jar.get(ADMIN_COOKIE)?.value);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

/** Suggested value for ADMIN_SESSION_SECRET, printed by the setup script. */
export function suggestSecret(): string {
  return randomBytes(32).toString("hex");
}