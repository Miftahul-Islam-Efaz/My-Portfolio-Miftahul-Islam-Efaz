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

# ---------- 1. Stop the gutter pushing the text into the thin end ----------
$oldPad = @'
  --cs-band-bleed: clamp(26px, 4.4vh, 64px);

  padding: clamp(20px, 2.4vw, 34px) var(--cs-gutter) var(--cs-band-bleed);
'@
$newPad = @'
  --cs-band-bleed: clamp(34px, 5vh, 70px);

  /* DELIBERATELY NOT --cs-gutter. This is the fix for text spilling out
     of the corners, and the reason is pure geometry:

     each shape is FULL HEIGHT at the screen edge and tapers to NOTHING
     at its inner tip. So height is only available at the outside. The
     page gutter goes up to 176px, which threw away the tallest 176px of
     each shape and started the text where the wedge was already
     falling - then the text grew inward, into less and less height. The
     right-hand block ran out entirely: at its inner edge the shape was
     about 71px tall and the block needed 190px.

     A much smaller inset pulls both blocks back out to where the glass
     is deep. It breaks alignment with the body copy below, which is a
     real cost, but the body copy is not sitting inside a tapering
     shape. */
  --cs-corner-inset: clamp(18px, 3.2vw, 62px);

  padding: clamp(20px, 2.4vw, 34px) var(--cs-corner-inset) var(--cs-band-bleed);
'@
Swap $css 'css-inset' $oldPad $newPad

# ---------- 2. Title: bigger, because the outer edge has the room ----------
$oldClaim = @'
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
'@
$newClaim = @'
  /* The previous note here measured the plateau but forgot that the
     GUTTER decides where the text starts. With the small inset above,
     the title now begins where the shape is at full height, so it can
     be bigger rather than smaller.

     Checked against the path at the tightest realistic case - a 940px
     tall window, so a 395px shape and a 701px span: 13ch at 3.2rem
     measures about 415px, putting the inner edge at 0.67 of the span,
     where the shape is still 0.64 of its height, or ~253px. A two-line
     title needs ~145px including the bleed. So it clears with room,
     and long titles ("Bela Vista Resort") wrap to two lines rather
     than reaching the taper. */
  max-width: 13ch;
  font-size: clamp(1.9rem, 3.4vw, 3.2rem);
'@
Swap $css 'css-claim' $oldClaim $newClaim

# ---------- 3. Right block: hug the tall edge, and measure it properly ----------
$oldSide = @'
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
$newSide = @'
  /* RIGHT-ALIGNED, which is the composition answer rather than a
     stylistic one: the shape is deepest at the right edge, so anchoring
     the lines there means every line starts from the strongest part of
     the glass and the ragged edge falls away toward the taper. Short
     lines then pull AWAY from the thin end instead of toward it.

     24ch, down from 30ch, because 30ch was measured against the wrong
     font size - the headline renders near 30px, not the ~16px body, so
     30ch was about 455px on screen, not 250px. That reached 0.65 of the
     span and was the direct cause of the first two lines hanging
     outside the glass. 24ch lands near 360px, inner edge at ~0.59 of
     the span where ~272px of height remains against the ~190px this
     block needs. */
  max-width: 24ch;
  padding: 0;
  text-align: right;
  /* Avoids single-word last lines in the hook, which read as mistakes
     against a curved edge. */
  text-wrap: pretty;
'@
Swap $css 'css-side' $oldSide $newSide

# ---------- 4. Reset the alignment where the layout stacks ----------
$oldNarrowSide = @'
  .case-study__cover-side {
    max-width: none;
    padding: 12px 0 0;
    border-top: 1px solid rgba(245, 241, 232, 0.2);
  }
'@
$newNarrowSide = @'
  .case-study__cover-side {
    max-width: none;
    padding: 12px 0 0;
    border-top: 1px solid rgba(245, 241, 232, 0.2);
    /* One column, no corner to hug - right alignment would just look
       arbitrary against the full-width rule above it. */
    text-align: left;
  }
'@
Swap $css 'css-narrow-side' $oldNarrowSide $newNarrowSide

$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'inset token defined (1):        ' + ([regex]::Matches($v,'--cs-corner-inset: clamp')).Count
$log += 'inset used in padding (1):      ' + ([regex]::Matches($v,'var\(--cs-corner-inset\) var\(--cs-band-bleed\)')).Count
$log += 'gutter still in cover pad (0):  ' + ([regex]::Matches($v,'34px\) var\(--cs-gutter\) var\(--cs-band-bleed\)')).Count
$log += 'claim 13ch (1):                 ' + ([regex]::Matches($v,'max-width: 13ch')).Count
$log += 'claim cap 3.2rem (1):           ' + ([regex]::Matches($v,'clamp\(1\.9rem, 3\.4vw, 3\.2rem\)')).Count
$log += 'side 24ch (1):                  ' + ([regex]::Matches($v,'max-width: 24ch')).Count
$log += 'side text-align right (1):      ' + ([regex]::Matches($v,'text-align: right')).Count
$log += 'narrow reset to left (1):       ' + ([regex]::Matches($v,'text-align: left')).Count
$log += 'stale 12ch/30ch (0):            ' + ([regex]::Matches($v,'max-width: 12ch|max-width: 30ch')).Count
$log += 'bleed raised (1):               ' + ([regex]::Matches($v,'clamp\(34px, 5vh, 70px\)')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii fitlog.txt
