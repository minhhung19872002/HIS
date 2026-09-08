import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/app_flavor.dart';
import 'network/dio_client.dart';
import 'storage/secure_store.dart';

/// Ghi đè ở `main_<flavor>.dart` bằng `ProviderScope(overrides: ...)`.
/// Ném lỗi nếu quên ghi đè — thà chết sớm còn hơn chạy nhầm môi trường.
final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider phải được override trong main_<flavor>.dart'),
);

final secureStoreProvider = Provider<SecureStore>((ref) => SecureStore());

/// Bật lên khi phiên hết hạn — router lắng nghe để đá về màn đăng nhập.
/// (Riverpod 3 đã bỏ `StateProvider` khỏi API chính nên dùng `Notifier`.)
class SessionExpired extends Notifier<bool> {
  @override
  bool build() => false;

  void markExpired() => state = true;
  void reset() => state = false;
}

final sessionExpiredProvider = NotifierProvider<SessionExpired, bool>(SessionExpired.new);

final _dioPairProvider = Provider<({Dio api, Dio bare})>((ref) {
  return DioFactory.create(
    config: ref.watch(appConfigProvider),
    store: ref.watch(secureStoreProvider),
    onSessionExpired: () => ref.read(sessionExpiredProvider.notifier).markExpired(),
  );
});

/// Client duy nhất mà tầng data được phép dùng.
final apiClientProvider = Provider<Dio>((ref) => ref.watch(_dioPairProvider).api);
