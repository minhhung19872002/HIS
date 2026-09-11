import 'dart:async';

import 'package:flutter/foundation.dart';

import 'push_service.dart';

/// Nối thông báo đẩy với máy chủ và với bộ định tuyến.
///
/// **Vì sao lớp này phải tồn tại.** Máy chủ chỉ xếp hàng đẩy cho những thiết bị có `PushToken`
/// (`NotificationService.CreateAsync` lọc `d.PushToken != null`). Trước đây app không bao giờ gửi
/// token lên: `PushTokenRegistrar` có nhưng không ai gọi, `PushService.token()` không ai đọc. Kết
/// quả là toàn bộ đường ống outbox → relay → FCM chạy đúng trên một hàng đợi **vĩnh viễn rỗng** —
/// không người bệnh nào nhận được một thông báo đẩy nào, mà cũng không có lỗi nào để mà thấy.
///
/// Lớp này gom ba việc từng bị bỏ trống vào một chỗ, để lần sau có hỏng thì hỏng ở chỗ nhìn thấy
/// được và có phép kiểm canh:
/// 1. đăng nhập xong → gửi token hiện tại lên máy chủ;
/// 2. FCM xoay token → gửi token mới (không thì người bệnh im lặng ngừng nhận thông báo);
/// 3. chạm vào thông báo → mở đúng màn.
class PushRegistration {
  PushRegistration({
    required PushTokenSource source,
    required Future<void> Function(String? token) sendToken,
    required void Function(String route) navigate,
  })  : _source = source,
        _sendToken = sendToken,
        _navigate = navigate;

  final PushTokenSource _source;
  final Future<void> Function(String? token) _sendToken;
  final void Function(String route) _navigate;

  StreamSubscription<String>? _refreshSub;
  StreamSubscription<String>? _deepLinkSub;

  /// Token đã gửi lên máy chủ gần nhất — để khỏi gọi lại API mỗi lần mở app.
  String? _lastSent;

  /// Bắt đầu nghe token xoay vòng và deep-link. Gọi lại nhiều lần cũng chỉ đăng ký một lần.
  void start() {
    _refreshSub ??= _source.tokenRefreshes.listen(_send);
    _deepLinkSub ??= _source.deepLinks.listen(_openRoute);
  }

  /// Gửi token của máy này lên máy chủ. Gọi mỗi khi tài khoản vừa đăng nhập — kể cả phiên cũ được
  /// dùng lại lúc mở app, vì thiết bị có thể đã bị thu hồi hoặc token đã đổi trong lúc app tắt.
  Future<void> register() async {
    // Bắt hết ở đây vì nơi gọi là một trình nghe trạng thái đăng nhập, không await kết quả: một lỗi
    // lọt ra sẽ thành lỗi async không ai bắt, và người bệnh nhận một màn đỏ chỉ vì không đăng ký
    // được thông báo đẩy. Thông báo đẩy hỏng không đáng để chặn ai xem kết quả xét nghiệm.
    try {
      await _source.ensureInitialized();
      final token = await _source.token();

      // Chưa cấu hình Firebase thì `token` là null. Không gửi null lên: sẽ xoá mất token đang dùng
      // được của chính thiết bị này, biến một máy đang nhận thông báo tốt thành máy câm.
      if (token == null || token.isEmpty) return;

      await _send(token);
    } catch (error) {
      debugPrint('[push] không đăng ký được thông báo đẩy: $error');
    }
  }

  Future<void> _send(String token) async {
    if (token == _lastSent) return;
    try {
      await _sendToken(token);
      _lastSent = token;
    } catch (error) {
      // Không chặn luồng người dùng: cùng lắm là chưa nhận được thông báo, và lần đăng nhập sau
      // hoặc lần xoay token sau sẽ gửi lại.
      debugPrint('[push] không gửi được token lên máy chủ: $error');
    }
  }

  /// Quên token đã gửi. Gọi khi đăng xuất, để lần đăng nhập sau gửi lại thay vì tưởng đã gửi rồi.
  void forgetLastSent() => _lastSent = null;

  void _openRoute(String deepLink) {
    if (!isInAppRoute(deepLink)) {
      // Máy chủ chỉ phát ra đường dẫn trong app. Một giá trị khác kiểu đó nghĩa là có thứ gì đó
      // không phải máy chủ của bệnh viện đang nói chuyện với app — mở nó ra là chuyện khác hẳn.
      debugPrint('[push] bỏ qua deep-link không hợp lệ: $deepLink');
      return;
    }
    _navigate(deepLink);
  }

  /// Deep-link có phải một đường dẫn trong app không.
  ///
  /// Phải bắt đầu bằng đúng một dấu `/`: `//ten-mien-khac` là đường dẫn theo giao thức hiện hành,
  /// còn `https://…` là trang ngoài — cả hai đều không phải màn của app này.
  static bool isInAppRoute(String value) =>
      value.startsWith('/') && !value.startsWith('//');

  Future<void> dispose() async {
    await _refreshSub?.cancel();
    await _deepLinkSub?.cancel();
    _refreshSub = null;
    _deepLinkSub = null;
  }
}
