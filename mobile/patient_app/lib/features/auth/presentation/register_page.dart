import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/router/app_router.dart';
import 'auth_controller.dart';
import 'widgets/auth_scaffold.dart';

/// Đăng ký tài khoản: số điện thoại → mã OTP → mật khẩu.
///
/// Ô "mã bệnh nhân" là tuỳ chọn: người chưa từng khám ở đây vẫn đăng ký được rồi liên kết hồ sơ sau.
/// Nếu có nhập, máy chủ bắt buộc số điện thoại trên hồ sơ phải khớp — mã bệnh nhân in ngay trên giấy
/// tờ nên không phải là bí mật đủ để tự nó cho quyền xem bệnh án.
class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _fullName = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _patientCode = TextEditingController();

  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _info;

  /// Đếm ngược cho nút gửi lại mã, để người dùng không bấm liên tục rồi bị chặn tần suất.
  int _resendIn = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _resendTimer?.cancel();
    for (final c in [_phone, _otp, _fullName, _password, _confirm, _patientCode]) {
      c.dispose();
    }
    super.dispose();
  }

  void _startResendCountdown() {
    _resendTimer?.cancel();
    setState(() => _resendIn = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) timer.cancel();
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
            purpose: 'register',
          );
      setState(() {
        _otpSent = true;
        _info = 'Đã gửi mã xác thực tới số $phone.';
      });
      _startResendCountdown();
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
      await ref.read(authControllerProvider.notifier).register(
            phoneNumber: _phone.text.trim(),
            otpCode: _otp.text.trim(),
            password: _password.text,
            fullName: _fullName.text.trim(),
            patientCode: _patientCode.text.trim(),
          );

      final state = ref.read(authControllerProvider);
      if (state.hasError) {
        setState(() => _error = state.error is Failure
            ? (state.error! as Failure).message
            : 'Đăng ký không thành công. Vui lòng thử lại.');
        return;
      }
      if (mounted) context.go(AppRoutes.home);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Đăng ký tài khoản',
      formKey: _formKey,
      error: _error,
      info: _info,
      busy: _busy,
      primaryLabel: 'Tạo tài khoản',
      onPrimary: _otpSent ? _submit : null,
      children: [
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          enabled: !_otpSent,
          decoration: const InputDecoration(
            labelText: 'Số điện thoại',
            hintText: '09xx xxx xxx',
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
            controller: _fullName,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Họ và tên',
              prefixIcon: Icon(Icons.person_outline),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu',
              helperText: 'Tối thiểu 8 ký tự',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            validator: (v) =>
                (v == null || v.length < 8) ? 'Mật khẩu phải có ít nhất 8 ký tự' : null,
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Nhập lại mật khẩu',
              prefixIcon: Icon(Icons.lock_reset_outlined),
            ),
            validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _patientCode,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Mã bệnh nhân (không bắt buộc)',
              helperText: 'In trên thẻ khám bệnh. Có mã thì hồ sơ được liên kết ngay.',
              helperMaxLines: 2,
              prefixIcon: Icon(Icons.badge_outlined),
            ),
          ),
        ],
      ],
    );
  }
}
