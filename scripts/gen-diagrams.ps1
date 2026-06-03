# Render Mermaid sources (docs/architecture/diagrams/*.mmd) -> SVG.
# SVG is embedded in docs/architecture/codebase-map.md -> renders WITHOUT any extension,
# stable across VS Code reloads. First run downloads @mermaid-js/mermaid-cli + Chromium via npx.
# Usage: pwsh -File scripts/gen-diagrams.ps1
# NOTE: ASCII-only on purpose (Windows PowerShell 5.1 mis-parses non-ASCII string literals).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'docs/architecture/diagrams'
if (-not (Test-Path $dir)) { throw "Missing folder: $dir" }

$mmds = Get-ChildItem -Path $dir -Filter *.mmd
if (-not $mmds) { throw "No .mmd files in $dir" }

foreach ($f in $mmds) {
  $svg = [System.IO.Path]::ChangeExtension($f.FullName, '.svg')
  Write-Host ("render {0} -> {1}" -f $f.Name, [System.IO.Path]::GetFileName($svg))
  & npx -y "@mermaid-js/mermaid-cli" -i $f.FullName -o $svg -b transparent
  if ($LASTEXITCODE -ne 0) { throw "mmdc failed on $($f.Name)" }
}
Write-Host ("Done. SVGs in {0}. Open docs/architecture/codebase-map.md (Ctrl+Shift+V)." -f $dir)
