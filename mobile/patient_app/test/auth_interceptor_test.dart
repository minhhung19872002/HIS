import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:patient_app/core/network/auth_interceptor.dart';
import 'package:patient_app/core/storage/secure_store.dart';

/// Mất mạng KHÔNG được coi là hết phiên.
///
/// Trước đây mọi lỗi ở bước làm mới token đều bị gộp làm một: Wi-Fi rớt, máy chủ trả 502, hay
/// refresh token thật sự bị thu hồi — tất cả đều dẫn tới xoá phiên và đá về màn đăng nhập. Người
/// bệnh đang xem kết quả xét nghiệm, mạng chập một cái là mất phiên.
///
/// Bộ kiểm này canh đúng ranh giới đó, vì nó không nhìn thấy được bằng mắt: cả hai trường hợp đều
/// hiện ra là "request hỏng", chỉ khác nhau ở chỗ phiên còn hay mất.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  late Map<String, String> stored;

  setUp(() {
    stored = {'access_token': 'access-cu', 'refresh_token': 'refresh-cu'};
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

  /// Dựng cặp Dio đúng như app: `api` gắn interceptor, `bare` để gọi làm mới.
  /// [refreshReply] quyết định máy chủ trả gì cho lời gọi làm mới.
  ({Dio api, List<String> sessionExpiredCalls}) buildClient(
    Future<Response<dynamic>> Function(RequestOptions options) refreshReply,
  ) {
    final store = SecureStore(const FlutterSecureStorage());
    final expired = <String>[];

    final bare = Dio(BaseOptions(baseUrl: 'https://vi-du.test/api/v1'));
    bare.httpClientAdapter = _StubAdapter(refreshReply);

    final api = Dio(BaseOptions(baseUrl: 'https://vi-du.test/api/v1'));
    // Mọi request nghiệp vụ đều trả 401 → luôn kích hoạt đường làm mới token.
    api.httpClientAdapter = _StubAdapter((options) async => throw DioException(
          requestOptions: options,
          response: Response<dynamic>(requestOptions: options, statusCode: 401),
          type: DioExceptionType.badResponse,
        ));
    api.interceptors.add(AuthInterceptor(
      store: store,
      refreshClient: bare,
      onSessionExpired: () => expired.add('x'),
    ));

    return (api: api, sessionExpiredCalls: expired);
  }

  Future<void> callApi(Dio api) async {
    try {
      await api.get<dynamic>('/patient/queue/tickets');
    } on DioException {
      // Request hỏng là đúng — bài kiểm quan tâm chuyện phiên còn hay mất.
    }
  }

  test('mất mạng lúc làm mới → GIỮ phiên, không đăng xuất', () async {
    final c = buildClient((options) async => throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
        ));

    await callApi(c.api);

    expect(c.sessionExpiredCalls, isEmpty, reason: 'lỗi mạng không phải là hết phiên');
    expect(stored['refresh_token'], 'refresh-cu', reason: 'phiên phải còn nguyên');
  });

  test('máy chủ 502 lúc làm mới → GIỮ phiên', () async {
    final c = buildClient((options) async => throw DioException(
          requestOptions: options,
          response: Response<dynamic>(requestOptions: options, statusCode: 502),
          type: DioExceptionType.badResponse,
        ));

    await callApi(c.api);

    expect(c.sessionExpiredCalls, isEmpty);
    expect(stored['refresh_token'], 'refresh-cu');
  });

  test('máy chủ trả 2xx nhưng thiếu token → GIỮ phiên (hợp đồng vỡ, không phải hết hạn)', () async {
    final c = buildClient((options) async => Response<dynamic>(
          requestOptions: options,
          statusCode: 200,
          data: {'data': <String, dynamic>{}},
        ));

    await callApi(c.api);

    expect(c.sessionExpiredCalls, isEmpty);
    expect(stored['refresh_token'], 'refresh-cu');
  });

  test('máy chủ trả 401 lúc làm mới → ĐÚNG là hết phiên, phải đăng xuất', () async {
    final c = buildClient((options) async => throw DioException(
          requestOptions: options,
          response: Response<dynamic>(requestOptions: options, statusCode: 401),
          type: DioExceptionType.badResponse,
        ));

    await callApi(c.api);

    expect(c.sessionExpiredCalls, hasLength(1));
    expect(stored['refresh_token'], isNull, reason: 'phiên hết hạn thật thì phải xoá');
  });

  test('làm mới thành công → lưu token mới, không đăng xuất', () async {
    final c = buildClient((options) async => Response<dynamic>(
          requestOptions: options,
          statusCode: 200,
          data: {
            'data': {'token': 'access-moi', 'refreshToken': 'refresh-moi'}
          },
        ));

    await callApi(c.api);

    expect(c.sessionExpiredCalls, isEmpty);
    expect(stored['access_token'], 'access-moi');
    expect(stored['refresh_token'], 'refresh-moi');
  });
}

/// Adapter giả: thay tầng HTTP thật bằng một hàm do bài kiểm quyết định.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.reply);

  final Future<Response<dynamic>> Function(RequestOptions options) reply;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream,
      Future<void>? cancelFuture) async {
    final res = await reply(options);
    return ResponseBody.fromString(
      res.data == null ? '' : _encode(res.data),
      res.statusCode ?? 200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  static String _encode(dynamic data) =>
      data is String ? data : const JsonEncoder().convert(data);

  @override
  void close({bool force = false}) {}
}
