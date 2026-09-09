import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/security/presentation/security_page.dart';
import 'app_lock.dart';
import 'device_integrity.dart';

final deviceIntegrityProvider = Provider<DeviceIntegrity>((ref) => const DeviceIntegrity());

/// Máy có dấu hiệu bị root/jailbreak không. Kiểm một lần cho cả phiên chạy.
final deviceCompromisedProvider = FutureProvider<bool>(
  (ref) => ref.watch(deviceIntegrityProvider).isCompromised(),
);

/// Phủ lên toàn app: màn khoá khi app bị tự khoá, và dải cảnh báo khi máy bị root/jailbreak.
///
/// Đặt ở đây chứ không ở từng màn để không màn nào lọt: một trang mới viết sau này tự động được bảo
/// vệ mà tác giả không phải nhớ gì cả.
class LockGate extends ConsumerWidget {
  const LockGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locked = ref.watch(appLockProvider);
    // `valueOrNull` chứ KHÔNG `value`: trên `AsyncError`, `.value` NÉM LẠI lỗi. `LockGate` bọc
    // TOÀN BỘ app, nên một lần mất mạng lúc mở app là màn trắng — không phải màn lỗi có nút thử
    // lại, mà trắng hẳn.
    final signedIn = ref.watch(authControllerProvider).valueOrNull is AuthSignedIn;

    return Stack(
      children: [
        child,

        // Chưa đăng nhập thì không có gì để che: màn đăng nhập vốn đã không hiện dữ liệu y tế.
        if (locked && signedIn) const _LockScreen(),
      ],
    );
  }
}

class _LockScreen extends ConsumerStatefulWidget {
  const _LockScreen();

  @override
  ConsumerState<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<_LockScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _unlockWithBiometrics() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final ok = await ref.read(biometricServiceProvider).verifyPresence();
      if (ok) {
        ref.read(appLockProvider.notifier).unlock();
        return;
      }
      setState(() => _error = 'Chưa xác thực được. Vui lòng thử lại.');
    } on Exception {
      setState(() => _error = 'Thiết bị chưa bật vân tay hoặc khuôn mặt.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Positioned.fill(
      child: Material(
        color: theme.colorScheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, size: 64, color: theme.colorScheme.primary),
                const SizedBox(height: 16),
                Text('Ứng dụng đã tự khoá', style: theme.textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  'Vì lý do bảo mật, ứng dụng tự khoá khi không dùng tới trong ít phút.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                ],

                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _busy ? null : _unlockWithBiometrics,
                  icon: const Icon(Icons.fingerprint),
                  label: const Text('Mở khoá'),
                ),
                const SizedBox(height: 8),
                // Đường lui khi máy không có sinh trắc hoặc cảm biến hỏng: đăng xuất rồi đăng nhập
                // lại. Không có nó thì người bệnh bị kẹt hẳn ngoài app của chính mình.
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          await ref.read(authControllerProvider.notifier).logout();
                          ref.read(appLockProvider.notifier).unlock();
                        },
                  child: const Text('Đăng xuất và đăng nhập lại'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Dải cảnh báo máy đã bị root/jailbreak, hiện ở trang chủ.
class DeviceIntegrityBanner extends ConsumerWidget {
  const DeviceIntegrityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compromised = ref.watch(deviceCompromisedProvider).valueOrNull ?? false;
    if (!compromised) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.gpp_maybe_outlined, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Thiết bị của bạn có dấu hiệu đã được mở quyền quản trị (root/jailbreak). '
              'Ở trạng thái này, ứng dụng khác trên máy có thể đọc được dữ liệu sức khoẻ của bạn. '
              'Hãy cân nhắc dùng một thiết bị khác để xem kết quả khám.',
              style: TextStyle(color: scheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}
