# Bảng đối chiếu nghiệm thu — App Mobile Hỗ trợ Người bệnh

> **Dùng làm biên bản nghiệm thu.** Mỗi dòng trong bảng "Mô tả tính năng chi tiết" của HSMT
> (`docs/mobile/NangCapMobileApp.pdf`) → màn hình/API tương ứng → cách kiểm thử → trạng thái.
> **Tiêu chí bàn giao: 100% dòng phải "✅ Đạt".**
>
> Trạng thái: `⬜ Chưa làm` · `🔄 Đang làm` · `✅ Đạt` · `⚠️ Đạt có điều kiện` (ghi rõ điều kiện).
> Cập nhật cuối: **2026-09-08** (kết thúc Phase 0).
>
> 🔗 [`README.md`](README.md) (kế hoạch) · [`00-his-api-inventory.md`](00-his-api-inventory.md) (khảo sát; số GAP tham chiếu §11).

---

## I.1 — Module kết nối

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.1.1 | Toàn bộ hệ thống thiết kế theo công nghệ nhúng trên nền Linux, tích hợp bản quyền HĐH và CSDL — **hoặc công nghệ tương đương** | Docker trên Ubuntu LTS (giấy phép GPL/hợp lệ) + CSDL mã nguồn mở/có bản quyền hợp lệ; tài liệu đối chiếu `docs/architecture/operations/patient-app-equivalent-technology.md` | Xuất trình tài liệu đối chiếu + `docker version`, `lsb_release -a`, bản quyền CSDL trên máy chủ DC | 7 | ⬜ |
| I.1.2 | Hệ thống tích hợp module kết nối với HIS **dựa trên các API HIS cung cấp** | `IHisConnector` + `HisRestConnector` (HTTP tới HIS Core), tài liệu `his-connector-mapping.md` | Bật log connector, chứng minh mọi truy vấn nghiệp vụ đi qua HTTP API của HIS; tắt HIS Core → app báo lỗi có kiểm soát (circuit breaker) | 1 | ⬜ |

---

## I.2 — Module tính năng người dùng (app cho người bệnh)

### 1. Tải app trên App Store & Google Play

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.1.1 | Người dùng tải và cập nhật ứng dụng **đã được duyệt an toàn** từ App Store và Google Play | Bản phát hành trên 2 store; màn "Kiểm tra phiên bản & buộc cập nhật"; API `GET /app/config` (version gating) | Tải app từ store trên thiết bị thật (1 iOS, 1 Android); hạ version tối thiểu ở cấu hình → app buộc cập nhật | 7 | ⬜ |

### 2. Đăng nhập

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.2.1 | Đăng nhập / **giữ đăng nhập** trên app | Màn Đăng nhập; `POST /patient/auth/login`, `POST /patient/auth/refresh` | Đăng nhập → tắt app → mở lại sau > thời hạn access token → vẫn vào thẳng, không phải nhập lại (GAP 6) | 1 | ⬜ |
| I.2.2.2 | **Chạy ngầm** để nhận các thông báo từ máy chủ | FCM background handler + `flutter_local_notifications`; `POST /patient/devices/register-token`; relay VPS | Đóng app (background & killed) → gửi thông báo từ web quản trị → thiết bị hiện notification; chạm vào → deep-link đúng màn (GAP 11) | 1 | ⬜ |

### 3. Lấy số thứ tự

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.3.1 | Kết nối với HIS lấy **STT ưu tiên ngoại trú** | Màn "Lấy số thứ tự"; `POST /patient/queue/take-number` → HIS `POST /api/reception/queue/issue-mobile` (**đã sửa để nhận `Priority` + lý do ưu tiên** — GAP 13, 14) | Lấy số với hồ sơ thuộc diện ưu tiên → vé trả về `Priority = 1`, và ở màn lễ tân vé đó được gọi trước vé thường cùng phòng | 2 | ⬜ |
| I.2.3.2 | *(bổ trợ)* Xem số đang gọi, số người còn chờ, thời gian dự kiến | `GET /patient/queue/status/{ticketId}` (GAP 15) + `GET /api/reception/queue/display/{roomId}` | Lấy số → màn hiển thị đúng "đang gọi", "còn N người", "~M phút"; lễ tân gọi số → app cập nhật (GAP 16) | 2 | ⬜ |

