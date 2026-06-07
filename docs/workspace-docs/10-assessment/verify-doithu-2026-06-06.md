# Kiểm định code đã làm ↔ tài liệu đối thủ (sau khi Claude Code hoàn tất) · 2026-06-06

> Phương pháp: 6 agent QA đọc code đã commit (snapshot sạch từ HEAD `50f3ff2`) + đối chiếu từng quy trình mô tả trong `TaiLieuDoiThu`. Đánh giá ✅ khớp / ⚠️ lệch-thiếu / ❌ sai-không làm. Mọi kết luận có trích file:dòng.

## Kết luận nhanh
Độ phủ và độ trung thực **tốt**: hầu hết chức năng là code thật (gọi API thật, persist DB, có validate), không phát hiện nút giả/stub ở các hạng mục chính. Tuy nhiên còn **2 lỗi nghiêm trọng** (an toàn dữ liệu / pháp lý) và một số chỗ rớt trường dữ liệu hoặc lệch chi tiết nghiệp vụ so với tài liệu.

---

## 🔴 P0/P1 — NGHIÊM TRỌNG, sửa gấp

1. **CĐHA — "Tải ẩn danh" (bulk download) là GIẢ** (`RISCompleteController.cs:2828-2830`). Cờ `Anonymize=true` chỉ đổi tiền tố tên file `anon_`; DICOM tải từ Orthanc `/studies/{id}/archive` **vẫn nguyên PHI trong tag (0010,xxxx)**. Nút "Tải ẩn danh" gây hiểu nhầm an toàn → **rủi ro lộ thông tin BN**. Phải gọi Orthanc `POST /studies/{id}/anonymize` rồi mới archive; cân nhắc ZIP có mật khẩu cho yêu cầu "mã hóa". Tương tự, share "ẩn BN" (`StudyShareController.cs:171-172`) chỉ null hóa metadata, viewer vẫn thấy tên trong tag.

2. **HĐĐT — path "Issue" đánh dấu đã phát hành bằng mã GIẢ** (`BillingCompleteService.ElectronicInvoices.cs:78-165`). `POST /e-invoices` → `IssueElectronicInvoiceAsync` set `Status=1` (Đã phát hành) + sinh `ProviderInvoiceId/LookupCode/LookupUrl` giả **mà không gọi provider**, kể cả khi NCC đã cấu hình. Provider thật chỉ chạy ở endpoint riêng `PUT /e-invoices/{id}/export`. Nếu FE gọi nhầm path Issue → hóa đơn "đã phát hành" với mã tra cứu giả (rủi ro pháp lý/kế toán). Cần: Issue tạo `Status=0` (Nháp) rồi bắt buộc qua Export, hoặc gọi provider ngay trong Issue khi `IsConfigured`.

3. **Phòng khám — Nhập viện rớt khoa** (`ExaminationCompleteService.Conclusion.cs:125`). UI cho chọn khoa nội trú + cấp cứu + chẩn đoán (`OpdEditor.tsx:352`) nhưng service **chỉ lưu `Reason`**, bỏ `DepartmentId/IsEmergency/Diagnosis`; chưa tạo hồ sơ nội trú thật. Khoa người dùng chọn bị mất.

4. **Xét nghiệm — màu cảnh báo cao/thấp sai** (`Laboratory.tsx:800-801`). Tài liệu: cao→ĐỎ, thấp→XANH. Code hiện cho cả `H` (cao) lẫn `L` (thấp) **cùng màu cam**, chỉ `HH` mới đỏ. Sai hiển thị lâm sàng, dễ lộ khi demo.

5. **Xét nghiệm — không chặn in khi chưa duyệt** (`LISCompleteService.Execute.cs:643`, `Laboratory.tsx:265`). Tài liệu yêu cầu "chưa duyệt KQ → in báo Không có số liệu". `PrintLabResultAsync` không kiểm trạng thái duyệt, in thẳng. (Lưu ý: màn trả KQ tại giường `BedLabResultSection` CÓ enforce; màn Laboratory chính thì KHÔNG.)

6. **Tiếp đón — Huỷ đặt khám tại quầy CHƯA CÓ** (`BookingManagement.tsx`). Có Xác nhận/Check-in/Vắng mặt/Sửa nhưng **không có nút Huỷ**; `api/bookingManagement.ts` không export cancel (endpoint huỷ chỉ tồn tại ở luồng công khai). Quy trình 3.3 tài liệu chưa làm trong v2.

