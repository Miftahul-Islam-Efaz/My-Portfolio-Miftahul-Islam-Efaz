/* ------------------------------------------------------------------
   HEADER MENU - every tunable number for the pill and its dropdown.

   The reference is the sohub header: a dark pill reading MENU with a
   two-dot knob on its right, which swings a right-aligned panel out
   from underneath itself. Measured off the 1920-wide reference stills:

     pill        ~245 x 64,   radius full,  label ~15px / 0.14em
     knob        ~46 circle,  two dots ~5px, 5px apart
     panel       ~640 x 590,  radius ~28,  right edge flush with pill
     gap         ~40 between the pill's bottom and the panel's top
     item        ~118 tall,   label ~58px,  chip radius ~14

   Everything below is expressed as clamp() against that top end so the
   proportions survive down to a phone. They are NOT overridable from a
   media query: the component hands them to CSS as inline custom
   properties, and inline always wins. Change the clamp, not a
   breakpoint.
   ------------------------------------------------------------------ */

/**
 * A row inside a menu item's submenu.
 *
 * `action` rather than `target` because these do not navigate. The work
 * gallery is an overlay owned by the work section, not a route, so the
 * menu asks for it over the channel in lib/workGalleryBus.ts and the
 * component that owns the overlay answers. Keeping it a named action
 * rather than a callback means this file stays data.
 */
export type NavMenuChild = {
	id: string;
	label: string;
	action: 'work-gallery';
};

export type NavMenuItem = {
	id: string;
	label: string;
	/**
	 * A '#anchor' is scrolled to in-page when that element exists. Anything
	 * else (mailto:, https:, a route) is left to the browser as a plain
	 * href, and so is a '#anchor' that is not on the current page.
	 */
	target: string;
	/** Opened on hover or focus. Only Work has one. */
	children?: NavMenuChild[];
};

/* Four items, in the order Efaz asked for. 'Contact' has no section on
   this site - the hero's contact affordance is a mailto (see
   src/components/hero/heroData.ts), so it reuses that address rather
   than pointing at an anchor that does not exist.

   WORK CARRIES A CHILD. The landing page shows eight projects on the
   helix; the gallery shows everything. That is a different destination
   rather than a different scroll position, so it hangs off Work instead
   of becoming a fifth top-level item - the flat four are the shape of
   the site, and adding to them to reach one overlay would misdescribe
   it. */
export const NAV_MENU_ITEMS: NavMenuItem[] = [
	{ id: 'home', label: 'Home', target: '#hero-section' },
	{
		id: 'work',
		label: 'Work',
		target: '#projects',
		children: [
			{
				id: 'work-gallery',
				label: 'Enter the gallery',
				action: 'work-gallery',
			},
		],
	},
	{ id: 'vault', label: 'Vault', target: '#vault' },
	{ id: 'contact', label: 'Contact', target: '#contact' },
];

export const NAV_MENU_COPY = {
	/** The two words that roll past each other inside the pill. */
	closed: 'Menu',
	open: 'Close',
	aria: 'Site menu',
};

export const NAV_MENU_SIZE = {
	pillHeight: 'clamp(44px, 3.35vw, 64px)',
	pillPad: 'clamp(0.95rem, 1.7vw, 2rem)',
	pillGap: 'clamp(0.5rem, 0.9vw, 1.1rem)',
	pillFont: 'clamp(10px, 0.78vw, 15px)',
	/* The label box is fixed at the width of the longer word so the pill
	   does not resize when MENU becomes CLOSE. */
	labelWidth: '4.6em',
	knobSize: 'clamp(30px, 2.4vw, 46px)',
	dotSize: 'clamp(3.5px, 0.26vw, 5px)',
	dotGap: 'clamp(3.5px, 0.26vw, 5px)',
	panelWidth: 'clamp(264px, 33.3vw, 640px)',
	panelGap: 'clamp(0.6rem, 2.1vw, 2.5rem)',
	panelRadius: 'clamp(18px, 1.5vw, 28px)',
	panelPadBlock: 'clamp(1.25rem, 2.1vw, 3.1rem)',
	panelPadInline: 'clamp(0.9rem, 1.5vw, 2.2rem)',
	itemHeight: 'clamp(44px, 6.15vw, 118px)',
	itemFont: 'clamp(23px, 3.05vw, 58px)',
	itemRadius: 'clamp(10px, 0.75vw, 14px)',
	itemPad: 'clamp(0.7rem, 1.15vw, 1.6rem)',
	arrowSize: 'clamp(11px, 1vw, 19px)',
};

export const NAV_MENU_MOTION = {
	/* Measured off the recording at 30fps: the panel is on screen in one
	   frame and settled about five later - roughly 260ms in, and quicker
	   out. It is deliberately snappy; slowing this down loses the 'card
	   flicked out from under the button' read entirely. */
	openDuration: 260,
	closeDuration: 190,
	openEase: 'cubic-bezier(0.16, 1, 0.3, 1)',
	closeEase: 'cubic-bezier(0.4, 0, 0.9, 0.3)',
	/** Label roll and knob rotation. Both outlast the panel slightly. */
	labelSwap: 300,
	dotSpin: 340,
	/** Chip fill, arrow slide, label nudge. */
	hover: 220,

	/* How long the submenu survives after the pointer leaves the group.
	   Without a grace period the diagonal move from the item to the
	   flyout crosses a few pixels of panel that belong to neither, and
	   the submenu closes under the cursor on its way there. */
	submenuGrace: 220,
};

/* ------------------------------------------------------------------
   THE SWING

   In the reference the panel does not fade or drop - it arrives
   already near full size but LEANING, with its left edge closer to the
   camera than its right, then rights itself. On the way out it turns
   further than it came from, down to a narrow slanted sliver, which is
   what selling the hinge depends on.

   So: rotateY about an origin at the panel's top-right corner, which
   is the point directly under the pill. The early frames show the text
   LARGER than its final size, which is why the entry starts slightly
   scaled up and with the near edge pulled forward, rather than the
   usual scale-from-small.
   ------------------------------------------------------------------ */
export const NAV_MENU_SWING = {
	perspective: '1000px',
	/** Top-right: the corner tucked under the pill. */
	origin: '100% 0',
	from: 'translate3d(16px, -12px, 0) rotateX(9deg) rotateY(-24deg) rotateZ(2.5deg) scale(1.05)',
	/** A hair past flat, so it settles rather than stops. */
	overshoot:
		'translate3d(0, 0, 0) rotateX(0deg) rotateY(3.5deg) rotateZ(-0.4deg) scale(0.994)',
	to: 'translate3d(22px, -10px, 0) rotateX(6deg) rotateY(-58deg) rotateZ(3deg) scale(0.94)',
};
