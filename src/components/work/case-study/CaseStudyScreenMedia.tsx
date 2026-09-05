'use client';

import React, { useState } from 'react';
import Image from 'next/image';

/* ------------------------------------------------------------------
   ONE SCREEN'S FRAME - MEASURED, NOT ASSUMED.

   THE BUG THIS REPLACES: the frame had a hardcoded 16/10 (or 4/5 when
   a row was tagged portrait) and the image was object-fit: cover. Any
   artwork that was not exactly that ratio got its edges eaten - a 2:1
   key art lost both ends of its headline, which is the one thing in
   the picture that had to survive.

   The ratio is not something the author should have to type, and
   `orientation` in the row is too coarse to describe 3:4 vs 4:5 vs
   2:1. The image itself already knows: naturalWidth / naturalHeight,
   available the moment it decodes. So the frame ASKS THE FILE and
   then becomes exactly that shape, and the image is contained rather
   than cropped. Nothing is ever cut off again, whatever gets uploaded
   from the admin panel.

   BEFORE IT DECODES the frame still needs a shape or the grid would
   reflow as each picture lands. It falls back to the row's
   orientation - portrait 4/5, otherwise 16/10 - which is what the
   stylesheet used to hardcode, so the first paint is the old
   behaviour and the measurement only ever improves it.

   A VIDEO IS NOT MEASURED. A YouTube embed has no natural size worth
   reading (the iframe is whatever we give it), and 16/9 is the format
   the platform actually delivers, so clips keep a fixed frame.

   THE SQUIRCLE lives on an inner element, not on this one. The mask
   would otherwise clip the DEMO badge's corner, and the badge has to
   stay square and legible.
   ------------------------------------------------------------------ */

export const CaseStudyScreenMedia: React.FC<{
  src: string;
  alt: string;
  orientation?: 'landscape' | 'portrait';
  /** Rendered instead of the image when the row is a playable clip. */
  video?: React.ReactNode;
}> = ({ src, alt, orientation, video }) => {
  const [ratio, setRatio] = useState<string | null>(null);

  /* The pre-decode shape, and the shape a clip keeps for good. */
  const fallback = video ? '16 / 9' : orientation === 'portrait' ? '4 / 5' : '16 / 10';

  return (
    <div
      className="case-study__screen-media"
      style={
        {
          '--cs-screen-ratio': ratio ?? fallback,
        } as React.CSSProperties
      }
    >
      <div className="case-study__screen-frame">
        {video ?? (
          <Image
            className="case-study__screen-image"
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            unoptimized
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              const img = e.currentTarget;
              /* Guard the zero: a failed decode reports 0x0, and
                 aspect-ratio: 0 / 0 collapses the frame to nothing. */
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CaseStudyScreenMedia;
