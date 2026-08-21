'use client';

import React, { useRef } from 'react';
import { WORK_THEME } from './workTheme';
import { useWorkIntroReveal } from '../../hooks/useWorkIntroReveal';
import { useIntroPortraitLens } from '../../hooks/useIntroPortraitLens';
import '../../styles/work-intro-reveal.css';

/* ------------------------------------------------------------------
   This component is MARKUP ONLY. All of its motion lives in:

     src/config/workIntroReveal.ts    choreography + reasoning
     src/hooks/useWorkIntroReveal.ts  split + ScrollTriggers
     src/hooks/useIntroPortraitLens.ts  the hover lens follow
     src/styles/work-intro-reveal.css   masks, clips, underlines

   The reveal hook finds its targets through the `data-reveal`
   attributes below, so this file never imports gsap and never renders
   per frame. Add a target by adding an attribute, not by adding
   animation code here.

   WHY framer-motion IS GONE FROM THIS FILE

   The two columns used to be `whileInView` block fades - the whole
   paragraph sliding up as one rectangle. That is the effect the text
   reveal replaces, so the wrappers went with it. It also means this
   file no longer mixes two animation engines: framer-motion driving
   the containers while GSAP drives the words inside them is how you
   get two owners for one `transform` and intermittent conflicts.

   ------------------------------------------------------------------
   LAYOUT: THE PORTRAIT SITS BELOW THE TEXT

   This was a two-column grid, portrait on the left of the copy. It is
   now a single column: statement, credits, then the portrait beneath
   them. Worth knowing why the grid is gone entirely rather than
   collapsed to `col-span-12` - with one item per row a 12-column grid
   is just a flex column with extra arithmetic, and the portrait's
   width is set by its own `max-w`, not by a column span.

   A side effect worth keeping: the signature hangs off the portrait's
   top-left corner, and while the portrait was at the top of the
   section that put it directly under the fixed "EFAZ" nav logo, where
   the two overlapped. Moving the portrait down the page separates
   them without either one having to move independently.
   ------------------------------------------------------------------ */

interface WorkIntroHeaderProps {
  accentColor?: string;
}

/* The dithered treatment. This is what the section shows at rest, and it is
   the finished portrait as far as a reader who never hovers is concerned. */
const PORTRAIT_BASE =
  'https://lh3.googleusercontent.com/d/1Dy4a9WdsBGGaWEQgNX9Cpsdzp35_ol1A';

/* The sharp photograph, revealed only inside the lens. */
const PORTRAIT_REVEAL =
  'https://lh3.googleusercontent.com/d/19if7NOqg0vbflJmTxvGjo61RnZFJtygk';

/* Kept as the base layer's fallback. Both new sources are Google-hosted, so
   they are one account permission change away from 403-ing; if that happens the
   section still shows a portrait instead of a broken-image glyph. */
const PORTRAIT_FALLBACK =
  'https://res.cloudinary.com/dr2tc3dyk/image/upload/w_640,q_auto,f_auto/v1780231578/my_image_hthdxq.png';

