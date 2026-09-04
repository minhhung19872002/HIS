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

## 7. Xét nghiệm — chiều thuận không được gác như chiều ngược

Hai hằng số `LabRequestStatus` và `RadiologyRequestStatus` trong `StatusConstants.cs` hoá ra **không
được dùng ở bất kỳ đâu** (grep = 0 lượt). Trạng thái chạy thật là số trần trên
`ServiceRequestDetails.Status`, từ vựng đọc được ở `LISCompleteService.QCHistory.cs`:

| Số | Nghĩa |
|---:|---|
| 0 | Chờ lấy mẫu |
| 1 | Đang thực hiện (đã có mẫu) |
| 2 | Có kết quả (`ReviewedAt != null` ⇒ đã bác sĩ duyệt) |
| 3 | Đã hủy |

Điều đáng chú ý: chiều NGƯỢC đã được gác **rất tốt**. `LabCancelChainService` bắt đúng chuỗi — muốn
hủy kết quả phải hủy duyệt trước, muốn hủy lấy mẫu phải hủy kết quả trước — và cả ba ca đối chứng
dương đều chặn đúng. Nghĩa là ý đồ nghiệp vụ đã rõ ràng và đã được viết ra một lần rồi.

Chiều THUẬN thì không có vế đối xứng. Đo 9 ca (`evidence/cross/t3/t3_lab_transitions.py`):

| Tình huống | Trước | Sau |
|---|---|---|
| Chỉ định **đã hủy** vẫn nhập tay được kết quả | cho qua, HTTP 200 | 400 |
| Chỉ định đã hủy nhận kết quả từ máy | đã chặn sẵn | 400 giữ nguyên |
| **Đè** kết quả đã duyệt bằng nhập tay | cho qua | 400 |
| **Đè** kết quả đã duyệt bằng kết quả máy | cho qua | bỏ qua + báo lý do |

Cái đáng nói nhất là sự **bất đối xứng giữa hai cửa vào**: đường máy phân tích
(`LISCompleteService.Worklist.cs`) vốn đã lọc `Status != 3`, đường nhập tay (`EnterLabResultAsync`)
thì không kiểm gì cả. Cùng một luật, thi hành ở một cửa và bỏ trống ở cửa kia — đúng kiểu lỗi chỉ lộ
ra khi đo cả hai đường chứ không đo một đường.

Hai lượt **đè kết quả đã duyệt** nặng hơn: `ReviewedAt` vẫn còn nguyên sau khi bị đè, nên bệnh án
hiện một con số khác con số bác sĩ đã duyệt mà không để lại dấu vết nào.

**Sửa:** `LabDetailStatus.EnsureCanWriteResult(status, isReviewed)` trong `StatusConstants.cs`, gọi
từ `EnterLabResultAsync`. Đường máy KHÔNG ném lỗi — ném thì giết cả lô kết quả của máy — mà bỏ qua
dòng đó, giữ bản tin thô để người soi lại được, và báo trong `errors` của phản hồi. Đo lại **9/9**.

## 8. Chẩn đoán hình ảnh — sửa được kết luận đã ký số

Đây là lỗi nặng nhất tìm được trong cả đợt T1-T4.

`RadiologyReports.Status`: 0 nháp · 1 sơ duyệt · 2 duyệt chính thức / đã ký số. Hệ thống có sẵn
**hai cửa đi ra**: `CancelApprovalAsync` (hủy duyệt) và `CancelSignedResultAsync` (thu hồi chữ ký,
đánh dấu `RadiologySignatureHistory.Status = 3`). Ý đồ nghiệp vụ không thể rõ hơn.

Nhưng `EnterRadiologyResultAsync` ghi thẳng `Findings`/`Impression`/`Recommendations` mà **không
kiểm gì**. Đo 8 ca (`evidence/cross/t3/t3_radiology_transitions.py`), đi đúng đường thật từ tiếp đón
→ chỉ định CĐHA → điều phối → thực hiện → nhập kết quả:

| Tình huống | Trước | Sau |
|---|---|---|
| Sửa nội dung phiếu **đã duyệt chính thức** | cho qua, Status vẫn = 2 | 400 |
| Sửa nội dung phiếu **đã ký số** | cho qua, **chữ ký vẫn còn hiệu lực** | 400 |
| Lối vòng: ký → hủy duyệt → sửa | cho qua, chữ ký vẫn còn hiệu lực | 400 |

Hệ quả của dòng thứ hai: chữ ký số đang bảo chứng cho một nội dung **khác** nội dung bác sĩ thực sự
ký, và không có gì trong hồ sơ cho thấy điều đó đã xảy ra. Với một phiếu kết quả có giá trị pháp lý
thì đây là lỗi toàn vẹn hồ sơ, không chỉ là lỗi quy trình.

Dòng thứ ba là lý do bản vá **không được gác theo `Status` thôi**: `CancelApprovalAsync` đưa phiếu về
nháp nhưng KHÔNG đụng tới lịch sử chữ ký. Nếu chỉ kiểm `Status` thì còn nguyên lối vòng ký → hủy
duyệt → sửa. Ca này chỉ lộ ra vì đã đọc kỹ `CancelApprovalAsync` rồi mới thêm ca đo — không phải vì
đo mò.

**Sửa:** `RadiologyReportStatus.EnsureCanEditContent(status, hasActiveSignature)`, xét **cả hai**
điều kiện độc lập nhau. Sơ duyệt (trạng thái 1) **cố ý** vẫn cho sửa: đó là bước đọc đầu của kỹ thuật
viên, bác sĩ còn phải hoàn thiện tường trình sau. Đo lại **8/8**, ba đối chứng dương (sửa bản nháp ·
sửa sau khi hủy duyệt · sửa sau khi thu hồi chữ ký) đều vẫn qua nên không chặn nhầm đường hợp lệ.

## 9. Ghi chú quan sát, chưa xử lý

- `CancelApprovalAsync` (hủy duyệt CĐHA) không thu hồi chữ ký. Sau bản vá thì lối vòng đã bị bịt,
  nhưng bản thân việc "phiếu về nháp mà chữ ký vẫn sống" vẫn là trạng thái khó hiểu khi đọc dữ liệu.
  Không tự sửa vì thu hồi chữ ký là hành vi có ý nghĩa pháp lý, phải đi qua đúng cửa của nó.
- Dữ liệu mẫu có dịch vụ `PT-CAT-RUOT-THUA` (phẫu thuật cắt ruột thừa) nằm trong nhóm `CDHA_*`.
  Không ảnh hưởng bài đo nhưng là lỗi phân nhóm danh mục.
- Nhiều chú thích tiếng Việt trong `RISCompleteService.ImagingApproval.cs` bị mojibake hai lần UTF-8
  (`Chá»‰ Ã¡p khi...`), cùng loại với F5 đã sửa cho bảng ICD. Chỉ là chú thích, không đụng chạy.

## 10. Chuyển khoa nội trú — ba lỗi, trong đó một lỗi mất dữ liệu

`InpatientCompleteService.TransferDepartmentAsync`. Đọc mã thấy ba chỗ đáng ngờ, đo 7 ca
(`evidence/cross/t3/t3_transfer_department.py`) thì cả ba đều đúng là lỗi.

**(1) Không kiểm trạng thái lượt nội trú.** `Admissions.Status`: 0 đang điều trị · 1 xuất viện ·
2 chuyển viện · 3 tử vong · 4 bỏ về. Đường chuyển khoa không đọc cột này lần nào, nên một bệnh nhân
**đã xuất viện** vẫn chuyển được sang khoa khác — HTTP 200 — và được **xếp giường** ở đó. Trên bảng
điều hành giường bệnh, một người đã về nhà vẫn đang chiếm giường.

**(2) Không kiểm giường đích còn trống.** Lại đúng cái bất đối xứng hai cửa như vụ xét nghiệm:
đường **chuyển giường** (`TransferBedAsync`) có kiểm và ném đúng câu *"Giường … đã có bệnh nhân,
vui lòng chọn giường khác"*; đường **chuyển khoa** tạo thẳng `BedAssignment` mới. Đo được hai bệnh
nhân cùng giữ một giường.

Cùng một luật, viết ra rồi, thi hành ở một cửa và bỏ trống ở cửa kia. Đây là lần thứ ba trong đợt
này gặp đúng hình dạng đó (xét nghiệm: máy vs nhập tay; CĐHA: chữ ký vs trạng thái; nay: chuyển
giường vs chuyển khoa). Đáng ghi lại như một chỗ cần soi mặc định: **khi thấy một luật, hỏi ngay còn
cửa nào khác vào cùng dữ liệu đó không.**

**(3) Bàn giao lâm sàng bị bỏ rơi — lỗi mất dữ liệu.** `DepartmentTransferDto` mang bốn trường:
`TransferReason`, `DiagnosisOnTransfer`, `TreatmentSummary`, `ReceivingDoctorId`. Grep toàn bộ
`HIS.Infrastructure` thì **không chỗ nào đọc** bốn trường đó, và không có bảng lịch sử chuyển khoa
nào. Đo lại bằng cách dò **22 cột chữ** của `Admissions` + `MedicalRecords`: 0 cột giữ lại chuỗi bàn
giao. Bác sĩ viết tóm tắt điều trị lúc bàn giao xong nó bay mất, mà API vẫn trả 200 kèm một
`AdmissionDto` hợp lệ.

Đây là loại lỗi mà bài đo đường-thuận-suôn-sẻ **không bao giờ** thấy: mọi thứ đều 200, dữ liệu trả
về đều hợp lệ, chỉ có thứ người dùng gõ vào là biến mất.

**Sửa:**
- `AdmissionStatus` (trong `StatusConstants.cs`) + chặn khi lượt đã kết thúc, câu báo lỗi nêu rõ
  đang ở trạng thái nào.
- Kiểm giường đích, dùng **nguyên câu báo lỗi** của `TransferBedAsync` cho nhất quán.
- Bảng `DepartmentTransfers` (migration `168_department_transfer_history.sql`, idempotent) + ghi
  bàn giao **trước** khi đổi khoa (cần khoa/phòng/giường cũ) + cửa đọc
  `GET /api/inpatient/department-transfers/{admissionId}`. Lưu mà không đọc ra được thì vẫn coi như
  mất, nên cửa đọc là phần bắt buộc chứ không phải phần thêm.

Đo lại **7/7**, gồm cả việc đọc ngược bàn giao ra qua cửa mới và kiểm đúng khoa đi/khoa đến.

**Bẫy trong chính bài đo, ghi lại:** lượt đầu em đoán tên cột là `Notes` để tìm chuỗi bàn giao. Cột
đó không tồn tại → `sqlcmd` trả chuỗi *"Invalid column name"* → hàm kiểm đọc chuỗi đó thành "có dữ
liệu" và báo **ĐẠT**. Một bài đo báo xanh vì lý do sai còn tệ hơn không đo. Nay lấy danh sách cột
thật từ `INFORMATION_SCHEMA` và **dừng hẳn** nếu danh sách rỗng, thay vì đo mù. Ca đối chứng cũng
hỏng tương tự vì gọi `change-bed` (route thật là `transfer-bed`) nên ăn 404 rồi bị đọc thành "không
chặn".

