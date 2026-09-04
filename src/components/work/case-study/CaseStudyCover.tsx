'use client';

/**
 * SECTION 1 - THE HERO.
 *
 * Project name, one impact headline, one main visual, one live-site link. That
 * is the whole brief for this section and it is the reason this file exists
 * separately from CaseStudyBody: the cover is the only part of the document
 * with behaviour (a pointer-following cue and a click target), and
 * CaseStudyBody should stay a reading order rather than a reading order plus an
 * event system.
 *
 * WHAT CHANGED AND WHY. The big display type over the image used to be `hook` -
 * the problem line. It read as a magazine pull-quote, and a visitor arriving
 * from the helix could not tell WHICH project they had opened without reading a
 * sentence and inferring it. The title now takes the display slot, and the hook
 * moves to the right-hand column where it belongs: the name identifies, the
 * headline argues.
 *
 * The grid itself is untouched: the original laid this out as `'claim note'`
 * and collapses it below 900px, so this is a swap of content between two
 * existing areas, not a new layout.
 *
 * WHY THERE IS NO LONGER A "VISIT LIVE SITE" BUTTON HERE. There were three
 * routes to the same URL inside one screen - the cursor cue, a pill under the
 * headline, and the exit link in the foot - and the pill was the weakest of
 * them: it sat in the reading column, so it broke the headline block in half
 * and competed with the header's own CTA pill for the same attention. The
 * affordance is not lost. The entire cover image is the link (see the anchor
 * below), the cursor cue announces that on hover, and the foot repeats it at
 * the point someone has finished reading and wants to go and look.
 *
 * The one case that used to justify the pill - touch and keyboard, where the
 * hover cue never appears - is covered by the image anchor being a real,
 * focusable link with an aria-label, plus the foot's link. So removing it costs
 * nothing and buys back the composition of the right-hand column.
 *
 * THE CHARACTER SPLIT stays on the title. The arrival ramp
 * (#f7bc78 -> #f9c98f -> #fff, per-character, ~11.5ms apart) is what makes the
 * window feel like it opens rather than appears, and a title is a better
 * subject for it than a sentence: fewer characters, so the ramp resolves before
 * the eye has finished travelling.
 *
 * THE GLASS IN THE TWO CORNERS IS A SHADER, not a backdrop-filter. See
 * ShaderLensMaterial for what it is a port of. It takes no parameters - every
 * value in it is the reference shader's own - and it is mounted transparent,
 * so it clears to nothing and paints only inside the two authored shapes.
 *
 * IT LIVES INSIDE THE MEDIA ANCHOR, between the photograph and the scrim, and
 * that position is deliberate. The scrim then darkens the glass exactly as it
 * darkens the rest of the hero - including the second floor the parallax
 * handler fades in on scroll - and the cursor cue, which comes after both,
 * passes over the glass rather than under it. It also means the glass rides
 * the cs-plate-land flight on the wrapper together with the photograph it is
 * refracting, so the two never separate while the window is opening.
 *
 * The CSS pseudo-element cards that used to carry the frosted look are
 * switched off in the stylesheet rather than deleted, so reverting is one rule.
 */

import Image from 'next/image';
import { useRef } from 'react';
import type { WorkCaseStudy } from '@/components/work/types';
import { driveImage } from '@/lib/driveImage';
import { COVER_CURSOR, CASE_STUDY_SECTIONS } from '@/config/caseStudy';
import { useCoverCursor } from '@/hooks/useCoverCursor';
import GlassRefraction from '@/components/work/case-study/GlassRefraction';
import LiquidGlassCorners from '@/components/work/case-study/liquidGlass/LiquidGlassCorners';

/** Per-character delay for the arrival ramp, ms. Small enough that a long
 *  title still resolves inside the window's open wipe. */
const CHAR_STEP_MS = 11.5;

/**
 * Wraps every word in a span and every character inside it in another.
 *
 * The word wrapper is not decoration - it is what stops the title breaking
 * mid-word, because a bare run of inline character spans is a line-break
 * opportunity at every single one of them. `--c` carries a running character
 * index across word boundaries so the ramp reads as one sweep over the whole
 * line rather than restarting per word.
 */
function splitTitle(text: string) {
  let charIndex = 0;
  return text.split(' ').map((word, wordIndex) => (
    <span className="case-study__claim-word" key={`${word}-${wordIndex}`}>
      {Array.from(word).map((char, i) => (
        <span
          className="case-study__claim-char"
          style={{ '--c': charIndex++ * CHAR_STEP_MS } as React.CSSProperties}
          key={`${char}-${i}`}
        >
          {char}
        </span>
      ))}
    </span>
  ));
}

