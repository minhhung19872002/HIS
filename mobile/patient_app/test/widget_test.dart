import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/app.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/core/push_providers.dart';
import 'package:patient_app/core/security/app_lock.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';
import 'package:patient_app/features/notifications/data/push_registration.dart';

import 'support/fake_push_source.dart';

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

/// App đang ở trạng thái tự khoá, không phải chờ hai phút thật.
class _LockedAppLock extends AppLock {
  @override
  bool build() => true;
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

Future<void> _pumpApp(
  WidgetTester tester,
  AuthState state, {
  List<Override> overrides = const [],
}) async {
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
        ...overrides,
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

  /// Bài kiểm canh đúng chỗ đã đứt: `PushRegistration` có thể đúng hoàn toàn mà vẫn vô dụng nếu
  /// không ai gọi nó. Trước đây đó chính là chuyện đã xảy ra — lớp gửi token tồn tại, viết đúng,
  /// và không có một nơi nào trong app đọc tới nó.
  ///
  /// Vì vậy bài kiểm này dựng app THẬT (qua `PatientApp` → `pushBinderProvider`) chứ không gọi
  /// thẳng `PushRegistration`: gỡ dòng nối ở `app.dart` là bài kiểm này đỏ.
  testWidgets('Đăng nhập xong: app gửi token FCM lên máy chủ (HSMT I.2 #2)', (tester) async {
    final sent = <String?>[];
    final source = FakePushSource(token: 'token-fcm-1');
    addTearDown(source.dispose);

    await _pumpApp(
      tester,
      const AuthSignedIn(_account),
      overrides: [
        pushRegistrationProvider.overrideWith((ref) => PushRegistration(
              source: source,
              sendToken: (token) async => sent.add(token),
              navigate: (_) {},
            )),
      ],
    );

    expect(sent, ['token-fcm-1'],
        reason: 'máy chủ chỉ đẩy thông báo tới thiết bị có PushToken; không gửi lên thì '
            'toàn bộ đường ống outbox → relay → FCM chạy trên một hàng đợi rỗng');
  });

  /// Màn tự khoá phải mở lại được mà KHÔNG mất phiên.
  ///
  /// Trước đây nó chỉ mời sinh trắc và, nếu không dùng được, lối ra duy nhất là "Đăng xuất và đăng
  /// nhập lại" — dù mã PIN đã có đủ cả ba phần: màn đặt PIN, `AuthRepository.verifyPin`, và endpoint
  /// `/auth/pin/verify`. Không nơi nào gọi `verifyPin`. Hệ quả với người bệnh không dùng sinh trắc:
  /// cứ rời app quá hai phút là bị bắt đăng nhập lại.
  testWidgets('Tự khoá: có PIN thì mở khoá được bằng PIN, không phải đăng xuất', (tester) async {
    await _pumpApp(
      tester,
      const AuthSignedIn(Account(
        id: 'test-account',
        phoneNumber: '+84912345678',
        fullName: 'Nguyễn Văn Test',
        isLinked: true,
        patientCode: 'BN000123',
        mustChangePassword: false,
        hasPin: true,
        biometricEnabled: false,
      )),
      overrides: [appLockProvider.overrideWith(_LockedAppLock.new)],
    );

    expect(find.text('Ứng dụng đã tự khoá'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Mã PIN'), findsOneWidget,
        reason: 'thiếu ô PIN thì người không dùng sinh trắc chỉ còn đường đăng xuất');
    expect(find.widgetWithText(FilledButton, 'Mở khoá'), findsOneWidget);
  });

  testWidgets('Tự khoá: không có PIN lẫn sinh trắc thì KHÔNG che màn', (tester) async {
    await _pumpApp(
      tester,
      const AuthSignedIn(Account(
        id: 'test-account',
        phoneNumber: '+84912345678',
        fullName: 'Phạm Thị Test',
        isLinked: true,
        mustChangePassword: false,
        hasPin: false,
        biometricEnabled: false,
      )),
      overrides: [appLockProvider.overrideWith(_LockedAppLock.new)],
    );

    // Che mà không có chìa thì lối ra duy nhất là đăng xuất — đúng thứ người bệnh đang than phiền.
    expect(find.text('Ứng dụng đã tự khoá'), findsNothing);
    expect(find.text('Lấy số thứ tự'), findsOneWidget);
  });

  testWidgets('Chưa đăng nhập: KHÔNG gửi token FCM lên máy chủ', (tester) async {
    final sent = <String?>[];
    final source = FakePushSource(token: 'token-fcm-1');
    addTearDown(source.dispose);

    await _pumpApp(
      tester,
      const AuthSignedOut(),
      overrides: [
        pushRegistrationProvider.overrideWith((ref) => PushRegistration(
              source: source,
              sendToken: (token) async => sent.add(token),
              navigate: (_) {},
            )),
      ],
    );

    expect(sent, isEmpty, reason: 'chưa biết là ai thì chưa có tài khoản nào để gắn token vào');
  });
}
