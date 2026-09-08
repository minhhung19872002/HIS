import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/change_password_page.dart';
import '../../features/auth/presentation/forgot_password_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/home/presentation/home_page.dart';
import '../../features/appointments/presentation/appointments_page.dart';
import '../../features/appointments/presentation/book_appointment_page.dart';
import '../../features/home/presentation/splash_page.dart';
import '../../features/queue/presentation/queue_page.dart';
import '../../features/results/presentation/functional_result_page.dart';
import '../../features/results/presentation/imaging_result_page.dart';
import '../../features/results/presentation/lab_result_page.dart';
import '../../features/results/presentation/results_page.dart';
import '../../features/queue/presentation/queue_ticket_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/security/presentation/devices_page.dart';
import '../../features/security/presentation/security_page.dart';
import '../../features/security/presentation/set_pin_page.dart';

class AppRoutes {
  AppRoutes._();

  static const splash = '/splash';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const changePassword = '/change-password';
  static const home = '/';
  static const devices = '/devices';
  static const notifications = '/notifications';
  static const security = '/security';
  static const setPin = '/security/pin';
  static const queue = '/queue';
  static const queueTicket = '/queue/ticket';
  static const appointments = '/appointments';
  static const bookAppointment = '/appointments/book';
  static const results = '/results';
  static const prescriptions = '/results/prescriptions';
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
      GoRoute(path: AppRoutes.notifications, builder: (_, _) => const NotificationsPage()),
      GoRoute(path: AppRoutes.security, builder: (_, _) => const SecurityPage()),
      GoRoute(path: AppRoutes.setPin, builder: (_, _) => const SetPinPage()),
      GoRoute(path: AppRoutes.queue, builder: (_, _) => const QueuePage()),
      GoRoute(
        path: '${AppRoutes.queueTicket}/:ticketId',
        builder: (context, state) => QueueTicketPage(
          ticketId: state.pathParameters['ticketId']!,
          initialMessage: state.extra as String?,
        ),
      ),
      GoRoute(path: AppRoutes.appointments, builder: (_, _) => const AppointmentsPage()),
      GoRoute(path: AppRoutes.bookAppointment, builder: (_, _) => const BookAppointmentPage()),
      GoRoute(path: AppRoutes.results, builder: (_, _) => const ResultsPage()),
      // Lối tắt "Đơn thuốc" ở trang chủ mở thẳng tab đơn thuốc — người bệnh bấm vào đó là đang đi
      // tìm đúng thứ đó, không nên bắt họ tìm tiếp trong sáu tab.
      GoRoute(
        path: AppRoutes.prescriptions,
        builder: (_, _) => const ResultsPage(initialTab: 4),
      ),
      GoRoute(
        path: '${AppRoutes.results}/lab/:resultId',
        builder: (context, state) =>
            LabResultPage(resultId: state.pathParameters['resultId']!),
      ),
      GoRoute(
        path: '${AppRoutes.results}/imaging/:resultId',
        builder: (context, state) =>
            ImagingResultPage(resultId: state.pathParameters['resultId']!),
      ),
      GoRoute(
        path: '${AppRoutes.results}/functional/:resultId',
        builder: (context, state) =>
            FunctionalResultPage(resultId: state.pathParameters['resultId']!),
      ),
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
