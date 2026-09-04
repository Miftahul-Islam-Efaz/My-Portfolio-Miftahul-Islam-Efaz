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

# ---- Tokens for the recessed tier ----
Swap $css 'css-recess-tokens' `
  '  --cs-font-label: var(--font-heading);' `
  '  --cs-font-label: var(--font-heading);

  /* THE SURFACE SYSTEM, and the reason every box looked flat.

     Every panel in this document was painted --cs-paper-raised (#EFEBE1) on
     a --cs-paper (#E7E3D9) page. That is EIGHT UNITS LIGHTER than its
     background - and lighter is the one direction with nowhere to go on an
     already-light ground. No amount of radius or spacing rescues a fill
     that close to the page.

     So there are now three tiers, and a panel must pick one:

       PLATE     the facts row only. Dark, inverted, one per page, the
                 single strongest contrast moment in the document.
       RECESS    metrics, pull quotes, swatches. Very slightly DARKER than
                 the page, so they read as wells sunk into the paper. 5%
                 alpha of the ink gets more separation than 8 units of
                 lightness ever did.
       OUTLINE   chips. No fill at all; the hairline carries the shape. */
  --cs-recess: rgba(23, 22, 20, 0.05);
  --cs-recess-edge: rgba(23, 22, 20, 0.1);'

# ---- OUTLINE tier: chips ----
Swap $css 'css-chip' `
  '  border-radius: 999px;
  background: var(--cs-paper-raised, #efebe1);
  font-family: var(--cs-font-doc-body);' `
  '  border-radius: 999px;
  /* No fill. The raised tone was only softening its own outline, and an
     outlined pill on paper is both cleaner and lighter to render. */
  background: transparent;
  font-family: var(--cs-font-doc-body);'

# ---- RECESS tier: swatch frames ----
Swap $css 'css-swatch' `
  '.case-study__swatch {
  overflow: hidden;
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 5px;
  background: var(--cs-paper-raised, #efebe1);
}' `
  '.case-study__swatch {
  overflow: hidden;
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 6px;
  /* Recessed, so the frame reads as a mount around the colour rather than a
     card floating behind it - which matters most for near-white swatches,
     where the chip and the old fill were almost the same tone. */
  background: var(--cs-recess, rgba(23, 22, 20, 0.05));
}'

# ---- RECESS tier: metric cells ----
Swap $css 'css-metric' `
  '.case-study__metric {
  padding: 18px 16px;
  background: var(--cs-paper-raised, #efebe1);
}' `
  '.case-study__metric {
  padding: 20px 17px;
  background: var(--cs-recess, rgba(23, 22, 20, 0.05));
}'

# ---- RECESS tier: pull quote ----
Swap $css 'css-quote' `
  '  border-left: 2px solid var(--cs-ember, #b56c4b);
  background: var(--cs-paper-raised, #efebe1);
  border-radius: 0 4px 4px 0;' `
  '  border-left: 2px solid var(--cs-ember, #b56c4b);
  background: var(--cs-recess, rgba(23, 22, 20, 0.05));
  border-radius: 0 5px 5px 0;'

$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += '--- verify ---'
$log += 'recess token defined (1):      ' + ([regex]::Matches($v,'--cs-recess: rgba')).Count
$log += 'recess uses (3):               ' + ([regex]::Matches($v,'background: var\(--cs-recess,')).Count
$log += 'flat paper-raised fills (0):   ' + ([regex]::Matches($v,'background: var\(--cs-paper-raised, #efebe1\)')).Count
$log += 'transparent chip (1):          ' + ([regex]::Matches($v,'background: transparent;\n  font-family')).Count
$log += 'dark plate cells (1):          ' + ([regex]::Matches($v,'background: var\(--cs-plate-bg, #141311\);\n\}')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii boxlog.txt
