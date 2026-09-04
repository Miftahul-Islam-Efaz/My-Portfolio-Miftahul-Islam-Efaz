$ErrorActionPreference = 'Stop'
$log = @()
$css = 'src\styles\work-case-study.css'
$t = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8).Replace("`r`n", "`n")

function Swap([string]$name, [string]$old, [string]$new) {
  if ($script:t.Contains($old)) {
    $script:t = $script:t.Replace($old, $new)
    $script:log += "OK   $name"
  } else {
    $script:log += "MISS $name"
  }
}

# --- 1. Strip the flat band's own fill; the curve is painted by ::before. ---
$oldBg = @'
  /* Bottom-up gradient rather than a flat fill: the top edge dissolves
     into the image instead of cutting it with a hard line, so the band
     reads as part of the photograph rather than a bar dropped on top. */
  background: linear-gradient(
    to top,
    rgba(6, 6, 5, 0.9) 0%,
    rgba(6, 6, 5, 0.76) 58%,
    rgba(6, 6, 5, 0.32) 100%
  );

  /* The blur is what makes it a surface. Busy covers (the floating
     slabs on GDrive Host) push detail right up behind the type; blurring
     what sits under the band removes that competition without darkening
     the whole hero. */
  -webkit-backdrop-filter: blur(14px) saturate(1.06);
  backdrop-filter: blur(14px) saturate(1.06);
  border-top: 1px solid rgba(245, 241, 232, 0.16);
}
'@

$newBg = @'
  /* THE CURVE.

     The area is solid and its top edge sags in the middle: tall at the
     left and right where the title and the headline live, dipping low
     in the centre so the cover image stays visible between them.

     The fill lives on ::before rather than on this element because the
     shape has to be SUBTRACTED, not painted. A sagging top edge means
     removing colour from the top-centre, and what sits behind that
     region is the photograph - so there is nothing to paint over it
     with. Masking is the only way to cut a curve out of a surface and
     let the image show through the bite.

     Keeping the mask on a pseudo-element also means the mask can never
     clip the text: the words are children of this element, the mask
     applies only to the ::before layer beneath them. */
  position: relative;
  isolation: isolate;
  background: none;
  overflow: visible;
}

.case-study__cover-text::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 0;
  right: 0;
  bottom: 0;
  /* Extends ABOVE the content box by the rise, so the tall side
     shoulders sit higher than the text they contain. At the centre the
     curve bottoms out exactly at the content box top edge, which is why
     the text can never fall outside the shape no matter how the curve
     is retuned. */
  height: calc(100% + var(--cs-band-rise));

  background: linear-gradient(
    to top,
    rgba(6, 6, 5, 0.93) 0%,
    rgba(6, 6, 5, 0.89) 60%,
    rgba(6, 6, 5, 0.84) 100%
  );

  /* Busy covers (the floating slabs here) push detail right up behind
     the type; blurring only what sits under the area removes that
     competition without darkening the whole hero. */
  -webkit-backdrop-filter: blur(16px) saturate(1.06);
  backdrop-filter: blur(16px) saturate(1.06);

  /* An ellipse centred on the TOP EDGE, so only its lower half falls
     inside the box: that half is cut away, leaving a curve that is
     `--cs-band-rise` deep at the centre and zero at both edges.

     rx is exactly 50%, not more: at 50% the curve meets the left and
     right edges precisely at full height, so the shoulders end flush
     with the frame instead of leaving a shallow notch in the corners.

     The 99.4%/100% stop pair is what makes the edge crisp - a plain
     two-colour radial gradient would ramp across the whole radius and
     fade the area out instead of cutting it. */
  -webkit-mask-image: radial-gradient(
    ellipse 50% var(--cs-band-rise) at 50% 0%,
    transparent 99.4%,
    #000 100%
  );
  mask-image: radial-gradient(
    ellipse 50% var(--cs-band-rise) at 50% 0%,
    transparent 99.4%,
    #000 100%
  );
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;

  pointer-events: none;
}
'@
Swap 'curve-fill' $oldBg $newBg

# --- 2. The rise, declared where the other cover tokens live. ---
$oldVar = @'
.case-study__cover-text {
  /* Tight top/bottom: this is a band, not a panel. The old
'@
$newVar = @'
.case-study__cover-text {
  /* Depth of the sag at the centre of the curve. Scales with vw so the
     shape keeps its proportion instead of flattening into a straight
     line on wide screens. */
  --cs-band-rise: clamp(64px, 10vw, 180px);

  /* Tight top/bottom: this is a band, not a panel. The old
'@
Swap 'band-rise-token' $oldVar $newVar

# --- 3. Reduced-transparency fallback now targets the painted layer. ---
$oldRT = @'
@media (prefers-reduced-transparency: reduce) {
  .case-study__cover-text {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(6, 6, 5, 0.92);
  }
}
'@
$newRT = @'
@media (prefers-reduced-transparency: reduce) {
  .case-study__cover-text::before {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(6, 6, 5, 0.95);
  }
}
'@
Swap 'reduced-transparency' $oldRT $newRT

# --- 4. Narrow screens: shallower curve, or it eats the whole cover. ---
$oldNarrow = @'
  .case-study__cover-text {
    padding: clamp(14px, 3vw, 20px) var(--cs-gutter) clamp(16px, 3.4vw, 24px);
    gap: 12px;
  }
'@
$newNarrow = @'
  .case-study__cover-text {
    padding: clamp(14px, 3vw, 20px) var(--cs-gutter) clamp(16px, 3.4vw, 24px);
    gap: 12px;
    /* Stacked, the two text blocks need the FULL width of the area, so a
       deep centre sag would cut straight through the headline. The curve
       stays as a hint of the shape rather than a structural element. */
    --cs-band-rise: clamp(28px, 7vw, 56px);
  }
'@
Swap 'narrow-rise' $oldNarrow $newNarrow

[IO.File]::WriteAllText($css, $t, (New-Object Text.UTF8Encoding($false)))
$len = ([IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)).Length
$log += "bytes: $len"
$log | Out-File -Encoding ascii curvelog.txt
