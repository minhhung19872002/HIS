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
| 10 | ~~**NangCap24 không exception filter**~~ | validation/not-found từng trả **500** | ✅ **ĐÃ XỬ LÝ 2026-05-29 (T3)** — filter generic `DomainExceptionFilter` + NangCap24 service ném typed-exception → 404/400 |
| 11 | **Button-debt / raw HTML FE V2** | **707 `<button ab-btn>`** + raw `<select>/<table>/<input>` (18 file) chưa dùng kit | Kit `Btn`/`AbSelect`/`CrudModal` đã có → migrate dần (markup y hệt) |
| 12 | ~~**Nuốt exception BE**~~ | **56 chỗ** `catch { return empty }` (8 service) | ✅ **ĐÃ XỬ LÝ 2026-05-29 (T9)** — thêm `_logger.LogWarning(ex,…)` (giữ fallback) cho IvfLab(25)/Env(5)/Mental(5)/Reproductive(5)/Forensic(4)/PracticeLicense(4)/InterHospital(4)/Traditional(4). DataManagement: 0 swallow. drift-guard `ExtendedWorkflowSqlGuard` giữ cố ý |
| 13 | ~~**4 page gọi `client.*` trực tiếp**~~ | `BhxhAudit`·`MedicalRecordArchive`·`SatisfactionSurvey`·`SpecialtyEMR` | ✅ **ĐÃ XỬ LÝ 2026-05-29 (T8)** — tạo `api/{bhxhAudit,medicalRecordArchive,satisfactionSurvey,specialtyEmr}.ts`; 4 page hết import `client` |
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
| **D6. `Console.WriteLine` BE (2 chỗ)** | Inject `ILogger<T>` vào `RISCompleteService` + `RISCompleteController` → `Console.WriteLine` thành `_logger.LogWarning`. Còn **0** Console.WriteLine; BE build 0 lỗi. | ✅ **DONE 2026-05-29** |
| **D7. Siết `:any`/`as any` (typed props)** | `RadiologyOps`(9)·`ObservationStay`(8)·`OfficeSupplyApproval`(7)·`MasterData`(6)·`SystemAdmin`(5)… — siết type **khi đụng file** (P2). `_v2kit.tsx`(13 `any`) = ✅ kit generic cố ý. | ⏳ làm dần khi sửa file (P2, không phải task lẻ) |

> **🟢 Cụm DỄ: HOÀN TẤT phần code** (D1·D2·D5·D6 ✅ · D3 đã-compliant). Còn **D4** (quy ước nhánh Git) = **quy trình team adopt** (không code — đã ghi ở mục C/D); **D7** = siết `any` dần khi đụng file (không phải đợt riêng).

### 🟡 TRUNG BÌNH (1–3 ngày/việc · cần test kỹ · rủi ro vừa)

> **Tiến độ (2026-05-30 — đã push `origin/main`):** ✅ **T2** · ✅ **T3** · ✅ **T7** · ✅ **T8** · ✅ **T9**. 🟬 **T1 partial**. ⏳ T4·T5·T6 chưa làm.
> **Phiên 2026-05-30 (gom + push):** sau khi `git reset --mixed origin/main` để review, gom lại thành **4 commit** push `origin/main`:
> `dfad65b` (BE: DomainExceptionFilter + ILogger swallow — T3+T9) · `04480f1` (FE: 401 redirect fix) · `2fd52c6` (FE: T7 Btn migration 88 page + T8 tách 4 api client) · `4d8de44` (docs).
> GitHub Actions `deploy-backend.yml` (WIF, từ commit `1fbaf86` 2026-05-29) tự build Cloud Build + rollout Cloud Run khi commit chạm `backend/**` → T3/T9 đang chạy CI auto-deploy.

#### 📒 Sổ commit (file nào trong commit nào)

