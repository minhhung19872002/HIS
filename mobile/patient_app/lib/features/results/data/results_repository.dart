import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/result_models.dart';

/// Gọi API kết quả khám của BFF (HSMT I.2 #5).
class ResultsRepository {
  ResultsRepository(this._client);
  final Dio _client;

  static const _base = '/patient/results';

  Future<List<Visit>> visits({int limit = 20}) =>
      _list('$_base/visits', Visit.fromJson, query: {'limit': limit});

  Future<List<LabResult>> labResults({String? visitId}) =>
      _list('$_base/lab', LabResult.fromJson, query: {if (visitId != null) 'visitId': visitId});

  Future<LabResult> labResult(String id) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/lab/$id'));
    return LabResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<ImagingResult>> imagingResults({String? visitId}) =>
      _list('$_base/imaging', ImagingResult.fromJson,
          query: {if (visitId != null) 'visitId': visitId});

  Future<ImagingResult> imagingResult(String id) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/imaging/$id'));
    return ImagingResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<ImagingInstance>> imagingImages(String resultId) =>
      _list('$_base/imaging/$resultId/images', ImagingInstance.fromJson);

  /// Tải một ảnh đã dựng. Trả byte để `Image.memory` vẽ thẳng — ảnh đi qua BFF nên cần header
  /// xác thực, mà `Image.network` thì không mang được header của interceptor.
  Future<Uint8List> imagingImageBytes(String resultId, String instanceId, {int width = 1024}) async {
    try {
      final response = await _client.get<List<int>>(
        '$_base/imaging/$resultId/images/$instanceId',
        queryParameters: {'width': width},
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data ?? const []);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<FunctionalResult>> functionalResults({String? visitId}) =>
      _list('$_base/functional', FunctionalResult.fromJson,
          query: {if (visitId != null) 'visitId': visitId});

  Future<FunctionalResult> functionalResult(String id) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/functional/$id'));
    return FunctionalResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<HealthCheckup>> healthCheckups() =>
      _list('$_base/health-checkups', HealthCheckup.fromJson);

  Future<List<Prescription>> prescriptions({bool activeOnly = false}) =>
      _list('$_base/prescriptions', Prescription.fromJson, query: {'activeOnly': activeOnly});

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
