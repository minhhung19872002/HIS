import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../domain/result_models.dart';
import 'results_providers.dart';
import 'widgets/result_scaffolding.dart';

final _dateTime = DateFormat('HH:mm dd/MM/yyyy');

/// Chi tiết một phiếu xét nghiệm: từng chỉ số, đơn vị, khoảng tham chiếu và cờ bất thường
/// (HSMT I.2 #5 — "kết quả xét nghiệm").
class LabResultPage extends ConsumerWidget {
  const LabResultPage({super.key, required this.resultId});

  final String resultId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(labResultProvider(resultId));

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả xét nghiệm')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ResultErrorView(
          error: error,
          onRetry: () => ref.invalidate(labResultProvider(resultId)),
        ),
        data: (lab) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(lab.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            DetailRow(Icons.tag, 'Mã phiếu', lab.orderCode),
            DetailRow(Icons.category_outlined, 'Nhóm', lab.testCategory),
            DetailRow(Icons.person_outline, 'Bác sĩ chỉ định', lab.orderingDoctor),
            DetailRow(Icons.apartment_outlined, 'Khoa', lab.department),
            DetailRow(Icons.schedule, 'Thời gian trả kết quả',
                lab.resultDate == null ? null : _dateTime.format(lab.resultDate!)),

            if (lab.hasAbnormal) ...[
              const SizedBox(height: 16),
              _AbnormalNotice(),
            ],

            const SizedBox(height: 16),
            if (lab.testItems.isEmpty)
              const Text('Phiếu này chưa có chỉ số nào được trả về.')
            else
              _ResultTable(items: lab.testItems),

            const SizedBox(height: 24),
            // Câu này bắt buộc phải có: người bệnh đọc một chỉ số lệch rất dễ tự kết luận, mà một
            // chỉ số lệch nhiều khi hoàn toàn bình thường trong bối cảnh lâm sàng của họ.
            Text(
              'Các chỉ số trên chỉ có ý nghĩa khi được bác sĩ đọc cùng tình trạng thực tế của bạn. '
              'Vui lòng không tự chẩn đoán hay tự điều chỉnh thuốc.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _AbnormalNotice extends StatelessWidget {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Phiếu này có chỉ số nằm ngoài khoảng tham chiếu. Hãy mang kết quả đến bác sĩ để được '
              'giải thích.',
              style: TextStyle(color: scheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bảng chỉ số. Cuộn ngang được vì tên chỉ số tiếng Việt khá dài, mà điện thoại đời cũ thì hẹp.
class _ResultTable extends StatelessWidget {
  const _ResultTable({required this.items});
  final List<LabTestItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columnSpacing: 16,
        headingRowHeight: 40,
        columns: const [
          DataColumn(label: Text('Chỉ số')),
          DataColumn(label: Text('Kết quả')),
          DataColumn(label: Text('Đơn vị')),
          DataColumn(label: Text('Bình thường')),
        ],
        rows: [
          for (final item in items)
            DataRow(cells: [
              DataCell(Text(item.testName)),
              DataCell(Row(
                children: [
                  Text(
                    item.result,
                    style: TextStyle(
                      fontWeight: item.isAbnormal ? FontWeight.bold : FontWeight.normal,
                      color: item.isAbnormal ? theme.colorScheme.error : null,
                    ),
                  ),
                  // Mũi tên nói rõ cao hay thấp — chỉ tô đỏ thì người bệnh vẫn phải tự so với
                  // khoảng tham chiếu để đoán.
                  if (item.flag == 'High') const Icon(Icons.arrow_upward, size: 14),
                  if (item.flag == 'Low') const Icon(Icons.arrow_downward, size: 14),
                  if (item.isCritical)
                    const Padding(
                      padding: EdgeInsets.only(left: 4),
                      child: Icon(Icons.priority_high, size: 14),
                    ),
                ],
              )),
              DataCell(Text(item.unit ?? '')),
              DataCell(Text(item.normalRange ?? '')),
            ]),
        ],
      ),
    );
  }
}
