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
│   ├── legacy-sql/           83 SQL legacy (read-only archive)
│   ├── dev-tools/            17 PowerShell helpers (deploy, restore, test)
│   ├── ai-model/             3 Python convert PyTorch → ONNX
│   ├── legacy-py/            2 Python legacy
│   └── misc-js/              4 JS one-off
│
├── docs/                     Tài liệu chính thức (5 doc core + subfolders)
│   ├── README.md             ← TODO tạo
│   ├── ARCHITECTURE.md       Kiến trúc tổng thể
│   ├── PROJECT_STATUS.md     Trạng thái triển khai
│   ├── PROJECT_STRUCTURE.md  ← file này
│   ├── MODULE_MAP.md         Module boundaries + dependencies
│   ├── ROADMAP.md
│   ├── TECH_DEBT.md
│   ├── API_FLOW.md
│   ├── access-control-matrix.md
│   ├── backup-procedures.md
│   ├── incident-response-plan.md
│   ├── LIS-HL7Spy-Setup.md
│   ├── requirements.md
│   │
│   ├── architecture/         Tài liệu kiến trúc sâu
│   │   ├── business-logic-complete.md   (← HIS_Business_Logic_Complete.md)
│   │   └── data-flow.md                 (← HIS_DataFlow_Architecture.md)
│   ├── features/             Tài liệu feature specific
│   │   ├── ris-pacs-2026.md             (← CHUC_NANG_RIS_PACS_2026.md)
│   │   ├── opd-code-examples.md         (← OPD_CODE_EXAMPLES.md)
│   │   └── opd-visual-guide.md          (← OPD_VISUAL_GUIDE.md)
│   ├── setup/                Tài liệu setup + deploy
│   │   ├── docker-setup.md              (← DOCKER_SETUP.md)
│   │   ├── deploy-google-cloud-run-cloud-sql.md
│   │   └── deploy-azure-container-apps.md
│   ├── roadmap/              Roadmap + analysis
│   │   ├── implementation-summary.md    (← IMPLEMENTATION_SUMMARY.md)
│   │   ├── nangcap-doi-thu.md           (← NangCap_DoiThu.md)
│   │   └── nangcap-phan-tich.md         (← NangCap_PhanTich.md)
│   ├── requirements/         Source-of-truth HSMT + biểu mẫu
│   │   └── bieu-mau-chuyen-khoa/        32 PDF + README index
│   ├── dev-notes/            Note dev + legacy archive
│   │   └── legacy/                      3 SQL legacy + README
│   ├── api/                  (cho OpenAPI export tương lai)
│   └── database/             (cho ERD/schema doc tương lai)
│
├── CLAUDE.md                 Claude Code memory (BẮT BUỘC ở root)
├── cloudbuild.yaml           ✅ Active build config Cloud Run
├── docker-compose.yml        ✅ Dev compose (SQL + Redis + Orthanc local)
├── vercel.json               ⚠️  CÓ THỂ DUPLICATE — xem §5
└── NangCap*.pdf (22 file)    Tạm thời ở root, sẽ move sau (user decide)
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
| `scripts/legacy-sql/` | SQL fix đã apply (archive) | SQL mới (vào backend migration) |
| `scripts/dev-tools/` | PowerShell/script dev | Source code |
| `scripts/ai-model/` | Python convert PyTorch → ONNX | (nothing else) |
| `scripts/legacy-py/` | Python legacy archive | (nothing else) |
| `scripts/misc-js/` | JS one-off (encoding, pdf parse) | (nothing else) |
| `docs/` | Tất cả tài liệu MD | Source code, script chạy |
| `docs/architecture/` | Tài liệu kiến trúc/business logic | UI mockup |
| `docs/features/` | Tài liệu chi tiết feature | Roadmap chung |
| `docs/setup/` | Setup + deploy guide | Architecture doc |
| `docs/roadmap/` | Roadmap, analysis, planning | Tài liệu kiến trúc |
| `docs/requirements/` | Source-of-truth PDF (HSMT, biểu mẫu) | Doc derived (đưa vào `features/`) |
| `docs/dev-notes/` | Note dev ad-hoc + archive legacy | Tài liệu chính thức |

---

## 3. Naming conventions

| Pattern | Khi dùng | Ví dụ |
|---|---|---|
| `kebab-case` | Folder, file MD trong `docs/` | `docs/architecture/business-logic-complete.md` |
| `PascalCase.cs` | C# file (entity, service, controller) | `BillingCompleteService.cs` |
| `PascalCase.tsx` | React component | `MainLayout.tsx`, `Reception.tsx` |
| `camelCase.ts` | TS module / API client | `frontend/src/api/reception.ts` |
| `kebab-case.sql` | SQL migration trong embedded scripts | `42_nangcap22_catalogs.sql` |
| `UPPER_CASE.md` | Doc core ở root `docs/` | `ARCHITECTURE.md`, `ROADMAP.md` |

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
| Feature spec | `docs/features/` | `voice-dictation.md` |
| Setup guide | `docs/setup/` | `setup-fingerprint-reader.md` |
| Roadmap/planning | `docs/roadmap/` | `q3-2026-plan.md` |
| Source-of-truth PDF | `docs/requirements/` | `nangcap-hsmt/nangcap24.pdf` |
| Ad-hoc dev note | `docs/dev-notes/` | `2026-06-debug-session.md` |
| Core (audit by all dev) | `docs/` root | (chỉ 5 file ARCHITECTURE/PROJECT_STATUS/ROADMAP/TECH_DEBT/API_FLOW + 2 thêm) |

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
| SQL fix one-off | `scripts/legacy-sql/` (sau khi apply) |
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

### 5.3 `Screenshot 2026-01-31 210019.png` (untracked nhưng file local còn)

Đã `git rm --cached`. File còn ở local cho user quyết định xóa hoặc move.

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
- **PROJECT_STATUS.md** — trạng thái triển khai
- **TECH_DEBT.md** — TD-10 đã đóng sau cleanup này
- `scripts/README.md` — quy ước scripts/
- `docs/requirements/bieu-mau-chuyen-khoa/README.md` — index 32 PDF biểu mẫu
- `docs/dev-notes/legacy/README.md` — index file legacy
