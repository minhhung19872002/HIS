import '../../../core/json.dart';

/// Một khung giờ khám.
class TimeSlot {
  const TimeSlot({
    required this.startTime,
    required this.displayTime,
    required this.isAvailable,
    required this.currentBookings,
    required this.maxBookings,
  });

  /// Dạng "HH:mm:ss" như server trả về — gửi lại nguyên văn khi đặt lịch.
  final String startTime;

  final String displayTime;
  final bool isAvailable;
  final int currentBookings;
  final int maxBookings;

  int get remaining => (maxBookings - currentBookings).clamp(0, maxBookings);

  factory TimeSlot.fromJson(Map<String, dynamic> json) => TimeSlot(
        startTime: json['startTime'] as String? ?? '',
        displayTime: json['displayTime'] as String? ?? '',
        isAvailable: asBool(json['isAvailable']),
        currentBookings: asInt(json['currentBookings']),
        maxBookings: asInt(json['maxBookings']),
      );
}

class SlotResult {
  const SlotResult({
    required this.morningSlots,
    required this.afternoonSlots,
    required this.totalAvailable,
    this.departmentName,
    this.doctorName,
  });

  final List<TimeSlot> morningSlots;
  final List<TimeSlot> afternoonSlots;
  final int totalAvailable;
  final String? departmentName;
  final String? doctorName;

  /// Không có khung nào nghĩa là bác sĩ không trực ngày đó — nói thẳng thay vì hiện lưới trống.
  bool get isEmpty => morningSlots.isEmpty && afternoonSlots.isEmpty;

  factory SlotResult.fromJson(Map<String, dynamic> json) => SlotResult(
        morningSlots: (json['morningSlots'] as List<dynamic>? ?? const [])
            .map((e) => TimeSlot.fromJson(e as Map<String, dynamic>))
            .toList(),
        afternoonSlots: (json['afternoonSlots'] as List<dynamic>? ?? const [])
            .map((e) => TimeSlot.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalAvailable: asInt(json['totalAvailable']),
        departmentName: json['departmentName'] as String?,
        doctorName: json['doctorName'] as String?,
      );
}

/// Lịch hẹn của người bệnh.
class Appointment {
  const Appointment({
    required this.appointmentCode,
    required this.appointmentDate,
    required this.status,
    this.appointmentTime,
    this.departmentName,
    this.doctorName,
    this.roomName,
    this.statusName,
    this.reason,
  });

  final String appointmentCode;
  final DateTime appointmentDate;
  final String? appointmentTime;
  final String? departmentName;
  final String? doctorName;
  final String? roomName;

  /// 0 Chờ xác nhận · 1 Đã xác nhận · 2 Đã đến khám · 3 Không đến · 4 Đã huỷ
  final int status;
  final String? statusName;
  final String? reason;

  /// Chỉ lịch chưa đến khám mới sửa/huỷ được — khớp đúng luật phía server.
  bool get canModify => status < 2;

  bool get isCancelled => status == 4;

  /// Tên trạng thái bằng chữ → mã số, cho trường hợp máy chủ trả tên thay vì số.
  static const _statusNames = {
    'pending': 0,
    'chờxácnhận': 0,
    'confirmed': 1,
    'đãxácnhận': 1,
    'arrived': 2,
    'checkedin': 2,
    'completed': 2,
    'đãđếnkhám': 2,
    'noshow': 3,
    'khôngđến': 3,
    'cancelled': 4,
    'canceled': 4,
    'đãhuỷ': 4,
    'đãhủy': 4,
  };

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        appointmentCode: asString(json['appointmentCode']) ?? '',
        // `scheduledAt` là tên khác của cùng một trường ở vài bản BFF.
        appointmentDate:
            asDateTime(json, const ['appointmentDate', 'scheduledAt']) ?? DateTime.now(),
        appointmentTime: asString(json['appointmentTime']),
        departmentName: asString(json['departmentName']),
        doctorName: asString(json['doctorName']),
        roomName: asString(json['roomName']),
        status: asStatusCode(json['status'], _statusNames),
        // Máy chủ trả trạng thái bằng chữ mà không kèm `statusName` thì dùng luôn chữ đó. Không
        // lấy khi trạng thái là số — nhãn "3" trên thẻ lịch hẹn chẳng nói lên điều gì.
        statusName: asString(json['statusName']) ??
            (json['status'] is String ? json['status'] as String : null),
        reason: asString(json['reason']),
      );
}
