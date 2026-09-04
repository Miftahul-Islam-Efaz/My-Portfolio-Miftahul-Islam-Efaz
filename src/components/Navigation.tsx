'use client';

/* ------------------------------------------------------------------
   HEADER

   Two things only: the wordmark, and the menu pill. The pill and its
   dropdown live in components/nav/NavMenu.tsx.

   PASS HISTORY

   - The header used to carry a dashed hot-dog button that opened a
     full-screen split overlay, driven by a 48-block gsap pixel-grid
     wipe, two rotating phrases and a clock. All of it is gone: the
     dropdown replaces it outright, so MenuLink, GRID_ROWS/GRID_COLS,
     blocksRef, overlayMenuItems, handleOverlayNavigate and the gsap and
     framer-motion imports went with it. The html.menu-open rule in
     globals.css that blanked every canvas and video while the overlay
     was up is no longer set by anything here either - a small dropdown
     has no reason to shut the WebGL down.

   - mix-blend-difference came OFF the <nav>. It was standing in for
     theming: white text inverted against whatever scrolled underneath.
     It cannot coexist with the pill, which is a solid surface with a
     border and a shadow - difference blend would eat all three. The
     pill and the wordmark are built from --color-pearl / --color-
     charcoal / --color-taupe instead, and those tokens already flip
     under html.mode-inverted, which is the job the blend was doing.

   - The header now STAYS VISIBLE while something is docked into the
     menu cluster, regardless of scroll position. The vault window
     parks its CLOSE button in there (see lib/navSlot.ts); a CLOSE
     button inside a header that had faded itself out would be a trap.

   - The wordmark sets EFAZ in Boreck, declared in globals.css and
     served from /public/Fonts. No hover font swap.
   ------------------------------------------------------------------ */

import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import NavMenu from './nav/NavMenu';
import { isNavSlotBusy, subscribeNavSlot } from '../lib/navSlot';
import { requestHome } from '../lib/homeBus';
import { getLenis } from '../lib/scroll';
import {
	isInFooter,
	subscribeFooterVisibility,
} from '../lib/footerVisibility';

/* How far above the fold's bottom edge the header is allowed to appear.
   The hero owns the first screen on its own. */
const HERO_EXIT_OFFSET_PX = 120;

export default function Navigation() {
	const [scrolled, setScrolled] = useState(false);
	const [pastHero, setPastHero] = useState(false);
	const [docked, setDocked] = useState(false);
	const [inFooter, setInFooterState] = useState(false);

	useEffect(() => {
		const read = () => {
			const y = window.scrollY || window.pageYOffset || 0;
			setScrolled(y > 24);
			setPastHero(y > window.innerHeight - HERO_EXIT_OFFSET_PX);
		};

		read();
		window.addEventListener('scroll', read, { passive: true });
		window.addEventListener('resize', read);
		return () => {
			window.removeEventListener('scroll', read);
			window.removeEventListener('resize', read);
		};
	}, []);

	/* Read once on mount as well as on change: the window can be opened
	   before this subscription exists on a direct load. */
	useEffect(() => {
		setDocked(isNavSlotBusy());
		return subscribeNavSlot(() => setDocked(isNavSlotBusy()));
	}, []);

	/* Same mount-time read as the nav slot, for the same reason: a
	   direct load deep in the page can precede this subscription. */
	useEffect(() => {
		setInFooterState(isInFooter());
		return subscribeFooterVisibility(() => setInFooterState(isInFooter()));
	}, []);

	/* The footer is a full-screen photograph carrying its own FAZ DIGITAL
	   wordmark, so the header withdraws over it - two wordmarks in one
	   frame is noise. `docked` still wins, and deliberately so: the vault
	   window parks its CLOSE button in the menu cluster, and a CLOSE
	   button inside a header that had faded itself out would be a trap.
	   That contract outranks the footer. */
	const shown = (pastHero && !inFooter) || docked;

	return (
		<nav
			aria-hidden={!shown}
			className={cn(
				'fixed top-0 left-0 w-full z-[9999] flex justify-between items-center px-6 md:px-12 transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]',
				scrolled ? 'py-4' : 'py-6',
				shown
					? 'opacity-100 translate-y-0 pointer-events-auto'
					: 'opacity-0 -translate-y-6 pointer-events-none',
			)}
		>
			<button
				type="button"
				className="relative z-10 select-none cursor-pointer group bg-transparent border-0 p-0"
				title="Back to the top"
				onClick={() => {
					/* The favicon animator is a separate widget that listens for a
					   click on its own hidden trigger. Left exactly as it was. */
					const trigger = document.getElementById(
						'trigger-favicon-animator',
					);
					trigger?.click();

					/* THE WORDMARK IS THE WAY BACK, FROM ANYWHERE. Until now this
					   button did nothing but poke the favicon widget - it carried
					   title="Back to the top" and a hover colour and then went
					   nowhere, which is the one behaviour a wordmark in a fixed
					   header is universally expected to have.

					   TWO STEPS, AND THE ORDER MATTERS. This header stays mounted
					   above the vault window and the work gallery while either is
					   docked (see the `docked` contract below), so the wordmark is
					   clickable while a full-screen overlay covers the document it
					   is about to scroll. Scrolling alone would move the page
					   behind an opaque surface and look like a dead control. So:
					   ask whatever is covering the screen to stand down first,
					   then scroll.

					   `force` is load-bearing. Every overlay stops the page Lenis
					   while it is up and restarts it on unmount, and Lenis ignores
					   programmatic scrolls while it considers itself stopped - so
					   without force this scroll would be dropped in exactly the
					   case that needs it, the click that closes a room. */
					requestHome();

					const lenis = getLenis();
					if (lenis) {
						lenis.scrollTo(0, { duration: 1.2, force: true });
					} else {
						/* The mobile path, and it is not a lesser one: Lenis is not
						   installed below SMOOTH_SCROLL.mobileMaxWidth at all, so
						   native smooth scrolling is the intended behaviour here
						   rather than a fallback for a failure. */
						window.scrollTo({ top: 0, behavior: 'smooth' });
					}
				}}
				style={{ color: 'var(--color-pearl)' }}
			>
				<span className="wordmark text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase transition-colors duration-300 group-hover:text-[#b56c4b]">
					EFAZ
				</span>
			</button>

			<NavMenu />
		</nav>
	);
}
