import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/providers.dart';
import '../data/app_config_repository.dart';

final appConfigRepositoryProvider = Provider<AppConfigRepository>(
  (ref) => AppConfigRepository(ref.watch(apiClientProvider)),
);

/// Cấu hình phát hành, đọc một lần lúc mở app (HSMT I.2 #1).
final remoteAppConfigProvider = FutureProvider<RemoteAppConfig>((ref) async {
  final info = await PackageInfo.fromPlatform();
  try {
    return await ref.watch(appConfigRepositoryProvider).fetch(
          platform: Platform.isIOS ? 'ios' : 'android',
          version: info.version,
        );
  } on Exception {
    // Không gọi được máy chủ thì không chặn ai: xem chú thích ở `RemoteAppConfig.unknown`.
    return RemoteAppConfig.unknown;
  }
});

/// Chặn toàn app khi bản đang chạy quá cũ, và hiện thông báo bảo trì nếu bệnh viện có đặt.
///
/// Đặt bên trong `LockGate` (tức là phủ lên mọi màn) vì một bản app hỏng có thể hỏng ngay ở màn đăng
/// nhập — chặn sau khi đăng nhập là chặn muộn.
class UpdateGate extends ConsumerWidget {
  const UpdateGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(remoteAppConfigProvider).valueOrNull;

    if (config == null || !config.updateRequired) return child;

    return _ForceUpdateScreen(config: config);
  }
}

class _ForceUpdateScreen extends StatelessWidget {
  const _ForceUpdateScreen({required this.config});
  final RemoteAppConfig config;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Material(
        color: theme.colorScheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.system_update, size: 64, color: theme.colorScheme.primary),
                const SizedBox(height: 16),
                Text('Cần cập nhật ứng dụng', style: theme.textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  'Phiên bản bạn đang dùng đã cũ và có thể hiển thị thông tin không chính xác. '
                  'Vui lòng cập nhật để tiếp tục.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),

                if (config.hasMaintenanceMessage) ...[
                  const SizedBox(height: 16),
                  Text(config.maintenanceMessage!, textAlign: TextAlign.center),
                ],

                const SizedBox(height: 24),
                if (config.storeUrl.isNotEmpty)
                  FilledButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(config.storeUrl),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.open_in_new),
                    label: Text(Platform.isIOS ? 'Mở App Store' : 'Mở Google Play'),
                  ),

                if (config.supportPhone?.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  // Người bệnh lớn tuổi có thể không tự cập nhật được. Cho họ một số để gọi thay vì
                  // để họ mắc kẹt trước một màn hình không bấm được gì.
                  TextButton.icon(
                    onPressed: () => launchUrl(Uri.parse('tel:${config.supportPhone}')),
                    icon: const Icon(Icons.phone_outlined),
                    label: Text('Gọi hỗ trợ ${config.supportPhone}'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Dải nhắc "có bản mới" ở trang chủ — không chặn, chỉ mời.
class UpdateAvailableBanner extends ConsumerWidget {
  const UpdateAvailableBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(remoteAppConfigProvider).valueOrNull;
    if (config == null || !config.updateAvailable || config.updateRequired) {
      return const SizedBox.shrink();
    }

    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.system_update_alt, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text('Đã có phiên bản ${config.latestVersion}')),
          if (config.storeUrl.isNotEmpty)
            TextButton(
              onPressed: () => launchUrl(
                Uri.parse(config.storeUrl),
                mode: LaunchMode.externalApplication,
              ),
              child: const Text('Cập nhật'),
            ),
        ],
      ),
    );
  }
}