## 11. Tiền tạm ứng — một phiếu 1.000.000đ chi ra 2.000.000đ

Lỗi tiền nặng nhất tìm được trong cả đợt.

`Deposits.Status`: 2 đã xác nhận · 3 số dư về 0 · 5 đã hủy. Đo 8 ca
(`evidence/cross/t3/t3_deposit_transitions.py`), ba lỗi:

**(1) Phiếu đã hủy vẫn tiêu được.** Hủy chỉ đặt `Status = 5`, không đụng `RemainingAmount`; còn
`UseDepositForPaymentAsync` chỉ so số dư, không đọc `Status`. Đo: hủy xong vẫn trừ được 100.000đ.

**(2) Phiếu đã hủy vẫn hoàn được.** Đây là ví dụ sạch nhất của hình dạng lỗi lặp lại cả đợt — và
lần này hai vế nằm **trong cùng một hàm, cách nhau mười dòng**:

```csharp
// nhánh phiếu thanh toán — CÓ kiểm
if (originalPayment.Status == 2)
    throw new InvalidOperationException("Phiếu thanh toán gốc đã bị hủy");

// nhánh phiếu tạm ứng — KHÔNG kiểm gì
var availableAmount = originalDeposit.Amount - originalDeposit.UsedAmount;
```

**(3) Hoàn được nhiều lần cùng một phiếu — tiền ra thật.** Số dư khả dụng tính bằng
`Amount - UsedAmount`, mà **đường hoàn tiền không hề tăng `UsedAmount` ở bất kỳ bước nào**, kể cả
`ConfirmRefundAsync` — tức là lúc tiền đã ra khỏi quỹ. Nên lần hoàn thứ hai nhìn thấy số dư y như
lần đầu.

Không dừng bài đo ở bước "lập phiếu hoàn được", mà đi hết chuỗi lập → duyệt → xác nhận chi rồi cộng
tổng tiền thực sự ra khỏi quỹ. Kết quả: **phiếu tạm ứng 1.000.000đ chi ra 2.000.000đ**. Nếu chỉ đo
tới bước lập phiếu thì chỉ thấy "HTTP 200 hơi lạ", không thấy được thiệt hại.

### Vì sao không sửa bằng cách tăng `UsedAmount`

Cách nhanh nhất là cho `ConfirmRefundAsync` cộng vào `UsedAmount`. Nhưng `UsedAmount` mang nghĩa
"đã tiêu cho dịch vụ", và các báo cáo đang đọc nó theo đúng nghĩa đó — nhét tiền hoàn vào sẽ làm
lệch số liệu đã phát ra ngoài.

Nguyên nhân gốc nằm chỗ khác: `CreateRefundDto` nhận `OriginalDepositId`, `RefundDto` trả nó về, mà
**`Receipts` không có cột nào lưu nó**. Phiếu hoàn không truy ngược được về nguồn — chỉ có một câu
ghi chú tiếng Việt, máy không đọc được. Không có liên kết đó thì không cách nào cộng tổng đã hoàn.

**Sửa:** migration `169_receipt_refund_source.sql` thêm `Receipts.OriginalDepositId` +
`OriginalPaymentId` (nullable, idempotent) + chỉ mục; `CreateRefundAsync` lưu nguồn và tính
`availableAmount = Amount − UsedAmount − (tổng đã hoàn chưa bị từ chối/hủy)`. Phiếu hoàn **đang chờ
duyệt** cũng tính vào tổng đó để hai người không lập hai phiếu cho cùng một khoản. Thêm
`DepositStatus.EnsureSpendable` cho cả hai đường tiêu tiền.

Đo lại **8/8**. Câu báo lỗi nay nói rõ phần đã hoàn: *"vượt quá số dư tạm ứng còn lại (300.000đ;
phiếu này đã hoàn 400.000đ)"* — trước chỉ nói số dư, người thu ngân không hiểu vì sao.

