import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Material 3 theo bản thiết kế Bluestar (`docs/features/patient-app/design/`).
///
/// Cỡ chữ và vùng chạm rộng hơn mặc định vì người dùng chính của app là người bệnh — trong đó có
/// nhiều người cao tuổi (prompt §4.3).
///
/// Giữ `ColorScheme.fromSeed` để mọi widget chưa được tạo dáng riêng vẫn có màu hợp lý, nhưng đè
/// những vai trò mà bản thiết kế nói rõ. Dark mode vẫn chạy: các vai trò do `darkAlgorithm` sinh
/// được giữ nguyên, chỉ ghim lại màu thương hiệu.
class AppTheme {
  AppTheme._();

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
  static const _minButtonSize = Size.fromHeight(AppSpacing.buttonHeight);

  /// Kiểu cho nút nằm ngang cạnh nút khác (trong `Row`, `Wrap`, thanh thao tác của thẻ).
  ///
  /// Vẫn giữ đủ 48dp chiều cao — lý do có [_minButtonSize] ngay từ đầu — nhưng bề rộng co theo
  /// nội dung, tối thiểu 64dp như mặc định của Material.
  /// Chỉ đè đúng `minimumSize`, không đụng tới màu — nên dùng được cho cả `FilledButton`,
  /// `FilledButton.tonal` lẫn `OutlinedButton` mà không làm mất dáng riêng của từng loại.
  /// (`FilledButton.styleFrom` thì kèm cả bảng màu của biến thể filled, đặt vào `.tonal` là
  /// nút tonal biến thành nút đặc.)
  static const rowButton = ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(64, AppSpacing.minTouchTarget)),
  );

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    final base = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
    );

    // Ghim màu thương hiệu ở CẢ hai chế độ; phần còn lại để thuật toán sinh, nhờ vậy dark mode
    // không phải bảo trì thành một bảng màu thứ hai.
    final scheme = isLight
        ? base.copyWith(
            primary: AppColors.primary,
            onPrimary: Colors.white,
            secondary: AppColors.primaryAction,
            surface: AppColors.surface,
            onSurface: AppColors.textPrimary,
            error: AppColors.danger,
            outline: AppColors.border,
            outlineVariant: AppColors.borderSoft,
          )
        : base.copyWith(
            // Nền tối cần sắc SÁNG hơn: `primary` gốc trên nền đen chỉ đạt ~3:1.
            primary: AppColors.primaryLight,
            secondary: AppColors.accent,
          );

    final textTheme = _textTheme(isLight ? AppColors.textPrimary : Colors.white);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: brightness,
      visualDensity: VisualDensity.standard,
      fontFamily: AppFonts.body,
      textTheme: textTheme,
      scaffoldBackgroundColor: isLight ? AppColors.pageBackground : scheme.surface,

      // Thanh tiêu đề phẳng, không bóng, chữ căn trái — bản thiết kế đặt tiêu đề như một dòng
      // nội dung chứ không như một thanh nổi lên.
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: isLight ? AppColors.pageBackground : scheme.surface,
        foregroundColor: isLight ? AppColors.textPrimary : Colors.white,
        titleTextStyle: TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: isLight ? AppColors.textPrimary : Colors.white,
        ),
      ),

      cardTheme: CardThemeData(
        margin: EdgeInsets.zero,
        elevation: 0,
        color: isLight ? AppColors.surface : scheme.surfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.card),
          side: BorderSide(color: isLight ? AppColors.border : scheme.outlineVariant),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: _minButtonSize,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.button),
          ),
          textStyle: const TextStyle(
            fontFamily: AppFonts.body,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: _minButtonSize,
          side: BorderSide(color: isLight ? AppColors.borderSoft : scheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.button),
          ),
          textStyle: const TextStyle(
            fontFamily: AppFonts.body,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(64, AppSpacing.minTouchTarget),
          textStyle: const TextStyle(
            fontFamily: AppFonts.body,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isLight ? AppColors.pageBackground : scheme.surfaceContainerHighest,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
          borderSide: BorderSide(color: isLight ? AppColors.border : scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
          borderSide: const BorderSide(color: AppColors.primaryAction, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
          borderSide: BorderSide(color: scheme.error, width: 2),
        ),
        hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 15),
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 15),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: isLight ? AppColors.pageBackground : scheme.surfaceContainerHighest,
        selectedColor: AppColors.primary,
        labelStyle: TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: isLight ? AppColors.textSecondary : scheme.onSurfaceVariant,
        ),
        secondaryLabelStyle: const TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
        side: BorderSide.none,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        showCheckmark: false,
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isLight
            ? AppColors.surface.withValues(alpha: 0.94)
            : scheme.surface,
        elevation: 0,
        height: 68,
        indicatorColor: isLight ? AppColors.tint : scheme.surfaceContainerHighest,
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
        ),
        // Luôn hiện nhãn: biểu tượng không kèm chữ là một câu đố với người cao tuổi.
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontFamily: AppFonts.body,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
            color: selected ? AppColors.primaryAction : AppColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 24,
            color: selected ? AppColors.primaryAction : AppColors.textMuted,
          );
        }),
      ),

      dividerTheme: DividerThemeData(
        color: isLight ? AppColors.border : scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: isLight ? AppColors.surface : scheme.surfaceContainerHigh,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.sheet)),
        ),
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: isLight ? AppColors.surface : scheme.surfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.cardLarge),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.textPrimary,
        contentTextStyle: const TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 15,
          color: Colors.white,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.field),
        ),
      ),

      listTileTheme: const ListTileThemeData(
        minVerticalPadding: 12,
        titleTextStyle: TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
        subtitleTextStyle: TextStyle(
          fontFamily: AppFonts.body,
          fontSize: 13,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }

  /// Thang chữ.
  ///
  /// `bodyMedium` để 15sp chứ không phải 14sp mặc định của Material: đó là cỡ nhỏ nhất mà bản
  /// thiết kế cho phép với nội dung người bệnh phải đọc.
  static TextTheme _textTheme(Color ink) {
    TextStyle body(double size, FontWeight weight, {Color? color, double? height}) => TextStyle(
          fontFamily: AppFonts.body,
          fontSize: size,
          fontWeight: weight,
          height: height,
          color: color ?? ink,
        );

    TextStyle display(double size, FontWeight weight, {Color? color}) => TextStyle(
          fontFamily: AppFonts.display,
          fontSize: size,
          fontWeight: weight,
          color: color ?? ink,
        );

    return TextTheme(
      // Nhóm display/headline dùng Sora: dành cho SỐ và mã.
      displayLarge: display(48, FontWeight.w800),
      displayMedium: display(38, FontWeight.w800),
      displaySmall: display(30, FontWeight.w800),
      headlineLarge: display(26, FontWeight.w800),
      headlineMedium: display(22, FontWeight.w700),
      headlineSmall: display(20, FontWeight.w700),

      // Nhóm title/body/label dùng Be Vietnam Pro: chữ đọc thành lời.
      titleLarge: body(20, FontWeight.w700),
      titleMedium: body(16, FontWeight.w700),
      titleSmall: body(15, FontWeight.w700),
      bodyLarge: body(16, FontWeight.w400, height: 1.45),
      bodyMedium: body(15, FontWeight.w400, height: 1.45),
      bodySmall: body(13, FontWeight.w400, color: AppColors.textSecondary, height: 1.4),
      labelLarge: body(15, FontWeight.w700),
      labelMedium: body(13, FontWeight.w600),
      labelSmall: body(12, FontWeight.w600, color: AppColors.textSecondary),
    );
  }
}
