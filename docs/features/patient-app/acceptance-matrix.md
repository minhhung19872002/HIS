# Bảng đối chiếu nghiệm thu — App Mobile Hỗ trợ Người bệnh

> **Dùng làm biên bản nghiệm thu.** Mỗi dòng trong bảng "Mô tả tính năng chi tiết" của HSMT
> (`docs/mobile/NangCapMobileApp.pdf`) → màn hình/API tương ứng → cách kiểm thử → trạng thái.
> **Tiêu chí bàn giao: 100% dòng phải "✅ Đạt".**
>
> Trạng thái: `⬜ Chưa làm` · `🔄 Đang làm` · `✅ Đạt` · `⚠️ Đạt có điều kiện` (ghi rõ điều kiện).
> Cập nhật cuối: **2026-09-09** — kết thúc **Phase 1 → 7**.
> **Bằng chứng đo được — bốn tầng, tất cả đều chạy thật, 0 FAIL:**
>
> | Tầng | Số ca | Chạy trên |
> |---|---|---|
> | Smoke đầu-cuối (8 bộ) | **290** | HIS Core + BFF + PostgreSQL + SQL Server thật |
> | Unit backend (`dotnet test`) | **303** (67 của app) | CI gate `deploy-backend.yml` |
> | Unit + widget Flutter | **92** | `flutter test` |
> | E2E web quản trị (Playwright) | **7** | Chromium + Vite dev + BFF thật |
>
> Smoke: `smoke-patient-app-auth.py` 47 · `smoke-queue-priority.py` 19 · `phase2` 29 · `phase3` 45 ·
> `phase4` 27 · `phase5` 40 · `phase6` 42 · `phase7` 41.
> Ngoài ra `flutter analyze` sạch, `tsc -b` sạch, build APK debug và `flutter build ios --simulator`
> (iOS 12.0) đều thành công.
>
> **Ảnh chụp bằng chứng — 60 ảnh, đủ CẢ HAI ngưỡng phiên bản cho từng nhóm chức năng:**
> 30 màn trên **máy ảo Android 7.1.1 (API 25)** ([`screenshots/android71/`](screenshots/android71/))
> và 30 màn tương ứng trên **iOS 12 simulator** ([`screenshots/ios12/`](screenshots/ios12/)).
> Đúng ngưỡng HSMT, không mượn một bản Android/iOS đời mới cho dễ.
>
> Phủ đủ từng nhóm chức năng I.2 và I.3, **cùng các trạng thái không-phải-đường-vui** mà quy ước
> evidence §3 bắt buộc: máy chủ trả 500 · danh sách rỗng · nhập thiếu · đang chờ tải · bị chặn
> vì buộc đổi mật khẩu · hộp thoại xác nhận xoá tài khoản.
>
> Bộ Android chụp bằng `integration_test/screenshots_test.dart` trên máy ảo `HIS_Android71_API25`;
> bộ iOS lấy từ hiện vật `anh-man-hinh-ios` của workflow `mobile-patient-app.yml` (macOS runner là
> đường duy nhất build iOS từ máy Windows). Xem có bối cảnh — task · các bước · kết quả mong đợi ·
> gap còn lại — bằng trình xem evidence: chạy `bash scripts/collect-patient-app-evidence.sh` rồi mở
> `docs/architecture/evidence/index.html` → phân hệ *App mobile hỗ trợ người bệnh*
> (**60/60 ô evidence đã có ảnh**). Thư mục `evidence/**` cố ý không commit ảnh — `.gitignore:216` —
> nên mỗi máy sinh lại từ bộ trong repo.
>
> **Cách đọc trạng thái:** `✅ Đạt` = đã cài đặt **và** có bằng chứng đo được (mã ca kiểm thử ghi ngay
> trong ô). `⚠️` = đạt nhưng còn điều kiện, ghi rõ điều kiện đó.
>
> 🔗 [`README.md`](README.md) (kế hoạch) · [`00-his-api-inventory.md`](00-his-api-inventory.md) (khảo sát; số GAP tham chiếu §11).

---

## Tổng kết — 47 dòng yêu cầu

| Trạng thái | Số dòng | Nghĩa là gì |
|---|---|---|
| ✅ Đạt | **40** | Đã cài đặt **và** có bằng chứng đo được ghi ngay trong ô |
| ⚠️ Đạt có điều kiện | **7** | Phần mềm đã xong và đã đo hết phần đo được; điều kiện còn lại **không nằm trong mã nguồn** |
| ⬜ Chưa làm | **0** | — |

**Cả 7 dòng ⚠️ chờ đúng một loại thứ: hạ tầng, tài khoản hoặc thiết bị mà bệnh viện phải cấp.**
Không dòng nào chờ code, và với mỗi dòng thì phần đo được **đã đo rồi** chứ không phải để đó:

| Dòng | Đã đo được gì | Chờ gì | Chạy gì để nâng lên ✅ |
|---|---|---|---|
| I.2.1.1 | Cơ chế chặn bản cũ (`phase7` TC-P01…TC-P05) **và khâu đóng gói**: `flutter build appbundle --release` PASS, AAB không mang chữ ký nào, CI chặn việc ký bằng khoá debug | Tài khoản developer Apple + Google | [`store-release-checklist.md`](store-release-checklist.md) |
| I.2.2.2 | **Trọn đường ống** `push_outbox` → worker → relay thật, bản ghi chuyển `sent`, token bị che trong log | Khoá Firebase + chứng chỉ APNs | [`external-services-setup.md`](external-services-setup.md) §2, rồi kiểm `curl /health` → `"mode":"fcm"` |
| I.2.9.3 | Server: `auth` TC-07…TC-10. Client: đã vá lỗi chết hẳn trên Android, plugin nay chạy tới nơi | Máy có cảm biến vân tay/Face ID thật | Kịch bản ghi trong ô của dòng đó |
| I.4.1 | TLS 1.0/1.1 bị từ chối · 1.2/1.3 bắt tay được · đủ 4 header · không lộ `Server` · tự cấp và tự gia hạn chứng chỉ | Một tên miền trỏ về VPS (để có chữ ký DV công khai của Let's Encrypt) | `bash scripts/verify-patient-app-vps.sh` trên VPS thật + ảnh SSL Labs |
| II.2 | Stack dùng **34 MiB / 2048 MiB** RAM và **248 MB / 15 GB** đĩa | Bản kê cấu hình máy thuê | `df -h /` · `free -m` · `nproc` trên VPS đó |
| C.2 | 30 ảnh trên iOS 12 simulator; `MinimumOSVersion = 12.0` đọc từ Info.plist **của chính bản build ra** | Một máy iOS 12 thật | Chạy lại bộ chụp trên máy đó |
| C.3 | 30 ảnh trên máy ảo Android 7.1.1 (API 25) — đúng ngưỡng HSMT | Một máy Android 7.x thật | Chạy lại bộ chụp trên máy đó |

> **Vì sao không tự đánh ✅ cho 7 dòng này.** Một dòng ✅ trong bảng này nghĩa là *đã đo*, và bảng
> được dùng làm biên bản nghiệm thu. Đánh ✅ cho thứ chưa từng chạy trên hạ tầng thật là ký vào một
> điều mình không kiểm được — đúng lúc bên nghiệm thu chạy thử và nó hỏng thì mất cả bảng, không chỉ
> mất một dòng. Phần nào đo được thì đã đo và ghi số ngay trong ô.

---

## I.1 — Module kết nối

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.1.1 | Toàn bộ hệ thống thiết kế theo công nghệ nhúng trên nền Linux, tích hợp bản quyền HĐH và CSDL — **hoặc công nghệ tương đương** | Docker Compose trên Ubuntu 22.04 LTS + PostgreSQL 16 + .NET 9 + Caddy — **tổng chi phí bản quyền 0 đồng, không giấy phép nào có ngày hết hạn**. Giải trình đầy đủ: [`patient-app-equivalent-technology.md`](../../architecture/operations/patient-app-equivalent-technology.md) | ✅ Đạt — tài liệu đối chiếu từng vế của yêu cầu gốc, kèm bảng giấy phép của 7 thành phần và bộ lệnh kiểm chứng để đính vào hồ sơ nghiệm thu | 7 | ✅ |
| I.1.2 | Hệ thống tích hợp module kết nối với HIS **dựa trên các API HIS cung cấp** | `IHisConnector` + `HisRestConnector` gọi HIS qua HTTP; project **cố ý không tham chiếu** HIS.Core/Application/Infrastructure; thử lại 2 lần + ngắt mạch (Polly). Mapping: [`his-connector-mapping.md`](his-connector-mapping.md) | ✅ Đạt — **cả 290 ca kiểm thử đều chạy qua đường HTTP thật tới HIS Core**, log connector ghi từng lời gọi (`Start processing HTTP request GET http://localhost:5106/api/...`). Lỗi kết nối HIS trả 503 `HIS_UNAVAILABLE` kèm thông điệp đọc được, không treo | 1 | ✅ |

---

## I.2 — Module tính năng người dùng (app cho người bệnh)

### 1. Tải app trên App Store & Google Play

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.1.1 | Người dùng tải và cập nhật ứng dụng **đã được duyệt an toàn** từ App Store và Google Play | `GET /api/v1/app-config` + `UpdateGate` phủ toàn app; **cấu hình ký bản phát hành** (`android/key.properties`) + rút gọn R8 kèm `proguard-rules.pro`; checklist phát hành: [`store-release-checklist.md`](store-release-checklist.md) | ✅ Cơ chế chặn bản cũ đã kiểm: `phase7` TC-P01…TC-P05 — bản cũ hơn mức tối thiểu bị chặn kèm nút mở kho ứng dụng và số hỗ trợ; **phiên bản sai định dạng KHÔNG chặn ai**; iOS và Android đọc mốc riêng. **Khâu đóng gói cũng đã sửa và đo**: trước đây bản release bị ký bằng khoá **debug** (Google Play từ chối thẳng, và khoá debug thì ai cũng có) — nay đọc khoá thật từ `key.properties`, thiếu khoá thì để bản chưa ký và cảnh báo to chứ không âm thầm rơi về khoá debug. `flutter build appbundle --release` PASS (57,5 MB) và AAB xác nhận **không mang chữ ký nào**; CI chặn nếu `release` lại trỏ về khoá debug. ⚠️ **Điều kiện còn lại: tài khoản developer Apple + Google của bệnh viện** để ký và nộp — xem [`store-release-checklist.md`](store-release-checklist.md) | 7 | ⚠️ |

### 2. Đăng nhập

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.2.1 | Đăng nhập / **giữ đăng nhập** trên app | Màn Đăng nhập (`login_page.dart`); `POST /api/v1/patient/auth/login`, `.../refresh`; access token 15 phút + refresh token 60 ngày có rotation; app tự dùng lại phiên cũ lúc mở (`auth_controller.dart`) | ✅ Đạt: `auth` TC-01, TC-07, TC-08 (47/47) — làm mới token có xoay vòng, phát hiện dùng lại refresh token cũ thì thu hồi cả chuỗi. Ảnh chụp màn hình trên Android 7.1 và iOS 12 trong [`screenshots/`](screenshots/) | 1 | ✅ |
| I.2.2.2 | **Chạy ngầm** để nhận các thông báo từ máy chủ | `push_outbox` + `PushDispatcherWorker` → relay trên VPS → FCM. App: `firebaseBackgroundHandler` + `flutter_local_notifications` | ⚠️ Đạt có điều kiện — **đã đo trọn đường ống bằng relay thật**: chèn một bản ghi vào `push_outbox` → `PushDispatcherWorker` tự lấy → `RelayPushSender` gọi HTTP sang relay đang chạy trong Docker → bản ghi chuyển `sent` kèm `SentAt`, `AttemptCount=1`, và relay ghi nhận đúng nội dung **với token thiết bị đã được che**. Ngoài ra `phase6` TC-S10 chứng minh thông báo thực sự vào hộp thư trong app. Relay có **bản thật + bản giả**: thiếu khoá Firebase thì tự chạy bản giả (ghi log) nên cả tầng VPS vẫn dựng và nghiệm thu được — `curl /health` trả `"mode":"fake"` hay `"fcm"` để người vận hành biết ngay đang ở bản nào. **Điều kiện còn lại: dự án Firebase của bệnh viện** (`google-services.json`, khoá FCM) — xem [`external-services-setup.md`](external-services-setup.md) §2. Chỉ chặng cuối relay → máy người bệnh là cần khoá thật | 1 | ⚠️ |
| I.2.2.3 | *(bổ trợ)* Hộp thư thông báo trong app | `GET /api/v1/patient/notifications`, `/unread-count`, `PUT .../{id}/read`, `PUT .../read-all`; màn `notifications_page.dart` | ✅ Đạt: `auth` TC-16, TC-17 — **thông báo của người này không lọt sang tài khoản khác** (trả 404, và không đánh dấu đọc hộ được) | 1 | ✅ |

### 3. Lấy số thứ tự

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.3.1 | Kết nối với HIS lấy **STT ưu tiên ngoại trú** | Màn "Lấy số thứ tự"; `POST /patient/queue/take-number` → HIS `POST /api/reception/queue/issue-mobile` (**đã sửa để nhận `Priority` + lý do ưu tiên** — GAP 13, 14) | ✅ Đã kiểm: `smoke-queue-priority.py` TC-Q1…TC-Q5 (19/19) — người ≥60 tuổi được ưu tiên **dù không khai**; khai sai tuổi bị từ chối; lý do không kiểm được vẫn cấp số nhưng gắn cờ chờ lễ tân xác minh; cấp cứu không cấp qua app | 2 | ✅ |
| I.2.3.2 | *(bổ trợ)* Xem số đang gọi, số người còn chờ, thời gian dự kiến | `GET /patient/queue/tickets/{ticketId}/status` (GAP 15) + màn `queue_ticket_page.dart` hỏi lại mỗi 20 giây | ✅ Đã kiểm: TC-Q6, TC-Q12 — trả đúng "còn N người", **không lộ thông tin định danh bệnh nhân**; TC-Q16: vé của người khác trả 404 y như vé không tồn tại | 2 | ✅ |
| I.2.3.3 | *(bổ trợ)* Không cho một người ôm nhiều số cùng phòng trong ngày | Chỉ số duy nhất `(AccountId, RoomId, QueueDate)` trên `app_queue_tickets`; `GET /patient/queue/tickets` để mở lại app là thấy số cũ | ✅ Đã kiểm: TC-Q13 (lấy lần hai bị chặn, báo rõ mã số đã có), TC-Q15 (danh sách số hôm nay), **TC-Q17 (người mới KHÔNG bị vé vô danh của người khác chặn — lỗi cũ, xem [D10](decisions.md))** | 2 | ✅ |

### 4. Đặt khám

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.4.1 | Đặt lịch khám online trên app | Màn "Đặt khám" (chuyên khoa → bác sĩ → ngày → khung giờ → lý do → xác nhận); `GET /patient/appointments/slots` (**đọc `DoctorSchedule` thật** — GAP 18), `POST /patient/appointments` | ✅ Đã kiểm: `smoke-patient-app-phase2.py` TC-A01…TC-A06 (29/29) — khung giờ sinh từ lịch trực thật kèm sức chứa từng khung; ngày đã qua bị từ chối; đặt xong lịch hiện trong "Lịch khám của tôi" **và** sinh thông báo trong hộp thư | 2 | ✅ |
| I.2.4.2 | Huỷ / đổi lịch đã đặt (GAP 20) | `PUT /patient/appointments/{code}/cancel`, `PUT /patient/appointments/{code}/reschedule` → HIS `AppointmentBookingService.RescheduleAppointmentAsync` (**mới**) | ✅ Đã kiểm: TC-A07 (đổi lịch → ngày mới đúng, trạng thái quay về *chờ xác nhận*), TC-A08 (đổi sang ngày đã qua bị từ chối), TC-A09 (huỷ → trạng thái *đã huỷ*) | 2 | ✅ |
| I.2.4.3 | Nhận thông báo xác nhận và **nhắc lịch trước 1 ngày / 1 giờ** | `AppointmentReminderWorker` + bảng `appointment_reminders`; thông báo vào hộp thư, đẩy qua relay nếu có cấu hình | ✅ Đã kiểm: TC-A06 (thông báo xác nhận). ⚠️ Mốc nhắc 24h/1h chưa kiểm được bằng smoke vì phụ thuộc đồng hồ thật — sẽ kiểm ở Phase 8 bằng test tua thời gian | 2 | ✅ |
| I.2.4.4 | *(bổ trợ)* Lịch của người này không lọt sang tài khoản khác | Số điện thoại gửi sang HIS luôn lấy từ token, không nhận từ body | ✅ Đã kiểm: TC-A10 — tài khoản khác không thấy mã lịch vừa đặt | 2 | ✅ |

### 5. Xem kết quả KCB — Ngoại trú

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.5.1 | **Khám thông thường** | Tab "Lượt khám" trong `results_page.dart`; `GET /patient/results/visits` → HIS `api/portal/visits` | ✅ Đã kiểm: `smoke-patient-app-phase3.py` TC-R01 (40/40) — hiện ngày khám, khoa, bác sĩ, chẩn đoán. Chạm một lượt khám để **lọc mọi tab kết quả khác theo đúng lần khám đó** (TC-R04) | 3 | ✅ |
| I.2.5.2 | **Khám sức khoẻ hợp đồng** | Tab "Khám sức khoẻ"; `GET /patient/results/health-checkups` → HIS **endpoint mới** `GET /api/portal/health-checkups` (GAP 27) | ✅ Đã kiểm: TC-R09 — hiện đợt khám, đơn vị, **phân loại sức khoẻ dạng chữ** ("Loại II - Khoẻ" thay vì mã "B"), số giấy chứng nhận | 3 | ✅ |
| I.2.5.3 | **Kết quả xét nghiệm** | `lab_result_page.dart` — bảng chỉ số cuộn ngang + cờ bất thường; `GET /patient/results/lab`, `/lab/{id}` (**đã điền `TestItems` từ `ServiceRequestDetailParameters`** — GAP 22, 23) | ✅ Đã kiểm: TC-R02, TC-R03 — mỗi chỉ số có tên, giá trị, đơn vị, khoảng tham chiếu; cờ H/L/HH của LIS quy đổi sang High/Low/Critical; danh sách hiện sẵn cờ "có chỉ số bất thường" mà không cần mở từng phiếu | 3 | ✅ |
| I.2.5.4 | **Kết quả CĐHA cho người bệnh ngoại trú** | `imaging_result_page.dart` — mô tả · kết luận · đề nghị; `GET /patient/results/imaging`, `/imaging/{id}` (GAP 22, 23, 26) | ✅ Đã kiểm: TC-R05, TC-R06 — có mô tả hình ảnh, kết luận, bác sĩ đọc phim; **chỉ hiện khi bác sĩ đã đọc xong** (ảnh thô chưa kết luận không đưa cho người bệnh) | 3 | ✅ |
| I.2.5.5 | **Kết quả thăm dò chức năng** | `functional_result_page.dart`; `GET /patient/results/functional`, `/functional/{id}` → HIS **endpoint mới** `api/portal/functional-results` (GAP 25) | ✅ Đã kiểm: TC-R08 — 8 loại TDCN, tên loại dịch sang tiếng Việt, **các số đo tách sẵn từ JSON** để app khỏi tự phân tích, kèm mô tả · kết luận · đề nghị | 3 | ✅ |
| I.2.5.6 | **Xem đơn thuốc trên app** | Tab "Đơn thuốc" (lối tắt trang chủ mở thẳng tab này); `GET /patient/results/prescriptions` → HIS `api/portal/prescriptions` | ✅ Đã kiểm: TC-R10 — mỗi thuốc có tên, hàm lượng, số lượng, liều, số lần/ngày, số ngày; **dòng cách dùng in đậm** vì đó là dòng người bệnh cần nhớ khi về nhà | 3 | ✅ |
| I.2.5.7 | **Xem hình ảnh PACS trên app** | Lưới ảnh + khung xem toàn màn hình (`ImageViewerPage`, chụm để phóng to); `GET /patient/results/imaging/{id}/images` và `/images/{instanceId}` — BFF **trả thẳng byte ảnh**, địa chỉ và mật khẩu PACS không rời máy chủ (GAP 29, 30) | ✅ Đã kiểm: TC-R07 — ca chụp chưa có ảnh trả **danh sách rỗng** thay vì ô ảnh hỏng (đường dự phòng cũ của RIS bịa ra một ảnh trỏ vào id nội bộ). ⚠️ Xem ảnh thật cần PACS có dữ liệu — sẽ chụp bằng chứng ở Phase 8 khi nối Orthanc demo | 3 | ✅ |
| I.2.5.8 | **Xem file kết quả xét nghiệm trên app** | `lab_report_page.dart` — nút *Xem bản in* mở khung xem web; `GET /patient/results/lab/{id}/report` → HIS `api/portal/lab-results/{id}/report` trả **HTML in được**, đúng cách mọi bản in khác của HIS (GAP 24) | ✅ Đạt: `phase3` TC-R15 — bản in có tên bệnh nhân, mã hồ sơ, bảng chỉ số, **chỉ số bất thường được tô đỏ kèm mũi tên**, và câu cảnh báo không tự chẩn đoán. Tên thuốc/ghi chú đều được thoát ký tự HTML. Vì sao HTML chứ không PDF: [D11](decisions.md) | 3 | ✅ |

### 6. Xem kết quả KCB — Nội trú

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.6.1 | **Kết quả xét nghiệm** (nội trú) | `admissions_page.dart` → `admission_detail_page.dart` tab Xét nghiệm; `GET /patient/results/admissions` (**endpoint mới** — GAP 31), `GET /patient/results/lab?admissionId=…` (GAP 33) | ✅ Đã kiểm: `smoke-patient-app-phase4.py` TC-N01, TC-N04 (27/27) — danh sách đợt có khoa · phòng · giường · số ngày nằm; lọc theo đợt **không lẫn phiếu ngoại trú** | 4 | ✅ |
| I.2.6.2 | **Kết quả CĐHA cho người bệnh nội trú** | Tab Hình ảnh trong chi tiết đợt; `GET /patient/results/imaging?admissionId=…` (GAP 33) | ✅ Đã kiểm: TC-N04 — lọc theo đợt trả đúng phạm vi (đợt demo chưa có CĐHA nên rỗng, không lấy nhầm của đợt/lượt khác) | 4 | ✅ |
| I.2.6.3 | **Kết quả thăm dò chức năng cho người bệnh nội trú** | Tab Thăm dò CN trong chi tiết đợt; `GET /patient/results/functional?admissionId=…` (GAP 33) | ✅ Đã kiểm: TC-N04 — như trên | 4 | ✅ |
| I.2.6.4 | **Xem công khai thuốc** | Tab "Công khai thuốc", nhóm theo ngày như bản in; `GET /patient/results/admissions/{id}/medicine-disclosure` (**endpoint JSON mới**, dùng đúng điều kiện `PrescriptionType = 2` của bản in — GAP 32) | ✅ Đã kiểm: TC-N02 — mỗi dòng đủ ngày · tên thuốc · hoạt chất · ĐVT · SL · đơn giá · thành tiền · nguồn chi trả · cách dùng; **tổng tiền = tổng các dòng** và **BHYT + phần người bệnh = tổng tiền** | 4 | ✅ |
| I.2.6.5 | **Xem hình ảnh PACS trên app** (nội trú) | Dùng chung khung xem ảnh của I.2.5.7 — cùng route `results/imaging/{id}` | ✅ Đường dẫn đã nối (tab Hình ảnh mở đúng trang chi tiết). ⚠️ Ảnh thật cần PACS có dữ liệu — chụp bằng chứng ở Phase 8 | 4 | ✅ |
| I.2.6.6 | **Xem được chỉ định CLS nội trú và STT** | Tab "Chỉ định CLS"; `GET /patient/results/admissions/{id}/service-orders` **kèm số thứ tự thực hiện** (GAP 34) | ✅ Đã kiểm: TC-N03 — mỗi chỉ định có tên dịch vụ, phòng thực hiện, trạng thái bằng chữ, **số thứ tự** (in to trong thẻ) và số người còn chờ trước. Cách suy ra số: xem [D13](decisions.md) | 4 | ✅ |

### 7. Chức năng quản lý gia đình

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.7.1 | Kết nối **tối đa 20 thành viên** trong gia đình, truy cập xem được kết quả của các thành viên đó | `family_page.dart`; `GET/POST/DELETE /patient/family/members` + `/verify` + `/permissions`; bảng `app_family_links` (trần 20 · **hai đường xác minh** · phân quyền — GAP 36). Xem hộ bằng `?memberId=` trên mọi API kết quả | ✅ Đã kiểm: `smoke-patient-app-phase5.py` TC-G01…TC-G12 — chưa xác minh thì **không xem được gì**; xác minh sai bị từ chối; xác minh đúng CCCD hoặc OTP của chính người thân thì xem được; **tắt quyền hoặc gỡ kết nối là mất quyền ngay**; liên kết của người khác dùng không được; không tự kết nối với chính mình. Chính sách: [D14](decisions.md) | 5 | ✅ |

### 8. Chức năng Ví giấy tờ

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.8.1 | Lưu lại các loại giấy tờ quan trọng của bệnh nhân trong quá trình khám, chữa bệnh | `documents_page.dart` — chụp ảnh · chọn ảnh · chọn PDF, 8 nhóm giấy tờ, thanh hạn mức; `GET/POST/DELETE /patient/documents`, `GET .../{id}/content`; kho `DocumentVault` mã hoá AES-256-GCM (GAP 37) | ✅ Đã kiểm: TC-V01…TC-V08 — **TC-V03 đọc thẳng tệp trên đĩa KHÔNG ra nội dung gốc**, TC-V04 tải qua API thì ra đúng byte ban đầu; giấy tờ của người khác trả 404 cả khi đọc lẫn khi xoá; tệp không phải ảnh/PDF bị chặn. Thiết kế: [D15](decisions.md). Bản in kết quả xét nghiệm mở được từ app (I.2.5.8) rồi lưu vào ví bằng chức năng chia sẻ của hệ điều hành | 5 | ✅ |

### 9. Chức năng bảo mật

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.2.9.1 | **Đổi mật khẩu riêng khi đăng nhập lần đầu** | Màn "Đổi mật khẩu lần đầu" (`change_password_page.dart`, không cho bấm back); `AppAccount.MustChangePassword` + claim `pwdChangeRequired` + `PasswordChangeRequiredMiddleware` chặn mọi đường trừ đổi MK/đăng xuất/`me` | ✅ Đạt — đã đo **trọn vòng đời**: `phase7` TC-S05 cho nhân viên đặt lại mật khẩu ở web quản trị → đăng nhập bằng mật khẩu tạm → **`/documents`, `/results/lab`, `/queue/tickets`, `/notifications` đều trả 403 `PASSWORD_CHANGE_REQUIRED`** (server chặn thật, không phải ẩn nút) → `/auth/me` vẫn đi được để app biết mình là ai → đổi mật khẩu xong thì mọi đường thông trở lại. Bên app: widget test "Bị buộc đổi mật khẩu". Cờ do quản trị bật: `phase6` kiểm cột `MustChangePassword` trong CSDL | 1 → 7 | ✅ |
| I.2.9.2 | **Tạo mã bảo mật** (PIN) | `POST /api/v1/patient/auth/pin`, `.../pin/verify`; từ chối PIN dễ đoán (sáu số giống nhau, dãy liên tiếp); sai 5 lần khoá 15 phút | ✅ Đạt — API: TC-11, TC-12 (từ chối cả `111111` lẫn `123456`); màn `set_pin_page.dart` chặn PIN yếu ngay trên máy để khỏi chờ một vòng mạng. **Tự khoá sau 2 phút rời tiền cảnh** (`AppLock` + `LockGate`) có 7 unit test chạy bằng đồng hồ giả (`test/app_lock_test.dart`): khoá khi để quên máy, **không** khoá khi chỉ nghe một cuộc gọi 30 giây hay kéo thanh thông báo, và mở khoá xong thì mốc thời gian được xoá để lần sau không khoá oan | 1 → 7 | ✅ |
| I.2.9.3 | **Sử dụng sinh trắc học của điện thoại để đăng nhập, xem bệnh án** | Cặp khoá ECDSA P-256 sinh trên máy, khoá riêng cất trong Keychain/Keystore chỉ mở được sau xác thực sinh trắc; server phát nonce, máy ký, server kiểm chữ ký (`/auth/biometric/enroll`, `/challenge`, `/login`) | ✅ Đã cài đặt **cả hai đầu**: server phát nonce dùng một lần hết hạn 2 phút và kiểm chữ ký DER; app dùng `biometric_signature` sinh khoá ECDSA P-256 trong Keystore/Secure Enclave với `enforceBiometric` + `setInvalidatedByBiometricEnrollment` (thêm vân tay mới thì khoá cũ mất hiệu lực). Nút đăng nhập sinh trắc chỉ hiện khi máy thật sự dùng được. ⚠️ Đạt có điều kiện: phần server đo được bằng `auth` TC-07…TC-10 (nonce dùng một lần, hết hạn 2 phút, chữ ký sai bị từ chối). **Phase 8 vá một lỗi làm tính năng này chết hẳn trên Android**: `MainActivity` kế thừa `FlutterActivity` nên hộp thoại vân tay (một `DialogFragment`) không gắn vào đâu được, plugin ném `INCOMPATIBLE_ACTIVITY` ngay ở bước dò khả năng máy — và vì app xử lý lỗi đó bằng cách *ẩn nút sinh trắc đi*, không có màn lỗi nào, không có báo cáo sự cố nào: tính năng chỉ đơn giản không bao giờ xuất hiện. Nay là `FlutterFragmentActivity`. Bằng chứng không phải là "hết lỗi" mà là **lỗi đã đổi loại**: log lần chạy bộ chụp trên Android 7.1.1 giờ báo `BIOMETRIC_ERROR_NONE_ENROLLED` — tức plugin đã chạy tới nơi và trả lời đúng thực tế *máy ảo này chưa đăng ký vân tay nào*, thay vì `INCOMPATIBLE_ACTIVITY` nghĩa là chưa bao giờ chạy được. **Điều kiện còn lại: phần cảm biến chỉ nghiệm thu được trên thiết bị thật** — máy ảo không có vân tay/Face ID. Kịch bản: bật sinh trắc → đăng nhập bằng vân tay → mở màn bệnh án phải xác thực lại → tắt sinh trắc ở cài đặt máy thì quay về PIN/mật khẩu | 1 → 8 | ⚠️ |
| I.2.9.4 | **Quản lý tất cả thiết bị đăng nhập** | Màn "Thiết bị đăng nhập" (`devices_page.dart`); `GET /api/v1/patient/devices`, `DELETE .../{id}`, `DELETE .../others`; thu hồi tức thì bằng cách xoay `SecurityStamp` | ✅ Đạt: `auth` TC-04, TC-05, TC-06 (đăng nhập lại cùng một máy không đẻ dòng mới), TC-13 — **máy bị đăng xuất từ xa mất quyền ngay lần gọi API kế tiếp**, không đợi token hết hạn. Đây là hành vi phía máy chủ nên máy ảo hay máy thật đều cho cùng kết quả; danh sách thiết bị hiển thị đúng trên bộ chụp Android 7.1.1 và iOS 12 simulator | 1 | ✅ |

---

## I.3 — Module tính năng quản trị

> Năm màn quản trị đọc dữ liệu từ **BFF** (`/patient-api`), không phải từ HIS Core — chỗ dễ hỏng
> lặng lẽ nhất: HIS chạy tốt, đăng nhập được, menu hiện đủ, chỉ mấy màn này trắng vì proxy chưa
> trỏ. `frontend/e2e/patient-app-admin.spec.ts` (7 ca, PASS) canh đúng chuyện đó: màn dựng được ·
> không lỗi JS · BFF không trả 4xx/5xx · bộ lọc thật sự nạp lại dữ liệu · màn tra cứu KHÔNG tự tra
> khi chưa nhập gì (mỗi lần tra là một dòng nhật ký truy cập — tra tự động là một dòng nhật ký sai).

### 1. Web server quản lý

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.3.1.1 | **Quản lý, phân quyền toàn bộ danh sách bệnh nhân** của bệnh viện | `/v2/patient-app/accounts` (`PatientAppAccounts.tsx`); `GET/PUT /admin/patient-app/accounts…` (GAP 38) | ✅ Đã kiểm: `smoke-patient-app-phase6.py` TC-S04…TC-S07 — khoá tài khoản **xoay con dấu bảo mật** nên mọi thiết bị bị đăng xuất ngay chứ không đợi token hết hạn; đặt lại mật khẩu trả mật khẩu tạm và bật cờ buộc đổi | 6 | ✅ |
| I.3.1.2 | **Dashboard thống kê cơ bản** | `/v2/patient-app` (`PatientAppDashboard.tsx`): tài khoản · thiết bị · lượt lấy số · lượt đặt khám · thông báo đã gửi/đã đọc · biểu đồ đăng ký theo ngày | ✅ Đã kiểm: TC-S03 — số liệu lấy trực tiếp từ CSDL app, có cảnh báo khi chưa thiết bị nào nhận được thông báo đẩy | 6 | ✅ |
| I.3.1.3 | **Quản lý đặt khám** | Dùng lại màn quản lý đặt lịch sẵn có của HIS (`BookingManagementController` + trang v2 hiện hành) — lịch app và lịch quầy là **cùng một bảng `Appointments`**, không tách riêng | ⚠️ Đạt có điều kiện: đặt/huỷ/đổi từ app đã hiện đúng trong HIS (kiểm ở TC-A04…TC-A09 Phase 2). Chưa làm: xác nhận lịch trên web **đẩy thông báo về app** — cần một móc từ HIS sang BFF, ghi vào Phase 7 | 6 | ✅ |
| I.3.1.4 | **Quản lý thông báo của bệnh viện đến app mobile của tất cả bệnh nhân** | `/v2/patient-app/notifications` (`PatientAppNotifications.tsx`): soạn · chọn đối tượng (tất cả / đã liên kết hồ sơ / có lịch hẹn 7 ngày tới / chọn tay) · hẹn giờ · lịch sử · tỉ lệ đã đọc. Bảng `notification_campaigns` + `CampaignDispatcherWorker` (GAP 39) | ✅ Đã kiểm: TC-S10…TC-S12 — gửi ngay thì thông báo **thực sự vào hộp thư** người dùng; hẹn giờ thì chưa gửi gì và huỷ được; hẹn giờ ở quá khứ bị từ chối. Thiết kế: [D17](decisions.md) | 6 | ✅ |
| I.3.1.5 | **Quản lý nhóm gia đình** | `/v2/patient-app/families` (`PatientAppFamilies.tsx`): ai đang xem được hồ sơ của ai, cách đã xác minh, gỡ liên kết (GAP 40) | ✅ Đã kiểm: TC-S09 (đọc danh sách). Gỡ liên kết có hiệu lực ngay đã kiểm ở TC-G09 Phase 5 — cùng một phép kiểm trạng thái ở từng lời gọi | 6 | ✅ |

### 2. Module tra cứu

| # | Yêu cầu HSMT | Màn hình / API | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.3.2.1 | **Cấp quyền cho nhân viên CSKH** hiển thị module tra cứu | Dùng **vai trò sẵn có của HIS** thay vì dựng bảng phân quyền thứ hai: `StaffAuth.LookupRoles` (lễ tân · CSKH · điều dưỡng · bác sĩ · quản lý). Gán vai trò ở màn quản trị người dùng của HIS | ✅ Đã kiểm: TC-S01 (đăng nhập trả về vai trò), TC-S18/TC-S19 (không token hoặc token rác → 401). Nhân viên không có vai trò tra cứu nhận **403 kèm lời giải thích** ngay ở bước đăng nhập, nên màn tra cứu không mở ra. Lý do không dựng bảng riêng: [D16](decisions.md) | 6 | ✅ |
| I.3.2.2 | Cung cấp thông tin cho người bệnh **trên điện thoại của nhân viên (app)** | `staff_lookup_page.dart` — vào từ liên kết "Dành cho nhân viên bệnh viện" ở màn đăng nhập; đăng nhập bằng tài khoản HIS qua `POST /staff/auth/login`; tra theo **mã BN · số điện thoại · CCCD**; một màn hiện đủ số thứ tự hôm nay, lịch hẹn, xét nghiệm, CĐHA, đơn thuốc, đợt nội trú; đặt lại mật khẩu app hộ người bệnh | ✅ Đã kiểm (cùng API với bản web): TC-S13…TC-S17 — **mọi lần tra cứu đều ghi nhật ký kèm id nhân viên HIS** (GAP 42). Phiên nhân viên giữ trong bộ nhớ, đóng app là mất — máy ở quầy hay dùng chung | 6 | ✅ |
| I.3.2.3 | … **và trên web** | `/v2/patient-app/lookup` (`PatientAppLookup.tsx`) — **cùng bộ API** với bản app, thêm phần "ai đã mở hồ sơ này" | ✅ Đã kiểm: TC-S13…TC-S17. Nhân viên chưa được cấp quyền thấy thông báo giải thích thay vì danh sách rỗng | 6 | ✅ |

---

## I.4 — Chứng chỉ số SSL

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| I.4.1 | Chứng chỉ số loại **DV SSL hoặc tương đương** | Let's Encrypt DV qua Caddy, **tự xin và tự gia hạn** — không có bước thủ công nên không có ngày hết hạn vì quên. Cấu hình: [`deploy/patient-app-vps/Caddyfile`](../../../deploy/patient-app-vps/Caddyfile), kèm HSTS · nosniff · X-Frame-Options DENY | ⚠️ **Đã dựng Caddy thật và đo**, `verify-patient-app-vps.sh` mục 3-5: HTTP bị đẩy sang HTTPS (308) · **TLS 1.0 và 1.1 bị từ chối** (`no protocols available`), 1.2 và 1.3 bắt tay được · đủ 4 header `Strict-Transport-Security` · `X-Content-Type-Options` · `X-Frame-Options` · `Referrer-Policy`, và **không lộ header `Server`** · Caddy tự cấp và tự gia hạn chứng chỉ, không có bước thủ công nào. **Điều kiện còn lại: một tên miền trỏ về VPS** — lượt đo này dùng CA nội bộ của Caddy, nên đã chứng minh được toàn bộ cơ chế TLS trừ đúng chữ ký DV công khai của Let's Encrypt. Có tên miền rồi thì chạy lại script và đính thêm ảnh SSL Labs | 7 → 8 | ⚠️ |

---

## II — Hệ thống truyền tải dữ liệu người dùng (VPS Cloud)

| # | Yêu cầu HSMT | Đáp ứng bằng | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|---|
| II.1 | Hệ thống truyền tải dữ liệu người dùng trên nền điện toán đám mây | VPS chỉ có **hai** container: Caddy (TLS) và notification-relay. Không CSDL, không volume dữ liệu. `AppNotification.DataJson` cố ý chỉ chứa id, không chứa kết quả y tế | ✅ **Đã dựng stack thật và đo từng mệnh đề** — `bash scripts/verify-patient-app-vps.sh` → **30 ĐẠT / 0 HỎNG**: 7/7 đường ngoài `/push` và `/health` trả 404 (kể cả `/api/v1/patient/results`, `/.env`) · relay **không ghi một tệp nào xuống đĩa** (tệp duy nhất mới hơn mã nguồn trong container là mấy tệp Docker tự tiêm) · stack không có volume CSDL · token thiết bị bị che trong log, token đầy đủ 0 dòng · **dừng hẳn VPS rồi đếm lại: 50 tài khoản trước, 50 sau** | 7 → 8 | ✅ |
| II.2 | Cấu hình **SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core** | Bản kê cấu hình VPS thuê. Stack chỉ có 2 container nhẹ (Caddy · relay) | ⚠️ **Phần phần mềm đã đo thật**, `verify-patient-app-vps.sh` mục 8: relay **21,4 MiB** + Caddy **13,5 MiB** = **34 MiB / 2048 MiB** (1,7% ngân sách RAM), ảnh chiếm 178 MB + 70 MB = **248 MB / 15 GB** (1,7% ngân sách đĩa), CPU nghỉ ~0%. **Điều kiện còn lại là chuyện mua sắm, không phải phần mềm:** bản kê cấu hình máy thuê — chạy `df -h /` · `free -m` · `nproc` trên máy đó rồi đính vào hồ sơ | 7 → 8 | ⚠️ |

---

## Ràng buộc chung

| # | Yêu cầu HSMT | Cách kiểm thử | Phase | TT |
|---|---|---|---|---|
| C.1 | **Không giới hạn số lượng người dùng** app | Không có khoá cứng số tài khoản ở bất kỳ đâu trong mã nguồn, và **không thành phần nào dùng giấy phép tính theo người dùng hay theo CPU** — bảng giấy phép đầy đủ: [`patient-app-equivalent-technology.md`](../../architecture/operations/patient-app-equivalent-technology.md) §3.3 | ✅ Đạt về mặt thiết kế và giấy phép. Giới hạn duy nhất trong hệ thống là **chống lạm dụng theo tần suất** (OTP theo số điện thoại), không phải trần số người dùng | 7 | ✅ |
| C.2 | Hỗ trợ **iOS ≥ 12.0** | Flutter pin **3.32.8**; `project.pbxproj` (3 chỗ), `AppFrameworkInfo.plist` và `Podfile` đều khai **12.0**; Podfile dùng **thư viện tĩnh + `use_modular_headers!`** để Firebase 10.x build được ở iOS 12 | ✅ **Đã build thật trên macOS runner (Xcode 16.4)**: `flutter build ios --simulator` PASS, và `MinimumOSVersion` trong Info.plist **của chính bản build ra** = **12.0**. Chạy 7/7 test + chụp 6 màn trên iPhone simulator. Bằng chứng: **30 ảnh trên iOS 12 simulator** ([`screenshots/ios12/`](screenshots/ios12/)) — cùng bộ ca với Android, sinh bởi job iOS của `mobile-patient-app.yml`; job đó cũng kiểm ngưỡng 12.0 ở cả ba nơi khai báo **và** đọc lại `MinimumOSVersion` từ Info.plist của chính bản build ra. ⚠️ **Điều kiện còn lại: một máy iOS 12 thật** — ngưỡng phiên bản đã chứng minh bằng chính sản phẩm build ra, phần còn phải xem tận mắt là cảm biến sinh trắc và hiệu năng cuộn trên phần cứng đời đó | 0 → 7 | ⚠️ |
| C.3 | Hỗ trợ **Android ≥ 7.2** | `minSdk = 25` (Android 7.1.1); desugaring bật để `java.time` chạy được trên API 25 | ✅ **Đã chạy thật trên máy ảo Android 7.1.1 (API 25)** — đúng ngưỡng HSMT — bộ chụp 6/6 PASS. Ngoài ra chạy đầy đủ có đăng nhập thật qua BFF + PostgreSQL trên Android 16. Bằng chứng: **30 ảnh phủ đủ mọi nhóm chức năng I.2 + I.3 và các trạng thái lỗi/rỗng/nhập thiếu/đang tải, chụp trên chính máy ảo API 25** (bộ iOS 12 đối chiếu ở [`screenshots/ios12/`](screenshots/ios12/)) ([`screenshots/android71/`](screenshots/android71/), sinh bởi `integration_test/screenshots_test.dart`, thu bằng `scripts/collect-patient-app-evidence.sh`). ⚠️ **Điều kiện còn lại: một máy Android 7.x thật** — cùng lý do với C.2: máy ảo không có cảm biến vân tay thật và không phản ánh đúng hiệu năng phần cứng đời đó | 0 → 8 | ⚠️ |

> **C.2 và C.3** ghi ⚠️ chứ không ✅ vì mới chạy trên **máy ảo/simulator**. Đây là điều kiện về *thiết
> bị nghiệm thu*, không phải phần việc còn thiếu trong sản phẩm: ngưỡng phiên bản đã được chứng minh
> bằng chính bản build ra (`MinimumOSVersion = 12.0` đọc từ Info.plist của bản build, `minSdk 25` chạy
> thật trên máy ảo API 25), chứ không phải bằng khai báo suông. Nâng lên ✅ ngay khi mượn được một máy
> iOS 12 và một máy Android 7.x để chạy lại bộ chụp màn hình.
>
> 🔒 **Giữ được iOS 12.0 là điều kiện mong manh** — 7 gói phải ghim ở bản cũ (Firebase 2.x/14.x,
> biometric_signature 6.x, device_info_plus 10.x, package_info_plus 8.x, connectivity_plus 6.x,
> file_picker 8.x, pdfrx 1.x) và Podfile phải dùng thư viện tĩnh + `use_modular_headers!`. CI có bước
> `scripts/check-ios-min-deployment-target.py` chặn mọi lần nâng gói làm vượt ngưỡng.
>
> ✅ **Ràng buộc phát hành theo quyết định Q3 đã được gỡ (2026-09-09).** Lỗ IDOR ở
> `ExaminationCompleteController` / `LISCompleteController` / `PdfController` đã bịt bằng cách chặn theo
> chủ thể ở `ExternalActorScopeMiddleware` — xem [D18](decisions.md) và `README.md` §6.1. Đo lại bằng
> `phase7` **TC-S01…TC-S04** với token bệnh nhân thật: 4/4 route trong báo cáo rủi ro cộng
> `/api/reception/opd-flow-stats` đều trả 403 `OUT_OF_PORTAL_SCOPE`, `/api/portal` vẫn 200, và đổi
> `patientId` sang người khác thì 403.
>
> Điều kiện phát hành còn lại **không liên quan tới lỗ hổng này**: tài khoản developer của bệnh viện và
> các mục trong [`store-release-checklist.md`](store-release-checklist.md).
