import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../domain/inpatient_models.dart';
import 'inpatient_providers.dart';
import 'widgets/result_scaffolding.dart';

final _day = DateFormat('dd/MM/yyyy');

/// Danh sách đợt nằm viện (HSMT I.2 #6).
class AdmissionsPage extends ConsumerWidget {
  const AdmissionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Điều trị nội trú')),
      body: ResultListView<Admission>(
        async: ref.watch(admissionsProvider),
        onRefresh: () => ref.invalidate(admissionsProvider),
        emptyMessage: 'Bạn chưa có đợt điều trị nội trú nào tại bệnh viện.',
        emptyIcon: Icons.local_hotel_outlined,
        itemBuilder: (context, admission) => Card(
          margin: EdgeInsets.zero,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => context.push('${AppRoutes.admissions}/${admission.id}'),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          admission.diagnosis?.isNotEmpty == true
                              ? admission.diagnosis!
                              : 'Đợt điều trị',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      Chip(
                        label: Text(admission.statusName ?? ''),
                        visualDensity: VisualDensity.compact,
                        backgroundColor: admission.isInProgress
                            ? Theme.of(context).colorScheme.primaryContainer
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  DetailRow(
                    Icons.event_outlined,
                    'Thời gian',
                    [
                      if (admission.admissionDate != null) _day.format(admission.admissionDate!),
                      if (admission.dischargeDate != null) _day.format(admission.dischargeDate!),
                    ].join(' → '),
                  ),
                  DetailRow(Icons.hourglass_bottom, 'Số ngày nằm viện',
                      '${admission.daysOfStay} ngày'),
                  DetailRow(Icons.apartment_outlined, 'Khoa', admission.departmentName),
                  DetailRow(
                    Icons.bed_outlined,
                    'Giường',
                    [admission.roomName, admission.bedName]
                        .where((e) => e?.isNotEmpty == true)
                        .join(' · '),
                  ),
                  DetailRow(Icons.person_outline, 'Bác sĩ', admission.admittingDoctorName),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
