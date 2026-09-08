import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/app_router.dart';
import '../data/queue_repository.dart';
import '../domain/queue_models.dart';

final queueRepositoryProvider = Provider<QueueRepository>(
  (ref) => QueueRepository(ref.watch(apiClientProvider)),
);

final clinicRoomsProvider = FutureProvider.autoDispose<List<ClinicRoom>>(
  (ref) => ref.watch(queueRepositoryProvider).rooms(),
);

final myTicketsTodayProvider = FutureProvider.autoDispose<List<IssuedTicket>>(
  (ref) => ref.watch(queueRepositoryProvider).myTickets(),
);

/// Lấy số thứ tự ngoại trú — HSMT I.2 #3.
class QueuePage extends ConsumerStatefulWidget {
  const QueuePage({super.key});

  @override
  ConsumerState<QueuePage> createState() => _QueuePageState();
}

class _QueuePageState extends ConsumerState<QueuePage> {
  ClinicRoom? _selectedRoom;
  PriorityReason? _priorityReason;
  bool _busy = false;
  String? _error;

  Future<void> _takeNumber() async {
    if (_selectedRoom == null) {
      setState(() => _error = 'Vui lòng chọn phòng khám.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final result = await ref.read(queueRepositoryProvider).takeNumber(
            roomId: _selectedRoom!.roomId,
            priorityReason: _priorityReason,
          );

      if (!mounted) return;
      // Sang thẳng màn theo dõi số: người bệnh cần biết còn bao nhiêu người, không chỉ cần con số.
      context.pushReplacement(
        '${AppRoutes.queueTicket}/${result.ticket.id}',
        extra: result.message,
      );
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rooms = ref.watch(clinicRoomsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lấy số thứ tự')),
      body: rooms.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorView(
          message: error is Failure ? error.message : 'Không tải được danh sách phòng khám.',
          onRetry: () => ref.invalidate(clinicRoomsProvider),
        ),
        data: (list) => list.isEmpty
            ? const _EmptyView(message: 'Hiện chưa có phòng khám nào đang mở.')
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildMyTickets(context),
                  Text('Chọn phòng khám', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final room in list)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: RadioListTile<String>(
                        value: room.roomId,
                        groupValue: _selectedRoom?.roomId,
                        onChanged: _busy ? null : (_) => setState(() => _selectedRoom = room),
                        title: Text(room.roomName),
                        subtitle: Text([
                          if (room.departmentName != null) room.departmentName!,
                          if (room.doctorName != null) 'BS ${room.doctorName}',
                          'đang chờ: ${room.waitingCount} người',
                        ].join(' · ')),
                      ),
                    ),

                  const SizedBox(height: 16),
                  Text('Diện ưu tiên', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  // Nói trước cho người bệnh biết máy chủ sẽ đối chiếu, để không ai khai bừa rồi
                  // ngạc nhiên khi bị từ chối tại quầy.
                  Text(
                    'Bệnh viện đối chiếu tuổi theo hồ sơ. Các diện khác cần xuất trình giấy tờ '
                    'tại quầy khi được gọi.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),

                  Card(
                    margin: EdgeInsets.zero,
                    child: Column(
                      children: [
                        RadioListTile<PriorityReason?>(
                          value: null,
                          groupValue: _priorityReason,
                          onChanged: _busy ? null : (v) => setState(() => _priorityReason = v),
                          title: const Text('Không thuộc diện ưu tiên'),
                        ),
                        for (final reason in PriorityReason.values)
                          RadioListTile<PriorityReason?>(
                            value: reason,
                            groupValue: _priorityReason,
                            onChanged: _busy ? null : (v) => setState(() => _priorityReason = v),
                            title: Text(reason.label),
                          ),
                      ],
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    _ErrorBanner(message: _error!),
                  ],

                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _takeNumber,
                    child: _busy
                        ? const SizedBox(
                            height: 20, width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Lấy số thứ tự'),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
      ),
    );
  }

  /// Số đã lấy hôm nay hiện lên đầu màn: mở lại app là thấy ngay, khỏi đi xin số mới.
  Widget _buildMyTickets(BuildContext context) {
    final tickets = ref.watch(myTicketsTodayProvider).valueOrNull;
    if (tickets == null || tickets.isEmpty) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Số của bạn hôm nay', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final ticket in tickets)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            color: scheme.primaryContainer,
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: scheme.primary,
                child: Text(
                  ticket.ticketCode,
                  style: TextStyle(color: scheme.onPrimary, fontSize: 11),
                ),
              ),
              title: Text(ticket.roomName ?? 'Phòng khám'),
              subtitle: Text(ticket.isPriority
                  ? (ticket.priorityVerified
                      ? 'Số ưu tiên'
                      : 'Số ưu tiên · cần xuất trình giấy tờ tại quầy')
                  : 'Số thường'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('${AppRoutes.queueTicket}/${ticket.id}'),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: TextStyle(color: scheme.onErrorContainer))),
        ],
      ),
    );
  }
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

class _EmptyView extends StatelessWidget {
  const _EmptyView({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.meeting_room_outlined, size: 56),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
            ],
          ),
        ),
      );
}
