import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/notifications/data/push_service.dart';
import 'providers.dart';

/// Dịch vụ thông báo đẩy. Khởi tạo một lần trong `bootstrap`.
final pushServiceProvider = Provider<PushService>((ref) {
  final service = PushService();
  ref.onDispose(service.dispose);
  return service;
});

final pushTokenRegistrarProvider = Provider<PushTokenRegistrar>(
  (ref) => PushTokenRegistrar(ref.watch(apiClientProvider)),
);