export const WorkIntroHeader: React.FC<WorkIntroHeaderProps> = ({
  accentColor = WORK_THEME.accent,
}) => {
  // Scope for the whole reveal. Every ScrollTrigger and split the hook makes
  // is created inside a context bound to this node, so nothing can leak into
  // the pinned carousel below.
  const rootRef = useRef<HTMLDivElement>(null);

  // The lens needs the frame itself, not the section: its pointer coordinates
  // are measured against this element's own box.
  const frameRef = useRef<HTMLDivElement>(null);

  useWorkIntroReveal({ rootRef });
  useIntroPortraitLens({ frameRef });

  // Hover colour for the product names, passed as a custom property so it
  // follows the accent prop instead of a hardcoded hex. The underline itself
  // is a pseudo-element in the stylesheet, because `text-decoration` cannot
  // be animated and these underlines draw themselves.
  const linkStyle = {
    '--intro-accent': accentColor,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="relative w-full pt-12 pb-16 px-6 md:px-12 lg:px-20 z-10 font-sans"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-16 lg:gap-24">

        {/* TYPOGRAPHY.
            Capped at max-w-5xl rather than running the full 7xl: the measure
            is what makes these two blocks read as a statement instead of as a
            wall, and it is now the only thing setting the line breaks that the
            split masks are built against. */}
        <div className="flex flex-col space-y-8 max-w-5xl">
          <div className="relative">
            {/* The statement: line-masked word rise, fires once. */}
            <h2
              data-reveal="statement"
              style={{ fontFamily: '"TikTok Sans", "Roboto", sans-serif' }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-[#F2EDE3] leading-[1.18]"
            >
              I explore how to shape AI-era workflows with craft and taste, building the next generation of digital products.
            </h2>
          </div>

          {/* The credits: scroll-scrubbed word ink. Words resolve from dim to
              full as you scroll through them, so the animation paces the
              reading rather than blocking it. */}
          <p
            data-reveal="credits"
            style={{ fontFamily: '"TikTok Sans", "Roboto", sans-serif' }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#8A8279] font-normal leading-[1.25]"
          >
            I’m building{' '}
            <span className="wi-link" style={linkStyle}>
              reunimos™
            </span>
            , and previously worked on{' '}
            <span className="wi-link" style={linkStyle}>
              Osmin's Landscaping
            </span>
            ,{' '}
            <span className="wi-link" style={linkStyle}>
              Pencil Link
            </span>
            , and{' '}
            <span className="wi-link" style={linkStyle}>
              10+ custom products
            </span>
            .
          </p>
        </div>

        {/* PORTRAIT, below the copy.
            `aspect-[3/4]` matches the source images' own ratio, so
            `object-cover` has nothing to crop and the two layers cannot
            disagree about which part of the face is on screen. */}
        <div className="relative flex justify-start">
          <div
            ref={frameRef}
            data-reveal="frame"
            className="wi-frame wi-lens relative w-full max-w-[420px] aspect-[3/4] rounded-sm overflow-hidden bg-[#131110] shadow-2xl"
          >
            {/* BASE: the dithered treatment.

                No `contrast-110 brightness-95` filters any more. Those were
                tuned for the old untreated photograph; pushing contrast on an
                already-dithered image crushes the stipple into flat black and
                loses the grain that makes it worth looking at. */}
            <img
              data-reveal="frame-media"
              src={PORTRAIT_BASE}
              alt="Efaz Studio"
              width={640}
              height={853}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = PORTRAIT_FALLBACK;
              }}
              className="wi-frame-media wi-lens-media w-full h-full object-cover"
            />

            {/* REVEAL: the sharp photograph, masked to a soft circle that
                follows the cursor.

                It carries `data-reveal="frame-media"` too, which is what keeps
                it locked to the base: the reveal hook grabs every element with
                that attribute and scales them as ONE set, so the entry drift
                cannot pull the two layers out of register.

                Decorative, and a duplicate of the base's subject, so it is
                hidden from assistive tech rather than announced twice.

                On failure the frame is marked not-ready and the stylesheet
                drops this layer, so hovering does nothing at all instead of
                revealing a broken-image icon inside the window. */}
            <img
              data-reveal="frame-media"
              src={PORTRAIT_REVEAL}
              alt=""
              aria-hidden="true"
              width={640}
              height={853}
              loading="lazy"
              decoding="async"
              onError={() => {
                frameRef.current?.setAttribute('data-lens-ready', 'false');
              }}
              className="wi-frame-media wi-lens-media wi-lens-reveal w-full h-full object-cover"
            />

            {/* Subtle gradient glow. `pointer-events-none` is required, not
                cosmetic - see the note on `.wi-lens-media`: the frame has to
                stay the pointer target or the lens coordinates shift. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>

          {/* Signature - "HI", the greeting, not the name.
              The name is already on the page twice (the fixed nav logo and the
              credits copy), so signing it a third time was repetition; a
              handwritten "HI" next to the portrait reads as the person
              introducing themselves instead.

              This is deliberately a SIBLING of the portrait frame, not a child.
              The frame is `overflow-hidden` (it has to be, to clip the lens
              layer and the mask reveal), so a signature placed inside it gets
              sliced off at the edge and can never spill out. Sitting out here
              it can hang past the top-left corner and break onto the section
              background, which is what creates the effect.

              It writes itself on left-to-right via a mask sweep - see
              `.wi-signature`. The mask lives on this wrapper rather than on the
              <svg> so the drop-shadow below is masked along with the strokes,
              instead of a full shadow sitting under an unwritten signature.

              THE SVG BOX IS SIZED TO THE INK. It was 360x160 to fit "Efaz";
              two letters occupy roughly half that. The width matters because
              the write-on mask sweeps across the WRAPPER, not across the
              glyphs - leaving the old box would spend most of the sweep
              crossing empty space to the right of the word, so the signature
              would appear to finish writing and then stall while the mask
              caught up. Resize this box if the word ever changes again. */}
          <div
            data-reveal="signature"
            className="wi-signature pointer-events-none absolute -top-14 -left-10 z-30 select-none -rotate-[18deg]"
            style={{ filter: 'drop-shadow(0 2px 14px rgba(0,0,0,0.55))' }}
          >
            <svg
              width="190"
              height="160"
              viewBox="0 0 190 160"
              fill="none"
              className="overflow-visible"
            >
              <text
                x="10"
                y="112"
                fill="#FFFFFF"
                fontFamily="'BrittanySignature', 'Caveat', cursive"
                fontSize="110"
                fontWeight="normal"
                letterSpacing="1px"
              >
                HI
              </text>
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkIntroHeader;
