import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../domain/appointment_models.dart';
import 'book_appointment_page.dart';

final myAppointmentsProvider = FutureProvider.autoDispose<List<Appointment>>(
  (ref) => ref.watch(appointmentRepositoryProvider).myAppointments(),
);

/// Danh sách lịch hẹn: xem, huỷ, đổi lịch (HSMT I.2 #4).
class AppointmentsPage extends ConsumerWidget {
  const AppointmentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appointments = ref.watch(myAppointmentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lịch khám của tôi')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final booked = await context.push<bool>(AppRoutes.bookAppointment);
          if (booked == true) ref.invalidate(myAppointmentsProvider);
        },
        icon: const Icon(Icons.add),
        label: const Text('Đặt khám'),
      ),
      body: appointments.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56),
                const SizedBox(height: 12),
                Text(error is Failure ? error.message : 'Không tải được lịch khám.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(myAppointmentsProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(myAppointmentsProvider),
          child: list.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    Icon(Icons.event_available_outlined, size: 56),
                    SizedBox(height: 12),
                    Center(child: Text('Bạn chưa có lịch khám nào')),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) => _AppointmentCard(
                    appointment: list[index],
                    onCancel: () => _cancel(context, ref, list[index]),
                    onReschedule: () => _reschedule(context, ref, list[index]),
                  ),
                ),
        ),
      ),
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref, Appointment appointment) async {
    final reason = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Huỷ lịch khám?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Lịch hẹn ${appointment.appointmentCode} ngày '
                '${DateFormat('dd/MM/yyyy').format(appointment.appointmentDate)} sẽ bị huỷ.'),
            const SizedBox(height: 12),
            TextField(
              controller: reason,
              decoration: const InputDecoration(labelText: 'Lý do (không bắt buộc)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Không')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Huỷ lịch')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(appointmentRepositoryProvider)
          .cancel(appointment.appointmentCode, reason: reason.text.trim());
      ref.invalidate(myAppointmentsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã huỷ lịch khám.')));
      }
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _reschedule(BuildContext context, WidgetRef ref, Appointment appointment) async {
    final newDate = await showDatePicker(
      context: context,
      initialDate: appointment.appointmentDate.isAfter(DateTime.now())
          ? appointment.appointmentDate
          : DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
      locale: const Locale('vi'),
      helpText: 'Chọn ngày khám mới',
    );
    if (newDate == null || !context.mounted) return;

    // Lấy khung giờ còn trống của ngày mới để người bệnh chọn, thay vì để họ đoán.
    SlotResult slots;
    try {
      slots = await ref.read(appointmentRepositoryProvider).slots(date: newDate);
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
      return;
    }
    if (!context.mounted) return;

    final available = [...slots.morningSlots, ...slots.afternoonSlots]
        .where((s) => s.isAvailable)
        .toList();

    if (available.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ngày này không còn khung giờ trống. Vui lòng chọn ngày khác.')),
      );
      return;
    }

    final picked = await showModalBottomSheet<TimeSlot>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const ListTile(title: Text('Chọn khung giờ mới')),
            const Divider(height: 1),
            for (final slot in available)
              ListTile(
                title: Text(slot.displayTime),
                subtitle: Text('Còn ${slot.remaining} chỗ'),
                onTap: () => Navigator.pop(context, slot),
              ),
          ],
        ),
      ),
    );
    if (picked == null || !context.mounted) return;

    try {
      await ref.read(appointmentRepositoryProvider).reschedule(
            appointment.appointmentCode,
            newDate: newDate,
            newTime: picked.startTime,
          );
      ref.invalidate(myAppointmentsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Đã đổi lịch khám.')));
      }
    } on Failure catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({
    required this.appointment,
    required this.onCancel,
    required this.onReschedule,
  });

  final Appointment appointment;
  final VoidCallback onCancel;
  final VoidCallback onReschedule;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateText = DateFormat('EEEE, dd/MM/yyyy', 'vi').format(appointment.appointmentDate);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(appointment.appointmentCode, style: theme.textTheme.titleMedium),
                ),
                Chip(
                  label: Text(appointment.statusName ?? ''),
                  visualDensity: VisualDensity.compact,
                  backgroundColor: appointment.isCancelled
                      ? theme.colorScheme.errorContainer
                      : theme.colorScheme.secondaryContainer,
                ),
              ],
            ),
            const SizedBox(height: 8),
            _row(Icons.calendar_today_outlined, dateText),
            if (appointment.appointmentTime != null)
              _row(Icons.schedule, 'Lúc ${_formatTime(appointment.appointmentTime!)}'),
            if (appointment.departmentName != null)
              _row(Icons.local_hospital_outlined, appointment.departmentName!),
            if (appointment.doctorName != null)
              _row(Icons.person_outline, 'BS ${appointment.doctorName}'),
            if (appointment.roomName != null)
              _row(Icons.meeting_room_outlined, 'Phòng ${appointment.roomName}'),

            if (appointment.canModify) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(onPressed: onCancel, child: const Text('Huỷ lịch')),
                  const SizedBox(width: 8),
                  FilledButton.tonal(
                    style: AppTheme.rowButton,
                    onPressed: onReschedule,
                    child: const Text('Đổi lịch'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            Icon(icon, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(text)),
          ],
        ),
      );

  /// Server trả "HH:mm:ss"; người bệnh chỉ cần giờ và phút.
  static String _formatTime(String raw) {
    final parts = raw.split(':');
    return parts.length >= 2 ? '${parts[0]}:${parts[1]}' : raw;
  }
}
