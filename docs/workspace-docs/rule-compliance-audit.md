# Báo cáo rà soát tuân thủ Coding Rules — HIS (FE + BE)

> **Mục đích:** đối chiếu toàn bộ codebase FE + BE với bộ Coding Rules đã chốt (xem
> `.claude/skills/his-fe-convention`, `his-qa-anti-pattern`, `core-*` + 17 nhóm rule FE/BE/.NET) để
> liệt kê **nợ kỹ thuật** + **độ khó áp dụng (Dễ → Khó)** + **lịch xử lý đề xuất**.
> **Phương pháp:** đo số liệu THẬT bằng grep/wc trên `frontend/src` + `backend/src` (không ước lượng).
> **Ngày:** 2026-05-29. **Người rà:** Claude (theo SKILL-MAP).
> **Lưu ý stack:** HIS = **layer-based** (KHÔNG feature-based), **Antd v6 + `_v2kit` + `ab-*`** (KHÔNG Tailwind),
> **axios + context + refetch** (KHÔNG bắt buộc TanStack Query), **SQL script tay** (KHÔNG EF migrations).
> 3 rule generic này **cố ý không áp** (lệch stack — xem `rule-compliance` mục E).

---

## A. Tổng quan

### ✅ Đã tuân thủ tốt (giữ nguyên, không cần đụng)
- **console.error → console.warn**: 0 file còn `console.error` (đã chuẩn hoá).
- **Dead code FE**: `WrapV1.tsx`, `_GenericListPage.tsx` đã xoá; dual API client đã gộp (chỉ còn `api/client.ts`).
- **NotImplementedException BE**: 0 (mọi service đã implement thật).
- **Naming / Clean Arch / Security / Audit / Performance-foundation**: khớp `his-fe-convention` + `his-qa`.
- **CSS page** đã gom về `frontend/src/styles/` (vừa refactor); 5 god-file in/EMR đã tách thành thư mục + barrel.

### 🔴 Nợ kỹ thuật lớn nhất (xếp theo tác động)
| # | Nợ | Số liệu thật | Tác động |
|---|---|---|---|
| 1 | **God component FE** (>500 dòng) | **83 file** (.tsx) — SystemAdmin 4311, OPD 3889, Radiology 3608, Inpatient 3464, Billing 2929… | Khó đọc/sửa/test; rule "page <500-1000 dòng" vi phạm nặng |
| 2 | **God service BE** (>800 dòng, trừ migration) | **~12 file** — SystemCompleteService 7129, RISCompleteService 5675, ExaminationCompleteService 4570, ExtendedWorkflowServices 3916, InpatientCompleteService 3796, BillingCompleteService 3562, ReceptionCompleteService 3418, WarehouseCompleteService 3413, LISCompleteService 2970… | 1 service ôm nhiều trách nhiệm; khó maintain |
| 3 | **Controller chạm DbContext trực tiếp** | **36 controller** | Vi phạm "controller mỏng" — business/data access lẫn vào controller |
| 4 | **Shadow-FK rủi ro** (entity có nav `User` chưa cấu hình Fluent FK) | **13 entity file** | Lớp bug đã gặp (Deposit/Payment/Prescription `…ById = Guid.Empty` → 500). Còn lại tiềm ẩn |
| 5 | **EF Migrations folder dead** | 7 file auto-gen 10k–19k dòng (`Migrations/*.Designer.cs`, `ModelSnapshot`) | HIS dùng SQL-script + ignore pending model changes → migration EF không dùng nhưng vẫn nằm trong repo, gây nhiễu/nặng |
| 6 | ~~**react-query cài nhưng gần như không dùng**~~ | `@tanstack/react-query` trong deps, chỉ **1 file** dùng (Provider) | ✅ **ĐÃ XỬ LÝ 2026-05-29** — gỡ hoàn toàn (App.tsx + deps + vite) |
| 7 | ~~**Hardcode tên BV**~~ | Thực tế **3 chỗ** là tên thật (còn lại là nhãn/chức danh) | ✅ **ĐÃ XỬ LÝ 2026-05-29** — 3 chỗ → `${HOSPITAL_NAME}` |
| 8 | **Raw SQL tới bảng không version-control** | 6 file dùng `ExecuteSqlRaw/FromSqlRaw` | ✅ **BloodOrders/BloodOrderItems ĐÃ có script `46_blood_orders.sql` (2026-05-29)**; còn lại raw-SQL khác rà sau |
| 9 | **API response chưa chuẩn hoá** | login `{success,message,data}` vs endpoint khác trả mảng thô / `{items,totalCount}` | FE phải xử lý nhiều shape (đã có `Array.isArray` workaround) |
| 10 | **NangCap24 không exception filter** | validation/not-found trả **500** thay vì 400/404 | Sai HTTP semantics; client khó phân biệt lỗi nghiệp vụ vs lỗi hệ thống |
| 11 | **Button-debt / raw HTML FE V2** | **707 `<button ab-btn>`** + raw `<select>/<table>/<input>` (18 file) chưa dùng kit | Kit `Btn`/`AbSelect`/`CrudModal` đã có → migrate dần (markup y hệt) |
| 12 | **Nuốt exception BE** | **56 chỗ** `catch { return empty }` (9 service: IvfLab 10, ReproductiveHealth, MentalHealth, Forensic…) | Che lỗi thật → khó debug (drift-guard `ExtendedWorkflowSqlGuard` là cố ý) |
| 13 | **4 page gọi `client.*` trực tiếp** | `BhxhAudit`·`MedicalRecordArchive`·`SatisfactionSurvey`·`SpecialtyEMR` bypass `api/<domain>.ts` | Khó test/tái dùng (vẫn qua client chung, không gấp) |
| 14 | **Gap backend (FE nút thiếu write-API)** | 10 module: SampleStorage/Tracking, MedicalRecordArchive, SatisfactionSurvey, InterHospitalSharing, BhxhAudit-cycle, BookingManagement, MedicalRecordPlanning, Epidemiology, InfectionControl(HAI) | Nút "chết" trên FE cho tới khi có endpoint BE |
| 15 | **`:any`/`as any` (typed props)** + **Console.WriteLine (2)** | RadiologyOps/ObservationStay/OfficeSupplyApproval/MasterData/SystemAdmin… | P2 — siết khi đụng; nhỏ |

