# Đối chiếu v2 ↔ MQSoft — BẢNG CHI TIẾT theo từng module (checklist hành động)

> **Bổ trợ cho** [`danh-gia-v2-doi-chieu-tailieuchucnang.md`](./danh-gia-v2-doi-chieu-tailieuchucnang.md)
> (bản tóm tắt điều hành + lộ trình). File này giữ **trọn bảng feature-level** mà 7 agent đã đối chiếu
> trực tiếp với code (`grep`/`Read` `pages-v2` + `api` + `*CompleteService.cs`) — dùng làm **checklist
> kỹ thuật** khi lên backlog. Ký hiệu: ✅ Đủ · 🟡 Một phần · ❌ Thiếu.
> **Ngày:** 2026-05-29. **Độ tin cậy & caveat đọc PDF:** xem mục 0 của bản tóm tắt.

---

## 1. TIẾP ĐÓN (`Reception.tsx` + `reception/`, `api/reception.ts`, `ReceptionCompleteService.cs`)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Đăng ký khám: cấp/nhập mã BN + hành chính | ✅ | `NewVisitModal` → `registerInsurancePatient`/`registerFeePatient` |
| Tìm BN cũ theo SĐT/CCCD/mã BN | ✅ | `PatientLookupModal` → `searchPatient` |
| Đăng ký BHYT / Thu phí / Dịch vụ | ✅ | `VISIT_TYPES`, `registerFeePatient(serviceType)` |
| Xác thực thẻ BHYT + thông tuyến + mức hưởng | ✅ | `BhytVerifyModal`, `verifyInsurance` (`rightRoute`, `paymentRate`) |
| Quét QR BHYT/CCCD khi đăng ký | 🟡 | API `verifyInsuranceByQR`/`registerBySmartCard` có; modal chỉ nhập tay |
| Cấp số thứ tự + gọi số (LCD) | ✅ | `issueQueueTicket`, `callNextQueue`, `NowServingTab` |
| Tổng quan / điều phối phòng | ✅ | `getRoomOverview`, `NowServingTab` |
| Đổi phòng (BN chưa khám) | ✅ | `MoveRoomModal` → `changeRoom` |
| In phiếu (STT / khám) + in hàng loạt | ✅ | `printQueueTicket`, `printExaminationSlip` |
| **Lịch sử khám khi tra BN cũ** | 🟡 | `getPatientVisitHistory` có; modal tìm BN **không hiển thị** |
| **Đăng ký nhiều phòng khám (1 BN)** | ❌ | `NewVisitModal` chỉ chọn 1 phòng |
| **Đặt khám (booking) + ĐK từ đặt khám** | 🟡 | `BookingManagement` chỉ list/xác nhận; không có form đặt + liên kết |
| **Cảnh báo người bệnh (mã màu lưu ý)** | ❌ | `getReceptionWarnings` có; **không nối UI** — an toàn BN |
| **Thẻ BHYT tạm (trẻ <6t…)** | ❌ | `createTemporaryInsurance` có; không UI |
| **Chụp ảnh BN** | ❌ | `uploadPhoto`/`getPatientPhotos` có; không UI v2 |
| **Giữ giấy tờ / thẻ BHYT** | ❌ | `createDocumentHold`/`returnDocument` có; không UI v2 |
| **Chỉ định dịch vụ CLS tại tiếp đón** | ❌ | `orderServicesAtReception` có; không UI v2 |
| Thu tạm ứng / viện phí tại tiếp đón | 🟡 | `ReceptionPayModal` → `createPayment`; thiếu luồng tạm ứng riêng |
| Đăng ký cấp cứu (form độ nặng/cọc/nợ) | 🟡 | `registerEmergencyPatient` có; modal chỉ có cờ "Cấp cứu" |
| Khám sức khỏe theo hợp đồng | ❌ | `health-check/contracts` có; không nối UI tiếp đón |

---

