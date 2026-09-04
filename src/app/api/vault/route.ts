/**
 * THE VAULT'S PUBLIC READ ENDPOINT.
 *
 * Why a route and not props: VaultGallery lives inside VaultWindow, which is a
 * client component - a fixed, full-screen overlay running its own nested Lenis
 * and opened on demand. Server fetchers cannot be called from in there, and
 * threading the data down would mean editing the overlay's mount path in every
 * place it is mounted. The overlay carries the GSAP and Lenis machinery, so the
 * cheapest change is the one that does not touch it at all.
 *
 * The fetchers already fall back to hardcoded content on any failure, so this
 * answers with a usable payload even with Supabase unreachable.
 *
 * WHY THIS IS UNCACHED, AND MUST STAY UNCACHED.
 *
 * This used to carry `revalidate = 60` plus a `public, max-age=60,
 * stale-while-revalidate=300` header. That is three caches stacked - the Next
 * full route cache, the browser's HTTP cache, and the shared/CDN cache - on the
 * one endpoint the admin panel is judged by. Save a visual, open the vault, and
 * it is simply not there; up to six minutes later it appears on its own. The
 * only conclusion available to whoever pressed Save is that the save failed.
 *
 * The admin write path already calls revalidatePath, but that cannot reach a
 * response the BROWSER has cached, and it cannot reach a `stale-while-revalidate`
 * copy already handed out. So the freshness has to be stated here.
 *
 * The cost is one Postgres round trip per vault open. The vault is an overlay a
 * visitor opens deliberately, not a feed on the landing path, and the three
 * queries are indexed selects over a few dozen rows. That is the right trade
 * for an admin panel that can be trusted.
 */
import {
  getVaultCategories,
  getVaultTools,
  getVaultVisuals,
} from "@/lib/cms/queries";

/* Opt this route out of the Next full route cache. Without it the handler is
   evaluated once at build time and every visitor is served that snapshot. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [visuals, categories, tools] = await Promise.all([
    getVaultVisuals(),
    getVaultCategories(),
    getVaultTools(),
  ]);

  return Response.json(
    { visuals, categories, tools },
    {
      headers: {
        /* Belt and braces: no-store stops the browser and any shared cache in
           front of this from holding a copy. */
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
