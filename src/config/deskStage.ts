/* ------------------------------------------------------------------
   THE DESK - tuning

   The first beat of the work section, replacing THE COMPOSITOR. A real
   laptop rises into frame, opens itself, is joined by two stars, then
   steps aside so the statement can come out from behind it.

   ------------------------------------------------------------------
   INVARIANT: THIS SECTION IS NEVER PINNED. DO NOT ADD `pin`.

   Inherited verbatim from useCompositor.ts, and it still holds. The
   pinned helix in DitherCarousel.tsx carries refreshPriority: 1 and
   ScrollTrigger measures pins in DESCENDING priority order, so a pinned
   trigger EARLIER in the document silently shifts where every later
   trigger starts. Mounting a pinned section in this slot broke the
   carousel once already; THE RAKE had to be given refreshPriority: 2.

   This section still needs the laptop HELD IN VIEW for three beats,
   which is what a pin is normally for. It gets that from CSS
   `position: sticky` on .desk-stage instead - native, adds zero pin
   spacing, and structurally incapable of moving a trigger below it.
   The ScrollTrigger here only ever READS progress.

   If you ever genuinely need a pin here it must declare a
   refreshPriority above the rake's 2, and the helix must be re-checked.

   ------------------------------------------------------------------
   WHY THE MODEL IS SAFE TO SHIP

   public/3d-model/laptop-web-optimized.glb is 288 KB - a 5.2 MB export
   put through gltf-transform. It REQUIRES two extensions:

     KHR_draco_mesh_compression -> DRACOLoader, decoder in /public/draco
     EXT_texture_webp           -> handled natively by GLTFLoader

   Draco is `extensionsRequired`, not optional. Without the decoder wired
   up the file does not load partially, it throws. The decoder files were
   copied out of node_modules/three/examples/jsm/libs/draco/gltf; if three
   is upgraded and the decoder ABI changes, re-copy them.
   ------------------------------------------------------------------ */

/* Where the composition runs. UNPINNED - see the invariant above.

   The section is DESK_LAYOUT.scrollVh tall and the stage inside it is
   one viewport, sticky. That difference is the scroll budget the three
   beats are spent out of. */
export const DESK_SCROLL = {
  start: 'top top',
  end: 'bottom bottom',
  /* Scrub lag in seconds. Slightly heavier than the compositor's 0.7:
     this section moves a physical object rather than type, and a light
     scrub made the laptop feel like it was being yanked. */
  scrub: 0.85,
} as const;

export const DESK_LAYOUT = {
  /* Total section height, in vh. The stage is 100vh of it, so the scroll
     budget for all three beats is (scrollVh - 100). Longer than it looks
     like it needs to be, on purpose - the hold between ARRIVE and
     DISPLACE is what stops the section reading as one continuous slide. */
  scrollVh: 340,
} as const;

/* The three beats, as fractions of the scroll window. [start, end].

   ARRIVE and DISPLACE do NOT overlap, unlike the compositor's beats.
   The laptop finishing its opening animation is the payoff of beat one,
   and starting to move it before the lid has settled reads as an
   interruption. The gap between them (0.30 -> 0.45) is the hold. */
export const DESK_BEATS = {
  arrive: [0.0, 0.3],
  /* FINISHES WELL BEFORE exit STARTS, ON PURPOSE.

     This was [0.45, 0.75] against an exit at 0.82, which meant the fully
     displaced pose existed for 7% of the section - about 24vh of scroll out of
     340vh - and was gone again immediately. In practice it was never seen.

     Worse, the statement hits full opacity at displace 0.4, which power2.inOut
     eases to 0.32, so at the moment the copy is readable only about a THIRD of
     the displace pose had been applied. Every tuning pass on displaceRotY was
     landing within a few degrees of the resting pose no matter what value went
     in, because the value was being multiplied by ~0.32.

     Now [0.34, 0.6]: the pose completes at 0.6 and HOLDS until exit begins at
     0.82 - a 22% window, roughly 75vh, where the machine sits in the pose the
     config actually describes.

     IF THE DISPLACE POSE EVER LOOKS "UNCHANGED" AFTER EDITING IT, CHECK THIS
     WINDOW BEFORE TOUCHING THE ANGLES. */
  displace: [0.34, 0.6],
  exit: [0.82, 1.0],
} as const;

