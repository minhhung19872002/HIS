# App Mobile Hỗ trợ Người bệnh (HIS PatientApp) — Tổng quan & Kế hoạch

> Gói thầu: **"Thuê phần mềm ứng dụng di động (app mobile) phục vụ công tác quản lý, hỗ trợ người bệnh"**.
> Nguồn yêu cầu: `docs/mobile/NangCapMobileApp.pdf` (HSMT) + `docs/mobile/PROMPT_HIS_PatientApp_Flutter.md`.
>
> 📚 Bộ tài liệu: [`00-his-api-inventory.md`](00-his-api-inventory.md) (khảo sát API HIS) ·
> [`acceptance-matrix.md`](acceptance-matrix.md) (bảng đối chiếu nghiệm thu) ·
> `his-connector-mapping.md` (mapping connector — viết ở Phase 1) ·
> `analysis.md` · `test-plan.md` · `test-guide.md` · `workflow-test.md` · `summary.md` (viết dần theo phase).

---

## 1. Phạm vi theo HSMT

| Mục | Nội dung | Nơi triển khai |
|---|---|---|
| **I.1** | Module kết nối — hệ thống trên nền Linux, tích hợp bản quyền HĐH & CSDL (hoặc **công nghệ tương đương**); kết nối HIS **dựa trên các API HIS cung cấp** | Data center bệnh viện |
| **I.2** | Module tính năng người dùng — app cho người bệnh (9 phân hệ, xem §3) | Data center bệnh viện |
| **I.3** | Module tính năng quản trị — web cho nhân viên quản lý & CSKH (2 phân hệ) | Data center bệnh viện |
| **I.4** | Chứng chỉ số **DV SSL** hoặc tương đương | Mọi domain công khai |
| **II** | Hệ thống truyền tải dữ liệu người dùng trên **VPS Cloud** (SSD ≥ 15GB, RAM ≥ 2GB, CPU ≥ 2 core) | VPS cloud |

Ràng buộc: **không giới hạn số người dùng** · **iOS ≥ 12.0** · **Android ≥ 7.2**.

---

## 2. Hiện trạng HIS — vì sao kế hoạch này khác prompt gốc

Khảo sát (chi tiết ở [`00-his-api-inventory.md`](00-his-api-inventory.md)) cho ra **một phát hiện làm
thay đổi khối lượng công việc**: HIS **đã có sẵn một cổng bệnh nhân tương đối đầy đủ** (gói "NangCap19"):

- `PatientPortalController` — ~40 route: lượt khám, KQ xét nghiệm, KQ CĐHA, đơn thuốc, hoá đơn,
  lịch hẹn, thành viên gia đình, nhắc thuốc, chỉ số sức khoẻ, hỏi-đáp bác sĩ.
- Entity: `PortalAccount`, `PortalAppointment`, `FamilyMember`, `MedicineReminder`, `HealthMetric`,
  `PatientQuestion` (`ExtendedWorkflowEntities.cs:1424-1604`).
- Role `PortalPatient` + **pattern chống IDOR đã đúng chuẩn** (`ResolvePatientId`,
  `PatientPortalController.cs:47-64`).

→ App **không xây từ số 0**. Phần lớn Phase 3-5 là **điền nốt dữ liệu vào DTO đã khai sẵn** và
**siết bảo mật**, không phải viết mới toàn bộ nghiệp vụ.

Ngược lại, có **5 mảng hoàn toàn chưa tồn tại**, chiếm phần lớn công sức thật:

1. **Push notification** — không có FCM/APNs ở bất kỳ đâu trong backend (grep = 0 kết quả).
2. **Xác thực cấp app** — token BN 8h cứng, không refresh, không OTP, không PIN, không sinh trắc,
   không quản lý thiết bị.
3. **Ví giấy tờ** — chưa có module nào.
4. **Web quản trị + module tra cứu CSKH** — chưa có.
5. **Nội trú cho BN** — không có API liệt kê đợt nhập viện, công khai thuốc chỉ có PDF, không có
   STT thực hiện CLS.

