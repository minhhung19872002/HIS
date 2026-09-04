# T2 #217 & T4 #219 — Luồng chính đầu→cuối và cách giao diện chịu lỗi API (2026-09-04)

> Script + dữ liệu đo: `docs/architecture/evidence/cross/t2/` và `frontend/e2e/t4-api-error-handling.spec.ts`.
> Ảnh evidence: `docs/architecture/evidence/cross/TC-ERR-*`.

## 1. T2 #217 — luồng khám ngoại trú, khẳng định KẾT QUẢ

#217 nói rõ nó muốn gì: không phải "trang có load được không" mà "mỗi bước tạo đúng dữ liệu, chuyển
đúng bước, số liệu cuối đúng". Nên bài này đi bằng API và **đọc lại DB sau từng bước**, thay vì bấm
qua tám màn hình rồi chỉ kiểm không có lỗi console.

`t2_opd_happy_path.py` — **14/14 bước đạt**:

| # | Bước | Khẳng định |
|---|---|---|
| 1 | Tạo bệnh nhân | HTTP 201, sinh mã `BN26xxxxxx` |
| 2–3 | Tiếp đón đăng ký khám viện phí | tạo `MedicalRecords` **và** sinh `Examinations` |
| 4 | Bác sĩ bắt đầu khám | `Examinations.Status = 1` |
| 5 | Chỉ định cận lâm sàng | tạo `ServiceRequests` |
| 6 | Hoàn thành lượt khám | `Examinations.Status = 4` |
| 7 | Sửa kết luận sau khi hoàn thành | HTTP 200 |
| 8–9 | Kê đơn | `Prescriptions` + `PrescriptionDetails` |
| 9b | Dược duyệt | `Status = 1` |
| 10 | Cấp phát | `Status = 2`, `IsDispensed = 1` |
| 11 | **Kho bị trừ đúng số** | lô nạp 100, kê 6 → còn **94** |
| 12 | **Thu tiền vào sổ phiếu thu** | `Receipts.FinalAmount = 50.000` |
| 13 | **Luồng ngược bị chặn** | hủy đơn ĐÃ PHÁT → **400**, trạng thái giữ nguyên |

Bước 13 là kiểm chéo cho #218: guard chuyển trạng thái không chỉ đúng trên bàn thử mà còn đúng
trong luồng thật.

### Lỗi thật T2 tìm ra

**Guard nghiệp vụ ném `System.Exception` trần nên ra 500 thay vì 400.** Gọi
`PUT /api/examination/{id}/conclusion` khi phiếu chưa hoàn thành trả **HTTP 500**, dù thông điệp là
một quy tắc nghiệp vụ rõ ràng ("Phiếu khám chưa hoàn thành, vui lòng dùng CompleteExamination").
`DomainExceptionFilter` đã ghi sẵn quy ước `InvalidOperationException → 400 state machine guard fail`
— và guard khoá EMR ngay bên dưới dùng đúng kiểu đó. Đây là sự thiếu nhất quán, không phải chủ ý.

Đã sửa **19 chỗ** trên đường khám (`ExaminationCompleteService.Conclusion.cs` + `.Exam.cs`):
17 chỗ "… not found" → `KeyNotFoundException` (**404**), 2 guard trạng thái → `InvalidOperationException`
(**400**). Sau sửa, bước 6/7 của luồng chạy đúng thứ tự nghiệp vụ và trả 200.

### Quét nốt 226 chỗ còn lại — làm hai đợt, đo giữa hai đợt

Sau khi sửa 19 chỗ trên đường khám, toàn repo còn **226** chỗ `throw new Exception(...)` trong
`HIS.Infrastructure/Services`. Mỗi chỗ là một quy tắc nghiệp vụ đang hiện ra như sự cố máy chủ.

Không sửa tay từng chỗ, cũng không sửa cả loạt một lần. Cách làm: một bộ phân loại
(`evidence/cross/t4/classify_service_throws.py`) áp đúng luật mà filter đã ghi — message có
"not found" / "không tồn tại" / "không tìm thấy" thì là **404**, còn lại là **400** — chạy **thử khô
trước để soi từng dòng**, rồi mới áp dụng.

