import 'package:flutter/material.dart';

/// Material 3, có dark mode, cỡ chữ và vùng chạm rộng hơn mặc định vì người dùng
/// chính của app là người bệnh — trong đó có nhiều người cao tuổi (prompt §4.3).
class AppTheme {
  AppTheme._();

  static const _seed = Color(0xFF0F766E);

  /// Chiều cao tối thiểu của nút: 48dp theo khuyến nghị vùng chạm của Material,
  /// cao hơn mặc định 36dp — dễ bấm với người lớn tuổi.
  ///
  /// ⚠️ `Size.fromHeight(48)` là `Size(double.infinity, 48)` — bề rộng tối thiểu VÔ HẠN. Trong
  /// một `Column` thì bề rộng vô hạn bị kẹp lại bằng bề rộng cha, nên nút trải kín hàng: đó chính
  /// là dáng đang dùng khắp app. Nhưng đặt nút vào chỗ bề rộng KHÔNG bị chặn — `Row`, `Wrap`,
  /// danh sách cuộn ngang — thì vô hạn không còn gì để kẹp, và cả màn hình vỡ layout với
  /// "BoxConstraints forces an infinite width".
  ///
  /// Nút nằm trong `Row` phải dùng [rowButton] thay vì thừa hưởng kiểu này.
  static const _minButtonSize = Size.fromHeight(48);

  /// Kiểu cho nút nằm ngang cạnh nút khác (trong `Row`, `Wrap`, thanh thao tác của thẻ).
  ///
  /// Vẫn giữ đủ 48dp chiều cao — lý do có [_minButtonSize] ngay từ đầu — nhưng bề rộng co theo
  /// nội dung, tối thiểu 64dp như mặc định của Material.
  /// Chỉ đè đúng `minimumSize`, không đụng tới màu — nên dùng được cho cả `FilledButton`,
  /// `FilledButton.tonal` lẫn `OutlinedButton` mà không làm mất dáng riêng của từng loại.
  /// (`FilledButton.styleFrom` thì kèm cả bảng màu của biến thể filled, đặt vào `.tonal` là
  /// nút tonal biến thành nút đặc.)
  static const rowButton = ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(64, 48)),
  );

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(seedColor: _seed, brightness: brightness);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      visualDensity: VisualDensity.standard,
      appBarTheme: AppBarTheme(centerTitle: true, backgroundColor: scheme.surface, elevation: 0),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: _minButtonSize),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(minimumSize: _minButtonSize),
      ),
      inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
      cardTheme: const CardThemeData(margin: EdgeInsets.symmetric(vertical: 6)),
    );
  }
}
