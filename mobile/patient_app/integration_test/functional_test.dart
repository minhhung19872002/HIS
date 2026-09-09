import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/core/widgets/widgets.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';
import 'package:patient_app/features/queue/domain/queue_models.dart';
import 'package:patient_app/features/staff/presentation/staff_providers.dart';

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
          // Màn tra cứu của nhân viên đi bằng `Dio` RIÊNG (không mang token người bệnh), nên phải
          // thay riêng — quên dòng này thì màn đó đi ra mạng thật và bài kiểm treo tới lúc hết giờ.
          staffDioProvider.overrideWithValue(
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

  /// Kéo cho tới khi thấy, KHÔNG chạm — dùng để khẳng định một thứ nằm dưới nếp gấp.
  ///
  /// Kéo bằng TOẠ ĐỘ giữa màn thay vì `scrollUntilVisible(scrollable: find.byType(Scrollable).first)`:
  /// trên màn có nhiều vùng cuộn (thanh tab cuộn ngang, `TabBarView`, danh sách dọc) thì "cái đầu
  /// tiên" thường là thanh tab — kéo dọc nó chẳng nhúc nhích, và bài kiểm hỏng bằng một lỗi
  /// "Bad state: No element" không nói lên điều gì.
  Future<void> scrollTo(WidgetTester tester, Finder target) async {
    final size = tester.view.physicalSize / tester.view.devicePixelRatio;

    for (var attempt = 0; attempt < 12 && target.evaluate().isEmpty; attempt++) {
      await tester.dragFrom(
        Offset(size.width / 2, size.height * 0.7),
        const Offset(0, -200),
      );
      await tester.pumpAndSettle();
    }

    if (target.evaluate().isEmpty) return;
    await tester.ensureVisible(target.first);
    await tester.pumpAndSettle();
  }

  /// Chạm vào thứ có thể đang nằm ngoài màn hình — cuộn tới trước rồi mới chạm.
  ///
  /// Người bệnh cầm điện thoại cũng làm đúng thế. Chạm thẳng thì bài kiểm hỏng ngay khi máy nhỏ
  /// hơn: `Điều trị nội trú` là ô cuối lưới lối tắt, còn `Xác nhận đặt khám` nằm dưới cùng biểu
  /// mẫu — cả hai đều dưới nếp gấp trên màn 800×600 lẫn trên đa số điện thoại thật.
  Future<void> tapScrolled(WidgetTester tester, Finder target) async {
    // Danh sách cuộn chỉ dựng phần đang thấy, nên thứ nằm dưới nếp gấp CHƯA TỒN TẠI để mà cuộn
    // tới — `ensureVisible` sẽ báo "No element". Phải kéo cho tới khi nó hiện ra.
    await scrollTo(tester, target);

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

  /// Chạm một chip nhóm kết quả ("Xét nghiệm", "Khám sức khoẻ"…).
  ///
  /// Dải chip cuộn NGANG và chỉ dựng phần đang thấy, nên hai chip cuối chưa tồn tại để mà chạm.
  /// Phải kéo đúng dải chip đó — `find.byType(Scrollable).first` sẽ vớ phải danh sách dọc của tab
  /// bên dưới và kéo nhầm hướng.
  Future<void> tapResultTab(WidgetTester tester, String label) async {
    const labels = [
      'Lượt khám', 'Xét nghiệm', 'Hình ảnh', 'Thăm dò CN', 'Đơn thuốc', 'Khám sức khoẻ',
    ];
    final width = tester.view.physicalSize.width / tester.view.devicePixelRatio;
    final chip = find.text(label);

    // Kéo bằng TOẠ ĐỘ, không bằng `scrollUntilVisible`: hàm đó bám vào một widget mốc, mà mốc đó
    // trôi khỏi màn ngay sau cú kéo đầu tiên rồi bị bỏ khỏi cây — cú kéo thứ hai không còn chỗ để
    // đặt ngón tay và bài kiểm hỏng bằng một lỗi chẳng nói lên điều gì.
    //
    // Chip có thể ĐÃ DỰNG mà vẫn nằm ngoài bề ngang màn hình (danh sách cuộn dựng dư một quãng),
    // nên điều kiện dừng phải là "nằm gọn trong màn", không phải "tìm thấy".
    for (var attempt = 0; attempt < 10; attempt++) {
      if (chip.evaluate().isNotEmpty) {
        final rect = tester.getRect(chip.first);
        if (rect.left >= 0 && rect.right <= width) break;
      }

      double? y;
      for (final other in labels) {
        final found = find.text(other);
        if (found.evaluate().isEmpty) continue;
        y = tester.getCenter(found.first).dy; // chiều dọc luôn đúng, kể cả khi chip trôi ngang
        break;
      }
      if (y == null) break;

      await tester.dragFrom(Offset(width / 2, y), const Offset(-150, 0));
      await tester.pumpAndSettle();
    }

    // Chip nằm TRÊN phần thân tab nên đứng trước trong cây: lấy `.first` để không chạm nhầm vào
    // một dòng nội dung trùng chữ ở dưới.
    await tester.tap(chip.first);
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Chạm một tab trong thanh `TabBar` cuộn ngang (màn chi tiết đợt điều trị).
  ///
  /// `TabBar` dựng sẵn cả năm tab kể cả tab nằm ngoài bề ngang màn, nên chỉ cần cuộn tới nơi —
  /// nhưng CHẠM THẲNG mà không cuộn thì cú chạm rơi ra ngoài màn và tab không đổi, trong khi
  /// `tap()` chỉ cảnh báo chứ không báo hỏng.
  Future<void> tapDetailTab(WidgetTester tester, String label) async {
    final tab = find.text(label);
    await tester.ensureVisible(tab.first);
    await tester.pumpAndSettle();
    await tester.tap(tab.first);
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Mở menu tài khoản trên trang chủ (nút chữ cái đầu ở góc trái) rồi chọn một mục.
  ///
  /// Đây là lối vào DUY NHẤT tới màn bảo mật và tới nút đăng xuất.
  Future<void> openAccountMenu(WidgetTester tester, String item) async {
    final avatar = find.byType(PopupMenuButton<String>);
    expect(avatar, findsOneWidget, reason: 'trang chủ phải có menu tài khoản');
    await tester.tap(avatar);
    await tester.pumpAndSettle();
    await tester.tap(find.text(item).last);
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Quay lui một màn bằng đúng nút mũi tên của thanh tiêu đề.
  ///
  /// KHÔNG dùng `tester.pageBack()`: nó tìm nút theo tooltip tiếng Anh "Back", mà app chạy tiếng
  /// Việt nên tooltip là "Quay lại" — bài kiểm hỏng với thông báo khó hiểu về nút của iOS.
  Future<void> goBack(WidgetTester tester) async {
    await tester.tap(find.byType(BackButton).last);
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Tìm chữ ở BẤT KỲ đâu, kể cả trong `RichText`.
  ///
  /// Nhiều dòng chi tiết ("Mã phiếu: XN-2026-0001") được dựng bằng `RichText` để in đậm phần nhãn,
  /// mà `find.text` mặc định KHÔNG nhìn vào `RichText` — nên khẳng định trượt dù chữ hiện rành rành
  /// trên màn.
  Finder textAnywhere(String value) => find.textContaining(value, findRichText: true);

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
    testWidgets('thấy phòng kèm số người chờ, và số đã lấy hôm nay', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Lấy số thứ tự');
      expectNoErrorState('Màn lấy số');

      expect(find.textContaining('Phòng khám 1'), findsWidgets);
      expect(find.textContaining('Khoa Khám bệnh'), findsWidgets);
      // Số người chờ là thứ người bệnh chọn phòng dựa vào — không hiện thì màn này vô nghĩa.
      expect(find.text('chờ 8'), findsOneWidget);
      expect(find.text('chờ 3'), findsOneWidget);

      // Số đã lấy hôm nay phải hiện sẵn ở đầu màn (mở lại app là thấy, khỏi xin số mới).
      expect(find.text('A-042'), findsWidgets, reason: 'thiếu khối "Số của bạn hôm nay"');

      // Diện ưu tiên phải chọn được ngay trên màn này (nằm dưới nếp gấp — kéo tới rồi mới soi).
      await scrollTo(tester, find.text('Không thuộc diện ưu tiên'));
      expect(find.text('Không thuộc diện ưu tiên'), findsOneWidget);
      expect(find.text('Người cao tuổi (từ 60 tuổi)'), findsOneWidget);
    });

    testWidgets('chưa chọn phòng mà bấm lấy số: nhắc tại chỗ, không gọi máy chủ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Lấy số thứ tự');

      await tapScrolled(
          tester, find.widgetWithText(AppPrimaryButton, 'Lấy số thứ tự'));

      expect(find.text('Vui lòng chọn phòng khám.'), findsOneWidget,
          reason: 'bấm khi chưa chọn phòng phải được nói rõ vì sao');
      expect(backend.calls.where((c) => c.contains('take-number')), isEmpty,
          reason: 'chưa chọn phòng mà vẫn gọi máy chủ là bắt người bệnh chờ vô ích');
    });

    testWidgets('LẤY SỐ trọn vòng → sang màn theo dõi số, có số đang gọi và số người chờ',
        (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Lấy số thứ tự');

      // Chạm vào THẺ PHÒNG, nhận ra nó bằng con số người chờ. Bám theo chữ "Phòng khám 1" thì
      // chạm nhầm sang thẻ "số của bạn hôm nay" ở đầu màn — cũng mang đúng tên phòng đó.
      await tapScrolled(tester, find.text('chờ 8'));
      await tapScrolled(tester, find.text('Người cao tuổi (từ 60 tuổi)'));
      await tapScrolled(
          tester, find.widgetWithText(AppPrimaryButton, 'Lấy số thứ tự'));

      expect(backend.calls.any((c) => c.startsWith('POST') && c.contains('take-number')), isTrue,
          reason: 'phải thật sự gọi máy chủ để cấp số');

      // Màn theo dõi số: đây mới là thứ người bệnh nhìn suốt lúc ngồi chờ.
      expect(find.text('Số thứ tự của bạn'), findsOneWidget);
      expect(find.text('A-042'), findsWidgets, reason: 'mã số phải hiện to trên thẻ');
      expect(find.text('A-037'), findsOneWidget, reason: 'phải cho biết đang gọi tới số nào');
      expect(find.text('5 người'), findsOneWidget, reason: 'phải cho biết còn bao nhiêu người chờ');
      expect(find.text('25 phút'), findsOneWidget, reason: 'phải ước tính thời gian chờ');

      // Vé ưu tiên chưa xác minh: phải nhắc mang giấy tờ, nếu không người bệnh bị từ chối tại quầy
      // mà không hiểu vì sao.
      expect(find.textContaining('chờ xác minh'), findsWidgets);
      await scrollTo(tester, find.textContaining('mang theo giấy tờ chứng minh diện ưu tiên'));
      expect(find.textContaining('mang theo giấy tờ chứng minh diện ưu tiên'), findsOneWidget);

      // Nút cập nhật tay phải có: sóng yếu thì nhịp 20 giây không tới nơi.
      expect(find.text('Cập nhật ngay'), findsOneWidget);
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

  // ========================================================= kết quả ngoại trú
  group('Kết quả khám ngoại trú (HSMT I.2 #5)', () {
    testWidgets('lượt khám hiện nội dung, và lọc được mọi tab theo một lần khám', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');
      expectNoErrorState('Màn kết quả');

      // Thẻ lượt khám hiện chẩn đoán làm tiêu đề, không hiện mã lượt khám.
      expect(find.textContaining('Tăng huyết áp'), findsWidgets);
      expect(find.textContaining('Khoa Khám bệnh'), findsWidgets);

      // Chạm một lượt khám thì mọi tab còn lại lọc theo đúng lần khám đó (HSMT I.2.5.1, TC-R04).
      // Dải nhắc "đang lọc" nằm ở ĐẦU CÁC TAB KẾT QUẢ, không nằm ở tab lượt khám — nên phải sang
      // tab xét nghiệm mới soi được.
      await tapScrolled(tester, find.textContaining('Tăng huyết áp').first);
      await tapResultTab(tester, 'Xét nghiệm');
      expect(find.textContaining('Đang lọc theo'), findsOneWidget,
          reason: 'bật lọc mà không nói gì thì người bệnh tưởng mình mất kết quả');

      await tapScrolled(tester, find.text('Bỏ lọc'));
      expect(find.textContaining('Đang lọc theo'), findsNothing);
    });

    testWidgets('XÉT NGHIỆM: mở phiếu → từng chỉ số kèm khoảng bình thường và cờ bất thường',
        (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');

      // Sáu nhóm kết quả nay là chip pill chứ không còn `TabBar`, nên tìm theo chữ.
      await tapResultTab(tester, 'Xét nghiệm');
      expectNoErrorState('Tab xét nghiệm');

      expect(find.textContaining('Sinh hoá máu'), findsWidgets,
          reason: 'phiếu xét nghiệm phải hiện tên dịch vụ');
      expect(find.textContaining('ngoài khoảng bình thường'), findsWidgets,
          reason: 'phiếu có chỉ số bất thường phải nói rõ ngay ở danh sách');

      await tapScrolled(tester, find.textContaining('Sinh hoá máu').first);
      expectNoErrorState('Chi tiết phiếu xét nghiệm');

      // Đây là điều HSMT I.2.5.3 đòi: mỗi chỉ số có TÊN · GIÁ TRỊ · KHOẢNG THAM CHIẾU, và chỉ số
      // ngoài khoảng phải nhìn ra được mà không cần so bằng mắt.
      expect(textAnywhere('XN-2026-0001'), findsWidgets);
      expect(find.text('Glucose'), findsOneWidget);
      expect(find.text('AST (GOT)'), findsOneWidget);
      expect(find.textContaining('Bình thường: 5 - 40'), findsWidgets);
      expect(find.text('Ngoài khoảng'), findsWidgets,
          reason: 'chỉ số vượt ngưỡng phải được gắn nhãn, không chỉ đổi màu');

      // Bản in để người bệnh gửi cho bác sĩ khác — lối vào phải còn đó.
      expect(find.byTooltip('Xem bản in'), findsOneWidget);
    });

    testWidgets('HÌNH ẢNH: mở ca chụp → mô tả, kết luận và ảnh tải được', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');
      await tapResultTab(tester, 'Hình ảnh');
      expectNoErrorState('Tab hình ảnh');

      // Thẻ lấy "kỹ thuật · bộ phận" làm tiêu đề, số ảnh nằm ở dòng phụ.
      expect(find.textContaining('CT · Lồng ngực'), findsWidgets);
      expect(find.textContaining('24 ảnh'), findsWidgets);

      await tapScrolled(tester, find.textContaining('CT · Lồng ngực').first);
      expectNoErrorState('Chi tiết CĐHA');

      expect(find.text('Mô tả hình ảnh'), findsOneWidget);
      expect(find.text('Kết luận'), findsOneWidget);
      expect(find.textContaining('Không thấy tổn thương khu trú'), findsOneWidget,
          reason: 'kết luận của bác sĩ đọc phim là thứ người bệnh mở màn này để xem');
      expect(textAnywhere('CT ngực có tiêm thuốc'), findsWidgets, reason: 'thiếu tên kỹ thuật chụp');
      expect(textAnywhere('Vũ Thị E'), findsWidgets, reason: 'phải ghi bác sĩ đọc phim');

      await scrollTo(tester, find.text('Hình ảnh'));
      expect(find.textContaining('Chưa tải được hình ảnh'), findsNothing,
          reason: 'ảnh PACS không tải được thì cả tính năng xem ảnh là vô nghĩa');
      expect(find.textContaining('không có hình ảnh lưu trên hệ thống'), findsNothing);
    });

    testWidgets('THĂM DÒ CN: mở phiếu → các số đo và kết luận', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');
      await tapResultTab(tester, 'Thăm dò CN');
      expectNoErrorState('Tab thăm dò chức năng');

      expect(find.textContaining('Điện tim 12 chuyển đạo'), findsWidgets,
          reason: 'thiếu tên loại thăm dò thì thẻ chỉ còn một dòng ngày tháng');

      await tapScrolled(tester, find.textContaining('Điện tim 12 chuyển đạo').first);
      expectNoErrorState('Chi tiết thăm dò chức năng');

      expect(find.text('Các số đo'), findsOneWidget);
      expect(find.text('Tần số tim'), findsOneWidget);
      expect(find.text('78 lần/phút'), findsOneWidget);
      await scrollTo(tester, find.textContaining('Nhịp xoang đều, tần số 78'));
      expect(find.textContaining('Nhịp xoang đều, tần số 78'), findsOneWidget);
    });

    testWidgets('KHÁM SỨC KHOẺ: hiện đợt khám, đơn vị và phân loại sức khoẻ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Kết quả khám');
      await tapResultTab(tester, 'Khám sức khoẻ');
      expectNoErrorState('Tab khám sức khoẻ');

      expect(find.textContaining('Khám sức khoẻ định kỳ 2026'), findsWidgets);
      expect(textAnywhere('Công ty CP Bluestar'), findsWidgets);
      // Phân loại phải là CHỮ đọc được, không phải mã nội bộ (HSMT I.2.5.2, TC-R09).
      expect(textAnywhere('Phân loại: Loại II'), findsWidgets);
      expect(textAnywhere('GCN-2026-0091'), findsWidgets, reason: 'thiếu số giấy chứng nhận');
    });

    testWidgets('ĐƠN THUỐC: đủ tên thuốc, hàm lượng, liều và cách dùng', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Đơn thuốc');
      expectNoErrorState('Màn đơn thuốc');

      expect(find.textContaining('DT-2026-0031'), findsWidgets);
      expect(find.text('2 thuốc'), findsOneWidget);
      expect(find.text('Amlodipin 5mg'), findsOneWidget);
      expect(find.text('Atorvastatin 20mg'), findsOneWidget);
      // Dòng cách dùng là dòng người bệnh cần nhớ khi về nhà — mất nó là mất cả mục đích màn này.
      expect(find.textContaining('Uống buổi sáng sau ăn'), findsWidgets);
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

    testWidgets('mở đợt điều trị → đủ năm tab, có STT chỉ định và bảng công khai thuốc',
        (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Điều trị nội trú');
      await tapScrolled(tester, find.textContaining('Viêm phổi').first);
      expectNoErrorState('Chi tiết đợt điều trị');

      // Chỉ định CLS kèm SỐ THỨ TỰ thực hiện (HSMT I.2.6.6) — người bệnh nội trú cần biết đến
      // lượt mình chưa, y như người khám ngoại trú.
      expect(textAnywhere('Chụp X-quang ngực thẳng'), findsWidgets);
      expect(find.text('Số thứ tự'), findsWidgets);
      expect(find.text('5'), findsWidgets);
      expect(textAnywhere('Phòng thực hiện: Phòng X-quang 1'), findsWidgets);
      expect(textAnywhere('Đang chờ trước bạn: 2 người'), findsWidgets,
          reason: 'người nằm viện cũng cần biết còn bao nhiêu người trước mình');

      // Công khai thuốc (HSMT I.2.6.4): từng dòng thuốc + ba dòng tiền.
      await tapDetailTab(tester, 'Công khai thuốc');
      expectNoErrorState('Tab công khai thuốc');
      expect(textAnywhere('Ceftriaxon 1g'), findsWidgets);
      expect(textAnywhere('BHYT chi trả 80%'), findsWidgets,
          reason: 'công khai thuốc phải nói rõ nguồn chi trả từng dòng');
      await scrollTo(tester, find.text('Bạn phải trả'));
      expect(find.text('Tổng tiền thuốc'), findsOneWidget);
      expect(find.text('Bảo hiểm chi trả'), findsOneWidget);
      expect(find.text('Bạn phải trả'), findsOneWidget);

      // Ba tab kết quả còn lại phải lọc đúng theo đợt, không rơi vào nhánh lỗi.
      for (final tab in const ['Xét nghiệm', 'Hình ảnh', 'Thăm dò CN']) {
        await tapDetailTab(tester, tab);
        expectNoErrorState('Tab $tab của đợt điều trị');
      }
      // Tab cuối cùng phải thật sự có nội dung, không chỉ "không lỗi".
      expect(find.textContaining('Điện tim 12 chuyển đạo'), findsWidgets,
          reason: 'lọc theo đợt điều trị mà ra rỗng thì người bệnh nội trú không xem được gì');
    });
  });

  // ========================================================= gia đình
  group('Quản lý gia đình (HSMT I.2 #7)', () {
    testWidgets('hiện người thân kèm quan hệ và trạng thái xác minh', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Gia đình');
      expectNoErrorState('Màn gia đình');

      expect(find.text('Nguyễn Thị Mai'), findsOneWidget);
      expect(find.textContaining('Mẹ'), findsWidgets);
      expect(find.text('Nguyễn Minh Khang'), findsOneWidget);
      // Người chưa xác minh phải nhìn ra ngay: chưa xác minh là chưa xem được hồ sơ.
      expect(find.text('Chờ xác nhận'), findsOneWidget);
      expect(find.text('Xem hồ sơ'), findsWidgets);
    });

    testWidgets('thêm người thân: mở được biểu mẫu, huỷ thì không gọi máy chủ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Gia đình');

      await tapScrolled(tester, find.widgetWithText(FloatingActionButton, 'Thêm người thân'));
      expect(find.text('Mã bệnh nhân'), findsOneWidget);
      expect(find.textContaining('Quan hệ'), findsWidgets);

      await tester.tap(find.widgetWithText(TextButton, 'Huỷ'));
      await tester.pumpAndSettle();
      expect(backend.calls.where((c) => c.startsWith('POST') && c.contains('/family')), isEmpty);
    });

    testWidgets('gỡ kết nối: hỏi lại rồi mới gỡ', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Gia đình');

      await tapScrolled(tester, find.widgetWithText(TextButton, 'Gỡ').first);
      expect(find.textContaining('Gỡ kết nối với'), findsOneWidget,
          reason: 'gỡ người thân phải hỏi lại — gỡ nhầm là mất quyền xem hồ sơ');

      await tester.tap(find.widgetWithText(TextButton, 'Huỷ'));
      await tester.pumpAndSettle();
      expect(backend.calls.where((c) => c.startsWith('DELETE')), isEmpty,
          reason: 'bấm "Huỷ" mà vẫn gọi gỡ là hỏng');
    });
  });

  // ========================================================= ví giấy tờ
  group('Ví giấy tờ (HSMT I.2 #8)', () {
    testWidgets('hiện giấy tờ, dung lượng đã dùng, và hỏi lại trước khi xoá', (tester) async {
      await launch(tester);
      await tapShortcut(tester, 'Ví giấy tờ');
      expectNoErrorState('Màn ví giấy tờ');

      expect(find.text('CCCD mặt trước'), findsOneWidget);
      expect(find.text('Thẻ BHYT'), findsOneWidget);
      expect(find.text('Giấy ra viện 08/2026'), findsOneWidget);
      // Hạn mức phải hiện: đầy ví mà không báo trước thì lần thêm giấy tờ sau bị từ chối khó hiểu.
      expect(find.text('Dung lượng đã dùng'), findsOneWidget);

      await tapScrolled(tester, find.byTooltip('Xoá').first);
      expect(find.text('Xoá giấy tờ?'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, 'Huỷ'));
      await tester.pumpAndSettle();

      expect(backend.calls.where((c) => c.startsWith('DELETE')), isEmpty);
      expect(find.text('CCCD mặt trước'), findsOneWidget, reason: 'huỷ rồi mà giấy tờ vẫn mất là hỏng');
    });
  });

  // ========================================================= bảo mật
  group('Bảo mật (HSMT I.2 #9)', () {
    testWidgets('menu tài khoản mở được màn bảo mật với đủ bốn mục', (tester) async {
      await launch(tester);
      await openAccountMenu(tester, 'Bảo mật');
      expectNoErrorState('Màn bảo mật');

      expect(find.text('Đổi mật khẩu'), findsOneWidget);
      expect(find.text('Mã PIN'), findsOneWidget);
      expect(find.text('Đăng nhập bằng sinh trắc học'), findsOneWidget);
      expect(find.text('Thiết bị đăng nhập'), findsOneWidget);
      expect(find.text('Xoá tài khoản'), findsOneWidget);
    });

    testWidgets('thiết bị đăng nhập: thấy đủ máy, nhận ra máy đang dùng', (tester) async {
      await launch(tester);
      await openAccountMenu(tester, 'Bảo mật');
      await tapScrolled(tester, find.text('Thiết bị đăng nhập'));
      expectNoErrorState('Màn thiết bị');

      expect(find.text('Máy đang dùng'), findsOneWidget);
      expect(find.text('iPhone của tôi'), findsOneWidget);
      // Không phân biệt được máy nào là máy trong tay thì người bệnh sẽ tự đăng xuất chính mình.
      expect(find.text('Máy này'), findsOneWidget);
    });

    testWidgets('đặt mã PIN: từ chối mã dễ đoán ngay trên máy', (tester) async {
      await launch(tester);
      await openAccountMenu(tester, 'Bảo mật');
      await tapScrolled(tester, find.text('Mã PIN'));

      await tester.enterText(find.widgetWithText(TextFormField, 'Mật khẩu tài khoản'), 'Admin@123');
      await tester.enterText(find.widgetWithText(TextFormField, 'Mã PIN mới (6 số)'), '111111');
      await tester.enterText(find.widgetWithText(TextFormField, 'Nhập lại mã PIN'), '111111');
      await tester.pumpAndSettle();

      await tapScrolled(tester, find.text('Lưu mã PIN'));
      expect(find.textContaining('sáu chữ số giống nhau'), findsOneWidget,
          reason: 'mã PIN dễ đoán phải bị chặn tại máy, đừng để lên tới máy chủ mới biết');
    });

    testWidgets('xoá tài khoản: nói rõ mất gì, giữ gì, và chỉ mở nút khi đã hiểu', (tester) async {
      await launch(tester);
      await openAccountMenu(tester, 'Bảo mật');
      await tapScrolled(tester, find.text('Xoá tài khoản'));
      expectNoErrorState('Màn xoá tài khoản');

      expect(find.textContaining('2 thiết bị đang đăng nhập'), findsOneWidget);
      expect(find.textContaining('3 giấy tờ trong ví'), findsOneWidget);
      // Điều quan trọng nhất phải nói rõ: xoá tài khoản app KHÔNG xoá hồ sơ bệnh án.
      expect(find.textContaining('Hồ sơ bệnh án của bạn tại bệnh viện'), findsOneWidget);

      final button = find.widgetWithText(FilledButton, 'Xoá tài khoản của tôi');
      await scrollTo(tester, button);
      expect(tester.widget<FilledButton>(button).onPressed, isNull,
          reason: 'chưa xác nhận mà nút đã bấm được là quá dễ xoá nhầm');

      // Tích ô xác nhận TRƯỚC rồi mới gõ mật khẩu — đúng thứ tự đọc từ trên xuống của người dùng.
      // Thứ tự này từng làm nút chết cứng: ô mật khẩu không báo gì khi gõ nên màn không dựng lại.
      await tapScrolled(tester, find.textContaining('Tôi hiểu thao tác này'));
      await tester.enterText(find.widgetWithText(TextField, 'Nhập mật khẩu để xác nhận'), 'Admin@123');
      await tester.pumpAndSettle();

      // Cuộn lại tới nút TRƯỚC KHI soi nó. Trên máy thật, gõ chữ làm bàn phím ảo trồi lên và ăn
      // mất nửa dưới màn; nút nằm cuối danh sách cuộn nên bị bỏ khỏi cây, và phép soi trạng thái
      // hỏng bằng "Bad state: No element" — một lỗi chỉ lộ ra trên simulator, không bao giờ thấy
      // khi chạy `flutter test` không cần máy.
      await scrollTo(tester, button);
      expect(tester.widget<FilledButton>(button).onPressed, isNotNull,
          reason: 'tích ô xác nhận rồi mới gõ mật khẩu mà nút vẫn câm thì không xoá được nữa');
    });

    testWidgets('đăng xuất: hỏi lại trước khi thoát', (tester) async {
      await launch(tester);
      await openAccountMenu(tester, 'Đăng xuất');

      expect(find.textContaining('Đăng xuất'), findsWidgets);
      expect(find.byType(AlertDialog), findsOneWidget,
          reason: 'đăng xuất ngay khi chạm là mất phiên vì một cú chạm nhầm');
    });
  });

  // ========================================================= thông báo
  group('Hộp thư thông báo (HSMT I.2 #2)', () {
    testWidgets('mở được hộp thư và đọc tất cả', (tester) async {
      await launch(tester);

      final bell = find.byIcon(Icons.notifications_none_rounded);
      expect(bell, findsOneWidget, reason: 'trang chủ phải có lối vào hộp thư');
      await tester.tap(bell.first);
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expectNoErrorState('Màn thông báo');

      expect(find.textContaining('Kết quả xét nghiệm đã có'), findsWidgets,
          reason: 'hộp thư phải hiện thư máy chủ trả về');
      expect(find.textContaining('Nhắc lịch khám ngày mai'), findsWidgets);
      expect(find.textContaining('Tiêm chủng mở rộng tháng 9'), findsWidgets);

      await tester.tap(find.widgetWithText(TextButton, 'Đọc tất cả'));
      await tester.pumpAndSettle(const Duration(seconds: 2));
      expect(backend.calls.any((c) => c.contains('read-all')), isTrue,
          reason: '"Đọc tất cả" phải thật sự báo lên máy chủ, không chỉ đổi màu tại chỗ');
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

    testWidgets('mở được màn đăng ký và màn quên mật khẩu', (tester) async {
      await launch(tester, state: const AuthSignedOut());

      await tapScrolled(tester, find.text('Đăng ký tài khoản mới'));
      expectNoErrorState('Màn đăng ký');
      expect(find.byType(TextFormField), findsWidgets, reason: 'màn đăng ký phải có biểu mẫu');
      await goBack(tester);

      await tapScrolled(tester, find.text('Quên mật khẩu?'));
      expectNoErrorState('Màn quên mật khẩu');
      expect(find.byType(TextFormField), findsWidgets);
    });
  });

  // ============================== tra cứu cho nhân viên bệnh viện (HSMT I.3 #2.2)
  group('Tra cứu cho nhân viên', () {
    testWidgets('đăng nhập tài khoản HIS → tra được hồ sơ và xem tóm tắt', (tester) async {
      // Mở từ MÀN ĐĂNG NHẬP: nhân viên CSKH không có tài khoản người bệnh, đây là đường duy nhất.
      await launch(tester, state: const AuthSignedOut());
      await tapScrolled(tester, find.text('Dành cho nhân viên bệnh viện'));

      expect(find.text('Tra cứu cho nhân viên'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Tài khoản'), 'lethicskh');
      await tester.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'Admin@123');
      await tapScrolled(tester, find.widgetWithText(FilledButton, 'Đăng nhập'));
      expectNoErrorState('Màn tra cứu');

      await tester.enterText(
          find.widgetWithText(TextField, 'Mã BN, số điện thoại hoặc CCCD'), 'BN000123');
      await tapScrolled(tester, find.widgetWithText(FilledButton, 'Tra'));
      expect(find.text('Nguyễn Văn Test'), findsWidgets, reason: 'tra xong phải ra hồ sơ');

      await tapScrolled(tester, find.text('Nguyễn Văn Test').last);
      expectNoErrorState('Hồ sơ tra cứu');
      expect(find.text('Số thứ tự hôm nay'), findsOneWidget);
      expect(find.text('Lịch hẹn'), findsOneWidget);
      expect(textAnywhere('A-042'), findsWidgets);
      expect(textAnywhere('LH-2026-0007'), findsWidgets);
      expect(find.text('Đặt lại mật khẩu app'), findsOneWidget,
          reason: 'quên mật khẩu tại quầy là việc CSKH làm nhiều nhất');
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
