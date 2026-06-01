#!/usr/bin/env bash
# PreToolUse(Bash) guard — CHỈ tác động lên `git push` thật.
# Chặn (permissionDecision=deny) nếu commit sắp push chứa docs/workspace-docs/ (rule workspace-docs-never-push).
# Lệnh Bash khác -> exit 0 (cho qua) ngay, không đụng gì.

input=$(cat)

# Lấy tool_input.command từ JSON stdin (parse bằng node — luôn có trong dự án npm này).
cmd=$(printf '%s' "$input" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.command)||'')}catch(e){}})" 2>/dev/null)

# Không phải git push -> cho qua ngay.
case "$cmd" in
  *git\ push*) : ;;
  *) exit 0 ;;
esac

range=""
if git rev-parse '@{u}' >/dev/null 2>&1; then
  range='@{u}..HEAD'
elif git rev-parse origin/main >/dev/null 2>&1; then
  range='origin/main..HEAD'
fi

if [ -z "$range" ]; then
  echo '{"systemMessage":"⚠️ Push guard: không xác định được upstream để kiểm tra. Tự xác nhận commit KHÔNG chứa docs/workspace-docs/ trước khi push."}'
  exit 0
fi

hits=$(git diff --name-only "$range" 2>/dev/null | grep '^docs/workspace-docs/' | head -5 | tr '\n' ' ')

if [ -n "$hits" ]; then
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"⛔ BLOCK push — commit sắp push chứa docs/workspace-docs/ (rule workspace-docs-never-push). Vi phạm: ${hits}. Gỡ các file này khỏi commit sắp push (reset/tách commit local riêng) rồi push lại.\"}}"
fi
exit 0