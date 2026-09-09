import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Thanh khoảng tham chiếu cho một chỉ số xét nghiệm.
///
/// Dải xanh nhạt là khoảng bình thường, chấm là giá trị đo được. Ra ngoài khoảng thì chấm đổi đỏ
/// và nằm sát mép tương ứng.
///
/// Vì sao vẽ ra: bảng số "kết quả 6.8 / bình thường 3.5 - 5.5" bắt người bệnh tự so hai con số rồi
/// tự kết luận. Nhiều người không làm phép so đó, hoặc làm sai. Một chấm nằm ngoài dải thì nhìn là
/// hiểu, không cần đọc số.
///
/// Chỉ vẽ khi ĐỌC ĐƯỢC cả giá trị lẫn khoảng — [tryParse] trả `null` thì bên gọi giữ nguyên cách
/// hiện bằng chữ. Vẽ một thanh dựa trên số đoán bừa còn tệ hơn không vẽ: đây là dữ liệu y tế.
class ReferenceRange {
  const ReferenceRange({required this.low, required this.high, required this.value});

  final double low;
  final double high;
  final double value;

  bool get isBelow => value < low;
  bool get isAbove => value > high;
  bool get isNormal => !isBelow && !isAbove;

  /// Vị trí của [value] trên thanh, 0..1.
  ///
  /// Khoảng bình thường chiếm phần giữa (20%..80%) để hai đầu còn chỗ vẽ giá trị nằm ngoài.
  double get position {
    final span = high - low;
    if (span <= 0) return 0.5;
    final ratio = (value - low) / span;
    return (0.2 + ratio * 0.6).clamp(0.03, 0.97);
  }

  /// Đọc "3.5 - 5.5" (hoặc "3,5 – 5,5") và một giá trị số. Không đọc được thì trả `null`.
  ///
  /// Chấp nhận cả dấu phẩy thập phân và các loại gạch ngang khác nhau — máy chủ lấy chuỗi này từ
  /// HIS, và mỗi nơi nhập một kiểu.
  static ReferenceRange? tryParse(String? normalRange, String? result) {
    if (normalRange == null || result == null) return null;

    final value = double.tryParse(result.trim().replaceAll(',', '.'));
    if (value == null) return null;

    final parts = normalRange
        .replaceAll(',', '.')
        .split(RegExp(r'\s*[-–—~]\s*'))
        .where((p) => p.trim().isNotEmpty)
        .toList();
    if (parts.length != 2) return null;

    final low = double.tryParse(parts[0].trim());
    final high = double.tryParse(parts[1].trim());
    if (low == null || high == null || high <= low) return null;

    return ReferenceRange(low: low, high: high, value: value);
  }
}

/// Vẽ [ReferenceRange].
class ReferenceRangeBar extends StatelessWidget {
  const ReferenceRangeBar({super.key, required this.range, this.label});

  final ReferenceRange range;

  /// Nhãn đọc cho trình đọc màn hình — thanh này thuần hình ảnh nên phải có chữ thay thế.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final abnormal = !range.isNormal;

    return Semantics(
      label: label ??
          (abnormal
              ? 'Giá trị ngoài khoảng bình thường'
              : 'Giá trị trong khoảng bình thường'),
      child: SizedBox(
        height: 18,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            const dot = 12.0;

            return Stack(
              clipBehavior: Clip.none,
              children: [
                // Nền cả thang.
                Positioned(
                  left: 0,
                  right: 0,
                  top: 6,
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  ),
                ),
                // Dải bình thường — phần giữa.
                Positioned(
                  left: width * 0.2,
                  width: width * 0.6,
                  top: 6,
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppColors.tintStrong,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  ),
                ),
                // Chấm giá trị.
                Positioned(
                  left: (width * range.position - dot / 2).clamp(0.0, width - dot),
                  top: 3,
                  child: Container(
                    width: dot,
                    height: dot,
                    decoration: BoxDecoration(
                      color: abnormal ? AppColors.danger : AppColors.success,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
