import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/core/theme/app_theme.dart';
import 'package:patient_app/features/queue/presentation/queue_ticket_page.dart';

/// Ba hàng thống kê ở màn số thứ tự phải ĐỌC ĐƯỢC, kể cả khi giá trị là một câu dài.
///
/// Bộ này canh một lỗi đã lọt tới tay chủ đầu tư: hàng "Đang gọi số" bị bẻ thành MỘT CHỮ MỖI
/// DÒNG — "Đ / a / n / g / g / ọ / i / s / ố" — chiếm gần nửa màn hình.
///
/// Nguyên nhân: nhãn là `Expanded` còn giá trị là `Text` trần. `Text` trần trong `Row` là con
/// KHÔNG co giãn, nên nó lấy đúng bề rộng nó muốn rồi mới chừa phần thừa cho `Expanded`. Gặp giá
/// trị dài như "Chưa gọi số nào" đặt bằng phông Sora w800 cỡ 19 thì nhãn chỉ còn vài pixel.
///
/// Vì sao bộ chụp bằng chứng không bắt được: dữ liệu mẫu luôn trả `currentServingTicket: "A-037"`
/// — một mã ngắn. Trạng thái "chưa gọi số nào" chưa từng được chụp. Đó là lỗ hổng của bộ chụp,
/// không phải của mã.
void main() {
  /// Máy chủ giả trả trạng thái vé với `currentServingTicket` tuỳ ý.
  HttpClientAdapter adapterWith({String? currentServing}) => _StatusAdapter(currentServing);

  Future<void> pumpTicket(WidgetTester tester, {String? currentServing}) async {
    // Máy hẹp nhất còn được hỗ trợ (Android 7.1 đời cũ hay ở mức này) — chỗ chật nhất là chỗ lỗi
    // bố cục lộ ra trước.
    // Tắt hoạt ảnh: chip "TRỰC TIẾP" có chấm thở chạy vô hạn, khung hình không bao giờ đứng yên
    // và `pumpAndSettle` sẽ treo. App vốn tôn trọng thiết lập này của hệ điều hành.
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true, reduceMotion: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    // Hẹp 320dp (chỗ lỗi bố cục lộ ra) nhưng CAO, để ba hàng thống kê nằm trong tầm dựng —
    // `ListView` chỉ dựng phần đang thấy, dưới nếp gấp thì `find.text` không thấy gì.
    tester.view.physicalSize = const Size(960, 2900);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(
          Dio(BaseOptions(baseUrl: 'http://demo.local/api/v1'))
            ..httpClientAdapter = adapterWith(currentServing: currentServing),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: const QueueTicketPage(ticketId: 't1'),
      ),
    ));
    await tester.pumpAndSettle();
  }

  /// Chiều cao một dòng chữ 15sp vào khoảng 20dp. Vượt xa mức đó nghĩa là chữ đã bị bẻ nhiều dòng.
  const oneLineIsh = 56.0;

  testWidgets('nhãn KHÔNG bị bẻ dòng khi giá trị là câu dài', (tester) async {
    await pumpTicket(tester, currentServing: null);

    expect(find.text('Đang gọi số'), findsOneWidget);
    expect(find.text('Chưa gọi số nào'), findsOneWidget);

    final labelHeight = tester.getSize(find.text('Đang gọi số')).height;
    expect(labelHeight, lessThan(oneLineIsh),
        reason: 'nhãn cao $labelHeight — bị bóp thành nhiều dòng, đúng lỗi "Đ/a/n/g" đã gặp');
  });

  testWidgets('nhãn vẫn gọn khi giá trị là mã số ngắn', (tester) async {
    await pumpTicket(tester, currentServing: 'A-037');

    expect(find.text('A-037'), findsOneWidget);
    expect(tester.getSize(find.text('Đang gọi số')).height, lessThan(oneLineIsh));
  });

  testWidgets('cả ba hàng thống kê đều đọc được', (tester) async {
    await pumpTicket(tester, currentServing: null);

    for (final label in ['Đang gọi số', 'Còn chờ trước bạn', 'Dự kiến còn khoảng']) {
      expect(find.text(label), findsOneWidget, reason: 'thiếu hàng "$label"');
      expect(tester.getSize(find.text(label)).height, lessThan(oneLineIsh),
          reason: 'hàng "$label" bị bẻ dòng');
    }
  });
}

/// Trả về trạng thái vé; mọi tuyến khác trả danh sách rỗng.
class _StatusAdapter implements HttpClientAdapter {
  _StatusAdapter(this.currentServing);

  final String? currentServing;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? _, Future<void>? __) async {
    final serving = currentServing == null ? 'null' : '"$currentServing"';
    final body = options.path.contains('/status')
        ? '{"success":true,"data":{"ticketId":"t1","ticketCode":"A-042",'
            '"roomName":"Phòng khám 1","status":0,"statusName":"Đang chờ",'
            '"currentServingTicket":$serving,"peopleAhead":0,"estimatedWaitMinutes":0,'
            '"priority":0,"priorityVerified":true},"message":null}'
        : '{"success":true,"data":[],"message":null}';

    return ResponseBody.fromString(
      body,
      200,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}
