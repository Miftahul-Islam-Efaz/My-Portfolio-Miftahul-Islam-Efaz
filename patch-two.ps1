$ErrorActionPreference = 'Stop'
$log = @()
$css = 'src\styles\work-case-study.css'
$t = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8).Replace("`r`n", "`n")

$marker = "/* ============================================================" + "`n" + "   THE COVER BAND"
$i = $t.IndexOf($marker)
if ($i -lt 0) {
  'MISS marker - nothing changed' | Out-File -Encoding ascii twolog.txt
  exit 1
}
$t = $t.Substring(0, $i).TrimEnd()
$log += "OK   truncated old band block at char $i"

$block = @'

/* ============================================================
   THE COVER SHOULDERS  (two separate areas, not one band)

   Two independent shapes anchored to the bottom corners: the title
   sits in the left one, the kicker/headline/tagline in the right one.
   They do NOT meet. The gap between them is open, so the cover image
   runs all the way to the bottom of the frame through the middle.

   Each shape's top edge starts at full height on its OUTER edge and
   slopes down toward the centre, then drops vertically at its inner
   end - the two long shallow slopes falling away from the left and
   right edges of the frame.

   WHY TWO SHAPES AND NOT ONE WITH A DIP. A single element with a sag
   masked out of its middle is still one box: its inner region is only
   as transparent as the mask makes it, the blur still spans the full
   width, and the shape can never actually open up and let the image
   through to the bottom edge. Two shapes, each owning one text block,
   is the only version where the middle is genuinely empty.

   The consequence worth knowing: each shape is sized by the text it
   holds, not by the grid column. So a long project title grows the
   left shape and the gap narrows - the layout stays correct for any
   title length instead of assuming this one.

   These rules are appended, so they land after the narrow-screen
   blocks earlier in the file. Equal specificity means last-one-wins
   regardless of media queries, so the <=900px overrides are restated
   at the end of this block.
   ============================================================ */

.case-study__cover-text {
  /* Height of the slope: how far the outer edge rises above the text.
     Scales with vw so the shape keeps its proportion instead of
     flattening into a straight line on wide screens. */
  --cs-band-rise: clamp(56px, 7vw, 120px);

  /* How far each shape bleeds past the text to its inner side and
     below it. The bottom value must match this element's bottom
     padding, or the shapes stop short of the frame edge. */
  --cs-band-pad: clamp(22px, 2.6vw, 48px);
  --cs-band-bleed: clamp(22px, 2.6vw, 38px);

  padding: clamp(20px, 2.4vw, 34px) var(--cs-gutter) var(--cs-band-bleed);
  /* Wider than before: this gap IS the opening between the two shapes,
     so it is now structural rather than just breathing room. */
  gap: clamp(24px, 4vw, 72px);
  align-items: end;

  position: relative;
  /* Contains the z-index: -1 layers below, so they sit behind their own
     text but still above the cover scrim. */
  isolation: isolate;
  background: none;
  overflow: visible;
}

/* The scrim was carrying the legibility load at the bottom of the
   frame. The shapes now do that where the text actually is, and the
   open middle should stay open - a heavy scrim there would read as a
   third dark area and defeat the point of separating them. */
.case-study__cover-scrim {
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.34) 0%,
    rgba(5, 5, 5, 0.28) 26%,
    rgba(5, 5, 5, 0.1) 58%,
    rgba(5, 5, 5, 0.4) 100%
  );
}

/* ---- The two surfaces ---- */

.case-study__claim::before,
.case-study__cover-side::before {
  content: '';
  position: absolute;
  z-index: -1;
  /* Rises above the text by the slope height and bleeds below it to the
     frame edge, so the shape is taller than the words it holds. */
  top: calc(-1 * var(--cs-band-rise));
  bottom: calc(-1 * var(--cs-band-bleed));

  background: linear-gradient(
    to top,
    rgba(6, 6, 5, 0.95) 0%,
    rgba(6, 6, 5, 0.92) 60%,
    rgba(6, 6, 5, 0.88) 100%
  );

  /* Busy covers (the floating slabs here) push detail right up behind
     the type; blurring only what sits under each shape removes that
     competition without darkening the whole hero. */
  -webkit-backdrop-filter: blur(16px) saturate(1.06);
  backdrop-filter: blur(16px) saturate(1.06);

  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  pointer-events: none;
}

