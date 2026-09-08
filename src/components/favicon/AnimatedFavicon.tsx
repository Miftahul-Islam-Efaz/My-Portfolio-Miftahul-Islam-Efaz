"use client"

import { useEffect, useRef } from "react"


/** Uses the verified original HTML canvas renderer for ASCII mode.
 * Tab frames update at 15fps; browsers can throttle background tabs.
 * Admin previews run the original loop independently with pause/play.
 * Reduced-motion visitors retain a still favicon. */

const SIZE = 64

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
            // Only the checked-in, verified original renderer is executed.
            const frame = document.createElement("iframe")
            frame.src = "/logo-m-loop.html?favicon"
            frame.title = "Favicon animation renderer"
            frame.setAttribute("aria-hidden", "true")
            frame.tabIndex = -1
            Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "600px", height: "600px", border: "0", pointerEvents: "none" })
            let timer = 0
            let disposed = false
            let start = performance.now()
            const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
            const oldType = link.getAttribute("type")
            link.type = "image/png"
            const paint = () => {
                if (disposed) return
                const win = frame.contentWindow as (Window & { renderLogoFrame?: (p: number, t: number) => void }) | null
                const source = frame.contentDocument?.querySelector("canvas")
                if (!win?.renderLogoFrame || !source) return
                const progress = motion.matches ? 0.55 : (((performance.now() - start) / 1000) % 4.5) / 4.5
                win.renderLogoFrame(progress, Math.floor(progress * 4.5 * 60))
                ctx.clearRect(0, 0, SIZE, SIZE)
                ctx.drawImage(source, 0, 0, SIZE, SIZE)
                link.href = canvas.toDataURL("image/png")
            }
            const schedule = () => {
                window.clearInterval(timer)
                start = performance.now()
                paint()
                if (!motion.matches) timer = window.setInterval(paint, 1000 / 15)
            }
            frame.onload = () => {
                void Promise.resolve(frame.contentDocument?.fonts.ready).then(() => { if (!disposed) schedule() })
            }
            restartRef.current = schedule
            motion.addEventListener("change", schedule)
            document.body.appendChild(frame)
            return () => {
                disposed = true
                window.clearInterval(timer)
                motion.removeEventListener("change", schedule)
                frame.remove()
                link.href = originalHref
                if (oldType === null) link.removeAttribute("type")
                else link.setAttribute("type", oldType)
                restartRef.current = () => {}
            }
        }

		/* mode === "video" */
		if (!src || reduce) return
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
