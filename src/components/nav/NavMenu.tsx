'use client';

/* ------------------------------------------------------------------
   HEADER MENU

   The pill in the header and the panel that swings out from under it.
   Styling lives in src/styles/nav-menu.css, numbers in
   src/config/navMenu.ts; this file owns only the state machine.

   Three states rather than two. 'closing' exists because the exit is
   an animation with somewhere to go - the panel turns nearly edge-on
   before it disappears - and unmounting on click would cut that off
   after one frame. So the panel stays mounted for the length of the
   close, deaf to pointer events, and only then goes back to 'closed'.

   THE DOCK: the empty div before the pill is a parking space for
   another component's corner control. The vault window portals its
   CLOSE button in there rather than fighting the pill for the top
   right corner - see lib/navSlot.ts. It sits INSIDE .navmenu so that
   whatever docks inherits every --nm-* property below and can be
   sized from the same numbers as the pill.

   SUBMENUS. An item may carry children; only Work does. It opens on
   hover AND on focus, with a grace period on the way out, because the
   pointer has to cross a strip of panel that belongs to neither the
   item nor the flyout to get between them - closing immediately on
   mouseleave shuts the submenu under the cursor mid-journey. Children
   fire a named action rather than navigating: the work gallery is an
   overlay owned by the work section, not a route, so the request goes
   over lib/workGalleryBus.ts and whoever owns that overlay answers.

   SOUNDS: button-click-sound.mp3 on the pill toggle,
   menu-options-hover-sound.mp3 on each menu item's hover, both served
   from /public/Sounds. Audio objects are created lazily on first
   interaction: constructing them during render would fetch before a
   user gesture, and autoplay policy would reject play() anyway.
   currentTime is reset before play so fast repeated hovers retrigger
   instead of being swallowed mid-play. Failures are swallowed - sound
   is garnish, never a reason to throw.
   ------------------------------------------------------------------ */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
	NAV_MENU_COPY,
	NAV_MENU_ITEMS,
	NAV_MENU_MOTION,
	NAV_MENU_SIZE,
	NAV_MENU_SWING,
	type NavMenuChild,
	type NavMenuItem,
} from '@/config/navMenu';
import { getLenis } from '@/lib/scroll';
import { setNavSlot } from '@/lib/navSlot';
import { requestWorkGallery } from '@/lib/workGalleryBus';
import { requestHome } from '@/lib/homeBus';

type MenuState = 'closed' | 'open' | 'closing';

const SOUND_CLICK = '/Sounds/button-click-sound.mp3';
const SOUND_HOVER = '/Sounds/menu-options-hover-sound.mp3';

