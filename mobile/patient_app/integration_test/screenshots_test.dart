import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/core/router/app_router.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';

import 'demo_backend.dart';

/// Bộ chụp bằng chứng nghiệm thu — chạy được trên CẢ Android lẫn iOS.
///
/// Phủ **từng nhóm chức năng của HSMT I.2 và I.3**, đúng yêu cầu "ảnh chụp màn hình iOS 12 +
/// Android 7.1 cho từng nhóm chức năng" trong bảng đối chiếu.
///
/// Trạng thái đăng nhập và tầng HTTP đều được thay bằng bản giả: máy chạy bộ chụp (CI, hoặc máy
/// ảo Android 7.1 trên máy dev) không có BFF, PostgreSQL hay HIS. Nhưng bản giả đặt ở **tầng HTTP**
/// (`DemoBackendAdapter`), nên mọi kho dữ liệu, mọi `fromJson` và mọi provider vẫn chạy bằng chính mã
/// thật — ảnh chụp là bằng chứng cho cả đường ống chứ không riêng lớp vẽ. Phần nghiệp vụ với API và
/// CSDL thật đã có `scripts/smoke-patient-app-*.py` kiểm riêng.
///
/// Đặt tên ảnh theo `docs/architecture/evidence/README.md` §2:
/// `TC-APP-<NNN>__s01__<state>` — viewer khớp ngược về task nhờ tiền tố đó.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const linkedAccount = Account(
    id: 'demo-account',
    phoneNumber: '+84912345678',
    fullName: 'Nguyễn Văn Test',
    isLinked: true,
    patientCode: 'BN000123',
    mustChangePassword: false,
    hasPin: true,
    biometricEnabled: false,
  );

  /// Dio thật, chỉ thay bộ chuyển tải bằng máy chủ giả.
  Dio demoClient() => Dio(BaseOptions(baseUrl: 'http://demo.local/api/v1'))
    ..httpClientAdapter = DemoBackendAdapter();

  Future<void> pump(WidgetTester tester, AuthState state) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(AppConfig.dev),
          apiClientProvider.overrideWithValue(demoClient()),
          authControllerProvider.overrideWith(() => _FakeAuthController(state)),
        ],
        child: const PatientApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  /// Mở app rồi đi tới một đường dẫn — nhanh và ổn định hơn hẳn việc bấm lần lượt qua các màn.
  Future<void> open(WidgetTester tester, String route) async {
    await pump(tester, const AuthSignedIn(linkedAccount));

    final context = tester.element(find.byType(Navigator).first);
    ProviderScope.containerOf(context, listen: false).read(routerProvider).go(route);

    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  Future<void> shot(WidgetTester tester, String name) async {
    // Android cần chuyển surface sang ảnh trước khi chụp; iOS thì không, và gọi nhầm sẽ ném lỗi.
    if (Platform.isAndroid) {
      await binding.convertFlutterSurfaceToImage();
      await tester.pumpAndSettle();
    }
    await binding.takeScreenshot(name);
  }

  /// Tên ảnh theo `docs/architecture/evidence/README.md` §2: `TC-<CODE>-<NNN>__s<NN>__<state>`.
  ///
  /// Hai nền tảng chiếm hai "bước" của cùng một task — s01 là Android 7.1.1, s02 là iOS 12 — vì
  /// bảng nghiệm thu đòi ảnh của **cả hai** ngưỡng phiên bản cho từng nhóm chức năng. Chú thích của
  /// mỗi ô trong `data/15-app.js` ghi rõ ô nào là nền tảng nào.
  final step = Platform.isIOS ? 's02' : 's01';

  Future<void> capture(WidgetTester tester, String code, String state) =>
      shot(tester, 'TC-APP-$code' '__${step}__$state');

  // =============================================================== I.2 #1-2 đăng nhập
  testWidgets('TC-APP-001 màn đăng nhập', (tester) async {
    await pump(tester, const AuthSignedOut());
    expect(find.text('Hỗ trợ người bệnh'), findsOneWidget);
    await capture(tester, '001', 'form');
  });

  testWidgets('TC-APP-002 màn đăng ký', (tester) async {
    await pump(tester, const AuthSignedOut());
    await tester.tap(find.text('Đăng ký tài khoản mới'));
    await tester.pumpAndSettle();
    expect(find.text('Đăng ký tài khoản'), findsOneWidget);
    await capture(tester, '002', 'form');
  });

  testWidgets('TC-APP-003 quên mật khẩu', (tester) async {
    await pump(tester, const AuthSignedOut());
    await tester.tap(find.text('Quên mật khẩu?'));
    await tester.pumpAndSettle();
    expect(find.text('Quên mật khẩu'), findsOneWidget);
    await capture(tester, '003', 'form');
  });

  testWidgets('TC-APP-004 trang chủ đã đăng nhập', (tester) async {
    await pump(tester, const AuthSignedIn(linkedAccount));
    expect(find.text('Lấy số thứ tự'), findsOneWidget);
    expect(find.textContaining('BN000123'), findsOneWidget);
    await capture(tester, '004', 'list');
  });

  testWidgets('TC-APP-005 buộc đổi mật khẩu lần đầu', (tester) async {
    await pump(tester, const AuthSignedIn(Account(
      id: 'demo-account', phoneNumber: '+84912345678', fullName: 'Nguyễn Văn Test',
      isLinked: true, mustChangePassword: true, hasPin: false, biometricEnabled: false,
    )));

    // Đúng yêu cầu HSMT I.2 #9: tài khoản bị buộc đổi mật khẩu không vào được màn nào khác.
    expect(find.text('Đổi mật khẩu lần đầu'), findsOneWidget);
    expect(find.text('Lấy số thứ tự'), findsNothing);
    await capture(tester, '005', 'permission');
  });

  testWidgets('TC-APP-006 chưa liên kết hồ sơ thì nói rõ lý do', (tester) async {
    await pump(tester, const AuthSignedIn(Account(
      id: 'demo-account', phoneNumber: '+84987654321', fullName: 'Trần Thị Test',
      isLinked: false, mustChangePassword: false, hasPin: false, biometricEnabled: false,
    )));

    expect(find.textContaining('chưa liên kết hồ sơ'), findsOneWidget);
    await capture(tester, '006', 'empty');
  });

  // ============================================================ I.2 #3 lấy số thứ tự
  testWidgets('TC-APP-010 chọn khoa và phòng để lấy số', (tester) async {
    await open(tester, AppRoutes.queue);
    await capture(tester, '010', 'list');
  });

  // =============================================================== I.2 #4 đặt khám
  testWidgets('TC-APP-020 danh sách lịch hẹn', (tester) async {
    await open(tester, AppRoutes.appointments);
    await capture(tester, '020', 'list');
  });

  testWidgets('TC-APP-021 đặt lịch khám mới', (tester) async {
    await open(tester, AppRoutes.bookAppointment);
    await capture(tester, '021', 'form');
  });

  // ==================================================== I.2 #5 kết quả ngoại trú
  testWidgets('TC-APP-030 danh sách kết quả', (tester) async {
    await open(tester, AppRoutes.results);
    await capture(tester, '030', 'list');
  });

  testWidgets('TC-APP-031 chi tiết phiếu xét nghiệm có chỉ số bất thường', (tester) async {
    await open(tester, '${AppRoutes.results}/lab/lab-1');
    await capture(tester, '031', 'detail');
  });

  testWidgets('TC-APP-032 đơn thuốc', (tester) async {
    await open(tester, AppRoutes.prescriptions);
    await capture(tester, '032', 'list');
  });

  // ====================================================== I.2 #6 kết quả nội trú
  testWidgets('TC-APP-040 các đợt điều trị nội trú', (tester) async {
    await open(tester, AppRoutes.admissions);
    await capture(tester, '040', 'list');
  });

  testWidgets('TC-APP-041 công khai thuốc theo ngày', (tester) async {
    await open(tester, '${AppRoutes.admissions}/adm-1');
    await capture(tester, '041', 'detail');
  });

  // =========================================================== I.2 #7 gia đình
  testWidgets('TC-APP-050 danh sách người thân đã kết nối', (tester) async {
    await open(tester, AppRoutes.family);
    await capture(tester, '050', 'list');
  });

  // ========================================================== I.2 #8 ví giấy tờ
  testWidgets('TC-APP-060 ví giấy tờ và hạn mức dung lượng', (tester) async {
    await open(tester, AppRoutes.documents);
    await capture(tester, '060', 'list');
  });

  // ============================================================ I.2 #2 hộp thư
  testWidgets('TC-APP-070 hộp thư thông báo', (tester) async {
    await open(tester, AppRoutes.notifications);
    await capture(tester, '070', 'list');
  });

  // ============================================================= I.2 #9 bảo mật
  testWidgets('TC-APP-080 cài đặt bảo mật', (tester) async {
    await open(tester, AppRoutes.security);
    await capture(tester, '080', 'list');
  });

  testWidgets('TC-APP-081 đặt mã PIN', (tester) async {
    await open(tester, AppRoutes.setPin);
    await capture(tester, '081', 'form');
  });

  testWidgets('TC-APP-082 danh sách thiết bị đăng nhập', (tester) async {
    await open(tester, AppRoutes.devices);
    await capture(tester, '082', 'list');
  });

  testWidgets('TC-APP-083 xoá tài khoản — bắt buộc theo quy định hai kho ứng dụng', (tester) async {
    await open(tester, AppRoutes.deleteAccount);
    await capture(tester, '083', 'confirm');
  });

  // ================================================= I.3 #2 module tra cứu CSKH
  testWidgets('TC-APP-090 màn tra cứu cho nhân viên chăm sóc khách hàng', (tester) async {
    await open(tester, AppRoutes.staffLookup);
    await capture(tester, '090', 'form');
  });
}

/// Điều khiển xác thực giả để test không cần kho bảo mật lẫn mạng.
class _FakeAuthController extends AuthController {
  _FakeAuthController(this._state);
  final AuthState _state;

  @override
  Future<AuthState> build() async => _state;
}
