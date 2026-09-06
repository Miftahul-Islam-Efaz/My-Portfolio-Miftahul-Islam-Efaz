'use client';

// Work keeps its window/navigation lifecycle; the gallery UI is shared with Vault.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { driveImage } from '@/lib/driveImage';
import { getLenis } from '@/lib/scroll';
import { getNavSlot, setNavSlotBusy, subscribeNavSlot } from '@/lib/navSlot';
import { onHomeRequest } from '@/lib/homeBus';
import { SMOOTH_SCROLL, SMOOTH_EASE, SMOOTH_TOUCH, shouldSyncTouch } from '@/config/smoothScroll';
import VaultGallery from '@/components/vault/VaultGallery';
import type { WorkProjectCardData } from './types';
import {
	WORK_GALLERY_COPY,
	WORK_GALLERY_MOTION,
	WORK_GALLERY_HASH,
} from '@/config/workGallery';

/* THE SENTINEL FOR THE All CHIP. Deliberately not the empty string: a project with no category IS the empty string, and the two must not collide. */ const WG_ALL = "__all__"; export type WorkGallerySelection = { id: string; x: number; y: number };

export default function WorkGalleryWindow({
	projects,
	closing,
	onSelect,
	onClose,
}: {
	projects: WorkProjectCardData[];
	/** True while the exit animation plays. The parent keeps us mounted. */
	closing: boolean;
	onSelect: (selection: WorkGallerySelection) => void;
	onClose: () => void;
}) {
	const [mounted, setMounted] = useState(false);

	/* The header's dock, when there is a header to dock into. */
	const [dock, setDock] = useState<HTMLElement | null>(null);

	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const closeRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	/* FREEZE THE PAGE UNDERNEATH. Stopped in JS rather than muted with
	   data-lenis-prevent - see rule 1 in the header. */
	useEffect(() => {
		if (!mounted) return;

		const page = getLenis();
		/* WHERE THE PAGE WAS, BEFORE THE LOCK COLLAPSED IT.

		   The lock is `overflow: hidden` on html+body (work-gallery.css). That
		   freezes the page, but it also collapses the scrollport: while it is
		   applied the document is effectively one viewport tall, so the
		   browser CLAMPS the scroll offset and the position the visitor came
		   in at is destroyed. Nothing restored it on the way out - which is
		   how exiting landed on the footer with scrolling dead.

		   Read it before stopping Lenis, while the document is still its real
		   height. See the restore in the teardown; the order there matters. */
		const restoreY = window.scrollY;
		page?.stop();
		document.documentElement.classList.add('work-gallery-open');

		/* Focus moves into the window, so the first Tab is inside it and
		   Escape has an obvious owner. */
		closeRef.current?.focus();

		return () => {
			document.documentElement.classList.remove('work-gallery-open');
			/* RESTORE THE OFFSET BEFORE LENIS CAN FIGHT OVER IT.

			   Removing the class gives the document its height back but NOT
			   its offset, and Lenis still holds whatever animatedScroll
			   survived the collapse. Write the native offset while Lenis is
			   still stopped, so there is one authority at a time. */
			window.scrollTo(0, restoreY);
			page?.start();
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
				page?.scrollTo(restoreY, { immediate: true, force: true });
			});
		};
	}, [mounted]);

	/* AN ADDRESS, SO BACK MEANS BACK.

	   A hash and not a route: /#work reloads harmlessly onto the landing
	   page, where a real /work path would 404 until the route exists.
	   Same idiom as the vault's #vault.

	   The cleanup only rewinds the URL if the hash is STILL ours - a
	   close that came from the Back button has already moved it, and
	   rewriting it again would eat a second history entry. */
	useEffect(() => {
		if (!mounted) return;

		const { pathname, search, hash } = window.location;
		if (hash !== WORK_GALLERY_HASH) {
			window.history.pushState(null, '', WORK_GALLERY_HASH);
		}

		const onPop = () => {
			if (window.location.hash !== WORK_GALLERY_HASH) onClose();
		};

		window.addEventListener('popstate', onPop);
		return () => {
			window.removeEventListener('popstate', onPop);
			if (window.location.hash === WORK_GALLERY_HASH) {
				window.history.replaceState(null, '', pathname + search);
			}
		};
	}, [mounted, onClose]);

	useEffect(() => {
		if (!mounted) return;

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};

		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [mounted, onClose]);

	/* THE WORDMARK IS ALSO A WAY OUT. The header sits above this window
	   and stays visible while the close is docked into it, so EFAZ is on
	   screen and clickable the whole time this room is open. Answering it
	   is the same close the button and Escape already run - the hash
	   rewind, the page Lenis restart and the outro all come with it for
	   free. See lib/homeBus.ts for why this is an event and not a prop. */
	useEffect(() => {
		if (!mounted) return;
		return onHomeRequest(onClose);
	}, [mounted, onClose]);

	/* THE CLOSE GOES IN THE HEADER, BESIDE THE MENU PILL.

	   Same dock the vault window uses. It is a registry rather than
	   React context because the two sides sit across a portal boundary,
	   and `busy` exists because the header hides itself until the hero
	   has been scrolled past - which it has not, if the gallery was
	   opened from the work section. */
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

	/* THE WINDOW'S OWN LENIS. VaultWindow's settings, verbatim. */
	useEffect(() => {
		if (!mounted) return;

		const scroller = scrollerRef.current;
		const content = scroller?.firstElementChild as HTMLElement | null;
		if (!scroller || !content) return;

		const hadPrevent = scroller.hasAttribute('data-lenis-prevent');
		scroller.removeAttribute('data-lenis-prevent');

		const lenis = new Lenis({
			wrapper: scroller,
			content,
			duration: SMOOTH_SCROLL.duration,
			easing: SMOOTH_EASE,
			orientation: 'vertical',
			gestureOrientation: 'vertical',
			smoothWheel: true,
			wheelMultiplier: SMOOTH_SCROLL.wheelMultiplier,
			touchMultiplier: 1,
			respectReducedMotion: true,
			/* Matches the page, so entering the gallery does not change how
			   scrolling feels. One predicate decides both - see
			   shouldSyncTouch in config/smoothScroll.ts. */
			syncTouch: shouldSyncTouch(),
			syncTouchLerp: SMOOTH_TOUCH.syncTouchLerp,
			touchInertiaExponent: SMOOTH_TOUCH.touchInertiaExponent,
			overscroll: false,
			autoRaf: false,
		});

		const showResults = (event: Event) => { const target = (event as CustomEvent<HTMLElement>).detail; if (target) {lenis.resize();lenis.scrollTo(target,{offset:-16,immediate:true});} };
		scroller.addEventListener('vault:results',showResults);
		const tick = (time: number) => lenis.raf(time * 1000);
		gsap.ticker.add(tick);

		return () => {
			scroller.removeEventListener('vault:results',showResults);
			gsap.ticker.remove(tick);
			lenis.destroy();
			if (hadPrevent) scroller.setAttribute('data-lenis-prevent', '');
		};
	}, [mounted]);

	if (!mounted) return null;

	/* The window's own chrome. */
	const windowVars = {
		'--wg-open': `${WORK_GALLERY_MOTION.openDuration}ms`,
		'--wg-close': `${WORK_GALLERY_MOTION.closeDuration}ms`,
		'--wg-open-ease': WORK_GALLERY_MOTION.openEase,
		'--wg-close-ease': WORK_GALLERY_MOTION.closeEase,
		'--wg-head-dur': `${WORK_GALLERY_MOTION.tileDuration}ms`,
	} as React.CSSProperties;

	/* ONE element, docked when there is a header slot and parked in the
	   corner when there is not. Same node either way, so the click
	   handler and Escape can never drift apart. */
	const closeButton = (
		<button
			ref={closeRef}
			type="button"
			className={`wg__close ${dock ? 'wg__close--docked' : 'wg__close--corner'}`}
			onClick={onClose}
		>
			{/* Wrapped so the phone can clip it and draw a mark instead.
			    THIS TEXT IS THE BUTTON'S ACCESSIBLE NAME - there is no
			    aria-label here - so it is clipped, never display:none. */}
			<span className="wg__close-text">{WORK_GALLERY_COPY.close}</span>
		</button>
	);

	return createPortal(
		<div
			className="wg"
			data-closing={closing ? 'true' : 'false'}
			role="dialog"
			aria-modal="true"
			aria-label={WORK_GALLERY_COPY.aria}
			style={windowVars}
		>
			<div className="wg__scroller" ref={scrollerRef}>
				<div className="wg__content"><VaultGallery projects={projects} onProjectSelect={onSelect} /></div>
			</div>

			{dock ? createPortal(closeButton, dock) : closeButton}
		</div>,
		document.body
	);
}
