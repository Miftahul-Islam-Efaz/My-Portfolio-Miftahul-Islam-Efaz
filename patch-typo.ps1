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
$body = 'src\components\work\case-study\CaseStudyBody.tsx'
$cfg = 'src\config\caseStudy.ts'

# =====================================================================
# 1. THE TYPE SYSTEM: three faces, three jobs
# =====================================================================
$oldTokens = @'
  /* Both, deliberately. Optima was built to hold a page on its own; pairing
     it with a grotesque for the small text would fight it. */
  --cs-font-display: var(--font-optima);
  --cs-font-body: var(--font-optima);
'@
$newTokens = @'
  /* THREE FACES, THREE JOBS.

     The reason the document below the hero was hard to scan is that it had
     exactly one face at one weight. Optima was doing headings, paragraphs
     and labels alike, so nothing announced itself - no entry point, every
     block the same weight. The earlier note here argued that pairing Optima
     with a grotesque would fight it. That is true of a HEADLINE. It is not
     true of 16px body copy, where the change of texture is the whole signal
     that a heading is a heading.

       --cs-font-display   Optima. Hero claim, section headings, ledes,
                           plate values. Unchanged everywhere it was.
       --cs-font-doc-body  Satoshi. Paragraph text BELOW THE HERO only.
       --cs-font-label     Cabinet Grotesk. Eyebrows, index numbers, spec
                           keys - uppercase and tracked, so it reads as
                           data rather than prose.

     The shell - bar, tabs, cover - still uses --cs-font-body, so nothing
     above the fold moves.

     /public/Fonts also holds ARK_ES Dense, which would give the spec keys a
     genuinely monospaced register. Cabinet Grotesk is used instead because
     it is already proven in this build and ARK_ES has not been seen
     rendered at 10px; swapping --cs-font-label is a one-line change. */
  --cs-font-display: var(--font-optima);
  --cs-font-body: var(--font-optima);
  --cs-font-doc-body: var(--font-body);
  --cs-font-label: var(--font-heading);
'@
Swap $css 'css-tokens' $oldTokens $newTokens

# =====================================================================
# 2. SECTION HEADINGS + INDEX
# =====================================================================
$oldTitle = @'
.case-study__section-title {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--cs-font-display);
  font-weight: 400;
  font-size: clamp(0.95rem, 1.4vw, 1.3rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cs-ink);
}

/* The only ornament this section is allowed. */
.case-study__section-index {
  color: var(--cs-ember);
}
'@
$newTitle = @'
.case-study__section-title {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-family: var(--cs-font-display);
  /* 500, not 400. Optima Medium is a real file in /public/Fonts, so this is
     an actual cut rather than a synthesised one - which matters on a flared
     humanist, where faking weight thickens the stem and flattens the flare. */
  font-weight: 500;
  font-size: clamp(1.12rem, 1.9vw, 1.62rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cs-ink);
}

/* The index moves into the LABEL face so the number reads as a marker and
   the words read as the heading - two registers in one line instead of one
   line in two colours. Tabular figures keep 01 through 07 identically wide,
   which stops the sticky heading column from shifting as you scroll. */
.case-study__section-index {
  font-family: var(--cs-font-label);
  font-weight: 500;
  font-size: 0.72em;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
  color: var(--cs-ember);
}
'@
Swap $css 'css-section-title' $oldTitle $newTitle

# =====================================================================
# 3. BODY COPY + LEDE - the face change that does the scanning work
# =====================================================================
$oldCopy = @'
.case-study__copy p {
  margin: 0;
  max-width: 64ch;
  font-family: var(--cs-font-body);
  font-size: clamp(0.98rem, 1.05vw, 1.12rem);
  line-height: 1.64;
  color: var(--cs-ink-mid);
}
'@
$newCopy = @'
.case-study__copy p {
  margin: 0;
  /* 60ch, down from 64ch. Long measures are where a return sweep starts to
     miss the next line, and this text is now set in a grotesque with a
     smaller x-height advantage than Optima had. */
  max-width: 60ch;
  font-family: var(--cs-font-doc-body);
  font-size: clamp(1rem, 1.04vw, 1.09rem);
  line-height: 1.68;
  color: var(--cs-ink-mid);
}
'@
Swap $css 'css-copy' $oldCopy $newCopy

