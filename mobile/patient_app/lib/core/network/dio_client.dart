import 'dart:async';

import 'package:dio/dio.dart';

import '../config/app_flavor.dart';
import '../storage/secure_store.dart';
import 'auth_interceptor.dart';

/// Dựng cặp Dio dùng chung cho toàn app.
///
/// Trả về hai instance vì `AuthInterceptor` cần một Dio "sạch" để gọi
/// `/auth/refresh` và để phát lại request — dùng chung một instance sẽ gây đệ quy.
class DioFactory {
  static ({Dio api, Dio bare}) create({
    required AppConfig config,
    required SecureStore store,
    required FutureOr<void> Function() onSessionExpired,
  }) {
    final options = BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: config.connectTimeout,
      receiveTimeout: config.receiveTimeout,
      headers: const {'Accept': 'application/json'},
      // Không tự ném cho 4xx: interceptor cần đọc body để dịch lỗi nghiệp vụ.
      validateStatus: (status) => status != null && status < 400,
    );

    final bare = Dio(options);
    final api = Dio(options);

    api.interceptors.add(
      AuthInterceptor(store: store, refreshClient: bare, onSessionExpired: onSessionExpired),
    );

    if (config.enableHttpLog && !config.isProd) {
      // CHỈ ở dev/staging. Prod không log để không rò dữ liệu y tế ra logcat/Console.
      api.interceptors.add(LogInterceptor(requestBody: true, responseBody: false));
    }

    return (api: api, bare: bare);
  }
}
