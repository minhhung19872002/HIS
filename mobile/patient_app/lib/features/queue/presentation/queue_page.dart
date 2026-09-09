import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
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
///
/// Bố cục theo khối `isQueue` của bản prototype: danh sách phòng dạng thẻ chọn viền 2px, diện ưu
/// tiên dạng chip, nút lấy số dính đáy màn.
///
/// Nút dính đáy chứ không nằm cuối danh sách cuộn: người bệnh chọn phòng xong không phải cuộn đi
/// tìm nút, và luôn thấy được mình đã chọn đủ chưa.
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
      appBar: AppBar(
        title: const Text('Lấy số thứ tự'),
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: rooms.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppErrorState(
          error: error,
          fallbackMessage: 'Không tải được danh sách phòng khám.',
          onRetry: () => ref.invalidate(clinicRoomsProvider),
        ),
        data: (list) => list.isEmpty
            ? const AppEmptyState(
                message: 'Hiện chưa có phòng khám nào đang mở.',
                icon: Icons.meeting_room_outlined,
              )
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screen,
                        AppSpacing.block,
                        AppSpacing.screen,
                        AppSpacing.block,
                      ),
                      children: [
                        _MyTicketsToday(onOpen: (id) => context.push('${AppRoutes.queueTicket}/$id')),

                        const AppSectionTitle('Chọn phòng khám',
                            padding: EdgeInsets.only(bottom: 10)),
                        for (final room in list) ...[
                          _RoomOption(
                            room: room,
                            selected: _selectedRoom?.roomId == room.roomId,
                            onTap: _busy
                                ? null
                                : () => setState(() {
                                      _selectedRoom = room;
                                      _error = null;
                                    }),
                          ),
                          const SizedBox(height: 10),
                        ],

                        const SizedBox(height: 8),
                        const AppSectionTitle('Diện ưu tiên',
                            padding: EdgeInsets.only(bottom: 4)),
                        // Nói trước cho người bệnh biết máy chủ sẽ đối chiếu, để không ai khai bừa
                        // rồi ngạc nhiên khi bị từ chối tại quầy.
                        const Text(
                          'Bệnh viện đối chiếu tuổi theo hồ sơ. Các diện khác cần xuất trình '
                          'giấy tờ tại quầy khi được gọi.',
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _PriorityChips(
                          selected: _priorityReason,
                          enabled: !_busy,
                          onChanged: (value) => setState(() => _priorityReason = value),
                        ),
                      ],
                    ),
                  ),
                  _BottomBar(
                    error: _error,
                    busy: _busy,
                    enabled: _selectedRoom != null,
                    onTake: _takeNumber,
                  ),
                ],
              ),
      ),
    );
  }
}

/// Số đã lấy hôm nay hiện lên đầu màn: mở lại app là thấy ngay, khỏi đi xin số mới.
class _MyTicketsToday extends ConsumerWidget {
  const _MyTicketsToday({required this.onOpen});

  final void Function(String ticketId) onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickets = ref.watch(myTicketsTodayProvider).valueOrNull;
    if (tickets == null || tickets.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AppSectionTitle('Số của bạn hôm nay', padding: EdgeInsets.only(bottom: 10)),
        for (final ticket in tickets) ...[
          AppCard(
            gradient: AppGradients.ticketCard,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            shadows: AppShadows.primaryGlow,
            onTap: () => onOpen(ticket.id),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    gradient: AppGradients.ticketBadge,
                    shape: BoxShape.circle,
                  ),
                  // Thu nhỏ thay vì cắt: mã vé cắt cụt là mất đúng thứ cần đọc.
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        ticket.ticketCode,
                        maxLines: 1,
                        style: const TextStyle(
                          fontFamily: AppFonts.display,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.navyInk,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.roomName ?? 'Phòng khám',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        ticket.isPriority
                            ? (ticket.priorityVerified
                                ? 'Số ưu tiên'
                                : 'Số ưu tiên · cần xuất trình giấy tờ tại quầy')
                            : 'Số thường',
                        style: const TextStyle(fontSize: 13, color: AppColors.onDarkMuted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.accent),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 8),
      ],
    );
  }
}

