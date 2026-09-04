/* ------------------------------------------------------------------
   THE VAULT GALLERY - tuning

   Every number the gallery uses. The stylesheet holds none, per the
   same contract as config/vault.ts and config/vaultWindow.ts.

   ==================================================================
   THE FIELD IS A SHEARED LATTICE, NOT A GRID.
   ==================================================================

   Measured off the reference frame (960px wide, cards 190x230):

     card                 190 x 230      -> aspect 19 / 23
     gap between columns   95            -> half a card width
     column 2 sits         37.5 higher than column 1
     column 3 sits         75   higher than column 1   (linear)
     row 2 sits            95   to the RIGHT of row 1
     whole field           760 of 960    -> 79% of the viewport

   Two independent offsets produce that staircase:

     - every column to the right sits one step HIGHER  (columnLift)
     - every row down is shifted one step RIGHT        (rowShift)

   Applied together over a plain 3-column grid, that is exactly the
   reference. It is a shear, which is why it cannot be expressed as
   row heights or as align-self - those move a card inside its cell;
   this moves the cell itself off the axis.

   ---------------------------------------------------------------
   WHY THE FIELD IS 79% OF THE VIEWPORT AND NOT 100%

   That last measurement is not a style choice, it is structural, and
   missing it caused a real bug. A row that is shifted right has to
   have somewhere to be shifted TO. If the unshifted rows already span
   the full available width, every shifted row runs off the right edge
   and is cut in half - which is exactly what happened. The reference
   leaves a fifth of the viewport empty for precisely this reason.

   The room is reserved as padding on the grid, derived from rowShift
   (see --vg-shift-room in VaultGallery.tsx), so the two can never
   fall out of agreement.
   ---------------------------------------------------------------

   NOTE ON COLUMN COUNT. The column count is decided in JS, not in a
   media query, and deliberately: the per-card row and column indices
   are computed FROM it. A CSS breakpoint that changed the count
   without telling the component would leave every card carrying the
   offsets of a lattice it is no longer in. See VaultGallery.tsx.
   ------------------------------------------------------------------ */

