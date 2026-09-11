import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/security/presentation/security_page.dart';
import '../error/failure.dart';
import 'app_lock.dart';
import 'device_integrity.dart';

final deviceIntegrityProvider = Provider<DeviceIntegrity>((ref) => const DeviceIntegrity());

/// Máy có dấu hiệu bị root/jailbreak không. Kiểm một lần cho cả phiên chạy.
final deviceCompromisedProvider = FutureProvider<bool>(
  (ref) => ref.watch(deviceIntegrityProvider).isCompromised(),
);

/// Phủ lên toàn app: màn khoá khi app bị tự khoá, và dải cảnh báo khi máy bị root/jailbreak.
///
/// Đặt ở đây chứ không ở từng màn để không màn nào lọt: một trang mới viết sau này tự động được bảo
/// vệ mà tác giả không phải nhớ gì cả.
class LockGate extends ConsumerWidget {
  const LockGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locked = ref.watch(appLockProvider);
    // `valueOrNull` chứ KHÔNG `value`: trên `AsyncError`, `.value` NÉM LẠI lỗi. `LockGate` bọc
    // TOÀN BỘ app, nên một lần mất mạng lúc mở app là màn trắng — không phải màn lỗi có nút thử
    // lại, mà trắng hẳn.
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final signedIn = auth is AuthSignedIn;

    // Chỉ khoá khi người dùng CÓ ĐƯỜNG MỞ LẠI.
    //
    // Không có PIN lẫn sinh trắc thì màn khoá chỉ còn đúng một lối thoát là đăng xuất — và người
    // bệnh gặp nó mỗi lần rời app quá hai phút. Đó không phải bảo mật, đó là bắt đăng nhập lại suốt
    // ngày, và nó đã xảy ra thật. Ở trường hợp đó thà không che: dữ liệu vẫn được màn khoá của hệ
    // điều hành và bước đăng nhập của app bảo vệ, còn màn Bảo mật thì vẫn mời đặt PIN.
    final canUnlock = signedIn && (auth.account.hasPin || auth.account.biometricEnabled);

    return Stack(
      children: [
        child,

        // Chưa đăng nhập thì không có gì để che: màn đăng nhập vốn đã không hiện dữ liệu y tế.
        if (locked && signedIn && canUnlock) const _LockScreen(),
      ],
    );
  }
}

class _LockScreen extends ConsumerStatefulWidget {
  const _LockScreen();

  @override
  ConsumerState<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<_LockScreen> {
  bool _busy = false;
  String? _error;
  final _pin = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Máy có sinh trắc thì hỏi luôn: người bệnh đang cầm máy trong tay, bắt họ bấm thêm một nút
    // trước khi chạm vân tay là thừa một nhịp ở đúng lúc họ chỉ muốn xem tiếp kết quả.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(authControllerProvider).valueOrNull case AuthSignedIn(:final account)
          when account.biometricEnabled) {
        _unlockWithBiometrics(silentOnFailure: true);
      }
    });
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  /// Mở khoá bằng mã PIN.
  ///
  /// Đường này từng KHÔNG được nối: `AuthRepository.verifyPin` có sẵn, endpoint `/auth/pin/verify`
  /// có sẵn, màn đặt PIN có sẵn — nhưng màn khoá chỉ mời sinh trắc, nên ai không dùng được sinh
  /// trắc thì mỗi lần tự khoá chỉ còn cách đăng xuất rồi đăng nhập lại.
  Future<void> _unlockWithPin() async {
    final pin = _pin.text.trim();
    if (pin.length < 4) {
      setState(() => _error = 'Vui lòng nhập mã PIN.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).verifyPin(pin);
      if (!mounted) return;
      ref.read(appLockProvider.notifier).unlock();
    } on Failure catch (e) {
      // Máy chủ khoá sau 5 lần sai; thông điệp của nó nói rõ điều đó nên đưa nguyên ra.
      setState(() => _error = e.message);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        _pin.clear();
      }
    }
  }

  Future<void> _unlockWithBiometrics({bool silentOnFailure = false}) async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final ok = await ref.read(biometricServiceProvider).verifyPresence();
      if (!mounted) return;
      if (ok) {
        ref.read(appLockProvider.notifier).unlock();
        return;
      }
      // Lần hỏi tự động lúc mở màn: người dùng huỷ hộp thoại vân tay là chuyện bình thường, đừng
      // chào họ bằng một dòng chữ đỏ — họ vẫn còn ô nhập PIN ngay bên dưới.
      if (!silentOnFailure) {
        setState(() => _error = 'Chưa xác thực được. Vui lòng thử lại.');
      }
    } on Exception {
      if (mounted && !silentOnFailure) {
        setState(() => _error = 'Thiết bị chưa bật vân tay hoặc khuôn mặt.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider).valueOrNull;
    final account = auth is AuthSignedIn ? auth.account : null;

    return Positioned.fill(
      child: Material(
        color: theme.colorScheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, size: 64, color: theme.colorScheme.primary),
                const SizedBox(height: 16),
                Text('Ứng dụng đã tự khoá', style: theme.textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  'Vì lý do bảo mật, ứng dụng tự khoá khi không dùng tới trong ít phút.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                ],

                const SizedBox(height: 24),

                if (account?.hasPin == true) ...[
                  TextField(
                    controller: _pin,
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    autofocus: account?.biometricEnabled != true,
                    textAlign: TextAlign.center,
                    onSubmitted: (_) => _busy ? null : _unlockWithPin(),
                    decoration: const InputDecoration(
                      labelText: 'Mã PIN',
                      counterText: '',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _busy ? null : _unlockWithPin,
                    child: const Text('Mở khoá'),
                  ),
                ],

                if (account?.biometricEnabled == true) ...[
                  const SizedBox(height: 8),
                  (account?.hasPin == true ? OutlinedButton.icon : FilledButton.icon)(
                    onPressed: _busy ? null : () => _unlockWithBiometrics(),
                    icon: const Icon(Icons.fingerprint),
                    label: const Text('Dùng vân tay / khuôn mặt'),
                  ),
                ],

                const SizedBox(height: 16),
                // Lối cuối, cố ý để nhạt: đăng xuất là mất phiên và phải nhập lại số điện thoại với
                // mật khẩu. Trước đây đây là lối DUY NHẤT, nên người bệnh nào không dùng được sinh
                // trắc thì cứ rời app quá hai phút là bị đá ra đăng nhập lại.
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          await ref.read(authControllerProvider.notifier).logout();
                          ref.read(appLockProvider.notifier).unlock();
                        },
                  child: Text(
                    'Đăng xuất',
                    style: TextStyle(color: theme.colorScheme.outline),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Dải cảnh báo máy đã bị root/jailbreak, hiện ở trang chủ.
class DeviceIntegrityBanner extends ConsumerWidget {
  const DeviceIntegrityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compromised = ref.watch(deviceCompromisedProvider).valueOrNull ?? false;
    if (!compromised) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.gpp_maybe_outlined, color: scheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Thiết bị của bạn có dấu hiệu đã được mở quyền quản trị (root/jailbreak). '
              'Ở trạng thái này, ứng dụng khác trên máy có thể đọc được dữ liệu sức khoẻ của bạn. '
              'Hãy cân nhắc dùng một thiết bị khác để xem kết quả khám.',
              style: TextStyle(color: scheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}
