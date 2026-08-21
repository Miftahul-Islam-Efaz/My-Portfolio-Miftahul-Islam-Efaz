'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { WORK_INTRO_REVEAL as R } from '../config/workIntroReveal';

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ------------------------------------------------------------------
   WORK INTRO REVEAL - "THE DRUM"

   Each character starts lying flat, edge-on to the viewer, and rotates
   up on its own bottom edge into reading position, left to right along
   the line. See `src/config/workIntroReveal.ts` for the reasoning
   behind every number.

   THE DEPTH COMES FROM CSS, NOT FROM THIS FILE.

   All this hook does is rotate characters on X. The 3D reading - the
   shear, the sense that the far end of the line is set back - comes
   from the single `perspective` on `.wi-line` in the stylesheet, which
   all the characters in that line rotate inside. If the effect ever
   goes flat, the projection is what broke: check that `.wi-word` still
   has `transform-style: preserve-3d`, because the characters are
   grandchildren of the line and the word in between will otherwise
   flatten the space. Do not "fix" it by adding `perspective()` to the
   character transforms here - that is the flat version.

   ------------------------------------------------------------------
   WHY SplitText HERE AND SplitType IN THE HERO

   The hero still uses `split-type`, and that is fine - it splits one
   short headline into characters and never has to re-measure.

   This section needs something split-type cannot do: RE-SPLITTING ON
   RESIZE. These are multi-line paragraphs, so the line boxes change
   with the viewport - and since each line box carries the perspective
   that its characters rotate inside, a split made at one width puts
   the vanishing points in the wrong places at another. `autoSplit`
   re-splits and rebuilds the tween.

   SplitText ships free inside GSAP 3.13+ (this project is on 3.14), so
   this adds no dependency.

   ------------------------------------------------------------------
   THE RULE THIS FILE LEARNED THE HARD WAY

   ANYTHING THAT TOUCHES SPLIT OUTPUT MUST BE BUILT INSIDE `onSplit`.

   The link underlines were first armed outside it, on their own
   `once: true` trigger. They showed up as static, fully-drawn rules
   sitting under animating text, because:

     - `autoSplit` re-splits on resize, throwing away the spans the
       tween was armed against and building new ones with no inline
       custom properties, and
     - `deepSlice` CUTS a nested element that wraps across two lines
       into one element per line, so "Osmin's Landscaping" becomes two
       `.wi-link` spans - and the new one was never armed either.

   Their CSS default is the finished state (fully drawn), so an unarmed
   span does not fail loudly - it just quietly renders as finished. Any
   future channel that targets split output goes on the timeline
   returned from `onSplit`, so it is rebuilt every time the split is.
   ------------------------------------------------------------------ */

/**
 * The work intro's text reveal.
 *
 * Everything is built inside a `gsap.context` scoped to the root, so teardown
 * is one `revert()` and no ScrollTrigger can leak into the pinned carousel
 * below. The SplitText instances are reverted explicitly on top of that, which
 * puts the original, unwrapped text back in the DOM.
 */
