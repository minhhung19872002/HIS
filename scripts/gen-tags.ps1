# Regenerate the ctags "code map" (symbol index) for AI coding agents (Claude Code / Cursor / Codex).
# Indexes FE (TypeScript) + BE (C#) into a root `tags` file (gitignored — generated, large, can go stale).
# Usage (from anywhere):  pwsh -File scripts/gen-tags.ps1
#   Query a symbol after generating:  Select-String -Path tags -Pattern '^SymbolName\b'
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# Resolve ctags: PATH first, else the winget install location (PATH may not refresh until shell restart).
$ctags = (Get-Command ctags -ErrorAction SilentlyContinue).Source
if (-not $ctags) {
  $ctags = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ctags.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ctags) { throw "ctags not found. Install: winget install --id UniversalCtags.Ctags -e" }

Push-Location $root
try {
  & $ctags -R --languages=TypeScript,C# `
    --exclude=node_modules --exclude=bin --exclude=obj --exclude=dist --exclude=.git `
    --fields=+nKl --extras=+q -f tags frontend/src backend/src
  if ($LASTEXITCODE -ne 0) { throw "ctags exited $LASTEXITCODE" }
  Write-Host ("tags regenerated: {0:N1} MB, {1} symbols" -f ((Get-Item tags).Length/1MB), ((Get-Content tags | Measure-Object -Line).Lines))
}
finally { Pop-Location }
