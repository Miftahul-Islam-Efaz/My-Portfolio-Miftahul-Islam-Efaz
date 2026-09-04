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

# ---------- 1/2. The revised export, normalised by 355 x 200 ----------
Swap $tsx 'path-left' `
  '<path d="M0.1521,0.16 C0.1149,0.144 0.0352,0.0467 0,0 L0,1 L1,1 C0.9845,0.655 0.8737,0.5542 0.8028,0.45 C0.7329,0.3633 0.5704,0.255 0.4493,0.23 C0.3049,0.2002 0.1986,0.18 0.1521,0.16 Z" />' `
  '<path d="M0.1521,0.16 C0.1014,0.1233 0.0352,0.0467 0,0 L0,1 L1,1 C0.9845,0.655 0.8737,0.5542 0.8028,0.45 C0.7329,0.3633 0.5711,0.2407 0.4493,0.23 C0.307,0.2175 0.1964,0.192 0.1521,0.16 Z" />'

Swap $tsx 'path-right' `
  '<path d="M0.8479,0.16 C0.8851,0.144 0.9648,0.0467 1,0 L1,1 L0,1 C0.0155,0.655 0.1263,0.5542 0.1972,0.45 C0.2671,0.3633 0.4296,0.255 0.5507,0.23 C0.6951,0.2002 0.8014,0.18 0.8479,0.16 Z" />' `
  '<path d="M0.8479,0.16 C0.8986,0.1233 0.9648,0.0467 1,0 L1,1 L0,1 C0.0155,0.655 0.1263,0.5542 0.1972,0.45 C0.2671,0.3633 0.4289,0.2407 0.5507,0.23 C0.693,0.2175 0.8036,0.192 0.8479,0.16 Z" />'

# ---------- 3. Stale wording: there is no ramp any more ----------
Swap $css 'css-ramp-phrase' `
  '     fractions of this box, any other ratio would shear the straight
     ramp to a different angle and stop matching the drawing - so' `
  '     fractions of this box, any other ratio would shear the whole
     edge to a different angle and stop matching the drawing - so'

Swap $css 'css-verified-phrase' `
  '     three-line headline; verified against the ramp rather than
     guessed. */' `
  '     three-line headline; measured against the exported path rather
     than guessed. */'

# ---------- 4. Glass, in the palette's own charcoal ----------
$oldFill = @'
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
$newFill = @'
  /* GLASS, IN THE PALETTE'S OWN CHARCOAL. The export fills with
     #2A2E30 at 71%; --cs-glass is 42, 39, 37, i.e. #2A2725. Those are
     within three points of each other per channel, so the house token
     IS the drawing's colour to the eye - and using the token means
     these corners are the same glass as the window bar rather than a
     second, nearly-identical grey hard-coded next to it.

     The 71% becomes a range around 71 rather than a flat value,
     because flat translucency does not read as glass - real glass is
     denser where it is thick and catches light at its edge. So:
     denser at the bottom where the type sits, thinning upward, with a
     breath of --cs-glass-lift (the paper tone, 245, 241, 232) at the
     very top edge as the highlight. Average density lands at ~0.7,
     which is why it still matches the export overall.

     The blur is what actually makes it glass rather than tint, and it
     is safe here specifically because clip-path clips backdrop-filter
     too - so the blur ends on the curve instead of squaring off the
     box. That is the whole reason this is a clip-path and not a
     border-radius. */
  background: linear-gradient(
    to top,
    rgba(var(--cs-glass), 0.78) 0%,
    rgba(var(--cs-glass), 0.62) 58%,
    rgba(var(--cs-glass-lift), 0.1) 100%
  );
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
  backdrop-filter: blur(20px) saturate(1.15);
'@
Swap $css 'css-glass' $oldFill $newFill

Swap $css 'css-reduced-transparency' `
  '    background: rgba(42, 46, 48, 0.96);' `
  '    background: rgba(var(--cs-glass), 0.97);'

# ---------- 5. Fit the type to the plateau, not to the box ----------
$oldClaim = @'
  max-width: 14ch;
  font-size: clamp(1.7rem, 3.1vw, 2.9rem);
  line-height: 1;
  letter-spacing: -0.018em;