> **2026-05-30 (sau review):** sau reset + review, đã **gom lại thành 4 commit thật** push `origin/main`:
> - `dfad65b` (BE: DomainExceptionFilter rename + ILogger swallow 10 service — gộp T3+T9, kèm null-safe ReceptionCompleteService)
> - `04480f1` (FE: 401 redirect /login khi token hết hạn)
> - `2fd52c6` (FE: T7 Btn migration 88 page + T8 tách 4 api client — bhxhAudit/medicalRecordArchive/satisfactionSurvey/specialtyEmr)
> - `4d8de44` (docs: 2 file đánh giá v2 + bản này)
>
> Bảng dưới giữ để tra **file nào sửa cho mục gì**; hash *(`a65bd90` / `d95d455` / `5316ce6` / `0309e10` / `5f9a3e4` / `54fc4cd` / `534cf9c` / `26806b9` / `168f1fa` / `5768d2d` / `9452fcc` / `7cca925` / `8814b66` / `513a5b4` / `cf8c7ba`)* trên bảng **chỉ còn ở reflog** — KHÔNG phải hash thật trên `main`. Mọi dòng T7 trước ghi "chưa commit" → nay đều nằm trong commit gộp `2fd52c6`.

| Commit | Nội dung | File |
|---|---|---|
| `66c5562` | fix bug "Không có phòng khám" | `frontend/src/api/client.ts` · `backend/.../ReceptionCompleteService.cs` |
| `a65bd90` | **T3** exception filter | `Filters/DomainExceptionFilter.cs` (＋) · `Filters/Nangcap23ExceptionFilter.cs` (－) · `NangCap23Controllers.cs` · `NangCap24Controllers.cs` · `NangCap24Services.cs` · `Program.cs` |
| `d95d455` | **T9** log nuốt exception | 8 service: `IvfLab`·`Environmental`·`Mental`·`Reproductive`·`Forensic`·`PracticeLicense`·`InterHospital`·`Traditional`HealthService |
| `5316ce6` | **T8** tách api layer | `api/{bhxhAudit,medicalRecordArchive,satisfactionSurvey,specialtyEmr}.ts` (＋) · 4 page `BhxhAudit`·`MedicalRecordArchive`·`SatisfactionSurvey`·`SpecialtyEMR` |
| `0309e10` | **T7** button (4 page) | `Microbiology`·`LabQC`·`PharmacyApproval`·`Reception`.tsx |
| `5f9a3e4` | docs ⚠️(commit trước chỉ thị no-docs) | 2 báo cáo đánh giá v2 + `rule-compliance-audit.md` |
| `54fc4cd` | **T7** BillingEditor ⚠️(kèm doc, trước chỉ thị) | `BillingEditor.tsx` + `rule-compliance-audit.md` |
| `534cf9c` | **T7** PrescriptionEditor (code-only) | `PrescriptionEditor.tsx` |
| `26806b9` | **T7** EmrEditor (code-only) | `EmrEditor.tsx` |
| `168f1fa` | **T7** VideoConsultation (code-only) | `VideoConsultation.tsx` |
| `5768d2d` | **T7** NonDicomCapture (code-only) | `NonDicomCapture.tsx` (⚠️ 1 Btn trong `<Upload>` — test click upload khi chạy) |
| `9452fcc` | **T7** RisAdmin (code-only) | `RisAdmin.tsx` (18 button, 8 sub-tab) |
| `7cca925` | **T7** ObservationStay (code-only) | `ObservationStay.tsx` |
| `8814b66` | **T7** Laboratory (code-only) | `Laboratory.tsx` |
| `513a5b4` | **T7** Inpatient (code-only) | `Inpatient.tsx` |
| `cf8c7ba` | **T7** Radiology (code-only) | `Radiology.tsx` |
| `2fd52c6` | **T7** SpecialtyEMR | `SpecialtyEMR.tsx` |
| `2fd52c6` | **T7** SampleReceive | `SampleReceive.tsx` |
| `2fd52c6` | **T7** DigitalSignature | `DigitalSignature.tsx` |
| `2fd52c6` | **T7** CentralSigning | `CentralSigning.tsx` |
| `2fd52c6` | **T7** DeAn06Liaison | `DeAn06Liaison.tsx` |
| `2fd52c6` | **T7** SystemAdmin | `SystemAdmin.tsx` (12 button) |
| `2fd52c6` | **T7** Help | `Help.tsx` (11 button) |
| `2fd52c6` | **T7** Telemedicine · OfficeSupplyApproval | `Telemedicine.tsx` · `OfficeSupplyApproval.tsx` (8+8) |
| `2fd52c6` | **T7** MethadoneTreatment · IvfLab | `MethadoneTreatment.tsx` · `IvfLab.tsx` (8+8) |
| `2fd52c6` | **T7** FollowUp · Epidemiology | `FollowUp.tsx` · `Epidemiology.tsx` (8+8) |
| `2fd52c6` | **T7** CultureCollection · CatalogsAdmin | `CultureCollection.tsx` · `CatalogsAdmin.tsx` (8+8) |
| `2fd52c6` | **T7** SatisfactionSurvey · SampleStorage | `SatisfactionSurvey.tsx` · `SampleStorage.tsx` (7+7) |
| `2fd52c6` | **T7** ReagentManagement · PracticeLicense | `ReagentManagement.tsx` · `PracticeLicense.tsx` (7+7) |
| `2fd52c6` | **T7** MedicalRecordArchive · HealthExchange | `MedicalRecordArchive.tsx` · `HealthExchange.tsx` (7+7) |
| `2fd52c6` | **T7** HealthEducation · Finance | `HealthEducation.tsx` · `Finance.tsx` (7+7) |
| `2fd52c6` | **T7** EnvironmentalHealth · DispensingCounter | `EnvironmentalHealth.tsx` · `DispensingCounter.tsx` (7+7) |
| `2fd52c6` | **T7** Consultation · BookingManagement | `Consultation.tsx` · `BookingManagement.tsx` (7+7) |
| `2fd52c6` | **T7** BhxhAudit · TraumaRegistry | `BhxhAudit.tsx` · `TraumaRegistry.tsx` (7+6) |
| `2fd52c6` | **T7** TraditionalMedicine · SampleTracking | `TraditionalMedicine.tsx` · `SampleTracking.tsx` (6+6) |
| `2fd52c6` | **T7** Rehabilitation · RadiologyOps | `Rehabilitation.tsx` · `RadiologyOps.tsx` (6+6) |
| `2fd52c6` | **T7** PopulationHealth · PaymentTransactions | `PopulationHealth.tsx` · `PaymentTransactions.tsx` (6+6) |
| `2fd52c6` | **T7** InterHospitalSharing · InfectionControl | `InterHospitalSharing.tsx` · `InfectionControl.tsx` (6+6) |
| `2fd52c6` | **T7** HealthCheckup · ClinicalGuidance | `HealthCheckup.tsx` · `ClinicalGuidance.tsx` (6+6) |
| `2fd52c6` | **T7** ZaloNotifications · ServiceRequeue | `ZaloNotifications.tsx` · `ServiceRequeue.tsx` (5+5; Zalo giữ `<TermIcon>` trong children Btn vì icon-set khác kit) |
| `2fd52c6` | **T7** Quality · PharmacyCatalogs | `Quality.tsx` · `PharmacyCatalogs.tsx` (5+5; Quality giữ `<TermIcon>` trong children Btn; Pharmacy 1 `<Btn size="sm">` cho nút "Thêm thành viên" trong tab kiểm nhập) |
| `2fd52c6` | **T7** OpdEditor · MedicalRecordPlanning | `OpdEditor.tsx` · `MedicalRecordPlanning.tsx` (5+5; OpdEditor giữ `<TermIcon>` trong children + 1 `<Btn size="sm" style={{width:'100%'}}>` cho nút "Lưu giấy nghỉ") |
| `2fd52c6` | **T7** Insurance · EmployeeProfile | `Insurance.tsx` · `EmployeeProfile.tsx` (5+5; Insurance giữ `<TermIcon>` trong children Btn) |
| `2fd52c6` | **T7** BloodBank · BhxhConfig | `BloodBank.tsx` · `BhxhConfig.tsx` (5+5; BloodBank giữ `<TermIcon>` trong children Btn) |
| `2fd52c6` | **T7** ReportCatalogs · Prescription | `ReportCatalogs.tsx` · `Prescription.tsx` (4+4; Prescription giữ `<TermIcon>` trong children Btn) |
| `2fd52c6` | **T7** ParaclinicalCatalogs · InpatientDispensing | `ParaclinicalCatalogs.tsx` · `InpatientDispensing.tsx` (4+5; survey miss 1 nút "Xuất" trong nhóm BN — đã verify clean cuối) |
| `2fd52c6` | **T7** FinanceCatalogs · Dashboard3Cap | `FinanceCatalogs.tsx` · `Dashboard3Cap.tsx` (4+4; Dashboard3Cap có 1 button multi-line arrow fn — Btn nhận `onClick` đầy đủ) |
| `2fd52c6` | **T7** ConsultationRegister · ClinicalCatalogs | `ConsultationRegister.tsx` · `ClinicalCatalogs.tsx` (4+4) |
| `2fd52c6` | **T7** WorkloadReport · StockReport | `WorkloadReport.tsx` · `StockReport.tsx` (3+3) |
| `2fd52c6` | **T7** RisDispatcher · RisCatalogAdmin | `RisDispatcher.tsx` · `RisCatalogAdmin.tsx` (3+3) |
| `2fd52c6` | **T7** ReceiptBookAdmin · PaymentReports | `ReceiptBookAdmin.tsx` · `PaymentReports.tsx` (3+3) |
| `2fd52c6` | **T7** OPD · NationalGateways | `OPD.tsx` · `NationalGateways.tsx` (3+3; cả 2 giữ `<TermIcon>` trong children Btn) |
| `2fd52c6` | **T7** MasterData · LisCatalogAdmin | `MasterData.tsx` · `LisCatalogAdmin.tsx` (4+3; MasterData modal footer dồn 2 button trong 1 dòng — grep -c đếm dòng nên hiển thị 3 nhưng thực 4) |
| `2fd52c6` | **T7** FunctionalDiagnostics · EMR | `FunctionalDiagnostics.tsx` · `EMR.tsx` (3+3; cả 2 giữ `<TermIcon>` trong children Btn — FunctionalDiagnostics có 2 button conditional theo status) |
| `2fd52c6` | **T7** Billing · Pharmacy | `Billing.tsx` · `Pharmacy.tsx` (3+2; cả 2 giữ `<TermIcon>` trong children Btn) |
| `2fd52c6` | **T7** ClinicalPharmacyCheck · SigningWorkflow · QualityDashboardLive | `ClinicalPharmacyCheck.tsx`(2) · `SigningWorkflow.tsx`(1) · `QualityDashboardLive.tsx`(1; giữ `<TermIcon>` children). **BankPayments KHÔNG convert** — 2 `<Button>` là Antd component có `loading` spinner riêng, ab-btn class chỉ cosmetic — chuyển sang kit `<Btn>` sẽ mất behavior loading |
>
> **Lưu ý chiến lược T5/T6 (cho phiên sau):** T5 (gỡ EF migrations) + T6 (controller→service) có **failure-mode runtime mà `build` KHÔNG bắt** (T5: seeder còn `MigrateAsync` → đổi startup; T6: quên DI → 500, hoặc đổi behavior query). Máy hiện **không runtime-test/deploy được** → 2 mục này nên làm ở phiên **có deploy + smoke-test prod**, không nên làm blind.

