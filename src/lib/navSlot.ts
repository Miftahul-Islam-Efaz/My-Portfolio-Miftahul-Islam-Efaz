/* ------------------------------------------------------------------
   THE HEADER DOCK

   A one-element registry so a full-screen overlay can hand its own
   corner control to the header instead of fighting it for the same
   corner.

   WHY THIS EXISTS: the vault window is portalled to document.body at
   z-index 9000 and puts its CLOSE button at the top right. The header
   is fixed at z-index 9999 and puts the menu pill in exactly the same
   place, so the pill painted straight over the CLOSE. Rather than
   nudge one of them sideways and hope, the window re-parents its
   button INTO the header, beside the pill, using this registry.

   It is deliberately not React context: the two components are on
   opposite sides of a portal boundary and are mounted by different
   trees (HomeShell renders the header, VaultTeaser and VaultStandalone
   render the window), so there is no shared provider to hang context
   from.

   'Busy' is separate from the slot itself because the header needs to
   know to STAY VISIBLE while something is docked - it normally hides
   itself until the hero has been scrolled past, and a CLOSE button
   inside a faded-out header would be unreachable.
   ------------------------------------------------------------------ */

type Listener = () => void;

let slot: HTMLElement | null = null;
let busy = false;
const listeners = new Set<Listener>();

function notify() {
	listeners.forEach((listener) => listener());
}

/** Called by the header with its dock element, and with null on unmount. */
export function setNavSlot(element: HTMLElement | null) {
	if (slot === element) return;
	slot = element;
	notify();
}

export function getNavSlot(): HTMLElement | null {
	return slot;
}

/** Called by whatever is docking, so the header knows to stay put. */
export function setNavSlotBusy(value: boolean) {
	if (busy === value) return;
	busy = value;
	notify();
}

export function isNavSlotBusy(): boolean {
	return busy;
}

/** Fires on any change to either the slot or the busy flag. */
export function subscribeNavSlot(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
