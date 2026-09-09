import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
import '../../family/presentation/family_page.dart';
import '../domain/result_models.dart';
import 'results_providers.dart';
import 'widgets/result_scaffolding.dart';

final _day = DateFormat('dd/MM/yyyy');

/// Kết quả khám chữa bệnh ngoại trú — HSMT I.2 #5.
///
/// Sáu nhóm kết quả nằm trên sáu tab thay vì một danh sách trộn lẫn: người bệnh mở app thường đã biết
/// mình đi tìm cái gì ("kết quả máu", "đơn thuốc"), và trộn chung thì thứ họ cần lại chìm giữa những
/// thứ họ không cần.
class ResultsPage extends ConsumerWidget {
  const ResultsPage({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Đang xem hộ người thân thì phải nói ra ngay trên tiêu đề. Nhìn nhầm kết quả của mẹ thành của
    // mình là kiểu nhầm lẫn nguy hiểm nhất mà app này có thể gây ra.
    final viewing = ref.watch(viewingMemberProvider);

    final relative = viewing != null;

    return DefaultTabController(
      length: 6,
      initialIndex: initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: Text(relative ? 'Kết quả của ${viewing.name}' : 'Kết quả khám'),
          // Xem hộ người thân thì đổi hẳn sang tông tím và nói thẳng đang xem hộ ai. Nhìn nhầm
          // kết quả của mẹ thành của mình là kiểu nhầm lẫn nguy hiểm nhất app này gây ra được,
          // nên tín hiệu phải mạnh: đổi màu cả thanh tiêu đề chứ không chỉ thêm một dòng nhỏ.
          backgroundColor: relative ? AppColors.relativeTint : AppColors.surface,
          foregroundColor: relative ? AppColors.relativeDeep : AppColors.textPrimary,
          surfaceTintColor: Colors.transparent,
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(relative ? 134 : 108),
            child: Container(
              color: relative ? AppColors.relativeTint : AppColors.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (relative)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screen,
                        0,
                        AppSpacing.screen,
                        8,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.people_alt_outlined,
                            size: 16,
                            color: AppColors.relative,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Đang xem hộ: ${viewing.name}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.relative,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const _MemberChips(),
                  const _ResultTabChips(),
                  const Divider(height: 1, color: AppColors.border),
                ],
              ),
            ),
          ),
        ),
        body: const TabBarView(
          children: [
            _VisitsTab(),
            _LabTab(),
            _ImagingTab(),
            _FunctionalTab(),
            _PrescriptionsTab(),
            _CheckupsTab(),
          ],
        ),
      ),
    );
  }
}

/// Chip chọn hồ sơ đang xem: "Tôi" và từng người thân đã được cho phép xem kết quả.
///
/// Đặt ngay trên đầu màn thay vì bắt quay về màn Gia đình để đổi: người chăm bố mẹ già thường
/// phải xem qua lại giữa vài hồ sơ trong cùng một lượt, và đi vòng mỗi lần là mỗi lần dễ quên
/// mình đang xem hộ ai.
///
/// Không có người thân nào thì không chiếm chỗ.
class _MemberChips extends ConsumerWidget {
  const _MemberChips();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final family = ref.watch(familyProvider).valueOrNull;
    final viewing = ref.watch(viewingMemberProvider);

    // Chỉ hiện người đã được cấp quyền xem kết quả — người chưa xác minh mà hiện ra thì chạm vào
    // chỉ nhận về màn trống.
    final members = (family?.items ?? const []).where((m) => m.canViewResults).toList();
    if (members.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen, vertical: 6),
        children: [
          _MemberChip(
            label: 'Tôi',
            initial: 'T',
            selected: viewing == null,
            onTap: () => ref.read(viewingMemberProvider.notifier).select(null),
          ),
          for (final member in members) ...[
            const SizedBox(width: 8),
            _MemberChip(
              label: member.name,
              initial: member.name.trim().isEmpty
                  ? '?'
                  : member.name.trim().characters.last.toUpperCase(),
              selected: viewing?.id == member.id,
              onTap: () => ref.read(viewingMemberProvider.notifier).select(member),
            ),
          ],
        ],
      ),
    );
  }
}

