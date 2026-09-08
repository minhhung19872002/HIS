import 'dart:io';
import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/storage/secure_store.dart';

/// Thông tin thiết bị gửi kèm mỗi lần đăng nhập.
class DevicePayload {
  const DevicePayload({
    required this.deviceKey,
    required this.deviceName,
    required this.platform,
    this.osVersion,
    this.appVersion,
    this.pushToken,
  });

  final String deviceKey;
  final String deviceName;
  final String platform;
  final String? osVersion;
  final String? appVersion;
  final String? pushToken;

  Map<String, dynamic> toJson() => {
        'deviceKey': deviceKey,
        'deviceName': deviceName,
        'platform': platform,
        if (osVersion != null) 'osVersion': osVersion,
        if (appVersion != null) 'appVersion': appVersion,
        if (pushToken != null) 'pushToken': pushToken,
      };
}

/// Thu thập thông tin máy để hiển thị ở màn "Thiết bị đăng nhập".
///
/// `deviceKey` do app tự sinh MỘT LẦN rồi cất trong kho bảo mật, **không** dùng id phần cứng:
/// định danh phần cứng vừa bị hệ điều hành siết dần, vừa là dữ liệu theo dõi người dùng mà app y tế
/// không nên đụng tới. Cách này còn giúp cùng một máy đăng nhập lại vẫn ra đúng một dòng thiết bị,
/// thay vì đẻ thêm bản ghi mới mỗi lần.
class DeviceInfoProvider {
  DeviceInfoProvider(this._store);

  final SecureStore _store;

  Future<DevicePayload> collect({String? pushToken}) async {
    final deviceKey = await _ensureDeviceKey();
    final packageInfo = await PackageInfo.fromPlatform();
    final plugin = DeviceInfoPlugin();

    var deviceName = 'Thiết bị không rõ';
    var platform = 'unknown';
    String? osVersion;

    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      platform = 'android';
      // "Samsung Galaxy A54" dễ nhận ra hơn "SM-A546E".
      deviceName = '${info.manufacturer} ${info.model}'.trim();
      osVersion = 'Android ${info.version.release}';
    } else if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      platform = 'ios';
      deviceName = info.name.isNotEmpty ? info.name : info.utsname.machine;
      osVersion = 'iOS ${info.systemVersion}';
    }

    return DevicePayload(
      deviceKey: deviceKey,
      deviceName: deviceName,
      platform: platform,
      osVersion: osVersion,
      appVersion: '${packageInfo.version}+${packageInfo.buildNumber}',
      pushToken: pushToken,
    );
  }

  Future<String> _ensureDeviceKey() async {
    final existing = await _store.deviceId;
    if (existing != null && existing.isNotEmpty) return existing;

    // 32 ký tự hex từ nguồn ngẫu nhiên an toàn.
    final random = Random.secure();
    final key = List<int>.generate(16, (_) => random.nextInt(256))
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();

    await _store.saveDeviceId(key);
    return key;
  }
}
