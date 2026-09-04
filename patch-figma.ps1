$ErrorActionPreference = 'Stop'
$log = @()
$css = 'src\styles\work-case-study.css'
$t = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8).Replace("`r`n", "`n")

$marker = "/* ============================================================" + "`n" + "   THE COVER SHOULDERS"
$i = $t.IndexOf($marker)
if ($i -lt 0) {
  'MISS marker - nothing changed' | Out-File -Encoding ascii figmalog.txt
  exit 1
}
$t = $t.Substring(0, $i).TrimEnd()
$log += "OK   truncated previous block at char $i"

$block = @'

/* ============================================================
   THE COVER CORNERS  (matched to the Figma layout)

   Two quarter-ellipses, one in each bottom corner of the hero. Each
   is full height against its own outer edge, curves over, and tapers
   to nothing well before the centre. The title sits in the left one,
   the kicker/headline/tagline in the right one. The middle stays
   completely open, so the cover image reaches the bottom edge.

   BORDER-RADIUS, NOT A MASK. Measured off the Figma frame, each
   shape's edge is an ellipse arc centred on its outer bottom corner:
   flat where it leaves the frame edge, steepening as it falls. That
   is exactly what a single corner radius of `100% 100%` describes -
   the corner ellipse's centre lands on the opposite corner and the
   box becomes a true quarter-ellipse. So the shape is now geometry
   rather than a masked gradient, which means a genuinely crisp edge
   (no 0.6% alpha ramp), correctly clipped backdrop-filter, and no
   mask compositing at all.

   SIZED OFF THE VIEWPORT, NOT THE TEXT. The previous version drew
   each shape from its text box, which forced the shape to end where
   the words ended - and a taper cannot end where the text ends or the
   text pokes out of the thin end. These are sized in vw/vh from the
   Figma proportions (37% of width, 34% of height), so the curve
   always has room to run past the text before it closes.

   Appended, so these land after the narrow-screen blocks earlier in
   the file; equal specificity means last-one-wins regardless of media
   queries, so the <=900px overrides are restated at the end.
   ============================================================ */

.case-study__cover-text {
  /* Straight off the Figma frame: the corner runs 380/1019 of the
     width and 175/565 of the height. The clamps stop it collapsing on
     small laptops or ballooning on ultrawides. */
  --cs-corner-w: clamp(320px, 37vw, 720px);
  --cs-corner-h: clamp(168px, 34vh, 380px);

  /* More bottom air than the old band had: in the Figma the text sits
     well up from the frame edge, inside the tall part of the curve
     rather than jammed into the corner. */
  --cs-band-bleed: clamp(26px, 4.4vh, 64px);

  padding: clamp(20px, 2.4vw, 34px) var(--cs-gutter) var(--cs-band-bleed);
  /* This gap is the opening between the two corners, so it is
     structural, not just breathing room. */
  gap: clamp(24px, 4vw, 72px);
  align-items: end;

  position: relative;
  /* Contains the z-index: -1 shapes so they sit behind their own text
     but still above the cover scrim. */
  isolation: isolate;
  background: none;
  overflow: visible;
}

/* The two corners. This element already spans the full width of the
   hero and its bottom edge IS the frame's bottom edge, so left/right/
   bottom of 0 need no negative offsets to reach the corners. */
.case-study__cover-text::before,
.case-study__cover-text::after {
  content: '';
  position: absolute;
  z-index: -1;
  bottom: 0;
  width: var(--cs-corner-w);
  height: var(--cs-corner-h);

  background: linear-gradient(
    to top,
    rgba(14, 14, 13, 0.94) 0%,
    rgba(14, 14, 13, 0.9) 62%,
    rgba(14, 14, 13, 0.84) 100%
  );

  /* Blurring only what sits under each corner keeps the type clear of
     busy covers (the floating slabs here) without darkening the whole
     hero - and because the blur is clipped by the border-radius, it
     follows the curve instead of squaring it off. */
  -webkit-backdrop-filter: blur(16px) saturate(1.06);
  backdrop-filter: blur(16px) saturate(1.06);

  pointer-events: none;
}

/* Radius on the INNER top corner only: the corner ellipse centre
   lands on the outer bottom corner, so the fill becomes a quarter
   ellipse - flat at the frame edge, tapering to zero at the inner
   end. */
.case-study__cover-text::before {
  left: 0;
  border-top-right-radius: 100% 100%;
}

.case-study__cover-text::after {
  right: 0;
  border-top-left-radius: 100% 100%;
}

/* ---- The text inside the corners ---- */

.case-study__claim {
  align-self: end;
  /* Auto width again: with the shape no longer drawn from this box,
     fit-content served no purpose. */
  width: auto;
  max-width: 18ch;
  font-size: clamp(1.85rem, 3.6vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.018em;
}

.case-study__cover-side {
  align-self: end;
  /* 32ch, down from 38ch. The right-hand corner is tapering across
     exactly this span, so a wider measure would push the last line of
     the headline out through the thin end of the curve. */
  max-width: 32ch;
  padding: 0;
  /* The spine is gone: the corner's own curved edge separates the two
     columns now. */
  border-left: 0;
}

@media (prefers-reduced-transparency: reduce) {
  .case-study__cover-text::before,
  .case-study__cover-text::after {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(14, 14, 13, 0.96);
  }
}

@media (max-width: 900px) {
  /* ONE COLUMN MEANS TWO CORNERS CANNOT WORK. Stacked, the text no
     longer sits in two opposite corners - the right-hand block moves
     under the left one, into the open middle where there is no shape
     at all. So the corners are dropped and the group gets a single
     plain surface, the same decision the layout itself makes when it
     collapses. */
  .case-study__cover-text::before,
  .case-study__cover-text::after {
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
$log += "open braces:  " + ([regex]::Matches($v, '\{')).Count
$log += "close braces: " + ([regex]::Matches($v, '\}')).Count
$log += "leftover mask-image (should be 0): " + ([regex]::Matches($v, 'mask-image: radial-gradient')).Count
$log += "claim::before refs (should be 0):  " + ([regex]::Matches($v, '__claim::before')).Count
$log += "side::before refs (should be 0):   " + ([regex]::Matches($v, '__cover-side::before')).Count
$log += "corner radius rules (should be 2): " + ([regex]::Matches($v, 'border-top-(right|left)-radius: 100% 100%')).Count
$log += "bytes: " + $v.Length
$log | Out-File -Encoding ascii figmalog.txt
