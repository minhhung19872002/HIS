import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'results_providers.dart';
import 'widgets/result_scaffolding.dart';

final _dateTime = DateFormat('HH:mm dd/MM/yyyy');

/// Chi tiết một phiếu thăm dò chức năng — điện tim, điện não, nội soi, đo hô hấp…
/// (HSMT I.2 #5 "kết quả thăm dò chức năng").
class FunctionalResultPage extends ConsumerWidget {
  const FunctionalResultPage({super.key, required this.resultId});

  final String resultId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(functionalResultProvider(resultId));

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả thăm dò chức năng')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ResultErrorView(
          error: error,
          onRetry: () => ref.invalidate(functionalResultProvider(resultId)),
        ),
        data: (test) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(test.testTypeName, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            DetailRow(Icons.tag, 'Mã phiếu', test.testCode),
            DetailRow(Icons.schedule, 'Thời gian thực hiện',
                test.performedAt == null ? null : _dateTime.format(test.performedAt!)),
            DetailRow(Icons.person_outline, 'Bác sĩ thực hiện', test.performingDoctorName),
            DetailRow(Icons.memory_outlined, 'Thiết bị', test.deviceName),
            DetailRow(Icons.help_outline, 'Lý do chỉ định', test.clinicalIndication),

            if (test.measurements.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text('Các số đo', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Card(
                margin: EdgeInsets.zero,
                child: Column(
                  children: [
                    for (final m in test.measurements)
                      ListTile(
                        dense: true,
                        title: Text(m.name),
                        trailing: Text(m.value,
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                  ],
                ),
              ),
            ],

            DetailSection(title: 'Mô tả', body: test.findings),
            DetailSection(title: 'Kết luận', body: test.conclusion, highlight: true),
            DetailSection(title: 'Đề nghị', body: test.recommendation),
          ],
        ),
      ),
    );
  }
}
