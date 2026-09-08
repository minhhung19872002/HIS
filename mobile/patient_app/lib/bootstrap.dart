import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'core/config/app_flavor.dart';
import 'core/providers.dart';
import 'core/push_providers.dart';

/// Điểm khởi động chung: mỗi `main_<flavor>.dart` chỉ việc truyền cấu hình của môi trường mình vào.
/// Giữ một chỗ duy nhất để về sau thêm Crashlytics, kiểm tra root/jailbreak… mà không phải sửa ba file.
Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();

  // Nạp dữ liệu định dạng ngày tiếng Việt. Thiếu bước này thì DateFormat('EEEE', 'vi')
  // ném lỗi ngay lần đầu hiển thị lịch hẹn.
  await initializeDateFormatting('vi');

  final container = ProviderContainer(
    overrides: [appConfigProvider.overrideWithValue(config)],
  );

  // Khởi tạo thông báo đẩy TRƯỚC khi dựng giao diện, để bắt được trường hợp người dùng mở app bằng
  // cách chạm vào thông báo lúc app đang tắt hẳn.
  //
  // Cố ý không await trong khối chặn giao diện: máy chưa cấu hình Firebase vẫn phải vào được app.
  // Một ứng dụng y tế không được phép chết ở màn khởi động chỉ vì thiếu tệp cấu hình thông báo.
  unawaited(container.read(pushServiceProvider).initialize());

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const PatientApp(),
    ),
  );
}

/// `unawaited` của `dart:async` — khai báo tại chỗ để khỏi kéo cả thư viện chỉ vì một hàm.
void unawaited(Future<void> future) {
  future.catchError((Object error) {
    debugPrint('[bootstrap] lỗi nền bị bỏ qua: $error');
  });
}
