# HIS Connector — bảng đối chiếu

> Cách BFF (`HIS.PatientApp.Api`) lấy dữ liệu từ HIS Core.
>
> HSMT I.1 yêu cầu *"hệ thống tích hợp module kết nối với HIS **dựa trên các API HIS cung cấp**"*.
> Mọi truy vấn nghiệp vụ vì thế đi qua **HTTP tới API của HIS**, không qua tham chiếu project và
> không qua truy vấn thẳng CSDL của HIS.
>
> 🔗 [`README.md`](README.md) · [`00-his-api-inventory.md`](00-his-api-inventory.md) · [`acceptance-matrix.md`](acceptance-matrix.md)

---

## 1. Nguyên tắc

| # | Nguyên tắc | Vì sao |
|---|---|---|
| 1 | **Một cửa duy nhất**: `IHisConnector` (`backend/src/HIS.PatientApp.Api/Connector/IHisConnector.cs`) | Đổi sang HIS khác chỉ cần viết một implementation mới |
| 2 | **Không tham chiếu project HIS** | Tham chiếu thẳng biến BFF thành một phần của HIS chứ không phải hệ thống kết nối qua API, và kéo EF SqlServer / fo-dicom / itext7 / Pkcs11 vào một dịch vụ mở ra Internet |
| 3 | **DTO của BFF hẹp hơn DTO của HIS** | Chỉ mang ra ngoài những trường app thật sự hiển thị |
| 4 | **BFF tự áp phạm vi từng bệnh nhân** | HIS tin tài khoản dịch vụ, nên nếu BFF không tự giới hạn thì không còn ai giới hạn |
| 5 | **Chịu lỗi**: thử lại 2 lần với giãn cách tăng dần + ngắt mạch sau 5 lỗi trong 30 giây | HIS khởi động lại là chuyện thường; dội vào lúc nó đang sập chỉ làm nó chết lâu hơn |

## 2. Tài khoản dịch vụ

BFF gọi HIS bằng một **tài khoản dịch vụ** (`HisConnector:ServiceUsername`), tự đăng nhập qua
`POST /api/auth/login` và nhớ token trong 25 phút (token HIS sống 30 phút). Gặp 401 thì bỏ token và
thử lại đúng một lần.

> ⚠️ **Đây là tài sản nhạy cảm nhất của hệ thống**: tài khoản này nhìn được hồ sơ của MỌI bệnh nhân.
> Bắt buộc:
> - Cấp một **vai trò HIS riêng, quyền tối thiểu** — tuyệt đối không dùng lại tài khoản `admin`.
> - Mật khẩu đặt qua **biến môi trường / secret store**, không nằm trong file cấu hình được commit.
> - Mọi truy cập hồ sơ qua BFF đều ghi `access_audit_logs` (ai xem hồ sơ của ai, lúc nào).
>
> Cấu hình `appsettings.Development.json` đang dùng `admin/Admin@123` — **chỉ cho máy dev**.

## 3. Bảng đối chiếu — Phase 1

| Nghiệp vụ BFF | Phương thức `IHisConnector` | Route HIS được gọi | Ghi chú |
|---|---|---|---|
| Đăng nhập tài khoản dịch vụ | `HisServiceTokenProvider.GetTokenAsync` | `POST /api/auth/login` | Nhớ token, single-flight để nhiều request đồng thời chỉ đăng nhập một lần |
| Lấy hồ sơ theo Id | `GetPatientByIdAsync` | `GET /api/patients/{id}` | 404 → trả `null` |
| Lấy hồ sơ theo mã BN | `GetPatientByCodeAsync` | `GET /api/patients/by-code/{code}` | Dùng khi người bệnh nhập mã trên thẻ khám |
| Lấy hồ sơ theo CCCD | `GetPatientByIdentityAsync` | `GET /api/patients/by-identity/{identityNumber}` | Dùng cho luồng liên kết hồ sơ |
| Tìm theo số điện thoại | `FindPatientsByPhoneAsync` | `POST /api/patients/search` | ⚠️ HIS **không có** route theo SĐT (inventory §3). Search khớp mờ nhiều trường nên BFF **lọc lại đúng số** sau khi nhận kết quả — không lọc thì rất dễ gắn tài khoản vào **sai hồ sơ bệnh án** |
| Kiểm tra HIS còn sống | `PingAsync` | `GET /health` | Dùng cho `GET /health/ready` của BFF |

## 4. Quy tắc liên kết hồ sơ

Khi người bệnh nhập mã bệnh nhân lúc đăng ký, BFF **bắt buộc số điện thoại trên hồ sơ HIS phải khớp
số điện thoại đang đăng ký**. Không có ràng buộc này thì ai biết mã bệnh nhân của người khác cũng gắn
được hồ sơ đó vào tài khoản mình — và mã bệnh nhân được in ngay trên giấy tờ, không phải bí mật.

Khi không khớp, thông điệp trả về **không nói số điện thoại trên hồ sơ là gì** — đó cũng là rò rỉ.
Người bệnh được hướng dẫn ra quầy tiếp đón cập nhật.

## 5. Sẽ bổ sung theo phase

| Phase | Nghiệp vụ | Route HIS dự kiến | Gap phải vá ở HIS Core |
|---|---|---|---|
| 2 | Lấy STT ưu tiên | `POST /api/reception/queue/issue-mobile` | GAP 13 — bỏ hard-code `Priority = 0`; GAP 14 — thêm lý do ưu tiên |
| 2 | Trạng thái hàng đợi | `GET /api/reception/queue/display/{roomId}` | GAP 15 — thêm GET nhẹ theo `ticketId` |
| 2 | Đặt khám | `GET /api/booking/slots`, `POST /api/booking/book` | GAP 18 — slot phải đọc `DoctorSchedule`; GAP 20 — thêm đổi lịch |
| 3 | Kết quả XN / CĐHA / đơn thuốc | `GET /api/portal/lab-results`, `/imaging-results`, `/prescriptions` | GAP 22-24 — điền nốt `TestItems`, `ImageViewerUrl`, cầu nối PDF |
| 3 | Ảnh PACS | `GET /api/RISComplete/pacs/instances/{id}/rendered` | GAP 29-30 — route `instances` không tồn tại, `WadoRsUrl` trỏ route chết |
| 3 | Thăm dò chức năng | *chưa có* | GAP 25 — thêm endpoint portal cho TDCN |
| 3 | Khám sức khoẻ hợp đồng | *chưa có theo `patientId`* | GAP 27 — thêm `GetRecordsByPatientAsync` |
| 4 | Nội trú | *chưa có* | GAP 31-34 — liệt kê đợt nhập viện, công khai thuốc JSON, KQ theo `admissionId`, STT thực hiện CLS |
