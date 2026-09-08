"use client"

import { useEffect, useRef } from "react"

import {
	ASCII_POINTS,
	DECODE_GLYPHS,
	DISSOLVE_GLYPHS,
	FLICKER_GLYPHS,
	LEFT_PATH,
	RIGHT_PATH,
} from "./asciiLogoData"

/**
 * THE ANIMATED TAB ICON.
 *
 * Browsers only animate GIF favicons (Firefox) and SMIL SVG favicons
 * (Firefox again) - everywhere else the trick is older than the platform:
 * draw to a canvas and keep swapping the icon link's href. That is what
 * this does, for two sources:
 *
 *   mode="ascii"  - the ASCII-M construct loop, ported from the standalone
 *                   logo-m-animated page, glyphs first, vector M resolving
 *                   through them.
 *   mode="video"  - frames pulled from a muted looping video, cover-cropped
 *                   square.
 *
 * A setInterval, not requestAnimationFrame: rAF stops outright in background
 * tabs, and a background tab is exactly where a favicon is visible. The
 * browser throttles the interval to about 1 Hz there, which reads as a slow
 * pulse rather than a freeze.
 *
 * Reduced-motion visitors get one pristine static frame and no loop.
 *
 * The hidden button keeps an old contract: Navigation clicks
 * #trigger-favicon-animator when the wordmark is pressed, which here
 * restarts the cycle.
 */

const SIZE = 64
const BASE = 600
const CYCLE_SECONDS = 4.5
const FRAME_MS = 120

type Props = {
	mode: "ascii" | "video"
	/** Video mode only. */
	src?: string
}

function iconLink(): HTMLLinkElement {
	const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
	if (existing) return existing
	const link = document.createElement("link")
	link.rel = "icon"
	document.head.appendChild(link)
	return link
}

