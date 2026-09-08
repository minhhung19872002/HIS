import 'bootstrap.dart';
import 'core/config/app_flavor.dart';

/// Điểm vào mặc định (bản phát hành). Tương đương `main_prod.dart` — giữ tên
/// `main.dart` để `flutter run`/`flutter build` không cần cờ `-t`.
Future<void> main() => bootstrap(AppConfig.prod);
