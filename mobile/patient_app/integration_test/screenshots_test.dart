import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';

/// Chụp màn hình các màn chính trên máy thật / máy ảo, chạy được trên CẢ Android lẫn iOS.
///
/// Vì sao dùng trạng thái xác thực giả thay vì đăng nhập thật: máy chạy CI không có BFF và không có
/// CSDL. Bộ này chứng minh **app dựng và vẽ được các màn trên đúng nền tảng đó** — phần nghiệp vụ
/// thật đã được `scripts/smoke-patient-app-auth.py` kiểm riêng với API và PostgreSQL thật.
///
/// Với iOS, đây là cách duy nhất chạy được từ máy Windows: build và chụp diễn ra trên macOS runner
/// của GitHub Actions.
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

  Future<void> pump(WidgetTester tester, AuthState state) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(AppConfig.dev),
          authControllerProvider.overrideWith(() => _FakeAuthController(state)),
        ],
        child: const PatientApp(),
      ),
    );
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

  final platform = Platform.isIOS ? 'ios' : 'android';

  testWidgets('01 màn đăng nhập', (tester) async {
    await pump(tester, const AuthSignedOut());
    expect(find.text('Hỗ trợ người bệnh'), findsOneWidget);
    await shot(tester, '$platform-01-dang-nhap');
  });

  testWidgets('02 màn đăng ký', (tester) async {
    await pump(tester, const AuthSignedOut());
    await tester.tap(find.text('Đăng ký tài khoản mới'));
    await tester.pumpAndSettle();
    expect(find.text('Đăng ký tài khoản'), findsOneWidget);
    await shot(tester, '$platform-02-dang-ky');
  });

  testWidgets('03 quên mật khẩu', (tester) async {
    await pump(tester, const AuthSignedOut());
    await tester.tap(find.text('Quên mật khẩu?'));
    await tester.pumpAndSettle();
    expect(find.text('Quên mật khẩu'), findsOneWidget);
    await shot(tester, '$platform-03-quen-mat-khau');
  });

  testWidgets('04 trang chủ đã đăng nhập', (tester) async {
    await pump(tester, const AuthSignedIn(linkedAccount));
    expect(find.text('Lấy số thứ tự'), findsOneWidget);
    expect(find.textContaining('BN000123'), findsOneWidget);
    await shot(tester, '$platform-04-trang-chu');
  });

  testWidgets('05 buộc đổi mật khẩu lần đầu', (tester) async {
    await pump(
      tester,
      const AuthSignedIn(Account(
        id: 'demo-account',
        phoneNumber: '+84912345678',
        fullName: 'Nguyễn Văn Test',
        isLinked: true,
        mustChangePassword: true,
        hasPin: false,
        biometricEnabled: false,
      )),
    );
    // Đúng yêu cầu HSMT I.2 #9: tài khoản bị buộc đổi mật khẩu không vào được màn nào khác.
    expect(find.text('Đổi mật khẩu lần đầu'), findsOneWidget);
    expect(find.text('Lấy số thứ tự'), findsNothing);
    await shot(tester, '$platform-05-buoc-doi-mat-khau');
  });

  testWidgets('06 chưa liên kết hồ sơ thì nói rõ lý do', (tester) async {
    await pump(
      tester,
      const AuthSignedIn(Account(
        id: 'demo-account',
        phoneNumber: '+84987654321',
        fullName: 'Trần Thị Test',
        isLinked: false,
        mustChangePassword: false,
        hasPin: false,
        biometricEnabled: false,
      )),
    );
    expect(find.textContaining('chưa liên kết hồ sơ'), findsOneWidget);
    await shot(tester, '$platform-06-chua-lien-ket');
  });
}

/// Điều khiển xác thực giả để test không cần kho bảo mật lẫn mạng.
class _FakeAuthController extends AuthController {
  _FakeAuthController(this._state);
  final AuthState _state;

  @override
  Future<AuthState> build() async => _state;
}
