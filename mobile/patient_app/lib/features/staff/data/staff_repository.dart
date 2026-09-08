import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/staff_models.dart';

/// Gọi API tra cứu của BFF cho nhân viên CSKH (HSMT I.3 #2.2).
///
/// Dùng một `Dio` riêng, KHÔNG dùng client của người bệnh: hai vai trò mang hai token khác nhau, và
/// trộn chúng vào một client là cách nhanh nhất để gửi nhầm token của người bệnh vào API nhân viên
/// (hoặc ngược lại).
class StaffRepository {
  StaffRepository(this._client);
  final Dio _client;

  /// Đăng nhập bằng tài khoản HIS. BFF chuyển tiếp sang HIS Core và trả lại token của HIS.
  Future<StaffSession> login({required String username, required String password}) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '/staff/auth/login',
          data: {'username': username, 'password': password},
        ));
    return StaffSession.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<StaffPatient>> search(String keyword, {required String token}) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          '/staff/lookup/patients',
          queryParameters: {'keyword': keyword},
          options: _auth(token),
        ));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => StaffPatient.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StaffPatientSummary> summary(String patientId, {required String token}) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          '/staff/lookup/patients/$patientId/summary',
          options: _auth(token),
        ));
    return StaffPatientSummary.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  /// Đặt lại mật khẩu app hộ người bệnh. Trả về mật khẩu tạm để nhân viên đọc cho họ.
  Future<String> resetAppPassword(String patientId, {required String token}) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '/staff/lookup/patients/$patientId/reset-app-password',
          options: _auth(token),
        ));
    return (data['data'] as Map<String, dynamic>? ?? const {})['temporaryPassword'] as String? ?? '';
  }

  static Options _auth(String token) =>
      Options(headers: {'Authorization': 'Bearer $token'});

  Future<Map<String, dynamic>> _run(
      Future<Response<Map<String, dynamic>>> Function() request) async {
    try {
      final response = await request();
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
