# Audit vi phạm phân tầng ưu tiên — V2 (FE) + BE

> Đối chiếu `.claude/SKILL-MAP.md` (0b) P0/P1/P2 + (5b/5c) + `his-fe-convention` + `his-qa-anti-pattern`.
> **Mọi dòng dưới đây là bằng chứng quét THẬT** (grep/wc trên code hiện tại), KHÔNG suy đoán.
> Cột **Loại**: 🔴 debt cần sửa · 🟡 cân nhắc · ✅ cố ý/chấp nhận (giải thích lý do — KHÔNG sửa).
> Mục tiêu: dùng làm checklist **sửa dần**, không mass-fix.

Phạm vi đã quét: `frontend/src/pages-v2/*.tsx` (126 file) + `backend/src/HIS.{Infrastructure,API}` (.cs).

---

## A. FRONTEND V2 (`pages-v2/`)

### A1. P1 — Layer: gọi `client.*` trực tiếp trong page (bypass `api/<domain>.ts`)
Raw `axios`: **0 file** ✅ (tốt — đã centralized).
Gọi `client.get/post/put/delete` thẳng trong page (nên bọc thành hàm trong `api/*.ts` + DTO):

| File | Loại | Ghi chú |
|---|---|---|
| `BhxhAudit.tsx` · `MedicalRecordArchive.tsx` · `SatisfactionSurvey.tsx` · `SpecialtyEMR.tsx` | 🟡 | 4 file. Dùng `client` (axios chung) nhưng không qua domain-api → khó test/tái dùng. Sửa dần: trích ra `api/<domain>.ts`. Không gấp (vẫn qua client chung, không phải raw axios). |

### A2. P1 — Antd-first / raw HTML (raw `<table>/<select>/<input>`)
**18 file** có raw HTML. CẦN xét từng case (không replace cơ học — 5b):

| Nhóm | File | Loại |
|---|---|---|
| Cổng standalone light-theme (KHÔNG thuộc ab-* terminal) | `InspectorPortal.tsx` | ✅ cố ý (style riêng — xem `his-fe-standalone-portal`) |
| `<select className="ab-sel">` native (đã có `AbSelect` thay được) | `ZaloNotifications` (đã chuyển), `NationalGateways`, `PharmacyCatalogs`… | 🟡 chuyển dần sang `AbSelect`/`OptionsSelect` |
| Bespoke phức tạp (Reception/Dashboard/EmergencyDisaster/HR/RisAdmin/PharmacyApproval/…) | nhiều | 🟡 raw `<input>`/`<table>` rải rác → bọc dần bằng `_v2kit`/Antd; ưu tiên thấp, rủi ro cao |
| Btn-debt: **677 `<button>`** (chủ yếu `ab-btn`) | toàn bộ v2 | 🟡 migrate dần sang `<Btn>` (markup y hệt, an toàn). Pattern mẫu: `TreatmentProtocol.tsx`, `FoodSafety.tsx` |

### A3. P1 — Nút "chết" / CRUD chưa wire (`onClick={() => tk('Mở…')}`)
Nút bấm chỉ hiện toast, không làm gì (≥3 nút/ file):

| File | Số stub | Loại / hướng xử lý |
|---|---|---|
| `Help.tsx` | 7 | ✅ trang trợ giúp — nhiều nút điều hướng nội dung, không phải CRUD |
| `LabQC.tsx` | 6 | 🟡 còn nút "chạy QC"/L-J (không có API) — Lô QC đã wire C+U+D |
| `Finance.tsx` | 5 | ✅ trang báo cáo (stub "mở báo cáo") — không có entity CRUD |
| `CentralSigning.tsx` | 5 | 🟡 UI ký số — cân nhắc |
| `BhxhAudit.tsx` | 5 | 🟡 |
| `TrainingResearch` · `SampleStorage` · `MedicalRecordArchive` (5) · `Nutrition`·`MethadoneTreatment`·`IvfLab`·`InfectionControl`·`AssetManagement` (4) · `SatisfactionSurvey`·`SampleTracking`·`Microbiology`·`MedicalRecordPlanning`·`LISConfig`·`HealthEducation`·`Epidemiology` (3) | 3–5 | 🔴/🟡 — phần lớn CÓ write-API (wire được: Nutrition, IvfLab, Microbiology, AssetManagement, EndpointSecurity, HealthExchange, InfectionControl, LISConfig, TrainingResearch); `SampleStorage`/`SampleTracking`/`MedicalRecordArchive`/`SatisfactionSurvey` = **gap backend** (không có write-fn). Xem mục C. |

