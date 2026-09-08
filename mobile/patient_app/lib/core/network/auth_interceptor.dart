import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/secure_store.dart';

/// Gắn Bearer token vào mọi request và tự làm mới token khi gặp 401.
///
/// Ràng buộc quan trọng (rút từ bài học của web client `frontend/src/services/apiClient.ts`):
/// - **Single-flight**: nhiều request 401 cùng lúc chỉ được gọi `/auth/refresh` MỘT lần,
///   các request còn lại chờ kết quả đó — nếu không sẽ tự đá nhau ra khỏi phiên
///   do refresh-token rotation coi lần dùng thứ hai là "reuse".
/// - **Chỉ thử lại đúng một lần** cho mỗi request, tránh vòng lặp vô hạn.
/// - Không đụng tới chính lời gọi `/auth/refresh` và `/auth/login`.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required SecureStore store,
    required Dio refreshClient,
    required this.onSessionExpired,
    // ignore: prefer_initializing_formals — giữ tên tham số công khai không có dấu _
  })  : _store = store,
        // ignore: prefer_initializing_formals
        _refreshClient = refreshClient;

  final SecureStore _store;

  /// Dio RIÊNG, không gắn interceptor này — nếu dùng chung, một lần refresh lỗi
  /// sẽ lại kích hoạt refresh lần nữa và đệ quy.
  final Dio _refreshClient;

  /// Gọi khi hết đường cứu: điều hướng về màn đăng nhập và xoá cache y tế.
  final FutureOr<void> Function() onSessionExpired;

  static const _retriedFlag = 'x-retried';

  /// Đường làm mới token, tính từ `baseUrl` (đã bao gồm `/api/v1`).
  static const refreshPath = '/patient/auth/refresh';

  Future<String?>? _inFlightRefresh;

  /// Những đường KHÔNG được gắn token và KHÔNG được thử làm mới: bản thân chúng là
  /// cách lấy token, nên can thiệp vào sẽ tạo đệ quy.
  bool _isAuthPath(String path) =>
      path.contains('/auth/refresh') ||
      path.contains('/auth/login') ||
      path.contains('/auth/register') ||
      path.contains('/auth/request-otp') ||
      path.contains('/auth/reset-password') ||
      path.contains('/auth/biometric/challenge') ||
      path.contains('/auth/biometric/login');

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (!_isAuthPath(options.path)) {
      final token = await _store.accessToken;
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final request = err.requestOptions;
    final isUnauthorized = err.response?.statusCode == 401;
    final alreadyRetried = request.extra[_retriedFlag] == true;

    if (!isUnauthorized || alreadyRetried || _isAuthPath(request.path)) {
      return handler.next(err);
    }

    final newToken = await _refreshOnce();
    if (newToken == null) {
      await _store.clearSession();
      await onSessionExpired();
      return handler.next(err);
    }

    request.extra[_retriedFlag] = true;
    request.headers['Authorization'] = 'Bearer $newToken';
    try {
      final response = await _refreshClient.fetch<dynamic>(request);
      return handler.resolve(response);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }

  /// Trả về access token mới, hoặc null nếu không làm mới được.
  Future<String?> _refreshOnce() {
    return _inFlightRefresh ??= _doRefresh().whenComplete(() => _inFlightRefresh = null);
  }

  Future<String?> _doRefresh() async {
    final refreshToken = await _store.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return null;

    try {
      final response = await _refreshClient.post<Map<String, dynamic>>(
        refreshPath,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? response.data;
      final access = data?['token'] as String?;
      final refresh = data?['refreshToken'] as String?;
      if (access == null || refresh == null) return null;

      await _store.saveTokens(accessToken: access, refreshToken: refresh);
      return access;
    } on DioException {
      return null;
    }
  }
}
