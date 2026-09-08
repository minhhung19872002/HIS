import 'package:dio/dio.dart';

import '../error/failure.dart';

/// Dịch `DioException` sang `Failure` để tầng UI không phải biết về HTTP.
///
/// Lưu ý hợp đồng với backend HIS: response bọc trong envelope `{success, data,
/// message}`; lỗi theo RFC7807 có `type`/`title`/`detail`. Hàm này chấp nhận cả
/// hai dạng vì HIS Core và BFF có thể trả khác nhau.
Failure mapDioError(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return const NetworkFailure();
    case DioExceptionType.cancel:
      return const UnknownFailure('Yêu cầu đã bị huỷ.');
    case DioExceptionType.badCertificate:
      return const UnknownFailure('Chứng chỉ máy chủ không hợp lệ.');
    case DioExceptionType.badResponse:
    case DioExceptionType.unknown:
    // ignore: deprecated_member_use
    case DioExceptionType.transformTimeout:
      break;
  }

  final response = e.response;
  if (response == null) return const NetworkFailure();

  final status = response.statusCode ?? 0;
  final body = response.data;
  final code = _readString(body, const ['error', 'code', 'type']);
  final message = _readString(body, const ['message', 'detail', 'title']);

  if (code == 'PASSWORD_CHANGE_REQUIRED') {
    return const PasswordChangeRequiredFailure();
  }
  if (status == 401) return UnauthorizedFailure(message ?? 'Phiên đăng nhập đã hết hạn.', code);
  if (status == 403) {
    return ForbiddenFailure(message ?? 'Bạn không có quyền xem nội dung này.');
  }
  if (status >= 500) {
    return ServerFailure('Máy chủ đang bận. Vui lòng thử lại sau.', code: code, statusCode: status);
  }
  return ServerFailure(message ?? 'Yêu cầu không hợp lệ.', code: code, statusCode: status);
}

String? _readString(dynamic body, List<String> keys) {
  if (body is! Map) return null;
  for (final key in keys) {
    final value = body[key];
    if (value is String && value.isNotEmpty) return value;
  }
  return null;
}
