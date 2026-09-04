'use client';

import { uiSoundHandlers } from '@/lib/uiSounds';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

import { driveImage } from '@/lib/driveImage';
import {
	VAULT_GALLERY_DRIFT,
	VAULT_GALLERY_ENTRY,
	VAULT_GALLERY_LATTICE,
	VAULT_GALLERY_MOTION,
	VAULT_GALLERY_REVEAL,
	VAULT_GALLERY_TOGGLE,
} from '@/config/vaultGallery';
import {
	galleryOriginal,
	galleryThumb,
	VAULT_GALLERY_ITEMS,
	VAULT_GALLERY_SR_TITLE,
	VAULT_GALLERY_TABS,
	VAULT_GALLERY_TOGGLE_LABEL,
	type VaultGalleryTab,
} from './vaultGalleryContent';
import VaultItemWindow, { type VaultTile } from './VaultItemWindow';

/* The sentinel for 
o category filter. Not the empty string, which is a
   legitimate value meaning 	his visual is unfiled. */
const ALL = '__all__';

/* What /api/vault answers with. Declared rather than imported from the query
   layer because that module is server-only - it reaches for the service client
   and env vars - and importing its types here would drag it into the client
   bundle. */
type VaultFeed = {
	visuals: Array<{
		id: string;
		title: string;
		caption: string;
		prompt: string;
		thumbUrl: string;
		originalUrl: string;
		mediaType: 'image' | 'video';
		posterUrl: string;
		category: string | null;
	}>;
	categories: Array<{ id: string; label: string }>;
	tools: Array<{
		id: string;
		title: string;
		caption: string;
		imageUrl: string;
		toolUrl: string | null;
		note: string;
		category: string;
	}>;
};

/* ------------------------------------------------------------------
   THE VAULT GALLERY

   The interior of the Vault's first section. Renders BARE - no index,
   no title, no blurb - because the pill toggle under the field is the
   only control it needs, and the hero above has already said what
   this room is.

   ==================================================================
   THREE SEPARATE IDEAS. KEEPING THEM SEPARATE IS THE DESIGN.
   ==================================================================

     THE LATTICE (static). A plain grid, plus two offsets: each column
     to the right sits one step higher, each row down is pushed one
     gap to the right. That staircase is the reference layout.

     THE DIAGONAL (per frame). The ENTIRE grid translates up-and-left
     as one piece while the section crosses the viewport.

     THE SMEAR (per frame). While the field is moving, the cards blur
     along the direction of travel and swell very slightly. Stop, and
     they resolve. This is what gives the field weight.

   An earlier pass conflated the first two, moving each card
   individually in opposing directions. Opposed motion CANCELS:
   neighbours sliding apart by a few dozen pixels reads as jitter on a
   static grid, and the scroll still read as plainly vertical. A field
   only travels if all of it travels together - so there is exactly
   one moving element, the grid, and the cards are stationary within
   it.

   ---------------------------------------------------------------
   FIVE THINGS THAT WILL BREAK THIS IF THEY ARE "TIDIED":

   1. THE SCROLL POSITION IS NOT READ FROM THE WINDOW. This component
      lives inside .vault-window__scroller - a fixed, full-screen
      element with its OWN nested Lenis. window.scrollY does not move
      while the vault is open, so anything driven off it sits
      perfectly still. getBoundingClientRect() is correct in both
      presentations without needing to know which one it is in.

   2. IT IS TWO VARIABLES, WRITTEN ONCE PER FRAME. --vg-p (position)
      and --vg-v (speed) go on the root; CSS derives the grid's
      transform and the cards' swell from them. Two custom property
      writes per frame for the whole field, however many cards.

   3. THE BLUR IS ONE SHARED SVG FILTER. Its stdDeviation is rewritten
      once per frame and every card references it, so a nine-card
      field costs one attribute write. See the note on it below for
      why it cannot be a CSS blur().

   4. NO ScrollTrigger. It would need scrollerProxy pointed at this
      window's Lenis, inside a portal, while the landing page's
      ScrollTriggers are still alive and pinned underneath. A rect
      read on the shared ticker has none of that coupling.

   5. THE COLUMN COUNT IS DECIDED HERE, NOT IN A MEDIA QUERY. Each
      card's row and column indices are computed from it, so the
      count and the coordinates have to come from the same place. A
      CSS breakpoint that silently changed it would leave every card
      carrying the offsets of a lattice it is no longer in.
   ---------------------------------------------------------------

   The reveal is an IntersectionObserver rather than part of the frame
   loop, because arrival happens ONCE per card. Rolling it into the
   loop would mean re-deciding a settled question sixty times a second
   for the life of the window.
   ------------------------------------------------------------------ */

