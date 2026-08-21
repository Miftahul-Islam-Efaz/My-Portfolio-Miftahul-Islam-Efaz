"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * Owns smooth scrolling and the scroll-triggered reveals.
 *
 * Desktop runs Lenis driven off gsap.ticker so Lenis, GSAP and ScrollTrigger
 * all advance on one clock. Mobile keeps native scrolling (Lenis fights
 * momentum scroll on iOS) and just pumps ScrollTrigger.
 */
export default function SmoothScrollProvider() {
	useEffect(() => {
		const isMobile = window.innerWidth <= 768
		let lenis: Lenis | undefined

		if (isMobile) {
			window.addEventListener("scroll", ScrollTrigger.update)
		} else {
			lenis = new Lenis({
				duration: 0.9,
				easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
				orientation: "vertical",
				gestureOrientation: "vertical",
				smoothWheel: true,
				wheelMultiplier: 0.9,
				touchMultiplier: 1.8,
				syncTouch: false,
			})

			// Exposed so buttons and the nav can hand scrolls to Lenis.
			;(window as unknown as { lenis?: Lenis }).lenis = lenis

			lenis.on("scroll", ScrollTrigger.update)

			const raf = (time: number) => lenis?.raf(time * 1000)
			gsap.ticker.add(raf)
			gsap.ticker.lagSmoothing(0)

			// The reveal loader covers the first paint, so scrolling starts locked.
			lenis.stop()
		}

		// Deferred so the DOM (including the dynamic canvas) has mounted.
		const scan = window.setTimeout(() => {
			document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
				const kind = el.dataset.reveal
				const delay = parseFloat(
					getComputedStyle(el).getPropertyValue("--delay") || "0",
				)
				const shared = {
					scrollTrigger: { trigger: el, start: "top 88%", once: true },
					ease: "power2.out",
					delay,
				}

				if (kind === "fade-left") {
					gsap.fromTo(el, { x: -30, opacity: 0 },
						{ x: 0, opacity: 1, duration: 0.6, ...shared })
				} else if (kind === "clip-up") {
					gsap.fromTo(el, { clipPath: "inset(100% 0 0 0)" },
						{ clipPath: "inset(0 0 0 0)", duration: 0.9, ...shared })
				} else {
					gsap.fromTo(el, { y: 25, opacity: 0 },
						{ y: 0, opacity: 1, duration: 0.7, ...shared })
				}
			})
			ScrollTrigger.refresh()
		}, 100)

		return () => {
			window.clearTimeout(scan)
			window.removeEventListener("scroll", ScrollTrigger.update)
			ScrollTrigger.getAll().forEach((t) => t.kill())
			lenis?.destroy()
			delete (window as unknown as { lenis?: Lenis }).lenis
		}
	}, [])

	return null
}