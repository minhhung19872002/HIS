/// Bảng giá trị thiết kế Bluestar cho app người bệnh.
///
/// Mọi số ở đây lấy THẲNG từ `docs/features/patient-app/design/patient-app-prototype.html` — bản
/// bấm được là nguồn duy nhất. Đọc lại từ đó khi cần sửa, đừng chỉnh áng chừng ở đây rồi để hai
/// bên lệch nhau.
///
/// Chia làm bốn nhóm: [AppColors] · [AppRadii] · [AppSpacing] · [AppShadows], cộng thêm
/// [AppGradients] và [AppFonts]. Cố ý KHÔNG gói vào `ThemeExtension`: các màn còn đọc thẳng hằng
/// số, và một lớp gián tiếp nữa chỉ làm khó tra ngược về bản thiết kế.
library;

import 'package:flutter/material.dart';

/// Bảng màu.
///
/// Tên đặt theo VAI TRÒ chứ không theo sắc độ ("nền trang", "chữ phụ"), để đổi màu thương hiệu sau
/// này chỉ phải sửa ở đây. Riêng nhóm `navy*` giữ tên màu vì bản thiết kế dùng chúng như một tông
/// riêng cho nền tối, không phải bậc đậm hơn của primary.
class AppColors {
  AppColors._();

  // ------------------------------------------------------------------ thương hiệu
  /// Màu chủ đạo — seed của `ColorScheme`, dùng cho tiêu đề nhấn và nền chip đang chọn.
  static const primary = Color(0xFF1D6FE0);

  /// Sắc sáng hơn cho NÚT và trạng thái đang chọn; tương phản tốt hơn trên nền tối.
  static const primaryAction = Color(0xFF2E8BF5);

  /// Sắc sáng nhất, dùng làm điểm cuối gradient.
  static const primaryLight = Color(0xFF4EA3FF);

  /// Điểm cuối gradient thẻ bác sĩ ở màn đặt lịch (125°, cùng với [primary]).
  static const primaryGradientEnd = Color(0xFF2B7FE8);

  // ---------------------------------------------------------------------- navy
  /// Nền thẻ số thứ tự ở trang chủ và nút phụ trên nền tối.
  static const navy = Color(0xFF0E3A7A);

  /// Điểm cuối gradient của [navy] (120°).
  static const navyLight = Color(0xFF15498F);

  /// Đỉnh gradient màn số thứ tự — tông đậm nhất.
  static const navyDeep = Color(0xFF06214F);

  /// Chữ trên nền [accent] sáng (mã số thứ tự trong vòng tròn).
  static const navyInk = Color(0xFF062B5E);

  // -------------------------------------------------------------------- accent
  /// Số và biểu tượng trên nền tối — đủ sáng để đọc trên navy.
  static const accent = Color(0xFFA8D5FF);

  /// Sắc đậm hơn của [accent], dùng làm điểm cuối gradient.
  static const accentDeep = Color(0xFF7CC0FF);

  /// Chữ phụ trên nền tối (nhạt hơn [accent], không dùng cho chữ nhỏ dưới 13sp).
  static const onDarkMuted = Color(0xFFB7D6F6);

  /// Chữ mô tả trên nền tối trong phần giới thiệu.
  static const onDarkSubtle = Color(0xFFD3E4F8);

  // ------------------------------------------------------------------ nền, viền
  /// Nền trang — cũng là nền của khối bo tròn chồng lên header gradient.
  static const pageBackground = Color(0xFFF1F5F9);

  /// Bề mặt thẻ.
  static const surface = Color(0xFFFFFFFF);

  /// Viền thẻ. Đậm hơn `#CBD5E1` một bậc để thấy được trên nền trang.
  static const border = Color(0xFFE2E8F0);

  /// Viền nhạt — dùng cho nét đứt và viền nút phụ.
  static const borderSoft = Color(0xFFCBD5E1);

  // --------------------------------------------------------------------- tint
  /// Tint nhạt nhất — nền ô ngày, nền chỉ báo thanh điều hướng.
  static const tint = Color(0xFFEFF6FF);

  /// Tint vừa — điểm đầu gradient ô dịch vụ.
  static const tintMid = Color(0xFFDBEAFE);

