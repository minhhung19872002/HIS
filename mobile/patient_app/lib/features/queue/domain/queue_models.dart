import '../../../core/json.dart';

/// Khoa khám.
class Department {
  const Department({required this.id, required this.name, this.code, this.availableDoctors = 0});

  final String id;
  final String name;
  final String? code;
  final int availableDoctors;

  factory Department.fromJson(Map<String, dynamic> json) => Department(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        code: json['code'] as String?,
        availableDoctors: asInt(json['availableDoctors']),
      );
}

class Doctor {
  const Doctor({required this.id, required this.fullName, this.title, this.specialty});

  final String id;
  final String fullName;
  final String? title;
  final String? specialty;

  /// "BS.CKI Nguyễn Văn A" — ghép học hàm nếu có.
  String get displayName =>
      (title != null && title!.isNotEmpty) ? '$title $fullName' : fullName;

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(
        id: json['id'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        title: json['title'] as String?,
        specialty: json['specialty'] as String?,
      );
}

/// Phòng khám kèm số người đang chờ.
class ClinicRoom {
  const ClinicRoom({
    required this.roomId,
    required this.roomName,
    this.departmentName,
    this.doctorName,
    this.waitingCount = 0,
  });

  final String roomId;
  final String roomName;
  final String? departmentName;
  final String? doctorName;
  final int waitingCount;

  factory ClinicRoom.fromJson(Map<String, dynamic> json) => ClinicRoom(
        roomId: json['roomId'] as String? ?? '',
        roomName: json['roomName'] as String? ?? '',
        departmentName: json['departmentName'] as String?,
        doctorName: json['doctorName'] as String?,
        waitingCount: asInt(json['waitingCount']),
      );
}

/// Lý do xin ưu tiên (HSMT I.2 #3). Giá trị khớp với server.
enum PriorityReason {
  elderly(1, 'Người cao tuổi (từ 60 tuổi)'),
  youngChild(2, 'Trẻ em dưới 6 tuổi'),
  pregnant(3, 'Phụ nữ có thai'),
  disability(4, 'Người khuyết tật nặng'),
  meritorious(5, 'Người có công với cách mạng');

  const PriorityReason(this.value, this.label);
  final int value;
  final String label;
}

/// Vé xếp hàng vừa lấy.
class QueueTicket {
  const QueueTicket({
    required this.id,
    required this.ticketCode,
    required this.queueNumber,
    required this.roomId,
    required this.priority,
    required this.priorityVerified,
    required this.status,
    required this.estimatedWaitMinutes,
    this.roomName,
    this.priorityReasonName,
    this.statusName,
  });

  final String id;
  final String ticketCode;
  final int queueNumber;
  final String roomId;
  final String? roomName;
  final int priority;
  final String? priorityReasonName;

  /// false = người bệnh tự khai, quầy sẽ xác minh khi gọi số.
  final bool priorityVerified;

  final int status;
  final String? statusName;
  final int estimatedWaitMinutes;

  bool get isPriority => priority > 0;

  factory QueueTicket.fromJson(Map<String, dynamic> json) => QueueTicket(
        id: json['id'] as String? ?? '',
        ticketCode: json['ticketCode'] as String? ?? '',
        queueNumber: asInt(json['queueNumber']),
        roomId: json['roomId'] as String? ?? '',
        roomName: json['roomName'] as String?,
        priority: asInt(json['priority']),
        priorityReasonName: json['priorityReasonName'] as String?,
        priorityVerified: asBool(json['priorityVerified']),
        status: asInt(json['status']),
        statusName: json['statusName'] as String?,
        estimatedWaitMinutes: asInt(json['estimatedWaitMinutes']),
      );
}

/// Số đã lấy trong ngày, đọc lại từ máy chủ khi mở app.
///
/// Cần bản ghi này vì con số không nằm trong máy: người bệnh đóng app, hết pin, hay đổi máy thì vẫn
/// phải quay lại được đúng số của mình chứ không xin số mới.
class IssuedTicket {
  const IssuedTicket({
    required this.id,
    required this.ticketCode,
    required this.queueNumber,
    required this.roomId,
    required this.priority,
    required this.priorityVerified,
    this.roomName,
  });

  final String id;
  final String ticketCode;
  final int queueNumber;
  final String roomId;
  final String? roomName;
  final int priority;
  final bool priorityVerified;

  bool get isPriority => priority > 0;

  factory IssuedTicket.fromJson(Map<String, dynamic> json) => IssuedTicket(
        id: json['id'] as String? ?? '',
        ticketCode: json['ticketCode'] as String? ?? '',
        queueNumber: asInt(json['queueNumber']),
        roomId: json['roomId'] as String? ?? '',
        roomName: json['roomName'] as String?,
        priority: asInt(json['priority']),
        priorityVerified: asBool(json['priorityVerified']),
      );
}

/// Trạng thái vé, app hỏi lại định kỳ để cập nhật "còn bao nhiêu người".
class QueueTicketStatus {
  const QueueTicketStatus({
    required this.ticketId,
    required this.ticketCode,
    required this.roomName,
    required this.status,
    required this.peopleAhead,
    required this.estimatedWaitMinutes,
    required this.priority,
    required this.priorityVerified,
    this.statusName,
    this.currentServingTicket,
  });

  final String ticketId;
  final String ticketCode;
  final String roomName;
  final int status;
  final String? statusName;
  final String? currentServingTicket;
  final int peopleAhead;
  final int estimatedWaitMinutes;
  final int priority;
  final bool priorityVerified;

  /// Đã gọi tới lượt hoặc đang khám.
  bool get isCalled => status == 1 || status == 2;

  /// Đã xong hoặc bị bỏ qua — thôi hỏi lại.
  bool get isFinished => status >= 3;

  factory QueueTicketStatus.fromJson(Map<String, dynamic> json) => QueueTicketStatus(
        ticketId: json['ticketId'] as String? ?? '',
        ticketCode: json['ticketCode'] as String? ?? '',
        roomName: json['roomName'] as String? ?? '',
        status: asInt(json['status']),
        statusName: json['statusName'] as String?,
        currentServingTicket: json['currentServingTicket'] as String?,
        peopleAhead: asInt(json['peopleAhead']),
        estimatedWaitMinutes: asInt(json['estimatedWaitMinutes']),
        priority: asInt(json['priority']),
        priorityVerified: asBool(json['priorityVerified']),
      );
}