Và **1 rủi ro bảo mật phải bịt trước khi phát hành app** (§6.1).

---

## 3. Đối chiếu yêu cầu ↔ hiện trạng (mức phân hệ)

### I.2 — Module tính năng người dùng

| # | Phân hệ HSMT | Hiện trạng | Việc phải làm |
|---|---|---|---|
| 1 | Tải app trên App Store & Google Play | ✗ | Đóng gói, metadata, chính sách quyền riêng tư, xoá tài khoản, quy trình phát hành |
| 2 | Đăng nhập / **giữ đăng nhập** / **chạy ngầm nhận thông báo** | ⚠️ có login, ✗ refresh, ✗ push | Refresh token + FCM/APNs + background handler + relay VPS |
| 3 | Lấy **STT ưu tiên** ngoại trú | ⚠️ có cấp số, ✗ ưu tiên qua app | Bỏ hard-code `Priority = 0`, thêm lý do ưu tiên, GET trạng thái vé |
| 4 | Đặt khám online | ⚠️ có, slot **hard-code** | Nối slot vào `DoctorSchedule`, thêm đổi lịch, gán phòng đúng |
| 5 | Xem KQ KCB **ngoại trú** (thường · KSK hợp đồng · XN · CĐHA · TDCN · đơn thuốc · **PACS** · **file PDF**) | ⚠️ DTO đã khai đủ field nhưng service **bỏ trống**; ✗ TDCN; ✗ KSK theo BN | Điền mapping, thêm route chi tiết, sinh `ImageViewerUrl` PACS, cầu nối PDF, thêm TDCN + KSK |
| 6 | Xem KQ KCB **nội trú** (XN · CĐHA · TDCN · **công khai thuốc** · PACS · **chỉ định CLS + STT**) | ✗ gần như toàn bộ | Thêm 5-6 endpoint JSON; **bổ sung field STT thực hiện** |
| 7 | Quản lý gia đình — **tối đa 20 thành viên** | ⚠️ có `FamilyMember`, ✗ giới hạn/xác minh/phân quyền | Giới hạn 20, quy trình xác minh, phân quyền xem, chuyển chủ hộ |
| 8 | Ví giấy tờ | ✗ | Module mới: upload, mã hoá at-rest, hạn mức, tự nạp giấy tờ HIS xuất ra |
| 9 | Bảo mật — đổi MK lần đầu · **mã PIN** · **sinh trắc học** · **quản lý thiết bị** | ⚠️ có cho nhân viên, ✗ cho BN | Nhân bản `MustChangePassword` sang `PortalAccount`; PIN; device-key sinh trắc; bảng thiết bị + đăng xuất từ xa |

### I.3 — Module tính năng quản trị

| # | Phân hệ HSMT | Hiện trạng | Việc phải làm |
|---|---|---|---|
| 1 | Web quản lý: phân quyền DS bệnh nhân · dashboard · quản lý đặt khám · **quản lý thông báo** · quản lý nhóm gia đình | ⚠️ có `BookingManagementController` cho đặt khám; ✗ phần còn lại | Module v2 mới trong `frontend/` + API quản trị |
| 2 | Module tra cứu cho nhân viên CSKH (**trên app và trên web**) | ✗ | Vai trò `staff` trong app Flutter + màn tra cứu trên web; audit log mọi truy cập |

---

## 4. Kiến trúc