  /// Tint đậm — điểm cuối gradient ô dịch vụ.
  static const tintStrong = Color(0xFFBFDBFE);

  // ---------------------------------------------------------------------- chữ
  /// Chữ chính. Không dùng đen tuyền: trên nền trắng nó gắt và khó đọc lâu.
  static const textPrimary = Color(0xFF0B1B2E);

  /// Chữ đậm vừa — nhãn ô dịch vụ.
  static const textStrong = Color(0xFF334155);

  /// Chữ phụ.
  static const textSecondary = Color(0xFF64748B);

  /// Chữ mờ — chỉ dùng cho thông tin phụ trợ, KHÔNG dùng cho nội dung người bệnh cần đọc
  /// (tương phản 2.9:1 trên nền trang, dưới ngưỡng 4.5:1).
  static const textMuted = Color(0xFF94A3B8);

  // ----------------------------------------------------------------- trạng thái
  /// Chỉ số bất thường.
  static const danger = Color(0xFFBE123C);
  static const dangerBg = Color(0xFFFFE4E6);
  static const dangerBadgeBg = Color(0xFFFFF1F2);

  /// Đang chờ kết quả.
  static const warning = Color(0xFFB45309);
  static const warningBg = Color(0xFFFEF3C7);

  /// Bình thường / đã xác nhận.
  static const success = Color(0xFF047857);
  static const successIcon = Color(0xFF15803D);
  static const successBg = Color(0xFFDCFCE7);

  /// Nền pill "Đã xác nhận" ở trang chủ — nhạt hơn [successBg].
  static const successPillBg = Color(0xFFECFDF5);

  /// Hồ sơ người thân — tông tím, cố ý khác hẳn tông xanh của hồ sơ chính để không nhầm
  /// đang xem hộ ai.
  static const relative = Color(0xFF6D28D9);
  static const relativeBg = Color(0xFFEDE9FE);
  static const relativeTint = Color(0xFFF5F3FF);
  static const relativeDeep = Color(0xFF4C1D95);

  /// Chấm đỏ báo có thông báo chưa đọc.
  static const notificationDot = Color(0xFFFB7185);
}

/// Gradient. Góc lấy đúng bản thiết kế — đổi góc là đổi cảm giác khối.
class AppGradients {
  AppGradients._();

  /// Header trang chủ. Bản thiết kế đổ màu trên toàn khung máy và cắt ở 30%; ở đây chỉ đổ trong
  /// phần header nên chỉ giữ hai chặng đầu.
  static const heroHeader = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [AppColors.primary, AppColors.primaryAction],
  );

  /// Header màn đơn thuốc — tông tím của hồ sơ người thân.
  static const relativeHeader = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [AppColors.relativeDeep, AppColors.relative],
  );

  /// Nền màn số thứ tự: ba chặng, đậm dần rồi tối hẳn ở chân màn.
  static const ticketBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.45, 1.0],
    colors: [AppColors.navyDeep, AppColors.navy, AppColors.textPrimary],
  );

  /// Thẻ số thứ tự ở trang chủ (120°).
  static const ticketCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.navy, AppColors.navyLight],
  );

  /// Vòng tròn mang mã số (140°).
  static const ticketBadge = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.accent, AppColors.primaryAction],
  );

  /// Ô dịch vụ tông xanh (150°).
  static const serviceTileBlue = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.tintMid, AppColors.tintStrong],
  );

  /// Ô dịch vụ tông tím (150°).
  static const serviceTileViolet = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.relativeBg, Color(0xFFDDD6FE)],
  );

  /// Ô dịch vụ tông hồng (150°).
  static const serviceTileRose = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.dangerBg, Color(0xFFFECDD3)],
  );

  /// Nút chính (120°).
  static const primaryButton = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.primaryLight],
  );

  /// Ô giờ đang chọn ở màn đặt lịch (120°).
  static const slotSelected = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primaryAction, AppColors.primaryLight],
  );

  /// Thẻ bác sĩ ở màn đặt lịch (125°).
  static const doctorCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.primary, AppColors.primaryGradientEnd],
  );

  /// Mã số thứ tự cỡ lớn — tô lên chữ bằng `ShaderMask`.
  static const ticketNumber = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.primaryAction, AppColors.accent, AppColors.accentDeep],
  );

  /// Thẻ số thứ tự khi ĐÃ ĐƯỢC GỌI (120°) — sáng hẳn lên để nhìn là biết tới lượt.
  static const ticketCalled = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.accent, AppColors.accentDeep],
  );
}

