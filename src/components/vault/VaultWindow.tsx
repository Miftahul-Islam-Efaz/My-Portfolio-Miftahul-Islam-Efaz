'use client';

import { uiSoundHandlers } from '@/lib/uiSounds';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { driveImage } from '@/lib/driveImage';
import { getLenis } from '@/lib/scroll';
import { setVaultOrigin, takeVaultOrigin, type VaultOrigin } from '@/lib/vaultOrigin';
import { getNavSlot, setNavSlotBusy, subscribeNavSlot } from '@/lib/navSlot';
import { onHomeRequest } from '@/lib/homeBus';
import { SMOOTH_SCROLL, SMOOTH_EASE, SMOOTH_TOUCH, shouldSyncTouch } from '@/config/smoothScroll';
import {
	VAULT_HERO,
	VAULT_WINDOW_MOTION,
	VAULT_WINDOW_SURFACE,
} from '@/config/vaultWindow';
import VaultGallery from './VaultGallery';
import {
	VAULT_CLOSE_LABEL,
	VAULT_HERO_EYEBROW,
	VAULT_HERO_IMAGE,
	VAULT_HERO_TITLE,
	VAULT_SECTIONS,
} from './vaultPageContent';

/* ------------------------------------------------------------------
   THE VAULT WINDOW

   Rendered directly by VaultTeaser as a client overlay, so it exists on
   the same frame as the click, and by VaultStandalone for the real
   /vault document. One component, two entrances - which is why it takes
   onClose rather than knowing how it was opened.

   The intro and outro are the case study window's, by request.
   Reference: components/work/case-study/CaseStudyWindow.tsx and
   styles/work-case-study.css. Keyframes need no start frame, so there
   are exactly two states - 'open' and 'closing' - and no painted
   'closed' state to reintroduce.

   TWO THINGS THAT WILL BREAK THIS IF THEY ARE "TIDIED":

   1. THE SCROLLER MUST NOT CARRY data-lenis-prevent WHILE THIS
      WINDOW'S OWN LENIS IS ALIVE. Lenis checks that attribute by
      walking the whole composed event path, so it cannot tell the
      page's instance from this window's. The page instance is stopped
      in JS instead, and the attribute is restored on teardown.

   2. `mounted` MUST BE IN THE DEPENDENCY LIST OF EVERY EFFECT THAT
      TOUCHES THE DOM. This component returns null until it has
      mounted, because a portal needs a document. An effect that runs
      before that finds no scroller, returns early, and - without
      `mounted` as a dependency - never runs again.

   PORTALLED TO document.body because an ancestor `transform` breaks
   position: fixed for everything inside it, and the landing page has
   ScrollTrigger pins using pinType 'transform'.
   ------------------------------------------------------------------ */
type VaultWindowProps = {
	/** Called at the END of the outro, never at the start. When
	   onCloseStart is set this never fires at all - the navigation
	   unmounts this window long before the timer would. */
	onClose: () => void;
	/** STANDALONE CLOSE. When set, close() hands over IMMEDIATELY
	   instead of playing the outro here: the standalone route has
	   nothing behind the window but the empty black document, so the
	   outro is played by the landing page instead - HomeShell mounts
	   this same window with startClosing, and the wipe reveals the
	   live page, the exact mirror of the open. */
	onCloseStart?: () => void;
	/** Render already-closing: the landing page's half of a standalone
	   close. data-state is 'closing' from the first painted frame, so
	   only the exit keyframes run - no intro, no 'open' state, nothing
	   to repaint. */
	startClosing?: boolean;
};

