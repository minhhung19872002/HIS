import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../auth/domain/account.dart';
import '../../auth/presentation/auth_controller.dart';

final devicesProvider = FutureProvider.autoDispose<List<LoginDevice>>(
  (ref) => ref.watch(authRepositoryProvider).devices(),
);

/// "Quản lý tất cả thiết bị đăng nhập" — HSMT I.2 #9.
class DevicesPage extends ConsumerWidget {
  const DevicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devices = ref.watch(devicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thiết bị đăng nhập'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Đăng xuất các thiết bị khác',
            onPressed: () => _confirmRevokeOthers(context, ref),
          ),
        ],
      ),
      body: devices.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorView(
          message: error is Failure ? error.message : 'Không tải được danh sách thiết bị.',
          onRetry: () => ref.invalidate(devicesProvider),
        ),
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(devicesProvider),
          child: list.isEmpty
              ? const _EmptyView()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) =>
                      _DeviceTile(device: list[index], onRevoke: () => _revoke(context, ref, list[index])),
                ),
        ),
      ),
    );
  }

  Future<void> _revoke(BuildContext context, WidgetRef ref, LoginDevice device) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất thiết bị?'),
        content: Text(
          'Thiết bị "${device.deviceName}" sẽ bị đăng xuất ngay lập tức và phải đăng nhập lại.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Đăng xuất')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(authRepositoryProvider).revokeDevice(device.id);
      ref.invalidate(devicesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã đăng xuất thiết bị.')));
      }
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _confirmRevokeOthers(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất các thiết bị khác?'),
        content: const Text(
          'Tất cả thiết bị khác sẽ bị đăng xuất ngay. Thiết bị này vẫn giữ nguyên đăng nhập.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Đăng xuất')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(authRepositoryProvider).revokeOtherDevices();
      ref.invalidate(devicesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã đăng xuất các thiết bị khác.')));
      }
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _DeviceTile extends StatelessWidget {
  const _DeviceTile({required this.device, required this.onRevoke});

  final LoginDevice device;
  final VoidCallback onRevoke;

  String get _platformLine => [
        if (device.osVersion != null && device.osVersion!.isNotEmpty) device.osVersion!,
        if (device.appVersion != null && device.appVersion!.isNotEmpty)
          'Phiên bản ${device.appVersion}',
      ].join(' · ');

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final formatter = DateFormat('dd/MM/yyyy HH:mm');

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Icon(
          device.platform == 'ios' ? Icons.phone_iphone : Icons.phone_android,
          size: 32,
          color: device.isCurrent ? scheme.primary : null,
        ),
        title: Row(
          children: [
            Flexible(child: Text(device.deviceName, overflow: TextOverflow.ellipsis)),
            if (device.isCurrent) ...[
              const SizedBox(width: 8),
              Chip(
                label: const Text('Máy này'),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            // Chỉ dựng dòng này khi thật sự có nội dung: thiết bị cũ chưa gửi phiên bản HĐH sẽ để
            // lại một dòng trống trông như lỗi hiển thị.
            if (_platformLine.isNotEmpty) Text(_platformLine),
            Text('Hoạt động lần cuối: ${formatter.format(device.lastSeenAt)}'),
            if (device.lastIp != null) Text('Địa chỉ: ${device.lastIp}'),
            if (device.biometricEnabled)
              const Text('Đã bật đăng nhập bằng sinh trắc học'),
          ],
        ),
        isThreeLine: true,
        // Không cho tự đăng xuất chính máy đang dùng từ đây — muốn thoát thì dùng nút đăng xuất
        // ở màn tài khoản, đỡ gây hoang mang.
        trailing: device.isCurrent
            ? null
            : IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'Đăng xuất thiết bị này',
                onPressed: onRevoke,
              ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) => ListView(
        children: const [
          SizedBox(height: 80),
          Icon(Icons.devices_other, size: 56),
          SizedBox(height: 12),
          Center(child: Text('Chưa có thiết bị nào')),
        ],
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 56),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.tonal(onPressed: onRetry, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
}
