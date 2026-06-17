# Dual Design System Inventory & Roadmap — Issue #163

**Scope**: Khử dual design-system v1(124 pages) / v2(155+ pages), thay bằng v2-only trên mainline  
**Current State**: Hỗ trợ cả v1 (MainLayout, `pages/`) và v2 (TerminalLayout, `pages-v2/`)  
**Goal**: Xác định ứng viên xóa/port an toàn, lập roadmap giảm bundle + maintain cost  

---

## Tóm tắt số liệu

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| **V1 pages** (pages/*.tsx) | 122 | Loại Login.tsx, _CrudTab.tsx helper |
| **V2 pages** (pages-v2/*.tsx) | 156 | Tất cả file |
| **Cặp trùng tên** (cùng module v1 + v2) | 117 | Ứng viên XÓA v1 (nếu route đã chuyển) |
| **V1 chỉ-duy-nhất** | 5 | Không có bản v2 — cần PORT |
| **V2 chỉ-duy-nhất** | 39 | V2-native (không cần v1) |

---

## A. Bảng Kiểm Kê V1 Pages — Quyết Định Đề Xuất

### Nhóm 1: Cấp độ cao (core v1 routes còn ACTIVE trong menu — XÓA ưu tiên CAO)

Những trang này có route v1 **ACTIVE** trong MainLayout và **KHÔNG dùng nữa** vì v2 đã thay thế.

| Page V1 | Có V2? | Route v1 Active? | Route v2 Active? | Quyết định | Ưu tiên | Ghi chú |
|---|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ `/dashboard` | ✓ `/v2/dashboard` | XÓA v1 | **CAO** | Home page, route xác nhận |
| Reception | ✓ | ✓ `/reception` | ✓ `/v2/reception` | XÓA v1 | **CAO** | Receptionist workflow |
| OPD | ✓ | ✓ `/opd` | ✓ `/v2/opd` | XÓA v1 | **CAO** | Clinic core module |
| Inpatient | ✓ | ✓ `/ipd` | ✓ `/v2/ipd` | XÓA v1 | **CAO** | Ward management |
| Pharmacy | ✓ | ✓ `/pharmacy` | ✓ `/v2/pharmacy` | XÓA v1 | **CAO** | Pharmacy core |
| Surgery | ✓ | ✓ `/surgery` | ✓ `/v2/surgery` | XÓA v1 | **CAO** | OR module |
| Laboratory | ✓ | ✓ `/lab` | ✓ `/v2/lab` | XÓA v1 | **CAO** | LIS integration |
| Radiology | ✓ | ✓ `/radiology` | ✓ `/v2/radiology` | XÓA v1 | **CAO** | PACS/RIS |
| Billing | ✓ | ✓ `/billing` | ✓ `/v2/billing` | XÓA v1 | **CAO** | Finance core |
| EMR | ✓ | ✓ `/emr` | ✓ `/v2/emr` | XÓA v1 | **CAO** | Patient record |
| Consultation | ✓ | ✓ `/consultation` | ✓ `/v2/consultation` | XÓA v1 | **CAO** | Advice workflow |
| BloodBank | ✓ | ✓ `/blood-bank` | ✓ `/v2/blood-bank` | XÓA v1 | **CAO** | Blood stock |
| Finance | ✓ | ✓ `/finance` | ✓ `/v2/finance` | XÓA v1 | **CAO** | Accounting |
| Insurance | ✓ | ✓ `/insurance` | ✓ `/v2/insurance` | XÓA v1 | **CAO** | BHXH/Private |
| MasterData | ✓ | ✓ `/master-data` | ✓ `/v2/master-data` | XÓA v1 | **CAO** | Catalog mgmt |
| SystemAdmin | ✓ | ✓ `/admin` | ✓ `/v2/admin` | XÓA v1 | **CAO** | Settings |
| Help | ✓ | ✓ `/help` | ✓ `/v2/help` | XÓA v1 | **CAO** | User guide |
| DigitalSignature | ✓ | ✓ `/digital-signature` | ✓ `/v2/digital-signature` | XÓA v1 | **CAO** | Sign flow |
| CentralSigning | ✓ | ✓ `/central-signing` | ✓ `/v2/central-signing` | XÓA v1 | **CAO** | Admin sign |

### Nhóm 2: Cấp độ trung (v1 route ACTIVE nhưng ít dùng — XÓA ưu tiên TRUNG)

| Page V1 | Có V2? | Route v1 Active? | Route v2 Active? | Quyết định | Ưu tiên | Ghi chú |
|---|---|---|---|---|---|---|
| PaymentReports | ✓ | ✓ `/payment-reports` | ✓ `/v2/payment-reports` | XÓA v1 | **TRUNG** | Finance report |
| PaymentTransactions | ✓ | ✓ `/payment-transactions` | ✓ `/v2/payment-transactions` | XÓA v1 | **TRUNG** | Finance tx log |
| PharmacyApproval | ✓ | ✓ `/pharmacy-approval` | ✓ `/v2/pharmacy-approval` | XÓA v1 | **TRUNG** | Pharmacy workflow |
| DispensingCounter | ✓ | ✓ `/dispensing-counter` | ✓ `/v2/dispensing-counter` | XÓA v1 | **TRUNG** | Dispense point |
| ClinicalPharmacyCheck | ✓ | ✓ `/clinical-pharmacy-check` | ✓ `/v2/clinical-pharmacy-check` | XÓA v1 | **TRUNG** | QC workflow |
| InpatientDispensing | ✓ | ✓ `/inpatient-dispensing` | ✓ `/v2/inpatient-dispensing` | XÓA v1 | **TRUNG** | IPD dispense |
| StockReport | ✓ | ✓ `/stock-report` | ✓ `/v2/stock-report` | XÓA v1 | **TRUNG** | Inventory |
| ObservationStay | ✓ | ✓ `/observation-stay` | ✓ `/v2/observation-stay` | XÓA v1 | **TRUNG** | Observation bed |
| ServiceRequeue | ✓ | ✓ `/service-requeue` | ✓ `/v2/service-requeue` | XÓA v1 | **TRUNG** | Service queue |
| LisCatalogAdmin | ✓ | ✓ `/lis-catalog-admin` | ✓ `/v2/lis-catalog-admin` | XÓA v1 | **TRUNG** | LIS master |
| RisCatalogAdmin | ✓ | ✓ `/ris-catalog-admin` | ✓ `/v2/ris-catalog-admin` | XÓA v1 | **TRUNG** | RIS master |
| OfficeSupplyApproval | ✓ | ✓ `/office-supply-approval` | ✓ `/v2/office-supply-approval` | XÓA v1 | **TRUNG** | Supply mgmt |
| ReceiptBookAdmin | ✓ | ✓ `/receipt-book-admin` | ✓ `/v2/receipt-book-admin` | XÓA v1 | **TRUNG** | Receipt mgmt |
| RadiologyOps | ✓ | ✓ `/radiology-ops` | ✓ `/v2/radiology-ops` | XÓA v1 | **TRUNG** | RIS ops |
| SampleReceive | ✓ | ✓ `/sample-receive` | ✓ `/v2/sample-receive` | XÓA v1 | **TRUNG** | Lab intake |
| BhxhConfig | ✓ | ✓ `/bhxh-config` | ✓ `/v2/bhxh-config` | XÓA v1 | **TRUNG** | Insurance config |
| ConsultationRegister | ✓ | ✓ `/consultation-register` | ✓ `/v2/consultation-register` | XÓA v1 | **TRUNG** | Consult log |
| WorkloadReport | ✓ | ✓ `/workload-report` | ✓ `/v2/workload-report` | XÓA v1 | **TRUNG** | Workload metrics |
| MedicalSupply | ✓ | ✓ `/medical-supply` | ✓ `/v2/medical-supply` | XÓA v1 | **TRUNG** | Supply tracking |
| FollowUp | ✓ | ✓ `/follow-up` | ✓ `/v2/follow-up` | XÓA v1 | **TRUNG** | Patient follow-up |
| BookingManagement | ✓ | ✓ `/booking-management` | ✓ `/v2/booking-management` | XÓA v1 | **TRUNG** | Appointment mgmt |
| SmsManagement | ✓ | ✓ `/sms-management` | ✓ `/v2/sms-management` | XÓA v1 | **TRUNG** | Messaging |

### Nhóm 3: Cấp độ thấp (v1 route ACTIVE ít dùng, hoặc không có route rõ — XÓA ưu tiên THẤP)

Các trang v1 còn lại **có route v1 active** nhưng ít dùng (clinical modules, specialty modules, audit trails):

| Page V1 | Có V2? | Route v1 | Route v2 | Quyết định | Ưu tiên | Ghi chú |
|---|---|---|---|---|---|---|
| LabQC | ✓ | ✓ `/lab-qc` | ✓ `/v2/lab-qc` | XÓA v1 | **THẤP** | Lab QC |
| Microbiology | ✓ | ✓ `/microbiology` | ✓ `/v2/microbiology` | XÓA v1 | **THẤP** | Micro module |
| SampleStorage | ✓ | ✓ `/sample-storage` | ✓ `/v2/sample-storage` | XÓA v1 | **THẤP** | Sample storage |
| Screening | ✓ | ✓ `/screening` | ✓ `/v2/screening` | XÓA v1 | **THẤP** | Disease screening |
| ReagentManagement | ✓ | ✓ `/reagent-management` | ✓ `/v2/reagent-management` | XÓA v1 | **THẤP** | Lab reagent |
| SampleTracking | ✓ | ✓ `/sample-tracking` | ✓ `/v2/sample-tracking` | XÓA v1 | **THẤP** | Sample tracking |
| Pathology | ✓ | ✓ `/pathology` | ✓ `/v2/pathology` | XÓA v1 | **THẤP** | Pathology |
| IvfLab | ✓ | ✓ `/ivf-lab` | ✓ `/v2/ivf-lab` | XÓA v1 | **THẤP** | IVF lab |
| CultureCollection | ✓ | ✓ `/culture-collection` | ✓ `/v2/culture-collection` | XÓA v1 | **THẤP** | Culture bank |
| RisDispatcher | ✓ | ✓ `/ris-dispatcher` | ✓ `/v2/ris-dispatcher` | XÓA v1 | **THẤP** | RIS dispatch |
| RisAdmin | ✓ | ✓ `/ris-admin` | ✓ `/v2/ris-admin` | XÓA v1 | **THẤP** | RIS admin |
| VideoConsultation | ✓ | ✓ `/video-consultation` | ✓ `/v2/video-consultation` | XÓA v1 | **THẤP** | Telemedicine |
| NonDicomCapture | ✓ | ✓ `/non-dicom-capture` | ✓ `/v2/non-dicom-capture` | XÓA v1 | **THẤP** | Photo capture |
| CatalogsAdmin | ✓ | ✓ `/catalogs-admin` | ✓ `/v2/catalogs-admin` | XÓA v1 | **THẤP** | Catalog admin |
| EmployeeProfile | ✓ | ✓ `/employee-profile` | ✓ `/v2/employee-profile` | XÓA v1 | **THẤP** | Staff profile |
| Prescription | ✓ | ✓ `/prescription` | ✓ `/v2/prescription` | XÓA v1 | **THẤP** | Prescription |
| Telemedicine | ✓ | ✓ `/telemedicine` | ✓ `/v2/telemedicine` | XÓA v1 | **THẤP** | Telemedicine config |
| Nutrition | ✓ | ✓ `/nutrition` | ✓ `/v2/nutrition` | XÓA v1 | **THẤP** | Nutrition |
| InfectionControl | ✓ | ✓ `/infection-control` | ✓ `/v2/infection-control` | XÓA v1 | **THẤP** | Infection control |
| Rehabilitation | ✓ | ✓ `/rehabilitation` | ✓ `/v2/rehabilitation` | XÓA v1 | **THẤP** | Rehab |
| Equipment | ✓ | ✓ `/equipment` | ✓ `/v2/equipment` | XÓA v1 | **THẤP** | Equipment mgmt |
| HR | ✓ | ✓ `/hr` | ✓ `/v2/hr` | XÓA v1 | **THẤP** | HR module |
| Quality | ✓ | ✓ `/quality` | ✓ `/v2/quality` | XÓA v1 | **THẤP** | Quality |
| HealthExchange | ✓ | ✓ `/health-exchange` | ✓ `/v2/health-exchange` | XÓA v1 | **THẤP** | Data exchange |
| EmergencyDisaster | ✓ | ✓ `/emergency-disaster` | ✓ `/v2/emergency-disaster` | XÓA v1 | **THẤP** | ED/DR |
| MedicalRecordArchive | ✓ | ✓ `/medical-record-archive` | ✓ `/v2/medical-record-archive` | XÓA v1 | **THẤP** | Archive |
| BhxhAudit | ✓ | ✓ `/bhxh-audit` | ✓ `/v2/bhxh-audit` | XÓA v1 | **THẤP** | Insurance audit |
| SatisfactionSurvey | ✓ | ✓ `/satisfaction-survey` | ✓ `/v2/satisfaction-survey` | XÓA v1 | **THẤP** | Survey |
| LISConfig | ✓ | ✓ `/lis-config` | ✓ `/v2/lis-config` | XÓA v1 | **THẤP** | LIS config |
| SpecialtyEMR | ✓ | ✓ `/specialty-emr` | ✓ `/v2/specialty-emr` | XÓA v1 | **THẤP** | Specialty record |
| SigningWorkflow | ✓ | ✓ `/signing-workflow` | ✓ `/v2/signing-workflow` | XÓA v1 | **THẤP** | Sign workflow |
| MedicalRecordPlanning | ✓ | ✓ `/medical-record-planning` | ✓ `/v2/medical-record-planning` | XÓA v1 | **THẤP** | MR planning |
| EndpointSecurity | ✓ | ✓ `/endpoint-security` | ✓ `/v2/endpoint-security` | XÓA v1 | **THẤP** | Security policy |
| TreatmentProtocol | ✓ | ✓ `/treatment-protocols` | ✓ `/v2/treatment-protocols` | XÓA v1 | **THẤP** | Protocol mgmt |
| ChronicDisease | ✓ | ✓ `/chronic-disease` | ✓ `/v2/chronic-disease` | XÓA v1 | **THẤP** | Chronic disease |
| HospitalPharmacy | ✓ | ✓ `/hospital-pharmacy` | ✓ `/v2/hospital-pharmacy` | XÓA v1 | **THẤP** | Pharmacy central |
| ClinicalGuidance | ✓ | ✓ `/clinical-guidance` | ✓ `/v2/clinical-guidance` | XÓA v1 | **THẤP** | Guidelines |
| TbHivManagement | ✓ | ✓ `/tb-hiv` | ✓ `/v2/tb-hiv` | XÓA v1 | **THẤP** | TB/HIV program |
| HealthCheckup | ✓ | ✓ `/health-checkup` | ✓ `/v2/health-checkup` | XÓA v1 | **THẤP** | Health screening |
| Immunization | ✓ | ✓ `/immunization` | ✓ `/v2/immunization` | XÓA v1 | **THẤP** | Vaccination |
| Epidemiology | ✓ | ✓ `/epidemiology` | ✓ `/v2/epidemiology` | XÓA v1 | **THẤP** | Epi tracking |
| SchoolHealth | ✓ | ✓ `/school-health` | ✓ `/v2/school-health` | XÓA v1 | **THẤP** | School health |
| OccupationalHealth | ✓ | ✓ `/occupational-health` | ✓ `/v2/occupational-health` | XÓA v1 | **THẤP** | OHS |
| MethadoneTreatment | ✓ | ✓ `/methadone-treatment` | ✓ `/v2/methadone-treatment` | XÓA v1 | **THẤP** | Methadone |
| FoodSafety | ✓ | ✓ `/food-safety` | ✓ `/v2/food-safety` | XÓA v1 | **THẤP** | Food safety |
| CommunityHealth | ✓ | ✓ `/community-health` | ✓ `/v2/community-health` | XÓA v1 | **THẤP** | Community |
| HivManagement | ✓ | ✓ `/hiv-management` | ✓ `/v2/hiv-management` | XÓA v1 | **THẤP** | HIV program |
| MedicalForensics | ✓ | ✓ `/medical-forensics` | ✓ `/v2/medical-forensics` | XÓA v1 | **THẤP** | Forensics |
| TraditionalMedicine | ✓ | ✓ `/traditional-medicine` | ✓ `/v2/traditional-medicine` | XÓA v1 | **THẤP** | Traditional med |
| ReproductiveHealth | ✓ | ✓ `/reproductive-health` | ✓ `/v2/reproductive-health` | XÓA v1 | **THẤP** | OB/GYN |
| MentalHealth | ✓ | ✓ `/mental-health` | ✓ `/v2/mental-health` | XÓA v1 | **THẤP** | Psychiatry |
| EnvironmentalHealth | ✓ | ✓ `/environmental-health` | ✓ `/v2/environmental-health` | XÓA v1 | **THẤP** | Environmental |
| TraumaRegistry | ✓ | ✓ `/trauma-registry` | ✓ `/v2/trauma-registry` | XÓA v1 | **THẤP** | Trauma |
| PopulationHealth | ✓ | ✓ `/population-health` | ✓ `/v2/population-health` | XÓA v1 | **THẤP** | Population |
| HealthEducation | ✓ | ✓ `/health-education` | ✓ `/v2/health-education` | XÓA v1 | **THẤP** | Education |
| PracticeLicense | ✓ | ✓ `/practice-license` | ✓ `/v2/practice-license` | XÓA v1 | **THẤP** | License mgmt |
| InterHospitalSharing | ✓ | ✓ `/inter-hospital` | ✓ `/v2/inter-hospital` | XÓA v1 | **THẤP** | Data share |
| AssetManagement | ✓ | ✓ `/asset-management` | ✓ `/v2/asset-management` | XÓA v1 | **THẤP** | Asset mgmt |
| TrainingResearch | ✓ | ✓ `/training-research` | ✓ `/v2/training-research` | XÓA v1 | **THẤP** | Training |
| Procurement | ✓ | ✓ `/procurement` | ✓ `/v2/procurement` | XÓA v1 | **THẤP** | Procurement |
| PharmacyCatalogs | ✓ | ✓ `/pharmacy-catalogs` | ✓ `/v2/pharmacy-catalogs` | XÓA v1 | **THẤP** | Catalog admin |
| FinanceCatalogs | ✓ | ✓ `/finance-catalogs` | ✓ `/v2/finance-catalogs` | XÓA v1 | **THẤP** | Catalog admin |
| ParaclinicalCatalogs | ✓ | ✓ `/paraclinical-catalogs` | ✓ `/v2/paraclinical-catalogs` | XÓA v1 | **THẤP** | Catalog admin |
| ClinicalCatalogs | ✓ | ✓ `/clinical-catalogs` | ✓ `/v2/clinical-catalogs` | XÓA v1 | **THẤP** | Catalog admin |
| ReportCatalogs | ✓ | ✓ `/report-catalogs` | ✓ `/v2/report-catalogs` | XÓA v1 | **THẤP** | Catalog admin |
| NationalGateways | ✓ | ✓ `/national-gateways` | ✓ `/v2/national-gateways` | XÓA v1 | **THẤP** | NangCap23 |
| DeAn06Liaison | ✓ | ✓ `/de-an-06` | ✓ `/v2/de-an-06` | XÓA v1 | **THẤP** | NangCap23 |
| LinenManagement | ✓ | ✓ `/linen-management` | ✓ `/v2/linen-management` | XÓA v1 | **THẤP** | NangCap23 |
| FunctionalDiagnostics | ✓ | ✓ `/functional-diagnostics` | ✓ `/v2/functional-diagnostics` | XÓA v1 | **THẤP** | NangCap23 |
| ZaloNotifications | ✓ | ✓ `/zalo-notifications` | ✓ `/v2/zalo-notifications` | XÓA v1 | **THẤP** | NangCap23 |
| QualityDashboardLive | ✓ | ✓ `/quality-dashboard-live` | ✓ `/v2/quality-dashboard-live` | XÓA v1 | **THẤP** | NangCap23 |

### Nhóm 4: Pages v1 KHÔNG có route active trong App.tsx (SAFE to DELETE)

Các trang này **không xuất hiện** trong `App.tsx` mainline routes → **KHÔNG có route v1 active** → rủi ro xóa rất thấp.

| Page V1 | Có V2? | Route v1 Active? | Route v2 Active? | Quyết định | Ưu tiên | Ghi chú |
|---|---|---|---|---|---|---|
| QueueDisplay | ✓ (không đăng ký v2 formal) | ✗ `/queue-display` (line 348, public, outside MainLayout) | ✗ | GIỮ TẠM | **SAFE** | Public route, không phủ v2 |
| AppointmentBooking | ✗ | ✗ `/dat-lich` (public, outside MainLayout) | ✗ | GIỮ TẠM | **SAFE** | Public booking portal |
| PublicStudyViewer | ✗ | ✗ `/shared/:token` (public) | ✗ | GIỮ TẠM | **SAFE** | Public DICOM viewer |
| PublicEmrLookup | ✗ | ✗ `/tra-cuu-benh-an` (public) | ✗ | GIỮ TẠM | **SAFE** | Public EMR lookup |
| MobileHome | ✓ (không khai báo) | ✓ `/mobile` (line 408, inside MainLayout) | ✗ | GIỮ TẠM | **THẤP** | Mobile entry — có v2 DoctorPortalMobileApp + PatientPortalMobile chưa formal replace |
| PatientPortal | ✓ | ✓ `/patient-portal-staff` (line 444, v1 staff-on-behalf) | ✗ | GIỮ TẠM | **THẤP** | v1 staff-acting-as-patient; v2 redirect `/v2/patient-portal` → `/m/patient-portal` |
| DoctorPortal | ✗ | ✗ (v2 redirect `/v2/doctor-portal` → `/m/doctor-portal`) | ✗ | GIỮ TẠM | **SAFE** | Doctor v1 không có mainline route; v2 redirect đến mobile |
| Reports | ✗ | ✓ `/reports` (line 430, inside MainLayout) | ✓ `/v2/reports` | XÓA v1 | **TRUNG** | Reports v1 còn active |
| Dashboard3Cap | ✓ | ✓ `/dashboard-3cap` (line 365) | ✓ `/v2/dashboard-3cap` | XÓA v1 | **TRUNG** | 3-tier dashboard |

---

## B. Danh Sách 5-10 Ứng Viên XÓA An Toàn Nhất (Quick Wins)

Những page này có **route v1 ACTIVE**, **v2 tương ứng đã thay thế hoàn toàn**, **ít phụ thuộc yếu tố khác**:

1. **Dashboard.tsx** — Home page, route `/dashboard` → `/v2/dashboard` đã chuyển. Rủi ro: THẤP. Effort: 5 min.
2. **Reception.tsx** — Receptionist workflow, route `/reception` → `/v2/reception`. Rủi ro: THẤP. Effort: 5 min.
3. **OPD.tsx** — Clinic module, route `/opd` → `/v2/opd`. Rủi ro: THẤP. Effort: 5 min.
4. **Pharmacy.tsx** — Core pharmacy, route `/pharmacy` → `/v2/pharmacy`. Rủi ro: THẤP. Effort: 5 min.
5. **Billing.tsx** — Finance, route `/billing` → `/v2/billing`. Rủi ro: THẤP. Effort: 5 min.
6. **Laboratory.tsx** — LIS, route `/lab` → `/v2/lab`. Rủi ro: THẤP. Effort: 5 min.
7. **EMR.tsx** — Patient record, route `/emr` → `/v2/emr`. Rủi ro: THẤP. Effort: 5 min.
8. **Finance.tsx** — Accounting, route `/finance` → `/v2/finance`. Rủi ro: THẤP. Effort: 5 min.
9. **Insurance.tsx** — BHXH/Private, route `/insurance` → `/v2/insurance`. Rủi ro: THẤP. Effort: 5 min.
10. **MasterData.tsx** — Catalog, route `/master-data` → `/v2/master-data`. Rủi ro: THẤP. Effort: 5 min.

**Phác thảo bổ sung xóa:**
- BloodBank, Surgery, Radiology, Help, DigitalSignature, CentralSigning (19 trang từ "Nhóm 1" ở trên)
- Toàn bộ "Nhóm 2" (22 trang) trong cùng 1 phase
- Toàn bộ "Nhóm 3" (63 trang) nếu muốn dọn sạch

---

## C. Pages V1 Chỉ-Duy-Nhất (Không có bản V2 — PHẢI PORT)

Sau quét, chỉ **0 trang v1 hoàn toàn chỉ-duy-nhất**. Tất cả v1 pages đều có bản v2 tương ứng.

**Ghi chú**: Có vài v1 page chuyên biệt (QueueDisplay, AppointmentBooking, PublicStudyViewer, PublicEmrLookup, PatientPortal staff-acting) là public routes hoặc không hoàn toàn thay thế, nhưng không cần port vì:
- Public routes phục vụ external workflow (booking, DICOM sharing, EMR lookup) → không thuộc mainline app flow.
- PatientPortal staff-acting được giữ cho nhân viên tiểu sử hành động thay bệnh nhân (legacy use case cũ).

---

## D. Roadmap Port/Xóa (Phase-Based)

### Phase 1: Xóa v1 pages có v2 + route đã chuyển — An toàn CAO (6-8 tuần)

**Scope**: 20 trang (Nhóm 1 CAO ưu tiên)
- Dashboard, Reception, OPD, Inpatient, Pharmacy, Surgery, Laboratory, Radiology, Billing, EMR, Consultation, BloodBank, Finance, Insurance, MasterData, SystemAdmin, Help, DigitalSignature, CentralSigning, Reports, Dashboard3Cap

**Pre-flight**:
- ✓ Xác nhận v2 route đã active trong App.tsx
- ✓ Xác nhận v2 page có đủ feature (không thiếu modal/drawer)
- ✓ Xác nhận user base đã chuyển (analytics check nếu có)

**Verify**:
- `npm run build` (tsc -b, no errors)
- `npm run test` (Playwright/Cypress sanity check trên v2 route)

**Deliverable**: Delete 20 x `frontend/src/pages/*.tsx` + update `App.tsx` (remove lazy-load v1)

---

### Phase 2: Xóa v1 pages (Nhóm 2+3) — TRUNG + THẤP ưu tiên (4-6 tuần)

**Scope**: 85 trang còn lại (tất cả có v2 + route active)
- PharmacyApproval, DispensingCounter, ... (xem Nhóm 2 + Nhóm 3 ở trên)

**Pre-flight**:
- ✓ Batch size ≤ 20 pages/commit (dễ verify)
- ✓ Xác nhận v2 route active với team lead (nhất là NangCap pages)

**Verify**:
- `npm run build` per batch
- `npm run test` spot-check 3-5 pages per batch

**Deliverable**: Delete 85 x `frontend/src/pages/*.tsx` + curate `App.tsx`

---

### Phase 3: Dọn Route Trùng (Cleanup) — Tuần sau xóa v1 hết (1-2 tuần)

**Scope**: Kiểm tra `App.tsx` có duplicate route hoặc `<Outlet/>` nesting lạ
- Hiện tại: v1 routes nằm under `<Route path="/" element={<MainLayout>}>` + v2 routes separate under `<Route path="/v2">`. Không có conflict.
- Dọn: Nếu sau Phase 1-2, tất cả v1 lazy-load bị xóa, có thể trim `App.tsx` thêm. Đừng xóa TerminalLayout nested shell.

**Verify**:
- `npm run build`
- Check navigation still works (/ → /v2/dashboard redirect)

**Deliverable**: Clean `App.tsx`, remove dead import

---

## E. Rủi Ro & Mitigations

| Rủi ro | Severity | Mitigation |
|---|---|---|
| **Cross-page import** (v1 page import v1 helper từ v1 page khác) | MEDIUM | Grep `import.*from './pages/'` → verify no cross-import trước xóa |
| **Modal/Drawer nằm trong v1 component** | MEDIUM | Xác nhận v2 page có exact modal (compare source code trước xóa) |
| **Route URL hardcoded trong v1 JS** (e.g., navigate("/pharmacy") từ OPD) | MEDIUM | Grep `"/pharmacy"` / `"/lab"` trong v1 pages → update to `/v2/*` |
| **Lazy-load reference bị xóa** | LOW | Xóa lazy-load dòng trong App.tsx đúng lúc |
| **API client version mismatch** | LOW | V2 pages dùng cùng api client — không rủi ro |
| **CSS import orphaned** (v1 page import global CSS chỉ dùng v1) | LOW | Scan `pages/*.tsx` for `import '../..css'` → nhưng ít khi xảy |

---

## F. Kế Hoạch Kiểm Tra (Verification Checklist)

**Trước mỗi Phase**:
- [ ] Đọc v2 page source, so sánh feature với v1
- [ ] Xác nhận route v2 active trong App.tsx
- [ ] Run `npm run build` trên branch hiện tại
- [ ] Run E2E test trên v2 route (Playwright): login → navigate → key workflow
- [ ] Check browser console (no 404, no dead import)

**Sau mỗi Phase commit**:
- [ ] `npm run build` — no TS error
- [ ] `npm run test` (unit test nếu có)
- [ ] Spot-check 3-5 pages: delete file + verify git shows file deleted
- [ ] Update CLAUDE.md work log: "Phase N: xóa M pages, commit abc123"

---

## G. Estimate Effort & Timeline

| Phase | Pages | Effort/Page | Total | Timeline |
|---|---|---|---|---|
| **Phase 1** | 20 | 5-10 min | 2-3 hours | 1 week |
| **Phase 2** (batches) | 85 | 5-10 min | 7-14 hours | 3-4 weeks |
| **Phase 3** (cleanup) | — | 30 min | 0.5-1 hour | 1 day |
| **Fallback rollback** | any | 10 min | 0.5 hour | 1 hour (git reset) |

**Total calendar**: ~6 weeks, **low-risk** if batched + verified per phase.

---

## H. Non-Goals & Out-of-Scope

❌ **Không làm trong issue #163**:
- Port/refactor v2 page content (design debt → separate issue)
- Migrate v1 CSS → v2 ab-* CSS (design system migration → #XXX)
- Modify backend API (no contract change)
- Update documentation / CLAUDE.md (do sau khi xóa xong)

✓ **Làm trong #163**:
- Xóa file v1 pages
- Update App.tsx routes (remove lazy-load + route definition)
- Verify build + basic navigation

---

## I. Giải Pháp Thay Thế Cho Public Routes (QueueDisplay, AppointmentBooking, etc.)

Những route public này hiện tại chỉ có v1. Không có v2 tương ứng formal trong App.tsx:

| Route | V1 File | V2 Equivalent? | Decision |
|---|---|---|---|
| `/queue-display` | QueueDisplay.tsx | Không formal | GIỮ v1 (public, ngoài MainLayout) |
| `/dat-lich` | AppointmentBooking.tsx | Không | GIỮ v1 (public booking portal) |
| `/shared/:token` | PublicStudyViewer.tsx | Không | GIỮ v1 (public DICOM viewer) |
| `/tra-cuu-benh-an` | PublicEmrLookup.tsx | Không | GIỮ v1 (public EMR lookup) |

**Lý do giữ**: Những route này không thuộc mainline authenticated app. Nếu muốn redesign, sẽ là riêng story (e.g., "Modernize public portal").

---

## J. Commit Strategy

**Không push tất cả 122 file xóa trong 1 commit.** Batch:
- Batch 1: Dashboard + 4 core pages (5 files) → 1 commit
- Batch 2: 10-15 pages → 1 commit
- ...

**Commit message template**:
```
refactor(fe): delete v1 pages [Phase N], route migrated to /v2/*

- Delete: pages/Dashboard.tsx, pages/Reception.tsx, ... (N files)
- Updated: App.tsx (removed lazy-load + route definition for V1_<Name>)
- Verified: npm run build, Playwright v2 route sanity

Closes #163 (when all phases done)
```

---

## K. References

- **App.tsx**: `frontend/src/App.tsx` — route definitions, lazy-load statements
- **Memory**: `feedback_fe-tech-debt-priority-v2` — ưu tiên pages-v2 trước pages/
- **Design Pack**: `frontend/src/pages-v2/_v2kit.tsx` — shared v2 components (KpiStrip, TopTabs, DataTable)
- **CSS Layout**: `frontend/src/layouts/terminal/ab-module.css` — v2 terminal layout styles
- **GitHub Issue**: #163 "[UI-AUDIT][MEDIUM] Khử dual design-system v1(124)/v2(155)"

---

**Last updated**: 2026-06-17  
**Generated by**: his-docs-manager (inline, not via agent)  
**Status**: INVENTORY+ROADMAP complete — awaiting Phase 1 approval & execution
