$ErrorActionPreference = 'Stop'
$log = @()
$data = 'src\components\work\caseStudyData.ts'

$t = [IO.File]::ReadAllText($data, [Text.Encoding]::UTF8).Replace("`r`n", "`n")

# The broken class holds literal combining characters, so it cannot be used as a
# search anchor by typing it out. Match it structurally instead: the ONLY
# .replace(/[...]/g, '') in this file is the diacritic strip. The other two
# replaces in the slug helper end in '-' or use ^-+|-+$ with no character class.
$pattern = "\.replace\(/\[[^\]]*\]/g, ''\)"
$hits = ([regex]::Matches($t, $pattern)).Count
$log += "broken class found: $hits (need 1)"

if ($hits -eq 1) {
  # Built from a char code so no backslash-u escape can be decoded in transit a
  # second time. Produces the six literal characters: backslash u 0 3 0 0
  $bs = [string][char]92
  $fixed = '.replace(/[' + $bs + 'u0300-' + $bs + "u036f]/g, '')"
  $t = [regex]::Replace($t, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $fixed })
  [IO.File]::WriteAllText($data, $t, (New-Object Text.UTF8Encoding($false)))
  $log += 'OK   slug-diacritic-range rewritten'
} else {
  $log += 'MISS - nothing written'
}

# ---- verify ----
$v = [IO.File]::ReadAllText($data, [Text.Encoding]::UTF8)
$bs2 = [string][char]92
$want = '.replace(/[' + $bs2 + 'u0300-' + $bs2 + "u036f]/g, '')"
$log += 'correct escape present (1): ' + ([regex]::Matches($v, [regex]::Escape($want))).Count

# Any non-ASCII left on the slug lines would mean more transit damage.
$lines = [IO.File]::ReadAllLines($data, [Text.Encoding]::UTF8)
$bad = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'caseStudySlug|getCaseStudyBySlug|normalize') {
    foreach ($ch in $lines[$i].ToCharArray()) {
      if ([int]$ch -gt 126) { $bad++ }
    }
  }
}
$log += "non-ASCII chars on slug lines (0): $bad"

$log += '--- caseStudySlug as written ---'
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'export function caseStudySlug') {
    for ($j = $i; $j -lt [Math]::Min($i + 9, $lines.Count); $j++) {
      $log += ($j + 1).ToString() + ': ' + $lines[$j]
    }
    break
  }
}

$log | Out-File -Encoding ascii sluglog.txt