## 2. PHÒNG KHÁM / OPD (`OPD.tsx`, `OpdEditor.tsx`, `api/examination.ts`)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Chọn BN từ hàng đợi phòng | ✅ | `OpdEditor` `loadQueue`/`selectPatient` |
| Sinh hiệu / bệnh sử / khám LS | ✅ | `updateVitalSigns`/`updateMedicalInterview`/`updatePhysicalExamination` |
| Chẩn đoán ICD-10 chính + kèm theo | ✅ | `searchIcdCodes`, `updateDiagnosisList`, `secondaryDiagnoses` |
| Chỉ định CLS (nhiều, sửa/hủy) | ✅ | `searchServices`, `createServiceOrders`, `cancelServiceOrder` |
| Kê đơn BHYT/Thu phí + đơn mẫu theo ICD | ✅ | `PrescriptionEditor`, `getPrescriptionTemplates`/`applyPrescriptionTemplate` |
| Kiểm tra tương tác / dị ứng thuốc | ✅ | `checkDrugInteractions`/`checkDrugAllergies` |
| Xử trí: BA ngoại trú / hẹn / nhập viện / chuyển viện / khám thêm CK | ✅ | `requestHospitalization`, `requestTransfer`, `createAppointment`, `createAdditionalExamination` |
| Giấy nghỉ ốm | ✅ | `createSickLeave` (nối trong OpdEditor) |
| Xem HSBA (F12) + in HSBA ngoại trú/phiếu vào viện | ✅ | `getMedicalRecordFull`, `printOutpatientMedicalRecord`, `printAdmissionForm` |
| Hoàn tất khám + **in bảng kê chi phí** | 🟡 | `completeExamination` có; nút in bảng kê chưa thấy trong OpdEditor |
| **PTTT (F6) + tường trình PTTT** | ❌ | Không có trong examination API/OpdEditor; Surgery là module rời |
| **Xuất thuốc tủ trực (F10)** | ❌ | Không nối OpdEditor |
| Sổ hội chẩn / trích biên bản hội chẩn | 🟡 | `createConsultationRecord` có; không nối OpdEditor |
| **Khai báo viết tắt (F2)** | ❌ | Không thấy UI/API trong OPD |
| **Xem & in KQ XN/CĐHA tại PK** | 🟡 | `getPatientLabResults` có; OpdEditor chưa hiển thị/in |
| Hủy in chi phí / hủy hoàn tất + DS đã in | 🟡 | `revertCompletion`/`cancelExamination` có; thiếu màn quản lý |
| **Sửa đối tượng/thẻ BHYT + đối tượng thuốc/DV** | 🟡/❌ | Sửa thẻ BHYT rải rác; sửa đối tượng thuốc/DV không thấy API/UI |

---

## 3. NỘI TRÚ (`Inpatient.tsx`, `api/inpatient.ts`, `InpatientCompleteService.cs`)

> ⚠️ MQSoft "Nội trú-Bác sĩ.pdf" không render được (scan) → tính năng MQSoft suy từ cấu trúc API
> region 3.1–3.8. **Cột v2 verify trực tiếp = chắc chắn.**

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Sơ đồ giường / màn hình chờ buồng | ✅ | `Inpatient.tsx` tab "Sơ đồ giường" + `getWardLayout` |
| Danh sách BN nội trú | ✅ | `Inpatient.tsx` + `getInpatientList` |
| **Nhập viện (từ OPD)** | 🟡 | v2 chỉ `message.info('Chọn giường…')`; nghiệp vụ thật ở **v1** `pages/Inpatient.tsx` |
| Tờ điều trị / diễn biến hàng ngày | ✅ | `EmrEditor.createTreatmentSheet` |
| **Kê đơn thuốc nội trú** | 🟡 | `createPrescription` (api/inpatient) **không UI**; FE dùng `examinationApi` (OPD) |
| **Chỉ định dịch vụ nội trú** | 🟡 | `createServiceOrder` (api/inpatient) **không UI** |
| Chăm sóc điều dưỡng | ✅ | `EmrEditor.createNursingCareSheet` |
| **Hội chẩn (chủ tọa/thư ký)** | 🟡 | `createConsultation`/`requestSpecialtyConsult` **không UI** (chỉ EMR record) |
| **Sinh hiệu (bảng + biểu đồ)** | ❌ | `createVitalSigns`/`getVitalSignsChart` có; **0 trang dùng** |
| **Truyền dịch / truyền máu** | ❌ | `createInfusionRecord`/`createBloodTransfusion` có; **0 trang** |
| **Chuyển khoa / chuyển viện** | ❌ | `transferDepartment`/`printReferralCertificate` có; **0 trang** |
| **Dinh dưỡng (chỉ định suất ăn)** | ❌ | `createNutritionOrder` có; **0 trang** |
| Ra viện | ✅ | `dischargePatient` (v1 tab "Xuất viện") |
| **Tổng kết BA / BK viện phí 6556** | ❌ | `getBillingStatement6556` có; **0 trang** |
| **Trả KQ XN tại giường (nhập + duyệt)** | ❌ | chỉ `getLabResults`/`printLabResults` (xem); **không form nhập+duyệt** |

