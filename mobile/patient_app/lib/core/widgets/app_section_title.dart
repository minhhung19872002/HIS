import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Tiêu đề của một khối trên màn ("Dịch vụ", "Lịch khám sắp tới").
///
/// 16sp/w700 theo bản thiết kế. [action] là chỗ cho một nút chữ bên phải ("Xem tất cả") — đặt ở
/// đây thay vì để mỗi màn tự dựng một `Row`, để khoảng cách giữa tiêu đề và nội dung bên dưới
/// giống nhau ở mọi màn.
class AppSectionTitle extends StatelessWidget {
  const AppSectionTitle(
    this.title, {
    super.key,
    this.action,
    this.padding = const EdgeInsets.only(bottom: 12),
  });

  final String title;
  final Widget? action;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: padding,
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: theme.brightness == Brightness.light
                    ? AppColors.textPrimary
                    : theme.colorScheme.onSurface,
              ),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}