### A4. P0/P1 — Hardcode
| File | Loại | Chi tiết |
|---|---|---|
| `ConsultationRegister.tsx:70` | 🔴 P0 | Hardcode `"BỆNH VIỆN"` trong template in → phải dùng `constants/hospital.ts` (`HOSPITAL_NAME`). |
| `NonDicomCapture.tsx:350,356` | 🟡 | `VITE_API_URL || 'http://localhost:5106/api'` inline 2 chỗ → gom 1 helper (đã có fallback, không lộ secret). |
| `BiometricEnrollment.tsx:122,159` | ✅ | So sánh `rpId === 'localhost'` là logic WebAuthn hợp lệ, không phải hardcode config. |

### A5. P2 — Typed props (`: any` / `as any`)
| File | Số | Loại |
|---|---|---|
| `_v2kit.tsx` | 13 | ✅ kit generic (đã `eslint-disable` có chủ đích) |
| `RadiologyOps`(9)·`ObservationStay`(8)·`OfficeSupplyApproval`(7)·`MasterData`(6)·`SystemAdmin`(5)·`Surgery`(4)·`StockReport`(4) | — | 🟡 siết type dần khi đụng tới (P2, không gấp) |

### A6. Convention — `console.error`
| File | Loại |
|---|---|
| `CentralSigning.tsx` (1 chỗ) | 🔴 nhỏ — đổi `console.error` → `console.warn` (convention dự án) |

### A7. P1 — God component (>600 dòng)
| File | Dòng | Loại |
|---|---|---|
| `Reception.tsx` | 1924 | 🔴 tách dần (form đăng ký + queue + drawer → sub-component). Rủi ro cao → migrate-dần, không rewrite |
| `Dashboard.tsx` | 1153 | 🟡 tách widget/chart ra component |
| `EmergencyDisaster.tsx` | 902 · `Reports.tsx` 834 · `HR.tsx` 646 | 🟡 bespoke phức tạp — tách khi có dịp sửa |
| `_v2kit.tsx` | 875 | ✅ là **thư viện kit** (nhiều component 1 file) — chấp nhận, có thể tách theo nhóm sau |

---

## B. BACKEND (`HIS.Infrastructure`, `HIS.API`)

### B1. P1 — God service / controller (>1500 dòng, loại Migrations auto-gen)
| File | Dòng | Loại |
|---|---|---|
| `Services/SystemCompleteService.cs` | **7129** | 🔴 quá lớn — tách theo sub-domain (user/role/config/catalog/audit) thành service con. Rủi ro cao → tách dần, giữ interface |
| `Services/RISCompleteService.cs` | 5675 | 🔴 tách (DICOM / report / worklist) |
| `Services/ExaminationCompleteService.cs` | 4564 | 🟡 |
| `API/Controllers/PopulateDataController.cs` | 3996 | ✅ seeder demo — chấp nhận (không phải logic nghiệp vụ chạy thật) |
| `Services/ExtendedWorkflowServices.cs` | 3916 · `InpatientCompleteService` 3796 · `BillingCompleteService` 3562 | 🔴/🟡 tách theo nhóm nghiệp vụ |

> ⚠️ Migrations `*.Designer.cs`/`Snapshot` (19k dòng) = **auto-gen EF, KHÔNG phải vi phạm** — bỏ qua.

### B2. P0/P1 — Nuốt exception (`catch { return empty/null }`) — **56 chỗ**
CẦN xét từng case (không phải tất cả là vi phạm):

