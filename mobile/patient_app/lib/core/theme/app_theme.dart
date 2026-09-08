import 'package:flutter/material.dart';

/// Material 3, có dark mode, cỡ chữ và vùng chạm rộng hơn mặc định vì người dùng
/// chính của app là người bệnh — trong đó có nhiều người cao tuổi (prompt §4.3).
class AppTheme {
  AppTheme._();

  static const _seed = Color(0xFF0F766E);

  /// Chiều cao tối thiểu của nút: 48dp theo khuyến nghị vùng chạm của Material,
  /// cao hơn mặc định 36dp — dễ bấm với người lớn tuổi.
  static const _minButtonSize = Size.fromHeight(48);

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
