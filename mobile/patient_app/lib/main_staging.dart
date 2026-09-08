import 'bootstrap.dart';
import 'core/config/app_flavor.dart';

/// Chạy: flutter run -t lib/main_staging.dart
Future<void> main() => bootstrap(AppConfig.staging);