---

## 🟠 P2 — lệch dữ liệu / thiếu chi tiết (chức năng vẫn chạy)

- **Chuyển viện gộp note** (`Conclusion.cs:144`): nối chuỗi vào `ConclusionNote`, rớt `TransportMethod/Diagnosis`; không tạo phiếu chuyển viện có cấu trúc.
- **F5 toa nhà thuốc**: in đúng nhưng cờ phân loại "toa ngoài/mua ngoài" **không persist** (`CreatePrescriptionDto` thiếu field; comment `PrescriptionEditor.tsx:213` tự thừa nhận). F3 vs F5 chưa phân biệt ở mức dữ liệu; `paymentType` hardcode `1`.
- **Trả KQ tại giường thiếu xác thực mật khẩu người duyệt** (`BedLabResultSection.tsx:227-258`): tài liệu bắt chọn người duyệt + nhập mật khẩu; code chỉ dùng JWT + ô ghi chú.
- **Kế hoạch sau gây mê thiếu nút In** (`SurgeryFormModals.tsx:985-991`): chỉ Lưu/Đóng; tài liệu yêu cầu Lưu→In.
- **In tờ điều trị**: chỉ in từng phiếu, thiếu "tích nhiều đợt → In tất cả"; lối vào đặt ở EMR Editor thay vì màn theo dõi điều trị.
- **Panel Tiện ích LIS**: gộp "tủ trực" và "tồn kho" làm 1 nguồn `/warehouse/stock`, thiếu lọc tháng/năm/kho, chỉ có ở màn KQ (thiếu màn Lấy mẫu).
- **Worker nhắc hẹn lấy mẫu mặc định TẮT** (`SampleAppointmentReminderWorker.cs:44` `Enabled=false`): prod phải set `SampleAppointmentReminder:Enabled=true` mới chạy.
- **Trình ký nhiều cấp**: model `SigningRequest` đơn cấp (1 AssignedTo/Status), không ép chuỗi BS→Trưởng khoa→Lãnh đạo như "MẪU KÝ SỐ NHIỀU CHỮ KÝ".
- **Thiếu form TT32 "Giấy cam kết nhập viện nội trú"** (migration 68 + `tt32-forms.tsx` không có) — dù yêu cầu nhắc "cam kết". 5/6 form khác đã có.
- **Phiếu chăm sóc ĐD không phân biệt cấp 1/2** (`NursingCareSheetDto` thiếu CareLevel + bảng sinh tồn).
- **Mobile bác sĩ thiếu ô chẩn đoán riêng + mẫu diễn biến** (`DoctorPortalMobile.tsx:461-472`).
- **KTM thiếu "Báo cáo nhà thuốc"** (2.3.7) trong `PaymentReportsController` (mới 7/8).
- **Thu hồi phiếu VPP** (`OfficeSupplyController.cs:166-195`) set `Status=4` (Đã thu hồi) thay vì về Nháp để sửa (comment mâu thuẫn).

---

## 🟡 P3 — nhỏ / làm rõ định vị

- Cảnh báo BN: chọn màu thủ công thay vì hệ thống tự cấp màu theo loại.
- Hẹn tái khám: chỉ ngày tuyệt đối, thiếu đơn vị tương đối (tuần/tháng/liên tục).
- Picker "từ lịch đặt khám": chỉ lọc hôm nay (tài liệu cho khoảng Từ–Đến ngày).
- Sửa STT mẫu: làm từng mẫu, tài liệu là màn batch nhiều BN.
- Hóa chất XN trên phiếu KQ: chỉ xem, thiếu thêm/đổi đối tượng/xóa.
- Phân quyền KTV/Người duyệt/"Xác nhận mẫu": dùng role tĩnh + auto-fill tên, thiếu UI gán theo từng tài khoản.
- Mã CQT HĐĐT lưu tạm vào `ElectronicInvoice.SignatureData` (TODO thêm cột `TaxAuthorityCode`).
- **Lưu ý định vị**: tài liệu "Website số hóa bệnh án" của đối thủ thực chất là **Web EMR cho bác sĩ đăng nhập nhập liệu**, KHÔNG phải cổng tra cứu công khai CCCD. Tính năng public-lookup là bổ sung tốt (đạt chuẩn privacy) nhưng không phải bản sao 1:1 của tài liệu đó.

---

