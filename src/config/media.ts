/**
 * Central registry for heavy media assets.
 *
 * Everything here is served from /public, not from a CDN, so the paths are
 * stable and the files are versioned with the repo. To swap the hero video,
 * change the constants here - no component needs editing.
 *
 * ---------------------------------------------------------------------------
 * Current hero clip
 * ---------------------------------------------------------------------------
 * Source delivered as `Hero-section-new-video.mp4`: 1280x720, 30fps, 4.13s,
 * HEVC (hvc1) at ~8.1 Mbps with a stereo audio track.
 *
 * That file is NOT the one shipped. HEVC is unplayable in Firefox and only
 * decodes in Chrome where the OS provides support, so the hero would have
 * rendered as a dead frame for a meaningful slice of visitors. It was
 * transcoded to H.264 High, which every browser can decode:
 *
 *   ffmpeg -i Hero-section-new-video.mp4 -an -c:v libx264 -crf 23 \
 *     -preset medium -pix_fmt yuv420p -movflags +faststart hero-new-720.mp4
 *
 *   - `-an` strips the audio track. The hero video is always muted, so the
 *     track was pure download weight.
 *   - `+faststart` moves the moov atom to the front so playback can begin
 *     before the whole file has arrived.
 *   - Result: 4.2 MB -> 490 KB, roughly 8.6x smaller than the source.
 *
 * The poster is frame 0 of the same clip, so the still and the first video
 * frame are identical and there is no visible swap on load:
 *
 *   ffmpeg -ss 0 -i Hero-section-new-video.mp4 -frames:v 1 -update 1 \
 *     -q:v 3 hero-new-poster.jpg
 *
 * Re-run both commands if the source clip is ever replaced. Keep the original
 * HEVC file out of `sources` - it is retained only as the master.
 *
 * ---------------------------------------------------------------------------
 * The previous boomerang clip
 * ---------------------------------------------------------------------------
 * `hero-boomerang-1080.mp4` / `-720.mp4` are the earlier hero, built by baking
 * a reversed leg onto the forward one so the native `loop` attribute produced
 * a seamless back-and-forth with zero seeking. They are unused now but kept in
 * /public so the old hero can be restored by pointing `sources` back at them.
 */

export const HERO_VIDEO = {
  /**
   * A single 720p H.264 file. The source clip is only 1280x720, so there is no
   * 1080p variant to offer - upscaling would cost bytes and decode time for no
   * additional detail - and at 490 KB it is already lighter than the old 720p
   * boomerang, so a separate mobile cut would not earn its keep either.
   */
  sources: [
    {
      src: '/video/hero-new-720.mp4',
      type: 'video/mp4',
    },
  ],

  /**
   * Frame 0 of the hero clip. Shown before the video has buffered so the hero
   * never flashes a black rectangle behind the headline.
   */
  poster: '/video/hero-new-poster.jpg',
} as const;

export type HeroVideoSource = (typeof HERO_VIDEO.sources)[number];