### 4. Đặt khám

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.4.1 | Đặt lịch khám online trên app | Màn "Đặt khám" (chuyên khoa → bác sĩ → ngày → khung giờ → lý do → xác nhận); `GET /patient/appointments/slots` (**đọc `DoctorSchedule` thật** — GAP 18), `POST /patient/appointments` | Đặt 1 lịch → xuất hiện ở web quản trị và ở HIS; chọn ngày bác sĩ không trực → không có slot; huỷ/đổi lịch chạy được (GAP 20); nhận thông báo xác nhận + nhắc trước 1 ngày & 1 giờ | 2 | ⬜ |

### 5. Xem kết quả KCB — Ngoại trú

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.5.1 | **Khám thông thường** | Màn "Kết quả · Ngoại trú" → chi tiết lượt khám; `GET /patient/visits`, `GET /patient/visits/{id}` → HIS `api/portal/visits` | Mở 1 lượt khám → hiện chẩn đoán, sinh hiệu, kết luận, chỉ định | 3 | ⬜ |
| I.2.5.2 | **Khám sức khoẻ hợp đồng** | Tab "Khám sức khoẻ"; `GET /patient/health-checkups` → HIS **endpoint mới** `GET /api/health-checkup/patient/{patientId}` (GAP 27) | BN thuộc 1 đợt KSK → app hiện bản ghi khám + phân loại sức khoẻ + giấy chứng nhận | 3 | ⬜ |
| I.2.5.3 | **Kết quả xét nghiệm** | Bảng chỉ số + cờ bất thường; `GET /patient/lab-results`, `GET /patient/lab-results/{id}` (**điền `TestItems`** — GAP 22, 23) | Đối chiếu từng chỉ số (tên, giá trị, đơn vị, khoảng tham chiếu, cờ bất thường) với màn LIS của nhân viên → khớp 100% | 3 | ⬜ |
| I.2.5.4 | **Kết quả CĐHA cho người bệnh ngoại trú** | Chi tiết CĐHA: mô tả + kết luận; `GET /patient/imaging-results/{id}` (GAP 22, 23, 26) | Đối chiếu kết luận với phiếu KQ CĐHA của bác sĩ | 3 | ⬜ |
| I.2.5.5 | **Kết quả thăm dò chức năng** | Tab "Thăm dò chức năng"; `GET /patient/functional-results` → HIS **endpoint mới** (GAP 25) | Điện tim / siêu âm / nội soi hiện đủ kết luận + file đính kèm | 3 | ⬜ |
| I.2.5.6 | **Xem đơn thuốc trên app** | Màn "Đơn thuốc"; `GET /patient/prescriptions` → HIS `api/portal/prescriptions` (đã điền đủ) | Đối chiếu thuốc / liều / cách dùng / số ngày với đơn giấy | 3 | ⬜ |
| I.2.5.7 | **Xem hình ảnh PACS trên app** | WebView viewer + ảnh preview; `GET /patient/imaging-results/{id}/viewer-token` → proxy `api/RISComplete/pacs/instances/{id}/rendered` (GAP 22, 29, 30) | Mở 1 ca chụp có ảnh → xem được ảnh, cuộn được series; token hết hạn → không xem được nữa | 3 | ⬜ |
| I.2.5.8 | **Xem file kết quả xét nghiệm trên app** | PDF viewer trong app; `GET /patient/lab-results/{id}/pdf` (URL ký ngắn hạn, cầu nối `requestId` — GAP 24) | Mở PDF trong app, cuộn/zoom được; URL hết hạn → 403; đổi id sang BN khác → 403 | 3 | ⬜ |

