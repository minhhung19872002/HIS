import 'package:biometric_signature/biometric_signature.dart';
import 'package:flutter/foundation.dart';

/// Vì sao máy không dùng được sinh trắc học — để nói với người dùng cho đúng việc cần làm.
enum BiometricUnavailableReason {
  /// Máy không có phần cứng sinh trắc.
  noHardware,

  /// Có phần cứng nhưng người dùng chưa đăng ký vân tay/khuôn mặt nào.
  notEnrolled,

  /// Không có khoá màn hình — Keystore/Keychain không bảo vệ được khoá riêng.
  noDeviceLock,

  unknown,
}

class BiometricStatus {
  const BiometricStatus.available()
      : isAvailable = true,
        reason = null;
  const BiometricStatus.unavailable(this.reason) : isAvailable = false;

  final bool isAvailable;
  final BiometricUnavailableReason? reason;

  String get message => switch (reason) {
        BiometricUnavailableReason.noHardware =>
          'Thiết bị này không hỗ trợ vân tay hoặc nhận diện khuôn mặt.',
        BiometricUnavailableReason.notEnrolled =>
          'Bạn chưa cài vân tay hoặc khuôn mặt trong Cài đặt của máy.',
        BiometricUnavailableReason.noDeviceLock =>
          'Vui lòng đặt khoá màn hình cho máy trước khi bật đăng nhập bằng sinh trắc học.',
        _ => 'Hiện chưa dùng được đăng nhập bằng sinh trắc học trên thiết bị này.',
      };
}

/// Đăng nhập bằng sinh trắc học (HSMT I.2 #9).
///
/// Cách làm: máy sinh một cặp khoá **ECDSA P-256** với khoá riêng nằm trong Keystore (Android) /
/// Secure Enclave (iOS) và **chỉ mở được sau khi quét vân tay hoặc khuôn mặt**. Khoá công khai gửi
/// lên server. Khi đăng nhập, server phát một chuỗi ngẫu nhiên, máy ký, server kiểm chữ ký.
///
/// Vì sao không đơn giản là "app hỏi vân tay rồi báo server đã xác thực xong": server không có cách
/// nào biết lời báo đó là thật. Một bản app bị sửa đổi sẽ báo "xong" mà chẳng quét gì. Chữ ký thì
/// không giả được nếu không mở được khoá riêng.
class BiometricService {
  BiometricService([BiometricSignature? plugin])
      : _plugin = plugin ?? BiometricSignature();

  final BiometricSignature _plugin;

  /// Tên khoá trong Keystore/Keychain. Đặt cố định để lần sau còn tìm lại đúng khoá.
  static const _keyAlias = 'his_patient_app_biometric';

  Future<BiometricStatus> status() async {
    try {
      final availability = await _plugin.biometricAuthAvailable();
      if (availability.canAuthenticate == true) return const BiometricStatus.available();

      if (availability.hasEnrolledBiometrics == false) {
        return const BiometricStatus.unavailable(BiometricUnavailableReason.notEnrolled);
      }
      if (!await _plugin.isDeviceLockSet()) {
        return const BiometricStatus.unavailable(BiometricUnavailableReason.noDeviceLock);
      }
      return const BiometricStatus.unavailable(BiometricUnavailableReason.noHardware);
    } catch (error) {
      debugPrint('[biometric] không kiểm tra được khả năng sinh trắc: $error');
      return const BiometricStatus.unavailable(BiometricUnavailableReason.unknown);
    }
  }

  Future<bool> hasKey() async {
    try {
      return await _plugin.biometricKeyExists(keyAlias: _keyAlias);
    } catch (_) {
      return false;
    }
  }

  /// Sinh cặp khoá và trả về khoá công khai (DER SubjectPublicKeyInfo, base64) để gửi lên server.
  /// Null nếu người dùng huỷ hoặc máy không tạo được khoá.
  Future<String?> createKey() async {
    try {
      final result = await _plugin.createKeys(
        keyAlias: _keyAlias,
        keyFormat: KeyFormat.base64,
        config: CreateKeysConfig(
          signatureType: SignatureType.ecdsa,
          // Bắt buộc xác thực sinh trắc mỗi lần dùng khoá — đó chính là điều làm cho chữ ký
          // chứng minh được "đúng chủ máy vừa quét", chứ không chỉ "đúng máy này".
          enforceBiometric: true,
          requireAuthentication: true,
          // Đăng ký thêm vân tay mới thì khoá cũ mất hiệu lực: người khác thêm vân tay của họ vào
          // máy sẽ không mở được tài khoản của người bệnh.
          setInvalidatedByBiometricEnrollment: true,
          promptSubtitle: 'Xác thực để bật đăng nhập bằng sinh trắc học',
        ),
        promptMessage: 'Xác thực để bật đăng nhập bằng sinh trắc học',
      );
      return result.publicKey;
    } catch (error) {
      debugPrint('[biometric] không tạo được khoá: $error');
      return null;
    }
  }

  /// Ký chuỗi thử thách của server. Null nếu người dùng huỷ hoặc xác thực thất bại.
  Future<String?> sign(String nonce) async {
    try {
      final result = await _plugin.createSignature(
        payload: nonce,
        keyAlias: _keyAlias,
        signatureFormat: SignatureFormat.base64,
        config: CreateSignatureConfig(
          promptSubtitle: 'Xác thực để đăng nhập',
          // KHÔNG cho dùng PIN/hình mở khoá của máy thay thế: người bệnh đã có mã PIN riêng của app
          // cho trường hợp đó. Ở đây phải đúng sinh trắc học.
          allowDeviceCredentials: false,
        ),
        promptMessage: 'Xác thực để đăng nhập',
      );
      return result.signature;
    } catch (error) {
      debugPrint('[biometric] không ký được: $error');
      return null;
    }
  }

  /// Xoá khoá khi người dùng tắt sinh trắc hoặc đăng xuất.
  Future<void> deleteKey() async {
    try {
      await _plugin.deleteKeys(keyAlias: _keyAlias);
    } catch (error) {
      debugPrint('[biometric] không xoá được khoá: $error');
    }
  }
}