**Ghi nhận, chưa sửa:** giá trị `Status = 3` được **đường ghi** đặt khi tiêu hết (chú thích "Đã sử
dụng hết") nhưng **mọi báo cáo** đọc nó là "đã hoàn tiền" (`StatsReversal.cs`, `AdminReports.cs`), và
chú thích trên entity cũng ghi "3-Refunded". Ba nơi hiểu một con số theo hai nghĩa. Không tự sửa vì
đổi phía nào cũng làm đổi số liệu báo cáo đã phát ra ngoài — cần người dùng quyết.

## 12. Gửi hồ sơ BHXH — đường duy nhất có hậu quả ra ngoài bệnh viện

Mọi lỗi ở các mục trên đều nằm trong bệnh viện. Mục này thì không: dữ liệu chi phí khám chữa bệnh
được truyền lên cổng của cơ quan bảo hiểm xã hội. Gửi trùng một đợt là nộp trùng hồ sơ thật.

Hai bảng trạng thái, và **chúng không nối với nhau**:

| Bảng | Từ vựng |
|---|---|
| `InsuranceXmlBatches.Status` | 0 đã xuất · 1 đã ký số · 2 đã gửi BHXH · 3 bị từ chối |
| `InsuranceClaims.ClaimStatus` | 0 chờ · 1 khóa · 2 đã duyệt · 3/4 từ chối · 5 đã thanh toán |

Đo 10 ca (`evidence/cross/t3/t3_bhxh_transitions.py`), sáu lỗi:

**(1) Gửi lại được một đợt ĐÃ GỬI.** `SubmitToInsurancePortalAsync` có ba lớp kiểm — đợt tồn tại,
thư mục còn, có file xml — nhưng không đọc `Status` lần nào. Bấm gửi hai lần là hồ sơ đi lên cơ quan
bảo hiểm hai lần.

**(2) Ký lại được một đợt ĐÃ GỬI**, và việc ký đặt `Status = 1` đè lên `2`, tức lặng lẽ xoá dấu vết
rằng đợt đó đã được truyền đi.

**(3)–(5) Sửa được nội dung hồ sơ đã khóa, đã duyệt, và ĐÃ THANH TOÁN.** `UpdateInsuranceClaimAsync`
chỉ kiểm `claim == null`. Hồ sơ quyết toán đã chốt mà chẩn đoán vẫn đổi được.

**(6) Xoá được hồ sơ ĐÃ THANH TOÁN.** `DeleteInsuranceClaimAsync` cũng chỉ kiểm `claim == null` —
và còn không lọc `!IsDeleted`.

**Sửa:** `InsuranceXmlBatchStatus` + `InsuranceClaimStatus` trong `StatusConstants.cs`; guard đặt
**ngay sau khi tìm thấy bản ghi**, trước mọi việc khác. Vị trí này quan trọng: nếu đặt guard ký-lại
sau khâu đọc chứng thư thì người dùng nhận được một lỗi mật mã khó hiểu thay vì câu "đợt đã gửi rồi"
— chính lượt đo đầu đã lộ ra điều đó (thông báo là *"Không đọc được chứng thư số"*).

Hai chỗ **cố ý vẫn cho qua**, vì siết là hỏng quy trình thật: hồ sơ **bị từ chối** vẫn sửa được (đó
chính là luồng sửa-rồi-nộp-lại), và hồ sơ **bị từ chối vẫn không xoá được** — cặp này rất dễ gộp
nhầm thành một luật nên đã neo bằng test riêng.

Đo lại **10/10**.

### Ghi nhận, cố ý CHƯA sửa

- **Gửi đợt CHƯA KÝ SỐ vẫn qua.** Bắt buộc ký số trước khi gửi có thể làm tê liệt hoàn toàn một cơ
  sở chưa cấu hình chữ ký số. Đây là câu hỏi nghiệp vụ/pháp lý, không phải câu hỏi kỹ thuật — cần
  người dùng quyết. Bài đo giữ ca này ở dạng **quan sát**, luôn báo ĐẠT, phần chữ mới là thứ đáng đọc.
- **`ClaimStatus` và `InsuranceXmlBatches.Status` không nối nhau.** Khóa một hồ sơ không đụng tới đợt
  nào; gửi một đợt không cập nhật `ClaimStatus` của các hồ sơ trong đó. Hai cờ "đã nộp chưa" có thể
  nói khác nhau và khác cả với thứ cơ quan bảo hiểm thực sự nhận được. Sửa việc này là thiết kế lại
  liên kết giữa hai bảng, vượt phạm vi một bản vá guard.
- Chuỗi khóa/mở khóa và `ProcessRejectedClaimAsync` vẫn chưa có luật chuyển trạng thái (mở khóa được
  cả hồ sơ đã thanh toán). Mở khóa chỉ Admin/Manager và có ghi lý do, nên coi là quyền can thiệp
  hành chính có chủ đích; ghi lại để quyết sau.

### Bẫy trong chính bài đo, ghi lại

Lượt đầu kết luận "gửi lại đã bị chặn" — **sai**. Cổng BHXH ở máy này chạy chế độ giả lập
(`BhxhGateway:UseMock=true`), nên lượt gửi thứ hai vẫn trả "thành công" và **ghi lại `Status = 2`
y như cũ**. Bài đo đọc đúng con số đó rồi báo ĐẠT GIẢ. Chỉ khi chuyển sang so `SubmitTransactionId`
và `SubmittedAt` trước/sau mới thấy dấu gửi cũ bị ghi đè, tức hệ thống đã thực sự đi ra cổng lần nữa.

Bài học: **đo trạng thái cuối là không đủ khi trạng thái cuối của "chặn" và của "làm lại rồi ghi đè"
trùng nhau.** Phải tìm một dấu vết chỉ thay đổi khi hành động thật sự xảy ra.

## 13. Ca mổ — mười lỗi, trong đó tám lỗi làm mất tường trình phẫu thuật

Đo 13 ca (`evidence/cross/t3/t3_surgery_transitions.py`). Trước khi sửa: **3/13**.

### Nhóm A — không có luật trạng thái (4 lỗi)

| Tình huống | Trước | Sau |
|---|---|---|
| Bắt đầu một ca mổ **đã hủy** | cho qua, trạng thái nhảy từ 4 về 2 | 400 |
| Bắt đầu **lần thứ hai** | cho qua, **đẻ thêm biên bản mổ thứ hai** cho cùng một ca | 400, vẫn 1 biên bản |
| Kết thúc một ca **chưa từng bắt đầu** | 200, **toàn bộ tường trình rơi mất** | 400 kèm hướng dẫn |
| Bắt đầu với `surgeryId` không tồn tại | **200 kèm DTO rỗng** (thành công giả) | 400 |

Ca thứ ba là nặng nhất về mặt hồ sơ. Biên bản mổ **chỉ** được tạo ở bước bắt đầu, mà chẩn đoán sau
mổ, mô tả quá trình và tai biến lại ghi vào biên bản đó qua một `if (record != null)`. Không có biên
bản thì mọi thứ bác sĩ vừa gõ biến mất, còn màn hình báo lưu xong.

Ca thứ tư đáng chú ý vì lý do khác: chú thích ngay trong file ghi rõ đợt 2026-06-12 đã bỏ kiểu
"thành công giả" này — **nhưng chỉ sửa ở `CompleteSurgeryAsync`, còn hàm anh em ngay bên trên thì
bỏ sót**. Lại đúng hình dạng cũ, lần này giữa hai hàm nằm sát nhau trong cùng một file.

### Nhóm B — tám endpoint GHI là hàm rỗng (6 lỗi đo được)

`SurgeryOperationServiceImpl.Execution.cs` có **tám** hàm chỉ đọc lại ca mổ rồi trả về, **không ghi
gì cả**, trong khi controller trả 200 kèm một DTO hợp lệ:

| Endpoint | Trạng thái cũ | Nay |
|---|---|---|
| `PUT {id}/execution` | rỗng | ghi thật (chẩn đoán trước/sau mổ, mô tả, kết luận, tai biến, phương pháp, thời gian) |
| `PUT {id}/pre-diagnosis` | rỗng | ghi thật |
| `PUT {id}/post-diagnosis` | rỗng | ghi thật |
| `PUT {id}/team` | rỗng | ghi thật (đặt lại ekip) |
| đổi thành viên ekip | rỗng | ghi thật, đóng `LeftAt` người cũ + mở `JoinedAt` người mới |
| `UpdateDescription` / `UpdateConclusion` (chưa nối route) | rỗng | ghi thật |
| `PUT {id}/tt50-info` | rỗng | **báo lỗi rõ ràng** — xem bên dưới |

Đây là cùng loại với vụ bàn giao chuyển khoa, nhưng ở quy mô tám endpoint và trên **tường trình phẫu
thuật**. Bác sĩ sửa chẩn đoán sau mổ, màn hình báo xong, không có chữ nào được lưu.

### Kết luận ca mổ rơi ngay trên đường thuận

`CompleteSurgeryDto` và `SurgeryExecutionDto` đều có trường `Conclusion`, giao diện đều gửi lên,
nhưng `SurgeryRecords` **không có cột nào tên như vậy** và `CompleteSurgeryAsync` cũng không ánh xạ
nó đi đâu. Không cần tình huống lạ nào: mổ xong, ghi kết luận, kết luận biến mất. Migration `170`
thêm `Conclusion` + `SecondaryIcdCodes`.

### TT50: cố ý báo lỗi thay vì tiếp tục nói dối

Khai báo TT50 **chưa cài đặt**, và em không tự cài vì hai chỗ phải người dùng chốt — đoán là hỏng hồ
sơ pháp lý:

- **Bộ số vai trò**: `SurgeryTeamMember.Role` là một cột chung, trong khi DTO đang có bộ số **riêng**
  cho điều dưỡng (1 dụng cụ, 2 chạy ngoài, 3 phụ mê). Không biết phẫu thuật viên chính / phụ 1 /
  phụ 2 / gây mê / phụ mê mang số nào.
- **Chứng chỉ hành nghề** của phẫu thuật viên và `AnesthesiaNotes` chưa có cột nào để lưu.

Nên hàm này nay **ném lỗi 400 kèm câu giải thích** thay vì trả 200 rỗng. Với một biểu mẫu có giá trị
pháp lý, để bác sĩ tin là đã khai trong khi không có gì được lưu là tệ hơn hẳn một thông báo lỗi.

Đo lại **13/13**.

### Một ca đo phải đổi kỳ vọng — ghi lại

Ban đầu ca "cập nhật ekip mổ" kỳ vọng hệ thống **phải báo lỗi** (vì lúc đó nó là hàm rỗng). Sau khi
cài đặt thật thì trả 200 mới là đúng, nên kỳ vọng cũ hoá sai. Đã đổi ca đo sang điều mạnh hơn: đọc
thẳng DB xem ekip **có được lưu thật không**. Đổi kỳ vọng theo sản phẩm là hợp lệ khi sản phẩm đã
được sửa đúng hướng — điều không được phép là đổi kỳ vọng để né một lỗi chưa sửa.

## 14. Ngân hàng máu — truyền được sai nhóm, và ba lỗi hạ tầng

Đây là chỗ rủi ro cao nhất trong cả đợt. Truyền nhầm nhóm hồng cầu gây tan máu cấp, có thể tử vong,
và không đảo ngược được.

Toàn bộ module này viết bằng **SQL trần** (`ExecuteSqlRawAsync` / `GetDbConnection`), không qua EF
entity. Đo 12 ca (`evidence/cross/t3/t3_blood_transitions.py`). Trước khi sửa: **2/8**.

### Sáu lỗ hổng an toàn truyền máu

| Tình huống | Trước | Sau |
|---|---|---|
| Gán túi **B+** cho người bệnh **A+** | cho qua | 400 kèm câu nêu rõ hai nhóm máu |
| Gán túi **Rh+** cho người bệnh **Rh−** | cho qua | 400 |
| Gán túi **đã hết hạn** | cho qua | 400 kèm ngày hết hạn |
| Gán lại túi **đã truyền** cho người khác | cho qua | 400 |
| "Bắt đầu truyền" một túi **chưa hề được gán** | cho qua, túi nhảy sang `Transfusing` | 400 |
| Truyền túi có **phản ứng chéo ghi KHÔNG PHÙ HỢP** | cho qua | 400 |
| Xuất máu theo phiếu lĩnh **chưa duyệt** / **đã từ chối** | cho qua | 400 |
| Xuất lại chính túi vừa xuất | cho qua | 400 |

Không nơi nào trong hệ thống đối chiếu ABO/Rh — máy chủ không tính, và giao diện chỉ có một ô chọn
"Phù hợp / Không phù hợp" do người dùng **tự chọn** (`BloodBank.tsx`). Trong khi đó `BloodOrders` đã
có sẵn `PatientBloodType` và `PatientRhFactor`: dữ liệu để đối chiếu vốn nằm ngay trên phiếu chỉ định.

Câu `UPDATE BloodBags SET Status='Transfusing'` trong `StartTransfusionAsync` chạy **bất kể** câu
cập nhật `BloodBagAssignments` phía trên có khớp dòng nào không — nên chỉ cần một `orderItemId` hợp
lệ và một `bloodBagId` bất kỳ là "bắt đầu truyền" được một túi chưa gán cho ai.

### Phạm vi của luật tương thích — cố ý hẹp

`BloodCompatibility` chỉ kết luận cho **khối hồng cầu (RBC)** và **máu toàn phần (WB)**, nơi luật ABO
là luật cứng. Huyết tương (FFP), tiểu cầu (PLT), tủa lạnh (CRYO) có luật **khác** — huyết tương gần
như ngược lại — nên lớp này trả "không kết luận" cho chúng. Thà không chặn còn hơn chặn sai một chỉ
định đúng.

Máu toàn phần siết chặt hơn khối hồng cầu: WB phải **đúng nhóm** vì mang theo cả huyết tương người
cho, trong khi RBC nhóm O truyền được cho mọi nhóm.

**Không biết thì không chặn.** Nhóm máu người bệnh hoặc của túi mà trống thì không kết luận. Trong
cấp cứu chảy máu ồ ạt, nhóm máu thường chưa có kết quả và vẫn phải truyền được máu O — chặn ở đó là
gây hại chứ không phải ngăn hại. Đã neo bằng một ca đối chứng ngược trong bài đo.

Tương tự, **không bắt buộc phải có kết quả phản ứng chéo** mới cho truyền: chỉ chặn khi đã có kết
luận *không hợp*. Bắt buộc sẽ chặn đường phát máu khẩn.

### Ba lỗi hạ tầng lộ ra trong lúc đo

**(1) `using` trên kết nối của EF — 24 chỗ.** `using var connection = _context.Database.GetDbConnection();`
**Dispose kết nối do DbContext sở hữu**, nên lệnh kế tiếp trên cùng context ném *"The ConnectionString
property has not been initialized"*. Gặp thật khi tạo phiếu chỉ định máu: hàm tra tên chế phẩm đóng
kết nối, câu INSERT ngay sau đó hỏng. Đã sửa cả 24 chỗ sang lấy kết nối không `using` + mở theo trạng
thái.

**(2) Guard ra HTTP 500.** `BloodBankCompleteController` không gắn `DomainExceptionFilter`, nên mọi
guard an toàn truyền máu vừa thêm đều trả 500. Điều dưỡng đọc 500 thành "lỗi máy chủ" rồi thử lại,
thay vì hiểu "không được truyền túi này" — đúng bài học *cơ chế đúng mà báo sai thì vẫn hỏng ở mắt
người dùng*. Đã gắn filter; bài đo nay **bắt buộc mã 400**, chặn được mà trả 500 vẫn tính là trượt.

**(3) `DBNull` trong `ExecuteSqlRawAsync` — tạo phiếu lĩnh máu hỏng 100%.** EF Core không ánh xạ
được kiểu `DBNull`; `CreateIssueRequestAsync` truyền `DBNull.Value` cho `PatientCode`/`PatientName`
**luôn luôn**, nên chức năng này chưa bao giờ chạy được. Đã sửa bằng `SqlParameter` có tên.

### Lỗi `DBNull` — đo lại thì bức tranh khác hẳn điều em viết ban đầu

Ban đầu em ghi ở đây là "còn 48 chỗ, chỉ hỏng khi giá trị rỗng, cần một lượt riêng". Đã dựng bài đo
(`evidence/cross/t3/t3_blood_null_fields.py`) và **kết luận đó nói quá**. Sự thật:

- **43 chỗ dạng `x ?? DBNull.Value`** chỉ nổ khi `x` thật sự null. Nhưng DTO của module này khai
  chuỗi là **không-nullable**, và `[ApiController]` bắt buộc trường không-nullable phải có giá trị —
  gửi thiếu là bị chặn ở tầng kiểm tra dữ liệu với 400 **trước khi** chạm tới câu SQL. Qua API,
  phần lớn không tới được.
- **Trừ một loại: kiểu giá trị nullable.** `DateTime?`, `decimal?` KHÔNG bị bắt buộc, nên nhánh null
  của chúng tới được thật. Bỏ trống `LicenseExpiryDate` là **thêm nhà cung cấp hỏng ngay** — đo được.
- **4 chỗ bắn `DBNull` vô điều kiện** thì nổ 100%: `CreateIssueRequestAsync` (PatientCode/PatientName)
  và `CreateImportReceiptAsync` (DonorName · Temperature · Note). Nghĩa là **tạo phiếu lĩnh máu** và
  **tạo phiếu nhập máu** chưa bao giờ chạy được — hai chức năng chết, không phải hai quả mìn.

Đã sửa cả bốn chỗ vô điều kiện + toàn bộ danh mục (chế phẩm · nhà cung cấp) bằng `SqlParameter` có
tên. Bài đo nay gọi **17 đường ghi** của module máu bằng payload đầy đủ, cộng một lượt bỏ trống các
trường kiểu giá trị nullable: **17/17**. Còn 19 chỗ `?? DBNull` chưa đổi, nhưng cả 17 đường ghi đều
đã chạy qua chúng nên không còn là ẩn số.

**Cách nói đúng của phát hiện này**: không phải "48 quả mìn", mà là "hai chức năng chết + một loại
trường (nullable value type) thật sự nguy hiểm". Đếm số dòng khớp `grep` không phải là đếm rủi ro;
phải hỏi thêm *đường nào thực sự tới được chỗ đó*.

### Bảng thiếu script tạo — đã xử lý

`BloodBagAssignments`, `BloodIssueReceipts`, `BloodIssueItems` không có script tạo bảng nào trong
repo; chúng tồn tại ở máy dev và prod do tạo tay. Migration `171_blood_bank_missing_tables.sql` chép
đúng hình dạng đang chạy, có kiểm chứng: chạy trên một cơ sở dữ liệu trắng rồi so từng cột (tên ·
kiểu · độ dài · precision · scale · nullable) với DB thật — khớp cả ba bảng; chạy lần hai là no-op.

## 15. Xuất kho ngoại trú — phát một đơn hai lần, trừ kho hai lần

Lần thứ **năm** trong đợt này gặp cùng một hình dạng. Hai hàm phát thuốc gần như song sinh, lệch nhau
đúng một mệnh đề:

```csharp
// nội trú  — có lọc
foreach (var detail in prescription.Details.Where(d => d.Status == 0))
// ngoại trú — không lọc
foreach (var detail in prescription.Details)
```

Bên nội trú bỏ qua những dòng đã phát nên gọi lại là vô hại; bên ngoại trú chạy lại toàn bộ vòng FEFO.
`Prescriptions.IsDispensed` có được **đặt** nhưng không chỗ nào **đọc** nó làm điều kiện — nó chỉ dùng
để lọc danh sách chờ phát trên màn hình, tức giấu đơn khỏi worklist chứ không chặn một lời gọi thẳng
theo id.

Đo (`evidence/cross/t3/t3_stockout_double_dispense.py`), tổng tồn của thuốc trong kho:

| Cửa vào | Lần 1 | Lần 2 | Kết luận |
|---|---|---|---|
| `/api/warehouse/issues/dispense-outpatient/{id}` | 172 → 166 | **166 → 160** | trừ kho hai lần |
| `/api/pharmacy/prescriptions/{id}/dispense` | 160 → 154 | 154 → 154 | đã chặn sẵn |

Cửa dược chặn đúng — đó là đối chứng dương cho thấy luật này đã tồn tại ở một cửa.

**Sửa:** thêm `.Where(d => d.Status == 0)` cho khớp hàm anh em, và chặn ngay từ đầu nếu không còn
dòng nào chưa phát — nếu chỉ lọc vòng lặp thì lần gọi thứ hai sẽ tạo một phiếu xuất **rỗng** rồi trả
200, tức lại một kiểu thành công giả. Đo lại **5/5**.

Chú thích ngay tại chỗ còn ghi một lần lệch **ngược lại** trước đây (nội trú thiếu bộ lọc lô khoá mà
ngoại trú đã có, sửa ở NangCap26 V.31). Cặp hàm này đã trôi khỏi nhau theo cả hai chiều, ở hai thời
điểm khác nhau — đây là loại chỗ nên có một bài đo chạy thường xuyên chứ không chỉ sửa một lần.

### Bẫy trong chính bài đo — lặp lại đúng cái bẫy đã ghi ở §11

Lượt đầu đo tồn kho theo **riêng lô vừa nạp**, thấy tồn không đổi, và suýt kết luận "hệ thống đã
chặn". Nhưng FEFO chọn lô có hạn gần nhất, thường không phải lô mình vừa nạp. Đúng cái bẫy đã gặp và
đã ghi lại ở bài đo luồng ngoại trú — vậy mà vẫn dẫm lại. Phải đo **tổng tồn của thuốc trong kho**.

Ghi lại lần hai vì rõ ràng ghi một lần là chưa đủ: khi đo tác động của một thao tác lên kho, đơn vị
đo phải là **toàn bộ phần dữ liệu thao tác đó có thể chạm tới**, không phải phần mình vừa dựng.

## 16. Hai migration hỏng âm thầm ở mọi lần khởi động

Phát hiện từ log khởi động chứ không phải từ đi tìm. Bộ chạy migration ghi warning rồi đi tiếp, nên
cả hai đã hỏng lặng lẽ rất lâu — và cả hai đều để lại **hậu quả thật**, không chỉ là dòng log bẩn.

### `143` — tìm bệnh nhân không dấu mới xong một phần ba

Script 143 đổi collation ba cột tìm kiếm của `Patients` sang `Latin1_General_CI_AI` để lễ tân gõ
không dấu vẫn ra kết quả. Con trỏ của nó đổi `FullName` xong thì **chết ở cột có index** và hai cột
còn lại không bao giờ được đổi:

| Cột | Trước | |
|---|---|---|
| `FullName` | `Latin1_General_CI_AI` | ✔ đã đổi |
| `PhoneNumber` | `Vietnamese_CI_AS` | ✗ |
| `IdentityNumber` | `Vietnamese_CI_AS` | ✗ — `IX_Patients_IdentityNumber` chặn `ALTER` |

Chính header của 143 đã lường trước tình huống này (*"nếu env nào đó có index chặn ALTER … → xử lý
tay"*) nhưng chưa ai xử lý. Migration `172` bỏ index → `ALTER` → tạo lại index. Cả hai index đều
nonclustered, không unique, một cột nên tạo lại là khôi phục y nguyên. Đo lại: cả ba cột đúng
collation, cả năm index của `Patients` còn đủ.

### `150` — nhật ký kiểm toán chưa bao giờ được bảo vệ

Nặng hơn nhiều. Script 150 (AUTHZ-5 / #371) tạo hai trigger chặn `UPDATE`/`DELETE` trên `AuditLogs`
theo yêu cầu bất biến của TT 54/2017 và NĐ 13/2023. Đo trước khi sửa: **0 trigger trên `AuditLogs`**
— nhật ký kiểm toán sửa và xoá được thoải mái, suốt từ lúc script được thêm vào.

Nguyên nhân là một lỗi cú pháp hai tầng, và tầng thứ hai chỉ lộ ra sau khi sửa tầng thứ nhất:

1. `RAISERROR(N'câu một ' N'câu hai', 16, 1)` — nối hai chuỗi liền nhau là cú pháp của C/Python,
   **T-SQL không có**.
2. Thêm dấu `+` vào vẫn hỏng: `RAISERROR` **không nhận biểu thức**, chỉ nhận chuỗi hằng hoặc biến.
   Vẫn lỗi 102, lần này là *"Incorrect syntax near '+'"*.

Phải gom câu vào một biến rồi mới `RAISERROR(@msg, 16, 1)`.

Bài đo (`evidence/cross/t3/t3_auditlog_append_only.py`) cố ý **không hỏi "trigger có tồn tại
không"** mà hỏi "dữ liệu có bị sửa được không": ghi một dòng audit thật, thử sửa, thử xoá, rồi đọc
lại. Kết quả sau khi sửa — **5/5**:

- sửa: `Action` vẫn là giá trị gốc, không thành `DA-BI-SUA`
- xoá: dòng vẫn còn
- xoá có cờ `CONTEXT_INFO = 'RETE'` (job retention được phép): dòng mới mất — đúng thiết kế

Sau bản vá, đây là lần khởi động **đầu tiên không batch migration nào hỏng**.

### Bài học

Một bộ chạy migration "log warning rồi đi tiếp" là lựa chọn đúng để không chặn khởi động, nhưng nó
biến lỗi thành thứ vô hình. Hai script này hỏng ở **mọi lần khởi động** và không ai thấy, trong khi
hậu quả là một chức năng chạy dở và một lớp bảo vệ pháp lý không tồn tại. Đáng có một điều kiểm coi
"số batch migration hỏng > 0" là bất thường cần xử lý, thay vì để nó nằm im trong log.

### Bật trigger xong mới lộ ra job dọn nhật ký sẽ hỏng

Sửa xong migration 150 thì phải hỏi tiếp: **có đường nào đang xoá `AuditLogs` mà nay sẽ bị chặn
không?** Có hai — `AuditRetentionWorker` và `AuditArchiveWorker`. Cả hai đã được viết sẵn theo hợp
đồng của trigger (`SET CONTEXT_INFO 0x52455445` trước khi xoá), nên thoạt nhìn là an toàn.

Nhưng `CONTEXT_INFO` sống theo **phiên kết nối**, còn hai worker gọi `SET` và `DELETE` bằng **hai
lệnh rời nhau** trên cùng `DbContext`. Ngoài transaction, EF mở kết nối cho từng lệnh rồi đóng ngay,
và kết nối trả về pool bị `sp_reset_connection` xoá sạch context.

Đo trực tiếp:

| Cách chạy | Kết quả |
|---|---|
| `SET` và `DELETE` ở **hai kết nối** | dòng audit **vẫn còn** → bị trigger chặn |
| `SET` và `DELETE` trong **cùng một phiên** | xoá được |

Chú thích sẵn có trong `AuditArchiveWorker` cho thấy tác giả đã ngờ tới chuyện này ("dùng GUID
literal … tránh kết nối khác nhau giữa SET CONTEXT_INFO và DELETE") — nhưng bỏ tham số hoá không
ngăn được việc đổi kết nối, chỉ **mở kết nối tường minh** mới ngăn được.

**Sửa:** `OpenConnectionAsync` / `CloseConnectionAsync` bao quanh cả cụm ở cả hai worker, giữ nguyên
cấu trúc và giá trị trả về.

**Kiểm chứng đầu-cuối, không chỉ suy luận:** dựng một dòng audit `Timestamp` 1200 ngày trước với
`Action = 'Login'`, khởi động máy chủ, đợi worker chạy (nó trễ 10 phút sau khởi động). Sau ~9 phút:

```
AuditRetention: -1 audit entry (auth<2024-09-04, access<2025-03-05)
```

Dòng cũ biến mất, đúng một dòng, và không có lỗi nào trong log.

> **Ghi nhận thứ tự triển khai:** commit bật trigger (`59de5c9f`) lên prod **trước** bản vá worker
> này. Trong khoảng giữa hai lần deploy, chu kỳ dọn nhật ký trên prod sẽ báo lỗi một lần và không
> xoá gì. Không mất dữ liệu, không gián đoạn dịch vụ — chỉ là bỏ lỡ một chu kỳ prune trên cửa sổ lưu
> 730 ngày. Lẽ ra nên gộp hai thay đổi vào một commit.

## 17. Bịt cái cơ chế đã giấu hai lỗi trên

Hai migration hỏng ở §16 không phải là hai sự cố riêng lẻ — chúng là **triệu chứng của một cơ chế**.
`ProductionSchemaRepairRunner` cố ý nuốt lỗi từng batch để một script hỏng không chặn khởi động máy
chủ. Lựa chọn đó đúng. Nhưng lỗi chỉ để lại một dòng `LogWarning`, chìm giữa hàng trăm dòng cảnh báo
nullable của EF, nên nó **vô hình**. Hai script hỏng ở mọi lần khởi động suốt thời gian dài, và chỉ
lộ ra vì tình cờ có người đọc log.

Hậu quả không hề nhỏ: tìm bệnh nhân không dấu chỉ chạy trên cột họ tên, và nhật ký kiểm toán không
có lớp chống sửa/xoá mà TT 54/2017 yêu cầu. Sửa hai script là cần, nhưng chưa đủ — lần sau lại có
script hỏng thì vẫn không ai biết.

**Ba thay đổi:**

1. Bộ chạy **ghi lại** mọi batch hỏng của lần khởi động gần nhất (tên script · thông báo lỗi · 200
   ký tự đầu), gồm cả hai chỗ nuốt lỗi khác của pha model-driven mà trước đây cũng chỉ có log.
2. Nâng từ `LogWarning` lên **`LogError`** — một migration hỏng là chuyện phải xử lý, không phải
   chuyện đáng lưu ý.
3. Cửa đọc **`GET /health/migrations`** (Admin), trả `failedCount` + danh sách. Đặt cạnh
   `/health/schema-drift` vốn đã dùng cho việc xác minh sau deploy.

**Kiểm chứng cả hai chiều**, không chỉ đường suôn sẻ: thêm một script cố tình sai
(`SELECT * FROM dbo.BangKhongHeTonTai`), khởi động lại, endpoint trả

```
failedCount = 1
  999_TEMP_broken_probe.sql | Invalid object name 'dbo.BangKhongHeTonTai_T3PROBE'.
```

gỡ script đó ra, khởi động lại, về `failedCount = 0`. Nếu chỉ đo chiều "0 lỗi thì báo 0" thì một
endpoint luôn trả 0 cũng qua được — đúng kiểu khẳng định yếu mà cả đợt này đang tránh.

**Bước hai — gắn cổng, sau khi đã đọc được con số thật.** Endpoint lên prod, đọc ra
`failedCount = 0` (tức hai bản vá ở §16 đã ăn trên prod chứ không chỉ ở máy dev), lúc đó mới thêm
bước smoke `Smoke test (không có migration nào hỏng)` vào `.github/workflows/deploy-backend.yml`:
đăng nhập, gọi `/health/migrations`, và **bắt CI đỏ** nếu `failedCount > 0`, in luôn danh sách script
hỏng vào log của workflow.

Cố ý làm hai bước chứ không một: thêm một cổng chặn khi chưa nhìn được phía sau nó có gì là tự chặn
đường triển khai của chính mình. Trước khi đẩy, đã chạy thử **đúng chuỗi lệnh của bước đó** với prod
để không đẩy một cổng chưa từng chạy.

---

## 18. Cổng thanh toán — hai cổng không đếm tiền, một cổng khớp nhầm đơn

Ba cổng (VNPay · MoMo · ZaloPay) cùng nhận callback từ máy chủ nhà cung cấp, cùng ghi
`PaymentTransactions` rồi gọi `LinkReceiptAsync` lập phiếu thu. Đây là **lần thứ sáu** trong đợt này
gặp đúng một hình dạng: *một luật, thi hành ở một cửa, bỏ trống ở cửa bên cạnh*. VNPay được làm rất
chuẩn — kiểm chữ ký, chặn gọi trùng, **và đối chiếu số tiền**. Hai cổng còn lại kiểm chữ ký, chặn gọi
trùng, rồi thôi.

### a. MoMo và ZaloPay chưa từng đọc trường `amount`

`LinkReceiptAsync` lập phiếu thu với `Amount = txn.Amount` — tức **số tiền trên đơn của mình**, không
phải số tiền cổng báo là đã trả. Nên nếu callback báo trả ít hơn mà hệ thống vẫn nhận, sổ quỹ được ghi
**đủ số của đơn**. Đo trước khi sửa, với chữ ký tự tính nên đi đúng đường thật:

| Cổng | Đơn | Callback khai đã trả | Kết quả |
|---|---|---|---|
| VNPay | 1.000.000đ | 1.000đ | chặn — `rspCode 04 Amount mismatch` |
| MoMo | 1.000.000đ | 1.000đ | **nhận · phiếu thu +1.000.000đ** |
| ZaloPay | 1.000.000đ | 1.000đ | **nhận · phiếu thu +1.000.000đ** |

Nghĩa là bệnh viện ghi nhận đã thu đủ 1.000.000đ trong khi thực nhận 1.000đ. Vá bằng đúng bước VNPay
đang làm, đặt ngay sau khâu kiểm chữ ký. Khác VNPay ở một điểm phải để ý: **VNPay gửi số tiền nhân
100, MoMo và ZaloPay gửi VND thẳng** — chép nguyên công thức của VNPay sang là sai 100 lần.

### b. ZaloPay khớp giao dịch bằng đuôi 6 ký tự, bỏ hẳn phần ngày

ZaloPay bắt buộc `app_trans_id` có dạng `yyMMdd_xxxxxx`, nên mã gửi đi được ghép từ ngày cộng **6 ký
tự cuối** của `TxnRef`. Nhưng callback về thì tra ngược bằng:

```csharp
_db.PaymentTransactions.FirstOrDefaultAsync(t => t.TxnRef.EndsWith(suffix))
```

Phần ngày bị bỏ hoàn toàn. Mà `TxnRef` = `HIS` + `yyyyMMddHHmmss` + 4 số ngẫu nhiên, nên 6 ký tự cuối
chỉ là **giây + số ngẫu nhiên**: 60 × 9.000 = 540.000 tổ hợp để phân biệt mọi giao dịch từ trước tới
nay, và `FirstOrDefault` không có `ORDER BY` nào bảo đảm chọn cái nào.

Cách đo đầu tiên dựng **cả hai** giao dịch (một cũ, một mới) rồi xem cái nào được xác nhận. Nó chọn
đúng cái mới — nhưng đó là **may**, không phải bảo đảm, nên phép đo đó không chứng minh được gì. Đo
lại bằng cách chỉ dựng **duy nhất một giao dịch 8 tháng tuổi** rồi gửi callback mang ngày **hôm nay**,
trùng đuôi. Hệ thống xác nhận giao dịch tháng 1 đó — chứng minh dứt khoát rằng ngày không được dùng.

Vá: thêm cột `PaymentTransactions.ProviderOrderRef` (migration 173) lưu **nguyên văn mã đơn đã gửi**,
callback khớp tuyệt đối theo cột đó.

**Đường lùi cho đơn đang dở.** Các đơn tạo trước bản vá chưa có `ProviderOrderRef`; nếu bỏ hẳn lối cũ
thì mọi đơn đang chờ trả tiền lúc triển khai sẽ mất callback. Nên giữ lối khớp đuôi làm đường lùi,
nhưng siết đúng ba chỗ từng hở: chỉ nhận đơn **còn chờ**, **tạo trong 24 giờ qua**, và phải là **kết
quả duy nhất** — hai đơn trùng đuôi thì từ chối, vì ghi nhầm đơn tệ hơn là bắt gọi lại.

### c. Bốn ca "phải chặn" chưa đủ để tin bản vá

Cả bốn ca trên đều có dạng *hệ thống phải từ chối*, nên một bản vá chặn sạch mọi callback cũng đạt
4/4 — tức bản đo không phân biệt được "vá đúng" với "làm hỏng đường thu tiền". Thêm hai **đối chứng
âm**: callback đúng mã đơn, đúng số tiền, cho cả ZaloPay và MoMo, bắt buộc phải được ghi nhận **và**
phải lập phiếu thu đúng 300.000đ. `docs/architecture/evidence/cross/t3/t3_payment_gateway.py`:
**6/6**, trong đó ZaloPay hợp lệ ghi phiếu thu đúng 300.000đ.

---

## 19. Lịch hẹn khám — luật chỉ tồn tại trong trình duyệt

Module đặt lịch có năm trạng thái: 0 Chờ xác nhận · 1 Đã xác nhận · 2 Đã đến khám · 3 Không đến ·
4 Đã hủy. Phần lớn được canh cẩn thận:

* `CancelBookingAsync` (hủy tại quầy) chặn hủy lịch đã check-in và lịch đã kết thúc;
* `CancelAppointmentAsync` (bệnh nhân tự hủy) xác thực số điện thoại rồi chặn `Status >= 2`;
* `UpdateBookingAsync` (đổi lịch) chặn `Status >= 2`, chặn ngày quá khứ, chặn trùng lịch trong ngày;
* `CheckinFromBookingAsync` (tiếp đón lập hồ sơ) chặn `Status >= 2` và chặn hồ sơ khám trùng.

Ba nút còn lại — **xác nhận · BN đã đến · vắng mặt** — là ba dòng gọi chung một hàm
`UpdateBookingStatus(code, newStatus, name)`. Toàn bộ phần kiểm của hàm đó:

```csharp
appointment.Status = newStatus;   // không có một câu if nào phía trên
```

Đo trước khi sửa (`t3_appointment_transitions.py`): **cả sáu bước chuyển sai đều trả HTTP 200**.

| Lịch đang ở | Bấm | Sau khi bấm |
|---|---|---|
| Đã hủy | Xác nhận | **Đã xác nhận** — lịch đã hủy sống lại |
| Đã đến khám | Xác nhận | Đã xác nhận |
| Không đến | Xác nhận | Đã xác nhận |
| Đã đến khám | Vắng mặt | **Không đến** — xoá dấu vết bệnh nhân đã tới |
| Đã hủy | BN đã đến | Đã đến khám |
| Không đến | BN đã đến | Đã đến khám |

Hàng thứ tư đáng ngại nhất: `GetBookingStatsAsync` tính tỉ lệ vắng khám bằng
`noShow / (attended + noShow)`, lấy đúng hai con số vừa bị viết đè. Một lần bấm nhầm là báo cáo vắng
khám lệch, mà không để lại dấu gì cho người đọc báo cáo biết.

### Chỗ đáng chú ý: giao diện đã đúng sẵn

Kiểm `BookingManagement.tsx` thì thấy cả ba nút **đã ẩn đúng theo luật** — `confirm` chỉ hiện ở
trạng thái 0, `checkin` và `noshow` chỉ hiện ở 0 hoặc 1. Nghĩa là luật có thật, được viết ra đầy đủ,
nhưng **chỉ tồn tại trong trình duyệt**. Mọi đường gọi thẳng API — client khác, script, một tab để
lâu rồi bấm lại, hay một yêu cầu dựng tay — đều đi qua không vướng gì.

Đây là biến thể sắc hơn của cái hình dạng đã gặp sáu lần trong đợt này: không phải *một luật thi
hành ở một cửa, bỏ trống ở cửa bên cạnh*, mà là **một luật thi hành ở lớp không thể thi hành được**.
Giao diện ẩn nút là để đỡ cho người dùng, không phải để chặn; nó không nhìn thấy các đường vào khác.

Vá: `AppointmentStatus.EnsureCanTransition(from, to)` trong `StatusConstants.cs`, gọi ngay đầu
`UpdateBookingStatus` — một chỗ, ba nút cùng ăn. Ba trạng thái 2/3/4 là **kết thúc**, không quay
ngược; muốn khám thì đặt lịch mới. Thông báo lỗi nói rõ lịch đang ở đâu và vì sao không đi tiếp
được, và vì controller đã gắn `DomainExceptionFilter` nên nó ra 400 kèm `message`, đúng cái mà
`runAction` trong giao diện đang đọc — nhân viên tiếp đón thấy lý do thật chứ không phải
"Xác nhận thất bại". **Không sửa gì ở giao diện: nó vốn đã đúng.**

Ba **đối chứng âm** giữ cho bản vá trung thực (0→1, 1→2, 1→3 bắt buộc vẫn thông), vì sáu ca trên đều
dạng "phải chặn" nên một bản vá chặn sạch mọi nút cũng đạt 6/6. Kết quả: **9/9** (trước vá 3/9).

---

## 20. Đóng hồ sơ bệnh án — cùng một lỗi, đã sửa đúng ở một nơi, còn nguyên ở nơi kia

Hệ thống có **hai** đường đóng hồ sơ bệnh án. Đường thứ nhất,
`EmrAdminService.FinalizeRecordAsync`, làm đúng — và ngay trên đầu hàm còn ghi lại bài học:

```csharp
// ⚠️ Trước đây set Status=5 — SAI semantics (5 = ... của luồng khám).
// Nay khóa bằng cờ riêng EmrFinalizedAt/By + ghi vết/phiên bản vào EmrAmendments
```

Khóa bằng `MedicalRecords.EmrFinalizedAt`, có `EmrLockGuard` chặn sửa nội dung với đúng câu TT46,
mở lại phải qua đường riêng hạn chế quyền + bắt buộc lý do + lưu vết `EmrAmendments`.

Đường thứ hai, `EmrManagementService.CloseEmrAsync` (B.2.5, `POST /api/emr-management/close`), **vẫn
làm đúng cái việc mà dòng cảnh báo trên gọi là SAI**: `examination.Status = 5; // Closed`. Mà
`ExaminationStatus` nói rõ **5 = Cancelled (Hủy)**.

Đây là hình dạng quen thuộc của cả đợt, lần này ở dạng gắt nhất: không phải luật được viết một nơi
rồi quên nơi kia — mà là **bản sửa của chính lỗi này chỉ được áp ở một cửa**.

### Hậu quả: khóa bằng cách khai man

Ô `Examinations.Status` là ô cả hệ thống đang đọc, nên một hồ sơ đã khám xong và được đóng đúng quy
trình sẽ hiện ra khắp nơi như một lượt khám **đã bị hủy**:

* `ReceptionCompleteService.Queue` in nhãn "Hủy";
* `ExaminationCompleteService.Prescriptions` từ chối kê đơn: *"Phiên khám đã hủy"*;
* `ExaminationCompleteService.Conclusion` từ chối sửa kết luận: *"Phiếu khám đã hủy"*.

Khóa thì có khóa. Nhưng khóa nhờ một lời khai sai, và người dùng đọc được lý do sai.

`ReopenEmrAsync` còn gán `Status = 3` ("Chờ kết luận") **bất kể trước đó là gì** — một lượt khám
Hoàn thành (4) đóng rồi mở lại thành Chờ kết luận, mất luôn dữ kiện đã khám xong.

### Lượt đo đầu báo PASS cho việc chưa hề xảy ra

Lượt chạy đầu cho 3/5, trong đó hai ca đầu **PASS** — trạng thái vẫn là 4, cờ TT46 vẫn trống, trông
hệt như "đóng hồ sơ hành xử đúng". Đọc kỹ thân phản hồi mới thấy `canClose: false, errorCount: 2`:
`CloseEmrAsync` chỉ đóng khi bộ tự kiểm sạch lỗi, nên nó **thoát sớm, không ghi gì**. Trạng thái
không đổi vì phép đóng chưa từng chạy.

Đúng cái bẫy đã gặp ở bài BHXH: **đo trạng thái cuối là không đủ khi "bị từ chối" và "chưa xảy ra"
để lại cùng một dấu vết.** Sửa bằng cách tắt tạm luật tự kiểm cho phép đóng chạy thật, và thêm một
câu chặn — nếu vẫn `canClose:false` thì **dừng hẳn**, không chấm điểm. Đo lại: **1/5**.

### Bản vá và ca phải có

Dùng chung cơ chế mà đường thứ nhất đã dùng: đóng thì đặt `EmrFinalizedAt/By`, mở lại thì gỡ, và
**không đụng vào `Examinations.Status`** — trạng thái lượt khám vốn không phải việc của thao tác
đóng/mở hồ sơ.

Ca quan trọng nhất không phải bốn ca trên mà là ca thứ năm: **khóa có còn khóa không.** Trước bản
vá, hồ sơ đã đóng chặn được sửa nội dung — nhưng chặn *nhờ* `Status = 5` bị đọc nhầm là đã hủy. Bỏ
dòng gán đó đi mà không có gì thay thế thì hoá ra mở toang hồ sơ đã đóng, tức bản vá còn tệ hơn
lỗi. Đo thẳng: sau khi đóng, `PUT /api/examination/{id}/conclusion` trả **400** kèm đúng câu TT46
(*"Hồ sơ bệnh án đã kết thúc và được khóa theo TT46/2018-TT-BYT"*) thay vì *"phiếu khám đã hủy"*.

`t3_emr_close_semantics.py`: **6/6** (trước vá 1/5).

---

## 21. Hủy duyệt kết quả chẩn đoán hình ảnh — hai cửa hủy, một cửa làm đủ, một cửa làm trống

Việc "đưa phiếu đã duyệt về nháp" có **hai** đường trong module CĐHA, và chúng kết thúc ở đúng cùng
một trạng thái (`Status = 0`, xoá `ApprovedBy`/`ApprovedAt`):

* `CancelSignedResultAsync` — làm đủ: **thu hồi chữ ký số** (`Status = 3`) và **ghi lý do** vào
  `RejectReason`.
* `CancelApprovalAsync` (`POST /api/RISComplete/results/{id}/cancel-approval`) — toàn bộ thân hàm là
  bốn dòng gán. Nhận tham số `reason` rồi **vứt đi không dùng lần nào**. Không đụng tới chữ ký.

Đo được **1/5**, ba lỗi thật cộng một lỗi hiển nhiên:

| Đo | Kết quả trước vá |
|---|---|
| hủy duyệt một phiếu **chưa hề duyệt** | HTTP 200 — xoá luôn dấu vết người duyệt của phiếu khác trạng thái |
| chữ ký số sau khi hủy duyệt | **vẫn còn hiệu lực** (`Status = 1`) |
| lý do hủy duyệt | **`(trống)`** — API nhận rồi vứt |
| chỉ định sau khi hủy duyệt | **kẹt ở 5 (đã duyệt)** trong khi phiếu đã về 0 (nháp) |

Chữ ký còn hiệu lực trên một phiếu hệ thống đang coi là chưa duyệt nghĩa là chữ ký đang bảo chứng
cho một thứ không còn tồn tại. Và hủy duyệt một kết quả chẩn đoán hình ảnh đã ký là việc phải giải
trình được — giao diện có bắt nhập lý do, API có nhận, nhưng không chỗ nào giữ lại.

Vá: cho cửa yếu làm đúng những gì cửa kia vẫn làm — chặn khi không có gì để hủy, thu hồi mọi chữ ký
còn hiệu lực kèm lý do, và trả `RadiologyRequest.Status` từ 5 về 4 để phiếu và chỉ định thôi nói
khác nhau. Đối chứng âm: hủy duyệt một phiếu đã duyệt không ký vẫn phải chạy được. **5/5.**

### Một ca đo cũ trở nên lỗi thời, và cách xử lý

Sau bản vá, `t3_radiology_transitions` tụt từ 8/8 xuống 7/8. Không phải hồi quy sản phẩm — mà là
**tiền đề của một ca đo không còn tồn tại**. Ca đó (đợt §5) hỏi: *"hủy duyệt xong mà chữ ký VẪN còn
hiệu lực, thì sửa nội dung có bị chặn không?"* — đúng vào thời điểm ấy, vì `CancelApprovalAsync`
không thu hồi chữ ký, nên lối vòng **ký → hủy duyệt → sửa** có thật và phải chặn ở cửa *sửa*. Nay
lối vòng bị bịt ngay từ **gốc**: hủy duyệt đã thu hồi chữ ký, nên không còn chữ ký "vẫn còn hiệu
lực" nào để thử.

Đổi ca đó sang đo điều **mạnh hơn** — hủy duyệt bắt buộc phải thu hồi chữ ký — chứ không sửa kỳ vọng
cho vừa kết quả. Lớp chắn cũ ("có chữ ký còn hiệu lực thì cấm sửa") vẫn nguyên vẹn và vẫn được ca
*"sửa nội dung phiếu ĐÃ KÝ SỐ"* canh, vẫn PASS với HTTP 400. Nói cách khác: giữ nguyên lớp chắn ở
cửa sửa, thêm lớp chắn ở gốc, và bài đo phản ánh đúng cả hai.

---

## 22. Đảo bút toán dịch vụ — đảo hai lần thì trừ tiền hai lần

`ReverseServiceChargeAsync` (`POST /api/BillingComplete/reverse-charge`) là bút toán đảo khi hủy một
dịch vụ đã tính tiền: tính lại số tiền từ chi tiết chỉ định, **trừ thẳng vào hóa đơn**
(`TotalServiceAmount` và `TotalAmount`), rồi đặt `ServiceRequests.Status = 4`.

Nó **không đọc trạng thái hiện tại của chỉ định một lần nào** trước khi làm. Gọi lần thứ hai trên
đúng chỉ định đó thì chi tiết chỉ định vẫn y nguyên nên số tiền tính ra vẫn thế, và hóa đơn bị trừ
thêm lần nữa. Đo được:

```
hóa đơn 5.000.000  →(đảo lần 1)  4.500.000  →(đảo lần 2)  4.000.000
trạng thái chỉ định: 4 sau lần 1, vẫn 4 sau lần 2
```

Một dịch vụ chỉ tính tiền **một lần** bị gỡ khỏi hóa đơn **hai lần**. Cùng hình dạng với lỗi tiền
tạm ứng ở §11 (phiếu 1.000.000đ chi ra 2.000.000đ), lần này theo chiều ngược lại.

Có chặn sàn `if (< 0) = 0` nên hóa đơn không âm — đó chính là chỗ nguy: với hóa đơn đủ lớn, lần đảo
thừa không tạo ra con số vô lý nào để ai đó phải giật mình, chỉ lặng lẽ gỡ thêm một khoản chưa từng
được tính.

### Vì sao phải đo bằng TIỀN, không đo bằng trạng thái

`Status = 4` gán lại lần hai không đổi gì cả. Nên một bài đo hỏi "sau khi gọi lần hai thì chỉ định ở
trạng thái nào" sẽ thấy đúng cái nó mong đợi và **báo PASS** — trong khi hóa đơn vừa mất thêm nửa
triệu. Lại đúng bài học của lượt đo BHXH và lượt đo đóng hồ sơ ở §20: **trạng thái cuối giống nhau
không có nghĩa là chuyện đã xảy ra giống nhau.** Bài đo này so `TotalAmount` trước và sau từng lần
gọi.

Vá: chặn khi chỉ định đã ở trạng thái 4. So với **đúng giá trị mà chính hàm này ghi xuống ở cuối**,
chứ không tự đặt ra một bộ trạng thái mới cho `ServiceRequests` khi chưa xác minh được đủ các giá
trị còn lại — đó chính là kiểu vơ đoán đã gây ra lỗi ở §20.

Đối chứng âm: lần đảo **đầu tiên** bắt buộc vẫn phải chạy và phải trừ đúng 500.000đ.
`t3_billing_reversal.py`: **3/3** (trước vá 1/3).

---

## 23. Hủy xuất viện — xoá cứng bản tóm tắt ra viện, và hủy được cả ca tử vong

`CancelDischargeAsync` (`POST /api/inpatient/cancel-discharge/{admissionId}`) có ba vấn đề nằm gọn
trong mười dòng. Đo được **2/4**:

**a. Xoá CỨNG bản ghi ra viện.** `_context.Set<Discharge>().Remove(discharge)` — không phải xoá mềm.
Mà `Discharge` giữ chẩn đoán ra viện, tóm tắt điều trị, hướng dẫn sau xuất viện, ngày hẹn tái khám
và người cho ra viện: một phần hồ sơ bệnh án. Bấm một nút là mất hẳn khỏi bảng, không còn gì đối
chiếu. Trớ trêu là hạ tầng đã sẵn: `Discharge` kế thừa `BaseEntity` (có `IsDeleted`) và
`HISDbContext` đã cài **bộ lọc xóa-mềm toàn cục** — chỉ là chỗ này không dùng.

**b. Tham số `reason` nhận rồi vứt** — y hệt `CancelApprovalAsync` bên CĐHA ở §21. Hủy một quyết
định ra viện là việc phải giải trình được.

**c. Không xét trạng thái lượt nội trú.** `admission.Status = 0` gán cứng, nên hủy được cả lượt đã
ghi **tử vong** và đưa bệnh nhân về "đang điều trị".

Vá: xoá mềm thay vì xoá cứng; chặn khi lượt đã ghi tử vong; ghi lý do vào **nhật ký kiểm toán** —
`Discharge` không có ô nào để ghi, mà nhật ký mới là chỗ đúng cho *ai làm gì, lúc nào, vì sao*, và
từ đợt §16–17 bảng đó đã thật sự chống sửa/xoá bằng trigger nên lý do ghi vào đấy không xoá đi được.
`t3_discharge_cancel.py`: **5/5**.

### Một PASS giả nữa, và lần này là do `SUM` trên tập rỗng

Lượt đo đầu báo ca (a) **PASS**. Câu đếm viết bằng `SUM(CASE WHEN IsDeleted=0 …)`; khi bản ghi đã bị
xoá sạch thì không còn dòng nào, `SUM` trả **NULL**, sqlcmd in ra chuỗi `'NULL'`, và phép so
`!= "0"` hoá ra đúng. Tức là đúng cái ca chứng minh dữ liệu bị xoá hẳn lại được chấm là đạt.

Cùng một kiểu sai với ca `canClose:false` ở §20: **giá trị "không có gì" bị đọc nhầm thành "có và
ổn"**. Đổi sang `COUNT(CASE WHEN … THEN 1 END)` (không đếm NULL, tập rỗng ra 0) và khẳng định thẳng
`còn sống + xoá mềm >= 1`. Đo lại: 2/4.

---

## 24. Từ vựng `Admissions.Status` — chú thích trong entity nói ngược với mã đang chạy

Khi đọc `Admission` để vá §23 thì thấy chú thích ngay trên trường:

```csharp
// 0-Đang điều trị, 1-Chuyển khoa(legacy), 2-Xuất viện, 3-Tử vong, 4-Bỏ về, 5-…, 6-Chờ ra viện
```

Nhưng `DischargeAsync` — mã thật sự chạy — ánh xạ `DischargeType` sang `Status` thế này:
`1 Ra viện → 1`, `2 Chuyển viện → 2`, `3 Bỏ về → 4`, `4 Tử vong → 3`. Tức **1 là Xuất viện, 2 là
Chuyển viện**, ngược với chú thích.

Chuyện này đáng ngại hơn một dòng chú thích cũ: đây chính là loại nguyên liệu đã đẻ ra lỗi §20 (đóng
hồ sơ ghi `Status = 5` vì tin rằng 5 nghĩa là "đã đóng", trong khi 5 là "đã hủy"). Ai đọc chú thích
này rồi viết một câu gác `Status == 2` để chặn hồ sơ đã ra viện sẽ chặn nhầm ca chuyển viện và bỏ
lọt ca ra viện.

Đối chiếu bằng dữ liệu thật thay vì tin chú thích: bảng `Admissions` đang có 33 dòng ở 0, 94 ở 1,
7 ở 2 — khớp với "1 = đã ra viện là nhóm đông nhất", không khớp với "1 = chuyển khoa legacy".

Sửa chú thích cho đúng và trỏ về `AdmissionStatus`, đồng thời bổ sung hai giá trị mà lớp hằng số còn
thiếu:

* `TransferredDepartment = 5` — chuyển khoa nội bộ, do `TransferDepartmentAsync` ghi. **Không** tính
  là còn hoạt động: lượt đó đã được thay bằng một lượt mới ở khoa đến.
* `PendingDischarge = 6` — **khai báo nhưng chưa có đường ghi nào**. Rà toàn bộ mã nguồn chỉ thấy
  một chỗ ĐỌC (`TreatmentRelationshipService`, gom chung với 0 và 5 là "còn đang điều trị"), không
  chỗ nào GÁN. Ghi rõ như vậy trong tài liệu hằng số thay vì để người sau gặp số 6 rồi đoán.

`IsActive` nay gồm cả 6 (chờ ra viện thì vẫn còn nằm viện). Hôm nay không đổi hành vi ở đâu vì không
có đường nào ghi giá trị 6 — nhưng đúng nghĩa hơn, và khớp với chỗ đọc duy nhất của giá trị đó.

---

## 25. Mượn hồ sơ bệnh án — cửa TẠO phiếu là hàm rỗng, ba cửa còn lại đều thật

Module mượn hồ sơ (`api/medical-record-planning/borrowing/*`) có bốn thao tác. Ba trong bốn làm việc
thật trên bảng `MedicalRecordBorrowRequests`: xem danh sách (truy vấn có `Include` bệnh nhân + hồ sơ
lưu trữ), gia hạn (đọc bản ghi thật, dời `ExpectedReturnDate`, `SaveChanges`), trả hồ sơ (đọc bản
ghi thật, đặt ngày trả, `SaveChanges`).

Cửa thứ tư — **tạo** phiếu mượn — thì:

```csharp
var code = $"PM-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
await Task.CompletedTask;
return new RecordBorrowDto { Id = Guid.NewGuid(), BorrowCode = code, ... };
```

Không chạm vào `_context` một lần nào. Đo được **0/3**: số phiếu trong bảng `0 → 0`, trong khi API
trả **HTTP 200** kèm mã phiếu `PM-20260904-7674` và một Id trông hoàn toàn hợp lệ.

Người dùng bấm "Mượn hồ sơ", nhận mã phiếu, giao diện báo thành công — rồi danh sách phiếu mượn
ngay bên cạnh không bao giờ thấy phiếu đó. Tập hồ sơ giấy rời khỏi kho mà hệ thống không biết ai
đang giữ.

Cùng hình dạng với tám hàm rỗng bên ca mổ ở §13: một chuỗi nghiệp vụ mà mọi mắt xích đều thật trừ
mắt xích đầu tiên. Điểm khiến nó khó phát hiện hơn hẳn: **API trả 200 kèm dữ liệu hợp lệ**, không có
lỗi nào để ai nhìn thấy. Nên bài đo này cố ý **không chấm theo mã HTTP** mà đếm số dòng trong bảng
trước/sau, rồi tra đúng cái Id mà API vừa nói là đã tạo.

Vá: ghi thật, theo đúng hình dạng `MedicalRecordArchiveService.CreateBorrowRequestAsync` vốn đã làm
đúng — tra hồ sơ lưu trữ, **chặn hồ sơ đang có người mượn** (không để hai người cùng cầm một tập hồ
sơ giấy), rồi lưu và trả về DTO dựng từ dữ liệu thật. **3/3.**

### Một FAIL nữa là lỗi của bài đo, không phải của sản phẩm

Ca thứ ba ("phiếu vừa tạo hiện ra ở danh sách") vẫn FAIL sau khi đã vá. Đọc kỹ `GetBorrowingAsync`
thì bộ lọc từ khoá chỉ soi `RequestCode`, tên bệnh nhân và `ArchiveCode` — **không soi `Purpose`**,
mà bài đo lại đi tìm cái dấu `T3BRW` nằm trong `Purpose`. Bài đo sai, không phải sản phẩm sai.

Đổi sang tìm theo **đúng mã phiếu mà API vừa trả về**: vừa khớp bộ lọc, vừa là khẳng định mạnh hơn —
chính cái phiếu API nói đã tạo phải hiện ra ở danh sách, chứ không chỉ "có phiếu nào đó".

---

## 26. Mượn/trả hồ sơ lưu trữ — cửa thứ hai, và lần này biết trước nó ở đâu

Vá §25 xong thì cửa tạo phiếu mượn đã chặn "hồ sơ đang có người mượn". Nhưng cùng một tập hồ sơ giấy
còn **một cửa nữa** cho mượn: `WriteGapService.BorrowRecordAsync`
(`POST /api/write-gap/record-planning/borrow`), thao tác thẳng trên `MedicalRecordArchives`. Toàn bộ
phần kiểm của nó:

```csharp
var archive = await _db.MedicalRecordArchives.FirstOrDefaultAsync(a => a.Id == dto.ArchiveId);
if (archive == null) return ServiceOutcome.NotFound();
archive.IsOnLoan = true;                    // hết
```

Lần này không phải tình cờ tìm ra: sau tám lần gặp đúng hình dạng *một luật, thi hành ở một cửa, bỏ
trống ở cửa bên cạnh*, việc vá một cửa đã thành lý do để đi tìm cửa còn lại. Đo được **2/5**:

* **mượn chồng lên lượt mượn đang mở** — người thứ hai nhận 200, `BorrowedByUserId` và `BorrowReason`
  bị ghi đè sang người mới. Hệ thống quên mất ai đang thật sự cầm tập hồ sơ giấy trong tay;
* **trả một tập hồ sơ chưa hề rời kho** — 200, và `ReturnedAt` được đặt cho một lượt mượn không tồn tại.

Vá: chặn mượn khi `IsOnLoan` hoặc `Status == 2`; chặn trả khi hồ sơ đang nằm trong kho. Hai **đối
chứng âm** giữ cho bản vá trung thực — mượn lần đầu và trả một hồ sơ đang mượn đều bắt buộc vẫn phải
chạy. `t3_archive_loan.py`: **5/5**.

Ghi lại một điều làm đúng, để không đổ oan: cửa này **có** lưu lý do mượn vào `BorrowReason` — khác
với `CancelApprovalAsync` (§21) và `CancelDischargeAsync` (§23) vốn nhận lý do rồi vứt.

---

## 27. Hủy / mở lại lượt khám — lý do hủy ghi đè lên kết luận của bác sĩ

Hai thao tác trên cùng một lượt khám, cùng một file, cùng không có một lượt kiểm nào. Đo được **2/6**.

### a. Lý do hủy xoá mất kết luận khám

`CancelExaminationAsync` (`POST /api/examination/{id}/cancel`) toàn bộ là hai dòng gán:

```csharp
examination.Status = 5;                  // Cancelled
examination.ConclusionNote = reason;     // ← ghi ĐÈ
```

`ConclusionNote` là **kết luận khám của bác sĩ**: `CompleteExaminationAsync` và
`UpdateConclusionAsync` đều ghi nó từ `dto.ConclusionNotes`, và `CdaDocumentService` lấy đúng ô đó
làm phần diễn biến lâm sàng cho tài liệu CDA gửi hồ sơ sức khỏe quốc gia. Đo được: kết luận
`KET-LUAN-CUA-BAC-SI` bị thay bằng `T3EXC ly do huy` chỉ sau một lần gọi. Cùng dạng với lỗi mất bàn
giao lâm sàng khi chuyển khoa ở §10.

Đáng chú ý: **chính entity này đã học bài đó một lần rồi**. Ngay phía trên có dòng
`// Yêu cầu chuyển viện — lưu có cấu trúc thay vì gộp vào ConclusionNote`, và `RequestTransferAsync`
lưu năm trường riêng thay vì nhét chuỗi vào đó. Bài học có, chỉ là không áp sang đường hủy.

Vá theo đúng tiền lệ ấy: **migration 174** thêm `Examinations.CancelReason`, lý do hủy đi vào ô của
nó, kết luận của bác sĩ giữ nguyên.

### b. Không có gác nào khác

* hủy được lượt khám **đã hoàn thành** (phải mở lại kết luận trước rồi mới hủy — đúng chuỗi mà
  `LabCancelChainService` đã làm cho xét nghiệm);
* hủy được lượt thuộc hồ sơ **đã khóa TT46**, trong khi sửa kết luận của chính lượt đó thì
  `EmrLockGuard` chặn — khóa mà hủy cả lượt vẫn lọt thì lớp khóa chẳng còn nghĩa gì;
* `RevertCompletionAsync` gán `Status = 1` bất kể đang ở đâu nên **mở lại được cả lượt đã hủy**, và
  tham số `reason` nhận rồi vứt (giống §21, §23).

Vá: `EmrLockGuard` ở cả hai đường; chặn hủy khi đã hủy hoặc đã hoàn thành; chặn mở lại khi đã hủy
hoặc khi chưa từng hoàn thành; lý do mở lại cũng lưu vào `CancelReason`.

Hai **đối chứng âm** (hủy một lượt đang khám dở, mở lại một lượt vừa hoàn thành) cộng một ca khẳng
định lý do **thật sự** nằm trong ô mới và kết luận còn nguyên bên cạnh — vì "chuyển sang ô riêng"
chỉ có nghĩa nếu đo được cả hai vế. `t3_examination_cancel_revert.py`: **7/7**.

Tiện thể sửa chú thích `Examinations.Status` vốn bỏ sót giá trị 5 (Hủy) — cùng loại với §24.

---

## 28. Gửi đơn thuốc lên Cổng quốc gia — ghi trạng thái GỬI vào ô trạng thái CẤP PHÁT

`Prescriptions.Status` là trạng thái **duyệt và cấp phát thuốc**, ghi rõ ngay trên entity:
`0-Chờ duyệt · 1-Đã duyệt · 2-Đã cấp phát · 3-Hoàn trả · 4-Hủy`.

`NationalPrescriptionService` dùng đúng ô đó để ghi trạng thái **gửi lên Cổng đơn thuốc quốc gia**.
Đo được **0/3**:

| Bấm | Đơn thuốc trước | Đơn thuốc sau |
|---|---|---|
| Gửi lên cổng | Chờ duyệt (0) | **Đã duyệt (1)** — bỏ qua hẳn bước duyệt của dược sĩ |
| Gửi lại | Đã cấp phát (2) | **Đã duyệt (1)** — thuốc đã ra khỏi quầy mà hệ thống bảo chưa phát |
| **Hủy gửi** | Đã duyệt (1) | **Hủy (4)** — voiding luôn đơn thuốc của bệnh nhân |

Hàng cuối là nặng nhất: bấm "hủy gửi lên cổng" — một thao tác về đường truyền dữ liệu — làm đơn
thuốc của bệnh nhân bị hủy.

### Không chỉ đường ghi: cả màn hình đang đọc nhầm ô

Sửa ba lệnh ghi là chưa đủ, vì phần đọc cũng dựa trên cùng nhầm lẫn ấy:

* `SearchAsync` lọc `p.Status == search.Status` — bộ lọc "trạng thái gửi" của màn hình Cổng ĐTQG
  thật ra đang lọc theo trạng thái cấp phát thuốc;
* `SubmittedAt = p.Status >= 1 ? p.CreatedAt : null` — "ngày gửi" được **bịa** từ ngày tạo đơn;
* `GetStatsAsync` đếm `Status == 1/2/3/0` làm "đã gửi / đã nhận / **bị cổng từ chối** / chờ gửi" —
  ô "đơn bị cổng từ chối" thật ra đang đếm **đơn hoàn trả thuốc**.
* `SubmitBatchAsync` cũng gán `Status = 1` — vá `SubmitAsync` mà quên nó thì lại đúng cái hình dạng
  cả đợt đang gỡ.

Vá: **migration 175** thêm `NationalPortalStatus` / `NationalPortalTransactionId` /
`NationalPortalSubmittedAt`; cả năm chỗ (gửi · gửi lô · gửi lại · hủy gửi · đọc) chuyển sang ô riêng,
`Prescriptions.Status` không bị đụng tới nữa. Thêm gác chặn gửi lại một đơn đã gửi.

### Đối chứng âm là bắt buộc ở đây

Ba ca đầu đều dạng *"không được đụng vào `Status`"*, nên một bản vá **gỡ sạch mọi lệnh ghi** cũng đạt
3/3 — tức tính năng gửi cổng biến mất mà bài đo vẫn báo xanh. Hai ca thêm bắt buộc trạng thái gửi
phải **thật sự nằm ở ô riêng và đọc lại được**: sau khi gửi, `NationalPortalStatus = 1` +
`TransactionId` dạng `CQLKCB-…` + `SubmittedAt` có giá trị; sau khi hủy gửi,
`NationalPortalStatus = 3` **và** `Prescriptions.Status` còn nguyên.

`t3_national_prescription.py`: **5/5**.

Đây là lần thứ ba trong đợt gặp một tính năng mượn ô trạng thái của tính năng khác (§20 đóng hồ sơ
ghi `Status=5` = "đã hủy"; §24 chú thích `Admissions.Status` nói ngược với mã đang chạy). Ba lần
khác module, khác người viết, cùng một cách hỏng — nên đây không phải ba lỗi rời rạc mà là một thói
quen: **cần trạng thái mới thì mượn tạm ô sẵn có, thay vì thêm một ô.**

---

## 29. Thôi tìm bằng may: bộ dò từ vựng trạng thái — và cái nó tìm ra ngay

Ba lỗi §20, §24, §28 là **cùng một cách hỏng** ở ba module khác nhau, ba người viết khác nhau: cần
một trạng thái mới thì mượn tạm ô sẵn có thay vì thêm một ô. Ba lỗi rời rạc thì vá ba lần; ba lần
cùng hình dạng thì đó là một **thói quen**, và tìm nó bằng may là không đủ.

`t3_status_vocabulary_sweep.py` khai thác một điều sẵn có trong mã: mỗi chỗ ghi
`x.Status = <số>;  // <chú thích>` là một **lời khai** — người viết đang nói con số đó nghĩa là gì.
Gom mọi lời khai theo cặp *(tên biến, giá trị)*; cặp nào có hai lời khai mâu thuẫn thì hoặc là hai
thực thể khác nhau trùng tên biến (vô hại), hoặc là một bên đang mượn ô của bên kia.

Bộ dò **không tự kết luận** — nó thu hẹp từ vài nghìn dòng xuống 8 cặp đáng đọc. Đọc hết 8:

* 6 cặp là trùng tên biến chung chung (`request`, `session`, `schedule`… dùng cho `ServiceRequest`,
  `RadiologyRequest`, `MedicalRecordBorrowRequest`, `RadiologyDutySchedule`, `SurgerySchedule`…) —
  vô hại, đã kiểm từng cặp;
* 1 cặp chính là §20 đã vá — tức bộ dò **bắt được đúng con lỗi nó sinh ra để bắt**;
* **1 cặp là lỗi mới, chưa ai biết.**

### Cái nó tìm ra: hủy chỉ định dịch vụ nhưng vẫn bị tính tiền

Với `ServiceRequests` thì **4 = đã hủy**. Cả phần còn lại của hệ thống đồng thuận:
`BillingCompleteService.Printing` (3 chỗ) và `.Refunds` lọc `ServiceRequest.Status != 4` để **loại
chỉ định đã hủy khỏi hóa đơn**; `InpatientCompleteService.NutritionReports` ném lỗi khi `== 4`;
`OrdersReports` ghi 4 kèm chú thích nói thẳng *"ServiceRequest.Status: 4=hủy; SRD.Status: 3=hủy"*;
`LabCancelChainService` coi 3 là trạng thái đang-làm-việc.

Nhưng `CancelServiceOrderAsync` (`POST /api/examination/service-orders/{id}/cancel`) viết:

```csharp
request.Status = 3; // Cancelled
```

Tên hàm, chú thích, tham số `reason` — tất cả đều nói đây là hủy. Chỉ con số là sai. Và hậu quả
không nằm ở màn hình mà nằm ở **hóa đơn**: chỉ định đã hủy mang `Status = 3`, tức `!= 4`, nên mọi
câu lọc của bên viện phí vẫn tính nó vào. **Bệnh nhân bị thu tiền một dịch vụ đã bị hủy.**

Bài đo vì thế không hỏi *"trạng thái sau khi hủy là mấy"* mà hỏi đúng câu người bệnh quan tâm:
**"bên viện phí có còn tính tiền dịch vụ đó không"** — chạy chính câu lọc `Status <> 4` mà hóa đơn
đang dùng. Trước vá: **CÒN tính tiền**. Sau vá: không. `t3_service_order_cancel.py`: **3/3**.

Sửa đúng một ký tự. Tìm ra nó mới là phần khó — và đó là lý do bộ dò đáng giữ lại, chạy lại mỗi khi
có người thêm một trạng thái mới.
