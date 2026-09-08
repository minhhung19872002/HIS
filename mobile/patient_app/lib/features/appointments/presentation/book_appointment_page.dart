import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../../queue/domain/queue_models.dart';
import '../data/appointment_repository.dart';
import '../domain/appointment_models.dart';

final appointmentRepositoryProvider = Provider<AppointmentRepository>(
  (ref) => AppointmentRepository(ref.watch(apiClientProvider)),
);

final bookingDepartmentsProvider = FutureProvider.autoDispose<List<Department>>(
  (ref) => ref.watch(appointmentRepositoryProvider).departments(),
);

final bookingDoctorsProvider =
    FutureProvider.autoDispose.family<List<Doctor>, String?>(
  (ref, departmentId) =>
      ref.watch(appointmentRepositoryProvider).doctors(departmentId: departmentId),
);

/// Đặt khám online — HSMT I.2 #4.
///
/// Bốn bước theo đúng thứ tự người bệnh nghĩ: khoa → bác sĩ → ngày → giờ.
class BookAppointmentPage extends ConsumerStatefulWidget {
  const BookAppointmentPage({super.key});

  @override
  ConsumerState<BookAppointmentPage> createState() => _BookAppointmentPageState();
}

class _BookAppointmentPageState extends ConsumerState<BookAppointmentPage> {
  Department? _department;
  Doctor? _doctor;
  DateTime _date = DateTime.now().add(const Duration(days: 1));
  TimeSlot? _slot;
  final _reason = TextEditingController();

  SlotResult? _slots;
  bool _loadingSlots = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _loadSlots() async {
    if (_department == null) return;

    setState(() {
      _loadingSlots = true;
      _slot = null;
      _error = null;
    });

    try {
      final result = await ref.read(appointmentRepositoryProvider).slots(
            date: _date,
            departmentId: _department!.id,
            doctorId: _doctor?.id,
          );
      if (mounted) setState(() => _slots = result);
    } on Failure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      // Đặt trước tối đa 60 ngày; xa hơn thì lịch trực bác sĩ chưa chắc đã có.
      lastDate: DateTime.now().add(const Duration(days: 60)),
      locale: const Locale('vi'),
    );
    if (picked != null) {
      setState(() => _date = picked);
      await _loadSlots();
    }
  }

  Future<void> _submit() async {
    if (_department == null) {
      setState(() => _error = 'Vui lòng chọn chuyên khoa.');
      return;
    }
    if (_slot == null) {
      setState(() => _error = 'Vui lòng chọn khung giờ khám.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final message = await ref.read(appointmentRepositoryProvider).book(
            date: _date,
            time: _slot!.startTime,
            departmentId: _department!.id,
            doctorId: _doctor?.id,
            reason: _reason.text.trim(),
          );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message ?? 'Đã đặt lịch khám.')),
      );
      Navigator.of(context).pop(true);
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final departments = ref.watch(bookingDepartmentsProvider);
    final doctors = ref.watch(bookingDoctorsProvider(_department?.id));

    return Scaffold(
      appBar: AppBar(title: const Text('Đặt khám')),
      body: departments.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56),
                const SizedBox(height: 12),
                Text(error is Failure ? error.message : 'Không tải được danh sách chuyên khoa.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(bookingDepartmentsProvider),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
        data: (list) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<Department>(
              value: _department,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Chuyên khoa',
                prefixIcon: Icon(Icons.local_hospital_outlined),
              ),
              items: [
                for (final d in list)
                  DropdownMenuItem(value: d, child: Text(d.name, overflow: TextOverflow.ellipsis)),
              ],
              onChanged: _busy
                  ? null
                  : (value) {
                      setState(() {
                        _department = value;
                        _doctor = null;
                        _slots = null;
                        _slot = null;
                      });
                      _loadSlots();
                    },
            ),
            const SizedBox(height: 16),

            doctors.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, _) => const SizedBox.shrink(),
              data: (docs) => DropdownButtonFormField<Doctor?>(
                value: _doctor,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Bác sĩ (không bắt buộc)',
                  helperText: 'Bỏ trống để bệnh viện sắp xếp bác sĩ',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                items: [
                  const DropdownMenuItem<Doctor?>(
                    value: null,
                    child: Text('Bệnh viện sắp xếp'),
                  ),
                  for (final d in docs)
                    DropdownMenuItem(
                      value: d,
                      child: Text(d.displayName, overflow: TextOverflow.ellipsis),
                    ),
                ],
                onChanged: _busy
                    ? null
                    : (value) {
                        setState(() {
                          _doctor = value;
                          _slot = null;
                        });
                        _loadSlots();
                      },
              ),
            ),
            const SizedBox(height: 16),

            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.calendar_today_outlined),
              title: const Text('Ngày khám'),
              subtitle: Text(DateFormat('EEEE, dd/MM/yyyy', 'vi').format(_date)),
              trailing: const Icon(Icons.chevron_right),
              onTap: _busy ? null : _pickDate,
            ),
            const Divider(),

            Text('Khung giờ', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            _buildSlots(theme),

            const SizedBox(height: 16),
            TextField(
              controller: _reason,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Lý do khám (không bắt buộc)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(_error!,
                          style: TextStyle(color: theme.colorScheme.onErrorContainer)),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Xác nhận đặt khám'),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSlots(ThemeData theme) {
    if (_department == null) {
      return Text('Chọn chuyên khoa để xem khung giờ.', style: theme.textTheme.bodyMedium);
    }
    if (_loadingSlots) return const Center(child: CircularProgressIndicator());

    final slots = _slots;
    if (slots == null) return const SizedBox.shrink();

    if (slots.isEmpty) {
      // Nói rõ vì sao trống, thay vì để người bệnh nhìn lưới rỗng và tưởng app hỏng.
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.secondaryContainer,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.event_busy, color: theme.colorScheme.onSecondaryContainer),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _doctor == null
                    ? 'Ngày này chuyên khoa không có lịch khám. Vui lòng chọn ngày khác.'
                    : 'Bác sĩ không có lịch trực ngày này. Vui lòng chọn ngày hoặc bác sĩ khác.',
                style: TextStyle(color: theme.colorScheme.onSecondaryContainer),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (slots.morningSlots.isNotEmpty) ...[
          Text('Buổi sáng', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          _slotWrap(slots.morningSlots, theme),
          const SizedBox(height: 16),
        ],
        if (slots.afternoonSlots.isNotEmpty) ...[
          Text('Buổi chiều', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          _slotWrap(slots.afternoonSlots, theme),
        ],
      ],
    );
  }

  Widget _slotWrap(List<TimeSlot> slots, ThemeData theme) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final slot in slots)
            ChoiceChip(
              label: Text(slot.displayTime),
              selected: _slot?.startTime == slot.startTime,
              // Khung hết chỗ vẫn hiện nhưng không bấm được: người bệnh thấy được giờ nào đông.
              onSelected: (!slot.isAvailable || _busy)
                  ? null
                  : (_) => setState(() => _slot = slot),
              tooltip: slot.isAvailable ? 'Còn ${slot.remaining} chỗ' : 'Đã hết chỗ',
            ),
        ],
      );
}
