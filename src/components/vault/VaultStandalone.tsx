'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { markVaultReturn } from '@/lib/vaultReturn';
import VaultWindow from './VaultWindow';

/* ------------------------------------------------------------------
   THE VAULT, ARRIVED AT DIRECTLY.

   Rendered by app/vault/page.tsx - the real route - which is what you
   get on a cold load, a shared link, a bookmark or a crawl. The
   landing page's own folder never comes through here: VaultTeaser
   renders the window from component state, over itself.

   SAME COMPONENT, ONE DIFFERENCE: how closing behaves.

     - From the teaser: there is a landing page mounted underneath and
       a pushState entry to pop, so closing is history.back() and the
       page behind is revealed exactly as it was left.
     - Direct: there is nothing underneath. Back would leave the site
       entirely - or do nothing at all, on a fresh tab with no history -
       so closing pushes home instead.

   ---------------------------------------------------------------
   WHY THE PUSH IS ANNOUNCED FIRST

   Pushing home mounts a brand new HomeShell, and a new HomeShell plays
   the intro curtain and starts at the top of the document. From the
   visitor's side that is indistinguishable from the site reloading
   itself - they closed a window and got a title sequence.

   markVaultReturn leaves one flag saying this navigation is a RETURN,
   which HomeShell reads on its first render to skip the curtain and go
   straight to the Vault section - the place the folder sits, which is
   where they would have been standing had they never left. See
   lib/vaultReturn.ts for why that flag is storage and not a variable.

   Written before the push, not after: once router.push runs, this
   component is on its way out and any work queued after it is racing
   the unmount.
   ---------------------------------------------------------------

   This wrapper exists only to supply that callback. A function cannot
   cross the server/client boundary as a prop, and page.tsx has to stay
   a server component to export `metadata`, so the two concerns are
   split rather than turning the route itself into a client component
   and losing its metadata.

   Deliberately NOT a second copy of the hero. The window and the
   document render the same component and read the same content module,
   so the two presentations cannot drift - a difference that would only
   ever be noticed by someone who deep-linked.
   ------------------------------------------------------------------ */

export const VaultStandalone: React.FC = () => {
	const router = useRouter();

	/* Prefetch home so the close's navigation commits in a frame rather
	   than a beat - the window holds still on screen until it does. */
	useEffect(() => {
		router.prefetch('/');
	}, [router]);

	return (
		<VaultWindow
			/* There is nothing behind this window but the empty black
			   document, so playing the outro HERE wipes down to black and
			   then makes the visitor wait for the landing page to build -
			   the reported defect. Instead the close navigates home
			   immediately, and HomeShell - reading the return flag - mounts
			   this same window with startClosing: the outro plays over the
			   LIVE landing page, revealing it exactly as the open covered
			   it. */
			onCloseStart={() => {
				markVaultReturn();
				router.push('/');
			}}
			/* Never fires on this route: the navigation unmounts the window
			   first. The landing side's copy owns the end of the outro. */
			onClose={() => {}}
		/>
	);
};

export default VaultStandalone;