const Arrow: React.FC = () => (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
		<path
			d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

/* Points left, because the flyout opens to the left - the panel is
   already flush with the right edge of the viewport. */
const Caret: React.FC = () => (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
		<path
			d="M6 9l6 6 6-6"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const NavMenu: React.FC = () => {
	const [state, setState] = useState<MenuState>('closed');
	/* Which item's submenu is open, or null. Only one at a time. */
	const [openSub, setOpenSub] = useState<string | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const pillRef = useRef<HTMLButtonElement>(null);
	const dockRef = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clickSoundRef = useRef<HTMLAudioElement | null>(null);
	const hoverSoundRef = useRef<HTMLAudioElement | null>(null);
	const pathname = usePathname();

	const isOpen = state === 'open';

	/* Which item is the page you are already on. The vault is its own
	   route; everything else on this site is one scrolling page, so only
	   that one can be resolved from the pathname. */
	const activeId = pathname && pathname.startsWith('/vault') ? 'vault' : null;

	/* Publish the dock so an overlay can find it. Cleared on unmount so
	   nothing is left holding a detached node. */
	useEffect(() => {
		setNavSlot(dockRef.current);
		return () => setNavSlot(null);
	}, []);

	const playSound = useCallback(
		(ref: React.RefObject<HTMLAudioElement | null>, src: string, volume = 1) => {
			try {
				if (!ref.current) {
					ref.current = new Audio(src);
					ref.current.preload = 'auto';
				}
				ref.current.volume = volume;
				ref.current.currentTime = 0;
				void ref.current.play().catch(() => {});
			} catch {
				/* no audio support - stay silent */
			}
		},
		[],
	);

	const close = useCallback(() => {
		setState((current) => (current === 'open' ? 'closing' : current));
	}, []);

	const toggle = useCallback(() => {
		playSound(clickSoundRef, SOUND_CLICK, 0.4);
		setState((current) => (current === 'open' ? 'closing' : 'open'));
	}, [playSound]);

	/* Retire 'closing' once the exit has had its time. */
	useEffect(() => {
		if (state !== 'closing') return;
		closeTimer.current = setTimeout(
			() => setState('closed'),
			NAV_MENU_MOTION.closeDuration,
		);
		return () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
			closeTimer.current = null;
		};
	}, [state]);

	/* A submenu must never outlive the panel it hangs inside, or it would
	   be the only thing on screen after the panel swings away. */
	useEffect(() => {
		if (!isOpen) setOpenSub(null);
	}, [isOpen]);

	useEffect(
		() => () => {
			if (subTimer.current) clearTimeout(subTimer.current);
		},
		[],
	);

	/* Hover and focus both open. The close is deferred by submenuGrace so
	   the diagonal move from the item into the flyout does not pass
	   through a gap that closes it. Any new enter cancels a pending
	   close, which is what makes moving back and forth stable. */
	const enterGroup = useCallback((id: string) => {
		if (subTimer.current) {
			clearTimeout(subTimer.current);
			subTimer.current = null;
		}
		setOpenSub(id);
	}, []);

	const leaveGroup = useCallback(() => {
		if (subTimer.current) clearTimeout(subTimer.current);
		subTimer.current = setTimeout(
			() => setOpenSub(null),
			NAV_MENU_MOTION.submenuGrace,
		);
	}, []);

	/* An in-page target is scrolled to, and only then is the default
	   prevented. If the element is not on this page - Work or Home while
	   the vault route is open - the anchor is left to behave like an
	   ordinary link, which lands on the right place without this
	   component needing to know about routing. */
	const onItemClick = useCallback(
		(event: React.MouseEvent<HTMLAnchorElement>, item: NavMenuItem) => {
			if (!item.target.startsWith('#')) {
				close();
				return;
			}

			const element = document.querySelector(item.target);
			if (!element) {
				close();
				return;
			}

			event.preventDefault();
			close();

			/* ASK THE ROOM TO STAND DOWN BEFORE SCROLLING TO A SECTION OF THE
			   PAGE BEHIND IT.

			   This header stays mounted above the vault window and the work
			   gallery while either is up, so these items are clickable while a
			   full-screen overlay covers the document they scroll. Without
			   this line the scroll below succeeded and moved the page - behind
			   an opaque surface - so the menu closed and nothing else appeared
			   to happen.

			   The wordmark in Navigation.tsx has always done exactly this, and
			   this is the same two steps in the same order. Each room closes
			   itself, playing its own exit; see lib/homeBus.ts. The `force`
			   already on the scroll below is what carries it across the moment
			   in between, while the closing room has not yet restarted the
			   page Lenis it stopped. */
			requestHome();

			/* force, AND A RESOLVED OFFSET RATHER THAN THE ELEMENT.

			   This is the line that stopped taking a phone to the vault, and
			   both halves of the fix trace back to mobile gaining a real Lenis
			   instance:

			   1. force. Lenis discards a programmatic scroll while it считers
			      itself stopped, with no error and no return value to check.
			      Before mobile had an instance this branch was unreachable on
			      a phone, so the native fallback below ran and always worked -
			      which is why this never needed force until now.

			   2. A number, not the element. Lenis measures an element target
			      itself, and this page is scrubbed transforms end to end with a
			      sticky desk in the middle, so the rect read at click time is
			      not reliably where the section settles. rect.top + scrollY is
			      the same resolution the rest of lib/scroll.ts uses.

			   The native branch stays: SMOOTH_TOUCH.enabled can turn the mobile
			   instance back off, and then this path runs again. */
			const lenis = getLenis();
			const top = element.getBoundingClientRect().top + window.scrollY;

			if (lenis) {
				lenis.scrollTo(top, { duration: 1.2, force: true });
			} else {
				element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		},
		[close],
	);

	/* Children do not navigate - they ask for an overlay. The menu closes
	   first so the panel is not still swinging shut over the thing it
	   just opened. */
	const onChildClick = useCallback(
		(child: NavMenuChild) => {
			playSound(clickSoundRef, SOUND_CLICK, 0.4);
			close();
			setOpenSub(null);
			if (child.action === 'work-gallery') requestWorkGallery();
		},
		[close, playSound],
	);

	/* Escape, and any pointer down outside the control. Bound only while
	   open so the page carries no listeners the rest of the time. */
	useEffect(() => {
		if (!isOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			/* A submenu takes the first Escape - closing the whole panel from
			   inside a flyout loses two levels for one keypress. */
			if (openSub) {
				setOpenSub(null);
				return;
			}
			close();
			/* Focus goes back to the pill rather than to the top of the
			   document, or the next Tab starts from nowhere. */
			pillRef.current?.focus();
		};

		const onPointerDown = (event: PointerEvent) => {
			const root = rootRef.current;
			if (!root) return;
			if (event.target instanceof Node && root.contains(event.target)) return;
			close();
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('pointerdown', onPointerDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('pointerdown', onPointerDown);
		};
	}, [isOpen, close, openSub]);

	/* Config -> CSS. Every value the stylesheet reads is set here, so the
	   stylesheet has no numbers of its own to drift out of step. */
	const vars = {
		'--nm-pill-h': NAV_MENU_SIZE.pillHeight,
		'--nm-pill-pad': NAV_MENU_SIZE.pillPad,
		'--nm-pill-gap': NAV_MENU_SIZE.pillGap,
		'--nm-pill-font': NAV_MENU_SIZE.pillFont,
		'--nm-label-w': NAV_MENU_SIZE.labelWidth,
		'--nm-knob': NAV_MENU_SIZE.knobSize,
		'--nm-dot': NAV_MENU_SIZE.dotSize,
		'--nm-dot-gap': NAV_MENU_SIZE.dotGap,
		'--nm-panel-w': NAV_MENU_SIZE.panelWidth,
		'--nm-panel-gap': NAV_MENU_SIZE.panelGap,
		'--nm-panel-r': NAV_MENU_SIZE.panelRadius,
		'--nm-panel-pb': NAV_MENU_SIZE.panelPadBlock,
		'--nm-panel-pi': NAV_MENU_SIZE.panelPadInline,
		'--nm-item-h': NAV_MENU_SIZE.itemHeight,
		'--nm-item-font': NAV_MENU_SIZE.itemFont,
		'--nm-item-r': NAV_MENU_SIZE.itemRadius,
		'--nm-item-pad': NAV_MENU_SIZE.itemPad,
		'--nm-arrow': NAV_MENU_SIZE.arrowSize,
		'--nm-open': NAV_MENU_MOTION.openDuration + 'ms',
		'--nm-close': NAV_MENU_MOTION.closeDuration + 'ms',
		'--nm-open-ease': NAV_MENU_MOTION.openEase,
		'--nm-close-ease': NAV_MENU_MOTION.closeEase,
		'--nm-swap': NAV_MENU_MOTION.labelSwap + 'ms',
		'--nm-spin': NAV_MENU_MOTION.dotSpin + 'ms',
		'--nm-hover': NAV_MENU_MOTION.hover + 'ms',
		'--nm-persp': NAV_MENU_SWING.perspective,
		'--nm-origin': NAV_MENU_SWING.origin,
		'--nm-from': NAV_MENU_SWING.from,
		'--nm-over': NAV_MENU_SWING.overshoot,
		'--nm-to': NAV_MENU_SWING.to,
	} as React.CSSProperties;

	/* One item's row. Pulled out because an item with children needs a
	   wrapper around the same anchor, and inlining both branches made the
	   map unreadable. */
	const renderItem = (item: NavMenuItem) => {
		const isCurrent = item.id === activeId;

		const anchor = (
			<a
				href={item.target}
				className="navmenu__item"
				role="menuitem"
				aria-current={isCurrent ? 'page' : undefined}
				aria-haspopup={item.children ? 'menu' : undefined}
				aria-expanded={item.children ? openSub === item.id : undefined}
				onClick={(event) => onItemClick(event, item)}
				onMouseEnter={() => playSound(hoverSoundRef, SOUND_HOVER)}
				onFocus={item.children ? () => enterGroup(item.id) : undefined}
			>
				<span className="navmenu__arrow">
					<Arrow />
				</span>
				<span className="navmenu__text">{item.label}</span>
				{item.children ? (
					<span className="navmenu__caret">
						<Caret />
					</span>
				) : null}
			</a>
		);

		if (!item.children) {
			return <React.Fragment key={item.id}>{anchor}</React.Fragment>;
		}

		/* The group is the hover target, not the anchor - the flyout is
		   inside it, so the pointer never leaves while travelling between
		   the two. */
		return (
			<div
				key={item.id}
				className="navmenu__group"
				data-open={openSub === item.id ? 'true' : 'false'}
				onMouseEnter={() => enterGroup(item.id)}
				onMouseLeave={leaveGroup}
			>
				{anchor}

				<div
					className="navmenu__sub"
					role="menu"
					aria-label={item.label}
					onBlur={(event) => {
						/* Tabbing out of the last row closes it; moving between
						   rows inside does not. */
						if (!event.currentTarget.contains(event.relatedTarget as Node)) {
							leaveGroup();
						}
					}}
				>
					{item.children.map((child) => (
						<button
							key={child.id}
							type="button"
							className="navmenu__subitem"
							role="menuitem"
							tabIndex={openSub === item.id ? 0 : -1}
							onClick={() => onChildClick(child)}
							onMouseEnter={() => playSound(hoverSoundRef, SOUND_HOVER)}
						>
							<span className="navmenu__subdot" aria-hidden="true" />
							{child.label}
						</button>
					))}
				</div>
			</div>
		);
	};

	return (
		<div
			ref={rootRef}
			className="navmenu"
			data-state={state}
			data-open={isOpen ? 'true' : 'false'}
			style={vars}
		>
			{/* Parking space for another component's corner control. Empty
			    almost always, and styled to take up no room when it is. */}
			<div className="navmenu__dock" ref={dockRef} />

			<button
				ref={pillRef}
				type="button"
				className="navmenu__pill"
				onClick={toggle}
				aria-expanded={isOpen}
				aria-label={NAV_MENU_COPY.aria}
			>
				{/* Both words are always in the DOM - the roll needs the one
				    it is leaving as well as the one it is arriving at. The
				    inactive word is hidden from assistive tech so the button
				    does not read as 'Menu Close'. */}
				<span className="navmenu__label">
					<span className="navmenu__track">
						<span className="navmenu__word" aria-hidden={isOpen}>
							{NAV_MENU_COPY.closed}
						</span>
						<span className="navmenu__word" aria-hidden={!isOpen}>
							{NAV_MENU_COPY.open}
						</span>
					</span>
				</span>

				<span className="navmenu__knob">
					<span className="navmenu__dots">
						<span className="navmenu__dot" />
						<span className="navmenu__dot" />
					</span>
				</span>
			</button>

			<div className="navmenu__panel" role="menu" aria-label={NAV_MENU_COPY.aria}>
				{NAV_MENU_ITEMS.map(renderItem)}
			</div>
		</div>
	);
};

export default NavMenu;