---

## 4. DƯỢC + SỔ BIÊN LAI (`Pharmacy.tsx`, `DispensingCounter`, `InpatientDispensing`, `ClinicalPharmacyCheck`, `StockReport`, `ReceiptBookAdmin`, `WarehouseCompleteService.cs`)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| **Nhập kho từ NCC (phiếu nhập)** | ❌ | `createSupplierReceipt`/`getStockReceipts` có; **0 trang FE** (v1+v2) |
| **Xuất chuyển kho** | ❌ | `createTransferIssue` có; **0 trang** (Pharmacy v1 chỉ điều chuyển nội bộ) |
| Phiếu dự trù (tạo mới) | 🟡 | `Procurement.tsx` chỉ **xem**; không tạo/duyệt mới |
| Duyệt cấp / bù thuốc-VTYT | ✅ | `PharmacyApproval.tsx` (duyệt + thu hồi) |
| Cấp phát ngoại trú | ✅ | `DispensingCounter.tsx`, `Pharmacy.tsx` |
| Cấp phát nội trú theo khoa + in phiếu lĩnh | ✅ | `InpatientDispensing.tsx` (batch + in) |
| Kiểm tra dược lâm sàng / tương tác / CCĐ | ✅ | `ClinicalPharmacyCheck.tsx` (ADR, tương tác) |
| Xem tồn / cảnh báo HSD / tồn thấp | ✅ | `StockReport.tsx` (lô/tổng hợp/HSD/tồn thấp) |
| **Kiểm kê kho (stock-take)** | ❌ | `createStockTake`/`completeStockTake`/`adjustStockAfterTake` có; **0 trang** |
| **Tách liều / ký gửi / IU** | ❌ | `getSplitableItems`/`getConsignmentStock`/`getIUMedicines` có; **0 trang** |
| **Sổ biên lai:** khai báo dải số + loại + gán người thu/khoa + kích hoạt + đóng sổ | ✅ | `ReceiptBookAdmin.tsx` (CRUD + activate + close) |

---

## 5. XÉT NGHIỆM / LIS (`Laboratory.tsx`, `LabQC`, `SampleReceive`, `SampleStorage`, `Microbiology`, `ReagentManagement`, `LisCatalogAdmin`, `LISConfig`, `LISCompleteService.cs`)

