/* ------------------------------------------------------------------
   THE DEVELOP - tuning for the work-intro portrait

   The portrait is not an <img> any more. It is a point cloud sampled
   out of the image itself: one particle per sampled pixel, carrying
   that pixel's colour. Scroll develops the print - grains drift in
   suspension and settle into the face - and the cursor agitates the
   tray, pushing grains aside and resolving the ones it touches to the
   SHARP photograph instead of the dithered one.

   Every magic number lives here. Nothing in the shaders, scene, or
   hook should hold a tuned constant.

   READ THIS BEFORE CHANGING SAMPLING:
   `samplesY` squares into particle count. 300 gives 300 x 225 = 67,500
   candidate grains, of which the luminance cutoff keeps roughly half.
   Doubling it quadruples the buffer and the per-frame vertex cost.
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   THE PORTRAITS ARE SELF-HOSTED, AND THAT IS NOT A PREFERENCE.

   These were originally hotlinked from Google's lh3 CDN, like the work
   cards still are. That broke this section outright, and the failure is
   worth writing down because it cost most of an afternoon and was
   misdiagnosed twice:

     curl, no Referer      -> 200  image/jpeg
     curl, Referer set to
     http://localhost:3000 -> 429  Too Many Requests  (1,557 byte page)

   Google throttles hotlinked requests PER REFERRING ORIGIN. Every
   reload of this page asks lh3 for eight work-card textures plus two
   portraits, so a normal development session trips the limit and the
   CDN starts refusing the whole origin. The <img> showed a broken-image
   icon and the grain sampler returned null at the same instant, because
   both were asking the same throttled host for the same file.

   This is also the most credible explanation for the PencilLink and
   Bela Vista cards that intermittently rendered blank earlier - a
   symptom I wrongly blamed first on image darkness and then on CORS,
   neither of which survived measurement. A 429 fits every observation:
   intermittent, per-origin, unrelated to file size, and invisible to a
   direct fetch from a terminal.

   Self-hosting removes the whole class of problem at once:
     - no rate limit, because it is our own origin
     - no CORS question, because same-origin canvas reads never taint
     - no third-party latency on the section's primary image

   THE WORK-CARD TEXTURES ARE STILL HOTLINKED and still exposed to this.
   Localising those eight files is the obvious next move.
   ------------------------------------------------------------------ */
export const DEVELOP_SOURCE = {
  /* The dithered treatment - what the section shows at rest, and the
     colour every grain carries by default.

     Downloaded at 900px wide (251 KB), comfortably above the ~225 column
     sample grid, so the browser downscale has real detail to filter and
     the dither pattern does not alias into moire.

     Origin of record:
     https://lh3.googleusercontent.com/d/1Dy4a9WdsBGGaWEQgNX9Cpsdzp35_ol1A */
  base: '/portrait/efaz-dither.jpg',

  /* The sharp photograph. Only ever seen inside the agitation. 46 KB.

     Origin of record:
     https://lh3.googleusercontent.com/d/19if7NOqg0vbflJmTxvGjo61RnZFJtygk */
  sharp: '/portrait/efaz-sharp.jpg',
} as const;

export const DEVELOP_SAMPLE = {
  /* Rows sampled down the image. Columns follow from the aspect. */
  samplesY: 300,

  /* Source aspect. The portraits are 3:4, and the frame is too, so
     nothing is cropped. */
  aspect: 3 / 4,

  /* The cloud is built in world units with height = 2. */
  height: 2,

  /* Grains darker than this are never created.

     This is the single most important number in the file. The portrait
     sits on a near-black backdrop, and emitting particles for it would
     spend half the vertex budget drawing invisible black points AND
     would box the figure inside a visible rectangle of grain. Cutting
     them means the silhouette itself is the edge of the cloud, so the
     figure emerges from real emptiness rather than from a lit panel.

     Measured on the dithered source: 0.055 keeps the shoulder and hair
     detail while dropping the surround. Raising it eats the shoulders. */
  luminanceCutoff: 0.055,
} as const;