### 6. Xem kết quả KCB — Nội trú

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.6.1 | **Kết quả xét nghiệm** (nội trú) | Màn "Kết quả · Nội trú" → đợt điều trị → XN; `GET /patient/admissions` (**endpoint mới** — GAP 31), `GET /patient/admissions/{id}/lab-results` (GAP 33) | Chọn 1 đợt nằm viện → hiện đúng các phiếu XN của đợt đó, không lẫn của đợt khác | 4 | ⬜ |
| I.2.6.2 | **Kết quả CĐHA cho người bệnh nội trú** | `GET /patient/admissions/{id}/imaging-results` (GAP 33) | Đối chiếu với phiếu CĐHA trong bệnh án | 4 | ⬜ |
| I.2.6.3 | **Kết quả thăm dò chức năng cho người bệnh nội trú** | `GET /patient/admissions/{id}/functional-results` (GAP 33) | Đối chiếu với phiếu TDCN trong bệnh án | 4 | ⬜ |
| I.2.6.4 | **Xem công khai thuốc** | Màn "Công khai thuốc" theo ngày; `GET /patient/admissions/{id}/medicine-disclosure` (**endpoint JSON mới**, tái dùng query của `PrintMedicineDisclosureAsync` — GAP 32) | Đối chiếu từng dòng (ngày, tên thuốc, ĐVT, SL, đơn giá, thành tiền, nguồn BHYT/viện phí) với bản in DD.09/BV-01 của khoa | 4 | ⬜ |
| I.2.6.5 | **Xem hình ảnh PACS trên app** (nội trú) | Dùng chung viewer của I.2.5.7 | Mở ca chụp thuộc đợt nội trú → xem được ảnh | 4 | ⬜ |
| I.2.6.6 | **Xem được chỉ định CLS nội trú và STT** | Màn "Chỉ định CLS"; `GET /patient/admissions/{id}/service-orders` **kèm STT thực hiện** (**bổ sung field** — GAP 34) | Mỗi chỉ định hiện đúng trạng thái (chờ / đang thực hiện / đã có KQ) **và số thứ tự thực hiện**; đối chiếu với phòng thực hiện | 4 | ⬜ |

### 7. Chức năng quản lý gia đình

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.7.1 | Kết nối **tối đa 20 thành viên** trong gia đình, truy cập xem được kết quả của các thành viên đó | Màn "Gia đình"; `GET/POST/DELETE /patient/family/members` (**giới hạn 20 + xác minh + phân quyền xem** — GAP 36) | Thêm đến thành viên thứ 21 → bị chặn với thông báo rõ ràng; chuyển sang thành viên đã liên kết → xem được kết quả của người đó; gỡ liên kết → mất quyền xem ngay | 5 | ⬜ |

### 8. Chức năng Ví giấy tờ

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.8.1 | Lưu lại các loại giấy tờ quan trọng của bệnh nhân trong quá trình khám, chữa bệnh | Màn "Ví giấy tờ" (CCCD, BHYT, giấy chuyển tuyến, giấy hẹn, giấy ra viện, toa thuốc, hoá đơn, khác); `POST /patient/documents` (multipart), `GET /patient/documents`, `GET /patient/documents/{id}` (URL ký), `DELETE` (GAP 37) | Chụp ảnh + chọn file PDF → lưu, xem lại, chia sẻ, xoá; kiểm **file được mã hoá at-rest** (đọc file thô trên đĩa không ra nội dung); vượt hạn mức dung lượng → bị chặn; giấy tờ HIS xuất ra (giấy hẹn, toa thuốc) tự vào ví | 5 | ⬜ |

