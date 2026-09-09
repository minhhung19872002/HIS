
import '../../../core/json.dart';
/// Tài khoản app của người bệnh, theo góc nhìn của giao diện.
class Account {
  const Account({
    required this.id,
    required this.phoneNumber,
    required this.fullName,
    required this.isLinked,
    required this.mustChangePassword,
    required this.hasPin,
    required this.biometricEnabled,
    this.patientCode,
  });

  final String id;
  final String phoneNumber;
  final String fullName;

  /// Đã liên kết hồ sơ bệnh nhân bên HIS chưa. Chưa liên kết thì chưa xem được kết quả.
  final bool isLinked;

  final String? patientCode;

  /// Server đang buộc đổi mật khẩu — app phải đưa thẳng tới màn đổi, và server cũng chặn độc lập.
  final bool mustChangePassword;

  final bool hasPin;
  final bool biometricEnabled;

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String? ?? '',
        phoneNumber: json['phoneNumber'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        isLinked: asBool(json['isLinked']),
        patientCode: json['patientCode'] as String?,
        mustChangePassword: asBool(json['mustChangePassword']),
        hasPin: asBool(json['hasPin']),
        biometricEnabled: asBool(json['biometricEnabled']),
      );
}

/// Một thiết bị đang đăng nhập (HSMT I.2 #9).
class LoginDevice {
  const LoginDevice({
    required this.id,
    required this.deviceName,
    required this.platform,
    required this.lastSeenAt,
    required this.createdAt,
    required this.isCurrent,
    required this.biometricEnabled,
    this.osVersion,
    this.appVersion,
    this.lastIp,
  });

  final String id;
  final String deviceName;
  final String platform;
  final String? osVersion;
  final String? appVersion;
  final String? lastIp;
  final DateTime lastSeenAt;
  final DateTime createdAt;
  final bool biometricEnabled;

  /// Chính máy đang dùng — không cho tự đăng xuất mình từ màn này, dễ gây hoang mang.
  final bool isCurrent;

  factory LoginDevice.fromJson(Map<String, dynamic> json) => LoginDevice(
        id: json['id'] as String? ?? '',
        deviceName: json['deviceName'] as String? ?? '',
        platform: json['platform'] as String? ?? '',
        osVersion: json['osVersion'] as String?,
        appVersion: json['appVersion'] as String?,
        lastIp: json['lastIp'] as String?,
        lastSeenAt: DateTime.tryParse(json['lastSeenAt'] as String? ?? '')?.toLocal() ??
            DateTime.now(),
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '')?.toLocal() ??
            DateTime.now(),
        biometricEnabled: asBool(json['biometricEnabled']),
        isCurrent: asBool(json['isCurrent']),
      );
}
