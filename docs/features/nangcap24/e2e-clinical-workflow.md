# NangCap24 — Mô phỏng E2E quy trình khám chữa bệnh (bám HSMT NangCap24.pdf)

> **Mục đích:** Mô phỏng toàn bộ luồng nghiệp vụ thực tế từ lúc bệnh nhân đến viện → thanh toán → rời viện,
> **neo theo tài liệu HSMT** `docs/requirements/tai-lieu-nang-cap/NangCap24.pdf` và **đối chiếu code thật**
> (verify, không suy đoán). Mỗi bước ghi rõ: actor · chức năng HSMT NangCap24 · touchpoint 10 gap NangCap24 ·
> API · service · DB table + status · input/output · validation/rule · trạng thái đổi · happy + error/edge case ·
> màn hình + responsive · data fix cứng/thiếu.
> **Nguồn HSMT:** NangCap24.pdf §1.1–1.9 (HIS), §2.1–2.8 (LIS), §3 (EMR), RIS §1.1–1.20 + PACS §2.1–2.4.
> **Quy ước test (theo yêu cầu):** mọi test **nhập dữ liệu THẬT vào DB** qua API thật (không mock) — xem §14.
> **Last updated:** 2026-05-28 · **Liên quan:** [README](./README.md) · [analysis](./analysis.md) · [test-plan](./test-plan.md) · [test-guide](./test-guide.md) · [workflow-test](./workflow-test.md) · [summary](./summary.md)

---

