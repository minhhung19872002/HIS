import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Sắc thái của [AppStatusPill].
///
/// Bốn tông, mỗi tông một NGHĨA cố định trong toàn app — đừng chọn theo màu cho đẹp, vì người bệnh
/// học nghĩa qua màu: xanh lá là yên tâm, đỏ là cần chú ý ngay, vàng là còn phải chờ.
enum AppStatusTone {
  /// Bình thường / đã xác nhận / đã hoàn tất.
  ok,

  /// Bất thường, cần người bệnh để ý — chỉ số ngoài khoảng, lịch bị huỷ.
  warn,

  /// Đang chờ: chưa có kết quả, chờ xác nhận.
  wait,

  /// Thông tin trung tính, không phải trạng thái tốt hay xấu.
  info,
}

/// Nhãn trạng thái hình viên thuốc.
///
/// Cố ý KHÔNG chỉ dựa vào màu: mỗi tông vẫn kèm chữ, vì khoảng 8% nam giới khó phân biệt đỏ với
/// xanh lá — mà đỏ/xanh lá lại đúng là cặp mang nghĩa nặng nhất ở đây.
class AppStatusPill extends StatelessWidget {
  const AppStatusPill(
    this.label, {
    super.key,
    this.tone = AppStatusTone.info,
    this.icon,
    this.dense = false,
  });

  final String label;
  final AppStatusTone tone;
  final IconData? icon;

  /// Bản gọn cho chỗ chật (trong một dòng danh sách).
  final bool dense;

  ({Color fg, Color bg}) get _palette => switch (tone) {
        AppStatusTone.ok => (fg: AppColors.success, bg: AppColors.successPillBg),
        AppStatusTone.warn => (fg: AppColors.danger, bg: AppColors.dangerBadgeBg),
        AppStatusTone.wait => (fg: AppColors.warning, bg: AppColors.warningBg),
        AppStatusTone.info => (fg: AppColors.primary, bg: AppColors.tint),
      };

  @override
  Widget build(BuildContext context) {
    final p = _palette;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 10,
        vertical: dense ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: p.bg,
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: dense ? 12 : 13, color: p.fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontFamily: AppFonts.body,
              fontSize: dense ? 11 : 12,
              fontWeight: FontWeight.w700,
              color: p.fg,
            ),
          ),
        ],
      ),
    );
  }
}
