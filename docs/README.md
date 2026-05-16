# HIS Documentation

> Hospital Information System — index tài liệu chính thức.
> Quy tắc: mọi `.md` PHẢI nằm trong `docs/`. Đừng đặt MD lạc root.

## Đọc theo thứ tự cho dev mới

1. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Kiến trúc tổng thể, layering, pipeline
2. [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) — Folder layout, naming convention
3. [`MODULE_MAP.md`](./MODULE_MAP.md) — Module boundaries, dependency flow
4. [`API_FLOW.md`](./API_FLOW.md) — 12 sequence diagram (auth, billing, RIS, AI, SignalR, ...)
5. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — Trạng thái triển khai
6. [`ROADMAP.md`](./ROADMAP.md) — Kế hoạch tiếp theo (Cao/Trung/Thấp)
7. [`TECH_DEBT.md`](./TECH_DEBT.md) — Debt đã biết

## Tài liệu chi tiết theo nhóm

### architecture/
Tài liệu kiến trúc + business logic sâu

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

### roadmap/
Roadmap, analysis, planning

- [`implementation-summary.md`](./roadmap/implementation-summary.md) — Tóm tắt phase đã triển khai
- [`nangcap-phan-tich.md`](./roadmap/nangcap-phan-tich.md) — Phân tích phân hệ vs HSMT
- [`nangcap-doi-thu.md`](./roadmap/nangcap-doi-thu.md) — Analysis đối thủ

### requirements/
Source-of-truth PDF (HSMT + biểu mẫu)

- [`bieu-mau-chuyen-khoa/`](./requirements/bieu-mau-chuyen-khoa/) — 32 PDF biểu mẫu TT 32/2023
- (sẽ thêm `nangcap-hsmt/` khi user duyệt move 22 NangCap*.pdf)

### dev-notes/
Note dev ad-hoc + legacy archive

- [`legacy/`](./dev-notes/legacy/) — Script legacy đã thay thế

## Tài liệu khác

- [`access-control-matrix.md`](./access-control-matrix.md) — RBAC 8 role × 10 phân hệ
- [`backup-procedures.md`](./backup-procedures.md) — Quy trình backup DB
- [`incident-response-plan.md`](./incident-response-plan.md) — Quy trình ứng phó sự cố
- [`LIS-HL7Spy-Setup.md`](./LIS-HL7Spy-Setup.md) — Setup máy XN qua HL7Spy
- [`requirements.md`](./requirements.md) — Requirement gốc

## Quy ước thêm doc mới

| Loại doc | Đặt ở | Naming |
|---|---|---|
| Core (audit by all dev) | `docs/` | `UPPER_CASE.md` |
| Architecture deep-dive | `docs/architecture/` | `kebab-case.md` |
| Feature spec | `docs/features/` | `kebab-case.md` |
| Setup guide | `docs/setup/` | `kebab-case.md` |
| Roadmap | `docs/roadmap/` | `kebab-case.md` |
| Source-of-truth PDF | `docs/requirements/<category>/` | giữ tên gốc |
| Note ad-hoc | `docs/dev-notes/` | `YYYY-MM-<topic>.md` |
| Legacy archive | `docs/dev-notes/legacy/` | giữ tên gốc + README |

**KHÔNG** đặt `.md` mới ở root, `backend/`, `frontend/`, `scripts/` (trừ
README scope-specific). Mọi MD chính thức vào `docs/`.

Xem chi tiết quy ước: [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md).
