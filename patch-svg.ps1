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

# ---------- 1. The left path: the Figma export, normalised ----------
Swap $tsx 'path-left' `
  '<path d="M0,0 L0.17,0 C0.24,0 0.28,0.08 0.31,0.16 L0.95,0.935 C0.98,0.965 1,0.985 1,1 L0,1 Z" />' `
  '<path d="M0.1521,0.16 C0.1149,0.144 0.0352,0.0467 0,0 L0,1 L1,1 C0.9845,0.655 0.8737,0.5542 0.8028,0.45 C0.7329,0.3633 0.5704,0.255 0.4493,0.23 C0.3049,0.2002 0.1986,0.18 0.1521,0.16 Z" />'

# ---------- 2. The right path: same, mirrored (x -> 1-x) ----------
Swap $tsx 'path-right' `
  '<path d="M1,0 L0.83,0 C0.76,0 0.72,0.08 0.69,0.16 L0.05,0.935 C0.02,0.965 0,0.985 0,1 L1,1 Z" />' `
  '<path d="M0.8479,0.16 C0.8851,0.144 0.9648,0.0467 1,0 L1,1 L0,1 C0.0155,0.655 0.1263,0.5542 0.1972,0.45 C0.2671,0.3633 0.4296,0.255 0.5507,0.23 C0.6951,0.2002 0.8014,0.18 0.8479,0.16 Z" />'

# ---------- 3. Replace the guesswork rationale with the real one ----------
$oldA = @'
        AND IT IS NOT ONE CURVE. Sampling the Figma edge shows the middle of
        the span is not curved at all: from about 30% to 95% across, the
        points sit on a straight line at a constant slope (rise/run 1.21 in
        the shape's own normalised units, checked at four intermediate
        points). A single cubic cannot hold a straight middle AND a flat
        start - forced to do both it bulges, which is what made the previous
        version read as a soft dome and cut into the top-left.
'@
$newA = @'
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
'@
Swap $tsx 'tsx-comment-a' $oldA $newA

$oldB = @'
        So the path is four explicit segments, in order:

          1. L0.17,0        a flat shoulder along the top edge
          2. C ... 0.31,0.16   a short rounded knee
          3. L0.95,0.935    the long straight ramp - the bulk of the edge
          4. C ... 1,1      a small fillet turning into vertical

        Writing the straight part as an actual L is the whole point: it is
        the one instruction that guarantees it stays straight, rather than
        being an approximation that a curve happens to pass near.
'@
$newB = @'
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
'@
Swap $tsx 'tsx-comment-b' $oldB $newB

# ---------- 4. The true aspect ratio ----------
Swap $css 'css-ratio-value' `
  '  --cs-corner-w: calc(var(--cs-corner-h) * 1.76);' `
  '  --cs-corner-w: calc(var(--cs-corner-h) * 1.775);'

Swap $css 'css-ratio-comment' `
  '  /* ASPECT-LOCKED TO THE FIGMA BOX. The measured shape there is
     372 x 211, so 1.76:1. Because the clip path is expressed in' `
  '  /* ASPECT-LOCKED TO THE FIGMA BOX. The exported SVG is 355 x 200,
     so exactly 1.775:1. Because the clip path is expressed in'

# ---------- 5. The exact fill from the export ----------
$oldFill = @'
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
'@
$newFill = @'
  /* THE EXPORT'S OWN FILL: #2A2E30 at 71% opacity. Flat, and no
     backdrop blur - the Figma vector has neither. It is a single
     translucent grey that lets the cover read through, so the
     invented gradient and blur are gone.

     Worth knowing: 71% of a mid grey is a good deal lighter than the
     94% near-black it replaces, so the type over it now depends on
     the cover being dark in these corners. If a future cover is
     bright there and the text stops reading, the fix is opacity on
     this one line - not another shape change. */
  background: rgba(42, 46, 48, 0.71);
'@
Swap $css 'css-fill' $oldFill $newFill

# ---------- 6. Keep the reduced-transparency fallback on-hue ----------
$oldRT = @'
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(14, 14, 13, 0.96);
'@
$newRT = @'
    background: rgba(42, 46, 48, 0.96);
'@
Swap $css 'css-reduced-transparency' $oldRT $newRT

$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'ramp paths remaining (should be 0):   ' + ([regex]::Matches($x,'L0\.95,0\.935|L0\.05,0\.935')).Count
$log += 'new left path (should be 1):          ' + ([regex]::Matches($x,'M0\.1521,0\.16')).Count
$log += 'new right path (should be 1):         ' + ([regex]::Matches($x,'M0\.8479,0\.16')).Count
$log += 'exact fill (should be 1):             ' + ([regex]::Matches($v,'rgba\(42, 46, 48, 0\.71\)')).Count
$log += 'invented dark fill left (should be 0):' + ([regex]::Matches($v,'rgba\(14, 14, 13')).Count
$log += 'backdrop-filter on corners (0):       ' + ([regex]::Matches($v,'backdrop-filter: blur\(16px\)')).Count
$log += 'ratio 1.775 (should be 1):            ' + ([regex]::Matches($v,'1\.775\)')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii svglog.txt
