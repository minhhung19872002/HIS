# HIS Documentation

> Hospital Information System — index tài liệu chính thức.
> Quy tắc: mọi `.md` PHẢI nằm trong `docs/`. Đừng đặt MD lạc root.
> **Cấu trúc 5 nhóm** (tái cấu trúc 2026-06-19, xem `workspace-docs/10-assessment/docs-restructure-audit-2026-06-19.md`):
> `architecture/` · `requirements/` · `ui-design/` · `features/` · `workspace-docs/`.

## Đọc theo thứ tự cho dev mới

1. [`ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) — Kiến trúc tổng thể, layering, pipeline
2. [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md) — Folder layout, naming convention
3. [`MODULE_MAP.md`](./architecture/MODULE_MAP.md) — Module boundaries, dependency flow
4. [`API_FLOW.md`](./architecture/API_FLOW.md) — 12 sequence diagram (auth, billing, RIS, AI, SignalR, ...)
5. [`workspace-docs/STATUS.md`](./workspace-docs/STATUS.md) — Trạng thái phiên hiện tại (session-state)

> **Trạng thái / kế hoạch / tech-debt** = **GitHub Issues** (repo `minhhung19872002/HIS`, `gh issue list`) — task board chính từ 2026-06-13.
> Bản roadmap/status/tech-debt cũ (2026-05) đã chuyển `workspace-docs/90-archive/roadmap/` (lịch sử, không còn cập nhật).

## Tài liệu chi tiết theo nhóm

### architecture/
Kiến trúc tổng thể + cấu trúc + business logic + vận hành

- [`ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) — Kiến trúc tổng thể, layering, pipeline
- [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md) — Folder layout, naming convention
- [`MODULE_MAP.md`](./architecture/MODULE_MAP.md) — Module boundaries, dependency flow
- [`API_FLOW.md`](./architecture/API_FLOW.md) — Sequence diagram các luồng nghiệp vụ
- [`business-logic-complete.md`](./architecture/business-logic-complete.md) — Đầy đủ chức năng theo HSMT
- [`data-flow.md`](./architecture/data-flow.md) — 100 luồng nghiệp vụ chi tiết
- [`codebase-map.md`](./architecture/codebase-map.md) — Bản đồ symbol/codebase
- [`diagrams/`](./architecture/diagrams/) — Mermaid + SVG (clean-arch, FE layers, sys-overview)
- [`evidence/`](./architecture/evidence/) — Evidence viewer + manifest test (38 phân hệ)
- [`his-roadmap/`](./architecture/his-roadmap/) — Roadmap kiến trúc tương tác (HTML: module/layer/role/flow)
- [`operations/`](./architecture/operations/) — Vận hành & deploy: ACM/backup/incident/load-test + deploy GCP/Azure/docker + LIS-HL7Spy

### requirements/
Yêu cầu nghiệp vụ + Source-of-truth (HSMT, biểu mẫu, tham chiếu đối thủ)

- [`00-san-pham-cua-ta/`](./requirements/00-san-pham-cua-ta/) — Mô tả sản phẩm của ta
- [`10-tham-chieu-mqsoft/`](./requirements/10-tham-chieu-mqsoft/) — Tham chiếu HDSD MQSoft (PDF→md)
- [`20-yeu-cau-nang-cap/`](./requirements/20-yeu-cau-nang-cap/) — Yêu cầu nâng cấp (gồm `nangcap-phan-tich.md`)
- [`30-bieu-mau-nghiep-vu/`](./requirements/30-bieu-mau-nghiep-vu/) — Biểu mẫu nghiệp vụ TT 32/2023…
- [`90-phan-tich-doi-thu/`](./requirements/90-phan-tich-doi-thu/) — Phân tích đối thủ (gồm `nangcap-doi-thu.md`)
- [`ris-pacs-2026.md`](./requirements/ris-pacs-2026.md) — Yêu cầu chức năng RIS-PACS

### ui-design/
Design system (wireframe, token, component)

- [`design-system-v2/`](./ui-design/design-system-v2/) — Design pack v2 (active)
- [`design-system/`](./ui-design/design-system/) — Design pack v1 (legacy)

### features/
Bộ tài liệu phân hệ/gói nâng cấp (convention `his-doc-feature`: README + analysis + test-plan + test-guide + workflow-test + summary)

- [`nangcap23/`](./features/nangcap23/) — Gói NangCap23
- [`nangcap24/`](./features/nangcap24/) — Gói NangCap24

### workspace-docs/
Session-state + assessment + backlog + archive (làm việc trong quá trình phát triển)

- [`STATUS.md`](./workspace-docs/STATUS.md) — Session-state (hook đọc file này)
- [`luong_nghiep_vu.md`](./workspace-docs/luong_nghiep_vu.md) — Reference luồng nghiệp vụ
- [`security-secret-rotation-runbook-182.md`](./workspace-docs/security-secret-rotation-runbook-182.md) — Runbook rotate secret
- [`10-assessment/`](./workspace-docs/10-assessment/) — Audit, test-plan, rule-compliance-audit
- [`20-backlog/`](./workspace-docs/20-backlog/) — tech-debt-roadmap + plan chi tiết
- [`90-archive/`](./workspace-docs/90-archive/) — Tài liệu cũ/stale (roadmap 2026-05, work-log, ảnh scratch)

## Quy ước thêm doc mới

| Loại doc | Đặt ở | Naming |
|---|---|---|
| Kiến trúc / cấu trúc / API flow | `docs/architecture/` | `UPPER_CASE.md` (core) hoặc `kebab-case.md` |
| Vận hành / deploy / bảo mật (runbook) | `docs/architecture/operations/` | `kebab-case.md` |
| Requirement + Source-of-truth | `docs/requirements/<NN-category>/` | giữ tên gốc / `kebab-case.md` |
| UI / design system | `docs/ui-design/` | `kebab-case.md` |
| Bộ tài liệu 1 phân hệ/gói | `docs/features/<feature>/` | 6 file chuẩn (`his-doc-feature`) |
| Audit / báo cáo / plan / handoff | `docs/workspace-docs/` (`10-assessment` · `20-backlog` · `90-archive/handoffs`) | xem SKILL-MAP §0a |
| Trạng thái / roadmap / tech-debt | **GitHub Issues** (KHÔNG tạo file) | — |
| SQL/script chết | `scripts/archive/` (KHÔNG để trong `docs/`) | giữ tên gốc |

> Chỉ `docs/README.md` (index này) được phép ở `docs/` root. Mọi doc khác PHẢI nằm trong 1 trong 5 nhóm trên.
> **KHÔNG** đặt `.md` mới ở repo root, `backend/`, `frontend/`, `scripts/` (trừ README scope-specific).
> Mọi MD chính thức vào `docs/<nhóm>/` (xem `.claude/skills/his-qa-anti-pattern` #28-29).

Xem chi tiết quy ước: [`PROJECT_STRUCTURE.md`](./architecture/PROJECT_STRUCTURE.md).
