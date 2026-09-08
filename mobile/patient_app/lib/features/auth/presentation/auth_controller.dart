import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../data/device_info_provider.dart';
import '../domain/account.dart';

final deviceInfoProvider = Provider<DeviceInfoProvider>(
  (ref) => DeviceInfoProvider(ref.watch(secureStoreProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    client: ref.watch(apiClientProvider),
    store: ref.watch(secureStoreProvider),
    deviceInfo: ref.watch(deviceInfoProvider),
  ),
);

/// Trạng thái đăng nhập của app.
sealed class AuthState {
  const AuthState();
}

/// Đang kiểm tra xem có phiên cũ dùng lại được không (lúc mở app).
class AuthChecking extends AuthState {
  const AuthChecking();
}

class AuthSignedOut extends AuthState {
  const AuthSignedOut();
}

class AuthSignedIn extends AuthState {
  const AuthSignedIn(this.account);
  final Account account;

  /// Server đang buộc đổi mật khẩu — router đưa thẳng tới màn đổi, và server cũng chặn độc lập.
  bool get mustChangePassword => account.mustChangePassword;
}

class AuthController extends AsyncNotifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AuthState> build() async {
    // Có token cũ thì thử dùng lại — đây chính là "giữ đăng nhập" của HSMT: người bệnh mở app
    // là vào thẳng, không phải nhập lại mật khẩu.
    final token = await ref.read(secureStoreProvider).accessToken;
    if (token == null || token.isEmpty) return const AuthSignedOut();

    try {
      final account = await _repo.me();
      return AuthSignedIn(account);
    } on UnauthorizedFailure {
      // Phiên đã bị thu hồi (đăng xuất từ xa, đổi mật khẩu ở máy khác…). Dọn sạch cục bộ.
      await ref.read(secureStoreProvider).clearSession();
      return const AuthSignedOut();
    } on NetworkFailure {
      // Mất mạng KHÔNG phải là bị đăng xuất. Giữ nguyên phiên, để app còn xem được dữ liệu đã tải.
      rethrow;
    }
  }

  Future<void> login({required String phoneNumber, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final session = await _repo.login(phoneNumber: phoneNumber, password: password);
      return AuthSignedIn(session.account);
    });
  }

  Future<void> register({
    required String phoneNumber,
    required String otpCode,
    required String password,
    required String fullName,
    String? patientCode,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final session = await _repo.register(
        phoneNumber: phoneNumber,
        otpCode: otpCode,
        password: password,
        fullName: fullName,
        patientCode: patientCode,
      );
      return AuthSignedIn(session.account);
    });
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final session = await _repo.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return AuthSignedIn(session.account);
    });
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(AuthSignedOut());
  }

  /// Đọc lại tài khoản sau khi có thay đổi (đặt PIN, liên kết hồ sơ…).
  Future<void> reload() async {
    final account = await _repo.me();
    state = AsyncData(AuthSignedIn(account));
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthState>(AuthController.new);
