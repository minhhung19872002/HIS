import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error/failure.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../core/providers.dart';
import '../../auth/presentation/auth_controller.dart';

/// Những gì sẽ mất khi xoá tài khoản.
class DeletionPreview {
  const DeletionPreview({
    required this.devices,
    required this.documents,
    required this.familyLinks,
    required this.notifications,
  });

  final int devices;
  final int documents;
  final int familyLinks;
  final int notifications;

  factory DeletionPreview.fromJson(Map<String, dynamic> json) => DeletionPreview(
        devices: json['devices'] as int? ?? 0,
        documents: json['documents'] as int? ?? 0,
        familyLinks: json['familyLinks'] as int? ?? 0,
        notifications: json['notifications'] as int? ?? 0,
      );
}

final deletionPreviewProvider = FutureProvider.autoDispose<DeletionPreview>((ref) async {
  try {
    final response = await ref
        .watch(apiClientProvider)
        .get<Map<String, dynamic>>('/patient/account/deletion-preview');
    return DeletionPreview.fromJson(response.data?['data'] as Map<String, dynamic>? ?? const {});
  } on DioException catch (e) {
    throw mapDioError(e);
  }
});

/// Xoá tài khoản app.
///
/// Bắt buộc phải có để phát hành lên App Store và Google Play. Màn này nói thật về ranh giới: cái bị
/// xoá là **đường vào**, không phải hồ sơ bệnh án — hồ sơ bệnh án do luật lưu trữ y tế quy định thời
/// hạn, bệnh viện không được xoá theo yêu cầu cá nhân. Nói mập mờ chỗ này là hứa một điều không làm
/// được.
class DeleteAccountPage extends ConsumerStatefulWidget {
  const DeleteAccountPage({super.key});

  @override
  ConsumerState<DeleteAccountPage> createState() => _DeleteAccountPageState();
}

class _DeleteAccountPageState extends ConsumerState<DeleteAccountPage> {
  final _password = TextEditingController();
  bool _busy = false;
  bool _understood = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xoá tài khoản?'),
        content: const Text(
          'Sau khi xoá, bạn sẽ không đăng nhập được nữa và phải đăng ký lại từ đầu nếu muốn dùng '
          'lại ứng dụng. Thao tác này không hoàn tác được.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Không xoá')),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xoá tài khoản'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(apiClientProvider).delete<Map<String, dynamic>>(
            '/patient/account',
            data: {'password': _password.text},
          );

      // Xoá phiên tại máy rồi để router tự đưa về màn đăng nhập.
      await ref.read(authControllerProvider.notifier).logout();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xoá tài khoản.')),
        );
      }
    } on DioException catch (e) {
      final failure = mapDioError(e);
      setState(() => _error = failure.message);
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final preview = ref.watch(deletionPreviewProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Xoá tài khoản')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sẽ bị xoá vĩnh viễn',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(color: theme.colorScheme.onErrorContainer)),
                const SizedBox(height: 8),
                _Bullet('Tài khoản và mật khẩu đăng nhập'),
                if (preview != null) ...[
                  _Bullet('${preview.devices} thiết bị đang đăng nhập'),
                  _Bullet('${preview.documents} giấy tờ trong ví'),
                  _Bullet('${preview.familyLinks} kết nối gia đình'),
                  _Bullet('${preview.notifications} thông báo trong hộp thư'),
                ] else ...[
                  _Bullet('Thiết bị đã đăng nhập, giấy tờ trong ví'),
                  _Bullet('Kết nối gia đình và thông báo'),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Vẫn được giữ lại', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                const _Bullet('Hồ sơ bệnh án của bạn tại bệnh viện'),
                const _Bullet('Kết quả khám, đơn thuốc, lịch sử điều trị'),
                const SizedBox(height: 8),
                Text(
                  'Hồ sơ bệnh án được lưu theo quy định của ngành y tế và không xoá theo yêu cầu cá '
                  'nhân. Bạn vẫn tra cứu được tại quầy tiếp đón.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Nhập mật khẩu để xác nhận',
              prefixIcon: Icon(Icons.lock_outline),
            ),
          ),

          const SizedBox(height: 8),
          CheckboxListTile(
            value: _understood,
            onChanged: (v) => setState(() => _understood = v ?? false),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text('Tôi hiểu thao tác này không hoàn tác được'),
          ),

          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
          ],

          const SizedBox(height: 16),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: theme.colorScheme.error),
            onPressed: (_busy || !_understood || _password.text.isEmpty) ? null : _delete,
            child: _busy
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Xoá tài khoản của tôi'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('• '),
            Expanded(child: Text(text)),
          ],
        ),
      );
}
