# Nhật ký quyết định — App Mobile Hỗ trợ Người bệnh

> Mỗi dòng là một lựa chọn kỹ thuật đã tự quyết trong quá trình làm, kèm **lý do** và **cái đánh đổi**.
> Nguyên tắc chung: chọn phương án **đơn giản nhất đáp ứng đúng câu chữ HSMT**.
>
> 🔗 [`README.md`](README.md) · [`acceptance-matrix.md`](acceptance-matrix.md) ·
> [`external-services-setup.md`](external-services-setup.md)

---

## D1 — Project riêng `HIS.PatientApp.Api`, không tham chiếu HIS Core

**Chọn:** dựng project mới trong cùng solution, **cố ý không** tham chiếu
`HIS.Core`/`HIS.Application`/`HIS.Infrastructure`.

**Lý do:** HSMT I.1 đòi *"tích hợp module kết nối với HIS **dựa trên các API HIS cung cấp**"*. Tham
chiếu thẳng project sẽ biến BFF thành một phần của HIS chứ không phải hệ thống kết nối qua API — và
kéo EF SqlServer, fo-dicom, itext7, Pkcs11 vào một dịch vụ mở ra Internet.

**Đánh đổi:** thiếu endpoint nào thì phải bổ sung vào HIS Core rồi gọi qua HTTP, chậm hơn gọi thẳng.

---

## D2 — CSDL riêng trên PostgreSQL

**Chọn:** `HIS.PatientApp.Api` dùng PostgreSQL riêng, không đụng schema HIS.

**Lý do:** quyết định của chủ đầu tư 2026-09-08, theo đúng thiết kế trong prompt gốc §3.

**Đánh đổi:** thêm một engine CSDL vào hệ thống vốn thuần SQL Server; backup và vận hành thành hai
quy trình.

---

## D3 — Pin Flutter 3.32.8 để giữ iOS 12.0

**Chọn:** ghim Flutter **3.32.8** qua FVM (`.fvmrc`), không dùng bản mới nhất.

**Lý do:** HSMT ghi *"iOS 12.0 trở lên"*. Xác minh trên repo Flutter: mức tối thiểu nâng 12 → 13 ở
commit `09d4dabd6d6`, tag stable đầu tiên chứa nó là **3.35.0**; sau đó 13 → 15. Vậy 3.32.8 là bản
cuối cùng còn target iOS 12.0.

**Đánh đổi:** SDK không còn nhận bản vá bảo mật; 7 gói phải ghim ở bản cũ. Có
`scripts/check-ios-min-deployment-target.py` chạy trong CI để chặn nâng nhầm.

---

## D4 — Chữ ký sinh trắc dùng RSA-2048 thay vì ECDSA P-256

