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
- Khi xóa nợ kỹ thuật FE: **ưu tiên `pages-v2/` trước `pages/`**.

### Backend
- Clean Architecture; DI **bắt buộc** trong `DependencyInjection.cs` (xem mục trên) → skill `his-be-module-scaffold`.
- **Migration**: `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql`, idempotent (IF NOT EXISTS),
  wildcard embedded, auto-apply lúc startup. **Lấy số kế tiếp bằng cách liệt kê thư mục** (mới nhất ~`46_*`).
  → skill `his-db-migration`.
- Lỗi `InvalidCastException Guid↔String`: bảng có `CreatedBy/UpdatedBy` kiểu uniqueidentifier cần whitelist
  ValueConverter trong `HISDbContext.cs`.

### Tài liệu làm việc — thư mục `docs/workspace-docs/` (KHÔNG auto-nạp — đọc khi cần)
- **Cửa vào**: `docs/workspace-docs/README.md` (bản đồ thư mục) + `STATUS.md` (đang ở đâu · blocker · việc kế tiếp).
- Cấu trúc: `00-business/` nghiệp vụ · `10-assessment/` đánh giá v2 + `rule-compliance-audit.md` ·
  `20-backlog/tech-debt-roadmap.md` (+`items/` plan chi tiết) · `30-conventions/` quy ước · `90-archive/` lịch sử.
- `90-archive/work-log-archive-2026-H1.md` — **24 work log lịch sử (02→05/2026)**; Grep theo keyword
  (`NangCap24`, `Cloud SQL`, `VietQR`…) khi cần "vì sao / đã làm gì / pitfall cũ". (local-only)
- Cuối phiên: cập nhật `STATUS.md`; handoff chi tiết → `90-archive/handoffs/session-YYYY-MM-DD-handoff.md`.
  **KHÔNG ghi nhật ký vào CLAUDE.md** (giữ file này slim).

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
KHÔNG hardcode secret cloud (Orthanc/R2/seed-key/DB sa) vào file tracked. Lấy từ Cloud Run env hoặc
`90-archive/work-log-archive-2026-H1.md` (local). TODO bảo mật cũ còn treo: **rotate R2 API token**.