```
      [App Flutter (iOS/Android)]            [Web quản trị (React, trong frontend/ hiện có)]
        vai trò: patient | staff                        vai trò: AppAdmin | CSKH | Xem
                   │                                              │
                   ▼  HTTPS (DV SSL)                              ▼
┌───────────────────── VPS CLOUD (HSMT Mục II) ─────────────────────┐
│  Caddy: reverse proxy + TLS (Let's Encrypt, tự gia hạn)           │
│  notification-relay: nhận outbox → gửi FCM/APNs, có hàng đợi      │
│  redis: hàng đợi + chống gửi trùng                                │
│  ⚠️ KHÔNG lưu dữ liệu y tế — chỉ device token + nội dung thông báo │
│  Ngân sách: RAM < 1.5GB / 2GB, đĩa < 10GB / 15GB                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │  mTLS (hoặc WireGuard) — chỉ 1 chiều DC → VPS
┌────────────── DATA CENTER BỆNH VIỆN (HSMT Mục I) ─────────────────┐
│  patientapp-api  (HIS.PatientApp.Api — .NET 9, Docker/Linux)      │
│   ├─ Auth riêng cho BN: JWT + refresh, OTP, PIN, device key       │
│   ├─ IHisConnector ──► HisRestConnector (gọi API HIS qua HTTP)    │
│   │                    (I.1 "dựa trên các API HIS cung cấp")      │
│   └─ Lưu file ví giấy tờ (mã hoá at-rest)                         │
│  postgres  (CSDL RIÊNG của app — quyết định D9)                   │
│   └─ tài khoản app, thiết bị, gia đình, ví giấy tờ (metadata),    │
│      thông báo, outbox push. KHÔNG đụng schema HIS                │
│                                                                    │
│  his-api (HIS Core hiện có) + SQL Server + Orthanc PACS + LIS      │
└────────────────────────────────────────────────────────────────────┘
```

### 4.1 Quyết định kỹ thuật

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Project mới `backend/src/HIS.PatientApp.Api`** trong cùng solution `HIS.sln` | HSMT tách I.1/I.2/I.3 thành các "Hệ thống" riêng → một container triển khai riêng dễ nghiệm thu; đồng thời cô lập bề mặt Internet khỏi HIS Core |
| D2 | **`IHisConnector` + `HisRestConnector`** gọi HIS Core qua REST (Polly circuit-breaker, cache danh mục) | Đúng chữ HSMT I.1 "dựa trên các API HIS cung cấp"; thay HIS khác chỉ cần viết connector mới |
| D3 | **Thiếu endpoint → bổ sung vào HIS Core** theo Clean Architecture, có test, ghi vào inventory | Không nhân bản logic nghiệp vụ (nguyên tắc §1.4 của prompt) |
| D4 | **Push = FCM** (Android + iOS qua APNs); backend ghi `notifications` + **outbox**, relay VPS gửi | HSMT I.2 #2 + Mục II; outbox để không mất thông báo khi VPS/mạng gián đoạn |
| D5 | **PACS trên app = WebView + token ngắn hạn**, ảnh preview qua proxy `api/RISComplete/pacs/instances/{id}/rendered` | Đường proxy này là đường ảnh thật FE đang dùng; `WadoRsUrl` trong `ViewerUrlDto` trỏ route chết |
| D6 | **Web quản trị đặt trong `frontend/` hiện có**, route `/v2/patient-app/*` | Cùng stack React 19 + `_v2kit` + `TerminalLayout`; SSO sẵn bằng tài khoản HIS; không dựng app thứ hai |
| D7 | **Module tra cứu CSKH = cùng codebase Flutter**, phân vai trò bằng JWT claim `role` | Đúng HSMT I.3 #2 "trên điện thoại của nhân viên (app) **và** trên web" |
| D8 | **Flutter + Riverpod + go_router + dio**, Clean Architecture feature-first | Theo prompt §4.1 |
| D9 | **CSDL riêng của app = PostgreSQL** (container riêng trong DC) | ✅ **Quyết định 2026-09-08** — theo đúng prompt gốc §3; cô lập dữ liệu app khỏi schema HIS triệt để |
| D10 | **Flutter pin ở 3.32.8** (bản stable cuối cùng còn target iOS 12.0), quản lý bằng **FVM** theo project | ✅ **Quyết định 2026-09-08** — đáp ứng đúng chữ HSMT "iOS 12.0 trở lên". Pin theo project (không hạ SDK toàn máy) để các dự án Flutter khác trên cùng máy không bị ảnh hưởng |
| D11 | **Kế hoạch không tạo GitHub Issue mới** — theo `CLAUDE.md` (quyết định 2026-08-04). Kế hoạch sống trong tài liệu này + `docs/workspace-docs/STATUS.md` | Prompt gốc §1.2 yêu cầu tạo Issue, nhưng luật project cấm; luật project thắng |

