import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/failure.dart';

/// Mã lỗi máy chủ trả khi tài khoản chưa gắn với hồ sơ bệnh án.
const kPatientNotLinked = 'PATIENT_NOT_LINKED';

/// Khung chung cho mọi tab kết quả: đang tải · lỗi · trống · có dữ liệu.
///
/// Bốn trạng thái này lặp ở sáu tab. Gom một chỗ để không có tab nào lỡ quên trạng thái trống rồi
/// hiện một màn trắng, khiến người bệnh tưởng bệnh viện làm mất kết quả của mình.
class ResultListView<T> extends StatelessWidget {
  const ResultListView({
    super.key,
    required this.async,
    required this.onRefresh,
    required this.itemBuilder,
    required this.emptyMessage,
    this.emptyIcon = Icons.inbox_outlined,
    this.header,
  });

  final AsyncValue<List<T>> async;
  final VoidCallback onRefresh;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final String emptyMessage;
  final IconData emptyIcon;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ResultErrorView(error: error, onRetry: onRefresh),
      data: (items) => RefreshIndicator(
        onRefresh: () async => onRefresh(),
        child: items.isEmpty
            ? ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  if (header != null) header!,
                  const SizedBox(height: 64),
                  Icon(emptyIcon, size: 56),
                  const SizedBox(height: 12),
                  Text(emptyMessage, textAlign: TextAlign.center),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                itemCount: items.length + (header != null ? 1 : 0),
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  if (header != null && index == 0) return header!;
                  return itemBuilder(context, items[index - (header != null ? 1 : 0)]);
                },
              ),
      ),
    );
  }
}

/// Lỗi khi tải kết quả. Tách riêng trường hợp "chưa liên kết hồ sơ" vì đó không phải sự cố kỹ thuật
/// mà là một việc người bệnh cần làm — nói "thử lại" ở đó là nói sai.
class ResultErrorView extends StatelessWidget {
  const ResultErrorView({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final failure = error is Failure ? error as Failure : null;
    final notLinked = failure?.code == kPatientNotLinked;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(notLinked ? Icons.link_off : Icons.cloud_off, size: 56),
            const SizedBox(height: 12),
            Text(
              failure?.message ?? 'Không tải được kết quả. Vui lòng thử lại.',
              textAlign: TextAlign.center,
            ),
            if (notLinked) ...[
              const SizedBox(height: 8),
              Text(
                'Mang theo giấy tờ tuỳ thân tới quầy tiếp đón để được liên kết.',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ] else ...[
              const SizedBox(height: 16),
              FilledButton.tonal(onPressed: onRetry, child: const Text('Thử lại')),
            ],
          ],
        ),
      ),
    );
  }
}

/// Một dòng "nhãn — nội dung" trong trang chi tiết.
class DetailRow extends StatelessWidget {
  const DetailRow(this.icon, this.label, this.value, {super.key});

  final IconData icon;
  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: Theme.of(context).textTheme.bodyMedium,
                children: [
                  TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
                  TextSpan(text: value),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Khối văn bản dài (mô tả, kết luận, đề nghị) có tiêu đề riêng.
class DetailSection extends StatelessWidget {
  const DetailSection({super.key, required this.title, required this.body, this.highlight = false});

  final String title;
  final String? body;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    if (body == null || body!.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: highlight ? theme.colorScheme.primaryContainer : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.labelLarge),
          const SizedBox(height: 4),
          Text(body!),
        ],
      ),
    );
  }
}
