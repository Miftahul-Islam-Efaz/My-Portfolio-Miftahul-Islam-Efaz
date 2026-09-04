/**
 * THE TWO SUPABASE CLIENTS, AND WHY THERE ARE EXACTLY TWO.
 *
 * publicClient() carries the anon key. It can only ever SELECT, because every
 * table RLS policy grants select and nothing else to the anon role. It is safe
 * in a server component and would be safe in the browser.
 *
 * adminClient() carries the SERVICE ROLE key, which bypasses RLS entirely. It
 * must NEVER be imported into a client component. It is only reachable from
 * route handlers under /api/admin, each of which checks the admin session
 * cookie before it touches this. That is the whole security model: the
 * password guards a server route, and the browser never holds a key that can
 * write.
 *
 * cache no-store on both. Next.js will happily cache the underlying fetch, and
 * then you save a row in the admin panel and the site keeps serving the old
 * one for minutes, which reads as "the save did not work".
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const noStore = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: "no-store" as RequestCache }),
  },
};

let cachedPublic: SupabaseClient | null = null;

/** Read-only client. Returns null when the env vars are absent, so callers can
 *  fall back to the hardcoded content instead of throwing at build time. */
export function publicClient(): SupabaseClient | null {
  if (!PROJECT_URL || !ANON_KEY) return null;
  if (!cachedPublic) cachedPublic = createClient(PROJECT_URL, ANON_KEY, noStore);
  return cachedPublic;
}

/** Full-access client. Server-only. Throws loudly rather than silently
 *  degrading, because a missing service key during an admin write is a
 *  misconfiguration, not a fallback case. */
export function adminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!PROJECT_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from Supabase: Project Settings -> API keys -> service_role, into .env.local."
    );
  }
  return createClient(PROJECT_URL, key, noStore);
}

export const MEDIA_BUCKET = "portfolio-media";