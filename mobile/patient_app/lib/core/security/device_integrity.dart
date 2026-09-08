import 'dart:io';

/// Kiểm tra máy có dấu hiệu đã bị root (Android) hoặc jailbreak (iOS) — HSMT I.2 #9.
///
/// <b>Đây là cảnh báo, không phải rào chắn.</b> Không có phép kiểm nào ở tầng ứng dụng thắng được
/// một máy đã bị chiếm quyền: kẻ tấn công sửa được cả kết quả kiểm tra. Mục đích duy nhất là nói cho
/// người dùng ngay tình biết rằng máy của họ đang ở trạng thái mà dữ liệu y tế không còn được bảo vệ
/// như thiết kế — phần lớn máy root là do chính chủ root, và họ không biết hệ quả.
///
/// Vì vậy app **cảnh báo rồi vẫn cho dùng tiếp**. Chặn hẳn chỉ khiến người bệnh mất đường xem kết
/// quả của chính mình, mà không làm kẻ tấn công khó thêm chút nào.
///
/// Cố ý không dùng gói ngoài: các gói phát hiện root đều nặng, đều phải cập nhật liên tục, và đều là
/// một rủi ro nâng cấp cho trần iOS 12 (xem README §6.2). Danh sách dưới đây bắt được những cách root
/// phổ biến nhất, và đó đúng là tất cả những gì một cảnh báo cần làm.
class DeviceIntegrity {
  const DeviceIntegrity();

  /// Dấu vết của Magisk, SuperSU và các bản ROM đã mở quyền root.
  static const _androidMarkers = <String>[
    '/system/app/Superuser.apk',
    '/sbin/su',
    '/system/bin/su',
    '/system/xbin/su',
    '/data/local/xbin/su',
    '/data/local/bin/su',
    '/system/sd/xbin/su',
    '/system/bin/failsafe/su',
    '/data/local/su',
    '/su/bin/su',
    '/system/app/Magisk.apk',
    '/sbin/magisk',
  ];

  /// Dấu vết của Cydia, Sileo và bộ quản lý gói trên máy đã jailbreak.
  static const _iosMarkers = <String>[
    '/Applications/Cydia.app',
    '/Applications/Sileo.app',
    '/Library/MobileSubstrate/MobileSubstrate.dylib',
    '/bin/bash',
    '/usr/sbin/sshd',
    '/etc/apt',
    '/private/var/lib/apt/',
    '/private/var/lib/cydia',
  ];

  /// true khi tìm thấy dấu hiệu máy đã bị mở quyền.
  Future<bool> isCompromised() async {
    // Máy ảo và trình duyệt không có hệ tệp kiểu này; đừng doạ người dùng vì một phép kiểm không
    // áp dụng được.
    if (!Platform.isAndroid && !Platform.isIOS) return false;

    final markers = Platform.isAndroid ? _androidMarkers : _iosMarkers;

    for (final path in markers) {
      try {
        if (await File(path).exists() || await Directory(path).exists()) return true;
      } on FileSystemException {
        // Không đọc được đường dẫn là chuyện bình thường trên máy lành: hộp cát chặn. Bỏ qua.
      }
    }

    // Máy đã jailbreak thường cho ghi ra ngoài hộp cát của app. Máy lành thì phép thử này ném lỗi.
    if (Platform.isIOS) {
      try {
        final probe = File('/private/${DateTime.now().microsecondsSinceEpoch}.txt');
        await probe.writeAsString('.');
        await probe.delete();
        return true;
      } on FileSystemException {
        // Đúng như mong đợi trên máy lành.
      }
    }

    return false;
  }
}