/* ==================================================================
   THE LAPTOP

   All distances are world units in the GLB's own scale, where the whole
   machine is about 0.35 units wide. Do not "round" these to whole
   numbers - 1.0 here is three laptops. All rotations are RADIANS.

   ------------------------------------------------------------------
   THE POSE IS FROM THE REFERENCE FRAMES, NOT FROM DEFAULTS

   The first build framed the laptop square-on and nearly full-bleed,
   which read as a product page rather than as an object sitting in a
   composition. Three things separate the reference frames from that:

     1. IT IS SMALLER. The machine occupies roughly 45% of the frame
        width, not 95%. The empty black around it is doing real work -
        it is what gives the stars somewhere to be.
     2. IT IS ROLLED. The reference laptop is not axis-aligned; the whole
        machine is tipped a few degrees, so it reads as placed rather
        than as diagrammed. That is baseRotZ, and it is the single
        biggest difference between the two looks.
     3. WE LOOK DOWN ON IT. Enough top-down tilt to see the keyboard
        deck as a surface rather than as an edge. That is baseRotX.

   SECOND PASS, against reference frames 3 and 4 side by side with a
   screenshot of the build: every one of those three was in the right
   direction but short of the mark. The frames are more oblique, more
   tipped, seen from higher, and smaller again. The numbers below are
   the corrected read; the previous values are noted inline so the
   direction of travel is recoverable if this overshoots.
   ------------------------------------------------------------------ */
