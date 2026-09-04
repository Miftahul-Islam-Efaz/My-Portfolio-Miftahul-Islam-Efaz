'use client';

import { useCallback, useEffect, useRef } from 'react';

import { driveImage } from '@/lib/driveImage';
import { VAULT_HERO_IMAGE } from '@/components/vault/vaultPageContent';

/* ------------------------------------------------------------------
   WARMING THE VAULT

   Fetches the Vault's hero photograph while the user is still scrolling
   toward the teaser, so the window opens onto a decoded image instead
   of onto black.

   ---------------------------------------------------------------
   THIS HOOK USED TO DO MUCH MORE, AND ALL OF IT WAS A WORKAROUND.

   The first click on the folder cost about three seconds and every
   click after it was free - the signature of a cold ROUTE, not of a
   cold animation. So this hook also called router.prefetch('/vault')
   and, in development, fetch('/vault').

   Both are gone, because the route they were warming is gone: the
   window is now a client overlay owned by VaultTeaser, rendered from
   component state with a static import. There is nothing on the click
   path left to fetch, which is a real fix rather than a faster
   workaround.

   DO NOT REINTRODUCE A ROUTER HERE. If a prefetch ever looks necessary
   again, something has been put back on the click path and THAT is the
   defect. Worth knowing for the archaeology: router.prefetch was inert
   in development anyway - Next.js disables prefetching in `next dev` -
   which is exactly why the dev-only fetch() had to exist beside it.
   ---------------------------------------------------------------

   WHY AN IMAGE PRELOAD IS NOT ALSO A WORKAROUND: the hero is a
   full-bleed photograph revealed by a mask that starts on the click
   frame. Nothing can make it decode instantly at that moment, so the
   only options are to fetch it earlier or to open onto an empty frame.
   ------------------------------------------------------------------ */

export const useVaultWarmup = (rootRef: React.RefObject<HTMLElement | null>) => {
	/* One-shot. The observer fires on every intersection and the trigger
	   also warms on hover, so without this the same image request would
	   be kicked off repeatedly. */
	const done = useRef(false);

	const warm = useCallback(() => {
		if (done.current) return;
		done.current = true;

		/* A bare Image() rather than a <link rel=preload>: this needs to
		   happen at a moment decided by the scroll position, and a preload
		   tag injected late is just a fetch with extra steps. Through
		   driveImage so it hits the same proxied, immutably cached URL the
		   window itself will request - a different URL would warm nothing. */
		const img = new Image();
		img.decoding = 'async';
		img.src = driveImage(VAULT_HERO_IMAGE);
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || done.current) return;

		/* Older browsers and jsdom: warm immediately rather than never. */
		if (typeof IntersectionObserver === 'undefined') {
			warm();
			return;
		}

		/* Two viewports of lead time. The teaser is a tall sticky section at
		   the very bottom of the page, so by the time it is actually on
		   screen the user is already looking at the folder - warming then
		   would be too late to matter. */
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				warm();
				observer.disconnect();
			},
			{ rootMargin: '200% 0px' }
		);

		observer.observe(root);
		return () => observer.disconnect();
	}, [rootRef, warm]);

	/* Returned so the trigger can warm on hover as a last chance - for
	   anyone who arrived by anchor link, or scrolled faster than the
	   observer's lead time. Safe to call repeatedly. */
	return warm;
};

export default useVaultWarmup;
