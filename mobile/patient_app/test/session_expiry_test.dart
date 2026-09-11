import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/core/config/app_flavor.dart';
import 'package:patient_app/core/providers.dart';
import 'package:patient_app/features/auth/presentation/auth_controller.dart';

/// Phiên bị máy chủ thu hồi thì app phải về màn đăng nhập, không được kẹt lại.
///
/// <b>Lỗi đã có thật:</b> `AuthInterceptor` xoá token rồi gọi `onSessionExpired`, mà hàm đó chỉ bật
/// một cờ **không ai đọc** — chú thích của cờ ghi "router lắng nghe" nhưng router lắng nghe
/// `authControllerProvider`, không phải cờ này. Hệ quả: token mất, trạng thái vẫn là "đã đăng nhập",
/// app ở nguyên trong màn trong và mọi lời gọi sau đó hỏng. Người bệnh thấy app đơ, tắt đi mở lại
/// mới ra màn đăng nhập — và kể lại thành "app hay bị out ra, bắt đăng nhập lại hoài".
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  late Map<String, String> stored;

  setUp(() {
    // Có access token nhưng KHÔNG có refresh token: đúng tình huống máy chủ đã thu hồi phiên —
    // `_doRefresh` kết luận `expired` ngay, không cần gọi mạng.
    stored = {'access_token': 'token-cu'};
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      final args = (call.arguments as Map?)?.cast<String, dynamic>() ?? {};
      final key = args['key'] as String?;
      switch (call.method) {
        case 'read':
          return stored[key];
        case 'write':
          stored[key!] = args['value'] as String;
          return null;
        case 'delete':
          stored.remove(key);
          return null;
        case 'deleteAll':
          stored.clear();
          return null;
        case 'readAll':
          return stored;
        default:
          return null;
      }
    });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('máy chủ thu hồi phiên → trạng thái chuyển về CHƯA đăng nhập', () async {
    final container = ProviderContainer(
      overrides: [appConfigProvider.overrideWithValue(AppConfig.dev)],
    );
    addTearDown(container.dispose);

    final api = container.read(apiClientProvider);
    api.httpClientAdapter = _MeOkRestUnauthorizedAdapter();

    // BƯỚC 1 — app đang ở trạng thái đã đăng nhập. Phải dựng trạng thái này TRƯỚC, nếu không bài
    // kiểm chỉ đọc provider lần đầu sau khi token đã bị xoá và sẽ xanh dù lỗi còn nguyên.
    final before = await container.read(authControllerProvider.future);
    expect(before, isA<AuthSignedIn>());

    // BƯỚC 2 — máy chủ thu hồi phiên: lời gọi nghiệp vụ trả 401, và không còn refresh token để cứu.
    try {
      await api.get<dynamic>('/patient/results/lab');
    } on DioException {
      // Request hỏng là đúng; bài kiểm quan tâm chuyện sau đó app đi đâu.
    }

    expect(container.read(sessionExpiredProvider), isTrue,
        reason: 'phải ghi nhận là phiên hết hạn để màn đăng nhập nói được lý do');
    expect(stored.containsKey('access_token'), isFalse, reason: 'token phải bị dọn sạch');

    // BƯỚC 3 — trạng thái đăng nhập phải ĐỔI THEO. Đây là chỗ từng hỏng: cờ được bật nhưng không ai
    // đọc, trạng thái vẫn kẹt ở `AuthSignedIn` nên router giữ người bệnh trong màn trong.
    final after = await container.read(authControllerProvider.future);
    expect(after, isA<AuthSignedOut>(),
        reason: 'router lắng nghe authControllerProvider; không chuyển trạng thái ở đây thì người '
            'bệnh kẹt trong app đã mất token, mọi màn đều lỗi');
  });
}

/// `/auth/me` trả 200 để dựng được trạng thái đã đăng nhập; mọi đường khác trả 401.
class _MeOkRestUnauthorizedAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream,
      Future<void>? cancelFuture) async {
    if (options.path.contains('/auth/me')) {
      return ResponseBody.fromString(
        '{"success":true,"data":{"id":"acc-1","phoneNumber":"+84912345678",'
        '"fullName":"Nguyen Van Test","isLinked":true,"patientCode":"BN000123",'
        '"mustChangePassword":false,"hasPin":true,"biometricEnabled":false}}',
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }

    return ResponseBody.fromString('{"success":false}', 401, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}
