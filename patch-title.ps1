$ErrorActionPreference = 'Stop'
$log = @()

function Fix([string]$path, [string]$name, [string]$old, [string]$new) {
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
$win = 'src\components\work\case-study\CaseStudyWindow.tsx'

# ---- 1. THE BUG: words were being welded together. ----
$old1 = @'
.case-study__claim {
  max-width: 18ch;
  font-size: clamp(2.4rem, 6.4vw, 6.6rem);
  line-height: 0.94;
  letter-spacing: -0.022em;
  text-wrap: balance;
}
'@
$new1 = @'
.case-study__claim {
  /* 13ch, not 18ch. Three or four words of a project name at display
     size do not need eighteen characters of runway, and the wider cap
     was letting a short title claim most of the hero. */
  max-width: 13ch;
  /* Stepped down from 6.4vw / 6.6rem. The title is an identifier, not
     the argument - the headline on the right is the argument - so it
     should dominate the cover without swallowing it. */
  font-size: clamp(2rem, 4.6vw, 4.5rem);
  line-height: 0.98;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

/* THE SPACES BETWEEN WORDS HAD TO COME BACK AS MARGIN.

   splitTitle wraps each word in an inline-block so a title can never
   break mid-word. But the split threw the actual space CHARACTERS
   away, and inline-block boxes sitting flush against each other have
   nothing between them - so "Bela Vista Resort" rendered as
   BELAVISTARESORT: one unbreakable run, which then could not wrap at
   all and stretched to whatever width it needed.

   The gap is restored as margin rather than by re-inserting text
   nodes on purpose. JSX whitespace between mapped elements is
   fragile - it collapses depending on how the array is built - and a
   margin in em is deterministic, scales with the clamped font size,
   and cannot be lost to a future refactor of the split. */
.case-study__claim-word:not(:last-child) {
  margin-right: 0.26em;
}
'@
Fix $css 'claim-measure-and-word-gap' $old1 $new1

# ---- 2. Narrow: same step down, now that wrapping works. ----
$old2 = @'
  .case-study__claim {
    max-width: none;
    font-size: clamp(2.1rem, 10vw, 3.5rem);
  }
'@
$new2 = @'
  .case-study__claim {
    max-width: none;
    font-size: clamp(1.9rem, 8.6vw, 3rem);
  }
'@
Fix $css 'claim-narrow' $old2 $new2

# ---- 3. The Meet mark, replaced with the supplied artwork. ----
$old3 = @'
function CallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="5.5" width="12.5" height="13" rx="2.6" fill="#2684fc" />
      <path d="M8 5.5h6.5v13H8z" fill="#00832d" />
      <path d="M2 8.1A2.6 2.6 0 0 1 4.6 5.5H8v4H2z" fill="#e94235" />
      <path d="M2 14.5h6v4H4.6A2.6 2.6 0 0 1 2 15.9z" fill="#ffba00" />
      <path d="M14.5 9.6l5.9-3.5a.9.9 0 0 1 1.6.8v10.2a.9.9 0 0 1-1.6.8l-5.9-3.5z" fill="#00ac47" />
    </svg>
  );
}
'@
$new3 = @'
/**
 * The Google Meet mark, as supplied.
 *
 * Kept as the full 48x48 artwork and scaled down by the width/height
 * attributes rather than being redrawn at 16px: the original hand-traced
 * version was an approximation of this shape, and there is no reason to
 * approximate artwork we have. The viewBox does the scaling, so the glyph
 * stays sharp at any size.
 *
 * No `fill="currentColor"` anywhere in here, deliberately - every path
 * carries its own brand colour, and this is the one mark in the bar that
 * must NOT inherit the header's light/dark ink flip.
 */
function CallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <rect
        width="16"
        height="16"
        x="12"
        y="16"
        fill="#fff"
        transform="rotate(-90 20 24)"
      />
      <polygon fill="#1e88e5" points="3,17 3,31 8,32 13,31 13,17 8,16" />
      <path fill="#4caf50" d="M37,24v14c0,1.657-1.343,3-3,3H13l-1-5l1-5h14v-7l5-1L37,24z" />
      <path fill="#fbc02d" d="M37,10v14H27v-7H13l-1-5l1-5h21C35.657,7,37,8.343,37,10z" />
      <path fill="#1565c0" d="M13,31v10H6c-1.657,0-3-1.343-3-3v-7H13z" />
      <polygon fill="#e53935" points="13,7 13,17 3,17" />
      <polygon fill="#2e7d32" points="38,24 37,32.45 27,24 37,15.55" />
      <path
        fill="#4caf50"
        d="M46,10.11v27.78c0,0.84-0.98,1.31-1.63,0.78L37,32.45v-16.9l7.37-6.22C45.02,8.8,46,9.27,46,10.11z"
      />
    </svg>
  );
}
'@
Fix $win 'meet-icon' $old3 $new3

$log | Out-File -Encoding ascii titlelog.txt
