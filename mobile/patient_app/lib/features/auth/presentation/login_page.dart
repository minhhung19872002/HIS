import 'package:flutter/material.dart';

/// Khung màn đăng nhập của Phase 0. Luồng thật (SĐT + mật khẩu, OTP, buộc đổi
/// mật khẩu lần đầu, PIN, sinh trắc học) được cài đặt ở Phase 1 —
/// `docs/features/patient-app/acceptance-matrix.md` mục I.2.2 và I.2.9.
class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Đăng nhập — sẽ hoàn thiện ở Phase 1')),
    );
  }
}
