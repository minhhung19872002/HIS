import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/secure_store.dart';

/// Kết quả một lần làm mới token.
///
/// Phân biệt "phiên hết hạn thật" với "không hỏi được máy chủ" là điểm mấu chốt. Gộp hai thứ đó
/// làm một thì mỗi lần Wi-Fi rớt hay máy chủ nấc một cái là người bệnh bị xoá phiên và đá về màn
/// đăng nhập — trong khi phiên của họ vẫn còn nguyên hiệu lực.
enum RefreshOutcome {
  /// Đã có token mới.
  renewed,

  /// Máy chủ nói phiên không còn hiệu lực, hoặc máy không còn refresh token để mà hỏi.
  /// Đây là trường hợp DUY NHẤT được phép đăng xuất.
  expired,

  /// Không hỏi được máy chủ: mất mạng, quá thời gian chờ, 5xx, hoặc trả về khó hiểu.
  /// Phiên vẫn còn — để request đó thất bại, lần chạm sau thử lại.
  unreachable,
}

/// Gắn Bearer token vào mọi request và tự làm mới token khi gặp 401.
///
/// Ràng buộc quan trọng (rút từ bài học của web client `frontend/src/services/apiClient.ts`):
/// - **Single-flight**: nhiều request 401 cùng lúc chỉ được gọi `/auth/refresh` MỘT lần,
///   các request còn lại chờ kết quả đó — nếu không sẽ tự đá nhau ra khỏi phiên
///   do refresh-token rotation coi lần dùng thứ hai là "reuse".
/// - **Chỉ thử lại đúng một lần** cho mỗi request, tránh vòng lặp vô hạn.
/// - Không đụng tới chính lời gọi `/auth/refresh` và `/auth/login`.
/// - **Chỉ đăng xuất khi máy chủ THẬT SỰ nói phiên hết hạn** — xem [RefreshOutcome].
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

  Future<({RefreshOutcome outcome, String? token})>? _inFlightRefresh;

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

    final refreshed = await _refreshOnce();

    if (refreshed.token == null) {
      // Chỉ xoá phiên khi máy chủ thật sự nói phiên hết hạn. Mất mạng / máy chủ nấc thì giữ phiên
      // và để riêng request này hỏng — người bệnh chạm lại là chạy tiếp, không phải đăng nhập lại.
      if (refreshed.outcome == RefreshOutcome.expired) {
        await _store.clearSession();
        await onSessionExpired();
      }
      return handler.next(err);
    }

    request.extra[_retriedFlag] = true;
    request.headers['Authorization'] = 'Bearer ${refreshed.token}';
    try {
      final response = await _refreshClient.fetch<dynamic>(request);
      return handler.resolve(response);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }

  /// Làm mới token, gộp mọi lời gọi trùng thời điểm vào một lần duy nhất.
  Future<({RefreshOutcome outcome, String? token})> _refreshOnce() {
    return _inFlightRefresh ??= _doRefresh().whenComplete(() => _inFlightRefresh = null);
  }

  Future<({RefreshOutcome outcome, String? token})> _doRefresh() async {
    final refreshToken = await _store.refreshToken;
    // Không còn gì để hỏi thì đúng là hết phiên, không phải lỗi mạng.
    if (refreshToken == null || refreshToken.isEmpty) {
      return (outcome: RefreshOutcome.expired, token: null);
    }

    try {
      final response = await _refreshClient.post<Map<String, dynamic>>(
        refreshPath,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>? ?? response.data;
      final access = data?['token'] as String?;
      final refresh = data?['refreshToken'] as String?;

      // Máy chủ trả 2xx mà thiếu token là hợp đồng bị vỡ, không phải phiên hết hạn. Giữ phiên:
      // đăng xuất ở đây thì một lỗi phía máy chủ sẽ quét sạch phiên của mọi người đang dùng.
      if (access == null || refresh == null) {
        return (outcome: RefreshOutcome.unreachable, token: null);
      }

      await _store.saveTokens(accessToken: access, refreshToken: refresh);
      return (outcome: RefreshOutcome.renewed, token: access);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      // 401/403 ở chính lời gọi làm mới = máy chủ đã phán quyết: refresh token không còn dùng được
      // (hết hạn, bị thu hồi, hoặc bị phát hiện dùng lại). Đó mới là lúc phải đăng nhập lại.
      final rejected = status == 401 || status == 403;
      return (
        outcome: rejected ? RefreshOutcome.expired : RefreshOutcome.unreachable,
        token: null,
      );
    }
  }
}
