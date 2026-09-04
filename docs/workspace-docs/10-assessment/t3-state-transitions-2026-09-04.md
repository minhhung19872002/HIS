# T3 #218 — Ma trận chuyển trạng thái (2026-09-04)

> Task: **#218 [T3][TEST] State-transition matrix**. Script + dữ liệu đo:
> `docs/architecture/evidence/cross/t3/` (`t3_state_transitions.py`, `t3_transition_matrix.json`).

## 1. Điểm xuất phát: không có luật nào được thi hành

Cả codebase chỉ có **một** bảng luật chuyển trạng thái — `MedicalRecordStatus.CanTransition`
trong `HIS.Core/Constants/StatusConstants.cs` — và `git grep` cho thấy **nó không được gọi ở đâu cả**.
`PrescriptionStatus`, `LabRequestStatus`, `RadiologyRequestStatus` chỉ là danh sách hằng số, không kèm
luật. Nói cách khác: trước đợt này hệ thống **không thi hành máy trạng thái nào**.

## 2. Đo trên API đang chạy — đơn thuốc

Không tin vào việc đọc code: script dựng đơn thuốc ở từng trạng thái xuất phát, gọi đúng endpoint đổi
trạng thái (`/api/pharmacy/prescriptions/{id}/accept|reject|dispense`), rồi đọc lại trạng thái trong DB.

**Trước khi sửa: 9/15 lượt chuyển bất hợp lệ đều được chấp nhận, tất cả HTTP 200.**

| Từ | Hành động | Đến | Vì sao nguy hiểm |
|---|---|---|---|
| Hủy | dispense | Đã cấp phát | **Bác sĩ hủy đơn, nhà thuốc vẫn phát được.** Nguy cơ an toàn người bệnh trực tiếp. |
| Đã cấp phát | reject | Hủy | Thuốc đã rời kho nhưng hồ sơ ghi là hủy → lệch tồn kho, không có phiếu hoàn. |
| Chờ duyệt | dispense | Đã cấp phát | Bỏ qua hẳn bước dược sĩ duyệt. |
| Hoàn trả | dispense | Đã cấp phát | Phát lại đơn đã hoàn trả. |
| Hủy | accept | Đã duyệt | Đơn đã hủy sống lại. |
| Hoàn trả | accept / reject | Đã duyệt / Hủy | Trạng thái kết thúc vẫn đổi được. |
| Đã cấp phát | accept | Đã duyệt | Lùi trạng thái sau khi đã phát. |
| Cấp một phần | accept | Đã duyệt | Xoá dấu vết đã phát một phần. |

## 3. Sửa

- `PrescriptionStatus` nay có bảng `ValidTransitions` + `CanTransition` + `EnsureCanTransition`
  (ném `InvalidOperationException`, `DomainExceptionFilter` map thành **400 `INVALID_STATE`** kèm câu
  tiếng Việt nói rõ từ trạng thái nào sang trạng thái nào).
- Nối vào 3 đường ghi: `AcceptPrescriptionAsync`, `RejectPrescriptionAsync`, `CompleteDispensingAsync`.
- `PharmacyController` bắt `InvalidOperationException` trước catch chung → **400** thay vì 500, để giao
  diện hiện được lý do thay vì "lỗi máy chủ".
- Giữ nguyên **idempotency**: gọi lại cùng một hành động khi đã ở đúng trạng thái đó vẫn thành công
  (`from == to` luôn hợp lệ), và `CompleteDispensing` vẫn thoát sớm khi `IsDispensed`.
- "Hủy đơn đã phát" **vẫn làm được** — nhưng phải đi đường
  `WarehouseCompleteService.CancelDispensedPrescriptionAsync`, đường đó trả thuốc về kho rồi mới đặt
  Cancelled. Guard chỉ chặn việc lật cờ trạng thái suông không kèm hoàn kho.

**Sau khi sửa: 0/15 lượt bất hợp lệ lọt (tất cả trả 400), 6/6 lượt hợp lệ vẫn chạy bình thường.**

## 4. Lỗi phụ tìm được trong lúc sửa

`WarehouseCompleteService.Inventory.cs → CancelUnclaimedPrescriptionAsync` đặt
`prescription.Status = 5`. Với **đơn thuốc**, 5 không phải trạng thái nào cả — "Hủy" là **4**
(5 là `Cancelled` của `ExaminationStatus`/`LabRequestStatus`, bị lẫn sang). Hệ quả: đơn bị hủy vì quá
hạn lấy thuốc mang một trạng thái lạ, và mọi màn lọc theo `Status == 4` đều không nhìn thấy nó.
Đã sửa về hằng `PrescriptionStatus.Cancelled`, kèm guard, và đổi `throw new Exception` thành
`InvalidOperationException` để lỗi nghiệp vụ ra 400 thay vì 500.

## 4b. Phiếu hoàn tiền — cùng bệnh, ở miền tiền

Hỏi tiếp câu y hệt cho `Receipts` với `ReceiptType = 3`. `ApproveRefundAsync` và `ConfirmRefundAsync`
chỉ kiểm phiếu có tồn tại rồi gán thẳng trạng thái; guard duy nhất trong cả nhóm là "không hủy lại
phiếu đã hủy".

