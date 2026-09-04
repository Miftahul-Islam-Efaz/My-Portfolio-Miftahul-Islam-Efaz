$ErrorActionPreference = 'Stop'
$script:out = @()

function Dump($path, $label, $from, $to) {
  $script:out += ''
  $script:out += '########## ' + $label + '  (' + $path + ' ' + $from + '-' + $to + ')'
  $ls = Get-Content $path
  $hi = [Math]::Min($ls.Count, $to)
  for ($i = $from - 1; $i -lt $hi; $i++) { $script:out += ($i + 1).ToString() + ': ' + $ls[$i] }
}

$data = 'src\components\work\caseStudyData.ts'
$body = 'src\components\work\case-study\CaseStudyBody.tsx'
$win = 'src\components\work\case-study\CaseStudyWindow.tsx'
$dc = 'src\components\work\DitherCarousel.tsx'
$css = 'src\styles\work-case-study.css'

# --- exports of the data module ---
$script:out += '##### caseStudyData EXPORTS'
$ls = Get-Content $data
for ($i = 0; $i -lt $ls.Count; $i++) {
  if ($ls[$i] -match '^export ') { $script:out += ($i + 1).ToString() + ': ' + $ls[$i] }
}

# --- CaseStudyBody signature + props ---
$script:out += ''
$script:out += '##### CaseStudyBody SIGNATURE / next computation'
$ls = Get-Content $body
for ($i = 0; $i -lt $ls.Count; $i++) {
  if ($ls[$i] -match 'export default function|^  study:|study: WorkCaseStudy|const next|const ids|const here|^\}\)|: \{$|import ') {
    $script:out += ($i + 1).ToString() + ': ' + $ls[$i]
  }
}
Dump $body 'BODY: next lookup' 152 175

# --- window: props block + where Body is rendered ---
Dump $win 'WINDOW: props' 230 250
$script:out += ''
$script:out += '##### WINDOW: CaseStudyBody render'
$ls = Get-Content $win
for ($i = 0; $i -lt $ls.Count; $i++) {
  if ($ls[$i] -match 'CaseStudyBody|scrollerRef\.current|scrollTo') {
    $script:out += ($i + 1).ToString() + ': ' + $ls[$i]
  }
}

Dump $dc 'DITHER: render block' 780 795

# --- CSS: the section padding group (content-visibility target) ---
$script:out += ''
$script:out += '##### CSS section group + corner blur rule'
$cl = Get-Content $css
for ($i = 0; $i -lt $cl.Count; $i++) {
  if ($cl[$i] -match '^\.case-study__facts,|^\.case-study__problem,|^\.case-study__credits \{|^\.case-study__credits,') {
    for ($k = $i; $k -lt [Math]::Min($cl.Count, $i + 16); $k++) {
      $script:out += ($k + 1).ToString() + ': ' + $cl[$k]
      if ($cl[$k].Trim() -eq '}') { break }
    }
    $script:out += '   ...'
  }
}
Dump $css 'CSS: corner pseudo blur' 2645 2680

$script:out | Out-File -Encoding ascii wire.txt
