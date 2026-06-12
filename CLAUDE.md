# HIS - Hospital Information System

## ⚠️ SKILL ROUTING — BẮT BUỘC TRƯỚC MỌI TASK CODE

> Áp dụng cho **mọi phiên, mọi máy** làm việc trên dự án này.

Khi nhận **bất kỳ yêu cầu làm tính năng / sửa code / viết test / migration / deploy / tài liệu**
(kể cả prompt ngắn KHÔNG nhắc skill), **TRƯỚC KHI bắt tay làm phải:**

1. **Đọc `.claude/SKILL-MAP.md`** — bản đồ skill 2 tầng (CORE `core-*` portable + PROJECT `his-*` riêng HIS).
2. **Chọn skill phù hợp** theo bảng định tuyến (mục 1+2): áp `core-*` trước → `his-*` sau, theo đúng thứ tự + path.
3. **Nếu KHÔNG có skill phù hợp** → theo **mục (6) FALLBACK**: ưu tiên mở rộng skill cũ; chỉ đề xuất tạo
   skill mới khi task **tái dùng nhiều lần** (hỏi user duyệt); task one-off thì làm trực tiếp, không tạo skill.
4. Mới tiến hành làm task theo skill đã chọn.

Skill nằm ở `.claude/skills/` (auto-nạp description). SKILL-MAP/PROMPT-TEMPLATES là file thường — **phải chủ
động Read** theo chỉ thị này. Bỏ qua bước routing = sai quy trình.

## Agent routing (tự chọn — LUÔN báo đang dùng gì)

Mặc định **trả lời inline** (rẻ nhất). Chỉ spawn subagent khi việc **độc lập / song song / nặng** đáng đánh đổi token;
**việc nhẹ/lặp → `agy`** (free). Đầu mỗi reply nói rõ: *inline* hay *agent nào* (+ vì sao ngắn gọn).

| Loại việc | Chọn |
|---|---|
| Q&A · giải thích · tra cứu · sửa rất nhỏ | **inline** |
| Tìm kiếm rộng nhiều file (chỉ cần kết luận) | `Explore` |
| Thêm/sửa/refactor code thật (có blast radius) | `code-change-controller` |
| Thiết kế · plan · module mới · migration lớn | `his-architecture-planner` |
| Tài liệu (README/API/handoff/ADR) | `his-docs-manager` |
| Review · audit chất lượng · regression | `his-quality-reviewer` |
| Viết/sửa test | `his-test-engineer` |
| Tech-debt lớn (god-file split, siết `:any`) | `tech-debt-manager` |
| Task lớn đa-domain (phân loại + điều phối) | `ai-project-orchestrator` |
| Nhiều mảnh độc lập | fan-out **song song** (báo chi phí token trước) |

## Project Structure
- **Backend**: ASP.NET Core Clean Architecture (HIS.Core → HIS.Application → HIS.Infrastructure → HIS.API)
- **Frontend**: React 19 + TypeScript + Ant Design v6 + Vite
- **Database**: SQL Server (Docker container `his-sqlserver`)
- **External**: Orthanc PACS (DICOM), HL7 LIS, Redis

## Key Ports
- Frontend: `http://localhost:3001` (Vite dev server)
- Backend API: `http://localhost:5106` (ASP.NET Core)
- SQL Server: `localhost:1433`
- Orthanc PACS: `localhost:8042` (Web), `localhost:4242` (DICOM)
- Redis: `localhost:6379`

