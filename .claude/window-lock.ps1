# .claude/window-lock.ps1 — SHIM cho cua chay tu tool PowerShell.
# Vi sao can: tren PATH cua PowerShell, `bash` co the la WSL launcher rong (C:\WINDOWS\system32\bash.exe) ->
#   `bash .claude/window-lock.sh ...` exit 1, KHONG tao lock CAM (red-team M2). Shim nay tim Git-Bash THAT roi forward.
# Dung:  powershell -File .claude/window-lock.ps1 claim <issue|slug> [model] [note]
#        powershell -File .claude/window-lock.ps1 release <key> [--force] | list | sweep
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
  Write-Error "Khong tim thay Git-Bash that su (bash.exe). Cai Git for Windows, hoac chay window-lock.sh qua Bash tool."
  exit 2
}
& $bash $sh @args
exit $LASTEXITCODE
