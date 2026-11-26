$ErrorActionPreference = "Continue"
Write-Host "=== Chronicle Studio Environment Diagnostic ==="

$ok = $true

function Check-Bin($label, $cmd) {
    $res = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($res) {
        Write-Host "[OK] $label -> $($res.Source)"
        return $true
    } else {
        Write-Host "[MISSING] $label ($cmd)" -ForegroundColor Red
        return $false
    }
}

$ok = (Check-Bin "Node.js" "node") -and $ok
$ok = (Check-Bin "FFmpeg" "ffmpeg") -and $ok
$ok = (Check-Bin "FFprobe" "ffprobe") -and $ok
$ok = (Check-Bin "Git" "git") -and $ok
$ok = (Check-Bin "GitHub CLI" "gh") -and $ok

$nodeVer = node -v
Write-Host "  Node version: $nodeVer (WebSocket global check via node -e)"
node -e "if (typeof WebSocket !== 'function') process.exit(1)"
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Node global WebSocket unavailable (need Node >= 22)" -ForegroundColor Red; $ok = $false }

$py = "C:\Users\L\anaconda3\python.exe"
if (-not (Test-Path $py)) { $py = (Get-Command python -ErrorAction SilentlyContinue).Source }
if ($py) {
    Write-Host "[OK] Python -> $py"
    & $py -c "import PIL, numpy; print('[OK] Python libs: Pillow + numpy ready')"
    if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] Pillow or numpy missing in $py" -ForegroundColor Red; $ok = $false }
} else {
    Write-Host "[MISSING] Python" -ForegroundColor Red
    $ok = $false
}

$chromeFound = $null
foreach ($c in @(
    $env:CHRONICLE_CHROME,
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)) {
    if ($c -and (Test-Path $c)) { $chromeFound = $c; break }
}
if ($chromeFound) {
    Write-Host "[OK] Headless CDP Browser -> $chromeFound"
} else {
    Write-Host "[MISSING] Chrome or Edge browser (set CHRONICLE_CHROME)" -ForegroundColor Red
    $ok = $false
}

if (-not $ok) { exit 1 }
Write-Host "=== ALL CHECKS PASSED ==="
exit 0