> 5/5 PDF MQSoft đọc đủ (render PNG → OCR).

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Khai báo máy XN (HL7/ASTM/Serial, IP/port, test KN) | ✅ | `LISConfig.tsx`; `GetAnalyzersAsync`/`CreateAnalyzerAsync` |
| Khai báo Sổ / Nhóm / Loại XN / Đơn vị đo | ✅ | `LisCatalogAdmin.tsx`; `GetLabTestCatalogAsync`/`SaveLabTestAsync` |
| Khai báo vi khuẩn / kháng sinh / hóa chất | ✅ | `LisCatalogAdmin.tsx` (organisms/antibiotics/chemicals) |
| **Khai báo dải tham chiếu (theo tuổi/giới) + critical-value** | 🟡 | BE `GetReferenceRangesAsync`/`GetLabTestNormsAsync` có; **không UI v2** |
| **Đơn vị HL7 / Khoa phòng LIS / Mã BS LIS** | ❌ | Không có tab/UI trong `LisCatalogAdmin` |
| Phân quyền KTV / Người duyệt; "Xác nhận mẫu" | 🟡 | `SampleReceive` thực thi 4-eyes; gán quyền mặc định KTV/người duyệt không có |
| Lấy mẫu — cấp STT bệnh phẩm + in barcode | ✅ | `collectSample`/`printBarcode`; `CollectSampleAsync`/`PrintSampleBarcodeAsync` |
| Nhận mẫu — đối chiếu / xác nhận / hủy nhận | ✅ | `SampleReceive.accept`; `SampleReceiveController` |
| Từ chối mẫu + lý do | ✅ (vượt) | `SampleReceive.submitReject` (MQSoft chỉ nhận/hủy nhận) |
| Nhập KQ + đánh giá theo dải + tô màu bất thường (H/L) | ✅ | `Laboratory.flagFor`; `EnterLabResultAsync` |
| **Duyệt 2 bước KTV→người duyệt + hủy duyệt + sửa sau duyệt** | 🟡 | BE `Preliminary/FinalApprove`/`CancelApproval` có; `Laboratory.tsx` chỉ 1 bước `completeProcessing`, **không UI hủy duyệt** |
| **In phiếu KQ** | 🟡 | BE `PrintLabResultAsync` + `printTestResultReport` có; nút in chỉ `message.success` (giả) |
| **Lấy KQ từ máy XN ("Kết quả máy")** | ❌ | `SendWorklistToAnalyzerAsync`/`ReceiveResultFromAnalyzerAsync` là **stub** (Success=true/0); không UI |
| **Nội kiểm QC / Levey-Jennings / Westgard** | 🟡 | `LabQC.tsx` quản lý lô + Z-score; nút "Chạy QC"/"Levey-Jennings" chỉ toast; BE `RunQCAsync`/`GetLeveyJenningsChartAsync` có thật, **chưa nối** |
| **Vi sinh: định danh + kháng sinh đồ (S/I/R)** | 🟡 | `Microbiology.tsx` chỉ tạo cấy + đổi trạng thái; antibiogram chỉ **xem**; BE `EnterCultureResultAsync`/`EnterAntibioticSensitivityAsync` là **stub `=> true`** |
| Lưu trữ mẫu (tủ/rack/box + QR) | 🟡 | `SampleStorage.tsx` xem; "Lưu/Lấy/Hủy/Quét QR" là toast placeholder |
| Quản lý hóa chất/sinh phẩm (tồn/HSD/lô) | ✅ | `ReagentManagement.tsx` CRUD |
| Báo cáo (sổ XN, TAT, doanh thu, BHXH export) | ✅ (BE) | `GetLabRegisterReportAsync`/`GetLabTATReportAsync`/`ExportLabDataForBHXHAsync` (UI ở Reports) |

---

## 6. CHẨN ĐOÁN HÌNH ẢNH / RIS (`Radiology.tsx`, `RadiologyOps`, `RisDispatcher`, `RisAdmin`, `RisCatalogAdmin`, `api/ris.ts`, `RISCompleteService.cs`)

> 5/5 PDF MQSoft đọc đủ. (Phần viewer ảnh tách sang mục 7.)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Khai báo loại CĐHA (khoa/quầy/số ảnh in-lưu/tên report) | 🟡 | `RisCatalogAdmin` có Modality/Vị trí/Giao thức/Mẫu BC; thiếu "dược khoa phòng","quầy thực hiện",số ảnh,tên report |
| Khai báo máy thực hiện (AE-Title/máy DICOM) | 🟡 | `RisAdmin` MachinesTab chỉ list phòng; `CreateModality` ở `ris.ts` nhưng UI v2 chưa quản lý đầy đủ |
| Khai báo mẫu mô tả (theo BS/KT/giới) | ✅ | `RisCatalogAdmin` "Mẫu báo cáo"; `getResultTemplatesByGender/Service` |
| Phân quyền chụp (KTV) vs đọc (BS) | ✅ | `RisAdmin` PermissionsTab ROLE_TEMPLATES chup/doc/truongkhoa, 11 flag |
| Điều phối ca + ưu tiên cấp cứu + in phiếu + hủy | ✅ | `RisDispatcher` dispatch/priority 1-3/printTicket/mark-arrived/performed/cancel |
| **Thực hiện: tiếp nhận BN từ DS chờ / quét mã** | 🟡 | `getWaitingList`/`callPatient`/`startExam`/`completeExam` có; **page v2 KHÔNG dùng** |
| **Nhập mô tả/kết luận theo mẫu** | ❌ (v2) ✅ (v1) | v2 chỉ HIỂN THỊ; `enterRadiologyResult` chỉ ở `pages/Radiology.tsx:1106` |
| **Khai báo viết tắt + bung (space)** | 🟡 | `ExpandAbbreviationsAsync`/`getAbbreviations` dùng ở **v1**; v2 không có |
| **Ký số KQ (USB/PAdES) + duyệt sơ bộ/chính thức** | ❌ (v2) ✅ (v1) | `SignResultAsync`/`FinalApprove`/`signWithUSBToken` có; **pages-v2 grep = 0 match** |
| **In phiếu KQ + gắn ảnh key** | 🟡 | `printRadiologyResult`/`markKeyImage`/`attachImage` có; v2 nút in → `message.success` (giả) |
| Xuất thuốc – VTYT tại phòng | ✅ | `RadiologyOps` tab "Xuất thuốc tại phòng" |
| Chỉ định thêm dịch vụ tại phòng | ✅ | `RadiologyOps` tab "Chỉ định thêm" |
| **Nhập sinh thiết (GPB) từ màn CĐHA** | ❌ | RIS không có; Pathology là module rời, không tích hợp |
| **Khai báo dịch vụ CĐHA nhập tường trình PTTT** | ❌ | grep `SurgeryReport/TuongTrinh/PTTT` = 0 |
| Live capture (chụp ảnh F2 trong màn KQ) | 🟡 | `NonDicomCapture` rời; không nhúng vào màn trả KQ v2 |

