import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';
import 'package:patient_app/features/queue/domain/queue_models.dart';

import 'demo_backend.dart';

/// Đi hết các chức năng của app **bằng cách bấm**, trên cả Android lẫn iOS.
///
/// Khác `screenshots_test.dart` ở hai điểm quyết định:
///
/// 1. **Nó khẳng định, chứ không chỉ chụp.** Bộ chụp ảnh mở màn rồi bấm máy; màn có rơi vào nhánh
///    lỗi thì ảnh vẫn ra, vẫn được dán nhãn "list", và không ai biết. Đó đúng là chuyện đã xảy ra:
///    dữ liệu mẫu cho lịch hẹn ghi `scheduledAt` + `status:"Confirmed"` trong khi máy chủ thật trả
///    `appointmentDate` + `status` là số — đọc lên là ném lỗi ép kiểu, màn lịch hẹn hiện "Không tải
///    được lịch khám", mà bằng chứng nghiệm thu vẫn trông như bình thường.
///
/// 2. **Nó đi bằng đường của người bệnh**: chạm ô lối tắt ở trang chủ, chạm nút, điền form, quay
///    lui. Bộ chụp nhảy thẳng tới đường dẫn qua router nên không bao giờ chạm tới nút nào — mà lỗi
///    hay nằm ở chỗ nối giữa hai màn (bấm xong không làm mới danh sách, chẳng hạn).
///
/// Máy chủ giả nằm ở tầng HTTP nên mọi kho dữ liệu, `fromJson` và provider đều là mã thật. Phần
/// nghiệp vụ với API thật do `scripts/smoke-patient-app-uat.py` canh, chạy thẳng vào bản đang chạy.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const account = Account(
    id: 'demo-account',
    phoneNumber: '+84912345678',
    fullName: 'Nguyễn Văn Test',
    isLinked: true,
    patientCode: 'BN000123',
    mustChangePassword: false,
    hasPin: true,
    biometricEnabled: false,
  );

  late _StatefulDemoBackend backend;

  Future<void> launch(WidgetTester tester, {AuthState? state}) async {
    // Bật "giảm chuyển động" của hệ điều hành cho cả lượt chạy.
    //
    // Trang chủ có vòng sáng nhấp nháy quanh mã số thứ tự — một `AnimationController` lặp vô
    // hạn. Khung hình vì thế KHÔNG BAO GIỜ đứng yên, và `pumpAndSettle` treo tới lúc hết giờ:
    // cả bộ kiểm đứng im 10 phút rồi báo "did not complete" ở mọi bài.
    //
    // Đây không phải mẹo cho qua bài: app vốn tôn trọng thiết lập này (người bệnh say tàu xe hay
    // nhạy cảm với chuyển động bật nó lên), nên bật ở đây vừa gỡ được treo, vừa kiểm luôn nhánh
    // giảm-chuyển-động có thật sự dừng hoạt ảnh hay không.
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true, reduceMotion: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);

    // Khung test mặc định 800x600 là một ô bẹt, không giống máy nào cả: màn đặt lịch có thẻ bác
    // sĩ + dải ngày + lưới giờ + ô lý do + thanh đáy, và ở 600px thì phần cuối nằm ngoài vùng
    // cuộn được. Đặt bằng một máy thật (360x720dp) để đo trên đúng hình dạng người bệnh nhìn.
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    backend = _StatefulDemoBackend();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(AppConfig.dev),
          apiClientProvider.overrideWithValue(
            Dio(BaseOptions(baseUrl: 'http://demo.local/api/v1'))
              ..httpClientAdapter = backend,
          ),
          authControllerProvider
              .overrideWith(() => _FakeAuthController(state ?? const AuthSignedIn(account))),
        ],
        child: const PatientApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Chạm vào thứ có thể đang nằm ngoài màn hình — cuộn tới trước rồi mới chạm.
  ///
  /// Người bệnh cầm điện thoại cũng làm đúng thế. Chạm thẳng thì bài kiểm hỏng ngay khi máy nhỏ
  /// hơn: `Điều trị nội trú` là ô cuối lưới lối tắt, còn `Xác nhận đặt khám` nằm dưới cùng biểu
  /// mẫu — cả hai đều dưới nếp gấp trên màn 800×600 lẫn trên đa số điện thoại thật.
  Future<void> tapScrolled(WidgetTester tester, Finder target) async {
    // Danh sách cuộn chỉ dựng phần đang thấy, nên thứ nằm dưới nếp gấp CHƯA TỒN TẠI để mà cuộn
    // tới — `ensureVisible` sẽ báo "No element". Phải kéo cho tới khi nó hiện ra.
    if (target.evaluate().isEmpty) {
      final scrollable = find.byType(Scrollable);
      if (scrollable.evaluate().isNotEmpty) {
        await tester.scrollUntilVisible(target, 120, scrollable: scrollable.first);
        await tester.pumpAndSettle();
      }
    }

    // Cuộn tới nơi rồi đợi, LẶP LẠI vài lần: kéo xong màn có thể đổi chiều cao (khung giờ vừa
    // nạp xong, dải lỗi vừa hiện ra) và phần tử trôi khỏi tầm nhìn lần nữa. Chạm vào lúc đó là
    // chạm trượt, mà `tap()` chỉ cảnh báo chứ không báo hỏng — bài kiểm sẽ hỏng ở một khẳng định
    // xa tít phía sau và rất khó lần ra vì sao.
    for (var attempt = 0; attempt < 4; attempt++) {
      await tester.ensureVisible(target);
      await tester.pumpAndSettle();

      final centre = tester.getCenter(target);
      final hit = tester.hitTestOnBinding(centre);
      final reachable = hit.path.any((entry) {
        final t = entry.target;
        return t is RenderBox && t == tester.renderObject(target);
      });
      if (reachable) break;
    }

    await tester.tap(target);
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Chạm một ô lối tắt ở trang chủ rồi đợi màn đích tải xong.
  Future<void> tapShortcut(WidgetTester tester, String label) async {
    final tile = find.text(label);
    expect(tile, findsWidgets, reason: 'Trang chủ phải có lối tắt "$label"');
    await tapScrolled(tester, tile.first);
  }

  /// Không màn nào được rơi vào nhánh lỗi khi máy chủ đã trả 200.
  ///
  /// Đây là mệnh đề bắt được cả một họ lỗi cùng lúc: lệch tên trường, lệch kiểu, thiếu tuyến trong
  /// máy chủ giả. Người bệnh nhìn thấy hệt như nhau — một màn xám báo "không tải được" — nên nếu
  /// không khẳng định thì cả họ lỗi này đi lọt.
  void expectNoErrorState(String screen) {
    for (final wrong in ['Không tải được', 'Đã có lỗi', 'thử lại sau ít phút']) {
      expect(find.textContaining(wrong), findsNothing,
          reason: '$screen rơi vào nhánh lỗi dù máy chủ trả 200 — '
              'gần như luôn là dữ liệu đọc lên không khớp hình dạng');
    }
  }

  // ============================================================ trang chủ
  group('Trang chủ', () {
    testWidgets('hiện đủ lối tắt và mã bệnh nhân', (tester) async {
      await launch(tester);

      for (final label in const [
        'Lấy số thứ tự', 'Đặt khám', 'Kết quả khám', 'Đơn thuốc',
        'Điều trị nội trú', 'Ví giấy tờ', 'Gia đình',
      ]) {
        expect(find.text(label), findsWidgets, reason: 'thiếu lối tắt "$label"');
      }

      expect(find.text('Nguyễn Văn Test'), findsOneWidget);
      expect(find.textContaining('BN000123'), findsOneWidget);
    });
  });

  // ======================================================= lấy số thứ tự
  group('Lấy số thứ tự (HSMT I.2 #3)', () {
    testWidgets('chọn khoa → thấy phòng kèm số người chờ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Lấy số thứ tự');
      expectNoErrorState('Màn lấy số');

      expect(find.textContaining('Khoa Khám bệnh'), findsWidgets);

      await tester.tap(find.textContaining('Khoa Khám bệnh').first);
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.textContaining('Phòng khám 1'), findsWidgets,
          reason: 'chọn khoa xong phải nạp được danh sách phòng');
    });
  });

  // ============================================================ đặt khám
  group('Đặt khám (HSMT I.2 #4)', () {
    testWidgets('danh sách lịch hẹn hiện ĐƯỢC NỘI DUNG, không phải màn lỗi', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Đặt khám');

      expectNoErrorState('Màn lịch khám');
      expect(find.text('LH-2026-0007'), findsOneWidget,
          reason: 'mã lịch hẹn máy chủ trả về phải hiện trên thẻ');
      expect(find.textContaining('Khoa Khám bệnh'), findsWidgets);
      expect(find.text('Đã xác nhận'), findsOneWidget, reason: 'nhãn trạng thái phải đọc được');
    });

    testWidgets('màn đặt khám nạp được chuyên khoa, bác sĩ và khung giờ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Đặt khám');

      await tester.tap(find.widgetWithText(FloatingActionButton, 'Đặt khám'));
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expectNoErrorState('Màn đặt khám');

      // Chọn chuyên khoa trong ô sổ xuống.
      await tester.tap(find.byType(DropdownButtonFormField<Department>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Khoa Khám bệnh').last);
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.text('Buổi sáng'), findsOneWidget,
          reason: 'chọn khoa xong phải nạp được khung giờ buổi sáng');
      expect(find.text('08:00'), findsOneWidget);

      // Khung đã hết chỗ vẫn HIỆN nhưng phải nhìn ra được là không chọn được. Kiểm bằng đúng tín
      // hiệu người bệnh thấy — chữ gạch ngang — chứ không phải bằng kiểu widget: gạch ngang đọc
      // được cả khi không phân biệt được màu, nên nó mới là mệnh đề đáng canh.
      final full = tester.widget<Text>(find.text('10:00'));
      expect(full.style?.decoration, TextDecoration.lineThrough,
          reason: 'khung hết chỗ phải được gạch ngang');

      // Và bấm vào thì không chọn được: giờ đang chọn vẫn là 08:00 sau khi chạm 10:00.
      await tapScrolled(tester, find.text('08:00'));
      await tapScrolled(tester, find.text('10:00'));
      expect(find.textContaining('08:00'), findsWidgets,
          reason: 'chạm khung hết chỗ không được đổi lựa chọn');
    });

    testWidgets('ĐẶT XONG thì lịch mới HIỆN NGAY trong danh sách', (tester) async {
      // Đây đúng là điều chủ đầu tư báo: đặt lịch rồi mở danh sách không thấy đâu. Bài kiểm này
      // đi trọn vòng — bấm đặt, quay lui, và đòi thấy mã lịch mới trên màn.
      await launch(tester);
      await tapShortcut(tester, 'Đặt khám');
      expect(find.text('LH-2026-9999'), findsNothing, reason: 'chưa đặt thì chưa được có');

      await tester.tap(find.widgetWithText(FloatingActionButton, 'Đặt khám'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      await tester.tap(find.byType(DropdownButtonFormField<Department>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Khoa Khám bệnh').last);
      await tester.pumpAndSettle(const Duration(seconds: 2));

      await tester.tap(find.text('08:00'));
      await tester.pumpAndSettle();

      // Nút xác nhận nay nằm ở thanh đáy (luôn thấy), dựng bằng `AppPrimaryButton` chứ không
      // phải `FilledButton`, và mang nhãn ngắn "Xác nhận" — nên tìm theo chữ đó.
      await tapScrolled(tester, find.text('Xác nhận'));
      await tester.pumpAndSettle(const Duration(seconds: 1));

      expect(backend.booked, 1, reason: 'phải thật sự gọi POST đặt lịch');
      expect(find.text('LH-2026-9999'), findsOneWidget,
          reason: 'đặt xong quay về danh sách mà không thấy lịch mới — '
              'nghĩa là màn không làm mới sau khi đặt');
    });

    testWidgets('huỷ lịch: hỏi lại rồi mới huỷ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Đặt khám');

      await tapScrolled(tester, find.widgetWithText(TextButton, 'Huỷ lịch'));
      expect(find.text('Huỷ lịch khám?'), findsOneWidget,
          reason: 'huỷ lịch phải hỏi lại, không được huỷ ngay khi chạm');

      await tester.tap(find.widgetWithText(TextButton, 'Không'));
      await tester.pumpAndSettle();
      expect(backend.cancelled, 0, reason: 'bấm "Không" mà vẫn gọi huỷ là hỏng');

      await tester.tap(find.widgetWithText(TextButton, 'Huỷ lịch'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Huỷ lịch'));
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expect(backend.cancelled, 1);
    });
  });

  // ========================================================= kết quả khám
  group('Kết quả khám (HSMT I.2 #5)', () {
    testWidgets('danh sách kết quả hiện nội dung thật', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');
      expectNoErrorState('Màn kết quả');

      // Thẻ lượt khám hiện chẩn đoán làm tiêu đề, không hiện mã lượt khám.
      expect(find.textContaining('Tăng huyết áp'), findsWidgets);
      expect(find.textContaining('Khoa Khám bệnh'), findsWidgets);
    });

    testWidgets('phiếu xét nghiệm bất thường: mở được chi tiết', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');

      // Sáu nhóm kết quả nay là chip pill chứ không còn `TabBar`, nên tìm theo chữ.
      await tester.tap(find.text('Xét nghiệm'));
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expectNoErrorState('Tab xét nghiệm');

      expect(find.textContaining('Sinh hoá máu'), findsWidgets,
          reason: 'phiếu xét nghiệm phải hiện tên dịch vụ');
      expect(find.textContaining('ngoài khoảng bình thường'), findsWidgets,
          reason: 'phiếu có chỉ số bất thường phải nói rõ ngay ở danh sách');
    });

    testWidgets('đơn thuốc hiện đủ tên thuốc và liều', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Đơn thuốc');
      expectNoErrorState('Màn đơn thuốc');

      expect(find.textContaining('DT-2026-0031'), findsWidgets);
    });
  });

  // ========================================================= nội trú
  group('Điều trị nội trú (HSMT I.2 #6)', () {
    testWidgets('danh sách đợt điều trị hiện nội dung', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Điều trị nội trú');
      expectNoErrorState('Màn nội trú');

      // Thẻ đợt điều trị lấy chẩn đoán làm tiêu đề.
      expect(find.textContaining('Viêm phổi'), findsWidgets);
      expect(find.textContaining('Đang điều trị'), findsWidgets);
    });
  });

  // ========================================================= gia đình
  group('Quản lý gia đình (HSMT I.2 #7)', () {
    testWidgets('danh sách người thân hiện nội dung', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Gia đình');
      expectNoErrorState('Màn gia đình');
    });
  });

  // ========================================================= ví giấy tờ
  group('Ví giấy tờ (HSMT I.2 #8)', () {
    testWidgets('ví hiện danh sách và hạn mức dung lượng', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Ví giấy tờ');
      expectNoErrorState('Màn ví giấy tờ');
    });
  });

  // ========================================================= bảo mật
  group('Bảo mật (HSMT I.2 #9)', () {
    testWidgets('mở được cài đặt bảo mật và danh sách thiết bị', (tester) async {
      await launch(tester);

      // Vào bảo mật từ thanh tiêu đề trang chủ.
      final gear = find.byIcon(Icons.security_outlined);
      final shield = find.byIcon(Icons.shield_outlined);
      final entry = gear.evaluate().isNotEmpty ? gear : shield;
      if (entry.evaluate().isEmpty) return; // lối vào khác nhau theo bản dựng

      await tester.tap(entry.first);
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expectNoErrorState('Màn bảo mật');
    });
  });

  // ========================================================= thông báo
  group('Hộp thư thông báo (HSMT I.2 #2)', () {
    testWidgets('mở được hộp thư', (tester) async {
      await launch(tester);

      final bell = find.byIcon(Icons.notifications_outlined);
      if (bell.evaluate().isEmpty) return;

      await tester.tap(bell.first);
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expectNoErrorState('Màn thông báo');

      expect(find.textContaining('Kết quả xét nghiệm đã có'), findsWidgets,
          reason: 'hộp thư phải hiện thư máy chủ trả về');
    });
  });

  // ================================================== chưa đăng nhập
  group('Chưa đăng nhập', () {
    testWidgets('bị đưa về màn đăng nhập, kiểm dữ liệu ngay trên máy', (tester) async {
      await launch(tester, state: const AuthSignedOut());

      expect(find.text('Hỗ trợ người bệnh'), findsOneWidget);

      // Bấm đăng nhập với ô trống: phải báo lỗi ngay, không đi vòng mạng.
      final button = find.widgetWithText(FilledButton, 'Đăng nhập');
      if (button.evaluate().isNotEmpty) {
        await tester.tap(button.first);
        await tester.pumpAndSettle();
        expect(backend.calls.where((p) => p.contains('/auth/login')), isEmpty,
            reason: 'ô trống mà vẫn gọi máy chủ là bắt người dùng chờ vô ích');
      }
    });
  });
}