| Nhóm | Loại |
|---|---|
| `ExtendedWorkflowSqlGuard`/drift-guard (ChronicDisease, ClinicalGuidance, CommunityHealth…) | ✅ **cố ý** — bao schema-drift cho bảng cũ thiếu cột (đã ghi trong work-log). Không phải debt |
| `IvfLabService`(10)·`ReproductiveHealth`(4)·`MentalHealth`(4)·`HL7ConnectionManager`(4)·`DataManagementService`(4)·`TraditionalMedicine`(3)·`PracticeLicense`(3)·`InterHospital`(3)·`Forensic`(3) | 🔴 **rà từng chỗ** — `catch { return new List() }` che lỗi thật → khó debug. Sửa: log `console.warn`/logger + để lỗi nổi đúng chỗ, hoặc chỉ nuốt khi đúng SqlException drift |

### B3. Convention — `Console.WriteLine` (2 chỗ)
🟡 nhỏ — chuyển sang `ILogger` hoặc bỏ debug.

### B4. P0 — Hardcode secret/connection string trong .cs
**0 chỗ** ✅ (connection string/secret nằm ở appsettings/env — đúng).

---

## C. Gap BACKEND (FE có nút nhưng thiếu API — không phải lỗi FE)
Các trang FE để nút "chết" vì **BE chưa có endpoint write**: `SampleStorage`, `SampleTracking`,
`MedicalRecordArchive`, `SatisfactionSurvey`, `InterHospitalSharing`, `BhxhAudit` (audit-cycle),
`BookingManagement` (chỉ có doctor-schedule), `MedicalRecordPlanning` (chỉ borrow/copy),
`Epidemiology` (chỉ update, thiếu POST tạo). Muốn wire CRUD đầy đủ → cần thêm endpoint BE trước.

---

## D. Kế hoạch sửa dần (ưu tiên theo (5c))

1. **🔴 P0 nhanh (ít rủi ro, làm ngay):** `ConsultationRegister` dùng `HOSPITAL_NAME`; `CentralSigning` `console.error`→`warn`; `NonDicomCapture` gom helper URL.
2. **🔴 P1 — nuốt exception BE (B2):** rà 9 service (IvfLab… Forensic), tách "drift-guard cố ý" vs "che lỗi thật" → thêm log.
3. ~~**🟡 P1 — CRUD nút chết (A3):** wire các trang CÓ write-API (Nutrition/IvfLab/Microbiology/AssetManagement/EndpointSecurity/HealthExchange/InfectionControl/LISConfig/TrainingResearch) bằng `CrudModal` — pattern đã có.~~ → **ĐÃ XONG 2026-05-28** (9/9 trang). Mỗi trang wire create/edit (+delete/cancel/test/activate/status-update tuỳ entity) qua `CrudModal`/bespoke modal + `Btn`/`ActBtn`. Stub còn lại là **sub-module riêng** (NCKH/Học viên, Khấu hao, Sự cố ATTT, Cách ly, Phôi đông, Đồng bộ-tất-cả) + print → KHÔNG phải gap chính. **Bug fix kèm:** `createHAICase` sửa route `/hai-cases`→`/hai-reports` (route cũ chỉ có GET → POST 405, hỏng cả v1+v2). **Gap backend còn:** HAI không có endpoint update/investigate/close (mục C) → InfectionControl chỉ tạo mới.
4. **🟡 P1 — God service/component:** tách dần `SystemCompleteService`/`RISCompleteService` + `Reception.tsx` theo sub-domain, **giữ interface/route** (backward-compat, migrate-dần — KHÔNG rewrite).
5. **🟡 P1 — Btn-debt + raw HTML (A2):** migrate `<button ab-btn>`→`<Btn>` + raw `<select>`→`AbSelect` theo từng trang khi đụng tới.
6. **🟢 Gap backend (C):** khi cần demo đầy đủ → thêm endpoint write rồi wire FE.
7. **P2 (A5):** siết `any` khi sửa file liên quan; không làm riêng 1 đợt.

> Nguyên tắc khi sửa (5b/5c): backward-compat > đẹp; migrate-dần, không mass-replace; build sạch + self-review trước khi báo từng đợt.
