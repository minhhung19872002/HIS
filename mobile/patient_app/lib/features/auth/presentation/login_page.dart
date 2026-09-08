import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error/failure.dart';
import '../../../core/router/app_router.dart';
import '../../security/presentation/security_page.dart';
import 'auth_controller.dart';

/// Đăng nhập bằng số điện thoại + mật khẩu (HSMT I.2 #2).
///
/// Cỡ chữ và vùng chạm lớn hơn mặc định vì người dùng chính là người bệnh, trong đó có nhiều người
/// cao tuổi.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();

  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(authControllerProvider.notifier).login(
            phoneNumber: _phone.text.trim(),
            password: _password.text,
          );

      final state = ref.read(authControllerProvider);
      // AsyncValue.guard nuốt lỗi vào state, nên phải đọc lại để biết có thật sự vào được không.
      if (state.hasError) {
        setState(() => _error = _messageOf(state.error!));
        return;
      }
      if (mounted) context.go(AppRoutes.home);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _messageOf(Object error) =>
      error is Failure ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';

  /// Đăng nhập bằng vân tay / khuôn mặt (HSMT I.2 #9).
  ///
  /// Ba bước: xin chuỗi thử thách từ server → ký bằng khoá riêng (chỉ mở được sau khi quét) →
  /// gửi chữ ký lên. Server kiểm chữ ký chứ không tin lời app nói là đã xác thực xong.
  Future<void> _biometricLogin() async {
    final phone = _phone.text.trim();
    if (phone.length < 9) {
      setState(() => _error = 'Vui lòng nhập số điện thoại để đăng nhập bằng sinh trắc học.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      final deviceKey = await repo.currentDeviceKey();
      final challenge = await repo.biometricChallenge(phoneNumber: phone, deviceKey: deviceKey);

      final signature = await ref.read(biometricServiceProvider).sign(challenge.nonce);
      if (signature == null) {
        // Người dùng huỷ hoặc quét không nhận — không phải lỗi, đừng doạ họ bằng thông báo đỏ.
        return;
      }

      await repo.biometricLogin(
        phoneNumber: phone,
        deviceKey: deviceKey,
        challengeId: challenge.challengeId,
        signature: signature,
      );
      await ref.read(authControllerProvider.notifier).reload();

      if (mounted) context.go(AppRoutes.home);
    } on Failure catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(Icons.local_hospital_outlined,
                        size: 64, color: theme.colorScheme.primary),
                    const SizedBox(height: 16),
                    Text('Hỗ trợ người bệnh',
                        textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text('Đăng nhập để xem kết quả khám, lấy số thứ tự và đặt lịch khám.',
                        textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 32),

                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(
                        labelText: 'Số điện thoại',
                        hintText: '09xx xxx xxx',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      validator: (value) => (value == null || value.trim().length < 9)
                          ? 'Vui lòng nhập số điện thoại'
                          : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                          tooltip: _obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (value) => (value == null || value.isEmpty)
                          ? 'Vui lòng nhập mật khẩu'
                          : null,
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      _ErrorBanner(message: _error!),
                    ],

                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Đăng nhập'),
                    ),
                    const SizedBox(height: 12),

                    // Chỉ hiện nút sinh trắc khi máy thật sự dùng được — hiện một nút bấm vào là
                    // báo lỗi thì tệ hơn là không hiện.
                    ref.watch(biometricStatusProvider).maybeWhen(
                          data: (status) => status.isAvailable
                              ? OutlinedButton.icon(
                                  onPressed: _busy ? null : _biometricLogin,
                                  icon: const Icon(Icons.fingerprint),
                                  label: const Text('Đăng nhập bằng vân tay / khuôn mặt'),
                                )
                              : const SizedBox.shrink(),
                          orElse: () => const SizedBox.shrink(),
                        ),

                    TextButton(
                      onPressed: _busy ? null : () => context.push(AppRoutes.forgotPassword),
                      child: const Text('Quên mật khẩu?'),
                    ),
                    const Divider(height: 32),
                    OutlinedButton(
                      onPressed: _busy ? null : () => context.push(AppRoutes.register),
                      child: const Text('Đăng ký tài khoản mới'),
                    ),
                    // Lối vào module tra cứu của nhân viên (HSMT I.3 #2.2). Để chữ nhỏ ở cuối màn:
                    // người bệnh không cần tới nó, còn nhân viên thì biết mình đang tìm gì.
                    TextButton(
                      onPressed: _busy ? null : () => context.push(AppRoutes.staffLookup),
                      child: const Text('Dành cho nhân viên bệnh viện'),
                    ),
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

/// Khối báo lỗi dùng chung cho các màn xác thực.
class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(message, style: TextStyle(color: scheme.onErrorContainer)),
          ),
        ],
      ),
    );
  }
}
