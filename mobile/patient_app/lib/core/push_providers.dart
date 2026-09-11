import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/presentation/auth_controller.dart';
import '../features/notifications/data/push_registration.dart';
import '../features/notifications/data/push_service.dart';
import 'providers.dart';
import 'router/app_router.dart';

/// Dịch vụ thông báo đẩy. Khởi tạo một lần trong `bootstrap`.
final pushServiceProvider = Provider<PushService>((ref) {
  final service = PushService();
  ref.onDispose(service.dispose);
  return service;
});

final pushTokenRegistrarProvider = Provider<PushTokenRegistrar>(
  (ref) => PushTokenRegistrar(ref.watch(apiClientProvider)),
);

final pushRegistrationProvider = Provider<PushRegistration>((ref) {
  final registration = PushRegistration(
    source: ref.watch(pushServiceProvider),
    sendToken: (token) => ref.read(pushTokenRegistrarProvider).update(token),
    // `GoRouter.go` không cần `BuildContext`, nên điều hướng được từ đây mà không phải kéo thông
    // báo đẩy xuyên qua cây widget chỉ để lấy context.
    navigate: (route) => ref.read(routerProvider).go(route),
  );
  ref.onDispose(registration.dispose);
  return registration;
});

/// Nối thông báo đẩy vào vòng đời app: gửi token FCM lên máy chủ mỗi khi đăng nhập xong, và mở đúng
/// màn khi người dùng chạm vào thông báo.
///
/// Là một provider (chứ không nằm trong `bootstrap`) vì nó phải chạy lại mỗi lần trạng thái đăng
/// nhập đổi — đăng nhập thường, đăng nhập sinh trắc, và cả lần dùng lại phiên cũ lúc mở app đều đi
/// qua đây. `app.dart` đọc nó một lần để nó sống suốt vòng đời app.
final pushBinderProvider = Provider<void>((ref) {
  final registration = ref.watch(pushRegistrationProvider);
  registration.start();

  ref.listen<AsyncValue<AuthState>>(
    authControllerProvider,
    (_, next) {
      final state = next.valueOrNull;
      if (state is AuthSignedIn) {
        registration.register();
      } else if (state is AuthSignedOut) {
        registration.forgetLastSent();
      }
    },
    fireImmediately: true,
  );
});
