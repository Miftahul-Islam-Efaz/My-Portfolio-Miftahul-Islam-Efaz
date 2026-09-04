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

$oldBlock = @'
        {/*
          THE RIGHT-HAND COLUMN, TIGHTENED.

          Three lines in a fixed order - kicker, headline, tagline - with a
          hairline doing the separating instead of whitespace. Composition
          notes, since they are the whole point of this block:

          - The KICKER (category and year) goes on top. It is the smallest type
            in the group, so starting there gives the eye a definite entry
            point and stops the column reading as two floating sentences.
          - The HEADLINE is the only thing here at reading size, and it now
            hangs directly off the rule rather than sitting between two gaps.
          - The TAGLINE closes the group, deliberately dimmer than the
            headline: it repeats what the on-image type already says, so it
            should support rather than compete.

          The pieces are close together on purpose. Grouped tightly and set
          against the title's large measure, the column reads as one block with
          internal structure - which is what makes it feel composed rather than
          stacked.
        */}
        <div className="case-study__cover-side">
          <p className="case-study__cover-kicker">
            <span>{study.industry ?? study.category}</span>
            <span className="case-study__cover-kicker-sep" aria-hidden="true" />
            <span>{study.year}</span>
          </p>

          <p className="case-study__cover-headline">{study.hook}</p>

          <p className="case-study__cover-sub">{study.subtitle}</p>
        </div>
'@

$newBlock = @'
        {/*
          THE RIGHT-HAND COLUMN: THE PROBLEM LINE, ALONE.

          The kicker (category and year) and the closing tagline are both gone
          at the user's request. Worth recording why that costs no
          information: the category and year are both restated in the Project
          facts row a screen below, and the tagline repeated what the cover
          image already says in type. Neither held anything that existed only
          here.

          What is left is the one line that earns the space - the problem the
          project solves. A single element also means this block's height is
          now set by the hook alone, so it clears the tapering shape with more
          slack than the sizing note in the CSS was written against.

          The classes for the removed pieces are deliberately left in the
          stylesheet: restoring either is a two-line change here, and unused
          rules cost nothing at runtime.
        */}
        <div className="case-study__cover-side">
          <p className="case-study__cover-headline">{study.hook}</p>
        </div>
'@

Swap $tsx 'tsx-side-block' $oldBlock $newBlock

Swap $css 'css-height-note' `
  '     the span where ~272px of height remains against the ~190px this
     block needs. */' `
  '     the span where ~272px of height remains - and the block now needs
     only ~130px, since the kicker and tagline above and below the hook
     have been removed. Comfortable slack, not a tight fit. */'

$x = [IO.File]::ReadAllText($tsx, [Text.Encoding]::UTF8)
$v = [IO.File]::ReadAllText($css, [Text.Encoding]::UTF8)
$log += 'kicker in tsx (should be 0):        ' + ([regex]::Matches($x,'cover-kicker')).Count
$log += 'sub in tsx (should be 0):           ' + ([regex]::Matches($x,'cover-sub')).Count
$log += 'study.subtitle in tsx (0):          ' + ([regex]::Matches($x,'study\.subtitle')).Count
$log += 'headline in tsx (should be 1):      ' + ([regex]::Matches($x,'cover-headline')).Count
$log += 'cover-side div in tsx (1):          ' + ([regex]::Matches($x,'className="case-study__cover-side"')).Count
$log += 'p tags in side block (1):           ' + ([regex]::Matches($x,'<p className="case-study__cover-')).Count
$log += 'css braces: ' + ([regex]::Matches($v,'\{')).Count + '/' + ([regex]::Matches($v,'\}')).Count
$log | Out-File -Encoding ascii trimlog.txt
