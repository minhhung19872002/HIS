# Dịch vụ ngoài cần cấp thông tin

App bệnh nhân chạy được **end-to-end mà không cần một credential nào** — mọi dịch vụ ngoài đều có bản
giả bật sẵn ở môi trường phát triển (quyết định [D8](decisions.md)). Tài liệu này liệt kê thứ cần xin
để chuyển sang bản thật khi lên môi trường thật.

> **Nguyên tắc chống hớ:** bản giả **chỉ chạy khi cấu hình nói rõ**. Chạy ngoài `Development` mà thiếu
> cấu hình dịch vụ thật thì ứng dụng **ném lỗi lúc khởi động**, chứ không âm thầm rơi về bản giả. Một
> hệ thống y tế im lặng gửi OTP vào log là một hệ thống không ai biết là đang hỏng.

---

## 1. Gửi OTP qua SMS

| | |
|---|---|
| **Dùng cho** | Đăng ký tài khoản, quên mật khẩu, xác thực số điện thoại (HSMT I.2 #1, #9) |
| **Bản giả** | `LoggingOtpSender` — in mã ra log ứng dụng, chỉ đăng ký khi `ASPNETCORE_ENVIRONMENT=Development` |
| **Chỗ cắm bản thật** | `IOtpSender` trong `backend/src/HIS.PatientApp.Api/Services/` |
| **Chặn khởi động** | Có. Ngoài `Development` mà không có `IOtpSender` thật → ném lỗi ở `Program.cs` |

**Cần xin:**
- Nhà cung cấp SMS brandname (Viettel / VNPT / FPT / Twilio…) — bệnh viện thường đã có hợp đồng sẵn
  cho SMS nhắc lịch.
- Brandname đã đăng ký (ví dụ `BVXYZ`), API endpoint, `client_id` / `client_secret` hoặc API key.
- Hạn mức tin/ngày và chi phí mỗi tin — ảnh hưởng tới việc đặt trần chống lạm dụng.

**Đã có sẵn phía app:** giới hạn 5 lần xin OTP / 10 phút / IP, mã hết hạn sau 5 phút, lưu dạng băm
SHA-256 chứ không lưu mã gốc.

---

## 2. Thông báo đẩy — Firebase Cloud Messaging (Android) và APNs (iOS)

| | |
|---|---|
| **Dùng cho** | Nhắc lịch khám, báo có kết quả, thông báo từ bệnh viện (HSMT I.2 #7) |
| **Bản giả** | `DisabledPushSender` — bật khi `PushRelay:BaseUrl` để trống. Thông báo **vẫn vào hộp thư trong app**, chỉ không hiện ngoài màn hình khoá |
| **Bản thật** | `RelayPushSender` → gọi `HIS.PatientApp.Relay` đặt trên VPS công cộng → FCM |
| **Chặn khởi động** | Không. Thiếu push thì app vẫn dùng được, chỉ kém tiện |

**Cần xin / tạo:**

*Android*
- Dự án Firebase (Console → Add project) cho bệnh viện.
- `google-services.json` → đặt vào `mobile/patient_app/android/app/`.
- Service account JSON có quyền *Firebase Cloud Messaging API* → đặt trên VPS relay, đường dẫn khai ở
  `Fcm:CredentialsPath`.

*iOS*
- Tài khoản Apple Developer Program của bệnh viện (99 USD/năm — **cần cho cả việc phát hành App Store**).
- APNs Auth Key (.p8) + Key ID + Team ID → nạp vào Firebase Console để FCM đẩy hộ sang APNs.
- `GoogleService-Info.plist` → đặt vào `mobile/patient_app/ios/Runner/`.

**Kiến trúc đã chọn:** máy chủ HIS trong mạng nội bộ bệnh viện **không** gọi thẳng ra Internet. Bảng
`push_outbox` được `PushDispatcherWorker` đẩy sang relay trên VPS; chỉ relay cần ra Internet. Xem
`deploy/patient-app-vps/`.

---

## 3. Tài khoản dịch vụ để BFF gọi HIS

| | |
|---|---|
| **Dùng cho** | Mọi lời gọi từ BFF sang HIS Core |
| **Bản giả** | Không có. Thiếu là không tra cứu được gì |
| **Cấu hình** | `HisConnector:ServiceUsername` / `ServicePassword` |

**Cần tạo trong HIS:** một tài khoản riêng (ví dụ `svc_patientapp`), **không dùng chung với `admin`**,
chỉ gán quyền đọc danh mục + đặt lịch + cấp số. Cảnh báo chi tiết về phạm vi quyền:
[`his-connector-mapping.md`](his-connector-mapping.md).

---

## 4. Khoá ký JWT của app

| | |
|---|---|
| **Cấu hình** | `AppJwt:Key` |
| **Chặn khởi động** | Có. Ngoài `Development`, khoá rỗng hoặc ngắn hơn 32 ký tự → ném lỗi |

Sinh khoá: `openssl rand -base64 48`. Khoá này **khác** khoá JWT của HIS Core — hai hệ thống cấp token
độc lập, đổi khoá bên này không làm nhân viên bệnh viện bị đăng xuất.

---

## 5. Chứng chỉ HTTPS

| | |
|---|---|
| **Dùng cho** | Mọi lưu lượng app ↔ BFF |
| **Bản giả** | HTTP thuần ở môi trường phát triển |

Caddy trong `deploy/patient-app-vps/` tự xin Let's Encrypt khi trỏ đúng tên miền. Cần: một tên miền
(hoặc bản ghi con) trỏ về VPS, cổng 80/443 mở.

App bật **certificate pinning** ở bản phát hành; đổi chứng chỉ phải cập nhật hash trong app rồi phát
hành bản mới — xem `README.md` phần hardening.

---

## 6. Kho ứng dụng

| | Android | iOS |
|---|---|---|
| **Tài khoản** | Google Play Developer (25 USD, trả một lần) | Apple Developer Program (99 USD/năm) |
| **Cần thêm** | Keystore ký bản phát hành (giữ kỹ — mất là không cập nhật được app) | Certificate + Provisioning Profile |
| **Chính sách** | Khai báo *Data safety* | Khai báo *App Privacy* |

Cả hai kho đều bắt khai rõ **app thu thập dữ liệu sức khoẻ**. Cần chuẩn bị trang chính sách bảo mật có
địa chỉ công khai — checklist đầy đủ ở Phase 7.

---

## Bảng tra nhanh: thiếu gì thì hỏng gì

| Thiếu | Hậu quả | Chặn khởi động? |
|---|---|---|
| SMS gateway | Không đăng ký / quên mật khẩu được | Có (ngoài Development) |
| `AppJwt:Key` | Không đăng nhập được | Có (ngoài Development) |
| Tài khoản dịch vụ HIS | Mọi màn tra cứu trả 503 "chưa kết nối được bệnh viện" | Không |
| FCM / APNs | Không có thông báo ngoài màn khoá; hộp thư trong app vẫn chạy | Không |
| HTTPS | Lưu lượng không mã hoá — **không được phép chạy thật** | Không (phải tự kiểm) |
| Tài khoản kho ứng dụng | Không phát hành được | Không |