> **Nguồn bổ sung (gộp 2026-05-29):** mục 11-15 + chi tiết Dễ/TB/Khó tương ứng được hợp nhất từ
> `v2-priority-audit.md` (audit P0/P1/P2 V2) + `can-lam-ketqua.md` (chuẩn hoá shared-component V2 — kit
> `Btn`/`OptionsSelect`/`AbSelect`/`CrudModal`/`SimpleV2Page` đã tạo, là công cụ xử lý nợ #11). 2 file nguồn đã gộp xong → xoá.

---

## B. Bảng audit chi tiết theo nhóm rule

| Nhóm rule | Trạng thái | Gap cụ thể (số liệu) | Độ khó áp dụng |
|---|---|---|---|
| **1. Architecture (layer-based)** | ✅ Đạt | Đã layer-based đúng; KHÔNG áp feature-based (lệch stack) | — |
| **2. Naming** | ✅ Đạt | — | — |
| **3. React Component — 1 responsibility, <500-1000 dòng, tách logic** | 🔴 Nợ | 83 file >500 dòng | **KHÓ** (tách dần từng page) |
| **4. State (local/context, no Redux)** | ⚠️ Một phần | react-query cài thừa (1 usage) | **DỄ** (bỏ dep / hoặc chốt dùng) |
| **5. API layer + typing + response format** | ⚠️ Một phần | response shape không nhất quán | **TB** (chuẩn hoá dần, có envelope chung) |
| **6. Hook** | ✅ Đạt | hooks/ có; cleanup/deps ok | — |
| **7. Antd (columns tách, không API trong Modal, shared wrapper, memo, no full-icon-import)** | ⚠️ Một phần | columns + business lẫn trong page god-file; `_v2kit` đã có (≈ App*) | **TB** (đi kèm tách god-file) |
| **8. .NET (controller mỏng, Service, DTO, FluentValidation)** | ⚠️ Một phần | 36 controller chạm DbContext; god-service | **TB→KHÓ** |
| **9. Database (SQL script, index, soft-delete, no SELECT*)** | ⚠️ Một phần | EF migrations dead; 1 bảng (BloodOrders) không trong VC | **TB** |
| **10. Error handling** | ⚠️ Một phần | NangCap24 trả 500 cho lỗi nghiệp vụ | **TB** (thêm exception filter) |
| **11. Security** | ✅ Đạt | JWT/permission/parameterized/audit ok; ⚠️ prod nên tắt stacktrace | **DỄ** (cờ env Production) |
| **12. Performance** | ✅ Đạt (foundation) | lazy/memo/virtualize/cache có; tối ưu khi đo | — |
| **13. Clean code** | ⚠️ Một phần | chủ yếu vướng god-file (function/file dài) | đi kèm #3/#2 |
| **14. Git** | ✅ Đạt phần lớn | conventional commit ok; branch hay push thẳng main | **DỄ** (quy ước nhánh) |
| **15. Documentation** | ✅ Đạt | docs/ + CLAUDE.md + skills | — |
| **16. AI-assisted** | ✅ Đạt | SKILL-MAP PRE-FLIGHT + self-review | — |
| **17. Core Principle (anti over-engineering)** | ✅ Đạt | — | — |

---

## C. Backlog đề xuất — xếp theo ĐỘ KHÓ (Dễ → Khó)

### 🟢 DỄ (mỗi việc < 0.5–1 ngày · ít rủi ro · làm trước để dứt điểm nhanh) — ✅ **ĐÃ XỬ LÝ 2026-05-29**
| Việc | Cách làm | Trạng thái |
|---|---|---|
| **D1. Gỡ react-query thừa** | Chỉ là `QueryClientProvider` bọc App (không component nào `useQuery`). Đã gỡ khỏi `App.tsx` (import + queryClient + unwrap provider) + `npm uninstall @tanstack/react-query` (package.json + lockfile) + xoá khỏi `vite.config.ts` manualChunks. | ✅ **DONE** · build sạch |
| **D2. Thay hardcode tên BV** | Thực tế chỉ **3 chỗ là tên thật** (HealthExchange "BV QUẬN 1" + 2 ConsultationRegister placeholder "BỆNH VIỆN") → `${HOSPITAL_NAME}` + import `constants/hospital`. Các chỗ "GIÁM ĐỐC/BÁO CÁO ... BỆNH VIỆN" là **nhãn/chức danh — KHÔNG sửa**. | ✅ **DONE** · build sạch |
| **D3. Stacktrace ở prod** | Program.cs KHÔNG có `UseDeveloperExceptionPage` unconditional; prod thực tế trả `{message}` sạch (verify qua response prod). Stacktrace chỉ ở Development (mặc định ASP.NET). | ✅ **ĐÃ COMPLIANT** · không cần sửa |
| **D4. Quy ước nhánh Git** | `feature/* fix/* hotfix/*` + bảo vệ `main`. | ⏳ Quy trình (không code) — chưa áp |
| **D5. Dọn dead CSS / file lạc** | `Inpatient.css` + `Surgery.css` (không importer) đã `git rm`. | ✅ **DONE** |
| **D6. `Console.WriteLine` BE (2 chỗ)** | Chuyển `Console.WriteLine` → `ILogger` hoặc bỏ debug. | ⏳ chưa làm |
| **D7. Siết `:any`/`as any` (typed props)** | `RadiologyOps`(9)·`ObservationStay`(8)·`OfficeSupplyApproval`(7)·`MasterData`(6)·`SystemAdmin`(5)… — siết type **khi đụng file** (P2, không làm riêng đợt). `_v2kit.tsx`(13 `any`) = ✅ kit generic cố ý. | ⏳ chưa làm (P2) |

### 🟡 TRUNG BÌNH (1–3 ngày/việc · cần test kỹ · rủi ro vừa)
| Việc | Cách làm | Rủi ro |
|---|---|---|
| **T1. Shadow-FK cho 13 entity có nav `User`** | Thêm Fluent API `.HasForeignKey(x => x.XxxByUserId)` trong `HISDbContext` + script ALTER cột shadow `…ById` thành NULL (idempotent). Test create từng entity. | TB (đụng DbContext shared) |
| ~~**T2. BloodOrders/BloodOrderItems vào version-control**~~ | ✅ **DONE 2026-05-29** — `Data/Scripts/46_blood_orders.sql` idempotent (IF NOT EXISTS, prod no-op), cột khớp raw-SQL. Verify tạo trên local + BE build 0 lỗi; prod/env mới tự tạo qua repair-runner. | ✅ DONE |
| **T3. Exception filter NangCap24** | Thêm middleware/filter map business-exception → 400/404/409 + structured body; áp cho controller NangCap24. | TB |
| **T4. Chuẩn hoá API response envelope** | Định nghĩa `ApiResponse<T> {success,data,message,errors}` + áp dần cho endpoint mới; FE đọc nhất quán. | TB (làm dần, không big-bang) |
| **T5. Gỡ EF Migrations dead** | Xác nhận startup KHÔNG dùng `Database.Migrate()` (dùng ProductionSchemaRepairRunner) → xoá `Migrations/` (giữ snapshot nếu cần) → giảm ~100k dòng repo. | TB (verify kỹ trước khi xoá) |
| **T6. Controller mỏng (36 file)** | Chuyển truy vấn `_context.*` trong controller xuống service tương ứng; controller chỉ điều phối. Làm theo nhóm module. | TB (nhiều file, làm dần) |
| **T7. Button-debt + raw HTML (FE V2)** | **707 `<button class="ab-btn">`** → `<Btn>` (markup y hệt, an toàn) + raw `<select>` → `AbSelect` + raw `<table>/<input>` (18 file) → `_v2kit`/Antd. **Kit `Btn`/`AbSelect`/`OptionsSelect`/`CrudModal` ĐÃ CÓ sẵn** (`_v2kit.tsx`). Migrate per-page, ref `TreatmentProtocol.tsx`/`FoodSafety.tsx`. | TB (khối lượng lớn, làm dần — KHÔNG mass-replace) |
| **T8. 4 page gọi `client.*` trực tiếp** | `BhxhAudit` · `MedicalRecordArchive` · `SatisfactionSurvey` · `SpecialtyEMR` → bọc thành `api/<domain>.ts` + DTO (dễ test/tái dùng). Hiện vẫn qua `client` chung (không phải raw axios) → không gấp. | TB |
| **T9. Nuốt exception BE (56 chỗ / 9 service)** | `IvfLabService`(10) · `ReproductiveHealth` · `MentalHealth` · `HL7ConnectionManager` · `DataManagementService` · `TraditionalMedicine` · `PracticeLicense` · `InterHospital` · `Forensic` — tách "drift-guard cố ý" vs "che lỗi thật" → thêm `logger.LogWarning` + để lỗi nổi đúng chỗ. (`ExtendedWorkflowSqlGuard` drift-guard = **cố ý, giữ**.) | TB |

### 🔴 KHÓ (nhiều ngày → tuần · effort lớn · làm theo đợt)
| Việc | Cách làm | Rủi ro |
|---|---|---|
| **K1. Tách god-component FE (>500 dòng)** | Áp pattern thư mục + `_shared`/sub-component + barrel/import (import consumer giữ nguyên). **✅ Đã tách 2026-05-29 (6 file):** `EMRPrintTemplates` (1940→4 nhóm) · `SpecialtyMedicalRecordPrintTemplates` (1762) · `SpecialtyEMRForms1/2` (1775/1715) · `EmrManagementTabs` (1040→6 tab) · `pages-v2/Reception.tsx` (1933→**595** main + 8 sub-file `reception/` + `shared`). **Còn lại** ~77 file (chủ yếu `pages/` v1: SystemAdmin 4311, OPD 3889, Radiology 3608, Inpatient 3464, Billing 2929…) — làm dần, build-gate sau mỗi file. | Cao (nhiều file, behavior-preserving) |
| **K2. Tách ~12 god-service BE (>2000 dòng)** | Dùng **partial class** theo nhóm chức năng (vd `SystemCompleteService.Users.cs`, `.Config.cs`) hoặc tách service con cùng interface. Giữ DI + signature. SystemCompleteService 7129 → ưu tiên. | Cao |
| **K3. PopulateDataController 4053 dòng** | Tách theo module seed (mỗi `PopulateX` ra file/partial riêng). **Ưu tiên thấp** — là seeder demo, KHÔNG phải logic nghiệp vụ chạy thật (chấp nhận được). | TB→Cao (optional) |
| **K4. Tách columns/Form/Modal khỏi page god-file (rule Antd #7)** | Đi kèm K1: columns → `*.columns.tsx`, business → hook, modal → component. | Cao (gắn K1) |
| **K5. Gap backend — FE có nút nhưng thiếu write-API** | Thêm endpoint BE rồi wire FE: `SampleStorage` · `SampleTracking` · `MedicalRecordArchive` · `SatisfactionSurvey` · `InterHospitalSharing` · `BhxhAudit` (audit-cycle) · `BookingManagement` (chỉ doctor-schedule) · `MedicalRecordPlanning` (chỉ borrow/copy) · `Epidemiology` (thiếu POST tạo) · `InfectionControl` (HAI thiếu update/investigate/close). | Cao (BE + FE mỗi module) |

---

## D. Lịch xử lý đề xuất (sprint 1 tuần)

| Đợt | Nội dung | Mục tiêu |
|---|---|---|
| **Tuần 1 — Dọn nhanh (🟢 DỄ)** | ~~D1,D2,D3,D5~~ ✅ xong + **D6** (Console.WriteLine) + **D7** (siết `any` khi đụng) + T1 (shadow-FK) + T2 (BloodOrders) | Hết nợ "dễ" + chặn lớp bug FK tái diễn |
| **Tuần 2 — Backend chất lượng (🟡)** | T3 (exception filter) + **T9** (nuốt exception 9 service) + T5 (gỡ EF migrations) + T6 đợt 1 (10 controller) | BE sạch hơn, đúng HTTP semantics |
| **Tuần 3 — API + tách layer (🟡)** | T4 (envelope, áp endpoint mới) + **T8** (4 page client.* → api/) + T6 đợt 2 | Contract nhất quán, tách layer FE |
| **Tuần 4 — Button-debt (🟡, khối lượng)** | **T7** migrate `<button>`→`<Btn>` + raw `<select>`→`AbSelect` theo từng trang (kit đã có) | Đồng nhất UI, giảm raw HTML |
| **Tháng kế — Tách god-file + gap BE (🔴)** | K1 (10 file FE >2000 dòng) + K2 (SystemComplete/RIS/Examination) + **K5** (thêm write-API 10 module) | Giảm god-file + lấp gap backend, mỗi PR 1–2 file + build-gate |

> **Nguyên tắc xuyên suốt:** behavior-preserving (`core-refactor`), build-gate sau mỗi file (FE `npm run build`, BE `dotnet build`), import consumer giữ nguyên (barrel), 1 PR nhỏ/lần để dễ review (tránh diff khổng lồ).

---

## E. KHÔNG áp (cố ý lệch — tránh nợ ngược)
- **Feature-based structure** (`features/*`): HIS layer-based; đổi = phá hàng trăm import. Giữ layer-based.
- **Tailwind / "no inline style"**: HIS dùng Antd v6 + `_v2kit` + `ab-*`; inline style trong page v2 là chấp nhận được (kèm class `ab-*`). KHÔNG thêm Tailwind.
- **Bắt buộc TanStack Query cho mọi server-state**: HIS dùng axios + context + refetch; chỉ cân nhắc nếu có nhu cầu cache/đồng bộ phức tạp thật.
- **Repository-per-aggregate nghiêm ngặt**: HIS Controller+Service + repo 1 phần + `_context` — đủ dùng, không DDD nặng (anti over-engineering).

### Cố ý chấp nhận (✅ KHÔNG phải nợ — gộp từ audit V2, đừng re-flag)
- `InspectorPortal.tsx` raw `<select>/<input>` light-theme: cổng standalone ngoài design `ab-*` terminal (`his-fe-standalone-portal`) — ép `ab-sel` sẽ vỡ giao diện.
- ~12 `<Checkbox>` đơn (CatalogsAdmin/DicomAutoSend/EmployeeProfile/Quality/ServiceRequeue…): **toggle boolean lẻ** — đúng ngữ nghĩa, KHÔNG gom vào `CheckboxField` (group).
- `BiometricEnrollment.tsx` `rpId==='localhost'` + `<Radio.Group>` có mô tả từng dòng: logic WebAuthn hợp lệ, không phải hardcode/option-list đơn thuần.
- `_v2kit.tsx` nhiều component 1 file (875 dòng) + 13 `any`: là **thư viện kit** — chấp nhận, tách theo nhóm sau nếu muốn.
- `ExtendedWorkflowSqlGuard` / drift-guard `catch`: **cố ý** bao schema-drift bảng cũ thiếu cột (ghi trong work-log) — không phải "nuốt lỗi".
- `PopulateDataController` (4053 dòng): **seeder demo** — không phải logic nghiệp vụ chạy thật.
- EF `Migrations/*.Designer.cs`/`Snapshot` (auto-gen): không phải vi phạm; xử lý ở **T5** (gỡ vì HIS dùng SQL-script).

---

## F. Rủi ro nếu KHÔNG xử lý
- God-file (83 FE + 12 BE) → onboarding chậm, sửa 1 chỗ dễ vỡ chỗ khác, khó review.
- Shadow-FK 13 entity → còn bug 500 ẩn khi tạo bản ghi mới (đã gặp 3 lần).
- EF migrations dead → repo nặng, dễ chạy nhầm `Database.Migrate()` gây drift.
- API shape loạn → FE rải `Array.isArray` workaround khắp nơi, dễ sót.
- BloodOrders không VC → deploy môi trường mới (hoặc rebuild DB) là vỡ.

*(Số liệu đo 2026-05-29; cập nhật lại sau mỗi đợt xử lý.)*
