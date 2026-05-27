# HIS – Technical Debt Register

> **Mục đích:** Inventory công khai mọi khoản debt đã biết, có thể chấp nhận hoặc cần xử lý. Mỗi mục có (a) mô tả, (b) tại sao tồn tại, (c) chi phí giữ nguyên, (d) chi phí trả nợ, (e) khuyến nghị.
> **Phạm vi:** Backend + Frontend + Infra + Test.
> **Module liên quan:** Tất cả.
> **Last updated:** 2026-05-16

---

## Mục lục

- [1. Tóm tắt](#1-tóm-tắt)
- [2. Debt nghiêm trọng (action required)](#2-debt-nghiêm-trọng-action-required)
- [3. Debt trung bình (xử lý dần)](#3-debt-trung-bình-xử-lý-dần)
- [4. Debt nhỏ / cosmetic](#4-debt-nhỏ--cosmetic)
- [5. Đã chấp nhận có chủ ý (won't fix)](#5-đã-chấp-nhận-có-chủ-ý-wont-fix)

---

## 1. Tóm tắt

Codebase **rất sạch** so với quy mô (439 DbSets, 100+ controllers, 95
services):

- **0** `NotImplementedException` backend
- **3** TODO/FIXME backend (đều là integration HTTP wiring, có alternate mock)
- **25** TODO frontend (đa số là button placeholder v2, không phải logic missing)
- **0** dead code phát hiện trong scan TODO/FIXME
- **0** duplicated service implementation (mỗi feature đúng 1 impl)

Debt chủ yếu là:
1. **Duplication structure**: pages v1 + v2 song song (242 file)
2. **Underused abstraction**: React Query setup nhưng các page không dùng
3. **Mock cổng integration**: 5 external service mock chờ vendor mở sandbox

---

## 2. Debt nghiêm trọng (action required)

### TD-01. Duplication `pages/` ↔ `pages-v2/`

| Field | Value |
|---|---|
| **Loại** | Code duplication |
| **Khu vực** | `frontend/src/pages/` (121 file) + `frontend/src/pages-v2/` (121 file) = 242 file |
| **Lý do tồn tại** | A/B comparison giữa Antd Pro layout (v1) và Terminal ab-* design pack (v2). Khi cả 2 hoàn thành thì chưa quyết định bỏ cái nào. |
| **Chi phí giữ nguyên** | (a) Mỗi feature change cần edit 2 file. (b) Bundle size gấp đôi cho lazy chunk. (c) Onboard dev mới phải hiểu cả 2. |
| **Chi phí trả nợ** | Cao — pick 1 layout, refactor route table, di chuyển modal/workflow đặc biệt. Cần 2–3 tuần dev + 1 tuần QA. |
| **Khuyến nghị** | Đợi quyết định product (CLAUDE.md note: production demo vẫn dùng v1). Sau đó migrate. Roadmap M6. |

### TD-02. React Query underused

| Field | Value |
|---|---|
| **Loại** | Architecture inconsistency |
| **Khu vực** | 100+ page `pages/` + `pages-v2/`, 100+ API client `api/*.ts` |
| **Lý do tồn tại** | `QueryClientProvider` added trong App.tsx từ session đầu nhưng pattern `useEffect(() => fetchX(), [])` + `useState` lan rộng trước khi convention thay đổi. |
| **Chi phí giữ nguyên** | (a) Boilerplate ~10 LOC mỗi page cho loading/error/data. (b) Không có dedup khi 2 component cùng fetch. (c) Page reload mất state, không stale-while-revalidate. (d) Một số race khi navigate trước fetch xong. |
| **Chi phí trả nợ** | Trung — convert dần từng page (~1 giờ/page). Bắt đầu từ list page có pagination. Roadmap H4. |
| **Khuyến nghị** | Migrate incremental. Đừng rewrite hết — vốn chạy ổn. |

### TD-03. 25 button TODO ở v2 chưa wire workflow

| Field | Value |
|---|---|
| **Loại** | Feature gap (UI placeholder) |
| **Khu vực** | 16 file v2 page, search `message.info('TODO:` |
| **Lý do tồn tại** | v2 layout convert từ design mock → button hiển thị nhưng handler chưa wire vì handler v1 dùng Antd Modal/Form/Drawer khác primitives v2 (ab-* + DrawerShell). |
| **Chi phí giữ nguyên** | User click vào v2 → button không phản hồi. Demo v2 không workable. |
| **Chi phí trả nợ** | Thấp — mỗi button ~30 phút. Backend endpoint sẵn, modal v1 đã viết. |
| **Khuyến nghị** | Roadmap H1, làm trước khi chuyển sang TD-01. |

---

## 3. Debt trung bình (xử lý dần)

### TD-04. Backend 3 TODO HTTP integration

| File | Line | Nội dung |
|---|---|---|
| `NangCap23Services.cs` | 197 | `// TODO: HTTP POST tới donthuocquocgia.vn/api/prescription` |
| `NangCap23Services.cs` | 1644 | `// TODO: POST https://business.openapi.zalo.me/message/template` |
| `ReceptionCompleteService.cs` | 2906 | `// TODO: Implement smart card writing` |

Các marker này đại diện 3 integration đợi external vendor mở sandbox /
cung cấp credential. Mock đầy đủ chạy hoàn hảo cho demo + HSMT.
Khuyến nghị: chỉ wire khi có credential thật. Roadmap H3 + L1.

### TD-05. `Workflows.disabled/` folder

| Field | Value |
|---|---|
| **Loại** | Dead code (intentional) |
| **Khu vực** | `backend/Workflows.disabled/` (12 file `.cs`) |
| **Lý do tồn tại** | Code workflow engine cũ đã thay thế bằng service-based pattern. Giữ làm reference. |
| **Khuyến nghị** | (a) Xóa nếu chắc chắn không cần. (b) Hoặc move ra repo `_archive/` riêng. Giữ trong source repo gây nhiễu Grep. |

### TD-06. Cypress test có 3 USB Token tests skip-only

| Field | Value |
|---|---|
| **Loại** | Test gap |
| **Khu vực** | `frontend/cypress/e2e/radiology.cy.ts`, `ris-pacs-complete.cy.ts` |
| **Lý do tồn tại** | USB Token sign endpoint trigger Windows PIN dialog → block headless Chrome. |
| **Chi phí giữ nguyên** | 3 test luôn pending, không catch regression USB sign path. |
| **Chi phí trả nợ** | Trung — hoặc mock USB Token service trong test env, hoặc dùng Cypress task() đẩy job ra Windows host có token. |
| **Khuyến nghị** | Mock service trong dev environment (`appsettings.Development.json` flip flag). |

### TD-07. Bundle warning Cornerstone vendor chunk ~3 MB

| Field | Value |
|---|---|
| **Loại** | Bundle size |
| **Khu vực** | `vite.config.ts manualChunks.vendor-cornerstone`, ~830 KB gzipped |
| **Lý do tồn tại** | Cornerstone3D 3.x + tools + dicom-image-loader + dicom-parser nặng. |
| **Chi phí giữ nguyên** | Build warning > 500 KB chunk. Browser load chậm cho user mở DicomViewer lần đầu. |
| **Chi phí trả nợ** | Đã làm tốt: chunk này code-split, chỉ load khi mở `/radiology/viewer`. Vendor chunk khác ổn. |
| **Khuyến nghị** | Chấp nhận. Cornerstone3D không split nhỏ thêm được. |

### TD-08. Frontend axios pattern (không dùng React Query mutation)

| Field | Value |
|---|---|
| **Loại** | Architecture inconsistency |
| **Khu vực** | 100+ form save trong v1 + v2 page |
| **Lý do tồn tại** | `await api.savePatient(data)` + `setLoading + try/catch + message.success` rộng khắp. React Query `useMutation` chưa được dùng → mất optimistic update + auto invalidation. |
| **Chi phí giữ nguyên** | Khi save thành công cần manual reload list. Boilerplate `setLoading`. |
| **Chi phí trả nợ** | Trung — convert sau khi H4 (useQuery) ổn định. |
| **Khuyến nghị** | Migrate cùng TD-02. |

### TD-09. Schema drift 20 table không-DbSet

| Field | Value |
|---|---|
| **Loại** | DB cruft |
| **Khu vực** | Cloud SQL `HIS` database (sau restore BAK) |
| **Lý do tồn tại** | `BACKUP DATABASE` từ local Docker mang theo bảng đã deprecated nhưng chưa drop. `schema-drift` chỉ check thiếu, không check thừa. |
| **Chi phí giữ nguyên** | Cosmetic. ~vài MB storage. |
| **Chi phí trả nợ** | Thấp (audit + DROP TABLE script). Roadmap M2. |
| **Khuyến nghị** | Khi nào tiện thì làm. |

---

## 4. Debt nhỏ / cosmetic

### TD-10. ~~Root markdown files chưa organize~~ → ✅ ĐÃ XỬ LÝ 2026-05-16

Đã `git mv` 9 file MD root vào subfolder phù hợp:
- `architecture/business-logic-complete.md` (← HIS_Business_Logic_Complete.md)
- `architecture/data-flow.md` (← HIS_DataFlow_Architecture.md)
- `features/ris-pacs-2026.md` (← CHUC_NANG_RIS_PACS_2026.md)
- `features/opd-code-examples.md` (← OPD_CODE_EXAMPLES.md)
- `features/opd-visual-guide.md` (← OPD_VISUAL_GUIDE.md)
- `setup/docker-setup.md` (← DOCKER_SETUP.md)
- `roadmap/implementation-summary.md` (← IMPLEMENTATION_SUMMARY.md)
- `roadmap/nangcap-doi-thu.md` (← NangCap_DoiThu.md)
- `roadmap/nangcap-phan-tich.md` (← NangCap_PhanTich.md)

CLAUDE.md (session log) giữ nguyên path cũ — đó là log lịch sử, không rewrite.
`Screenshot 2026-01-31 210019.png` cần xử lý riêng (.gitignore đã có `/*.png` nhưng có thể đã tracked từ trước).

### TD-11. Vercel build skip-tsc fallback đã bỏ

Note (2026-04-28): `vercel.json` quay về `npm run build` (chạy `tsc -b`).
Nhưng vẫn còn 2 file (`pages-v2/Reception.tsx`, `pages/Dashboard3Cap.tsx`)
trong CLAUDE.md note "may have TS errors when full build runs" —
**đã giải quyết** trong Session 2026-04-26 (cleanup 26 TS errors). Verify
lại bằng `npm run build` clean.

**Action**: chạy `cd frontend && npm run build` → confirm 0 errors. Nếu
còn → fix (~30 phút).

### TD-12. Hardcoded constants chưa hoàn toàn ra config

`frontend/src/constants/hospital.ts` chứa `HOSPITAL_NAME`,
`HOSPITAL_ADDRESS`, `HOSPITAL_PHONE`. Production deploy không có cơ chế
overwrite per-instance (multi-tenant). Cần fetch từ backend
`SystemConfig` khi app khởi động.

**Chi phí trả nợ**: 1–2 giờ. **Khuyến nghị**: làm khi có khách hàng thứ 2.

### TD-13. CornerstoneViewer file size

`frontend/src/components/CornerstoneViewer.tsx` đang ~700 LOC sau 3 phase.
Tách helper `computeImageRect`, `useCornerstoneSetup`, `useToolGroup` ra
hook riêng để dễ test + maintain.

**Chi phí trả nợ**: 4 giờ. **Khuyến nghị**: làm trước Phase 4 mammo
nâng cao.

### TD-14. Icon.tsx ~340 LOC switch case

`frontend/src/layouts/terminal/Icon.tsx` 340 LOC switch với 25+ icon SVG
inline. CLAUDE.md note 2026-04-30 đã flag. Convert sang lookup table
`{ [name]: <SVGTemplate /> }`.

**Chi phí trả nợ**: 1 giờ. **Khuyến nghị**: optional.

### TD-15. Loose typing trong v2 list pages

Một số v2 page dùng `r: any` trong `DataTable<Row>` render fn để tolerate
backend field name variation (vd. `r.diagnosis || r.primaryDiagnosis`).
Pragmatic short-term, nhưng nên align DTO + frontend type 1-1.

**Khuyến nghị**: Khi BE consolidate DTO (M2 schema), align FE type.

---

## 5. Đã chấp nhận có chủ ý (won't fix)

### TD-WF-1. Service file size > 1000 LOC

- `InpatientCompleteService.cs` (~2500 LOC, 200+ methods)
- `ExaminationCompleteService.cs` (~2000 LOC, 180+ methods)
- `WarehouseCompleteService.cs` (~1500 LOC)
- `ReceptionCompleteService.cs` (~3000 LOC, 100+ methods)

**Lý do chấp nhận**: cohesion theo bounded context (phân hệ). Tách nhỏ
nhân tạo (`InpatientBedService`, `InpatientPrescriptionService`, ...)
sẽ tạo nhiều file rỗng kèm DTO trùng. Hiện tại 1 service = 1 controller
thuận đường review.

**Action**: KHÔNG refactor. Nếu cảm thấy quá tải, tách theo
sub-namespace (`InpatientCompleteService.Bed.cs` partial class).

### TD-WF-2. SQL migration vs EF Migration

Project dùng **handwritten SQL script** (`Data/Scripts/*.sql`) chạy bằng
`ProductionSchemaRepairRunner`, không dùng EF Core `Add-Migration`.

**Lý do**: EF migrations sinh code khó review + drift với DBA. Script SQL
idempotent dễ audit + apply manual + rerun safe.

**Action**: KHÔNG đổi. Pattern này đã chứng minh hoạt động qua 23 NangCap
phase.

### TD-WF-3. ValueConverter Guid↔string global trong HISDbContext

Hơn 31 bảng có `CreatedBy/UpdatedBy` là `uniqueidentifier` DB nhưng
`string?` C# entity → cần ValueConverter (Session 3 fix). Một số bảng
(InvoiceSummary, AuditLog) là `nvarchar` thật → phải whitelist.

**Lý do chấp nhận**: alter cột bằng migration sẽ break dữ liệu cũ.
ValueConverter pragmatic.

**Action**: KHÔNG đổi. Nếu thêm bảng mới có pattern Guid CreatedBy →
nhớ add vào whitelist.

### TD-WF-4. Mock fallback inside service (try/catch silent)

Một số service Phase 2 (`AssetManagementService`, …) có `try/catch
(SqlException)` fallback `return []` khi schema drift. Là feature, không
phải bug — production có thể có table thiếu cột.

**Action**: KHÔNG đổi pattern. Chỉ remove khi schema 100% stable.

---

## Liên kết

- **ROADMAP.md** — kế hoạch trả nợ theo ưu tiên
- **ARCHITECTURE.md** — context layering
- **PROJECT_STATUS.md** — gap feature
- `CLAUDE.md` — session log gốc