interface CaseStudyCoverProps {
  study: WorkCaseStudy;
}

export default function CaseStudyCover({ study }: CaseStudyCoverProps) {
  const areaRef = useRef<HTMLAnchorElement | null>(null);
  const cueRef = useRef<HTMLSpanElement | null>(null);

  useCoverCursor({ areaRef, cueRef });

  const heroId = CASE_STUDY_SECTIONS[0].id;

  return (
    <section className="case-study__cover" data-section={heroId}>
      {/*
        THE TWO CORNER SHAPES, AS PATHS.

        These define the curved bottom-left and bottom-right areas that the
        cover text sits in. They live here as SVG clipPaths - rather than as
        border-radius or a masked gradient in CSS - because the edge in the
        Figma is a Bezier, and a Bezier is the one curve family neither of
        those can describe.

        The drawn edge leaves the frame edge HORIZONTALLY - a flat shoulder -
        holds almost level across the first third of the span, and only then
        breaks and falls hard to vertical at the inner end. So the curvature
        is concentrated at the far end rather than spread along the arc.

        A CSS corner radius cannot do that. An ellipse arc distributes its
        curvature evenly across the whole quarter, so it starts bending
        immediately and arrives at the bottom having turned gradually - which
        is the "too circular" look. And a Bezier is the only practical way to
        say "stay flat, then break late", because that is a statement about
        where the curvature sits, not about the radius.

        THESE COORDINATES ARE NOT ESTIMATED. They are the Figma vector's own
        SVG export, converted arithmetically: the export is a 355 x 200 box,
        so every x was divided by 355 and every y by 200 to land in the 0-1
        space objectBoundingBox wants. Nothing was fitted or eyeballed, which
        is why this matches and the earlier attempts did not.

        For the record, three earlier versions were reconstructed from
        screenshots and all three were wrong in a different way - too
        circular, too diagonal, then a straight ramp that was never there.
        The lesson is cheap to state: measure the vector, do not read the
        picture.

        WHAT THE REAL EDGE DOES, reading the top edge left to right: it drops
        off the top-left corner at roughly 37 degrees, flattens almost level
        through the middle (only 14 units of fall across 105 of run), then
        steepens progressively into a near-vertical plunge at the inner end.

        So the flat part sits INBOARD, with a short droop before it - not at
        the frame edge, which is what the last version assumed. And the fall
        accelerates continuously; there is no straight ramp anywhere in it.
        Both mistakes are visible in the numbers above and neither was
        visible to me in a screenshot.

        The path is traced anticlockwise from the plateau's inner end, up
        over the droop to the corner, down the outer edge, along the bottom,
        then back up the long fall - the export's own ordering, kept as-is so
        it can be diffed against a fresh export later.

        THE ASPECT RATIO IS LOCKED in CSS (see --cs-corner-w) because these
        coordinates are normalised: stretching the box would change the ramp
        angle and the shape would stop matching the Figma. Height drives
        width, so the shape stays the same shape at every viewport size.

        clipPathUnits="objectBoundingBox" is what makes this practical: the
        coordinates are fractions of the element's own box (0-1), not pixels,
        so one path stays correct at every viewport size and the shape can be
        resized purely from the CSS width/height tokens. A `clip-path: path()`
        in the stylesheet would have hard-coded pixel coordinates and broken
        on every screen but one.

        The control points were fitted to sampled points off the Figma frame
        (normalised against the shape's own box) and agree with it to about
        one percent of the height across the whole span, with the endpoints
        exact and the closing tangent vertical.

        THESE ARE STILL LOAD-BEARING even though the shader now draws the
        glass: the shader rasterises the SAME path from its own copy of the
        data, and these clipPaths remain the fallback the CSS cards use if
        the shader rule is ever reverted.
      */}
      <svg
        className="case-study__cover-shapes"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Left: starts at the top of the outer (left) edge, falls to the
              bottom at the inner end, then closes back along the bottom. */}
          <clipPath id="cs-corner-left" clipPathUnits="objectBoundingBox">
            <path d="M0.1521,0.16 C0.1014,0.1233 0.0352,0.0467 0,0 L0,1 L1,1 C0.9845,0.655 0.8737,0.5542 0.8028,0.45 C0.7329,0.3633 0.5711,0.2407 0.4493,0.23 C0.307,0.2175 0.1964,0.192 0.1521,0.16 Z" />
          </clipPath>

          {/* Right: the same curve mirrored in x, so the pair is symmetrical
              about the centre of the frame. */}
          <clipPath id="cs-corner-right" clipPathUnits="objectBoundingBox">
            <path d="M0.8479,0.16 C0.8986,0.1233 0.9648,0.0467 1,0 L1,1 L0,1 C0.0155,0.655 0.1263,0.5542 0.1972,0.45 C0.2671,0.3633 0.4289,0.2407 0.5507,0.23 C0.693,0.2175 0.8036,0.192 0.8479,0.16 Z" />
          </clipPath>

          {/* REFRACTION. The filters that actually bend the backdrop, kept
              beside the clipPaths because the two describe the same sheet:
              the clipPath is its outline, these are its optics. See
              GlassRefraction.tsx for why this is a filter and not CSS. */}
          <GlassRefraction />
        </defs>
      </svg>
      {/*
        THE VISUAL IS THE LINK, and now the only one in this section. An anchor
        rather than a div with an onClick, so it is keyboard reachable,
        middle-clickable and shows a real target in the status bar - none of
        which a synthetic handler gives for free, and all of which is what lets
        the button above it go away. `data-cue` / `data-cue-press` are written
        by the hook and consumed only by CSS.

        THE ORDER OF THE FOUR CHILDREN BELOW IS THE PAINT ORDER, and it is the
        whole layering scheme: photograph, glass, scrim, cue. None of them
        carries a z-index except the cue; changing the order changes the
        result. See the note on the canvas.
      */}
      <a
        ref={areaRef}
        className="case-study__cover-media"
        href={study.liveUrl}
        target="_blank"
        rel="noreferrer noopener"
        data-cue="off"
        data-cue-press="false"
        aria-label={`Visit the live ${study.title} site`}
      >
        {/* The plate. Carries the scroll parallax itself, via --cs-plate-shift
            and --cs-plate-zoom in the stylesheet. */}
        <Image
          className="case-study__cover-image"
          src={driveImage(study.imageUrl)}
          alt={study.title}
          fill
          priority
          sizes="100vw"
          unoptimized
          referrerPolicy="no-referrer"
        />

        {/*
          THE GLASS. Directly over the photograph and directly under the scrim.

          It samples the same file the Image above renders - a cache hit, not a
          second download - and undoes that element's parallax transform when
          sampling, so the refraction stays locked to the picture as it slides.
          It redraws on scroll for exactly that reason.

          Same src, same box, same transform: if any of those three drift apart
          the glass will refract the wrong pixels, and it will look like a
          lighting bug rather than a coordinate one. It was precisely that,
          once.
        */}
        <LiquidGlassCorners src={driveImage(study.imageUrl)} />

        {/* The floor under the type. Now also the floor under the glass. */}
        <span className="case-study__cover-scrim" aria-hidden="true" />

        {/* The follower. aria-hidden because the anchor's own label already
            says where this goes - a screen reader announcing both would say it
            twice. */}
        <span ref={cueRef} className="case-study__cover-cue" aria-hidden="true">
          <span className="case-study__cover-cue-dot" />
          <span className="case-study__cover-cue-label">{COVER_CURSOR.label}</span>
          <svg
            className="case-study__cover-cue-arrow"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>

      <div
        className="case-study__cover-text"
        style={
          {
            '--cs-claim-fit': String(
              Math.max(0.68, Math.min(1, 22 / Math.max(1, study.title.length)))
            ),
          } as unknown as import('react').CSSProperties
        }
      >
        {/* h1, and the only one in the window: this is the document's subject.
            The section headings below are h2. */}
        <h1 className="case-study__claim" data-reveal="claim">
          {splitTitle(study.title)}
        </h1>

        {/*
          THE RIGHT-HAND COLUMN: THE PROBLEM LINE, ALONE.

          The kicker (category and year) and the closing tagline are both gone
          at the user's request. Worth recording why that costs no
          information: the category and year are both restated in the Project
          facts row a screen below, and the tagline repeated what the cover
          image already says in type. Neither held anything that existed only
          here.

          What is left is the one line that earns the space - the problem the
          project solves. A single element also means this block's height is
          now set by the hook alone, so it clears the tapering shape with more
          slack than the sizing note in the CSS was written against.

          The classes for the removed pieces are deliberately left in the
          stylesheet: restoring either is a two-line change here, and unused
          rules cost nothing at runtime.
        */}
        <div className="case-study__cover-side">
          <p className="case-study__cover-headline">{study.hook}</p>
        </div>
      </div>
    </section>
  );
}
