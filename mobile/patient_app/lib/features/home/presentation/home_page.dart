import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../l10n/app_localizations.dart';

/// Khung trang chủ của Phase 0 — mới có bố cục lối tắt theo HSMT I.2, chưa nối
/// dữ liệu thật. Nội dung từng lối tắt được cài đặt ở Phase 2-5.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final config = ref.watch(appConfigProvider);

    final shortcuts = <(IconData, String)>[
      (Icons.confirmation_number_outlined, l10n.shortcutQueue),
      (Icons.event_available_outlined, l10n.shortcutBooking),
      (Icons.science_outlined, l10n.shortcutResults),
      (Icons.medication_outlined, l10n.shortcutPrescription),
      (Icons.folder_shared_outlined, l10n.shortcutWallet),
      (Icons.family_restroom_outlined, l10n.shortcutFamily),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(config.appName)),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.3,
        children: [
          for (final (icon, label) in shortcuts)
            Card(
              margin: EdgeInsets.zero,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 36),
                    const SizedBox(height: 8),
                    Text(label, textAlign: TextAlign.center),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
