# PROMPT CHO CLAUDE CODE — BUILD APP MOBILE FLUTTER "HỖ TRỢ NGƯỜI BỆNH" TÍCH HỢP HIS

> Copy toàn bộ nội dung dưới đây vào Claude Code (chạy trong thư mục gốc repo `HIS`).

---

## 0. BỐI CẢNH & MỤC TIÊU

Tôi có sẵn hệ thống HIS tại repo này (`minhhung19872002/HIS`):
- Backend .NET Clean Architecture (`backend/`), SQL Server, có SignalR, RIS/PACS (`deploy/pacs`), tài liệu ở `docs/`.
- Frontend web ở `frontend/`, demo `his-psi.vercel.app`.
- Quy ước làm việc của repo nằm trong `CLAUDE.md` và `.claude/skills/*` — **PHẢI đọc và tuân thủ** (đặc biệt: mọi `.md` phải nằm trong `docs/<nhóm>/`, không đặt MD ở root; trạng thái/roadmap dùng GitHub Issues).

Tôi cần xây dựng **ứng dụng di động (Flutter, iOS + Android) phục vụ quản lý, hỗ trợ người bệnh tại bệnh viện**, kết nối với HIS này qua API, kèm **web quản trị** cho nhân viên CSKH, để đáp ứng đầy đủ yêu cầu kỹ thuật của một gói thầu "Thuê phần mềm ứng dụng di động (app mobile) phục vụ công tác quản lý, hỗ trợ người bệnh". Yêu cầu chi tiết ở **Mục 2**. Đây là sản phẩm thương mại sẽ được nghiệm thu theo từng dòng yêu cầu, nên **không được bỏ sót tính năng nào** trong bảng yêu cầu.

