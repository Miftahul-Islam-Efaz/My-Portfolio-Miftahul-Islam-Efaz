/* ------------------------------------------------------------------
   THE VAULT WINDOW - tuning

   ==================================================================
   THESE ARE THE CASE STUDY WINDOW'S NUMBERS, BY REQUEST.
   Reference: WINDOW_MOTION in config/caseStudy.ts.
   ==================================================================

   The brief is that the Vault must open AND close exactly like the
   window that opens from the work section's carousel - "its good and
   smooth". So the durations and curves below are that window's, not a
   second set tuned to look similar: those timings were traced frame by
   frame off a reference clip, and this site has one window vocabulary.
   If WINDOW_MOTION is ever retimed, retime these with it.

   Only the DESIGN is the Vault's: a dark room with a photograph and
   enormous tracked type, where the case study window is paper.

   ---------------------------------------------------------------
   WHY A WINDOW AT ALL, and why it still has a URL.

   The ask was "a window instead of a page, because a page takes time to
   load". What actually costs time is TEARING DOWN the landing page -
   Lenis, the pinned work carousel, the three.js contexts - and building
   it all again on the way back.

   So the window is a client overlay owned by VaultTeaser: component
   state and a static import, with nothing fetched on the click path.
   The URL is pushed with the History API, and app/vault/page.tsx still
   serves direct loads and shared links. One URL, two presentations.

   THIS WAS AN INTERCEPTING ROUTE FIRST (app/@modal/(.)vault) and the
   route WAS the lag: a segment still has to be fetched before it can
   render. Do not put a route back on the click path.
   ---------------------------------------------------------------

   THE OPENING, in four overlapping movements. "Awards-level" is not a
   longer animation - it is several short ones that overlap so no single
   element is doing the work alone:

     1. THE VEIL closes over the page behind, so the landing page never
        simply vanishes.
     2. THE PANEL wipes up from the bottom edge - the case study's
        cs-wipe-in, an inset() mask rather than a scale, so contents are
        revealed at final size instead of growing.
     3. THE PHOTOGRAPH flies from the folder's lit mouth, small and
        tilted, and straightens as it lands. It finishes AFTER the
        panel; that overlap is what stops the image feeling glued to
        the mask.
     4. THE TITLE arrives last, per letter, once the panel has
        committed.

   ALL FOUR ARE CSS KEYFRAME ANIMATIONS, NOT TRANSITIONS, and that is a
   correctness requirement rather than a style preference. A transition
   needs a painted start value, which forces a 'closed' state and a
   two-frame handshake before anything moves - and that handshake was
   the last of the perceived lag. Keyframes start on the element's first
   frame. See the header of styles/vault-window.css.

   Deliberately not GSAP: this is a mount-time entrance with no
   scrubbing, and the compositor can run clip-path, transform and
   opacity off the main thread - which matters because the landing
   page's own rAF work is still alive underneath.
   ------------------------------------------------------------------ */

