$ErrorActionPreference = 'Stop'
$path = 'src\styles\work-case-study.css'
$t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
$log = @()

function Swap([string]$name, [string]$old, [string]$new) {
  if ($script:t.Contains($old)) {
    $script:t = $script:t.Replace($old, $new)
    $script:log += "OK   $name"
  } else {
    $script:log += "MISS $name"
  }
}

# ---- 1. The right-hand column, recomposed; the live-site pill removed. ----
$old1 = @'
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
'@

$new1 = @'
/* THE RIGHT-HAND COLUMN.

   Compacted into one block with a hairline spine rather than three
   pieces separated by air. Two composition decisions carry it:

   1. align-self: end. The title beside this is roughly four times
      the size, so aligning the two columns at the TOP leaves this
      one stranded in the middle of the hero with nothing under it.
      Aligning the bottoms sits the group on the title's baseline,
      which is the line the eye is already travelling along.
   2. The left rule. It replaces the vertical gaps that used to do
      the separating, so the three lines can close right up and
      still read as structured. Grouping tightly is what makes it
      read as composed rather than stacked.

   The measure drops from 44ch to 32ch as well - a shorter line next
   to a very large title reads as a caption to it, which is exactly
   the relationship wanted here. */
.case-study__cover-side {
  grid-area: note;
  align-self: end;
  /* Optical, not arbitrary: lifts the group off the title's descenders
     so the two columns share a baseline instead of colliding on it. */
  padding-bottom: clamp(4px, 0.8vw, 12px);
  padding-left: clamp(14px, 1.5vw, 24px);
  border-left: 1px solid rgba(245, 241, 232, 0.2);
  max-width: 32ch;
}

/* The kicker. Smallest type in the group and first in the order, so
   the column has a definite entry point. */
.case-study__cover-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 9px;
  font-family: var(--cs-font-body);
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(245, 241, 232, 0.6);
}

/* A rule, not a middot: it holds its width whatever the two labels
   are, so the kicker keeps the same rhythm across every project. */
.case-study__cover-kicker-sep {
  flex: 0 0 auto;
  width: 16px;
  height: 1px;
  background: rgba(245, 241, 232, 0.34);
}

/* The impact headline. Deliberately NOT display type: two competing
   display sizes in one hero is two headlines and no hierarchy. It is
   the only thing in this column at reading size, and it now hangs
   straight off the kicker instead of floating between two gaps. */
.case-study__cover-headline {
  margin: 0;
  font-family: var(--cs-font-body);
  font-size: clamp(1.04rem, 1.58vw, 1.38rem);
  line-height: 1.34;
  letter-spacing: -0.006em;
  color: var(--cs-glass-on-dark, rgba(245, 241, 232, 0.86));
  text-wrap: pretty;
}

/* The tagline closes the group, and is dimmer on purpose: it repeats
   what the on-image type already says, so it supports rather than
   competes. */
.case-study__cover-sub {
  margin: 9px 0 0;
  font-family: var(--cs-font-body);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(245, 241, 232, 0.44);
}
'@
Swap 'cover-side' $old1 $new1

# ---- 2. Stacked layout: the spine becomes a top rule. ----
$old2 = @'
  .case-study__cover-side {
    max-width: none;
  }
'@
$new2 = @'
  /* Stacked, the left spine would be a rule down the side of the
     whole viewport, so it moves to the top and becomes the seam
     between the title and the group instead. */
  .case-study__cover-side {
    align-self: auto;
    max-width: none;
    padding: 14px 0 0;
    border-left: 0;
    border-top: 1px solid rgba(245, 241, 232, 0.2);
  }
'@
Swap 'cover-side-narrow' $old2 $new2

# ---- 3. Drop the removed pill from the reduced-motion list. ----
$old3 = @'
  .case-study__screen-image,
  .case-study__cover-link,
  .case-study__cover-link svg,
  .case-study__start,
'@
$new3 = @'
  .case-study__screen-image,
  .case-study__start,
'@
Swap 'reduced-motion' $old3 $new3

[IO.File]::WriteAllText($path, $t, (New-Object Text.UTF8Encoding($false)))

# Prove the pill's styles are gone rather than assuming it.
$left = ([regex]::Matches($t, 'case-study__cover-link')).Count
$log += "remaining cover-link refs: $left"
$log += 'bytes: ' + (Get-Item $path).Length
$log | Out-File -Encoding ascii herolog.txt
