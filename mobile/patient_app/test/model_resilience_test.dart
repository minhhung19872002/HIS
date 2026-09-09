import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/appointments/domain/appointment_models.dart';
import 'package:patient_app/features/auth/domain/account.dart';
import 'package:patient_app/features/documents/domain/document_models.dart';
import 'package:patient_app/features/family/domain/family_models.dart';
import 'package:patient_app/features/notifications/domain/app_notification.dart';
import 'package:patient_app/features/queue/domain/queue_models.dart';
import 'package:patient_app/features/results/domain/inpatient_models.dart';
import 'package:patient_app/features/results/domain/result_models.dart';

/// Đọc dữ liệu máy chủ phải CHỊU ĐƯỢC lệch kiểu, không được ném lỗi.
///
/// Vì sao có bộ này: một lần `json['status'] as int?` gặp chuỗi là ném `TypeError` NGAY GIỮA
/// `fromJson`. Lỗi đó nổi lên tận `FutureProvider`, và CẢ MÀN rơi vào nhánh "Không tải được",
/// dù máy chủ đã trả 200 kèm đủ dữ liệu. Người bệnh đặt lịch xong mở app ra không thấy lịch đâu,
/// và không có gì trên màn nói cho họ biết vì sao.
///
/// App không nói chuyện thẳng với CSDL mà đi qua BFF, BFF lấy từ HIS, và app còn được đặt để ghép
/// với HIS của đơn vị khác. "Máy chủ chỉ trả đúng một dạng" là một giả định sai — chỉ cần bên nào
/// đó đăng ký `JsonStringEnumConverter` là hình dạng đổi, mà app thì đã cài trên máy người bệnh.
///
/// Mệnh đề của cả bộ: **đọc sai một trường thì mất trường đó, KHÔNG mất cả màn.**
void main() {
  group('Lịch hẹn', () {
    test('trạng thái bằng CHỮ vẫn đọc được, không ném lỗi', () {
      final a = Appointment.fromJson({
        'appointmentCode': 'LH-1',
        'appointmentDate': '2026-09-12T00:00:00',
        'status': 'Confirmed',
      });
      expect(a.appointmentCode, 'LH-1');
      expect(a.status, 1);
      expect(a.statusName, 'Confirmed');
    });

    test('trạng thái tiếng Việt cũng đọc được', () {
      expect(Appointment.fromJson({'status': 'Đã huỷ'}).isCancelled, isTrue);
    });

    test('trạng thái LẠ thì về mặc định chứ không ném', () {
      expect(Appointment.fromJson({'status': 'Xyz'}).status, 0);
    });

    test('`scheduledAt` là tên khác của `appointmentDate`', () {
      final a = Appointment.fromJson({'scheduledAt': '2026-09-12T08:00:00'});
      expect(a.appointmentDate.year, 2026);
      expect(a.appointmentDate.month, 9);
      expect(a.appointmentDate.day, 12);
    });

    test('số gửi dưới dạng chuỗi vẫn đọc được', () {
      final s = SlotResult.fromJson({
        'totalAvailable': '3',
        'morningSlots': [
          {'startTime': '08:00:00', 'isAvailable': 'true', 'currentBookings': '2',
           'maxBookings': '5'},
        ],
      });
      expect(s.totalAvailable, 3);
      expect(s.morningSlots.single.isAvailable, isTrue);
      expect(s.morningSlots.single.remaining, 3);
    });
  });

  group('Hàng chờ', () {
    test('số dạng chuỗi và bool dạng số đều đọc được', () {
      final t = QueueTicket.fromJson({
        'ticketCode': 'A-042',
        'queueNumber': '42',
        'priority': 1,
        'priorityVerified': 0,
        'status': '2',
      });
      expect(t.queueNumber, 42);
      expect(t.isPriority, isTrue);
      expect(t.priorityVerified, isFalse);
      expect(t.status, 2);
    });
  });

  group('Tài khoản và thiết bị', () {
    test('cờ bool gửi dạng chuỗi vẫn đọc được', () {
      final a = Account.fromJson({
        'id': 'x',
        'phoneNumber': '+84900000000',
        'fullName': 'Nguyễn Văn A',
        'isLinked': 'true',
        'hasPin': '1',
      });
      expect(a.isLinked, isTrue);
      expect(a.hasPin, isTrue);
    });
  });

  group('Ví giấy tờ', () {
    test('dung lượng gửi dạng chuỗi vẫn tính được', () {
      final w = DocumentWallet.fromJson({
        'usedBytes': '1048576',
        'quotaBytes': '104857600',
        'maxFileBytes': '10485760',
        'documents': <dynamic>[],
      });
      expect(w.usedBytes, 1048576);
      expect(w.usedRatio, closeTo(0.01, 0.001));
    });
  });

  group('Gia đình', () {
    test('quyền gửi dạng số vẫn đọc được', () {
      final m = FamilyMember.fromJson({
        'id': 'm1',
        'name': 'Mẹ',
        'canViewResults': 1,
        'canBookAppointments': 0,
      });
      expect(m.canViewResults, isTrue);
      expect(m.canBookAppointments, isFalse);
    });
  });

  group('Thông báo', () {
    test('cờ đã đọc gửi dạng chuỗi vẫn đọc được', () {
      expect(AppNotificationItem.fromJson({'id': 'n1', 'isRead': 'true'}).isRead, isTrue);
    });
  });

  group('Nội trú và kết quả', () {
    test('đợt điều trị: số ngày dạng chuỗi, cờ dạng số', () {
      final a = Admission.fromJson({
        'id': 'adm-1',
        'daysOfStay': '7',
        'status': '1',
        'isInProgress': 1,
      });
      expect(a.daysOfStay, 7);
      expect(a.status, 1);
      expect(a.isInProgress, isTrue);
    });

    test('phiếu xét nghiệm: cờ bất thường dạng chuỗi', () {
      final l = LabResult.fromJson({
        'id': 'lab-1',
        'serviceName': 'Sinh hoá',
        'hasAbnormal': 'true',
        'testItems': <dynamic>[],
      });
      expect(l.hasAbnormal, isTrue);
    });
  });

  group('Không trường nào thiếu làm sập cả bản ghi', () {
    test('JSON RỖNG vẫn dựng được mọi model', () {
      // Mệnh đề then chốt: máy chủ trả về một bản ghi cụt (bản HIS khác, lỗi ánh xạ) thì app mất
      // vài trường trên màn, chứ KHÔNG mất cả màn.
      expect(() => Appointment.fromJson({}), returnsNormally);
      expect(() => TimeSlot.fromJson({}), returnsNormally);
      expect(() => SlotResult.fromJson({}), returnsNormally);
      expect(() => QueueTicket.fromJson({}), returnsNormally);
      expect(() => QueueTicketStatus.fromJson({}), returnsNormally);
      expect(() => Admission.fromJson({}), returnsNormally);
      expect(() => LabResult.fromJson({}), returnsNormally);
      expect(() => AppNotificationItem.fromJson({}), returnsNormally);
      expect(() => FamilyMember.fromJson({}), returnsNormally);
      expect(() => PatientDocument.fromJson({}), returnsNormally);
    });
  });
}
