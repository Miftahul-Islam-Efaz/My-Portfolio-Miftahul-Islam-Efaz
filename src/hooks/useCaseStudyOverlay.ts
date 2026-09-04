'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLenis } from '@/lib/scroll';
import { CASE_STUDY_HASH_PREFIX, WINDOW_MOTION } from '@/config/caseStudy';
import {
  caseStudySlug,
  getCaseStudy,
  getCaseStudyBySlug,
} from '@/components/work/caseStudyData';
import { onHomeRequest } from '@/lib/homeBus';

/**
 * Lifecycle of the case study window: which project is open, where it opened
 * from, and everything that has to be true about the rest of the page while it
 * is.
 *
 * WHY THIS IS A HOOK AND NOT STATE IN THE COMPONENT. Opening the window has
 * four side effects that have nothing to do with rendering it - Lenis has to
 * stop, the body has to stop scrolling behind it, Escape has to close it, and
 * the WebGL helix underneath has to be told to pause so a pinned canvas is not
 * burning frames behind an opaque surface. Keeping them here means the window
 * component only ever draws.
 *
 * CLOSING IS TWO-PHASE. `closing` stays true for the length of the close
 * animation so the window can play its wipe out before it unmounts; the id is
 * only cleared at the end. Anything reading `openId` therefore sees the
 * project for the whole exit, which is what the exit animation needs.
 */

export type OpenOrigin = { x: number; y: number };

export type CaseStudyOverlayController = {
  /** The project currently open, or null. Stays set during the close wipe. */
  openId: string | null;
  /** True while the exit animation is playing. */
  closing: boolean;
  /** Viewport coordinates the window was opened from - the hero plate flies
   *  from here, so it starts where the cursor was. */
  origin: OpenOrigin | null;
  open: (id: string, origin: OpenOrigin) => void;
  close: () => void;
};

export function useCaseStudyOverlay(options?: {
  /** Called with true when the window takes the screen. The helix pauses. */
  onOccludedChange?: (occluded: boolean) => void;
}): CaseStudyOverlayController {
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [origin, setOrigin] = useState<OpenOrigin | null>(null);

  /* Held in a ref as well as state so the unmount cleanup can restore the page
     without depending on the value it captured at mount. */
  const exitTimer = useRef<number | null>(null);
  /* True when the CURRENT openId arrived from the URL - a Back/Forward step or
     a deep link on arrival. The address is already correct in that case, and
     pushing it again would add a duplicate entry, which is what turns Back
     into a button that appears to do nothing. */
  const fromHistory = useRef(false);
  /* So the rewind below cannot strip a deep-link hash on first mount, before
     the study it points at has been opened. */
  const everOpened = useRef(false);
  const onOccludedChange = options?.onOccludedChange;

  const open = useCallback(
    (id: string, from: OpenOrigin) => {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
      setClosing(false);
      setOrigin(from);
      setOpenId(id);
    },
    []
  );

  const close = useCallback(() => {
    setClosing((already) => {
      if (already) return already;
      exitTimer.current = window.setTimeout(() => {
        exitTimer.current = null;
        setOpenId(null);
        setClosing(false);
        setOrigin(null);
      }, WINDOW_MOTION.closeDuration);
      return true;
    });
  }, []);

  /* Page state while the window is up. Lenis is stopped rather than the body
     being given overflow:hidden alone: Lenis drives scroll with a transform,
     so it keeps running - and keeps ScrollTrigger updating the pinned helix -
     no matter what overflow says. */
  useEffect(() => {
    if (!openId) return;

    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.classList.add('case-study-open');
    onOccludedChange?.(true);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('case-study-open');
      lenis?.start();
      onOccludedChange?.(false);
    };
  }, [openId, close, onOccludedChange]);

  /* ARRIVING ON A LINK. If the page loads with #work/<slug>, open that study
     immediately. origin stays null, so the cover flies from the middle of the
     viewport rather than from a cursor that was never there. */
  useEffect(() => {
    const { hash } = window.location;
    if (!hash.startsWith(CASE_STUDY_HASH_PREFIX)) return;
    const study = getCaseStudyBySlug(
      decodeURIComponent(hash.slice(CASE_STUDY_HASH_PREFIX.length))
    );
    if (!study) return;
    fromHistory.current = true;
    setOrigin(null);
    setOpenId(study.id);
  }, []);

  /* THE ADDRESS BAR FOLLOWS THE WINDOW.

     pushState rather than replaceState, and one entry per project: opening a
     study and then walking through three "next project" cards leaves four
     entries, so Back retraces the reading order and eventually lands back on
     the page with nothing open. Skipped while `closing` is true - the id
     survives the exit animation, and rewriting the URL mid-wipe would fight
     the rewind below. */
  useEffect(() => {
    if (!openId || closing) return;
    const study = getCaseStudy(openId);
    if (!study) return;

    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }

    const target = CASE_STUDY_HASH_PREFIX + caseStudySlug(study);
    if (window.location.hash !== target) {
      window.history.pushState(null, '', target);
    }
  }, [openId, closing]);

  /* BACK AND FORWARD MOVE BETWEEN PROJECTS. Off our hash entirely means
     close; a different study means swap to it without pushing a new entry,
     which is what fromHistory suppresses. */
  useEffect(() => {
    if (!openId) return;

    const onPop = () => {
      const { hash } = window.location;
      if (!hash.startsWith(CASE_STUDY_HASH_PREFIX)) {
        close();
        return;
      }
      const wanted = getCaseStudyBySlug(
        decodeURIComponent(hash.slice(CASE_STUDY_HASH_PREFIX.length))
      );
      if (!wanted) {
        close();
        return;
      }
      if (wanted.id !== openId) {
        fromHistory.current = true;
        setOrigin(null);
        setOpenId(wanted.id);
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [openId, close]);

  /* REWIND, and only once nothing is open. Deliberately not in the cleanup of
     the push effect: that cleanup also runs when one project swaps for
     another, where rewinding would overwrite the entry we just made. The hash
     is only taken back out if it is STILL ours - a close that came from the
     Back button has already moved the URL, and rewriting it would eat a
     second history entry. */
  useEffect(() => {
    if (openId) {
      everOpened.current = true;
      return;
    }
    if (!everOpened.current) return;
    if (!window.location.hash.startsWith(CASE_STUDY_HASH_PREFIX)) return;
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', pathname + search);
  }, [openId]);

  /* THE WORDMARK CLOSES THIS TOO. A study is a full takeover at z-index
     99992, but the header is above it and holds the only control on the
     site that means "home" from inside every room. Bound only while a
     study is open, so nothing listens the rest of the time, and it runs
     the ordinary two-phase close rather than a hard unmount - the exit
     wipe plays exactly as it does from the back button. */
  useEffect(() => {
    if (!openId) return;
    return onHomeRequest(close);
  }, [openId, close]);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    []
  );

  /* Memoised because consumers legitimately want to depend on "the overlay"
     in an effect, and a fresh object each render turns that into a rebuild
     loop. `open` and `close` are already stable, so this only changes when
     the window actually opens, closes or starts its exit. */
  return useMemo(
    () => ({ openId, closing, origin, open, close }),
    [openId, closing, origin, open, close]
  );
}

export default useCaseStudyOverlay;
