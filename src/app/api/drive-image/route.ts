/**
 * Image proxy for the Google Drive shots used by the work section.
 *
 * See src/lib/driveImage.ts for the full diagnosis. The short version: the
 * Drive URLs are correct and public, but lh3 answers `429 Too Many Requests`
 * when a client asks for several in quick succession, and the helix asks for
 * eight at once. The browser therefore stops talking to lh3 altogether and
 * talks to this route instead.
 *
 * Three things this does that a browser <img> cannot:
 *
 *   1. RETRIES. A 429 is transient. The browser gives up on it permanently and
 *      the texture is simply never loaded; here it is retried with backoff.
 *   2. CACHES FOR A YEAR. Google sends `private, max-age=86400`, so every
 *      visitor re-asked Google daily and the section broke once a day. These
 *      files are immutable content addressed by file id, so they are re-served
 *      as `immutable` and a CDN will hold them.
 *   3. COLLAPSES THE BURST. Bytes are memoised in-process, so the eight
 *      parallel card loads and every later visitor cost Google far fewer
 *      requests than eight-per-visitor.
 *
 * The images stay on Drive on purpose - they are swapped by pasting a new
 * Drive link into the data files, and self-hosting would break that workflow.
 */

const UPSTREAM = 'https://lh3.googleusercontent.com/d/';

/* Drive file ids are URL-safe base64-ish. Validated rather than interpolated
   blind: this route takes a user-supplied string and puts it in an outbound
   URL, so without a whitelist it would happily fetch whatever it was handed. */
const ID = /^[A-Za-z0-9_-]{10,128}$/;

/* Google's size/format suffix, e.g. `w1600-rj`. Same reasoning. */
const OPT = /^[A-Za-z0-9-]{1,32}$/;

/* Backoff between attempts, in ms. Deliberately spread wide - a 429 from lh3
   clears in well under a second, and the alternative to waiting is a card that
   renders black for the rest of the visit. */
const RETRY_MS = [300, 900, 2000];

type Cached = { body: ArrayBuffer; type: string };

/* Bounded so a long-lived server cannot accumulate image bytes without limit.
   Eight cards plus a handful of case-study plates fits comfortably. */
const MEMO_LIMIT = 24;
const memo = new Map<string, Cached>();

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function send(cached: Cached, hit: boolean) {
  return new Response(cached.body, {
    status: 200,
    headers: {
      'Content-Type': cached.type,
      'Content-Length': String(cached.body.byteLength),
      /* A Drive file id addresses immutable bytes, so this can be cached hard.
         Replacing an image means pasting a NEW link with a new id, which is a
         different URL and therefore a different cache entry. */
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      /* The helix uploads these as WebGL textures, so the response has to be
         readable cross-origin even though it is same-origin today. */
      'X-Drive-Proxy': hit ? 'memo' : 'upstream',
    },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const opt = params.get('opt') ?? '';

  if (!ID.test(id)) {
    return new Response('Bad or missing Drive file id.', { status: 400 });
  }

  if (opt && !OPT.test(opt)) {
    return new Response('Bad Drive size suffix.', { status: 400 });
  }

  const key = opt ? `${id}=${opt}` : id;

  const hit = memo.get(key);
  if (hit) return send(hit, true);

  let lastStatus = 0;

  for (let attempt = 0; attempt <= RETRY_MS.length; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_MS[attempt - 1]);

    let upstream: Response;
    try {
      /* No Referer and no Origin are sent from here - this is a server-side
         fetch - and `no-store` keeps Next's own fetch cache out of the way,
         since the caching decision is made explicitly in send(). */
      upstream = await fetch(`${UPSTREAM}${key}`, {
        cache: 'no-store',
        headers: { Accept: 'image/*' },
      });
    } catch {
      lastStatus = 502;
      continue;
    }

    if (upstream.ok) {
      const cached: Cached = {
        body: await upstream.arrayBuffer(),
        type: upstream.headers.get('content-type') ?? 'image/jpeg',
      };

      /* Evict oldest first. Map preserves insertion order, so the first key is
         the least recently added. */
      if (memo.size >= MEMO_LIMIT) {
        const oldest = memo.keys().next().value;
        if (oldest !== undefined) memo.delete(oldest);
      }
      memo.set(key, cached);

      return send(cached, false);
    }

    lastStatus = upstream.status;

    /* Only 429 and 5xx are worth retrying. A 404 means the file id is wrong or
       the file stopped being shared as "anyone with the link", and retrying
       that just delays the error. */
    if (upstream.status !== 429 && upstream.status < 500) break;
  }

  return new Response(
    `Drive did not serve this image (last status ${lastStatus}). ` +
      `If that is 404, check the file is still shared as "anyone with the link".`,
    { status: 502, headers: { 'Cache-Control': 'no-store' } },
  );
}