**Trước khi sửa: 11/16 lượt chuyển bất hợp lệ được chấp nhận, tất cả HTTP 200.** Ba lượt trong đó
cho **tiền ra khỏi quỹ** sai:

| Từ | Hành động | Vì sao nghiêm trọng |
|---|---|---|
| Chờ duyệt | confirm | **Chi tiền cho phiếu chưa từng được duyệt** — bỏ qua hẳn khâu phê duyệt. |
| Từ chối | confirm | Chi tiền cho yêu cầu đã bị từ chối. |
| Đã hủy | confirm | Chi tiền cho phiếu đã hủy. |

Còn lại là lật ngược trạng thái kết thúc: phiếu đã chi vẫn "duyệt"/"từ chối"/"hủy" lại được trên
giấy, phiếu đã từ chối vẫn duyệt lại được.

**Sửa:** thêm `RefundStatus` vào `StatusConstants.cs` với bảng luật — tiền chỉ ra khỏi quỹ **sau khi
đã duyệt**; từ chối / đã chi / đã hủy là trạng thái kết thúc — rồi nối vào ba đường ghi
(approve/reject, confirm, cancel). Các con số 0/1/2/4/5 giữ nguyên vì dữ liệu prod đang dùng chúng;
chỉ thay số trần bằng hằng có tên.

**Sau khi sửa: 0/16 lượt bất hợp lệ lọt (tất cả trả 400), 5/5 lượt hợp lệ vẫn chạy.** 12 unit test
giữ bảng luật; test gate lên 83 pass.

## 5. CHƯA sửa — và vì sao không nên sửa vội

**`MedicalRecords.Status` đang mang HAI bộ từ vựng khác nhau trên cùng một cột.**

| Giá trị | Ngoại trú (`MedicalRecordStatus`) | Nội trú (`InpatientCompleteService.Discharge`) |
|---:|---|---|
| 2 | Chờ kết luận | **Đang điều trị** |
| 3 | Hoàn thành | **Đã xuất viện** |

Hai nghĩa này mâu thuẫn ở giá trị 2. Vì vậy **bật `MedicalRecordStatus.CanTransition` lên toàn bộ
đường ghi sẽ phán sai cho luồng nội trú** và có thể chặn đúng nghiệp vụ xuất viện. Đây là vấn đề mô
hình dữ liệu (một cột hai ý nghĩa), phải giải trước bằng cách tách cột hoặc quy ước ánh xạ theo
`TreatmentType`, rồi mới thi hành máy trạng thái. Sửa mù ở đây rủi ro cao hơn hẳn lợi ích, nên chỉ
ghi nhận.

Còn lại chưa đo: chỉ định CLS (lab/CĐHA), phiếu thanh toán và tạm ứng, ký số, hồ sơ BHXH, đơn duyệt
mua sắm/ADR. Script `t3_state_transitions.py` dựng sẵn khuôn (seed → gọi endpoint → đọc lại DB), thêm
thực thể mới chỉ cần khai bảng `LEGAL` + danh sách `ACTIONS`.

## 6. Đua trạng thái — hai người thao tác cùng lúc (gắn #188)

`t3_concurrency.py` bắn N request **đồng thời** (thả cùng lúc bằng barrier) rồi đọc lại DB xem
**tác động thật**, không chỉ đếm HTTP 200. **4/4 đạt:**

| Tình huống | Kết quả |
|---|---|
| 5 phiên cùng cấp phát một đơn 10 viên | **Kho trừ đúng 10** (3334 → 3324). Không trừ hai lần. |
| — mã trả về | 1×200 + **4×409**. |
| Duyệt và từ chối cùng một phiếu hoàn tiền cùng lúc | Kết cục là **một** trạng thái hợp lệ (từ chối). |
| 5 phiên cùng hủy một đơn | Tất cả 200, trạng thái cuối = Hủy (idempotent). |

**Lỗi tìm ra và đã sửa:** khoá lạc quan (`RowVersion` trên `InventoryItems`) **vốn đã chặn đúng** —
lượt chạy đầu cho `[500, 500, 200, 500, 500]`, tức bốn người thua đều bị ngăn ghi. Nhưng
`PharmacyController.CompleteDispensing` bắt `Exception` chung nên `DbUpdateConcurrencyException` bị
nuốt thành **500**: dược sĩ đọc thành "lỗi máy chủ" thay vì biết quầy khác vừa phát xong đơn này.
`DomainExceptionFilter` thực ra ĐÃ map exception đó sang 409 — chỉ là controller tự bắt trước nên
filter không thấy. Nay controller trả **409 `CONCURRENT_UPDATE`** kèm câu tiếng Việt.

Bài học ghi lại: **cơ chế bảo vệ đúng mà báo cáo sai thì vẫn hỏng ở mắt người dùng.**

Lượt chạy đầu của bài này còn suýt kết luận sai "kho không bị trừ" — vì đo mỗi lô vừa nạp, trong khi
FEFO chọn lô hạn gần nhất là lô khác. Phải đo **tổng tồn của cả thuốc** trước/sau.