export const VAULT_WINDOW_MOTION = {
	/** The panel's wipe. THE SAME VALUE AS WINDOW_MOTION.openDuration.
	 *
	 *  It went 1150 -> 1400 while the window was a route, to stop the
	 *  opening reading as a snap. The snap was real but the cause was not
	 *  the curve: a ~1s segment fetch sat in front of it, so the
	 *  animation was the only fast thing in a slow sequence. Slowing it
	 *  down made the whole interaction feel cheap. The fetch is gone, so
	 *  the animation can be quick again. */
	openDuration: 700,
	/** The close is faster than the open - always. An exit that takes as
	 *  long as the entrance reads as the interface hesitating.
	 *
	 *  520 -> 620. The outro now has the same overlapping movements as
	 *  the intro instead of one flat wipe, and at 520ms the
	 *  photograph's retreat had no room to read - it arrived at the
	 *  folder before the eye had followed it. Still clearly under the
	 *  700ms open, which is the rule that matters. */
	closeDuration: 620,

	/** Quint out - the case study window's curve, and reveal-loader.css's,
	 *  which is this site's existing vocabulary for a full-screen surface
	 *  arriving.
	 *
	 *  Front-loaded on purpose. A curve like this is only ever a mistake
	 *  when something slow happens FIRST - then the eye has time to
	 *  notice the motion is already over. Started on the click frame, the
	 *  same curve is what makes the window feel like it was already
	 *  there.
	 *
	 *  Overshoot-free, which is non-negotiable: a mask that overshoots
	 *  reveals the page edge behind it. */
	openEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
	/** THE SAME CURVE AS THE OPEN, DELIBERATELY.
	 *
	 *  This was cubic-bezier(0.64, 0, 0.78, 0), which is the exact
	 *  mathematical mirror of openEase - reflect a quint-out through the
	 *  diagonal and you get that quint-in. It is the textbook answer and
	 *  it was wrong here.
	 *
	 *  A mirrored exit ACCELERATES INTO ITS END: the window's final
	 *  frames are its fastest, so it does not leave, it gets yanked. The
	 *  intro reads well precisely because it is front-loaded - it
	 *  commits on the first frame and settles - and the brief is that
	 *  the outro have the same motion. So it gets the same curve.
	 *
	 *  Overshoot-free still matters as much as it does on the way in: an
	 *  overshooting mask would lift off the bottom edge and flash the
	 *  page behind for a frame. */
	closeEase: 'cubic-bezier(0.22, 1, 0.36, 1)',

	/** The veil over the landing page. Slightly ahead of the panel so the
	 *  page behind is already dimming before the window wipes over it. */
	veilDuration: 380,
	veilOpacity: 0.92,

	/** THE PHOTOGRAPH'S FLIGHT, from the folder's mouth. Both values are
	 *  the case study plate's - the same gesture, from the cursor there
	 *  and from the folder here.
	 *
	 *  A big scale ramp on a full-bleed photograph reads as a zoom
	 *  effect; 0.42 reads as an object arriving, because it starts small
	 *  enough to BE an object. The tilt is what makes it a hand-placed
	 *  print rather than a sliding panel. */
	plateFromScale: 0.42,
	plateFromRotation: -4.5,
	/** Longer than the panel, so the photograph is still settling after
	 *  the mask has finished. The overlap is the whole trick; matching
	 *  the two makes the window feel like one flat card. The case study
	 *  runs 820ms against a 700ms wipe - the same proportion. */
	plateDuration: 900,
	/** THE PHOTOGRAPH'S RETREAT - the flight above, run backwards into
	 *  the folder's mouth on the way out.
	 *
	 *  This is the movement the outro was missing. Shorter than the
	 *  arrival (560 against 900) because the eye already knows the path;
	 *  a retreat that takes as long as the arrival feels like the window
	 *  is reluctant to go. Slightly UNDER closeDuration so the plate is
	 *  gone a moment before the mask lands, rather than the two ending
	 *  together and flattening back into one card. */
	plateExitDuration: 560,

	/** THE TITLE. Per-letter rise, starting once the panel has
	 *  committed. `delayRatio` is a fraction of openDuration rather than
	 *  an absolute delay, so retiming the panel keeps the choreography.
	 *  0.42 mirrors WINDOW_MOTION.contentDelayRatio (0.45). */
	titleDelayRatio: 0.42,
	titleDuration: 620,
	/** Per-letter stagger in ms. Small: "THE VAULT" is nine glyphs, and
	 *  anything above ~40ms turns a reveal into a typewriter. */
	titleStagger: 26,
	/** How far each glyph rises, in px. */
	titleRise: 28,

	/** The eyebrow and the close control, after the title. */
	metaDelayRatio: 0.72,
	metaDuration: 520,
} as const;

/** Surface colours for the window. Literal hex rather than var() so the
 *  values can be handed to a canvas or a gradient without the browser
 *  needing to resolve a custom property.
 *
 *  The Vault is a DARK room, unlike the case study window's paper. That
 *  is deliberate: the hero photograph is nearly black, and a light
 *  chrome around it would fight the image at every edge. */
export const VAULT_WINDOW_SURFACE = {
	/** Matches --color-eerie, so the window's edges disappear into the
	 *  page behind it while the mask is still travelling. */
	base: '#050505',
	/** Type on the photograph. Matches --color-pearl. */
	textHi: '#F5F1E8',
	/** Secondary type. Matches --color-mist. */
	textMid: '#D8D4C8',
	/** Site accent, terracotta. Single points only. */
	ember: '#b56c4b',
	/** Hairlines. Matches --color-border. */
	hair: '#38393F',
} as const;

/** THE HERO. How the first screen of the Vault is composed.
 *
 *  The photograph is a figure from behind in a storm of light-streak
 *  debris, and the title sits OVER it, centred, with the figure's head
 *  just below the type - so the letters appear to be what the figure is
 *  walking into. That relationship is the whole composition, which is
 *  why the title's vertical position is a tuned number rather than a
 *  flex centre: dead-centre puts the type through the figure's head. */
export const VAULT_HERO = {
	/** Title's vertical centre as a fraction of the hero's height. Above
	 *  centre, to clear the figure. */
	titleY: 0.42,
	/** Letter-spacing for the title, in em. Wide and thin is the whole
	 *  character of the reference frame. */
	titleTracking: 0.18,
	/** How far the hero image is darkened behind the type, 0-1. Just
	 *  enough to hold the letters; the photograph is already dark. */
	scrim: 0.28,
} as const;
