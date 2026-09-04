'use client';

import React from 'react';
import { DeskStage } from '../desk/DeskStage';

/* ------------------------------------------------------------------
   THE WORK INTRO SLOT

   This file is a mount point and nothing else. Everything that used to
   live here - layout, the plate, the registration marks, the caption,
   the signature, the spec strip - is gone, and what replaced it is a
   single self-contained section:

     src/components/desk/DeskStage.tsx        markup
     src/components/desk/deskContent.ts       copy
     src/components/desk/gl/laptopScene.ts    the laptop
     src/hooks/useDeskStage.ts                scroll engine
     src/config/deskStage.ts                  tuning
     src/styles/desk-stage.css                interpolation

   ------------------------------------------------------------------
   WHY THE PREVIOUS THREE VERSIONS OF THIS SECTION WERE WRONG

   THE PLATE was a well-set editorial layout: a photograph, some type,
   four registration marks. Every part was borrowed and none of it was an
   idea.

   THE DEVELOP replaced the photograph with a 35,000-point GPU cloud
   sampled out of its own pixels. Better craft, same failure - and two
   specific ones:

     1. It ended on a frame IDENTICAL to the photograph it replaced, so
        the concept was invisible.
     2. It argued "I can do WebGL", which is a different claim from
        "I design well".

   It also froze the page. `gl_PointSize` used the copied
   `300.0 / -mv.z` idiom as though 300 were a constant - it is a
   REFERENCE VIEWPORT HEIGHT - so grains drew ~900px wide instead of
   ~2px and every frame blended 35,000 near-fullscreen quads.

   THE COMPOSITOR was the strongest of the three: it performed the act of
   designing, applying judgement one decision at a time until only the
   sentence was left. It was replaced not because it failed but because
   the work section now opens on the actual artefact.

   ------------------------------------------------------------------
   WHAT THE DESK DOES INSTEAD

   It shows the thing itself. A real laptop, modelled and rigged, rises
   into frame and opens to reveal the site's own homepage on its screen;
   two stars arrive from opposite corners; the machine steps aside and
   the statement comes out from behind it. The visitor can take hold of
   the laptop and turn it, and it springs back when released.

   The claim stops being a sentence about capability and becomes an
   object the visitor can pick up.

   ------------------------------------------------------------------
   THE ONE RULE THIS SLOT HAS

   NOTHING MOUNTED HERE MAY BE PINNED. ScrollTrigger measures pins in
   descending refreshPriority, so a pinned trigger EARLIER in the
   document silently shifts where every later trigger starts - and the
   helix in DitherCarousel.tsx (refreshPriority: 1) is later. A pinned
   section in this slot broke that carousel once already, and THE RAKE
   had to be given refreshPriority: 2 as a result.

   THE DESK needs its laptop held in frame for three beats, which is what
   a pin is normally for. It gets that from `position: sticky` instead -
   native, no pin spacing, structurally incapable of moving a trigger
   below it. Its ScrollTrigger only ever reads progress.

   ------------------------------------------------------------------
   NOW-UNUSED BY THIS SLOT (deliberately left on disk - deleting is his
   call, and he asked for cleanup as a separate pass):

     src/components/compositor/*           + config/compositor.ts
     src/hooks/useCompositor.ts            + styles/compositor.css
     src/hooks/useWorkIntroReveal.ts       + config/workIntroReveal.ts
     src/styles/work-intro-reveal.css      + styles/work-intro-plate.css
     src/hooks/useIntroPortraitLens.ts
     src/components/develop/*              + config/develop.ts
     src/styles/develop.css
     public/portrait/*                     (self-hosted for THE DEVELOP)

   The `accentColor` prop is kept in the signature because
   WebsiteProjectsShowcase passes it; the section owns its own palette,
   so it is intentionally unused.
   ------------------------------------------------------------------ */

interface WorkIntroHeaderProps {
  accentColor?: string;
}

export const WorkIntroHeader: React.FC<WorkIntroHeaderProps> = () => (
  <DeskStage />
);

export default WorkIntroHeader;
