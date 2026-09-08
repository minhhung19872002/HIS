import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import 'auth_controller.dart';
import 'widgets/auth_scaffold.dart';

/// Quên mật khẩu: xác minh bằng OTP gửi tới số điện thoại đã đăng ký, rồi đặt mật khẩu mới.
class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _info;
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in [_phone, _otp, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _resendIn = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _sendOtp() async {
    final phone = _phone.text.trim();
    if (phone.length < 9) {
      setState(() => _error = 'Vui lòng nhập số điện thoại trước khi lấy mã.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });

    try {
      await ref.read(authRepositoryProvider).requestOtp(
            phoneNumber: phone,
            purpose: 'reset_password',
          );
      setState(() {
        _otpSent = true;
        // Cố ý KHÔNG nói số này có tài khoản hay không — nếu nói, màn này thành công cụ
        // dò xem ai là bệnh nhân của bệnh viện.
        _info = 'Nếu số điện thoại đã đăng ký, mã xác thực sẽ được gửi tới.';
      });
      _startCountdown();
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).resetPassword(
            phoneNumber: _phone.text.trim(),
            otpCode: _otp.text.trim(),
            newPassword: _password.text,
          );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã đặt lại mật khẩu. Vui lòng đăng nhập.')),
      );
      context.pop();
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Quên mật khẩu',
      subtitle: 'Nhập số điện thoại đã đăng ký để nhận mã xác thực.',
      formKey: _formKey,
      busy: _busy,
      error: _error,
      info: _info,
      primaryLabel: 'Đặt lại mật khẩu',
      onPrimary: _otpSent ? _submit : null,
      children: [
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          enabled: !_otpSent,
          decoration: const InputDecoration(
            labelText: 'Số điện thoại',
            prefixIcon: Icon(Icons.phone_outlined),
          ),
          validator: (v) =>
              (v == null || v.trim().length < 9) ? 'Vui lòng nhập số điện thoại' : null,
        ),
        const SizedBox(height: 12),
        if (!_otpSent)
          FilledButton.tonal(
            onPressed: _busy ? null : _sendOtp,
            child: const Text('Lấy mã xác thực'),
          )
        else ...[
          TextFormField(
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(
              labelText: 'Mã xác thực (6 số)',
              prefixIcon: Icon(Icons.sms_outlined),
              counterText: '',
            ),
            validator: (v) =>
                (v == null || v.trim().length != 6) ? 'Mã xác thực gồm 6 chữ số' : null,
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: (_busy || _resendIn > 0) ? null : _sendOtp,
              child: Text(_resendIn > 0 ? 'Gửi lại mã sau $_resendIn giây' : 'Gửi lại mã'),
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu mới',
              helperText: 'Tối thiểu 8 ký tự',
              prefixIcon: Icon(Icons.lock_open_outlined),
            ),
            validator: (v) =>
                (v == null || v.length < 8) ? 'Mật khẩu phải có ít nhất 8 ký tự' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Nhập lại mật khẩu mới',
              prefixIcon: Icon(Icons.lock_reset_outlined),
            ),
            validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
          ),
        ],
      ],
    );
  }
}
