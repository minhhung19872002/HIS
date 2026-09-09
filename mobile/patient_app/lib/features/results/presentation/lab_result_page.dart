import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/widgets.dart';
import '../domain/result_models.dart';
import 'lab_report_page.dart';
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
      appBar: AppBar(
        title: const Text('Kết quả xét nghiệm'),
        actions: [
          // Chỉ hiện khi phiếu đã có kết quả: bản in của phiếu đang chờ thì rỗng.
          if (async.valueOrNull?.isCompleted == true)
            IconButton(
              icon: const Icon(Icons.description_outlined),
              tooltip: 'Xem bản in',
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => LabReportPage(
                  resultId: resultId,
                  title: async.valueOrNull?.title ?? 'Bản in kết quả',
                ),
              )),
            ),
        ],
      ),
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

/// Danh sách chỉ số, mỗi chỉ số một dòng kèm thanh khoảng tham chiếu.
///
/// Thay bảng cuộn ngang: bảng bắt người bệnh vừa cuộn ngang vừa tự so "6.8" với "3.5 - 5.5" rồi
/// tự kết luận. Nhiều người không làm phép so đó, hoặc làm sai. Một chấm nằm ngoài dải xanh thì
/// nhìn là hiểu.
///
/// Chỉ số nào KHÔNG đọc được thành số (kết quả dạng chữ như "Âm tính", hay khoảng ghi "< 5") thì
/// giữ nguyên cách hiện bằng chữ — vẽ thanh dựa trên số đoán bừa còn tệ hơn không vẽ.
class _ResultTable extends StatelessWidget {
  const _ResultTable({required this.items});
  final List<LabTestItem> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const Divider(height: 1, color: AppColors.border),
          _LabItemRow(item: items[i]),
        ],
      ],
    );
  }
}

class _LabItemRow extends StatelessWidget {
  const _LabItemRow({required this.item});
  final LabTestItem item;

  @override
  Widget build(BuildContext context) {
    final range = ReferenceRange.tryParse(item.normalRange, item.result);
    final abnormal = item.isAbnormal;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  item.testName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Mũi tên nói rõ cao hay thấp — chỉ tô đỏ thì người bệnh vẫn phải tự so với khoảng
              // tham chiếu để đoán.
              if (item.isHigh)
                const Icon(Icons.arrow_upward, size: 15, color: AppColors.danger),
              if (item.isLow)
                const Icon(Icons.arrow_downward, size: 15, color: AppColors.danger),
              if (item.isCritical)
                const Icon(Icons.priority_high, size: 15, color: AppColors.danger),
              const SizedBox(width: 4),
              // Giá trị và đơn vị là hai `Text` riêng: số đặt bằng Sora đậm, đơn vị nhỏ và nhạt
              // hơn — mắt bắt vào con số trước, đúng thứ người bệnh đi tìm.
              Text(
                item.result,
                style: TextStyle(
                  fontFamily: AppFonts.display,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: abnormal ? AppColors.danger : AppColors.textPrimary,
                ),
              ),
              if (item.unit != null && item.unit!.isNotEmpty) ...[
                const SizedBox(width: 3),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    item.unit!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: abnormal ? AppColors.danger : AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (range != null) ...[
            const SizedBox(height: 10),
            ReferenceRangeBar(
              range: range,
              label: '${item.testName}: ${item.result}'
                  '${item.unit == null ? '' : ' ${item.unit}'}, '
                  '${range.isNormal ? 'trong' : 'ngoài'} khoảng bình thường '
                  '${item.normalRange}',
            ),
            const SizedBox(height: 6),
          ] else
            const SizedBox(height: 4),
          Row(
            children: [
              if (item.normalRange != null && item.normalRange!.isNotEmpty)
                Expanded(
                  child: Text(
                    'Bình thường: ${item.normalRange}'
                    '${item.unit == null || item.unit!.isEmpty ? '' : ' ${item.unit}'}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                )
              else
                const Spacer(),
              if (abnormal)
                const AppStatusPill('Ngoài khoảng', tone: AppStatusTone.warn, dense: true),
            ],
          ),
        ],
      ),
    );
  }
}