export const DESK_LAPTOP = {
  /* Model path and the Draco decoder directory. Written once. */
  model: '/3d-model/laptop-web-optimized.glb',
  dracoPath: '/draco/',

  /* The two clips baked in Blender. Both are 2.5s and share a range, so
     ONE progress value scrubs both and they cannot drift apart.

     KeyboardHideClosed exists because at the closed angle (110.4 deg)
     the keys physically pierce the screen plane - the lid seals ~6mm
     BELOW the keyboard top. Rather than open the lid less and leave it
     visibly ajar, the keyboard scales to zero for the frames where it
     would be inside the shell. Its keys are STEP-interpolated so they
     pop rather than shrink, and they reappear at 93.6 deg, still hidden
     behind the nearly-shut lid. Scrub it in lockstep with the lid or the
     keys will be missing in the open state. */
  clipLid: 'LidOpenClose',
  clipKeyboard: 'KeyboardHideClosed',

  /* Uniform scale applied to the loaded root. 5.2 filled the frame edge
     to edge; 3.45 was still larger than the frames. */
  scale: 3.2,

  /* ---- THE RESTING POSE (the reference 3/4 view) ----
     Applied at all times, on top of whatever the beats are doing.

     THIRD PASS, AND THESE ARE MEASURED, NOT GUESSED.

     Two eyeballed passes both moved in the right direction and both landed
     about HALF WAY, to the point where the second was indistinguishable from
     the first in a screenshot. The angles below were instead solved from
     foreshortening, comparing a screenshot of the build - where every angle
     is known exactly - against the reference frame:

       screen width:height   build 1.63 at 24.0 deg turn  ->  ref 1.19  ->  48 deg
       deck depth:width      build 0.174 at 12.6 deg tilt ->  ref 0.38  ->  20 deg

     So the machine needs roughly TWICE the turn and TWICE the tilt that eye
     estimates kept suggesting. If this ever needs re-deriving, measure the
     screen rectangle in a screenshot rather than judging it - a laptop lid
     leans ~20 deg back on its own, which fools the eye into reading far less
     Y rotation than is actually present.

     SIGN, NOT JUST SIZE. The measurements above give the SIZE of the turn and
     say nothing about its DIRECTION, and the first application of them turned
     the machine onto the WRONG FLANK - screen to the right, deck running down
     to the left, a mirror image of the reference.

     The reference framing is: SCREEN UPPER LEFT, DECK RUNNING DOWN TO THE
     RIGHT. That is POSITIVE rotY here. Negative values mirror it. Roll stays
     NEGATIVE in both cases, because the screen's top edge falls to the right
     in the reference regardless of which way the machine is turned.

     THE DISPLACE TURN HAS TO BE BIG TO BE SEEN. displaceRotY sat at 1.0
     against a resting 0.84 - a 0.16 rad step, about 9 degrees, eased across
     an entire scroll beat. That is under the threshold where a turn reads as
     a turn: the machine looked like it slid right without ever facing the
     copy. The step is now ~0.43 rad / 25 degrees. Rule of thumb for this
     rig: a pose change spread over a whole beat needs 20 degrees or more
     before the eye registers it as deliberate movement rather than drift.

     BUT THE DIRECTION OF THAT STEP IS DOWN, NOT UP. Raising displaceRotY
     above the resting turn rotates the screen AWAY from the statement and
     drives the machine edge-on - it was pushed to 1.18 against a resting 0.75
     and ended up showing its back to the copy, the exact opposite of the
     intent.

     rotY here works like this, and it is worth stating plainly because it has
     now been got backwards twice:

       LARGER  positive rotY  ->  more turned, screen swings toward EDGE-ON
       SMALLER positive rotY  ->  more FRONTAL, screen opens toward the viewer

     The statement sits to the LEFT while the laptop travels RIGHT. For the
     screen to face the copy it must OPEN OUT, so displaceRotY must be LOWER
     than toRotY. It is now 0.42 against a resting 0.75 - a 0.33 rad / 19
     degree step in the correct direction, which clears the visibility floor
     above.

     ------------------------------------------------------------------
     THE THREE AXES DO NOT WORK THE SAME WAY. READ THIS BEFORE TUNING.

     From the render loop in gl/laptopScene.ts:

       rotation.y = lerp(fromRotY, toRotY, arrive) + (displaceRotY - toRotY)*d
       rotation.x = baseRotX*arrive + displaceRotX*d
       rotation.z = baseRotZ*arrive + displaceRotZ*d

     So displaceRotY is an ABSOLUTE target - it names the angle the machine
     ends up at. But displaceRotX and displaceRotZ are ADDITIVE OFFSETS on top
     of the resting pose. Setting displaceRotX to 0 does NOT mean "no pitch at
     the displace beat", it means "keep all 0.35 rad of resting pitch".

     That asymmetry cost several tuning passes. The machine read as "tilted"
     throughout the statement beat and no change to displaceRotY could fix it,
     because the culprit was 0.13 rad of leftover ROLL that the config looked
     like it had already relaxed away.

     To LEVEL the machine at the displace beat, the offsets must CANCEL the
     base:  displaceRotZ = -baseRotZ  gives net zero roll.

     Net angles now reached at full displace:
       pitch  0.35 + (-0.04) = 0.31 rad  (18 deg, deck reads as a surface)
       roll  -0.18 + ( 0.18) = 0.00 rad  (level)
       turn                    0.54 rad  (31 deg)

     ------------------------------------------------------------------
     THESE CAME FROM A POSE THE USER DRAGGED BY HAND.

     Every eyeballed pass on this beat undershot, some of them twice over. The
     values above were measured off a screenshot of the LIVE laptop after the
     user dragged it into the pose they wanted, which is the most reliable
     input available here: drag only adds to rotation.x and rotation.y, so the
     difference between a before and after screenshot isolates exactly two
     numbers and nothing else moves.

     IF THIS BEAT NEEDS RETUNING, ASK FOR THAT AGAIN rather than guessing.
     Drag the laptop, screenshot it, and solve pitch from the deck's
     depth:width and turn from the screen's width:height, comparing against a
     screenshot whose config values are known. Judging these angles by eye
     does not work - a laptop lid leans ~20 deg back on its own, which makes
     the eye consistently read far less rotation than is present. */
  baseRotX: 0.35,
  baseRotZ: -0.18,

  /* ---- ARRIVE. Rises from below frame into the centre. ---- */
  fromY: -1.15,
  toY: 0,
  /* Starts turned further away and settles into the reference 3/4 angle
     as it lands, so the rise reads as the object presenting itself.
     toRotY was -0.33, which landed almost square-on to camera; frame 3
     shows appreciably more of the left flank. */
  fromRotY: 0.95,
  toRotY: 0.75,

  /* ---- DISPLACE. Steps right and takes the display angle. ----
     Frame 4 puts the machine further right, smaller, and turned further
     away so the screen faces back across the frame toward the type.
     Previously: displaceX 0.56, displaceScale 0.88, displaceRotY -0.5. */
  displaceX: 0.62,
  displaceY: -0.03,
  /* MIRRORED 23 Aug - measured off the target frame, not eyeballed.

     Was 0.54: screen upper LEFT, deck running down to the RIGHT, which
     turned the lid AWAY from the statement sitting on the left. Negative
     puts the machine on its other flank - screen upper RIGHT, deck down
     to the LEFT, lid facing back across the frame at the copy. Which is
     what the beat was always described as doing.

     Size solved the documented way, from the screen rectangle rather
     than by eye: apparent w:h is ~1.00 in the target frame against
     ~1.41 head-on, so cos(turn) = 0.71 -> ~45 deg -> 0.78 rad.

     This makes the displace step ~88 deg off the resting 0.75 - a
     deliberate sweep, far past the 20 deg visibility floor noted above,
     and it crosses frontal on the way. That crossing is wanted: the
     screen opens out toward the viewer mid-beat before settling turned
     back at the type.

     NOTE FOR THE KEY LIGHT TASK: the pending fix in Checkpoint 4 was to
     mirror the key light to (-1.4, 2.2, 1.8) because the deck faced away
     from it. The DECK has now been mirrored instead, so re-look before
     touching the light - it may already be lit correctly. */
  displaceRotY: -0.78,
  /* The extra back-tilt is dropped: the resting baseRotX is already at
     the frame's vantage, and stacking more on top pitched the machine
     far enough forward to lose the screen. The roll RELAXES slightly
     here (was -0.03, i.e. deeper) because in frame 4 the laptop is
     closer to level than in frame 3. */
  displaceRotX: -0.04,
  displaceRotZ: 0.18,
  /* Recedes so the incoming statement holds the fore. */
  displaceScale: 0.82,

  /* ---- EXIT. Straight up and out, per the brief. ---- */
  exitY: 1.9,

  /* Idle float. Amplitude in world units, speed in radians/sec. Small
     enough to read as breathing rather than as drifting. */
  floatY: 0.018,
  floatSpeed: 0.85,
  floatRot: 0.014,
} as const;