$oldLead = @'
.case-study__copy p[data-lead='true'] {
  font-size: clamp(1.16rem, 1.7vw, 1.62rem);
  line-height: 1.44;
  letter-spacing: -0.01em;
  color: var(--cs-ink);
}
'@
$newLead = @'
.case-study__copy p[data-lead='true'] {
  /* THE LEDE GOES BACK INTO THE DISPLAY FACE, and this is the single change
     that buys the most scannability in the whole document: the first
     paragraph of every section is now a different TYPEFACE from the two
     that follow it. The shape of the block tells you a section has started
     before you read a word of it. Size alone could never do that while
     everything was one family - which is exactly why the old 1.16rem step
     read as "slightly bigger paragraph" rather than as a lede.

     Narrower than the body on purpose: a lede at 60ch and body at 60ch
     makes two grey rectangles of equal width. */
  font-family: var(--cs-font-display);
  max-width: 46ch;
  font-size: clamp(1.28rem, 2.05vw, 1.86rem);
  line-height: 1.36;
  letter-spacing: -0.012em;
  color: var(--cs-ink);
  text-wrap: pretty;
}
'@
Swap $css 'css-lead' $oldLead $newLead

# =====================================================================
# 4. THE FACTS ROW, REDESIGNED AS A SPEC PLATE
# =====================================================================
$oldFacts = @'
/* ---- 2. PROJECT FACTS - the one compact row ----------------------
   auto-fit rather than seven fixed columns: seven cells at a
   readable size do not fit a phone, and the row should reflow to
   four, then three, then two, without a breakpoint per step. */

.case-study__fact-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  /* The 1px gap plus this background is the hairline grid - cheaper
     and more even than a border on every cell. */
  background: var(--cs-hair, rgba(23, 22, 20, 0.14));
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 4px;
  overflow: hidden;
}

.case-study__fact {
  padding: 14px 16px 15px;
  background: var(--cs-paper-raised, #efebe1);
}

.case-study__fact dt {
  font-family: var(--cs-font-body);
  font-size: 0.66rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--cs-ink-low, #8c887e);
}

.case-study__fact dd {
  margin: 6px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.92rem;
  line-height: 1.35;
  color: var(--cs-ink, #171614);
  text-wrap: pretty;
}

.case-study__fact dd a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--cs-dot, rgba(23, 22, 20, 0.34));
}
'@
$newFacts = @'
/* ---- 2. PROJECT FACTS - THE SPEC PLATE ---------------------------
   REDESIGNED, because the old version had no contrast to work with:
   paper cells (#EFEBE1) on a paper page (#E7E3D9) divided by a
   14%-alpha hairline. Three nearly identical tones - so however it
   was spaced it was going to read as a flat spreadsheet.

   The concept is a SPEC PLATE: the dark technical caption under a
   museum object, or the datasheet block on a film sheet. Inverting
   it is what buys the contrast, and it earns its place three ways -
   it is the only dark mass in the document so it reads as a
   designed object rather than a table; it answers the cinematic
   hero without repeating it; and on a dark ground the key and the
   value can differ in COLOUR as well as size, which is what makes
   seven fields scannable at a glance.

   The hairline mechanism is unchanged in structure but inverted in
   colour: a 1px gap lets a light background show THROUGH the dark
   cells. auto-fit is also kept - seven cells at a readable size do
   not fit a phone, and the row should reflow to four, then three,
   then two, without a breakpoint per step. */

.case-study__fact-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  background: rgba(245, 241, 232, 0.14);
  border-radius: 10px;
  overflow: hidden;
  /* Wide, soft, low-opacity and offset well down: a shadow that lifts the
     plate off the paper without ever being seen as a shadow. The inset
     top line is the highlight that keeps a near-black block from reading
     as a hole punched in the page. */
  box-shadow:
    0 26px 50px -34px rgba(23, 22, 20, 0.6),
    inset 0 1px 0 rgba(245, 241, 232, 0.07);
}

