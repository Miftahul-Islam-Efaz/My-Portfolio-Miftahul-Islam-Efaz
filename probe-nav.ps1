$ErrorActionPreference = 'Stop'
$out = @()

function Dump($path, $label, $from, $to) {
  $out += ''
  $out += '########## ' + $label + '  (' + $path + ' ' + $from + '-' + $to + ')'
  $ls = Get-Content $path
  $hi = [Math]::Min($ls.Count, $to)
  for ($i = $from - 1; $i -lt $hi; $i++) { $out += ($i + 1).ToString() + ': ' + $ls[$i] }
}

$dc = 'src\components\work\DitherCarousel.tsx'
$wg = 'src\components\work\WorkGalleryWindow.tsx'

# Where the overlay state lives + how CaseStudyWindow is rendered
$ls = Get-Content $dc
$out += '##### overlay / hash / study hits in DitherCarousel'
for ($i = 0; $i -lt $ls.Count; $i++) {
  if ($ls[$i] -match 'overlay|useCaseStudy|HASH|hash|study|slug') {
    $out += ($i + 1).ToString() + ': ' + $ls[$i]
  }
}

Dump $dc 'DITHER: window render' 760 800
Dump $wg 'GALLERY: the hash URL pattern' 175 232

$out += ''
$out += '##### WORK_GALLERY_HASH definition'
$out += (findstr /s /n /c:"WORK_GALLERY_HASH =" src\*.ts src\*.tsx)

$out | Out-File -Encoding ascii nav.txt
