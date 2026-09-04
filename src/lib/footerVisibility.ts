/* ------------------------------------------------------------------
   FOOTER VISIBILITY

   One boolean, published by the footer and consumed by the header.

   WHY THIS EXISTS: the footer is a full-screen photograph that carries
   its own FAZ DIGITAL wordmark. A second, smaller EFAZ wordmark from
   the fixed header floating over it is noise - two wordmarks, one
   frame. So the header withdraws while the footer is on screen and
   comes back on the way out.

   The header cannot observe the footer directly. It mounts inside
   HomeShell and cannot assume .footer exists yet on first paint, so a
   querySelector-based IntersectionObserver in the header would
   silently no-op on a cold load or a deep link. The footer already
   runs an IntersectionObserver on itself to suspend its RAF loop, so
   it owns the observation and announces the result here.

   Deliberately not React context, for the same reason as
   lib/navSlot.ts: the producer and the consumer are mounted by
   different subtrees and there is no shared provider to hang context
   from. Same shape as navSlot on purpose - one more pattern to learn
   is one too many.
   ------------------------------------------------------------------ */

type Listener = () => void;

let inFooter = false;
const listeners = new Set<Listener>();

/** Read once on mount: a deep link can land in the footer before any
    subscription exists. */
export function isInFooter(): boolean {
	return inFooter;
}

/** Called by the footer's IntersectionObserver, and with false on unmount. */
export function setInFooter(value: boolean): void {
	if (inFooter === value) return;
	inFooter = value;
	listeners.forEach((listener) => listener());
}

export function subscribeFooterVisibility(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
