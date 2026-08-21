'use client';

import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import RevealLoader from './ui/reveal-loader';
import Navigation from './Navigation';
import Hero from './Hero';
import HeroToWorkCut from './transitions/HeroToWorkCut';
import WebsiteProjectsShowcase from './WebsiteProjectsShowcase';
import PixelDissolveTransition from './ui/PixelDissolveTransition';

gsap.registerPlugin(ScrollTrigger);

/** Lenis is owned by SmoothScrollProvider and published on window. */
type LenisLike = { start: () => void; stop: () => void };
const getLenis = (): LenisLike | undefined =>
  (window as unknown as { lenis?: LenisLike }).lenis;

/**
 * Owns the intro handshake, exactly as HomePage.tsx did in the React app.
 *
 * The page is a server component, so this client shell holds the three pieces
 * of intro state and gates the tree below it:
 *   - introExiting  -> the curtain has started wiping up. Scrolling unlocks and
 *                      the hero entry timeline begins, so the hero animates in
 *                      *behind* the departing curtain rather than after it.
 *   - introComplete -> the curtain is gone. The hero video is allowed to play.
 *
 * Section order is the whole page structure, so keep this list readable:
 *   HeroToWorkCut( Hero ) -> WebsiteProjectsShowcase
 *
 * Note the shape: the hero is a CHILD of the transition, not a sibling of it.
 * Transitions here act on the section they are consuming, so each one owns its
 * outgoing section and lives in `transitions/`. The joins are as easy to find
 * and edit as the sections themselves.
 *
 * Testimonials, VibeCheckPopup, FaviconAnimator and CustomCursor are not part
 * of this build, so they are absent here. Everything else is the original
 * structure and ordering.
 */
export default function HomeShell() {
	const [hasIntroPlayed, setHasIntroPlayed] = useState(false);
	const [introExiting, setIntroExiting] = useState(false);
	const [introComplete, setIntroComplete] = useState(false);

	useEffect(() => {
		// Clear any stale sessionStorage flag that was blocking the intro from playing
		try {
			sessionStorage.removeItem('intro_played');
		} catch (e) {
			console.error(e);
		}

		const handleReplayIntro = () => {
			setHasIntroPlayed(false);
			setIntroExiting(false);
			setIntroComplete(false);
			const lenis = getLenis();
			if (lenis) {
				lenis.stop();
			} else {
				document.body.style.overflow = 'hidden';
			}
			window.scrollTo(0, 0);
		};

		window.addEventListener('replay_intro', handleReplayIntro);
		return () => {
			window.removeEventListener('replay_intro', handleReplayIntro);
		};
	}, []);

	// Sync scroll lock and refresh ScrollTrigger once the loader starts exiting.
	// The refresh matters: the carousel pin and the cut's scroll range are both
	// measured while the curtain is still up.
	useEffect(() => {
		const lenis = getLenis();
		if (lenis) {
			if (introExiting) {
				lenis.start();
				ScrollTrigger.refresh();
			} else {
				lenis.stop();
			}
		} else {
			if (introExiting) {
				document.body.style.overflow = '';
				ScrollTrigger.refresh();
			} else {
				document.body.style.overflow = 'hidden';
			}
		}
	}, [introExiting]);

	return (
		<>
			{!hasIntroPlayed && (
				<RevealLoader
					onExitStart={() => {
						setIntroExiting(true);
					}}
					onExitComplete={() => {
						setHasIntroPlayed(true);
						setIntroComplete(true);
					}}
					isStarted={true}
				/>
			)}

			<div
				className="relative w-full"
				style={{
					opacity: 1,
					pointerEvents: introExiting ? 'auto' : 'none',
				}}
			>
				<Navigation />
				<main>
					{/* Hero -> work. The cut holds the hero on screen and consumes
					    it: letterbox squeeze, light-leak flare, dithered wipe into
					    the work section's black. No divider - the join is never
					    drawn, it is edited. Tuned in config/heroToWorkCut.ts. */}
					<HeroToWorkCut>
						<Hero isStarted={introExiting} isComplete={introComplete} />
					</HeroToWorkCut>

					<WebsiteProjectsShowcase />
				</main>
				{/* Work -> next-section dissolve. Progress is read from the live
				    position of #projects. */}
				<PixelDissolveTransition />
			</div>
		</>
	);
}