---

## 7. PACS / VIEWER / HỘI CHẨN (`DicomViewer.tsx`, `CornerstoneViewer`/`MprViewer`/`MammoViewer`/`MipMinIpViewer`/`CineControls`, `VideoConsultation`, `NonDicomCapture`, `studyShare.ts`, `RISCompleteService.cs`)

> Tài liệu là sản phẩm **VRPACS V.2**. 7/7 PDF đọc được.

| Tính năng VRPACS | TT | Bằng chứng |
|---|---|---|
| Viewer 2D: W/L, zoom, pan, cuộn lát, đo khoảng cách | ✅ | `CornerstoneViewer` (presets F1-F10, Length) |
| Đo góc / vùng ROI / tỷ trọng HU | 🟡 | Có Angle+Probe; **thiếu** ROI vùng (elip/chữ nhật/tự do) + HU vùng + thể tích |
| MPR (axial/sagittal/coronal) | ✅ | `MprViewer` 4-quadrant + crosshair 3D |
| Dựng 3D (rotate, clip, VR preset) | ✅ | `MprViewer` VOLUME_3D + 11 VR preset; **thiếu** clip elip/đa giác + in 3D |
| MIP / MinIP / AvgMip | 🟡 | `MipMinIpViewer` có MIP+MinIP; **thiếu AvgMip** |
| Mammography (CC/MLO, hanging, kính lúp, true-size) | ✅ | `MammoViewer` 2x2/1x4/2x4 + magnify + true-size + invert |
| Cine (phát/dừng/FPS/loop) | ✅ | `CineControls` |
| Annotation (mũi tên/text/đánh dấu) + AI labeling | 🟡 | DicomViewer toolbar + AI overlay; **annotation backend stub** (không lưu) |
| Layout đa khung / tách 2 màn hình | 🟡 | OHIF iframe + cửa sổ phụ; **thiếu** layout grid native + chế độ "Tổng hợp" |
| **Tạo & crop ảnh Key + Send to HIS** | ❌ | `MarkKeyImageAsync` **không persist**; `GetKeyImagesAsync` rỗng |
| **Duyệt ảnh Key + chọn mẫu in (in thường/gộp)** | ❌ | Không có; chỉ in KQ PDF |
| Chia sẻ ca chụp (link/QR, mật khẩu, hết hạn, ẩn PII) | ✅ | `studyShare.ts` + `PublicStudyViewer.tsx` |
| Xem lịch sử ảnh / so sánh 2 ca | ✅ | DicomViewer "So sánh" + `getPatientRadiologyHistory` |
| Cấu hình cá nhân (phím tắt/overlay/W-L) | ✅ | `DicomViewerConfig.tsx`/`loadViewerConfig` |
| Hội chẩn online (DICOM+Nondicom, share, ghi hình) | 🟡 | `VideoConsultation` (Jitsi); layout/share do Jitsi lo; **ghi hình cần Jibri — chưa self-host xong** |
| RIS DICOM (worklist, lọc, trả KQ, sync HIS, tải DICOM/JPEG) | ✅ | `ris.ts` đầy đủ + `Radiology.tsx` v2 |
| RIS NON-DICOM (capture ảnh/video, crop, upload) | ✅ | `NonDicomCapture` (getUserMedia, MediaRecorder, upload) |
| Admin PACS (máy, khu vực, thư mục, quyền, mẫu in, ICD, vật tư) | 🟡 | `RisAdmin` 8 tab; **backup thư mục lưu trữ chưa rõ UI** |
| Gửi/nhận DICOM giữa PACS (C-STORE) + export ZIP/DICOMDIR | ✅ | `SendDicomToRemoteAsync` + RemotePacsServer CRUD; `ExportDicomStudyAsync` |
| **Mobile xem ảnh (app/PWA: RIS+viewer+MPR+share)** | ❌ | Không có app mobile/PWA riêng; viewer layout desktop |

