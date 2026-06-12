# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`, từ 2026-06-13): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.
> Lịch sử phiên cũ: xem git history của file này + `git log origin/main`.

> Cập nhật cuối: **2026-06-13**.

## Đang ở đâu
- **Task board**: 30 Issues mở (#1–30) — backlog từ workspace-docs + GAP-DoiThu đã chuyển hết lên remote;
  18 file plan/audit/handoff local đã xóa; `GAP-DoiThu-2026-06.md` đã xóa (verify: P1 7/8 + Đ2 phần lớn ĐÃ làm,
  phần dư → Issues #24–30).
- **Code local CHƯA COMMIT/PUSH** (Issue #1, status `READY_FOR_PUSH`): hội chẩn nội trú persist — entity
  `InpatientConsultation`(+Member) · mig **99** · service thật + fix `PrintConsultationAsync`. Build BE 0 err.
  Chưa runtime-test (cần backend+DB chạy) · chưa test tự động · schema-drift verify khi deploy.
- Working tree còn: code hội chẩn + dọn workspace-docs + xóa GAP file (tất cả chưa commit, chờ lệnh user).
- Stash backup `B2-local-wip` (B2 trùng R2 đã bỏ) — drop khi user chắc.

## Blocker
1. **HDDT** (#24, BLOCKED): chờ user cấp NCC (VNPT/Viettel/MISA) + endpoint + credential ENV.
2. **#5 ADR / #6 sơ sinh**: cần user clarify scope nghiệp vụ trước khi code.
3. Máy này thiếu gcloud → không deploy prod được (xem memory `reference_local-dev-env`).

## Việc kế tiếp
1. User duyệt → commit/push Issue #1 (hội chẩn) → `gh issue close 1`.
2. Pick issue tiếp theo từ board (`gh issue list`) — **LUÔN fetch + git log origin trước** (máy kia push nhanh).