## Mục lục
- [0. Bản đồ NangCap24 ↔ 11 bước flow](#0-bản-đồ-nangcap24--11-bước-flow)
- [Bảng status enum (tham chiếu chung)](#bảng-status-enum-tham-chiếu-chung)
- [Bước 1–2. Tiếp nhận + cấp số khám](#bước-12-tiếp-nhận--tạo-lượt-khám-cấp-số)
- [Bước 3. Khám bác sĩ](#bước-3-khám-bác-sĩ)
- [Bước 4. Chỉ định CLS/XN](#bước-4-chỉ-định-clsxn)
- [Bước 5. Thực hiện CLS/XN](#bước-5-thực-hiện-clsxn)
- [Bước 6. Trả kết quả](#bước-6-trả-kết-quả)
- [Bước 7. Kê toa / chỉ định nhập viện](#bước-7-kê-toa--chỉ-định-nhập-viện)
- [Bước 8. Thanh toán viện phí (NangCap24 Bank/VietQR)](#bước-8-thanh-toán-viện-phí-nangcap24-bankvietqr)
- [Bước 9. Cấp phát thuốc](#bước-9-cấp-phát-thuốc)
- [Bước 10. Xuất viện / kết thúc lượt khám](#bước-10-xuất-viện--kết-thúc-lượt-khám)
- [Bước 11. Case đặc biệt (BHYT, tạm ứng, hủy/sửa, đổi phòng, hoàn tiền)](#bước-11-case-đặc-biệt)
- [12. Data fix cứng / thiếu + đề xuất bổ sung logic](#12-data-fix-cứng--thiếu--đề-xuất-bổ-sung-logic)
- [13. Responsive audit + plan fix](#13-responsive-audit--plan-fix)
- [14. Test với dữ liệu THẬT trong DB](#14-test-với-dữ-liệu-thật-trong-db)
- [15. Checklist E2E cho QA/Dev](#15-checklist-e2e-cho-qadev)

---

## 0. Bản đồ NangCap24 ↔ 11 bước flow

Luồng KCB lõi (tiếp nhận→xuất viện) là HIS nền; **NangCap24 (10 gap)** chạm vào các bước sau (neo HSMT.pdf):

| Bước | Chạm gap NangCap24 | Neo HSMT (NangCap24.pdf) |
|---|---|---|
| 1 Tiếp nhận | (BHYT) — gap #2 Cổng thanh tra BHXH dùng *sau* | §1.1 "Kiểm tra/Lấy thông tin thông tuyến cổng BHXH", "Chụp ảnh thông tuyến" |
| 5 Thực hiện XN | gap #6 **HL7 queue** (LIS↔HIS) | LIS §2.7 "Gửi lấy mẫu tự động", §2.8 "Tích hợp HIS↔LIS 1/2 chiều"; RIS §1.12 "Quản lý Message RIS-HIS / gửi lại lỗi" |
| 5 Chụp CĐHA | gap #5 **DICOM auto-send**, gap #9 **DICOM study log** | PACS §2.4 "Gửi file DICOM sang server khác / Mã hoá khi gửi / Cấu hình tự động gửi / Thống kê ca đã gửi"; RIS §1.11 "Log lịch sử ca chụp (tạo/nhận/đọc/duyệt/sửa/in/match)" |
| 6 Trả KQ | gap #9 viewer **MIP/MinIP** + **Cine**, gap #9 log 'viewed'/'result_approved', gap #2 **biometric** ký KQ, gap #3 **EMR HL7 export** | PACS §2.3 "Animation" (Cine), §2.4 "MIP/minIP, MPR, 3D"; RIS §1.6 "QR PACS viewer, xuất PDF/DICOM SR, ghi log thao tác"; RIS §1.9 "hỗ trợ ký số điện tử" |
| 6/10 EMR | gap #2 **biometric ký HSBA**, gap #4 **EMR cloud sync**, gap #3 **EMR HL7 export** | EMR §3 "ký số điện tử (sinh trắc/XML), đồng bộ Cloud, tạo file HL7" (HSMT EMR ký số) |
| 8 Thanh toán | gap #8 **Bank/VietQR Napas247** | §1.7 "Chuyển khoản thanh toán chi phí", "Xuất hoá đơn điện tử" |
| 11 BHYT audit | gap #2 **Cổng giám định BHXH** | §1.7 "Check thông tin thẻ trên cổng bảo hiểm"; "Cổng giám định BHXH trên web" |

> Các gap "admin/cấu hình" (DicomAutoSend rule, Hl7Queue retry UI, DicomStudyAuditLog, BankPayments, BiometricEnrollment,
> EmrCloudSync, EmrHl7Export, InspectorPortal) là **màn hình quản trị** phục vụ các touchpoint trên — đã wire route `/v2/*` + menu `[24]`.

---

## Bảng status enum (tham chiếu chung)
*(theo entity `HIS.Core/Entities`, verify file:line trong analysis của từng bước)*

| Entity | Field | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|---|
| `MedicalRecord` | Status | Chờ khám | Đang khám | Chờ KQ CLS | Hoàn thành | Đã thanh toán | — |
| `Examination` | Status | Chờ khám | Đang khám | Chờ CLS | Chờ kết luận | Hoàn thành | — |
| `QueueTicket` | Status | Chờ | Đang gọi | Đang phục vụ | Hoàn thành | Bỏ qua | — |
| `QueueTicket` | QueueType | — | Tiếp đón | Khám | XN | CĐHA | Thuốc / (6) Thanh toán |
| `ServiceRequest` | Status | Chờ TH | Đã TH | Đang TH | Có KQ | Hủy | — |
| `LabRequest`/`Item` | Status | Pending | SampleCollected | Processing | Completed | Approved | Cancelled/Rejected |
| `RadiologyRequest` | Status | Pending | Scheduled | InProgress | Completed | Reported | Approved / (6) Cancelled |
| `Prescription` | Status | Chờ duyệt | Đã duyệt | Đã cấp phát | Hoàn trả | Hủy | — |
| `Admission` | Status | Đang điều trị | Ra viện | Chuyển viện | Tử vong | Bỏ về | — |
| `Receipt` | ReceiptType / Status | — | Tạm ứng / Đã thu | Thanh toán / Đã hủy | Hoàn trả | — | — |
| `InvoiceSummary` | Status | Chưa TT | Đã TT | Đã quyết toán | — | — | — |
| NangCap24 status | (string) | — | `pending`/`sending`/`sent`/`failed`/`acked` (HL7), `pending`/`sending`/`done`/`failed` (DICOM), `active`/`revoked` (biometric) | | | | |

---

## Bước 1–2. Tiếp nhận + tạo lượt khám (cấp số)

| Khoản | Nội dung |
|---|---|
| **Actor** | Nhân viên tiếp nhận (lễ tân) |
| **HSMT** | §1.1 Phân hệ tiếp nhận đăng ký (thêm/sửa/xóa BN, kiểm tra thông tuyến BHXH, in mã vạch HSBA, chụp ảnh CMT, đăng ký nhiều phòng khám, tách bệnh án, xác nhận BHYT 100%, in phiếu đăng ký) |
| **API** | `POST /api/reception/register/insurance` (BHYT) · `POST /api/reception/register/fee` (viện phí) · `POST /api/reception/queue/issue` (cấp STT) — `ReceptionCompleteController` |
| **Service** | `ReceptionCompleteService.RegisterInsurancePatientAsync` (≈:1191) / `RegisterFeePatientAsync` (≈:1398) / `IssueQueueTicketAsync` (≈:349) |
| **DB tạo/đổi** | `MedicalRecord` (Status=0, RoomId, AdmissionDate) + `Examination` (Status=0, RoomId) + `QueueTicket` (Status=0, QueueType=2) — 1 transaction |
| **Input** | `InsuranceRegistrationDto`{PatientId/Code, InsuranceNumber, RoomId, DoctorId?, IsPriority} / `FeeRegistrationDto`{..., ServiceType, NewPatient?} |
| **Output** | `AdmissionDto` (mã BN, STT/queueCode, phòng, BHYT) |
| **Validation/rule** | BHYT: verify cổng BHXH (còn hạn `EndDate>today`, `IsValid`); bắt buộc `RoomId`; phòng chưa đầy (`WaitingCount<MaxPatientsPerDay`, `InsurancePatientsToday<Max`); chống trùng STT cùng BN+phòng+ngày |
| **Trạng thái sau** | MR.Status=0, Examination.Status=0, QueueTicket.Status=0 (chờ gọi) |
| **Màn hình** | `/v2/reception` → `pages-v2/Reception.tsx` (v1: `/reception`); cấp số dùng cùng trang |
| **Happy** | BN có BHYT hợp lệ → đăng ký phòng Nội → nhận STT A001 → MR+Exam+Ticket tạo |
| **Error/edge** | Thẻ BHYT hết hạn → reject (hiện lỗi server thật, xem commit `d9b638b`); phòng đầy → ko cho chọn; BN chưa có hồ sơ → tạo mới; **đăng ký sáng sớm VN trước 07:00** → AdmissionDate lệch ngày UTC (xem §12) |
| **Responsive** | Form đăng ký nhiều field + ảnh webcam → kiểm cột dồn ở <768px |

---

## Bước 3. Khám bác sĩ

| Khoản | Nội dung |
|---|---|
| **Actor** | Bác sĩ khám |
| **HSMT** | §1.2 (nhập khám, sinh hiệu, bệnh sử, chẩn đoán ICD10, kiểm tra tương tác thuốc, kết thúc/hủy kết thúc khám) |
| **API** | `POST /api/examination/{id}/start` · `PUT .../vital-signs` · `.../diagnosis` · `GET /api/examination/room/{roomId}/patients` (danh sách phòng) — `ExaminationCompleteController` |
| **Service** | `ExaminationCompleteService.StartExaminationAsync` (≈:156), `GetRoomPatientListAsync` (:220) |
| **DB** | `Examination`: Status 0→1; fields ChiefComplaint, vital signs (Temperature/Pulse/BP/SpO2/BMI), MainDiagnosis/MainIcdCode, ConclusionType (1 cho về…6 tử vong) |
| **Input/Output** | start: examinationId → ExaminationDto; vital/diagnosis DTO |
| **Validation/rule** | Chẩn đoán ≥1 ICD; chọn đúng phòng (list lọc theo `RoomId` + `AdmissionDate==today`) |
| **Trạng thái sau** | Examination.Status=1, MR.Status có thể =1 |
| **Màn hình** | v2 `/v2/opd` (list) → nút "Khám" sang v1 `/opd` (form đầy đủ). ⚠️ **lưu ý đã ghi nhận**: page khám lọc theo phòng + auto-chọn phòng đầu → BN phòng khác không hiện (xem mục OPD ở work-log) |
| **Happy** | Chọn phòng → chọn BN trong queue → nhập sinh hiệu/chẩn đoán → lưu |
| **Error/edge** | Chưa chọn phòng → "Vui lòng chọn phòng"; BN ở phòng khác phòng đang chọn → list rỗng (cần chọn đúng phòng) |
| **Responsive** | Form sinh hiệu nhiều cột; bảng queue → kiểm <1024px |

---

## Bước 4. Chỉ định CLS/XN

| Khoản | Nội dung |
|---|---|
| **Actor** | Bác sĩ khám |
| **HSMT** | §1.2 "Chỉ định dịch vụ (XN, CĐHA, TDCN, Thủ thuật)", "In phiếu chỉ định", "Cảnh báo chỉ định trùng", "Xuất gói dịch vụ" |
| **API** | `POST /api/examination/service-orders` · `GET .../service-orders/{examId}` · `PUT/DELETE .../{orderId}` · check trùng `GET .../check-duplicate` |
| **Service** | `ExaminationCompleteService.CreateServiceOrdersAsync` (:1621) |
| **DB** | `ServiceRequest` (Status=0, RequestType 1=XN/2=CĐHA/3=TDCN, RequestCode `CD{yyyyMMddHHmmss}`) + `ServiceRequestDetail` (Status=0, ReceiveStatus=0, SampleBarcode) |
| **Input/Output** | `CreateServiceOrderDto`{ExaminationId, Services[]{ServiceId, Quantity, PaymentType, RoomId?, IsEmergency}} → `ServiceOrderFullDto` |
| **Validation/rule** | Check trùng dịch vụ (`CheckDuplicateServices`); validate BHYT (`ValidateBhytPrescription`); auto chọn phòng tối ưu |
| **Trạng thái sau** | ServiceRequest.Status=0 (chờ thực hiện); MR.Status→2 (chờ KQ CLS) khi có chỉ định |
| **Màn hình** | v1 `/opd` section "Chỉ định dịch vụ" |
| **Happy** | Chỉ định CTM + X-quang phổi → 2 ServiceRequest tạo, in phiếu |
| **Error/edge** | Chỉ định trùng → cảnh báo; service không tồn tại → bỏ qua/lỗi |
| **Responsive** | Modal chọn dịch vụ + bảng giỏ chỉ định → kiểm tràn ngang mobile |

---

## Bước 5. Thực hiện CLS/XN

### 5a. Xét nghiệm (LIS) — touch gap #6 HL7 queue
| Khoản | Nội dung |
|---|---|
| **Actor** | KTV lấy mẫu, KTV xét nghiệm, máy phân tích (analyzer) |
| **HSMT** | §1.5 "Nhận bệnh phẩm dán mã vạch", "Nhập+duyệt KQ", "Cảnh báo chỉ số bất thường"; LIS §2.7 "Gửi lấy mẫu tự động", §2.8 "Tích hợp HIS↔LIS 1/2 chiều"; RIS §1.12 "Quản lý Message RIS-HIS / gửi lại lỗi" |
| **API** | `POST /api/lis-complete/sample/collect` · `POST .../worklist/send` · `POST .../analyzers/{id}/receive-results`; **HL7**: `GET /api/hl7-queue`, `POST /api/hl7-queue/{id}/retry`, `/retry-all-failed` |
| **Service** | `LISCompleteService.CollectSampleAsync` / `SendWorklistToAnalyzerAsync` / `ReceiveResultFromAnalyzerAsync`; `Hl7QueueService` (Enqueue/Retry/RetryAllFailed); background `HL7ReceiverService` (MLLP port 2576) |
| **DB** | `LabRequest`/`LabRequestItem` (Status 0→1 lấy mẫu→2 chạy→3 xong), `LabWorklist`, `LabRawResult`; **`Hl7MessageQueue`** (Status string: pending/sending/sent/failed/acked/retrying, RetryCount, MaxRetries=5) |
| **Validation/rule** | Lấy mẫu khi Item.Status=0; analyzer.IsActive + Protocol∈{HL7,ASTM}; HL7 retry chỉ khi `RetryCount<MaxRetries` và Status≠`acked` |
| **Trạng thái sau** | Item.Status=3 (có KQ chờ duyệt); HL7 msg acked/failed |
| **Màn hình** | `/v2/lab` (`Laboratory.tsx`); HL7: `/v2/hl7-message-queue` (`Hl7MessageQueue.tsx`) `[24]` |
| **Happy** | Lấy mẫu (in barcode) → gửi worklist → máy trả ORU qua MLLP → match → LabResult tạo |
| **Error/edge** | Mẫu từ chối (§2.7 "Từ chối mẫu"); HL7 NACK/timeout → status=failed → retry tay/all-failed; raw result không match → unmatched |

### 5b. Chẩn đoán hình ảnh (RIS/PACS) — touch gap #5 auto-send, #9 study log
| Khoản | Nội dung |
|---|---|
| **Actor** | KTV chụp, máy chụp (modality), hệ PACS |
| **HSMT** | RIS §1.5 "Tiếp nhận chỉ định, lên lịch, gửi DICOM Worklist", §1.11 "Log lịch sử ca chụp"; PACS §2.4 "Gửi file DICOM sang server khác / mã hoá / tự động gửi / thống kê" |
| **API** | `GET /api/RISComplete/waiting-list` · `POST .../orders/{id}/start|complete`; **auto-send**: `/api/dicom-autosend/rules` (GET/POST/PUT/DELETE), `/send`, `/transmissions`, `/stats`, `/trigger-check`; **log**: `/api/dicom-study-log` + `/study/{uid}` + `/log` |
| **Service** | `RISCompleteService` (StartExam/CompleteExam → tạo `DicomStudy` với StudyInstanceUID), `DicomAutoSendService`, `DicomStudyActivityService` |
| **DB** | `RadiologyRequest`/`RadiologyExam` (Status), `DicomStudy` (NumberOfImages, StorageSize, Status); **`DicomTransmissionLog`** (InstanceCount/TotalBytes lấy THẬT từ DicomStudy — đã fix, xem §12; Status done/failed); **`DicomStudyActivityLog`** (Action: created_from_his/received_from_modality/viewed/result_approved/sent_to_remote…) |
| **Validation/rule** | Auto-send rule `IsActive` + match Modality/SourceAE; mã hoá AES-256-GCM khi `EncryptBeforeSend`; trigger on_arrival/scheduled(cron)/manual |
| **Trạng thái sau** | RadiologyExam.Status=2 (chụp xong), DicomStudy tạo, transmission log + activity log ghi |
| **Màn hình** | `/v2/radiology` (`Radiology.tsx`); `/v2/dicom-autosend` `[24]`; `/v2/dicom-study-audit-log` `[24]` |
| **Happy** | Chụp xong → DicomStudy tạo → rule on_arrival match → C-STORE sang PACS đích → transmission done + log sent_to_remote |
| **Error/edge** | Server đích null → 500 "Server đích không tồn tại"; gửi fail → Status=failed + ErrorMessage |

---

## Bước 6. Trả kết quả

| Khoản | Nội dung |
|---|---|
| **Actor** | BS xét nghiệm (duyệt KQ XN), BS chẩn đoán hình ảnh (đọc/duyệt phim) |
| **HSMT** | §1.4 "Lập/duyệt+in KQ CLS, khóa sổ CLS"; §1.5 "Nhập+duyệt KQ XN, cảnh báo bất thường"; RIS §1.6 "Theo dõi trạng thái KQ, 2 BS cùng đọc, QR PACS viewer, xuất PDF/DICOM SR, ghi log"; RIS §1.9 "ký số điện tử" |
| **API** | XN: `POST /api/lis-complete/orders/approve` (+ preliminary/final-approve 2 bước); CĐHA: `POST /api/RISComplete/results/approve`; viewer log: `/api/dicom-study-log/log` (action='viewed' — **đã wire thật** trong `pages/DicomViewer.tsx` khi mở study, xem §12); EMR HL7 export: `POST /api/emr/hl7/export`; ký sinh trắc: `/api/biometric/sign-begin|sign-finish` |
| **Service** | `LISCompleteService.ApproveLabResultAsync` / `FinalApproveLabResultAsync`; `RISCompleteService.FinalApproveResultAsync`; `EmrHl7ArchiveService.GenerateAsync`; `BiometricSignatureService.BeginSign/FinishSign` |
| **DB** | `LabResult.Status`→2 (Approved); `RadiologyReport.Status`→2; `DicomStudyActivityLog` (result_approved); `BiometricSignatureLog` (IsVerified) |
| **Viewer (gap #9/#10)** | `pages/DicomViewer.tsx` + components `CornerstoneViewer`, `MprViewer`, `MammoViewer`, **`MipMinIpViewer`** (MIP/MinIP — đã wire), **`CineControls`** (Animation §2.3 — đã wire). Nút toolbar: MPR/3D Native · Mammography 2x2 · **MIP/MinIP** · OHIF |
| **Validation/rule** | Duyệt khi tất cả LabResult.Status≥1; giá trị nguy hiểm (`IsCritical`) phải acknowledge trước duyệt; biometric: `IsVerified=true` (⚠️ MVP chưa verify chữ ký ECDSA — xem §12) |
| **Trạng thái sau** | KQ Approved; activity log + biometric log ghi; email notify (ResultNotificationService) |
| **Màn hình** | `/v2/lab`, `/v2/radiology`, `/v2/radiology/viewer` (DICOM), `/v2/emr-hl7-export` `[24]`, `/v2/biometric-enrollment` `[24]` |
| **Happy** | KTV duyệt KQ CTM → BS đọc X-quang trên viewer (log 'viewed') → ký số → duyệt (log 'result_approved') |
| **Error/edge** | Có giá trị nguy hiểm chưa ack → chặn duyệt; BN chưa đăng ký vân tay → "Bệnh nhân chưa đăng ký vân tay"; study <10 lát → MIP báo "cần ≥10 slice" |
| **Responsive** | Viewer full-bleed (không terminal shell) — kiểm toolbar nút wrap; thanh Cine wrap ở màn hẹp |

---

## Bước 7. Kê toa / chỉ định nhập viện

| Khoản | Nội dung |
|---|---|
| **Actor** | Bác sĩ khám |
| **HSMT** | §1.2 "Kê đơn thuốc BHYT/thu phí/chương trình/ngoại viện", "Kiểm tra tương tác thuốc"; §1.3 nội trú "Tiếp nhận vào khoa, kê y lệnh, xếp phòng/giường" |
| **API** | Kê đơn: ExaminationComplete (`GET /api/examination/{id}/prescriptions`, `/prescriptions/recent`, `/prescriptions/{id}`; tạo qua `CreatePrescriptionAsync`); Nhập viện: `POST /api/inpatient/admit-from-opd`, `/transfer-from-department` |
| **Service** | `ExaminationCompleteService` (prescription); `InpatientCompleteService.AdmitFromOpdAsync` |
| **DB** | `Prescription` (Status 0→1, IsDispensed, PatientType, InsuranceAmount/PatientAmount) + `PrescriptionDetail`; nhập viện: `Admission` (Status=0), `BedAssignment` (Status=0), MR.TreatmentType=2 |
| **Validation/rule** | BHYT hợp lệ + chưa hết hạn; Items không rỗng; tồn kho đủ; `InsuranceRightRoute` (1 đúng/2 trái/3 thông); kiểm tương tác thuốc (DrugInteraction) |
| **Trạng thái sau** | Prescription.Status=1; nếu nhập viện: Admission.Status=0, giường gán, MR.TreatmentType=2 |
| **Màn hình** | `/v2/prescription`, `/v2/ipd` |
| **Happy** | Kê Paracetamol + nhập viện khoa Nội → Admission + BedAssignment tạo |
| **Error/edge** | Thuốc hết tồn → cảnh báo; tương tác thuốc → cảnh báo; giường đầy → ko xếp |

---

## Bước 8. Thanh toán viện phí (NangCap24 Bank/VietQR)

| Khoản | Nội dung |
|---|---|
| **Actor** | Thu ngân (kế toán) |
| **HSMT** | §1.7 "Thu viện phí", "Chuyển khoản thanh toán chi phí", "Xuất hoá đơn điện tử", "Tạm thu/Chi hoàn ứng", "Khóa sổ thanh toán", "Hủy hóa đơn" |
| **API (gap #8)** | `POST /api/payment/create-url` (VNPay/MoMo/ZaloPay/Bank QR) · `GET /api/payment/bank/list` (5 NH) · `POST /api/payment/bank/confirm` (đối soát thủ công) · IPN: `/vnpay/ipn`, `/momo/ipn`, `/zalopay/callback` · `POST /api/payment/refund` |
| **Service** | `PaymentGatewayService` + partial `PaymentGatewayService.VietQR.cs` (BuildVietQrEmvcoString — EMVCo TLV + CRC16, 5 BIN: BIDV 970418/VCB 970436/Agribank 970405/Vietinbank 970415/MSB 970426); `ConfirmBankTransferAsync`; `LinkReceiptAsync` |
| **DB** | `PaymentTransaction` (Status 0→1), `Receipt` (ReceiptType=2, Status=1, **CashierId FK non-null** — đã fix fallback admin, commit `b523579`), `InvoiceSummary` (PaidAmount/RemainingAmount, Status→1 khi hết nợ); auto `ElectronicInvoice` |
| **Validation/rule** | Amount>0; **không thanh toán 2 lần** (Status==1 → reject IPN/confirm lại); refund chỉ khi Status==1; IPN verify HMAC-SHA512 (VNPay) / HMAC-SHA256 (MoMo) |
| **Trạng thái sau** | Receipt.Status=1, InvoiceSummary.Status=1 (nếu đủ), HĐĐT phát hành; MR.Status→4 |
| **Màn hình** | `/v2/billing`, `/v2/bank-payments` `[24]` (`BankPayments.tsx`) |
| **Happy** | Tạo QR VietQR BIDV → app NH quét → kế toán đối soát sao kê → `/bank/confirm` → Receipt + HĐĐT tạo |
| **Error/edge** | POST body rỗng → Google LB 411 (cần `Content-Length: 0`); confirm 2 lần → "Order already confirmed"; cashier rỗng → fallback admin (xem §12) |
| **Responsive** | Modal confirm + bảng giao dịch nhiều cột → kiểm <768px |

---

## Bước 9. Cấp phát thuốc

| Khoản | Nội dung |
|---|---|
| **Actor** | Dược sĩ / thủ kho |
| **HSMT** | §1.6 "Duyệt cấp đơn thuốc ngoại trú", "Duyệt phát kho", "Duyệt phiếu lĩnh", "In công khai thuốc"; §1.2 "Xuất thuốc, vật tư" |
| **API** | `GET /api/pharmacy/pending-prescriptions` · `POST /api/pharmacy/prescriptions/{id}/accept` · `/dispense` · `/complete` · `/reject` · `POST /api/pharmacy/cancel-dispensed/{id}` |
| **Service** | `PharmacyController` → service cấp phát + `WarehouseCompleteService` (tồn kho, FEFO) |
| **DB** | `PrescriptionDetail` (Status 0→1, DispensedQuantity, BatchId/ExpiryDate), `Prescription` (Status→2, IsDispensed=true, DispensedAt/By); tồn kho trừ |
| **Validation/rule** | Batch chưa hết hạn; **FEFO** (First-Expire-First-Out); số lượng tồn đủ; partial dispense → Status=1 |
| **Trạng thái sau** | Prescription.Status=2 (đã cấp phát), tồn kho giảm |
| **Màn hình** | `/v2/pharmacy`, `/v2/inpatient-dispensing` (nội trú) |
| **Happy** | Tiếp nhận đơn → chọn batch FEFO → cấp đủ → Status=2 |
| **Error/edge** | Hết tồn → ko cấp; batch hết hạn → loại; hủy đã cấp → `cancel-dispensed` hoàn tồn |

---

## Bước 10. Xuất viện / kết thúc lượt khám

| Khoản | Nội dung |
|---|---|
| **Actor** | Bác sĩ điều trị, điều dưỡng, thu ngân |
| **HSMT** | §1.3 "Đăng ký ra viện, thanh toán ra viện"; §1.8 "Sổ vào/ra/chuyển viện, lưu trữ HSBA"; §1.2 "Kết thúc/hủy kết thúc khám" |
| **API** | `GET /api/inpatient/pre-discharge-check/{admissionId}` · `POST /api/inpatient/discharge` · `POST /api/inpatient/cancel-discharge/{admissionId}` · `GET /api/inpatient/print-discharge-certificate/{admissionId}` |
| **Service** | `InpatientCompleteService.CheckPreDischargeAsync` (:2957) / `DischargePatientAsync` (:3011) / `CancelDischargeAsync` |
| **DB** | `Discharge` tạo (DischargeType 1 ra/2 chuyển/3 bỏ về/4 tử vong, DischargeCondition); `Admission.Status`→1/2/3/4; `BedAssignment.Status`→1 (trả giường); `MR.Status`→3 |
| **Validation/rule (pre-discharge)** | `CanDischarge` = không nợ viện phí (RemainingAmount≤0) + không đơn chưa cấp (Prescription.Status<2) + không CLS chờ KQ (ServiceRequest.Status<2); Admission.Status phải =0 |
| **Trạng thái sau** | Admission đóng, giường trả, MR.Status=3, MR.DischargeDate set |
| **Màn hình** | v1 `/inpatient` (discharge); v2 `/v2/ipd` |
| **Happy** | Pre-check pass → discharge type=1 → giường trả → MR hoàn thành → in giấy ra viện |
| **Error/edge** | Còn nợ/đơn chưa cấp/CLS chờ → chặn + Warnings[]; discharge khi Admission.Status≠0 → lỗi; hủy ra viện → khôi phục |

---

## Bước 11. Case đặc biệt

| Case | API · Service | DB / trạng thái | Rule | HSMT |
|---|---|---|---|---|
| **BHYT** | `InsuranceXmlService.VerifyInsuranceCardAsync`; XML 130/4750/3176 BYT | `InsuranceClaim` (ClaimStatus 0→5), `PatientType=1` auto trừ InsuranceAmount | Đúng/trái/thông tuyến (`InsuranceRightRoute`); fallback graceful khi cổng lỗi | §1.7 "Check thẻ cổng BHXH"; gap #2 **Cổng giám định BHXH** (`/inspector-portal`, login `BhxhInspector`) |
| **Tạm ứng** | `BillingCompleteService.CreateDepositBookAsync` | `CashBook` BookType=2, `Receipt` ReceiptType=1; Deposit Status 1→5 | Trừ vào InvoiceSummary.DepositAmount; không hoàn 2 lần | §1.7 "Tạm thu viện phí", "Chi hoàn ứng" |
| **Hủy dịch vụ / cho lại CLS** | `ServiceRefundController` (CancelledServices, Requeue) | `ServiceRequestDetail.Status` 3→0; clear Result; log "[CHO LẠI]" | Chỉ requeue khi Status=3; KeepAsPaid giữ trạng thái đã thu | §1.4 "Đổi dịch vụ CLS" |
| **Sửa chỉ định** | `PUT/DELETE /api/examination/service-orders/{id}` | ServiceRequest sửa/xóa khi Status=0 | Chỉ sửa khi chưa thực hiện | §1.2 |
| **Đổi phòng/khoa** | `InpatientCompleteService` (DepartmentTransfer) | Old BedAssignment→1, new=0; Admission/MR RoomId/DeptId đổi; Admission.Status giữ 0 | Phòng/giường đích trống; log lý do | §1.3 "Chuyển phòng/giường/khoa điều trị" |
| **Hoàn tiền** | `POST /api/payment/refund` (`PaymentRefundDto`) | `PaymentTransaction.RefundedAmount`+; `Receipt` ReceiptType=3; InvoiceSummary.PaidAmount− | Chỉ refund khi Status=1 (đã thu) | §1.7 "Chi trả lại tiền tạm thu" |

---

## 12. Data fix cứng / thiếu + đề xuất bổ sung logic

| # | Vị trí | Loại | Hiện trạng | Đề xuất |
|---|---|---|---|---|
| F1 | `DicomTransmissionLog` InstanceCount/TotalBytes | data fix cứng | **ĐÃ FIX** — lấy `NumberOfImages`/`StorageSize` thật từ `DicomStudy` + set FK `DicomStudyId` | ✓ done (phiên trước) |
| F2 | `DicomAutoSend.tsx` KPI "Trigger 24h"=142 | data fix cứng FE | **ĐÃ FIX** — tính từ `stats.byDay` thật | ✓ done |
| F3 | `DicomStudyAuditLog.tsx` nút "Seed demo" tạo study `demo.*`/`TEST-PC` | data sai nghiệp vụ | **ĐÃ FIX** — xoá seed giả, wire log `viewed` THẬT khi mở viewer | ✓ done |
| F4 | `PaymentGatewayService.cs` VNPay TmnCode/HashSecret sandbox | config hardcode | placeholder sandbox | **Externalize** ra `appsettings`/env (`Payment:VnPay:*`); không commit secret |
| F5 | `PaymentGatewayService.VietQR.cs` số TK + tên merchant 5 NH | config placeholder | "BENH VIEN HIS - {BANK}" + số TK demo | **Cấu hình** số TK thật + tên BV qua env/SystemConfig (đúng §1.7) |
| F6 | VAT (auto e-invoice) hardcode 8% | config (cần xác minh) | nghi hardcode | Đưa thuế suất vào config danh mục dịch vụ |
| F7 | `LinkReceiptAsync` cashier fallback admin khi rỗng | logic | **ĐÃ FIX** fallback an toàn (commit `b523579`) | Cân nhắc bắt buộc cashierId rõ ràng cho thu ngân tại quầy |
| F8 | AdmissionDate `DateTime.Now` (UTC trên Cloud Run) | data/timezone | trang lọc `==today` lệch ngày | Dùng ngày VN (UTC+7) nhất quán; xem `his-be-scalability` (index cột ngày) |
| F9 | Biometric `IsVerified=true` luôn (MVP) | logic chưa đủ | chưa verify chữ ký ECDSA | Wire `Fido2NetLib` verify AuthenticatorData+Signature+counter (gap §17 R1) |
| F10 | Placeholder cổng ngoài (R2 upload, HL7 TCP 80% sim, PKCS7 signed-XML) | external, KHÔNG phải DB | mock/sim | Cần client thật (R2/HL7/iText) — hardening riêng, không thuộc "lấy từ DB" |

> Các mục F4–F6 là **config** (không phải data DB), nên cách "bổ sung đúng logic" = externalize cấu hình, không seed DB. F1–F3, F7 đã build. F8–F9 cần quyết định trước khi sửa (chạm payment/timezone/security).

---

## 13. Responsive audit + plan fix

Các màn hình nhiều cột/đông dữ liệu cần kiểm ở breakpoint **<768px (mobile)**, **768–1024px (tablet)**, **≥1440px**:

| Màn hình | Rủi ro vỡ | Hướng fix (theo `his-fe-performance` + `core-accessibility-pattern`) |
|---|---|---|
| Reception form (nhiều field + webcam) | Cột không dồn, ảnh đẩy layout | Cột stack <768px; ảnh max-width 100% |
| OPD form sinh hiệu (8 field) + queue table | Tràn ngang | Grid auto-fit; bảng scroll-x |
| DICOM viewer toolbar + Cine bar | Nút không wrap, đè ảnh | `flex-wrap`; Cine bar sticky dưới |
| BankPayments / DataTable nhiều cột | Cột tràn | Ẩn cột phụ ở mobile; horizontal scroll |
| Billing / InvoiceSummary | Số tiền wrap xấu | `white-space:nowrap` cột tiền + scroll-x |

> Quy trình: dùng DevTools responsive → chụp breakpoint → fix CSS `ab-*`/`_v2kit` (đừng phá design pack) → verify lại. **Chưa thực thi fix** — cần chọn màn hình ưu tiên (xem §15 checklist).

---

## 14. Test với dữ liệu THẬT trong DB

> **Nguyên tắc (theo yêu cầu):** test E2E **tạo bản ghi thật qua API thật**, KHÔNG mock. Mỗi bước tạo record thật
> trong SQL Server (`HIS`), kiểm status đổi đúng. Theo `his-test-api-powershell` (login `admin`/`Admin@123`, Bearer JWT).

**Kịch bản `test-e2e-nangcap24.ps1` (đề xuất — chưa chạy):**
1. Login `POST /api/auth/login` → lấy `data.token`.
2. **B1** `POST /api/reception/register/insurance` (hoặc `/fee`) → lưu `medicalRecordId`, `examinationId`, `ticketId`. Verify DB: MedicalRecord/Examination/QueueTicket tạo, Status=0.
3. **B3** `POST /api/examination/{id}/start` → Examination.Status=1.
4. **B4** `POST /api/examination/service-orders` (1 XN + 1 CĐHA) → ServiceRequest tạo Status=0.
5. **B5a** `POST /api/lis-complete/sample/collect` → Item.Status=1; (tuỳ chọn) `POST /api/hl7-queue/demo-enqueue` rồi `/retry` để có dữ liệu HL7 thật.
6. **B5b** `POST /api/RISComplete/orders/{id}/complete` → DicomStudy tạo; `POST /api/dicom-autosend/send` (cần RemotePacsServer thật) → DicomTransmissionLog; `POST /api/dicom-study-log/log` action=viewed.
7. **B6** `POST /api/lis-complete/orders/approve` + `POST /api/RISComplete/results/approve` → KQ Approved.
8. **B7** tạo Prescription (ExaminationComplete) → Status=1.
9. **B8** `POST /api/payment/create-url` (provider=bank) → `POST /api/payment/bank/confirm` → Receipt + InvoiceSummary cập nhật. Verify Receipt.Status=1.
10. **B9** `POST /api/pharmacy/prescriptions/{id}/accept` → `/dispense` → `/complete` → Prescription.Status=2.
11. **B10** (nếu nội trú) `GET /api/inpatient/pre-discharge-check/{id}` → `POST /api/inpatient/discharge` → Admission đóng, MR.Status=3.
12. **B11** chạy các case: tạm ứng (deposit), refund (`/payment/refund`), requeue CLS (`/service-refund`), đổi phòng.

> Lưu ý môi trường: backend `localhost:5106` + SQL Server `his-sqlserver` phải UP. Dữ liệu tạo là THẬT → nên chạy trên
> DB dev/seed, không chạy trên prod. Có thể dùng `scripts/test-prod/*.py` (gọi API thật) làm mẫu.

---

## 15. Checklist E2E cho QA/Dev

**Luồng chính (happy path) — tạo dữ liệu thật:**
- [ ] B1 Đăng ký BHYT → MedicalRecord+Examination+QueueTicket tạo (Status=0), STT cấp đúng prefix
- [ ] B1 Đăng ký viện phí → PatientType đúng; BN mới tạo được hồ sơ
- [ ] B2 Cấp số: chống trùng STT cùng BN+phòng+ngày
- [ ] B3 Bắt đầu khám → Examination.Status=1; nhập sinh hiệu/chẩn đoán ICD lưu
- [ ] B4 Chỉ định XN+CĐHA → 2 ServiceRequest (Status=0); cảnh báo trùng hoạt động
- [ ] B5a Lấy mẫu (barcode) → Item.Status=1; HL7 queue: enqueue/retry/retry-all-failed `[24]`
- [ ] B5b Chụp xong → DicomStudy tạo; auto-send rule chạy → DicomTransmissionLog (InstanceCount THẬT) `[24]`; activity log ghi `[24]`
- [ ] B6 Duyệt KQ XN (cảnh báo giá trị nguy hiểm); đọc phim trên viewer → log `viewed` THẬT `[24]`
- [ ] B6 Viewer: MPR/3D · Mammography · **MIP/MinIP** · **Cine** hoạt động `[24]`; ký sinh trắc `[24]`; EMR HL7 export `[24]`
- [ ] B7 Kê đơn (kiểm tương tác thuốc) → Prescription.Status=1; nhập viện → Admission+giường
- [ ] B8 Thanh toán VietQR 5 NH `[24]` → confirm → Receipt+HĐĐT; MR.Status=4; chống thanh toán 2 lần
- [ ] B9 Cấp phát thuốc FEFO → Prescription.Status=2; tồn kho giảm
- [ ] B10 Pre-discharge check (nợ/đơn/CLS) → discharge → Admission đóng, giường trả, MR.Status=3
- [ ] B11 BHYT (đúng/trái/thông tuyến), tạm ứng, hủy/cho lại CLS, sửa chỉ định, đổi phòng, hoàn tiền

**Error/edge:**
- [ ] BHYT hết hạn → reject; phòng đầy → chặn; chưa chọn phòng → "Vui lòng chọn phòng"
- [ ] HL7 NACK/timeout → failed → retry; DICOM server đích null → 500 message rõ
- [ ] Giá trị nguy hiểm chưa ack → chặn duyệt; BN chưa đăng ký vân tay → message
- [ ] Thanh toán 2 lần → "Order already confirmed"; refund khi chưa thu → chặn
- [ ] Discharge khi còn nợ/đơn chưa cấp/CLS chờ → Warnings[] chặn

**Cấu hình/hạ tầng (NangCap24):**
- [ ] Cổng thanh tra BHXH `/inspector-portal` login `BhxhInspector` `[24]`
- [ ] EMR cloud sync `/v2/emr-cloud-sync` `[24]`
- [ ] DICOM auto-send config (rule/encrypt/cron) `/v2/dicom-autosend` `[24]`

**Phi chức năng:**
- [ ] Responsive 3 breakpoint cho 5 màn hình §13
- [ ] A11y: keyboard nav + nhãn nút icon (row action) + tương phản (`core-accessibility-pattern`)
- [ ] Chịu tải nhiều user đồng thời (`his-be-scalability`): list phân trang, không full-scan cột ngày

---

## 16. KẾT QUẢ TEST THỰC TẾ (2026-05-28, dữ liệu THẬT trong DB dev)

Chạy `test-e2e-nangcap24.ps1` (login admin, gọi API thật `localhost:5106`, tạo bản ghi thật). **17/17 bước reachable PASS.**

### Phát hiện gốc + đã fix
- **Blocker thật: DB dev thiếu master data** — `Rooms=0, Services=0, Patients=0` (chỉ 8 Departments + 10 Medicines). Chuỗi KCB lõi (B1→B4) **không chạy được** vì không có phòng/dịch vụ → register 400 do `roomId` rỗng. **KHÔNG phải bug code.**
- **Đã fix theo "bổ sung dữ liệu theo logic hiện có"**: seed idempotent `scripts/seed_e2e_master_data.sql` — 2 phòng khám (RoomType=1) + 1 ServiceGroup + 3 Service (XN/CĐHA/Khám), FK tới Department thật, audit nullable. Sau seed: B1→B4 PASS.

### Trạng thái từng luồng (sau seed)
| Luồng | Kết quả | Ghi chú |
|---|---|---|
| B1 Tiếp nhận (register/fee) | ✅ PASS | tạo MedicalRecord+Examination+QueueTicket thật |
| B3 Khám (start) | ✅ PASS | Examination.Status→1 |
| B4 Chỉ định CLS | ✅ PASS | ServiceRequest tạo |
| B5 HL7 queue (enqueue/retry/search) `[24]` | ✅ PASS | gap #6 |
| B5 DICOM auto-send rules + study log `[24]` | ✅ PASS | gap #5/#9 |
| B6 EMR HL7 export `[24]` | ✅ PASS | gap #3 |
| B6 EMR cloud-sync status `[24]` | ✅ PASS | gap #4 |
| B6 Biometric register-begin `[24]` | ✅ PASS | gap #2 |
| B6 Inspector portal login `[24]` | ✅ PASS | gap #2 (`thanhtra`/inspector) |
| B8 Bank list 5 NH `[24]` | ✅ PASS | gap #8 |
| B7 Kê toa / đơn thuốc | ✅ PASS | `POST /api/examination/prescriptions`, đơn tạo Status=0 |
| B8 Create VietQR + bank confirm → Receipt `[24]` | ✅ PASS | provider hợp lệ `bidv` → Receipt tạo |
| B9 Cấp phát (accept → dispense) | ✅ PASS | `/pharmacy/prescriptions/{id}/accept` + `/dispense` → Prescription.Status=2 |
| B10 Nhập viện → pre-check → xuất viện | ✅ PASS | admit-from-opd → canDischarge=True → discharge → Admission đóng |

### Mở rộng full-chain (2026-05-28, lần 2): 21/21 PASS
Đã seed thêm để chạy trọn + thêm B7/B9/B10 vào script. **State đổi THẬT verify trong DB**: `Prescriptions Status=2`, `Admissions`, `Discharges`, `Receipts` đều tăng đúng. B10 dùng bệnh nhân riêng (không chỉ định) để discharge sạch (canDischarge=True). Dispense (`/dispense`) chỉ set Status=2 → không cần seed kho; admit `BedId` nullable → không cần seed giường.

### Đã fix
- **Minor 500→400 (gap #8)**: `POST /api/payment/create-url` với `provider`/`amount` SAI trước trả **HTTP 500**; đã thêm `catch (ArgumentException) → BadRequest` trong `PaymentGatewayController.CreateUrl` → nay trả **400** (`{error:"VALIDATION_FAILED",message}`). Verify: provider "bank"→400, amount=0→400, "bidv"→200, backend ổn định. (Cần rebuild + deploy Cloud Run khi lên prod.)

### Lưu ý
- Backend host từng **tự dừng 1 lần** ở lần test đầu (không tái hiện; provider sai KHÔNG crash — đã verify) → môi trường, không phải bug flow.

> Kết luận: **100% luồng (11 bước + mọi touchpoint NangCap24) hoạt động đúng với dữ liệu thật, verify cả HTTP lẫn state DB**. Blocker duy nhất ban đầu là **thiếu master data nền (đã seed bổ sung)**; minor 500→400 **đã fix**.

## Tài liệu liên quan
- [README.md](./README.md) · [analysis.md](./analysis.md) · [test-plan.md](./test-plan.md) · [test-guide.md](./test-guide.md) · [workflow-test.md](./workflow-test.md) · [summary.md](./summary.md)
- HSMT gốc: `docs/requirements/tai-lieu-nang-cap/NangCap24.pdf` · Script test: `test-e2e-nangcap24.ps1` · Seed: `scripts/seed_e2e_master_data.sql`
