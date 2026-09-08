import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/router/app_router.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/biometric_service.dart';

final biometricServiceProvider = Provider<BiometricService>((ref) => BiometricService());

final biometricStatusProvider = FutureProvider.autoDispose<BiometricStatus>(
  (ref) => ref.watch(biometricServiceProvider).status(),
);

/// "Bảo mật & tài khoản" — HSMT I.2 #9.
class SecurityPage extends ConsumerWidget {
  const SecurityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final account = auth.value is AuthSignedIn ? (auth.value! as AuthSignedIn).account : null;
    final biometric = ref.watch(biometricStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Bảo mật')),
      body: ListView(
        children: [
          const _SectionHeader('Đăng nhập'),
          ListTile(
            leading: const Icon(Icons.password),
            title: const Text('Đổi mật khẩu'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.changePassword),
          ),
          ListTile(
            leading: const Icon(Icons.pin_outlined),
            title: const Text('Mã PIN'),
            subtitle: Text(account?.hasPin == true
                ? 'Đã đặt. Chạm để đổi mã PIN.'
                : 'Chưa đặt. Mã PIN giúp mở app nhanh mà không cần nhập mật khẩu.'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.setPin),
          ),
          biometric.when(
            loading: () => const ListTile(
              leading: Icon(Icons.fingerprint),
              title: Text('Đăng nhập bằng sinh trắc học'),
              subtitle: Text('Đang kiểm tra thiết bị…'),
            ),
            error: (_, _) => const ListTile(
              leading: Icon(Icons.fingerprint),
              title: Text('Đăng nhập bằng sinh trắc học'),
              subtitle: Text('Không kiểm tra được thiết bị.'),
              enabled: false,
            ),
            data: (status) => ListTile(
              leading: const Icon(Icons.fingerprint),
              title: const Text('Đăng nhập bằng sinh trắc học'),
              subtitle: Text(status.isAvailable
                  ? (account?.biometricEnabled == true
                      ? 'Đã bật trên thiết bị này.'
                      : 'Dùng vân tay hoặc khuôn mặt để đăng nhập.')
                  // Nói rõ vì sao không bật được, và người dùng cần làm gì.
                  : status.message),
              trailing: status.isAvailable ? const Icon(Icons.chevron_right) : null,
              enabled: status.isAvailable,
              onTap: status.isAvailable ? () => _enrollBiometric(context, ref) : null,
            ),
          ),

          const Divider(),
          const _SectionHeader('Thiết bị'),
          ListTile(
            leading: const Icon(Icons.devices_outlined),
            title: const Text('Thiết bị đăng nhập'),
            subtitle: const Text('Xem và đăng xuất từ xa các máy đang đăng nhập.'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.devices),
          ),

          const Divider(),
          const _SectionHeader('Tài khoản'),
          ListTile(
            leading: Icon(Icons.delete_forever_outlined,
                color: Theme.of(context).colorScheme.error),
            title: Text('Xoá tài khoản',
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
            subtitle: const Text('Xoá tài khoản app. Hồ sơ bệnh án tại bệnh viện vẫn được giữ.'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(AppRoutes.deleteAccount),
          ),
        ],
      ),
    );
  }

  Future<void> _enrollBiometric(BuildContext context, WidgetRef ref) async {
    // Bật sinh trắc là mở thêm một đường vào tài khoản, nên phải xác thực lại bằng mật khẩu —
    // nếu không, ai cầm được máy đang mở khoá cũng tự gắn vân tay của họ vào tài khoản người bệnh.
    final password = await _askPassword(context);
    if (password == null || !context.mounted) return;

    final publicKey = await ref.read(biometricServiceProvider).createKey();
    if (publicKey == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chưa tạo được khoá sinh trắc học trên thiết bị.')),
        );
      }
      return;
    }

    try {
      await ref.read(authRepositoryProvider)
          .enrollBiometric(publicKey: publicKey, password: password);
      await ref.read(authControllerProvider.notifier).reload();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã bật đăng nhập bằng sinh trắc học.')),
        );
      }
    } on Failure catch (e) {
      // Server từ chối thì xoá luôn khoá vừa tạo, tránh để lại khoá mồ côi trong Keystore.
      await ref.read(biometricServiceProvider).deleteKey();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<String?> _askPassword(BuildContext context) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận mật khẩu'),
        content: TextField(
          controller: controller,
          obscureText: true,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Mật khẩu'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Huỷ')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
      );
}
