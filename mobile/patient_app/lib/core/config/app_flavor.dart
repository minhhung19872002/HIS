/// Ba môi trường chạy của app theo HSMT/prompt §4.1: mỗi flavor có base URL và
/// cấu hình Firebase riêng, chọn lúc khởi động qua `main_<flavor>.dart`.
enum AppFlavor { dev, staging, prod }

/// Cấu hình bất biến của một lần chạy app. Không đọc trực tiếp ở tầng feature —
/// luôn lấy qua `appConfigProvider` để test thay được bằng cấu hình giả.
class AppConfig {
  const AppConfig({
    required this.flavor,
    required this.apiBaseUrl,
    required this.appName,
    this.enableHttpLog = false,
    this.connectTimeout = const Duration(seconds: 15),
    this.receiveTimeout = const Duration(seconds: 30),
  });

  final AppFlavor flavor;

  /// Gốc của BFF (HIS.PatientApp.Api), KHÔNG phải HIS Core — app không bao giờ
  /// gọi thẳng HIS Core, mọi thứ đi qua BFF (kiến trúc README §4).
  final String apiBaseUrl;
  final String appName;

  /// Chỉ bật ở dev/staging. Ở prod luôn tắt: log không được chứa dữ liệu y tế.
  final bool enableHttpLog;

  final Duration connectTimeout;
  final Duration receiveTimeout;

  bool get isProd => flavor == AppFlavor.prod;

  static const dev = AppConfig(
    flavor: AppFlavor.dev,
    // 10.0.2.2 = localhost của máy chủ nhìn từ Android emulator.
    apiBaseUrl: 'http://10.0.2.2:5200/api/v1',
    appName: 'HIS Người bệnh (Dev)',
    enableHttpLog: true,
  );

  static const staging = AppConfig(
    flavor: AppFlavor.staging,
    apiBaseUrl: 'https://staging-app.bluestar.com.vn/api/v1',
    appName: 'HIS Người bệnh (Staging)',
    enableHttpLog: true,
  );

  static const prod = AppConfig(
    flavor: AppFlavor.prod,
    apiBaseUrl: 'https://app.bluestar.com.vn/api/v1',
    appName: 'HIS Người bệnh',
  );
}
