# NangCap23 — HIS Workflow Test, UI Matrix & Dependency

> **Mục đích:** Bổ sung phần phân tích đầy đủ **UI flow + nghiệp vụ y tế +
> dependency** giữa các module HIS đối với gói nâng cấp 23.
> **Phạm vi:** Cả workflow HIS hiện có (đã có sẵn trong codebase) và 9 module
> mới NangCap23 chạm vào.
> **Nguồn dữ liệu:** Đọc trực tiếp source code BE/FE/SQL + `docs/architecture/data-flow.md`
> + `docs/MODULE_MAP.md` + `docs/access-control-matrix.md` + routes `App.tsx`
> thực tế. **Không suy đoán nghiệp vụ.**
> **Tài liệu liên quan:** [README.md](./README.md) · [analysis.md](./analysis.md)
> · [test-plan.md](./test-plan.md) · [test-guide.md](./test-guide.md) · [summary.md](./summary.md).
> **Last updated:** 2026-05-25

---

## Mục lục

- [1. Phân hệ + URL thực tế](#1-phân-hệ--url-thực-tế)
- [2. HIS Workflow Test](#2-his-workflow-test)
  - [2.1 Reception Flow (Tiếp đón)](#21-reception-flow-tiếp-đón)
  - [2.2 OPD Examination Flow (Khám ngoại trú)](#22-opd-examination-flow-khám-ngoại-trú)
  - [2.3 Inpatient Admission Flow (Nội trú)](#23-inpatient-admission-flow-nội-trú)
  - [2.4 Laboratory Order Flow (Xét nghiệm)](#24-laboratory-order-flow-xét-nghiệm)
  - [2.5 Radiology / RIS-PACS Flow (CĐHA)](#25-radiology--ris-pacs-flow-cđha)
  - [2.6 Prescription + Pharmacy Flow (Kê đơn + Phát thuốc)](#26-prescription--pharmacy-flow-kê-đơn--phát-thuốc)
  - [2.7 Billing + Insurance Flow (Thu ngân + BHYT)](#27-billing--insurance-flow-thu-ngân--bhyt)
  - [2.8 Functional Diagnostics Flow [NangCap23]](#28-functional-diagnostics-flow-nangcap23)
  - [2.9 Linen + Sterilization Flow [NangCap23]](#29-linen--sterilization-flow-nangcap23)
  - [2.10 Đề án 06 — GCS / GBT / DLHC Flow [NangCap23]](#210-đề-án-06--gcs--gbt--dlhc-flow-nangcap23)
  - [2.11 National Prescription Gateway Flow [NangCap23]](#211-national-prescription-gateway-flow-nangcap23)
  - [2.12 National Pharmacy Report Flow [NangCap23]](#212-national-pharmacy-report-flow-nangcap23)
  - [2.13 Zalo OA / ZNS Notification Flow [NangCap23]](#213-zalo-oa--zns-notification-flow-nangcap23)
  - [2.14 Quality Dashboard Flow [NangCap23]](#214-quality-dashboard-flow-nangcap23)
- [3. Module Dependency Map](#3-module-dependency-map)
- [4. UI Test Matrix](#4-ui-test-matrix)
- [5. Critical Medical Risk Test](#5-critical-medical-risk-test)
- [6. Integration Test (HL7/FHIR/LIS/RIS/PACS/External)](#6-integration-test-hl7fhirlisrispacsexternal)
- [7. Concurrent / Multi-user / Transaction Test](#7-concurrent--multi-user--transaction-test)
- [8. Mapping UI → Component → API → Service → DB → Integration](#8-mapping-ui--component--api--service--db--integration)
- [9. Role-based Access Test](#9-role-based-access-test)
- [10. Regression Priority](#10-regression-priority)

---

## 1. Phân hệ + URL thực tế

Tổng hợp từ `App.tsx` (line 322–443) + `MainLayout.tsx` menu. NangCap23 thêm
6 route cho v1 + 6 route cho v2.

### 1.1 Module trực tiếp liên quan workflow

| Module | URL v1 | URL v2 | Menu group | NangCap23 chạm? |
|---|---|---|---|---|
| Tiếp đón | `/reception` | `/v2/reception` | Lâm sàng | (cung cấp Patient cho GCS/GBT/DLHC) |
| OPD Khám bệnh | `/opd` | `/v2/opd` | Lâm sàng | (cung cấp Examination cho DLHC; cung cấp Prescription cho cổng QG) |
| Kê đơn | `/prescription` | `/v2/prescription` | Lâm sàng | ⚠️ Trực tiếp — National Prescription Gateway query đơn |
| Nội trú IPD | `/ipd` (alias `/inpatient`) | `/v2/ipd` | Lâm sàng | (Discharge → có thể trigger GBT) |
| Phẫu thuật | `/surgery` | `/v2/surgery` | Lâm sàng | — |
| EMR | `/emr` | `/v2/emr` | Lâm sàng | — |
| Hội chẩn | `/consultation` | `/v2/consultation` | Cận lâm sàng | — |
| Xét nghiệm LIS | `/lab` | `/v2/lab` | Cận lâm sàng | (Quality Dashboard query `LabRequestItems`) |
| CĐHA / RIS | `/radiology` | `/v2/radiology` | Cận lâm sàng | (Quality Dashboard query `RadiologyRequests`) |
| DICOM Viewer | `/radiology/viewer` | — | (full-bleed) | — |
| Nhà thuốc | `/pharmacy` | `/v2/pharmacy` | Hỗ trợ điều trị | (cung cấp dữ liệu cho `NationalPharmacyOutboundReport`) |
| Phát thuốc | `/dispensing-counter` | `/v2/dispensing-counter` | Hỗ trợ điều trị | — |
| Viện phí | `/billing` | `/v2/billing` | Tài chính | (Quality Dashboard query `Receipts`) |
| BHYT | `/insurance` | `/v2/insurance` | Tài chính | (BHXH gateway khác National Gateway — chạy song song) |

### 1.2 Module mới NangCap23 (6 route)

| Module | URL v1 | URL v2 | Menu group |
|---|---|---|---|
| Cổng Đơn thuốc / Dược QG | `/national-gateways` | `/v2/national-gateways` | Liên thông (`MainLayout.tsx` line ~256) |
| Đề án 06 (GCS/GBT/DLHC) | `/de-an-06` | `/v2/de-an-06` | Liên thông |
| Đồ giặt + Tiệt trùng | `/linen-management` | `/v2/linen-management` | Quản lý |
| Thăm dò chức năng | `/functional-diagnostics` | `/v2/functional-diagnostics` | Cận lâm sàng |
| Zalo OA / ZNS | `/zalo-notifications` | `/v2/zalo-notifications` | Liên thông |
| Quality Dashboard live | `/quality-dashboard-live` | `/v2/quality-dashboard-live` | Quản lý |

### 1.3 Route hệ thống dùng chung (không phải NangCap23)

`/dashboard-3cap`, `/follow-up`, `/booking-management`, `/sms-management`,
`/admin`, `/digital-signature`, `/central-signing`, `/help`, `/settings` →
`/admin`, plus 60+ route module khác. Tham khảo [`docs/MODULE_MAP.md`](../../MODULE_MAP.md)
§5.1 — không nằm trong scope test NangCap23 trừ khi audit log middleware
ghi nhận hành động NangCap23.

---

## 2. HIS Workflow Test

Mỗi workflow trình bày:
- **Flow detail**: bước thao tác, role, điều kiện dữ liệu, trạng thái trước/sau,
  API gọi, service xử lý, DB thay đổi
- **Upstream / Downstream**: module phụ thuộc + module bị ảnh hưởng
- **NangCap23 touchpoint**: chỗ gói nâng cấp 23 chạm vào (nếu có)

### 2.1 Reception Flow (Tiếp đón)

| Trường | Giá trị |
|---|---|
| **URL** | `/reception` (v1), `/v2/reception` (v2) |
| **Route path** | `App.tsx:323`, `App.tsx:613` |
| **Menu** | Lâm sàng → "Tiếp đón" (`MainLayout.tsx:137`) |
| **Page component** | `pages/Reception.tsx`, `pages-v2/Reception.tsx` |
| **API client** | `api/reception.ts` (suy ra từ MODULE_MAP §1.1) |
| **Service BE** | `ReceptionCompleteService` (`HIS.Infrastructure/Services/ReceptionCompleteService.cs`) |
| **Controller BE** | `ReceptionCompleteController` (`HIS.API/Controllers/ReceptionCompleteController.cs`) |
| **DB table** | `Patients`, `MedicalRecords`, `QueueTickets`, `Appointments` |

**Flow detail:**

| Bước | Action | Role | Trạng thái trước | Trạng thái sau | API | Service method |
|---|---|---|---|---|---|---|
| 1 | Quét/nhập CCCD hoặc số BHYT | RECEPTIONIST | — | Patient lookup | (FE local) | — |
| 2 | Tạo / tìm Patient | RECEPTIONIST | (chưa có row) | `Patients` row mới hoặc match | `POST /api/reception/patients` | `ReceptionCompleteService.SaveOrFindPatientAsync` |
| 3 | Kiểm tra BHYT (qua cổng BHXH) | RECEPTIONIST | `Insurance` null | `Insurance` valid | `GET /api/insurance/validate?id=...` | `InsuranceXmlService` + `BhxhGatewayClient` |
| 4 | Đăng ký khám | RECEPTIONIST | `MedicalRecord` chưa có | `MedicalRecord.Status=0`, `MedicalRecord.MedicalRecordCode` sinh tự động | `POST /api/reception/register` | `.RegisterVisitAsync` |
| 5 | Cấp số xếp hàng | RECEPTIONIST | `QueueTickets` chưa có | `QueueTickets` row mới, `QueueType=Normal/Priority/Emergency` | `POST /api/reception/queue-ticket` | `.IssueQueueTicketAsync` |

**Upstream:** Không có (entry point của hệ thống)

**Downstream / module bị ảnh hưởng:**
- **OPD**: query `QueueTickets` để hiển thị danh sách BN chờ khám
- **Insurance**: cập nhật `Patient.InsuranceNumber`
- **Quality Dashboard** (NangCap23): aggregate `QueueTickets` cho view "Phòng khám"

**NangCap23 touchpoint:**
- ✅ Quality Dashboard query `QueueTickets` (read-only) — nếu thay schema `QueueTickets` phải re-test QDashboard
- ✅ Patient từ Reception là **upstream cho GCS/GBT/DLHC** trong NangCap23 Đề án 06

**Edge case cần test:**
- Trùng CCCD → nên match Patient cũ, không tạo Patient mới (duplicate prevention)
- BHYT sai/hết hạn → vẫn cho đăng ký, đánh dấu `Insurance.IsValid=false`
- Số xếp hàng cấp đồng thời 2 reception → unique sequential (transaction)

---

### 2.2 OPD Examination Flow (Khám ngoại trú)

| Trường | Giá trị |
|---|---|
| **URL** | `/opd`, `/v2/opd` |
| **Menu** | Lâm sàng → "Khám bệnh" (`MainLayout.tsx:138`) |
| **Page** | `pages/OPD.tsx`, `pages-v2/OPD.tsx` |
| **Service BE** | `ExaminationCompleteService` |
| **DB table** | `Examinations`, `Diagnoses`, `ServiceRequests`, `ServiceRequestDetails`, `Prescriptions`, `PrescriptionDetails`, `Patients`, `MedicalRecords` |

**Flow detail (dựa `docs/architecture/data-flow.md` §2.1):**

| Bước | Action | Role | Input | Output | API | Service |
|---|---|---|---|---|---|---|
| 1 | Chọn phòng + gọi BN từ queue | DOCTOR | `roomId`, `queueNumber` | — | `POST /api/examination/call-next` | `.CallNextAsync` |
| 2 | Hỏi bệnh, tiền sử | DOCTOR | `examinationId` | `Examination.MedicalHistory` | `PUT /api/examination/{id}/history` | `.SaveMedicalHistoryAsync` |
| 3 | Khám lâm sàng, sinh hiệu | DOCTOR / NURSE (sinh hiệu) | `examinationId` | `Examination.VitalSigns`, `.PhysicalExam` | `PUT /api/examination/{id}/clinical` | `.SaveClinicalAsync` |
| 4 | Chẩn đoán ICD-10 | DOCTOR | `examinationId`, `icdCode` | `Diagnoses` row mới | `POST /api/examination/{id}/diagnosis` | `.SaveDiagnosisAsync` |
| 5 | Chỉ định CLS (Lab + Radiology + FDT) | DOCTOR | `serviceIds[]` | `ServiceRequests` + `ServiceRequestDetails` | `POST /api/examination/{id}/service-order` | `.CreateServiceOrderAsync` |
| 6 | Chờ kết quả CLS quay về | (auto) | — | `LabResult` / `RadiologyResult` / `FunctionalDiagnosticTest` | (callback từ LIS/RIS/FDT) | — |
| 7 | Kết luận khám | DOCTOR | `examinationId`, `conclusion` | `Examination.Conclusion`, `.Status=4` (Completed) | `POST /api/examination/{id}/complete` | `.CompleteAsync` |
| 8 | Kê đơn thuốc | DOCTOR | `examinationId`, `medicineIds[]` | `Prescriptions` + `PrescriptionDetails` | `POST /api/prescription` | `.SavePrescriptionAsync` |
| 9 | Hẹn tái khám (tuỳ chọn) | DOCTOR | `examinationId`, `nextDate` | `Appointments` row | `POST /api/examination/appointments` | `.CreateAppointmentAsync` |

**Upstream:**
- Reception (cung cấp `MedicalRecord` + `Patient` + `QueueTicket`)
- BHYT validation (cung cấp `Insurance.IsValid` để áp tỷ lệ)

**Downstream:**
- LIS (qua `ServiceRequestDetails.RequestType=Lab`)
- RIS (qua `ServiceRequestDetails.RequestType=Radiology`)
- **FDT (NangCap23)** (qua `ServiceRequestDetails.RequestType=FunctionalDiagnostic` — link tới `FunctionalDiagnosticTest.ServiceRequestDetailId`)
- Pharmacy (qua `Prescription`)
- Billing (qua `ServiceRequests` + `Prescriptions` chưa thanh toán)
- EMR (lưu trữ `Examination` final)

**NangCap23 touchpoint:**
- ✅ **Prescription tạo ở bước 8** là input cho `POST /api/national-prescription-gateway/submit`
- ✅ FDT có thể được chỉ định ở bước 5 → `ServiceRequestDetailId` link tới `FunctionalDiagnosticTest`
- ✅ Diagnosis là input cho **DLHC** (nếu phòng khám SK lái xe) hoặc **GBT** (nếu BN tử vong)
- ✅ Quality Dashboard query `Examinations`, `RadiologyRequests` (read-only)

**Validation business rule** (đã có sẵn trong codebase, không phải NangCap23):
- `DrugInteractionService.CheckDrugInteractionsAsync` block save Prescription nếu severity ≥ 4
- `DrugAllergyService.CheckDrugAllergiesAsync` block save nếu BN có dị ứng với thuốc kê

---

### 2.3 Inpatient Admission Flow (Nội trú)

| Trường | Giá trị |
|---|---|
| **URL** | `/ipd` (alias `/inpatient`), `/v2/ipd` |
| **Menu** | Lâm sàng → "Nội trú" (`MainLayout.tsx:141`) |
| **Service BE** | `InpatientCompleteService` |
| **DB table** | `Admissions`, `Beds`, `Departments`, `TreatmentSheets`, `NursingCareSheets`, `ConsultationRecords`, `Discharges` |

**Flow detail (dựa `data-flow.md` §2.2):**

| Bước | Action | Role | Trạng thái trước | Trạng thái sau | API | Service |
|---|---|---|---|---|---|---|
| 1 | Chỉ định nhập viện từ OPD/Cấp cứu | DOCTOR | `MedicalRecord.Status=Open` | `Admission.Status=0` (Đang điều trị) | `POST /api/inpatient/admit` | `.AdmitPatientAsync` |
| 2 | Phân giường / buồng bệnh | NURSE / DOCTOR | `Bed.Status=Free` | `Bed.Status=Occupied`, `Admission.BedId` | `POST /api/inpatient/assign-bed` | `.AssignBedAsync` |
| 3 | Tờ điều trị hằng ngày | DOCTOR | (chưa có sheet hôm nay) | `TreatmentSheets` row hôm nay | `POST /api/inpatient/treatment-sheet` | `.CreateTreatmentSheetAsync` |
| 4 | Y lệnh CLS / Kê đơn / Phẫu thuật / Dinh dưỡng | DOCTOR | — | `ServiceRequests` / `Prescriptions` / `SurgerySchedules` / `DietOrders` | (multi endpoint) | (multi service) |
| 5 | Chăm sóc điều dưỡng | NURSE | — | `NursingCareSheets` row | `POST /api/inpatient/nursing-care` | `.CreateNursingCareAsync` |
| 6 | Hội chẩn (tuỳ chọn) | DOCTOR | — | `ConsultationRecords` row | `POST /api/consultation` | `.CreateConsultationAsync` |
| 7 | Chuyển khoa (tuỳ chọn) | DOCTOR | `Admission.DepartmentId=X` | `Admission.DepartmentId=Y` | `POST /api/inpatient/transfer` | `.TransferDepartmentAsync` |
| 8 | Xuất viện / Tử vong / Chuyển viện | DOCTOR | `Admission.Status=0` | `Admission.Status=1`, `Discharge` row | `POST /api/inpatient/discharge` | `.DischargePatientAsync` |

**Upstream:**
- OPD (chỉ định nhập viện)
- Examination (chẩn đoán nhập viện)

**Downstream:**
- Billing (tổng hợp chi phí nội trú)
- BHYT (xuất XML 130 cho nội trú)
- EMR / HSBA (lưu trữ sau xuất viện)
- Pharmacy (phiếu lĩnh thuốc khoa)

**NangCap23 touchpoint:**
- ✅ Khi `Discharge.MannerOfDeath != null` (BN tử vong) → có thể trigger tạo **GBT** (Đề án 06)
- ✅ Quality Dashboard query `Admissions`, `Discharges` cho view "Nội trú"

**Edge case:**
- Chuyển khoa: phải release Bed cũ + assign Bed mới atomic (transaction)
- 2 nurse cùng assign 1 Bed → DB UNIQUE constraint chặn
- Xuất viện với BN còn nợ → block hoặc warning (test theo business rule)

---

### 2.4 Laboratory Order Flow (Xét nghiệm)

| Trường | Giá trị |
|---|---|
| **URL** | `/lab`, `/v2/lab` |
| **Menu** | Cận lâm sàng → "Xét nghiệm" (`MainLayout.tsx:161`) |
| **Service BE** | `LISCompleteService` + `HL7ReceiverService` |
| **DB table** | `LabRequests`, `LabRequestItems`, `LabResults`, `Specimens`, `Services` |

**Flow detail (dựa `data-flow.md` §2.4):**

| Bước | Action | Role | Input | Output | Integration |
|---|---|---|---|---|---|
| 1 | Tạo y lệnh XN từ OPD/IPD | DOCTOR | `serviceIds[]` | `LabRequests` + `LabRequestItems` | — |
| 2 | Gửi Worklist sang LIS qua HL7 v2 | (auto) | `lab_request_id` | (HL7 ORM message) | HL7 v2 outbound |
| 3 | Lấy mẫu + in barcode | LAB_TECH | `lab_request_id` | `Specimens` row, barcode | — |
| 4 | Tiếp nhận mẫu | LAB_TECH | `barcode` | `Specimen.Status=Received` | — |
| 5 | Chạy máy + nhận kết quả tự động | (máy) | (HL7 ORU R01 incoming) | `LabResults` rows mới | HL7 listener port 2576 |
| 6 | Duyệt KQ | LAB_TECH / LAB_REVIEWER (4-eyes) | `lab_result_id` | `LabResult.Status=Approved` | — |
| 7 | Cảnh báo critical value | (auto) | `lab_result_id` | Notification (Email + SignalR) | `ResultNotificationService.NotifyCriticalValueAsync` |
| 8 | Trả KQ về khoa LS | (auto) | — | OPD/IPD page hiển thị KQ | SignalR push |

**Upstream:** OPD / IPD (tạo y lệnh)

**Downstream:**
- OPD / IPD (nhận KQ để kết luận)
- EMR (lưu KQ)
- Billing (tính phí XN)

**NangCap23 touchpoint:**
- ✅ Quality Dashboard view "Xét nghiệm" query `LabRequestItems` JOIN `Services.ServiceGroup` → group theo Huyết học / Sinh hóa / Vi sinh / Miễn dịch
- ⚠️ Schema drift cảnh báo: `LISCompleteService.GetLabStatusAsync` đã có defensive try/catch — nếu drift sẽ trả empty list (test TC-QD-008)

**Critical edge case:**
- HL7 incoming với patient ID không match → reject + log
- 2 LAB_TECH cùng duyệt 1 KQ → 4-eyes rule (1 KTV thực hiện, 1 reviewer duyệt — phải khác user)
- Critical value (vd. K+ > 6.5) → bắt buộc notification + acknowledge trước khi save

---

### 2.5 Radiology / RIS-PACS Flow (CĐHA)

| Trường | Giá trị |
|---|---|
| **URL** | `/radiology`, `/v2/radiology`, viewer: `/radiology/viewer` |
| **Menu** | Cận lâm sàng → "CĐHA" |
| **Service BE** | `RISCompleteService` + `AiReportService` + `AiWorklistService` |
| **DB table** | `RadiologyRequests`, `RadiologyExams`, `RadiologyReports`, `DicomStudies`, `AiLabelingResults` |

**Flow detail (dựa `data-flow.md` §2.7):**

| Bước | Action | Role | Input | Output | Integration |
|---|---|---|---|---|---|
| 1 | Chỉ định CĐHA từ OPD/IPD | DOCTOR | `serviceIds[]` | `RadiologyRequests` | — |
| 2 | Gửi DICOM Worklist | (auto) | `request_id` | (DICOM Modality Worklist) | Orthanc |
| 3 | Tiếp nhận BN vào phòng chụp | (KTV CĐHA) | `request_id` | — | — |
| 4 | Thực hiện chụp + lưu ảnh | (modality) | DICOM bytes | `DicomStudies` (Orthanc) | DICOM C-STORE inbound port 4242 |
| 5 | BS CĐHA đọc + viết báo cáo | DOCTOR (CĐHA) | `study_uid` | `RadiologyReports.Findings/Impression` | — |
| 6 | BS CK duyệt báo cáo | DOCTOR senior | `report_id` | `RadiologyReport.Status=Final`, ký số | `DigitalSignatureService` |
| 7 | (Optional) AI labeling | (auto background) | `study_uid` | `AiLabelingResults` | `AiWorklistService` background scan |
| 8 | Trả KQ về khoa LS | (auto) | — | SignalR push | `ResultNotificationService.NotifyRadiologyResultAsync` |

**Upstream:** OPD / IPD / Cấp cứu

**Downstream:**
- OPD / IPD (nhận báo cáo)
- EMR (đính kèm báo cáo)
- Billing (tính phí CĐHA)
- AI module (background analysis Phase 1–4)

**NangCap23 touchpoint:**
- ✅ Quality Dashboard view "CLS" query `RadiologyRequests` (pending + completed)
- ✅ Cũng query `FunctionalDiagnosticTests` + `PathologyRequests` cùng view

---

### 2.6 Prescription + Pharmacy Flow (Kê đơn + Phát thuốc)

| Trường | Giá trị |
|---|---|
| **URL** | `/prescription`, `/pharmacy`, `/dispensing-counter` |
| **Menu** | Lâm sàng → "Kê đơn"; Hỗ trợ điều trị → "Nhà thuốc" + "Quầy phát thuốc" |
| **Service BE** | `ExaminationCompleteService` (kê đơn) + `WarehouseCompleteService` (phát thuốc) |
| **DB table** | `Prescriptions`, `PrescriptionDetails`, `Medicines`, `StockMovements`, `MedicineStocks`, `DispensingRecords` |

**Flow detail (dựa `data-flow.md` §2.5):**

| Bước | Action | Role | Trạng thái trước | Trạng thái sau | API |
|---|---|---|---|---|---|
| 1 | Kê đơn (từ OPD/IPD) | DOCTOR | `Prescription` chưa có | `Prescription.Status=Draft`, `PrescriptionDetails[]` | `POST /api/prescription` |
| 2 | Kiểm tra tương tác thuốc | (auto trong service) | — | (block save nếu severity=4) | `DrugInteractionService` |
| 3 | Kiểm tra dị ứng | (auto) | — | (block save nếu match) | `DrugAllergyService` |
| 4 | KT Dược lâm sàng (tuỳ chọn) | PHARMACIST | `Prescription.Status=Draft` | `Prescription.Status=Verified` | `POST /api/clinical-pharmacy/check` |
| 5 | Duyệt cấp Dược | PHARMACIST | `Status=Verified` | `Status=Approved` | `POST /api/pharmacy-approval/approve` |
| 6 | Phát thuốc tại quầy | PHARMACIST | `Status=Approved` | `Status=Dispensed`, `StockMovements` rows | `POST /api/dispensing/issue` |
| 7 | FEFO batch picker tự chọn lô | (auto) | `MedicineStocks` rows | `MedicineStocks.Quantity` giảm | `WarehouseCompleteService.AutoSelectBatchesAsync` |
| 8 | Phát thuốc nội trú (theo khoa) | PHARMACIST | (phiếu lĩnh khoa) | `DispensingRecords`, `StockMovements` | `POST /api/inpatient-dispensing/issue` |

**Upstream:** OPD / IPD (tạo Prescription)

**Downstream:**
- Billing (tính phí thuốc)
- Inventory (giảm tồn kho qua FEFO)
- **National Prescription Gateway (NangCap23)** — Prescription Acked có thể submit qua cổng QG
- **Zalo OA (NangCap23)** — gửi tin "prescription_dispense" cho BN

**NangCap23 touchpoint:**
- ✅ **Trực tiếp**: `POST /api/national-prescription-gateway/submit` với `prescriptionId` — Prescription phải có ≥ 1 Detail (TC-NP-006 reject đơn rỗng)
- ✅ **Trực tiếp**: Pharmacy data (StockMovements) là input cho `POST /api/national-pharmacy/generate` (báo cáo DailySale/MonthlyInventory)
- ✅ **Gián tiếp**: Zalo template `prescription_dispense` có param `patient_name`, `prescription_code` — gọi sau khi dispense

**Critical edge case:**
- 2 user cùng kê đơn cho cùng BN → cuối ghi đè (cần test)
- Submit cổng QG 2 lần cùng `prescriptionId` → DB UNIQUE filtered chặn (TC-NP-008/009)
- FEFO chọn nhầm lô hết hạn → DB phải có `ExpiryDate` query đúng
- Phát thuốc khi tồn kho < số lượng kê → reject + warning

---

### 2.7 Billing + Insurance Flow (Thu ngân + BHYT)

| Trường | Giá trị |
|---|---|
| **URL** | `/billing`, `/insurance`, `/payment-transactions`, `/payment-reports`, `/bhxh-audit`, `/bhxh-config` |
| **Menu** | Tài chính → 9 menu item (`MainLayout.tsx:212-221`) |
| **Service BE** | `BillingCompleteService` + `PaymentGatewayService` + `InsuranceXmlService` + `BhxhGatewayClient` |
| **DB table** | `Receipts`, `ReceiptDetails`, `InvoiceSummaries`, `Deposits`, `CashBooks`, `Payments`, `InsuranceClaims` |

**Flow detail (dựa `data-flow.md` §2.6 + §2.9):**

| Bước | Action | Role | Input | Output | Integration |
|---|---|---|---|---|---|
| 1 | Tổng hợp chi phí khi BN kết thúc điều trị | (auto) | `medicalRecordId` | `InvoiceSummary` | — |
| 2 | Tách chi phí theo nguồn (BHYT / BN trả / Khác) | (auto) | `InvoiceSummary` | `Receipt.BhytAmount`, `.PatientAmount`, `.OtherAmount` | — |
| 3 | Tạm ứng | ACCOUNTANT | `patientId`, `amount` | `Deposits` row | `POST /api/billing/deposit` |
| 4 | Thanh toán | ACCOUNTANT / patient (QR) | `receiptId`, `amount`, `method` | `Payments` row, `Receipt.Status=Paid` | `POST /api/billing/payment` hoặc IPN |
| 5 | (Optional) Thanh toán qua MoMo/ZaloPay/VnPay | patient | `receiptId` | QR code + IPN callback | `PaymentGatewayService` |
| 6 | Auto-issue hóa đơn điện tử | (auto sau IPN) | `paymentId` | `Invoice` gửi cơ quan thuế | `PaymentGatewayService.AutoIssueElectronicInvoiceAsync` |
| 7 | Giám định BHYT | (auto/manual) | `medicalRecordId` | `InsuranceClaim` | `InsuranceXmlService` |
| 8 | Xuất XML 130 / 4210 / 4750 / 3176 | INSURANCE_OFFICER | (multi) | XML file | `InsuranceXmlService.ExportXmlAsync` |
| 9 | Gửi cổng BHXH | (auto) | XML | Response code | `BhxhGatewayClient.SubmitClaimAsync` |
| 10 | Tách báo cáo doanh thu theo thu ngân | (auto) | (date range) | (read-only aggregate) | — |

**Upstream:** OPD / IPD / CLS / Pharmacy / Surgery / Blood Bank

**Downstream:**
- BHYT (xuất XML)
- Finance (báo cáo doanh thu)
- Tax authority (hóa đơn điện tử)
- **NangCap23 Zalo OA** — có thể gửi tin "appointment_reminder" sau khi thanh toán

**NangCap23 touchpoint:**
- ✅ Quality Dashboard view "Doanh thu" query `Receipts` (read-only)
- ⚠️ **BHXH gateway != National Prescription/Pharmacy gateway** — 2 cổng độc lập, NangCap23 không thay thế

**Critical edge case:**
- Race condition 2 cashier cùng thu 1 receipt → DB transaction phải atomic
- IPN MoMo/ZaloPay đến trễ → `Payment.Status` phải reconcile được
- Trùng MAC HMAC payload payment → DB unique chặn duplicate IPN

---

### 2.8 Functional Diagnostics Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/functional-diagnostics`, `/v2/functional-diagnostics` |
| **Menu** | Cận lâm sàng → "Thăm dò chức năng" (`MainLayout.tsx:185`) |
| **Page** | `pages/FunctionalDiagnostics.tsx`, `pages-v2/FunctionalDiagnostics.tsx` |
| **API client** | `api/nangcap23.ts` export `fdt` (line 602–631) |
| **Service BE** | `FunctionalDiagnosticsService` (`NangCap23Services.cs:1639+`) |
| **Controller BE** | `FunctionalDiagnosticsController` (`NangCap23Controllers.cs:319+`) |
| **DB table** | `FunctionalDiagnosticTests` + 17 index |

**Flow detail (8 loại test: ECG, ECGStress, Endoscopy, BoneDensity, EEG, EMG, Spirometry, Audiometry):**

| Bước | Action | Role | Trạng thái trước | Trạng thái sau | API | State guard |
|---|---|---|---|---|---|---|
| 1 | (Optional) Chỉ định FDT từ OPD/IPD → `ServiceRequestDetail` | DOCTOR | — | `ServiceRequestDetail.RequestType=FunctionalDiagnostic` | (qua OPD/IPD) | — |
| 2 | KTV tạo phiếu FDT | NURSE / LAB_TECH (khoa CLS) | (chưa có row) | `Status=0` (Requested), `TestCode` sinh tự động | `POST /api/functional-diagnostics` | — |
| 3 | KTV thực hiện thăm dò + nhập Findings + MeasurementsJson | NURSE / LAB_TECH | `Status=0` | `Status=2` (Completed), `Findings`, `Conclusion` | `POST /api/functional-diagnostics/{id}/complete` | (transition tự do, không có state guard riêng) |
| 4 | BS xét duyệt (4-eyes) | DOCTOR | `Status=2` | `Status=3` (Verified), `VerifiedById`, `VerifiedAt` | `POST /api/functional-diagnostics/{id}/verify` | `Nangcap23StateMachine.EnsureCanVerifyDiagnostic` |
| 5 | (Optional) Xóa | DOCTOR / Admin | (any) | `IsDeleted=true` | `DELETE /api/functional-diagnostics/{id}` | (soft delete) |

**Upstream:** OPD / IPD (chỉ định qua `ServiceRequestDetailId`)

**Downstream:**
- OPD / IPD (BS thấy KQ trên EMR)
- Quality Dashboard (view "CLS" count `pending + completed`)
- Billing (tính phí FDT qua `Service.Price`)

**NangCap23 self-contained:** Entity + Service + Controller hoàn toàn mới.

**State machine guard (`Nangcap23StateMachine.cs:55-66`):**
- `Verify` chỉ hợp lệ khi `Status=2` (Completed)
- `Status=0` (Requested) → throw "Phiếu thăm dò chức năng chưa thực hiện — không thể duyệt"
- `Status=1` (InProgress) → "Phiếu đang thực hiện — vui lòng hoàn tất trước khi duyệt"
- `Status=3` (Verified) → "Phiếu đã được duyệt rồi"
- `Status=4` (Cancelled) → "Phiếu đã hủy — không thể duyệt"

**Edge case:**
- `MeasurementsJson` invalid JSON khi GET → FE phải defensive parse
- 2 KTV cùng Complete cùng record → last-write-win (chưa có UNIQUE check)
- TestType ngoài 8 enum → backend không validate, nên add validator

---

### 2.9 Linen + Sterilization Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/linen-management`, `/v2/linen-management` |
| **Menu** | Quản lý → "Đồ giặt & Tiệt trùng" |
| **API client** | `api/nangcap23.ts` export `linen` (line 488–541) |
| **Service BE** | `LinenManagementService` (`NangCap23Services.cs:1269+`) |
| **DB table** | `LinenItems`, `LinenTransactions`, `SterilizationSchedules` |

**Flow detail — Linen Transaction (giao/nhận đồ giặt):**

| Bước | Action | Role | Status trước | Status sau | State machine |
|---|---|---|---|---|---|
| 1 | Tạo draft transaction Dispatch (gửi đi giặt) | NURSE (khoa) | — | `Status=0` (Draft), `TransactionCode` sinh tự động | — |
| 2 | Gửi đi nhà giặt | NURSE | `Status=0` | `Status=1` (Dispatched) | `EnsureValidLinenTransition(0→1)` |
| 3 | Nhận về | NURSE | `Status=1` | `Status=2` (Received) | `EnsureValidLinenTransition(1→2)` |
| 4 | Đối soát (kiểm đếm) | NURSE / MANAGER | `Status=2` | `Status=3` (Reconciled) | `EnsureValidLinenTransition(2→3)` |
| 5 | Hủy (sớm) | NURSE / Admin | `0|1|2` | `Status=4` (Cancelled) | `EnsureValidLinenTransition(*→4)` |

**Skip status không hợp lệ** (TC-LIN-009): `0→3` (skip Received) → 400 `INVALID_STATE`.
Idempotent: `from==to` → không lỗi.

**Flow detail — Sterilization Schedule (lịch tiệt trùng phòng):**

| Bước | Action | Role | Status trước | Status sau | State machine |
|---|---|---|---|---|---|
| 1 | Lên lịch tiệt trùng (phòng mổ / ICU) | MANAGER (KSNK) | — | `Status=0` (Scheduled) | — |
| 2 | Bắt đầu | NURSE | `Status=0` | `Status=1` (InProgress), `StartedAt=now` | `EnsureValidSterilizationTransition(0→1)` |
| 3 | Hoàn tất + cấy mẫu | NURSE | `Status=1` | `Status=2` (Completed), `CompletedAt`, `CultureResult` | `EnsureValidSterilizationTransition(1→2)` |
| 4 | Cấy thất bại (Culture Fail) | NURSE | `Status=1` | `Status=3` (Failed) | `EnsureValidSterilizationTransition(1→3)` |
| 5 | Hủy | MANAGER | `0|1` | `Status=4` | `EnsureValidSterilizationTransition(*→4)` |

**Upstream / Downstream:**
- Linen Item (catalog) là master data cho Transaction
- **Standalone** — không cross-module với clinical workflow
- KSNK report có thể tham chiếu Sterilization history

**Edge case:**
- `DetailsJson` malformed → 400 `INVALID_JSON`
- Số lượng âm trong `detailsJson` → backend chưa validate, có thể fix sau
- Soft delete idempotent (TC-LIN-004): xóa 2 lần đều `{success:true}`

---

### 2.10 Đề án 06 — GCS / GBT / DLHC Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/de-an-06`, `/v2/de-an-06` |
| **Menu** | Liên thông → "Đề án 06 (GCS/GBT/DLHC)" |
| **API client** | `api/nangcap23.ts` export `deAn06` (line 337–388) |
| **Service BE** | `DeAn06CertificateService` (`NangCap23Services.cs:684+`) |
| **External gateway** | `https://gdbhyt.baohiemxahoi.gov.vn` (qua `HttpDeAn06GatewayClient`) |
| **DB table** | `BirthCertificateRecords`, `DeathCertificateRecords`, `DrivingLicenseHealthChecks` |

**Flow 1 — Birth Certificate (GCS):**

| Bước | Action | Role | Status trước | Status sau | API | Side effect |
|---|---|---|---|---|---|---|
| 1 | Khoa Sản tạo GCS sau khi đẻ | DOCTOR / MIDWIFE | — | `Da06Status=0` (NotSubmitted), `CertificateNumber=GCS-{ts}` | `POST /api/de-an-06/birth-certificates` | — |
| 2 | Update GCS (vd. điền `ChildName`) | DOCTOR / MIDWIFE | (any) | (giữ `CertificateNumber`) | `POST /api/de-an-06/birth-certificates` với `id` | — |
| 3 | Submit Đề án 06 | ADMIN / DOCTOR / **MIDWIFE** | `Da06Status=0|3` | Phase 1: `=1` (Submitted) → Phase 2 ack: `=2` hoặc `=3` | `POST /api/de-an-06/birth-certificates/{id}/submit` | HTTP POST `Authorization: Bearer <DeAn06:AccessToken>` |

**Flow 2 — Death Certificate (GBT):** tương tự, role Submit = `Admin,Doctor` (không có Midwife). Trigger từ Inpatient Discharge khi `MannerOfDeath != null`.

**Flow 3 — Driving License Health Check (DLHC):** quan trọng nhất, có **auto-compute eligibility**.

| Bước | Action | Role | Field test | Auto-compute |
|---|---|---|---|---|
| 1 | Khoa khám SK lái xe tạo phiếu | DOCTOR | `LicenseClass`, 48 trường y khoa | — |
| 2 | Save → `DrivingLicenseEligibility.Recompute(entity)` | (auto) | — | Set `EligibleToDrive` theo `LicenseClass` + `DrugTestPerformed/Positive` + `AlcoholLevelMgPercent < 50` + `basicHealthOk` |
| 3 | Submit Đề án 06 | DOCTOR | — | Recompute **lại lần 2** (defense-in-depth) trước khi gửi gateway |

**Auto-compute rule** (file `DrivingLicenseEligibility.cs`):
- Hạng thương mại (B1+, C, D, E, F, FB, FC, FD, FE): **bắt buộc** test ma túy + cồn mới đủ điều kiện
- Hạng cá nhân (A1, A2, A3): permissive
- Server **không tin** `eligibleToDrive` client gửi — luôn override (log INFO khi thay đổi)

**Upstream:**
- Patient (mẹ cho GCS, BN cho GBT/DLHC)
- MedicalRecord (GCS optional, GBT optional)
- Examination (DLHC optional)

**Downstream:**
- BHXH/Bộ Y tế (qua Đề án 06 liên thông)
- Quality Dashboard không trực tiếp query Đề án 06 entity

**Edge case:**
- `BirthDateTime > now` → backend không reject (DTO không có validator) — **nguy cơ tiềm ẩn**
- `DeathDateTime > CertifyingDate` → backend không validate
- Twin/Triplet: `singletonOrMultiple=2/3` → cần 2/3 GCS riêng (UI chưa enforce)
- Permission test: Submit GCS Role `Nurse` → 403; Role `Midwife` → 200

---

### 2.11 National Prescription Gateway Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/national-gateways` tab "Đơn thuốc QG" |
| **API client** | `api/nangcap23.ts` export `npGateway` (line 52–85) |
| **Service BE** | `NationalPrescriptionGatewayService` (`NangCap23Services.cs:30+`) |
| **External gateway** | `https://donthuocquocgia.vn` (theo QĐ 808/QĐ-BYT 2022) |
| **DB table** | `NationalPrescriptionSubmissions` + UNIQUE filtered index `UX_NationalPrescriptionSubmissions_PrescriptionId_Active` |
| **Background worker** | `Nangcap23RetryWorker.ProcessStuckPrescriptionsAsync` |

**Flow detail — 2-Phase Save Pattern (critical):**

| Phase | Action | Service step | DB | Network |
|---|---|---|---|---|
| 0 | Validate DTO | `if (PrescriptionId==Empty) throw` | — | — |
| 0 | Check duplicate (app-level) | `if (existing AND Status != 4) throw` | SELECT | — |
| 0 | Load Prescription + Patient + Details + Medicine | `Include().ThenInclude()` | SELECT | — |
| 0 | Check `if (!rx.Details.Any()) throw` (đơn rỗng) | — | — | — |
| 0 | Build payload JSON | `JsonSerializer.Serialize(payload)` | — | — |
| **1** | Insert row Status=1 (Submitted) | `_db.SaveChangesAsync(ct)` | **INSERT** (UNIQUE chặn race) | — |
| **2** | Gọi gateway | `await _client.SubmitAsync(payload, ct)` | — | **HTTP POST /api/prescription/submit** (X-API-Key + X-Idempotency-Key) |
| 2.a | Acknowledged | Set `Status=2`, `GatewayTransactionId`, `AcknowledgedAt` | UPDATE | — |
| 2.b | 4xx (rejected) | Set `Status=3`, `ErrorCode`, `ErrorMessage` | UPDATE | — |
| 2.c | 5xx / Network / Timeout / CIRCUIT_OPEN | Giữ `Status=1` (cho worker retry) | UPDATE (chỉ field error) | — |
| 2.d | User cancel | Throw `OperationCanceledException` → 499 | — (row giữ Status=1) | — |
| 2.e | Phase 2 SaveChanges fail sau gateway ACK | Log `[NANGCAP23-ALERT]` CRITICAL | (transaction rollback) | — |

**Retry flow:**
- Manual: `POST /national-prescription-gateway/{id}/retry` — `Nangcap23StateMachine.EnsureCanRetry`
- Auto: `Nangcap23RetryWorker` quét row Status=1 stuck > 5 phút mỗi 60s, retry tới 3 lần

**Cancel flow:**
- `POST /national-prescription-gateway/{id}/cancel` — `Nangcap23StateMachine.EnsureCanCancel`
- Reject nếu `Status=2` (Acked) hoặc `Status=4` (Cancelled)

**Upstream:**
- **Prescription** (`Prescriptions` + `PrescriptionDetails` + `Medicines` + `Patients`)
- BS đã có CCCD + chứng chỉ hành nghề

**Downstream:**
- Không có module nào downstream gọi NangCap23 service này
- Background worker là consumer duy nhất

**External integration:**
- POST `/api/prescription/submit` Content-Type: `application/json`, header `X-API-Key: <ApiKey>`, header `X-Idempotency-Key: <SubmissionCode>`
- Polly Circuit Breaker: 5 lỗi liên tiếp → mở 30s
- Retry exponential backoff 1s/2s/4s
- Timeout 30s mặc định

---

### 2.12 National Pharmacy Report Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/national-gateways` tab "Dược QG" |
| **API client** | `api/nangcap23.ts` export `nphGateway` (line 123–144) |
| **Service BE** | `NationalPharmacyGatewayService` (`NangCap23Services.cs:408+`) |
| **External gateway** | `https://duocquocgia.com.vn` (theo CV 2406/QLD-Ttra 2018) |
| **DB table** | `NationalPharmacyOutboundReports` + UNIQUE filtered `UX_NationalPharmacyReports_TypeP_Active` (Status=2) |

**Flow detail:**

| Bước | Action | Role | Input | Output |
|---|---|---|---|---|
| 1 | Dược sĩ chọn loại báo cáo + period | PHARMACIST / PharmacyHead | `reportType` (DailySale / MonthlyInventory / NarcoticReport / Recall), `periodFrom`, `periodTo` | — |
| 2 | Validate: `periodFrom <= periodTo` + `periodTo ≤ today+1` + `reportType ∈ allowed` | (auto) | — | — |
| 3 | Aggregate data từ `StockMovements` + `Medicines` trong period | (service) | — | XML payload theo schema CV 2406 |
| 4 | Insert row + submit gateway (Content-Type: `application/xml`, X-Report-Type header) | (auto, same 2-phase save as Prescription) | — | `Status=1/2/3` |

**Idempotency:** UNIQUE filtered chặn 2 báo cáo cùng `(ReportType, PeriodFrom, PeriodTo)` khi `Status=2` (đã ack).

**Upstream:** Pharmacy module (StockMovements + Medicines)

**Downstream:** Không có

---

### 2.13 Zalo OA / ZNS Notification Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/zalo-notifications`, `/v2/zalo-notifications` |
| **Menu** | Liên thông → "Zalo OA / ZNS" |
| **API client** | `api/nangcap23.ts` export `zalo` (line 682–711) |
| **Service BE** | `ZaloNotificationService` (`NangCap23Services.cs:1838+`) |
| **External gateway** | `https://business.openapi.zalo.me/message/template` |
| **DB table** | `ZaloNotificationLogs` |

**Flow detail:**

| Bước | Action | Role | Input | Output |
|---|---|---|---|---|
| 1 | User chọn template + nhập SDT + params | (any auth user) | `templateId` ∈ {appointment_reminder / lab_result_ready / prescription_dispense / medicine_reminder}, `targetPhone`, `templateParams` | — |
| 2 | Validate phone (9–12 digit) + templateId không rỗng | (auto) | — | — |
| 3 | Build body `{phone, template_id, template_data}` | (auto) | — | JSON payload |
| 4 | POST gateway với header `access_token` | (auto) | — | `Status=2` (Delivered) hoặc `Status=3` (Failed) |
| 5 | Retry trên log Failed | (any auth user) | `id` | (state guard: reject nếu `Status=2`) |

**Special config semantic — `ZaloConfigDto.AccessToken`** (DTO XML doc):
- `null` → giữ token cũ
- `"***"` → giữ token cũ (UI gửi mask khi không sửa)
- `""` → CLEAR token (vô hiệu hóa)
- chuỗi khác → cập nhật (encrypted server-side)

**Upstream candidate (chưa wire vào workflow tự động):**
- Appointment (template `appointment_reminder`)
- LabResult (template `lab_result_ready`)
- Prescription dispensed (template `prescription_dispense`)
- (sau này) reminder uống thuốc

**Downstream:** Không có (terminal)

**Parallel với SMS module hiện có** — KHÔNG thay thế.

**Critical edge case (auto fail-fast trong `HttpZaloOaClient`):**
- AccessToken rỗng (prod, MockMode=false) → ErrorCode `MISSING_ACCESS_TOKEN`, không gọi gateway
- payloadJson malformed → ErrorCode `INVALID_PAYLOAD`, không retry

---

### 2.14 Quality Dashboard Flow [NangCap23]

| Trường | Giá trị |
|---|---|
| **URL** | `/quality-dashboard-live`, `/v2/quality-dashboard-live` |
| **Menu** | Quản lý → "DB Chất lượng (live)" |
| **API client** | `api/nangcap23.ts` export `qualityDash` (line 783–808) |
| **Service BE** | `QualityDashboardService` (`NangCap23Services.cs:2081+`) |
| **Auto-refresh** | 60s (FE polling) |
| **DB table aggregate** | `QueueTickets`, `Examinations`, `Admissions`, `Discharges`, `RadiologyRequests`, `FunctionalDiagnosticTests`, `PathologyRequests`, `LabRequestItems`, `Services`, `Receipts`, `Departments`, `Users` |

**Flow detail — 5 view nested:**

| View | Source data | Aggregate logic |
|---|---|---|
| **Phòng khám** | `QueueTickets`, `Examinations` | Group theo `RoomId` → đếm Waiting / InProgress / Completed |
| **Nội trú theo khoa** | `Admissions`, `Discharges` (theo `DepartmentId`) | Đếm Present / Admitted today / Discharged today + sum TotalCost / TotalDeposit / Receivable |
| **CLS** | `RadiologyRequests`, `FunctionalDiagnosticTests`, `PathologyRequests` | Group theo TypeName → đếm Pending / Completed |
| **Lab** | `LabRequestItems` JOIN `Services.ServiceGroup` | Group theo CategoryName (Huyết học / Sinh hóa / Vi sinh / Miễn dịch) → Pending / Completed |
| **Doanh thu** | `Receipts` | Sum Outpatient + Inpatient + group theo Cashier |

**Read-only — không write effect.**

**Schema drift handling:**
- `GetLabStatusAsync` có defensive try/catch — nếu `LabRequestItems.Service` drift → log error + trả empty list (không 500)

**Upstream:** Tất cả module clinical + finance

**Downstream:** Không có (terminal view)

**Edge case:**
- `asOfDate=2099-01-01` (tương lai) → empty data, không crash
- DB rỗng → tất cả zero, vẫn 200
- 60s auto-refresh dài hạn → manual test 30 phút verify Chrome heap không leak

---

## 3. Module Dependency Map

### 3.1 Sơ đồ dependency tổng thể (chain workflow chính)

```
Reception ──(Patient, MedicalRecord, QueueTicket)──▶ OPD ──(Examination, Diagnosis)──▶
                                                       │
                                                       ├──▶ ServiceRequest ──▶ LIS (Lab) ──┐
                                                       ├──▶ ServiceRequest ──▶ RIS (Rad) ──┤
                                                       ├──▶ ServiceRequest ──▶ FDT 🆕23 ──┤
                                                       │                                    │
                                                       └──▶ Prescription ──▶ Pharmacy ──┐  │
                                                                         │             │  │
                                                                         └──▶ Cổng QG 🆕23│  │
                                                                                       │  │
                                                                       (kết quả CLS) ◀─┘  │
                                                                                          │
                                                       OPD/IPD ◀──(kết luận, đơn) ─────┘
                                                       │
                                                       ▼
                                                    Billing ──(Receipt)──▶ Insurance ──▶ BHXH
                                                       │
                                                       └──▶ Quality Dashboard 🆕23
```

🆕23 = module mới NangCap23 chạm vào workflow

### 3.2 Bảng dependency NangCap23 → module hiện có (READ)

| NangCap23 module | READ từ | Mức độ phụ thuộc |
|---|---|---|
| National Prescription Gateway | `Prescriptions`, `PrescriptionDetails`, `Medicines`, `Patients`, `MedicalRecords` | **HIGH** — fail nếu Prescription schema thay đổi |
| National Pharmacy Gateway | `StockMovements`, `Medicines`, `Suppliers` (suy ra payload) | MEDIUM |
| Đề án 06 GCS | `Patients` (mẹ + bé), `MedicalRecords` | MEDIUM |
| Đề án 06 GBT | `Patients`, `MedicalRecords` | MEDIUM |
| Đề án 06 DLHC | `Patients`, `Examinations` | MEDIUM |
| Linen + Sterilization | `Departments`, `Rooms` (FK only) | LOW |
| Functional Diagnostics | `Patients`, `MedicalRecords`, `Examinations`, `ServiceRequestDetails` | MEDIUM |
| Zalo OA | `Patients` (lấy SDT) | LOW |
| Quality Dashboard | 7 bảng aggregate | **HIGH** — schema drift trên `LabRequestItems` đã handle bằng try/catch |

### 3.3 Bảng dependency NangCap23 → external (WRITE)

| NangCap23 module | WRITE tới external | Protocol |
|---|---|---|
| National Prescription Gateway | `donthuocquocgia.vn` | HTTPS POST JSON, X-API-Key |
| National Pharmacy Gateway | `duocquocgia.com.vn` | HTTPS POST XML (CV 2406 schema), X-Report-Type |
| Đề án 06 (GCS/GBT/DLHC) | `gdbhyt.baohiemxahoi.gov.vn` | HTTPS POST JSON, Bearer Token |
| Zalo OA / ZNS | `business.openapi.zalo.me` | HTTPS POST JSON, access_token header |
| Quality Dashboard | (không) | — |
| Linen + Sterilization | (không) | — |
| Functional Diagnostics | (không) | — |

### 3.4 Module hiện có → NangCap23 (chưa có chỗ gọi tự động)

| Module hiện có | Có thể trigger NangCap23 (chưa implement) | Effort thêm |
|---|---|---|
| Prescription (sau khi save) | `POST /national-prescription-gateway/submit` | ~1 ngày (auto-submit toggle có sẵn trong config) |
| Pharmacy daily-close | `POST /national-pharmacy/generate` cho DailySale | ~0.5 ngày |
| Inpatient Discharge với `MannerOfDeath != null` | Tạo GBT + auto-submit | ~1 ngày |
| Sản khoa sau khi đẻ | Tạo GCS + auto-submit | ~1 ngày |
| OPD khám SK lái xe | Tạo DLHC (đã có UI, chưa auto-trigger) | ~0.5 ngày |
| Appointment booking | Gửi Zalo `appointment_reminder` | ~0.5 ngày |
| LabResult approved | Gửi Zalo `lab_result_ready` | ~0.5 ngày |
| Prescription dispensed | Gửi Zalo `prescription_dispense` | ~0.5 ngày |

→ Tất cả là **manual** hiện tại. NangCap23 không yêu cầu auto-wire — chỉ provide service.

### 3.5 Nếu module X thay đổi → regression area

| Thay đổi tại | Phải regression test |
|---|---|
| `Prescription/PrescriptionDetail/Medicine` schema | National Prescription Gateway (TC-NP-001..011) |
| `Patient` schema (Identity / FullName / DateOfBirth) | GCS, GBT, DLHC, Zalo (lookup SDT), National Prescription (build payload) |
| `MedicalRecord` schema | GCS, GBT optional reference |
| `Examination` schema | DLHC optional reference |
| `Department/Room` schema | Linen Sterilization (FK) |
| `QueueTickets/Examinations` schema | Quality Dashboard Clinic Queue view |
| `Admissions/Discharges` schema | Quality Dashboard Inpatient view |
| `RadiologyRequests/PathologyRequests` schema | Quality Dashboard CLS view |
| `LabRequestItems/Services.ServiceGroup` schema | Quality Dashboard Lab view (đã có defensive try/catch) |
| `Receipts` schema | Quality Dashboard Revenue view |
| `SystemConfigs` schema | `NangCap23ConfigStore` (đã có UNIQUE filtered index protection) |
| Audit log middleware | Toàn bộ POST/PUT/DELETE NangCap23 endpoint |

---

## 4. UI Test Matrix

Áp dụng cho **6 page NangCap23** (v1 + v2 = 12 page).

Cột "✅" = test bắt buộc, "—" = không áp dụng cho page đó.

| Mục test | Reception | OPD | Pharmacy | Billing | National Gateways 🆕23 | Đề án 06 🆕23 | Linen 🆕23 | FDT 🆕23 | Zalo 🆕23 | QDashboard 🆕23 |
|---|---|---|---|---|---|---|---|---|---|---|
| **URL** | `/reception` | `/opd` | `/pharmacy` | `/billing` | `/national-gateways` | `/de-an-06` | `/linen-management` | `/functional-diagnostics` | `/zalo-notifications` | `/quality-dashboard-live` |
| Page load 200 OK | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Role-based hiển thị | ✅ | ✅ | ✅ | ✅ | ✅ (Admin tab Config) | ✅ (Submit Midwife/Doctor) | ✅ | ✅ (Verify Doctor) | ✅ (Admin tab Config) | ✅ |
| Empty state ("Chưa có dữ liệu") | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (DB rỗng) |
| Loading state (spinner) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (auto-refresh) |
| Search input + debounce | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Filter dropdown (status / type / date range) | ✅ | ✅ | ✅ | ✅ | ✅ (status, dateRange) | ✅ (da06Status) | ✅ (status, type) | ✅ (testType, status) | ✅ (status, dateRange) | ✅ (asOfDate) |
| Pagination (pageIndex + pageSize) | ✅ | ✅ | ✅ | ✅ | ✅ (default pageSize=50) | ✅ | ✅ | ✅ | ✅ | — |
| Table sort | ✅ | ✅ | ✅ | ✅ | ⚠️ chưa enforce | ⚠️ | ⚠️ | ⚠️ | ⚠️ | — |
| Click row → Drawer detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Modal create / edit | ✅ | ✅ | ✅ | ✅ | ✅ (Generate / Submit) | ✅ (Save) | ✅ (Save) | ✅ (Save) | ✅ (Send) | — |
| Modal validation message tiếng Việt | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Action button (Submit / Retry / Cancel) | ✅ | ✅ | ✅ | ✅ | ✅ Submit/Retry/Cancel | ✅ Submit | ✅ Status change | ✅ Complete/Verify/Delete | ✅ Send/Retry | — |
| Print/Export | ✅ (phiếu khám) | ✅ (phiếu khám) | ✅ (đơn thuốc) | ✅ (hóa đơn) | — | ✅ (in giấy chứng nhận, theo source) | — | ✅ (in KQ FDT, theo source) | — | — |
| Permission denial 403 | ✅ | ✅ | ✅ | ✅ | ✅ (Nurse → /config = 403) | ✅ (Nurse → submit GCS = 403) | ✅ (Authorize) | ✅ (Nurse → /verify = 403) | ✅ (Nurse → /config = 403) | ✅ (Authorize) |
| Error 4xx hiển thị toast | ✅ | ✅ | ✅ | ✅ | ✅ (`VALIDATION_FAILED`, `INVALID_STATE`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error 5xx hiển thị fallback | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Session timeout (JWT expire 15 min) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit log entry sau mutation | ✅ | ✅ | ✅ | ✅ | ✅ (`POST /submit/retry/cancel/config`) | ✅ (`POST /save/submit`) | ✅ (`POST/DELETE`) | ✅ (`POST/DELETE`) | ✅ (`POST /send/retry/config`) | — (read-only) |
| Responsive (mobile/tablet/desktop) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dark mode (ThemeContext) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vietnamese diacritic input | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (ChildName) | ✅ (Notes) | ✅ (Findings) | ✅ (templateParams) | — |

⚠️ = chưa enforce trong code, có thể add sau.

### 4.1 Quy tắc test mỗi modal/drawer NangCap23

Áp dụng cho mọi modal/drawer trong 6 page mới:
- [ ] Open via row click hoặc nút action
- [ ] Drawer title đúng (vd. "Chi tiết đơn thuốc QG", "Cấu hình Zalo OA")
- [ ] Field render dữ liệu từ Detail DTO
- [ ] Field sensitive (AccessToken) hiển thị `"***"` không leak
- [ ] Close button + ESC key đóng modal
- [ ] Submit button disabled khi loading
- [ ] Submit success → toast + close + reload list
- [ ] Submit fail → toast với message tiếng Việt
- [ ] Modal có `destroyOnHidden` (Antd v6) tránh stale state

---

## 5. Critical Medical Risk Test

Đây là test ưu tiên cao nhất vì liên quan **patient safety**, **financial loss**,
**legal/compliance**.

### 5.1 Sai patient mapping

| Risk scenario | Endpoint liên quan | Test case | Expected |
|---|---|---|---|
| GCS gán nhầm mẹ (sai `MotherPatientId`) | `POST /api/de-an-06/birth-certificates` | Tạo GCS với `motherPatientId=<của BN khác>` | UI cảnh báo + confirm trước save (audit log) |
| GBT gán nhầm BN | `POST /api/de-an-06/death-certificates` | Tạo GBT với `patientId` không phải BN tử vong | Audit log ghi đầy đủ + manual reconcile |
| DLHC gán nhầm BN | `POST /api/de-an-06/driving-license-checks` | Tạo DLHC sai BN | (same) |
| Prescription submit cổng QG với `prescriptionId` của BN A nhưng client gửi `doctorIdNumber` của BS B | `POST /api/national-prescription-gateway/submit` | (manual test) | Hệ thống chấp nhận — phụ thuộc nhập đúng từ FE; backend chỉ check rỗng |
| Zalo gửi tin tới SDT BN khác (BN có sửa SDT mới chưa update) | `POST /api/zalo-notification/send` | Send tới `targetPhone` cũ | Tin tới SDT cũ — cần FE pre-fetch SDT mới nhất từ Patient |

**Mitigation:** Audit log capture đầy đủ → trace + manual reconcile khi phát hiện.

### 5.2 Sai thuốc / liều lượng

| Risk scenario | Endpoint | Test |
|---|---|---|
| Submit Prescription với `prescriptionId` của đơn rỗng (không có Detail) | `/national-prescription-gateway/submit` | Backend reject 400 `INVALID_STATE, /Đơn thuốc trống/` (TC-NP-006) |
| Submit Prescription với `prescriptionType` sai (vd. `Outpatient` cho thuốc Narcotic) | (same) | Backend không cross-check — phụ thuộc FE gán đúng theo loại Medicine |
| Tương tác thuốc nghiêm trọng (severity=4) không block khi save Prescription | `POST /api/prescription` | `DrugInteractionService` block save (đã có sẵn, không phải NangCap23) |
| BN có dị ứng (DrugAllergy) nhưng vẫn kê được | `POST /api/prescription` | `DrugAllergyService` block (đã có sẵn) |
| Pharmacy phát thuốc với liều > liều kê | `POST /api/dispensing/issue` | (test sẵn có) |
| FEFO chọn nhầm lô hết hạn | `WarehouseCompleteService.AutoSelectBatchesAsync` | Test với batch `ExpiryDate < today` — không được pick |

### 5.3 Sai chỉ định CLS

| Risk scenario | Test |
|---|---|
| Chỉ định FDT loại `ECGStress` cho BN có MI (chống chỉ định) | Backend không check — phụ thuộc DOCTOR ghi nhớ; UI có thể thêm warning |
| Chỉ định Radiology CT có cản quang cho BN suy thận | (same — clinical decision, ngoài scope code) |
| Verify FDT trước khi Complete (4-eyes vi phạm) | `Nangcap23StateMachine.EnsureCanVerifyDiagnostic` → 400 `INVALID_STATE` (TC-FDT-006) |

### 5.4 Sai billing / BHYT

| Risk scenario | Endpoint | Test |
|---|---|---|
| Xuất XML 130 với chi phí vượt trần BHYT | `InsuranceXmlService.ExportXmlAsync` | Backend phải áp trần trước khi export |
| BHXH gateway trả mã lỗi → vẫn lưu `Status=Submitted` | `BhxhGatewayClient` | Phải parse response code + set Status đúng |
| 2 cashier cùng thu 1 receipt → 2 Payment row → tổng vượt amount | `POST /api/billing/payment` | DB transaction + check `Receipt.Status` trước insert Payment |
| Generate báo cáo Dược QG `DailySale` với period sai (vd. cuối kỳ chưa khóa) | `POST /api/national-pharmacy/generate` | TC-PH-004 reject `periodTo > today` |
| Submit báo cáo Dược 2 lần cùng kỳ → cổng QG nhận duplicate | (same) | DB UNIQUE filtered `UX_NationalPharmacyReports_TypeP_Active` chặn (Status=2) |

### 5.5 Race condition khi nhiều user thao tác

| Risk scenario | Endpoint | Test (cypress nangcap23-flow §7) |
|---|---|---|
| 2 user cùng Submit cùng Prescription < 100ms | `POST /national-prescription-gateway/submit` | 1 thành công + 1 = 409 `DUPLICATE` (TC-NP-009) qua DB UNIQUE filtered |
| 3 admin cùng SaveConfig | `POST /national-prescription-gateway/config` | Cuối cùng = last write, exact 1 active row (TC-CS-001) qua `Serializable transaction + retry-on-conflict` |
| 2 KTV cùng Complete FDT | `POST /functional-diagnostics/{id}/complete` | Last-write-win (chưa có UNIQUE check) |
| 2 NURSE cùng dispatch Linen Transaction `0→1` | `POST /linen/transactions/{id}/status/1` | Idempotent if `from==to`; nếu khác status → state machine check |
| 2 instance Cloud Run worker pick cùng row stuck | `Nangcap23RetryWorker` | 2 lần gọi gateway → idempotency-key giúp dedupe (nếu cổng support) |

### 5.6 Mất dữ liệu transaction

| Risk scenario | Phase nào | Mitigation |
|---|---|---|
| Phase 1 INSERT thành công, Phase 2 gọi gateway fail → mất kết quả | Phase 2 fail | Worker retry; row giữ Status=1, có ErrorCode |
| Phase 2 gateway ACK + Phase 3 SaveChanges fail (DB outage) → cổng nhận, DB không lưu | Phase 3 fail | Log `[NANGCAP23-ALERT]` CRITICAL + idempotency-key cổng dedupe (nếu support) + manual reconcile |
| User cancel browser giữa Phase 2 | Phase 2 abort | Row giữ Status=1, worker pick up sau StuckMinutes=5 |
| Cloud Run instance crash giữa Phase 2 | Phase 2 abort | (same) |
| DB rollback do tx fail | Phase 1 hoặc Phase 3 | UNIQUE filtered chặn re-INSERT từ retry → user thấy 409 |

### 5.7 Cache inconsistency

| Risk scenario | Mitigation |
|---|---|
| `ConfigStore` cache trong memory không invalidate khi update | `NangCap23ConfigStore` query DB mỗi lần `GetOrFallbackAsync` (không cache) |
| Redis cache outdated cho Quality Dashboard | Read-only aggregate query DB live (60s polling), không qua Redis |
| FE cache list NangCap23 sau khi save → stale | FE phải reload list sau mỗi mutation (test manual) |

### 5.8 Sync failure

| Risk scenario | Detection | Recovery |
|---|---|---|
| Background retry worker stuck > 5 min | Log "Nangcap23RetryWorker found N stuck..." | Tăng `MaxBatchSize` hoặc giảm `IntervalSeconds` |
| Circuit breaker mở vĩnh viễn | Cổng `CIRCUIT_OPEN` liên tục | 30s tự đóng → thử lại; nếu vẫn fail → contact gateway provider |
| Token Zalo hết hạn | ErrorCode `MISSING_ACCESS_TOKEN` hoặc 401 từ gateway | Admin lấy token mới, POST `/zalo-notification/config` |
| Data protection key bị mất sau restart Cloud Run | Decrypt fail trong ConfigStore log | `PersistKeysToDbContext` đảm bảo persist; check Program.cs:141 |

---

## 6. Integration Test (HL7/FHIR/LIS/RIS/PACS/External)

Tổng hợp từ `docs/MODULE_MAP.md` §6.

### 6.1 NangCap23 external integrations

| Integration | Direction | Implementation | Test type |
|---|---|---|---|
| Đơn thuốc QG | OUT POST JSON | `HttpNationalPrescriptionGatewayClient` | Integration với sandbox/staging |
| Dược QG (CV 2406) | OUT POST XML | `HttpNationalPharmacyGatewayClient` | (same) |
| Đề án 06 (3 cert) | OUT POST JSON Bearer | `HttpDeAn06GatewayClient` | (same) |
| Zalo OA | OUT POST JSON access_token | `HttpZaloOaClient` | (same) |

**Integration test plan (chỉ chạy được khi có credential):**

```bash
# Pre-condition: Cloud Run Staging có env vars thật
TOKEN=$(curl -s -X POST https://staging-his.example/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"...."}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# 1. Health check 4 gateway
for ep in national-prescription-gateway national-pharmacy zalo-notification; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    https://staging-his.example/api/$ep/test-connection
done
# Expected: {"connected": true} cho mỗi gateway

# 2. Submit 1 prescription thật
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://staging-his.example/api/national-prescription-gateway/submit \
  -d '{"prescriptionId":"<real>","prescriptionType":"Outpatient","doctorIdNumber":"...","doctorLicenseNumber":"..."}'
# Expected: gatewayTransactionId != null AND NOT starts with "MOCK-"

# 3-5. Tương tự cho Pharmacy / Đề án 06 / Zalo
```

### 6.2 Integration với HIS infra (đã có sẵn, không thay đổi)

| Integration | Liên quan NangCap23? | Hành vi |
|---|---|---|
| HL7 v2 inbound port 2576 | ❌ Không trực tiếp | LIS module độc lập, Quality Dashboard chỉ query kết quả |
| HL7 FHIR R4 | ❌ Không | EMR module, không tích hợp NangCap23 entity |
| HL7 CDA R2 | ❌ Không | Không export NangCap23 entity ra CDA |
| DICOM C-STORE port 4242 | ❌ Không | RIS module, Quality Dashboard query `RadiologyRequests` (không cần ảnh DICOM) |
| Orthanc REST API | ❌ Không | (same) |
| BHXH gateway | ❌ KHÁC với National Gateway | BHXH dùng cho Insurance XML 130/4210; NangCap23 dùng `gdbhyt.baohiemxahoi.gov.vn` qua endpoint `/api/v1/birth-certificates` v.v. |
| MoMo / ZaloPay / VnPay | ❌ Không | Payment gateway hiện có, độc lập với Zalo OA notification |
| SMS gateway (eSMS / SpeedSMS) | ⚠️ Song song | Zalo OA NangCap23 chạy song song, không thay thế SMS |
| Email SMTP | ⚠️ Song song | `ResultNotificationService` gửi email khi lab/radiology approved, không liên quan NangCap23 |
| USB Token CryptoAPI / PKCS#11 | ❌ Không | Digital signature module, không ký NangCap23 entity (chưa) |

### 6.3 Integration test ưu tiên

| Priority | Integration | Test scenario |
|---|---|---|
| HIGH | National Prescription Gateway sandbox | Submit 5 prescription thật, verify GatewayTransactionId pattern |
| HIGH | Đề án 06 sandbox | Submit 1 GCS + 1 GBT + 1 DLHC, verify Da06SubmissionId pattern |
| HIGH | Zalo OA sandbox/prod | Send 4 template tới SDT test, verify nhận tin trên Zalo app |
| MEDIUM | Pharmacy QG sandbox | Generate DailySale report với data thật |
| LOW | Circuit breaker stress | Gateway giả lập down 5 lần → mở mạch 30s → tự đóng |
| LOW | Worker recovery | Kill Cloud Run instance giữa Phase 2 → worker pick up sau 5 min |

---

## 7. Concurrent / Multi-user / Transaction Test

### 7.1 Concurrent access scenarios

| # | Scenario | Endpoint | Mitigation hiện có | Test cách nào |
|---|---|---|---|---|
| CC-01 | 2 reception cấp số xếp hàng cùng lúc | `POST /api/reception/queue-ticket` | DB transaction + sequential (kiểm tra trong codebase) | Cypress 2 cy.request parallel |
| CC-02 | 2 user Submit cùng Prescription | `POST /national-prescription-gateway/submit` | App check + DB UNIQUE filtered | TC-NP-009 |
| CC-03 | 3 admin POST cùng config | `POST /.../config` | Serializable tx + retry | TC-CS-001 |
| CC-04 | 2 worker pick cùng row stuck | (background) | Idempotency-key (nếu cổng support) | Manual: start 2 instance |
| CC-05 | 2 nurse cùng release Bed | `POST /api/inpatient/release-bed` | DB UNIQUE `(BedId, Status=Occupied)` | Cypress parallel |
| CC-06 | 2 cashier cùng thu 1 Receipt | `POST /api/billing/payment` | Receipt status check + tx | Cypress parallel |
| CC-07 | 2 KTV cùng Complete FDT | `POST /functional-diagnostics/{id}/complete` | Last-write-win (không có lock) | Cypress parallel |
| CC-08 | 2 instance Cloud Run cùng start config save | `POST /.../config` | Same as CC-03 | Manual 2 region |

### 7.2 Transaction rollback test

| Scenario | Trigger | Expected |
|---|---|---|
| Phase 1 INSERT fail (UNIQUE) | Submit duplicate prescriptionId | DB rollback, no row, return 409 |
| Phase 2 gateway throw | Force gateway 500 | Row giữ Status=1, ErrorCode set |
| Phase 3 SaveChanges fail | DB drop connection sau Phase 2 ack | Log CRITICAL `[NANGCAP23-ALERT]`, row Status=1 (chưa update lên 2), throw |
| Linen transaction status update giữa chừng fail | Disconnect DB giữa update | Status không đổi, không phantom row |
| ConfigStore SaveAsync trong Serializable tx | UNIQUE violation | Retry 3 lần × 50ms × attempt → finally throw nếu vẫn fail |

### 7.3 Session timeout / Token expiration

| Scenario | Test | Expected |
|---|---|---|
| JWT hết hạn 15 phút giữa Submit | Wait 16 min, gọi `POST /submit` | 401 (axios interceptor có thể tự logout) |
| User logout giữa khi worker đang chạy | Worker dùng `system:retry-worker` user, không phụ thuộc session | Worker tiếp tục chạy |
| Refresh token endpoint (nếu có) | (hệ thống không có refresh token theo `access-control-matrix.md`) | Re-login |

### 7.4 Audit log consistency

Tất cả mutation NangCap23 phải có entry trong `AuditLogs` table:

| Endpoint | UserId | EntityType | EntityId | Action |
|---|---|---|---|---|
| `POST /national-prescription-gateway/submit` | từ JWT | `NationalPrescriptionSubmission` | new Guid | POST |
| `POST /national-prescription-gateway/{id}/retry` | từ JWT | (same) | id | POST |
| `POST /de-an-06/birth-certificates` | từ JWT | `BirthCertificateRecord` | id | POST |
| `POST /linen/transactions` | từ JWT | `LinenTransaction` | new Guid | POST |
| `POST /linen/transactions/{id}/status/{newStatus}` | từ JWT | (same) | id | POST |
| `POST /zalo-notification/send` | từ JWT | `ZaloNotificationLog` | new Guid | POST |
| `POST /functional-diagnostics/{id}/verify` | từ JWT | `FunctionalDiagnosticTest` | id | POST |

**Verify:** GET `/api/audit/logs?entityType=NationalPrescriptionSubmission` sau khi
test → có row matching.

### 7.5 Medical data consistency

| Rule | Verify |
|---|---|
| Patient FK toàn vẹn (GCS/GBT/DLHC) | DELETE Patient → block hoặc cascade-soft-delete |
| Prescription submission status đồng bộ với Prescription | `NationalPrescriptionSubmission.PrescriptionId` luôn match `Prescriptions.Id` |
| `EligibleToDrive` luôn auto-compute | Verify backend log "DLHC eligibility re-corrected at Submit" nếu client gửi giá trị sai |
| Worker không double-process | `RetryCount` tăng đơn điệu, không reset |
| Audit log timestamp đồng bộ | Tất cả mutation NangCap23 có `CreatedAt`/`UpdatedAt` UTC |

### 7.6 Insurance validation

| Rule | NangCap23 chạm? | Verify |
|---|---|---|
| BHYT thẻ hết hạn → vẫn cho khám nhưng đánh dấu invalid | ❌ | (test Insurance module hiện có) |
| `Patient.InsuranceNumber` đúng format | ❌ | (test Reception) |
| Submit National Prescription Gateway với BN không BHYT | ⚠️ Backend không cross-check | Manual: thử submit với patient.InsuranceNumber=null |
| Báo cáo Dược QG cho thuốc BHYT vs OTC | ❌ | (Pharmacy categorize) |

### 7.7 Prescription validation

| Rule | Verify |
|---|---|
| Đơn rỗng (no Detail) → reject submit | TC-NP-006 |
| DoctorIdNumber + LicenseNumber bắt buộc | TC-NP-003, TC-NP-004 |
| PrescriptionType ∈ enum | TC-NP-005 |
| Tương tác thuốc severity=4 → block save Prescription | (đã có `DrugInteractionService`) |
| Allergy match → block save | (đã có `DrugAllergyService`) |

### 7.8 Inventory synchronization

| Rule | NangCap23 chạm? | Verify |
|---|---|---|
| FEFO picker chọn lô hết hạn trước | ❌ | (Pharmacy test) |
| Khi dispense, `StockMovements` insert + `MedicineStocks.Quantity` decrement atomic | ❌ | DB transaction (Pharmacy module) |
| Báo cáo `NationalPharmacy` `DailySale` sum đúng với `StockMovements` trong period | ⚠️ NangCap23 query | Manual: tổng `StockMovements.Quantity` WHERE date IN period == báo cáo |
| `MonthlyInventory` snapshot đúng `MedicineStocks` tại EOM | ⚠️ | (same logic) |

---

## 8. Mapping UI → Component → API → Service → DB → Integration

Bảng mapping đầy đủ cho 6 page NangCap23. Mỗi hàng = 1 hành động UI chính.

### 8.1 Page `/national-gateways`

| UI element | Component | API | Service | UseCase / Method | Repository / DbContext | DB table | External |
|---|---|---|---|---|---|---|---|
| Tab "Đơn thuốc QG" → bảng list | `NationalGateways.tsx` (v1/v2) | `GET /api/national-prescription-gateway` | `INationalPrescriptionGatewayService` | `SearchAsync(keyword, status, from, to, pageIndex, pageSize)` | `HISDbContext.NationalPrescriptionSubmissions` | `NationalPrescriptionSubmissions` (filtered IsDeleted=0) | — |
| Click row | (same) | `GET /api/national-prescription-gateway/{id}` | (same) | `GetByIdAsync(id)` | (same) | (same) | — |
| Nút "Submit" (modal) | (same) | `POST /api/national-prescription-gateway/submit` | (same) | `SubmitAsync(dto, userId, ct)` | + `Prescriptions`, `PrescriptionDetails`, `Medicines`, `Patients`, `MedicalRecords` | (same + read 5 bảng) | `donthuocquocgia.vn/api/prescription/submit` |
| Nút "Gửi lại" | (same) | `POST /api/national-prescription-gateway/{id}/retry` | (same) | `RetryAsync(id, userId)` (guard `EnsureCanRetry`) | (same) | UPDATE `NationalPrescriptionSubmissions` | (same) |
| Nút "Hủy" | (same) | `POST /api/national-prescription-gateway/{id}/cancel` | (same) | `CancelAsync(id, userId)` (guard `EnsureCanCancel`) | (same) | (same) | — |
| Tab "Dược QG" → bảng list | (same) | `GET /api/national-pharmacy` | `INationalPharmacyGatewayService` | `SearchAsync(reportType, status, from, to, pageIndex, pageSize)` | `NationalPharmacyOutboundReports` | (same) | — |
| Nút "Generate" (modal) | (same) | `POST /api/national-pharmacy/generate` | (same) | `GenerateAndSubmitAsync(dto, userId)` | + `StockMovements`, `Medicines` | (same + read) | `duocquocgia.com.vn/api/reports/upload` |
| Tab "Cấu hình" (Admin only) Get | (same) | `GET /api/national-prescription-gateway/config` | (same) | `GetConfigAsync()` | `NangCap23ConfigStore.GetOrFallbackAsync` | `SystemConfigs` | — |
| Tab "Cấu hình" Save | (same) | `POST /api/national-prescription-gateway/config` | (same) | `SaveConfigAsync(config, userId)` + `Nangcap23ConfigValidator.ValidateNationalGateway` | `NangCap23ConfigStore.SaveAsync` (Serializable tx) | UPSERT `SystemConfigs` (encrypted nếu sensitive) | — |

### 8.2 Page `/de-an-06`

| UI element | API | Service | Method | DB | External |
|---|---|---|---|---|---|
| Tab "GCS" list | `GET /api/de-an-06/birth-certificates` | `IDeAn06CertificateService` | `SearchBirthCertificatesAsync` | `BirthCertificateRecords` JOIN `Patients` | — |
| Tab "GCS" Save | `POST /api/de-an-06/birth-certificates` | (same) | `SaveBirthCertificateAsync` | UPSERT | — |
| Tab "GCS" Submit | `POST /api/de-an-06/birth-certificates/{id}/submit` (Midwife) | (same) | `SubmitBirthCertificateToDa06Async` | UPDATE | `gdbhyt.baohiemxahoi.gov.vn/api/v1/birth-certificates` |
| Tab "GBT" tương tự (Doctor) | `/death-certificates` | (same) | `*DeathCertificate*` | `DeathCertificateRecords` | `/api/v1/death-certificates` |
| Tab "DLHC" Save | `POST /api/de-an-06/driving-license-checks` | (same) | `SaveDrivingLicenseCheckAsync` + `DrivingLicenseEligibility.Recompute` | `DrivingLicenseHealthChecks` | — |
| Tab "DLHC" Submit | `POST /api/de-an-06/driving-license-checks/{id}/submit` (Doctor) | (same) | `SubmitDrivingLicenseCheckToDa06Async` + Recompute (defense-in-depth) | UPDATE | `/api/v1/driving-license-health-checks` |

### 8.3 Page `/linen-management`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Tab "Danh mục" list | `GET /api/linen/items` | `ILinenManagementService` | `ListLinenItemsAsync` | `LinenItems` |
| Tab "Danh mục" Save | `POST /api/linen/items` | (same) | `SaveLinenItemAsync` | UPSERT |
| Tab "Danh mục" Delete | `DELETE /api/linen/items/{id}` | (same) | `DeleteLinenItemAsync` | UPDATE `IsDeleted=1` |
| Tab "Giao nhận" list | `GET /api/linen/transactions` | (same) | `SearchTransactionsAsync` | `LinenTransactions` |
| Tab "Giao nhận" Save | `POST /api/linen/transactions` | (same) | `SaveTransactionAsync` | UPSERT |
| Tab "Giao nhận" Change status | `POST /api/linen/transactions/{id}/status/{newStatus}` | (same) | `UpdateTransactionStatusAsync` + `EnsureValidLinenTransition` | UPDATE |
| Tab "Lịch tiệt trùng" list | `GET /api/linen/sterilization-schedules` | (same) | `SearchSchedulesAsync` | `SterilizationSchedules` |
| Tab "Lịch tiệt trùng" Save | `POST /api/linen/sterilization-schedules` | (same) | `SaveScheduleAsync` | UPSERT |
| Tab "Lịch tiệt trùng" Change status | `POST /api/linen/sterilization-schedules/{id}/status/{newStatus}?cultureResult=` | (same) | `UpdateScheduleStatusAsync` + `EnsureValidSterilizationTransition` | UPDATE |

### 8.4 Page `/functional-diagnostics`

| UI element | API | Service | Method | DB |
|---|---|---|---|---|
| Dropdown "Loại" (8 type) | `GET /api/functional-diagnostics/test-types` (anonymous OK) | (controller hardcoded) | — | — |
| Bảng list | `GET /api/functional-diagnostics` | `IFunctionalDiagnosticsService` | `SearchAsync` | `FunctionalDiagnosticTests` JOIN `Patients` |
| Modal Create | `POST /api/functional-diagnostics` | (same) | `SaveAsync` | UPSERT |
| Nút "Hoàn tất" | `POST /api/functional-diagnostics/{id}/complete` | (same) | `CompleteAsync` | UPDATE Status=2 |
| Nút "Duyệt" (Doctor) | `POST /api/functional-diagnostics/{id}/verify` | (same) | `VerifyAsync` + `EnsureCanVerifyDiagnostic` | UPDATE Status=3, VerifiedById |
| Nút "Xóa" | `DELETE /api/functional-diagnostics/{id}` | (same) | `DeleteAsync` | UPDATE IsDeleted=1 |

### 8.5 Page `/zalo-notifications`

| UI element | API | Service | Method | DB | External |
|---|---|---|---|---|---|
| Dropdown template (4 cứng) | `GET /api/zalo-notification/templates` (anonymous) | (controller hardcoded) | — | — | — |
| Bảng logs | `GET /api/zalo-notification` | `IZaloNotificationService` | `SearchLogsAsync` | `ZaloNotificationLogs` | — |
| Modal "Gửi thử" Send | `POST /api/zalo-notification/send` | (same) | `SendAsync` | INSERT log | `business.openapi.zalo.me/message/template` |
| Nút "Gửi lại" | `POST /api/zalo-notification/{id}/retry` | (same) | `RetryAsync` (guard reject Status=2) | UPDATE | (same) |
| Tab "Cấu hình" Get (Admin) | `GET /api/zalo-notification/config` | (same) | `GetConfigAsync` (token = `"***"`) | `NangCap23ConfigStore.GetOrFallbackAsync` (decrypt) | — |
| Tab "Cấu hình" Save (Admin) | `POST /api/zalo-notification/config` | (same) | `SaveConfigAsync` + `Nangcap23ConfigValidator.ValidateZalo` | `NangCap23ConfigStore.SaveAsync` (encrypt token) | — |

### 8.6 Page `/quality-dashboard-live`

| UI element | API | Service | Method | DB (read-only aggregate) |
|---|---|---|---|---|
| Full dashboard | `GET /api/quality-dashboard?asOfDate=` | `IQualityDashboardService` | `GetFullDashboardAsync` | 7 bảng aggregate |
| Tab "Phòng khám" | `GET /api/quality-dashboard/clinic-queues` | (same) | `GetClinicQueuesAsync` | `QueueTickets`, `Examinations` |
| Tab "Nội trú" | `GET /api/quality-dashboard/inpatient-by-dept` | (same) | `GetInpatientByDepartmentAsync` | `Admissions`, `Discharges`, `Departments` |
| Tab "CLS" | `GET /api/quality-dashboard/paraclinical` | (same) | `GetParaclinicalStatusAsync` | `RadiologyRequests`, `FunctionalDiagnosticTests`, `PathologyRequests` |
| Tab "XN" | `GET /api/quality-dashboard/lab` | (same) | `GetLabStatusAsync` (defensive try/catch) | `LabRequestItems`, `Services.ServiceGroup` |
| Tab "Doanh thu" | `GET /api/quality-dashboard/revenue` | (same) | `GetDailyRevenueAsync` | `Receipts`, `Users` |

---

## 9. Role-based Access Test

Tham chiếu `docs/access-control-matrix.md` § 2 + § 3.2 + `NangCap23Controllers.cs`
`[Authorize(Roles=...)]` decorators.

### 9.1 Role chuẩn hệ thống (8 role per ACM-2026-001)

| Mã | Tên | Quyền NangCap23 |
|---|---|---|
| `ADMIN` / `Admin` | Quản trị viên | Tất cả (config + submit + cancel + delete) |
| `DOCTOR` / `Doctor` | Bác sĩ | Submit/Retry/Cancel Prescription; Submit GBT/DLHC; Verify FDT; Send Zalo |
| `NURSE` / `Nurse` | Điều dưỡng | Save/Update Linen Transaction + Sterilization Schedule; Save FDT; Send Zalo. **Không** được Verify FDT, **không** được Config |
| `PHARMACIST` / `Pharmacist` | Dược sĩ | Submit/Retry Prescription cổng QG; Generate Pharmacy report. **Không** được Verify FDT |
| `LAB_TECH` / `LabTech` | KTV Xét nghiệm | (NangCap23 không có endpoint riêng) — Save FDT (KTV thực hiện thăm dò) |
| `RECEPTIONIST` / `Receptionist` | Tiếp đón | (read-only NangCap23, không có write permission đặc biệt) |
| `ACCOUNTANT` / `Accountant` | Thu ngân | (read-only) |
| `MANAGER` / `Manager` | Quản lý | Read all + Quality Dashboard |

### 9.2 Role mới NangCap23 thêm

| Role | Endpoint áp dụng | Source |
|---|---|---|
| `Midwife` | `POST /api/de-an-06/birth-certificates/{id}/submit` | `NangCap23Controllers.cs:159` `[Authorize(Roles="Admin,Doctor,Midwife")]` |
| `PharmacyHead` | `POST /api/national-pharmacy/generate`, `POST /api/national-pharmacy/{id}/retry` | `NangCap23Controllers.cs:106,111` `[Authorize(Roles="Admin,Pharmacist,PharmacyHead")]` |

→ Phải seed 2 role này vào DB trước khi test, hoặc gán cho user test.

### 9.3 Role test matrix per endpoint

| Endpoint | Admin | Doctor | Nurse | Pharmacist | PharmacyHead | Midwife | Receptionist | Accountant | Lab_Tech | Manager | Anonymous |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `GET /national-prescription-gateway` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /national-prescription-gateway/submit` | ✅ | ✅ | 403 | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /national-prescription-gateway/{id}/retry` | ✅ | ✅ | 403 | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /national-prescription-gateway/{id}/cancel` | ✅ | ✅ | 403 | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `GET/POST /national-prescription-gateway/config` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /national-pharmacy/generate` | ✅ | 403 | 403 | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /national-pharmacy/{id}/retry` | ✅ | 403 | 403 | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /de-an-06/birth-certificates/{id}/submit` | ✅ | ✅ | 403 | 403 | 403 | ✅ | 403 | 403 | 403 | 403 | 401 |
| `POST /de-an-06/death-certificates/{id}/submit` | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /de-an-06/driving-license-checks/{id}/submit` | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `POST /de-an-06/*` (Save) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /linen/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /functional-diagnostics` (Save) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /functional-diagnostics/{id}/complete` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /functional-diagnostics/{id}/verify` | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `DELETE /functional-diagnostics/{id}` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `GET /functional-diagnostics/test-types` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (AllowAnonymous) |
| `POST /zalo-notification/send` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `POST /zalo-notification/{id}/retry` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |
| `GET/POST /zalo-notification/config` | ✅ | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 401 |
| `GET /zalo-notification/templates` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (AllowAnonymous) |
| `GET /quality-dashboard/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 401 |

### 9.4 Test script template (Cypress)

```typescript
const ROLES = [
  { name: 'admin',       password: 'Admin@123' },
  { name: 'doctor.test', password: 'Doctor@123' },
  { name: 'nurse.test',  password: 'Nurse@123' },
  ...
];

ROLES.forEach((role) => {
  it(`Role ${role.name} POST /national-prescription-gateway/submit`, () => {
    cy.request({
      method: 'POST',
      url: `${API}/auth/login`,
      body: { username: role.name, password: role.password },
    }).then((auth) => {
      const token = auth.body.data.token;
      cy.request({
        method: 'POST',
        url: `${API}/national-prescription-gateway/submit`,
        headers: { Authorization: `Bearer ${token}` },
        body: { prescriptionId: '...', ... },
        failOnStatusCode: false,
      }).then((r) => {
        const expectedStatus = ['admin','doctor.test','pharmacist.test'].includes(role.name) ? 200 : 403;
        expect(r.status).to.eq(expectedStatus);
      });
    });
  });
});
```

---

## 10. Regression Priority

Phân loại 4 cấp: **Critical / High / Medium / Low**.

### 10.1 Critical (patient safety + financial + legal)

| # | Module / Test | Lý do Critical | Tần suất chạy |
|---|---|---|---|
| C1 | `Nangcap23StateMachine` guard (Submit/Retry/Cancel/Verify) | Sai state → mất audit trail / submit thuốc đã cancel | Mỗi commit BE |
| C2 | DB UNIQUE filtered `UX_NationalPrescriptionSubmissions_PrescriptionId_Active` | Race condition duplicate submit → cổng QG nhận đơn 2 lần | Mỗi commit BE + load test pre-release |
| C3 | DB UNIQUE filtered `UX_NationalPharmacyReports_TypeP_Active` | Trùng báo cáo cùng kỳ → cổng QG nhận report 2 lần | (same) |
| C4 | `DrugInteractionService.CheckDrugInteractionsAsync` block severity=4 | Tương tác chết người không block | Mỗi commit BE (đã có sẵn) |
| C5 | `DrugAllergyService.CheckDrugAllergiesAsync` block | Dị ứng thuốc | (same) |
| C6 | `DrivingLicenseEligibility.Recompute` defense-in-depth | Cấp giấy lái xe cho người không đủ điều kiện | Mỗi commit BE |
| C7 | Sensitive token encryption + mask `"***"` | Leak Zalo OA token / API key | Mỗi commit BE + manual review log |
| C8 | SSRF allowlist `Nangcap23ConfigValidator.EnsureSafeUrl` | Admin trỏ tới `169.254.169.254` (cloud metadata) | Pre-release |
| C9 | Audit log middleware ghi mọi POST/PUT/DELETE | Mất audit trail cho điều tra/giám định | Mỗi release (manual check) |
| C10 | Phase 2 SaveChanges fail log `[NANGCAP23-ALERT]` CRITICAL | Mất sync giữa cổng và DB → manual reconcile | Manual: force DB outage |
| C11 | BHYT XML 130/4210 đúng schema | Cổng BHXH reject → giám định fail | Mỗi commit Insurance module (không liên quan NangCap23) |

### 10.2 High (workflow disruption)

| # | Module / Test | Lý do High |
|---|---|---|
| H1 | Quality Dashboard 5 view trả 200 | View live thấy số liệu sai → quản lý ra quyết định sai |
| H2 | `Nangcap23RetryWorker` chạy mỗi 60s | Worker stuck → submission Status=1 tồn đọng |
| H3 | Polly Circuit Breaker mở/đóng đúng | Mở vĩnh viễn → fail toàn bộ; không mở → cascade thread pool exhaustion |
| H4 | Submit Prescription gateway sandbox/staging | Test với credential thật trước go-live |
| H5 | Submit Đề án 06 sandbox | (same) |
| H6 | Zalo send template | Tin không tới BN (UX critical) |
| H7 | Linen state machine `EnsureValidLinenTransition` | Sai trạng thái giao nhận → mất đồ vải |
| H8 | Sterilization state machine | Sai trạng thái tiệt trùng → nhiễm khuẩn KSNK |
| H9 | FDT 4-eyes Verify | KQ FDT chưa verify mà BS thấy → kết luận sai |
| H10 | Permission test 8 role × 22 endpoint | User role thường truy cập sai endpoint |

### 10.3 Medium

| # | Module / Test |
|---|---|
| M1 | UI loading state + empty state 6 page |
| M2 | Modal validation message tiếng Việt đầy đủ |
| M3 | Pagination default pageSize=50 đúng |
| M4 | Filter dropdown render correct option |
| M5 | Audit log query qua `/api/audit/logs?entityType=...` |
| M6 | Dark mode render đẹp |
| M7 | Responsive mobile/tablet/desktop |
| M8 | Vietnamese diacritic input (ChildName, Notes, templateParams) |
| M9 | `ZaloConfigDto.AccessToken` 3-state semantic (null/`***`/empty/raw) |
| M10 | `NangCap23ConfigStore` decrypt fail fallback appsettings |
| M11 | `OperationCanceledException` → 499 |
| M12 | Schema drift trên `LabRequestItems` không crash QDashboard |

### 10.4 Low

| # | Module / Test |
|---|---|
| L1 | Print/Export EMR phiếu khám (đã có sẵn) |
| L2 | Sort cột bảng (chưa enforce) |
| L3 | Bulk action (chưa có) |
| L4 | Export CSV (chưa có) |
| L5 | Notification SignalR popup (đã có sẵn) |
| L6 | Search input debounce timing |
| L7 | Tooltip mô tả nút action |
| L8 | Keyboard shortcut (F2/F5/F9) |
| L9 | TestType FDT validator (chưa enforce 8 enum) |
| L10 | `BirthDateTime > now` validator (chưa có) |
| L11 | `DeathDateTime > CertifyingDate` validator (chưa có) |

### 10.5 Priority test execution order

```
1. C1-C3 + C6-C8 (BE unit + integration): mỗi commit (15 phút)
2. H1-H3 + H7-H9: mỗi commit (10 phút)
3. C4-C5 + C9 + C11: regression suite (30 phút)
4. H4-H6 + H10: pre-release với Staging (60 phút)
5. M1-M12: weekly regression (45 phút)
6. L1-L11: monthly sweep (manual)
```

### 10.6 Module ưu tiên (theo patient safety / billing / prescription / insurance / lab)

Sắp xếp module bị ảnh hưởng theo mức ưu tiên:

1. **Prescription module** (impacted by NangCap23 cổng QG): Critical
2. **Pharmacy module** (impacted by NangCap23 Dược QG + Zalo prescription_dispense): Critical
3. **Insurance / BHYT** (parallel với NangCap23 Đề án 06): High (riêng biệt)
4. **OPD / IPD / Examination** (upstream cho cổng QG + Đề án 06 DLHC): High
5. **Lab / Radiology / FDT** (Quality Dashboard query + FDT NangCap23): High
6. **Billing / Receipts** (Quality Dashboard revenue view): Medium
7. **Reception / Patient** (upstream cho GCS/GBT/DLHC): Medium
8. **Linen Management** (standalone NangCap23): Low (không cross-module)
9. **EMR / Audit log** (cross-cut, mọi NangCap23 mutation): High (mọi commit verify)

---

## Tài liệu liên quan

- [README.md](./README.md) — Overview + architecture hardening
- [analysis.md](./analysis.md) — Phân tích source code chi tiết
- [test-plan.md](./test-plan.md) — Test plan per-chức-năng + checklist release
- [test-guide.md](./test-guide.md) — QA checklist 11 section gốc
- [summary.md](./summary.md) — Index cross-doc + module impact ranking
- [`../../architecture/data-flow.md`](../../architecture/data-flow.md) — 9 luồng dữ liệu HIS gốc
- [`../../architecture/business-logic-complete.md`](../../architecture/business-logic-complete.md) — Business logic HSMT
- [`../../MODULE_MAP.md`](../../MODULE_MAP.md) — Module boundaries + dependency
- [`../../access-control-matrix.md`](../../access-control-matrix.md) — RBAC 8 role
- [`../../API_FLOW.md`](../../API_FLOW.md) — Sequence diagram chi tiết

## Commit reference

- Phạm vi gói: `8b2f777` → `e3935e1` (5 commit chức năng NangCap23)
- Phase 2 hardening (sau audit): ConfigStore + ConfigValidator + ExceptionFilter + scripts 44/45
- Phase 3 (2-phase save + retry worker + idempotency key): refactor service + new worker

Tag/release version: **không xác định được từ source code** (chưa có git tag NangCap23 chính thức).
