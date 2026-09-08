import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Tự khoá app sau một khoảng không dùng tới — HSMT I.2 #9.
///
/// <b>Đếm theo thời gian ở nền, không đếm theo thao tác.</b> Người bệnh mở app đọc kết quả xét
/// nghiệm rồi để đó cả buổi là chuyện thường; cái đáng chặn là *đưa máy cho người khác* hoặc *để
/// quên máy*. Cả hai đều biểu hiện là app rời tiền cảnh rồi quay lại sau một lúc lâu.
///
/// Khoá ở đây chỉ là lớp che của giao diện. Nó không thay thế token: token vẫn sống, và phía máy chủ
/// vẫn là nơi quyết định phiên còn hiệu lực hay không.
class AppLock extends Notifier<bool> with WidgetsBindingObserver {
  /// [clock] chỉ để kiểm thử tua nhanh hai phút — chạy thật thì luôn là đồng hồ máy.
  AppLock({DateTime Function()? clock}) : _now = clock ?? DateTime.now;

  final DateTime Function() _now;

  /// Rời tiền cảnh quá lâu thì phải mở khoá lại. Hai phút: đủ dài để nghe một cuộc gọi hay chụp một
  /// tấm ảnh rồi quay lại, đủ ngắn để máy bỏ quên trên bàn không mở ra đọc được.
  static const idleTimeout = Duration(minutes: 2);

  DateTime? _leftForegroundAt;

  @override
  bool build() {
    WidgetsBinding.instance.addObserver(this);
    ref.onDispose(() => WidgetsBinding.instance.removeObserver(this));
    return false;
  }

  /// true khi giao diện đang bị khoá và cần mở lại bằng PIN hoặc sinh trắc.
  bool get isLocked => state;

  void unlock() {
    state = false;
    _leftForegroundAt = null;
  }

  /// Khoá ngay, không đợi hết thời gian chờ — dùng cho nút "Khoá app" của người dùng.
  void lockNow() => state = true;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        _leftForegroundAt ??= _now();

      case AppLifecycleState.resumed:
        final leftAt = _leftForegroundAt;
        _leftForegroundAt = null;

        if (leftAt != null && _now().difference(leftAt) >= idleTimeout) {
          lockNow();
        }

      case AppLifecycleState.inactive:
        // Trạng thái thoáng qua (kéo trung tâm điều khiển, hiện hộp thoại hệ thống). Không tính là
        // rời tiền cảnh, nếu không app sẽ khoá cả khi người dùng chỉ kéo thanh thông báo.
        break;
    }
  }
}

final appLockProvider = NotifierProvider<AppLock, bool>(AppLock.new);
