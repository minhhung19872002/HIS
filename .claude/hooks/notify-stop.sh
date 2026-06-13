#!/usr/bin/env bash
# Stop hook — 2 nhiệm vụ:
#  (1) Kêu chuông terminal khi Claude kết thúc lượt (tiện khi build lâu / rời máy).
#  (2) ÉP cập nhật docs/workspace-docs/STATUS.md: nếu có thay đổi code (backend/frontend) — chưa
#      hoặc đã commit nhưng CHƯA push — mà STATUS.md không nhắc tới ngày hôm nay thì CHẶN kết thúc
#      lượt và yêu cầu cập nhật STATUS trước. Mục tiêu: không phiên nào để workspace-docs lệch thực tế.
# Bell ra stderr để không lẫn vào stdout (stdout dành cho JSON hook output).
printf '\a' >&2

input=$(cat 2>/dev/null)

# Chống vòng lặp: nếu chính hook này đã chặn ở lượt trước (stop_hook_active=true) -> thôi, cho dừng.
case "$input" in *'"stop_hook_active":true'*) exit 0 ;; esac

repo="${CLAUDE_PROJECT_DIR:-.}"
status="$repo/docs/workspace-docs/STATUS.md"
[ -f "$status" ] || exit 0

# Có thay đổi code ở backend/ hoặc frontend/?  (tracked, đã sửa nhưng chưa commit)
code_dirty=$(git -C "$repo" status --porcelain -- backend frontend 2>/dev/null | grep -v '^??' | grep -c .)
# ... hoặc đã commit nhưng chưa push (ahead origin/main) đụng code?
# 3 chấm (origin/main...HEAD) = từ merge-base → chỉ commit local CHƯA push; tránh false-positive khi
# local đang BEHIND origin (máy khác vừa push) — 2 chấm sẽ kể nhầm file của origin.
code_ahead=$(git -C "$repo" diff --name-only origin/main...HEAD -- backend frontend 2>/dev/null | grep -c .)

today=$(date +%Y-%m-%d)
status_today=$(grep -c "$today" "$status" 2>/dev/null || echo 0)

if { [ "${code_dirty:-0}" -gt 0 ] || [ "${code_ahead:-0}" -gt 0 ]; } && [ "${status_today:-0}" -eq 0 ]; then
  reason="Co thay doi code (backend/frontend) chua duoc phan anh: docs/workspace-docs/STATUS.md khong nhac toi ngay $today. Hay cap nhat STATUS.md (dong 'Cap nhat cuoi' = $today + section viec vua lam + muc 'Viec ke tiep') de phien sau hieu va lam tiep. Neu da het viec, ghi ro 'khong con ton dong'. Cap nhat xong moi ket thuc luot."
  printf '{"decision":"block","reason":"%s"}\n' "$reason"
  exit 0
fi
exit 0