/* LEFT SHAPE - holds the title.

   fit-content is load-bearing: as a grid item the title would stretch
   to fill its 1fr column, and the shape drawn from it would reach
   almost to the right-hand shape and close the gap. Hugging the text
   is what keeps the middle open. */
.case-study__claim {
  position: relative;
  width: fit-content;
  align-self: end;
  max-width: 20ch;
  font-size: clamp(1.85rem, 3.6vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.018em;
}

.case-study__claim::before {
  /* Out to the frame edge on the left, a little past the text on the
     right, where the vertical cut falls. */
  left: calc(-1 * var(--cs-gutter));
  right: calc(-1 * var(--cs-band-pad));

  /* An ellipse pinned to the TOP-RIGHT corner, so only its lower-left
     quarter falls inside the box and gets cut away. What remains is
     full height at the left edge, sloping down to the right.

     rx is 100%, so the slope spans the whole shape - one long gentle
     fall rather than a tight corner round-off. The 99.4%/100% stop
     pair keeps the edge crisp; a plain two-colour radial gradient
     would ramp across the whole radius and fade the shape out instead
     of cutting it. */
  -webkit-mask-image: radial-gradient(
    ellipse 100% var(--cs-band-rise) at 100% 0%,
    transparent 99.4%,
    #000 100%
  );
  mask-image: radial-gradient(
    ellipse 100% var(--cs-band-rise) at 100% 0%,
    transparent 99.4%,
    #000 100%
  );
}

/* RIGHT SHAPE - holds the kicker, headline and tagline. Mirror of the
   left: the spine border is gone because the shape's own vertical cut
   is now the edge that separates the two columns. */
.case-study__cover-side {
  position: relative;
  align-self: end;
  max-width: 38ch;
  padding: 0;
  border-left: 0;
}

.case-study__cover-side::before {
  left: calc(-1 * var(--cs-band-pad));
  right: calc(-1 * var(--cs-gutter));

  /* Ellipse pinned to the TOP-LEFT corner: low at the inner end,
     rising to full height at the right edge of the frame. */
  -webkit-mask-image: radial-gradient(
    ellipse 100% var(--cs-band-rise) at 0% 0%,
    transparent 99.4%,
    #000 100%
  );
  mask-image: radial-gradient(
    ellipse 100% var(--cs-band-rise) at 0% 0%,
    transparent 99.4%,
    #000 100%
  );
}

@media (prefers-reduced-transparency: reduce) {
  .case-study__claim::before,
  .case-study__cover-side::before {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(6, 6, 5, 0.96);
  }
}

@media (max-width: 900px) {
  /* ONE COLUMN MEANS THE TWO SHAPES CANNOT COEXIST. Stacked, they
     would sit one above the other and read as two dark stripes with a
     seam - and side by side there is no width left to leave a gap.
     So on narrow screens the shapes are dropped and the text group
     gets a single plain surface: the same decision the layout itself
     makes when it collapses to one column. */
  .case-study__claim::before,
  .case-study__cover-side::before {
    display: none;
  }

  .case-study__cover-text {
    padding: clamp(14px, 3vw, 20px) var(--cs-gutter) clamp(16px, 3.4vw, 24px);
    gap: 12px;
    background: linear-gradient(
      to top,
      rgba(6, 6, 5, 0.93) 0%,
      rgba(6, 6, 5, 0.86) 62%,
      rgba(6, 6, 5, 0.4) 100%
    );
    -webkit-backdrop-filter: blur(12px) saturate(1.05);
    backdrop-filter: blur(12px) saturate(1.05);
  }

  .case-study__claim {
    width: auto;
    max-width: none;
    font-size: clamp(1.7rem, 7.4vw, 2.6rem);
  }

  .case-study__cover-side {
    max-width: none;
    padding: 12px 0 0;
    border-top: 1px solid rgba(245, 241, 232, 0.2);
  }
}
'@

$t = $t + "`n" + $block
[IO.File]::WriteAllText($css, $t, (New-Object Text.UTF8Encoding($false)))

$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += "open braces: " + ([regex]::Matches($v, '\{')).Count
$log += "close braces: " + ([regex]::Matches($v, '\}')).Count
$log += "cover-text::before refs (should be 0): " + ([regex]::Matches($v, '__cover-text::before')).Count
$log += "shoulder masks (should be 4): " + ([regex]::Matches($v, 'mask-image: radial-gradient')).Count
$log += "bytes: " + $v.Length
$log | Out-File -Encoding ascii twolog.txt
