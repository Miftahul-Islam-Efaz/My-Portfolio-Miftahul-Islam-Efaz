$ErrorActionPreference = 'Stop'
$css = 'src\styles\work-case-study.css'
$t = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8).Replace("`r`n", "`n")

if ($t.Contains('THE COVER BAND')) {
  'SKIP already patched' | Out-File -Encoding ascii bandlog.txt
  exit 0
}

$block = @'

/* ============================================================
   THE COVER BAND

   The cover text stops floating over the photograph and becomes a
   defined horizontal area pinned to the bottom of the hero: title on
   the left, kicker + headline + tagline on the right, one hairline
   along the top edge.

   WHY A BAND AND NOT JUST MORE SCRIM. Type laid directly on a
   photograph has no contract with it - contrast changes per project
   because every cover image is different, so the same CSS produced
   crisp text on the dark Bela Vista shot and mushy text on the pale
   GDrive one. A band gives the words their own surface, so legibility
   stops depending on which image a project happens to have. That
   matters here more than usual, because this template has to hold for
   every existing project AND every one added later, sight unseen.

   These rules are appended, so they land after the narrow-screen
   blocks earlier in the file. Equal specificity means last-one-wins
   regardless of media queries, so the <=900px overrides are restated
   at the bottom of this block - without them the desktop padding
   would leak onto phones.
   ============================================================ */

.case-study__cover-text {
  /* Tight top/bottom: this is a band, not a panel. The old
     clamp(48px,7vw,112px) bottom pad existed to keep floating type off
     the frame edge - the band's own edge does that job now. */
  padding: clamp(20px, 2.4vw, 34px) var(--cs-gutter) clamp(22px, 2.6vw, 38px);
  gap: clamp(20px, 3vw, 44px);
  align-items: end;

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

/* The scrim was carrying the legibility load at the bottom of the
   frame. The band now does that, so the bottom stop comes down from
   0.72 - otherwise the two stack and the lower third of every cover
   image goes to mud. */
.case-study__cover-scrim {
  background: linear-gradient(
    to top,
    rgba(5, 5, 5, 0.34) 0%,
    rgba(5, 5, 5, 0.28) 26%,
    rgba(5, 5, 5, 0.1) 58%,
    rgba(5, 5, 5, 0.4) 100%
  );
}

/* Inside a band the title has a fixed height budget, so the measure
   widens and the size comes down: two lines fit, three would force the
   band to grow and eat the image. */
.case-study__claim {
  max-width: 20ch;
  font-size: clamp(1.85rem, 3.6vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.018em;
}

.case-study__cover-side {
  /* The optical lift off the title's descenders is dropped: both
     columns now share the band's bottom padding as a common baseline,
     which is a stronger alignment than a hand-tuned nudge. */
  padding-bottom: 0;
  padding-left: clamp(16px, 1.8vw, 28px);
  max-width: 38ch;
}

@media (max-width: 900px) {
  .case-study__cover-text {
    padding: clamp(14px, 3vw, 20px) var(--cs-gutter) clamp(16px, 3.4vw, 24px);
    gap: 12px;
  }

  .case-study__claim {
    max-width: none;
    font-size: clamp(1.7rem, 7.4vw, 2.6rem);
  }

  /* Stacked, the spine has to move from the side to the top or it
     points at nothing. */
  .case-study__cover-side {
    align-self: auto;
    max-width: none;
    padding: 12px 0 0;
    border-left: 0;
    border-top: 1px solid rgba(245, 241, 232, 0.2);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .case-study__cover-text {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: rgba(6, 6, 5, 0.92);
  }
}
'@

$t = $t.TrimEnd() + "`n" + $block
[IO.File]::WriteAllText($css, $t, (New-Object Text.UTF8Encoding($false)))

$len = ([IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)).Length
@("OK appended", "bytes: $len") | Out-File -Encoding ascii bandlog.txt
