import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/queue_models.dart';

/// Gọi API lấy số thứ tự của BFF (HSMT I.2 #3).
class QueueRepository {
  QueueRepository(this._client);
  final Dio _client;

  static const _base = '/patient/queue';

  Future<List<Department>> departments() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/departments'));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => Department.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClinicRoom>> rooms({String? departmentId}) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          '$_base/rooms',
          queryParameters: {if (departmentId != null) 'departmentId': departmentId},
        ));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => ClinicRoom.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Lấy số. Trả kèm thông điệp của server để app hiển thị nguyên văn — server là nơi biết vé có
  /// được ưu tiên hay không và có cần xác minh tại quầy không.
  ///
  /// [queueType] mặc định 1 = hàng đợi QUẦY TIẾP ĐÓN. Lấy số trên app không tạo ra lượt khám nào
  /// trong bệnh viện, nên số này để vào quầy đăng ký (chọn dịch vụ, đối chiếu BHYT, thu phí); quầy
  /// mới xếp người bệnh vào phòng khám. Lấy thẳng số phòng khám thì phòng sẽ gọi một người chưa
  /// đăng ký và bác sĩ không có hồ sơ nào trên màn hình.
  Future<({QueueTicket ticket, String? message})> takeNumber({
    required String roomId,
    int queueType = 1,
    PriorityReason? priorityReason,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          '$_base/take-number',
          data: {
            'roomId': roomId,
            'queueType': queueType,
            if (priorityReason != null) 'priorityReason': priorityReason.value,
          },
        ));
    return (
      ticket: QueueTicket.fromJson(data['data'] as Map<String, dynamic>),
      message: data['message'] as String?,
    );
  }

  /// Những số người bệnh đã lấy trong ngày hôm nay.
  Future<List<IssuedTicket>> myTickets() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/tickets'));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => IssuedTicket.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<QueueTicketStatus> ticketStatus(String ticketId) async {
    final data = await _run(
        () => _client.get<Map<String, dynamic>>('$_base/tickets/$ticketId/status'));
    return QueueTicketStatus.fromJson(data['data'] as Map<String, dynamic>);
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
