import 'dart:ui' show Size;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';

void main() {
  testWidgets('Trang chủ hiển thị đủ 6 lối tắt theo HSMT I.2', (tester) async {
    // Khung test mặc định 800x600 quá thấp: GridView lazy nên hai ô cuối chưa
    // được dựng và test sẽ trượt oan. Đặt khung cao bằng một máy thật.
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [appConfigProvider.overrideWithValue(AppConfig.dev)],
        child: const PatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Lấy số thứ tự'), findsOneWidget);
    expect(find.text('Đặt khám'), findsOneWidget);
    expect(find.text('Kết quả khám'), findsOneWidget);
    expect(find.text('Đơn thuốc'), findsOneWidget);
    expect(find.text('Ví giấy tờ'), findsOneWidget);
    expect(find.text('Gia đình'), findsOneWidget);
  });
}
