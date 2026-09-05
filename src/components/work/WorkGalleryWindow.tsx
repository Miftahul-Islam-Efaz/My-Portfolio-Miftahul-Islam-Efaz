'use client';

/* ------------------------------------------------------------------
   THE WORK GALLERY

   Every project as a plate in a field. Click one and the case study
   window opens over the top of it; close that and you are back here,
   not back on the helix.

   ==================================================================
   THIS IS THE VAULT'S GALLERY. NOT A COPY OF IT.
   ==================================================================

   The field below renders the vault's own class names - vault-gallery,
   __field, __viewport, __grid, __item, __frame, __image, __caption -
   and is tuned by the vault's own config. So it inherits, verbatim and
   for free:

     THE LATTICE   a sheared grid: every column to the right sits a
                   step higher, every row down is pushed a step right.
     THE DIAGONAL  the whole field translates up-and-left as one piece
                   while it crosses the viewport.
     THE SMEAR     while it moves the plates blur ALONG the axis of
                   travel and swell slightly, then resolve when it
                   stops. One shared SVG filter, one attribute write
                   per frame for the entire field.

   Which is the point: there is now exactly ONE gallery in this site.
   A change to styles/vault-gallery.css or config/vaultGallery.ts
   moves both rooms, and neither can drift from the other.

   The loop below is the same loop, for the same stated reason: the
   smear is a function of the diagonal's SPEED, so it needs that value
   on the same frame. Splitting them would mean either measuring twice
   or blurring this frame's plate with last frame's velocity.

   TWO THINGS THE HERO COUPLING IS NEUTRALISED BY, rather than by
   overriding CSS: --vg-lead and --vg-dawn are set to 0 here. In the
   vault the field sits under a full-bleed photograph and needs both a
   shoulder and a dissolve; here it sits under a small text header and
   needs neither. They are custom properties precisely so a second
   presentation can answer them differently.

   ---------------------------------------------------------------
   THE WINDOW AROUND IT

   PORTALLED TO document.body, for the same reason VaultWindow is: an
   ancestor `transform` breaks position: fixed for everything inside
   it, and this component's parent tree contains a ScrollTrigger pin
   using pinType 'transform'. Rendered in place it would be fixed to
   the pinned stage rather than to the viewport.

   IT SITS BELOW THE HEADER, AT 9200. This is load-bearing and was a
   real bug: at 99990 the window covered the header, so the MENU pill
   and the CLOSE button docked beside it were painted UNDER an opaque
   black surface and the window had no chrome at all. VaultWindow has
   always been at 9000 for exactly this reason. The case study still
   covers this window, at 99992, because a study is a full takeover.

   SCROLL IS THE VAULT WINDOW'S, NOT THE BROWSER'S. Native overflow
   next to a Lenis-driven page reads as broken - the page glides and
   the overlay jerks. This runs its OWN nested Lenis with VaultWindow's
   exact settings, driven off gsap's ticker so the window, the field's
   diagonal and every gsap animation on the site share one clock. Two
   rules carried over, both of which break this if they are "tidied":

     1. THE SCROLLER MUST NOT CARRY data-lenis-prevent WHILE THIS
        WINDOW'S OWN LENIS IS ALIVE. Lenis checks that attribute by
        walking the whole composed event path, so it cannot tell the
        page's instance from this one's - the attribute mutes both. The
        page instance is stopped in JS instead.

     2. `mounted` MUST BE IN THE DEPENDENCY LIST OF EVERY EFFECT THAT
        TOUCHES THE DOM. This component returns null until it has
        mounted, because a portal needs a document. An effect that runs
        before that finds no scroller, returns early, and without
        `mounted` as a dependency never runs again.

   WHY IT DOES NOT OWN THE CASE STUDY. Opening a study is
   useCaseStudyOverlay's job, and that hook lives one level up in
   DitherCarousel because it also has to pause the WebGL helix. This
   component reports a click and a position; the parent decides what
   the click means.
   ------------------------------------------------------------------ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { driveImage } from '@/lib/driveImage';
import { getLenis } from '@/lib/scroll';
import { getNavSlot, setNavSlotBusy, subscribeNavSlot } from '@/lib/navSlot';
import { onHomeRequest } from '@/lib/homeBus';
import { SMOOTH_TOUCH, shouldSyncTouch } from '@/config/smoothScroll';
import {
	VAULT_GALLERY_DRIFT,
	VAULT_GALLERY_LATTICE,
	VAULT_GALLERY_MOTION,
	VAULT_GALLERY_REVEAL,
} from '@/config/vaultGallery';
import { getCaseStudy } from './caseStudyData';
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
	const [mounted, setMounted] = useState(false); const [query, setQuery] = useState(""); const [category, setCategory] = useState<string>(WG_ALL); const wgCategories = useMemo(() => Array.from(new Set(projects.map((p) => (p.siteType ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [projects]); const visible = useMemo(() => { const needle = query.trim().toLowerCase(); return projects.filter((p) => { if (category !== WG_ALL && (p.siteType ?? "").trim() !== category) return false; if (!needle) return true; return [p.title, p.siteType ?? "", p.category, p.badge, p.year].some((v) => String(v).toLowerCase().includes(needle)); }); }, [projects, query, category]);

	/* THE COLUMN COUNT IS DECIDED HERE, NOT IN A MEDIA QUERY - the
	   vault's rule, and it is not stylistic. Each plate's row and column
	   indices are computed from this number to build the shear, so the
	   count and the coordinates must come from the same place. A CSS
	   breakpoint that changed it silently would leave every plate
	   carrying the offsets of a lattice it is no longer in. */
	const [columns, setColumns] = useState<number>(
		VAULT_GALLERY_LATTICE.columns
	);

	/* WHETHER THE PHONE LATTICE IS IN FORCE. The count cannot tell the
	   phone from the tablet - both run two columns - and they differ in
	   exactly the thing the count does not carry: the tablet keeps the
	   shear, the phone drops it. Same contract as VaultGallery. */
	const [isMobile, setIsMobile] = useState(false);

	/* The header's dock, when there is a header to dock into. */
	const [dock, setDock] = useState<HTMLElement | null>(null);

	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const closeRef = useRef<HTMLButtonElement | null>(null);
	/* The field root: what the diagonal is measured against. */
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);
	/* The one blur every plate shares. */
	const blurRef = useRef<SVGFEGaussianBlurElement | null>(null);

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
			duration: 0.9,
			easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			orientation: 'vertical',
			gestureOrientation: 'vertical',
			smoothWheel: true,
			wheelMultiplier: 0.9,
			touchMultiplier: 1.8,
			/* Matches the page, so entering the gallery does not change how
			   scrolling feels. One predicate decides both - see
			   shouldSyncTouch in config/smoothScroll.ts. */
			syncTouch: shouldSyncTouch(),
			syncTouchLerp: SMOOTH_TOUCH.syncTouchLerp,
			touchInertiaExponent: SMOOTH_TOUCH.touchInertiaExponent,
			overscroll: false,
			autoRaf: false,
		});

		const tick = (time: number) => lenis.raf(time * 1000);
		gsap.ticker.add(tick);

		return () => {
			gsap.ticker.remove(tick);
			lenis.destroy();
			if (hadPrevent) scroller.setAttribute('data-lenis-prevent', '');
		};
	}, [mounted]);

	/* THE COLUMN COUNT. matchMedia rather than a resize listener: this
	   only has to fire on the two thresholds that change the lattice,
	   not on every pixel of a window drag. */
	useEffect(() => {
		if (!mounted) return;

		const lattice = VAULT_GALLERY_LATTICE;
		const mobile = window.matchMedia(
			`(max-width: ${lattice.mobileMaxWidth}px)`
		);
		const tablet = window.matchMedia(
			`(max-width: ${lattice.tabletMaxWidth}px)`
		);

		const read = () => {
			setIsMobile(mobile.matches);
			setColumns(
				mobile.matches
					? lattice.columnsMobile
					: tablet.matches
						? lattice.columnsTablet
						: lattice.columns
			);
		};

		read();
		mobile.addEventListener('change', read);
		tablet.addEventListener('change', read);

		return () => {
			mobile.removeEventListener('change', read);
			tablet.removeEventListener('change', read);
		};
	}, [mounted]);

	/* ---------------------------------------------------------------
	   THE DIAGONAL, AND THE SMEAR. The vault's loop.

	   THE SCROLL POSITION IS NOT READ FROM THE WINDOW, and must not be.
	   This field lives inside a fixed, full-screen element with its own
	   nested Lenis, so window.scrollY does not move while the gallery is
	   open and anything driven off it would sit perfectly still.
	   getBoundingClientRect is correct in both presentations without
	   needing to know which one it is in.

	   TWO VARIABLES, WRITTEN ONCE PER FRAME. --vg-p (position) and
	   --vg-v (speed) go on the field root; the stylesheet derives the
	   grid's transform and the plates' swell from them. Two custom
	   property writes per frame for the whole field, however many
	   plates.
	   --------------------------------------------------------------- */
	useEffect(() => {
		if (!mounted) return;

		const root = fieldRef.current;
		if (!root) return;

		/* Reduced motion: never start the loop, so --vg-p and --vg-v hold
		   at 0 and the lattice resolves to its resting staircase, sharp. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return;

		const { smoothing, epsilon } = VAULT_GALLERY_DRIFT;
		const {
			blurMax,
			blurAxisX,
			blurAxisY,
			velocityRange,
			velocityDecay,
			moveThreshold,
		} = VAULT_GALLERY_MOTION;

		/* Phones get the field without the motion blur - see the write
		   below. Read once: this loop must not re-resolve it per frame. */
		const flatScroll = window.matchMedia('(max-width: 768px)').matches;

		let current = 0;
		let previous = 0;
		let velocity = 0;

		let writtenP = Number.NaN;
		let writtenV = Number.NaN;
		let moving = false;

		/* The field fills the window it is in, so it is on screen from the
		   first frame - but the snap still matters: it keeps the arrival
		   jump out of the velocity, which would otherwise blur the whole
		   field on open. */
		let snap = true;

		/* THE RAIL. Ported from VaultGallery, which is the only reason its
		   staircase stays centred and this one did not. Every row down is
		   shifted one step right and that accumulates without bound, so the
		   field cancels it by travelling left as you scroll: whichever row is
		   vertically centred is also horizontally centred.

		   MEASURED OFF THE VIEWPORT, NOT THE GRID. The grid carries the
		   transform, so its rect already includes the travel being computed -
		   reading it would be a feedback loop. Its parent is untransformed and
		   shares its top edge.

		   Cached: getComputedStyle forces a style resolve and this runs every
		   frame. Only a width change can alter any of it. */
		let pitch = 0;
		let cardHeight = 0;
		let padTop = 0;
		let lastRow = 0;
		let measuredAt = -1;
		let writtenRow = Number.NaN;

		const measure = () => {
			const grid = gridRef.current;
			const frame = grid?.querySelector<HTMLElement>(
				'.vault-gallery__frame'
			);
			if (!grid || !frame) {
				pitch = 0;
				return;
			}

			const style = getComputedStyle(grid);
			padTop = parseFloat(style.paddingBlockStart) || 0;
			cardHeight = frame.getBoundingClientRect().height;

			/* The CARD height plus the gap under it - not the row's visual
			   band. The columns are lifted by a transform, which does not
			   affect layout, so the grid's rows are still evenly pitched. */
			pitch = cardHeight + (parseFloat(style.rowGap) || 0);

			const count = grid.children.length;
			const cols =
				parseInt(style.getPropertyValue('--vg-columns'), 10) || 1;
			lastRow = Math.max(0, Math.ceil(count / cols) - 1);

			/* One column is not a lattice: nothing is shifted, so nothing
			   needs compensating. */
			if (cols < 2) lastRow = 0;
		};


		const tick = (_time: number, deltaTime: number) => {
			const seconds = Math.max(deltaTime, 1) / 1000;

			const rect = root.getBoundingClientRect();
			const viewport = window.innerHeight || 1;
			/* Progress from the field's centre against the viewport's:
			   -1 fully below, 0 centred, +1 fully above. */
			const centre = rect.top + rect.height / 2;
			const span = viewport / 2 + rect.height / 2;
			const raw = span > 0 ? (viewport / 2 - centre) / span : 0;
			const target = Math.max(-1, Math.min(1, raw));

			if (snap) {
				current = target;
				snap = false;
				previous = current;
			} else {
				/* Frame-rate independent exponential smoothing. A plain lerp
				   by a constant would make the lag itself depend on the
				   display's refresh rate. */
				current +=
					(target - current) * (1 - Math.exp(-smoothing * seconds));
			}

			if (Number.isNaN(writtenP) || Math.abs(current - writtenP) > epsilon) {
				writtenP = current;
				root.style.setProperty('--vg-p', current.toFixed(4));
			}

			/* Re-measure only on a width change. */
			if (measuredAt !== window.innerWidth) {
				measuredAt = window.innerWidth;
				measure();
			}

			/* WHICH ROW IS CENTRED, as a fraction of the row pitch. Clamped to
			   the set's real bounds so the field cannot keep travelling past
			   its first or last row - beyond those the staircase has nothing
			   left to centre and the whole field would slide off. */
			if (pitch > 0) {
				const holder = gridRef.current?.parentElement;
				if (holder) {
					const firstRowCentre =
						holder.getBoundingClientRect().top + padTop + cardHeight / 2;

					const row =
						Math.max(
							0,
							Math.min(lastRow, (viewport / 2 - firstRowCentre) / pitch)
						) * lattice.railCompensation;

					if (
						Number.isNaN(writtenRow) ||
						Math.abs(row - writtenRow) > epsilon
					) {
						writtenRow = row;
						root.style.setProperty('--vg-row-float', row.toFixed(4));
					}
				}
			}

			const instant = Math.min(
				1,
				Math.abs(current - previous) / seconds / velocityRange
			);
			previous = current;
			velocity +=
				(instant - velocity) * (1 - Math.exp(-velocityDecay * seconds));

			/* MOBILE: no smear. Zeroing the velocity here removes the
			   directional blur AND the swell in one place, because both are
			   derived from --vg-v. The lattice's own travel (--vg-p) is
			   deliberately left alone. */
			if (flatScroll) velocity = 0;
			if (Number.isNaN(writtenV) || Math.abs(velocity - writtenV) > epsilon) {
				writtenV = velocity;
				root.style.setProperty('--vg-v', velocity.toFixed(4));

				const blur = blurRef.current;
				if (blur) {
					const x = velocity * blurMax * blurAxisX;
					const y = velocity * blurMax * blurAxisY;
					blur.setAttribute(
						'stdDeviation',
						`${x.toFixed(2)} ${y.toFixed(2)}`
					);
				}

				/* Detach the filter entirely once the field is near enough to
				   still: an element carrying a filter is promoted to its own
				   re-rasterised surface, so leaving it attached at zero would
				   tax every frame of a motionless field. */
				const shouldMove = velocity > moveThreshold;
				if (shouldMove !== moving) {
					moving = shouldMove;
					root.dataset.moving = shouldMove ? 'true' : 'false';
				}
			}
		};

		gsap.ticker.add(tick);
		return () => gsap.ticker.remove(tick);
	}, [mounted]);

	/* ARRIVAL. Once per plate, on intersection - not in the frame loop,
	   which would re-decide a settled question sixty times a second.
	   Re-run per column count, because that remounts the grid and a
	   plate that was never observed would sit at opacity 0 forever. */
	useEffect(() => {
		if (!mounted) return;

		const grid = gridRef.current;
		const scroller = scrollerRef.current;
		if (!grid) return;

		const plates = Array.from(
			grid.querySelectorAll<HTMLElement>('.vault-gallery__item')
		);

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			plates.forEach((plate) => {
				plate.dataset.visible = 'true';
			});
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					(entry.target as HTMLElement).dataset.visible = 'true';
					/* Arrival is one-way. Leaving it attached would fade
					   plates back out on the way past. */
					observer.unobserve(entry.target);
				});
			},
			/* THE ROOT IS THE SCROLLER, NOT THE VIEWPORT. This field scrolls
			   inside a fixed element, so against the viewport every plate
			   below the fold would report as hidden forever and never
			   arrive. */
			{ root: scroller, threshold: VAULT_GALLERY_REVEAL.threshold }
		);

		plates.forEach((plate) => observer.observe(plate));
		return () => observer.disconnect();
	}, [mounted, columns, visible]);

	if (!mounted) return null;

	const lattice = VAULT_GALLERY_LATTICE;
	const drift = VAULT_GALLERY_DRIFT;
	const reveal = VAULT_GALLERY_REVEAL;

	/* A single column has nothing to shear against, and a lone stack
	   stepping sideways reads as a layout fault rather than as depth.

	   THE PHONE IS FLAT, AT TWO COLUMNS. The shear reserves width it can
	   be shifted into, and on a phone that reserve plus the column gap
	   would leave each of two cards about a third of the field. Flat, the
	   reserves collapse and the 2x2 fills the room. The vault's own note
	   has the long version; the flag is shearMobile in
	   config/vaultGallery.ts. */
	const sheared = columns > 1 && (!isMobile || lattice.shearMobile);

	/* HOW MUCH SPACE THE SHEAR BORROWS, ON BOTH AXES. transform does not
	   affect layout, so anything the shear or the drift moves escapes
	   the grid's box unless the box reserves it. Both reserves are
	   DERIVED from the lattice, never hardcoded. */
	const liftReserve = sheared
		? Math.max(...lattice.columnLift) * lattice.columnLiftStep
		: 0;
	const shiftRoom = sheared
		? lattice.rowShift
		: 0;

	/* The window's own chrome. */
	const windowVars = {
		'--wg-open': `${WORK_GALLERY_MOTION.openDuration}ms`,
		'--wg-close': `${WORK_GALLERY_MOTION.closeDuration}ms`,
		'--wg-open-ease': WORK_GALLERY_MOTION.openEase,
		'--wg-close-ease': WORK_GALLERY_MOTION.closeEase,
		'--wg-head-dur': `${WORK_GALLERY_MOTION.tileDuration}ms`,
	} as React.CSSProperties;

	/* The field's, handed to the vault's stylesheet. Same contract, same
	   names - the lattice distances are cqw, percentages of the FIELD's
	   width, which is what they were measured as. */
	const fieldVars = {
		'--vg-columns': `${columns}`,
		'--vg-gap-col': `${lattice.columnGap}cqw`,
		'--vg-gap-row': `${lattice.rowGap}cqw`,
		'--vg-row-shift': `${lattice.rowShift}cqw`,
		'--vg-lift-step': `${lattice.columnLiftStep}cqw`,
		'--vg-lift-reserve': `${liftReserve}cqw`,
		'--vg-shift-room': `${shiftRoom}cqw`,
		/* NO HERO HERE. In the vault these clear a full-bleed photograph
		   and dissolve into it; this room opens on a text header, so both
		   are answered with nothing. */
		'--vg-lead': '0px',
		'--vg-dawn': '0px',
		'--vg-aspect': lattice.aspect,
		'--vg-radius': lattice.radius,
		'--vg-row-float': '0',
		/* SEVEN PERCENT BIGGER THAN THE VAULT FIELD. Overridden here rather
		   than in VAULT_GALLERY_LATTICE because that config is shared with the
		   vault gallery, which was not asked to change. Every lattice distance
		   is a cqw of this width, so widening the field scales the cards and
		   their gaps together and the composition is preserved exactly. */
		'--vg-max': 'min(1798px, 100% - 2 * clamp(18px, 3.4vw, 58px))',
		'--vg-drift-x': drift.driftX,
		'--vg-drift-y': drift.driftY,
		'--vg-vel-scale': `${VAULT_GALLERY_MOTION.scaleGain}`,
		'--vg-rise': `${reveal.rise}px`,
		'--vg-reveal': `${reveal.duration}ms`,
		'--vg-stagger': `${reveal.stagger}ms`,
		'--vg-ease': reveal.ease,
		/* Declared so the grid's and the image's calc()s resolve on the
		   very first frame, before the ticker has written anything. */
		'--vg-p': '0',
		'--vg-v': '0',
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
				<div className="wg__content">
					{/* Small, and inside the scroller. It is a label on the
					    room, not a banner: no background, no rule, nothing
					    that could share a strip with the wordmark. */}
					<header className="wg__head">
						<h2 className="wg__title">{WORK_GALLERY_COPY.title}</h2>
						<span className="wg__count">
							{String(visible.length).padStart(2, '0')}
						</span>
					</header> <div className="wg__filters"> <input className="vault-gallery__search wg__search" type="search" value={query} placeholder="Search work by name or category" aria-label="Search work by name or category" onChange={(event) => setQuery(event.target.value)} /> {wgCategories.length ? (<div className="vault-gallery__chips wg__chips" role="group" aria-label="Filter work by category"><button type="button" className="vault-gallery__chip" data-active={category === WG_ALL ? "true" : "false"} onClick={() => setCategory(WG_ALL)}>All</button>{wgCategories.map((entry) => (<button key={entry} type="button" className="vault-gallery__chip" data-active={category === entry ? "true" : "false"} onClick={() => setCategory(entry)}>{entry}</button>))}</div>) : null} {visible.length === 0 ? (<p className="vault-gallery__none wg__none">Nothing matches that.</p>) : null} </div>

					{/* THE VAULT'S FIELD. */}
					<div
						ref={fieldRef}
						className="vault-gallery"
						style={fieldVars}
						data-moving="false"
						data-field="in"
					>
						{/* THE SMEAR'S FILTER. A CSS blur() is radial - equal in
						    every direction - which reads as "out of focus", not as
						    "moving". feGaussianBlur takes x and y separately, so it
						    can smear on one axis alone; there is no CSS equivalent.
						    One filter, referenced by every plate, its stdDeviation
						    rewritten once per frame by the loop above.

						    The id matches the vault's because the stylesheet they
						    share names it. The two rooms are never open at once. */}
						<svg
							className="vault-gallery__defs"
							aria-hidden="true"
							focusable="false"
						>
							<filter
								id="vg-motion"
								x="-2%"
								y="-2%"
								width="104%"
								height="104%"
								colorInterpolationFilters="sRGB"
							>
								<feGaussianBlur
									ref={blurRef}
									in="SourceGraphic"
									stdDeviation="0 0"
								/>
							</filter>
						</svg>

						<div className="vault-gallery__field">
							<div className="vault-gallery__viewport">
								{/* Keyed on the column count so a threshold change
								    rebuilds the plates: their lattice coordinates are
								    derived from that count. */}
								<div
									key={columns}
									ref={gridRef}
									className="vault-gallery__grid"
									data-departing="false"
								>
									{visible.map((project, index) => {
										const column = index % columns;
										const row = Math.floor(index / columns);

										const lift = sheared
											? lattice.columnLift[column] ?? 0
											: 0;
										const shift = sheared ? row : 0;

										/* Only ids present in caseStudyData can be
										   opened. The rest say so rather than
										   swallowing the click. */
										const study = getCaseStudy(project.id);

										return (
											<a
												key={project.id}
												className="vault-gallery__item"
												/* STILL AN ANCHOR, THOUGH IT OPENS A
												   WINDOW. The href keeps middle-click,
												   cmd-click and "open in new tab" working
												   and keeps the plate keyboard-reachable
												   for free. The plain click is intercepted. */
												href={project.linkUrl}
												target="_blank"
												rel="noreferrer"
												aria-disabled={study ? undefined : true}
												onClick={(event) => {
													if (
														event.metaKey ||
														event.ctrlKey ||
														event.shiftKey ||
														event.altKey
													) {
														return;
													}

													event.preventDefault();
													if (!study) return;

													/* The study opens FROM where it was
													   clicked, so the parent is handed the
													   plate's centre rather than a guess. */
													const box =
														event.currentTarget.getBoundingClientRect();
													onSelect({
														id: project.id,
														x: box.left + box.width / 2,
														y: box.top + box.height / 2,
													});
												}}
												data-visible="false"
												style={
													{
														'--c-lift': `${lift}`,
														'--r-shift': `${shift}`,
														'--i': `${index}`,
													} as React.CSSProperties
												}
											>
												<span className="vault-gallery__frame">
													{/* eslint-disable-next-line @next/next/no-img-element */}
													<img
														referrerPolicy="no-referrer"
														src={driveImage(project.imageUrl)}
														alt={`${project.title} - ${project.category}`}
														className="vault-gallery__image"
														draggable={false}
														loading="lazy"
														decoding="async"
													/>

													{study ? null : (
														<span className="wg__soon">
															{WORK_GALLERY_COPY.soon}
														</span>
													)}

													<span className="vault-gallery__caption">
														<span className="vault-gallery__title">
															{project.siteType ?? project.badge}
														</span>
														<span className="vault-gallery__sub">
															{project.category}
														</span>
													</span>
												</span>
											</a>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{dock ? createPortal(closeButton, dock) : closeButton}
		</div>,
		document.body
	);
}
