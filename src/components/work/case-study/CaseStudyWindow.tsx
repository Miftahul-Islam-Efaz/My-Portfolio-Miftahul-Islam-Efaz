'use client';

import { uiSoundHandlers } from '@/lib/uiSounds';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import type { WorkCaseStudy } from '../types';
import CaseStudyBody from './CaseStudyBody';
import {
  CASE_STUDY_CTA,
  CASE_STUDY_SECTIONS,
  CASE_STUDY_TABS,
  SECTION_TAB,
  CASE_STUDY_SURFACE,
  SECTION_ACTIVE_LINE,
  COVER_PARALLAX,
  WINDOW_MOTION,
  type CaseStudySectionId,
  type CaseStudyTabId,
} from '@/config/caseStudy';
import type { OpenOrigin } from '@/hooks/useCaseStudyOverlay';
import {
  SMOOTH_EASE,
  SMOOTH_SCROLL,
  SMOOTH_TOUCH,
  shouldSyncTouch,
} from '@/config/smoothScroll';

/* Inline rather than an icon dependency: four glyphs at 14px, all in
   currentColor so they inherit the bar's light/dark flip for free. */
function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* THE MEET MARK, IN ITS OWN COLOURS. The previous note here argued that four
   brand colours would make the pill the loudest thing on the page - which was
   true when the pill was a blue-grey slab. On a near-white pill the mark is
   the size of a full stop and reads as an app badge, exactly as it does in the
   reference, so the neutral camera is dropped. Not currentColor: it must NOT
   follow the bar's polarity flip.

   Deliberately a simplified mark rather than the official artwork: five filled
   shapes at 16px, which is all that survives at this size. */
/**
 * The Google Meet mark, as supplied.
 *
 * Kept as the full 48x48 artwork and scaled down by the width/height
 * attributes rather than being redrawn at 16px: the original hand-traced
 * version was an approximation of this shape, and there is no reason to
 * approximate artwork we have. The viewBox does the scaling, so the glyph
 * stays sharp at any size.
 *
 * No `fill="currentColor"` anywhere in here, deliberately - every path
 * carries its own brand colour, and this is the one mark in the bar that
 * must NOT inherit the header's light/dark ink flip.
 */
function CallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <rect
        width="16"
        height="16"
        x="12"
        y="16"
        fill="#fff"
        transform="rotate(-90 20 24)"
      />
      <polygon fill="#1e88e5" points="3,17 3,31 8,32 13,31 13,17 8,16" />
      <path fill="#4caf50" d="M37,24v14c0,1.657-1.343,3-3,3H13l-1-5l1-5h14v-7l5-1L37,24z" />
      <path fill="#fbc02d" d="M37,10v14H27v-7H13l-1-5l1-5h21C35.657,7,37,8.343,37,10z" />
      <path fill="#1565c0" d="M13,31v10H6c-1.657,0-3-1.343-3-3v-7H13z" />
      <polygon fill="#e53935" points="13,7 13,17 3,17" />
      <polygon fill="#2e7d32" points="38,24 37,32.45 27,24 37,15.55" />
      <path
        fill="#4caf50"
        d="M46,10.11v27.78c0,0.84-0.98,1.31-1.63,0.78L37,32.45v-16.9l7.37-6.22C45.02,8.8,46,9.27,46,10.11z"
      />
    </svg>
  );
}

/* THREE BARS, and the middle one is shorter on purpose: at 15px a
   perfectly even hamburger reads as a smudge, and the asymmetry is what
   makes it legible as a menu at this size. currentColor, so it follows
   the bar's ink like every other glyph here except the Meet mark. */
function MenuBarsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h11M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

/* The landing dropdown's arrow (nav-menu.css .navmenu__arrow), inlined here
   so the overflow menu runs the same slide-in. currentColor picks up the
   accent from the stylesheet. */
function ArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * THE CASE STUDY WINDOW. The surface that arrives when a card is clicked.
 *
 * WHAT IS COPIED FROM THE REFERENCE, and only this:
 *   1. The claim is set OVER the showcase image, not above it. The cover is one
 *      screen: image, one line, one credential chip.
 *   2. The bar is three floating glass groups - a round back button, a tab
 *      pill, and an action pill - that the document passes UNDERNEATH. They
 *      flip polarity once paper is behind them.
 *   3. Nested pills: the active tab and the call to action are RAISED inside
 *      their container rather than outlined.
 *   4. One prose section, then two plates. A dotted-leader spec list.
 *
 * THE GLASS IS ONE SURFACE IN BOTH POLARITIES. The bar used to flip its type
 * from bone to ink when paper arrived under it, and every mistiming of that
 * flip left the controls invisible against whatever was behind them. The pills
 * now carry a #b3b9c9 body dense enough to read over the photograph AND over
 * paper, so only the veil's alpha moves at the boundary and the label colour is
 * constant. The highlight is that same colour lifted toward white rather than
 * white itself, which is what keeps it in the family.
 *
 * ONE MARGIN. --cs-gutter, set in the stylesheet, is spent by the bar, the
 * cover text, the prose and the plates. The crowding reported on the cover was
 * three different insets, not type that was set too large.
 *
 * WHY A PORTAL. The helix is pinned with ScrollTrigger's pinType:'transform',
 * so the stage carries a transform - and a transform on an ancestor makes
 * `position: fixed` resolve against THAT element instead of the viewport. A
 * window rendered inside the section would scroll away with the pin. It goes to
 * document.body, above the nav's stacking band.
 *
 * ------------------------------------------------------------------------
 * THE SCROLL, and why the first attempt at it did nothing.
 *
 * This window runs its OWN Lenis instance, nested on the scroller via
 * `wrapper`/`content`, with the landing page's exact numbers. The first version
 * of this was constructed correctly and still felt like native scroll, because
 * of one line in lenis.mjs:
 *
 *   composedPath.find(node => ... node.hasAttribute?.('data-lenis-prevent'))
 *      -> if found, the event is discarded.
 *
 * That check runs inside EVERY Lenis instance's virtual scroll, and it walks
 * the whole composed path - which includes the wrapper. So `data-lenis-prevent`
 * on the scroller, the attribute that stops the PAGE's Lenis swallowing these
 * events, was also telling THIS window's Lenis to ignore them. Every wheel
 * event fell through to native scrolling. Flat, zero inertia, exactly as
 * reported.
 *
 * AND THEN IT WAS STILL FLAT, for a second and much dumber reason: this
 * component returns null until `mounted` is true, because the portal needs a
 * DOM to aim at. So on the only pass where the effect ran, the scroller did not
 * exist yet and the effect returned early - and its dependency list was
 * [study.id], which does not change when `mounted` flips. The instance was
 * never constructed at all. `mounted` is now in the deps of all three
 * effects, which is also why the frost was mistiming: same bug, same list.
 *
 * The attribute cannot simply be dropped from the markup either: it is what
 * keeps the page instance's preventDefault off this element, and it is the
 * fallback path when smoothing is off. So it is set in the markup and REMOVED
 * for exactly as long as this window's own instance is alive - and restored on
 * teardown. The page instance is already stopped by useCaseStudyOverlay, so
 * nothing behind this window moves in the meantime.
 * ------------------------------------------------------------------------
 *
 * WHY THE BAR IS NOT IN THE SCROLLER. It is absolutely positioned over it, as a
 * sibling. `position: sticky` inside the scroller would work, but the blur
 * would be compositing against its own scrolling ancestor, and Safari drops
 * backdrop-filter in exactly that arrangement.
 *
 * WHY STATE COMES FROM IntersectionObserver, not scrollTop. A smoothed scroller
 * may report a scrollTop that lags the pixels on screen, and any future move to
 * transform-based scrolling would leave scrollTop at 0 forever. An observer
 * watches the rendered geometry, so the frost and the active tab track what is
 * actually under the bar regardless of what moves the content. No ScrollTrigger
 * anywhere near this - the helix runs at refreshPriority 1 and a stray pin at
 * the default 0 has broken the carousel before.
 */
/* One roll column per glyph, three identical copies deep. The split happens
   here rather than in the stylesheet because CSS cannot address a character;
   the index goes out as --i and the stylesheet turns it into the stagger.

   The label is spoken once, from a clipped copy, and every glyph column is
   hidden from assistive tech - otherwise the button announces itself as
   seventeen separate letters. */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="case-study__roll">
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
      {Array.from(text).map((ch, i) => (
        <span
          key={ch + '-' + i}
          className="case-study__roll-char"
          style={{ '--i': i } as CSSProperties}
          aria-hidden
        >
          <span>{ch}</span>
          <span>{ch}</span>
          <span>{ch}</span>
        </span>
      ))}
    </span>
  );
}

