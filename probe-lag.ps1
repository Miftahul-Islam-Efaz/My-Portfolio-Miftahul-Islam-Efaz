$ErrorActionPreference = 'Stop'
$script:out = @()

function Dump($path, $label, $from, $to) {
  $script:out += ''
  $script:out += '########## ' + $label + '  (' + $from + '-' + $to + ')'
  $ls = Get-Content $path
  $hi = [Math]::Min($ls.Count, $to)
  for ($i = $from - 1; $i -lt $hi; $i++) { $script:out += ($i + 1).ToString() + ': ' + $ls[$i] }
}

$win = 'src\components\work\case-study\CaseStudyWindow.tsx'
$css = 'src\styles\work-case-study.css'

# --- every per-frame / scroll listener in the window ---
$script:out += '##### SCROLL / RAF / TICKER HITS IN THE WINDOW'
$ls = Get-Content $win
for ($i = 0; $i -lt $ls.Count; $i++) {
  if ($ls[$i] -match "addEventListener\('scroll|requestAnimationFrame|gsap\.ticker|ScrollTrigger|onUpdate|setProperty|getBoundingClientRect|IntersectionObserver|passive") {
    $script:out += ($i + 1).ToString() + ': ' + $ls[$i].Trim()
  }
}

# --- the expensive CSS: blur, filter, shadows, fixed layers ---
$script:out += ''
$script:out += '##### BACKDROP-FILTER / FILTER / WILL-CHANGE IN CSS'
$cl = Get-Content $css
for ($i = 0; $i -lt $cl.Count; $i++) {
  if ($cl[$i] -match 'backdrop-filter|will-change|  filter:|position: fixed|content-visibility|contain:') {
    $script:out += ($i + 1).ToString() + ': ' + $cl[$i].Trim()
  }
}

Dump $win 'PARALLAX + FROST HANDLERS' 448 560

$script:out += ''
$script:out += '##### SCROLLER / DOC / SECTION CSS'
foreach ($sel in '.case-study__scroller {', '.case-study__doc {', '.case-study__cover {', '.case-study__cover-shapes {', '.case-study__bar {') {
  for ($i = 0; $i -lt $cl.Count; $i++) {
    if ($cl[$i].Trim() -eq $sel) {
      $script:out += ''
      $script:out += '--- ' + $sel + ' at line ' + ($i + 1)
      for ($k = $i; $k -lt [Math]::Min($cl.Count, $i + 22); $k++) {
        $script:out += ($k + 1).ToString() + ': ' + $cl[$k]
        if ($cl[$k].Trim() -eq '}') { break }
      }
    }
  }
}

$script:out | Out-File -Encoding ascii lag.txt
