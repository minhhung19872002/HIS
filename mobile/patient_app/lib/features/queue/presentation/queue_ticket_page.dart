import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/error/failure.dart';
import '../domain/queue_models.dart';
import 'queue_page.dart';

/// Theo dõi số thứ tự đã lấy: đang gọi số nào, còn bao nhiêu người, ước tính bao nhiêu phút.
///
/// Tự hỏi lại máy chủ mỗi 20 giây. HIS chưa có kênh realtime cho hàng đợi (khảo sát §11.4 GAP 16)
/// nên hỏi lại định kỳ là cách trung thực nhất hiện có — và endpoint trạng thái vé được làm riêng
/// cho việc này nên rất nhẹ.
class QueueTicketPage extends ConsumerStatefulWidget {
  const QueueTicketPage({super.key, required this.ticketId, this.initialMessage});

  final String ticketId;

  /// Thông điệp máy chủ trả lúc cấp số, ví dụ nhắc mang giấy tờ chứng minh diện ưu tiên.
  final String? initialMessage;

  @override
  ConsumerState<QueueTicketPage> createState() => _QueueTicketPageState();
}

class _QueueTicketPageState extends ConsumerState<QueueTicketPage> {
  static const _refreshInterval = Duration(seconds: 20);

  QueueTicketStatus? _status;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(_refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final status = await ref.read(queueRepositoryProvider).ticketStatus(widget.ticketId);
      if (!mounted) return;
      setState(() {
        _status = status;
        _error = null;
      });

      // Xong rồi thì thôi hỏi nữa — để tiếp cũng chỉ tốn pin và dữ liệu của người bệnh.
      if (status.isFinished) _timer?.cancel();
    } on Failure catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _status;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Số thứ tự của bạn'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Cập nhật',
            onPressed: _refresh,
          ),
        ],
      ),
      body: status == null
          ? Center(
              child: _error != null
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.cloud_off, size: 56),
                          const SizedBox(height: 12),
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          FilledButton.tonal(onPressed: _refresh, child: const Text('Thử lại')),
                        ],
                      ),
                    )
                  : const CircularProgressIndicator(),
            )
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (widget.initialMessage != null) ...[
                    _InfoBanner(message: widget.initialMessage!),
                    const SizedBox(height: 16),
                  ],

                  Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                      child: Column(
                        children: [
                          Text('Số của bạn', style: theme.textTheme.titleMedium),
                          const SizedBox(height: 8),
                          Text(
                            status.ticketCode,
                            style: theme.textTheme.displayMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(status.roomName, style: theme.textTheme.bodyLarge),
                          const SizedBox(height: 16),

                          // Mã QR để quầy quét khi check-in, khỏi đọc số bằng miệng.
                          QrImageView(
                            data: status.ticketCode,
                            size: 160,
                            backgroundColor: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (status.isCalled)
                    _InfoBanner(
                      message: 'Đã tới lượt bạn. Vui lòng vào ${status.roomName}.',
                      emphasise: true,
                    )
                  else if (status.isFinished)
                    _InfoBanner(message: 'Lượt khám này đã kết thúc.')
                  else
                    Card(
                      margin: EdgeInsets.zero,
                      child: Column(
                        children: [
                          _StatRow(
                            icon: Icons.campaign_outlined,
                            label: 'Đang gọi số',
                            value: status.currentServingTicket ?? 'Chưa gọi số nào',
                          ),
                          const Divider(height: 1),
                          _StatRow(
                            icon: Icons.people_outline,
                            label: 'Còn chờ trước bạn',
                            value: '${status.peopleAhead} người',
                          ),
                          const Divider(height: 1),
                          _StatRow(
                            icon: Icons.schedule,
                            label: 'Dự kiến còn khoảng',
                            value: '${status.estimatedWaitMinutes} phút',
                          ),
                        ],
                      ),
                    ),

                  if (!status.priorityVerified && status.priority > 0) ...[
                    const SizedBox(height: 16),
                    _InfoBanner(
                      message: 'Số ưu tiên của bạn cần được xác minh. Vui lòng mang theo giấy tờ '
                          'chứng minh diện ưu tiên khi được gọi.',
                    ),
                  ],

                  const SizedBox(height: 16),
                  Text(
                    'Màn hình tự cập nhật mỗi ${_refreshInterval.inSeconds} giây.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon),
        title: Text(label),
        trailing: Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
      );
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.message, this.emphasise = false});

  final String message;
  final bool emphasise;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = emphasise ? scheme.primaryContainer : scheme.secondaryContainer;
    final foreground = emphasise ? scheme.onPrimaryContainer : scheme.onSecondaryContainer;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(8)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(emphasise ? Icons.notifications_active : Icons.info_outline, color: foreground),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: foreground,
                fontWeight: emphasise ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
