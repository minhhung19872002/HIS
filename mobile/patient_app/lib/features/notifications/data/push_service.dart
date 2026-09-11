import 'dart:async';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Xử lý thông báo khi app đang chạy ngầm hoặc đã tắt hẳn (HSMT I.2 #2).
///
/// Phải là hàm cấp cao nhất và có `@pragma('vm:entry-point')`: Flutter khởi động một isolate riêng
/// để chạy nó, isolate đó không thấy được gì từ trạng thái của app.
///
/// Cố ý KHÔNG gọi API hay đụng vào dữ liệu y tế ở đây — chỉ để hệ điều hành hiện thông báo. Nội dung
/// thật được lấy khi người dùng mở app.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  // Không làm gì thêm: hệ điều hành đã tự hiện phần `notification` của thông điệp.
  debugPrint('[push] nhận thông báo nền: ${message.messageId}');
}

/// Những gì phần nối-với-máy-chủ cần biết về thông báo đẩy.
///
/// Tách ra thành giao diện riêng để bộ kiểm dựng được bản giả: `PushService` thật đụng tới Firebase,
/// mà Firebase không khởi tạo được trong `flutter test`. Không có lớp tách này thì đường "token có
/// thật sự lên tới máy chủ không" là đường không kiểm được — và đó đúng là đường đã hỏng suốt một
/// thời gian mà 749 phép kiểm không ai thấy.
abstract class PushTokenSource {
  /// Khởi tạo đúng một lần, gọi bao nhiêu lần cũng được.
  Future<void> ensureInitialized();

  /// Token FCM của máy này, null nếu chưa cấu hình Firebase hoặc người dùng từ chối quyền.
  Future<String?> token();

  /// FCM xoay token định kỳ.
  Stream<String> get tokenRefreshes;

  /// Deep-link phát ra khi người dùng chạm vào thông báo.
  Stream<String> get deepLinks;
}

/// Bọc Firebase Messaging.
///
/// Toàn bộ được viết để **app vẫn chạy bình thường khi chưa cấu hình Firebase**: trên máy phát triển
/// chưa có `google-services.json` / `GoogleService-Info.plist`, và một app y tế không được phép chết
/// ở màn khởi động chỉ vì thiếu tệp cấu hình thông báo.
class PushService implements PushTokenSource {
  PushService({FirebaseMessaging? messaging, FlutterLocalNotificationsPlugin? localNotifications})
      : _localNotifications = localNotifications ?? FlutterLocalNotificationsPlugin();

  FirebaseMessaging? _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications;

  bool _available = false;

  /// Firebase đã sẵn sàng chưa. False = app chạy không có thông báo đẩy.
  bool get isAvailable => _available;

  /// Phát ra deep-link khi người dùng chạm vào thông báo.
  final _deepLinks = StreamController<String>.broadcast();
  @override
  Stream<String> get deepLinks => _deepLinks.stream;

  Future<void>? _initialization;

  /// Khởi tạo một lần duy nhất dù bị gọi từ nhiều nơi.
  ///
  /// `bootstrap` gọi lúc mở app, còn phần đăng ký token gọi lại lúc đăng nhập xong — nếu mỗi lần gọi
  /// lại dựng lại Firebase thì trình nghe `onMessage` bị gắn chồng và một thông báo hiện hai lần.
  @override
  Future<void> ensureInitialized() => _initialization ??= initialize();

  static const _androidChannel = AndroidNotificationChannel(
    'his_patient_app_default',
    'Thông báo bệnh viện',
    description: 'Kết quả khám, lịch hẹn, số thứ tự và thông báo từ bệnh viện.',
    importance: Importance.high,
  );

  Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      _messaging = FirebaseMessaging.instance;
      _available = true;
    } catch (error) {
      // Thiếu tệp cấu hình Firebase là chuyện bình thường ở máy phát triển. Ghi log rồi đi tiếp.
      debugPrint('[push] chưa cấu hình Firebase, tắt thông báo đẩy: $error');
      _available = false;
      return;
    }

    await _setupLocalNotifications();

    // Android 13+ và iOS đều cần người dùng đồng ý mới được gửi thông báo.
    await _messaging!.requestPermission(alert: true, badge: true, sound: true);

    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);

    // App đang mở thì hệ điều hành không tự hiện thông báo — phải tự hiện.
    FirebaseMessaging.onMessage.listen(_showForeground);

    // Người dùng chạm vào thông báo lúc app đang chạy ngầm.
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);

    // Người dùng chạm vào thông báo lúc app đã tắt hẳn — thông điệp đó chờ sẵn ở đây.
    final initialMessage = await _messaging!.getInitialMessage();
    if (initialMessage != null) _handleTap(initialMessage);
  }

  Future<void> _setupLocalNotifications() async {
    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) _deepLinks.add(payload);
      },
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);
  }

  Future<void> _showForeground(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: message.data['deepLink'] as String?,
    );
  }

  void _handleTap(RemoteMessage message) {
    final deepLink = message.data['deepLink'] as String?;
    if (deepLink != null && deepLink.isNotEmpty) _deepLinks.add(deepLink);
  }

  /// Token FCM của máy này, null nếu Firebase chưa sẵn sàng hoặc người dùng từ chối quyền.
  @override
  Future<String?> token() async {
    if (!_available) return null;
    try {
      return await _messaging!.getToken();
    } catch (error) {
      debugPrint('[push] không lấy được token: $error');
      return null;
    }
  }

  /// FCM xoay token định kỳ; không cập nhật lên server thì người bệnh im lặng ngừng nhận thông báo.
  @override
  Stream<String> get tokenRefreshes =>
      _available ? _messaging!.onTokenRefresh : const Stream<String>.empty();

  void dispose() => _deepLinks.close();
}

/// Đẩy token mới lên server.
class PushTokenRegistrar {
  PushTokenRegistrar(this._client);
  final Dio _client;

  Future<void> update(String? token) async {
    try {
      await _client.put<Map<String, dynamic>>(
        '/patient/devices/push-token',
        data: {'pushToken': token},
      );
    } on DioException catch (error) {
      // Không chặn luồng người dùng vì việc này: cùng lắm là chưa nhận được thông báo, và lần
      // đăng nhập sau sẽ gửi lại token.
      debugPrint('[push] không cập nhật được token lên máy chủ: ${error.message}');
    }
  }
}