export default function AnimatedFavicon({ mode, src }: Props) {
	const restartRef = useRef<() => void>(() => {})

	useEffect(() => {
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches
		const canvas = document.createElement("canvas")
		canvas.width = SIZE
		canvas.height = SIZE
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		const link = iconLink()
		const originalHref = link.href

		if (mode === "ascii") {
			let pathLeft: Path2D | null = null
			let pathRight: Path2D | null = null
			try {
				pathLeft = new Path2D(LEFT_PATH)
				pathRight = new Path2D(RIGHT_PATH)
			} catch {
				/* Path2D unsupported - the glyph field alone still reads as the mark. */
			}

			let start = performance.now()
			restartRef.current = () => {
				start = performance.now()
			}

			const draw = (progress: number, tick: number) => {
				const p = progress
				const t = tick

				/* Phase machine, smooth-fade style: glyphs assemble, the vector M
				   resolves through them, holds, dissolves back to glyphs, fades out. */
				let outOpacity = 1
				let asciiOpacity = 0
				if (p < 0.05) {
					outOpacity = 0
					asciiOpacity = 0
				} else if (p < 0.28) {
					const s = 0.5 - 0.5 * Math.cos(((p - 0.05) / 0.23) * Math.PI)
					outOpacity = 0
					asciiOpacity = s * 0.95
				} else if (p < 0.44) {
					const s = 0.5 - 0.5 * Math.cos(((p - 0.28) / 0.16) * Math.PI)
					outOpacity = s
					asciiOpacity = (1 - s) * 0.95
				} else if (p < 0.7) {
					outOpacity = 1
					asciiOpacity = 0
				} else if (p < 0.84) {
					const s = 0.5 - 0.5 * Math.cos(((p - 0.7) / 0.14) * Math.PI)
					outOpacity = 1 - s
					asciiOpacity = s * 0.95
				} else if (p < 0.95) {
					const s = 0.5 - 0.5 * Math.cos(((p - 0.84) / 0.11) * Math.PI)
					outOpacity = 0
					asciiOpacity = (1 - s) * 0.95
				} else {
					outOpacity = 0
					asciiOpacity = 0
				}

				ctx.fillStyle = "#000000"
				ctx.fillRect(0, 0, SIZE, SIZE)
				ctx.save()
				ctx.scale(SIZE / BASE, SIZE / BASE)

				if (asciiOpacity > 0.005) {
					ctx.font = 'bold 13px "JetBrains Mono", "SF Mono", monospace'
					ctx.textAlign = "center"
					ctx.textBaseline = "middle"
					ctx.fillStyle = "#ffffff"

					for (let i = 0; i < ASCII_POINTS.length; i++) {
						const pt = ASCII_POINTS[i]
						let char = pt.c
						let opacity = asciiOpacity

						if (p >= 0.05 && p < 0.28) {
							const buildT = (p - 0.05) / 0.23
							const revealT =
								(pt.y / 600) * 0.55 + (Math.abs(pt.x - 300) / 300) * 0.35
							if (buildT < revealT + 0.18) {
								char = DECODE_GLYPHS[(i * 11 + t * 2) % DECODE_GLYPHS.length]
								opacity = Math.min(
									asciiOpacity,
									Math.max(0.1, (buildT - revealT + 0.18) / 0.18),
								)
							} else if ((i + t) % 9 === 0) {
								char = FLICKER_GLYPHS[(i + t) % FLICKER_GLYPHS.length]
							}
						} else if (p >= 0.84 && p < 0.95) {
							const fade = (p - 0.84) / 0.11
							const threshold =
								(1 - pt.y / 600) * 0.4 + (Math.abs(pt.x - 300) / 300) * 0.4
							if (fade > threshold) {
								char = DISSOLVE_GLYPHS[(i * 7 + t) % DISSOLVE_GLYPHS.length]
								opacity = Math.max(0, asciiOpacity * (1 - (fade - threshold) / 0.3))
							}
						} else if ((i + t) % 9 === 0) {
							char = FLICKER_GLYPHS[(i + t) % FLICKER_GLYPHS.length]
						}

						if (opacity > 0.01) {
							ctx.globalAlpha = opacity
							ctx.fillText(char, pt.x, pt.y)
						}
					}
					ctx.globalAlpha = 1
				}

				if (outOpacity > 0.01 && pathLeft && pathRight) {
					ctx.globalAlpha = outOpacity
					ctx.fillStyle = "#ffffff"
					ctx.fill(pathLeft)
					ctx.fill(pathRight)
					ctx.strokeStyle = "#ffffff"
					ctx.lineWidth = 2.5
					ctx.lineJoin = "round"
					ctx.stroke(pathLeft)
					ctx.stroke(pathRight)
					ctx.globalAlpha = 1
				}

				ctx.restore()
				link.href = canvas.toDataURL("image/png")
			}

			if (reduce) {
				/* One pristine frame, no loop. */
				draw(0.55, 0)
				return () => {
					link.href = originalHref
				}
			}

			draw(0, 0)
			const id = window.setInterval(() => {
				const elapsed = (performance.now() - start) / 1000
				draw((elapsed / CYCLE_SECONDS) % 1, Math.floor(elapsed * 10))
			}, FRAME_MS)
			return () => {
				window.clearInterval(id)
				link.href = originalHref
			}
		}

		/* mode === "video" */
		if (!src) return
		const video = document.createElement("video")
		video.muted = true
		video.loop = true
		video.playsInline = true
		/* Anonymous CORS so the canvas stays readable. If the host does not
		   allow it, toDataURL throws and the loop stops, leaving the static
		   fallback from the metadata. */
		video.crossOrigin = "anonymous"
		video.src = src
		void video.play().catch(() => {})

		const id = window.setInterval(() => {
			if (video.readyState < 2) return
			const vw = video.videoWidth
			const vh = video.videoHeight
			if (!vw || !vh) return
			const side = Math.min(vw, vh)
			ctx.fillStyle = "#000000"
			ctx.fillRect(0, 0, SIZE, SIZE)
			ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, SIZE, SIZE)
			try {
				link.href = canvas.toDataURL("image/png")
			} catch {
				window.clearInterval(id)
			}
		}, 150)
		return () => {
			window.clearInterval(id)
			video.pause()
			video.removeAttribute("src")
			link.href = originalHref
		}
	}, [mode, src])

	return (
		<button
			type="button"
			id="trigger-favicon-animator"
			hidden
			aria-hidden="true"
			tabIndex={-1}
			onClick={() => restartRef.current()}
		/>
	)
}