.case-study__fact {
  padding: 17px 18px 19px;
  background: var(--cs-plate-bg, #141311);
}

.case-study__fact dt {
  font-family: var(--cs-font-label);
  font-weight: 500;
  font-size: 0.62rem;
  letter-spacing: 0.17em;
  text-transform: uppercase;
  /* Warm and dimmed rather than neutral grey. A mid grey on a near-black
     plate goes muddy at 10px; the ember holds its hue at low opacity and
     ties the plate to the section numbers. */
  color: rgba(181, 108, 75, 0.92);
}

.case-study__fact dd {
  margin: 8px 0 0;
  /* Values in the display face at Medium: this is the one place in the
     document where small text should feel set rather than typed. */
  font-family: var(--cs-font-display);
  font-weight: 500;
  font-size: 0.98rem;
  line-height: 1.34;
  color: var(--cs-on-dark, #f5f1e8);
  text-wrap: pretty;
}

.case-study__fact dd a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(245, 241, 232, 0.34);
}
'@
Swap $css 'css-facts-plate' $oldFacts $newFacts

# =====================================================================
# 5. THE CURSOR CUE: a small circle that says VISIT
# =====================================================================
$oldCue = @'
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 15px;
  border-radius: 999px;
  border: 1px solid rgba(245, 241, 232, 0.2);
  background: rgba(16, 15, 14, 0.56);
  backdrop-filter: blur(10px) saturate(1.2);
  color: #f5f1e8;
  font-family: var(--cs-font-body);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
'@
$newCue = @'
  /* A CIRCLE, NOT A PILL. The pill had to be as wide as its sentence, so
     it covered a third of the image and pulled the eye away from the
     artwork it was inviting you to click. A disc is a fixed 68px whatever
     the label says, which is why the label is now one word. */
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(245, 241, 232, 0.22);
  background: rgba(16, 15, 14, 0.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);
  color: #f5f1e8;
  font-family: var(--cs-font-label);
  font-weight: 500;
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
'@
Swap $css 'css-cue-circle' $oldCue $newCue

$oldCueBits = @'
.case-study__cover-cue-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cs-ember, #b56c4b);
}

.case-study__cover-cue-arrow {
  width: 10px;
  height: 10px;
}
'@
$newCueBits = @'
/* The dot and the arrow are hidden rather than deleted. Inside a 68px disc
   there is room for one word OR three ornaments, not both, and the word is
   the part that says what happens. They stay in the markup because the hook
   and the reduced-motion rules reference the cue as a unit, and because
   bringing either back is a one-line change here. */
.case-study__cover-cue-dot,
.case-study__cover-cue-arrow {
  display: none;
}
'@
Swap $css 'css-cue-bits' $oldCueBits $newCueBits