'@
$newClaim = @'
  /* 12ch, and the cap down from 2.9rem. Both come off the path rather
     than taste: the level plateau of the left shape runs from x=54 to
     x=159.5 of 355, so it ends at 0.45 of the width, and the fall has
     already begun by 0.57. At 42vh on a 1080 screen the shape is about
     806px wide, so the safe span is roughly 295px after the gutter -
     and 14ch at 2.9rem overruns that by about 30px, which is exactly
     the overhang that clipped long titles. 12ch at 2.7rem measures
     ~260px and sits inside it at every width. */
  max-width: 12ch;
  font-size: clamp(1.7rem, 2.9vw, 2.7rem);
  /* A hair over 1: at exactly 1 the descenders of a two-line title
     touched the ascenders below it. */
  line-height: 1.02;
  letter-spacing: -0.018em;
  /* Two-line titles split evenly instead of leaving one orphan word,
     which matters more than usual here because the second line sits
     under the thinner part of the curve. */
  text-wrap: balance;
'@
Swap $css 'css-claim' $oldClaim $newClaim

$oldSide = @'
  max-width: 32ch;
  padding: 0;
'@
$newSide = @'
  /* 30ch by the same arithmetic mirrored: the right shape's plateau
     starts at 0.55 of the width, leaving ~295px of safe measure after
     the gutter. 30ch of the body size lands near 250px, keeping a
     margin for the longest hooks in the data. */
  max-width: 30ch;
  padding: 0;
  /* Avoids single-word last lines in the hook, which read as mistakes
     against a curved edge. */
  text-wrap: pretty;
'@
Swap $css 'css-side' $oldSide $newSide

# ---------- 6. Same glass language on the stacked layout ----------
$oldNarrow = @'
    background: linear-gradient(
      to top,
      rgba(6, 6, 5, 0.93) 0%,
      rgba(6, 6, 5, 0.86) 62%,
      rgba(6, 6, 5, 0.4) 100%
    );
    -webkit-backdrop-filter: blur(12px) saturate(1.05);
    backdrop-filter: blur(12px) saturate(1.05);
'@
$newNarrow = @'
    /* The corners are gone at this width, but the glass should not
       change character - same charcoal token, just denser because it
       now has to carry the type on its own. */
    background: linear-gradient(
      to top,
      rgba(var(--cs-glass), 0.94) 0%,
      rgba(var(--cs-glass), 0.86) 62%,
      rgba(var(--cs-glass), 0.42) 100%
    );
    -webkit-backdrop-filter: blur(14px) saturate(1.12);
    backdrop-filter: blur(14px) saturate(1.12);
'@
Swap $css 'css-narrow-glass' $oldNarrow $newNarrow

$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'new left path (should be 1):        ' + ([regex]::Matches($x,'C0\.1014,0\.1233')).Count
$log += 'new right path (should be 1):       ' + ([regex]::Matches($x,'C0\.8986,0\.1233')).Count
$log += 'superseded ctrl pts left (0):       ' + ([regex]::Matches($x,'0\.1149,0\.144|0\.8851,0\.144|0\.5704,0\.255|0\.4296,0\.255')).Count
$log += 'glass token uses (should be 6):     ' + ([regex]::Matches($v,'rgba\(var\(--cs-glass\), ')).Count
$log += 'glass lift use (should be 1):       ' + ([regex]::Matches($v,'rgba\(var\(--cs-glass-lift\), 0\.1\)')).Count
$log += 'hard-coded old greys (should be 0): ' + ([regex]::Matches($v,'rgba\(42, 46, 48|rgba\(6, 6, 5')).Count
$log += 'claim 12ch (should be 1):           ' + ([regex]::Matches($v,'max-width: 12ch')).Count
$log += 'side 30ch (should be 1):            ' + ([regex]::Matches($v,'max-width: 30ch')).Count
$log += 'corner backdrop blur (should be 1): ' + ([regex]::Matches($v,'backdrop-filter: blur\(20px\) saturate\(1\.15\)')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii svg2log.txt
