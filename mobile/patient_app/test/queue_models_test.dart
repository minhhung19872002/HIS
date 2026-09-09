import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/queue/domain/queue_models.dart';

/// Số thứ tự khám (HSMT I.2 #3).
///
/// `isCalled` và `isFinished` không phải hai getter trang trí: chúng quyết định app còn hỏi lại máy
/// chủ hay dừng, và còn hiện "còn bao nhiêu người phía trước" hay chuyển sang "mời vào phòng". Lệch
/// một mã trạng thái là người bệnh hoặc ngồi chờ một con số đứng yên, hoặc bị báo tới lượt sớm rồi
/// đứng dậy đi vào phòng khi chưa được gọi.
void main() {
  group('QueueTicketStatus — mã trạng thái', () {
    QueueTicketStatus withStatus(int status) =>
        QueueTicketStatus.fromJson({'ticketId': 't', 'ticketCode': 'A-001', 'status': status});

    test('0 = đang chờ: chưa gọi, chưa xong', () {
      final s = withStatus(0);
      expect(s.isCalled, isFalse);
      expect(s.isFinished, isFalse);
    });

    test('1 và 2 = đã gọi / đang khám', () {
      expect(withStatus(1).isCalled, isTrue);
      expect(withStatus(2).isCalled, isTrue);
      expect(withStatus(1).isFinished, isFalse);
      expect(withStatus(2).isFinished, isFalse);
    });

    test('Từ 3 trở lên = đã kết thúc, app thôi hỏi lại', () {
      expect(withStatus(3).isFinished, isTrue);
      expect(withStatus(4).isFinished, isTrue);

      // Mã trạng thái mới do máy chủ thêm về sau cũng phải rơi vào nhánh "kết thúc" chứ không được
      // làm app hỏi lại mãi mãi — mỗi lần hỏi là một lần đánh thức máy và tốn pin của người bệnh.
      expect(withStatus(99).isFinished, isTrue);
    });

    test('Không có trạng thái thì coi là đang chờ', () {
      final s = QueueTicketStatus.fromJson(const {});
      expect(s.status, 0);
      expect(s.isCalled, isFalse);
      expect(s.isFinished, isFalse);
    });
  });

  group('QueueTicketStatus — số người phía trước', () {
    test('0 người phía trước là giá trị HỢP LỆ, không phải thiếu dữ liệu', () {
      // Người kế tiếp sẽ được gọi: đúng lúc con số này quan trọng nhất thì nó bằng 0.
      final s = QueueTicketStatus.fromJson({'ticketId': 't', 'peopleAhead': 0, 'status': 0});
      expect(s.peopleAhead, 0);
    });

    test('Thiếu trường thì về 0 chứ không ném lỗi', () {
      final s = QueueTicketStatus.fromJson(const {});
      expect(s.peopleAhead, 0);
      expect(s.estimatedWaitMinutes, 0);
    });

    test('Số đang được gọi có thể chưa có (phòng chưa mở)', () {
      final s = QueueTicketStatus.fromJson({'ticketId': 't'});
      expect(s.currentServingTicket, isNull);
    });
  });

  group('Vé ưu tiên', () {
    test('priority > 0 là vé ưu tiên', () {
      final t = QueueTicket.fromJson({'id': 'x', 'priority': 1});
      expect(t.isPriority, isTrue);
    });

    test('priority = 0 là vé thường', () {
      expect(QueueTicket.fromJson({'id': 'x', 'priority': 0}).isPriority, isFalse);
      expect(QueueTicket.fromJson({'id': 'x'}).isPriority, isFalse);
    });

    test('Ưu tiên CHƯA xác minh vẫn là vé ưu tiên, chỉ khác ở chỗ quầy phải kiểm', () {
      // Người bệnh tự khai; app phải hiện đúng "đang chờ xác minh" chứ không được lặng lẽ hạ vé.
      final t = QueueTicket.fromJson({'id': 'x', 'priority': 1, 'priorityVerified': false});
      expect(t.isPriority, isTrue);
      expect(t.priorityVerified, isFalse);
    });

    test('Thiếu cờ xác minh thì mặc định là CHƯA xác minh', () {
      // Mặc định phải nghiêng về phía quầy còn phải kiểm, không phải phía đã duyệt.
      expect(QueueTicket.fromJson({'id': 'x', 'priority': 1}).priorityVerified, isFalse);
    });

    test('Năm lý do ưu tiên khớp mã với máy chủ', () {
      expect(PriorityReason.elderly.value, 1);
      expect(PriorityReason.youngChild.value, 2);
      expect(PriorityReason.pregnant.value, 3);
      expect(PriorityReason.disability.value, 4);
      expect(PriorityReason.meritorious.value, 5);

      // Mã trùng nhau nghĩa là quầy nhìn thấy sai lý do khi gọi số.
      final values = PriorityReason.values.map((r) => r.value).toList();
      expect(values.toSet(), hasLength(values.length));
      expect(PriorityReason.values.every((r) => r.label.isNotEmpty), isTrue);
    });
  });

  group('IssuedTicket — số đã lấy trong ngày', () {
    test('Đọc lại được từ máy chủ sau khi đóng app', () {
      final t = IssuedTicket.fromJson({
        'id': 'x', 'ticketCode': 'A-042', 'queueNumber': 42,
        'roomId': 'r1', 'roomName': 'Phòng khám 1', 'priority': 1, 'priorityVerified': true,
      });

      expect(t.ticketCode, 'A-042');
      expect(t.queueNumber, 42);
      expect(t.roomName, 'Phòng khám 1');
      expect(t.isPriority, isTrue);
    });
  });

  group('Doctor.displayName', () {
    test('Có học hàm thì ghép vào trước tên', () {
      final d = Doctor.fromJson({'id': 'd', 'fullName': 'Nguyễn Văn A', 'title': 'BS.CKI'});
      expect(d.displayName, 'BS.CKI Nguyễn Văn A');
    });

    test('Không có học hàm thì không để lại khoảng trắng thừa ở đầu', () {
      expect(Doctor.fromJson({'id': 'd', 'fullName': 'Nguyễn Văn A'}).displayName, 'Nguyễn Văn A');
      expect(
        Doctor.fromJson({'id': 'd', 'fullName': 'Nguyễn Văn A', 'title': ''}).displayName,
        'Nguyễn Văn A',
      );
    });
  });
}
