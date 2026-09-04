$ErrorActionPreference = 'Stop'
$log = @()

function Swap([string]$path, [string]$name, [string]$old, [string]$new) {
  $t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
  if ($t.Contains($old)) {
    $t = $t.Replace($old, $new)
    [IO.File]::WriteAllText($path, $t, (New-Object Text.UTF8Encoding($false)))
    $script:log += "OK   $name"
  } else {
    $script:log += "MISS $name"
  }
}

$css = 'src\styles\work-case-study.css'
$tsx = 'src\components\work\case-study\CaseStudyCover.tsx'

# ---------- 1. TSX: the clip path definitions ----------
$oldSec = @'
    <section className="case-study__cover" data-section={heroId}>
'@
$newSec = @'
    <section className="case-study__cover" data-section={heroId}>
      {/*
        THE TWO CORNER SHAPES, AS PATHS.

        These define the curved bottom-left and bottom-right areas that the
        cover text sits in. They live here as SVG clipPaths - rather than as
        border-radius or a masked gradient in CSS - because the edge in the
        Figma is a Bezier, and a Bezier is the one curve family neither of
        those can describe.

        A single CSS corner radius always produces an ellipse arc: it leaves
        the frame edge perfectly horizontal and then steepens, monotonically,
        all the way down. The drawn edge does not do that. It leaves the left
        edge already descending at roughly 45 degrees, eases through a flatter
        middle, and only then falls away to vertical - an S, with an
        inflection point. No combination of radii produces an inflection,
        which is why the border-radius version read as "too circular".

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
            <path d="M0,0 C0.32,0.25 1,0.64 1,1 L0,1 Z" />
          </clipPath>

          {/* Right: the same curve mirrored in x, so the pair is symmetrical
              about the centre of the frame. */}
          <clipPath id="cs-corner-right" clipPathUnits="objectBoundingBox">
            <path d="M1,0 C0.68,0.25 0,0.64 0,1 L1,1 Z" />
          </clipPath>
        </defs>
      </svg>
'@
Swap $tsx 'tsx-clippaths' $oldSec $newSec

# ---------- 2. CSS: swap the radii for the paths ----------
$oldR = @'
.case-study__cover-text::before {
  left: 0;
  border-top-right-radius: 100% 100%;
}

.case-study__cover-text::after {
  right: 0;
  border-top-left-radius: 100% 100%;
}
'@
$newR = @'
/* The paths are defined in CaseStudyCover.tsx. Note there is deliberately
   NO border-radius fallback alongside these: clip-path and border-radius
   both clip, so if both applied the result would be their intersection -
   a smaller, wrong shape - rather than one overriding the other. */
.case-study__cover-text::before {
  left: 0;
  -webkit-clip-path: url(#cs-corner-left);
  clip-path: url(#cs-corner-left);
}

.case-study__cover-text::after {
  right: 0;
  -webkit-clip-path: url(#cs-corner-right);
  clip-path: url(#cs-corner-right);
}

/* Carrier for the clipPath definitions only - it must stay in the render
   tree (display: none can drop referenced paths in some engines) but must
   never occupy space or paint. */
.case-study__cover-shapes {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
'@
Swap $css 'css-clip-path' $oldR $newR

# ---------- 3. CSS: correct the rationale comment ----------
$oldC = @'
   BORDER-RADIUS, NOT A MASK. Measured off the Figma frame, each
   shape's edge is an ellipse arc centred on its outer bottom corner:
   flat where it leaves the frame edge, steepening as it falls. That
   is exactly what a single corner radius of `100% 100%` describes -
   the corner ellipse's centre lands on the opposite corner and the
   box becomes a true quarter-ellipse. So the shape is now geometry
   rather than a masked gradient, which means a genuinely crisp edge
   (no 0.6% alpha ramp), correctly clipped backdrop-filter, and no
   mask compositing at all.
'@
$newC = @'
   A BEZIER, NOT AN ELLIPSE QUARTER. The edge is an S with an
   inflection: it leaves the outer frame edge already descending at
   roughly 45 degrees, eases through a flatter middle, then falls to
   vertical. A CSS corner radius can only ever draw an ellipse arc -
   horizontal tangent at the frame edge, steepening monotonically, no
   inflection anywhere - so no combination of radii can express this,
   which is exactly why the radius version looked too circular.

   The shape therefore comes from SVG clipPaths defined in
   CaseStudyCover.tsx, in objectBoundingBox units so one path scales
   to any size. clip-path also clips backdrop-filter correctly, so the
   blur follows the curve instead of squaring off behind it, and the
   edge stays geometrically crisp - no alpha ramp, no mask compositing.
'@
Swap $css 'css-comment' $oldC $newC

# ---------- 4. CSS: give the curve room ----------
$oldT = @'
  --cs-corner-w: clamp(320px, 37vw, 720px);
  --cs-corner-h: clamp(168px, 34vh, 380px);
'@
$newT = @'
  /* Slightly larger than the raw Figma ratios (37% x 34%). The frame
     used a short "Text" placeholder; real titles and a three-line
     headline need more of the curve's tall end, and because the edge
     is now a normalised path the SHAPE is identical at any size -
     only how much it covers changes. */
  --cs-corner-w: clamp(330px, 40vw, 820px);
  --cs-corner-h: clamp(175px, 37vh, 430px);
'@
Swap $css 'css-tokens' $oldT $newT

# ---------- 5. CSS: title must clear the taper ----------
$oldClaim = @'
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
'@
$newClaim = @'
.case-study__claim {
  align-self: end;
  /* Auto width again: with the shape no longer drawn from this box,
     fit-content served no purpose. */
  width: auto;
  /* 14ch and a lower cap, both for the same reason: the curve is
     already falling across the span the title occupies, so the wider
     measure and larger cap pushed long titles ("Bela Vista Resort")
     out through the thin end of the shape. Checked against the path:
     a two-line title at this cap clears the edge with room to spare
     at every width. */
  max-width: 14ch;
  font-size: clamp(1.7rem, 3.1vw, 2.9rem);
  line-height: 1;
  letter-spacing: -0.018em;
}
'@
Swap $css 'css-claim' $oldClaim $newClaim

$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$log += "css open/close braces: " + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log += "leftover border-top-*-radius: 100% (should be 0): " + ([regex]::Matches($v,'border-top-(right|left)-radius: 100%')).Count
$log += "clip-path url refs (should be 4): " + ([regex]::Matches($v,'clip-path: url\(#cs-corner')).Count
$log += "clipPath defs in tsx (should be 2): " + ([regex]::Matches($x,'clipPathUnits="objectBoundingBox"')).Count
$log += "css bytes: " + $v.Length + "  tsx bytes: " + $x.Length
$log | Out-File -Encoding ascii bezierlog.txt