## Hạng mục KHỚP TỐT (không cần sửa)
Y lệnh thuốc nội trú có cấu trúc; chỉ định CLS (tìm + cây danh mục); chẩn đoán kèm theo POST; ra viện + tổng kết + in giấy; xuất phòng mổ phân đối tượng; phân biệt rule "chưa duyệt không in" ở màn tại giường; popup hạn dùng Dược + đủ 5 luồng duyệt; hủy nhận mẫu (đảo trạng thái + guard); hẹn lấy mẫu ngày/tuần/tháng + worker idempotent; nút Xem HSBA; tra cứu công khai đạt đủ privacy P0; khai báo CĐHA↔PTTT + batch-check; nhập sinh thiết/GPB; ký số kết quả; 5/6 biểu mẫu TT32; bộ lọc trình ký theo vai trò + 4 tiêu chí; HR đoàn thể + bậc/hệ số lương; TTB/VPP hoàn trả + kiểm kê tài sản + lịch bảo trì; biên lai (ký hiệu/dải số/người thu/lý do thu/active); KTM QR đa cổng + đối soát + hoàn tiền.

---

## PROMPT SỬA cho Claude Code (xếp ưu tiên)

```
Đọc .claude/SKILL-MAP.md + docs/workspace-docs/10-assessment/verify-doithu-2026-06-06.md (báo cáo kiểm định). Sửa các lỗi đối chiếu tài liệu, ưu tiên P0/P1. BUILD-GATE (dotnet build 0 error · npm run build EXIT 0) + chạy lại Prompt 12 test toàn bộ sau khi sửa. KHÔNG tự push.

P0/P1:
1) CĐHA bulk-download "ẩn danh" GIẢ (RISCompleteController.cs:2828-2830 + RISCompleteService.DicomExport.cs:51): khi Anonymize=true phải gọi Orthanc POST /studies/{id}/anonymize rồi archive kết quả (xóa PHI thật trong tag), không chỉ đổi tên file. Đồng bộ: share HideDemographics phải ẩn ở mức ảnh/tag, không chỉ metadata (StudyShareController.cs:171).
2) HĐĐT path Issue giả phát hành (BillingCompleteService.ElectronicInvoices.cs:78-165): IssueElectronicInvoiceAsync KHÔNG được set Status=1 + mã giả khi chưa qua provider. Hoặc tạo Status=0 (Nháp) bắt buộc qua Export, hoặc gọi provider khi IsConfigured. Thống nhất ngữ nghĩa Issue (nháp) vs Export (phát hành thật).
3) Nhập viện rớt khoa (ExaminationCompleteService.Conclusion.cs:125): RequestHospitalizationAsync phải lưu DepartmentId + IsEmergency + Diagnosis (tạo/khởi tạo hồ sơ nội trú nếu đúng nghiệp vụ), không chỉ Reason.
4) Màu cảnh báo XN (Laboratory.tsx:800-801): tách H→đỏ, L→xanh, HH→đỏ đậm, LL→xanh đậm theo tài liệu.
5) Chặn in KQ chưa duyệt (LISCompleteService.Execute.cs:643 PrintLabResultAsync + Laboratory.tsx:265): chưa duyệt thì báo "Chưa duyệt kết quả", không in.
6) Huỷ đặt khám tại quầy (BookingManagement.tsx + api/bookingManagement.ts): thêm nút Huỷ + xác nhận + export cancelBooking nối endpoint huỷ (tái dùng AppointmentBookingController {code}/cancel hoặc bổ sung ở BookingManagementController), guard chặn huỷ lịch đã check-in.

P2 (làm sau khi P1 xanh): chuyển viện lưu trường riêng; cờ toa ngoài F5 persist; mật khẩu người duyệt KQ tại giường; nút In form kế hoạch sau gây mê; tách tủ trực/tồn kho + filter panel Tiện ích LIS + thêm vào màn lấy mẫu; bật worker nhắc hẹn ở prod; trình ký nhiều cấp tuần tự; thêm form TT32 "Giấy cam kết nhập viện"; CareLevel 1/2 cho phiếu chăm sóc; ô chẩn đoán + mẫu diễn biến mobile bác sĩ; Báo cáo nhà thuốc KTM (BC8); thu hồi phiếu VPP về Nháp.

Sau khi sửa: dotnet build + npm run build sạch → chạy Prompt 12 (regression toàn bộ) → báo cáo pass/fail.
```
