$ErrorActionPreference = 'Stop'
$path = 'src\styles\work-case-study.css'
$css = @'

/* ==================================================================
   THE EIGHT-SECTION TEMPLATE
   ------------------------------------------------------------------
   Everything below is the running order added on top of the original
   cover + overview + plates document: the fact row, the problem, the
   three principles, the selected-experience grid, the build notes
   with the palette grid, delivery, and credits.

   It is APPENDED rather than merged into the sections above on
   purpose. The hero overrides at the top of this block need to win
   against the original .case-study__claim rules without an id or an
   !important, and source order is the cheapest way to do that. The
   spacing, colour and type here all come from the same custom
   properties the original document spends - --cs-gutter, --cs-ink*,
   --cs-hair, --cs-paper*, --cs-font-display - so retuning the
   surface still retunes all of it.
   ================================================================== */

/* ---- 1. HERO -----------------------------------------------------
   THE SWAP. The display slot used to hold the hook - a sentence - so
   it was sized for one: 26ch and a modest cap. It now holds the
   PROJECT NAME, which is shorter, wants to be bigger, and should not
   wrap mid-word. The hook moves right, into the area the note used
   to occupy, where it reads as the argument under the name.

   The grid itself is untouched: the original laid this out as
   'claim note' and collapses it below 900px, so this is two pieces of
   content trading places inside a layout that already worked. */

.case-study__claim {
  max-width: 18ch;
  font-size: clamp(2.4rem, 6.4vw, 6.6rem);
  line-height: 0.94;
  letter-spacing: -0.022em;
  text-wrap: balance;
}

.case-study__cover-side {
  grid-area: note;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  max-width: 44ch;
}

/* The impact headline. Deliberately NOT display type: two competing
   display sizes in one hero is two headlines and no hierarchy. This
   is set at reading size, one step up from body, and given the width
   of a paragraph rather than of a title. */
.case-study__cover-headline {
  margin: 0;
  font-family: var(--cs-font-body);
  font-size: clamp(1.02rem, 1.55vw, 1.34rem);
  line-height: 1.42;
  letter-spacing: -0.004em;
  color: var(--cs-glass-on-dark, rgba(245, 241, 232, 0.82));
  text-wrap: pretty;
}

.case-study__cover-sub {
  margin: 0;
  font-family: var(--cs-font-body);
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(245, 241, 232, 0.5);
}

/* The hero's live link. A real, always-visible affordance - the
   pointer cue below is an enhancement on top of this, not the only
   way to find the live site, because it does not exist on touch or
   for a keyboard. */
.case-study__cover-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding: 9px 15px;
  border: 1px solid rgba(245, 241, 232, 0.28);
  border-radius: 999px;
  font-family: var(--cs-font-body);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cs-on-dark, #f5f1e8);
  text-decoration: none;
  background: rgba(245, 241, 232, 0.06);
  backdrop-filter: blur(6px);
  transition:
    background 220ms ease,
    border-color 220ms ease,
    transform 220ms ease;
}

.case-study__cover-link svg {
  width: 11px;
  height: 11px;
  transition: transform 220ms ease;
}

.case-study__cover-link:hover {
  background: rgba(245, 241, 232, 0.14);
  border-color: rgba(245, 241, 232, 0.52);
}

.case-study__cover-link:hover svg {
  transform: translate(2px, -2px);
}

/* ---- THE POINTER CUE ON THE HERO IMAGE ---------------------------
   Position is written by useCoverCursor as a transform on every
   animation frame; everything else - fade, scale, press - is state
   driven off data-cue on the anchor, so the hook writes two
   attributes and the styling stays here.

   top/left 0 with the transform doing all the placement is required,
   not stylistic: the hook works in area-local pixels, and any static
   offset here would be added to a number that already includes the
   configured offset. */

.case-study__cover-media {
  cursor: pointer;
}

