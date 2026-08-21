'use client';

import { useRef } from 'react';
import WorkIntroHeader from './work/WorkIntroHeader';
import WorkTitleReveal from './work/WorkTitleReveal';
import DitherCarousel from './work/DitherCarousel';
import { WORK_THEME } from './work/workTheme';

/**
 * The work section.
 *
 * Previously this hosted four interchangeable scroll effects behind a
 * switcher chip. That is all gone: there is now exactly one presentation, the
 * WebGL dither helix in DitherCarousel, on a flat near-black field.
 *
 * Removed along with the switcher:
 *   - EffectSwitcher and the effects/ registry
 *   - the ScrollTrigger.refresh() that ran on every effect change
 *   - the live-site iframe modal, which was opened by the old cards' click
 *     handler. The helix handles a click itself by bringing that card to the
 *     centre, so nothing reaches the modal any more.
 *
 * PixelGridBackground is gone too - the canvas covers the full viewport for
 * the whole time the section is pinned, so the blueprint grid behind it was
 * never visible and was still painting a cursor trail every frame.
 *
 * NO TOP BORDER. There used to be a `border-t` hairline in WORK_THEME's
 * border colour here, which drew a visible rule across the page at the hero
 * join. The transition into this section is owned by
 * `transitions/HeroToWorkCut`, which ends on a dithered curtain - so the join
 * is never drawn at all, and a hairline only fought it. Do not re-add a border
 * on this edge.
 *
 * ORDER OF BEATS. The section reads intro copy -> portrait -> WORK -> helix.
 * The title sits between the intro and the carousel and outside the carousel's
 * wrapper, which is a hard requirement rather than a layout preference; see the
 * note on the spacer below.
 */
export default function WebsiteProjectsShowcase() {
  const sectionRef = useRef<HTMLElement | null>(null);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative w-full"
      style={{
        /* THE SECTION FIELD. This was a hardcoded '#000000'. It is now
           WORK_THEME.bgVoid (#050505, --color-background) - the third of the
           three surfaces that have to agree exactly, alongside the stage div
           in DitherCarousel.tsx and the GL clear colour (`background` in
           dither/gl/config.js). All three moved off pure black in one pass,
           and they now match the body background too, which was #050505 all
           along. Any difference between them shows as a seam at the canvas
           edge, so change all three or none. */
        backgroundColor: WORK_THEME.bgVoid,
        /* Was `text-white`. Type inherits the palette's off-white instead of
           pure white, which is what made this section read colder than the
           rest of the site. */
        color: WORK_THEME.textHi,
      }}
    >
      {/* Typography intro. Scrolls past normally, before the pin engages. */}
      <WorkIntroHeader accentColor={WORK_THEME.accent} />

      {/* The section title, and the transition into the work itself: the word
          opens out of an anamorphic slit, mirroring the hero cut closing into
          one. Holds itself sticky for a viewport, then releases. */}
      <WorkTitleReveal />

      {/* Cinematic run-up. The helix used to begin the moment the intro copy
          cleared the top of the screen, which gave the section no beat to
          land on - the cards were already turning before the eye had settled.

          This is empty field on purpose. It has to sit outside DitherCarousel
          rather than above the canvas inside it: the pin fires when the
          carousel's own wrapper hits the top of the viewport, so any spacer
          placed inside that wrapper would push the stage below the fold at the
          moment it pins and the section would jump.

          Shortened from 75vh now that WorkTitleReveal sits above it. The title
          already ends on a beat of clean field - its word has dissolved by
          progress 0.96 - so the full original run-up would read as a stall
          rather than as anticipation. What is left is the gap between the word
          going and the first card arriving. */}
      <div aria-hidden className="h-[34vh] w-full" />

      {/* Pins itself and drives the helix from scroll progress. */}
      <DitherCarousel />
    </section>
  );
}