---

## 5. Lộ trình

| Phase | Nội dung | Đầu ra & tiêu chí xong |
|---|---|---|
| **0** ✅ | Khảo sát HIS · kế hoạch · skeleton | `00-his-api-inventory.md` ✅ · `README.md` ✅ · `acceptance-matrix.md` ✅ · Flutter pin 3.32.8 qua FVM, iOS 12.0 + `minSdk 25` ✅ · `flutter analyze` sạch · widget test PASS · APK debug PASS · **3 quyết định đã chốt (§7)** |
| **1** | **Auth + bảo mật + thiết bị + push** | Đăng nhập BN có refresh · buộc đổi MK lần đầu · PIN 6 số · sinh trắc · DS thiết bị + đăng xuất từ xa · nhận push khi app chạy ngầm · relay VPS chạy · dựng `HIS.PatientApp.Api` + PostgreSQL |
| **2** | **Lấy STT + Đặt khám + realtime** | Lấy được **STT ưu tiên** ngoại trú, xem số đang gọi / còn bao nhiêu người / ước tính phút · đặt-huỷ-đổi lịch theo lịch trực thật · nhắc lịch trước 1 ngày & 1 giờ |
| **3** | **Kết quả ngoại trú** | Bảng chỉ số XN + cờ bất thường + **file PDF** · KQ CĐHA + **xem ảnh PACS** · **TDCN** · đơn thuốc · **KSK hợp đồng** |
| **4** | **Kết quả nội trú** | DS đợt điều trị · **chỉ định CLS + STT thực hiện** · XN/CĐHA/TDCN nội trú · **công khai thuốc theo ngày** (SL, đơn giá, thành tiền, BHYT chi trả) |
| **5** | **Gia đình + Ví giấy tờ + Inbox** | Liên kết **tối đa 20 thành viên** có xác minh & phân quyền · ví giấy tờ mã hoá · inbox thông báo có deep-link |
| **6** | **Web quản trị + Module tra cứu** | Dashboard · quản lý tài khoản app · quản lý đặt khám · **chiến dịch thông báo** · quản lý nhóm gia đình · tra cứu CSKH (web + app) · audit log |
| **7** ✅ | **Hardening · SSL · deploy · tài liệu · store** | ✅ Bịt IDOR §6.1 (đo bằng `phase7` TC-S01…TC-S04) · chặn chụp màn hình (FLAG_SECURE + lớp mờ iOS) · tự khoá sau 2 phút (7 unit test) · cảnh báo root/jailbreak · buộc đổi mật khẩu chặn ở server (TC-S05) · xoá tài khoản theo yêu cầu hai kho ứng dụng (TC-P06…TC-P11) · chặn bản app quá cũ (TC-P01…TC-P05) · bản in kết quả xét nghiệm (`phase3` TC-R15) · Caddy + Let's Encrypt · `deploy-runbook.md` · 3 tài liệu HDSD · `patient-app-equivalent-technology.md` · bảng nghiệm thu **39 ✅ / 8 ⚠️ / 0 ⬜** |
| **8** | **TEST** (bắt buộc, **luôn đi cuối** theo `CLAUDE.md`) | Unit/widget/golden/integration + E2E + evidence viewer |

> ⚠️ **Luật project**: mọi việc fix/feature phải xong TRƯỚC khi bắt đầu bất kỳ task test nào
> (`CLAUDE.md` §Plan/task management). Phase 8 chỉ khởi động khi Phase 1-7 đã đóng.

---

## 6. Rủi ro

### 6.1 ✅ IDOR ở HIS Core — đã đóng ở Phase 7 (2026-09-09)

