# HIS – Project Structure

> **Mục đích:** Bản đồ folder/file của repo + responsibility từng folder + naming convention.
> Sau cleanup 2026-05-16: root sạch còn ~5 entry chính (cộng 22 NangCap PDF tạm).
> **Module liên quan:** Tất cả.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Root structure](#1-root-structure)
- [2. Folder responsibilities](#2-folder-responsibilities)
- [3. Naming conventions](#3-naming-conventions)
- [4. Quy tắc thêm file mới](#4-quy-tắc-thêm-file-mới)
- [5. Known leftover (cần dọn tiếp sau)](#5-known-leftover-cần-dọn-tiếp-sau)
- [6. So sánh trước/sau cleanup](#6-so-sánh-trướcsau-cleanup)

---

## 1. Root structure

```
HIS/
├── .claude/                  Claude Code config + skills
│   ├── skills/               3 skills: api-test, backend-scaffold, sql-migration
│   └── .skill-scan-done
├── .git/                     Git internals
├── .gitignore                Git ignore (đã có /*.png, *.bak, design-system/scraps, ...)
│
├── backend/                  ASP.NET Core 9 backend (Clean Architecture)
│   ├── HIS.sln               Solution file
│   ├── cloudbuild.yaml       ⚠️  OBSOLETE — see header comment in file
│   └── src/
│       ├── HIS.Core/         Domain layer (entities, BaseEntity, IRepository)
│       ├── HIS.Application/  Use case layer (IService interfaces, DTOs)
│       ├── HIS.Infrastructure/   Impl layer (services, DbContext, EF Core, adapters)
│       │   ├── Services/         95 service impl
│       │   ├── Data/
│       │   │   ├── HISDbContext.cs       439 DbSets
│       │   │   ├── DatabaseSeeder.cs     Master data seed
│       │   │   ├── ProductionSchemaRepairRunner.cs
│       │   │   └── Scripts/              43 SQL migration (embedded)
│       │   └── DependencyInjection.cs    Composition Root
│       └── HIS.API/          Presentation layer
│           ├── Program.cs    Pipeline
│           ├── Controllers/  100+ controllers
│           ├── Middleware/   AuditLog, RequestMetrics, ProductionReadFallback
│           ├── Hubs/         NotificationHub, RisChatHub (SignalR)
│           ├── Dockerfile
│           └── wwwroot/      Static + ai-models/ + xsd/bhxh/
│
├── frontend/                 React 19 + TypeScript 5.9 + Vite 5.4
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
│   ├── playwright.config.ts          Playwright local
│   ├── playwright.prod.config.ts     Playwright production smoke
│   ├── cypress.config.ts
│   ├── vercel.json                    ✅ Active Vercel config
│   ├── src/
│   │   ├── App.tsx                    Route table (121 v1 + 121 v2)
│   │   ├── api/                       100+ axios clients
│   │   ├── contexts/                  4 contexts (Auth, Notification, Signing, Theme)
│   │   ├── components/                41 reusable components
│   │   ├── hooks/                     2 hooks
│   │   ├── layouts/
│   │   │   ├── MainLayout.tsx         v1 layout (Antd Pro)
│   │   │   └── terminal/              v2 layout (ab-* design pack)
│   │   ├── pages/                     121 v1 pages
│   │   ├── pages-v2/                  121 v2 pages + _v2kit.tsx helper
│   │   ├── services/                  Cornerstone3D + AI labeling
│   │   ├── constants/                 hospital.ts, etc.
│   │   ├── config/api.ts              env-driven API_URL
│   │   └── utils/                     formatters, helpers
│   ├── cypress/                       60+ E2E specs
│   ├── e2e/                           Playwright (local)
│   └── e2e-prod/                      Playwright (production smoke)
│
├── tools/                    C# CLI tools (build script utilities)
│   └── GenerateHash/         Sinh BCrypt password hash (chạy thủ công khi seed)
│
├── deploy/                   Oracle VM provisioning (PACS + Jitsi)
│   └── pacs/                 docker-compose, Caddy, Orthanc config, OCI Python
│
├── docker/                   Docker dev compose subassets
│   └── sqlserver/            SQL Server Docker init scripts
│
├── design-system/            ⚠️  Design pack v1 (Reports v2.html, mod-v2-kit.jsx)
│   ├── README.md
│   └── project/              Source HTML/JSX prototypes
│
├── design-system-v2/         ⚠️  Design pack v2 (đang chuyển dần qua đây)
│   └── his/
│       ├── README.md
│       └── project/
│
├── scripts/                  Ad-hoc dev/ops scripts (KHÔNG phải migration system)
│   ├── README.md             Quy ước
│   ├── archive/              89 SQL di sản CHẾT (legacy-sql 83 + migrations 6 — runner KHÔNG load)
│   ├── dev-tools/            17 PowerShell helpers (deploy, restore, test)
│   ├── ai-model/             3 Python convert PyTorch → ONNX
│   ├── legacy-py/            2 Python legacy
│   └── misc-js/              4 JS one-off
│
├── docs/                     Tài liệu chính thức — 5 nhóm (index: docs/README.md)
│   ├── README.md             Index tài liệu (authoritative)
│   │
│   ├── architecture/         Kiến trúc + business logic + vận hành
│   │   ├── ARCHITECTURE.md · PROJECT_STRUCTURE.md (file này) · MODULE_MAP.md · API_FLOW.md
│   │   ├── business-logic-complete.md · data-flow.md · codebase-map.md
│   │   ├── diagrams/         Mermaid + SVG
│   │   ├── evidence/         Evidence viewer + manifest test
│   │   ├── his-roadmap/      Roadmap kiến trúc tương tác (HTML)
│   │   └── operations/       Vận hành + deploy (ACM/backup/incident/load-test + deploy GCP/Azure/docker + LIS-HL7Spy)
│   ├── requirements/         Yêu cầu + Source-of-truth (HSMT, biểu mẫu, đối thủ)
│   │   ├── 00-san-pham-cua-ta/ · 10-tham-chieu-mqsoft/ · 20-yeu-cau-nang-cap/ (+nangcap-phan-tich.md)
│   │   ├── 30-bieu-mau-nghiep-vu/ · 90-phan-tich-doi-thu/ (+nangcap-doi-thu.md)
│   │   └── ris-pacs-2026.md
│   ├── ui-design/            Design system: design-system/ (v1) · design-system-v2/ (active)
│   ├── features/             Bộ tài liệu phân hệ/gói (his-doc-feature): nangcap23/ · nangcap24/
│   └── workspace-docs/       Session-state + assessment + backlog + archive
│       ├── STATUS.md · luong_nghiep_vu.md · security-secret-rotation-runbook-182.md
│       ├── 10-assessment/ · 20-backlog/
│       └── 90-archive/       Tài liệu cũ/stale (roadmap 2026-05, work-log, ảnh scratch)
│
├── CLAUDE.md                 Claude Code memory (BẮT BUỘC ở root)
├── cloudbuild.yaml           ✅ Active build config Cloud Run
├── docker-compose.yml        ✅ Dev compose (SQL + Redis + Orthanc local)
├── vercel.json               ⚠️  CÓ THỂ DUPLICATE — xem §5
```

---

## 2. Folder responsibilities

| Folder | Responsibility | Đừng để |
|---|---|---|
| `backend/` | ASP.NET Core source + build config | Tài liệu MD (đưa vào `docs/`) |
| `frontend/` | React source + build config + test | Mock data hardcoded (dùng API) |
| `deploy/` | Infrastructure-as-code (PACS VM, Jitsi VM) | Scripts dev (đưa vào `scripts/`) |
| `docker/` | Docker dev assets (sqlserver init, etc.) | Production compose (deploy riêng) |
| `design-system/` | Design pack v1 (legacy) | Code logic |
| `design-system-v2/` | Design pack v2 (active, đang dùng) | Code logic |
| `scripts/archive/` | SQL di sản đã apply (CHẾT, runner không load) | SQL mới (vào `Data/Scripts/NN_*.sql`) |
| `scripts/dev-tools/` | PowerShell/script dev | Source code |
| `scripts/ai-model/` | Python convert PyTorch → ONNX | (nothing else) |
| `scripts/legacy-py/` | Python legacy archive | (nothing else) |
| `scripts/misc-js/` | JS one-off (encoding, pdf parse) | (nothing else) |
| `docs/` | Tất cả tài liệu MD (5 nhóm) | Source code, script chạy |
| `docs/architecture/` | Kiến trúc/business logic + `operations/` (vận hành/deploy) | UI mockup |
| `docs/requirements/` | Yêu cầu + Source-of-truth (HSMT, biểu mẫu, đối thủ) | Doc kiến trúc |
| `docs/ui-design/` | Design system v1/v2 | Code logic |
| `docs/features/` | Bộ tài liệu phân hệ/gói (his-doc-feature) | Roadmap/status (→ GitHub Issues) |
| `docs/workspace-docs/` | Session-state, audit, backlog, archive | Tài liệu chính thức bền vững |

---

## 3. Naming conventions

| Pattern | Khi dùng | Ví dụ |
|---|---|---|
| `kebab-case` | Folder, file MD trong `docs/` | `docs/architecture/business-logic-complete.md` |
| `PascalCase.cs` | C# file (entity, service, controller) | `BillingCompleteService.cs` |
| `PascalCase.tsx` | React component | `MainLayout.tsx`, `Reception.tsx` |
| `camelCase.ts` | TS module / API client | `frontend/src/api/reception.ts` |
| `kebab-case.sql` | SQL migration trong embedded scripts | `42_nangcap22_catalogs.sql` |
| `UPPER_CASE.md` | Doc core trong `docs/architecture/` | `ARCHITECTURE.md`, `MODULE_MAP.md` |

**Lưu ý đặc biệt**:
- File `CLAUDE.md` ở root: **PHẢI** giữ tên + vị trí (Claude Code yêu cầu)
- `.gitignore` đã có `/*.png` pattern — đừng commit screenshot vào root
- `bieu_mau` đã rename thành `bieu-mau-chuyen-khoa` để consistent kebab-case

---

## 4. Quy tắc thêm file mới

### Doc mới

| Loại | Đặt ở | Ví dụ |
|---|---|---|
| Architecture deep-dive | `docs/architecture/` | `event-sourcing-pattern.md` |
| Vận hành / deploy / runbook | `docs/architecture/operations/` | `setup-fingerprint-reader.md` |
| Bộ tài liệu phân hệ/gói | `docs/features/<feature>/` | `nangcap25/` (6 file his-doc-feature) |
| Roadmap / status / tech-debt | **GitHub Issues** (KHÔNG tạo file) | `gh issue create` |
| Yêu cầu / Source-of-truth | `docs/requirements/<NN-category>/` | `20-yeu-cau-nang-cap/nangcap25.md` |
| UI / design | `docs/ui-design/` | `design-system-v2/token.md` |
| Audit / báo cáo / handoff | `docs/workspace-docs/` (`10-assessment`·`20-backlog`·`90-archive`) | `10-assessment/danh-gia-x.md` |

### Code mới

| Loại | Đặt ở |
|---|---|
| Backend entity | `backend/src/HIS.Core/Entities/<Module>.cs` |
| Backend DTO | `backend/src/HIS.Application/DTOs/<Module>/<Service>DTOs.cs` |
| Backend service interface | `backend/src/HIS.Application/Services/I<Service>Service.cs` |
| Backend service impl | `backend/src/HIS.Infrastructure/Services/<Service>Service.cs` |
| Backend controller | `backend/src/HIS.API/Controllers/<Service>Controller.cs` |
| Backend DB migration | `backend/src/HIS.Infrastructure/Data/Scripts/NN_<feature>.sql` |
| Frontend page v1 | `frontend/src/pages/<PageName>.tsx` |
| Frontend page v2 | `frontend/src/pages-v2/<PageName>.tsx` |
| Frontend API client | `frontend/src/api/<module>.ts` |
| Frontend component | `frontend/src/components/<ComponentName>.tsx` |
| Frontend hook | `frontend/src/hooks/use<HookName>.ts` |
| Frontend context | `frontend/src/contexts/<Name>Context.tsx` |

### Script ad-hoc

| Loại | Đặt ở |
|---|---|
| SQL fix / migration | `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` (idempotent, embedded, auto-apply) |
| PowerShell dev tool | `scripts/dev-tools/` |
| Python AI model | `scripts/ai-model/` |
| Production test | `frontend/e2e-prod/` (không phải `scripts/`) |
| Cypress E2E | `frontend/cypress/e2e/` |

---

## 5. Known leftover (cần dọn tiếp sau)

### 5.1 22 file NangCap*.pdf ở root

User quyết định "giữ root tạm thời, để sau" — đợi user duyệt lại. Đề xuất move
vào `docs/requirements/nangcap-hsmt/` (đã chuẩn bị folder, có README index).

### 5.2 `vercel.json` ở root vs `frontend/vercel.json`

**Phát hiện 2026-05-16**: 2 file Vercel config KHÁC nhau:
- **Root** `/vercel.json`: `installCommand: cd frontend && npm install` +
  `buildCommand: cd frontend && npm run build:vercel` (skip-tsc)
- **frontend/vercel.json**: `buildCommand: npm run build` (full tsc + vite)

CLAUDE.md 2026-04-28 nói `vercel.json reverted to npm run build` — **frontend/vercel.json là active**.
Root vercel.json có thể **OBSOLETE**.

**Hành động đề xuất**:
1. User kiểm tra Vercel project setting (Settings → General → Root Directory).
   Nếu Root Directory = `frontend` → root `/vercel.json` không được dùng, có thể xóa.
   Nếu Root Directory = `.` → root `/vercel.json` ACTIVE, ngược lại `frontend/vercel.json` lạc chỗ.
2. Đồng nhất 1 file, xóa file kia.

### 5.3 `Screenshot 2026-01-31 210019.png` + ảnh scratch

Đã archive sang `docs/workspace-docs/90-archive/images/` (cùng 3 ảnh crop mồ côi) trong đợt tái cấu trúc docs 2026-06-19.

### 5.4 `backend/cloudbuild.yaml` (obsolete)

Đã thêm comment header "OBSOLETE". User verify không dùng nữa → có thể xóa.

### 5.5 `.gitignore` update đề xuất

Sau cleanup, đề xuất thêm pattern:
```
# Test scripts ad-hoc tại root (đã move vào scripts/dev-tools/)
/test-*.ps1
/test-*.js
```

---

## 6. So sánh trước/sau cleanup

| Metric | Trước | Sau |
|---|---|---|
| File ở root (không kể folder) | **70+** | 28 (22 NangCap PDF tạm + 6 chính thức) |
| File MD lạc root | 9 | 0 ✅ |
| File ad-hoc .ps1 root | 20 | 0 ✅ |
| File ad-hoc .sql/.py/.js root | 5 | 0 ✅ |
| Screenshot root | 1 (tracked) | 1 (untracked, local-only) |
| Folder lạc root | 2 (database/, bieu_mau/) | 0 ✅ |
| Doc subfolder organization | 1 cấp (chỉ docs/*.md) | 7 cấp con đúng category ✅ |
| Cleanup tiếp theo (Cần user decide) | – | 22 NangCap PDF + 2 vercel.json |

---

## Liên kết

- **ARCHITECTURE.md** — kiến trúc tổng thể
- **MODULE_MAP.md** — module boundaries + dependencies
- [`docs/README.md`](../README.md) — index tài liệu (authoritative, 5 nhóm)
- Trạng thái / roadmap / tech-debt → **GitHub Issues** (`gh issue list`); bản cũ 2026-05 ở `workspace-docs/90-archive/roadmap/`
- `scripts/README.md` + `scripts/archive/README.md` — quy ước scripts/ + SQL di sản
- `docs/requirements/30-bieu-mau-nghiep-vu/` — biểu mẫu nghiệp vụ
