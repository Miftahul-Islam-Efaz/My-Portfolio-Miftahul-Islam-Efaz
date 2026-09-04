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

# ---------- 1. The left path ----------
Swap $tsx 'path-left' `
  '<path d="M0,0 C0.32,0.25 1,0.64 1,1 L0,1 Z" />' `
  '<path d="M0,0 C0.42,0 1,0.52 1,1 L0,1 Z" />'

# ---------- 2. The right path (mirrored in x) ----------
Swap $tsx 'path-right' `
  '<path d="M1,0 C0.68,0.25 0,0.64 0,1 L1,1 Z" />' `
  '<path d="M1,0 C0.58,0 0,0.52 0,1 L1,1 Z" />'

# ---------- 3. Correct the TSX rationale ----------
$oldT = @'
        A single CSS corner radius always produces an ellipse arc: it leaves
        the frame edge perfectly horizontal and then steepens, monotonically,
        all the way down. The drawn edge does not do that. It leaves the left
        edge already descending at roughly 45 degrees, eases through a flatter
        middle, and only then falls away to vertical - an S, with an
        inflection point. No combination of radii produces an inflection,
        which is why the border-radius version read as "too circular".
'@
$newT = @'
        The drawn edge leaves the frame edge HORIZONTALLY - a flat shoulder -
        holds almost level across the first third of the span, and only then
        breaks and falls hard to vertical at the inner end. So the curvature
        is concentrated at the far end rather than spread along the arc.

        A CSS corner radius cannot do that. An ellipse arc distributes its
        curvature evenly across the whole quarter, so it starts bending
        immediately and arrives at the bottom having turned gradually - which
        is the "too circular" look. And a Bezier is the only practical way to
        say "stay flat, then break late", because that is a statement about
        where the curvature sits, not about the radius.

        Both control points sit on the shape's own edges: the first on the top
        edge (0.42, 0) which pins the opening tangent horizontal, the second
        on the inner edge (1, 0.52) which pins the closing tangent vertical.
        Those two numbers are the only knobs - the first slides the shoulder
        longer or shorter, the second moves the break earlier or later.
'@
Swap $tsx 'tsx-comment' $oldT $newT

# ---------- 4. Correct the CSS rationale ----------
$oldC = @'
   A BEZIER, NOT AN ELLIPSE QUARTER. The edge is an S with an
   inflection: it leaves the outer frame edge already descending at
   roughly 45 degrees, eases through a flatter middle, then falls to
   vertical. A CSS corner radius can only ever draw an ellipse arc -
   horizontal tangent at the frame edge, steepening monotonically, no
   inflection anywhere - so no combination of radii can express this,
   which is exactly why the radius version looked too circular.
'@
$newC = @'
   A BEZIER, NOT AN ELLIPSE QUARTER. The edge leaves the outer frame
   edge horizontally, holds a flat shoulder across roughly the first
   third, then breaks late and falls hard to vertical. An ellipse arc -
   which is all a corner radius can draw - spreads its curvature evenly
   instead, so it starts bending at once and turns gradually. That even
   distribution is what read as "too circular"; the difference is WHERE
   the curvature sits, not how big the radius is.
'@
Swap $css 'css-comment' $oldC $newC

# ---------- 5. Match the Figma box ratio ----------
Swap $css 'css-width' `
  '  --cs-corner-w: clamp(330px, 40vw, 820px);' `
  '  --cs-corner-w: clamp(330px, 37vw, 760px);'

$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'old 45-degree paths remaining (should be 0): ' + ([regex]::Matches($x,'0\.25 1,0\.64')).Count
$log += 'new left path  (should be 1): ' + ([regex]::Matches($x,'M0,0 C0\.42,0 1,0\.52 1,1')).Count
$log += 'new right path (should be 1): ' + ([regex]::Matches($x,'M1,0 C0\.58,0 0,0\.52 0,1')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii curve3log.txt
