import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/home/data/app_config_repository.dart';
import 'package:patient_app/features/home/presentation/update_gate.dart';

/// Cổng buộc cập nhật (HSMT I.2 #1).
///
/// Cổng này phủ lên **toàn bộ** app, kể cả màn đăng nhập. Nó chặn nhầm thì người bệnh không vào được
/// hồ sơ của chính mình và cũng không có đường vòng nào — không đăng nhập được thì cũng không có cách
/// nào nhờ tổng đài mở khoá. Vì thế mọi trường hợp "không chắc" ở đây đều phải nghiêng về **cho đi
/// tiếp**, và đó là thứ bộ test này canh.
void main() {
  const child = Text('Nội dung app', key: Key('app-content'));

  Future<void> pumpWith(WidgetTester tester, RemoteAppConfig config) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [remoteAppConfigProvider.overrideWith((ref) async => config)],
      child: const MaterialApp(home: UpdateGate(child: child)),
    ));
    await tester.pump();     // để FutureProvider kịp trả giá trị
    await tester.pump();
  }

  const tooOld = RemoteAppConfig(
    minimumVersion: '2.0.0', latestVersion: '2.0.0',
    storeUrl: 'https://play.google.com/store/apps/details?id=vn.bluestar.his',
    updateRequired: true, updateAvailable: true,
  );

  testWidgets('Bản đủ mới thì đi thẳng vào app', (tester) async {
    await pumpWith(tester, const RemoteAppConfig(
      minimumVersion: '1.0.0', latestVersion: '1.2.0', storeUrl: 'https://play.google.com/x',
      updateRequired: false, updateAvailable: true,
    ));

    expect(find.byKey(const Key('app-content')), findsOneWidget);
    expect(find.text('Cần cập nhật ứng dụng'), findsNothing);
  });

  testWidgets('Bản quá cũ thì bị chặn, kèm nút mở kho ứng dụng', (tester) async {
    await pumpWith(tester, tooOld);

    expect(find.byKey(const Key('app-content')), findsNothing);
    expect(find.text('Cần cập nhật ứng dụng'), findsOneWidget);
    expect(find.text('Mở Google Play'), findsOneWidget);
  });

  testWidgets('Nói rõ VÌ SAO phải cập nhật, không chỉ ra lệnh', (tester) async {
    await pumpWith(tester, tooOld);

    // Người bệnh bị chặn giữa chừng cần biết lý do, nếu không họ nghĩ app hỏng.
    expect(find.textContaining('có thể hiển thị thông tin không chính xác'), findsOneWidget);
  });

  testWidgets('Có số hỗ trợ thì hiện nút gọi — người lớn tuổi cần một lối thoát', (tester) async {
    await pumpWith(tester, const RemoteAppConfig(
      minimumVersion: '2.0.0', latestVersion: '2.0.0', storeUrl: '',
      updateRequired: true, updateAvailable: true, supportPhone: '1900 1234',
    ));

    expect(find.textContaining('1900 1234'), findsOneWidget);
  });

  testWidgets('Không có đường tới kho thì KHÔNG hiện nút chết', (tester) async {
    await pumpWith(tester, const RemoteAppConfig(
      minimumVersion: '2.0.0', latestVersion: '2.0.0', storeUrl: '',
      updateRequired: true, updateAvailable: false,
    ));

    expect(find.text('Cần cập nhật ứng dụng'), findsOneWidget);
    expect(find.text('Mở Google Play'), findsNothing);
    expect(find.text('Mở App Store'), findsNothing);
  });

  testWidgets('Thông báo bảo trì của bệnh viện được hiện nguyên văn', (tester) async {
    await pumpWith(tester, const RemoteAppConfig(
      minimumVersion: '2.0.0', latestVersion: '2.0.0', storeUrl: '',
      updateRequired: true, updateAvailable: false,
      maintenanceMessage: 'Hệ thống bảo trì từ 22h đến 24h ngày 09/09.',
    ));

    expect(find.text('Hệ thống bảo trì từ 22h đến 24h ngày 09/09.'), findsOneWidget);
  });

  testWidgets('MẤT MẠNG (không đọc được cấu hình) thì KHÔNG chặn ai', (tester) async {
    // `RemoteAppConfig.unknown` là thứ provider trả về khi lời gọi máy chủ hỏng.
    await pumpWith(tester, RemoteAppConfig.unknown);

    expect(find.byKey(const Key('app-content')), findsOneWidget);
    expect(find.text('Cần cập nhật ứng dụng'), findsNothing);
  });

  testWidgets('Trong lúc CHỜ máy chủ trả lời cũng không chặn', (tester) async {
    // Chặn lúc đang chờ thì người bệnh thấy màn "cần cập nhật" chớp lên rồi biến mất — đủ để họ tin
    // là app hỏng và gọi lên tổng đài.
    await tester.pumpWidget(ProviderScope(
      overrides: [
        remoteAppConfigProvider.overrideWith(
          (ref) => Completer<RemoteAppConfig>().future,   // không bao giờ xong
        ),
      ],
      child: const MaterialApp(home: UpdateGate(child: child)),
    ));
    await tester.pump();

    expect(find.byKey(const Key('app-content')), findsOneWidget);
  });

  group('Dải nhắc "có bản mới" — mời chứ không chặn', () {
    Future<void> pumpBanner(WidgetTester tester, RemoteAppConfig config) async {
      await tester.pumpWidget(ProviderScope(
        overrides: [remoteAppConfigProvider.overrideWith((ref) async => config)],
        child: const MaterialApp(home: Scaffold(body: UpdateAvailableBanner())),
      ));
      await tester.pump();
      await tester.pump();
    }

    testWidgets('Có bản mới thì hiện dải nhắc kèm số hiệu bản', (tester) async {
      await pumpBanner(tester, const RemoteAppConfig(
        minimumVersion: '1.0.0', latestVersion: '1.5.0', storeUrl: 'https://play.google.com/x',
        updateRequired: false, updateAvailable: true,
      ));

      expect(find.text('Đã có phiên bản 1.5.0'), findsOneWidget);
      expect(find.text('Cập nhật'), findsOneWidget);
    });

    testWidgets('Đang là bản mới nhất thì không hiện gì', (tester) async {
      await pumpBanner(tester, const RemoteAppConfig(
        minimumVersion: '1.0.0', latestVersion: '1.5.0', storeUrl: '',
        updateRequired: false, updateAvailable: false,
      ));

      expect(find.textContaining('Đã có phiên bản'), findsNothing);
    });

    testWidgets('Khi đã BỊ CHẶN thì không hiện thêm dải nhắc (tránh hai lời nhắc chồng nhau)',
        (tester) async {
      await pumpBanner(tester, tooOld);
      expect(find.textContaining('Đã có phiên bản'), findsNothing);
    });
  });

  group('RemoteAppConfig.fromJson', () {
    test('Thiếu trường thì mặc định là KHÔNG chặn', () {
      final config = RemoteAppConfig.fromJson(const <String, dynamic>{});

      expect(config.updateRequired, isFalse);
      expect(config.updateAvailable, isFalse);
      expect(config.hasMaintenanceMessage, isFalse);
    });

    test('Thông báo bảo trì rỗng không làm hiện khối trống', () {
      expect(RemoteAppConfig.fromJson({'maintenanceMessage': ''}).hasMaintenanceMessage, isFalse);
    });

    test('Đọc đủ mọi trường máy chủ trả về', () {
      final config = RemoteAppConfig.fromJson({
        'minimumVersion': '1.0.0', 'latestVersion': '1.5.0',
        'storeUrl': 'https://apps.apple.com/vn/app/id123',
        'updateRequired': true, 'updateAvailable': true,
        'maintenanceMessage': 'Bảo trì', 'supportPhone': '1900 1234',
      });

      expect(config.minimumVersion, '1.0.0');
      expect(config.latestVersion, '1.5.0');
      expect(config.updateRequired, isTrue);
      expect(config.hasMaintenanceMessage, isTrue);
      expect(config.supportPhone, '1900 1234');
    });
  });
}
