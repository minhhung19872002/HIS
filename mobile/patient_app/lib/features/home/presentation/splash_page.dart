import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error/failure.dart';
import '../../auth/presentation/auth_controller.dart';

/// Màn chờ lúc mở app, trong khi kiểm tra xem phiên đăng nhập cũ còn dùng được không.
///
/// Có màn này để tránh chớp qua màn đăng nhập rồi lại nhảy vào trong — với người dùng, cái chớp đó
/// trông như app bị lỗi.
class SplashPage extends ConsumerWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: auth.when(
            loading: () => const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.local_hospital_outlined, size: 64),
                SizedBox(height: 24),
                CircularProgressIndicator(),
              ],
            ),
            // Router sẽ điều hướng ngay khi có dữ liệu; khung này chỉ hiện trong tích tắc.
            data: (_) => const CircularProgressIndicator(),
            error: (error, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56),
                const SizedBox(height: 16),
                Text(
                  error is Failure ? error.message : 'Không kết nối được tới máy chủ.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(authControllerProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
