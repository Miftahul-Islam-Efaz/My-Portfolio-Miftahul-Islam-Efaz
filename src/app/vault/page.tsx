import type { Metadata } from 'next';

import VaultStandalone from '@/components/vault/VaultStandalone';

/* ------------------------------------------------------------------
   /vault - THE REAL ROUTE.

   This is what a cold load, a shared link, a bookmark or a crawler
   gets. Arrivals from the landing page are intercepted by
   app/@modal/(.)vault and rendered as a window over a landing page that
   never unmounts - see the long note in that file.

   Two presentations, ONE URL. That was the point the user made and it
   was correct: a window and a real address are not in tension. The
   window is a presentation choice; the address is the resource.

   Kept as a server component so `metadata` can be exported - Next.js
   ignores metadata exports from client components, and this page needs
   real metadata precisely because it is the version that gets shared
   and indexed. The close-behaviour callback that the window needs is a
   function and so cannot cross the boundary as a prop, which is why
   VaultStandalone exists as a thin client wrapper rather than this file
   simply becoming a client component.

   THE INTERIOR IS STILL OPEN. The hero is final; the Gallery and
   Library below it render as titled, framed sections with nothing
   invented to fill them, pending the layout decision. When those are
   built, the image weight is the thing to design for - the gallery is
   AI-generated visuals at full resolution, so it needs thumbnails,
   lazy-loading below the fold, and full-size fetched only when an item
   is opened. Worth being explicit that a window does not solve this:
   the overlay saves the landing page's teardown, not the payload.
   ------------------------------------------------------------------ */

export const metadata: Metadata = {
	title: 'The Vault — Miftahul Islam Efaz',
	description:
		'AI-generated visuals and the tools I actually use. Free to take.',
};

export default function VaultPage() {
	return <VaultStandalone />;
}
