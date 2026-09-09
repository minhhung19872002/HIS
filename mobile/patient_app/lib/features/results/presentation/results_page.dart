import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_tokens.dart';
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
            preferredSize: Size.fromHeight(relative ? 82 : 56),
            child: Container(
              color: relative ? AppColors.relativeTint : AppColors.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (relative)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(AppSpacing.screen, 0, AppSpacing.screen, 8),
                      child: Row(
                        children: [
                          const Icon(Icons.people_alt_outlined,
                              size: 16, color: AppColors.relative),
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
            title: Text(visit.diagnosis?.isNotEmpty == true
                ? visit.diagnosis!
                : 'Lượt khám ${visit.visitDate == null ? '' : _day.format(visit.visitDate!)}'),
            subtitle: Text([
              if (visit.visitDate != null) _day.format(visit.visitDate!),
              if (visit.department?.isNotEmpty == true) visit.department!,
              if (visit.doctorName?.isNotEmpty == true) 'BS ${visit.doctorName}',
            ].join(' · ')),
            trailing: Icon(isSelected ? Icons.filter_alt : Icons.filter_alt_outlined),
            // Chạm để lọc mọi tab còn lại theo đúng lần khám này; chạm lần nữa để bỏ lọc.
            onTap: () => ref
                .read(visitFilterProvider.notifier)
                .select(isSelected ? null : visit.visitId),
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

    final visit = ref.watch(visitsProvider).valueOrNull?.where((v) => v.visitId == visitId).firstOrNull;
    final label = visit?.visitDate == null ? 'một lần khám' : 'lần khám ${_day.format(visit!.visitDate!)}';

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
          subtitle: Text([
            if (lab.resultDate != null) _day.format(lab.resultDate!),
            if (lab.orderingDoctor?.isNotEmpty == true) 'BS ${lab.orderingDoctor}',
            if (lab.hasAbnormal) 'có chỉ số ngoài khoảng bình thường',
            if (!lab.isCompleted) 'đang chờ kết quả',
          ].join(' · ')),
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
          subtitle: Text([
            if (img.studyDate != null) _day.format(img.studyDate!),
            if (img.reportingDoctor?.isNotEmpty == true) 'BS ${img.reportingDoctor}',
            if (img.hasImages) '${img.imageCount} ảnh',
            if (!img.isCompleted) 'đang chờ đọc kết quả',
          ].join(' · ')),
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
          subtitle: Text([
            if (test.performedAt != null) _day.format(test.performedAt!),
            if (test.performingDoctorName?.isNotEmpty == true) 'BS ${test.performingDoctorName}',
            if (test.statusName?.isNotEmpty == true) test.statusName!,
          ].join(' · ')),
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
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: ExpansionTile(
        leading: const Icon(Icons.receipt_long_outlined),
        title: Text(prescription.prescriptionCode),
        subtitle: Text([
          if (prescription.prescriptionDate != null) _day.format(prescription.prescriptionDate!),
          if (prescription.doctorName?.isNotEmpty == true) 'BS ${prescription.doctorName}',
          '${prescription.items.length} thuốc',
        ].join(' · ')),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (prescription.diagnosis?.isNotEmpty == true)
            DetailRow(Icons.medical_information_outlined, 'Chẩn đoán', prescription.diagnosis),
          const SizedBox(height: 8),
          for (final item in prescription.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.drugName, style: theme.textTheme.titleSmall),
                  if (item.strength?.isNotEmpty == true)
                    Text(item.strength!, style: theme.textTheme.bodySmall),
                  Text('${item.schedule} · ${item.quantity} ${item.unit ?? ''}'.trim()),
                  // Cách dùng in đậm: đây là dòng người bệnh cần nhớ nhất khi về nhà.
                  if (item.instructions?.isNotEmpty == true)
                    Text(item.instructions!,
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
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
              Text(checkup.campaignName ?? 'Đợt khám sức khoẻ',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              DetailRow(Icons.business_outlined, 'Đơn vị', checkup.companyName),
              DetailRow(Icons.event_outlined, 'Ngày khám',
                  checkup.checkupDate == null ? null : _day.format(checkup.checkupDate!)),
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
