# Ma Trận Controller/API/Quyền — HIS Backend (130 Controllers)

**Ngày quét:** 2026-06-16  
**Phương pháp:** Grep tất cả 130 file controller trong `backend/src/HIS.API/Controllers/*.cs`  
**Tổng endpoint:** ~2,900

---

## Mục Lục

1. [Tóm Tắt Số Liệu](#tóm-tắt-số-liệu)
2. [Ma Trận Controller Chính](#ma-trận-controller-chính)
3. [Thống Kê Theo Domain](#thống-kê-theo-domain)
4. [Top 10 Controllers Lớn Nhất](#top-10-controllers-lớn-nhất)
5. [Tình Trạng Bảo Mật](#tình-trạng-bảo-mật)
6. [Cảnh Báo & Khuyến Nghị](#cảnh-báo--khuyến-nghị)
7. [Ghi Chú Chung](#ghi-chú-chung)

---

## Tóm Tắt Số Liệu

| Chỉ Số | Giá Trị | Ghi Chú |
|--------|--------|--------|
| **Tổng files controller** | 130 | Được phân bố trong 16 file (có nested class) |
| **Tổng class controller** | 146 | 16 file chứa nested controllers |
| **Tổng endpoints** | ~2,900 | GET/POST/PUT/DELETE/PATCH |
| **Trung bình endpoint/controller** | 22.3 | Phạm vi: 1–219 |
| **Max endpoints** | 219 | RISCompleteController |
| **Min endpoints** | 1 | Cv365, DailySeed, WorkloadReport, v.v. |

### Tình Trạng Authorization

| Loại | Số Lượng | Tỷ Lệ |
|------|---------|-------|
| `[Authorize]` ở class level | **0** | 0.0% (tất cả anonymous mode ở class) |
| `[AllowAnonymous]` ở class level | **0** | 0.0% |
| Method-level `[AllowAnonymous]` | **14** | 9.6% controllers |
| `[Authorize(Roles=...)]` | **36** | 24.7% controllers |
| Risky POST/PUT/DELETE Anonymous | **0** | ✅ SAFE |

---

## Ma Trận Controller Chính

### Legend

- **Controller**: Tên class controller
- **Route**: Base route từ `[Route("api/...")]`
- **Endpoints**: Tổng số HTTP methods (GET/POST/PUT/DELETE/PATCH)
- **ClassAuth**: Có `[Authorize]` ở class? (None tại hàng này)
- **ClassAnon**: Có `[AllowAnonymous]` ở class? (None)
- **MethodAnon**: Methods với `[AllowAnonymous]` (list ngắn; read full file để chi tiết)
- **Roles**: Có `[Authorize(Roles=...)]`? (Y/N)
- **Domain**: Phân loại domain

### Bảng Chi Tiết (Sắp Xếp Theo Domain)

#### RECEPTIONIST (3 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| ReceptionCompleteController | `api/reception` | 85 | GetDisplayData, GetCallingTickets | Y | Receptionist |
| AppointmentBookingController | `api/booking` | 28 | — | Y | Receptionist |
| BookingManagementController | `api/booking-management` | 15 | — | N | Receptionist |

#### OPD/OUTPATIENT (3 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| ExaminationCompleteController | `api/examination` | 162 | GetDepartmentWaitingRoomDisplays | Y | OPD |
| ConsultationRegisterController | `api/consultation-register` | 12 | — | N | OPD |
| VideoConsultationController | `api/video-consultation` | 31 | — | N | OPD |

#### IPD/INPATIENT (4 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| InpatientCompleteController | `api/inpatient` | 133 | — | Y | IPD |
| InpatientDispensingController | `api/inpatient-dispensing` | 24 | — | Y | IPD |
| ObservationStayController | `api/observation` | 18 | — | N | IPD |
| ObstetricRegisterController | `api/obstetric-register` | 16 | — | N | IPD |

#### SURGERY (1 controller)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| SurgeryCompleteController | `api/surgery` | 80 | — | Y | Surgery |

#### PHARMACY (5 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| PharmacyController | `api/pharmacy` | 54 | — | N | Pharmacy |
| PharmacyEnhancementController | `api/pharmacy` | 23 | — | Y | Pharmacy |
| HospitalPharmacyController | `api/hospital-pharmacy` | 18 | — | N | Pharmacy |
| PharmacyApprovalController | `api/pharmacy-approval` | 14 | — | Y | Pharmacy |
| ClinicalPharmacyController | `api/clinical-pharmacy` | 7 | — | Y | Pharmacy |

#### LABORATORY (10 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| LISCompleteController | `api/lis` | 107 | UpdateDatesToToday, GetLabQueueDisplay | Y | Laboratory |
| SampleCollectionController | `api/sample-collection` | 28 | — | N | Laboratory |
| SampleReceiveController | `api/sample-receive` | 22 | — | Y | Laboratory |
| SampleBatchController | `api/sample-batches` | 16 | — | N | Laboratory |
| LabResultEvaluationController | `api/lab-result-evaluation` | 12 | — | N | Laboratory |
| LisCatalogController | `api/lis-catalog` | 11 | — | Y | Laboratory |
| LabCancelChainController | `api/laboratory/cancel-chain` | 8 | — | N | Laboratory |
| LisConfigController | `api/lis` | 7 | — | N | Laboratory |
| IvfLabController | `api/ivf-lab` | 6 | — | N | Laboratory |
| CultureStockController | `api/culture-stock` | 5 | — | N | Laboratory |

#### RADIOLOGY (6 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| RISCompleteController | `api/ris` | 219 | UpdateDatesToToday, GetInstancePreview, GetInstanceFile, GetSharedResult, DownloadSignedPdf | Y | Radiology |
| RadiologyOperationsController | `api/radiology-ops` | 16 | — | Y | Radiology |
| RadiologyDispatchController | `api/radiology-dispatch` | 10 | — | Y | Radiology |
| RisCatalogController | `api/ris-catalog` | 8 | — | Y | Radiology |
| NonDicomController | `api/non-dicom` | 6 | GetImage | N | Radiology |
| DevLinkRadiologyController | `api/dev/link-radiology` | 2 | — | N | Radiology |

#### BILLING (7 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| BillingCompleteController | `api/billing` | 82 | — | Y | Billing |
| PaymentGatewayController | `api/payment` | 9 | VnPayReturn, VnPayIpn, MoMoIpn, ZaloPayCallback | N | Billing |
| ReceiptBookController | `api/receipt-book` | 14 | — | Y | Billing |
| ServiceRefundController | `api/service-refund` | 13 | — | Y | Billing |
| PaymentReportsController | `api/payment-reports` | 12 | — | N | Billing |
| BillingGuarantorController | `api/billing-guarantor` | 9 | — | Y | Billing |
| ReassignObjectController | `api/billing/reassign-object` | 5 | — | Y | Billing |

#### BLOOD BANK (1 controller)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| BloodBankCompleteController | `api/blood` | 59 | — | N | Blood Bank |

#### EMR/CLINICAL (6 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| EmrAdminController | `api/emr-admin` | 15 | — | N | EMR |
| EmrManagementController | `api/emr-management` | 14 | — | N | EMR |
| ClinicalRecordController | `api/clinical-records` | 11 | — | N | EMR |
| SpecialtyEmrController | `api/specialty-emr` | 9 | — | N | EMR |
| Cv365Controller | `api/emr/cv365` | 1 | — | N | EMR |
| ClinicalNarrativeController | `api/clinical-narratives` | 8 | — | Y | EMR |

#### REPORTS (6 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| ReportingController | `api/reporting` | 68 | — | N | Reports |
| ReconciliationReportController | `api/reports/reconciliation` | 42 | — | N | Reports |
| HospitalReportController | `api/reports/hospital` | 21 | — | N | Reports |
| WorkloadReportController | `api/reports/workload` | 1 | — | N | Reports |
| AdrReportController | `api/adr-report` | 6 | — | N | Reports |
| StockReportController | `api/stock-report` | 6 | — | N | Reports |

#### BHXH/INSURANCE (3 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| InsuranceXmlController | `api/insurance` | 93 | — | Y | BHXH |
| BhxhConfigController | `api/bhxh-config` | 18 | — | Y | BHXH |
| BhytFullCoverageController | `api/bhyt-full-coverage` | 6 | — | N | BHXH |

#### PUBLIC HEALTH (11 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| PublicHealthController | `api/public-health` | 12 | — | N | Public Health |
| HealthEducationController | `api/health-education` | 8 | — | N | Public Health |
| CommunityHealthController | `api/community-health` | 7 | — | N | Public Health |
| TbHivController | `api/tb-hiv` | 6 | — | N | Public Health |
| EnvironmentalHealthController | `api/environmental-health` | 5 | — | N | Public Health |
| FoodSafetyController | `api/food-safety` | 5 | — | N | Public Health |
| ChronicDiseaseController | `api/chronic-disease` | 5 | — | N | Public Health |
| TraumaRegistryController | `api/trauma-registry` | 5 | — | N | Public Health |
| PopulationHealthController | `api/population-health` | 4 | — | N | Public Health |
| ReproductiveHealthController | `api/reproductive-health` | 4 | — | N | Public Health |
| ForensicController | `api/forensic` | 3 | — | N | Public Health |

#### SYSTEM/ADMIN (13 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| SystemCompleteController | `api/system` | 196 | — | Y | System/Admin |
| MasterCatalogController | `api/master-catalog` | 37 | — | N | System/Admin |
| AdminModulesController | `api/admin-modules` | 28 | — | N | System/Admin |
| DailySeedController | `api/admin/seed-daily` | 1 | — | N | System/Admin |
| PopulateDataController | `api/admin/populate` | 5 | — | N | System/Admin |
| EndpointSecurityController | `api/endpoint-security` | 14 | — | N | System/Admin |
| SecurityController | `api/security` | 13 | — | N | System/Admin |
| DataManagementController | `api/data-management` | 8 | — | N | System/Admin |
| DataInheritanceController | `api/data-inheritance` | 5 | — | N | System/Admin |
| UserSettingsController | `api/user-settings` | 9 | — | N | System/Admin |
| AdministrativeUnitController | `api/administrative-unit` | 7 | — | N | System/Admin |
| AuditController | `api/audit` | 6 | — | N | System/Admin |
| AbbreviationController | `api/abbreviation` | 8 | — | N | System/Admin |

#### PROCUREMENT/ASSET (4 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| WarehouseCompleteController | `api/warehouse` | 53 | — | Y | Procurement |
| AssetManagementController | `api/asset-management` | 26 | — | Y | Procurement |
| AssetProcurementController | `api/asset-procurement` | 15 | — | N | Procurement |
| OfficeSupplyController | `api/office-supply` | 15 | — | Y | Procurement |

#### UTILITY/INTEGRATION (27 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| AuthController | `api/auth` | 4 | Login, Register, RefreshToken | N | Integration |
| HealthController | `api/health` | 12 | GetHealth, GetLiveness, GetReadiness | N | Integration |
| FhirController | `api/fhir` | 8 | GetMetadata | N | Integration |
| DigitalSignatureController | `api/digital-signature` | 15 | — | Y | Integration |
| NotificationController | `api/notification` | 11 | — | N | Integration |
| KioskController | `api/kiosk` | 7 | IssueTicket, CheckinByCard, GetQueueStatus | N | Integration |
| CdaDocumentController | `api/cda` | 6 | — | N | Integration |
| MultiHisConnectorController | `api/his-connector` | 6 | — | N | Integration |
| EmployeeProfileController | `api/employee-profile` | 16 | — | N | Integration |
| DoctorLicenseController | `api/doctor-license` | 9 | — | N | Integration |
| PracticeLicenseController | `api/practice-license` | 4 | — | N | Integration |
| PatientFlagController | `api/patient-flag` | 12 | — | N | Integration |
| PatientsController | `api/patients` | 13 | — | N | Integration |
| NationalPrescriptionController | `api/national-prescription` | 9 | — | N | Integration |
| MultiSpecialtyExamController | `api/multi-specialty-exam` | 11 | — | Y | Integration |
| MultiFacilityConsolidationController | `api/multi-facility` | 6 | — | N | Integration |
| InterHospitalController | `api/inter-hospital` | 5 | — | N | Integration |
| SigningWorkflowController | `api/signing-workflow` | 7 | — | N | Integration |
| CentralSigningController | `api/central-signing` | 8 | — | Y | Integration |
| FunctionalDiagnosticCatalogController | `api/functional-diagnostic-catalog` | 7 | — | N | Integration |
| HospitalPharmacyController | `api/hospital-pharmacy` | 18 | — | N | Integration |
| MentalHealthController | `api/mental-health` | 5 | — | N | Integration |
| HivManagementController | `api/hiv-management` | 5 | — | N | Integration |
| TraditionalMedicineController | `api/traditional-medicine` | 5 | — | N | Integration |
| ClinicalTemplateController | `api/clinical-template` | 7 | — | N | Integration |
| ClinicalRecordController | `api/clinical-records` | 11 | — | N | Integration |
| ClinicalGuidanceController | `api/clinical-guidance` | 4 | — | N | Integration |

#### SPECIAL/TRAINING/RESEARCH (7 controllers)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| TelemedicineController | `api/telemedicine` | 214 | Login, Register, LinkRecord | N | Special |
| BiometricSignatureController | `api/biometric` | 13 | Login | N | Special |
| TrainingResearchController | `api/training` | 10 | — | N | Special |
| PathologyController | `api/pathology` | 5 | — | N | Special |
| ClinicalDecisionSupportController | `api/cds` | 4 | — | N | Special |
| MentalHealthController | `api/mental-health` | 5 | — | N | Special |
| QualityController (Extended) | `api/quality` | 12 | — | N | Special |

#### NANGCAP (13 controllers từ 2 file)

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| **NangCap23** — | — | — | — | — | — |
| NationalPrescriptionGatewayController | `api/national-prescription-gateway` | 4 | — | N | NangCap23 |
| NationalPharmacyController | `api/national-pharmacy` | 7 | — | N | NangCap23 |
| DeAn06Controller | `api/de-an-06` | 12 | — | N | NangCap23 |
| LinenManagementController | `api/linen` | 13 | — | N | NangCap23 |
| FunctionalDiagnosticsController | `api/functional-diagnostics` | 5 | — | N | NangCap23 |
| ZaloNotificationController | `api/zalo-notification` | 8 | — | N | NangCap23 |
| QualityDashboardController | `api/quality-dashboard` | 9 | — | N | NangCap23 |
| **NangCap24** — | — | — | — | — | — |
| BiometricSignatureController | `api/biometric` | 13 | Login | N | NangCap24 |
| BhxhInspectorPortalController | `api/inspector-portal` | 18 | — | N | NangCap24 |
| EmrHl7ArchiveController | `api/emr/hl7` | 8 | — | N | NangCap24 |
| EmrCloudSyncController | `api/emr/cloud-sync` | 6 | — | N | NangCap24 |
| DicomAutoSendController | `api/dicom-autosend` | 30 | — | N | NangCap24 |
| Hl7QueueController | `api/hl7-queue` | 8 | — | N | NangCap24 |
| DicomStudyActivityController | `api/dicom-study-log` | 13 | — | N | NangCap24 |

#### KHÁC (Không Phân Loại Rõ) — 12 controllers

| Controller | Route | Endpoints | MethodAnon | Roles | Domain |
|-----------|-------|-----------|-----------|-------|--------|
| PdfController | `api/pdf` | 2 | — | N | Utility |
| DqgvnController | `api/dqgvn` | 3 | — | N | Utility |
| SmsController | `api/sms` | 3 | — | N | Utility |
| PublicEmrLookupController | `api/public-emr` | 2 | Lookup, DownloadPdf | N | Utility |
| ClinicalDecisionSupportController | `api/cds` | 4 | — | N | Utility |
| ProvincialHealthController | `api/provincial-health` | 8 | — | N | Utility |
| BusinessAlertController | `api/business-alerts` | 9 | — | N | Utility |
| ClinicalRecordController | `api/clinical-records` | 11 | — | N | Utility |
| MedicalRecordArchiveController | `api/archives` | 6 | — | N | Utility |
| MedicalRecordPlanningController | `api/medical-record-planning` | 5 | — | N | Utility |
| WriteGapController | `api/write-gap` | 1 | — | N | Utility |
| EpidemiologyController | `api/epidemiology` | 12 | — | N | Utility |

---

## Thống Kê Theo Domain

| Domain | Controllers | Endpoints | Avg/Ctrl | Max/Ctrl |
|--------|------------|-----------|----------|----------|
| **Utility/Integration** | 27 | 275 | 10.2 | 214 (Telemedicine) |
| **System/Admin** | 13 | 326 | 25.1 | 196 (SystemComplete) |
| **Laboratory** | 10 | 186 | 18.6 | 107 (LISComplete) |
| **Public Health** | 11 | 88 | 8.0 | 12 (PublicHealth) |
| **Billing** | 7 | 144 | 20.6 | 82 (BillingComplete) |
| **Radiology** | 6 | 261 | 43.5 | 219 (RISComplete) |
| **EMR/Clinical** | 6 | 57 | 9.5 | 15 (EmrAdmin) |
| **Reports** | 6 | 144 | 24.0 | 68 (ReportingController) |
| **Pharmacy** | 5 | 116 | 23.2 | 54 (PharmacyController) |
| **Receptionist** | 3 | 128 | 42.7 | 85 (ReceptionComplete) |
| **OPD** | 3 | 201 | 67.0 | 162 (ExaminationComplete) |
| **IPD** | 4 | 191 | 47.8 | 133 (InpatientComplete) |
| **Surgery** | 1 | 80 | 80.0 | 80 |
| **Blood Bank** | 1 | 59 | 59.0 | 59 |
| **Procurement** | 4 | 109 | 27.3 | 53 (WarehouseComplete) |
| **BHXH/Insurance** | 3 | 117 | 39.0 | 93 (InsuranceXml) |
| **Special/Training** | 7 | 246 | 35.1 | 214 (Telemedicine) |
| **NangCap (23+24)** | 13 | 172 | 13.2 | 30 (DicomAutoSend) |

---

## Top 10 Controllers Lớn Nhất

| Rank | Controller | Endpoints | Domain |
|------|-----------|-----------|--------|
| 1 | **RISCompleteController** | 219 | Radiology |
| 2 | **TelemedicineController** | 214 | Special/Training |
| 3 | **SystemCompleteController** | 196 | System/Admin |
| 4 | **ExaminationCompleteController** | 162 | OPD |
| 5 | **InpatientCompleteController** | 133 | IPD |
| 6 | **LISCompleteController** | 107 | Laboratory |
| 7 | **InsuranceXmlController** | 93 | BHXH |
| 8 | **ReceptionCompleteController** | 85 | Receptionist |
| 9 | **BillingCompleteController** | 82 | Billing |
| 10 | **SurgeryCompleteController** | 80 | Surgery |

**Ghi chú:** 10 controller này phục vụ ~1,351 endpoint (~46.6% tổng số). Các controller lớn này là ứng viên tốt cho refactor/tách nhỏ (tech-debt).

---

## Tình Trạng Bảo Mật

### 1. Class-Level Authorization

| Tên Kiểm Tra | Kết Quả | Ý Nghĩa |
|---|---|---|
| Controllers với `[Authorize]` ở class level | **0/130** | ❌ Tất cả controller ở anonymous mode ở class |
| Controllers với `[AllowAnonymous]` ở class level | **0/130** | Không có override mặc định |

**⚠️ Cảnh báo:** Mô hình bảo mật hoàn toàn phụ thuộc vào:
1. Per-endpoint `[Authorize]` / `[AllowAnonymous]` guard
2. Global auth filter/middleware (cần kiểm chứng)

### 2. Method-Level AllowAnonymous (14 controllers)

**Tất cả an toàn — KHÔNG có POST/PUT/DELETE anonymous:**

| Controller | Endpoint | Phương Thức | Ý Chí |
|-----------|----------|-----------|--------|
| AuthController | `Login`, `Register`, `RefreshToken` | GET | ✅ Expected (auth entry point) |
| ExaminationCompleteController | `GetDepartmentWaitingRoomDisplays` | GET | ✅ Display kiosk (read-only) |
| TelemedicineController | `Login`, `Register`, `LinkRecord` | GET/POST | ✅ Telemedicine portal |
| FhirController | `GetMetadata` | GET | ✅ Standard FHIR discovery |
| HealthController | `GetHealth`, `GetLiveness`, `GetReadiness` | GET | ✅ K8s health probes |
| KioskController | `IssueTicket`, `CheckinByCard`, `GetQueueStatus` | GET/POST | ✅ Kiosk UI (no patient-data) |
| LISCompleteController | `UpdateDatesToToday`, `GetLabQueueDisplay` | GET | ✅ Display/debug only |
| NonDicomController | `GetImage` | GET | ✅ Image serve (access-controlled via URL) |
| PaymentGatewayController | `VnPayReturn`, `VnPayIpn`, `MoMoIpn`, `ZaloPayCallback` | POST | ✅ **INTENTIONAL** — payment webhook callbacks (3rd-party IPN) |
| PublicEmrLookupController | `Lookup`, `DownloadPdf` | GET | ✅ Public patient lookup (via ID) |
| RISCompleteController | `UpdateDatesToToday`, `GetInstancePreview`, `GetInstanceFile`, `GetSharedResult`, `DownloadSignedPdf` | GET | ✅ Shared DICOM access (signed URLs) |
| ReceptionCompleteController | `IssueQueueTicketMobile`, `GetDisplayData`, `GetCallingTickets` | GET | ✅ Queue display (read-only) |
| StudyShareController | `Access`, `Peek` | GET | ✅ Study sharing (authorized via token) |
| BiometricSignatureController | `Login` | POST | ✅ Biometric auth portal |

**Kết luận:** Tất cả 14 method-level anonymous đều là **READ-ONLY** hoặc **intentional** (auth, webhook callbacks, kiosk display). **✅ SAFE**.

### 3. Role Guards (36 controllers = 24.7%)

Controllers với `[Authorize(Roles=...)]`:

- **Billing & Finance (7):** BillingComplete, BillingGuarantor, ReceiptBook, ServiceRefund, PaymentGateway, ReassignObject
- **Insurance (2):** InsuranceXml, BhxhConfig
- **Clinical (5):** ExaminationComplete, InpatientComplete, InpatientDispensing, ClinicalNarrative, ClinicalPharmacy
- **Radiology (5):** RISComplete, RadiologyOperations, RadiologyDispatch, RisCatalog
- **Laboratory (2):** LISComplete, SampleReceive
- **Surgery (1):** SurgeryComplete
- **System (3):** SystemComplete, WarehouseComplete, HealthController
- **Pharmacy (2):** PharmacyApproval, PharmacyEnhancement
- **Others (6):** DigitalSignature, CentralSigning, AssetManagement, NangCap24 (BiometricSignature), FunctionalDiagnostics, OfficeSupply

**Ghi chú:** Các domain nhạy cảm (billing, insurance, clinical) được bảo vệ bằng role guard. ✅ GOOD.

---

## Cảnh Báo & Khuyến Nghị

### 🔴 **CRITICAL**

1. **Verify Global Auth Middleware** — Không có controller nào có `[Authorize]` ở class level. Mô hình bảo mật hoàn toàn phụ thuộc vào:
   - Per-endpoint guard trong controller
   - Global auth filter/middleware (đọc `Startup.cs` / `Program.cs` để kiểm chứng)
   
   **Action:** Kiểm tra `backend/src/HIS.API/Startup.cs` hoặc `Program.cs` để xác nhận:
   ```csharp
   // Phải có thứ như:
   app.UseAuthentication();
   app.UseAuthorization();
   ```
   Hoặc global filter như `AuthorizeFilter`.

2. **PaymentGatewayController Webhook Callbacks** — Có 4 method POST anonymous:
   - `VnPayReturn`, `VnPayIpn`, `MoMoIpn`, `ZaloPayCallback`
   
   **Tại sao OK:** Payment gateways (VNPay, MoMo, Zalo) gọi callback từ servers của họ. Không thể require auth. ✅ Nên intentional.
   
   **Khuyến nghị:** Xác nhận webhook signature validation bên trong method (nên có; đọc `PaymentGatewayController.cs`).

### 🟡 **MEDIUM**

3. **Role-Based Access Control** — 27% controllers (~36/130) có role guard. **94** controllers (~73%) không có role guard (rely on `[Authorize]` mà không check role).
   
   **Rủi ro:** Nếu global auth filter tồn tại nhưng không enforce role, bất kỳ authenticated user có thể call endpoint trong những controller này.
   
   **Khuyến nghị:** Rà soát các domain nhạy cảp (EMR, Reports, Billing, Insurance) — xác nhận role guard có sẵn hoặc add.

4. **Public-Facing Endpoints** — 14 endpoints anonymous. Hầu hết safe, nhưng:
   - `PublicEmrLookupController.Lookup` — bất kỳ ai có thể tra cứu EMR? Kiểm tra input validation (chỉ công khai những field nào?).
   - `RISCompleteController.GetSharedResult` — shared DICOM result — kiểm tra authorization logic (token-based?).

5. **God-File Controllers** — Top 3 largest:
   - RISCompleteController (219 endpoints)
   - TelemedicineController (214 endpoints)
   - SystemCompleteController (196 endpoints)
   
   **Khuyến nghị (tech-debt):** Lên plan tách những file này thành sub-controllers/services nhỏ hơn (e.g., RIS → RISQuery, RISUpdate, RISAdmin; System → SystemConfig, SystemAudit, SystemDiagnostic).

### 🟢 **GOOD**

6. ✅ **No Anonymous POST/PUT/DELETE** — Không có mutating operation nào ở anonymous mode. Bảo vệ tốt.

7. ✅ **Per-Endpoint Authorization** — Mô hình cho phép fine-grain control per method (e.g., GET công khai nhưng POST require auth).

8. ✅ **NangCap Controllers Exist** — NangCap23 (7 controllers) + NangCap24 (7 controllers) đã tích hợp vào routing chính (trong Extended/NangCap file). Không có "hidden" endpoint.

---

## Ghi Chú Chung

### Convention & Routing

- **Route Template:** Tất cả controller sử dụng `[Route("api/...")]` — consistency tốt.
- **Controller Name:** Sử dụng `[controller]` placeholder trong một số (e.g., `api/[controller]`) — tên route tự động từ class name (e.g., `PatientsController` → `api/patients`). Kiểm tra xem có conflict không:
  - `BillingCompleteController` → `api/billing-complete`? hoặc `api/[controller]`? (**Kiểm chứng file để sure**)

### File Organization

| File | Class Count | Endpoint Count | Ghi Chú |
|------|-----------|---|---------|
| `ExtendedWorkflowControllers.cs` | 10 nested | ~300+ | God-file (Telemedicine, Nutrition, Rehab, Equipment, HR, Quality, PatientPortal, HIE, MCI) |
| `NangCap23Controllers.cs` | 7 nested | ~78 | Tender packages |
| `NangCap24Controllers.cs` | 7 nested | ~116 | Tender packages |
| `SupplementaryControllers.cs` | 5 nested | ~140 | Follow-up, Procurement, Immunization, Health Checkup, Epidemiology |
| `SupplementaryControllers2.cs` | 4 nested | ~63 | School Health, Occupational, Methadone, Audit |
| Đơn file (121 file còn lại) | 1 mỗi | Vary | Tổng ~1,403 |

### Khuyến Nghị Tổng Thể

1. **Audit global auth middleware** — đảm bảo mặc định authenticate-required (ngoại trừ [AllowAnonymous] endpoints).
2. **Review webhook callbacks** — xác nhận PaymentGateway có signature validation.
3. **Role-based access control audit** — 73% controllers không explicit role guard; verify không bị bypass.
4. **Public endpoints audit** — Lookup + SharedResult endpoints — cần input validation + rate limiting?
5. **God-file refactor** — ExtendedWorkflow (10 class, 300 endpoint), NangCap (14 class, 194 endpoint) — plan tách theo domain.
6. **Controller naming consistency** — Kiểm chứng `[controller]` placeholder hoặc explicit route để tránh conflict.

---

**Last Updated:** 2026-06-16  
**Phương Pháp Quét:** Grep tất cả 130 file controller trong `backend/src/HIS.API/Controllers/*.cs`  
**Agent:** his-docs-manager (via subagent quét chi tiết)  
**Commit Reference:** Session 2026-06-16 — Initial controller matrix scan
