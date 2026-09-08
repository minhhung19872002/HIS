import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/change_password_page.dart';
import '../../features/auth/presentation/forgot_password_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/home/presentation/home_page.dart';
import '../../features/home/presentation/splash_page.dart';
import '../../features/security/presentation/devices_page.dart';

class AppRoutes {
  AppRoutes._();

  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const changePassword = '/change-password';
  static const home = '/';
  static const devices = '/devices';
}

/// Đưa `Listenable` cho go_router từ một provider của Riverpod, để router vẽ lại khi trạng thái
/// đăng nhập đổi (đăng xuất từ xa, phiên hết hạn, đổi mật khẩu…).
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(this._ref) {
    _ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
  final Ref _ref;
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = _AuthListenable(ref);
  ref.onDispose(listenable.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: listenable,
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, _) => const SplashPage()),
      GoRoute(path: AppRoutes.login, builder: (_, _) => const LoginPage()),
      GoRoute(path: AppRoutes.register, builder: (_, _) => const RegisterPage()),
      GoRoute(path: AppRoutes.forgotPassword, builder: (_, _) => const ForgotPasswordPage()),
      GoRoute(path: AppRoutes.home, builder: (_, _) => const HomePage()),
      GoRoute(path: AppRoutes.devices, builder: (_, _) => const DevicesPage()),
      GoRoute(
        path: AppRoutes.changePassword,
        builder: (context, state) => ChangePasswordPage(
          forced: state.uri.queryParameters['forced'] == '1',
        ),
      ),
    ],
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      // Đang kiểm tra phiên cũ: giữ ở màn chờ, đừng chớp qua màn đăng nhập rồi lại nhảy vào trong.
      if (auth.isLoading) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      // Lỗi mạng lúc mở app: cho ở lại màn chờ, màn đó có nút thử lại.
      if (auth.hasError) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      final value = auth.value;
      final signedIn = value is AuthSignedIn;

      const publicRoutes = {
        AppRoutes.login,
        AppRoutes.register,
        AppRoutes.forgotPassword,
      };

      if (!signedIn) {
        return publicRoutes.contains(location) ? null : AppRoutes.login;
      }

      // Máy chủ đang buộc đổi mật khẩu: chặn mọi màn khác. Server cũng chặn độc lập ở tầng API,
      // đây chỉ là để người dùng không đâm vào tường lỗi.
      if (value.mustChangePassword && location != AppRoutes.changePassword) {
        return '${AppRoutes.changePassword}?forced=1';
      }

      // Đã đăng nhập mà còn ở màn công khai hoặc màn chờ thì đưa về trang chủ.
      if (publicRoutes.contains(location) || location == AppRoutes.splash) {
        return AppRoutes.home;
      }

      return null;
    },
  );
});
