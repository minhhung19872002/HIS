# HIS Documentation

> Hospital Information System — index tài liệu chính thức.
> Quy tắc: mọi `.md` PHẢI nằm trong `docs/`. Đừng đặt MD lạc root.

## Đọc theo thứ tự cho dev mới

1. [`ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) — Kiến trúc tổng thể, layering, pipeline
2. [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md) — Folder layout, naming convention
3. [`MODULE_MAP.md`](./architecture/MODULE_MAP.md) — Module boundaries, dependency flow
4. [`API_FLOW.md`](./architecture/API_FLOW.md) — 12 sequence diagram (auth, billing, RIS, AI, SignalR, ...)
5. [`PROJECT_STATUS.md`](./roadmap/PROJECT_STATUS.md) — Trạng thái triển khai
6. [`ROADMAP.md`](./roadmap/ROADMAP.md) — Kế hoạch tiếp theo (Cao/Trung/Thấp)
7. [`TECH_DEBT.md`](./roadmap/TECH_DEBT.md) — Debt đã biết

## Tài liệu chi tiết theo nhóm

### architecture/
Kiến trúc tổng thể + cấu trúc + business logic sâu

- [`ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) — Kiến trúc tổng thể, layering, pipeline
- [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md) — Folder layout, naming convention
- [`MODULE_MAP.md`](./architecture/MODULE_MAP.md) — Module boundaries, dependency flow
- [`API_FLOW.md`](./architecture/API_FLOW.md) — Sequence diagram các luồng nghiệp vụ
- [`business-logic-complete.md`](./architecture/business-logic-complete.md) — Đầy đủ chức năng theo HSMT
- [`data-flow.md`](./architecture/data-flow.md) — 100 luồng nghiệp vụ chi tiết

### features/
Feature spec / code example

- [`ris-pacs-2026.md`](./features/ris-pacs-2026.md) — Chức năng RIS/PACS 2026
- [`opd-code-examples.md`](./features/opd-code-examples.md) — Code mẫu OPD
- [`opd-visual-guide.md`](./features/opd-visual-guide.md) — Visual guide OPD

### setup/
Setup + deploy guide

- [`docker-setup.md`](./setup/docker-setup.md) — Setup Docker local
- [`deploy-google-cloud-run-cloud-sql.md`](./setup/deploy-google-cloud-run-cloud-sql.md) — Deploy GCP
- [`deploy-azure-container-apps.md`](./setup/deploy-azure-container-apps.md) — Deploy Azure
- [`LIS-HL7Spy-Setup.md`](./setup/LIS-HL7Spy-Setup.md) — Setup máy XN qua HL7Spy

### roadmap/
Trạng thái, kế hoạch, debt, analysis

- [`PROJECT_STATUS.md`](./roadmap/PROJECT_STATUS.md) — Trạng thái triển khai theo module
- [`ROADMAP.md`](./roadmap/ROADMAP.md) — Kế hoạch tiếp theo (Cao/Trung/Thấp)
- [`TECH_DEBT.md`](./roadmap/TECH_DEBT.md) — Debt đã biết + hướng xử lý
- [`implementation-summary.md`](./roadmap/implementation-summary.md) — Tóm tắt phase đã triển khai
- [`nangcap-phan-tich.md`](./roadmap/nangcap-phan-tich.md) — Phân tích phân hệ vs HSMT
- [`nangcap-doi-thu.md`](./roadmap/nangcap-doi-thu.md) — Analysis đối thủ

### operations/
Vận hành & bảo mật (runbook)

- [`access-control-matrix.md`](./operations/access-control-matrix.md) — RBAC 8 role × 10 phân hệ
- [`backup-procedures.md`](./operations/backup-procedures.md) — Quy trình backup DB
- [`incident-response-plan.md`](./operations/incident-response-plan.md) — Quy trình ứng phó sự cố

### requirements/
Requirement gốc + Source-of-truth PDF (HSMT + biểu mẫu)

- [`requirements.md`](./requirements/requirements.md) — Requirement gốc
- [`bieu-mau-chuyen-khoa/`](./requirements/bieu-mau-chuyen-khoa/) — 32 PDF biểu mẫu TT 32/2023
- [`tai-lieu-nang-cap/`](./requirements/tai-lieu-nang-cap/) — PDF gói thầu NangCap

### dev-notes/ · workspace-docs/
Note dev ad-hoc, legacy archive, tài liệu workspace tạm

- [`legacy/`](./dev-notes/legacy/) — Script legacy đã thay thế
- [`workspace-docs/`](./workspace-docs/) — audit/checklist workspace (rule-compliance-audit, luong_nghiep_vu, …)

## Quy ước thêm doc mới

| Loại doc | Đặt ở | Naming |
|---|---|---|
| Kiến trúc / cấu trúc / API flow | `docs/architecture/` | `UPPER_CASE.md` (core) hoặc `kebab-case.md` |
| Trạng thái / roadmap / tech-debt | `docs/roadmap/` | `UPPER_CASE.md` (core) hoặc `kebab-case.md` |
| Setup / deploy guide | `docs/setup/` | `kebab-case.md` |
| Vận hành / bảo mật (runbook) | `docs/operations/` | `kebab-case.md` |
| Feature spec | `docs/features/` | `kebab-case.md` |
| Requirement + Source-of-truth PDF | `docs/requirements/[<category>/]` | giữ tên gốc |
| Note ad-hoc | `docs/dev-notes/` | `YYYY-MM-<topic>.md` |
| Legacy archive | `docs/dev-notes/legacy/` | giữ tên gốc + README |
| Audit/checklist workspace tạm | `docs/workspace-docs/` | `kebab-case.md` |

> Chỉ `docs/README.md` (index này) được phép ở `docs/` root. Mọi doc khác PHẢI nằm trong 1 thư mục con.
**KHÔNG** đặt `.md` mới ở repo root, `backend/`, `frontend/`, `scripts/` (trừ README scope-specific).
Mọi MD chính thức vào `docs/<nhóm>/` (xem `.claude/skills/his-qa-anti-pattern` #28-29).

Xem chi tiết quy ước: [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md).
