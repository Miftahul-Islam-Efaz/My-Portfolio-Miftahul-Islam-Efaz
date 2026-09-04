/* ------------------------------------------------------------------
   WHERE THE VAULT WAS OPENED FROM

   The Vault window expands out of the FOLDER'S LIT MOUTH - not out of
   the pixel that was clicked. Both the panel's clip-path and the WebGL
   burst in VaultOpening are centred on the value this module hands out.

   ---------------------------------------------------------------
   WHY THE MOUTH AND NOT THE CLICK

   The first version used the pointer position, which is the obvious
   choice and reads badly: the folder is a photograph, and a window that
   grows from wherever you happened to press has no relationship to the
   object in it. Opening from the mouth is what makes the window feel
   like the contents of the folder rather than a modal that a folder
   happens to trigger. It also means a keyboard activation - which has
   no coordinates at all - gets the same opening as a mouse click.

   The mouth is a MOVING TARGET. It is derived every frame through the
   hand's live transform (scroll spring, wrist rotation, scale, cursor
   parallax), so nothing outside the teaser hook can compute it. Hence
   this module: the hook publishes, the window consumes.
   ---------------------------------------------------------------
   WHY MODULE SCOPE, AND NOT STATE OR CONTEXT

     - The producer is the landing page's teaser hook; the consumer is
       rendered by a different route segment (app/@modal/(.)vault) that
       does not exist yet at press time. There is no common provider,
       and adding one would mean wrapping the app to carry four numbers.
     - It must be readable SYNCHRONOUSLY on the window's first render.
       The expansion starts on the first painted frame, so an
       effect-then-state round trip would animate from the fallback for
       a frame and visibly jump.
     - It is intentionally NOT reactive. Nothing should re-render when
       it changes - and it changes sixty times a second.

   Viewport coordinates throughout, because that is what the window's
   fixed-position panel is masked in.
   ------------------------------------------------------------------ */

export type VaultOrigin = {
	/** Viewport pixels. */
	x: number;
	y: number;
	/** Radius of the mouth's own glow, in px. The burst's flare is sized
	 *  from this so it starts as the light that is already there. */
	radius: number;
	/** The direction the archive escapes in, in degrees - the same angle
	 *  the sand uses. The burst leans this way. */
	angle: number;
};

/** What the teaser publishes, plus when. */
export type VaultMouth = VaultOrigin & {
	/** performance.now() of the frame this was measured on. */
	at: number;
};

/** For arrivals with no live teaser: a deep link that soft-navigates, a
 *  browser Back, a restored session. Roughly where the folder sits, so
 *  even the fallback grows from about the right place rather than from
 *  the dead centre of the screen. */
const FALLBACK = { x: 0.5, y: 0.58 };
const FALLBACK_RADIUS = 90;
/** Matches VAULT_DUST.angle - up and to the right. */
const FALLBACK_ANGLE = -36;

/** How stale a published mouth may be before it is ignored, in ms.
 *
 *  The teaser only runs its loop while it is near the viewport, so a
 *  value from a section that has been scrolled away from is not just
 *  old, it is WRONG - the sticky stage has moved since. Roughly a dozen
 *  frames: long enough to survive the gap between the press and the
 *  window mounting, short enough that a stale value can never be used. */
const MOUTH_MAX_AGE = 250;

let clicked: { x: number; y: number } | null = null;
let mouth: VaultMouth | null = null;

/** Called on pointerdown - NOT on click. By the time a click handler
 *  runs the router may already be transitioning, and a keyboard
 *  activation reports 0,0 which would drag the origin into the corner.
 *
 *  This is now only a FALLBACK for the mouth. It is kept because the
 *  teaser is not the only possible entrance to the Vault - a nav link
 *  or a card elsewhere has a click but no folder. */
export const setVaultOrigin = (next: { x: number; y: number }) => {
	clicked = next;
};

/** Called every frame by useVaultTeaser while the section is live.
 *
 *  Deliberately a plain assignment with no allocation guard: it is hit
 *  sixty times a second, and the object it is handed is already built
 *  by the caller. */
export const setVaultMouth = (next: VaultMouth) => {
	mouth = next;
};

/** Read once, at the window's first render, in CSS pixels.
 *
 *  Preference order: a fresh mouth, then the click, then the fallback.
 *
 *  The click is CONSUMED here, so opening the Vault a second time from
 *  somewhere else cannot inherit a stale coordinate from the last time.
 *  The mouth is not consumed - it is a live reading, and clearing it
 *  would only mean the next open falls back for no reason. */
export const takeVaultOrigin = (): VaultOrigin => {
	const fromClick = clicked;
	clicked = null;

	const now = typeof performance === 'undefined' ? 0 : performance.now();
	if (mouth && now - mouth.at < MOUTH_MAX_AGE) {
		return {
			x: mouth.x,
			y: mouth.y,
			radius: mouth.radius,
			angle: mouth.angle,
		};
	}

	if (fromClick) {
		return {
			x: fromClick.x,
			y: fromClick.y,
			radius: FALLBACK_RADIUS,
			angle: FALLBACK_ANGLE,
		};
	}

	/* SSR-safe: this module can be imported by a server component's
	   subtree, so `window` cannot be assumed. */
	if (typeof window === 'undefined') {
		return { x: 0, y: 0, radius: FALLBACK_RADIUS, angle: FALLBACK_ANGLE };
	}

	return {
		x: window.innerWidth * FALLBACK.x,
		y: window.innerHeight * FALLBACK.y,
		radius: FALLBACK_RADIUS,
		angle: FALLBACK_ANGLE,
	};
};

/** Read the live mouth WITHOUT consuming anything, for the landing
 *  page's own use - the flare that fills the gap before the window
 *  arrives has to be placed on the same point the window will open
 *  from, and it is drawn while the teaser is still the only thing on
 *  screen.
 *
 *  Returns null when there is no fresh reading, which is a meaningful
 *  answer rather than a failure: it means the teaser is not on screen,
 *  and a flare should not be drawn at all. Never falls back to a
 *  guess - a flare in the wrong place is worse than no flare. */
export const peekVaultMouth = (): VaultOrigin | null => {
	if (!mouth) return null;
	const now = typeof performance === 'undefined' ? 0 : performance.now();
	if (now - mouth.at >= MOUTH_MAX_AGE) return null;
	return {
		x: mouth.x,
		y: mouth.y,
		radius: mouth.radius,
		angle: mouth.angle,
	};
};