### 9. Chức năng bảo mật

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.9.1 | **Đổi mật khẩu riêng khi đăng nhập lần đầu** | Màn "Đổi mật khẩu bắt buộc"; `PortalAccount.MustChangePassword` + middleware chặn mọi route trừ đổi MK/đăng xuất (GAP 8) | Tài khoản mới cấp → đăng nhập → bị đưa thẳng tới màn đổi MK; gọi thẳng API khác bằng token đó → **bị server chặn** (ẩn nút ≠ chặn API) | 1 | ⬜ |
| I.2.9.2 | **Tạo mã bảo mật** (PIN) | Màn "Tạo/đổi mã PIN"; `POST /patient/auth/pin` (GAP 9) | Đặt PIN 6 số → thoát app → mở lại yêu cầu PIN; nhập sai N lần → khoá theo chính sách | 1 | ⬜ |
| I.2.9.3 | **Sử dụng sinh trắc học của điện thoại để đăng nhập, xem bệnh án** | `local_auth` (FaceID/TouchID/vân tay) + device key ký challenge; `POST /patient/auth/biometric/*` (GAP 9) | Bật sinh trắc → đăng nhập bằng khuôn mặt/vân tay; mở màn bệnh án yêu cầu xác thực sinh trắc lại; tắt sinh trắc ở cài đặt máy → app quay về PIN/mật khẩu | 1 | ⬜ |
| I.2.9.4 | **Quản lý tất cả thiết bị đăng nhập** | Màn "Thiết bị"; `GET /patient/devices`, `DELETE /patient/devices/{id}`, `DELETE /patient/devices` (GAP 10, dùng `SecurityStamp` để thu hồi tức thì — GAP 4) | Đăng nhập trên 2 máy → cả 2 hiện trong danh sách (tên máy, HĐH, IP, lần cuối hoạt động); đăng xuất từ xa máy A trên máy B → **máy A mất phiên ngay lần gọi API kế tiếp** | 1 | ⬜ |

---

## I.3 — Module tính năng quản trị

### 1. Web server quản lý

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.3.1.1 | **Quản lý, phân quyền toàn bộ danh sách bệnh nhân** của bệnh viện | `/v2/patient-app/accounts`; API quản trị: DS tài khoản app, khoá/mở, reset mật khẩu, cấp quyền xem hồ sơ (GAP 38) | Khoá 1 tài khoản → app tài khoản đó bị chặn ngay; reset mật khẩu → lần đăng nhập kế tiếp bị buộc đổi MK | 6 | ⬜ |
| I.3.1.2 | **Dashboard thống kê cơ bản** | `/v2/patient-app/dashboard`: lượt tải/đăng ký, đăng nhập, đặt khám theo ngày/khoa, thông báo đã gửi/đã đọc, STT đã lấy | Đối chiếu số trên dashboard với truy vấn DB trực tiếp trong cùng khoảng thời gian | 6 | ⬜ |
| I.3.1.3 | **Quản lý đặt khám** | `/v2/patient-app/appointments` (duyệt/xác nhận/huỷ/đổi lịch, xem theo khoa/bác sĩ) — mở rộng `BookingManagementController` sẵn có | Xác nhận 1 lịch trên web → app BN nhận thông báo và thấy trạng thái đổi | 6 | ⬜ |
| I.3.1.4 | **Quản lý thông báo của bệnh viện đến app mobile của tất cả bệnh nhân** | `/v2/patient-app/notifications`: soạn, chọn đối tượng (tất cả / nhóm / cá nhân), hẹn giờ, mẫu thông báo, lịch sử, thống kê gửi/đọc (GAP 39) | Gửi broadcast → nhiều thiết bị nhận; gửi hẹn giờ → đúng giờ mới gửi; báo cáo hiển thị đúng số đã gửi / đã đọc | 6 | ⬜ |
| I.3.1.5 | **Quản lý nhóm gia đình** | `/v2/patient-app/families`: xem/duyệt/gỡ liên kết thành viên (GAP 40) | Gỡ 1 liên kết trên web → app mất quyền xem kết quả của thành viên đó ngay | 6 | ⬜ |