class _MemberChip extends StatelessWidget {
  const _MemberChip({
    required this.label,
    required this.initial,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String initial;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      label: selected ? 'Đang xem hồ sơ $label' : 'Xem hồ sơ $label',
      child: Material(
        color: selected ? AppColors.relative : AppColors.pageBackground,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadii.pill),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(7, 7, 14, 7),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected ? Colors.white : AppColors.relativeBg,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    initial,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: selected ? AppColors.relative : AppColors.relativeDeep,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Sáu nhóm kết quả dạng chip pill, cuộn ngang.
///
/// Vẫn chạy trên `TabController` như cũ (nên `initialTab` và `TabBarView` giữ nguyên), chỉ thay
/// lớp vẽ: `TabBar` gạch chân mảnh khó thấy nhóm nào đang mở, còn chip nền đặc thì thấy ngay.
class _ResultTabChips extends StatefulWidget {
  const _ResultTabChips();

  @override
  State<_ResultTabChips> createState() => _ResultTabChipsState();
}

class _ResultTabChipsState extends State<_ResultTabChips> {
  static const _labels = [
    'Lượt khám',
    'Xét nghiệm',
    'Hình ảnh',
    'Thăm dò CN',
    'Đơn thuốc',
    'Khám sức khoẻ',
  ];

  TabController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = DefaultTabController.of(context);
    if (identical(controller, _controller)) return;
    _controller?.removeListener(_onTabChanged);
    _controller = controller..addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _controller?.removeListener(_onTabChanged);
    super.dispose();
  }

  void _onTabChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final index = _controller?.index ?? 0;

    return SizedBox(
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screen, vertical: 8),
        itemCount: _labels.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final selected = i == index;
          return Semantics(
            selected: selected,
            button: true,
            child: Material(
              color: selected ? AppColors.primary : AppColors.pageBackground,
              borderRadius: BorderRadius.circular(AppRadii.pill),
              child: InkWell(
                onTap: () => _controller?.animateTo(i),
                borderRadius: BorderRadius.circular(AppRadii.pill),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Center(
                    child: Text(
                      _labels[i],
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: selected ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------- lượt khám

class _VisitsTab extends ConsumerWidget {
  const _VisitsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(visitFilterProvider);

    return ResultListView<Visit>(
      async: ref.watch(visitsProvider),
      onRefresh: () => ref.invalidate(visitsProvider),
      emptyMessage: 'Bạn chưa có lượt khám nào tại bệnh viện.',
      emptyIcon: Icons.event_note_outlined,
      itemBuilder: (context, visit) {
        final isSelected = selected == visit.visitId;
        return Card(
          margin: EdgeInsets.zero,
          color: isSelected ? Theme.of(context).colorScheme.primaryContainer : null,
          child: ListTile(
            leading: const Icon(Icons.medical_information_outlined),
            title: Text(
              visit.diagnosis?.isNotEmpty == true
                  ? visit.diagnosis!
                  : 'Lượt khám ${visit.visitDate == null ? '' : _day.format(visit.visitDate!)}',
            ),
            subtitle: Text(
              [
                if (visit.visitDate != null) _day.format(visit.visitDate!),
                if (visit.department?.isNotEmpty == true) visit.department!,
                if (visit.doctorName?.isNotEmpty == true) 'BS ${visit.doctorName}',
              ].join(' · '),
            ),
            trailing: Icon(isSelected ? Icons.filter_alt : Icons.filter_alt_outlined),
            // Chạm để lọc mọi tab còn lại theo đúng lần khám này; chạm lần nữa để bỏ lọc.
            onTap: () =>
                ref.read(visitFilterProvider.notifier).select(isSelected ? null : visit.visitId),
          ),
        );
      },
    );
  }
}

/// Dải nhắc "đang lọc theo một lần khám" — không có nó thì tab xét nghiệm trông như bị mất dữ liệu.
class _FilterBanner extends ConsumerWidget {
  const _FilterBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visitId = ref.watch(visitFilterProvider);
    if (visitId == null) return const SizedBox.shrink();

    final visit = ref
        .watch(visitsProvider)
        .valueOrNull
        ?.where((v) => v.visitId == visitId)
        .firstOrNull;
    final label = visit?.visitDate == null
        ? 'một lần khám'
        : 'lần khám ${_day.format(visit!.visitDate!)}';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 4, 4, 4),
        decoration: BoxDecoration(
          // Tông "đang chờ" chứ không phải tông thông tin: đây là một BỘ LỌC ĐANG BẬT, và người
          // bệnh không thấy nó thì sẽ tưởng mình chẳng có kết quả nào khác.
          color: AppColors.warningBg,
          borderRadius: BorderRadius.circular(AppRadii.field),
        ),
        child: Row(
          children: [
            const Icon(Icons.filter_alt, size: 18, color: AppColors.warning),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Đang lọc theo $label',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.warning,
                ),
              ),
            ),
            TextButton(
              onPressed: () => ref.read(visitFilterProvider.notifier).select(null),
              style: TextButton.styleFrom(foregroundColor: AppColors.warning),
              child: const Text('Bỏ lọc'),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- xét nghiệm

class _LabTab extends ConsumerWidget {
  const _LabTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<LabResult>(
      async: ref.watch(labResultsProvider),
      onRefresh: () => ref.invalidate(labResultsProvider),
      header: const _FilterBanner(),
      emptyMessage: 'Chưa có kết quả xét nghiệm nào.',
      emptyIcon: Icons.science_outlined,
      itemBuilder: (context, lab) => Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: Icon(
            lab.hasAbnormal ? Icons.warning_amber_rounded : Icons.check_circle_outline,
            color: lab.hasAbnormal ? Theme.of(context).colorScheme.error : null,
          ),
          title: Text(lab.title),
          subtitle: Text(
            [
              if (lab.resultDate != null) _day.format(lab.resultDate!),
              if (lab.orderingDoctor?.isNotEmpty == true) 'BS ${lab.orderingDoctor}',
              if (lab.hasAbnormal) 'có chỉ số ngoài khoảng bình thường',
              if (!lab.isCompleted) 'đang chờ kết quả',
            ].join(' · '),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/lab/${lab.id}'),
        ),
      ),
    );
  }
}

// -------------------------------------------------------- chẩn đoán hình ảnh

class _ImagingTab extends ConsumerWidget {
  const _ImagingTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<ImagingResult>(
      async: ref.watch(imagingResultsProvider),
      onRefresh: () => ref.invalidate(imagingResultsProvider),
      header: const _FilterBanner(),
      emptyMessage: 'Chưa có kết quả chẩn đoán hình ảnh nào.',
      emptyIcon: Icons.image_search_outlined,
      itemBuilder: (context, img) => Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: const Icon(Icons.monitor_heart_outlined),
          title: Text(img.title),
          subtitle: Text(
            [
              if (img.studyDate != null) _day.format(img.studyDate!),
              if (img.reportingDoctor?.isNotEmpty == true) 'BS ${img.reportingDoctor}',
              if (img.hasImages) '${img.imageCount} ảnh',
              if (!img.isCompleted) 'đang chờ đọc kết quả',
            ].join(' · '),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/imaging/${img.id}'),
        ),
      ),
    );
  }
}

// -------------------------------------------------------- thăm dò chức năng

class _FunctionalTab extends ConsumerWidget {
  const _FunctionalTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<FunctionalResult>(
      async: ref.watch(functionalResultsProvider),
      onRefresh: () => ref.invalidate(functionalResultsProvider),
      header: const _FilterBanner(),
      emptyMessage: 'Chưa có kết quả thăm dò chức năng nào.',
      emptyIcon: Icons.graphic_eq_outlined,
      itemBuilder: (context, test) => Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: const Icon(Icons.timeline_outlined),
          title: Text(test.testTypeName),
          subtitle: Text(
            [
              if (test.performedAt != null) _day.format(test.performedAt!),
              if (test.performingDoctorName?.isNotEmpty == true) 'BS ${test.performingDoctorName}',
              if (test.statusName?.isNotEmpty == true) test.statusName!,
            ].join(' · '),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/functional/${test.id}'),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------- đơn thuốc

class _PrescriptionsTab extends ConsumerWidget {
  const _PrescriptionsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<Prescription>(
      async: ref.watch(prescriptionsProvider),
      onRefresh: () => ref.invalidate(prescriptionsProvider),
      emptyMessage: 'Chưa có đơn thuốc nào.',
      emptyIcon: Icons.medication_outlined,
      itemBuilder: (context, prescription) => _PrescriptionCard(prescription: prescription),
    );
  }
}

class _PrescriptionCard extends StatelessWidget {
  const _PrescriptionCard({required this.prescription});
  final Prescription prescription;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      radius: AppRadii.cardLarge,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Đầu đơn: mã đơn đặt bằng Sora, ngày và bác sĩ, số loại thuốc.
          Container(
            padding: const EdgeInsets.all(AppSpacing.cardLarge),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.relativeBg,
                    borderRadius: BorderRadius.circular(AppRadii.iconBox),
                  ),
                  child: const Icon(
                    Icons.receipt_long_outlined,
                    size: 21,
                    color: AppColors.relative,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        prescription.prescriptionCode,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: AppFonts.display,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        [
                          if (prescription.prescriptionDate != null)
                            _day.format(prescription.prescriptionDate!),
                          if (prescription.doctorName?.isNotEmpty == true)
                            'BS ${prescription.doctorName}',
                        ].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.relativeTint,
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                  ),
                  child: Text(
                    '${prescription.items.length} thuốc',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.relative,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.cardLarge, 16, AppSpacing.cardLarge, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (prescription.diagnosis?.isNotEmpty == true) ...[
                  DetailRow(
                    Icons.medical_information_outlined,
                    'Chẩn đoán',
                    prescription.diagnosis,
                  ),
                  const SizedBox(height: 12),
                ],
                for (var i = 0; i < prescription.items.length; i++) ...[
                  if (i > 0) const SizedBox(height: 14),
                  _DrugRow(item: prescription.items[i]),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Một thuốc trong đơn: dải màu dọc · tên + số lượng · chip liều · cách dùng in đậm.
class _DrugRow extends StatelessWidget {
  const _DrugRow({required this.item});
  final PrescriptionItem item;

  /// Các mẩu liều dùng làm chip.
  ///
  /// Lấy ĐÚNG những gì đơn thuốc ghi (`dosage`, `frequency`, `durationDays`), không suy ra gì
  /// thêm. Bản thiết kế vẽ chip kiểu "Sáng 1 / Trưa 1 / Tối 1", nhưng dữ liệu chỉ có "2 lần/ngày"
  /// — tự chia thành buổi sáng, buổi trưa là BỊA RA CHỈ DẪN DÙNG THUỐC, thứ tuyệt đối không được
  /// làm trong một app y tế.
  List<String> get _chips => [
    if (item.dosage?.isNotEmpty == true) item.dosage!,
    if (item.frequency?.isNotEmpty == true) item.frequency!,
    if ((item.durationDays ?? 0) > 0) '${item.durationDays} ngày',
  ];

  @override
  Widget build(BuildContext context) {
    final quantity = '${item.quantity}${item.unit == null ? '' : ' ${item.unit}'}'.trim();

    // `IntrinsicHeight` để dải màu dọc cao đúng bằng khối chữ bên cạnh. Không có nó thì
    // `CrossAxisAlignment.stretch` nhận chiều cao VÔ HẠN (Row nằm trong Column của danh sách
    // cuộn) và cả màn vỡ layout. Đắt hơn một lượt đo, nhưng mỗi đơn chỉ vài thuốc.
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Dải màu dọc tách các thuốc trong một đơn dài, khỏi phải kẻ đường ngang.
          Container(
            width: 4,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF8B5CF6), AppColors.accentDeep],
              ),
              borderRadius: BorderRadius.circular(AppRadii.pill),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        item.strength?.isNotEmpty == true
                            ? '${item.drugName} ${item.strength}'
                            : item.drugName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    if (quantity.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text(
                        quantity,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
                if (_chips.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final chip in _chips)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.tint,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            chip,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
                // Cách dùng in đậm: đây là dòng người bệnh cần nhớ nhất khi về nhà.
                if (item.instructions?.isNotEmpty == true) ...[
                  const SizedBox(height: 9),
                  Text(
                    item.instructions!,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      height: 1.45,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --------------------------------------------------------- khám sức khoẻ

class _CheckupsTab extends ConsumerWidget {
  const _CheckupsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<HealthCheckup>(
      async: ref.watch(healthCheckupsProvider),
      onRefresh: () => ref.invalidate(healthCheckupsProvider),
      emptyMessage: 'Bạn chưa tham gia đợt khám sức khoẻ nào tại bệnh viện.',
      emptyIcon: Icons.badge_outlined,
      itemBuilder: (context, checkup) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                checkup.campaignName ?? 'Đợt khám sức khoẻ',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              DetailRow(Icons.business_outlined, 'Đơn vị', checkup.companyName),
              DetailRow(
                Icons.event_outlined,
                'Ngày khám',
                checkup.checkupDate == null ? null : _day.format(checkup.checkupDate!),
              ),
              DetailRow(Icons.favorite_outline, 'Phân loại', checkup.healthClassification),
              if (checkup.certificateIssued)
                DetailRow(Icons.verified_outlined, 'Giấy chứng nhận', checkup.certificateNumber),
              DetailSection(title: 'Kết luận', body: checkup.conclusion, highlight: true),
              DetailSection(title: 'Lời dặn', body: checkup.recommendation),
            ],
          ),
        ),
      ),
    );
  }
}
