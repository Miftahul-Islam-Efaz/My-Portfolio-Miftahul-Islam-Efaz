'use client';

/* ------------------------------------------------------------------
   COMING BACK TO THE LANDING PAGE

   One bit of state: "the landing page is about to be mounted because a
   room was just closed, not because someone arrived."

   WHEN THE INTRO SHOULD PLAY, stated once, here:

     A RELOAD of the landing page          -> play it
     A COLD ARRIVAL from anywhere else     -> play it
     A ROOM CLOSING back onto the page     -> do NOT play it

   ---------------------------------------------------------------
   WHY MOST CLOSES NEVER NEED THIS

   There are two kinds of room, and only one kind needs a flag.

   Rooms opened OVER the landing page never leave it. VaultTeaser and
   the work gallery both render their window from component state and
   write the URL with pushState, so closing pops that entry and the
   page is revealed exactly as it was left, scroll position and all.
   No new document, no new HomeShell, and therefore no curtain. The
   intro cannot play on those paths, and no flag is involved.

   A DIRECT load of /vault is a different document. There is no landing
   page underneath to reveal, so closing has to navigate to one - and
   what arrives is a brand new HomeShell, which quite reasonably plays
   the intro and starts at the top. That reads as the site reloading
   itself, which is the defect this exists to prevent.

   So the close writes this, and HomeShell reads it: skip the curtain,
   and go straight to the section the room's door is in.

   ---------------------------------------------------------------
   IT CARRIES THE SECTION, NOT JUST A YES

   It used to be the bare string '1', which could only ever mean the
   Vault. The work gallery has a door too - the helix in #projects -
   and if it is ever given a real /work route, that route's close needs
   the identical treatment pointed at a different place. Storing WHERE
   costs nothing and means the next room does not have to invent a
   second key.

   ---------------------------------------------------------------
   WHY sessionStorage AND NOT MODULE SCOPE

   lib/vaultOrigin.ts next door is deliberately module scope, because
   its producer and consumer are alive in the same document at the same
   moment and it is rewritten sixty times a second.

   This one has to cross a NAVIGATION. router.push is a client
   transition today, so a module variable would in fact survive it -
   but only by accident: any future change that makes that close a real
   document load (a hard navigation, a redirect, an <a href>) would
   silently take the intro-skip with it, and the bug would come back
   looking exactly like it does now. sessionStorage survives both, and
   is scoped to the tab, so it cannot leak into a new session.

   AND IT MUST BE CONSUMED. A flag left set would skip the curtain on
   the next genuine reload in this tab - which is the ONE case the
   visitor asked to keep. HomeShell clears it on mount, before it is
   used for anything else, so a reload always plays the intro.
   ---------------------------------------------------------------

   Every access is wrapped. sessionStorage throws rather than returning
   null when storage is disabled or a quota is hit, and none of this is
   worth a blank page: the fallback is simply that the intro plays.
   ------------------------------------------------------------------ */

const KEY = 'vault_return';

/** The id of the element the return should land on. */
export type ReturnSection = 'vault' | 'projects';

const DEFAULT_SECTION: ReturnSection = 'vault';

export type Homecoming = {
	returning: boolean;
	section: ReturnSection;
};

/** Written by a room's close, just before it navigates home. */
export const markReturnHome = (section: ReturnSection = DEFAULT_SECTION) => {
	try {
		sessionStorage.setItem(KEY, section);
	} catch {
		/* Ignored - see the header. The intro plays; nothing breaks. */
	}
};

/** The original name, kept so the Vault's route reads as it always did. */
export const markVaultReturn = () => markReturnHome('vault');

/** Read WITHOUT consuming, so it is safe to call during render.
 *
 *  HomeShell needs the answer in a useState initialiser - the curtain
 *  has to be absent on the very first render, not removed by an effect
 *  one frame later, which would flash it. Initialisers can run twice
 *  (StrictMode), so this must stay idempotent: clearing belongs in
 *  clearReturnHome, called once from an effect. */
export const peekReturnHome = (): Homecoming => {
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return { returning: false, section: DEFAULT_SECTION };

		/* '1' is the value this key held before it carried a section.
		   Anything unrecognised means the Vault, which is what the flag
		   meant when it was only ever written by one caller. */
		return {
			returning: true,
			section: raw === 'projects' ? 'projects' : DEFAULT_SECTION,
		};
	} catch {
		return { returning: false, section: DEFAULT_SECTION };
	}
};

/** Just the yes/no, for callers that do not care where. */
export const peekVaultReturn = (): boolean => peekReturnHome().returning;

/** Consume it. Must happen, or the next genuine reload in this tab
 *  would skip the intro - see the header. */
export const clearReturnHome = () => {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		/* Ignored - see the header. */
	}
};

/** The original name. */
export const clearVaultReturn = clearReturnHome;
