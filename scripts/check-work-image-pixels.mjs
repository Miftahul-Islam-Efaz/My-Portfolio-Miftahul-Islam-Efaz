/**
 * Second pass on the two blank cards. Status, MIME, size, dimensions and aspect
 * are all identical across the eight (see check-work-images.mjs), so the cause
 * has to be in the pixels.
 *
 * TWO THINGS ARE MEASURED HERE:
 *
 * 1. ALPHA. PNG can carry a transparency channel and JPEG cannot. Both blank
 *    cards are PNG. If a texture arrives with alpha and the card material was
 *    written for opaque images, the transparent regions take whatever RGB sits
 *    underneath them - which in a PNG screenshot is usually black - and on a
 *    #050505 stage that is invisible rather than obviously broken. The PNG
 *    colour type is byte 25 of the file: 6 is RGBA, 4 is grey+alpha, 2 is RGB.
 *
 * 2. MEAN LUMINANCE. PencilLink is a black-background site and Bela Vista is
 *    dark navy. The recession applies dimFade 0.67 to every card that is not
 *    under the pointer, so a genuinely dark screenshot can be loading perfectly
 *    and still be indistinguishable from an empty card. If the two blanks come
 *    back much darker than the six that work, nothing is broken at all and the
 *    fix is exposure, not plumbing.
 *
 * Luminance is measured with the ffmpeg already on this machine: decode, scale
 * to 32x18 grey, average the bytes.
 *
 *   node scripts/check-work-image-pixels.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FFMPEG =
  'C:\\Users\\Laptop Click\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';

const BASE = 'https://lh3.googleusercontent.com/d/';

const PROJECTS = [
  ['pencillink', '1WuIzloogYsXU6c04VbgbZEbB2DprKqXY', 'BLANK'],
  ['bela-vista', '1Zg88oNHoH3JaFRDZhVhxXJJGay-UgwFy', 'BLANK'],
  ['rene-architect', '1Mznlh-nYBfaTtT2OfQGqU6rIjVTR-a4g', 'ok'],
  ['sonapahar', '1_B5KRsD5hSDRAdmcL1D1-VrlpwVs9bBT', 'ok'],
  ['oxygen-sports', '1LMos5wNTJXRc9eju1vDq5gXev1f5u3PW', 'ok'],
  ['vantra-logistics', '11qq0ML4ylE5XII6TKrzgCCSo7XIoVDA3', 'ok'],
  ['type-archive', '1UDxfqBEPJrNUBiO5A8f0XFsHVDoIKyCS', 'ok'],
  ['gdrive-host', '1HwT9PlZmtTenmlSA0-0YtszBtq7kbPpI', 'ok'],
];

const PNG_COLOUR_TYPES = {
  0: 'grey',
  2: 'RGB',
  3: 'palette',
  4: 'grey+ALPHA',
  6: 'RGB+ALPHA',
};

const dir = mkdtempSync(join(tmpdir(), 'workimg-'));
const rows = [];

try {
  for (const [id, fileId, expectation] of PROJECTS) {
    const response = await fetch(`${BASE}${fileId}`);
    const buf = Buffer.from(await response.arrayBuffer());
    const isPng = buf.readUInt32BE(0) === 0x89504e47;

    /* PNG: bit depth is byte 24, colour type byte 25, both inside IHDR. */
    const colour = isPng
      ? (PNG_COLOUR_TYPES[buf[25]] ?? `type ${buf[25]}`)
      : 'JPEG (no alpha)';

    const file = join(dir, `${id}.${isPng ? 'png' : 'jpg'}`);
    writeFileSync(file, buf);

    /* Flattened against black, which is what an opaque upload of an
       alpha-bearing PNG effectively does - so this luminance is what the card
       would actually show. */
    const grey = execFileSync(
      FFMPEG,
      [
        '-v', 'error',
        '-i', file,
        '-vf', 'scale=32:18,format=gray',
        '-f', 'rawvideo',
        '-pix_fmt', 'gray',
        '-',
      ],
      { maxBuffer: 1 << 24 }
    );

    let total = 0;
    for (const byte of grey) total += byte;
    const mean = total / grey.length;

    /* Share of the frame that is essentially black - a mostly-dark screenshot
       on a #050505 stage reads as an empty card. */
    let dark = 0;
    for (const byte of grey) if (byte < 24) dark += 1;

    rows.push(
      [
        id.padEnd(18),
        expectation.padEnd(6),
        colour.padEnd(16),
        `mean ${mean.toFixed(1).padStart(5)}/255`,
        `(${((mean / 255) * 100).toFixed(0).padStart(2)}% grey)`.padEnd(12),
        `near-black ${((dark / grey.length) * 100).toFixed(0).padStart(3)}%`,
      ].join(' ')
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(rows.join('\n'));
console.log(
  '\nEvery non-hovered card is additionally multiplied by dimFade 0.67 by the recession.'
);
