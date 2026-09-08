import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/family_models.dart';

/// Gọi API quản lý gia đình của BFF (HSMT I.2 #7).
class FamilyRepository {
  FamilyRepository(this._client);
  final Dio _client;

  static const _base = '/patient/family';

  Future<FamilyList> members() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/members'));
    return FamilyList.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  /// Bước 1: khai người thân. Máy chủ trả về cách xác minh sẽ dùng.
  Future<AddFamilyMemberResult> add({
    required String patientCode,
    String? relationship,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/members',
          data: {'patientCode': patientCode, 'relationship': relationship},
        ));
    return AddFamilyMemberResult.fromJson(
      data['data'] as Map<String, dynamic>? ?? const {},
      data['message'] as String?,
    );
  }

  /// Bước 2: xác minh bằng mã OTP của người thân, hoặc bằng CCCD/ngày sinh trên hồ sơ.
  Future<void> verify(String linkId, {String? otpCode, String? identityData}) =>
      _run(() => _client.post<Map<String, dynamic>>(
            '$_base/members/$linkId/verify',
            data: {'otpCode': otpCode, 'identityData': identityData},
          )).then((_) {});

  Future<void> updatePermissions(
    String linkId, {
    required bool canViewResults,
    required bool canBookAppointments,
    required bool canTakeQueueNumber,
  }) =>
      _run(() => _client.put<Map<String, dynamic>>(
            '$_base/members/$linkId/permissions',
            data: {
              'canViewResults': canViewResults,
              'canBookAppointments': canBookAppointments,
              'canTakeQueueNumber': canTakeQueueNumber,
            },
          )).then((_) {});

  Future<void> remove(String linkId) =>
      _run(() => _client.delete<Map<String, dynamic>>('$_base/members/$linkId')).then((_) {});

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
