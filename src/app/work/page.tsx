import type { Metadata } from 'next';

import WorkGalleryStandalone from '@/components/work/WorkGalleryStandalone';
import CaseStudyRegistry from '@/components/work/CaseStudyRegistry';
import { getCaseStudies } from '@/lib/cms/queries';

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

   BEING A SERVER COMPONENT IS ALSO WHAT LETS THE CASE STUDIES COME
   FROM THE DATABASE. getCaseStudies() is server-only; the windows
   that print a study are client-only and read it from the registry
   module. <CaseStudyRegistry> is the seam between the two. Without
   it the whole route renders the hardcoded fallback and every save
   in the admin panel looks like it did nothing.
   ------------------------------------------------------------------ */

export const metadata: Metadata = {
	title: 'Selected Work — Miftahul Islam Efaz',
	description:
		'Every shipped project, searchable and filterable - open any tile for the full case study.',
};

/* Content is editable from the admin panel, so a build-time snapshot is the
   wrong default: a save must be visible on the next request, not the next
   deploy. */
export const revalidate = 0;

export default async function WorkPage() {
	const studies = await getCaseStudies().catch(() => null);

	return (
		<CaseStudyRegistry studies={studies}>
			<WorkGalleryStandalone />
		</CaseStudyRegistry>
	);
}