**Vấn đề gốc.** `ExaminationCompleteController` (`:18`), `LISCompleteController` (`:25`),
`PdfController` (`:20`) chỉ khai `[Authorize]` **không có `Roles=`**. Một JWT `PortalPatient` hợp lệ vì
thế **qua được** `GET /api/examination/{id}/medical-record`, `GET /api/examination/{id}/lab-results`,
`GET /api/LISComplete/patients/{patientId}/history`, `GET /api/pdf/lab-result/{requestId}` — và **không
có kiểm tra** id đó thuộc về bệnh nhân nào.

**Cách bịt (xem [D18](decisions.md)).** Không đi enumerate `Roles=` cho từng controller — làm thế là
mở-mặc-định: quên một controller mới là hở lại, mà không có gì báo. Chặn theo **chủ thể**, một chỗ, ngay
sau `UseAuthentication`: [`ExternalActorScopeMiddleware`](../../../backend/src/HIS.API/Middleware/ExternalActorScopeMiddleware.cs)
nhốt mỗi role cổng ngoài trong đúng tiền tố route của cổng đó (`PortalPatient` → `/api/portal`,
`BhxhInspector` → `/api/inspector-portal`), mọi đường khác trả **403 `OUT_OF_PORTAL_SCOPE`**. Bên trong
`/api/portal` thì `ResolvePatientId`/`DenyIfNotOwnResultAsync` mới xét tiếp quyền sở hữu từng hồ sơ.

Phase 7 làm thêm hai việc để rào chắn không lệch theo thời gian:

- Danh sách role cổng ngoài nay đọc **hằng `RoleNames`** — cùng hằng mà hai chỗ phát token dùng — thay
  vì chuỗi viết tay. Đổi tên role ở một nơi không còn âm thầm vô hiệu hoá rào chắn.
- **`phase7` TC-S01…TC-S04** dựng token bệnh nhân thật rồi bắn vào cả 4 route trong danh sách trên cộng
  `GET /api/reception/opd-flow-stats`: tất cả phải 403 `OUT_OF_PORTAL_SCOPE`, `/api/portal` vẫn 200, và
  đổi `patientId` sang người khác thì 403. Đây là bằng chứng đo được, không phải đọc mã.

**Ràng buộc phát hành đi kèm rủi ro này đã được gỡ.** Vẫn còn một điều kiện độc lập: xem
[`store-release-checklist.md`](store-release-checklist.md) trước khi nộp lên hai kho ứng dụng.

### 6.2 iOS 12.0 — đã quyết: pin Flutter 3.32.8

**Quyết định 2026-09-08: giữ đúng chữ HSMT "iOS 12.0 trở lên"** bằng cách hạ Flutter.

Đã xác minh trên chính repo Flutter: mức tối thiểu iOS được nâng 12 → 13 ở commit `09d4dabd6d6`
(*"iOS: Update minimum iOS version to 13.0"*, 2025-04-24), và tag stable **đầu tiên** chứa commit đó là
**3.35.0**. Tiếp đó 13 → 15 ở `5ead723e20e`. Vì vậy **Flutter 3.32.8 là bản stable cuối cùng còn target
iOS 12.0** — đã kiểm chứng template của tag 3.32.8 ghi `IPHONEOS_DEPLOYMENT_TARGET = 12.0`.

Cách triển khai: **pin theo project bằng FVM** (`.fvmrc` = `3.32.8`), **không hạ SDK toàn máy** — các
project Flutter khác trên cùng máy vẫn dùng bản mới. Lệnh chạy là `fvm flutter …`, và `pubspec.yaml`
khoá `flutter: ">=3.32.0 <3.35.0"` để không ai vô tình nâng lên bản làm mất iOS 12.

**Cái giá phải trả — theo dõi suốt vòng đời hợp đồng:**

