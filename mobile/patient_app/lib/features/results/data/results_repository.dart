import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/inpatient_models.dart';
import '../domain/result_models.dart';

/// Gọi API kết quả khám của BFF (HSMT I.2 #5, #6).
///
/// [memberId] là id liên kết gia đình: bỏ trống = hồ sơ của chính mình, có giá trị = hồ sơ của
/// người thân đã kết nối (HSMT I.2 #7). Máy chủ kiểm quyền ở từng lời gọi.
class ResultsRepository {
  ResultsRepository(this._client, {this.memberId});
  final Dio _client;
  final String? memberId;

  static const _base = '/patient/results';

  Future<List<Visit>> visits({int limit = 20}) =>
      _list('$_base/visits', Visit.fromJson, query: {'limit': limit, ..._scope(null, null)});

  Future<List<LabResult>> labResults({String? visitId, String? admissionId}) =>
      _list('$_base/lab', LabResult.fromJson, query: _scope(visitId, admissionId));

  Future<LabResult> labResult(String id) async {
    final data = await _run(
        () => _client.get<Map<String, dynamic>>('$_base/lab/$id', queryParameters: _scope(null, null)));
    return LabResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  /// Bản in phiếu xét nghiệm (HTML), để người bệnh xem, in ra hoặc gửi cho bác sĩ khác.
  Future<String> labResultReport(String id) async {
    try {
      final response = await _client.get<String>(
        '$_base/lab/$id/report',
        queryParameters: _scope(null, null),
        // Ép về text: mặc định dio đoán kiểu theo Content-Type và có thể trả về Map.
        options: Options(responseType: ResponseType.plain),
      );
      return response.data ?? '';
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<ImagingResult>> imagingResults({String? visitId, String? admissionId}) =>
      _list('$_base/imaging', ImagingResult.fromJson, query: _scope(visitId, admissionId));

  Future<ImagingResult> imagingResult(String id) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/imaging/$id',
        queryParameters: _scope(null, null)));
    return ImagingResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<ImagingInstance>> imagingImages(String resultId) =>
      _list('$_base/imaging/$resultId/images', ImagingInstance.fromJson,
          query: _scope(null, null));

  /// Tải một ảnh đã dựng. Trả byte để `Image.memory` vẽ thẳng — ảnh đi qua BFF nên cần header
  /// xác thực, mà `Image.network` thì không mang được header của interceptor.
  Future<Uint8List> imagingImageBytes(String resultId, String instanceId, {int width = 1024}) async {
    try {
      final response = await _client.get<List<int>>(
        '$_base/imaging/$resultId/images/$instanceId',
        queryParameters: {'width': width, ..._scope(null, null)},
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data ?? const []);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<FunctionalResult>> functionalResults({String? visitId, String? admissionId}) =>
      _list('$_base/functional', FunctionalResult.fromJson, query: _scope(visitId, admissionId));

  Future<FunctionalResult> functionalResult(String id) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/functional/$id',
        queryParameters: _scope(null, null)));
    return FunctionalResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<HealthCheckup>> healthCheckups() =>
      _list('$_base/health-checkups', HealthCheckup.fromJson, query: _scope(null, null));

  Future<List<Prescription>> prescriptions({bool activeOnly = false}) =>
      _list('$_base/prescriptions', Prescription.fromJson,
          query: {'activeOnly': activeOnly, ..._scope(null, null)});

  // ------------------------------------------------------------- nội trú

  Future<List<Admission>> admissions() =>
      _list('$_base/admissions', Admission.fromJson, query: _scope(null, null));

  Future<MedicineDisclosure> medicineDisclosure(String admissionId) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
        '$_base/admissions/$admissionId/medicine-disclosure',
        queryParameters: _scope(null, null)));
    return MedicineDisclosure.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<ServiceOrder>> serviceOrders(String admissionId) =>
      _list('$_base/admissions/$admissionId/service-orders', ServiceOrder.fromJson,
          query: _scope(null, null));

  /// Phạm vi truy vấn: lượt khám, đợt nằm viện, và hồ sơ của ai.
  Map<String, dynamic> _scope(String? visitId, String? admissionId) => {
        if (visitId != null) 'visitId': visitId,
        if (admissionId != null) 'admissionId': admissionId,
        if (memberId != null) 'memberId': memberId,
      };

  Future<List<T>> _list<T>(
    String path,
    T Function(Map<String, dynamic>) parse, {
    Map<String, dynamic>? query,
  }) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(path, queryParameters: query));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => parse(e as Map<String, dynamic>))
        .toList();
  }

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
