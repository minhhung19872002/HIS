import 'dart:async';

import 'package:patient_app/features/notifications/data/push_service.dart';

/// Bản giả của [PushTokenSource] dùng chung cho các bài kiểm về thông báo đẩy.
///
/// `PushService` thật đụng tới Firebase, mà Firebase không khởi tạo được trong `flutter test`.
class FakePushSource implements PushTokenSource {
  FakePushSource({String? token, this.failOnInitialize = false}) : _fcmToken = token;

  final String? _fcmToken;

  /// Giả lập Firebase hỏng lúc khởi tạo (thiếu quyền, dịch vụ Google Play cũ…).
  final bool failOnInitialize;

  int initializeCount = 0;

  final _refreshes = StreamController<String>.broadcast();
  final _deepLinks = StreamController<String>.broadcast();

  @override
  Future<void> ensureInitialized() async {
    initializeCount++;
    if (failOnInitialize) throw StateError('Firebase hỏng');
  }

  @override
  Future<String?> token() async => _fcmToken;

  @override
  Stream<String> get tokenRefreshes => _refreshes.stream;

  @override
  Stream<String> get deepLinks => _deepLinks.stream;

  void emitTokenRefresh(String token) => _refreshes.add(token);
  void emitDeepLink(String link) => _deepLinks.add(link);

  Future<void> dispose() async {
    await _refreshes.close();
    await _deepLinks.close();
  }
}