| Hệ quả | Chi tiết |
|---|---|
| Flutter 3.32.8 **không còn nhận bản vá bảo mật** | Phát hành 2025-07-25. Phải tự theo dõi CVE của Flutter/Dart và của từng package |
| Toàn bộ package phải dùng **bản cũ hơn** | Riverpod **2.6** (không dùng được Riverpod 3), `flutter_secure_storage` 10.x, `local_auth` 2.x, `go_router` 17, `file_picker` 11, `flutter_lints` 5… |
| Không dùng được tính năng ngôn ngữ/framework mới | Code phải giữ trong khả năng của **Dart 3.8** |
| Rủi ro khi store siết yêu cầu | Nếu Apple/Google về sau bắt buộc SDK mới hơn, sẽ phải nâng Flutter và **mất iOS 12** — lúc đó vẫn quay về bài toán §6.2 nhưng ở thời điểm gấp hơn |

**Bốn chỉnh sửa Android bắt buộc** để bộ package hiện tại build được trên template cũ của 3.32.8 —
ghi lại để không ai "dọn dẹp" nhầm:

| Chỉnh sửa | Ở đâu | Vì sao |
|---|---|---|
| `ndkVersion = "27.0.12077973"` | `android/app/build.gradle.kts` | 19 plugin (firebase, pdfrx, secure_storage…) đòi NDK 27; mặc định của 3.32.8 là 26.3 |
| `compileSdk = 36` | `android/app/build.gradle.kts` | `androidx.core 1.18.0` do các plugin kéo vào bắt buộc compile với API 36. **Không đụng tới `minSdk = 25`** |
| AGP `8.7.3` → `8.9.1` | `android/settings.gradle.kts` | `androidx.core 1.18.0` đòi AGP ≥ 8.9.1. Gradle 8.12 trong wrapper đã đủ |
| `isCoreLibraryDesugaringEnabled = true` + `desugar_jdk_libs:2.1.4` | `android/app/build.gradle.kts` | `flutter_local_notifications` dùng `java.time` vốn chỉ có từ API 26. Desugaring dịch ngược xuống bytecode chạy được trên Android 7.1 — **chính là thứ cho phép giữ `minSdk 25`** |

