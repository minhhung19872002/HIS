import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/security/lock_gate.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/presentation/auth_controller.dart';

/// Trang chủ: thẻ bệnh nhân + các lối tắt theo HSMT I.2.
///
/// Phase 1 mới nối phần tài khoản và bảo mật. Các lối tắt còn lại hiện thông báo "sắp có" thay vì
/// mở màn trống — nói thật với người dùng tốt hơn là dẫn họ vào ngõ cụt.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final auth = ref.watch(authControllerProvider);
    final account = auth.value is AuthSignedIn ? (auth.value! as AuthSignedIn).account : null;

    final shortcuts = <_Shortcut>[
      _Shortcut(Icons.confirmation_number_outlined, l10n.shortcutQueue,
          route: AppRoutes.queue, phase: 2),
      _Shortcut(Icons.event_available_outlined, l10n.shortcutBooking,
          route: AppRoutes.appointments, phase: 2),
      _Shortcut(Icons.science_outlined, l10n.shortcutResults,
          route: AppRoutes.results, phase: 3),
      _Shortcut(Icons.medication_outlined, l10n.shortcutPrescription,
          route: AppRoutes.prescriptions, phase: 3),
      _Shortcut(Icons.local_hotel_outlined, 'Điều trị nội trú',
          route: AppRoutes.admissions, phase: 4),
      _Shortcut(Icons.folder_shared_outlined, l10n.shortcutWallet,
          route: AppRoutes.documents, phase: 5),
      _Shortcut(Icons.family_restroom_outlined, l10n.shortcutFamily,
          route: AppRoutes.family, phase: 5),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Thông báo',
            onPressed: () => context.push(AppRoutes.notifications),
          ),
          IconButton(
            icon: const Icon(Icons.shield_outlined),
            tooltip: 'Bảo mật',
            onPressed: () => context.push(AppRoutes.security),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Đăng xuất',
            onPressed: () => _confirmLogout(context, ref),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const DeviceIntegrityBanner(),
          if (account != null) _PatientCard(name: account.fullName,
              phoneNumber: account.phoneNumber,
              patientCode: account.patientCode,
              isLinked: account.isLinked),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.3,
            children: [
              for (final shortcut in shortcuts)
                _ShortcutTile(
                  shortcut: shortcut,
                  onTap: shortcut.route != null
                      ? () => context.push(shortcut.route!)
                      : () => ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('"${shortcut.label}" sẽ có ở giai đoạn tới.')),
                          ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ cần đăng nhập lại để xem kết quả khám.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Đăng xuất')),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }
}

class _Shortcut {
  const _Shortcut(this.icon, this.label, {this.route, required this.phase});
  final IconData icon;
  final String label;

  /// Đường tới màn hình. null = chưa làm xong, còn ở giai đoạn sau.
  final String? route;

  /// Giai đoạn hoàn thiện lối tắt này (theo docs/features/patient-app/README.md §5).
  final int phase;
}

class _PatientCard extends StatelessWidget {
  const _PatientCard({
    required this.name,
    required this.phoneNumber,
    required this.patientCode,
    required this.isLinked,
  });

  final String name;
  final String phoneNumber;
  final String? patientCode;
  final bool isLinked;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  child: Text(name.isNotEmpty ? name.characters.first.toUpperCase() : '?'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: theme.textTheme.titleMedium),
                      Text(phoneNumber, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (isLinked && patientCode != null)
              Row(
                children: [
                  const Icon(Icons.badge_outlined, size: 18),
                  const SizedBox(width: 8),
                  // Expanded chứ không để Text tự do: mã bệnh nhân dài hoặc màn hẹp sẽ làm
                  // hàng tràn ra ngoài.
                  Expanded(child: Text('Mã bệnh nhân: $patientCode')),
                ],
              )
            else
              // Nói rõ vì sao chưa xem được kết quả, thay vì để người dùng bấm vào rồi thấy trống.
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, size: 18, color: theme.colorScheme.tertiary),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Tài khoản chưa liên kết hồ sơ bệnh án. Vui lòng liên hệ quầy tiếp đón '
                      'để xem được kết quả khám.',
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  const _ShortcutTile({required this.shortcut, required this.onTap});

  final _Shortcut shortcut;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(shortcut.icon, size: 36),
              const SizedBox(height: 8),
              Text(shortcut.label, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
