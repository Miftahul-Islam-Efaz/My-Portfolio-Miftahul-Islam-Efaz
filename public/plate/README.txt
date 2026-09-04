INK FILL PLATE — what goes in this folder
=========================================

Expected file:  ink-fill.jpg      (this exact name, this exact folder)
Read by:        src/config/compositor.ts -> COMPOSITOR_INK.source

Until this file exists, the section renders exactly as it does now:
the statement stays flat off-white and the console logs one warning.
Nothing breaks. The fill only switches on after the image really decodes
(see the preload guard in src/hooks/useCompositor.ts).


SPEC
----
Size        2560 x 1440, landscape
Format      JPEG, quality ~82, target under 400 KB
Subject     NONE. No people, no faces, no objects with meaning,
            no text, no logos, no watermark.
Palette     near-black #050505 shadows, warm off-white #F5F1E8
            highlight, ember #b56c4b as the only chroma.


WHY THE IMAGE MUST BE ALMOST EMPTY
----------------------------------
This image is never seen as a picture. It is seen through the inside of
letterforms roughly 92px tall — thin slices of it, a few hundred pixels
wide. Detail becomes noise at that scale. What survives clipping is ONE
clear direction of light and a broad tonal gradient. Anything busy will
read as dirt on the type.

Strong: a single hard raking beam across a plain surface, deep falloff.
Weak:   anything with structure, repetition, pattern, or a focal point.


PROMPT DIRECTION
----------------
"Extreme close-up of a hard raking light beam crossing a matte surface in
a dark room. Single low-angle light source from the right, warm ember
tone. Deep black shadow occupying the left two thirds, one bright warm
highlight band, smooth falloff between them. Fine surface grain only, no
pattern, no objects, no text. Cinematic, high contrast, shallow tonal
range, photographic."

Generate two or three, and pick the one where the bright band runs
DIAGONALLY across the frame — a horizontal band lands identically inside
every word and reads as a stripe instead of as light.


TUNING ONCE IT IS IN
--------------------
src/config/compositor.ts -> COMPOSITOR_INK
  drift        90     vertical travel of the fill across the scroll
  veilOpacity  0.07   the faint full-bleed copy behind everything
src/config/compositor.ts -> COMPOSITOR_INK_BEAT
  [0.58, 0.94]        where in the scroll the fill happens
