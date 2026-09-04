'use client';

/* ------------------------------------------------------------------
   SHOULD THE CURTAIN PLAY AT ALL?

   The companion to vaultReturn.ts. That file answers one narrow
   question - "is this mount a room closing?" - and its header states
   the policy the site used to have:

     A RELOAD of the landing page          -> play it
     A COLD ARRIVAL from anywhere else     -> play it
     A ROOM CLOSING back onto the page     -> do NOT play it

   THE HOLE IN THAT POLICY is the middle line, and it is why the intro
   felt like it played constantly. "Cold arrival from anywhere else"
   was implemented as "any mount of HomeShell that is not a room
   close" - but HomeShell does not only mount on a document load. Every
   client-side navigation that lands on / mounts a brand new one: the
   back button out of /vault, a nav link home from /glass-test, a
   router.push from anywhere in the app. None of those are arrivals.
   The visitor is already here, already scrolled, already looking at
   the site - and the curtain drops over all of it and counts to 100.

   vaultReturn.ts patched exactly ONE of those routes, the standalone
   /vault close, with an explicit flag written by the caller. That
   works, but it does not scale: every future route that navigates home
   has to remember to write the flag, and forgetting reintroduces this
   bug looking exactly as it does now.

   THE POLICY NOW, inverted so the default is silence:

     A RELOAD of the landing page          -> play it
     A COLD ARRIVAL directly at /          -> play it
     ANY client-side navigation onto /     -> do NOT play it
     A ROOM CLOSING back onto the page     -> do NOT play it (unchanged)

   ---------------------------------------------------------------
   HOW A REAL DOCUMENT LOAD IS RECOGNISED

   Two conditions, and both are needed.

   1. THE MODULE FLAG. A module-scope variable is created fresh by
      every real document load and survives every client-side
      navigation - which is precisely the distinction being drawn, so
      it is the right storage rather than a lucky one. (Contrast
      vaultReturn.ts, which deliberately uses sessionStorage BECAUSE it
      has to survive a navigation. Here, not surviving one IS the
      feature.) Consumed on the first mount, so the second mount in the
      same document - a nav away and back - finds it spent.

   2. THE DOCUMENT'S OWN URL. The flag alone would let a hard load of
      /vault, followed by a click home, play the curtain: fresh
      document, unspent flag. So the navigation entry's `name` - the
      URL the BROWSER actually loaded, which no client-side routing can
      change - must itself be the landing page.

   Note this deliberately does NOT test navigation `type` for 'reload'.
   A first-time visitor who types the address gets type 'navigate', and
   they are the one person who most needs the site to introduce itself.
   "Reload" in the request means "a real page load", not "the reload
   button specifically" - a cold arrival is the same event to everyone
   except the browser.

   The fallback everywhere is TRUE. If the timing API is missing or the
   URL will not parse, the intro plays - the old behaviour. A missing
   intro is a worse failure than an extra one.
   ------------------------------------------------------------------ */

/** Spent by the first HomeShell mount in this document. */
let introConsumed = false;

/** The full URL the browser actually loaded, or null if unreadable.
 *
 *  The URL, not just the pathname - see the deep-link note below. The
 *  hash is the half that matters most here and it was the half the
 *  first version of this file threw away. */
const hardLoadedUrl = (): URL | null => {
	try {
		const [entry] = performance.getEntriesByType(
			'navigation'
		) as PerformanceNavigationTiming[];
		if (!entry?.name) return null;
		return new URL(entry.name);
	} catch {
		return null;
	}
};

/** '/', '' and '/index' all mean the landing page; trailing slashes vary
 *  by host and redirect config and must not change the answer. */
const isLandingPath = (path: string): boolean => {
	const trimmed = path.replace(/\/+$/, '');
	return trimmed === '' || trimmed === '/index';
};

/**
 * Read in a useState initialiser, exactly like peekReturnHome - the curtain
 * has to be absent on the FIRST render rather than removed by an effect a
 * frame later, which would flash it over the page.
 *
 * Idempotent, because StrictMode runs initialisers twice. The consuming is
 * markIntroPlayed's job, from an effect.
 *
 * EVERYTHING THIS FUNCTION TESTS MUST BE KNOWN TO THE SERVER TOO, and that
 * constraint is the whole reason it is split from isDeepLink below.
 *
 * It returns true on the server, so the server-rendered markup contains the
 * curtain. The two tests it makes are safe against that: a spent module flag
 * and a non-landing pathname can only be false on a CLIENT-SIDE navigation,
 * which renders fresh with no hydration to mismatch. On a real document load
 * of / - the only case that hydrates - both answer true, matching the server.
 *
 * The hash cannot be tested here. It is never sent to the server, so the
 * server cannot agree with any answer derived from it. See isDeepLink.
 */
