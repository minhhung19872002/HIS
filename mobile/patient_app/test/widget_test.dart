import 'dart:ui' show Size;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';

/// Điều khiển xác thực giả, trả về đúng trạng thái mà mỗi bài kiểm thử cần.
///
/// Dùng nó thay cho bản thật để test không đụng vào kho bảo mật (cần kênh nền tảng) và không gọi
/// mạng — hai thứ đều không có trong môi trường test.
class _FakeAuthController extends AuthController {
  _FakeAuthController(this._state);
  final AuthState _state;

  @override
  Future<AuthState> build() async => _state;
}

const _account = Account(
  id: 'test-account',
  phoneNumber: '+84912345678',
  fullName: 'Nguyễn Văn Test',
  isLinked: true,
  patientCode: 'BN000123',
  mustChangePassword: false,
  hasPin: false,
  biometricEnabled: false,
);

Future<void> _pumpApp(WidgetTester tester, AuthState state) async {
  // Khung test mặc định 800x600 quá thấp: GridView lazy nên hai ô cuối chưa được dựng và
  // phép kiểm sẽ trượt oan. Đặt khung cao bằng một máy thật.
  tester.view.physicalSize = const Size(1080, 2160);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(AppConfig.dev),
        authControllerProvider.overrideWith(() => _FakeAuthController(state)),
      ],
      child: const PatientApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Đã đăng nhập: trang chủ hiển thị đủ 7 lối tắt theo HSMT I.2', (tester) async {
    await _pumpApp(tester, const AuthSignedIn(_account));

    expect(find.text('Lấy số thứ tự'), findsOneWidget);
    expect(find.text('Đặt khám'), findsOneWidget);
    expect(find.text('Kết quả khám'), findsOneWidget);
    expect(find.text('Đơn thuốc'), findsOneWidget);
    expect(find.text('Điều trị nội trú'), findsOneWidget);
    expect(find.text('Ví giấy tờ'), findsOneWidget);
    expect(find.text('Gia đình'), findsOneWidget);
  });

  testWidgets('Đã đăng nhập: hiện mã bệnh nhân khi hồ sơ đã liên kết', (tester) async {
    await _pumpApp(tester, const AuthSignedIn(_account));
    expect(find.textContaining('BN000123'), findsOneWidget);
  });

  testWidgets('Chưa liên kết hồ sơ: nói rõ lý do thay vì để trống', (tester) async {
    await _pumpApp(
      tester,
      const AuthSignedIn(Account(
        id: 'test-account',
        phoneNumber: '+84912345678',
        fullName: 'Trần Thị Test',
        isLinked: false,
        mustChangePassword: false,
        hasPin: false,
        biometricEnabled: false,
      )),
    );
    expect(find.textContaining('chưa liên kết hồ sơ'), findsOneWidget);
  });

  testWidgets('Chưa đăng nhập: bị đưa về màn đăng nhập', (tester) async {
    await _pumpApp(tester, const AuthSignedOut());

    expect(find.text('Đăng nhập'), findsWidgets);
    expect(find.text('Đăng ký tài khoản mới'), findsOneWidget);
    // Không được lọt vào trang chủ khi chưa đăng nhập.
    expect(find.text('Lấy số thứ tự'), findsNothing);
  });

  testWidgets('Bị buộc đổi mật khẩu: chặn ở màn đổi mật khẩu (HSMT I.2 #9)', (tester) async {
    await _pumpApp(
      tester,
      const AuthSignedIn(Account(
        id: 'test-account',
        phoneNumber: '+84912345678',
        fullName: 'Lê Văn Test',
        isLinked: true,
        mustChangePassword: true,
        hasPin: false,
        biometricEnabled: false,
      )),
    );

    expect(find.text('Đổi mật khẩu lần đầu'), findsOneWidget);
    expect(find.text('Lấy số thứ tự'), findsNothing);
  });
}
