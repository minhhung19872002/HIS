# STATUS — đang ở đâu · blocker · việc kế tiếp

> 🔗 **TASK/PLAN quản lý trên GitHub Issues** (repo `minhhung19872002/HIS`): `gh issue list`.
> File này CHỈ giữ **session-state** cho hook — KHÔNG ghi backlog/plan/lịch sử dài vào đây.

> Cập nhật cuối: **2026-06-13** (phiên Claude máy D:).

## Đang ở đâu
- **Chuỗi hội chẩn nội trú HOÀN TẤT end-to-end**:
  - **#1 ✅ CLOSED** — BE persist (mig 99, commit `b45f0d6`), deploy Cloud Run OK, prod schema-drift
    `missingCount=0`, smoke `GET /api/inpatient/consultations` 200.
  - **#2 ✅ CLOSED** — FE tab "Hội chẩn" trong Inpatient v2 (commit `16153d2`, Vercel auto-deploy):
    list/status-tabs + drawer + modal Mời hội chẩn + Hoàn thành + In biên bản. Build FE 0 err.
- **Quy ước mới đã áp**: workspace-docs push bình thường (hook never-push đã gỡ) · task board = Issues
  (31 issue, 2 closed) · DoD theo Operating Rules (DONE = pushed + closed trên remote).
- Working tree sạch; local = origin/main (`16153d2`).
- Stash backup `B2-local-wip` còn treo — drop khi user chắc.

## Blocker
1. **#24 HDDT** (BLOCKED): chờ user cấp NCC (VNPT/Viettel/MISA) + endpoint + credential ENV.
2. **#5 ADR / #6 sơ sinh**: cần user clarify scope nghiệp vụ.
3. Máy này thiếu gcloud → không thao tác Cloud Run trực tiếp (deploy qua GitHub Actions OK).

## Việc kế tiếp
1. Smoke tay tab Hội chẩn trên https://his-psi.vercel.app/v2/ipd (sau Vercel deploy ~2').
2. Pick issue tiếp theo: `gh issue list` — **LUÔN fetch + git log origin trước** (máy kia push nhanh).
   Gợi ý: #31 (re-run CRUD audit) hoặc #3 (organizer GUID, nhỏ) hoặc #4 (nutrition).