export const VAULT_GALLERY_LATTICE = {
	/** Columns at full width, and the two step-downs. */
	columns: 3,
	columnsTablet: 2,

	/** TWO ON A PHONE, NOT ONE.
	 *
	 *  A single column turned the field into a scroll of full-width
	 *  slabs: one card per screen, the set's shape unreadable, and a
	 *  gallery whose whole point is that you can see the body of work at
	 *  a glance. 2x2 shows four, and at this aspect (19/23) a half-width
	 *  card on a 360px screen is still ~170px wide - the same physical
	 *  size the cards have on the desktop lattice. */
	columnsMobile: 2,

	/** Breakpoints for the above, in px. Read with matchMedia. */
	tabletMaxWidth: 900,
	mobileMaxWidth: 560,

	/** WHETHER THE PHONE KEEPS THE SHEAR. It does not, and that is what
	 *  makes the 2x2 a real 2x2.
	 *
	 *  The shear is not free space: a shifted row needs somewhere to be
	 *  shifted TO, so the grid reserves rowShift (9.375cqw) on its
	 *  trailing edge - see the note at the top of this file. On a wide
	 *  screen that reserve is the reference's own proportion. On a phone,
	 *  with 9.375cqw of column gap as well, it would leave each of two
	 *  cards about a third of the field: two thin strips with a fifth of
	 *  the screen held empty beside them.
	 *
	 *  So below mobileMaxWidth the lattice goes flat and both reserves
	 *  collapse to zero, handing that width back to the cards. The TABLET
	 *  is untouched - it also runs two columns, but it has the room, so
	 *  it keeps the staircase.
	 *
	 *  Read by the components, not by a media query, for the same reason
	 *  the column count is - see the note above. */
	shearMobile: false,

	/** CLEARANCE UNDER THE HERO.
	 *
	 *  The hero is a full-bleed photograph and the first row's tallest
	 *  card is LIFTED toward it, so without this the field starts hard
	 *  against the image with no shoulder at all. In vh rather than rem
	 *  because what needs to be cleared is a viewport-height hero. */
	lead: 'clamp(3.5rem, 15vh, 12rem)',

	/** 190 / 230 from the reference. Portrait, but far squarer than a
	 *  3:4 - which is what made the first pass read as too tall. */
	aspect: '19 / 23',

	/** Small, per the reference. Not a soft card. */
	radius: '10px',

	/** The field's own cap. 79% of a ~1500px stage, so the lattice keeps
	 *  the reference's side margins on a wide monitor instead of
	 *  stretching to the window. */
	maxWidth: 'min(1680px, 100% - 2 * clamp(24px, 5vw, 92px))',

	/** 95 / 760. Also, not by coincidence, the row shift - the lattice
	 *  steps by exactly one gap in both directions. */
	columnGap: 9.375,

	/** SPACE BETWEEN ROWS. Note this is NOT the reference's 60/760.
	 *
	 *  The reference was measured on a short, wide frame where two rows
	 *  co-existed comfortably. Here a row occupies its card height PLUS
	 *  the full lift spread - the columns are staggered, so a "row" is a
	 *  diagonal band about 470px tall, not 357. At the reference's gap,
	 *  two of those bands are taller than the viewport, so no single row
	 *  is ever fully on screen: you arrive at row three while row two is
	 *  still half cut off. That was the reported bug.
	 *
	 *  Widened until one band clears the viewport with the next just
	 *  breaking the bottom edge - which is what the reference shows
	 *  anyway, its second row peeking in from below. */
	rowGap: 13.5,

	/** 95 / 760. How far right each row down is pushed, cycled through
	 *  the list below so the excursion stays bounded.
	 *
	 *  The grid reserves exactly this much padding on its trailing edge
	 *  so the shifted rows have somewhere to go - see the note at the
	 *  top of this file. */
	rowShift: 9.375,

	/** Row 0 flush, row 1 shifted, row 2 flush again.
	 *
	 *  A CONTINUOUS shift (row n -> n * 9.375) is the more literal read
	 *  of a diagonal field, and it is wrong past two rows: row 4 would
	 *  sit half the field's width to the right of row 0 and the last
	 *  column would be entirely off-screen. Cycling keeps the staircase
	 *  the reference actually shows and repeats it.
	 *
	 *  The LARGEST value here also sets how much trailing room the grid
	 *  reserves, so adding a bigger step widens the reserve with it. */
	/** THE RAIL COMPENSATION.
	 *
	 *  How much of the accumulated row shift the field cancels by
	 *  travelling left as you scroll. 1 = fully cancelled: whichever row
	 *  is vertically centred is also horizontally centred, so the
	 *  staircase can run for a hundred rows without its last one being
	 *  off-screen. 0 = no compensation, i.e. the old unbounded diagonal
	 *  that ran off the right edge. */
	railCompensation: 1,

	/** 37.5 / 760. One step per column. */
	columnLiftStep: 3.7,

	/** Column 0 lowest, each one to the right a step higher. Indexed by
	 *  column, so it must have at least `columns` entries. */
	columnLift: [0, 1, 2],
} as const;

/* ------------------------------------------------------------------
   THE DIAGONAL

   The field translates AS ONE PIECE along a single axis: up and to
   the left as the page scrolls down, back down-right as it scrolls
   up. That is the axis in the annotation, and the axis the reference
   video's motion blur streaks along.

   driftY is much smaller than driftX on purpose. The scroll already
   supplies all the vertical movement anyone needs; this only has to
   bend that travel off the vertical. Matching driftY to driftX would
   read as the field falling behind the page, not as a diagonal.

   ---------------------------------------------------------------
   WHY driftX IS 5vw AND NOT MORE

   The vault's body is padded by clamp(1.25rem, 6vw, 6rem) - see
   .vault-window__body in styles/vault-window.css. That gutter is all
   the room the field has to move sideways into before its outer cards
   start being cut by the window edge.

   At 7.5vw the drift was WIDER than the 6vw gutter, so at the ends of
   its travel the outer column was clipped mid-image and read as a
   layout fault rather than as motion. 5vw stays inside the gutter at
   every width, so the excursion never reaches the edge.

   If this is ever raised, raise the body's padding with it.
   --------------------------------------------------------------- */
export const VAULT_GALLERY_DRIFT = {
	/** Horizontal excursion at full progress, each way. Must stay under
	 *  the body's 6vw gutter - see above. */
	driftX: 'clamp(24px, 5vw, 92px)',

	/** Vertical excursion. Deliberately ~1/4 of driftX. */
	driftY: 'clamp(7px, 1.3vw, 26px)',

	/** Exponential smoothing rate, per second. Higher tracks the scroll
	 *  more tightly; lower trails it further. */
	smoothing: 5.5,

	/** Don't touch the DOM for changes smaller than this. */
	epsilon: 0.0015,
} as const;

