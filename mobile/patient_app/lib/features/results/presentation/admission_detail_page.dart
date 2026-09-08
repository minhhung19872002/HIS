import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../domain/inpatient_models.dart';
import '../domain/result_models.dart';
import 'inpatient_providers.dart';
import 'widgets/result_scaffolding.dart';

final _day = DateFormat('dd/MM/yyyy');
final _money = NumberFormat.decimalPattern('vi');

/// Chi tiết một đợt nội trú: chỉ định CLS (kèm số thứ tự), công khai thuốc, và các kết quả
/// của riêng đợt đó (HSMT I.2 #6).
class AdmissionDetailPage extends ConsumerWidget {
  const AdmissionDetailPage({super.key, required this.admissionId});

  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Đợt điều trị'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Chỉ định CLS'),
              Tab(text: 'Công khai thuốc'),
              Tab(text: 'Xét nghiệm'),
              Tab(text: 'Hình ảnh'),
              Tab(text: 'Thăm dò CN'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _ServiceOrdersTab(admissionId: admissionId),
            _MedicineDisclosureTab(admissionId: admissionId),
            _AdmissionLabTab(admissionId: admissionId),
            _AdmissionImagingTab(admissionId: admissionId),
            _AdmissionFunctionalTab(admissionId: admissionId),
          ],
        ),
      ),
    );
  }
}

// ------------------------------------------------------- chỉ định CLS

class _ServiceOrdersTab extends ConsumerWidget {
  const _ServiceOrdersTab({required this.admissionId});
  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<ServiceOrder>(
      async: ref.watch(serviceOrdersProvider(admissionId)),
      onRefresh: () => ref.invalidate(serviceOrdersProvider(admissionId)),
      emptyMessage: 'Đợt điều trị này chưa có chỉ định cận lâm sàng nào.',
      emptyIcon: Icons.assignment_outlined,
      itemBuilder: (context, order) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(order.serviceName,
                        style: Theme.of(context).textTheme.titleMedium),
                  ),
                  // Số thứ tự để to và rõ: khi đang nằm viện chờ đi chụp chiếu, đây là con số
                  // người bệnh nhìn nhiều nhất.
                  if (order.hasQueueNumber) _QueueBadge(order: order),
                ],
              ),
              const SizedBox(height: 8),
              DetailRow(Icons.category_outlined, 'Loại', order.requestTypeName),
              DetailRow(Icons.meeting_room_outlined, 'Phòng thực hiện', order.executeRoomName),
              DetailRow(Icons.person_outline, 'Bác sĩ chỉ định', order.orderingDoctor),
              DetailRow(Icons.event_outlined, 'Ngày chỉ định',
                  order.orderDate == null ? null : _day.format(order.orderDate!)),
              DetailRow(Icons.flag_outlined, 'Trạng thái', order.statusName),
              if (order.hasQueueNumber && order.peopleAhead >= 0)
                DetailRow(Icons.people_outline, 'Đang chờ trước bạn',
                    '${order.peopleAhead} người'),
            ],
          ),
        ),
      ),
    );
  }
}

class _QueueBadge extends StatelessWidget {
  const _QueueBadge({required this.order});
  final ServiceOrder order;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text('Số thứ tự', style: Theme.of(context).textTheme.labelSmall),
          Text(
            order.queueNumber!,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(color: scheme.onPrimaryContainer, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------- công khai thuốc

class _MedicineDisclosureTab extends ConsumerWidget {
  const _MedicineDisclosureTab({required this.admissionId});
  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(medicineDisclosureProvider(admissionId));

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ResultErrorView(
        error: error,
        onRetry: () => ref.invalidate(medicineDisclosureProvider(admissionId)),
      ),
      data: (disclosure) => disclosure.items.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Đợt điều trị này chưa có thuốc nào được cấp phát.',
                    textAlign: TextAlign.center),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Bảng công khai thuốc theo mẫu của Bộ Y tế. Nếu số liệu ở đây khác với thực tế '
                  'bạn đã dùng, hãy báo ngay điều dưỡng của khoa.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                for (final entry in disclosure.byDate.entries) ...[
                  Text(_day.format(entry.key),
                      style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      children: [
                        for (final item in entry.value) _DisclosureRow(item: item),
                      ],
                    ),
                  ),
                ],
                const Divider(),
                _MoneyRow(label: 'Tổng tiền thuốc', amount: disclosure.totalAmount),
                _MoneyRow(label: 'Bảo hiểm chi trả', amount: disclosure.insuranceAmount),
                _MoneyRow(
                    label: 'Bạn phải trả', amount: disclosure.patientAmount, emphasize: true),
                const SizedBox(height: 32),
              ],
            ),
    );
  }
}

