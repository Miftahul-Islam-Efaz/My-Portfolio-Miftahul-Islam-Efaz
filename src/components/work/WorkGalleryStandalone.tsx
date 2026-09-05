'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { markReturnHome } from '@/lib/vaultReturn';
import { useCaseStudyOverlay } from '@/hooks/useCaseStudyOverlay';
import { getCaseStudy } from './caseStudyData';
import { WORK_PROJECTS } from './workProjectsData';
import type { WorkGallerySelection } from './WorkGalleryWindow';

/* Both windows portal into document.body, so they are client-only in the
   carousel too - ssr: false matches that contract exactly. */ const WorkGalleryWindow = dynamic(() => import('./WorkGalleryWindow'), {
	ssr: false,
});
const CaseStudyWindow = dynamic(
	() => import('./case-study/CaseStudyWindow'),
	{ ssr: false }
);

/* ------------------------------------------------------------------
   THE WORK GALLERY, ARRIVED AT DIRECTLY.

   Rendered by app/work/page.tsx - the real route - which is what a
   cold load, a shared link, a bookmark or a crawler gets. The landing
   page's own copy never comes through here: DitherCarousel renders
   the window from component state, over the helix, and writes #work
   with pushState.

   SAME COMPONENT, ONE DIFFERENCE: how closing behaves.

     - From the carousel: there is a landing page mounted underneath
       and a history entry to pop, so closing rewinds the hash and the
       page is revealed exactly as it was left.
     - Direct: there is nothing underneath. Back would leave the site
       entirely - or do nothing at all on a fresh tab - so closing
       pushes home instead, after marking the return so HomeShell
       skips the intro curtain and lands on #projects, the section the
       gallery's door (the helix) lives in. markReturnHome('projects')
       is the branch lib/vaultReturn.ts was already built for - its
       header says a real /work route's close needs the identical
       treatment pointed at the other section.

   NO OUTRO IS PLAYED HERE. The vault's route learned this the hard
   way: a wipe played over the empty black document just makes the
   visitor watch an animation and then wait for the landing page to
   build. The close navigates immediately instead; the gallery simply
   is gone and the landing page is there, already scrolled to the
   helix - the same state Back produces from the carousel path.

   SELECTING A TILE STILL WORKS. A case study is not a route of its
   own (it lives at a #work/<slug> hash on whatever page mounted it),
   so the standalone route mounts the same overlay controller the
   carousel does and the study opens OVER the gallery. Backing out of
   the study returns to the grid; closing the grid goes home.

   This wrapper exists only to supply those callbacks. A function
   cannot cross the server/client boundary as a prop, and page.tsx has
   to stay a server component to export `metadata`, so the two
   concerns are split - the vault route made the same choice.
   ------------------------------------------------------------------ */

export const WorkGalleryStandalone: React.FC = () => {
	const router = useRouter();

	/* The overlay controller the carousel uses, minus onOccludedChange:
	   there is no helix underneath this route to pause. */ const overlay = useCaseStudyOverlay();

	/* Prefetch home so the close's navigation commits in a frame rather
	   than a beat - same reasoning as VaultStandalone. */ useEffect(() => {
		router.prefetch('/');
	}, [router]);

	/* The two-phase close the carousel runs (closing flag, timer, then
	   unmount) exists to play the wipe. Here the wipe has nothing worth
	   covering, so the close IS the navigation - one step, not two. */ const closeToHome = useCallback(() => {
		markReturnHome('projects');
		router.push('/');
	}, [router]);

	/* A tile click opens the study OVER the gallery - the gallery is not
	   closed, so backing out of the study returns to the grid where it
	   was left. Identical to the carousel's openStudyFromGallery. */ const openStudyFromGallery = useCallback(
		(selection: WorkGallerySelection) => {
			overlay.open(selection.id, { x: selection.x, y: selection.y });
		},
		[overlay]
	);

	const openStudy = overlay.openId ? getCaseStudy(overlay.openId) : undefined;

	return (
		<>
			<WorkGalleryWindow
				projects={WORK_PROJECTS}
				/* Never closing on this route: the navigation unmounts the
				   window, so there is no exit animation to keep alive. */
				closing={false}
				onSelect={openStudyFromGallery}
				onClose={closeToHome}
			/>
			{openStudy ? (
				<CaseStudyWindow
					study={openStudy}
					origin={overlay.origin}
					closing={overlay.closing}
					onClose={overlay.close}
					onOpenStudy={overlay.open}
				/>
			) : null}
		</>
	);
};

export default WorkGalleryStandalone;