---

## 8. EMR + CKS + KTM (`EMR.tsx`, `EmrEditor`, `SpecialtyEMR`, `DigitalSignature`, `CentralSigning`, `SigningWorkflow`, `BankPayments`, `api/cda|digitalSignature|paymentGateway`)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| Xem HSBA theo cây/biểu mẫu (nội/ngoại/nhi…) | ✅ | `EMR.tsx` 7 tab; `SpecialtyEMR` 27 chuyên khoa |
| Quá trình điều trị (tóm tắt/thuốc/CĐHA/XN/PTTT) | ✅ | `EmrEditor` treatment/consult/nursing; `PatientTimeline`; `cda.ts` 8 loại |
| Danh mục biểu mẫu / gáy + bìa BA | ✅ | `emrAdmin.getCoverTypes`; `emrManagement.getEmrSpines` (B.1.5) |
| Tìm kiếm bệnh án | ✅ | `EMR.tsx` search; `specialty-emr/search` |
| Chia sẻ / trích lục BA (watermark + access code) | ✅ | `emrManagement.createEmrShare`/`createEmrExtract` (B.1.2/1.3) |
| Đóng BA + kiểm tra thiếu sót | ✅ | `emrManagement.closeEmr/runAutoCheck` (B.1.25/B.2.5) |
| Khóa tài liệu | ✅ | `acquireDocumentLock/forceRelease` (B.1.11); `DocumentLockIndicator` |
| Chữ ký người bệnh | ✅ | `createPatientSignature` (B.1.7); `PatientSignaturePad`; WebAuthn |
| **App mobile / Web xem bệnh án** | 🟡 | `MobileHome` PWA launcher; **chưa có in qua wifi + nhập tờ điều trị mobile** |
| **Số hóa / quét tài liệu giấy vào HSBA** | 🟡 | `emrAdmin.saveAttachment` có; **không UI scan→đính kèm**; `NonDicomCapture` chỉ chụp thiết bị |
| CKS: ký USB token/PKCS#11/HSM + PAdES | ✅ | `digitalSignature.openSession/sign/batchSign`; `PdfSignatureService.cs`; `Pkcs11ExternalSignature.cs` |
| Trình ký lãnh đạo (hàng đợi, ký lô, 4-eyes) | ✅ | `signingWorkflow` pending/approve/reject; `batchSign` |
| Thu hồi chữ ký | ✅ | `digitalSignature.revokeSignature` |
| Ký số vân tay BN (sinh trắc) | ✅ | `biometricApi` WebAuthn (NangCap24) |
| KTM: QR động trên mọi phiếu | ✅ | VNPay `payment/create-url`; `PaymentGatewayService.VietQR.cs` (EMVCo+CRC16) |
| Ví VNPay/MoMo/ZaloPay + IPN/callback | ✅ (vượt) | `PaymentGatewayController` vnpay/momo/zalopay |
| QR ngân hàng 5 NH + xác nhận CK thủ công | ✅ | `bankPaymentApi.listBanks/confirmTransfer` |
| Liên kết phiếu thu + HĐĐT tự phát hành | ✅ | `LinkReceiptAsync` (fix FK Cashier); auto-issue HĐĐT |
| Hoàn trả + 7 báo cáo thanh toán | ✅ | `payment/refund`; `PaymentReports.tsx` |