# =====================================================================
# 6. THE INVISIBLE BUTTON - a variable that was never a colour
# =====================================================================
$oldStart = @'
  padding: 14px 22px;
  border-radius: 999px;
  background: var(--cs-plate, #141311);
  color: #f5f1e8;
  font-family: var(--cs-font-body);
'@
$newStart = @'
  padding: 15px 24px;
  border-radius: 999px;
  /* THE BUG, AND IT WAS NOT A CONTRAST PROBLEM. This said
     var(--cs-plate, #141311) - but --cs-plate is not a colour.
     CaseStudyWindow sets it to the plate ANIMATION DURATION (820ms), so
     the declaration computed to `background: 820ms`, which is invalid and
     therefore dropped. The result was no background at all: pearl text on
     paper. The fallback never fired either, because a fallback only
     applies when the variable is UNDEFINED, and this one was defined - as
     a time. --cs-plate-bg is the colour token. */
  background: var(--cs-plate-bg, #141311);
  color: var(--cs-on-dark, #f5f1e8);
  /* Belt and braces: if that token ever goes missing, the shadow alone
     still describes a button rather than nothing. */
  box-shadow: 0 18px 34px -22px rgba(23, 22, 20, 0.55);
  font-family: var(--cs-font-label);
  font-weight: 500;
'@
Swap $css 'css-start-button' $oldStart $newStart

# The same mistake, second instance. Unique now that the button above is fixed.
Swap $css 'css-plate-dup' `
  '  background: var(--cs-plate, #141311);' `
  '  /* Same duration-as-colour bug as the CTA above; --cs-plate-bg is the
     colour token. */
  background: var(--cs-plate-bg, #141311);'

# =====================================================================
# 7. THE LITERAL \u2197
# =====================================================================
Swap $body 'tsx-arrow' `
  '            <span className="case-study__exit-arrow" aria-hidden="true">
              \u2197
            </span>' `
  '            {/* &#8599; as an HTML entity, NOT \u2197. A JS escape only
                means something inside a string literal - as bare JSX text it
                is eight characters that render verbatim, which is exactly
                what was on screen. */}
            <span className="case-study__exit-arrow" aria-hidden="true">
              &#8599;
            </span>'

# =====================================================================
# 8. ONE WORD IN THE DISC
# =====================================================================
Swap $cfg 'cfg-cue-label' "  label: 'Click to visit live site'," "  label: 'Visit',"

# =====================================================================
# 9. SCOPED: body face for the document below the hero only
# =====================================================================
$t = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
$lines = $t.Split("`n")
$anchor = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -like '*SHARED SECTION SCAFFOLD*') { $anchor = $i; break }
}
if ($anchor -lt 0) {
  $log += 'MISS scoped-doc-body (anchor not found)'
} else {
  $n = 0
  for ($i = $anchor; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Contains('var(--cs-font-body)')) {
      $lines[$i] = $lines[$i].Replace('var(--cs-font-body)', 'var(--cs-font-doc-body)')
      $n++
    }
  }
  [IO.File]::WriteAllText($css, ($lines -join "`n"), (New-Object Text.UTF8Encoding($false)))
  $log += 'OK   scoped-doc-body (anchor line ' + ($anchor + 1) + ', swapped ' + $n + ')'
}

# =====================================================================
# VERIFY
# =====================================================================
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$x = [IO.File]::ReadAllText($body, [Text.Encoding]::UTF8)
$c = [IO.File]::ReadAllText($cfg, [Text.Encoding]::UTF8)
$log += '--- verify ---'
$log += 'duration-as-colour bugs left (0): ' + ([regex]::Matches($v,'var\(--cs-plate, #141311\)')).Count
$log += 'plate-bg backgrounds (4):         ' + ([regex]::Matches($v,'var\(--cs-plate-bg')).Count
$log += 'doc-body token defined (1):       ' + ([regex]::Matches($v,'--cs-font-doc-body: var')).Count
$log += 'label token defined (1):          ' + ([regex]::Matches($v,'--cs-font-label: var')).Count
$log += 'doc-body uses (15+):              ' + ([regex]::Matches($v,'var\(--cs-font-doc-body\)')).Count
$log += 'label-face uses (5):              ' + ([regex]::Matches($v,'font-family: var\(--cs-font-label\)')).Count
$log += 'shell font-body uses left (4):    ' + ([regex]::Matches($v,'var\(--cs-font-body\)')).Count
$log += 'cue is a circle (1):              ' + ([regex]::Matches($v,'border-radius: 50%;\n  border: 1px solid rgba\(245, 241, 232, 0\.22\)')).Count
$log += 'cue ornaments hidden (1):         ' + ([regex]::Matches($v,'cover-cue-dot,\n\.case-study__cover-cue-arrow')).Count
$log += 'old pill padding left (0):        ' + ([regex]::Matches($v,'padding: 10px 15px;\n  border-radius: 999px')).Count
$log += 'paper-raised cells left (0):      ' + ([regex]::Matches($v,'background: var\(--cs-paper-raised, #efebe1\)')).Count
$log += 'literal u2197 left (0):           ' + ([regex]::Matches($x,'\\u2197')).Count
$log += 'entity arrow present (1):         ' + ([regex]::Matches($x,'&#8599;')).Count
$log += 'cue label is Visit (1):           ' + ([regex]::Matches($c,"label: 'Visit',")).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii typolog.txt
