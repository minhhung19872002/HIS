#!/usr/bin/env bash
# SessionStart hook — inject trạng thái repo + nhắc đọc STATUS.md để mở phiên là nắm ngay.
repo="${CLAUDE_PROJECT_DIR:-.}"
branch=$(git -C "$repo" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
# wc -l (KHÔNG `grep -c . || echo 0` — cây sạch in '0\n0' gây newline thô vỡ JSON)
dirty=$(git -C "$repo" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
# Sync-gate (root-cause fix TRÙNG CODE 2 máy): fetch + behind/ahead vs upstream.
# behind>0 nghĩa là local đang làm trên cây CŨ → buộc pull + đối chiếu code trước khi pick/code.
timeout 15 git -C "$repo" fetch -q 2>/dev/null
ahead=$(git -C "$repo" rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')
behind=$(git -C "$repo" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo '?')
sync=""
if [ "$behind" != "0" ] && [ "$behind" != "?" ]; then
  sync=" >> LOCAL ĐANG BEHIND origin ${behind} commit. BẮT BUỘC: chạy git pull --ff-only + grep CODE đã sync để đối chiếu (tính năng/route/issue đã có chưa) TRƯỚC khi pick task/viết code. KHÔNG lao vào code trên cây cũ — đây là nguồn gây TRÙNG CODE khi 2 máy làm song song."
fi
# ★ RULE CỨNG quy trình SDLC của user (mọi phiên/mọi máy): TEST luôn làm CUỐI CÙNG.
rule=" ★ QUY TRÌNH BẮT BUỘC (mọi yêu cầu/phiên/máy): TEST là việc BẮT BUỘC nhưng LUÔN LÀM CUỐI CÙNG — phải hoàn thành HẾT fix/feature/tech-debt TRƯỚC; TUYỆT ĐỐI KHÔNG bắt đầu BẤT KỲ task test nào (kể cả harness/CI-gate) khi còn BẤT KỲ task fix nào OPEN. KHÔNG có ngoại lệ."
# ★ Model-tier routing (tiết kiệm túi Opus) — nhắc CỨNG ngay đầu MỖI cửa sổ chat mới. KHÔNG dùng dấu nháy kép/backtick/$ (vỡ JSON).
model=" ★ TẦNG MODEL (mọi phiên/cửa sổ chat mới/máy): đánh giá tính chất phiên NGAY yêu cầu đầu → nếu model hiện tại lệch tầng thì GỢI Ý user /model đúng tầng TRƯỚC khi làm. Q&A/boilerplate/bulk cô lập → Sonnet (việc cơ học verify-được/Q&A thuần → Haiku). Refactor/migration/DI/contract/DB/patient-safety/tiền → Opus. Việc nhẹ/bulk cô lập KHÔNG chạm guardrail có thể đẩy subagent Haiku/Sonnet hoặc agy. Nudge mềm, không auto-switch."
# ★ Cross-identify đa-cửa-sổ (chống nhầm 'Antigravity'): tác nhân local song song có thể là CỬA CLAUDE KHÁC. KHÔNG dùng nháy kép/backtick/$ (vỡ JSON).
par=" ★ ĐA CỬA SỔ SONG SONG (mọi phiên/máy): thấy file dirty NGOÀI việc mình đang làm → có thể là CỬA CHAT CLAUDE KHÁC chạy song song, KHÔNG mặc định gán Antigravity/agy. Không đụng/không stage file ngoài phạm vi mình; chỉ git add tường minh file của mình. Mô hình điều phối 4 cửa: .claude/workflow/parallel-windows.md."
msg="[HIS session] branch=${branch} · dirty=${dirty} file · unpushed=${ahead} · behind=${behind} commit.${sync}${rule}${model}${par} Đọc docs/workspace-docs/STATUS.md trước khi bắt đầu."
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg"
exit 0