| Việc | Cách làm | Trạng thái |
|---|---|---|
| **T1. Shadow-FK cho 13 entity có nav `User`** | Thêm Fluent API `.HasForeignKey(x => x.XxxByUserId)` trong `HISDbContext` + script ALTER cột shadow `…ById` thành NULL. | 🟬 **PARTIAL** — Deposit/Payment (set shadow `ReceivedById`=user) + Prescription (`DoctorId ?? userId`) đã fix phiên này (deploy chung 5 fix BE); blanket 13 entity (Fluent + ALTER) chưa — blast-radius cao, làm đợt riêng evidence-driven |
| ~~**T2. BloodOrders/BloodOrderItems vào version-control**~~ | ✅ **DONE 2026-05-29** — `Data/Scripts/46_blood_orders.sql` idempotent (IF NOT EXISTS, prod no-op), cột khớp raw-SQL. Verify tạo trên local + BE build 0 lỗi; prod/env mới tự tạo qua repair-runner. | ✅ DONE |
| ~~**T3. Exception filter NangCap24**~~ | ✅ **DONE 2026-05-29** — đổi tên `Nangcap23ExceptionFilter` → **`DomainExceptionFilter`** (generic, dùng chung; cập nhật 7 ref NangCap23 + Program.cs); NangCap24Services đổi 10 `throw new Exception` → typed (`KeyNotFoundException`→404 / `InvalidOperationException`→400); áp `[TypeFilter(typeof(DomainExceptionFilter))]` cho 7 controller NangCap24. BE build 0 lỗi. | ✅ DONE |
| **T4. Chuẩn hoá API response envelope** | Định nghĩa `ApiResponse<T> {success,data,message,errors}` + áp dần cho endpoint mới; FE đọc nhất quán. | TB (làm dần, không big-bang) |
| **T5. Gỡ EF Migrations dead** | Xác nhận startup KHÔNG dùng `Database.Migrate()` (dùng ProductionSchemaRepairRunner) → xoá `Migrations/` (giữ snapshot nếu cần) → giảm ~100k dòng repo. | TB (verify kỹ trước khi xoá) |
| **T6. Controller mỏng (36 file)** | Chuyển truy vấn `_context.*` trong controller xuống service tương ứng; controller chỉ điều phối. Làm theo nhóm module. | TB (nhiều file, làm dần) |
| **T7. Button-debt + raw HTML (FE V2)** | **~588 `<button class="ab-btn">`** → `<Btn>` (markup y hệt) + raw `<select>` → `AbSelect`. Kit `Btn`/`AbSelect`/`OptionsSelect`/`CrudModal` ĐÃ CÓ (`_v2kit.tsx`). Migrate per-page (KHÔNG mass-replace). | ✅ **DONE 2026-05-30 (push `2fd52c6`)** — **88 page / 586 button** → `<Btn variant=...>` (giữ children + style + size + type=submit + `<kbd>` + onClick đa dòng + conditional, markup tương đương): `Microbiology`(10)·`LabQC`(10)·`PharmacyApproval`(10)·`Reception`(14)·`BillingEditor`(13)·`PrescriptionEditor`(12)·`EmrEditor`(12)·`VideoConsultation`(12)·`NonDicomCapture`(12)·`RisAdmin`(18)·`ObservationStay`(11)·`Laboratory`(10)·`Inpatient`(10)·`Radiology`(10)·`SpecialtyEMR`(10)·`SampleReceive`(9)·`DigitalSignature`(9)·`CentralSigning`(11)·`DeAn06Liaison`(9)·`SystemAdmin`(12)·`Help`(11)·`Telemedicine`(8)·`OfficeSupplyApproval`(8)·`MethadoneTreatment`(8)·`IvfLab`(8)·`FollowUp`(8)·`Epidemiology`(8)·`CultureCollection`(8)·`CatalogsAdmin`(8)·`SatisfactionSurvey`(7)·`SampleStorage`(7)·`ReagentManagement`(7)·`PracticeLicense`(7)·`MedicalRecordArchive`(7)·`HealthExchange`(7)·`HealthEducation`(7)·`Finance`(7)·`EnvironmentalHealth`(7)·`DispensingCounter`(7)·`Consultation`(7)·`BookingManagement`(7)·`BhxhAudit`(7)·`TraumaRegistry`(6)·`TraditionalMedicine`(6)·`SampleTracking`(6)·`Rehabilitation`(6)·`RadiologyOps`(6)·`PopulationHealth`(6)·`PaymentTransactions`(6)·`InterHospitalSharing`(6)·`InfectionControl`(6)·`HealthCheckup`(6)·`ClinicalGuidance`(6)·`ZaloNotifications`(5)·`ServiceRequeue`(5)·`Quality`(5)·`PharmacyCatalogs`(5)·`OpdEditor`(5)·`MedicalRecordPlanning`(5)·`Insurance`(5)·`EmployeeProfile`(5)·`BloodBank`(5)·`BhxhConfig`(5)·`ReportCatalogs`(4)·`Prescription`(4)·`ParaclinicalCatalogs`(4)·`InpatientDispensing`(5)·`FinanceCatalogs`(4)·`Dashboard3Cap`(4)·`ConsultationRegister`(4)·`ClinicalCatalogs`(4)·`WorkloadReport`(3)·`StockReport`(3)·`RisDispatcher`(3)·`RisCatalogAdmin`(3)·`ReceiptBookAdmin`(3)·`PaymentReports`(3)·`OPD`(3)·`NationalGateways`(3)·`MasterData`(4)·`LisCatalogAdmin`(3)·`FunctionalDiagnostics`(3)·`EMR`(3)·`Billing`(3)·`Pharmacy`(2)·`ClinicalPharmacyCheck`(2)·`SigningWorkflow`(1)·`QualityDashboardLive`(1)·`EMR`(3 — đã liệt kê)·`FunctionalDiagnostics`(3 — đã liệt kê). FE build 0 lỗi. **Còn ~2 button** (chỉ BankPayments — dùng Antd `<Button>` với prop `loading`, **OUT-OF-SCOPE T7** vì T7 chỉ target raw `<button class="ab-btn">`) (chưa tính `_v2kit.tsx` — file kit, không convert) — làm dần per-page. ⚠️ NonDicomCapture có 1 `<Btn>` trong antd `<Upload>` — nên test click upload thực tế khi chạy |
| ~~**T8. 4 page gọi `client.*` trực tiếp**~~ | ✅ **DONE 2026-05-29** — tạo 4 module `api/bhxhAudit.ts`·`medicalRecordArchive.ts`·`satisfactionSurvey.ts`·`specialtyEmr.ts` (wrapper mỏng `apiClient`); repoint 9 call (`BhxhAudit`/`MedicalRecordArchive`/`SatisfactionSurvey` mỗi page 1 GET, `SpecialtyEMR` 6: search/get/save/delete/pdf/xml); 0 import `client` còn lại. FE `npm run build` 0 lỗi. | ✅ DONE |
| ~~**T9. Nuốt exception BE (56 chỗ / 8 service)**~~ | ✅ **DONE 2026-05-29** — inject `ILogger<T>` + chuyển `catch { return X; }` → `catch (Exception ex) { _logger.LogWarning(ex,…); return X; }` (behavior-preserving, kèm `ex` nên stack-trace định vị method): `IvfLab`(25)·`Environmental`(5)·`Mental`(5)·`Reproductive`(5)·`Forensic`(4)·`PracticeLicense`(4)·`InterHospital`(4)·`Traditional`(4). `DataManagement` = 0 swallow (không cần). `ExtendedWorkflowSqlGuard` drift-guard **giữ cố ý**. Full sln build 0 lỗi. | ✅ DONE |

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

