import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/core/theme/app_theme.dart';
import 'package:patient_app/core/theme/app_tokens.dart';
import 'package:patient_app/core/widgets/widgets.dart';

/// Nút hành động chính phải NHÌN THẤY ĐƯỢC ở mọi chỗ đặt nó.
///
/// Bộ này canh một lỗi đã thật sự xảy ra và lọt tới tay chủ đầu tư: nút "Xác nhận" ở thanh đáy
/// màn đặt lịch **biến mất**, nên không ai lưu được lịch khám.
///
/// Nguyên nhân là `Ink`. `Ink` KHÔNG tự vẽ hình nền: nó gửi hình nền lên `Material` gần nhất phía
/// trên rồi để `Material` vẽ hộ. Thanh đáy lại là một `Container` nền trắng ĐỤC, còn `Material`
/// gần nhất là của `Scaffold` nằm DƯỚI nó — nên gradient bị che sạch.
///
/// Đây là kiểu lỗi tệ nhất để tìm: mã vẫn dịch, `analyze` vẫn sạch, mọi phép kiểm cũ vẫn xanh vì
/// nút vẫn NẰM TRONG cây widget và vẫn bấm được. Chỉ mắt người nhìn ảnh chụp mới thấy. Nên phép
/// kiểm ở đây không hỏi "nút có tồn tại không" mà hỏi **"ai vẽ hình nền của nút"**.
void main() {
  Future<void> pumpInside(WidgetTester tester, Widget wrapper) =>
      tester.pumpWidget(MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(body: Center(child: wrapper)),
      ));

  /// Có widget nào bên TRONG nút tự vẽ gradient không.
  Finder gradientPaintedBySelf() => find.descendant(
        of: find.byType(AppPrimaryButton),
        matching: find.byWidgetPredicate((w) {
          final decoration = switch (w) {
            Container(:final decoration) => decoration,
            DecoratedBox(:final decoration) => decoration,
            _ => null,
          };
          return decoration is BoxDecoration && decoration.gradient != null;
        }),
      );

  testWidgets('nút TỰ vẽ hình nền, không nhờ Material phía trên', (tester) async {
    await pumpInside(tester, const AppPrimaryButton(label: 'Xác nhận'));

    expect(gradientPaintedBySelf(), findsWidgets,
        reason: 'nút phải tự vẽ gradient; nhờ `Ink` là bị nền đục phía trên che mất');
  });

  testWidgets('vẫn thấy được khi nằm trong thanh đáy nền ĐỤC — đúng chỗ đã hỏng thật',
      (tester) async {
    // Dựng lại đúng hình dạng thanh đáy của màn đặt lịch và màn lấy số: một `Container` nền
    // trắng đục, KHÔNG phải `Material`, nằm giữa nút và `Material` của `Scaffold`.
    await pumpInside(
      tester,
      Container(
        color: AppColors.surface,
        padding: const EdgeInsets.all(16),
        child: const Row(
          children: [
            Expanded(child: Text('Đã chọn')),
            AppPrimaryButton(label: 'Xác nhận', expand: false),
          ],
        ),
      ),
    );

    expect(gradientPaintedBySelf(), findsWidgets,
        reason: 'đây chính là chỗ nút biến mất trên máy thật');
  });

  testWidgets('nút chiếm chỗ THẬT, không phải khối rỗng', (tester) async {
    await pumpInside(tester, const AppPrimaryButton(label: 'Xác nhận', expand: false));

    final size = tester.getSize(find.byType(AppPrimaryButton));
    expect(size.height, greaterThanOrEqualTo(AppSpacing.minTouchTarget),
        reason: 'cao ít nhất 48dp cho vùng chạm');
    expect(size.width, greaterThan(80), reason: 'phải đủ rộng để đọc được chữ');
  });

  testWidgets('khoá nút thì vẫn thấy khối màu, không biến mất', (tester) async {
    await pumpInside(tester, const AppPrimaryButton(label: 'Xác nhận', onPressed: null));

    // Nút khoá chỉ mờ đi; mất hẳn thì người dùng tưởng chức năng không tồn tại.
    expect(gradientPaintedBySelf(), findsWidgets);
    final opacity = tester.widget<Opacity>(
      find.descendant(of: find.byType(AppPrimaryButton), matching: find.byType(Opacity)).first,
    );
    expect(opacity.opacity, greaterThan(0.4));
  });
}
