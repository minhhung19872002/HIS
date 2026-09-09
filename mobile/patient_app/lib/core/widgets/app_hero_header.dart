import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Đầu màn gradient, phần nội dung bên dưới là khối nền trang bo góc trên chồng lên.
///
/// Đây là hình khối đặc trưng nhất của bản thiết kế: dải màu thương hiệu ở trên, nội dung nằm
/// trong một "tờ giấy" bo góc 30 nhô lên che một phần dải màu. Gói lại ở đây để các màn không phải
/// tự xếp `Stack` — xếp tay thì mỗi màn lệch một ít, và chỗ giao nhau lộ ra đường hở.
///
/// [header] cuộn theo nội dung. Muốn header đứng yên thì bọc [child] bằng `CustomScrollView` của
/// riêng màn đó thay vì dùng widget này.
class AppHeroHeader extends StatelessWidget {
  const AppHeroHeader({
    super.key,
    required this.header,
    required this.child,
    this.gradient = AppGradients.heroHeader,
    this.headerPadding = const EdgeInsets.fromLTRB(26, 14, 26, 24),
    this.bodyPadding = const EdgeInsets.fromLTRB(
      AppSpacing.screen,
      AppSpacing.screen,
      AppSpacing.screen,
      26,
    ),
  });

  /// Nội dung trên nền gradient — chữ ở đây luôn màu trắng.
  final Widget header;

  /// Nội dung trong khối nền trang.
  final Widget child;

  final Gradient gradient;
  final EdgeInsetsGeometry headerPadding;
  final EdgeInsetsGeometry bodyPadding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLight = theme.brightness == Brightness.light;
    final bodyColor = isLight ? AppColors.pageBackground : theme.colorScheme.surface;

    return Container(
      decoration: BoxDecoration(gradient: gradient),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Chữ trên dải màu luôn trắng, kể cả ở dark mode: nền là gradient thương hiệu chứ
            // không phải bề mặt của chủ đề.
            DefaultTextStyle.merge(
              style: const TextStyle(color: Colors.white),
              child: IconTheme.merge(
                data: const IconThemeData(color: Colors.white),
                child: Padding(padding: headerPadding, child: header),
              ),
            ),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: bodyColor,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppRadii.sheet),
                  ),
                ),
                // `clipBehavior` để nội dung cuộn không tràn ra ngoài góc bo.
                clipBehavior: Clip.antiAlias,
                child: Padding(padding: bodyPadding, child: child),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
