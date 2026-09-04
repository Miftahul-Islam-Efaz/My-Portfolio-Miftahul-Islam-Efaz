'use client';

/* ------------------------------------------------------------------
   WHERE THE VISITOR WAS, ACROSS A RELOAD

   Now that the intro only plays once per session, a reload drops the
   visitor straight onto the live page - and dropping them at the TOP of
   it is its own defect. Refreshing while reading the contact section
   should return them to the contact section.

   WHY THE BROWSER'S OWN RESTORATION IS NOT ENOUGH, and this is the
   whole reason this file exists. Chrome and Safari restore scroll
   automatically, but they do it against the document height as it
   stands the instant they restore - and on this page that height is a
   lie for the first few frames:

     - the work carousel is PINNED by ScrollTrigger, and its pin spacer
       (which is most of the document's height) does not exist until
       ScrollTrigger has measured and built it;
     - Lenis drives scroll with a transform, so the native scroll
       position and what the visitor actually sees are two different
       numbers until Lenis is running.

   So the browser restores to an offset in a document that is still
   short, the clamp puts them somewhere near the bottom of whatever
   exists, and then the real height arrives underneath them. The
   restoration must therefore be OURS, issued after a refresh, which is
   why scrollRestoration is set to 'manual' below - not to disable the
   feature but to stop the browser racing us for it.

   ONE NUMBER, IN sessionStorage. Scoped to the tab, so a second tab has
   its own position and a new session starts at the top. The same
   storage choice, and the same reasoning, as lib/vaultReturn.ts.

   Every access is wrapped: sessionStorage throws rather than returning
   null when storage is disabled or a quota is hit, and none of this is
   worth breaking a page load over. The fallback is simply that the
   visitor lands at the top - the behaviour they have today.
   ------------------------------------------------------------------ */

const KEY = 'scroll_pos';

/**
 * Begin recording the scroll position. Returns its own unsubscribe, so an
 * effect can return the result of this call directly.
 *
 * Coalesced onto an animation frame: this fires on every scroll event, Lenis
 * emits a great many of them, and a sessionStorage write is synchronous and
 * touches disk. One write per frame at most.
 *
 * `pagehide` rather than `beforeunload`, because beforeunload is unreliable on
 * mobile Safari (a tab swiped away never fires it) and it disqualifies the
 * page from the back/forward cache on every browser that has one.
 */
export const startScrollMemory = (): (() => void) => {
	if (typeof window === 'undefined') return () => {};

	try {
		if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
	} catch {
		/* Ignored - see the header. */
	}

	let frame = 0;

	const save = () => {
		frame = 0;
		try {
			sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
		} catch {
			/* Ignored - see the header. */
		}
	};

	const onScroll = () => {
		if (!frame) frame = requestAnimationFrame(save);
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('pagehide', save);

	return () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('pagehide', save);
		if (frame) cancelAnimationFrame(frame);
	};
};

/**
 * The remembered offset, or null if there is nothing worth restoring.
 *
 * Read BEFORE startScrollMemory is called, or the first scroll event of the
 * new document overwrites the value being read.
 *
 * Zero returns null deliberately: restoring to the top is what happens anyway,
 * and treating it as "nothing to do" keeps the caller from running a refresh
 * and a jump for no reason.
 */
export const readRememberedScroll = (): number | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const value = Number(raw);
		return Number.isFinite(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
};
