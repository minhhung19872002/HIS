import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/app_flavor.dart';
import 'core/providers.dart';

/// Điểm khởi động chung: mỗi `main_<flavor>.dart` chỉ việc truyền cấu hình của
/// môi trường mình vào. Giữ một chỗ duy nhất để về sau thêm Firebase, Crashlytics,
/// kiểm tra root/jailbreak… mà không phải sửa ba file.
Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    ProviderScope(
      overrides: [appConfigProvider.overrideWithValue(config)],
      child: const PatientApp(),
    ),
  );
}
