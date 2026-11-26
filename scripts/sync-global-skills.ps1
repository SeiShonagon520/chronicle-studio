$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SrcSkills = Join-Path $RepoRoot ".agents\skills"
$DstSkills = Join-Path $env:USERPROFILE ".gemini\config\skills"

New-Item -ItemType Directory -Force -Path $DstSkills | Out-Null
Get-ChildItem $SrcSkills -Directory | ForEach-Object {
    $target = Join-Path $DstSkills $_.Name
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    Copy-Item $_.FullName -Destination $target -Recurse -Force
    Write-Host "[sync] Synced skill '$($_.Name)' -> $target"
}
Write-Host "All chronicle-studio skills are now available globally in Antigravity."
