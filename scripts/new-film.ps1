param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Slug
)
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FilmDir = Join-Path $RepoRoot "films\$Slug"
if (Test-Path $FilmDir) {
    throw "Project directory already exists: $FilmDir"
}

New-Item -ItemType Directory -Force -Path $FilmDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $FilmDir "style_pk") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $FilmDir "assets\plates") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $FilmDir "assets\sprites") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $FilmDir "out") | Out-Null

Get-ChildItem (Join-Path $RepoRoot "templates") -Filter "*.md" | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $FilmDir $_.Name)
}
Copy-Item (Join-Path $RepoRoot "core\starter\index.html") -Destination (Join-Path $FilmDir "index.html")
Copy-Item (Join-Path $RepoRoot "core\starter\timeline.json") -Destination (Join-Path $FilmDir "timeline.json")

Write-Host "[new-film] Scaffolded clean project at: $FilmDir"
Write-Host "Next step: open this repo in Antigravity and start Phase 0 with chronicle-director."
