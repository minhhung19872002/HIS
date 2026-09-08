import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/document_models.dart';

/// Gọi API ví giấy tờ của BFF (HSMT I.2 #8).
class DocumentsRepository {
  DocumentsRepository(this._client);
  final Dio _client;

  static const _base = '/patient/documents';

  Future<DocumentWallet> wallet({String? category}) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          _base,
          queryParameters: {if (category != null) 'category': category},
        ));
    return DocumentWallet.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  /// Tải lên một giấy tờ. Gửi multipart để máy chủ nhận thẳng ảnh chụp hoặc tệp PDF.
  Future<PatientDocument> upload({
    required Uint8List bytes,
    required String fileName,
    required String contentType,
    required DocumentCategory category,
    String? title,
    String? note,
  }) async {
    final parts = contentType.split('/');
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(
        bytes,
        filename: fileName,
        contentType: parts.length == 2 ? MediaType(parts[0], parts[1]) : null,
      ),
      'category': category.value,
      if (title != null && title.isNotEmpty) 'title': title,
      if (note != null && note.isNotEmpty) 'note': note,
    });

    final data = await _run(() => _client.post<Map<String, dynamic>>(_base, data: form));
    return PatientDocument.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  /// Tải nội dung một giấy tờ để xem. Máy chủ giải mã rồi trả byte.
  Future<Uint8List> content(String documentId) async {
    try {
      final response = await _client.get<List<int>>(
        '$_base/$documentId/content',
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data ?? const []);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> remove(String documentId) =>
      _run(() => _client.delete<Map<String, dynamic>>('$_base/$documentId')).then((_) {});

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
