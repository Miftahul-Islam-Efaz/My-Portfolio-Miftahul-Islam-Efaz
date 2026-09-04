/**
 * NORMALISES ANY GOOGLE DRIVE IMAGE URL TO OUR OWN PROXY.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS: THE HELIX IMAGES DIED OF HTTP 429, NOT OF A BAD URL
 * ---------------------------------------------------------------------------
 * The Drive links are correct and public. Probed from the command line,
 * `lh3.googleusercontent.com/d/<id>=w1600-rj` answers 200 with
 * `Access-Control-Allow-Origin: *`. But the SECOND request in a rapid sequence
 * answers `429 Too Many Requests`. lh3 rate-limits by client, and
 * DitherCarousel hands the engine eight URLs at once, so a few textures win
 * and the rest render flat black.
 *
 * It worked for weeks and then stopped because Google sends
 * `max-age=86400`: the browser served all eight from disk for a day. The day
 * the cache expired, all eight were re-requested at once and the section
 * broke. Reload enough times and it appears to heal - that is the quota
 * resetting, not the bug leaving.
 *
 * The browser now asks OUR origin, which cannot rate-limit us, and the route
 * re-serves the bytes as immutable for a year.
 *
 * ---------------------------------------------------------------------------
 * WHY IT ACCEPTS EVERY DRIVE URL SHAPE, NOT JUST lh3
 * ---------------------------------------------------------------------------
 * The earlier version matched ONLY `lh3.googleusercontent.com/d/<id>`. That is
 * not the link Google gives you. Press Share > Copy link in Drive and you get:
 *
 *   https://drive.google.com/file/d/<id>/view?usp=sharing
 *
 * which matched nothing, passed through untouched, and hit Google directly -
 * where it met the 429, and, in an <img> without a referrer policy, an
 * outright refusal, because lh3 rejects a cross-origin Referer.
 *
 * So the ONE thing a Drive URL really carries is the file id. Every known
 * shape is reduced to that id and rebuilt as a proxy URL. Paste whatever Drive
 * hands you and it works.
 *
 * Anything that is not a Drive URL is returned UNCHANGED, so this stays safe
 * to wrap around a field that might hold a /public path, a Supabase Storage
 * URL, a Cloudinary link or an empty string.
 */

/* Google's size/format suffix, e.g. the `w1600-rj` in `...=w1600-rj`. Kept
   rather than dropped because it matters enormously: `=w1600-rj` returns a
   128 KB JPEG where the same file bare returns a 1.25 MB PNG. */
const SUFFIX = /^[A-Za-z0-9-]{1,32}$/;

/* A Drive file id is URL-safe base64-ish and always well over ten chars. */
const FILE_ID = /^[A-Za-z0-9_-]{10,128}$/;

/* Every shape Drive and its CDNs hand out, in the order worth testing.

   1. lh3 direct, with optional =suffix   lh3.googleusercontent.com/d/<id>=w1600-rj
   2. googleusercontent without the /d/   *.googleusercontent.com/<id>
   3. the Share > Copy link form          drive.google.com/file/d/<id>/view
   4. the legacy viewer                   drive.google.com/open?id=<id>
   5. the direct-download form            drive.google.com/uc?export=view&id=<id>
   6. the thumbnailer                     drive.google.com/thumbnail?id=<id>&sz=w1000
   7. docs.google.com variants of 5       docs.google.com/uc?id=<id> */
const PATTERNS: RegExp[] = [
  /^https?:\/\/lh\d+\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,128})(?:=([A-Za-z0-9-]{1,32}))?/,
  /^https?:\/\/(?:drive|docs)\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,128})/,
  /^https?:\/\/(?:drive|docs)\.google\.com\/(?:uc|open|thumbnail)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,128})/,
  /^https?:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,128})/,
];

/** The `sz=w1000` the thumbnailer takes, so that hint is not thrown away. */
const SZ = /[?&]sz=(w\d{2,4}(?:-h\d{2,4})?)/;

/**
 * The Drive file id inside any Drive URL, or null if this is not one.
 *
 * Exported because more than one caller needs to ASK the question rather than
 * perform the rewrite - the admin panel wants to tell you it recognised your
 * link, which it cannot do from the rewritten string alone.
 */
export function driveFileId(source: string): string | null {
  if (!source) return null;
  /* Already ours. Pull the id back out so this is idempotent - wrapping an
     already-wrapped URL must not produce a nested one. */
  const mine = /^\/api\/drive-image\?id=([A-Za-z0-9_-]{10,128})/.exec(source);
  if (mine) return mine[1];

  for (const pattern of PATTERNS) {
    const match = pattern.exec(source);
    if (match && FILE_ID.test(match[1])) return match[1];
  }
  return null;
}

/** True if this string is a Google Drive URL in any of its shapes. */
export function isDriveUrl(source: string): boolean {
  return driveFileId(source) !== null;
}

/**
 * Rewrite a Drive URL of ANY shape to the proxy. Non-Drive input is returned
 * untouched, and already-proxied input is returned unchanged, so this is safe
 * to apply repeatedly and safe to apply to everything.
 */
export function driveImage(source: string): string {
  if (!source) return source;

  const id = driveFileId(source);
  if (!id) return source;

  /* Preserve a size hint if the original carried one, in either dialect: the
     lh3 `=w1600-rj` suffix or the thumbnailer's `sz=w1000`. */
  let opt = '';

  const lh3 = PATTERNS[0].exec(source);
  if (lh3 && lh3[2] && SUFFIX.test(lh3[2])) {
    opt = lh3[2];
  } else {
    const sz = SZ.exec(source);
    if (sz && SUFFIX.test(sz[1])) opt = sz[1];
  }

  /* Already proxied and carrying its own opt: leave it exactly as it is. */
  if (source.startsWith('/api/drive-image?')) return source;

  return opt
    ? `/api/drive-image?id=${id}&opt=${opt}`
    : `/api/drive-image?id=${id}`;
}

export default driveImage;