.case-study__cover-cue {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
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
  /* The follower must never eat the pointer events that drive it. */
  pointer-events: none;
  opacity: 0;
  /* Scale and fade only. The translate is the hook's, and putting
     both in one transform here would fight it every frame - so the
     scale rides on a nested variable instead. */
  transition:
    opacity 160ms ease,
    scale 160ms ease;
  scale: 0.72;
  transform-origin: 0 0;
}

.case-study__cover-media[data-cue='on'] .case-study__cover-cue {
  opacity: 1;
  scale: 1;
  transition:
    opacity 260ms ease,
    scale 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-study__cover-media[data-cue-press='true'] .case-study__cover-cue {
  scale: 0.94;
}

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

/* Touch has no hover, and a finger fires pointerenter one frame
   before it navigates - so the cue would flash on the way out. The
   always-visible link above is the affordance there. */
@media (hover: none) {
  .case-study__cover-cue {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .case-study__cover-cue {
    transition: opacity 120ms linear;
    scale: 1;
  }
}

/* ---- SHARED SECTION SCAFFOLD -------------------------------------
   One grid for every section below: the heading in a narrow left
   column, the content in a wide right one, collapsing to stacked on
   the same 900px line the cover uses. Sections declare their own
   vertical rhythm through --cs-section-gap so a single value retimes
   the whole document. */

.case-study__doc {
  --cs-section-gap: clamp(56px, 8vw, 132px);
}

.case-study__facts,
.case-study__problem,
.case-study__direction,
.case-study__experience,
.case-study__build,
.case-study__outcome,
.case-study__credits {
  padding: 0 var(--cs-gutter);
  margin-top: var(--cs-section-gap);
  color: var(--cs-ink, #171614);
}

.case-study__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.34fr) minmax(0, 0.66fr);
  gap: clamp(24px, 4vw, 72px);
  align-items: start;
}

.case-study__grid-head {
  position: sticky;
  /* Clears the floating bar. Sticky headings are what make a long
     document feel navigable without a second nav. */
  top: calc(var(--cs-gutter-top) + 74px);
}

.case-study__grid-note {
  margin: 12px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--cs-ink-low, #8c887e);
  max-width: 26ch;
}

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

.case-study__fact dd a:hover {
  border-bottom-color: var(--cs-ember, #b56c4b);
  color: var(--cs-ember, #b56c4b);
}

/* ---- 4. THE DIRECTION - three principles ------------------------ */

.case-study__principles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(18px, 2.6vw, 34px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.case-study__principle {
  padding-top: 16px;
  border-top: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
}

.case-study__principle-num {
  display: block;
  font-family: var(--cs-font-body);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  color: var(--cs-ember, #b56c4b);
}

.case-study__principle-title {
  margin: 10px 0 0;
  font-family: var(--cs-font-display);
  font-weight: 400;
  font-size: clamp(1.06rem, 1.5vw, 1.32rem);
  line-height: 1.22;
  letter-spacing: -0.01em;
}

.case-study__principle-body {
  margin: 8px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--cs-ink-mid, #4b4842);
  text-wrap: pretty;
}

/* ---- 5. SELECTED EXPERIENCE -------------------------------------
   Two up on desktop, one up narrow. Captions carry the section: a
   screenshot without one is decoration, so the caption is part of
   the figure rather than an optional extra. */

.case-study__screens {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(20px, 3vw, 46px);
  margin-top: clamp(26px, 3.4vw, 48px);
}

.case-study__screen {
  margin: 0;
}

.case-study__screen-media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 4px;
  background: var(--cs-plate, #141311);
}

.case-study__screen[data-orientation='portrait'] .case-study__screen-media {
  aspect-ratio: 4 / 5;
}

.case-study__screen-image {
  object-fit: cover;
  /* Slow, small zoom on hover. Enough to feel live, not enough to
     re-crop the shot. */
  transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-study__screen:hover .case-study__screen-image {
  transform: scale(1.028);
}

/* Placeholder honesty: a borrowed cover image is tagged, exactly as
   the plates already do, so a stand-in is never read as a shipped
   screen. Same badge treatment as .case-study__plate[data-demo]. */
.case-study__screen[data-demo='true'] .case-study__screen-media::after {
  content: 'DEMO';
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 3px;
  background: rgba(20, 19, 17, 0.72);
  color: rgba(245, 241, 232, 0.82);
  font-family: var(--cs-font-body);
  font-size: 0.6rem;
  letter-spacing: 0.16em;
}

.case-study__screen-caption {
  margin-top: 12px;
  font-family: var(--cs-font-body);
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--cs-ink-mid, #4b4842);
  text-wrap: pretty;
}

.case-study__screen-label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cs-ink-low, #8c887e);
}

/* ---- 6. BUILD NOTES + PALETTE ----------------------------------- */

.case-study__notes {
  margin: 0;
  padding: 0;
  list-style: none;
}

.case-study__notes li {
  position: relative;
  padding: 12px 0 12px 22px;
  border-bottom: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  font-family: var(--cs-font-body);
  font-size: 0.94rem;
  line-height: 1.55;
  color: var(--cs-ink-mid, #4b4842);
  text-wrap: pretty;
}

.case-study__notes li:first-child {
  border-top: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
}

.case-study__notes li::before {
  content: '';
  position: absolute;
  left: 2px;
  /* Optically centred on the first line, not on the bullet box. */
  top: 1.32em;
  width: 6px;
  height: 1px;
  background: var(--cs-ember, #b56c4b);
}

.case-study__build-meta,
.case-study__delivered,
.case-study__palette {
  margin-top: clamp(26px, 3.2vw, 44px);
}

.case-study__build-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(20px, 3vw, 40px);
}

.case-study__chips-label {
  display: block;
  margin-bottom: 12px;
  font-family: var(--cs-font-body);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cs-ink-low, #8c887e);
}

.case-study__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-study__chip {
  padding: 6px 12px;
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 999px;
  background: var(--cs-paper-raised, #efebe1);
  font-family: var(--cs-font-body);
  font-size: 0.8rem;
  color: var(--cs-ink-mid, #4b4842);
}

.case-study__chips-text {
  margin: 0;
  font-family: var(--cs-font-body);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--cs-ink-mid, #4b4842);
}

/* THE PALETTE, SHOWN NOT LISTED. A hex code in a sentence is data;
   a swatch is the only version of a palette that can be judged. The
   chip is deliberately tall - a colour needs area before the eye
   will read it as a colour rather than as a marker. */

.case-study__palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.case-study__swatch {
  overflow: hidden;
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 5px;
  background: var(--cs-paper-raised, #efebe1);
}

.case-study__swatch-chip {
  display: block;
  height: clamp(74px, 9vw, 122px);
  /* An inner hairline, so a near-white swatch still has an edge
     against near-white paper instead of dissolving into it. */
  box-shadow: inset 0 0 0 1px rgba(23, 22, 20, 0.08);
}

.case-study__swatch-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px 11px;
}

.case-study__swatch-name {
  font-family: var(--cs-font-body);
  font-size: 0.78rem;
  color: var(--cs-ink, #171614);
}

.case-study__swatch-hex {
  font-family: var(--cs-font-body);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--cs-ink-low, #8c887e);
}

/* ---- 7. DELIVERY / OUTCOME -------------------------------------- */

.case-study__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1px;
  margin: clamp(26px, 3.2vw, 44px) 0 0;
  background: var(--cs-hair, rgba(23, 22, 20, 0.14));
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 4px;
  overflow: hidden;
}

.case-study__metric {
  padding: 18px 16px;
  background: var(--cs-paper-raised, #efebe1);
}

.case-study__metric dd {
  margin: 0;
  font-family: var(--cs-font-display);
  font-size: clamp(1rem, 1.5vw, 1.28rem);
  line-height: 1.2;
  color: var(--cs-ink, #171614);
}

.case-study__quote {
  margin: clamp(26px, 3.2vw, 44px) 0 0;
  padding: clamp(20px, 2.6vw, 34px);
  border-left: 2px solid var(--cs-ember, #b56c4b);
  background: var(--cs-paper-raised, #efebe1);
  border-radius: 0 4px 4px 0;
}

.case-study__quote p {
  margin: 0;
  font-family: var(--cs-font-display);
  font-size: clamp(1.04rem, 1.6vw, 1.4rem);
  line-height: 1.42;
  color: var(--cs-ink, #171614);
  text-wrap: pretty;
}

.case-study__quote cite {
  display: block;
  margin-top: 12px;
  font-family: var(--cs-font-body);
  font-style: normal;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cs-ink-low, #8c887e);
}

/* The caveat on illustrative numbers, printed with the numbers. */
.case-study__footnote {
  margin: 18px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--cs-ink-low, #8c887e);
  max-width: 64ch;
}

/* ---- 8. CREDITS + NEXT + CTA ------------------------------------ */

.case-study__credit-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1px;
  margin: 0;
  background: var(--cs-hair, rgba(23, 22, 20, 0.14));
  border: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
  border-radius: 4px;
  overflow: hidden;
}

.case-study__end {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(20px, 3vw, 48px);
  margin-top: clamp(34px, 4.4vw, 64px);
  padding-top: clamp(26px, 3vw, 40px);
  border-top: 1px solid var(--cs-hair, rgba(23, 22, 20, 0.14));
}

.case-study__next {
  min-width: 0;
  max-width: 46ch;
}

.case-study__next-title {
  margin: 0;
  font-family: var(--cs-font-display);
  font-size: clamp(1.5rem, 3.4vw, 2.6rem);
  line-height: 1.02;
  letter-spacing: -0.018em;
  color: var(--cs-ink, #171614);
}

.case-study__next-hook {
  margin: 10px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--cs-ink-mid, #4b4842);
  text-wrap: pretty;
}

/* The one filled control in the document, because it is the one
   thing the page is asking for. */
.case-study__start {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: 14px 22px;
  border-radius: 999px;
  background: var(--cs-plate, #141311);
  color: #f5f1e8;
  font-family: var(--cs-font-body);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    background 240ms ease,
    transform 240ms ease;
}

.case-study__start svg {
  width: 12px;
  height: 12px;
  transition: transform 240ms ease;
}

.case-study__start:hover {
  background: var(--cs-ember, #b56c4b);
}

.case-study__start:hover svg {
  transform: translate(2px, -2px);
}

/* ---- NARROW ------------------------------------------------------
   Same 900px line the rest of the document collapses on, so the
   heading columns and the cover stack together rather than one
   section reflowing before its neighbour. */

@media (max-width: 900px) {
  .case-study__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  /* Sticky headings in a single column would sit on top of their own
     content. */
  .case-study__grid-head {
    position: static;
    top: auto;
  }

  .case-study__claim {
    max-width: none;
    font-size: clamp(2.1rem, 10vw, 3.5rem);
  }

  .case-study__cover-side {
    max-width: none;
  }

  .case-study__screens {
    grid-template-columns: minmax(0, 1fr);
  }

  .case-study__end {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .case-study__fact-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .case-study__cover-headline {
    font-size: 1rem;
  }

  .case-study__start {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .case-study__screen-image,
  .case-study__cover-link,
  .case-study__cover-link svg,
  .case-study__start,
  .case-study__start svg {
    transition: none;
  }

  .case-study__screen:hover .case-study__screen-image {
    transform: none;
  }
}
'@

$t = [IO.File]::ReadAllText($path)
if ($t.Contains('THE EIGHT-SECTION TEMPLATE')) {
  'SKIP already appended' | Out-File -Encoding ascii csslog.txt
} else {
  [IO.File]::WriteAllText($path, $t + $css, (New-Object Text.UTF8Encoding($false)))
  ("OK appended, bytes: " + (Get-Item $path).Length) | Out-File -Encoding ascii csslog.txt
}
