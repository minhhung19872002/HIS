import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/presentation/auth_controller.dart';
import 'config/app_flavor.dart';
import 'network/dio_client.dart';
import 'storage/secure_store.dart';

/// Ghi đè ở `main_<flavor>.dart` bằng `ProviderScope(overrides: ...)`.
/// Ném lỗi nếu quên ghi đè — thà chết sớm còn hơn chạy nhầm môi trường.
final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider phải được override trong main_<flavor>.dart'),
);

final secureStoreProvider = Provider<SecureStore>((ref) => SecureStore());

/// Bật lên khi phiên hết hạn, để màn đăng nhập nói được vì sao người dùng phải đăng nhập lại.
///
/// Cờ này KHÔNG phải thứ đưa người dùng ra màn đăng nhập — việc đó do `authControllerProvider` làm
/// (router lắng nghe nó). Trước đây chú thích ở đây ghi "router lắng nghe" nhưng router không hề
/// đọc cờ này, và cũng không ai đọc: phiên bị thu hồi thì token bị xoá mà trạng thái đăng nhập vẫn
/// là "đã đăng nhập", nên app ở nguyên trong màn trong và mọi lời gọi sau đó hỏng — người bệnh thấy
/// app đơ, tắt đi mở lại mới ra màn đăng nhập.
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
    onSessionExpired: () {
      ref.read(sessionExpiredProvider.notifier).markExpired();
      // Dựng lại trạng thái đăng nhập: interceptor đã xoá token, nên lần dựng lại này thấy không
      // còn phiên và trả về `AuthSignedOut` — router đang lắng nghe đúng provider đó sẽ đưa người
      // dùng về màn đăng nhập tử tế, thay vì để họ kẹt trong một app không gọi được gì.
      ref.invalidate(authControllerProvider);
    },
  );
});

/// Client duy nhất mà tầng data được phép dùng.
final apiClientProvider = Provider<Dio>((ref) => ref.watch(_dioPairProvider).api);