**Chọn:** `biometric_signature` **6.x**, chữ ký `SHA256withRSA` (PKCS#1 v1.5).

**Lý do:** bản 13.x dùng ECDSA nhưng podspec khai `s.platform = :ios, '13.0'` → mất iOS 12. Bản 6.x
còn khai 12.0.

**Đánh đổi:** RSA-2048 chậm hơn và khoá dài hơn ECDSA P-256. Không đáng kể với một lần ký mỗi lần
đăng nhập.

---

## D5 — Podfile dùng thư viện tĩnh + `use_modular_headers!`

**Chọn:** **không** `use_frameworks!`.

**Lý do:** Firebase iOS SDK 10.x (nhánh cuối còn hỗ trợ iOS 12) có pod `Firebase` chỉ-có-header nên
CocoaPods không dựng framework cho nó được → header không modular. Bật `use_frameworks!` thì
`firebase_messaging` thành framework module và import đúng header đó → Xcode chặn. Bỏ framework thì
lệnh import chỉ là include thường.

**Đã thử và không hiệu quả** (ghi lại để khỏi lặp): chỉ đặt
`CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES`; `use_frameworks! :linkage => :static`; khai
`:modular_headers => true` riêng từng pod Firebase; tắt `ENABLE_MODULE_VERIFIER`; `use_frameworks!`
kèm `use_modular_headers!`.

---

## D6 — STT ưu tiên: đối chiếu được thì kiểm, không đối chiếu được thì gắn cờ

**Chọn:** tuổi suy từ ngày sinh trong hồ sơ (≥60 hoặc <6 → ưu tiên, **kể cả khi không khai**); lý do
không kiểm được (có thai, khuyết tật nặng, người có công) vẫn cấp số ưu tiên nhưng đặt
`PriorityVerified = false` để lễ tân xác minh khi gọi; **cấp cứu không cấp qua app**.

**Lý do:** tin thẳng lời khai thì ai cũng khai ưu tiên và người ưu tiên thật bị thiệt; chặn hết những
gì không kiểm được thì tính năng thành vô nghĩa.

**Đánh đổi:** vé chưa xác minh vẫn được xếp trước trong hàng đợi cho tới lúc lễ tân gọi.

---

## D7 — Slot đặt khám đọc `DoctorSchedule`, có khung giờ dự phòng

**Chọn:** `GetAvailableSlotsAsync` đọc lịch trực thật; ưu tiên lịch đúng ngày, không có thì lấy lịch
lặp hàng tuần; **không tìm được lịch nào thì rơi về khung hành chính** 7:30-11:30 / 13:30-16:30.

**Lý do:** khung giờ cứng cũ cho phép đặt vào giờ bác sĩ không trực — người bệnh đến nơi mới biết.
Nhưng nếu khoa chưa kịp khai lịch mà hiện "hết chỗ" thì còn tệ hơn, nên giữ đường lui.

**`MaxPatients` của cả ca được chia đều cho số slot** để tổng số người nhận trong ca không vượt con số
bác sĩ đã đăng ký.

---

## D8 — Dịch vụ ngoài đều có bản thật + bản giả, mặc định chạy bản giả

**Chọn:** OTP SMS, FCM/APNs, PACS… mỗi thứ một interface với hai cài đặt; chọn bằng cấu hình; môi
trường demo mặc định dùng bản giả.

**Lý do:** để demo end-to-end được ngay khi chưa có credential, mà không để lại đường tắt trong bản
thật.

**Ràng buộc tự đặt:** bản giả **chỉ được bật khi cấu hình nói rõ**; chạy ở môi trường thật mà thiếu
cấu hình dịch vụ thật thì ứng dụng **ném lỗi lúc khởi động** chứ không âm thầm dùng bản giả.
Danh sách credential cần cấp: [`external-services-setup.md`](external-services-setup.md).

---

## D9 — Connector bóc vỏ `{success,data}` một cách khoan dung

**Chọn:** `HisRestConnector.ReadPayloadAsync` tự nhận ra lớp vỏ `{success, data, message, errors,
meta}` mà HIS.API bọc quanh mọi phản hồi, và cũng chấp nhận phản hồi trần.

**Lý do:** đoán sai lớp vỏ **không** làm request lỗi — `System.Text.Json` chỉ trả về đối tượng toàn
giá trị mặc định. Triệu chứng ngoài đời là "lấy số thành công" nhưng mã vé rỗng và danh sách khoa
trống, tức là hỏng âm thầm, khó lần ra hơn hẳn một lỗi 500. Đã bị đúng lỗi này ở lần chạy smoke
Phase 2 đầu tiên: 4/15 ca hỏng vì cùng một nguyên nhân.

**Đánh đổi:** một phản hồi *thật sự* có hai trường tên `success` và `data` sẽ bị bóc nhầm. Chấp nhận
được vì đó chính là quy ước envelope của HIS, không phải trùng hợp.

---

## D10 — Chống lấy trùng số thứ tự đặt ở BFF, không đặt ở HIS

**Chọn:** HIS chỉ chặn trùng khi **biết đích danh bệnh nhân** (`PatientId != null`); phép chặn theo
người dùng app nằm ở BFF, dựa trên bảng `app_queue_tickets` với chỉ số duy nhất
`(AccountId, RoomId, QueueDate)`.

**Lý do:** điều kiện cũ `t.PatientId == dto.PatientId` với cả hai vế `null` được EF dịch thành
`PatientId IS NULL AND @p IS NULL` — nghĩa là **một** vé vô danh trong phòng chặn mọi khách vãng lai
tiếp theo của cả ngày hôm đó. Tài khoản app chưa liên kết hồ sơ thì bên HIS đúng là khách vô danh,
nên HIS không có cơ sở nào để nói hai người là một; danh tính duy nhất tồn tại là tài khoản app.

**Được thêm:** có bảng này thì API hỏi trạng thái vé mới kiểm được vé có phải của người đang đăng nhập
không — vé của người khác trả 404 y như vé không tồn tại. Trước đó ai cầm được id vé cũng tra được.

**Đánh đổi:** một người dùng hai tài khoản app vẫn lấy được hai số. Chặn việc đó cần định danh thật
(liên kết hồ sơ), thuộc phần liên kết hồ sơ bệnh án.