export function useWorkIntroReveal({
  rootRef,
}: {
  rootRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Reduced motion: never arm. The stylesheet's defaults are the finished
    // state, so returning here leaves the section fully rendered and readable
    // rather than leaving it hidden waiting for an animation that never runs.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Arm synchronously, before the font wait below. This is what allows the
    // stylesheet to hide the two text blocks, and it is set only now - after
    // we know motion is allowed - so the copy is never hidden by CSS alone.
    root.dataset.revealState = 'armed';

    let cancelled = false;
    let ctx: gsap.Context | null = null;
    const splits: SplitText[] = [];

    const build = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);

        /* The roll itself. Identical for both blocks apart from its timing, so
           it is written once here - the two blocks differ only in how fast the
           drum turns and how tightly the characters are packed on it.

           NOTE there is no line mask on either block. A mask would clip the
           characters to their line box, and the whole point is that a
           rolled-back character is still visible as a sliver of ink lying flat
           - that is what keeps the line's shape and length legible while it
           arrives. Clipping it would turn the roll back into a plain rise. */
        const rollTween = (
          chars: Element[],
          timing: { duration: number; stagger: number }
        ) =>
          gsap.fromTo(
            chars,
            {
              rotateX: R.roll.rotateFrom,
              y: R.roll.yFrom,
            },
            {
              rotateX: 0,
              y: 0,
              duration: timing.duration,
              ease: R.ease,
              stagger: { each: timing.stagger },
              /* The pivot. Set here rather than in CSS because GSAP writes
                 `transform-origin` as part of owning `transform`. */
              transformOrigin: R.roll.origin,
              force3D: true,
            }
          );

        /* ---------------- 1. The statement ---------------- */
        const statement = q('[data-reveal="statement"]')[0] as
          | HTMLElement
          | undefined;

        if (statement) {
          splits.push(
            SplitText.create(statement, {
              type: 'lines,words,chars',
              // Explicit classes: the stylesheet targets these, and relying on
              // SplitText's defaults would couple our CSS to GSAP internals.
              linesClass: 'wi-line',
              wordsClass: 'wi-word',
              charsClass: 'wi-char',
              // Puts the full sentence back on the parent as an aria-label and
              // hides the fragments, so a screen reader reads one sentence
              // instead of spelling out every character.
              aria: 'auto',
              autoSplit: true,
              onSplit: (self) => {
                // The block was hidden while we waited for fonts. Reveal it now
                // that the characters are in place and pre-rotated - so what
                // becomes visible is the animation's frame 0.
                gsap.set(statement, { opacity: 1 });

                const tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: statement,
                    start: R.roll.statement.start,
                    once: true,
                  },
                  // Drop the compositor layers once the type has landed.
                  onComplete: () => statement.classList.add('wi-settled'),
                });

                tl.add(rollTween(self.chars, R.roll.statement));

                return tl;
              },
            })
          );
        }

        /* ---------------- 2. The credits ----------------
           Same roll, tighter and quicker - see the config. The underlines
           ride the SAME timeline, per the rule at the top of this file. */
        const credits = q('[data-reveal="credits"]')[0] as
          | HTMLElement
          | undefined;

        if (credits) {
          splits.push(
            SplitText.create(credits, {
              type: 'lines,words,chars',
              linesClass: 'wi-line',
              wordsClass: 'wi-word',
              charsClass: 'wi-char',
              aria: 'auto',
              autoSplit: true,
              onSplit: (self) => {
                gsap.set(credits, { opacity: 1 });

                const tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: credits,
                    start: R.roll.credits.start,
                    once: true,
                  },
                  onComplete: () => credits.classList.add('wi-settled'),
                });

                tl.add(rollTween(self.chars, R.roll.credits), 0);

                /* The underlines. Queried HERE, from the freshly split DOM,
                   so every span the split produced is armed - including the
                   extra ones `deepSlice` creates when a link wraps across two
                   lines, and including everything rebuilt after a resize. */
                const links = Array.from(
                  credits.querySelectorAll<HTMLElement>('.wi-link')
                );

                if (links.length) {
                  // Length of the roll, in this timeline's own seconds. The
                  // underline positions are fractions of it, so they stay in
                  // proportion if the copy or the stagger changes.
                  const roll =
                    R.roll.credits.duration +
                    (self.chars.length - 1) * R.roll.credits.stagger;

                  /* `--link-ink` brings the rule up from nothing as it draws,
                     so a name whose characters are still rolling in does not
                     already have a finished white rule under it. */
                  tl.fromTo(
                    links,
                    { '--link-draw': 0, '--link-ink': 0 },
                    {
                      '--link-draw': 1,
                      '--link-ink': 1,
                      ease: 'none',
                      duration: R.links.duration,
                      stagger: (roll * R.links.span) / links.length,
                    },
                    roll * R.links.at
                  );
                }

                return tl;
              },
            })
          );
        }

        /* ---------------- 3. The portrait ----------------
           Mask opens upward while the image settles out of a push-in. The
           lag between the two is what reads as depth. */
        const frame = q('[data-reveal="frame"]')[0] as HTMLElement | undefined;

        if (frame) {
          const media = q('[data-reveal="frame-media"]');

          gsap.set(frame, { '--frame-in': 0 });
          if (media.length) gsap.set(media, { scale: R.frame.imageFrom });

          const frameTrigger = {
            trigger: frame,
            start: R.frame.start,
            once: true,
          } as const;

          gsap.to(frame, {
            '--frame-in': 1,
            duration: R.frame.duration,
            ease: R.ease,
            scrollTrigger: frameTrigger,
          });

          if (media.length) {
            gsap.to(media, {
              scale: 1,
              // Longer than the mask on purpose: the image is still drifting
              // after the frame has finished opening.
              duration: R.frame.duration * 1.3,
              ease: R.ease,
              force3D: true,
              scrollTrigger: frameTrigger,
            });
          }
        }

        /* ---------------- 4. The signature writes ---------------- */
        const signature = q('[data-reveal="signature"]')[0] as
          | HTMLElement
          | undefined;

        if (signature) {
          gsap.set(signature, { '--sig-write': 0 });
          gsap.to(signature, {
            '--sig-write': 1,
            duration: R.signature.duration,
            // Even through the middle so the stroke speed stays constant, the
            // way a pen moves. expo.out here would make it snap and stop.
            ease: 'power1.inOut',
            delay: R.signature.delay,
            scrollTrigger: {
              trigger: signature,
              start: R.signature.start,
              once: true,
            },
          });
        }
      }, root);
    };

    /* Split only once webfonts have settled. Splitting against fallback
       metrics puts the line breaks in the wrong places - and since each line
       box carries the perspective its characters rotate inside, a wrong break
       puts the vanishing point in the wrong place too. `document.fonts.ready`
       is the only reliable signal for this. */
    if (document.fonts?.status === 'loaded') {
      build();
    } else {
      void document.fonts?.ready.then(build);
    }

    return () => {
      cancelled = true;
      ctx?.revert();
      // Puts the original unwrapped text back, independent of the context.
      splits.forEach((split) => split.revert());
      delete root.dataset.revealState;
    };
  }, [rootRef]);
}

export default useWorkIntroReveal;
