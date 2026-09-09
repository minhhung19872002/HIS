import 'package:dio/dio.dart';

import '../../../core/error/failure.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../core/storage/secure_store.dart';
import '../domain/account.dart';
import 'device_info_provider.dart';

/// Kết quả một lần xác thực: tài khoản kèm bộ token (token đã được cất vào kho bảo mật).
class AuthSession {
  const AuthSession(this.account);
  final Account account;
}

/// Gọi API xác thực của BFF và cất token vào kho bảo mật.
///
/// Tầng UI KHÔNG bao giờ thấy token — chỉ thấy `Account` hoặc một `Failure` đã dịch sang tiếng Việt.
class AuthRepository {
  AuthRepository({
    required Dio client,
    required SecureStore store,
    required DeviceInfoProvider deviceInfo,
  })  : _client = client,
        _store = store,
        _deviceInfo = deviceInfo;

  final Dio _client;
  final SecureStore _store;
  final DeviceInfoProvider _deviceInfo;

  static const _base = '/patient/auth';

  Future<void> requestOtp({required String phoneNumber, required String purpose}) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/request-otp',
            data: {'phoneNumber': phoneNumber, 'purpose': purpose},
          )).then((_) {});

  Future<AuthSession> register({
    required String phoneNumber,
    required String otpCode,
    required String password,
    required String fullName,
    String? patientCode,
    String? pushToken,
  }) async {
    final device = await _deviceInfo.collect(pushToken: pushToken);
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/register',
          data: {
            'phoneNumber': phoneNumber,
            'otpCode': otpCode,
            'password': password,
            'fullName': fullName,
            if (patientCode != null && patientCode.isNotEmpty) 'patientCode': patientCode,
            'device': device.toJson(),
          },
        ));
    return _persist(data);
  }

  Future<AuthSession> login({
    required String phoneNumber,
    required String password,
    String? pushToken,
  }) async {
    final device = await _deviceInfo.collect(pushToken: pushToken);
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/login',
          data: {
            'phoneNumber': phoneNumber,
            'password': password,
            'device': device.toJson(),
          },
        ));
    return _persist(data);
  }

  Future<Account> me() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/me'));
    return Account.fromJson(data);
  }

  Future<AuthSession> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/change-password',
          data: {'currentPassword': currentPassword, 'newPassword': newPassword},
        ));
    // Server cấp lại token cho chính máy này sau khi đổi mật khẩu, nên không bị văng ra.
    return _persist(data);
  }

  Future<void> resetPassword({
    required String phoneNumber,
    required String otpCode,
    required String newPassword,
  }) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/reset-password',
            data: {
              'phoneNumber': phoneNumber,
              'otpCode': otpCode,
              'newPassword': newPassword,
            },
          )).then((_) {});

  Future<void> setPin({required String password, required String pin}) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/pin',
            data: {'password': password, 'pin': pin},
          )).then((_) {});

  Future<void> verifyPin(String pin) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/pin/verify',
            data: {'pin': pin},
          )).then((_) {});

  /// Gửi khoá công khai sinh trắc của máy này lên server (HSMT I.2 #9).
  Future<void> enrollBiometric({required String publicKey, required String password}) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/biometric/enroll',
            data: {'publicKey': publicKey, 'password': password},
          )).then((_) {});

  /// Xin chuỗi thử thách để ký. Trả về (challengeId, nonce).
  Future<({String challengeId, String nonce})> biometricChallenge({
    required String phoneNumber,
    required String deviceKey,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/biometric/challenge',
          data: {'phoneNumber': phoneNumber, 'deviceKey': deviceKey},
        ));
    return (
      challengeId: data['challengeId'] as String? ?? '',
      nonce: data['nonce'] as String? ?? '',
    );
  }

  Future<AuthSession> biometricLogin({
    required String phoneNumber,
    required String deviceKey,
    required String challengeId,
    required String signature,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/biometric/login',
          data: {
            'phoneNumber': phoneNumber,
            'deviceKey': deviceKey,
            'challengeId': challengeId,
            'signature': signature,
          },
        ));
    return _persist(data);
  }

  /// Khoá thiết bị đang dùng — cần cho luồng đăng nhập sinh trắc, vì server nhận diện máy qua nó.
  Future<String> currentDeviceKey() async =>
      (await _deviceInfo.collect()).deviceKey;

  Future<List<LoginDevice>> devices() async {
    final response = await _rawRun(() => _client.get<Map<String, dynamic>>('/patient/devices'));
    final list = response['data'] as List<dynamic>? ?? const [];
    return list.map((e) => LoginDevice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> revokeDevice(String deviceId) async {
    final body = await _rawRun(
        () => _client.delete<Map<String, dynamic>>('/patient/devices/$deviceId'));
    await _adoptRefreshedTokens(body);
  }

  Future<void> revokeOtherDevices() async {
    final body =
        await _rawRun(() => _client.delete<Map<String, dynamic>>('/patient/devices/others'));
    await _adoptRefreshedTokens(body);
  }

  /// Thu hồi một máy sẽ xoay con dấu bảo mật của CẢ tài khoản, nên token máy đang cầm cũng chết
  /// theo. Server cấp lại token mới ngay trong phản hồi; không nhặt lấy thì màn hình kế tiếp nhận
  /// 401 và người bệnh bị đá ra đăng nhập lại — đúng lúc họ đang dọn dẹp vì nghi bị lộ tài khoản.
  Future<void> _adoptRefreshedTokens(Map<String, dynamic> body) async {
    final data = body['data'];
    if (data is! Map<String, dynamic>) return;

    final token = data['token'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (token == null || refreshToken == null) return;

    await _store.saveTokens(accessToken: token, refreshToken: refreshToken);
  }

  /// Đăng xuất máy hiện tại. Xoá phiên cục bộ kể cả khi gọi server thất bại — người dùng đã bấm
  /// đăng xuất thì máy này phải sạch, dù mạng có lỗi.
  Future<void> logout() async {
    try {
      await _client.post<Map<String, dynamic>>('$_base/logout');
    } on DioException {
      // Cố ý nuốt: xoá cục bộ vẫn phải diễn ra.
    } finally {
      await _store.clearSession();
    }
  }

  /// Bóc `data` từ vỏ `{success, data, message}` và dịch lỗi sang `Failure`.
  Future<Map<String, dynamic>> _rawRun(
      Future<Response<Map<String, dynamic>>> Function() request) async {
    try {
      final response = await request();
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<Map<String, dynamic>> _run(
      Future<Response<Map<String, dynamic>>> Function() request) async {
    final body = await _rawRun(request);
    final data = body['data'];
    if (data is Map<String, dynamic>) return data;
    // Có endpoint chỉ trả message (ví dụ đặt PIN) — không có data là chuyện bình thường.
    return <String, dynamic>{};
  }

  Future<AuthSession> _persist(Map<String, dynamic> data) async {
    final token = data['token'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    final accountJson = data['account'] as Map<String, dynamic>?;

    if (token == null || refreshToken == null || accountJson == null) {
      throw const UnknownFailure('Máy chủ trả về dữ liệu đăng nhập không hợp lệ.');
    }

    await _store.saveTokens(accessToken: token, refreshToken: refreshToken);
    return AuthSession(Account.fromJson(accountJson));
  }
}