export const DEVELOP_MOTION = {
  /* How far, in world units, an undeveloped grain sits from its final
     position. The scatter is 3D - grains come from in front of and
     behind the picture plane, which is what makes the settle read as
     depth rather than as a 2D zoom. */
  scatter: 0.85,

  /* Extra scatter along z only. Slightly larger than the lateral
     spread: a cloud that is deeper than it is wide reads as suspension
     in liquid instead of as an exploded sheet. */
  scatterDepth: 1.25,

  /* Fraction of the develop timeline given over to stagger. At 0.55,
     the last grain starts settling only 45% of the way through, so the
     face does not appear all at once - it precipitates. */
  stagger: 0.55,

  /* Brownian drift of suspended grains, in world units and Hz. This is
     what keeps an undeveloped cloud alive instead of frozen. It is
     damped to zero as each grain settles. */
  driftAmount: 0.07,
  driftSpeed: 0.55,
} as const;

export const DEVELOP_AGITATION = {
  /* Radius of the cursor's influence, in world units (the portrait is
     2 units tall). 0.55 is about a quarter of the frame height - large
     enough to feel like a hand in the tray, small enough that the rest
     of the print stays undisturbed. */
  radius: 0.55,

  /* How hard grains are pushed out of the way, in world units. */
  push: 0.16,

  /* Ripple riding the push, so the displacement is a disturbance
     travelling through the suspension rather than a static bulge. */
  rippleAmount: 0.055,
  rippleFrequency: 22,
  rippleSpeed: 3.4,

  /* Grains inside the agitation resolve toward the sharp photograph.
     This is the hover reveal, re-expressed as physics - it replaces
     the CSS radial mask that used to do the same job. */
  sharpen: 1,

  /* Seconds for the influence to fade in and out after the pointer
     enters or leaves. Without this the whole disturbance pops. */
  ease: 0.14,

  /* Grains lift toward the viewer inside the agitation, which catches
     more point size and makes the touched area brighter. */
  lift: 0.22,
} as const;

export const DEVELOP_RENDER = {
  /* Base point size in pixels at dpr 1, before perspective scaling. */
  pointSize: 1.55,

  /* Suspended grains are drawn larger - out of focus, closer to the
     lens. Multiplier applied at full scatter, lerped to 1 on settle. */
  pointSizeScatter: 2.6,

  /* Softness of each grain's edge, 0 = hard disc, 1 = pure haze.
     Kept low: the previous version of this section was rejected for
     reading blurry, and soft points at scale are exactly how that
     happens. */
  pointSoftness: 0.35,

  /* Overall exposure on sampled colour. Slightly over 1 because
     scattered points cover less area than the solid image they came
     from, so a faithful 1.0 develops noticeably darker than the photo. */
  exposure: 1.28,

  /* Ember tint pushed into the brightest grains, tying the portrait to
     the site accent and to the rake's light above it. Small: this is a
     photograph, not a graded panel. */
  emberTint: 0.14,

  /* Camera. fov 45 with the cloud 2 units tall needs z >= 2.41 to fit;
     2.62 leaves breathing room for scattered grains to fly past the
     frame edge without clipping into nothing. */
  fov: 45,
  cameraZ: 2.62,

  /* Hard cap on device pixel ratio. Points are fill-rate cheap but
     there are ~35,000 of them; rendering at 3x on a phone buys nothing
     visible and costs frames. */
  maxDpr: 2,
} as const;

export const DEVELOP_SCROLL = {
  /* The develop scrub. Deliberately NOT pinned.

     A pin here would be the third pinned trigger in the document, and
     ScrollTrigger re-measures pins in descending refreshPriority - the
     reason the helix below broke when the rake was added above it. This
     section scrubs against its own progress through the viewport, adds
     no pin spacing, and therefore cannot shift any trigger below it. */
  start: 'top 85%',
  end: 'center 45%',

  /* Seconds of catch-up between scroll position and develop progress.
     Non-zero so flinging the wheel does not snap the print into
     existence. */
  scrub: 0.8,
} as const;

export const DEVELOP_EMBER = '#b56c4b';
