'use client';

import { uiSoundHandlers } from '@/lib/uiSounds';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { driveImage } from '@/lib/driveImage';
import { setVaultOrigin } from '@/lib/vaultOrigin';
import { getLenis } from '@/lib/scroll';
import { VAULT_HREF, VAULT_PRESS } from '@/config/vault';
import { useVaultTeaser } from '@/hooks/useVaultTeaser';
import { useVaultWarmup } from '@/hooks/useVaultWarmup';
import {
	VAULT_ARIA_LABEL,
	VAULT_CUE,
	VAULT_FALLBACK_HEADING,
	VAULT_FOLDER_FLIGHT,
	VAULT_FOLDER_IMAGE,
	VAULT_HAND_IMAGE,
	VAULT_HAND_IMAGE_ACTIVE,
} from './vaultContent';
import VaultWindow from './VaultWindow';

/* ------------------------------------------------------------------
   THE VAULT TEASER - markup, and the door

   The landing page's only mention of the Vault. No resources are listed
   here on purpose: the section is one gesture and one door.

   SIX LAYERS, back to front:

     .vault-teaser__haze     the lit volume the archive escapes through
     .vault-teaser__glow     tight hot core on the folder's mouth
     .vault-teaser__hand     the hand + open folder, "click me" embossed
     .vault-teaser__dust     canvas sand field
     .vault-teaser__folder   the five escaping folders, same 1:1 asset
     .vault-teaser__cue      one line under the folder

   The light is split in two on purpose. The core makes the opening read
   as a SOURCE; the haze lights the space the folders and sand travel
   through, which is what stops them reading as objects on black. One
   layer cannot do both jobs - sized for the volume it washes the frame,
   sized for the opening it leaves everything around it unlit.

   NO EYEBROW. There was a "THE VAULT" label above the folder and it was
   removed: the photograph and the embossed "click me" already say what
   this is, and a caption over them was the one thing making the section
   look designed rather than shot. The heading below is visually hidden
   and exists purely so the section has a place in the document outline.

   NO MOTION CODE HERE, AND NO POSITIONS EITHER. All of it is in
   hooks/useVaultTeaser.ts, and every number is in config/vault.ts with
   the mobile overrides in config/vaultTeaserMobile.ts. The hook writes
   inline transforms to the refs below - including the cursor parallax -
   which is why these elements carry no positioning of their own beyond
   what the stylesheet gives them.

   THAT NOW INCLUDES THE CUE. It used to carry an inline
   `top: VAULT_LAYOUT.cueY` written here, and an inline style cannot be
   overridden by a stylesheet at any specificity - so the mobile sheet
   had no way to move the caption, and no way to anchor it to the bottom
   of the frame instead of to a percentage of it. The hook places it
   instead, from the same config value. React never writes to that
   element's style attribute now, so the hook's values survive the
   re-renders that a press causes.

   ==================================================================
   THIS COMPONENT OWNS THE WINDOW. THAT IS THE WHOLE PERFORMANCE STORY.
   ==================================================================

   THE DEFECT, IN THREE ROUNDS:

     1. The Vault was a page. Clicking unmounted the landing page and
        rebuilt Lenis, the pinned carousel and every WebGL context on
        the way back.
     2. Then it was an intercepting route (app/@modal/(.)vault). The
        page stayed mounted, but a route SEGMENT still has to be fetched
        before it can render: ~1s, and 2-3s on the first click in dev,
        where prefetching is disabled outright.
     3. Now it is component state and a STATIC import. There is nothing
        on the click path to fetch, compile or await. `open` flips and
        React renders the window in the same commit as the click.

   SO: DO NOT PUT A ROUTER, A PREFETCH, A DYNAMIC IMPORT OR A fetch()
   ANYWHERE NEAR THIS CLICK. Every one of those was tried and each one
   put its own latency back in front of the animation.

   THE URL IS STILL /vault, which was the user's own point - a window
   can have a URL. history.pushState writes it without asking the router
   to do anything, popstate closes the window so Back behaves, and
   app/vault/page.tsx still serves direct loads and shared links.

   THE ANCHOR STAYS A REAL <a href>, so middle-click, modified clicks,
   right-click-copy-address and crawlers all keep working - none of
   which survive a div with an onClick. Only the plain primary click is
   intercepted.

   PLAIN <img>, NOT next/image. All assets are served through our own
   /api/drive-image proxy, so they are already same-origin and cached
   immutably by that route - next/image would add a second optimisation
   hop in front of a proxy that exists to stop exactly that kind of
   extra request. See the HTTP 429 note in lib/driveImage.ts.
   ------------------------------------------------------------------ */

