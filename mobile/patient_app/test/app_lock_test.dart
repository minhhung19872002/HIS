import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/core/security/app_lock.dart';

/// Tự khoá app khi bỏ quên máy (HSMT I.2 #9).
///
/// Kiểm bằng đồng hồ giả chứ không `await` hai phút thật: bộ test phải chạy trong vài giây, và một
/// bài test ngủ hai phút sẽ bị bỏ chạy, tức là không còn bảo vệ gì.
void main() {
  late DateTime now;
  late ProviderContainer container;

  ProviderContainer makeContainer() => ProviderContainer(overrides: [
        appLockProvider.overrideWith(() => AppLock(clock: () => now)),
      ]);

  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    now = DateTime(2026, 9, 9, 8, 0);
    container = makeContainer();
    container.read(appLockProvider); // dựng notifier để nó đăng ký nghe vòng đời
  });

  tearDown(() => container.dispose());

  void lifecycle(AppLifecycleState state) => container
      .read(appLockProvider.notifier)
      .didChangeAppLifecycleState(state);

  test('mới mở thì không khoá', () {
    expect(container.read(appLockProvider), isFalse);
  });

  test('rời tiền cảnh quá 2 phút rồi quay lại thì khoá', () {
    lifecycle(AppLifecycleState.paused);
    now = now.add(const Duration(minutes: 2, seconds: 1));
    lifecycle(AppLifecycleState.resumed);

    expect(container.read(appLockProvider), isTrue);
  });

  test('rời tiền cảnh một lúc ngắn thì KHÔNG khoá', () {
    // Nghe một cuộc gọi, chụp một tấm ảnh rồi quay lại — khoá ở đây chỉ làm phiền người bệnh.
    lifecycle(AppLifecycleState.paused);
    now = now.add(const Duration(seconds: 30));
    lifecycle(AppLifecycleState.resumed);

    expect(container.read(appLockProvider), isFalse);
  });

  test('kéo thanh thông báo (inactive) không tính là rời tiền cảnh', () {
    lifecycle(AppLifecycleState.inactive);
    now = now.add(const Duration(minutes: 10));
    lifecycle(AppLifecycleState.resumed);

    expect(container.read(appLockProvider), isFalse);
  });

  test('mở khoá xong, lần rời tiền cảnh sau vẫn đếm lại từ đầu', () {
    lifecycle(AppLifecycleState.paused);
    now = now.add(const Duration(minutes: 5));
    lifecycle(AppLifecycleState.resumed);
    expect(container.read(appLockProvider), isTrue);

    container.read(appLockProvider.notifier).unlock();
    expect(container.read(appLockProvider), isFalse);

    lifecycle(AppLifecycleState.paused);
    now = now.add(const Duration(seconds: 10));
    lifecycle(AppLifecycleState.resumed);
    expect(container.read(appLockProvider), isFalse,
        reason: 'mốc thời gian cũ phải được xoá khi mở khoá, nếu không lần sau khoá oan');
  });

  test('nút "Khoá app" khoá ngay, không đợi hết thời gian chờ', () {
    container.read(appLockProvider.notifier).lockNow();
    expect(container.read(appLockProvider), isTrue);
  });

  test('đóng hẳn app (detached) cũng bắt đầu đếm giờ', () {
    lifecycle(AppLifecycleState.detached);
    now = now.add(const Duration(minutes: 3));
    lifecycle(AppLifecycleState.resumed);

    expect(container.read(appLockProvider), isTrue);
  });
}
