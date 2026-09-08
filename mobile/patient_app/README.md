# HIS PatientApp — ứng dụng di động hỗ trợ người bệnh

App Flutter (iOS + Android) cho gói thầu *"Thuê phần mềm ứng dụng di động (app mobile) phục vụ công
tác quản lý, hỗ trợ người bệnh"*.

📚 Kế hoạch, khảo sát API và bảng nghiệm thu: [`docs/features/patient-app/`](../../docs/features/patient-app/).

---

## ⚠️ Bắt buộc: chạy bằng `fvm flutter`, KHÔNG dùng `flutter` trực tiếp

Project **pin ở Flutter 3.32.8** — bản stable **cuối cùng** còn target **iOS 12.0**, đúng yêu cầu
"iOS 12.0 trở lên" của hồ sơ mời thầu. Từ Flutter 3.35.0 mức tối thiểu là iOS 13.0, và bản mới nhất là
iOS 15.0. Chạy bằng SDK toàn cục (thường là bản mới) sẽ **âm thầm nâng deployment target và làm mất
iOS 12** — `pubspec.yaml` có khoá `flutter: ">=3.32.0 <3.35.0"` để chặn, nhưng đừng dựa vào đó.

### Cài đặt lần đầu

```bash
dart pub global activate fvm     # nếu chưa có
cd mobile/patient_app
fvm install                      # đọc .fvmrc → tải đúng 3.32.8
fvm flutter pub get
```

### Lệnh hằng ngày

```bash
fvm flutter run -t lib/main_dev.dart      # dev (API 10.0.2.2:5200 cho Android emulator)
fvm flutter run -t lib/main_staging.dart  # staging
fvm flutter run                           # prod (lib/main.dart)

fvm flutter analyze
fvm flutter test
fvm flutter build apk --debug
```

IDE (VS Code / Android Studio) cần trỏ Flutter SDK path vào `.fvm/flutter_sdk` của project.

---

## Cấu trúc

```
lib/
  main.dart / main_dev.dart / main_staging.dart   # 3 flavor, chỉ khác cấu hình
  bootstrap.dart                                   # điểm khởi động chung
  app.dart                                         # MaterialApp.router
  core/
    config/     AppConfig + AppFlavor (base URL, timeout, cờ log)
    network/    DioFactory · AuthInterceptor (refresh single-flight) · failure_mapper
    storage/    SecureStore (Keychain / EncryptedSharedPreferences)
    error/      Failure — lỗi đã chuẩn hoá cho tầng UI
    router/     go_router
    theme/      Material 3, sáng/tối, vùng chạm 48dp cho người cao tuổi
    providers.dart
  features/<tính năng>/{data,domain,presentation}
  l10n/         app_vi.arb (mặc định) · app_en.arb
```

`lib/l10n/app_localizations*.dart` là **code sinh tự động** (`generate: true`), không commit — cứ
`fvm flutter pub get` là có lại.

## Ngưỡng nền tảng

| Nền tảng | Mức tối thiểu | Nơi khai báo |
|---|---|---|
| Android | API **25** (Android 7.1.1) | `android/app/build.gradle.kts` |
| iOS | **12.0** | `ios/Runner.xcodeproj/project.pbxproj`, `ios/Flutter/AppFrameworkInfo.plist` |

Sửa hai giá trị này = đổi phạm vi cam kết với chủ đầu tư. Đừng sửa nếu không có quyết định bằng văn bản.