| Đợt | Phạm vi | 404 | 400 | Giữ nguyên |
|---|---|---:|---:|---:|
| 1 | Viện phí · Tiếp đón · Kho · Lưu trữ hồ sơ (14 file) | 68 | 27 | 1 |
| 2 | 37 file còn lại | 91 | 19 | 2 |

Ba chỗ **giữ nguyên** là `throw new Exception(msg, ex)` trong `catch` — đó là bọc lỗi gốc từ nhà
cung cấp hóa đơn điện tử và từ luồng tạo yêu cầu phẫu thuật, đúng là sự cố máy chủ thật, không phải
guard nghiệp vụ. Sau hai đợt, tầng service còn đúng 2 chỗ `Exception` trần và cả hai đều thuộc loại đó.

Năm controller sở hữu các service vừa đổi mà chưa gắn `DomainExceptionFilter` (Procurement · IvfLab ·
Patients · AppointmentBooking) nay đã gắn — đổi kiểu ở service mà controller không map thì vẫn ra 500.

**Đo lại trên API đang chạy** (`t4_not_found_codes.py`): gọi 16 endpoint bằng một id không tồn tại →
**0/16 còn trả 500**. 13 trả 404 kèm câu giải thích, 2 endpoint trả rỗng theo thiết kế (không ném
guard), 1 là 405 do bộ dò gọi sai verb. Luồng T2 chạy lại vẫn **14/14**, test gate vẫn 62 pass.

### Ba lần chạy đầu KHÔNG phải lỗi sản phẩm

Ghi lại để lần sau không mất công đuổi nhầm:

- `PUT .../conclusion` là **sửa** kết luận của phiếu đã hoàn thành; ghi kết luận lần đầu đi bằng
  `POST .../complete`. Gọi sai thứ tự là lỗi của bài test — nhưng chính nó lộ ra lỗi 500 ở trên.
- Tiền thu ở tiếp đón vào **`Receipts`** (sổ phiếu thu duy nhất), **không** vào `Payments`. Ghi vào
  `Payments` là cách làm cũ đã bỏ vì không màn hình nào đọc, tiền biến mất khỏi sổ quỹ.
- Bước cấp phát dừng ở "không đủ tồn kho" là **đúng**; muốn đo tiếp phải nạp tồn cho đúng viên thuốc
  vừa kê vào kho lẻ ngoại trú.

## 1b. T2 #217 — luồng NỘI TRÚ

`t2_inpatient_happy_path.py` — **10/10 bước đạt**: tiếp đón → nhập viện từ phòng khám
(`Admissions.Status = 0`) → xếp giường (`BedAssignments` giữ 1) → kê đơn nội trú → cấp phát →
**xuất viện** (`Status = 1`) → **giường được trả** (`ReleasedAt` có giá trị) → **hủy xuất viện đưa
về điều trị** (`Status` về 0).

Lượt chạy đầu dừng ở bước xuất viện với **400 `INVALID_STATE`: "Không thể xuất viện: Còn 1 đơn thuốc
chưa cấp"**. Đó là **guard đúng và đang hoạt động** — đáng ghi lại, vì nó tương phản với các guard
còn thiếu ở §4b và ở #218: luồng nội trú có kiểm, đường hoàn tiền thì không. Lỗi thuộc về bài test
(kê đơn rồi bỏ đó); sửa bằng cách nạp tồn kho và cấp phát cho xong rồi mới xuất viện.

Một chi tiết nữa của bài test: `cancel-discharge` nhận `[FromBody] string`, gửi object `{}` sẽ bị
model-binder từ chối 400 — không phải lỗi sản phẩm.

### Chưa phủ

Kết quả xét nghiệm/CĐHA thật (không có endpoint nhập tay — kết quả về qua máy phân tích LIS, phải
đi đường `LISComplete/mock-receive` rồi `inbox/{id}/transfer`), ký số, gửi hồ sơ BHXH, và luồng
chuyển khoa / chuyển viện.

## 2. T4 #219 — giao diện trước các mã lỗi API

`apiClient` chỉ tự xử **401** (refresh một lần rồi mới đá về `/login`) và **503** (banner bảo trì);
400/403/404/500 và request treo được ném lại cho từng trang tự lo — nên phải đo ở từng trang.

