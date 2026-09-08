import 'package:biometric_signature/android_config.dart';
import 'package:biometric_signature/biometric_signature.dart';
import 'package:flutter/foundation.dart';

class BiometricStatus {
  const BiometricStatus.available(this.biometryName)
      : isAvailable = true,
        reason = null;
  const BiometricStatus.unavailable(this.reason) : isAvailable = false, biometryName = null;

  final bool isAvailable;

  /// FaceID · TouchID · Fingerprint… — dùng để gọi đúng tên trên giao diện.
  final String? biometryName;

  /// Lý do thô do nền tảng trả về, chỉ dùng để ghi log.
  final String? reason;

  String get message => isAvailable
      ? 'Dùng ${biometryName ?? 'sinh trắc học'} để đăng nhập.'
      : 'Bạn chưa cài vân tay hoặc khuôn mặt trong Cài đặt của máy, '
          'hoặc thiết bị này không hỗ trợ.';
}

/// Đăng nhập bằng sinh trắc học (HSMT I.2 #9).
///
/// Cách làm: máy sinh một cặp khoá **RSA-2048** với khoá riêng nằm trong Keystore (Android) hoặc
/// được Secure Enclave bọc lại (iOS), và **chỉ mở được sau khi quét vân tay hoặc khuôn mặt**. Khoá
/// công khai gửi lên server dưới dạng DER SubjectPublicKeyInfo mã hoá base64. Khi đăng nhập, server
/// phát một chuỗi ngẫu nhiên, máy ký `SHA256withRSA`, server kiểm chữ ký.
///
/// Vì sao không đơn giản là "app hỏi vân tay rồi báo server đã xác thực xong": server không có cách
/// nào biết lời báo đó là thật. Một bản app bị sửa đổi sẽ báo "xong" mà chẳng quét gì. Chữ ký thì
/// không giả được nếu không mở được khoá riêng.
///
/// ⚠️ Ghim ở `biometric_signature` **6.x**, KHÔNG nâng lên 13.x: bản mới đòi iOS tối thiểu **13.0**
/// (podspec `s.platform = :ios, '13.0'`), tức là mất cam kết iOS 12.0 của hồ sơ mời thầu. Điều này
/// do CI build iOS thật phát hiện, không phải suy đoán — xem docs/features/patient-app/README.md §6.2.
class BiometricService {
  BiometricService([BiometricSignature? plugin])
      : _plugin = plugin ?? BiometricSignature();

  final BiometricSignature _plugin;

  Future<BiometricStatus> status() async {
    try {
      // Trả về "FaceID" / "TouchID" / "fingerprint"… khi dùng được, hoặc "none, <lý do>".
      final result = await _plugin.biometricAuthAvailable();
      if (result == null || result.startsWith('none')) {
        debugPrint('[biometric] không dùng được: $result');
        return BiometricStatus.unavailable(result);
      }
      return BiometricStatus.available(result);
    } catch (error) {
      debugPrint('[biometric] không kiểm tra được khả năng sinh trắc: $error');
      return const BiometricStatus.unavailable('exception');
    }
  }

  /// Khoá đã tạo và còn hiệu lực chưa.
  ///
  /// `checkValidity: true` để phát hiện trường hợp người dùng vừa thêm vân tay mới — lúc đó hệ điều
  /// hành vô hiệu hoá khoá cũ, và nếu không kiểm thì mãi tới lúc đăng nhập mới biết.
  Future<bool> hasKey() async {
    try {
      return await _plugin.biometricKeyExists(checkValidity: true) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Sinh cặp khoá và trả về khoá công khai (DER SubjectPublicKeyInfo, base64).
  /// Null nếu người dùng huỷ hoặc máy không tạo được khoá.
  Future<String?> createKey() async {
    try {
      // useStrongBox: dùng chip bảo mật rời trên máy Android có hỗ trợ. Máy không có thì thư viện
      // tự lùi về Keystore thường, nên bật là an toàn.
      return await _plugin.createKeys(config: AndroidConfig(useStrongBox: true));
    } catch (error) {
      debugPrint('[biometric] không tạo được khoá: $error');
      return null;
    }
  }

  /// Ký chuỗi thử thách của server. Null nếu người dùng huỷ hoặc xác thực thất bại.
  Future<String?> sign(String nonce) async {
    try {
      return await _plugin.createSignature(options: {
        'payload': nonce,
        'promptMessage': 'Xác thực để đăng nhập',
        'cancelButtonText': 'Huỷ',
      });
    } catch (error) {
      debugPrint('[biometric] không ký được: $error');
      return null;
    }
  }

  /// Xoá khoá khi người dùng tắt sinh trắc hoặc đăng xuất.
  Future<void> deleteKey() async {
    try {
      await _plugin.deleteKeys();
    } catch (error) {
      debugPrint('[biometric] không xoá được khoá: $error');
    }
  }
}
