import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  /// Lớp che phủ lên trên giao diện khi app rời tiền cảnh.
  ///
  /// iOS không cho chặn chụp màn hình, nhưng ảnh chụp mà iOS tự lưu cho màn "ứng dụng gần đây" thì
  /// chặn được — và đó mới là chỗ rò rỉ thật: người bệnh đưa máy cho người khác xem ảnh, vuốt nhầm
  /// vào danh sách app đang mở, và kết quả xét nghiệm nằm sẵn ở đó.
  private var privacyOverlay: UIVisualEffectView?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// Rời tiền cảnh: phủ mờ TRƯỚC khi iOS chụp ảnh màn hình.
  override func applicationWillResignActive(_ application: UIApplication) {
    super.applicationWillResignActive(application)

    guard privacyOverlay == nil, let window = self.window else { return }

    let blur = UIVisualEffectView(effect: UIBlurEffect(style: .light))
    blur.frame = window.bounds
    blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(blur)
    privacyOverlay = blur
  }

  /// Quay lại tiền cảnh: bỏ lớp phủ.
  override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)

    privacyOverlay?.removeFromSuperview()
    privacyOverlay = nil
  }
}
