import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/error/failure.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
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
///
/// Bố cục theo khối `isBooking` của bản prototype: thẻ bác sĩ gradient, dải ngày, lưới giờ 3 cột,
/// thanh đáy "Đã chọn … / Xác nhận".
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

  /// Ngày đầu của dải 5 ngày đang hiện. Mặc định là mai — hôm nay thì đa số khung giờ đã trôi qua.
  late DateTime _stripStart = DateTime.now().add(const Duration(days: 1));

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
      setState(() {
        _date = picked;
        // Kéo dải ngày về quanh ngày vừa chọn, nếu không người bệnh chọn xong lại không thấy ngày
        // đó đâu trên dải.
        _stripStart = picked;
      });
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

  /// Bước đang ở: 0 chưa chọn khoa · 1 đã chọn khoa · 2 đã chọn ngày · 3 đã chọn giờ.
  int get _step {
    if (_department == null) return 0;
    if (_slot == null) return _slots == null ? 1 : 2;
    return 3;
  }

  @override
  Widget build(BuildContext context) {
    final departments = ref.watch(bookingDepartmentsProvider);
    final doctors = ref.watch(bookingDoctorsProvider(_department?.id));

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Đặt lịch khám',
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
            Text('Chọn ngày và giờ khám',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(13),
          child: Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(AppSpacing.screen, 0, AppSpacing.screen, 12),
            child: _StepBar(step: _step),
          ),
        ),
      ),
      body: departments.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppErrorState(
          error: error,
          fallbackMessage: 'Không tải được danh sách chuyên khoa.',
          onRetry: () => ref.invalidate(bookingDepartmentsProvider),
        ),
        data: (list) => Column(
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
                  _DoctorCard(
                    department: _department,
                    doctor: _doctor,
                    departments: list,
                    doctors: doctors.valueOrNull ?? const [],
                    enabled: !_busy,
                    onDepartment: (value) {
                      setState(() {
                        _department = value;
                        _doctor = null;
                        _slots = null;
                        _slot = null;
                      });
                      _loadSlots();
                    },
                    onDoctor: (value) {
                      setState(() {
                        _doctor = value;
                        _slot = null;
                      });
                      _loadSlots();
                    },
                  ),
                  const SizedBox(height: AppSpacing.block),

                  Row(
                    children: [
                      Expanded(
                        child: AppSectionTitle(
                          DateFormat("'Tháng' M, yyyy", 'vi').format(_stripStart),
                          padding: EdgeInsets.zero,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _busy ? null : _pickDate,
                        icon: const Icon(Icons.calendar_today_outlined, size: 16),
                        label: const Text('Ngày khác'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _DateStrip(
                    start: _stripStart,
                    selected: _date,
                    enabled: !_busy,
                    onPick: (day) {
                      setState(() => _date = day);
                      _loadSlots();
                    },
                    onShiftWeek: (delta) => setState(
                      () => _stripStart = _stripStart.add(Duration(days: delta)),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.block),

                  const AppSectionTitle('Giờ còn trống'),
                  _SlotGrid(
                    department: _department,
                    slots: _slots,
                    selected: _slot,
                    loading: _loadingSlots,
                    doctorPicked: _doctor != null,
                    enabled: !_busy,
                    onPick: (slot) => setState(() {
                      _slot = slot;
                      _error = null;
                    }),
                  ),
                  const SizedBox(height: AppSpacing.block),

                  TextField(
                    controller: _reason,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Lý do khám (không bắt buộc)',
                      prefixIcon: Icon(Icons.notes_outlined),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.block),

                  const _ArriveEarlyNote(),

                  if (_error != null) ...[
                    const SizedBox(height: AppSpacing.block),
                    _ErrorBox(message: _error!),
                  ],
                ],
              ),
            ),
            _ConfirmBar(
              summary: _summary,
              ready: _slot != null && _department != null,
              busy: _busy,
              onConfirm: _submit,
            ),
          ],
        ),
      ),
    );
  }

  String get _summary {
    if (_department == null) return 'Chưa chọn chuyên khoa';
    if (_slot == null) return 'Chưa chọn giờ khám';
    return '${DateFormat('EEEE, dd/MM', 'vi').format(_date)} · ${_slot!.displayTime}';
  }
}