---

## G. ⚠️ CHỜ DEPLOY PROD

**Cập nhật 2026-05-30:** từ commit `1fbaf86` (2026-05-29) đã có GitHub Actions
`deploy-backend.yml` (WIF keyless) **tự deploy Cloud Run** mỗi khi push commit
chạm `backend/**` hoặc `cloudbuild.yaml`. Theo dõi:
`gh run list --workflow=deploy-backend.yml -L 1`. Lệnh `gcloud` thủ công bên
dưới chỉ là **fallback** khi workflow fail.

Các thay đổi **BE** đã push origin/main (commit `dfad65b` 2026-05-30) đang
chạy CI auto-deploy:

| Đã push (chờ deploy BE) | Commit |
|---|---|
| Reception đăng ký BHYT BN mới (create-path) | `895d9d6` |
| Kê đơn khi lượt khám chưa gán BS (`DoctorId ?? userId`) | `ffcbe03` |
| Tạm ứng/Thanh toán shadow-FK `ReceivedById` | `895d9d6` |
| Inspector seed hash đúng — migration `44_nangcap24.sql` (tự chạy lúc khởi động) | `235df44` |
| **T2** BloodOrders/BloodOrderItems — `46_blood_orders.sql` (tự chạy lúc khởi động) | `d410a13` |
| **D6** `Console.WriteLine` → `ILogger` | `b91ebf2` |
| **T3** `DomainExceptionFilter` + NangCap24 typed-exception (404/400) | `dfad65b` |
| **T9** ILogger swallow exception 10 service (gộp cùng T3) | `dfad65b` |

**Lệnh deploy** (máy có gcloud — máy D:\ đã cài gcloud+proxy, chờ `gcloud auth login`):
```bash
IMG="asia-southeast1-docker.pkg.dev/project-4d4a3f8e-d582-4536-97f/his/his-api:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE=$IMG --project=project-4d4a3f8e-d582-4536-97f
gcloud run services update his-api --image=$IMG --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```
Sau deploy → **test lại lần 2 trên prod** (chuỗi nghiệp vụ + 5 fix; inspector `inspector/Inspector@123` login; blood order create).

**Riêng — sửa mojibake vai trò** (data, không qua deploy): chạy `scripts/fix_prod_encoding.ps1` qua Cloud SQL Auth Proxy (commit `0a43897`).

**FE (Vercel)** đã tự deploy: D1/D2, Reception split, 5 god-file split, refactor CSS.

---

*(Số liệu đo 2026-05-29; cập nhật lại sau mỗi đợt xử lý.)*
