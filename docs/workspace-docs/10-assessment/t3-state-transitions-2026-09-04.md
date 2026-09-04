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
