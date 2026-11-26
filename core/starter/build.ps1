$ErrorActionPreference = "Stop"

$StarterDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $StarterDir "..\..")).Path
$OutDir = Join-Path $StarterDir "out"
$StillsDir = Join-Path $OutDir "stills"
New-Item -ItemType Directory -Force -Path $StillsDir | Out-Null

$Python = "C:\Users\L\anaconda3\python.exe"
if (-not (Test-Path $Python)) { $Python = "python" }

Write-Host "=== [1/6] Render Starter Still Frames ==="
node (Join-Path $RepoRoot "core\render\still.mjs") $StarterDir 0.4 2.75 2.95 3.30 5.40 --prefix "st_" --out $StillsDir
if ($LASTEXITCODE -ne 0) { throw "still.mjs failed" }

Write-Host "=== [2/6] Assemble Contact Sheet ==="
$stills = Get-ChildItem $StillsDir -Filter "st_*.jpg" | Sort-Object Name | ForEach-Object { $_.FullName }
& $Python (Join-Path $RepoRoot "core\render\sheet.py") (Join-Path $OutDir "contact_sheet.jpg") @stills --cols 3 --tile-w 640 --header "Chronicle Studio Starter QA Contact Sheet"
if ($LASTEXITCODE -ne 0) { throw "sheet.py failed" }

Write-Host "=== [3/6] Run Readcheck Automated Bounds & Duration Audit ==="
node (Join-Path $RepoRoot "core\render\readcheck.mjs") $StarterDir --step 0.05
if ($LASTEXITCODE -ne 0) { throw "readcheck.mjs failed" }

Write-Host "=== [4/6] Render Full 6.0s Video Track ==="
$VideoPath = Join-Path $OutDir "video.mp4"
node (Join-Path $RepoRoot "core\render\video.mjs") $StarterDir --fps 24 --out $VideoPath
if ($LASTEXITCODE -ne 0) { throw "video.mjs failed" }

Write-Host "=== [5/6] Generate Warm Chord Test Audio & .srt ==="
$WavPath = Join-Path $OutDir "mix.wav"
$SrtPath = Join-Path $OutDir "subtitles_zh.srt"
@"
import wave, numpy as np
sr = 48000; dur = 6.0; t = np.linspace(0, dur, int(sr * dur), endpoint=False)
sig = 0.08 * (np.sin(2*np.pi*220*t) + 0.6*np.sin(2*np.pi*277.18*t) + 0.5*np.sin(2*np.pi*329.63*t))
env = np.minimum(1.0, t / 0.15) * np.minimum(1.0, (dur - t) / 0.25)
pcm = np.clip(sig * env * 32767, -32767, 32767).astype('<i2')
stereo = np.column_stack([pcm, pcm]).tobytes()
with wave.open(r'$WavPath', 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(stereo)
print(r'[audio] Wrote 6.0s harmonic chord WAV -> $WavPath')
"@ | & $Python -
if ($LASTEXITCODE -ne 0) { throw "WAV generation failed" }

& $Python (Join-Path $RepoRoot "core\render\srt.py") (Join-Path $StarterDir "timeline.json") $SrtPath
if ($LASTEXITCODE -ne 0) { throw "srt.py failed" }

Write-Host "=== [6/6] Two-Pass Loudnorm (-14 LUFS) + Blackdetect Mux ==="
$FinalPath = Join-Path $OutDir "starter_final.mp4"
& $Python (Join-Path $RepoRoot "core\render\mux.py") $VideoPath $WavPath $FinalPath
if ($LASTEXITCODE -ne 0) { throw "mux.py failed" }

Write-Host "=== STARTER BUILD COMPLETE: $FinalPath ==="
