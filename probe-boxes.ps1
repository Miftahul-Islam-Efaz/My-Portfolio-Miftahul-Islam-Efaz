$ErrorActionPreference = 'Stop'
$out = @()
$css = 'src\styles\work-case-study.css'
$ls = Get-Content $css

# For each flat paper-raised box, walk BACK to the selector that owns it.
foreach ($n in 2219, 2251, 2298, 2313) {
  $i = $n - 1
  $sel = '(selector not found)'
  for ($j = $i; $j -ge 0 -and $j -gt $i - 40; $j--) {
    if ($ls[$j] -match '^\.case-study') { $sel = $ls[$j]; break }
  }
  $out += ''
  $out += '===== line ' + $n + '  OWNER: ' + $sel + ' ====='
  $lo = [Math]::Max(0, $i - 6)
  for ($k = $lo; $k -lt [Math]::Min($ls.Count, $i + 7); $k++) {
    $out += ($k + 1).ToString() + ': ' + $ls[$k]
  }
}

$out | Out-File -Encoding ascii boxes.txt
