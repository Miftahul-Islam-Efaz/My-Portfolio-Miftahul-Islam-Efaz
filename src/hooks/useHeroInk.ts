'use client'

import { useEffect } from 'react'
import { HERO_INK, heroInkAt, type HeroInkSegment } from '../config/heroInk'

type UseHeroInkArgs = {
	/** The background video whose playback time drives the treatment. */
	videoRef: React.RefObject<HTMLVideoElement | null>
	/** Element the custom properties are written to. */
	targetRef: React.RefObject<HTMLElement | null>
}

/**
 * Keeps the hero type readable against a moving-light video backdrop.
 *
 * Writes two custom properties on the target element as the video plays:
 *
 *   --hero-ink   the palette colour the type is filled with
 *   --hero-blend `normal` while the backdrop is dark, `difference` while the
 *                light ray crosses the type
 *
 * The type is solid cream over the dark phase and switches to difference
 * blending only for the ray sweep, which is the only stretch where no flat
 * colour holds contrast. See `config/heroInk.ts` for the measured luma curve
 * and the reasoning behind the segment boundaries.
 *
 * Implementation notes:
 *
 * - Driven by the `timeupdate` event, NOT requestAnimationFrame. `timeupdate`
 *   fires roughly 4x/second and there are only two changes in an 8.2s loop, so
 *   a rAF loop would burn a frame callback forever to do nothing. The ~250ms
 *   granularity is well inside the 500ms colour transition.
 *
 * - Segments are compared by IDENTITY, not by value. `heroInkAt` returns the
 *   timeline entry itself, so an unchanged segment is the same object and the
 *   style write is skipped. Without this the section would be restyled four
 *   times a second for no reason.
 *
 * - Properties are set on the section rather than on each text node, so one
 *   write updates everything that reads them - including the existing
 *   `.hero-display` rule in hero-theme.css.
 *
 * - Nothing is written on cleanup. Clearing the properties would fall back to
 *   the stylesheet default and cause a visible pop on unmount.
 */
export default function useHeroInk({ videoRef, targetRef }: UseHeroInkArgs) {
	useEffect(() => {
		const video = videoRef.current
		const target = targetRef.current
		if (!video || !target) return

		// Tracks the last applied segment so we can skip redundant style writes.
		let applied: HeroInkSegment | null = null

		const sync = () => {
			const segment = heroInkAt(video.currentTime)
			if (segment === applied) return
			applied = segment
			target.style.setProperty('--hero-ink', HERO_INK[segment.ink])
			target.style.setProperty('--hero-blend', segment.blend)
		}

		// Run once so the first paint after the intro is already correct rather
		// than waiting up to 250ms for the first timeupdate.
		sync()

		// `timeupdate` covers normal playback. `seeked` and `loadedmetadata` cover
		// the cases where currentTime jumps without playback progressing - a
		// reload mid-clip, or the element being re-attached.
		video.addEventListener('timeupdate', sync)
		video.addEventListener('seeked', sync)
		video.addEventListener('loadedmetadata', sync)

		return () => {
			video.removeEventListener('timeupdate', sync)
			video.removeEventListener('seeked', sync)
			video.removeEventListener('loadedmetadata', sync)
		}
	}, [videoRef, targetRef])
}