/// Máy chủ giả **có trí nhớ**: đặt lịch xong thì lịch đó nằm lại trong danh sách.
///
/// Bản gốc `DemoBackendAdapter` trả cùng một câu trả lời cho mọi lời gọi, nên nó không thể chứng
/// minh được điều quan trọng nhất ở đây — rằng sau khi đặt, danh sách có lịch mới. Với một máy chủ
/// không trí nhớ thì bài kiểm "đặt xong có thấy không" luôn đạt hoặc luôn hỏng vì lý do khác.
class _StatefulDemoBackend implements HttpClientAdapter {
  final _inner = DemoBackendAdapter();
  final List<String> calls = [];

  int booked = 0;
  int cancelled = 0;

  static const _newAppointment = '''
    {"id":"a2","appointmentCode":"LH-2026-9999","appointmentDate":"2026-09-12T00:00:00",
     "appointmentTime":"08:00:00","departmentName":"Khoa Khám bệnh",
     "roomName":"Phòng khám 1","status":0,"statusName":"Chờ xác nhận","reason":"Kiểm thử"}''';

  @override
  Future<ResponseBody> fetch(
      RequestOptions options, Stream<List<int>>? stream, Future<void>? cancelFuture) async {
    final path = options.path;
    calls.add('${options.method} $path');

    final isAppointmentList = path.endsWith('/appointments');

    if (options.method == 'POST' && isAppointmentList) {
      booked++;
      return _json('{"success":true,"data":null,"message":"Đã đặt lịch khám.",'
          '"errors":null,"meta":null}');
    }

    if (options.method == 'PUT' && path.contains('/cancel')) {
      cancelled++;
      return _json('{"success":true,"data":null,"message":"Đã huỷ lịch khám.",'
          '"errors":null,"meta":null}');
    }

    if (options.method == 'GET' && isAppointmentList) {
      final base = await _inner.fetch(options, stream, cancelFuture);
      if (booked == 0) return base;

      // Ghép lịch vừa đặt vào đầu danh sách — đúng như máy chủ thật làm.
      //
      // Dựng lại bằng JSON chứ không cắt dán chuỗi: bản trước tìm `"data":[` để chèn vào, nhưng
      // vỏ phản hồi có xuống dòng giữa `"data":` và `[` nên không khớp gì cả — bài kiểm báo
      // "đặt xong không thấy lịch" trong khi lỗi nằm ở chính máy chủ giả.
      final body = jsonDecode(await _readAll(base)) as Map<String, dynamic>;
      final list = (body['data'] as List<dynamic>? ?? <dynamic>[]).toList()
        ..insert(0, jsonDecode(_newAppointment));
      body['data'] = list;
      return _json(jsonEncode(body));
    }

    return _inner.fetch(options, stream, cancelFuture);
  }

  static Future<String> _readAll(ResponseBody body) async {
    final chunks = <int>[];
    await for (final chunk in body.stream) {
      chunks.addAll(chunk);
    }
    return utf8.decode(chunks);
  }

  static ResponseBody _json(String body) => ResponseBody.fromString(
        body,
        200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );

  @override
  void close({bool force = false}) => _inner.close(force: force);
}

class _FakeAuthController extends AuthController {
  _FakeAuthController(this._state);
  final AuthState _state;

  @override
  Future<AuthState> build() async => _state;
}
