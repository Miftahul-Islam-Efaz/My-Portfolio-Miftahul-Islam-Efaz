'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { getLenis } from '@/lib/scroll';
import { clearReturnHome, peekReturnHome } from '@/lib/vaultReturn';
import {
	hasSeenIntro,
	isDeepLink,
	markIntroPlayed,
	markIntroSeen,
	shouldPlayIntro,
} from '@/lib/introGate';
import { readRememberedScroll, startScrollMemory } from '@/lib/scrollMemory';
import VaultWindow from './vault/VaultWindow';
import RevealLoader from './ui/reveal-loader';
import Navigation from './Navigation';
import Hero from './Hero';
import HeroToWorkCut from './transitions/HeroToWorkCut';
import RakeSection from './rake/RakeSection';
import WebsiteProjectsShowcase from './WebsiteProjectsShowcase';
import VaultTeaser from './vault/VaultTeaser';
import ContactSection from './contact/ContactSection';
import FooterBlurReveal from './footer/FooterBlurReveal';

gsap.registerPlugin(ScrollTrigger);

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
 *   HeroToWorkCut( Hero ) -> RakeSection -> WebsiteProjectsShowcase
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
/* useLayoutEffect warns when React renders it on the server, and this
   component IS server-rendered. useEffect is the correct no-op there:
   the branch below only ever matters in a browser. */
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function HomeShell() {
	/* ARE WE ARRIVING, OR COMING BACK?

	   Read once, in the initialiser, because the answer decides whether
	   the curtain is rendered AT ALL. Deciding it in an effect instead
	   would mount RevealLoader, paint one frame of a black screen over a
	   page the visitor was already looking at, and then remove it - the
	   flash being precisely the thing this is here to prevent.

	   Peeked rather than consumed: initialisers may run twice in
	   StrictMode, so the clearing happens once, in the effect below.
	   See lib/vaultReturn.ts. */
	const [homecoming] = useState(peekReturnHome);
	const returning = homecoming.returning;

	/* THE STANDALONE CLOSE'S SECOND HALF. A direct /vault close navigates
	   here with the return flag set (see VaultStandalone), and the outro
	   is owed to the visitor over the LIVE page: this mounts the same
	   VaultWindow already closing, so the wipe and the photograph's
	   retreat reveal the landing page exactly as the open covered it.
	   It unmounts itself when the outro ends. */
	const [vaultOutro, setVaultOutro] = useState(returning);

	/* All three start where the intro would have LEFT them, so a return
	   lands on a page that is simply already running: no curtain, hero
	   timeline done, video allowed, scrolling unlocked. */
	/* IS THIS A REAL ARRIVAL, OR JUST A MOUNT?

	   Read in the initialiser for the same reason as the homecoming
	   above: the curtain must never be rendered and then withdrawn.

	   This is the general case that `returning` was a special case of.
	   The room-close flag patched one route that navigates home; this
	   catches every route that does, including the ones that do not know
	   they need to. Both are kept: they answer different questions, and
	   the homecoming flag still carries WHERE to scroll to. */
	const [freshLoad] = useState(shouldPlayIntro);

	/* The curtain is skipped on a homecoming OR on any mount that is not
	   the document's own first one. Where it is skipped, all three flags
	   start where the intro would have left them, so the page is simply
	   already running: no curtain, hero timeline done, video allowed,
	   scrolling unlocked. */
	const skipIntro = returning || !freshLoad;

	const [hasIntroPlayed, setHasIntroPlayed] = useState(skipIntro);
	const [introExiting, setIntroExiting] = useState(skipIntro);
	const [introComplete, setIntroComplete] = useState(skipIntro);

	/* Refs and not state: nothing below re-renders on these, and both are
	   written in a layout effect that must not schedule another pass. */
	const introSuppressed = useRef(skipIntro);
	const rememberedScroll = useRef<number | null>(null);

	/* THE DEEP-LINK CASE, AND WHY IT IS HERE RATHER THAN IN skipIntro.

	   Reloading inside a room - /#work/<slug>, /#work - loads the landing
	   DOCUMENT, so the pathname is '/' and the state above quite
	   reasonably decides the curtain should play. It should not: the room
	   is about to open over it.

	   But the hash is never sent to the server, so this cannot be decided
	   in the initialiser like the other two. The server would render the
	   curtain, the client's first render would omit it, and React would
	   throw away the server HTML and rebuild the tree - reconnecting GSAP,
	   ScrollTrigger and Lenis to detached nodes.

	   A LAYOUT effect runs after hydration has matched and before the
	   browser paints, so the curtain is never seen. This is the one place
	   the "decide it in the initialiser or it flashes" rule cannot apply,
	   and a layout effect is the reason it does not have to. */
	useIsomorphicLayoutEffect(() => {
		/* Read here, before the scroll listener further down starts and
		   overwrites it with this document's own first scroll event. */
		rememberedScroll.current = readRememberedScroll();

		if (skipIntro) return;

		/* Two reasons to withhold the curtain, both invisible to the
		   server: the visitor is landing inside a room, or they have
		   already been greeted this session. */
		if (!isDeepLink() && !hasSeenIntro()) return;

		introSuppressed.current = true;
		setHasIntroPlayed(true);
		setIntroExiting(true);
		setIntroComplete(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		/* CONSUME THE RETURN FLAG. It was read into state above, so clearing it here is what guarantees the next genuine reload plays the intro. */
		try {
			clearReturnHome();
		} catch (e) {
			console.error(e);
		}

		/* SPEND THE ONE-PER-DOCUMENT TOKEN. Here rather than in the
		   curtain's onExitComplete, because it must be spent even when the
		   curtain never ran, and even if the visitor navigates away while
		   it is still counting. Reaching this line at all means the intro
		   has had its chance in this document. */
		markIntroPlayed();
		markIntroSeen();

		const handleReplayIntro = () => {
			setHasIntroPlayed(false);
			setIntroExiting(false);
			setIntroComplete(false);

			/* The head script may have hidden the curtain outright for this
			   document. A hand-triggered replay has to lift that, or React
			   remounts RevealLoader into a rule that keeps it invisible and
			   the replay silently does nothing. */
			document.documentElement.removeAttribute('data-intro-skip');

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

	/* PUT THEM BACK WHERE THEY WERE.

	   Declared AFTER the lock effect on purpose - effects run in order,
	   so Lenis has been started and ScrollTrigger refreshed by the time
	   this runs. Scrolling a stopped Lenis does nothing.

	   Jumped, not animated: this is a restoration, not a journey. Being
	   smoothly flown down the whole page would tell the visitor they had
	   gone back to the top, which is the impression being fixed.

	   TWICE, and that is not superstition. The work section's carousel
	   is PINNED, so the document's height depends on ScrollTrigger
	   having measured it - and on this first commit the pin's spacer may
	   not exist yet, which would clamp the jump short. The second pass,
	   one frame later, lands against the settled layout. Both are cheap
	   and the first one prevents a visible correction. */
	useEffect(() => {
		if (!returning) return;
		clearReturnHome();

		const target = document.getElementById(homecoming.section);
		if (!target) return;

		const jump = () => {
			ScrollTrigger.refresh();
			const lenis = getLenis();
			if (lenis) {
				/* `force` because Lenis ignores programmatic scrolls while it
				   considers itself stopped, and `immediate` to skip the ease. */
				lenis.scrollTo(target, { immediate: true, force: true });
			} else {
				target.scrollIntoView({ block: 'start' });
			}
		};

		jump();
		const frame = requestAnimationFrame(jump);
		return () => cancelAnimationFrame(frame);
	}, [returning]);

	/* THE SAME RESTORATION, FOR A RELOAD RATHER THAN A ROOM.

	   The effect above handles coming home from a room, which knows the
	   SECTION to land on. A reload has no section - it has a pixel offset,
	   remembered by lib/scrollMemory.ts - but the mechanics are identical
	   and every word of the comment above applies here, including why the
	   jump has to happen twice.

	   Guarded on `returning` so the two can never fight over the same
	   scroll: a homecoming knows a section, and a section is the better
	   answer than an offset.

	   Guarded on the suppression flag because this must not run when the
	   curtain is actually playing. The intro holds scroll at the top and
	   ends by releasing it; jumping down the page underneath it would be
	   undone a moment later, and seen happening. */
	useEffect(() => {
		if (returning) return;
		if (!introSuppressed.current) return;

		const top = rememberedScroll.current;
		if (!top) return;

		const jump = () => {
			ScrollTrigger.refresh();
			const lenis = getLenis();
			if (lenis) {
				lenis.scrollTo(top, { immediate: true, force: true });
			} else {
				window.scrollTo(0, top);
			}
		};

		jump();
		const frame = requestAnimationFrame(jump);
		return () => cancelAnimationFrame(frame);
	}, [returning]);

	/* Declared last on purpose: the restoration above reads the stored
	   offset, and this overwrites it on the very first scroll event of
	   the new document. Effects run in order, so reading wins. */
	useEffect(() => startScrollMemory(), []);

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
				<main className={introExiting && !introComplete ? 'intro-wiping' : ''}>
					{/* Hero -> work. The cut holds the hero on screen and consumes
					    it: letterbox squeeze, light-leak flare, dithered wipe into
					    the work section's black. No divider - the join is never
					    drawn, it is edited. Tuned in config/heroToWorkCut.ts. */}
					<HeroToWorkCut>
						<Hero isStarted={introExiting} isComplete={introComplete} />
					</HeroToWorkCut>

					{/* THE RAKE. Scroll does not play an animation here, it moves a
					    light: one hard ember blade sweeps a corrugated wall, and the
					    statement is engraved into that wall - invisible until the
					    light reaches it, holding a cooling ember once it passes. It
					    answers "who is this" straight after the hero, in the hero's
					    own visual language, then points down at the work as proof.
					    Tuned in config/rakeLight.ts. */}
					<RakeSection />

					<WebsiteProjectsShowcase />
					{/* THE VAULT, teased. The hand carries the open folder in from
					    the left on scroll and the archive escapes out of it - small
					    folders on arcs, trailing lit dust. No resources are listed
					    on the landing page; the folder is a door to /vault and that
					    is the whole section.

					    Last inside <main> on purpose: there is deliberately NO
					    transition overlay between work and vault - the page cuts
					    from the work section straight onto this section's own
					    black, and the hand swings up out of that void. Tuned in
					    config/vault.ts.

					    id="vault" lives on this section and is the landing spot a
					    return from the standalone /vault document scrolls to. */}
					<div className="my-[10vh]">
						<VaultTeaser />
					</div>

					<ContactSection />

					<FooterBlurReveal />

					
				</main>
			</div>

			{/* The outro of a standalone /vault close, played over the live
			    page. startClosing mounts the window mid-exit - no intro, no
			    interaction, just the wipe and the retreat - then it hands
			    back and is unmounted. */}
			{vaultOutro && (
				<VaultWindow startClosing onClose={() => setVaultOutro(false)} />
			)}
		</>
	);
}