/* ------------------------------------------------------------------
   THE SMEAR (velocity-driven)

   In the reference video the cards do not simply move - while they
   are moving they are BLURRED along the direction of travel, they
   swell very slightly, and their edges go soft. Stop scrolling and
   they resolve. It is camera motion blur, and it is the single thing
   that makes the field feel like it has weight.

   ---------------------------------------------------------------
   WHY THIS IS AN SVG FILTER AND NOT filter: blur()

   CSS blur() is radial - equal in every direction. Motion blur is
   DIRECTIONAL: heavy along the axis of travel, nearly absent across
   it. That is the difference between "out of focus" and "moving",
   and radial blur reads unmistakably as the former.

   feGaussianBlur takes two values for stdDeviation - x and y
   separately - so it can smear on one axis only. There is no CSS
   equivalent. One filter element is shared by every card and its
   stdDeviation is rewritten once per frame, so this costs a single
   attribute write for the whole field.
   ---------------------------------------------------------------

   The axis weights below are the travel direction: mostly vertical,
   because the scroll supplies most of the movement, with the
   horizontal share the diagonal adds.
   ------------------------------------------------------------------ */
export const VAULT_GALLERY_MOTION = {
	/** stdDeviation at full velocity, in px, before the axis weights. */
	blurMax: 5.5,

	/** Axis weights. y dominant - this is the direction of travel. */
	blurAxisX: 0.35,
	blurAxisY: 1,

	/** Progress units per second that count as "full speed". Progress
	 *  runs -1..+1 across the whole section, so this is deliberately
	 *  small - a brisk wheel scroll should saturate it. */
	velocityRange: 1.6,

	/** Smoothing for the velocity magnitude, per second. Lower than the
	 *  drift's: blur that snaps on and off flickers, and it should
	 *  linger a beat after the scroll stops, as a shutter does. */
	velocityDecay: 4.5,

	/** How much the image swells at full velocity. Small - this reads as
	 *  weight, and anything larger reads as a zoom effect. */
	scaleGain: 0.05,

	/** Below this magnitude the filter is removed from the cards
	 *  entirely rather than left applied at zero.
	 *
	 *  This matters for more than tidiness: an element carrying a
	 *  filter is promoted to its own surface and re-rasterised, so
	 *  leaving url(#...) attached at rest would tax every frame of a
	 *  still field for no visible effect. */
	moveThreshold: 0.05,
} as const;

/** Card arrival. Fires once per card, on intersection. */
export const VAULT_GALLERY_REVEAL = {
	rise: 34,
	duration: 760,
	stagger: 70,
	ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
	threshold: 0.12,
} as const;

/** The pill toggle under the field. */
export const VAULT_GALLERY_TOGGLE = {
	/** How far off the bottom of the viewport it sticks. */
	bottom: 'clamp(1rem, 4vh, 2.5rem)',

	/** Crossfade when the set changes. */
	swap: 320,
} as const;

/* ------------------------------------------------------------------
   THE APPROACH FROM THE HERO

   The hero is a photograph and the interior is flat black, so where
   they met there was a hard horizontal cut across the window. This is
   the depth of the band that dissolves one into the other.

   ---------------------------------------------------------------
   WHAT THIS NUMBER MEANS NOW

   It is simply HOW MUCH OF THE PHOTOGRAPH DISSOLVES, measured up from
   its bottom edge.

   It used to mean something worse. The band is anchored to the top of
   the gallery and reaches upward, and .vault-window__body used to push
   that anchor clamp(4rem, 12vh, 10rem) clear of the image - so this
   value had to be big enough to cross that gap BEFORE it reached the
   photograph at all, and roughly half of it was spent on empty black.
   That coupling is gone: styles/vault-gallery.css now zeroes the
   body's top padding for this section, so the band's bottom edge and
   the image's bottom edge are the same line.

   Which is why this is a THIRD of what it was. At the old depth the
   fade started a quarter of the way up the hero and read as the
   photograph being dimmed; the seam is at the bottom, so the dissolve
   belongs at the bottom. Small enough to sit on the image's lower
   edge, large enough that the ramp never bands.
   --------------------------------------------------------------- */
export const VAULT_GALLERY_ENTRY = {
	/** Depth of the hero-to-field dissolve, up from the photograph's
	 *  bottom edge. In vh because what it sits on is a viewport-height
	 *  hero. */
	dawn: 'clamp(3rem, 10vh, 7rem)',
} as const;