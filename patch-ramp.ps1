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

# ---------- 1. The left edge, as measured off the Figma ----------
Swap $tsx 'path-left' `
  '<path d="M0,0 C0.42,0 1,0.52 1,1 L0,1 Z" />' `
  '<path d="M0,0 L0.17,0 C0.24,0 0.28,0.08 0.31,0.16 L0.95,0.935 C0.98,0.965 1,0.985 1,1 L0,1 Z" />'

# ---------- 2. The right edge, mirrored (x -> 1-x) ----------
Swap $tsx 'path-right' `
  '<path d="M1,0 C0.58,0 0,0.52 0,1 L1,1 Z" />' `
  '<path d="M1,0 L0.83,0 C0.76,0 0.72,0.08 0.69,0.16 L0.05,0.935 C0.02,0.965 0,0.985 0,1 L1,1 Z" />'

# ---------- 3. The rationale ----------
$oldT = @'
        Both control points sit on the shape's own edges: the first on the top
        edge (0.42, 0) which pins the opening tangent horizontal, the second
        on the inner edge (1, 0.52) which pins the closing tangent vertical.
        Those two numbers are the only knobs - the first slides the shoulder
        longer or shorter, the second moves the break earlier or later.
'@
$newT = @'
        AND IT IS NOT ONE CURVE. Sampling the Figma edge shows the middle of
        the span is not curved at all: from about 30% to 95% across, the
        points sit on a straight line at a constant slope (rise/run 1.21 in
        the shape's own normalised units, checked at four intermediate
        points). A single cubic cannot hold a straight middle AND a flat
        start - forced to do both it bulges, which is what made the previous
        version read as a soft dome and cut into the top-left.

        So the path is four explicit segments, in order:

          1. L0.17,0        a flat shoulder along the top edge
          2. C ... 0.31,0.16   a short rounded knee
          3. L0.95,0.935    the long straight ramp - the bulk of the edge
          4. C ... 1,1      a small fillet turning into vertical

        Writing the straight part as an actual L is the whole point: it is
        the one instruction that guarantees it stays straight, rather than
        being an approximation that a curve happens to pass near.

        THE ASPECT RATIO IS LOCKED in CSS (see --cs-corner-w) because these
        coordinates are normalised: stretching the box would change the ramp
        angle and the shape would stop matching the Figma. Height drives
        width, so the shape stays the same shape at every viewport size.
'@
Swap $tsx 'tsx-comment' $oldT $newT

# ---------- 4. Lock the box to the Figma ratio ----------
$oldTok = @'
  /* Slightly larger than the raw Figma ratios (37% x 34%). The frame
     used a short "Text" placeholder; real titles and a three-line
     headline need more of the curve's tall end, and because the edge
     is now a normalised path the SHAPE is identical at any size -
     only how much it covers changes. */
  --cs-corner-w: clamp(330px, 37vw, 760px);
  --cs-corner-h: clamp(175px, 37vh, 430px);
'@
$newTok = @'
  /* ASPECT-LOCKED TO THE FIGMA BOX. The measured shape there is
     372 x 211, so 1.76:1. Because the clip path is expressed in
     fractions of this box, any other ratio would shear the straight
     ramp to a different angle and stop matching the drawing - so
     height is the single input and width is derived from it. That is
     also why the earlier independent vw/vh pair was wrong in
     principle, not just in value: it let the shape's angle drift with
     the window's aspect.

     42vh is chosen so the tall end still clears a two-line title and a
     three-line headline; verified against the ramp rather than
     guessed. */
  --cs-corner-h: clamp(185px, 42vh, 470px);
  --cs-corner-w: calc(var(--cs-corner-h) * 1.76);
'@
Swap $css 'css-tokens' $oldTok $newTok

# ---------- 5. CSS rationale ----------
$oldC = @'
   A BEZIER, NOT AN ELLIPSE QUARTER. The edge leaves the outer frame
   edge horizontally, holds a flat shoulder across roughly the first
   third, then breaks late and falls hard to vertical. An ellipse arc -
   which is all a corner radius can draw - spreads its curvature evenly
   instead, so it starts bending at once and turns gradually. That even
   distribution is what read as "too circular"; the difference is WHERE
   the curvature sits, not how big the radius is.
'@
$newC = @'
   A PATH, NOT A RADIUS. The edge is a flat shoulder, a short knee, a
   long STRAIGHT ramp, and a small fillet into vertical. The straight
   middle is the part no radius and no single curve can give you: a
   corner radius is an ellipse arc, curved everywhere by definition,
   and one cubic forced to start flat and stay straight in the middle
   bulges instead. Hence four explicit segments, defined as clipPaths
   in CaseStudyCover.tsx.
'@
Swap $css 'css-comment' $oldC $newC

$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'old single-cubic paths left (should be 0): ' + ([regex]::Matches($x,'C0\.42,0 1,0\.52|C0\.58,0 0,0\.52')).Count
$log += 'new ramp paths (should be 2):              ' + ([regex]::Matches($x,'L0\.95,0\.935|L0\.05,0\.935')).Count
$log += 'aspect-locked width (should be 1):         ' + ([regex]::Matches($v,'calc\(var\(--cs-corner-h\) \* 1\.76\)')).Count
$log += 'stray vw width left (should be 0):         ' + ([regex]::Matches($v,'--cs-corner-w: clamp')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii ramplog.txt
