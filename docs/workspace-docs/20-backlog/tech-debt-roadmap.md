# Tech-Debt Roadmap — HIS  → ĐÃ CHUYỂN SANG GitHub Issues

> **TỪ 2026-06-13: backlog/plan/task quản lý TRÊN GitHub Issues, KHÔNG quản lý trong workspace-docs nữa.**
> Repo: **https://github.com/minhhung19872002/HIS/issues**

File này chỉ còn là **con trỏ** (giữ để SKILL-MAP/agents/skills không gãy link). Toàn bộ nội dung roadmap
cũ đã chuyển thành Issues #1–23 (xem memory `project_github-issues-task-board`).

## Cách dùng
- **Xem việc cần làm**: `gh issue list` (hoặc mở link trên). Label: `backend` `frontend` `review` `security` `feature` `inpatient` `tech-debt`.
- **Lập plan/task mới** → tạo Issue (`gh issue create`), KHÔNG ghi vào đây.
- **Làm xong 1 task** → `gh issue close <n>` kèm comment (commit sha/PR).
- **Trước khi pick**: `git fetch` + đọc `git log origin/main` + `gh issue list` (tránh trùng máy khác).

## Tech-debt còn mở (đã thành Issue)
- T4 chuẩn hoá API envelope → **#15** · T5 gỡ EF Migrations → **#16** · T6 controller mỏng → **#17**.

> Nội dung roadmap chi tiết cũ (FLOW/F-items/#14/#16…) xem git history hoặc các Issue tương ứng.
