import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error/failure.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/widgets/auth_scaffold.dart';

/// Đặt hoặc đổi mã PIN 6 số (HSMT I.2 #9 "tạo mã bảo mật").
class SetPinPage extends ConsumerStatefulWidget {
  const SetPinPage({super.key});

  @override
  ConsumerState<SetPinPage> createState() => _SetPinPageState();
}

class _SetPinPageState extends ConsumerState<SetPinPage> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _pin = TextEditingController();
  final _confirm = TextEditingController();

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_password, _pin, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Kiểm ngay trên máy những mã hiển nhiên yếu, để người dùng không phải chờ một vòng mạng mới
  /// biết bị từ chối. Server vẫn kiểm lại — đây chỉ là phép lịch sự, không phải lớp bảo vệ.
  String? _weakPinMessage(String pin) {
    if (pin.split('').toSet().length == 1) {
      return 'Mã PIN không nên gồm sáu chữ số giống nhau.';
    }
    var ascending = true;
    var descending = true;
    for (var i = 1; i < pin.length; i++) {
      if (pin.codeUnitAt(i) != pin.codeUnitAt(i - 1) + 1) ascending = false;
      if (pin.codeUnitAt(i) != pin.codeUnitAt(i - 1) - 1) descending = false;
    }
    if (ascending || descending) return 'Mã PIN không nên là dãy số liên tiếp.';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).setPin(
            password: _password.text,
            pin: _pin.text,
          );
      await ref.read(authControllerProvider.notifier).reload();

      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Đã đặt mã PIN.')));
      Navigator.of(context).pop();
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Mã PIN',
      subtitle: 'Mã PIN gồm 6 chữ số, dùng để mở nhanh ứng dụng và xem bệnh án.',
      formKey: _formKey,
      busy: _busy,
      error: _error,
      primaryLabel: 'Lưu mã PIN',
      onPrimary: _submit,
      children: [
        TextFormField(
          controller: _password,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Mật khẩu tài khoản',
            helperText: 'Xác nhận mật khẩu trước khi đặt mã PIN',
            prefixIcon: Icon(Icons.lock_outline),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Vui lòng nhập mật khẩu' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _pin,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Mã PIN mới (6 số)',
            prefixIcon: Icon(Icons.pin_outlined),
            counterText: '',
          ),
          validator: (v) {
            if (v == null || v.length != 6) return 'Mã PIN phải gồm đúng 6 chữ số';
            return _weakPinMessage(v);
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _confirm,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Nhập lại mã PIN',
            prefixIcon: Icon(Icons.pin_outlined),
            counterText: '',
          ),
          validator: (v) => v != _pin.text ? 'Mã PIN nhập lại không khớp' : null,
        ),
      ],
    );
  }
}