/// Bán kính bo góc.
class AppRadii {
  AppRadii._();

  /// Thẻ lớn — mặc định cho [AppCard].
  static const card = 22.0;

  /// Thẻ nổi bật hơn (thẻ bác sĩ, thẻ mã số).
  static const cardLarge = 26.0;

  /// Ô dịch vụ ở lưới lối tắt.
  static const tile = 20.0;

  /// Nút.
  static const button = 18.0;

  /// Ô nhập liệu.
  static const field = 16.0;

  /// Hộp biểu tượng trong [AppListRow].
  static const iconBox = 15.0;

  /// Khối nền trang bo trên, chồng lên header gradient. Cũng là bo trên của sheet dưới.
  static const sheet = 30.0;

  /// Chip / pill — bo tròn hẳn.
  static const pill = 999.0;
}

/// Khoảng cách. Bản thiết kế đi theo nhịp 4, các số dưới đây là những mốc thực sự được dùng.
class AppSpacing {
  AppSpacing._();

  /// Lề ngang của màn.
  static const screen = 22.0;

  /// Lề trong thẻ.
  static const card = 16.0;

  /// Lề trong thẻ rộng hơn (thẻ có nội dung nhiều dòng).
  static const cardLarge = 18.0;

  /// Giữa hai khối lớn trên một màn.
  static const block = 20.0;

  /// Giữa các phần tử trong một khối.
  static const item = 14.0;

  /// Giữa các ô trong lưới.
  static const grid = 12.0;

  /// Vùng chạm tối thiểu — người dùng chính của app có nhiều người cao tuổi.
  static const minTouchTarget = 48.0;

  /// Chiều cao nút chính.
  static const buttonHeight = 54.0;
}

/// Bóng đổ.
///
/// Đều là bóng RẤT NHẸ, hướng xuống, bán kính lan rộng và độ mờ thấp — cốt tạo cảm giác nâng lên
/// một chút chứ không vẽ viền bằng bóng. Cố ý không dùng `elevation` mặc định của Material: bóng
/// mặc định tối và gọn hơn, đặt cạnh nhau sẽ thấy lệch hẳn với bản thiết kế.
class AppShadows {
  AppShadows._();

  /// Bóng thẻ mặc định.
  static const card = [
    BoxShadow(color: Color(0x140B1B2E), blurRadius: 30, offset: Offset(0, 14)),
  ];

  /// Bóng nhẹ hơn cho thẻ nhỏ.
  static const cardSoft = [
    BoxShadow(color: Color(0x0F0B1B2E), blurRadius: 24, offset: Offset(0, 10)),
  ];

  /// Bóng cho khối mang màu thương hiệu — ám xanh thay vì xám, để không bị đục.
  static const primaryGlow = [
    BoxShadow(color: Color(0x4D2E8BF5), blurRadius: 26, offset: Offset(0, 14)),
  ];

  /// Bóng cho ô dịch vụ trong lưới.
  static const tile = [
    BoxShadow(color: Color(0x332E8BF5), blurRadius: 16, offset: Offset(0, 8)),
  ];
}

/// Chữ.
///
/// Hai họ, hai việc: [body] cho mọi câu chữ đọc thành lời, [display] cho SỐ và MÃ — chữ số của
/// Sora rộng và đều nhau nên mã bệnh nhân, mã số thứ tự, ngày tháng không bị so le.
///
/// Cả hai đều bundle trong `assets/fonts/` và khai trong `pubspec.yaml`. Không tải lúc chạy: app
/// dùng ở nơi sóng yếu, và chữ nhảy font giữa chừng làm người cao tuổi mất chỗ đang đọc.
class AppFonts {
  AppFonts._();

  static const body = 'BeVietnamPro';
  static const display = 'Sora';

  /// Cỡ chữ nhỏ NHẤT cho nội dung người bệnh cần đọc. Nhãn phụ trợ có thể nhỏ hơn.
  static const minBodySize = 15.0;
}