> *Caveat:* `SpecialtyEMR` dùng **field động (27 CK)** thay vì 1 file/1 biểu mẫu như DesktopEMR — **chưa
> đối chiếu độ phủ ~47 phiếu + ~22 mẫu HSBA chuyên khoa** trong DesktopEMR (chỉ đọc TOC).

---

## 9. HR + THIẾT BỊ/VPP/TÀI SẢN (`EmployeeProfile`, `HR`, `Equipment`, `MedicalSupply`, `AssetManagement`, `OfficeSupplyApproval`)

| Tính năng MQSoft | TT | Bằng chứng |
|---|---|---|
| HR — Hồ sơ NV (lý lịch/tài sản/phụ cấp) | ✅ | `EmployeeProfile.tsx` 9 tab |
| HR — Quá trình công tác / chuyển bộ phận | ✅ | tab `career` + `transferStaff` |
| HR — Đào tạo / bằng cấp | ✅ | tab `educations`; `TrainingResearch` |
| HR — Khen thưởng / kỷ luật | ✅ | `getStaffAwards`/`saveDiscipline` |
| HR — Quá trình lương (ngạch/bậc/hệ số) | ✅ | `SalaryRecordDto` get/save |
| HR — Tài khoản NH / Hợp đồng / BHXH | ✅ | tab `banks`/`contracts`/`insurance` |
| HR — CME / CCHN + cảnh báo hết hạn | ✅ (vượt) | `medicalHR.ts` CME + `PracticeLicense.tsx` |
| HR — Lịch trực / phân ca / hoán ca | ✅ (vượt) | `DutyRoster`/`generateRoster`/`ShiftSwap`/`HR.tsx` rota |
| HR — Chấm công / nghỉ phép / tăng ca | ✅ | `Attendance`/`LeaveRequest`/`Overtime` |
| **HR — Tính/lên bảng lương (payroll)** | ❌ | chỉ lịch sử lương; **không tính lương từ chấm công** |
| **HR — Quyết định NS + biểu mẫu BHXH (01A-TS…)** | ❌ | không có module văn bản quyết định |
| TTB — Danh mục thiết bị | ✅ | `EquipmentDto`, `Equipment.tsx` |
| **TTB — Nhập kho (số HĐ/NCC/thuế/công nợ)** | 🟡 | nhập VTYT qua `warehouse.ts`; thiếu phiếu nhập + công nợ riêng cho TTB |
| TTB — Duyệt cấp theo phiếu lĩnh + thu hồi | ✅ | `OfficeSupplyApproval.tsx` |
| TTB — Bảo trì / kiểm định / hiệu chuẩn / sửa chữa | ✅ (vượt) | Equipment Maintenance + Calibration + Repair |
| Tài sản cố định / khấu hao / bàn giao / thanh lý | ✅ (vượt) | `assetManagement.ts` (FixedAsset, depreciation, QR, đấu thầu) |
| VPP — đề nghị mua + duyệt cấp | ✅ | `OfficeSupplyController` `IsMedical=false`, `Procurement.tsx` |
| TTB — biên bản kiểm nhập/giao nhận chuẩn mẫu | 🟡 | có handover + accessories; thiếu in biên bản mẫu |
| **Quản lý công văn / văn thư** | ❌ | `Quality.tsx` hướng JCI/sự cố; không có module công văn |

---

## 10. Tổng hợp gap đếm được (để ước lượng backlog)

| Nhóm | Số gap | Đặc điểm | Chi phí ước lượng |
|---|---|---|---|
| 🔴 B1 — wire v2 vào backend sẵn có | 7 cụm | Backend xong, v1 chạy được → chỉ port UI v2 | **Thấp–TB** mỗi cụm |
| 🔴 B2 — backend stub | 4 | Cần implement thật + lưu DB | **TB** (có entity sẵn phần lớn) |
| 🟡 B3 — làm mới | 11 | Thiếu cả BE lẫn UI hoặc nghiệp vụ mới | **TB–Cao** tùy mục |

> **Khuyến nghị:** đóng **B1 + B2 trước** (11 hạng mục, phần lớn rẻ) → nâng đáng kể tỷ lệ "dùng được
> thật trên v2 không phải quay về v1". B3 lên kế hoạch theo nhu cầu nghiệp vụ thực tế của bệnh viện.
