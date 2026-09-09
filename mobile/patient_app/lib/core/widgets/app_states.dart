import 'package:flutter/material.dart';

import '../error/failure.dart';
import '../theme/app_tokens.dart';
import 'app_primary_button.dart';

/// Màn "chưa có gì".
///
/// Luôn nói RÕ vì sao trống và làm gì tiếp, không để một khoảng trắng: người bệnh nhìn màn trắng
/// thì tưởng app hỏng, rồi gọi lên tổng đài.
class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.actionLabel,
    this.onAction,
    this.compact = false,
  });

  final String message;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  /// Bản gọn cho chỗ nằm trong một thẻ chứ không chiếm cả màn.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(compact ? 20 : 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: compact ? 56 : 76,
              height: compact ? 56 : 76,
              decoration: const BoxDecoration(
                color: AppColors.tint,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: compact ? 26 : 34, color: AppColors.primary),
            ),
            SizedBox(height: compact ? 12 : 18),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.body,
                fontSize: AppFonts.minBodySize,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              AppPrimaryButton(label: actionLabel!, onPressed: onAction, expand: false),
            ],
          ],
        ),
      ),
    );
  }
}

/// Màn lỗi.
///
/// GIỮ NGUYÊN thông điệp từ [Failure] — tầng data đã dịch sẵn sang câu tiếng Việt nói được cho
/// người bệnh ("Không có kết nối mạng…"). Viết đè một câu chung chung ở đây là vứt đi đúng cái
/// thông tin giúp họ biết nên làm gì.
class AppErrorState extends StatelessWidget {
  const AppErrorState({
    super.key,
    required this.error,
    this.onRetry,
    this.retryLabel,
    this.fallbackMessage,
    this.compact = false,
  });

  /// Thường là `Failure`; nhận `Object` vì `AsyncValue.error` không hứa kiểu.
  final Object error;
  final VoidCallback? onRetry;
  final String? retryLabel;

  /// Câu thay thế khi lỗi KHÔNG phải `Failure` (lỗi lập trình lọt lên UI).
  final String? fallbackMessage;

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final failure = error is Failure ? error as Failure : null;
    final message = failure?.message ??
        fallbackMessage ??
        'Không tải được dữ liệu. Vui lòng thử lại.';

    // Mất mạng là chuyện thường gặp và tự sửa được — không dùng biểu tượng báo động cho nó.
    final icon = failure is NetworkFailure
        ? Icons.wifi_off_rounded
        : Icons.error_outline_rounded;

    return Center(
      child: Padding(
        padding: EdgeInsets.all(compact ? 20 : 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: compact ? 56 : 76,
              height: compact ? 56 : 76,
              decoration: const BoxDecoration(
                color: AppColors.dangerBadgeBg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: compact ? 26 : 34, color: AppColors.danger),
            ),
            SizedBox(height: compact ? 12 : 18),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.body,
                fontSize: AppFonts.minBodySize,
                height: 1.5,
                color: AppColors.textPrimary,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              AppPrimaryButton(
                label: retryLabel ?? 'Thử lại',
                icon: Icons.refresh_rounded,
                onPressed: onRetry,
                expand: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