export const shouldPlayIntro = (): boolean => {
	if (typeof window === 'undefined') return true;
	if (introConsumed) return false;

	const url = hardLoadedUrl();
	if (url === null) return true;

	return isLandingPath(url.pathname);
};

/* ------------------------------------------------------------------
   A DEEP LINK IS NOT AN ARRIVAL AT THE LANDING PAGE.

   Only ONE room is a real route: /vault, which shouldPlayIntro's
   pathname test already rejects. Every other room is an overlay
   rendered over the landing page, and it writes its address with
   history.pushState as a HASH - '#work' for the gallery, '#work/<slug>'
   for a case study (WORK_GALLERY_HASH and CASE_STUDY_HASH_PREFIX).
   Reloading inside one of those loads the landing DOCUMENT, so the
   pathname is plain '/' and looks exactly like a cold arrival - while
   the overlay's own "arriving on a link" effect opens the room
   underneath. The curtain then counts to 100 over a case study the
   visitor was already reading.

   ANY hash, rather than a list of the known room prefixes:

     - a hash means the visitor asked for a SPECIFIC place on this page,
       and the curtain does not merely delay that - it locks scrolling
       and pins the page to the top for its duration, so it actively
       fights the request;
     - it covers plain section anchors as well as rooms, and those want
       the same treatment for the same reason;
     - it needs no maintenance. A list would have to be updated by every
       future room, and forgetting would bring this bug back looking
       precisely as it does now.

   ---------------------------------------------------------------
   WHY THIS IS SEPARATE, AND WHY IT MUST NOT BE READ DURING RENDER

   The fragment is never sent to the server. The server therefore cannot
   know it, cannot agree with it, and CANNOT BE MADE TO - no amount of
   care in this file changes what the browser transmits.

   Folding this test into shouldPlayIntro made the server render the
   curtain and the client's first render omit it, on the one URL shape
   that actually hydrates. React discards server HTML on a mismatch and
   rebuilds the whole tree on the client, which is far more expensive
   than the intro it was avoiding - and it reconnects GSAP,
   ScrollTrigger and Lenis to DOM nodes that have just been thrown away.

   So HomeShell reads this in a LAYOUT effect: after hydration has
   matched, still before the browser paints. No mismatch, no flash.
   ------------------------------------------------------------------ */
export const isDeepLink = (): boolean => {
	if (typeof window === 'undefined') return false;
	const { hash } = window.location;
	return Boolean(hash) && hash !== '#';
};

/** Called once HomeShell has mounted, whether or not the curtain ran. Any
 *  later mount in this same document is a navigation, and must be silent. */
export const markIntroPlayed = () => {
	introConsumed = true;
};

/* ------------------------------------------------------------------
   ONCE PER SESSION, NOT ONCE PER DOCUMENT

   The module flag above is spent when this JS bundle is discarded, so it
   answers "has the intro played in THIS document" - which makes every
   reload a fresh arrival. That was the old policy. The new one is that
   the intro is a greeting: it plays on the first page load of a visit
   and is not shown again, reload included.

   sessionStorage and not localStorage, deliberately: the greeting comes
   back on a genuinely new visit, and a second tab gets its own. The
   same storage choice, for the same reason, as lib/vaultReturn.ts.
   Change the two calls below to localStorage to make it once ever.

   THIS MUST NOT BE READ IN A RENDER. Storage does not exist on the
   server, so the server would render the curtain and a client that has
   seen it would not - a hydration mismatch, which makes React discard
   the server HTML and rebuild the tree. It is read in a layout effect
   in HomeShell for exactly the reason isDeepLink is. See the note
   above shouldPlayIntro.

   Wrapped because storage throws rather than returning null when it is
   disabled or full; the fallback is that the intro plays, which is the
   old behaviour and no worse than harmless.
   ------------------------------------------------------------------ */

const SEEN_KEY = 'intro_seen';

/** Has the curtain already had its turn in this browsing session? */
export const hasSeenIntro = (): boolean => {
	if (typeof window === 'undefined') return false;
	try {
		return sessionStorage.getItem(SEEN_KEY) === '1';
	} catch {
		return false;
	}
};

/** Record that it has. Called once per document mount, whether or not the
 *  curtain actually ran - reaching that line means it had its chance. */
export const markIntroSeen = (): void => {
	if (typeof window === 'undefined') return;
	try {
		sessionStorage.setItem(SEEN_KEY, '1');
	} catch {
		/* Ignored - see above. */
	}
};