export const VaultWindow: React.FC<VaultWindowProps> = ({ onClose, onCloseStart, startClosing = false }) => {
	const [mounted, setMounted] = useState(false);
	/* The ONLY motion state. There is no 'closed' - see the header.
	   startClosing mounts the window mid-outro: the exit keyframes carry
	   their own start frames, so 'closing' from the first render plays
	   the outro and nothing else. */
	const [closing, setClosing] = useState(startClosing);
	const scrollerRef = useRef<HTMLDivElement>(null);
	/* The header's dock, when there is a header. Null on the standalone
	   /vault document, which has no header to dock into. */
	const [dock, setDock] = useState<HTMLElement | null>(null);
	const exitTimer = useRef<number | null>(null);

	/* Read ONCE, synchronously, on the first render - not in an effect.
	   The photograph's flight starts from this point on its very first
	   frame, so a state round trip would animate from the fallback for a
	   frame and visibly jump. */
	const originRef = useRef<VaultOrigin | null>(null);
	if (originRef.current === null) originRef.current = takeVaultOrigin();
	const origin = originRef.current;

	useEffect(() => {
		setMounted(true);
		return () => {
			if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
		};
	}, []);

	/* THE LANDING SIDE OF A STANDALONE CLOSE. This window mounted already
	   closing; its only job is to finish the outro over the live page and
	   then hand back so HomeShell unmounts it. */
	useEffect(() => {
		if (!startClosing || !mounted) return;
		if (exitTimer.current !== null) return;
		exitTimer.current = window.setTimeout(
			onClose,
			VAULT_WINDOW_MOTION.closeDuration
		);
	}, [startClosing, mounted, onClose]);

	const close = useCallback(() => {
		/* Guard: a second Escape, or a double click on Close, would queue a
		   second timeout and restart the outro. */
		if (exitTimer.current !== null) return;
		/* STANDALONE. The outro belongs to the landing page now; this
		   window holds still until the route commits. The origin is
		   re-stashed so the landing-side window's photograph retreats to
		   the same point it flew from - takeVaultOrigin consumed it on
		   this window's own first render. */
		if (onCloseStart) {
			exitTimer.current = window.setTimeout(() => {}, 0);
			setVaultOrigin({ x: origin.x, y: origin.y });
			onCloseStart();
			return;
		}
		setClosing(true);
		/* Two-phase: play the outro, THEN hand back. */
		exitTimer.current = window.setTimeout(
			onClose,
			VAULT_WINDOW_MOTION.closeDuration
		);
	}, [onClose, onCloseStart, origin]);

	/* Freeze the page behind. Both halves are needed: stopping Lenis
	   leaves native touch scrolling alive, and the overflow lock alone
	   does not stop Lenis's own transform-based scrolling. */
	useEffect(() => {
		if (!mounted) return;
		const pageLenis = getLenis();
		/* WHERE THE PAGE WAS, BEFORE THE LOCK COLLAPSED IT.

		   The lock is `overflow: hidden` on html+body (vault-window.css). That
		   freezes the page, but it also collapses the scrollport: while it is
		   applied the document is effectively one viewport tall, so the
		   browser CLAMPS the scroll offset and the position the visitor came
		   in at is destroyed. Nothing restored it on the way out - which is
		   how exiting landed on the footer with scrolling dead.

		   Read it before stopping Lenis, while the document is still its real
		   height. See the restore in the teardown; the order there matters. */
		const restoreY = window.scrollY;
		pageLenis?.stop();
		document.documentElement.classList.add('vault-window-open');
		return () => {
			document.documentElement.classList.remove('vault-window-open');
			/* RESTORE THE OFFSET BEFORE LENIS CAN FIGHT OVER IT.

			   Removing the class gives the document its height back but NOT
			   its offset, and Lenis still holds whatever animatedScroll
			   survived the collapse. Write the native offset while Lenis is
			   still stopped, so there is one authority at a time. */
			window.scrollTo(0, restoreY);
			pageLenis?.start();
			/* RE-MEASURE THE PAGE THAT WAS FROZEN UNDERNEATH.
			   Every pinned trigger measured itself before the lock; the
			   document only regains its real height once the class above is
			   gone, so this waits a frame rather than refreshing into the
			   locked layout it is trying to correct. */
			requestAnimationFrame(() => {
				/* Refresh first: every pinned trigger measured itself before the
				   lock, and the document only regained its real height a frame
				   ago. Then re-assert the position, because refresh() restores
				   the scroll offset it measured - which can still be the
				   clamped one - and that is what re-pinned the footer.

				   `force` is NOT optional: Lenis discards programmatic scrolls
				   while it considers itself stopped and returns nothing to
				   test, so without it this fails silently (see lib/scroll.ts).
				   `immediate` skips the ease - this is a restoration, not a
				   journey. */
				ScrollTrigger.refresh();
				pageLenis?.scrollTo(restoreY, { immediate: true, force: true });
			});
		};
	}, [mounted]);

	/* Escape closes, with the same outro as the button. */
	useEffect(() => {
		if (!mounted) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [mounted, close]);

	/* So does the wordmark, which is docked directly beside this
	   window's own CLOSE and outranks it in reach: it is the one control
	   visible from every room. Same outro either way. */
	useEffect(() => {
		if (!mounted) return;
		return onHomeRequest(close);
	}, [mounted, close]);

	/* DOCK THE CLOSE BUTTON INTO THE HEADER.

	   The header is fixed at z-index 9999 and this window is at 9000, so
	   the menu pill painted straight over this window's CLOSE - both of
	   them want the top right corner. The button is RE-PARENTED into the
	   header beside the pill rather than moved or duplicated: it stays
	   the same element with the same handler, so the click, Escape and
	   the outro all still agree with each other.

	   Busy is flagged for as long as this window lives, because the
	   header hides itself until the hero has been scrolled past, and a
	   CLOSE button inside a faded-out header cannot be clicked. */
	useEffect(() => {
		if (!mounted) return;
		setNavSlotBusy(true);
		setDock(getNavSlot());
		const stop = subscribeNavSlot(() => setDock(getNavSlot()));
		return () => {
			stop();
			setNavSlotBusy(false);
		};
	}, [mounted]);

	/* THE WINDOW'S OWN LENIS. `mounted` in the deps for reason 2 above;
	   the attribute dance for reason 1. */
	useEffect(() => {
		if (!mounted) return;
		const scroller = scrollerRef.current;
		if (!scroller) return;

		const hadPrevent = scroller.hasAttribute('data-lenis-prevent');
		scroller.removeAttribute('data-lenis-prevent');

		const lenis = new Lenis({
			wrapper: scroller,
			content: scroller.firstElementChild as HTMLElement,
			duration: SMOOTH_SCROLL.duration,
			easing: SMOOTH_EASE,
			orientation: 'vertical',
			gestureOrientation: 'vertical',
			smoothWheel: true,
			wheelMultiplier: SMOOTH_SCROLL.wheelMultiplier,
			touchMultiplier: SMOOTH_SCROLL.touchMultiplier,
			/* Matches the page - see shouldSyncTouch in
			   config/smoothScroll.ts. */
			syncTouch: shouldSyncTouch(),
			syncTouchLerp: SMOOTH_TOUCH.syncTouchLerp,
			touchInertiaExponent: SMOOTH_TOUCH.touchInertiaExponent,
			overscroll: false,
			respectReducedMotion: true,
			prevent: node => node.classList.contains('vault-detail'),
			/* Driven off gsap's ticker rather than its own rAF, so the window
			   and every gsap animation on the page share one clock. */
			autoRaf: false,
		});

		// Search/category changes synchronise both the native offset and Lenis'
		// target, cancelling any old wheel momentum before the new set renders.
		const showResults = (event: Event) => {
			const target = (event as CustomEvent<HTMLElement | null>).detail;
			if (!target) return;
			lenis.resize();
			lenis.scrollTo(target, { offset: -16, immediate: true });
		};
		scroller.addEventListener('vault:results', showResults);
		const tick = (time: number) => lenis.raf(time * 1000);
		gsap.ticker.add(tick);

		return () => {
			scroller.removeEventListener('vault:results', showResults);
			gsap.ticker.remove(tick);
			lenis.destroy();
			if (hadPrevent) scroller.setAttribute('data-lenis-prevent', '');
		};
	}, [mounted]);

	/* startClosing only happens on a client-side navigation home, where
	   document.body already exists - so the outro window may portal on the
	   very first render. Skipping the mounted gate here is what lets it
	   paint in the SAME commit as the landing page: without it there is one
	   uncovered frame between the standalone window unmounting and this one
	   arriving, and the close flashes the bare page mid-handover. */
	if (!mounted && !startClosing) return null;

	const m = VAULT_WINDOW_MOTION;

	/* Motion config handed to CSS as custom properties, so the stylesheet
	   holds no tunable numbers and config/vaultWindow.ts stays the single
	   place to retime the window. */
	const vars = {
		'--vw-origin-x': `${origin.x}px`,
		'--vw-origin-y': `${origin.y}px`,
		'--vw-open': `${m.openDuration}ms`,
		'--vw-close': `${m.closeDuration}ms`,
		'--vw-open-ease': m.openEase,
		'--vw-close-ease': m.closeEase,
		'--vw-veil': `${m.veilDuration}ms`,
		'--vw-veil-opacity': `${m.veilOpacity}`,
		'--vw-plate': `${m.plateDuration}ms`,
		'--vw-plate-scale': `${m.plateFromScale}`,
		'--vw-plate-rotate': `${m.plateFromRotation}deg`,
		'--vw-plate-exit': `${m.plateExitDuration}ms`,
		'--vw-title-delay': `${Math.round(m.openDuration * m.titleDelayRatio)}ms`,
		'--vw-title-duration': `${m.titleDuration}ms`,
		'--vw-title-stagger': `${m.titleStagger}ms`,
		'--vw-title-rise': `${m.titleRise}px`,
		'--vw-meta-delay': `${Math.round(m.openDuration * m.metaDelayRatio)}ms`,
		'--vw-meta-duration': `${m.metaDuration}ms`,
		'--vw-title-y': `${VAULT_HERO.titleY * 100}%`,
		'--vw-title-tracking': `${VAULT_HERO.titleTracking}em`,
		'--vw-scrim': `${VAULT_HERO.scrim}`,
		'--vw-base': VAULT_WINDOW_SURFACE.base,
		'--vw-text-hi': VAULT_WINDOW_SURFACE.textHi,
		'--vw-text-mid': VAULT_WINDOW_SURFACE.textMid,
		'--vw-ember': VAULT_WINDOW_SURFACE.ember,
		'--vw-hair': VAULT_WINDOW_SURFACE.hair,
	} as React.CSSProperties;

	return createPortal(
		<div
			className="vault-window"
			{...uiSoundHandlers}
			data-state={closing ? 'closing' : 'open'}
			style={vars}
			role="dialog"
			aria-modal="true"
			aria-label={VAULT_HERO_TITLE}
		>
			<div className="vault-window__veil" aria-hidden="true" />

			{/* THE WIPE SURFACE. Everything rides inside it, so nothing is
			    visible before the mask has passed it. */}
			<div className="vault-window__panel" onAnimationEnd={event => {
          if (event.target === event.currentTarget && event.animationName === 'vw-wipe-in') event.currentTarget.dataset.settled = 'true';
        }}>
				<div ref={scrollerRef} className="vault-window__scroller">
					<div>
						<section className="vault-window__hero">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={driveImage(VAULT_HERO_IMAGE)}
								alt=""
								className="vault-window__plate"
								draggable={false}
								/* Eager: this is the first thing the window shows and
								   the mask starts immediately, so a lazy hero would
								   open onto empty black. Also preloaded before the
								   click - see hooks/useVaultWarmup.ts. */
								loading="eager"
								decoding="async"
								aria-hidden="true"
							/>
							<div className="vault-window__scrim" aria-hidden="true" />

							<div className="vault-window__hero-copy">
								{/* Split per glyph so each letter rises on its own
								    delay. aria-hidden with a real heading beside it. */}
								<h1 className="vault-window__sr">{VAULT_HERO_TITLE}</h1>
								<div className="vault-window__title" aria-hidden="true">
									{VAULT_HERO_TITLE.split('').map((char, i) => (
										<span
											key={`${char}-${i}`}
											className="vault-window__glyph"
											style={{ ['--i' as string]: i }}
										>
											<span className="vault-window__glyph-inner">
												{char === ' ' ? '\u00A0' : char}
											</span>
										</span>
									))}
								</div>

								<p className="vault-window__eyebrow">
									{VAULT_HERO_EYEBROW}
								</p>
							</div>
						</section>

						{/* The interior. The gallery renders BARE - no index,
						    title or blurb; the pill toggle under the grid is the
						    only control it needs. The library keeps its head.

						    THE SECTION ELEMENT AND ITS id STAY IN BOTH CASES.
						    They are the anchor targets, so branching the whole
						    <section> rather than only its contents would quietly
						    break /vault#gallery. */}
						<div className="vault-window__body">
							{VAULT_SECTIONS.map((section) => (
								<section
									key={section.id}
									id={section.id}
									className="vault-window__section"
								>
									{section.id === 'gallery' ? (
										<VaultGallery />
									) : (
										<>
											<div className="vault-window__section-head">
												<span className="vault-window__section-index">
													{section.index}
												</span>
												<h2 className="vault-window__section-title">
													{section.title}
												</h2>
											</div>
											<p className="vault-window__section-blurb">
												{section.blurb}
											</p>
										</>
									)}
								</section>
							))}
						</div>
					</div>
				</div>

				{dock ? (
					/* Docked into the header, immediately left of the pill. */
					createPortal(
						<button
							type="button"
							className="vault-window__close vault-window__close--docked"
							data-state={closing ? 'closing' : 'open'}
							onClick={close}
							aria-label={VAULT_CLOSE_LABEL}
						>
							<span className="vault-window__close-text">Close</span>
						</button>,
						dock
					)
				) : (
					/* No header on this document, so keep the corner. */
					<button
						type="button"
						className="vault-window__close"
						onClick={close}
						aria-label={VAULT_CLOSE_LABEL}
					>
						<span className="vault-window__close-text">Close</span>
					</button>
				)}
			</div>
		</div>,
		document.body
	);
};

export default VaultWindow;
