import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../domain/app_notification.dart';

/// Đọc hộp thư thông báo từ BFF.
class NotificationRepository {
  NotificationRepository(this._client);
  final Dio _client;

  static const _base = '/patient/notifications';

  Future<List<AppNotificationItem>> inbox({int take = 50}) async {
    final body = await _run(() => _client.get<Map<String, dynamic>>(
          _base,
          queryParameters: {'take': take},
        ));
    final items = body['data'] as List<dynamic>? ?? const [];
    return items
        .map((e) => AppNotificationItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> unreadCount() async {
    final body = await _run(() => _client.get<Map<String, dynamic>>('$_base/unread-count'));
    return body['data'] as int? ?? 0;
  }

  Future<void> markRead(String notificationId) =>
      _run(() => _client.put<Map<String, dynamic>>('$_base/$notificationId/read')).then((_) {});

  Future<void> markAllRead() =>
      _run(() => _client.put<Map<String, dynamic>>('$_base/read-all')).then((_) {});

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
