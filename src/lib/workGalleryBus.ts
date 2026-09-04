/**
 * A one-event channel for "open the work gallery".
 *
 * WHY THIS EXISTS. Two things can ask for the gallery, and they are on
 * opposite sides of the tree: the View more cue, which lives inside
 * DitherCarousel, and the Work submenu in the header, which lives inside
 * NavMenu. Their nearest common ancestor is the page itself.
 *
 * The alternatives were worse. Lifting gallery state to a page-level
 * provider would put a context around the entire document so that one
 * button in the header can talk to one overlay in the work section, and
 * every consumer of that context re-renders when the gallery opens -
 * including the pinned WebGL helix, which must not re-render for any
 * reason (see the dependency note at the foot of the effect in
 * DitherCarousel.tsx). Passing a callback down would mean threading a
 * prop through the header, the layout and the page.
 *
 * So: a window event. The same shape as lib/navSlot.ts, which solves the
 * mirror-image problem of the vault window needing to reach the header.
 * The gallery's actual state stays where the case study overlay already
 * lives, which is the only place that can open a case study.
 *
 * Guarded for the server because NavMenu and DitherCarousel are both
 * client components inside an app that still renders them once on the
 * server, where `window` is not defined.
 */

const OPEN_EVENT = 'work-gallery:open';

/** Ask for the gallery. Safe to call before anything is listening - the
 *  event is simply dropped, which is the correct outcome. */
export function requestWorkGallery(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/** Listen for the request. Returns its own unsubscribe, so an effect can
 *  return the result of this call directly. */
export function onWorkGalleryRequest(handler: () => void): () => void {
	if (typeof window === 'undefined') return () => {};
	window.addEventListener(OPEN_EVENT, handler);
	return () => window.removeEventListener(OPEN_EVENT, handler);
}
