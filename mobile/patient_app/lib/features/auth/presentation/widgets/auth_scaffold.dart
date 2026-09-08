import 'package:flutter/material.dart';

/// Khung dùng chung cho các màn xác thực: tiêu đề, form, khối báo lỗi/thông báo, nút chính.
///
/// Gom lại một chỗ để các màn đăng ký / quên mật khẩu / đổi mật khẩu trông và cư xử giống nhau,
/// thay vì mỗi màn tự dựng một kiểu.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.formKey,
    required this.children,
    required this.primaryLabel,
    required this.onPrimary,
    this.busy = false,
    this.error,
    this.info,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final GlobalKey<FormState> formKey;
  final List<Widget> children;
  final String primaryLabel;

  /// null = nút chính bị vô hiệu hoá (ví dụ chưa gửi mã xác thực).
  final VoidCallback? onPrimary;

  final bool busy;
  final String? error;
  final String? info;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (subtitle != null) ...[
                      Text(subtitle!, style: theme.textTheme.bodyMedium),
                      const SizedBox(height: 20),
                    ],
                    ...children,
                    if (info != null) ...[
                      const SizedBox(height: 16),
                      _Banner(message: info!, isError: false),
                    ],
                    if (error != null) ...[
                      const SizedBox(height: 16),
                      _Banner(message: error!, isError: true),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: (busy || onPrimary == null) ? null : onPrimary,
                      child: busy
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(primaryLabel),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = isError ? scheme.errorContainer : scheme.secondaryContainer;
    final foreground = isError ? scheme.onErrorContainer : scheme.onSecondaryContainer;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(8)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(isError ? Icons.error_outline : Icons.info_outline, color: foreground),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: TextStyle(color: foreground))),
        ],
      ),
    );
  }
}