const MemoCaseStudyBody = memo(CaseStudyBody);

export default function CaseStudyWindow({
  study,
  origin,
  closing,
  onClose,
  onOpenStudy,
}: {
  study: WorkCaseStudy;
  /** Viewport point the cover flies from - the cursor at click time. */
  origin: OpenOrigin | null;
  closing: boolean;
  onClose: () => void;
  /** Swap this window to another project without closing it - the "next
   *  project" card at the foot of the document. The same opener the carousel
   *  tiles use, so the URL, the history entry and the plate flight all behave
   *  exactly as they do when opening from the grid. */
  onOpenStudy?: (id: string, origin: OpenOrigin) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState<CaseStudyTabId>('cover');
  /* THE MOBILE SECTION NAV. On a phone the four-stop pill is replaced by
     one control that names the section you are in and opens the rest as a
     sheet - see the PASS 4 block in work-case-study.css for why four
     labels in a row was the wrong shape for a 390px bar.

     Deliberately NOT the same state as menuState below: that is the
     kebab's own three-phase machine (it has an exit swing to play out).
     This panel is CSS-transitioned on an attribute, so a boolean is the
     whole requirement, and sharing one variable would mean opening the
     kebab closed the section nav and vice versa - which is right, but it
     is enforced explicitly in the two toggles below instead, where it can
     be read. */
  const [navOpen, setNavOpen] = useState(false);
  const [frosted, setFrosted] = useState(false);
  /* Three states rather than two, exactly the landing NavMenu's state
     machine: 'closing' exists because the exit swing has somewhere to go,
     and unmounting on click would cut it off after one frame. The panel
     stays mounted for the length of the close, deaf to pointer events, and
     only then goes back to 'closed'. */
  const [menuState, setMenuState] = useState<'closed' | 'open' | 'closing'>('closed');
  const menuOpen = menuState === 'open';
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeMenu = () => setMenuState((s) => (s === 'open' ? 'closing' : s));
  /* Portals need a DOM to aim at, and this component is rendered from a client
     component that still runs once on the server. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* ---- SMOOTHING. The landing page's feel, on this scroller. ---- */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = scroller?.querySelector<HTMLElement>('.case-study__doc');
    if (!scroller || !content) return;

    /* ---- TOUCH KEEPS ITS OWN SCROLLING. ----

       Everything below this line exists to make a WHEEL feel like the landing
       page. A finger does not need it: this instance runs with
       syncTouch:false, so on a phone it smooths nothing at all and the
       browser's own momentum - which is tuned per platform and runs off the
       main thread - is what actually moves the document.

       So on touch it is pure cost: a second rAF subscriber on gsap.ticker, a
       wheel/touch listener stack, and the removal of data-lenis-prevent, which
       is the attribute that keeps the PAGE's Lenis from calling preventDefault
       on gestures inside this window. Bailing here leaves that attribute in
       place, which is the documented fallback path - see the note on the
       markup - and goToSection already branches to native scrollTo when there
       is no instance.

       TWO TESTS, AND THE FIRST VERSION OF THIS SHIPPED WITH ONE. Matching on
       (pointer: coarse) alone is what let the crash below be reached: a phone
       is coarse AND narrow, but a desktop window dragged down to phone width -
       or a device-toolbar preview with touch emulation off - is narrow and
       FINE-pointered, so the test passed and this went on to build a nested
       smooth scroller.

       SmoothScrollProvider keys off width alone (window.innerWidth <=
       SMOOTH_SCROLL.mobileMaxWidth), so at that size the PAGE has no Lenis at
       all and is scrolling natively. A smoothed window inside a natively
       scrolling page is the mismatch this whole effect exists to prevent, so
       the window now follows the page's own rule as well as the pointer's.

       The pointer test still earns its place: a 1024px tablet is wide enough
       to keep the page instance and still has no wheel to smooth. */
    /* THE BAIL NOW HAS AN EXCEPTION, AND THE LONG NOTE ABOVE IS HISTORY.

       With SMOOTH_TOUCH.enabled the PAGE does smooth touch at and below
       mobileMaxWidth, so bailing here would recreate the very mismatch
       that note describes, only in the other direction: a natively
       scrolling window inside a smoothed page. When touch smoothing is
       on we build the instance and let syncTouch below drive the finger.

       The crash this bail once stood in for is fixed properly at
       pageOptions below - it is capability-tested now - so reaching this
       code at phone width is safe either way.

       A wide coarse-pointer tablet still bails: it keeps the page's
       instance, has no wheel to smooth, and with touch smoothing off for
       its width there is nothing here for it to match. */
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const phoneWidth = window.innerWidth <= SMOOTH_SCROLL.mobileMaxWidth;
    const touchSmooth = shouldSyncTouch();
    if (!touchSmooth && (coarsePointer || phoneWidth)) return;

    /* No reduced-motion bail here, deliberately. The brief is that this
       scroller must feel like the landing page, and SmoothScrollProvider runs
       Lenis unconditionally on desktop - so bailing here would reintroduce the
       exact mismatch being reported, on any machine with the OS setting on. */
    /* See the note above: this attribute would make this very instance discard
       its own wheel events. Off while we own the scrolling, back on after. */
    scroller.removeAttribute('data-lenis-prevent');

    /* With the attribute gone, the page's Lenis would start seeing these wheel
       events itself. It is stopped, and a stopped instance calls
       preventDefault and drops them - harmless here, but only by luck of
       listener order. Its `prevent` predicate is checked BEFORE that branch
       (lenis.mjs:609 vs :613), so pointing it at this subtree makes the page
       instance ignore these events outright, whichever listener runs first. */
    const pageLenis = (window as unknown as { lenis?: Lenis }).lenis;

    /* THE GLOBAL IS UNTRUSTED, AND THIS LINE FORGOT IT. See the long note in
       lib/scroll.ts: window.lenis is a plain global on a page that also runs
       HMR, a dev overlay and three nested Lenis instances, and below
       SMOOTH_SCROLL.mobileMaxWidth the provider never writes it at all - so
       whatever is sitting on that name may be a stale or half-destroyed
       instance rather than a live one. That module exists because exactly this
       assumption once reached a visitor as "lenis.scrollTo is not a function".

       `pageLenis?.options.prevent` guarded the WRONG HALF. Optional chaining
       stops at the object and then reads .prevent off an undefined .options,
       which is the "Cannot read properties of undefined (reading 'prevent')"
       this threw when the window was opened at phone width.

       So: capability-test it the way getLenis() does, and treat a failed test
       as "there is no page Lenis" - which is a fully supported state, not an
       error. data-lenis-prevent in the markup already covers that case on its
       own, so there is nothing to fall back TO; the swap simply does not
       happen. */
    const pageOptions =
      pageLenis && typeof pageLenis.options === 'object' && pageLenis.options
        ? pageLenis.options
        : undefined;
    const previousPrevent = pageOptions?.prevent;
    if (pageOptions) {
      pageOptions.prevent = (node: HTMLElement) =>
        Boolean(node.closest?.('.case-study__scroller')) || Boolean(previousPrevent?.(node));
    }

    const lenis = new Lenis({
      wrapper: scroller,
      content,
      /*/* Shares the landing page's numbers exactly, imported from
         config/smoothScroll.ts. An earlier pass tightened the duration
         here, which is what read as lag: less glide per gesture, so the
         window felt closer to native scroll than the page around it.
         Retune the landing page and this moves with it. */
      duration: SMOOTH_SCROLL.duration,
      easing: SMOOTH_EASE,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: SMOOTH_SCROLL.touchMultiplier,
      syncTouch: touchSmooth,
      syncTouchLerp: SMOOTH_TOUCH.syncTouchLerp,
      touchInertiaExponent: SMOOTH_TOUCH.touchInertiaExponent,
      /* No scroll chaining out of the window into the page behind it. */
      overscroll: false,
      /* Driven off gsap.ticker below instead, so this instance and the page's
         advance on one clock. Two rAF loops drifting against each other reads
         as a stutter. */
      autoRaf: false,
    });

    lenisRef.current = lenis;
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      if (pageOptions) pageOptions.prevent = previousPrevent;
      scroller.setAttribute('data-lenis-prevent', '');
    };
  }, [study.id, mounted]);

  /* ---- FROST. A 1px probe sitting just below the bar's height. ---- */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const probe = probeRef.current;
    if (!scroller || !probe) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFrosted(!entry.isIntersecting),
      { root: scroller, threshold: 0 }
    );
    observer.observe(probe);
    return () => observer.disconnect();
  }, [study.id, mounted]);

  /* ---- ACTIVE TAB. Whichever section holds the middle of the window. ---- */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const sections = CASE_STUDY_SECTIONS.map((section) =>
      scroller.querySelector<HTMLElement>(`[data-section="${section.id}"]`)
    ).filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;

    /* A band across the middle of the scroller: a section is current while it
       covers that band. Collapsing the root to a line is what stops two
       sections claiming the tab at the same time. */
    const margin = Math.round(SECTION_ACTIVE_LINE * 100);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          /* EIGHT SECTIONS, FOUR TABS. The observer watches the document's
             sections, because those are what a reader is actually inside. The
             pill only has room for four stops, so the section holding the
             middle of the window is mapped up to the tab that covers it -
             which is why adding a ninth section never touches this file. */
          const id = entry.target.getAttribute('data-section') as
            | CaseStudySectionId
            | null;
          if (id && SECTION_TAB[id]) setActive(SECTION_TAB[id]);
        }
      },
      {
        root: scroller,
        rootMargin: `-${margin - 1}% 0px -${100 - margin}% 0px`,
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [study.id, mounted]);

  /* ---- THE HIGHLIGHT'S GEOMETRY. Measured, not guessed. ---- */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const place = () => {
      const current = tabs.querySelector<HTMLElement>('[data-active="true"]');
      if (!current) return;
      /* offsetLeft is relative to the nav's border box and the indicator is
         positioned from that same origin, so there is no padding arithmetic
         here to fall out of step with the stylesheet. */
      tabs.style.setProperty('--cs-ind-x', `${current.offsetLeft}px`);
      tabs.style.setProperty('--cs-ind-w', `${current.offsetWidth}px`);
      tabs.dataset.ready = 'true';
    };

    const frame = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    /* Optima arrives after first paint, and the labels change width when it
       does - without this the highlight is measured against fallback metrics. */
    document.fonts?.ready.then(place).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
    };
  }, [active, mounted]);

  /* ---- A NEW PROJECT STARTS AT THE TOP ----
     The window does not unmount when the "next project" card swaps the study
     underneath it, so without this the reader would arrive at the new project
     already scrolled to wherever they had got to in the old one. Immediate
     rather than smooth: this is a different document, not a jump within one,
     and the entry animation is already playing over it. */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    lenisRef.current?.scrollTo(0, { immediate: true });
    scroller.scrollTop = 0;
    setActive('cover');
  }, [study.id]);

  /* ---- COVER PARALLAX: the photograph lags, the floor deepens. ---- */
  useEffect(() => {
    const scroller = scrollerRef.current;
    /* The hero, by position rather than by name: the first section in the
       running order is the cover, whatever it ends up being called. */
    const cover = scroller?.querySelector<HTMLElement>(
      `[data-section="${CASE_STUDY_SECTIONS[0].id}"]`
    );
    if (!scroller || !cover) return;

    let frame = 0;
    /* Cached, and only re-measured on resize: reading offsetHeight inside
       a scroll-driven frame forces layout every frame - the main-thread
       stall that made this window feel heavier than the landing page. */
    let coverHeight = cover.offsetHeight || 1;
    /* Phones get no shift and therefore no zoom - see
       COVER_PARALLAX.disableBelow for why the small screen is the one that
       should not be paying for this. Re-read on resize alongside the height,
       so a rotation or a desktop window drag lands in the right mode. */
    const narrow = window.matchMedia(
      `(max-width: ${COVER_PARALLAX.disableBelow}px)`
    );
    let plateTravel = narrow.matches ? 0 : COVER_PARALLAX.maxShift;
    const onResize = () => {
      coverHeight = cover.offsetHeight || 1;
      plateTravel = narrow.matches ? 0 : COVER_PARALLAX.maxShift;
    };
    window.addEventListener('resize', onResize);
    let lastProgress = -1;
    let lastHeight = -1;
    let lastTravel = -1;
    const apply = () => {
      frame = 0;
      const height = coverHeight || 1;
      const top = scroller.scrollTop;
      const progress = Math.min(1, Math.max(0, top / height));
      // Avoid repeated style invalidation after the cover leaves view.
      if (progress === lastProgress && height === lastHeight && plateTravel === lastTravel) return;
      lastProgress = progress;
      lastHeight = height;
      lastTravel = plateTravel;

      /* Tells the stylesheet when the hero is fully behind us, so the two
         blurred corner layers can be switched off for the whole rest of the
         document. Guarded, because assigning a dataset value is a DOM write
         and this runs on every scroll frame - the flag flips twice per visit,
         not sixty times a second. */
      const past = progress >= 1 ? 'true' : 'false';
      if (cover.dataset.coverPast !== past) cover.dataset.coverPast = past;

      /* The photograph lags the document, and the lag is capped. Frame
         differencing the reference gave a steady 0.61x for the first ~340px of
         travel and 1.0x after that - which is a clamp on the offset, not a
         curve on the rate. Written in px off scrollTop rather than off
         progress, so the hand-off to 1.0x lands at the same place on any
         viewport height. */
      const shift = Math.min(top * COVER_PARALLAX.lag, plateTravel);
      cover.style.setProperty('--cs-plate-shift', `${shift.toFixed(2)}px`);

      /* The zoom exists only to cover what the shift uncovers, so it is derived
         from the cap and the live height rather than typed in: a short cover
         and a tall one need different proportions to hide the same slide. */
      cover.style.setProperty(
        '--cs-plate-zoom',
        (1 + (plateTravel * COVER_PARALLAX.headroom) / height).toFixed(4)
      );

      cover.style.setProperty(
        '--cs-cover-dark',
        Math.min(1, progress * COVER_PARALLAX.darken).toFixed(3)
      );
    };

    /* Read in the listener, write in a frame. Lenis moves this scroller by
       setting scrollTop, so one plain scroll listener covers both the smoothed
       path and the native fallback - no second code path to keep in sync. */
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [study.id, mounted]);

  /* The overflow menu closes on any pointer outside it. Escape already closes
     the whole window, which is the more useful binding for that key. */
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  /* Retire 'closing' once the exit swing has had its time - 190ms, the
     landing dropdown's close duration (NAV_MENU_MOTION.closeDuration). */
  useEffect(() => {
    if (menuState !== 'closing') return;
    menuCloseTimer.current = setTimeout(() => setMenuState('closed'), 190);
    return () => {
      if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    };
  }, [menuState]);

  /* The section sheet closes on any pointer outside the tabs group. Same
     shape as the kebab's dismissal above, and pointerdown rather than
     click so a scroll gesture that starts outside it also dismisses. */
  useEffect(() => {
    if (!navOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!tabsRef.current?.contains(event.target as Node)) setNavOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [navOpen]);

  /* A a phone rotated to landscape crosses the breakpoint with the sheet
     still open, which would leave the desktop pill rendered in its open
     state. Nothing visual depends on this - the CSS ignores the attribute
     above 640px - but the stale 'true' would come back on rotating home. */
  useEffect(() => {
    if (!navOpen) return;
    const onResize = () => setNavOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [navOpen]);

  const goToSection = (tabId: CaseStudyTabId) => {
    /* Picking a stop dismisses the sheet. Before the scroll, so the panel
       is already retracting while the document travels. */
    setNavOpen(false);
    const scroller = scrollerRef.current;
    /* A tab scrolls to the FIRST section of its group - the `target` on the tab
       record - rather than to a section that shares its name, because three of
       the four tabs cover more than one section. */
    const id =
      CASE_STUDY_TABS.find((tab) => tab.id === tabId)?.target ??
      CASE_STUDY_SECTIONS[0].id;
    const target = scroller?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!scroller || !target) return;
    /* Cover sits at the very top, so it wants zero rather than a negative
       offset; anything below gets clearance for the floating bar. A plain
       number is passed rather than the element so the same call works whether
       Lenis is running or the native fallback is. */
    const top = id === CASE_STUDY_SECTIONS[0].id ? 0 : target.offsetTop - 96;

    if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 1 });
    else scroller.scrollTo({ top, behavior: 'smooth' });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="case-study"
      {...uiSoundHandlers}
      data-state={closing ? 'closing' : 'open'}
      role="dialog"
      aria-modal="true"
      aria-label={`${study.title} case study`}
      style={{
        /* Motion values come from config/caseStudy.ts; the CSS only knows how
           to spend them. The origin is a pair of viewport pixels, so it has to
           arrive as a variable - it differs on every open. */
        ['--cs-open' as string]: `${WINDOW_MOTION.openDuration}ms`,
        ['--cs-close' as string]: `${WINDOW_MOTION.closeDuration}ms`,
        ['--cs-open-ease' as string]: WINDOW_MOTION.openEase,
        ['--cs-close-ease' as string]: WINDOW_MOTION.closeEase,
        ['--cs-plate' as string]: `${WINDOW_MOTION.plateDuration}ms`,
        ['--cs-plate-rotate' as string]: `${WINDOW_MOTION.plateFromRotation}deg`,
        ['--cs-plate-scale' as string]: `${WINDOW_MOTION.plateFromScale}`,
        ['--cs-origin-x' as string]: `${origin?.x ?? window.innerWidth / 2}px`,
        ['--cs-origin-y' as string]: `${origin?.y ?? window.innerHeight / 2}px`,
        ['--cs-rise' as string]: `${WINDOW_MOTION.contentRise}px`,
        ['--cs-rise-duration' as string]: `${WINDOW_MOTION.contentDuration}ms`,
        ['--cs-rise-stagger' as string]: `${WINDOW_MOTION.contentStagger}ms`,
        ['--cs-rise-delay' as string]: `${Math.round(
          WINDOW_MOTION.openDuration * WINDOW_MOTION.contentDelayRatio
        )}ms`,
        /* Surface. The window is the one light room in a dark house. */
        ['--cs-paper' as string]: CASE_STUDY_SURFACE.paper,
        ['--cs-paper-raised' as string]: CASE_STUDY_SURFACE.paperRaised,
        ['--cs-plate-bg' as string]: CASE_STUDY_SURFACE.plate,
        ['--cs-ink' as string]: CASE_STUDY_SURFACE.ink,
        ['--cs-ink-mid' as string]: CASE_STUDY_SURFACE.inkMid,
        ['--cs-ink-low' as string]: CASE_STUDY_SURFACE.inkLow,
        ['--cs-on-dark' as string]: CASE_STUDY_SURFACE.onDark,
        ['--cs-hair' as string]: CASE_STUDY_SURFACE.hair,
        ['--cs-dot' as string]: CASE_STUDY_SURFACE.dot,
        ['--cs-ember' as string]: CASE_STUDY_SURFACE.ember,
      }}
    >
      {/* The wipe surface. Everything else rides inside it, so nothing can be
          seen before the mask has passed it. */}
      <div className="case-study__panel">
        {/* ---- THE FLOATING BAR ---- */}
        <header className="case-study__bar" data-frosted={frosted ? 'true' : 'false'}>
          <div className="case-study__bar-left">
            <button
              type="button"
              className="case-study__back"
              onClick={onClose}
              aria-label="Close case study"
            >
              <ChevronLeft />
            </button>

            <nav
              className="case-study__tabs"
              aria-label="Case study sections"
              ref={tabsRef}
              data-nav-open={navOpen ? 'true' : 'false'}
            >
              {/* THE PHONE CONTROL. Display:none above the breakpoint, so
                  the desktop bar is untouched by everything in this block.

                  It names the CURRENT section rather than saying "Menu":
                  the four-tab pill's real job was never navigation - it was
                  telling you where you are in a long document - and that is
                  the part a hamburger alone would have thrown away.

                  aria-expanded/aria-controls rather than a role="menu":
                  the panel it opens is the same list of real buttons the
                  desktop shows, so it is a disclosure, not a menu widget. */}
              <button
                type="button"
                className="case-study__nav-trigger"
                onClick={() => {
                  setNavOpen((open) => !open);
                  /* One panel at a time - see the note on navOpen. */
                  closeMenu();
                }}
                aria-expanded={navOpen}
                aria-controls="cs-section-list"
              >
                <span className="case-study__nav-trigger-icon" aria-hidden>
                  <MenuBarsIcon />
                </span>
                <span className="case-study__nav-trigger-label">
                  {CASE_STUDY_TABS.find((tab) => tab.id === active)?.label ??
                    CASE_STUDY_TABS[0].label}
                </span>
              </button>

              {/* The four stops. One element on both layouts: a row inside
                  the pill on desktop, a stacked sheet under the trigger on a
                  phone. Same buttons, same handler, so there is no second
                  navigation to keep in step with this one. */}
              <span className="case-study__tab-list" id="cs-section-list">
              {/* THE HIGHLIGHT IS ONE ELEMENT, not a state on each tab. A
                  background that re-paints on the newly active tab cannot
                  animate, however it is eased - there is nothing continuous
                  between the two boxes to interpolate. One element slides and
                  re-widths between them instead. */}
              <span className="case-study__tab-indicator" aria-hidden />

              {CASE_STUDY_TABS.map((tab) => {
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className="case-study__tab"
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => goToSection(tab.id)}
                  >
                    {/* The icon marks the active tab, but its slot is present
                        in every tab and only fades. Mounting it on the active
                        one would change that tab's width mid-transition and
                        drag the highlight's target out from under it. */}
                    <span className="case-study__tab-icon" aria-hidden>
                      <PageIcon />
                    </span>
                    <RollLabel text={tab.label} />
                  </button>
                );
              })}
              </span>
            </nav>
          </div>

          <div className="case-study__bar-right">
            {/* An empty href renders an inert button rather than a link to
                nowhere - see the note on CASE_STUDY_CTA. */}
            {CASE_STUDY_CTA.href ? (
              <a
                className="case-study__cta"
                href={CASE_STUDY_CTA.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="case-study__cta-icon">
                  <CallIcon />
                </span>
                <RollLabel text={CASE_STUDY_CTA.label} />
              </a>
            ) : (
              <button
                type="button"
                className="case-study__cta"
                data-pending="true"
                title="Booking link not wired yet"
              >
                <span className="case-study__cta-icon">
                  <CallIcon />
                </span>
                <RollLabel text={CASE_STUDY_CTA.label} />
              </button>
            )}

            {/* The reference's three-dot menu, given two real items rather than
                left decorative: a menu that opens nothing is a button drawn to
                look like a menu. */}
            <div className="case-study__menu" ref={menuRef}>
              <button
                type="button"
                className="case-study__menu-button"
                onClick={() => {
                  setMenuState((s) => (s === 'open' ? 'closing' : 'open'));
                  setNavOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More options"
              >
                <DotsIcon />
              </button>

              {menuState !== 'closed' ? (
                <div className="case-study__menu-list" role="menu" data-state={menuState}>
                  <a
                    role="menuitem"
                    href={study.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                  >
                    <span className="case-study__menu-arrow" aria-hidden>
                      <ArrowRight />
                    </span>
                    <span className="case-study__menu-text">Visit live site</span>
                  </a>
                  {study.repoUrl ? (
                    <a
                      role="menuitem"
                      href={study.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMenu}
                    >
                      <span className="case-study__menu-arrow" aria-hidden>
                        <ArrowRight />
                      </span>
                      <span className="case-study__menu-text">Source on GitHub</span>
                    </a>
                  ) : null}
                  <button type="button" role="menuitem" onClick={onClose}>
                    <span className="case-study__menu-arrow" aria-hidden>
                      <ArrowRight />
                    </span>
                    <span className="case-study__menu-text">Close case study</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* data-lenis-prevent IS LOAD-BEARING, in both directions. The PAGE's
            Lenis binds wheel and touch on the window and calls preventDefault,
            so an element that scrolls inside the page never sees its own events
            - stopping that Lenis stops it MOVING the page, not swallowing the
            events. This attribute is its documented opt-out. It is also read by
            this window's own Lenis, which is why the effect above removes it
            while that instance is alive. */}
        <div
          className="case-study__scroller"
          ref={scrollerRef}
          data-lenis-prevent
        >
          {/* The frost probe. A 1px line just below the bar: while it is in
              view, nothing has passed underneath yet. Geometry rather than a
              scrollTop threshold, so smoothing cannot desynchronise it. */}
          <div className="case-study__frost-probe" ref={probeRef} aria-hidden />
          <MemoCaseStudyBody study={study} onOpenStudy={onOpenStudy} />
        </div>
      </div>
    </div>,
    document.body
  );
}
