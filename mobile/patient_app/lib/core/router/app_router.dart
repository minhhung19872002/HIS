import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_page.dart';
import '../../features/home/presentation/home_page.dart';

class AppRoutes {
  AppRoutes._();
  static const login = '/login';
  static const home = '/';
}

/// Router của app. Các màn theo HSMT (STT, đặt khám, kết quả, ví giấy tờ, thông
/// báo, bảo mật, tra cứu CSKH) sẽ được thêm dần theo từng phase — xem
/// `docs/features/patient-app/README.md` §5.
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.home,
    routes: [
      GoRoute(path: AppRoutes.home, builder: (_, _) => const HomePage()),
      GoRoute(path: AppRoutes.login, builder: (_, _) => const LoginPage()),
    ],
  );
});