/// Một phòng khám để chọn.
///
/// Thay `RadioListTile` bằng cả thẻ bấm được: vùng chạm rộng bằng cả thẻ thay vì chỉ nút tròn nhỏ,
/// và viền 2px cho thấy đang chọn cái nào từ xa — đọc được kể cả khi không phân biệt được màu.
class _RoomOption extends StatelessWidget {
  const _RoomOption({required this.room, required this.selected, required this.onTap});

  final ClinicRoom room;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // Đông thì đổi sang tông chờ — người bệnh liếc qua là biết phòng nào đang tắc.
    final crowded = room.waitingCount >= 10;

    return Semantics(
      selected: selected,
      button: true,
      label: '${room.roomName}, đang chờ ${room.waitingCount} người',
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        radius: AppRadii.tile,
        borderColor: selected ? AppColors.primary : AppColors.border,
        shadows: selected ? AppShadows.cardSoft : const [],
        child: Row(
          children: [
            _RadioDot(selected: selected),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    room.roomName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (room.departmentName != null || room.doctorName != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (room.departmentName != null) room.departmentName!,
                        if (room.doctorName != null) 'BS ${room.doctorName}',
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 10),
            AppStatusPill(
              'chờ ${room.waitingCount}',
              tone: crowded ? AppStatusTone.wait : AppStatusTone.ok,
            ),
          ],
        ),
      ),
    );
  }
}

/// Nút tròn tự vẽ — viền 2px, chấm đặc khi chọn.
///
/// Vẽ tay thay vì dùng `Radio`: `Radio` mang theo vùng chạm và khoảng đệm riêng của Material,
/// làm chiều cao thẻ nhảy lên và lệch với bản thiết kế.
class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: selected ? AppColors.primary : AppColors.borderSoft,
          width: 2,
        ),
      ),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        width: selected ? 12 : 0,
        height: selected ? 12 : 0,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

/// Diện ưu tiên dạng chip, cuộn ngang.
class _PriorityChips extends StatelessWidget {
  const _PriorityChips({
    required this.selected,
    required this.enabled,
    required this.onChanged,
  });

  final PriorityReason? selected;
  final bool enabled;
  final ValueChanged<PriorityReason?> onChanged;

  @override
  Widget build(BuildContext context) {
    // Wrap chứ không cuộn ngang: tên các diện ưu tiên dài, cuộn ngang thì mục cuối nằm khuất và
    // người cao tuổi thường không đoán ra là còn kéo được.
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _PriorityChip(
          label: 'Không thuộc diện ưu tiên',
          selected: selected == null,
          onTap: enabled ? () => onChanged(null) : null,
        ),
        for (final reason in PriorityReason.values)
          _PriorityChip(
            label: reason.label,
            selected: selected == reason,
            onTap: enabled ? () => onChanged(reason) : null,
          ),
      ],
    );
  }
}

class _PriorityChip extends StatelessWidget {
  const _PriorityChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? AppColors.primary : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadii.pill),
          child: Container(
            constraints: const BoxConstraints(minHeight: AppSpacing.minTouchTarget),
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadii.pill),
              border: Border.all(
                color: selected ? AppColors.primary : AppColors.border,
                width: 1.5,
              ),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Thanh đáy: lỗi (nếu có) + nút lấy số.
class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.error,
    required this.busy,
    required this.enabled,
    required this.onTake,
  });

  final String? error;
  final bool busy;
  final bool enabled;
  final VoidCallback onTake;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(AppSpacing.screen, 16, AppSpacing.screen, 16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (error != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.dangerBadgeBg,
                  borderRadius: BorderRadius.circular(AppRadii.field),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 20, color: AppColors.danger),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        error!,
                        style: const TextStyle(fontSize: 14, color: AppColors.danger),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            AppPrimaryButton(
              label: 'Lấy số thứ tự',
              icon: Icons.confirmation_number_outlined,
              loading: busy,
              // Bấm được cả khi chưa chọn phòng: nút xám câm không nói vì sao, còn bấm vào thì
              // nhận được câu "Vui lòng chọn phòng khám".
              onPressed: onTake,
              height: 56,
            ),
          ],
        ),
      ),
    );
  }
}