Ràng buộc từ hồ sơ mời thầu (phải thiết kế đúng):
- Không giới hạn số lượng người dùng app.
- Hỗ trợ **iOS ≥ 12.0** và **Android ≥ 7.2** (API 25 — thực tế Android 7.1.1 là API 25; đặt `minSdkVersion 25`; iOS deployment target 12.0).
- **Mục I** (phần mềm app + module kết nối + module người dùng + module quản trị + SSL): máy chủ đặt tại **Data center của Bệnh viện**.
- **Mục II** (hệ thống truyền tải dữ liệu người dùng): triển khai trên **VPS Cloud** (SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core) — đóng vai trò gateway công khai + relay push notification, KHÔNG lưu dữ liệu y tế.
- Module kết nối: "thiết kế theo công nghệ nhúng trên nền Linux tích hợp bản quyền HĐH và CSDL **hoặc công nghệ tương đương**" → dùng **Docker trên Linux (Ubuntu/Debian) + PostgreSQL** cho phần mobile backend (mã nguồn mở, có bản quyền hợp lệ), để đáp ứng vế "tương đương". Ghi rõ điều này trong tài liệu kiến trúc.
- Chứng chỉ số **DV SSL** (Let's Encrypt hoặc tương đương) cho toàn bộ endpoint công khai.

---

## 1. CÁCH LÀM VIỆC (BẮT BUỘC)

1. **Bước 1 — Khảo sát trước khi code.** Đọc `CLAUDE.md`, `docs/README.md`, `docs/architecture/ARCHITECTURE.md`, `PROJECT_STRUCTURE.md`, `MODULE_MAP.md`, `API_FLOW.md`, `docs/architecture/codebase-map.md`, `docs/requirements/ris-pacs-2026.md`, `docs/workspace-docs/STATUS.md`. Sau đó rà soát `backend/` để liệt kê **các API/Entity/Service HIS đã có** liên quan đến: bệnh nhân, tiếp đón/số thứ tự (STT), lịch hẹn/đặt khám, khám ngoại trú, khám sức khỏe hợp đồng, nội trú (bệnh án, chỉ định CLS, công khai thuốc), kết quả xét nghiệm (LIS), CĐHA/PACS (RIS, DICOM/WADO, URL viewer), thăm dò chức năng, đơn thuốc, SignalR hub, auth/JWT, phân quyền. Xuất kết quả khảo sát ra `docs/features/patient-app/00-his-api-inventory.md` dạng bảng: *Nghiệp vụ → Endpoint/Service hiện có → Thiếu gì → Cần bổ sung gì*.
2. **Bước 2 — Lập kế hoạch** trong `docs/features/patient-app/README.md` (theo convention `his-doc-feature`: README + analysis + test-plan + test-guide + workflow-test + summary) và tạo GitHub Issues cho từng phase. Trình bày kế hoạch cho tôi duyệt **trước khi code**.
3. **Bước 3 — Triển khai theo phase** (Mục 6). Cuối mỗi phase: chạy test, cập nhật `STATUS.md`, đóng issue, báo cáo lại.
4. Ưu tiên **tái sử dụng** Domain/Application layer của HIS; không nhân bản logic nghiệp vụ. Không sửa phá vỡ API hiện có (chỉ thêm, hoặc mở rộng có backward-compat).
5. Mọi tính năng phải có **acceptance checklist** bám đúng bảng yêu cầu ở Mục 2 (dùng làm biên bản nghiệm thu).
6. Ngôn ngữ UI: **tiếng Việt** mặc định, có sẵn i18n (`intl`/ARB) để thêm tiếng Anh.

---

## 2. YÊU CẦU CHỨC NĂNG (nguồn: bảng "Mô tả tính năng chi tiết" trong HSMT)

### I.1 Module kết nối
- Hệ thống (phần mềm + hạ tầng) chạy trên Linux, tích hợp bản quyền HĐH & CSDL (hoặc tương đương — xem Mục 0).
- Tích hợp module kết nối với HIS dựa trên **các API HIS cung cấp**.

### I.2 Module tính năng người dùng (app cho người bệnh)

| # | Phân hệ chính | Phân hệ con (bắt buộc) |
|---|---|---|
| 1 | Tải app trên App Store & Google Play | Người dùng tải và cập nhật app đã được duyệt từ App Store / Google Play. |
| 2 | Đăng nhập | Đăng nhập / **giữ đăng nhập** trên app. **Chạy ngầm** để nhận thông báo từ máy chủ (push notification). |
| 3 | Lấy số thứ tự | Kết nối HIS lấy **STT ưu tiên ngoại trú**. |
| 4 | Đặt khám | Đặt lịch khám online trên app. |
| 5 | Xem KQ KCB **ngoại trú** | Khám thông thường; Khám sức khoẻ hợp đồng; Kết quả xét nghiệm; Kết quả CĐHA ngoại trú; Kết quả thăm dò chức năng; **Xem đơn thuốc**; **Xem hình ảnh PACS** trên app; **Xem file kết quả xét nghiệm** (PDF) trên app. |
| 6 | Xem KQ KCB **nội trú** | Kết quả xét nghiệm; Kết quả CĐHA nội trú; Kết quả TDCN nội trú; **Xem công khai thuốc**; Xem hình ảnh PACS; **Xem chỉ định CLS nội trú và STT** (số thứ tự thực hiện CLS). |
| 7 | Quản lý gia đình | Kết nối **tối đa 20 thành viên** trong gia đình, truy cập xem được kết quả của các thành viên đó. |
| 8 | Ví giấy tờ | Lưu lại các loại giấy tờ quan trọng của bệnh nhân trong quá trình KCB (CCCD, thẻ BHYT, giấy chuyển tuyến, giấy hẹn, giấy ra viện, toa thuốc, hóa đơn... — ảnh/PDF). |
| 9 | Bảo mật | Đổi mật khẩu riêng khi **đăng nhập lần đầu**; tạo **mã bảo mật** (PIN); dùng **sinh trắc học** của điện thoại (FaceID/TouchID/vân tay) để đăng nhập, xem bệnh án; **Quản lý tất cả thiết bị đăng nhập** (xem danh sách, đăng xuất từ xa). |

### I.3 Module tính năng quản trị (web cho nhân viên quản lý & CSKH)

| # | Phân hệ chính | Phân hệ con (bắt buộc) |
|---|---|---|
| 1 | Web server quản lý | Quản lý, **phân quyền toàn bộ danh sách bệnh nhân** của bệnh viện (tài khoản app, khóa/mở, reset mật khẩu, cấp quyền xem hồ sơ). **Dashboard thống kê cơ bản** (lượt tải/đăng ký, đăng nhập, đặt khám theo ngày/khoa, thông báo đã gửi/đã đọc, STT đã lấy). **Quản lý đặt khám** (duyệt/xác nhận/hủy/đổi lịch, xem lịch theo khoa/bác sĩ). **Quản lý thông báo** của bệnh viện đến app của **tất cả** bệnh nhân (gửi broadcast/theo nhóm/theo cá nhân, hẹn giờ, mẫu thông báo, lịch sử). **Quản lý nhóm gia đình** (xem/duyệt/gỡ liên kết thành viên). |
| 2 | Module tra cứu | **Cấp quyền cho nhân viên CSKH** hiển thị module tra cứu để cung cấp cho người bệnh các thông tin **trên điện thoại của nhân viên (app) và trên web** — tức app có thêm vai trò "Nhân viên" với màn tra cứu bệnh nhân/kết quả/lịch/STT, và web cũng có module tra cứu tương ứng. |

### I.4 Chứng chỉ số SSL
- DV SSL hoặc tương đương cho mọi domain công khai (API gateway, web quản trị, viewer PACS).

### II. Hệ thống truyền tải dữ liệu người dùng (VPS Cloud)
- Dịch vụ trên cloud: gateway công khai (reverse proxy + TLS), relay push notification (FCM/APNs), hàng đợi thông báo. Cấu hình tối thiểu SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core → toàn bộ stack trên VPS phải chạy gọn trong giới hạn này.

---

## 3. KIẾN TRÚC ĐỀ XUẤT (điều chỉnh sau khi khảo sát nếu có lý do tốt hơn)

```
[App Flutter (iOS/Android)]  [Web quản trị (React)]
            │                          │
            ▼  HTTPS (DV SSL)          ▼
┌──────────── VPS CLOUD (Mục II) ────────────┐
│  Nginx/Caddy reverse proxy + TLS termination │
│  Notification Relay (FCM/APNs sender, queue) │
│  KHÔNG lưu dữ liệu y tế; chỉ token/thông báo │
└──────────────────┬──────────────────────────┘
                   │ VPN/WireGuard hoặc mTLS
┌──────────── DATA CENTER BỆNH VIỆN (Mục I) ──────────┐
│  HIS.PatientApp.Api (BFF .NET, Docker/Linux)        │
│   ├─ Auth riêng cho bệnh nhân (JWT + refresh, OTP)   │
│   ├─ HIS Connector (gọi API HIS hiện có / Application layer) │
│   ├─ PostgreSQL: tài khoản app, thiết bị, gia đình,  │
│   │   ví giấy tờ (metadata), thông báo, lịch đặt khám│
│   ├─ MinIO/local storage: file ví giấy tờ (mã hóa)   │
│   └─ SignalR/Outbox → Notification Relay             │
│  HIS Core API (.NET hiện có) + SQL Server + PACS/LIS │
└──────────────────────────────────────────────────────┘
```

Quyết định kỹ thuật:
- **Backend mobile = project mới `backend/src/HIS.PatientApp.Api`** (hoặc theo đúng convention thư mục của repo) trong cùng solution, tham chiếu `Application`/`Domain` của HIS để tái dùng use case; phần dữ liệu riêng của app (tài khoản, thiết bị, gia đình, ví giấy tờ, thông báo) dùng **DbContext riêng trên PostgreSQL**, không đụng schema HIS. Nếu cấu trúc repo cho thấy nên tách repo riêng, đề xuất và chờ tôi duyệt.
- Kết nối HIS qua **HIS Connector interface** (`IHisConnector`) với implementation gọi REST API HIS hiện có — để sau này thay HIS khác chỉ cần viết connector mới (đúng tinh thần "dựa trên các API HIS cung cấp").
- Push notification: **Firebase Cloud Messaging** (Android + iOS qua APNs). Backend ghi thông báo vào bảng `notifications` + outbox → relay trên VPS gửi FCM. App chạy ngầm nhận thông báo (background handler), lưu inbox thông báo trong app.
- Sự kiện realtime từ HIS (có kết quả XN/CĐHA, đến lượt STT, xác nhận lịch): bắt từ SignalR hub / domain events hiện có của HIS → tạo notification.
- Xem PACS trên app: dùng URL viewer của PACS hiện có (`deploy/pacs`, OHIF/WADO) nhúng qua **WebView có token ngắn hạn**, hoặc render ảnh preview (JPEG/WADO-RS rendered) trong app. Khảo sát `docs/requirements/ris-pacs-2026.md` để chọn cách phù hợp.
- File kết quả XN (PDF) và đơn thuốc: BFF stream file có ký URL, app hiển thị bằng `pdfx`/`syncfusion_flutter_pdfviewer` hoặc `flutter_pdfview`.
- Web quản trị: **React + TypeScript** (giữ cùng stack với `frontend/`), đặt tại `frontend/` như một module/route mới **hoặc** `admin-patient-app/` riêng — chọn theo cấu trúc `frontend/` hiện tại và giải thích.
- Module tra cứu cho nhân viên: **cùng codebase Flutter**, phân vai trò `patient` / `staff` theo JWT claim; nhân viên đăng nhập bằng tài khoản HIS (SSO qua HIS auth), chỉ thấy màn tra cứu khi được cấp quyền trên web quản trị.

---

## 4. YÊU CẦU CHI TIẾT CHO APP FLUTTER

### 4.1 Cấu trúc & công nghệ
- Flutter stable mới nhất, Dart null-safety. Thư mục `mobile/patient_app/` trong repo.
- Kiến trúc **Clean Architecture + feature-first**: `lib/core/` (network, storage, theme, router, l10n, error), `lib/features/<feature>/{data,domain,presentation}`.
- State management: **Riverpod** (hoặc Bloc — chọn 1, nhất quán). Routing: `go_router`. HTTP: `dio` + interceptor (JWT, refresh token, retry, logging). Code-gen: `freezed` + `json_serializable`. Lưu bảo mật: `flutter_secure_storage`. Sinh trắc học: `local_auth`. Push: `firebase_messaging` + `flutter_local_notifications`. Ảnh/tài liệu: `image_picker`, `file_picker`, `flutter_image_compress`. PDF: viewer phù hợp. WebView: `webview_flutter`. Thông tin thiết bị: `device_info_plus`, `package_info_plus`. Cache: `hive`/`drift` cho offline đọc lại kết quả đã tải.
- `flavors`: `dev` / `staging` / `prod` với base URL, Firebase config riêng.
- `minSdkVersion 25`, iOS deployment target 12.0. Kiểm tra mọi package đã chọn có hỗ trợ iOS 12 / Android 7.x; nếu không, chọn package thay thế.

### 4.2 Danh sách màn hình (phải đủ)
1. **Onboarding & Đăng nhập**: đăng nhập bằng SĐT + mật khẩu (tài khoản do bệnh viện cấp/đăng ký tại quầy hoặc tự đăng ký + OTP SMS/Zalo — thiết kế OTP provider dạng interface, mock trước); ghi nhớ đăng nhập (refresh token dài hạn); **bắt buộc đổi mật khẩu ở lần đăng nhập đầu**; tạo mã PIN 6 số; bật sinh trắc học; quên mật khẩu.
2. **Trang chủ**: thẻ bệnh nhân (mã BN, QR), thành viên gia đình đang chọn (switcher), lối tắt: Lấy STT, Đặt khám, Kết quả, Đơn thuốc, Ví giấy tờ, Thông báo (badge chưa đọc).
3. **Lấy số thứ tự**: chọn thành viên, chọn phòng khám/khoa (từ HIS), lấy STT ưu tiên ngoại trú; hiển thị STT, số đang gọi, số người chờ, thời gian dự kiến; cập nhật realtime (SignalR/push); QR STT để check-in tại quầy; lịch sử STT.
4. **Đặt khám online**: chọn thành viên → chuyên khoa → bác sĩ/phòng → ngày → khung giờ còn trống (từ HIS) → lý do khám → xác nhận; xem/hủy/đổi lịch; nhận thông báo xác nhận/nhắc lịch (trước 1 ngày, 1 giờ).
5. **Kết quả KCB — Ngoại trú**: danh sách lượt khám (lọc theo thời gian, loại: khám thông thường / KSK hợp đồng); chi tiết lượt: chẩn đoán, chỉ định, **kết quả XN** (bảng chỉ số + cờ bất thường + **file PDF**), **kết quả CĐHA** (kết luận + **xem ảnh PACS**), **kết quả TDCN** (điện tim, siêu âm, nội soi… + file), **đơn thuốc** (thuốc, liều, cách dùng, số ngày; nút "nhắc uống thuốc" tùy chọn).
6. **Kết quả KCB — Nội trú**: danh sách đợt điều trị; chi tiết: khoa/giường, **chỉ định CLS nội trú + STT thực hiện** (trạng thái chờ/đang/đã có KQ), kết quả XN / CĐHA (PACS) / TDCN nội trú, **công khai thuốc** theo ngày (thuốc, số lượng, đơn giá, thành tiền, BHYT chi trả) — bám mẫu công khai thuốc/ vật tư theo quy định BYT.
7. **Quản lý gia đình**: thêm thành viên bằng mã BN + xác thực (OTP số điện thoại thành viên hoặc mã do quầy cấp, hoặc CCCD + ngày sinh + xác nhận từ CSKH), **giới hạn 20 thành viên**, phân quyền xem (toàn bộ/chỉ lịch hẹn), gỡ liên kết, chuyển quyền chủ hộ; trẻ em không có SĐT → liên kết qua người giám hộ.
8. **Ví giấy tờ**: danh mục giấy tờ (CCCD, BHYT, giấy chuyển tuyến, giấy hẹn, giấy ra viện, kết quả cũ, hóa đơn, khác); chụp ảnh/chọn file/quét (crop, nén); gắn với thành viên; xem, chia sẻ, xóa; **mã hóa khi lưu**, dung lượng giới hạn cấu hình được; tự động đưa giấy tờ HIS xuất ra (giấy hẹn, giấy ra viện, toa thuốc PDF) vào ví.
9. **Thông báo**: inbox thông báo (hệ thống / kết quả / lịch hẹn / bệnh viện), đánh dấu đã đọc, deep-link vào màn liên quan.
10. **Bảo mật & tài khoản**: đổi mật khẩu, đổi PIN, bật/tắt sinh trắc học, khóa xem bệnh án bằng sinh trắc/PIN, **danh sách thiết bị đăng nhập** (tên máy, HĐH, lần cuối hoạt động, IP) + đăng xuất từ xa từng thiết bị / tất cả, lịch sử đăng nhập; xóa tài khoản (theo yêu cầu store).
11. **Tra cứu (vai trò nhân viên CSKH)**: đăng nhập bằng tài khoản HIS; tìm bệnh nhân theo mã BN/SĐT/CCCD/tên+ngày sinh; xem STT, lịch hẹn, kết quả, đơn thuốc, trạng thái tài khoản app; hỗ trợ đặt khám / lấy STT hộ; reset mật khẩu app cho BN (theo quyền); mọi thao tác ghi audit log.
12. Tiện ích: thông tin bệnh viện, hướng dẫn, hotline, bản đồ khoa phòng (tùy chọn), kiểm tra phiên bản & buộc cập nhật.

### 4.3 UX/Phi chức năng
- Thiết kế Material 3, hỗ trợ dark mode, font chữ lớn (accessibility), tối ưu cho người cao tuổi.
- Skeleton loading, pull-to-refresh, empty/error state có hướng dẫn, offline cache kết quả đã xem.
- Chặn screenshot ở màn bệnh án (Android `FLAG_SECURE`; iOS cảnh báo), auto-lock sau N phút, ẩn nội dung khi app ở background.
- Certificate pinning (tùy chọn theo cấu hình), không log dữ liệu y tế, xóa cache khi đăng xuất.
- Kiểm tra root/jailbreak → cảnh báo.
- Test: unit test cho domain/data, widget test cho màn chính, golden test cho vài màn, integration test luồng đăng nhập → lấy STT → xem kết quả.

---

## 5. YÊU CẦU CHI TIẾT CHO BACKEND (BFF) & WEB QUẢN TRỊ

### 5.1 API BFF (`/api/v1/patient/...`, `/api/v1/staff/...`, `/api/v1/admin/...`)
- **Auth**: register/OTP, login, refresh, logout, change-password (force on first login), set/verify PIN, biometric-binding (device key), devices list/revoke, login history.
- **Profile**: thông tin BN (từ HIS), QR mã BN.
- **Queue**: departments/rooms, take-number (priority outpatient), current-status, history; realtime qua SignalR hub `/hubs/queue` + push.
- **Appointments**: specialties, doctors, slots, create/cancel/reschedule, list, reminders.
- **Outpatient**: visits, visit-detail, lab-results (+ PDF), imaging-results (+ PACS viewer token/URL), functional-exploration results, prescriptions.
- **Inpatient**: admissions, detail, orders (CLS) + queue number, lab/imaging/FE results, drug-disclosure by day.
- **Family**: members (max 20), invite/verify, permissions, remove.
- **Documents (wallet)**: upload (multipart, virus-scan hook), list, download (signed URL), delete; storage encryption at rest.
- **Notifications**: inbox, mark read, register FCM token, preferences.
- **Staff lookup**: search patient, view summaries, act-on-behalf (take number, book), audit.
- **Admin**: patient accounts CRUD/lock/reset/permissions, appointments management, notification campaigns (broadcast/segment/individual/scheduled/templates/report), family groups management, staff role assignment, dashboard stats, audit logs, app config (version gating, hospital info).
- Chuẩn: OpenAPI/Swagger, versioning, RFC7807 error, rate limit, idempotency cho take-number/booking, audit log mọi truy cập hồ sơ (ai xem hồ sơ của ai, lúc nào — yêu cầu bảo mật dữ liệu y tế).
- **HIS Connector**: interface `IHisConnector` + impl `HisRestConnector` gọi API HIS hiện có; cache danh mục; circuit breaker (Polly); mapping DTO rõ ràng; tài liệu mapping ở `docs/features/patient-app/his-connector-mapping.md`. Nếu HIS thiếu endpoint (ví dụ: slot đặt khám, STT ưu tiên, công khai thuốc, STT CLS nội trú), **bổ sung endpoint vào HIS Core** theo Clean Architecture của repo, có test, và ghi vào inventory.

### 5.2 Web quản trị (React)
- Đăng nhập bằng tài khoản HIS (SSO), phân quyền vai trò: Admin app / CSKH / Xem.
- Màn: Dashboard; Bệnh nhân & tài khoản app; Đặt khám; Thông báo (soạn, chọn đối tượng, hẹn giờ, mẫu, thống kê gửi/đọc); Nhóm gia đình; Tra cứu (cho CSKH); Nhân viên & phân quyền; Nhật ký (audit); Cấu hình.

### 5.3 Hạ tầng & DevOps
- `docker-compose` cho DC bệnh viện: `patientapp-api`, `postgres`, `minio` (tùy chọn), kết nối tới HIS API/PACS nội bộ.
- `docker-compose` cho VPS: `caddy` (auto Let's Encrypt DV SSL) hoặc `nginx + certbot`, `notification-relay`, `redis` (queue) — tổng RAM footprint < 1.5GB.
- Kết nối VPS ↔ DC: WireGuard hoặc mTLS; tài liệu runbook trong `docs/architecture/operations/patient-app-deploy.md`.
- CI GitHub Actions: build/test backend, build Flutter (APK/AAB + iOS archive khi có cert), lint. Tài liệu phát hành App Store / Google Play (checklist metadata, privacy, quyền, xóa tài khoản).
- Backup PostgreSQL + ví giấy tờ; chính sách retention; log tập trung.

---

## 6. LỘ TRÌNH THỰC HIỆN (mỗi phase là 1 GitHub Issue/milestone, làm xong báo cáo mới sang phase tiếp)

| Phase | Nội dung | Đầu ra |
|---|---|---|
| 0 | Khảo sát HIS + kế hoạch + skeleton (Flutter project, BFF project, admin web, docker) | inventory.md, README.md, issues, build xanh |
| 1 | Auth + bảo mật + thiết bị + push notification (relay VPS) | Đăng nhập, đổi MK lần đầu, PIN, sinh trắc, quản lý thiết bị, nhận push khi chạy ngầm |
| 2 | Lấy STT + Đặt khám + realtime | Hai luồng hoàn chỉnh end-to-end với HIS |
| 3 | Kết quả ngoại trú (XN + PDF, CĐHA + PACS, TDCN, đơn thuốc, KSK hợp đồng) | Đầy đủ mục I.2 #5 |
| 4 | Kết quả nội trú (CLS + STT, XN/CĐHA/TDCN, công khai thuốc) | Đầy đủ mục I.2 #6 |
| 5 | Gia đình (20 thành viên) + Ví giấy tờ + Inbox thông báo | Đầy đủ I.2 #7, #8 |
| 6 | Web quản trị + Module tra cứu (web & app vai trò nhân viên) | Đầy đủ I.3 |
| 7 | Hardening, SSL, deploy VPS + DC, test tải, tài liệu HDSD, checklist nghiệm thu, chuẩn bị store | Bàn giao |

---

## 7. TIÊU CHÍ NGHIỆM THU

- Bảng đối chiếu `docs/features/patient-app/acceptance-matrix.md`: mỗi dòng ở Mục 2 → màn hình/API tương ứng → cách kiểm thử → trạng thái. **100% dòng phải "Đạt"**.
- App chạy được trên iOS 12 simulator/thiết bị và Android 7.x emulator (API 25) ngoài các bản mới.
- Toàn bộ endpoint công khai chạy HTTPS với chứng chỉ hợp lệ.
- Tài liệu: kiến trúc, mapping HIS connector, runbook deploy, hướng dẫn sử dụng (người bệnh + CSKH + quản trị), tài liệu đối chiếu "công nghệ tương đương" cho mục I.1.

---

## 8. QUY TẮC KHI LÀM

- Hỏi tôi khi có quyết định lớn (tách repo, đổi stack, thay đổi schema HIS). Còn lại tự quyết và ghi rõ lý do trong doc.
- Không mock vĩnh viễn: mọi mock (OTP, FCM, PACS) phải có interface + impl thật hoặc TODO issue rõ ràng.
- Commit nhỏ, message theo convention của repo; không commit secret; dùng `.env.example`.
- Mỗi lần kết thúc phiên: cập nhật `docs/workspace-docs/STATUS.md` theo đúng quy ước repo.

Bắt đầu từ **Phase 0**: đọc tài liệu repo, khảo sát API HIS, rồi trình kế hoạch cho tôi duyệt.
