# .claude/window-lock.ps1 — SHIM for a window running from the PowerShell tool.
# Why needed: on the PowerShell PATH, `bash` may be an empty WSL launcher (C:\WINDOWS\system32\bash.exe) ->
#   `bash .claude/window-lock.sh ...` exits 1, creating NO lock SILENTLY (red-team M2). This shim finds the REAL Git-Bash then forwards.
# Usage:  powershell -File .claude/window-lock.ps1 claim <issue|slug> [model] [note]
#         powershell -File .claude/window-lock.ps1 release <key> [--force] | list | sweep
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path           # .claude/
$sh   = Join-Path $here 'window-lock.sh'
$candidates = @(
  (Join-Path $env:ProgramFiles 'Git\bin\bash.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\Git\bin\bash.exe')
)
$bash = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $bash) {
  Write-Error "Could not find a real Git-Bash (bash.exe). Install Git for Windows, or run window-lock.sh via the Bash tool."
  exit 2
}
& $bash $sh @args
exit $LASTEXITCODE
