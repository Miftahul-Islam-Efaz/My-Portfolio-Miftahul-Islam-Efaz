$ErrorActionPreference = 'Stop'
$out = @()

function Dump([string]$path, [string]$label, [int]$from, [int]$to) {
  $ls = Get-Content $path
  $script:out += ''
  $script:out += '===== ' + $label + '  (' + $path + ' ' + $from + '-' + $to + ') ====='
  $hi = [Math]::Min($to, $ls.Count)
  for ($i = $from - 1; $i -lt $hi; $i++) {
    $script:out += ($i + 1).ToString() + ': ' + $ls[$i]
  }
}

$css = 'src\styles\work-case-study.css'
$body = 'src\components\work\case-study\CaseStudyBody.tsx'

Dump $css 'FONT TOKENS' 40 70
Dump $css 'SECTION TITLE + COPY' 960 1015
Dump $css 'NEXT + START' 2280 2348
Dump $css 'NARROW START' 2388 2412
Dump $body 'ARROW BUG + START CTA' 440 485

$out | Out-File -Encoding ascii probetype.txt
