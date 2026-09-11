import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../data/notification_repository.dart';
import '../data/push_registration.dart';
import '../domain/app_notification.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(apiClientProvider)),
);

final inboxProvider = FutureProvider.autoDispose<List<AppNotificationItem>>(
  (ref) => ref.watch(notificationRepositoryProvider).inbox(),
);

final unreadCountProvider = FutureProvider.autoDispose<int>(
  (ref) => ref.watch(notificationRepositoryProvider).unreadCount(),
);

/// Hộp thư thông báo (HSMT I.2 #9).
class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inbox = ref.watch(inboxProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(notificationRepositoryProvider).markAllRead();
              ref.invalidate(inboxProvider);
              ref.invalidate(unreadCountProvider);
            },
            child: const Text('Đọc tất cả'),
          ),
        ],
      ),
      body: inbox.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56),
                const SizedBox(height: 12),
                Text(
                  error is Failure ? error.message : 'Không tải được thông báo.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(inboxProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(inboxProvider);
            ref.invalidate(unreadCountProvider);
          },
          child: items.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    Icon(Icons.notifications_none, size: 56),
                    SizedBox(height: 12),
                    Center(child: Text('Chưa có thông báo nào')),
                  ],
                )
              : ListView.separated(
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) => _NotificationTile(
                    item: items[index],
                    onTap: () async {
                      final item = items[index];
                      await ref
                          .read(notificationRepositoryProvider)
                          .markRead(item.id);
                      ref.invalidate(inboxProvider);
                      ref.invalidate(unreadCountProvider);

                      // Thông báo nào cũng nói về một thứ cụ thể — kết quả vừa có, lịch vừa đổi.
                      // Đọc xong mà vẫn phải tự đi tìm thứ đó trong menu thì thông báo mới chỉ làm
                      // được một nửa việc.
                      final deepLink = item.deepLink;
                      if (deepLink == null || !PushRegistration.isInAppRoute(deepLink)) return;
                      if (context.mounted) context.push(deepLink);
                    },
                  ),
                ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final AppNotificationItem item;
  final VoidCallback onTap;

  static const _icons = <String, IconData>{
    'result': Icons.science_outlined,
    'appointment': Icons.event_available_outlined,
    'queue': Icons.confirmation_number_outlined,
    'hospital': Icons.local_hospital_outlined,
    'system': Icons.info_outline,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat('dd/MM/yyyy HH:mm');

    return ListTile(
      onTap: onTap,
      // Chưa đọc thì tô nền nhạt — dễ nhận ra hơn một dấu chấm nhỏ, nhất là với người cao tuổi.
      tileColor: item.isRead ? null : theme.colorScheme.primaryContainer.withValues(alpha: 0.25),
      leading: Icon(_icons[item.category] ?? Icons.info_outline),
      title: Text(
        item.title,
        style: TextStyle(fontWeight: item.isRead ? FontWeight.normal : FontWeight.bold),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(item.body),
          const SizedBox(height: 4),
          Text(formatter.format(item.createdAt), style: theme.textTheme.bodySmall),
        ],
      ),
      isThreeLine: true,
    );
  }
}