export const VaultTeaser: React.FC = () => {
	const rootRef = useRef<HTMLElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const handRef = useRef<HTMLDivElement>(null);
	const glowRef = useRef<HTMLDivElement>(null);
	const hazeRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	/* Index-aligned with VAULT_FOLDER_FLIGHT. A ref array rather than
	   state: these are written every scroll frame, so putting them
	   through React would re-render the section on every wheel event. */
	const folderRefs = useRef<Array<HTMLImageElement | null>>([]);

	/* React state here is only ever touched on a press or an open - never
	   during scroll, which stays entirely in the hook's frame loop. */
	const [pressed, setPressed] = useState(false);
	const [open, setOpen] = useState(false);

	const pressStart = useRef<number | null>(null);
	const timers = useRef<number[]>([]);

	useVaultTeaser({
		rootRef,
		stageRef,
		handRef,
		glowRef,
		hazeRef,
		canvasRef,
		folderRefs,
	});

	/* Only the hero photograph is warmed now. There is no route left to
	   prefetch - see the hook's header. */
	const warm = useVaultWarmup(rootRef);

	/* Any pending timer has to be cancelled if this ever unmounts, or a
	   setState fires from a component that no longer exists. */
	useEffect(
		() => () => {
			for (const id of timers.current) window.clearTimeout(id);
			timers.current = [];
		},
		[]
	);

	const after = useCallback((ms: number, fn: () => void) => {
		timers.current.push(window.setTimeout(fn, ms));
	}, []);

	/* WHERE THE DOOR WAS.

	   The window is fixed-position, so the page underneath keeps its offset
	   while it is open - which is why closing normally needs no restoration
	   at all. It stopped being true once the close pops a history entry
	   whose pathname differs from the one underneath: the browser then
	   applies ITS remembered offset for that entry, which is whatever the
	   page last sat at, and the visitor is delivered somewhere they never
	   scrolled to. Recording the offset ourselves costs one number and does
	   not care how the close was routed. */
	const doorScroll = useRef(0);

	/* OPEN. State first, URL second - in that order deliberately, so the
	   window is never waiting on the History API.

	   pushState is wrapped because it throws on a cross-origin or
	   rate-limited history write, and a failed URL update must never stop
	   the window from opening. A window with a stale URL is a cosmetic
	   problem; a folder that does nothing is a broken one. */
	const openVault = useCallback(() => {
		doorScroll.current = window.scrollY;
		setOpen(true);
		try {
			window.history.pushState({ vault: true }, '', VAULT_HREF);
		} catch {
			/* Ignored on purpose - see above. */
		}
	}, []);

	/* CLOSE. Called by the window AFTER its outro has finished.

	   The history entry is only popped if we are the ones who pushed it.
	   Calling back() unconditionally would walk the user off the site
	   when the Vault was opened from a direct load of /vault. */
	const closeVault = useCallback(() => {
		setOpen(false);
		const entry = window.history.state as { vault?: boolean } | null;
		if (entry?.vault) window.history.back();

		/* HAND THE PAGE BACK, EXPLICITLY.

		   Both halves of this are recovery from something that is SUPPOSED to
		   have happened already, and both were observed not to.

		   start(): the window stops the page Lenis on mount and starts it in
		   its cleanup, but that cleanup restarts the instance it captured AT
		   MOUNT. lib/scroll.ts is explicit that the global can be replaced by a
		   resize or a fast refresh, and restarting a replaced instance leaves
		   the live one stopped - which does not throw, it just means the page
		   never scrolls again. Starting the CURRENT instance is idempotent.

		   scrollTo(): undoes any restoration the history pop applied. force is
		   required because Lenis discards programmatic scrolls while it thinks
		   it is stopped, and immediate because this is a restoration, not a
		   journey - being flown up the page would read as the site resetting.

		   Deferred a frame so it lands after the pop, not before it. */
		requestAnimationFrame(() => {
			const lenis = getLenis();
			lenis?.start();
			if (lenis) {
				lenis.scrollTo(doorScroll.current, { immediate: true, force: true });
			} else {
				window.scrollTo({ top: doorScroll.current, behavior: 'instant' });
			}
		});
	}, []);

	/* BACK CLOSES THE WINDOW. Guarded on `open` so this listener is not
	   sitting on the page for the entire session, and so an unrelated
	   popstate cannot flip state that is already closed. */
	useEffect(() => {
		if (!open) return;
		const onPop = () => setOpen(false);
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	}, [open]);

	/* THE PRESS.

	   THE DEFECT THIS REPLACES: the pressed frame was turned on by the
	   click and turned off by a TIMER (VAULT_PRESS.release, 520ms). So
	   the folder lit up and stayed lit after the mouse button was already
	   back up. A button's pressed state has to follow the FINGER, not a
	   stopwatch: down lights it, up releases it. */
	const onPointerDown = useCallback(
		(event: React.PointerEvent<HTMLAnchorElement>) => {
			/* Secondary buttons are not a press. */
			if (event.button !== 0) return;

			/* The photograph inside the window flies from the folder's mouth;
			   this click is recorded only as a fallback for entrances that
			   have no folder to open from. Recorded on pointerdown, NOT on
			   click: a keyboard activation fires a click with clientX/Y of 0,
			   which would drag the origin into the top-left corner. */
			setVaultOrigin({ x: event.clientX, y: event.clientY });

			pressStart.current = performance.now();
			setPressed(true);
		},
		[]
	);

	/* Up, cancelled, or the pointer left the folder mid-press: the light
	   goes off. All three are releases as far as the user is concerned. */
	const onRelease = useCallback(() => {
		setPressed(false);
	}, []);

	const onClick = useCallback(
		(event: React.MouseEvent<HTMLAnchorElement>) => {
			/* Leave modified and non-primary clicks entirely alone - these are
			   "open in a new tab", and hijacking them would break a behaviour
			   people expect from every link on the web. The href is real, so
			   they land on the standalone document. */
			if (
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				event.button !== 0
			) {
				return;
			}

			/* Nothing may navigate: the window is right here. */
			event.preventDefault();

			const started = pressStart.current;
			pressStart.current = null;

			/* KEYBOARD ACTIVATION. There was no pointer, so there was no
			   press - flash one, or the folder opens the Vault with no
			   acknowledgement whatsoever. This is the ONLY path that is
			   allowed to delay the open, and it does so because there is
			   otherwise no feedback at all. */
			if (started === null) {
				setPressed(true);
				after(VAULT_PRESS.minHold, () => {
					setPressed(false);
					openVault();
				});
				return;
			}

			/* THE POINTER PATH ADDS NOTHING AT ALL.

			   An earlier build held every quick click back to VAULT_PRESS
			   .minHold so the pressed frame could always be seen. That is a
			   flat latency tax on the fastest, most deliberate clicks - the
			   ones most likely to notice it. minHold is the least time a
			   press must have been VISIBLE, not a minimum time before the
			   window may open. The release already lit and unlit the folder;
			   the window opens on this very event. */
			setPressed(false);
			openVault();
		},
		[after, openVault]
	);

	return (
		<section
			id="vault"
			ref={rootRef}
			className="vault-teaser"
			{...uiSoundHandlers}
			aria-labelledby="vault-teaser-heading"
			onContextMenu={(event) => event.preventDefault()}
			/* Press timings handed to CSS, so the stylesheet holds no numbers
			   and config/vault.ts stays the single place to tune them. */
			style={
				{
					'--vault-press-scale': `${VAULT_PRESS.scale}`,
					'--vault-press-sink': `${VAULT_PRESS.sinkDuration}ms`,
					'--vault-press-release': `${VAULT_PRESS.releaseDuration}ms`,
				} as React.CSSProperties
			}
		>
			<div ref={stageRef} className="vault-teaser__stage">
				{/* The document outline needs a real heading; the section's
				    meaning is otherwise carried entirely by two images. */}
				<h2 id="vault-teaser-heading" className="vault-teaser__sr">
					{VAULT_FALLBACK_HEADING}
				</h2>

				<div ref={hazeRef} className="vault-teaser__haze" aria-hidden="true" />
				<div ref={glowRef} className="vault-teaser__glow" aria-hidden="true" />

				<div ref={handRef} className="vault-teaser__hand">
					<Link
						href={VAULT_HREF}
						className="vault-teaser__trigger"
						aria-label={VAULT_ARIA_LABEL}
						/* Held for the whole press: :active drops the instant the
						   pointer is released, which on a quick click is a few
						   frames - and it never fires at all for keyboard
						   activation. */
						data-pressed={pressed ? 'true' : 'false'}
						/* Last chance to warm the hero image: anyone who arrived by
						   anchor link, or scrolled faster than the observer's lead
						   time, still gets a hover before a click. Safe to fire
						   repeatedly - the hook is one-shot. */
						onPointerEnter={warm}
						onPointerDown={onPointerDown}
						onPointerUp={onRelease}
						onPointerCancel={onRelease}
						onPointerLeave={onRelease}
						onClick={onClick}
					>
						{/* Resting frame. This is the one the hook measures - it
						    queries .vault-teaser__hand-img specifically, so the
						    pressed frame below must NOT carry that class, or the
						    mouth position would depend on which image decoded
						    first. */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={driveImage(VAULT_HAND_IMAGE)}
							alt=""
							className="vault-teaser__hand-img"
							draggable={false}
							/* Eagerly loaded: the hook cannot compute the folder
							   mouth, and therefore cannot place a single folder or
							   grain, until this image's real aspect ratio is known.
							   Lazy-loading it would leave the section composed
							   against a guessed 16:9 until it scrolled into view. */
							loading="eager"
							decoding="async"
						/>

						{/* Pressed frame - "click me" lit from within. The lit label
						    cannot be produced in code (there is no text node to
						    glow), so both frames are stacked and crossfaded by CSS.
						    Rendered from the start rather than swapped in on
						    demand, so it is already decoded when first needed;
						    swapping `src` on press would show a blank folder for a
						    frame. */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={driveImage(VAULT_HAND_IMAGE_ACTIVE)}
							alt=""
							className="vault-teaser__hand-glow"
							draggable={false}
							loading="eager"
							decoding="async"
							aria-hidden="true"
						/>
					</Link>
				</div>

				<canvas
					ref={canvasRef}
					className="vault-teaser__dust"
					aria-hidden="true"
				/>

				{/* One asset, five objects. Each is positioned and rotated by
				    the hook from its entry in VAULT_FOLDER_FLIGHT - so a folder
				    is added or removed by editing that array, not this markup. */}
				{VAULT_FOLDER_FLIGHT.map((_, i) => (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						key={i}
						ref={(el) => {
							folderRefs.current[i] = el;
						}}
						src={driveImage(VAULT_FOLDER_IMAGE)}
						alt=""
						className="vault-teaser__folder"
						draggable={false}
						loading="eager"
						decoding="async"
						aria-hidden="true"
					/>
				))}

				{/* NO INLINE POSITION. The hook writes `top` / `bottom` from
				    VAULT_LAYOUT.cueY on desktop and from VAULT_MOBILE_CUE below
				    the breakpoint - see the note in this file's header for why
				    it cannot be set here. */}
				<p className="vault-teaser__cue">{VAULT_CUE}</p>
			</div>

			{/* THE WINDOW. Statically imported and rendered from state, so it
			    mounts in the same commit as the click. It portals itself to
			    document.body, so its position in this tree costs nothing. */}
			{open && <VaultWindow onClose={closeVault} />}
		</section>
	);
};

export default VaultTeaser;