/* ==================================================================
   DRAG TO ROTATE

   The pose is owned by SCROLL. Drag does not overwrite it, it adds an
   OFFSET to it, and that offset decays to zero on release. So letting
   go returns the laptop to whatever pose the current scroll position
   dictates - not to a hardcoded one, which would visibly snap if the
   visitor had scrolled while holding.
   ================================================================== */
export const DESK_DRAG = {
  /* Radians of rotation per pixel of pointer travel. */
  speedX: 0.006,
  speedY: 0.008,
  /* Vertical rotation is clamped - past this the visitor is looking at
     the underside of the machine, which is 6,000 polys of nothing. */
  clampX: 0.5,
  /* Per-frame decay of the offset once released, 0..1 per 60fps frame.
     Lower springs back slower. */
  release: 0.06,
  /* Below this many px of movement the gesture is treated as a click,
     not a drag, so a stray click does not nudge the pose. */
  threshold: 3,
} as const;

/* ==================================================================
   POINTER PARALLAX

   Global, not laptop-only: the stars, the statement and the machine all
   lean to the cursor on different multipliers, which is what separates
   the planes on a flat section.

   ONE smoothed pointer feeds everything. The DOM layers read --desk-px
   / --desk-py off the root and the GL scene reads the same numbers, so
   there is no chance of two loops disagreeing about where the cursor is.
   ================================================================== */
