import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/notifications/data/push_registration.dart';
import 'package:patient_app/features/notifications/data/push_service.dart';

import 'support/fake_push_source.dart';

/// Token FCM có thật sự lên tới máy chủ không.
///
/// Bài kiểm này canh đúng chỗ đã hỏng suốt một thời gian mà không ai thấy: máy chủ chỉ xếp hàng đẩy
/// cho thiết bị có `PushToken`, còn app thì **không bao giờ gửi token lên**. Cả đường ống outbox →
/// relay → FCM phía máy chủ chạy đúng, có phép kiểm riêng, và chạy trên một hàng đợi vĩnh viễn
/// rỗng. Không có lỗi nào để mà thấy — chỉ là không người bệnh nào nhận được thông báo.
///
/// Lỗi kiểu đó chỉ lộ ra khi có một bài kiểm đi hết đường từ "đăng nhập xong" tới "máy chủ nhận
/// được token", nên bài kiểm ở đây cố ý không dừng ở mức gọi hàm: nó kiểm cả đường HTTP thật sự đi
/// ra, đúng phương thức, đúng đường dẫn, đúng phần thân.
void main() {
  group('PushRegistration', () {
    test('đăng nhập xong → token được gửi lên máy chủ', () async {
      final sent = <String?>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = _build(source, sent);

      await registration.register();

      expect(sent, ['token-fcm-1'],
          reason: 'không gửi token thì máy chủ không có gì để đẩy tới máy này');
    });

    test('chưa cấu hình Firebase (token null) → KHÔNG gửi null lên', () async {
      final sent = <String?>[];
      final source = FakePushSource(token: null);
      final registration = _build(source, sent);

      await registration.register();

      expect(sent, isEmpty,
          reason: 'gửi null sẽ xoá mất token đang dùng được, biến máy đang nhận tốt thành máy câm');
    });

    test('register() luôn khởi tạo Firebase trước khi hỏi token', () async {
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = _build(source, <String?>[]);

      await registration.register();

      expect(source.initializeCount, 1,
          reason: 'bootstrap khởi tạo ngầm; đăng nhập có thể xảy ra trước khi việc đó xong');
    });

    test('FCM xoay token → token mới được gửi lên', () async {
      final sent = <String?>[];
      final source = FakePushSource(token: 'token-cu');
      final registration = _build(source, sent);

      registration.start();
      await registration.register();
      source.emitTokenRefresh('token-moi');
      await Future<void>.delayed(Duration.zero);

      expect(sent, ['token-cu', 'token-moi'],
          reason: 'không theo token xoay vòng thì người bệnh im lặng ngừng nhận thông báo');
    });

    test('token không đổi → không gọi lại API', () async {
      final sent = <String?>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = _build(source, sent);

      await registration.register();
      await registration.register();

      expect(sent, ['token-fcm-1'], reason: 'mỗi lần mở app không nên đẻ thêm một lời gọi thừa');
    });

    test('máy chủ lỗi lúc gửi token → không ném ra ngoài, lần sau gửi lại', () async {
      final sent = <String?>[];
      var failNext = true;
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = PushRegistration(
        source: source,
        sendToken: (token) async {
          if (failNext) {
            failNext = false;
            throw Exception('máy chủ 500');
          }
          sent.add(token);
        },
        navigate: (_) {},
      );

      await registration.register();
      expect(sent, isEmpty);

      await registration.register();
      expect(sent, ['token-fcm-1'],
          reason: 'gửi hỏng không được ghi nhận là đã gửi, nếu không sẽ không bao giờ thử lại');
    });

    test('Firebase hỏng lúc khởi tạo → không ném ra ngoài', () async {
      final registration = _build(FakePushSource(failOnInitialize: true), <String?>[]);

      // Nơi gọi là trình nghe trạng thái đăng nhập, không await — lỗi lọt ra sẽ thành lỗi async
      // không ai bắt. Thông báo đẩy hỏng không được phép chặn người bệnh xem kết quả.
      await expectLater(registration.register(), completes);
    });

    test('đăng xuất rồi đăng nhập lại → gửi token lần nữa', () async {
      final sent = <String?>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = _build(source, sent);

      await registration.register();
      registration.forgetLastSent();
      await registration.register();

      expect(sent, ['token-fcm-1', 'token-fcm-1'],
          reason: 'máy chủ có thể đã thu hồi thiết bị lúc đăng xuất');
    });
  });

  group('PushRegistration — deep-link', () {
    test('chạm vào thông báo → mở đúng màn', () async {
      final routes = <String>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = PushRegistration(
        source: source,
        sendToken: (_) async {},
        navigate: routes.add,
      );

      registration.start();
      source.emitDeepLink('/appointments');
      await Future<void>.delayed(Duration.zero);

      expect(routes, ['/appointments']);
    });

    test('deep-link trỏ ra ngoài app → bỏ qua', () async {
      final routes = <String>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = PushRegistration(
        source: source,
        sendToken: (_) async {},
        navigate: routes.add,
      );

      registration.start();
      for (final xau in ['https://vi-du.test/lua-dao', '//vi-du.test', 'javascript:x', '']) {
        source.emitDeepLink(xau);
      }
      await Future<void>.delayed(Duration.zero);

      expect(routes, isEmpty,
          reason: 'máy chủ bệnh viện chỉ phát ra đường dẫn trong app; thứ khác là thứ khác nói');
    });

    test('dispose() → thôi nghe, không điều hướng nữa', () async {
      final routes = <String>[];
      final source = FakePushSource(token: 'token-fcm-1');
      final registration = PushRegistration(
        source: source,
        sendToken: (_) async {},
        navigate: routes.add,
      );

      registration.start();
      await registration.dispose();
      source.emitDeepLink('/appointments');
      await Future<void>.delayed(Duration.zero);

      expect(routes, isEmpty);
    });
  });

  group('PushTokenRegistrar', () {
    test('gửi đúng PUT /patient/devices/push-token kèm token', () async {
      final requests = <RequestOptions>[];
      final dio = Dio(BaseOptions(baseUrl: 'https://vi-du.test/api/v1'));
      dio.httpClientAdapter = _StubAdapter(requests);

      await PushTokenRegistrar(dio).update('token-fcm-1');

      expect(requests, hasLength(1));
      expect(requests.single.method, 'PUT');
      // Đường dẫn phải khớp `[Route("api/v1/patient/devices")] + [HttpPut("push-token")]` của
      // `DevicesController`. Lệch một chữ là 404 im lặng — `update` nuốt lỗi để không chặn người dùng.
      expect(requests.single.uri.path, '/api/v1/patient/devices/push-token');
      expect(requests.single.data, {'pushToken': 'token-fcm-1'});
    });

    test('máy chủ trả lỗi → nuốt lỗi, không chặn luồng đăng nhập', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://vi-du.test/api/v1'));
      dio.httpClientAdapter = _StubAdapter(<RequestOptions>[], statusCode: 500);

      await expectLater(PushTokenRegistrar(dio).update('token-fcm-1'), completes);
    });
  });
}

PushRegistration _build(FakePushSource source, List<String?> sent) => PushRegistration(
      source: source,
      sendToken: (token) async => sent.add(token),
      navigate: (_) {},
    );

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.captured, {this.statusCode = 200});

  final List<RequestOptions> captured;
  final int statusCode;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream,
      Future<void>? cancelFuture) async {
    captured.add(options);
    return ResponseBody.fromString(
      '{"success":true}',
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
