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
    this.foreground = Colors.white,
    this.height = AppSpacing.buttonHeight,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final Gradient gradient;

  /// Màu chữ và biểu tượng. Đổi khi [gradient] SÁNG — trắng trên nền xanh nhạt chỉ đạt ~1.7:1,
  /// dưới xa ngưỡng 4.5:1, và đây là nút chính của màn nên không được để đoán chữ.
  final Color foreground;

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
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: foreground),
          )
        else ...[
          if (icon != null) ...[
            Icon(icon, size: 20, color: foreground),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: AppFonts.body,
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: foreground,
              ),
            ),
          ),
        ],
      ],
    );

    return Opacity(
      // Mờ đi khi khoá, nhưng vẫn giữ khối màu để người dùng thấy nút vẫn ở đó.
      opacity: enabled ? 1 : 0.55,
      // ⚠️ `Container` TỰ vẽ gradient, KHÔNG dùng `Ink`.
      //
      // `Ink` không tự vẽ gì cả: nó gửi hình nền lên `Material` gần nhất phía trên rồi để
      // `Material` vẽ hộ. Nên chỉ cần giữa nút và `Material` đó có một widget nền ĐỤC là hình nền
      // bị che sạch — nút vẫn chiếm chỗ, vẫn bấm được, nhưng KHÔNG NHÌN THẤY.
      //
      // Đúng chuyện đã xảy ra: thanh đáy màn đặt lịch và màn lấy số đều là `Container` nền trắng
      // đục, `Material` gần nhất là của `Scaffold` nằm dưới nó — nên nút "Xác nhận" biến mất và
      // người bệnh không có cách nào lưu lịch. Chỉ lộ ra khi nhìn ảnh chụp trên máy thật; mã vẫn
      // dịch được, test vẫn xanh, vì nút vẫn có mặt trong cây widget.
      //
      // `Material` trong suốt lồng bên trong chỉ để lấy gợn nước — nó không che gradient.
      child: Container(
        height: height,
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: shape,
          boxShadow: enabled ? AppShadows.primaryGlow : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: shape,
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
      ),
    );
  }
}
