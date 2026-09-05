import type { Metadata } from 'next';

import WorkGalleryStandalone from '@/components/work/WorkGalleryStandalone';

/* ------------------------------------------------------------------
   /work - THE REAL ROUTE.

   This is what a cold load, a shared link, a bookmark or a crawler
   gets. Arrivals from the landing page never come through here: the
   helix section opens the gallery from component state and writes
   #work with pushState, so the landing page is never unmounted.

   TWO PRESENTATIONS, ONE GALLERY - but only one ADDRESS. Unlike the
   vault, whose window owns a real path, the landing page's gallery
   lives at a hash. A hash is not a resource a crawler can fetch -
   everything after # is client-side - so THIS route is the address
   the sitemap lists and the one a shared link carries. The hash on
   the landing page stays as the in-page anchor it always was.

   Kept as a server component so `metadata` can be exported - Next.js
   ignores metadata exports from client components, and this page
   needs real metadata precisely because it is the version that gets
   shared and indexed. The close/select callbacks the windows need are
   functions and so cannot cross the boundary as props, which is why
   WorkGalleryStandalone exists as a thin client wrapper rather than
   this file simply becoming a client component - the same split
   app/vault/page.tsx made, for the same reason.
   ------------------------------------------------------------------ */

export const metadata: Metadata = {
	title: 'Selected Work — Miftahul Islam Efaz',
	description:
		'Every shipped project, searchable and filterable - open any tile for the full case study.',
};

export default function WorkPage() {
	return <WorkGalleryStandalone />;
}
