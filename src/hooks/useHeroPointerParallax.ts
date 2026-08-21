'use client'

import { useEffect } from 'react'
import { HERO_POINTER } from '../config/heroPointer'

type UseHeroPointerParallaxArgs = {
	/** Element the custom properties are written to - the hero section. */
	targetRef: React.RefObject<HTMLElement | null>
}

/**
 * Pointer parallax for the hero type. Nothing else.
 *
 * This used to also drive three lighting passes over the video (a left-side
 * darkening wash, a diagonal beam and a warm pool on the subject). Those were
 * removed deliberately: the footage as shot is what ships, and the only thing
 * the cursor is allowed to affect now is where the type sits.
 *
 * Writes two custom properties on the hero section, read by
 * `.hero-parallax-layer` in `hero-parallax.css`:
 *
 *   --hero-shift-x  heading parallax offset, px
 *   --hero-shift-y  heading parallax offset, px
 *
 * ---------------------------------------------------------------------------
 * Why the values are computed here and not in CSS
 * ---------------------------------------------------------------------------
 * The offsets are a smoothed, inverted, scaled mapping of cursor position.
 * Expressing the easing in calc() is not possible without JS feeding it the
 * position anyway, so JS does the maths and publishes finished pixel values.
 * One write per frame, one place to reason about the curve.
 *
 * ---------------------------------------------------------------------------
 * The idle contract
 * ---------------------------------------------------------------------------
 * Neutral means zero displacement. The stylesheet declares 0px for both
 * properties, so server-rendered HTML and the first paint before this hook
 * mounts are already neutral - nothing pops on hydration. When the pointer
 * leaves the section the target returns to frame centre, so the type eases
 * back to its laid-out position rather than freezing mid-offset.
 *
 * ---------------------------------------------------------------------------
 * Performance
 * ---------------------------------------------------------------------------
 * - The rAF loop is NOT permanent. It starts on movement and shuts itself
 *   down once the position has settled, so an idle hero costs zero frame
 *   callbacks. The hero shares the main thread with Lenis, GSAP and the WebGL
 *   carousel waking below.
 * - `pointermove` is bound to the section, so it cannot fire while the
 *   visitor is down in the work section.
 * - Position is read from clientX/clientY against the viewport, never from
 *   getBoundingClientRect. A rect read on every pointermove would be a forced
 *   layout on a page that is also running a scrubbed ScrollTrigger.
 * - Only the `translate` property is animated, and it composes with the
 *   `transform` GSAP owns rather than competing for it.
 * - Skipped entirely for coarse pointers and for prefers-reduced-motion.
 */
export default function useHeroPointerParallax({
	targetRef,
}: UseHeroPointerParallaxArgs) {
	useEffect(() => {
		const target = targetRef.current
		if (!target) return

		// A hover-capable, fine pointer is the only input this makes sense for.
		const reduceMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches
		const finePointer = window.matchMedia(
			'(hover: hover) and (pointer: fine)'
		).matches
		if (reduceMotion || !finePointer) return

		// Raw latest pointer position, normalised 0-1. Centre = no displacement.
		let rawX = 0.5
		let rawY = 0.5
		// Smoothed position that actually drives the offsets.
		let smoothX = 0.5
		let smoothY = 0.5

		let frame = 0
		let running = false

		const { style } = target

		/** Pushes the current offsets onto the element as custom properties. */
		const write = () => {
			// Measured from frame centre so a centred cursor means zero shift.
			const offsetX = smoothX - 0.5
			const offsetY = smoothY - 0.5

			// Inverted: the type counter-moves against the cursor, which is what
			// sells depth.
			style.setProperty(
				'--hero-shift-x',
				`${(-offsetX * HERO_POINTER.headingShiftX).toFixed(2)}px`
			)
			style.setProperty(
				'--hero-shift-y',
				`${(-offsetY * HERO_POINTER.headingShiftY).toFixed(2)}px`
			)
		}

		const tick = () => {
			const deltaX = rawX - smoothX
			const deltaY = rawY - smoothY

			smoothX += deltaX * HERO_POINTER.positionEase
			smoothY += deltaY * HERO_POINTER.positionEase

			const eps = HERO_POINTER.settleEpsilon
			const settled = Math.abs(deltaX) < eps && Math.abs(deltaY) < eps

			if (settled) {
				smoothX = rawX
				smoothY = rawY
			}

			write()

			// Settled: release the main thread. Any new movement restarts the loop.
			if (settled) {
				running = false
				return
			}

			frame = requestAnimationFrame(tick)
		}

		const start = () => {
			if (running) return
			running = true
			frame = requestAnimationFrame(tick)
		}

		/** Eases the type back to its laid-out position. */
		const release = () => {
			rawX = 0.5
			rawY = 0.5
			start()
		}

		const onPointerMove = (event: PointerEvent) => {
			// Viewport-relative on purpose - see the note above about layout reads.
			rawX = event.clientX / window.innerWidth
			rawY = event.clientY / window.innerHeight
			start()
		}

		const onPointerLeave = () => {
			release()
		}

		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible') release()
		}

		target.addEventListener('pointermove', onPointerMove, { passive: true })
		target.addEventListener('pointerleave', onPointerLeave)
		document.addEventListener('visibilitychange', onVisibilityChange)

		return () => {
			target.removeEventListener('pointermove', onPointerMove)
			target.removeEventListener('pointerleave', onPointerLeave)
			document.removeEventListener('visibilitychange', onVisibilityChange)
			cancelAnimationFrame(frame)

			// Safe to clear, unlike in useHeroInk: the stylesheet default for both
			// of these IS the neutral value, so removing them cannot cause a pop.
			style.removeProperty('--hero-shift-x')
			style.removeProperty('--hero-shift-y')
		}
	}, [targetRef])
}
