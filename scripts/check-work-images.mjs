/**
 * Measures every work-section texture: HTTP status, MIME, bytes and PIXEL
 * DIMENSIONS.
 *
 * WHY DIMENSIONS AND NOT JUST STATUS. Two cards were blank while the rest
 * rendered, and all eight URLs return 200 with `Access-Control-Allow-Origin: *`
 * - so it is not permissions and not CORS. The two blank ones are PNGs of over
 * a megabyte each while the ones that work are ~190 KB JPEGs, and the thing a
 * WebGL texture upload actually cares about is width x height, not bytes. A
 * source image past the driver's MAX_TEXTURE_SIZE fails to upload and the card
 * draws with nothing on it - which looks exactly like this.
 *
 * Dimensions are read out of the file header rather than by decoding: PNG puts
 * them in the IHDR chunk at a fixed offset, JPEG carries them in whichever SOFn
 * marker comes first.
 *
 *   node scripts/check-work-images.mjs
 */

const BASE = 'https://lh3.googleusercontent.com/d/';

const PROJECTS = [
  ['pencillink', '1WuIzloogYsXU6c04VbgbZEbB2DprKqXY'],
  ['bela-vista', '1Zg88oNHoH3JaFRDZhVhxXJJGay-UgwFy'],
  ['rene-architect', '1Mznlh-nYBfaTtT2OfQGqU6rIjVTR-a4g'],
  ['sonapahar', '1_B5KRsD5hSDRAdmcL1D1-VrlpwVs9bBT'],
  ['oxygen-sports', '1LMos5wNTJXRc9eju1vDq5gXev1f5u3PW'],
  ['vantra-logistics', '11qq0ML4ylE5XII6TKrzgCCSo7XIoVDA3'],
  ['type-archive', '1UDxfqBEPJrNUBiO5A8f0XFsHVDoIKyCS'],
  ['gdrive-host', '1HwT9PlZmtTenmlSA0-0YtszBtq7kbPpI'],
];

/** PNG: 8-byte signature, then the IHDR chunk - width and height at 16 and 20. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** JPEG: walk the marker chain to the first SOFn, which holds the dimensions. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 - the frame headers.
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/* The card aspect is 3.2 x 1.6 = 2:1, so anything far off that is being
   letterboxed or cropped hard by the card shader regardless of whether it
   uploads. */
const CARD_ASPECT = 2;

const rows = [];

for (const [id, fileId] of PROJECTS) {
  const url = `${BASE}${fileId}`;
  try {
    const response = await fetch(url);
    const buf = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get('content-type') ?? '?';
    const size = pngSize(buf) ?? jpegSize(buf);
    const mp = size ? ((size.w * size.h) / 1e6).toFixed(1) : '?';
    const aspect = size ? (size.w / size.h).toFixed(2) : '?';

    rows.push(
      [
        id.padEnd(18),
        String(response.status).padEnd(4),
        type.padEnd(11),
        `${(buf.length / 1024 / 1024).toFixed(2)} MB`.padStart(8),
        (size ? `${size.w}x${size.h}` : 'UNREADABLE').padStart(12),
        `${mp} MP`.padStart(9),
        `aspect ${aspect}`.padEnd(14),
        size && size.w * size.h > 40e6 ? '<-- VERY LARGE' : '',
        size && Math.abs(size.w / size.h - CARD_ASPECT) > 0.6
          ? '<-- off card aspect'
          : '',
      ].join(' ')
    );
  } catch (error) {
    rows.push(`${id.padEnd(18)} FETCH FAILED: ${error.message}`);
  }
}

console.log(rows.join('\n'));
console.log(
  '\nCard plane is 3.2 x 1.6 units = aspect 2.00. Textures are uploaded at full size.'
);
