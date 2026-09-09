import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Một dòng trong danh sách: hộp biểu tượng · tiêu đề + phụ đề · phần đuôi.
///
/// Kích thước lấy đúng bản thiết kế: hộp biểu tượng 44 bo 15 nền tint, tiêu đề 15/w700, phụ đề
/// 13 màu chữ phụ.
///
/// Dòng cao ít nhất 48dp kể cả khi chỉ có tiêu đề một dòng — dưới mức đó thì người tay run rất
/// dễ chạm nhầm sang dòng bên cạnh.
class AppListRow extends StatelessWidget {
  const AppListRow({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.iconBackground,
    this.leading,
    this.trailing,
    this.onTap,
    this.padding = const EdgeInsets.symmetric(vertical: 10),
  }) : assert(icon == null || leading == null,
            'Chọn một trong hai: `icon` (dựng sẵn hộp) hoặc `leading` (tự dựng).');

  final String title;
  final String? subtitle;

  /// Biểu tượng đặt trong hộp bo góc nền tint.
  final IconData? icon;
  final Color? iconColor;
  final Color? iconBackground;

  /// Thay hẳn hộp biểu tượng bằng widget tự dựng (ô ngày, avatar chữ cái…).
  final Widget? leading;

  final Widget? trailing;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLight = theme.brightness == Brightness.light;

    final head = leading ??
        (icon == null
            ? null
            : Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBackground ??
                      (isLight ? AppColors.tint : theme.colorScheme.surfaceContainerHighest),
                  borderRadius: BorderRadius.circular(AppRadii.iconBox),
                ),
                child: Icon(icon, size: 22, color: iconColor ?? AppColors.primary),
              ));

    final row = Padding(
      padding: padding,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSpacing.minTouchTarget),
        child: Row(
          children: [
            if (head != null) ...[head, const SizedBox(width: 14)],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontFamily: AppFonts.body,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isLight ? AppColors.textPrimary : theme.colorScheme.onSurface,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontFamily: AppFonts.body,
                        fontSize: 13,
                        height: 1.35,
                        color: isLight
                            ? AppColors.textSecondary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[const SizedBox(width: 12), trailing!],
          ],
        ),
      ),
    );

    if (onTap == null) return row;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.field),
        child: row,
      ),
    );
  }
}