Hai package phải ghim bản cũ hơn nữa vì bản mới đòi Android SDK 36 / Kotlin DSL mới:
`permission_handler` **11.3.1** và `flutter_secure_storage` **9.2.4`.

> ⚠️ `flutter_secure_storage` 9.x mặc định **KHÔNG mã hoá** trên Android — phải truyền
> `AndroidOptions(encryptedSharedPreferences: true)`, đã làm ở
> `lib/core/storage/secure_store.dart`. Bản 11.x mã hoá mặc định nhưng không dùng được ở đây.

Cổng đã chạy lại đầy đủ trên 3.32.8: `fvm flutter analyze` **sạch** · widget test **PASS** ·
`fvm flutter build apk --debug` **PASS** · `ios/Runner.xcodeproj/project.pbxproj` (3 chỗ),
`ios/Flutter/AppFrameworkInfo.plist` và `ios/Podfile` đều ghi **12.0**.

### Ba tầng chặn iOS 12 đã gỡ được (phát hiện bằng build thật trên macOS runner)

Không tầng nào trong số này lộ ra khi build trên Windows: `flutter pub upgrade` báo thành công,
`flutter analyze` sạch, APK build ngon. Chúng chỉ hiện ra ở bước `pod install` / `xcodebuild`.

| # | Chặn ở đâu | Vì sao | Cách gỡ |
|---|---|---|---|
| 1 | `biometric_signature` 13.x | podspec khai `s.platform = :ios, '13.0'` | Hạ về **6.x** (bản cuối còn 12.0). Kéo theo đổi chữ ký từ ECDSA P-256 sang **RSA-2048 SHA-256 PKCS#1 v1.5** ở cả app lẫn server |
| 2 | `firebase_core` 4.x | đòi **iOS 15.0** | Hạ về **2.x** (Firebase iOS SDK 10.x). Kéo theo phải lùi 6 gói khác vì `firebase_messaging` 14.x dùng gói `web` 0.5 còn các gói mới đã sang `web` 1.x |
| 3 | Xcode dừng ở *"Include of non-modular header inside framework module"* | `Firebase` là pod **chỉ-có-header**, CocoaPods không dựng framework cho nó được nên header không modular; mà `firebase_messaging` lại là framework module và import đúng header đó | **Bỏ hẳn `use_frameworks!`** (dùng thư viện tĩnh) + `use_modular_headers!`. Không còn framework module thì lệnh import trở thành include thường và hợp lệ |

Ở tầng 3, năm cách sau **đã thử và không hiệu quả** — ghi lại để khỏi lặp: chỉ đặt
`CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES`; `use_frameworks! :linkage => :static`;
khai `:modular_headers => true` riêng cho từng pod Firebase; tắt `ENABLE_MODULE_VERIFIER`;
`use_frameworks!` đi kèm `use_modular_headers!`.

**Kết quả đo được** (workflow `.github/workflows/mobile-patient-app.yml`, Xcode 16.4):
`flutter build ios --simulator` **PASS**, và `MinimumOSVersion` trong `Info.plist` của **chính bản
build ra** = **12.0**. Chạy 7/7 test và chụp 6 màn trên iPhone simulator.

> ⚠️ Giữ được iOS 12 là điều kiện **mong manh**: 7 gói phải ghim ở bản cũ. CI có bước
> `scripts/check-ios-min-deployment-target.py` đọc `pubspec.lock` rồi soi podspec từng plugin, nên
> chặn được ngay trên Linux/Windows mà không cần macOS.

### 6.3 🟠 Khác

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| `GetBillingStatement6556Async` là **stub hard-code** (`InpatientCompleteService.Discharge.cs:381-390`) | Nếu app dùng, hiển thị số liệu bịa | Không dùng route này; implement thật nếu cần |
| Slot đặt khám hard-code, không đọc `DoctorSchedule` | BN đặt vào giờ bác sĩ không trực → khiếu nại | Phase 2 nối slot vào lịch trực thật |
| Hai hệ thống số (`QueueTicket` vs `KioskTicket`) không liên thông | Số trên app khác số ở kiosk | Chốt `QueueTicket` là nguồn sự thật; ghi rõ trong HDSD |
| `StudyShareService` từ chối `HideDemographics` | Tên BN lộ trong DICOM tag nếu dùng share-link | Dùng đường proxy có xác thực thay vì share-link công khai |
| VPS 2GB RAM | Stack quá tải | Đo RAM thật khi triển khai; giữ < 1.5GB |
| Không giới hạn người dùng | Tải cao lúc cao điểm sáng | Cache danh mục, rate-limit, đo tải ở Phase 7 |

---

## 7. ✅ Các quyết định đã chốt (2026-09-08)

| # | Vấn đề | Quyết định | Đã làm gì |
|---|---|---|---|
| **Q1** | iOS tối thiểu | **Giữ iOS 12.0 đúng HSMT** — hạ Flutter về **3.32.8** | Pin bằng FVM theo project (`.fvmrc`), tái sinh `android/` + `ios/` theo template 3.32.8, giải lại toàn bộ package cho Dart 3.8. Chi tiết + cái giá phải trả: §6.2 |
| **Q2** | CSDL riêng của app | **PostgreSQL** (container riêng trong DC), theo prompt gốc §3 | Ghi vào quyết định D9; dựng ở Phase 1 |
| **Q3** | Lỗ IDOR ở 3 controller HIS Core | **Xử lý ở Phase 7 (hardening)** — ✅ **đã đóng 2026-09-09** | Chặn theo chủ thể ở `ExternalActorScopeMiddleware` thay vì enumerate `Roles=` từng controller; role đọc từ hằng `RoleNames`; `phase7` TC-S01…TC-S04 đo lại bằng token thật. Chi tiết: §6.1 + [D18](decisions.md) |