## Running
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend/src/HIS.API && ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http`
- Docker (SQL + PACS + Redis): `docker compose up -d`

## Testing
- Cypress E2E: `cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome`
- Playwright: `cd frontend && npx playwright test`

## Auth
- Login: `POST /api/auth/login` with `{"username":"admin","password":"Admin@123"}`
- JWT stored in `localStorage` keys: `token`, `user`

## Antd v6 Migration Notes (completed 2026-02-24)
- `<Space direction=...>` replaced with `orientation=...` (49 occurrences in 20 files)
- `<Alert message=...>` replaced with `title=...` (50 occurrences in 18 files)
- `<Drawer width=...>` replaced with `size=...` (7 occurrences in 3 files)
- `<Timeline>` items: `children` → `content` (6 files)
- `<Timeline.Item>` converted to `items` array prop (3 files)
- `<List>` deprecated component replaced with div-based custom (6 files)
- `<Tabs tabPosition=...>` replaced with `tabPlacement=...` (1 file)
- API error logging changed from `console.error` to `console.warn` for expected failures

## Backend DI Registration
All services must be registered in `backend/src/HIS.Infrastructure/DependencyInjection.cs`.
If a new service/controller is added, register it there or you get 500 errors.

---

## Kiến trúc & quy ước (ổn định)

### Frontend 2 lớp
- **v2 (chính)** — route `/v2/*`, `TerminalLayout`, design pack `_v2kit`
  (`KpiStrip/TopTabs/StatusTabs/DataTable/DrawerShell/ModalShell` trong `frontend/src/pages-v2/_v2kit.tsx`)
  + CSS `ab-*` (`frontend/src/layouts/terminal/ab-module.css`). Helper list page: `SimpleV2Page<T>`.
  → skill `his-fe-page-v2`.
- **v1 (cũ)** — `frontend/src/pages/`, `MainLayout`, Antd v6 → skill `his-fe-antd-v6`.
- **API client** — `frontend/src/api/*.ts` qua axios `apiClient`; login trả `{data:{token}}` → skill `his-fe-api-client`.
  ⚠️ Interceptor (`client.ts`) **auto-unwrap envelope** `{success,data}` → caller nhận thẳng `data` bên trong.
  **KHÔNG check `response.success`/`.data` sau khi gọi `apiClient`** — mismatch này từng làm hỏng login prod
  (fix tolerant 2 shape trong `AuthContext.tsx`, commit `92d35a2`). Code mới: đọc payload đã-unwrap trực tiếp.
- Khi xóa nợ kỹ thuật FE: **ưu tiên `pages-v2/` trước `pages/`**.

### Backend
- Clean Architecture; DI **bắt buộc** trong `DependencyInjection.cs` (xem mục trên) → skill `his-be-module-scaffold`.
- **Migration**: `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql`, idempotent (IF NOT EXISTS),
  wildcard embedded, auto-apply lúc startup. **Lấy số kế tiếp bằng cách liệt kê thư mục** (mới nhất ~`46_*`).
  → skill `his-db-migration`.
- Lỗi `InvalidCastException Guid↔String`: bảng có `CreatedBy/UpdatedBy` kiểu uniqueidentifier cần whitelist
  ValueConverter trong `HISDbContext.cs`.

### Quản lý plan/task — GitHub Issues (từ 2026-06-13)
- **Task board chính = GitHub Issues** repo `minhhung19872002/HIS` (`gh issue list`). Lập plan/task mới →
  **tạo Issue** (`gh issue create`); làm xong + đã push → **`gh issue close <n>`** kèm commit sha. KHÔNG quản lý
  backlog trong `docs/workspace-docs/` nữa.
- **Trước khi pick task**: `git fetch origin` + đọc `git log origin/main` + `gh issue list` (nhiều máy làm
  song song — nguồn-sự-thật là git log + Issues, KHÔNG phải docs local).
- `docs/workspace-docs/` chỉ còn: `STATUS.md` (session-state cho hook) · `luong_nghiep_vu.md` (reference
  nghiệp vụ) · 2 pointer roadmap/audit. **Workspace-docs commit + push bình thường** (quy tắc never-push đã
  GỠ 2026-06-13 — hook pre-push + guard + `scripts/push-code.ps1` đã xóa).
- Cuối phiên: cập nhật `STATUS.md`. **KHÔNG ghi nhật ký vào CLAUDE.md** (giữ file này slim).

## Trạng thái Production (cập nhật khi thật sự đổi — đừng ghi nhật ký phiên vào đây)

| Hạng mục | Giá trị |
|---|---|
| Backend (Cloud Run) | service `his-api` · project `project-4d4a3f8e-d582-4536-97f` · region `asia-southeast1` |
| API URL prod | https://his-api-694913628964.asia-southeast1.run.app |
| Frontend (Vercel) | https://his-psi.vercel.app |
| Cloud SQL DB | `HIS` |
| Admin login (mọi env) | `admin` / `Admin@123` |
| Local Docker | container `his-sqlserver` · DB `HIS` · sqlcmd `/opt/mssql-tools18/bin/sqlcmd` |
| PACS prod | Orthanc @ https://168-110-52-7.nip.io (Oracle VM `168.110.52.7`) · storage Cloudflare R2 `his-pacs-dicom` |
| Jitsi prod | https://161-33-180-17.nip.io (Oracle VM `161.33.180.17`) |

### Deploy (→ skill `his-ops-deploy`)
- **Frontend Vercel**: tự deploy mỗi khi push `main`.
- **Backend Cloud Run**: **tự deploy qua GitHub Actions** (`.github/workflows/deploy-backend.yml`) khi push
  đụng `backend/**` (từ 2026-05-29, auth WIF keyless). Kiểm tra: `gh run list --workflow=deploy-backend.yml`.
  Fallback thủ công: `gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE=...`
  rồi `gcloud run services update his-api --image=...`.
- Sau migration: `GET /health/schema-drift` (Admin) → `missingCount` phải = 0.
  `ProductionSchemaRepairRunner` tự apply `Data/Scripts/*.sql` lúc startup.

### Secrets
KHÔNG hardcode secret cloud (Orthanc/R2/seed-key/DB sa) vào file tracked. Lấy từ Cloud Run env
(`gcloud run services describe his-api`). TODO bảo mật: **rotate R2 API token** → Issue #25.
