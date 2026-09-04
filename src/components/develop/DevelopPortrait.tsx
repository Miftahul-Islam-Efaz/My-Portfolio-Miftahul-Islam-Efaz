'use client';

import React, { useRef } from 'react';
import { useDevelop } from '../../hooks/useDevelop';
import { DEVELOP_SOURCE } from '../../config/develop';
import '../../styles/develop.css';

/* ------------------------------------------------------------------
   THE DEVELOP - the portrait

   A 3:4 plate holding two things stacked in the same box:

     1. The dithered photograph, as a plain <img>.
     2. A canvas that renders the same photograph as ~35,000 grains.

   The photograph is what ships. The canvas is an enhancement that only
   takes over once it has actually succeeded - useDevelop sets
   data-develop-state="live" on the frame after a scene exists, and the
   stylesheet fades the <img> out on that flag alone. So a failure at any
   step - no WebGL, a 403, a tainted canvas, reduced motion - leaves a
   correct portrait on screen rather than an empty frame.

   That ordering is not paranoia. The grain field is read back out of a
   canvas, and a cross-origin header on someone else's server is the one
   dependency here that nobody in this codebase controls.

   THE FRAME IS THE POINTER TARGET. Everything layered inside it takes no
   pointer hits, so the agitation coordinates are always measured against
   one stable box.
   ------------------------------------------------------------------ */

export const DevelopPortrait: React.FC = () => {
  /* Sizing, pointer coordinates, and the live flag all hang off this. */
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useDevelop({ canvasRef, frameRef });

  return (
    <div ref={frameRef} className="dev-frame">
      {/* THE FALLBACK, AND THE FIRST PAINT.

          Not lazy-loaded: this is the section's primary image and it sits
          one screen below the hero, so deferring it would mean an empty
          plate during exactly the scroll where the develop should be
          starting. It is also the sampler's source, so the browser has to
          fetch it regardless - lazy loading would only delay the effect. */}
      <img
        src={DEVELOP_SOURCE.base}
        alt="Miftahul Islam Efaz"
        width={640}
        height={853}
        decoding="async"
        className="dev-fallback"
      />

      {/* The grain cloud. Transparent, so the black around the figure is
          the page itself - which is what lets the silhouette dissolve
          into the section instead of ending at a canvas edge. */}
      <canvas ref={canvasRef} className="dev-canvas" aria-hidden="true" />

      {/* Darkroom tray light. Sits above both layers. */}
      <div aria-hidden className="dev-veil" />
    </div>
  );
};

export default DevelopPortrait;