### 2. Module tra cứu

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.3.2.1 | **Cấp quyền cho nhân viên CSKH** hiển thị module tra cứu | `/v2/patient-app/staff-roles`: gán quyền tra cứu cho tài khoản nhân viên | Nhân viên chưa được cấp quyền → **không thấy** màn tra cứu trên cả app lẫn web; cấp quyền → thấy ngay sau khi đăng nhập lại | 6 | ⬜ |
| I.3.2.2 | Cung cấp thông tin cho người bệnh **trên điện thoại của nhân viên (app)** | Vai trò `staff` trong app Flutter: tìm BN theo mã BN/SĐT/CCCD/tên+ngày sinh (**bổ sung tra cứu theo SĐT và tên+ngày sinh** — inventory §3), xem STT/lịch hẹn/kết quả/đơn thuốc, hỗ trợ lấy số & đặt khám hộ, reset mật khẩu app | Nhân viên CSKH đăng nhập app bằng tài khoản HIS → tra được BN và trả lời được cả 4 nhóm câu hỏi; **mọi thao tác ghi audit log** (GAP 42) | 6 | ⬜ |
| I.3.2.3 | … **và trên web** | `/v2/patient-app/lookup` — module tra cứu tương ứng trên web | Cùng bộ kịch bản như I.3.2.2, thực hiện trên web | 6 | ⬜ |

---

## I.4 — Chứng chỉ số SSL

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.4.1 | Chứng chỉ số loại **DV SSL hoặc tương đương** | Let's Encrypt DV qua Caddy (tự gia hạn) cho: API gateway VPS, web quản trị, viewer PACS | `openssl s_client` / SSL Labs cho từng domain → chứng chỉ hợp lệ, chuỗi đầy đủ, TLS ≥ 1.2, không có nội dung hỗn hợp; chụp màn hình làm bằng chứng | 7 | ⬜ |

---

## II — Hệ thống truyền tải dữ liệu người dùng (VPS Cloud)

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| II.1 | Hệ thống truyền tải dữ liệu người dùng trên nền điện toán đám mây | VPS: Caddy (proxy + TLS) · notification-relay (FCM/APNs) · redis (hàng đợi). **Không lưu dữ liệu y tế** | Kiểm tra kho dữ liệu trên VPS chỉ chứa device token + nội dung thông báo; dừng VPS → dữ liệu y tế trong DC vẫn nguyên vẹn | 7 | ⬜ |
| II.2 | Cấu hình **SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core** | Bản kê cấu hình VPS thuê | `lsblk`/`df -h`, `free -m`, `nproc` trên VPS → đạt/vượt ngưỡng; đo RAM thực dùng của stack < 1.5GB | 7 | ⬜ |

---

## Ràng buộc chung

| # | Yêu cầu HSMT | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|
| C.1 | **Không giới hạn số lượng người dùng** app | Không có khoá cứng số tài khoản trong mã nguồn/giấy phép; đo tải với N người dùng đồng thời ở Phase 7 | 7 | ⬜ |
| C.2 | Hỗ trợ **iOS ≥ 12.0** | Project pin Flutter **3.32.8** qua FVM (`.fvmrc`) — bản stable cuối cùng còn target iOS 12.0. `ios/Runner.xcodeproj/project.pbxproj` và `ios/Flutter/AppFrameworkInfo.plist` đều ghi **12.0**. Nghiệm thu: mở Xcode xem Deployment Target = 12.0 + chạy thật trên simulator iOS 12 | 0 → 7 | ⚠️ |
| C.3 | Hỗ trợ **Android ≥ 7.2** | `minSdk = 25` (Android 7.1.1) tại `mobile/patient_app/android/app/build.gradle.kts:29`; build APK debug **PASS**. Nghiệm thu: chạy thật trên emulator API 25 | 0 → 7 | ⚠️ |

> **C.2 và C.3** đang là ⚠️ chứ chưa ✅ vì mới chứng minh **cấu hình và build** đạt ngưỡng; nâng lên ✅
> sau khi **chạy thật** trên simulator iOS 12 và emulator Android API 25 ở Phase 7.
>
> ⚠️ **Ràng buộc phát hành (quyết định Q3 — `README.md` §6.1):** lỗ IDOR ở `ExaminationCompleteController` /
> `LISCompleteController` / `PdfController` được xếp xử lý ở Phase 7. Cho tới khi vá xong, **không phát
> hành bản app nào tới người dùng thật** (kể cả TestFlight / internal testing / APK gửi tay), và môi
> trường dev-staging của app phải nằm sau VPN hoặc IP allow-list.
