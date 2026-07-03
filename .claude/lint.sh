#!/usr/bin/env bash
# .claude/lint.sh — the IMMUNE SYSTEM against .claude governance drift.
# AUTO-detects classes of errors that have happened before (root-cause: no checker → drift accumulates across sessions).
# Run: bash .claude/lint.sh  (exit 1 on error). Run AFTER every .claude edit + BEFORE commit.
# ANTI-OVERSTATEMENT principle (the lint itself must obey): exclude itself · skip comments · low false-positive.
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
CL="$ROOT/.claude"
ERRF=$(mktemp); WRNF=$(mktemp)   # count via a FILE (avoid the subshell `| while` bug where parent vars don't accumulate)
rel(){ sed "s|$ROOT/||g"; }
err(){ printf '  ❌ %s\n' "$1"; echo x >>"$ERRF"; }
wrn(){ printf '  ⚠️  %s\n' "$1"; echo x >>"$WRNF"; }
# grep excludes lint.sh itself (otherwise it matches its own patterns → false-positive).
# + excludes .claude/worktrees/ (transient git-worktree sandboxes of background agents — scanning them
#   doubles every error + reports false errors on out-of-scope doc copies).
GEX="--exclude=lint.sh --exclude-dir=worktrees"

echo "== [1] Dead memory refs (only flag a backtick-quoted slug missing from ALL project memory) =="
ALLMEM=$(ls "$HOME"/.claude/projects/*/memory/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//' | sort -u)
SKIP='user_role feedback_testing feedback_my_preferences project_x reference_x'
if [ -n "$ALLMEM" ]; then
  grep -rhoE $GEX '`(feedback|project|reference)_[a-z0-9-]+`' "$CL" 2>/dev/null | tr -d '`' | sort -u | while read -r r; do
    case " $SKIP " in *" $r "*) continue;; esac
    echo "$ALLMEM" | grep -qx "$r" || grep -rln $GEX "\`$r\`" "$CL" 2>/dev/null | grep -v '/agent-memory/' | rel | while read -r f; do err "memory '$r' does not exist (any project) — referenced in $f"; done
  done
else wrn "could not list the memory dir to compare against"; fi

echo "== [2] Hard-coded migration number (changing state) =="
grep -rniE $GEX 'last was [0-9]+|next.{0,6}= ?[0-9]{1,3}|latest committed = [0-9]+|approaching [0-9]+\+?' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null \
  | grep -iE 'migration|script|Data/Scripts|NN_' | grep -vE '^\s*#|^[^:]+:[0-9]+:\s*#' | rel | while read -r l; do err "hard-coded migration number: $l"; done

echo "== [3] workspace-docs 'never-push / local-only' (rule REMOVED 2026-06-13) =="
grep -rniE $GEX 'never push|local-only|local only' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null \
  | grep -iE 'workspace' | grep -viE 'REMOVED|removed|normally|normal' | rel | while read -r l; do err "lingering workspace-docs never-push: $l"; done

echo "== [4] Duplicate heading-number in the same file (## N. repeated; skip references/) =="
find "$CL" -name '*.md' -not -path '*/references/*' -not -path '*/worktrees/*' 2>/dev/null | while read -r f; do
  dups=$(grep -oE '^## [0-9]+\.' "$f" 2>/dev/null | sort | uniq -d)
  [ -n "$dups" ] && err "duplicate heading number in $(echo "$f"|rel): $(echo $dups|tr '\n' ' ')"
done

echo "== [5] Hook emits valid JSON =="
for h in session-start precompact-preserve; do
  hs="$CL/hooks/$h.sh"; [ -f "$hs" ] || continue
  bash "$hs" 2>/dev/null | python -c 'import json,sys; json.loads(sys.stdin.read())' 2>/dev/null || err "hook $h.sh → INVALID JSON"
done

echo "== [6] Anti-pattern 'grep -c . || echo 0' (code lines ONLY, skip comments) =="
grep -rn $GEX 'grep -c \. || echo 0' "$CL/hooks/" 2>/dev/null | grep -vE ':[0-9]+:\s*#' | rel | while read -r l; do err "line-count anti-pattern (breaks JSON): $l"; done

echo "== [7] Broken internal link (workflow/*.md points to a non-existent file) =="
find "$CL/workflow" -name '*.md' 2>/dev/null | while read -r f; do d=$(dirname "$f")
  grep -oE '\]\(([a-zA-Z0-9_./-]+\.md)\)' "$f" 2>/dev/null | sed -E 's/\]\((.*)\)/\1/' | while read -r link; do
    case "$link" in /*|http*) continue;; esac
    [ -f "$d/$link" ] || wrn "broken link in $(echo "$f"|rel): $link"
  done
done

echo "== [8] Backtick ref \`his-/core-X\` to a skill OR agent that does NOT exist (name drift) =="
# Valid set = skills + agents (both use the his-/core- prefix). Exclude docs outside .claude/skills (e.g. his-pacs-* = host/path, not a skill).
VALID=$( { ls -d "$CL"/skills/*/ "$CL"/agents/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//'; } | sort -u)
if [ -n "$VALID" ]; then
  grep -rhoE $GEX '`(his-(fe|be|db|fs|ops|test|qa|doc|flow|architecture|quality|docs|test)|core)-[a-z0-9]+(-[a-z0-9]+)*`' "$CL" "$ROOT/CLAUDE.md" 2>/dev/null | tr -d '`' | sort -u | while read -r s; do
    echo "$VALID" | grep -qx "$s" || grep -rln $GEX "\`$s\`" "$CL" "$ROOT/CLAUDE.md" 2>/dev/null | grep -vE 'REGISTRY|skill-routes/_reference|lint.sh' | rel | while read -r f; do err "skill/agent '$s' does not exist — referenced in $f"; done
  done
fi

echo "== [9] 7 agent memory-spec blocks IDENTICAL (duplicate boilerplate — anti drift between copies) =="
# No dedup (subagents need the block inline to know how to use memory); instead ENFORCE that the 7 copies are identical.
ref=""; refn=""
for f in "$CL"/agents/*.md; do
  b=$(basename "$f" .md)
  h=$(awk '/^# Persistent Agent Memory/{p=1} p' "$f" 2>/dev/null | sed -E "s/$b//g; s|agent-memory/[a-z-]+|agent-memory/AGENT|g" | md5sum | cut -c1-12)
  case "$h" in d41d8cd98f00) continue;; esac   # empty block (agent has none) → skip
  if [ -z "$ref" ]; then ref="$h"; refn="$b"
  elif [ "$h" != "$ref" ]; then err "agent '$b' memory-spec block DIFFERS from '$refn' — sync them (boilerplate must be 100% identical)"; fi
done

echo "== [10] Untracked .claude script (a referenced mechanism untracked → dangling ref on commit) =="
find "$CL" -type f \( -name '*.sh' -o -name '*.ps1' \) -not -path '*/worktrees/*' 2>/dev/null | while read -r f; do
  rp=$(echo "$f" | rel)
  git -C "$ROOT" ls-files --error-unmatch "$rp" >/dev/null 2>&1 && continue   # already tracked
  git -C "$ROOT" check-ignore "$rp" >/dev/null 2>&1 && continue               # intentionally ignored
  wrn "untracked script: $rp (remember to git add on commit, or the referencing command becomes command-not-found)"
done

E=$(wc -l <"$ERRF" 2>/dev/null | tr -d ' '); W=$(wc -l <"$WRNF" 2>/dev/null | tr -d ' '); rm -f "$ERRF" "$WRNF"
echo
if [ "${E:-0}" -gt 0 ]; then echo "LINT FAIL: $E error(s), $W warning(s)."; exit 1; else echo "LINT OK ✅ ($W warning(s))."; exit 0; fi