export const DESK_PARALLAX = {
  /* px of travel at full deflection, for the DOM planes. */
  stars: 31.5,
  statement: 10.5,
  /* Radians at full deflection, for the laptop. Deliberately tiny - the
     cursor should feel like it is leaning the object, and anything
     larger fights the drag gesture for the same input. */
  laptopRotY: 0.0788,
  laptopRotX: 0.0473,
  /* Exponential smoothing per frame, 0..1. Lower is heavier. Matches the
     compositor's 0.075 so the two sections feel like one hand. */
  ease: 0.075,
} as const;

/* ==================================================================
   THE STARS

   TWO stars: one top-right, one bottom-left.

   ------------------------------------------------------------------
   SELF-HOSTED, AND IT HAS TO BE.

   This was originally hotlinked from the Drive URL, matching how
   COMPOSITOR_INK loads its plate - and it rendered nothing at all. The
   URL is not broken: fetched from the command line it returns 200 and a
   valid 1600x1600 PNG, and it opens fine when pasted into a browser tab.
   It failed as an <img> on our own page, which is a different request
   from either of those.

   Rather than keep guessing at which of Google's conditions is being
   tripped for a decorative mark, the asset is checked in at
   public/stars/star.png. It is 212 KB, it cannot 403, and it costs one
   request from our own origin. Do not "tidy" this back to the Drive link.

   ------------------------------------------------------------------
   THE STARS ARE BIG AND THEY BLEED OFF THE FRAME

   In the reference frames both stars are cropped by the viewport edge -
   the top-right one loses its upper arms, the bottom-left one loses its
   lower arms. That crop is what makes them read as being IN the space
   rather than pasted onto it, so the negative insets below are
   deliberate and the sizes are far larger than they first look.
   ================================================================== */
export const DESK_STARS = {
  source: '/stars/star.png',

  /* Each star's resting position (CSS inset values), its size as a
     clamp, where it flies in FROM as a % of its own box, and how far it
     is pushed outward during DISPLACE.

     `depth` is its pointer-parallax multiplier - the two differ so the
     corners do not move as one sheet. */
  items: [
    {
      key: 'top-right',
      top: '-14%',
      right: '-11%',
      size: 'clamp(300px, 38vw, 660px)',
      fromX: 80,
      fromY: -105,
      rotate: -10,
      /* Pushed hard outward on DISPLACE - in the reference frames the
         stars retreat most of the way off frame as the laptop moves. */
      pushX: 20,
      pushY: -16,
      depth: 1,
    },
    {
      key: 'bottom-left',
      bottom: '-18%',
      left: '-13%',
      size: 'clamp(280px, 35vw, 600px)',
      fromX: -100,
      fromY: 100,
      rotate: 7,
      pushX: -20,
      pushY: 17,
      depth: 0.62,
    },
  ],
} as const;

/* Opacity of the stars at rest. Full strength: the reference frames show
   them at the same cream as the type, and the halftone edge of the PNG
   is already what keeps them from shouting. */
export const DESK_STAR_OPACITY = 1;

/* The palette. Pulled from WORK_THEME rather than re-typed, since this
   section sits inside the same field. */
export const DESK_THEME = {
  bg: '#050505',
  textHi: '#F5F1E8',
  ember: '#b56c4b',
} as const;
