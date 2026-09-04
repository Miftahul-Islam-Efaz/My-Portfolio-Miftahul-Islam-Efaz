/**
 * A one-event channel for "take me home".
 *
 * WHY THIS EXISTS. The header wordmark is the one control on this site that
 * is visible from inside every room. It is painted at z-index 9999, above the
 * vault window (9000) and the work gallery (9200), and the header deliberately
 * STAYS mounted while an overlay is docked into the menu cluster - see the
 * `docked` contract in components/Navigation.tsx. So the wordmark is reachable
 * while a full-screen overlay is covering the document it would scroll.
 *
 * That makes scrolling alone the wrong implementation. Scrolling the page to
 * the top underneath an opaque overlay does nothing a visitor can see, and
 * they would be left looking at the same gallery having clicked the thing that
 * most obviously means "home" on any site on the web.
 *
 * So the wordmark announces an intent and whoever is covering the screen
 * answers by standing down. The alternatives were worse in the same ways
 * documented in lib/workGalleryBus.ts: a page-level provider would wrap the
 * whole document in a context so one button can talk to three overlays, and
 * re-render the pinned WebGL helix every time one of them opens. Threading a
 * callback would mean passing a prop through the header, the layout and the
 * page to reach components that are portalled to document.body anyway.
 *
 * This is the same shape as lib/navSlot.ts and lib/workGalleryBus.ts, and it
 * is deliberately fire-and-forget: an overlay that is not open is not
 * listening, and a dropped event is the correct outcome rather than an error.
 *
 * WHAT IT DOES NOT DO: it does not scroll. Each listener only closes itself,
 * and the wordmark does its own scrolling after dispatching. Closing an
 * overlay restores the page Lenis it stopped, so the scroll has to be issued
 * with `force` to survive the moment in between - see Navigation.tsx.
 *
 * Guarded for the server because every caller is a client component inside an
 * app that still renders it once where `window` is not defined.
 */

const HOME_EVENT = 'site:home';

/** Ask whatever is covering the screen to stand down. */
export function requestHome(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(HOME_EVENT));
}

/** Listen for the request. Returns its own unsubscribe, so an effect can
 *  return the result of this call directly. */
export function onHomeRequest(handler: () => void): () => void {
	if (typeof window === 'undefined') return () => {};
	window.addEventListener(HOME_EVENT, handler);
	return () => window.removeEventListener(HOME_EVENT, handler);
}