/// Ba vạch tiến trình: khoa → ngày → giờ.
///
/// Bản prototype không vẽ vạch này. Thêm vào vì màn có bốn thứ phải chọn mà không thứ nào nhìn ra
/// là đã xong hay chưa; ba vạch cho biết còn thiếu bước nào, và nó ngắn hơn một dòng chữ hướng dẫn.
class _StepBar extends StatelessWidget {
  const _StepBar({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Bước $step trên 3',
      child: Row(
        children: [
          for (var i = 1; i <= 3; i++) ...[
            if (i > 1) const SizedBox(width: 6),
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                height: 4,
                decoration: BoxDecoration(
                  color: step >= i ? AppColors.primaryAction : AppColors.border,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Thẻ gradient chọn chuyên khoa và bác sĩ.
class _DoctorCard extends StatelessWidget {
  const _DoctorCard({
    required this.department,
    required this.doctor,
    required this.departments,
    required this.doctors,
    required this.enabled,
    required this.onDepartment,
    required this.onDoctor,
  });

  final Department? department;
  final Doctor? doctor;
  final List<Department> departments;
  final List<Doctor> doctors;
  final bool enabled;
  final ValueChanged<Department?> onDepartment;
  final ValueChanged<Doctor?> onDoctor;

  @override
  Widget build(BuildContext context) {
    final initials = doctor == null
        ? 'BS'
        : doctor!.fullName
            .trim()
            .split(RegExp(r'\s+'))
            .where((w) => w.isNotEmpty)
            .map((w) => w.characters.first)
            .take(2)
            .join()
            .toUpperCase();

    return AppCard(
      gradient: AppGradients.doctorCard,
      radius: 24,
      padding: const EdgeInsets.all(AppSpacing.card),
      shadows: AppShadows.primaryGlow,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadii.button),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
                ),
                child: Text(
                  initials,
                  style: const TextStyle(
                    fontFamily: AppFonts.display,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doctor?.displayName ?? 'Bệnh viện sắp xếp bác sĩ',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      department?.name ?? 'Chưa chọn chuyên khoa',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: AppColors.tintMid),
                    ),
                    if (doctor?.specialty != null && doctor!.specialty!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(AppRadii.pill),
                        ),
                        child: Text(
                          doctor!.specialty!,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Hai ô chọn đặt TRONG thẻ, trên nền kính mờ: chọn khoa và bác sĩ là cùng một việc
          // ("khám ở đâu, với ai"), tách ra hai khối rời làm màn dài thêm mà không rõ hơn.
          _GlassDropdown<Department>(
            hint: 'Chuyên khoa',
            value: department,
            items: [
              for (final d in departments) DropdownMenuItem(value: d, child: Text(d.name)),
            ],
            onChanged: enabled ? onDepartment : null,
          ),
          const SizedBox(height: 10),
          _GlassDropdown<Doctor?>(
            hint: 'Bác sĩ (không bắt buộc)',
            value: doctor,
            items: [
              const DropdownMenuItem<Doctor?>(value: null, child: Text('Bệnh viện sắp xếp')),
              for (final d in doctors)
                DropdownMenuItem(value: d, child: Text(d.displayName)),
            ],
            onChanged: enabled ? onDoctor : null,
          ),
        ],
      ),
    );
  }
}

/// Ô sổ xuống trên nền gradient — chữ trắng, nền kính mờ.
class _GlassDropdown<T> extends StatelessWidget {
  const _GlassDropdown({
    required this.hint,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String hint;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(AppRadii.field),
        border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButtonFormField<T>(
          value: value,
          isExpanded: true,
          decoration: const InputDecoration(
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            contentPadding: EdgeInsets.symmetric(vertical: 12),
          ),
          hint: Text(hint, style: const TextStyle(fontSize: 14, color: AppColors.tintMid)),
          icon: const Icon(Icons.expand_more_rounded, color: Colors.white),
          dropdownColor: AppColors.surface,
          // Chữ trong DANH SÁCH đổ xuống nằm trên nền trắng nên phải màu tối; chỉ chữ hiện trên
          // thẻ mới màu trắng — `selectedItemBuilder` tách được hai chỗ đó.
          style: const TextStyle(
            fontFamily: AppFonts.body,
            fontSize: 15,
            color: AppColors.textPrimary,
          ),
          selectedItemBuilder: (context) => [
            for (final item in items)
              Align(
                alignment: Alignment.centerLeft,
                child: DefaultTextStyle.merge(
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                  child: item.child,
                ),
              ),
          ],
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// Dải 5 ngày, kèm nút lùi/tới tuần.
class _DateStrip extends StatelessWidget {
  const _DateStrip({
    required this.start,
    required this.selected,
    required this.enabled,
    required this.onPick,
    required this.onShiftWeek,
  });

  final DateTime start;
  final DateTime selected;
  final bool enabled;
  final ValueChanged<DateTime> onPick;
  final ValueChanged<int> onShiftWeek;

  static const _weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  static DateTime _dayOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  @override
  Widget build(BuildContext context) {
    final today = _dayOnly(DateTime.now());
    final canGoBack = _dayOnly(start).isAfter(today);

    return Row(
      children: [
        _StripArrow(
          icon: Icons.chevron_left_rounded,
          tooltip: '5 ngày trước',
          onTap: enabled && canGoBack ? () => onShiftWeek(-5) : null,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Row(
            children: [
              for (var i = 0; i < 5; i++) ...[
                if (i > 0) const SizedBox(width: 9),
                Expanded(child: _dayCell(start.add(Duration(days: i)), today)),
              ],
            ],
          ),
        ),
        const SizedBox(width: 6),
        _StripArrow(
          icon: Icons.chevron_right_rounded,
          tooltip: '5 ngày sau',
          onTap: enabled ? () => onShiftWeek(5) : null,
        ),
      ],
    );
  }

  Widget _dayCell(DateTime day, DateTime today) {
    final d = _dayOnly(day);
    final isSelected = d == _dayOnly(selected);
    // Ngày đã qua vẫn HIỆN nhưng mờ và không bấm được — bỏ hẳn thì dải ngày nhảy chỗ mỗi lần lùi
    // tuần và người dùng mất phương hướng.
    final closed = d.isBefore(today);

    return Opacity(
      opacity: closed ? 0.5 : 1,
      child: Semantics(
        selected: isSelected,
        button: !closed,
        label: DateFormat('EEEE dd/MM', 'vi').format(day),
        child: Material(
          color: isSelected ? AppColors.navy : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.button),
          child: InkWell(
            onTap: enabled && !closed ? () => onPick(day) : null,
            borderRadius: BorderRadius.circular(AppRadii.button),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadii.button),
                border: Border.all(
                  color: isSelected ? AppColors.navy : AppColors.border,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    _weekdays[day.weekday - 1],
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.accent : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${day.day}',
                    style: TextStyle(
                      fontFamily: AppFonts.display,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StripArrow extends StatelessWidget {
  const _StripArrow({required this.icon, required this.tooltip, required this.onTap});

  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon),
        iconSize: 22,
        color: AppColors.textSecondary,
        constraints: const BoxConstraints(
          minWidth: AppSpacing.minTouchTarget,
          minHeight: AppSpacing.minTouchTarget,
        ),
        padding: EdgeInsets.zero,
      ),
    );
  }
}

/// Lưới giờ 3 cột.
class _SlotGrid extends StatelessWidget {
  const _SlotGrid({
    required this.department,
    required this.slots,
    required this.selected,
    required this.loading,
    required this.doctorPicked,
    required this.enabled,
    required this.onPick,
  });

  final Department? department;
  final SlotResult? slots;
  final TimeSlot? selected;
  final bool loading;
  final bool doctorPicked;
  final bool enabled;
  final ValueChanged<TimeSlot> onPick;

  @override
  Widget build(BuildContext context) {
    if (department == null) {
      return const _HintBox(message: 'Chọn chuyên khoa để xem khung giờ.');
    }
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final result = slots;
    if (result == null) return const SizedBox.shrink();

    if (result.isEmpty) {
      // Nói rõ vì sao trống, thay vì để người bệnh nhìn lưới rỗng và tưởng app hỏng.
      return _HintBox(
        icon: Icons.event_busy,
        message: doctorPicked
            ? 'Bác sĩ không có lịch trực ngày này. Vui lòng chọn ngày hoặc bác sĩ khác.'
            : 'Ngày này chuyên khoa không có lịch khám. Vui lòng chọn ngày khác.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (result.morningSlots.isNotEmpty) ...[
          const _SlotGroupLabel('Buổi sáng'),
          _grid(result.morningSlots),
        ],
        if (result.afternoonSlots.isNotEmpty) ...[
          if (result.morningSlots.isNotEmpty) const SizedBox(height: 16),
          const _SlotGroupLabel('Buổi chiều'),
          _grid(result.afternoonSlots),
        ],
      ],
    );
  }

  /// Lưới 3 cột dựng bằng `Row`, KHÔNG dùng `GridView`.
  ///
  /// `GridView` dù đặt `NeverScrollableScrollPhysics` vẫn tạo ra một `Scrollable` lồng bên trong
  /// `ListView` của màn. Hệ quả không thấy ngay nhưng có thật: `Scrollable.of` bắt vào cái lưới
  /// không cuộn được đó, nên `ensureVisible` — thứ mà cả trình đọc màn hình lẫn bàn phím ngoài
  /// dùng để kéo phần tử vào tầm nhìn — không cuộn được gì cả, và ô giờ nằm dưới nếp gấp thành ra
  /// không chạm tới được.
  Widget _grid(List<TimeSlot> list) {
    const columns = 3;
    final rows = <Widget>[];

    for (var i = 0; i < list.length; i += columns) {
      final chunk = list.skip(i).take(columns).toList();
      rows.add(Row(
        children: [
          for (var c = 0; c < columns; c++) ...[
            if (c > 0) const SizedBox(width: 10),
            Expanded(
              child: c < chunk.length
                  ? SizedBox(
                      height: 48,
                      child: _SlotCell(
                        slot: chunk[c],
                        selected: selected?.startTime == chunk[c].startTime,
                        onTap: enabled && chunk[c].isAvailable
                            ? () => onPick(chunk[c])
                            : null,
                      ),
                    )
                  // Ô trống giữ chỗ để hàng cuối không bị kéo giãn ra.
                  : const SizedBox(height: 48),
            ),
          ],
        ],
      ));
      if (i + columns < list.length) rows.add(const SizedBox(height: 10));
    }

    return Column(children: rows);
  }
}

class _SlotGroupLabel extends StatelessWidget {
  const _SlotGroupLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textSecondary,
          ),
        ),
      );
}

class _SlotCell extends StatelessWidget {
  const _SlotCell({required this.slot, required this.selected, required this.onTap});

  final TimeSlot slot;
  final bool selected;
  final VoidCallback? onTap;

  /// Giờ bắt đầu dạng "HH:mm".
  ///
  /// Máy chủ trả `startTime` kiểu "13:30:00" và `displayTime` có thể là cả khoảng
  /// ("13:30 - 14:00"). Ô giờ chỉ đủ chỗ cho giờ bắt đầu.
  String get _startHhmm {
    final parts = slot.startTime.split(':');
    if (parts.length >= 2) return '${parts[0]}:${parts[1]}';
    // Không đọc được `startTime` thì lấy tạm phần đầu của `displayTime`.
    return slot.displayTime.split(RegExp(r'\s*-\s*')).first.trim();
  }

  @override
  Widget build(BuildContext context) {
    final full = !slot.isAvailable;

    return Semantics(
      selected: selected,
      button: !full,
      label: full ? '${slot.displayTime}, đã hết chỗ' : '${slot.displayTime}, còn ${slot.remaining} chỗ',
      child: Tooltip(
        message: full ? 'Đã hết chỗ' : 'Còn ${slot.remaining} chỗ',
        child: Material(
          color: selected ? Colors.transparent : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.field),
          child: Ink(
            decoration: BoxDecoration(
              gradient: selected ? AppGradients.slotSelected : null,
              color: selected ? null : (full ? AppColors.pageBackground : AppColors.surface),
              borderRadius: BorderRadius.circular(AppRadii.field),
              border: Border.all(
                color: selected ? AppColors.primaryAction : AppColors.border,
              ),
            ),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(AppRadii.field),
              child: Center(
                child: Text(
                  // CHỈ giờ bắt đầu, không phải cả khoảng "13:30 - 14:00": ô cao 48 trong lưới 3
                  // cột không đủ chỗ cho khoảng đầy đủ, chữ xuống hai dòng rồi bị cắt mất nửa
                  // dưới — nhìn ra "13:30 -" cụt lủn, không đọc được giờ kết thúc mà cũng chẳng
                  // đọc trọn giờ bắt đầu. Khoảng đầy đủ vẫn còn ở tooltip và ở nhãn trợ năng.
                  _startHhmm,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    // Gạch ngang cho khung hết chỗ: thấy được cả khi không phân biệt được màu.
                    decoration: full ? TextDecoration.lineThrough : null,
                    color: selected
                        ? Colors.white
                        : (full ? AppColors.textMuted : AppColors.textPrimary),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HintBox extends StatelessWidget {
  const _HintBox({required this.message, this.icon});

  final String message;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.tint,
        borderRadius: BorderRadius.circular(AppRadii.tile),
        border: Border.all(color: AppColors.tintStrong),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon ?? Icons.info_outline, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF1A57A8)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ArriveEarlyNote extends StatelessWidget {
  const _ArriveEarlyNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.tint,
        borderRadius: BorderRadius.circular(AppRadii.tile),
        border: Border.all(color: AppColors.tintStrong, style: BorderStyle.solid),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 18, color: AppColors.primary),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Vui lòng đến trước giờ hẹn 15 phút để làm thủ tục tại quầy tiếp đón.',
              style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF1A57A8)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
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
              message,
              style: const TextStyle(fontSize: 14, color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
  }
}

/// Thanh đáy: tóm tắt lựa chọn + nút xác nhận.
class _ConfirmBar extends StatelessWidget {
  const _ConfirmBar({
    required this.summary,
    required this.ready,
    required this.busy,
    required this.onConfirm,
  });

  final String summary;
  final bool ready;
  final bool busy;
  final VoidCallback onConfirm;

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
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Đã chọn',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    summary,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: ready ? AppColors.textPrimary : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            AppPrimaryButton(
              // "Xác nhận" chứ không "Xác nhận đặt khám": trên màn 360dp nhãn dài cộng với phần
              // tóm tắt bên trái làm tràn hàng. Ngữ cảnh đã rõ — ngay bên cạnh là dòng "Đã chọn:
              // Thứ Sáu, 12/09 · 08:00" — nên không cần nhắc lại "đặt khám".
              label: 'Xác nhận',
              icon: Icons.arrow_forward_rounded,
              loading: busy,
              // Bấm được cả khi chưa chọn đủ: nút xám câm không nói thiếu gì, còn bấm vào thì
              // nhận được câu "Vui lòng chọn khung giờ khám".
              onPressed: onConfirm,
              expand: false,
              height: 54,
            ),
          ],
        ),
      ),
    );
  }
}
