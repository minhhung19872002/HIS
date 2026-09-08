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
        isAvailable: json['isAvailable'] as bool? ?? false,
        currentBookings: json['currentBookings'] as int? ?? 0,
        maxBookings: json['maxBookings'] as int? ?? 0,
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
        totalAvailable: json['totalAvailable'] as int? ?? 0,
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

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        appointmentCode: json['appointmentCode'] as String? ?? '',
        appointmentDate:
            DateTime.tryParse(json['appointmentDate'] as String? ?? '')?.toLocal() ??
                DateTime.now(),
        appointmentTime: json['appointmentTime'] as String?,
        departmentName: json['departmentName'] as String?,
        doctorName: json['doctorName'] as String?,
        roomName: json['roomName'] as String?,
        status: json['status'] as int? ?? 0,
        statusName: json['statusName'] as String?,
        reason: json['reason'] as String?,
      );
}
