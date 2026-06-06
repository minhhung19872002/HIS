# Báo cáo đối chiếu HIS đang build ↔ Tài liệu đối thủ (MQ Solutions / VRPACS)

> **Ngày:** 2026-06-06
> **Nguồn tài liệu:** `C:\Source\HIS\TaiLieuDoiThu\` (HDSD_HIS_LIS, HDSD_EMR, HDSD_PACS_RIS — 40+ PDF đã trích xuất text)
> **Phương pháp:** Đọc chi tiết từng HDSD đối thủ → đối chiếu với **code thật** (backend controllers + frontend pages + api layer), không chỉ kiểm tra tên file.
> **Mục đích:** Bàn giao cho Claude Code để bổ sung/hoàn thiện tính năng còn thiếu, sau đó test lại.

---

## 0. Kết luận nhanh (đọc trước)

Ứng dụng HIS đang build **rất đầy đủ và ở nhiều mảng VƯỢT đối thủ** (>120 controller, >140 trang). Backend gần như phủ hết nghiệp vụ tài liệu mô tả; **đa số gap nằm ở lớp UI chưa "wire" tới API đã có sẵn**, không phải thiếu nghiệp vụ lõi.

Phân loại trạng thái dùng trong báo cáo:
- ✅ **CÓ ĐỦ** — có endpoint + UI + logic thực thi.
- ⚠️ **CHƯA ĐỦ** — có một phần (thường: backend xong, UI thiếu/stub; hoặc thiếu nhánh nghiệp vụ).
- ❌ **THIẾU** — không tìm thấy trong code.

**Số gap cần làm: ~30**, trong đó **đa số là ⚠️ "backend đã có, chỉ thiếu UI"** → khối lượng thực tế nhẹ hơn vẻ bề ngoài.

### Top ưu tiên cao nhất (P1) — làm trước
| # | Gap | Module | Bản chất |
|---|---|---|---|
| 1 | Kê **y lệnh thuốc nội trú có cấu trúc** (phiếu lĩnh) — hiện chỉ textarea tự do | Nội trú | Backend xong, thiếu UI |
| 2 | **Chỉ định CLS nội trú** (tạo mới F7/F6) — modal hiện chỉ hủy/đổi đối tượng | Nội trú | Backend xong, thiếu UI |
| 3 | **Ra viện + Tổng kết bệnh án** nội trú — thiếu nút Ra viện trên màn điều trị | Nội trú | Backend xong, thiếu UI |
| 4 | **Website số hóa bệnh án tra cứu công khai bằng CCCD/QR** | EMR | Thiếu hẳn |
| 5 | **Hóa đơn điện tử (HDDT)** đang "Simulate", chưa nối NCC thật (VNPT/Viettel/Misa) | Thanh toán | Tích hợp thật |
| 6 | **Xử trí Nhập viện / Chuyển viện / Hẹn tái khám** thiếu nút trong màn khám OPD | Phòng khám | Backend xong, thiếu UI |
| 7 | **Cảnh báo BN** chưa nhúng CRUD vào Tiếp đón v2 (chỉ read-only) | Tiếp đón | Backend xong, thiếu UI |
| 8 | **Đặt khám tại quầy** + nút Xác nhận/Nhắc lịch đang stub (toast giả) | Tiếp đón | Backend xong, UI stub |

---

## 1. TIẾP ĐÓN

| Tính năng (tài liệu MQ) | Trạng thái | Bằng chứng code | Gap cần làm |
|---|---|---|---|
| Đăng ký khám thường (cấp mã BN, hành chính, đối tượng/phòng) | ✅ | `Reception.tsx` + `reception/NewVisitModal.tsx` → `ReceptionCompleteController.RegisterInsurance/FeePatient` | — |
| Quét QR CCCD-BHYT, đọc thẻ | ✅ | `insurance/verify-qr`, `smart-card/read`; `BhytVerifyModal.tsx` | Auto-fill từ QR CCCD chưa rõ |
| Đăng ký nhiều phòng | ✅ | `MultiSpecialtyExamController.RegisterMultiRooms` | — |
| Đổi phòng (BN chưa khám) / Xóa đăng ký sai | ✅ | `ChangeRoom`, `DeleteRegistration`; `MoveRoomModal.tsx` | — |
| In phiếu khám / phiếu STT | ✅ | `print/examination-slip`, `print/queue-ticket` | — |
| **Cảnh báo BN** (tạo/sửa/xoá, mã màu, ghi chú) | ⚠️ | `PatientFlagController` CRUD đủ + `PatientFlagBanner.tsx`, nhưng v2 chỉ READ-ONLY (`getReceptionWarnings`) | **Nhúng CRUD cảnh báo vào drawer Tiếp đón v2** |
| **Đặt khám tại quầy** (tạo/sửa/huỷ + in phiếu) | ⚠️/❌ | Chỉ có đặt khám online; `BookingManagement.tsx` chỉ XEM | Thiếu UI tạo/sửa đặt khám tại quầy + endpoint sửa booking + in phiếu |
| Nút Xác nhận / Nhắc lịch trong Booking | ⚠️ | Là **stub** (chỉ toast), không gọi `confirmBooking/markNoShow` (API có sẵn) | Wire action vào `BookingManagementController` |
| **Đăng ký khám TỪ đặt khám** | ⚠️ | Backend `register/quick/appointment` + `CheckinFromBooking` có; UI Tiếp đón không tham chiếu | Thêm picker "Danh sách đặt khám" trong `NewVisitModal` |
| Sửa thông tin hành chính BN | ⚠️ | `UpdateAdmission` có; UI v2 chỉ tạo mới | Thêm form sửa hành chính trong drawer |
| Giữ giấy tờ / BHYT tạm / chụp ảnh / chỉ định CLS tại tiếp đón | ✅ | `VisitActionsModals.tsx` (Document/TempInsurance/Photo/ServiceOrder) | — |

---

## 2. PHÒNG KHÁM (Khám bệnh + Khai báo sử dụng)

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Chọn BN từ hàng đợi, nhập triệu chứng/sinh hiệu/BMI | ✅ | `OpdEditor.tsx` `getRoomPatientList`, vitals, `updatePhysicalExamination` | — |
| Chẩn đoán ICD (chính + kèm theo) | ✅ | `searchIcdCodes` + `updateDiagnosisList` | — |
| Chỉ định CLS (từng món) | ✅ | `createServiceOrders` + `Create/Update/CancelServiceOrder` | Chưa có cây "Liệt kê" chọn nhiều CLS theo danh mục |
| Kê đơn thuốc (chọn kho, đơn mẫu, thêm/sửa/xoá) | ✅ | `PrescriptionEditor.tsx` `createPrescription`, templates | — |
| **Toa nhà thuốc / mua ngoài (F5)** | ⚠️ | Backend `prescriptions/{id}/print-external` có; UI không tách F3/F5 | Thêm chế độ toa ngoài + in toa nhà thuốc |
| **Xử trí: Nhập viện / Chuyển viện / Hẹn tái khám** | ⚠️ | Backend đủ (`request-hospitalization`, `request-transfer`, `{examId}/appointment`, in giấy); OpdEditor **không có nút** | **Thêm khối "Xử trí" gọi các endpoint này + in giấy** |
| Khám thêm chuyên khoa khác | ✅ | `MultiSpecialty.AddFollowUp` | — |
| Giấy nghỉ ốm | ✅ | `createSickLeave` | — |
| Hoàn tất khám + in bảng kê + ràng buộc BHYT phòng cuối | ✅ | `getCompletionStatus`, `canPrintBill`, `printBill` | — |
| Hủy in chi phí / Hủy hoàn tất (quy trình ngược) | ✅ | `cancelPrintBill`, `cancelCompletion` (có phân quyền) | — |
| PTTT/Thủ thuật (F6) tường trình + hình | ✅ | `shared/SurgeryReportModal` + `SurgeryCompleteController` | Đính kèm hình / chọn mẫu PTTT chưa kiểm chứng đủ |
| Xuất tủ trực (F10), KQ XN·CĐHA, Sổ hội chẩn | ✅ | `CabinetIssueModal`, `getPatientLabResults`, `ConsultationRegisterController` | — |
| Từ viết tắt (F2), đơn thuốc mẫu | ✅ | `AbbreviationController` + `useAbbrExpansion`; templates | — |
| **Mẫu HSBA ngoại trú / mẫu tường trình PTTT** | ⚠️ | `ClinicalTemplateController` generic có; UI khai báo/áp dụng mẫu BA ngoại trú & PTTT chưa rõ | Thêm UI quản lý + áp dụng mẫu |

---

## 3. NỘI TRÚ (Bác sĩ + Trả KQ XN tại giường)

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| DS BN theo khoa / sơ đồ giường / mở HSBA | ✅ | `Inpatient.tsx` + `GET patients`, `bed-status`; `EmrEditor.tsx` | — |
| Tờ điều trị (tạo) + Diễn biến bệnh | ✅ | `createTreatmentSheet`; textarea `dailyProgress` | — |
| Chẩn đoán + chẩn đoán kèm theo trên tờ điều trị | ⚠️ | Chỉ **hiển thị** (`GET diagnosis/{admissionId}`), không có POST | Bổ sung POST diagnosis + UI thêm kèm theo |
| **Y lệnh thuốc có cấu trúc (phiếu lĩnh)** | ⚠️ **(P1)** | Backend đủ (`POST prescriptions`, `prescribe-by-template`, `search-medicines`); `createPrescription` có trong `api/inpatient.ts` nhưng **không page nào import** → chỉ có textarea tự do | **Dựng UI dòng thuốc (liều/đường dùng/ngày-lần/đối tượng) gọi `POST /api/inpatient/prescriptions`** |
| **Chỉ định CLS nội trú (tạo mới F7 + cây F6)** | ❌ **(P1)** | Backend đủ (`POST service-orders`, `service-tree`, `order-by-template`); `ClsOrdersModal` **chỉ hủy + đổi đối tượng** | **Dựng UI chỉ định CLS (tìm dịch vụ → thêm; cây tick nhiều)** |
| Sửa đối tượng / Hủy nhiều CLS | ✅ | `updateServiceRequestPaymentType`, `cancelServiceRequests` | — |
| Xuất tủ trực / Hoàn trả thuốc theo BN | ✅ | `CabinetIssueModal`, `DrugReturnModal` (lý do Thừa/Đổi/Ngừng) | — |
| Trả KQ XN tại giường (nhập → duyệt → in) | ✅ | `inpatient/BedLabResultSection.tsx`; in chỉ khi status≥4 | — |
| Toa thuốc về (xuất viện) | ✅ | `DischargePrescriptionModal` | — |
| Chuyển khoa | ✅ | `TransferModal` → `POST transfer-department` | — |
| **Chuyển viện (in giấy)** | ⚠️ | `POST print-referral-certificate` có; thiếu nút FE | Nối nút in giấy chuyển viện |
| **Ra viện / Hủy ra viện** | ⚠️ **(P1)** | Backend đủ (`pre-discharge-check`, `POST discharge`, `cancel-discharge`, `print-discharge-certificate`); FE **không có nút Ra viện** | **Thêm nút Ra viện (kèm pre-discharge-check) vào màn theo dõi điều trị** |
| **Tổng kết bệnh án** | ⚠️ **(P1)** | Backend `medical-record-archive/summary`, `billing-statement` có; thiếu form tổng kết | Bổ sung form tổng kết bệnh án ra viện |
| In tờ điều trị | ⚠️ | `GET print-treatment-sheet/{id}` có; thiếu nút FE | Nối nút In |
| PTTT: tiền mê / theo dõi gây mê / cam đoan | ✅ | `SurgeryFormModals.tsx` (PreAnesthesia, AnesthesiaMonitor), `ConsentModal` | — |
| Kế hoạch sau gây mê – phẫu thuật (form riêng) | ⚠️ | Hiện gộp trong `PreAnesthesiaModal` | Tách form riêng |
| Phiếu xuất thuốc/VTYT phòng mổ phân đối tượng (hao phí/thu phí/BHYT) | ⚠️ | Có `cabinet-issue` chung; chưa tách phiếu phòng mổ theo đối tượng | Bổ sung phiếu xuất phòng mổ phân loại đối tượng |

---

## 4. DƯỢC

> **Đánh giá: gần như đầy đủ và VƯỢT tài liệu đối thủ.** Chỉ 1 gap nhỏ.

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Nhập kho NCC (hóa đơn/lô/HSD/thuế/giá) + duyệt + hủy | ✅ | `PharmacyStockIn.tsx` + `WarehouseCompleteController receipts/supplier` | — |
| Xuất chuyển kho (chọn lô/HSD) + in | ✅ | `PharmacyStockIssue.tsx` + `issues/transfer` | — |
| Phiếu dự trù + duyệt cấp theo kho | ✅ | `PharmacyApproval.tsx` (Dự trù nội bộ) + `PharmacyApprovalController approve` | — |
| Duyệt cấp/bù theo BN / tủ trực / hao phí khoa / hoàn trả | ✅ | `PharmacyApproval` loại phiếu 2–5 | — |
| Thu hồi duyệt cấp/bù | ✅ | `pharmacy-approval/revoke` | — |
| Tồn kho chi tiết + tổng hợp | ✅ | `StockReport.tsx` + `StockReportController detail/summary` | — |
| Phát thuốc ngoại trú BHYT (quầy, in tem) + hủy | ✅ | `DispensingCounter.tsx` | — |
| Phát thuốc nội trú "đơn về" + hủy | ✅ | `Pharmacy.tsx` + `InpatientDispensing.tsx` + `issues/dispense-inpatient` | Xác nhận luồng "đơn về xuất viện" đánh dấu phát riêng |
| Kiểm tra dược lâm sàng | ✅ | `ClinicalPharmacyCheck.tsx` + `patient-summary/{patientId}` | — |
| **Popup cảnh báo hạn dùng khi đăng nhập** | ⚠️ | Backend `expiry-alerts/on-login` + acknowledge có; FE chỉ có tab "Sắp hết hạn", **không popup khi login** | Gọi `expiry-alerts/on-login` hiện popup khi vào module Dược |

**App vượt tài liệu:** Kiểm kê kho, thẻ kho/XNT, xuất hủy/trả NCC, pha chế, đơn thuốc quốc gia, nhà thuốc GPP/hoa hồng, kho nuôi cấy.

---

## 5. XÉT NGHIỆM (LIS)

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Cấp STT mẫu tuần tự + sửa STT | ✅ | `SampleCollectionController AssignSequence/UpdateSequence`; `SampleSequenceToolbar.tsx` | — |
| In barcode/sticker (đơn + hàng loạt) | ✅ | `PrintSampleBarcode(sBatch)` (PDF) | — |
| Hủy mẫu / Thêm XN trên cùng mẫu / Lịch sử lấy mẫu | ✅ | `CancelSample`, `AddTests`, `History`, `SampleBatchController` | — |
| **Hẹn lấy mẫu / tái XN (ngày/tuần/tháng)** | ❌ | Không có endpoint/UI hẹn trong module XN | Thêm chức năng đặt lịch hẹn lấy mẫu/tái XN |
| Nhận mẫu (DS chờ + xác nhận + người nhận) | ✅ | `SampleReceiveController Pending/Accept`; `SampleReceive.tsx` | — |
| **Hủy nhận mẫu** (đảo ReceiveStatus 1→0) | ⚠️ | Chỉ rollback gián tiếp qua cancel-chain | Thêm endpoint `POST /sample-receive/cancel-receive` + nút FE |
| Từ chối mẫu (kèm lý do) | ✅ (vượt) | `Reject` (bắt buộc Reason) | — |
| Nhập KQ thủ công + nhận KQ tự động từ máy (LIS interface) | ✅ | `EnterLabResult`, `SendWorklist/ReceiveResultFromAnalyzer`, `LisConfigController` | — |
| Inbox "KQ máy" + Chuyển lại / Từ chối | ✅ | `GetAnalyzerInbox`, `TransferInboxResult`; `AnalyzerInbox.tsx` | — |
| Duyệt KQ (1 bước / 2 bước, ép 4-eyes) + In phiếu KQ | ✅ | `ApproveLabResult`, `Preliminary/FinalApprove`, `PrintLabResult` | — |
| Cảnh báo bất thường (cao=đỏ/thấp=xanh/critical) | ✅ | `LabResultEvaluationController.EvaluateValue` | — |
| Sửa phiếu (hủy duyệt→sửa→duyệt lại) + stamp người sửa | ✅ | `CancelApproval` + `UpdatedBy` | — |
| Khai báo: đơn vị, vi khuẩn, kháng sinh, sổ/nhóm XN, chỉ số + tham chiếu | ✅ | `LisCatalogController` (units/organisms/antibiotics/books/tests/reference-ranges) | — |
| Hóa chất XN (đối tượng hao phí) | ✅ | `LisCatalogController` LabChemical + `ObjectType` | — |
| **Xem HSBA BN từ màn trả KQ** | ⚠️ | Chưa có nút mở HSBA tích hợp trong màn KQ | Thêm nút "Xem HSBA" liên kết EMR |
| **Tiện ích xem tồn tủ trực / tồn hóa chất ngay trên màn XN** | ⚠️ | Dữ liệu có ở Warehouse/LabChemical; thiếu panel tích hợp | Thêm panel/nút "Tiện ích" gọi API kho trong màn XN |
| Phân quyền KTV / Người duyệt mặc định theo user | ⚠️ | Dùng Role + ép 4-eyes runtime; chưa có gán mặc định per-user | (Tùy chọn) Thêm `DefaultLabRole` ở user profile |

**App vượt tài liệu:** QC Levey-Jennings, delta-check, critical alerts, báo cáo TAT/công suất, POCT sync, vi sinh nuôi cấy + KS đồ v2, sample storage (freezer/rack/box), xuất BHXH XML.

---

## 6. CĐHA / PACS / RIS

> Bộ tính năng lõi (tiếp nhận → điều phối → thực hiện → capture NON-DICOM → tường trình → mẫu → ký số → in → trả HIS → viewer 2D/MPR/3D/MIP/Mammo) **đều có thật**. Gap tập trung ở vài luồng phụ.

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Danh sách chờ / điều phối ca chụp (in phiếu điều phối, hủy) | ✅ | `RISCompleteController`, `RadiologyDispatchController`; `RisDispatcher.tsx` | — |
| Gọi BN / hàng đợi phòng / bắt đầu-kết thúc kỹ thuật | ✅ | room queue, call-next, start/complete | — |
| Gửi worklist (MWL) + kết nối PACS/C-STORE/export DICOM | ✅ | `modalities/worklist/send`, pacs-connections, `dicom/export`, `dicom/send` | — |
| Chụp/quay NON-DICOM (camera, crop, upload, gửi PACS) | ✅ | `NonDicomController`; `NonDicomCapture.tsx` (getUserMedia/MediaRecorder) | — |
| Viết tường trình + mẫu (theo dịch vụ/giới/BS) + từ viết tắt | ✅ | `results/enter`, templates by-service/gender, abbreviations/expand | — |
| Duyệt sơ bộ/chính thức + hủy duyệt + ký số (USB token, PDF) | ✅ | preliminary/final-approve, `results/sign`, usb-token, `pdf/generate-and-sign` | — |
| In KQ (kèm ảnh/chữ ký/hàng loạt) + trả HIS (HL7/CDA) | ✅ | `results/{id}/print`, print-batch, `reports/{id}/send-result`, hl7-cda | — |
| Viewer 2D (W/L, zoom, đo dài/góc/HU/diện tích, annotation) | ✅ | `CornerstoneViewer.tsx` (Length/Angle/Probe/ROI/Bidirectional…) | — |
| MPR / 3D / MIP-MinIP / Mammo + OHIF embed | ✅ | `MprViewer`, `MipMinIpViewer`, `MammoViewer`, `DicomViewer.tsx` | — |
| AI labeling / đánh dấu tổn thương | ✅ (vượt) | `AiLabelingController` (provider, review, export DICOM-SR, merge-to-report) | — |
| Tạo & in ảnh key | ✅ | `key-images mark/get`, `images/edit` crop | Thiếu gallery key-image quản lý hàng loạt (nhỏ) |
| Hội chẩn online (video, mời, ghi hình) | ✅ | Consultation region đầy đủ; `VideoConsultation.tsx` (Jitsi thật) | — |
| Phân quyền chụp/đọc (copy quyền user→user) | ✅ | `CopyPermissions(from→to)` | — |
| Khai báo danh mục (modality/body-part/protocol/mẫu/ICD→mẫu) | ✅ | `RisCatalogController` + `RisCatalogAdmin.tsx` | — |
| **Chia sẻ ca chụp + ẩn/anonymize thông tin BN** | ⚠️ | `StudyShareController` (token/password/expiry) có; **tùy chọn anonymize chưa rõ** | Thêm tùy chọn ẩn thông tin BN khi share |
| **Khai báo dịch vụ CĐHA ↔ nhập tường trình PTTT** | ❌ | Không thấy mapping CĐHA↔PTTT trong RIS | Bổ sung khai báo + luồng nhập tường trình PTTT từ màn CĐHA |
| **Nhập sinh thiết / GPB ngay tại màn KQ CĐHA** | ❌ | `PathologyController` riêng nhưng không nối shortcut từ màn KQ | Thêm nút "Nhập sinh thiết" + in phiếu trong màn KQ RIS |
| **App mobile RIS/PACS chuyên dụng** | ⚠️ | `MobileHome.tsx` chỉ link; viewer là web responsive | (Tùy định hướng) PWA/mobile build worklist + viewer |
| **Bulk download theo BN/danh sách + mã hóa** | ⚠️ | `dicom/export/{studyId}` theo từng study | Thêm bulk download + anonymize/mã hóa |
| Tool viewer chuyên sâu (CTR, đo mạch/sơ vữa, thể tích, nội soi ảo, cut 3D, fusion) | ⚠️ | Có bộ đo cơ bản + MPR/MIP; phụ thuộc OHIF | Bổ sung tool đo chuyên sâu native |
| User-config phím tắt & W/L preset F1–F10 viewer | ⚠️ | Chưa thấy tùy biến phím tắt viewer | Thêm vào `DicomViewerConfig.tsx` |
| "Favorite" ca chụp per-user | ⚠️ | Có `tags` (tương đương); chưa có favorite per-user | Mở rộng từ tags |

**App vượt tài liệu:** AI labeling đầy đủ, HL7 CDA, audit log truy cập ảnh, ký số USB token+PDF, báo cáo QĐ4069.

---

## 7. EMR & KÝ SỐ

> **Phủ phần lớn và VƯỢT đối thủ.** 27 chuyên khoa form động (đối thủ 22), ký số mạnh hơn (PKCS#11/VGCA/HSM, batch, workflow nhiều cấp), lưu trữ/CDA/HL7 đối thủ không có.

| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Tóm tắt HSBA ra viện | ✅ | `PdfGenerationService` summary | — |
| HSBA theo chuyên khoa (đối thủ 22 loại) | ✅ (vượt: 27) | `SpecialtyEmrController` + `constants/specialtyEmr.ts` | — |
| Form động (field bắt buộc, mẫu) | ✅ | `SpecialtyEMR.tsx`, `ClinicalTemplateController`, shortcodes | — |
| Tờ điều trị / gây mê HS / biểu đồ chuyển dạ / hội chẩn | ✅ | `treatment-sheets`, `ClinicalRecordController` (anesthesia/partograph) | — |
| **Phiếu chăm sóc ĐD TT32 cấp 1/cấp 2 riêng** | ⚠️ | Chỉ có nursing-care chung | Bổ sung mẫu cấp 1/cấp 2 theo Thông tư |
| Tường trình PTTT | ✅ | `ClinicalNarrativeController` | — |
| **Biểu mẫu giấy chuẩn TT32/2023 còn thiếu** (GCN PTTT, kiểm thảo tử vong, phân loại cấp cứu, cam kết, bàn giao chuyển khoa BS/ĐD) | ⚠️ | Một phần qua PDF template; thiếu nhiều mẫu nhập liệu riêng | Bổ sung mẫu in + document-types đưa vào luồng ký |
| Đính kèm tài liệu số hóa/scan | ✅ | `EmrAdminController attachments` | — |
| Ký số cá nhân (USB token) + trình ký lãnh đạo nhiều cấp | ✅ (vượt) | `DigitalSignatureController`, `SigningWorkflowController` | — |
| Đóng dấu sau in | ✅ | `print-log/stamp` | — |
| **BN ký số / ký vân tay sinh trắc + người thân ký thay** | ⚠️ | `patient-signatures` (mã xác thực) + `BiometricEnrollment.tsx`; chưa rõ tích hợp thiết bị vân tay + người thân | Tích hợp thiết bị vân tay + luồng người thân ký |
| Tổng kết/đóng HSBA + kiểm tra đầy đủ | ✅ (vượt) | `completeness`, `finalize`, close/reopen | — |
| Lưu trữ/archive (vị trí, mượn-trả, auto) | ✅ (vượt) | `MedicalRecordArchiveController`, `MedicalRecordPlanningController` | — |
| Tìm kiếm HSBA | ✅ | `SpecialtyEmrController.Search` | — |
| Cổng BN Web + app mobile xem BA | ✅ | `PatientPortal.tsx`, `PatientPortalMobile.tsx` | Login dùng tài khoản đăng ký (khác MQ = mã BN/CCCD) |
| **App mobile bác sĩ nhập liệu** (tờ điều trị/dự trù/CLS/in wifi) | ⚠️ | `DoctorPortalMobile.tsx` chỉ là **viewer** | Nâng thành nhập liệu (API đã có) |
| **Website số hóa BA tra cứu công khai bằng CCCD/QR** | ❌ **(P1)** | Không có endpoint public; portal bắt buộc đăng ký tài khoản | **Xây trang public: nhập/quét CCCD → liệt kê file đã ký → xem PDF** |
| Sinh CDA/HL7, đồng bộ cloud | ✅ (vượt) | `CdaDocumentController`, `EmrHl7Export.tsx`, `EmrCloudSync.tsx` | — |

**App vượt tài liệu:** chia sẻ/trích sao HSBA, gáy HSBA, khóa tài liệu (concurrency lock), auto-check rule, khôi phục dữ liệu xóa.

---

## 8. THANH TOÁN KTM + SỔ BIÊN LAI + HR + TTB/VPP

### 8.1 Thanh toán không dùng tiền mặt
| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| QR động / VNPay (Napas, VISA/Master/JCB) / VietQR / Ví (MoMo, ZaloPay) | ✅ (vượt) | `PaymentGatewayService`, `bank/list`, `momo/ipn`, `zalopay/callback` | — |
| IPN/Webhook tự động + xác nhận sao kê thủ công | ✅ | `vnpay/ipn`, `bank/confirm` | — |
| Hoàn tiền + cho lại CLS sau hoàn + tạm ứng/hoàn ứng | ✅ | `refund`, `ServiceRefundController requeue`, `BillingComplete deposits` | — |
| 7–8 báo cáo chuẩn MQ | ✅ | `PaymentReportsController` (BC1–BC7) | — |
| **Hóa đơn điện tử (HDDT)** | ⚠️ **(P1)** | `ExportElectronicInvoiceAsync` ghi rõ **"Simulate export (VNInvoice/Misa)"** | **Tích hợp thật VNPT/Viettel/Misa: ký số, mã CQT, LookupUrl** |
| **Đối soát tự động cổng TT** | ⚠️ | Chỉ `bank/confirm` thủ công | Import sao kê + auto-match theo `TxnRef` |

### 8.2 Sổ biên lai
| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Khai báo quyển (ký hiệu/tên/dải số/loại/người thu) + đóng-mở sổ | ✅ (vượt) | `ReceiptBookController` Save/activate/close, cấp số có `UPDLOCK` | — |
| **Lý do thu (field riêng)** | ⚠️ | Chỉ có `Notes` chung | Thêm field `CollectionReason` (nhỏ) |

### 8.3 Quản lý nhân sự
| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Hồ sơ NV 9 nhóm (tài sản/phụ cấp/công tác/đào tạo/gia đình/khen-kỷ/ngân hàng/hợp đồng/BHXH) | ✅ | `EmployeeProfileController` | — |
| Quyết định nhân sự + Chứng chỉ hành nghề | ✅ (vượt) | `hr-decisions`, `PracticeLicenseController` | — |
| **Tab Đoàn thể** | ⚠️ | Không có tab riêng | Thêm field/tab tổ chức đoàn thể |
| **Bậc/hệ số lương trong hồ sơ NV** | ⚠️ | Có module Payroll riêng; hồ sơ chưa có bậc/hệ số | Thêm bậc lương vào hồ sơ để liên kết Payroll |

### 8.4 TTB / VPP
| Tính năng | Trạng thái | Bằng chứng | Gap |
|---|---|---|---|
| Danh mục / nhập kho / duyệt cấp phiếu lĩnh / xuất kho / báo cáo + thẻ kho | ✅ | `OfficeSupplyController`, `VppStockCard.tsx`, warehouse | — |
| **Thu hồi phiếu yêu cầu VPP** | ⚠️ | Chỉ create/approve, không recall/reject | Thêm `requests/{id}/recall` |
| **Duyệt hoàn trả VPP** | ⚠️ | Không thấy endpoint hoàn trả | Thêm luồng `returns` |
| Tài sản cố định: khấu hao/thanh lý/điều chuyển/QR/bảo trì/hiệu chuẩn | ✅ (vượt) | `AssetManagementController`, `ExtendedWorkflowControllers maintenance` | Nút "Lên lịch bảo trì" `Equipment.tsx:120` còn stub → nối API |
| **Kiểm kê tài sản cố định** | ⚠️ | FixedAssets chưa có phiếu kiểm kê | Thêm kiểm kê (tham chiếu `BloodBankCompleteController:333`) |

---

## 9. KẾ HOẠCH THỰC HIỆN CHO CLAUDE CODE

Sắp xếp theo độ ưu tiên. Mỗi mục ghi rõ backend đã có gì để **không làm lại**.

### Đợt 1 — P1 (lõi nghiệp vụ, làm trước)
1. **[Nội trú] UI kê y lệnh thuốc có cấu trúc** — Dựng component dòng thuốc (tên/liều/đường dùng/ngày-lần/lần-viên/đối tượng) trong `EmrEditor.tsx` (hoặc modal mới), gọi `createPrescription`/`orderByTemplate` (`api/inpatient.ts` đã có). Backend `InpatientCompleteController` POST `prescriptions`/`prescribe-by-template` đã sẵn.
2. **[Nội trú] UI chỉ định CLS nội trú** — Modal mới: ô tìm dịch vụ → thêm (F7) + cây danh mục tick nhiều (F6). Gọi `createServiceOrder` + `service-tree`/`order-by-template`. Mở rộng `ClsOrdersModal` (đang chỉ hủy/đổi đối tượng).
3. **[Nội trú] Ra viện + Tổng kết bệnh án** — Nút Ra viện gọi `pre-discharge-check` → `POST discharge` (+ `cancel-discharge`); form tổng kết dùng `medical-record-archive/summary`, `billing-statement`. Nối `print-discharge-certificate`, `print-referral-certificate`, `print-treatment-sheet`.
4. **[EMR] Website số hóa BA tra cứu công khai CCCD/QR** — Endpoint `GET /api/public-emr/lookup?cccd=...` (AllowAnonymous + rate-limit) trả danh sách file đã ký; trang FE public nhập/quét CCCD → xem PDF (tận dụng `DigitalSignatureController.DownloadSignedPdf`).
5. **[Thanh toán] Tích hợp HDDT thật** — Thay phần "Simulate" trong `PaymentGatewayService.cs` (`ExportElectronicInvoiceAsync:296`) bằng tích hợp VNPT/Viettel/Misa thật (ký số, mã CQT, LookupUrl). Cần chọn NCC + thông tin kết nối từ user.
6. **[Phòng khám] Khối "Xử trí" trong OpdEditor** — Nút Nhập viện / Chuyển viện / Hẹn tái khám gọi `request-hospitalization`, `request-transfer`, `{examId}/appointment` + in giấy (endpoint đã có).
7. **[Tiếp đón] CRUD cảnh báo BN trong v2** — Nhúng `PatientFlagBanner` (hoặc modal save/delete `patientFlag.ts`) vào drawer `VisitDrawerBody.tsx`.
8. **[Tiếp đón] Wire đặt khám tại quầy** — Nối nút Xác nhận/Nhắc lịch (`confirmBooking/checkInBooking/markNoShow`) trong `BookingManagement.tsx`; thêm form tạo/sửa đặt khám + endpoint sửa + in phiếu; picker "Danh sách đặt khám" trong `NewVisitModal` (`register/quick/appointment`).

### Đợt 2 — P2 (trung bình)
9. **[Phòng khám] Toa ngoài/nhà thuốc (F5)** — Chế độ toa ngoài trong `PrescriptionEditor.tsx` + `print-external`.
10. **[Nội trú] In tờ điều trị / chẩn đoán kèm theo (POST) / phiếu xuất phòng mổ phân đối tượng / form Kế hoạch sau gây mê riêng.**
11. **[LIS] Hủy nhận mẫu** (`POST /sample-receive/cancel-receive`) + **Hẹn lấy mẫu/tái XN** + nút "Xem HSBA" + panel "Tiện ích" tồn kho.
12. **[CĐHA] Khai báo CĐHA↔tường trình PTTT** + **Nhập sinh thiết/GPB từ màn KQ** + anonymize khi share + bulk download mã hóa.
13. **[EMR] Biểu mẫu giấy TT32 còn thiếu** (GCN PTTT, kiểm thảo tử vong, phân loại cấp cứu, cam kết, bàn giao chuyển khoa) + **phiếu chăm sóc ĐD cấp 1/2** + nâng app mobile bác sĩ thành nhập liệu.
14. **[TTB/VPP] Thu hồi phiếu + duyệt hoàn trả VPP** (`OfficeSupplyController`) + **kiểm kê tài sản cố định** + nối nút "Lên lịch bảo trì" (`Equipment.tsx:120`).

### Đợt 3 — P3 (nhỏ / hoàn thiện)
15. **[Dược] Popup cảnh báo hạn dùng khi login** (`expiry-alerts/on-login`).
16. **[Tiếp đón] Form sửa hành chính BN** (`UpdateAdmission`).
17. **[CĐHA] User-config phím tắt & W/L preset F1–F10 + favorite per-user + gallery key-image.**
18. **[EMR] Mẫu HSBA ngoại trú/PTTT UI; rà soát bộ lọc form trình ký theo vai trò người ký.**
19. **[HR] Tab Đoàn thể + bậc/hệ số lương trong hồ sơ; [Biên lai] field Lý do thu; [LIS] DefaultLabRole per-user.**

---

## 10. TEST PLAN (sau khi Claude Code hoàn thiện)

Sau mỗi đợt, chạy kiểm thử và fix tới khi sạch lỗi:

**Build & smoke**
- Backend: `cd backend/src/HIS.API && dotnet build` (0 error) → chạy `dotnet run --launch-profile http`, kiểm tra startup migration tự áp + DI không lỗi 500.
- Frontend: `cd frontend && npm run build` (0 TS error) → `npm run dev`.
- Smoke có sẵn: `TaiLieuDoiThu/smoke_test_phase.ps1`.

**E2E theo luồng nghiệp vụ vừa sửa** (Cypress/Playwright đã cấu hình):
- `cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome` (0 console error).
- `npx playwright test` cho các trang đã đổi.
- Bổ sung kịch bản E2E mới cho từng gap P1: (a) kê y lệnh thuốc nội trú → lưu → xem lại phiếu lĩnh; (b) chỉ định CLS nội trú → hủy → đổi đối tượng; (c) ra viện → tổng kết → in giấy ra viện; (d) tra cứu công khai CCCD → mở PDF đã ký; (e) xuất HDDT → kiểm tra mã CQT/LookupUrl; (f) OPD xử trí nhập viện/chuyển viện; (g) cảnh báo BN tạo/sửa/xoá ở Tiếp đón; (h) đặt khám tại quầy → check-in.

**Kiểm thử API** (controller mới/đổi): test integration cho endpoint thêm mới (`cancel-receive`, `public-emr/lookup`, `office-supply returns/recall`, asset stocktake…). Đối chiếu authz/role.

**Regression**: chạy lại test suite hiện có để đảm bảo không vỡ luồng cũ; xem `backend-crud-test.log`/`backend-ui-test.log` làm chuẩn so sánh.

> **Quy ước dự án (Claude Code phải tuân theo `CLAUDE.md`):** đọc `.claude/SKILL-MAP.md` trước mọi task; đăng ký service mới trong `DependencyInjection.cs`; migration idempotent đánh số kế tiếp trong `Data/Scripts/`; ưu tiên `pages-v2/` trước `pages/`; không check `response.success` sau `apiClient` (interceptor đã unwrap).
