import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Kho bí mật của app: token, PIN hash, khoá thiết bị dùng cho sinh trắc.
///
/// Dùng Keychain (iOS) / EncryptedSharedPreferences (Android) — KHÔNG bao giờ để
/// những giá trị này trong SharedPreferences thường. Dữ liệu y tế KHÔNG lưu ở đây
/// (kho đọc-lại-offline dùng Hive, xoá sạch khi đăng xuất).
class SecureStore {
  SecureStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              // BẮT BUỘC bật: ở flutter_secure_storage 9.x cờ này mặc định FALSE,
              // tức token/PIN sẽ nằm trong SharedPreferences thường nếu quên bật.
              // (Bản 11.x mã hoá mặc định, nhưng 11.x đòi Android SDK 36 nên
              // không dùng được với Flutter 3.32.8 — xem README §6.2.)
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              // `first_unlock_this_device`: chỉ đọc được sau lần mở khoá đầu tiên
              // và KHÔNG theo iCloud Keychain sang máy khác — token/PIN không rời thiết bị.
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
            );

  final FlutterSecureStorage _storage;

  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';
  static const _kDeviceId = 'device_id';
  static const _kPinHash = 'pin_hash';
  static const _kBiometricEnabled = 'biometric_enabled';

  Future<String?> get accessToken => _storage.read(key: _kAccessToken);
  Future<String?> get refreshToken => _storage.read(key: _kRefreshToken);

  /// Id thiết bị do server cấp lúc đăng ký thiết bị — dùng cho màn "Quản lý
  /// thiết bị đăng nhập" và cho việc đăng xuất từ xa (HSMT I.2 #9).
  Future<String?> get deviceId => _storage.read(key: _kDeviceId);

  Future<String?> get pinHash => _storage.read(key: _kPinHash);

  Future<bool> get biometricEnabled async =>
      (await _storage.read(key: _kBiometricEnabled)) == 'true';

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _kAccessToken, value: accessToken);
    await _storage.write(key: _kRefreshToken, value: refreshToken);
  }

  Future<void> saveDeviceId(String value) => _storage.write(key: _kDeviceId, value: value);

  Future<void> savePinHash(String value) => _storage.write(key: _kPinHash, value: value);

  Future<void> setBiometricEnabled(bool value) =>
      _storage.write(key: _kBiometricEnabled, value: value ? 'true' : 'false');

  /// Xoá phiên khi đăng xuất. Giữ lại `deviceId` để lần đăng nhập sau vẫn nhận ra
  /// đúng thiết bị cũ thay vì đẻ thêm một dòng mới trong danh sách thiết bị.
  Future<void> clearSession() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kPinHash);
    await _storage.delete(key: _kBiometricEnabled);
  }
}
