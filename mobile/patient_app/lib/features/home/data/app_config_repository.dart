import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';

/// Cấu hình phát hành do máy chủ trả về (HSMT I.2 #1).
class RemoteAppConfig {
  const RemoteAppConfig({
    required this.minimumVersion,
    required this.latestVersion,
    required this.storeUrl,
    required this.updateRequired,
    required this.updateAvailable,
    this.maintenanceMessage,
    this.supportPhone,
  });

  final String minimumVersion;
  final String latestVersion;
  final String storeUrl;

  /// Bản đang chạy quá cũ: phải cập nhật mới dùng tiếp được.
  final bool updateRequired;

  /// Có bản mới hơn nhưng bản hiện tại vẫn dùng được.
  final bool updateAvailable;

  final String? maintenanceMessage;
  final String? supportPhone;

  bool get hasMaintenanceMessage => maintenanceMessage?.isNotEmpty == true;

  factory RemoteAppConfig.fromJson(Map<String, dynamic> json) => RemoteAppConfig(
        minimumVersion: json['minimumVersion'] as String? ?? '',
        latestVersion: json['latestVersion'] as String? ?? '',
        storeUrl: json['storeUrl'] as String? ?? '',
        updateRequired: json['updateRequired'] as bool? ?? false,
        updateAvailable: json['updateAvailable'] as bool? ?? false,
        maintenanceMessage: json['maintenanceMessage'] as String?,
        supportPhone: json['supportPhone'] as String?,
      );

  /// Dùng khi không gọi được máy chủ: không chặn ai cả.
  ///
  /// Mất mạng là chuyện thường; biến nó thành "app không mở được" thì tệ hơn hẳn việc để một bản cũ
  /// chạy thêm vài phút.
  static const unknown = RemoteAppConfig(
    minimumVersion: '',
    latestVersion: '',
    storeUrl: '',
    updateRequired: false,
    updateAvailable: false,
  );
}

class AppConfigRepository {
  AppConfigRepository(this._client);
  final Dio _client;

  Future<RemoteAppConfig> fetch({required String platform, required String version}) async {
    try {
      final response = await _client.get<Map<String, dynamic>>(
        '/app-config',
        queryParameters: {'platform': platform, 'version': version},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      return data == null ? RemoteAppConfig.unknown : RemoteAppConfig.fromJson(data);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
