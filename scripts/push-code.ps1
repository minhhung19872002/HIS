# scripts/push-code.ps1
# Push only CODE commits to origin/main; HOLD docs/workspace-docs commits in local.
# Enforces rule workspace-docs-never-push (docs visible+committed on main, never pushed).
# Usage (from repo root):  pwsh scripts/push-code.ps1
$ErrorActionPreference = 'Stop'

git fetch origin main | Out-Null
$base = (git rev-parse origin/main).Trim()
$head = (git rev-parse HEAD).Trim()
if ($base -eq $head) { Write-Host "Nothing to push (HEAD == origin/main)."; exit 0 }

# Helper: does a commit touch docs/workspace-docs/ ?
function Test-DocsCommit($sha) {
  $touched = git diff-tree --no-commit-id --name-only -r $sha
  foreach ($t in $touched) { if ($t -like 'docs/workspace-docs/*') { return $true } }
  return $false
}

$commits = git rev-list --reverse "$base..$head"
$pushSha = $base
$held = New-Object System.Collections.Generic.List[string]
$seenDocs = $false
foreach ($c in $commits) {
  if (Test-DocsCommit $c) { $seenDocs = $true; $held.Add($c) }
  elseif ($seenDocs) { $held.Add($c) }   # code commit ABOVE a docs commit -> cannot push cleanly
  else { $pushSha = $c }
}

if ($pushSha -eq $base) {
  Write-Host "No code commit to push (only docs commits ahead). Docs stay local."
  exit 0
}

Write-Host ("Pushing code up to {0}:main ..." -f $pushSha.Substring(0,8))
git push origin "${pushSha}:main"

if ($held.Count -gt 0) {
  Write-Host ""
  Write-Host "Held in LOCAL (not pushed):"
  $codeHeld = $false
  foreach ($c in $held) {
    git log -1 --oneline $c
    if (-not (Test-DocsCommit $c)) { $codeHeld = $true }
  }
  if ($codeHeld) {
    Write-Host ""
    Write-Host "WARNING: a CODE commit is sitting ABOVE a docs commit and was held back."
    Write-Host "Rule: docs commits must stay on TOP. Reorder (rebase docs to tip) then re-run."
  }
}
