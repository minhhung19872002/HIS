/// Lỗi đã được chuẩn hoá để tầng UI hiển thị — tầng data KHÔNG ném DioException
/// lên trên, luôn dịch sang `Failure` để màn hình không phải biết về HTTP.
sealed class Failure implements Exception {
  const Failure(this.message, {this.code});

  /// Thông điệp tiếng Việt, hiển thị thẳng cho người bệnh được.
  final String message;

  /// Mã lỗi nghiệp vụ từ server (RFC7807 `type` hoặc `error`), dùng để phân nhánh.
  final String? code;

  @override
  String toString() => '$runtimeType($code): $message';
}

/// Không có mạng / mất kết nối / timeout.
class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'Không có kết nối mạng. Vui lòng thử lại.']);
}

/// Phiên đăng nhập không còn hiệu lực (401, hoặc thiết bị bị đăng xuất từ xa).
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([
    super.message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    String? code,
  ]) : super(code: code);
}

/// Đăng nhập được nhưng không có quyền với tài nguyên này (403).
class ForbiddenFailure extends Failure {
  const ForbiddenFailure([super.message = 'Bạn không có quyền xem nội dung này.']);
}

/// Server yêu cầu đổi mật khẩu trước khi dùng tiếp (HSMT I.2 #9).
class PasswordChangeRequiredFailure extends Failure {
  const PasswordChangeRequiredFailure([
    super.message = 'Vui lòng đổi mật khẩu trước khi tiếp tục.',
  ]) : super(code: 'PASSWORD_CHANGE_REQUIRED');
}

/// Lỗi nghiệp vụ do server trả về (4xx còn lại).
class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.code, this.statusCode});
  final int? statusCode;
}

/// Lỗi không lường trước — luôn kèm thông điệp chung, KHÔNG lộ stack cho người dùng.
class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Đã có lỗi xảy ra. Vui lòng thử lại.']);
}