`frontend/e2e/t4-api-error-handling.spec.ts` chạy 4 trang tới hạn (Tiếp đón · Khám bệnh · Dược ·
Viện phí) × {400, 403, 404, 500, request treo}. Mỗi lượt kiểm ba điều: còn khung ứng dụng (không
trang trắng) · không còn spinner sau khi lỗi đã trả về (không quay mãi) · không có lỗi JavaScript
chưa bắt.

**16/16 lượt mã lỗi đạt ngay**: 400/403/404/500 ở cả 4 trang đều giữ khung, tắt spinner, không văng
lỗi JS. Riêng nhóm "request treo" tìm ra một lỗi thật.

### Lỗi thật T4 tìm ra — màn Khám bệnh quay mãi

Bỏ lửng request của trang (mô phỏng mạng chập chờn / backend nghẽn) rồi chờ 20 giây:
`/v2/reception`, `/v2/pharmacy`, `/v2/finance` đều dừng chờ và hiện trạng thái; **`/v2/opd` vẫn quay
ở "Đang tải…"** — không báo lỗi, không nút thử lại. Ảnh: `TC-ERR-002__s05__loading.png`.

Nguyên nhân KHÔNG nằm ở trang: `SimpleV2Page` đã có `.catch(...).finally(() => setLoading(false))`
đúng bài. Vấn đề là **`apiClient` không đặt `timeout`**, nên một request treo không bao giờ resolve
mà cũng không bao giờ reject — nhánh `.catch` không có cơ hội chạy. Trang nào tự có mốc dừng thì
thoát, trang nào tin vào client thì kẹt.

**Sửa:** đặt `timeout: 60_000` cho `apiClient`. 60 giây là mức rộng rãi — dài hơn hẳn mọi truy vấn
danh sách bình thường nên không cắt nhầm việc đang chạy được, mà vẫn chặn được cảnh chờ vô hạn. Lời
gọi nặng (xuất PDF/Excel, gói DICOM) nếu cần lâu hơn thì truyền `timeout` riêng cho request đó.
Việc nên làm tiếp: rà các lời gọi nặng, gán timeout riêng cho chúng, rồi hạ mặc định xuống ~20s cho
đường đọc — 60 giây vẫn là quá lâu để một màn lâm sàng đứng im.

**Sau khi sửa: 20/20 đạt.** Màn Khám bệnh nay hiện *"Không tải được dữ liệu"* kèm nút **Thử lại**
thay vì quay mãi (ảnh `TC-ERR-002__s05__loading.png`). `npm run build` xanh, `tsc --noEmit` sạch, và
mốc 60 giây có mặt trong bundle đã dựng.

Spec **không đoán endpoint**: nó mở trang một lần, ghi lại mọi request API, loại các call của khung
(phiên ký số, `auth/me`, `me/permissions`, `system/*`, `abbreviation`, `notification`, `user-settings`,
`ai-labeling`) rồi chặn **đúng một** endpoint dữ liệu của chính trang đó — đúng yêu cầu "intercept theo
endpoint, không phải `**/api/**`" của #219.

### Hai lần chạy đầu sai vì bài test, không vì sản phẩm

- Lọc `url.includes('/api/')` bắt nhầm URL **module của Vite dev** (`/src/modules/system/api/notification.ts`).
  Chặn một file JS rồi nhét JSON vào đó thì trang trắng thật — và suýt bị ghi thành "lỗi sản phẩm:
  màn hình trắng khi API 400". Phải neo vào origin của backend.
- Lấy "request API đầu tiên" cũng sai: khung bắn vài call nền trước dữ liệu của trang, nên cả bốn
  trang cùng chặn một endpoint chung — đo sức chịu của khung chứ không phải của trang.

Hai lỗi này đều thuộc loại "test xanh/đỏ vì lý do sai", nguy hiểm hơn test đỏ thật, nên ghi lại đây.

### Chưa phủ

Lỗi trên đường **ghi** (tạo phiếu thu / hoàn tiền / kê đơn / upload) — mới đo đường đọc của trang.
Kiểm `envelope` một lớp bằng vitest cho `apiClient` (yêu cầu "FE không double-unwrap" của #219) cũng
chưa làm. Hạ mặc định `timeout` xuống ~20s cho đường đọc sau khi đã gán timeout riêng cho các lời gọi nặng.
