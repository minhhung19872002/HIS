import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Thẻ trắng bo góc, viền mảnh, bóng rất nhẹ hướng xuống — khối nền của gần như mọi màn.
///
/// Dùng `Container` + `BoxDecoration` chứ không dùng `Card`: bản thiết kế cần bóng lan rộng và
/// mờ (blur 30, offset 0/14) mà `elevation` của Material không tạo ra được — bóng mặc định tối và
/// gọn hơn, đặt cạnh nhau là thấy lệch hẳn.
///
/// [onTap] có thì thẻ tự có gợn nước và vùng chạm; không có thì nó chỉ là khối tĩnh, không chiếm
/// tiêu điểm của trình đọc màn hình.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.card),
    this.onTap,
    this.color,
    this.gradient,
    this.borderColor,
    this.radius = AppRadii.card,
    this.shadows = AppShadows.card,
    this.semanticLabel,
  }) : assert(color == null || gradient == null,
            'Chọn một trong hai: màu phẳng hoặc gradient, không đặt cả hai.');

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Bỏ trống thì lấy màu bề mặt của chủ đề — nhờ vậy dark mode tự đúng.
  final Color? color;

  /// Đặt gradient thì viền tự tắt: khối có màu không cần viền để tách khỏi nền.
  final Gradient? gradient;

  final Color? borderColor;
  final double radius;
  final List<BoxShadow> shadows;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLight = theme.brightness == Brightness.light;
    final shape = BorderRadius.circular(radius);

    final decorated = Container(
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? theme.cardTheme.color) : null,
        gradient: gradient,
        borderRadius: shape,
        border: gradient != null
            ? null
            : Border.all(
                color: borderColor ??
                    (isLight ? AppColors.border : theme.colorScheme.outlineVariant),
              ),
        // Bóng chỉ có nghĩa trên nền sáng; trên nền tối nó thành một vệt đen bẩn.
        boxShadow: isLight ? shadows : null,
      ),
      child: onTap == null
          ? Padding(padding: padding, child: child)
          : Material(
              color: Colors.transparent,
              borderRadius: shape,
              child: InkWell(
                onTap: onTap,
                borderRadius: shape,
                child: Padding(padding: padding, child: child),
              ),
            ),
    );

    if (semanticLabel == null) return decorated;
    return Semantics(label: semanticLabel, button: onTap != null, child: decorated);
  }
}