class _DisclosureRow extends StatelessWidget {
  const _DisclosureRow({required this.item});
  final MedicineDisclosureItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(item.medicineName, style: theme.textTheme.titleSmall)),
              Text('${_money.format(item.amount)} đ'),
            ],
          ),
          if (item.activeIngredient?.isNotEmpty == true)
            Text(item.activeIngredient!, style: theme.textTheme.bodySmall),
          Text([
            '${_money.format(item.quantity)} ${item.unit ?? ''}'.trim(),
            '${_money.format(item.unitPrice)} đ/${item.unit ?? 'đv'}',
            if (item.paymentSourceName?.isNotEmpty == true) item.paymentSourceName!,
          ].join(' · ')),
          if (item.usageInstructions?.isNotEmpty == true)
            Text(item.usageInstructions!, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _MoneyRow extends StatelessWidget {
  const _MoneyRow({required this.label, required this.amount, this.emphasize = false});

  final String label;
  final num amount;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final style = emphasize
        ? Theme.of(context).textTheme.titleMedium
        : Theme.of(context).textTheme.bodyMedium;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text('${_money.format(amount)} đ', style: style),
        ],
      ),
    );
  }
}

// ------------------------------- kết quả của riêng đợt nội trú này

class _AdmissionLabTab extends ConsumerWidget {
  const _AdmissionLabTab({required this.admissionId});
  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<LabResult>(
      async: ref.watch(admissionLabProvider(admissionId)),
      onRefresh: () => ref.invalidate(admissionLabProvider(admissionId)),
      emptyMessage: 'Đợt điều trị này chưa có kết quả xét nghiệm.',
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
            if (lab.hasAbnormal) 'có chỉ số ngoài khoảng bình thường',
          ].join(' · ')),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/lab/${lab.id}'),
        ),
      ),
    );
  }
}

class _AdmissionImagingTab extends ConsumerWidget {
  const _AdmissionImagingTab({required this.admissionId});
  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<ImagingResult>(
      async: ref.watch(admissionImagingProvider(admissionId)),
      onRefresh: () => ref.invalidate(admissionImagingProvider(admissionId)),
      emptyMessage: 'Đợt điều trị này chưa có kết quả chẩn đoán hình ảnh.',
      emptyIcon: Icons.image_search_outlined,
      itemBuilder: (context, img) => Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: const Icon(Icons.monitor_heart_outlined),
          title: Text(img.title),
          subtitle: Text([
            if (img.studyDate != null) _day.format(img.studyDate!),
            if (img.hasImages) '${img.imageCount} ảnh',
          ].join(' · ')),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/imaging/${img.id}'),
        ),
      ),
    );
  }
}

class _AdmissionFunctionalTab extends ConsumerWidget {
  const _AdmissionFunctionalTab({required this.admissionId});
  final String admissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ResultListView<FunctionalResult>(
      async: ref.watch(admissionFunctionalProvider(admissionId)),
      onRefresh: () => ref.invalidate(admissionFunctionalProvider(admissionId)),
      emptyMessage: 'Đợt điều trị này chưa có kết quả thăm dò chức năng.',
      emptyIcon: Icons.graphic_eq_outlined,
      itemBuilder: (context, test) => Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          leading: const Icon(Icons.timeline_outlined),
          title: Text(test.testTypeName),
          subtitle: Text(test.performedAt == null ? '' : _day.format(test.performedAt!)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('${AppRoutes.results}/functional/${test.id}'),
        ),
      ),
    );
  }
}
