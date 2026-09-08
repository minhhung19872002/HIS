import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

/// Driver cho bộ chụp màn hình chạy trên máy thật / máy ảo.
///
/// Chạy:
///   fvm flutter drive \
///     --driver=test_driver/integration_test.dart \
///     --target=integration_test/screenshots_test.dart \
///     -d [thiết bị]
///
/// Ảnh được ghi vào `screenshots/<tên>.png` ngay trong thư mục project, để CI thu lại làm hiện vật.
Future<void> main() async {
  await integrationDriver(
    onScreenshot: (String name, List<int> bytes, [Map<String, Object?>? args]) async {
      final directory = Directory('screenshots');
      if (!directory.existsSync()) directory.createSync(recursive: true);

      final file = File('${directory.path}/$name.png');
      file.writeAsBytesSync(bytes);
      // In ra để đọc được ngay trong log CI khi ảnh không thấy đâu.
      stdout.writeln('[screenshot] ${file.path} (${bytes.length} bytes)');
      return true;
    },
  );
}
