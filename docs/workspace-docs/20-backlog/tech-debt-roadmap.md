# Tech-Debt Roadmap — HIS

> Evergreen backlog nợ kiến trúc. Cập nhật tại chỗ (không tạo bản v2). Nguồn: audit luồng nghiệp vụ
> `10-assessment/audit-luong-nghiepvu-2026-06-06.md`. Liên kết: `10-assessment/rule-compliance-audit.md`,
> skill `his-tech-debt-workflow` + `his-architecture-planner`.

## Bối cảnh — FLOW-1 (P0) + FLOW-2 (P1) ĐÃ XONG 2026-06-08 (chưa push)
- **FLOW-1 (6/6)**: KQ XN về màn khám (đọc ServiceRequestDetail) · CLS tại giường persist · sinh hiệu nội trú lưu DB
  (bảng `InpatientVitalSigns`, mig 78) · worklist "chờ nhập viện" · bảng kê gom nợ thuốc + chặn ra viện ·
  phát thuốc trừ kho FEFO.
- **FLOW-2 (6/7)**: OPD tạo ServiceRequestDetail (#9) · phiên khám "Chờ CLS"=2 (#7) · mark-performed cập nhật SRD
  (#8 một phần) · Admission.Status 5="Đã chuyển khoa" (#11) · FEFO gộp nhiều lô + throw khi thiếu (#12) ·
  nút Hủy phát đúng route (#13). **#10 DEFER → #14** (dưới).
- **#17 ĐÃ XONG 2026-06-08**: auto-call `CreateBillingAfterDispensingAsync` sau `DispenseOutpatientPrescriptionAsync`
  (idempotent qua cờ `ExportReceipt.IsBilled`, mig 79). Lỗi billing nuốt có chủ đích, retry bằng nút thủ công.

---

## FLOW-3 (P2) — nợ kiến trúc còn lại (lập plan trước khi code)

### 🔎 P0 KHẢO SÁT — KẾT QUẢ 2026-06-08 (đổi chiến lược #14)
- **Model 1** `ServiceRequest/ServiceRequestDetail` = nguồn-sự-thật THẬT: order tạo (sau #9), KQ XN ghi vào
  `ServiceRequestDetail.Result` qua `SampleReceiveController` + `LISCompleteService.{Microbiology,ReportsWorklist}` + `IvfLabService`.
- **Model 2** `LabRequest/LabRequestItem/LabResults` = **CHẾT trong luồng thật**: `new LabRequest/LabResult` chỉ xuất hiện
  trong `DailySeedController` + `PopulateDataController` (seed/demo). Không service nghiệp vụ nào tạo/đọc cho luồng KQ.
  → `LabCancelChainController` đang thao tác trên dữ liệu chết.
- **Model 4** `RadiologyRequest/RadiologyExam/RadiologyReport` = THẬT (`RadiologyOperationsController`); `RadiologyDispatch`
  ĐÃ có `ServiceRequestDetailId` (model 1↔dispatch OK). `GetPatientLabResultsAsync` (#1) đã gộp model 4 vào KQ CĐHA.
- **Model 3** `LabOrder/LabOrderItems` — cần khảo sát tương tự (nghi cũng legacy).

**→ CHIẾN LƯỢC MỚI: KHÔNG "đồng bộ 2 chiều" mà DEPRECATE model chết.**
- **#14a ✅ XONG 2026-06-08 (đóng #10)**: viết lại `LabCancelChainController` thao tác trên `ServiceRequestDetail`
  (model 1) — input `serviceRequestDetailId` (dual-lookup: SRD id HOẶC ServiceRequest cha → áp mọi dòng). Hủy
  duyệt (ReviewedAt→null) / hủy KQ (Status 2→1, xóa Result) / hủy lấy mẫu (→0) + cập nhật `ServiceRequest.Status`
  cha (3→2). FE: `labCancelChain.ts` + `laboratory.ts` + `LabCancelChainMenu.tsx` prop + v1 `Laboratory.tsx` caller
  đổi sang `serviceRequestDetailId`. Build 2 tầng 0 err · suite 10/10 · doithu-gap 28/28 · Cypress 81/81 · Playwright 588/0fail.
- **#14b ✅ một phần 2026-06-08**: `GetPendingLabStatusAsync` (màn khám — pending XN) chuyển đọc `ServiceRequestDetail`
  (model 1) thay `LabRequestItems`. **Còn ~9 reader model-2 khác** (lower priority, hiện trả rỗng không vỡ):
  `BusinessAlertService` · `DqgvnService` · `PatientPortalServiceImpl` · `FhirService` · `HospitalReportService` ·
  `ReportingCompleteService` · `LISCompleteService.{cs,ConnectionSample,Microbiology,ReportsWorklist}` — chuyển dần
  từng site có verify (report/FHIR đổi số liệu → cẩn thận). **Lưu ý**: LISComplete vừa đọc model 2 vừa ghi model 1 → cần audit kỹ từng path.
- **#14c ✅ KHẢO SÁT 2026-06-08**: `new LabOrder/LabOrderItem` (model 3) **cũng chỉ seed tạo** → legacy như model 2,
  gỡ cùng #14e.
- **#14d ✅ 2026-06-08 (đóng #8 đầy đủ)**: thêm `RadiologyRequest.SourceServiceRequestDetailId` (**mig 80**);
  `mark-performed` tạo `RadiologyRequest` (model 4) từ SRD nếu chưa có (idempotent qua link) + set SRD.Status=1 →
  radiologist có phiếu để tường trình KQ CĐHA. (Phiếu model 4 trước chỉ sinh qua `AddOn` cần parent + seed.)
- **#14e ⏸️ CHECKPOINT**: sau khi không còn reader thật model 2/3 (hoàn tất #14b-remaining) → migration gỡ bảng
  model 2/3. ⚠️ **DESTRUCTIVE — luôn hỏi user trước.** Chưa làm.
> ⚠️ **CHECKPOINT trước #14a**: đổi contract FE + xóa code → cần user duyệt. Đã DỪNG ở P0 (khảo sát) 2026-06-08.

### #14 — Hợp nhất 4 mô hình dữ liệu CLS (mô tả gốc)  🔴 HARD · blast-radius RẤT LỚN
**Vấn đề**: 4 model song song không đồng bộ — `ServiceRequest/ServiceRequestDetail` (model 1, nay là nguồn-sự-thật
sau FLOW-1), `LabRequest/LabRequestItem` + `LabResults` (model 2), `LabOrder/LabOrderItems` (model 3),
`RadiologyRequest/RadiologyExam/RadiologyReport` (model 4). Gốc của #1, #8, #10.
**Mục tiêu**: chọn **ServiceRequest/ServiceRequestDetail làm nguồn-sự-thật**; model 2/3/4 → đồng bộ hai chiều hoặc loại bỏ dần.

Pha đề xuất (mỗi pha build-gate + regression + KHÔNG push tới khi duyệt):
- **P0 Khảo sát + ánh xạ**: lập bảng mapping thực tế giữa các model (FK nào có/thiếu). **Phát hiện then chốt**:
  `LabRequestItem` và `RadiologyRequest` **KHÔNG có** cột link tới `ServiceRequestDetail` → đây là rào cản #10/#8.
  `RadiologyDispatch` ĐÃ có `ServiceRequestDetailId` (model 1↔dispatch OK).
- **P1 Thêm link (migration, additive, an toàn)**: thêm `SourceServiceRequestDetailId` (nullable) vào `LabRequestItem`
  + `RadiologyRequest`; backfill best-effort theo (MedicalRecordId + ServiceId + thời điểm). KHÔNG đổi logic — chỉ thêm cột.
- **P2 Đồng bộ ghi**: nơi tạo LabRequestItem/RadiologyRequest set link; nơi ghi KQ (LIS/RIS) đồng bộ ngược về
  `ServiceRequestDetail.Result/Status` (hoặc trigger app-level). → giúp `GetPatientLabResultsAsync` (#1) thấy mọi nguồn.
- **P3 Đóng #10**: viết lại `LabCancelChainController` rollback theo link → cập nhật `ServiceRequestDetail` + `ServiceRequest.Status`
  cha (header hủy=4, detail hủy=3 — xem memory `servicerequest-status-enum-gotcha`).
- **P4 Đóng #8 (bridge model 4)**: `mark-performed` tạo/ánh xạ `RadiologyRequest` từ SRD để radiologist tường trình;
  KQ về đồng bộ SRD.Status 2→ "Có KQ".
- **P5 Dọn**: model 2/3 nào không còn nguồn ghi → đánh dấu deprecated, sau đó migration gỡ (giữ dữ liệu lịch sử).
**Rủi ro**: mất/lệch dữ liệu KQ trên prod. **Bắt buộc**: backup + dry-run trên bản sao + verify count trước/sau mỗi migration.
**Verify**: `test-regression-suite` + `test-doithu-gap` + smoke màn khám hiển thị KQ XN/CĐHA + cancel-chain.

### #15 — Tổng kết bệnh án nội trú tự tổng hợp  ✅ XONG 2026-06-08
Endpoint `GET inpatient/{admissionId}/auto-summary` → `GenerateTreatmentSummaryAsync` tổng hợp
`DailyProgress(SOAP) + Prescriptions(Type=2) + ServiceRequests(CLS) + SurgeryRequests` thành text tóm tắt
(prefill `TreatmentSummary` lúc ra viện). Đọc-tổng-hợp, không đổi schema. Suite 10/10.
**Còn tùy chọn**: FE discharge modal gọi endpoint prefill (BE đã sẵn sàng).

### #16 — Triển khai/ẩn các stub nội trú  🟠 một phần XONG 2026-06-08
- **✅ CheckTransferWarningsAsync** implement THẬT (đơn nội trú chưa cấp + CLS chưa KQ) — trước đây stub luôn
  `CanTransfer=true` (chuyển khoa không cảnh báo). Advisory (không cứng chặn).
- **⏸️ Còn stub feature** (mỗi cái = 1 module riêng): `GetNutritionSummaryAsync` · `CreateConsultation`/`GetConsultations`
  (hội chẩn) · truyền dịch/máu · ADR · sơ sinh. **Khuyến nghị**: ẩn/disable nút FE cho các phân hệ này (tránh nút
  giả) đến khi implement thật theo nhu cầu.

### #17 — ✅ XONG (xem trên).

### 🆕 FEATURE — KQ XN cấu trúc per-parameter (🟠 MEDIUM, lập plan riêng)
**Bối cảnh**: `ServiceRequestDetail.Result` hiện là **1 string** → mất cấu trúc per-parameter
(ParameterName · Value · Unit · ReferenceRange/Min/Max · IsAbnormal · CriticalLow/High · SequenceNumber)
mà model 2 `LabResult` / model 3 `LabOrderItem` từng có. Cần cho: **tô màu cảnh báo cao/thấp (H đỏ / L xanh /
HH-LL nguy kịch)**, khớp **mẫu phiếu KQ MQ**, in phiếu XN cấu trúc, export FHIR/DQGVN đúng chuẩn.
**Hiện trạng (2026-06-08)**: analyzer (`ProcessLabResultsAsync`) + KTV (`EnterLabResultAsync` dual-write) +
SampleReceive đều ghi `SRD.Result` (string, KHÔNG có ngưỡng/cảnh báo per-parameter). Đủ để hiển thị KQ
ở màn khám/portal/báo cáo, NHƯNG chưa tô màu H/L được.
**Đề xuất plan sau**: thêm bảng `ServiceRequestDetailResult` (1-n từ SRD) với các cột per-parameter +
ngưỡng; mọi write-path (analyzer/KTV/SampleReceive) tách dòng kết quả vào bảng này; reader (màn khám/portal/
PDF/FHIR/DQGVN) đọc + tô màu. Khi đó các export cấu trúc (PdfGen/FHIR/DQGVN/NangCap24) mới convert đầy đủ
được (đã defer ở FLOW-4). KHÔNG làm vội — lập plan + migration cẩn thận.

---

## 🔐 BẢO MẬT — audit FLOW-FINAL 2026-06-06 (P0)
- **B1 ✅ XONG 2026-06-08**: enforce CCHN server-side trong `StartExaminationAsync` — chặn BS có license
  hết hạn/đình chỉ/thu hồi (`!IsValid && LicenseExpiry.HasValue`); KHÔNG chặn BS chưa có record (tránh vỡ).
- **B3 ✅ một phần XONG 2026-06-08**: `[Authorize(Roles="Admin,Doctor,DepartmentHead,Nurse")]` cho
  `DigitalSignatureController` + `CentralSigningController` (loại lễ tân/kế toán ký số).
- **B2 ⏸️ DEFER → FEATURE (đã verify kỹ 2026-06-08)**: IDOR `/api/portal/*` nhận `patientId`/`accountId` từ query
  (ExtendedWorkflowControllers :828-992). **Kết luận sau khi đọc code**: model hiện tại là **staff-on-behalf** —
  KHÔNG có patient self-login. Cụ thể: (1) `RegisterAccountAsync` tạo PortalAccount Status=Pending, KHÔNG set PatientId;
  (2) `LinkPatientRecordAsync` CÓ link `account.PatientId = patient.Id` sau verify; (3) **KHÔNG có portal-login route**
  → PortalAccount không lấy được JWT; (4) JWT hiện chỉ của staff (`AuthService`, NameIdentifier=user.Id ≠ PortalAccount.Id).
  → "Lấy patientId từ JWT" **bất khả thi** (không có claim) + thêm check ownership sẽ chặn toàn bộ (staff JWT không map
  PortalAccount) → **vỡ portal**. **Fix đúng = build FEATURE portal patient self-login**: endpoint login PortalAccount
  (verify password/OTP) → JWT mang claim `portalAccountId` → mọi `/api/portal/*` derive `patientId = account.PatientId`
  (bỏ query param) + chặn nếu account chưa Active/chưa link. Lập plan + làm như 1 feature, KHÔNG vá tạm.
- **B3-global ⏸️ DEFER**: fallback `RequireAuthenticatedUser` toàn cục (Program.cs) để controller quên `[Authorize]`
  không mở toang — cần **audit kỹ mọi endpoint công khai** (AppointmentBooking/public-emr/queue-display có
  `[AllowAnonymous]` chưa) trước khi bật, tránh vỡ luồng public.

## 🌐 GHI NHẬN — feature lớn / chưa làm (audit FLOW-FINAL)
- **Đa cơ sở (multi-facility)**: entity lõi thiếu `FacilityId`, query không lọc theo cơ sở. An toàn vì deploy
  single-facility. Đa cơ sở sau → feature lớn (thêm FacilityId + global query filter EF).
- **Hội chẩn organizer hardcode GUID** `9e5309dc...` → đổi dùng current-user (data-quality nhỏ).
- **P1/P2 FLOW-FINAL — đã làm bounded 2026-06-08**: ✅ F2 (GetDietTypes đọc DB, hết bug Guid.NewGuid) ·
  ✅ F5 (booking check-in nối QuickRegisterByAppointment → sinh lượt khám thật) · ✅ F1-diag (bỏ hardcode
  "Viêm ruột thừa cấp", đọc HSBA) · ✅ F10 (responseRate tính thật = khảo sát/BN ra viện, bỏ 68.5).
  **⏸️ Còn FEATURE-sized (cần bảng/billing, làm theo nhu cầu từng cái)**:
  - **F1-full**: `SurgeryPrescriptionServiceImpl` toàn stub → cần bảng SurgeryMedicine/Supply + persist +
    trừ kho + nối BillingComplete (phân BHYT/thu phí). Bỏ nuốt lỗi schema ở Start/CompleteSurgery (:68-116).
  - **F3**: cấp cứu thường — EmergencyDisaster.tsx bỏ `buildEmergencySeed`, nối ReceptionComplete +
    ObservationStay + triage persist (FE+BE feature).
  - **F4**: BHYT đối soát (InsuranceXmlService :1647/1709) — import KQ giám định + tính chênh lệch thật.
  - **F6**: YHCT đơn thuốc bắc → ServiceRequest/Prescription + viện phí + trừ kho dược liệu.
  - **F7**: Rehab mỗi buổi trị liệu → ServiceRequestDetail tính phí.
  - **F8**: Telemedicine `SendPrescriptionToPharmacyAsync` đã đổi status; cần tạo Prescription thật sang quầy phát.
  - **F9**: Quality corrective / InfectionControl env / Portal refill-feedback-eKYC — persist thật hoặc ẩn UI.
  - **F2-meal**: meal plan/cấp phát suất ăn (GenerateMealPlan/MarkMealDelivered stub) — cần bảng MealPlan hoặc ẩn UI.

## Nguyên tắc thực thi (his-tech-debt-workflow)
- Dễ → khó; mỗi item: build-gate 2 tầng + regression Prompt 12 trước khi báo xong.
- **KHÔNG commit/push** khi chưa có lệnh; workspace-docs **không bao giờ push**.
- Migration idempotent (`IF NOT EXISTS`), số kế tiếp theo thư mục `Data/Scripts/` (mới nhất: **79**).
- #14 đụng data prod → backup + dry-run + verify count bắt buộc; chia pha nhỏ, dừng giữa pha để review.
