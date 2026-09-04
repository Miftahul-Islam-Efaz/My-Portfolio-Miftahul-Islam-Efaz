"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import {
	SMOOTH_EASE,
	SMOOTH_SCROLL,
	SMOOTH_TOUCH,
	isLenisPrevented,
} from "@/config/smoothScroll"

gsap.registerPlugin(ScrollTrigger)

/**
 * Owns smooth scrolling and the scroll-triggered reveals.
 *
 * Desktop runs Lenis driven off gsap.ticker so Lenis, GSAP and ScrollTrigger
 * all advance on one clock. Mobile keeps native scrolling (Lenis fights
 * momentum scroll on iOS) and just pumps ScrollTrigger.
 *
 * EVERY NUMBER LIVES IN config/smoothScroll.ts, including why it is that
 * number and what it trades against. Tune there, not here.
 *
 * ------------------------------------------------------------------
 * THE SCROLLER IS STILL THE WINDOW. THIS IS LOAD-BEARING.
 *
 * Lenis scrolls by moving the real scroll position, not by transforming a
 * wrapper element. That is why this file needs no ScrollTrigger.scrollerProxy,
 * and - much more importantly - why `position: sticky` keeps working. THE DESK
 * is held in frame by sticky rather than by a pin, on purpose, because a pin in
 * that slot shifts the pinned helix below it. A transform-based smooth-scroll
 * library would break sticky outright and take that section with it.
 *
 * So: do not introduce a wrapper/content transform setup, and do not pass
 * `wrapper`/`content` options to Lenis. The invariant in config/deskStage.ts
 * quietly depends on this one.
 */
export default function SmoothScrollProvider() {
	const pathname = usePathname()
	useEffect(() => {
		/* THE ADMIN PANEL KEEPS NATIVE SCROLL.
		 *
		 * Lenis is created stopped and is started by the reveal loader once the
		 * intro is done. /admin has no reveal loader, so it would never be
		 * started, and `.lenis.lenis-stopped { overflow: hidden }` in globals.css
		 * would leave the whole page unscrollable. A form should not inherit
		 * momentum scrolling anyway - it fights the caret while you type. */
		if (pathname?.startsWith("/admin")) return

		const isMobile = window.innerWidth <= SMOOTH_SCROLL.mobileMaxWidth
		let lenis: Lenis | undefined

		/* MOBILE RUNS LENIS TOO NOW. See THE TOUCH PROFILE in
		   config/smoothScroll.ts for what that trades away. This branch is
		   the fallback for SMOOTH_TOUCH.enabled = false, kept whole so the
		   flag stays a real switch rather than a rewrite. */
		if (isMobile && !SMOOTH_TOUCH.enabled) {
			// Passive: this listener never calls preventDefault, and saying so lets
			// the browser scroll without waiting to find out.
			window.addEventListener("scroll", ScrollTrigger.update, {
				passive: true,
			})
		} else {
			lenis = new Lenis({
				duration: SMOOTH_SCROLL.duration,
				easing: SMOOTH_EASE,
				orientation: "vertical",
				gestureOrientation: "vertical",
				smoothWheel: true,
				wheelMultiplier: SMOOTH_SCROLL.wheelMultiplier,
				touchMultiplier: SMOOTH_SCROLL.touchMultiplier,
				/* THE ONE LINE THAT PUTS THE DESKTOP FEEL ON A PHONE.

				   Deliberately off above mobileMaxWidth: a desktop has no touch
				   to sync, and enabling it there would also smooth two-finger
				   trackpad gestures that smoothWheel is already handling. */
				syncTouch: isMobile,
				syncTouchLerp: SMOOTH_TOUCH.syncTouchLerp,
				touchInertiaExponent: SMOOTH_TOUCH.touchInertiaExponent,
				/* MUST STAY FALSE - gsap.ticker below is the only thing allowed to
				   advance Lenis. True double-advances it every frame and doubles the
				   easing rate. See config/smoothScroll.ts. */
				autoRaf: false,
				/* Anchor handling stays manual. Navigation.tsx and
				   lib/scroll.ts already call lenis.scrollTo with their own
				   durations, and letting Lenis also claim in-page anchor clicks
				   means two scrolls competing for the same gesture. */
				anchors: false,
				/* Leaves wheel events native inside [data-lenis-prevent], so a
				   nested scrollable panel scrolls itself instead of the page
				   behind it. */
				prevent: isLenisPrevented,
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
	}, [pathname])

	return null
}