export const VaultGallery: React.FC = () => {
	/* The set currently RENDERED. */
	const [tab, setTab] = useState<VaultGalleryTab>('visuals');

	/* The set that has been ASKED FOR and is not on screen yet.

	   The two are separate because a tab change is two phases: the
	   showing set leaves, and only then is it replaced. While this is
	   set the old set is still mounted and playing its exit, so it
	   cannot be the same piece of state as `tab` without the content
	   changing under its own fade. */
	const [pending, setPending] = useState<VaultGalleryTab | null>(null);

	/* How many columns are actually being rendered. Starts at the full
	   count so the server-rendered markup is the desktop lattice, then
	   corrects on mount. */
	const [columns, setColumns] = useState<number>(
		VAULT_GALLERY_LATTICE.columns
	);

	/* WHETHER THE PHONE LATTICE IS IN FORCE. Tracked separately from the
	   count because the count cannot tell the two apart: the phone and
	   the tablet both run two columns, and they differ in the one thing
	   the count does not carry - the tablet keeps the shear, the phone
	   drops it. See shearMobile in config/vaultGallery.ts. */
	const [isMobile, setIsMobile] = useState(false);

	const rootRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	/* The grid's untransformed parent. The rail is measured from this
	   rather than from the grid, which is carrying the rail itself. */
	const viewportRef = useRef<HTMLDivElement>(null);
	/* The one blur every card shares. */
	const blurRef = useRef<SVGFEGaussianBlurElement>(null);

		/* ---------------------------------------------------------------
	   THE DATA.

	   Fetched once from /api/vault. Until it lands - and permanently
	   if it never does - the hardcoded content stands in, so the grid
	   is never empty merely because Postgres was unreachable.
	   --------------------------------------------------------------- */
	const [remote, setRemote] = useState<VaultFeed | null>(null);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<string>(ALL);
	const [open, setOpen] = useState<VaultTile | null>(null);
	/* Which tile just had its prompt copied, so only that pill says so. */
	const [copied, setCopied] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;

		fetch('/api/vault', { cache: 'no-store' })
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				if (alive && data) setRemote(data as VaultFeed);
			})
			.catch(() => {
				/* Offline, or the route errored. The fallback covers it. */
			});

		return () => {
			alive = false;
		};
	}, []);

	/* Every tile in the requested set, normalised to ONE shape so the grid
	   below cares neither which source it came from nor which set it is. */
	const items = useMemo<VaultTile[]>(() => {
		if (remote && (tab === 'tools' ? remote.tools.length > 0 : remote.visuals.length > 0)) {
			if (tab === 'tools') {
				return remote.tools.map((tool) => ({
					id: tool.id,
					kind: 'tool' as const,
					title: tool.title,
					caption: tool.caption,
					thumb: tool.imageUrl,
					full: tool.imageUrl,
					/* Tools are stills on purpose. A grid of autoplaying tool
					   tiles is noise, and it saves this set a code path. */
					mediaType: 'image' as const,
					poster: tool.imageUrl,
					prompt: '',
					category: tool.category,
					note: tool.note,
					toolUrl: tool.toolUrl,
				}));
			}

			return remote.visuals.map((visual) => ({
				id: visual.id,
				kind: 'visual' as const,
				title: visual.title,
				caption: visual.caption,
				thumb: visual.thumbUrl,
				full: visual.originalUrl,
				mediaType: visual.mediaType,
				poster: visual.posterUrl,
				prompt: visual.prompt,
				category: visual.category ?? '',
				note: '',
				toolUrl: null,
			}));
		}

		return VAULT_GALLERY_ITEMS.filter((item) => item.tab === tab).map(
			(item) => ({
				id: item.id,
				kind: tab === 'tools' ? ('tool' as const) : ('visual' as const),
				title: item.title,
				caption: item.caption,
				thumb: galleryThumb(item),
				full: galleryOriginal(item),
				mediaType: 'image' as const,
				poster: galleryThumb(item),
				prompt: '',
				category: '',
				note: '',
				toolUrl: null,
			})
		);
	}, [remote, tab]);

	/* THE CHIPS. Only categories with something in them under the current
	   set. An empty filter is a dead end that reads as a broken page, so the
	   taxonomy can be as long as you like in the panel without littering
	   the gallery. */
	const categories = useMemo(() => {
		const present = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));
		const known = new Set((remote?.categories ?? []).map((entry) => entry.id)); const ordered = (remote?.categories ?? []).filter((entry) => present.includes(entry.id)).map((entry) => ({ id: entry.id, label: entry.label })); const loose = present.filter((value) => !known.has(value)).sort((a, b) => a.localeCompare(b)).map((value) => ({ id: value, label: value })); return [...ordered, ...loose];
	}, [items, remote]);

	/* id -> label, resolved once for both the search and the window. */
	const labelFor = useMemo(() => {
		const map = new Map<string, string>();
		for (const entry of remote?.categories ?? []) map.set(entry.id, entry.label);
		return map;
	}, [remote]);

	/* WHAT THE GRID DRAWS. Chip and search narrow the same list. The search
	   reads the category LABEL, not its id: `Abstract` is what you typed, and
	   the id underneath it might be anything. */
	const visible = useMemo(() => {
		const needle = query.trim().toLowerCase();

		return items.filter((item) => {
			if (category !== ALL && item.category !== category) return false;
			if (!needle) return true;

			return [
				item.title,
				item.caption,
				labelFor.get(item.category) ?? item.category,
			]
				.join(' ')
				.toLowerCase()
				.includes(needle);
		});
	}, [items, query, category, labelFor]);

	/* A chip carried across a set change would filter everything away with
	   no visible way back, since the chips themselves are set-specific. */
	useEffect(() => {
		setCategory(ALL);
		setQuery('');
	}, [tab]);

	/* THE COLUMN COUNT. matchMedia rather than a resize listener: this
	   only has to fire on the two thresholds that change the lattice,
	   not on every pixel of a window drag. */
	useEffect(() => {
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
	}, []);

	/* THE DIAGONAL, AND THE SMEAR.

	   Both live in this one loop because the smear is a function of the
	   diagonal's speed - it needs the same value, on the same frame, and
	   splitting them would mean either measuring the scroll twice or
	   reading last frame's position to blur this frame's card.

	   Mounted once and left alone: it is keyed to the field's position
	   on screen, not to which set is showing, so switching tabs must not
	   tear it down and restart it from zero. */
	useEffect(() => {
		const root = rootRef.current;
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

		let current = 0;
		let previous = 0;
		let velocity = 0;

		let writtenP = Number.NaN;
		let writtenV = Number.NaN;
		let moving = false;

		let onScreen = false;
		/* Snap on the first frame after the field comes back into view.
		   Without this, re-entering from below would animate the whole
		   smoothing curve from wherever the field was last left - a
		   visible slide on a section just reached. */
		let snap = true;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !onScreen) snap = true;
				onScreen = entry.isIntersecting;
			},
			/* Generous margin: the field must already be travelling
			   correctly by the time its first card is visible. */
			{ rootMargin: '25%' }
		);
		observer.observe(root);

		/* On gsap's ticker, not its own rAF - the window's Lenis is driven
		   from the same clock, so the drift and the scroll it reads can
		   never be a frame apart. */
		/* ------------------------------------------------------------
		   THE RAIL, AND WHY IT IS MEASURED RATHER THAN DERIVED FROM --vg-p.

		   The row shift accumulates without bound - row n sits n steps to
		   the right - so the field has to travel left to keep the row you
		   are looking at centred. The question is how far.

		   The first attempt scaled the total shift by --vg-p, the field's
		   own progress across the viewport. That is wrong, and wrong in a
		   way that looks almost right: --vg-p is ONE ramp spanning the
		   whole section including its entry and exit, while the rows are
		   discrete and evenly pitched inside it. The two only agree at the
		   ends. Every row between them was centred by luck, which is
		   exactly what was on screen - some rows true, the rest drifting.

		   So this asks the layout instead: WHICH ROW IS AT THE VIEWPORT'S
		   CENTRE RIGHT NOW, as a fraction. Row 2.5 means halfway between
		   rows 2 and 3, and the field is pulled left by 2.5 steps. Every
		   row centres because the compensation is the row index itself,
		   not a proxy for it.

		   MEASURED OFF THE VIEWPORT ELEMENT, NOT THE GRID. The grid is the
		   element carrying the transform, so its rect already includes the
		   travel we are trying to compute - reading it would be a feedback
		   loop. Its parent is untransformed and shares its top edge.

		   Cached, because getComputedStyle forces a style resolve and this
		   runs every frame. Only a resize can change any of it. */
		let pitch = 0;
		let cardHeight = 0;
		let padTop = 0;
		let lastRow = 0;

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

			/* A row's pitch is the card plus the gap under it. Note this is
			   the CARD height, not the row's visual band - the columns are
			   lifted by a transform, which does not affect layout, so the
			   grid's own rows are still plain and evenly spaced. */
			pitch = cardHeight + (parseFloat(style.rowGap) || 0);

			/* Read the count the component is actually rendering rather than
			   re-deriving it here, so the two can never disagree. */
			const count = grid.children.length;
			const cols =
				parseInt(style.getPropertyValue('--vg-columns'), 10) || 1;
			lastRow = Math.max(0, Math.ceil(count / cols) - 1);

			/* One column is not a lattice: nothing is shifted, so nothing
			   needs compensating. */
			if (cols < 2) lastRow = 0;
		};

		measure();

		const resize = new ResizeObserver(measure);
		if (gridRef.current) resize.observe(gridRef.current);

		let writtenRow = Number.NaN;

		const tick = (_time: number, deltaTime: number) => {
			if (!onScreen) return;

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
				/* Re-entry is a jump, not a movement. Levelling `previous`
				   with it keeps that jump out of the velocity, which would
				   otherwise blur the whole field on arrival. */
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

			/* WHICH ROW IS CENTRED, as a fraction of the row pitch.

			   Clamped to the set's real bounds so the field cannot keep
			   travelling past its first or last row while the section is
			   still entering or leaving - beyond those the staircase has
			   nothing left to centre and the whole field would slide off. */
			if (pitch > 0) {
				const holder = viewportRef.current;
				if (holder) {
					const firstRowCentre =
						holder.getBoundingClientRect().top + padTop + cardHeight / 2;

					const row = Math.max(
						0,
						Math.min(
							lastRow,
							(viewport / 2 - firstRowCentre) / pitch
						)
					) * VAULT_GALLERY_LATTICE.railCompensation;

					if (
						Number.isNaN(writtenRow) ||
						Math.abs(row - writtenRow) > epsilon
					) {
						writtenRow = row;
						root.style.setProperty('--vg-row-float', row.toFixed(4));
					}
				}
			}

			/* SPEED. Progress units per second, normalised and clamped, then
			   smoothed on its own much slower curve - blur that snaps on and
			   off flickers, and it should linger a beat after the scroll
			   stops, the way a shutter does. */
			const instant = Math.min(
				1,
				Math.abs(current - previous) / seconds / velocityRange
			);
			previous = current;
			velocity +=
				(instant - velocity) * (1 - Math.exp(-velocityDecay * seconds));

			if (Number.isNaN(writtenV) || Math.abs(velocity - writtenV) > epsilon) {
				writtenV = velocity;
				root.style.setProperty('--vg-v', velocity.toFixed(4));

				/* The blur is directional: heavy along the travel axis, light
				   across it. Two values on one shared filter, so this is a
				   single attribute write for every card on screen. */
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
				   still. Below the threshold the blur is sub-pixel, so there
				   is nothing to see - but leaving it attached would keep
				   every card on its own re-rasterised surface for as long as
				   the window is open. */
				const shouldMove = velocity > moveThreshold;
				if (shouldMove !== moving) {
					moving = shouldMove;
					root.dataset.moving = shouldMove ? 'true' : 'false';
				}
			}
		};

		gsap.ticker.add(tick);

		return () => {
			gsap.ticker.remove(tick);
			observer.disconnect();
			resize.disconnect();
		};
	}, []);

	/* THE SET CHANGING, PHASE TWO.

	   Phase one is CSS: the grid carries data-departing and plays its
	   exit. This waits that exit out and then commits, at which point
	   the grid's key changes, the new cards mount at their pre-arrival
	   opacity, and the existing reveal observer brings them in on its
	   own per-card stagger. So a tab change costs one timer and reuses
	   the arrival that was already built.

	   The duration is READ FROM THE SAME CONSTANT the stylesheet gets
	   as --vg-swap, so the commit cannot land before the fade finishes
	   or long after it. */
	useEffect(() => {
		if (!pending) return;

		const timer = window.setTimeout(() => {
			setTab(pending);
			setPending(null);
		}, VAULT_GALLERY_TOGGLE.swap);

		/* Cleared if the component goes away mid-swap - otherwise the
		   commit would fire into an unmounted tree. */
		return () => window.clearTimeout(timer);
	}, [pending]);

	/* IS THE FIELD ON SCREEN AT ALL.

	   Only the toggle needs this, and it needs it because the toggle is
	   fixed rather than sticky: fixed has no parent to fall out of, so
	   "leave when the field leaves" has to be stated rather than
	   inherited from the layout.

	   Deliberately NOT the observer inside the drift loop above. That
	   one carries a 25% margin, so it reports true well before the
	   first card is visible - correct for getting the diagonal moving
	   early, wrong for a control, which would appear over the
	   photograph. It also never runs at all under reduced motion, and a
	   control that only exists when animation is allowed is a bug. */
	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				root.dataset.field = entry.isIntersecting ? 'in' : 'out';
			},
			{
				/* NOT threshold: 0 on its own. Two rectangles that merely
				   TOUCH count as intersecting, and the field's top edge sits
				   exactly on the bottom of the window while the hero fills
				   it - so this reported the field as visible from zero
				   scroll, and the pill sat over the photograph. Nothing was
				   wrong with the observer; the geometry was a hairline.

				   Pulling the root's bottom edge up means the field has to be
				   genuinely inside the window before the control appears -
				   which is also about when the first row of cards arrives, so
				   the pill turns up with something to filter. */
				rootMargin: '0px 0px -32% 0px',
				threshold: 0,
			}
		);

		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	/* THE REVEAL. Re-run per set AND per column count: both remount the
	   cards, and a card that was never observed would sit at opacity 0
	   forever. */
	useEffect(() => {
		const grid = gridRef.current;
		if (!grid) return;

		const cards = Array.from(
			grid.querySelectorAll<HTMLElement>('.vault-gallery__item')
		);

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			cards.forEach((card) => {
				card.dataset.visible = 'true';
			});
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					(entry.target as HTMLElement).dataset.visible = 'true';
					/* Arrival is one-way. Unobserving is not an optimisation
					   here - leaving it attached would fade cards back out on
					   the way past. */
					observer.unobserve(entry.target);
				});
			},
			{ threshold: VAULT_GALLERY_REVEAL.threshold }
		);

		cards.forEach((card) => observer.observe(card));

		return () => observer.disconnect();
	}, [tab, columns, visible]);

	const lattice = VAULT_GALLERY_LATTICE;
	const drift = VAULT_GALLERY_DRIFT;
	const reveal = VAULT_GALLERY_REVEAL;

	/* THE TAB PRESS.

	   The control answers on the CLICK FRAME - `shown` below follows the
	   request, not the content - while the field takes its 320ms to
	   leave. A pill that waited for the images would read as a dropped
	   input.

	   Ignored while a swap is already running: a second request
	   mid-exit would commit the first set's fade to the second set's
	   content. */
	const requestTab = (next: VaultGalleryTab) => {
		if (next === tab || pending) return;

		/* Reduced motion gets the new set immediately. Fading out content
		   someone has asked for is motion they opted out of, and there is
		   nothing to preserve in it. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setTab(next);
			return;
		}

		setPending(next);
	};

	/* What the toggle should look pressed as: the request if there is
	   one, otherwise what is on screen. */
	const shown = pending ?? tab;

	/* A single column has nothing to shear against, and a lone stack
	   stepping sideways reads as a layout fault rather than as depth.

	   AND THE PHONE IS FLAT ON PURPOSE, THOUGH IT NOW HAS TWO COLUMNS.
	   The shear borrows real width - the trailing reserve below is
	   derived from it - and on a 360px screen that reserve plus the
	   column gap would leave each card about a third of the field. The
	   2x2 would read as two thin strips beside an empty fifth of the
	   screen. Dropping the shear collapses both reserves to zero and
	   hands that width to the cards, which is what makes the grid look
	   like a grid. The tablet keeps its staircase - it has the room.
	   The flag lives in config/vaultGallery.ts. */
	const sheared = columns > 1 && (!isMobile || lattice.shearMobile);

	/* ---------------------------------------------------------------
	   HOW MUCH SPACE THE SHEAR BORROWS, ON BOTH AXES.

	   transform does not affect layout, so anything the shear or the
	   drift moves escapes the grid's box unless the box reserves it.
	   Both reserves are DERIVED from the lattice, never hardcoded -
	   change columnLift or rowShiftCycle and the reserves follow.

	   VERTICAL: the tallest lift. Without it the top row climbed into
	   the hero and the section ended before its own last row did, which
	   is why a row could not be scrolled fully into view. It is also
	   what keeps the first row clear of the hero dissolve above it -
	   see .vault-gallery__dawn.

	   HORIZONTAL: the widest row shift. Without it the unshifted rows
	   spanned the whole width, leaving the shifted rows nowhere to go -
	   so they ran off the right edge and were cut in half. This is the
	   reference's own proportion: its field is 79% of the frame, and the
	   fifth it leaves empty is exactly this reserve.
	   --------------------------------------------------------------- */
	const liftReserve = sheared
		? Math.max(...lattice.columnLift) * lattice.columnLiftStep
		: 0;

	const shiftRoom = sheared ? lattice.rowShift : 0;


	/* Config handed to CSS as custom properties, so the stylesheet holds
	   no tunable numbers - the same contract as VaultWindow's `vars`.

	   The lattice distances are cqw: percentages of the FIELD's width,
	   which is what they were measured as off the reference. */
	const vars = {
		'--vg-columns': `${columns}`,
		'--vg-gap-col': `${lattice.columnGap}cqw`,
		'--vg-gap-row': `${lattice.rowGap}cqw`,
		'--vg-row-shift': `${lattice.rowShift}cqw`,
		'--vg-lift-step': `${lattice.columnLiftStep}cqw`,
		'--vg-lift-reserve': `${liftReserve}cqw`,
		'--vg-shift-room': `${shiftRoom}cqw`,
		/* Seeded so the very first frame - before the ticker has measured
		   anything - resolves to the untravelled lattice rather than to an
		   invalid value. */
		'--vg-row-float': '0',
		'--vg-lead': lattice.lead,
		'--vg-dawn': VAULT_GALLERY_ENTRY.dawn,
		'--vg-aspect': lattice.aspect,
		'--vg-radius': lattice.radius,
		'--vg-max': lattice.maxWidth,
		'--vg-drift-x': drift.driftX,
		'--vg-drift-y': drift.driftY,
		'--vg-vel-scale': `${VAULT_GALLERY_MOTION.scaleGain}`,
		'--vg-rise': `${reveal.rise}px`,
		'--vg-reveal': `${reveal.duration}ms`,
		'--vg-stagger': `${reveal.stagger}ms`,
		'--vg-ease': reveal.ease,
		'--vg-swap': `${VAULT_GALLERY_TOGGLE.swap}ms`,
		'--vg-toggle-bottom': VAULT_GALLERY_TOGGLE.bottom,
		/* Both declared here so the grid's and the image's calc()s resolve
		   on the very first frame, before the ticker has written
		   anything. */
		'--vg-p': '0',
		'--vg-v': '0',
	} as React.CSSProperties;

	return (
		<div
			ref={rootRef}
			className="vault-gallery"
			{...uiSoundHandlers}
			style={vars}
			data-moving="false"
			data-field="out"
			onContextMenu={(event) => event.preventDefault()}
		>
			{/* THE SMEAR'S FILTER.

			    A CSS blur() is radial - equal in every direction - which
			    reads as "out of focus", not as "moving". Motion blur is
			    directional, and feGaussianBlur's stdDeviation takes x and y
			    separately, so it can smear on one axis alone. There is no
			    CSS equivalent of that.

			    One filter, referenced by every card, its stdDeviation
			    rewritten once per frame by the loop above. */}
			<svg
				className="vault-gallery__defs"
				aria-hidden="true"
				focusable="false"
			>
				<filter
					id="vg-motion"
					/* Room for the smear to spill past the GRID it now hangs on. Kept tight: these percentages are of the whole field, so -25% rasterised 2.25x its area every frame for a 5.5px blur.
					   the default region would clip it back to the edges. */
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

			{/* THE APPROACH FROM THE HERO.

			    Reaches back UP out of this section, over the foot of the
			    hero photograph, and dissolves it into the interior's black
			    so the two do not meet at a hard horizontal cut.

			    Decorative and inert: no text, no pointer events, and the
			    field's vertical reserve is what guarantees the first row
			    never travels up underneath it. */}
			<span className="vault-gallery__dawn" aria-hidden="true" />

			{/* The field is bare by design; the heading exists for the
			    accessibility tree only. */}
			<h2 className="vault-window__sr">{VAULT_GALLERY_SR_TITLE}</h2>

			<div className="vault-gallery__field">
				<div className="vault-gallery__viewport" ref={viewportRef}>
					{/* Keyed on the set AND the column count so either change
					    remounts the grid: the cards' lattice coordinates are
					    derived from the count, so they must be rebuilt with
					    it. */}
					<div
						key={`${tab}-${columns}`}
						ref={gridRef}
						className="vault-gallery__grid"
						/* Set while the outgoing set is leaving. The key above
						   has not changed yet, so this is the same element
						   playing its exit - the replacement happens when the
						   timer commits. */
						data-departing={pending ? 'true' : 'false'}
					>
						{visible.map((item, index) => {
							const column = index % columns;
							const row = Math.floor(index / columns);

							const lift = sheared
								? lattice.columnLift[column] ?? 0
								: 0;
							const shift = sheared ? row : 0;

							return (
								<a
									key={item.id}
									className="vault-gallery__item"
									/* STILL AN ANCHOR, THOUGH IT OPENS A WINDOW.
									   The href keeps middle-click, cmd-click and
									   `open in new tab` working, and keeps the
									   tile reachable by keyboard for free. The
									   plain click is intercepted below. */
									href={driveImage(item.full)}
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
										setOpen(item);
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
										{item.mediaType === 'video' ? (
											<video
												className="vault-gallery__image"
												src={driveImage(item.full)}
												poster={driveImage(item.poster)}
												muted
												loop
												playsInline
												/* Metadata only until asked for. A field
												   of autoplaying videos would cost more
												   than the smear can afford. */
												preload="metadata"
												onMouseEnter={(event) => {
													void event.currentTarget
														.play()
														.catch(() => {});
												}}
												onMouseLeave={(event) => {
													event.currentTarget.pause();
												}}
											/>
										) : (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img
												referrerPolicy="no-referrer"
												src={driveImage(item.thumb)}
												alt={`${item.title} - ${item.caption}`}
												className="vault-gallery__image"
												draggable={false}
												loading="lazy"
												decoding="async"
											/>
										)}

										{/* HOVER TO COPY. Only where there is
										    something to copy - a pill that copies
										    an empty string is worse than no pill. */}
										{item.kind === 'visual' && item.prompt ? (
											<button
												type="button"
												className="vault-gallery__copy"
												onClick={(event) => {
													/* Inside the anchor, so both have
													   to be stopped or copying also
													   opens the window. */
													event.preventDefault();
													event.stopPropagation();

													void navigator.clipboard
														.writeText(item.prompt)
														.then(() => {
															setCopied(item.id);
															window.setTimeout(
																() => setCopied(null),
																1500
															);
														})
														.catch(() => {});
												}}
											>
												{copied === item.id
													? 'Copied'
													: 'Copy prompt'}
											</button>
										) : null}

										<span className="vault-gallery__caption">
											<span className="vault-gallery__title">
												{item.title}
											</span>
											<span className="vault-gallery__sub">
												{item.caption}
											</span>
										</span>
									</span>
								</a>
							);
						})}
					</div>
				</div>
			</div>

			{/* THE ONLY CHROME. Sticky over the field, per the reference. */}
			{/* THE FILTERS.

			    Both sets. A tool carries free text where a visual carries a
			    category id, so it becomes a chip of its own rather than

			    Fixed and tied to the SAME data-field flag as the pill, so it
			    arrives and leaves with it rather than floating over the hero.
			    It sits directly above the pill, which is where the eye already
			    is once the pill has been used once. */}
			{items.length > 0 ? (
				<div className="vault-gallery__filters">
					<input
						className="vault-gallery__search"
						type="search"
						value={query}
						placeholder="Search title or category"
						aria-label="Search the vault by title or category"
						onChange={(event) => setQuery(event.target.value)}
					/>

					{categories.length ? (
						<div
							className="vault-gallery__chips"
							role="group"
							aria-label="Filter by category"
						>
							<button
								type="button"
								className="vault-gallery__chip"
								data-active={category === ALL ? 'true' : 'false'}
								onClick={() => setCategory(ALL)}
							>
								All
							</button>

							{categories.map((entry) => (
								<button
									key={entry.id}
									type="button"
									className="vault-gallery__chip"
									data-active={
										category === entry.id ? 'true' : 'false'
									}
									onClick={() => setCategory(entry.id)}
								>
									{entry.label}
								</button>
							))}
						</div>
					) : null}

					{/* Said plainly rather than left as an empty grid, which
					    reads as a broken page. */}
					{visible.length === 0 ? (
						<p className="vault-gallery__none">Nothing matches that.</p>
					) : null}
				</div>
			) : null}

			<VaultItemWindow
				item={open}
				categoryLabel={open ? labelFor.get(open.category) : undefined}
				onClose={() => setOpen(null)}
			/>
			<div
				className="vault-gallery__toggle"
				role="group"
				aria-label={VAULT_GALLERY_TOGGLE_LABEL}
			>
				{VAULT_GALLERY_TABS.map((option) => (
					<button
						key={option.id}
						type="button"
						className="vault-gallery__tab"
						/* Both track the REQUEST, so the pill moves on the click
						   frame while the field is still leaving. */
						data-active={option.id === shown}
						aria-pressed={option.id === shown}
						onClick={() => requestTab(option.id)}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
};

export default VaultGallery;
