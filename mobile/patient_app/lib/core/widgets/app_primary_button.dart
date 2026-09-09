import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Nút hành động chính — gradient, cao 54dp, bo 18.
///
/// Có gradient nên không dùng được `FilledButton` (nó chỉ nhận màu phẳng); dựng bằng
/// `Ink` + `InkWell` để vẫn có gợn nước đúng chuẩn Material.
///
/// [loading] khoá nút và hiện vòng quay NHƯNG GIỮ NGUYÊN kích thước — nút co lại giữa chừng làm
/// ngón tay đang chạm trượt ra ngoài, và ở màn đặt lịch thì đó là một lần đặt nhầm.
class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.gradient = AppGradients.primaryButton,
    this.height = AppSpacing.buttonHeight,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final Gradient gradient;
  final double height;

  /// `false` khi nút nằm cạnh nút khác trong một `Row` — khi đó nó co theo nội dung.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    final shape = BorderRadius.circular(AppRadii.button);

    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
          )
        else ...[
          if (icon != null) ...[
            Icon(icon, size: 20, color: Colors.white),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: AppFonts.body,
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ],
    );

    return Opacity(
      // Mờ đi khi khoá, nhưng vẫn giữ khối màu để người dùng thấy nút vẫn ở đó.
      opacity: enabled ? 1 : 0.55,
      child: Ink(
        height: height,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: shape,
          boxShadow: enabled ? AppShadows.primaryGlow : null,
        ),
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: shape,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}
