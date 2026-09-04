$ErrorActionPreference = 'Stop'
$script:out = @()

function Dump($path, $label, $from, $to) {
  $script:out += ''
  $script:out += '########## ' + $label + '  (' + $path + ' ' + $from + '-' + $to + ')'
  $ls = Get-Content $path
  $hi = [Math]::Min($ls.Count, $to)
  for ($i = $from - 1; $i -lt $hi; $i++) { $script:out += ($i + 1).ToString() + ': ' + $ls[$i] }
}

$hook = 'src\hooks\useCaseStudyOverlay.ts'
$dc = 'src\components\work\DitherCarousel.tsx'
$wg = 'src\components\work\WorkGalleryWindow.tsx'
$win = 'src\components\work\case-study\CaseStudyWindow.tsx'
$body = 'src\components\work\case-study\CaseStudyBody.tsx'

if (Test-Path $hook) {
  $n = (Get-Content $hook).Count
  Dump $hook 'THE OVERLAY HOOK (full)' 1 $n
} else {
  $script:out += '!!! hook not at ' + $hook
}

Dump $wg 'GALLERY hash-URL pattern' 178 232
Dump $dc 'DITHER window render' 645 665
Dump $body 'NEXT PROJECT markup' 418 452

$script:out | Out-File -Encoding ascii nav2.txt
