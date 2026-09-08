import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/router/app_router.dart';
import 'auth_controller.dart';
import 'widgets/auth_scaffold.dart';

/// Đổi mật khẩu (HSMT I.2 #9).
///
/// Màn này có hai vai: người dùng chủ động đổi, và **bị buộc đổi ở lần đăng nhập đầu**. Ở vai thứ hai
/// không có nút quay lại — máy chủ cũng chặn mọi đường khác, nên quay lại cũng không đi được đâu.
class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key, this.forced = false});

  /// true khi máy chủ đang buộc đổi mật khẩu.
  final bool forced;

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_current, _next, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(authControllerProvider.notifier).changePassword(
            currentPassword: _current.text,
            newPassword: _next.text,
          );

      final state = ref.read(authControllerProvider);
      if (state.hasError) {
        setState(() => _error = state.error is Failure
            ? (state.error! as Failure).message
            : 'Không đổi được mật khẩu. Vui lòng thử lại.');
        return;
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Đã đổi mật khẩu.')));
      context.go(AppRoutes.home);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Buộc đổi thì không cho thoát bằng nút back của máy.
      canPop: !widget.forced,
      child: AuthScaffold(
        title: widget.forced ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu',
        subtitle: widget.forced
            ? 'Mật khẩu hiện tại do bệnh viện cấp. Vui lòng đặt mật khẩu riêng của bạn trước khi '
                'sử dụng ứng dụng.'
            : null,
        formKey: _formKey,
        busy: _busy,
        error: _error,
        primaryLabel: 'Đổi mật khẩu',
        onPrimary: _submit,
        children: [
          TextFormField(
            controller: _current,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu hiện tại',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            validator: (v) =>
                (v == null || v.isEmpty) ? 'Vui lòng nhập mật khẩu hiện tại' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _next,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu mới',
              helperText: 'Tối thiểu 8 ký tự',
              prefixIcon: Icon(Icons.lock_open_outlined),
            ),
            validator: (v) {
              if (v == null || v.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
              if (v == _current.text) return 'Mật khẩu mới phải khác mật khẩu hiện tại';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Nhập lại mật khẩu mới',
              prefixIcon: Icon(Icons.lock_reset_outlined),
            ),
            validator: (v) => v != _next.text ? 'Mật khẩu nhập lại không khớp' : null,
          ),
        ],
      ),
    );
  }
}
