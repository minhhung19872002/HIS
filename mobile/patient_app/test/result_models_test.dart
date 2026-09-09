import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/results/domain/result_models.dart';

/// Đọc dữ liệu kết quả khám chữa bệnh từ máy chủ (HSMT I.2 #5).
///
/// Hai nhóm mệnh đề, và cả hai đều là chuyện an toàn người bệnh chứ không phải chuyện gọn gàng mã
/// nguồn:
///
/// 1. **Thiếu trường thì hiện thiếu, không được sập.** Một phiếu chưa trả kết quả, một dịch vụ chưa
///    khai tên, một bản HIS cũ hơn — bất kỳ cái nào cũng không được làm màn hình trắng. Người bệnh
///    mất luôn cả những kết quả khác đang hiển thị đúng.
/// 2. **Cờ bất thường phải đúng cả hai chiều.** Bỏ sót một chỉ số nguy hiểm là nguy hiểm; mà tô đỏ
///    tất cả cũng nguy hiểm không kém, vì chỉ số thật sẽ lẫn giữa hàng chục dòng đỏ giả.
void main() {
  group('LabTestItem — cờ bất thường', () {
    LabTestItem itemWithFlag(String? flag) =>
        LabTestItem.fromJson({'testName': 'AST', 'result': '120', 'flag': flag});

    test('Normal thì không đánh dấu', () {
      final item = itemWithFlag('Normal');
      expect(item.isAbnormal, isFalse);
      expect(item.isCritical, isFalse);
      expect(item.isHigh, isFalse);
      expect(item.isLow, isFalse);
    });

    test('High và Low được đánh dấu bất thường kèm đúng hướng mũi tên', () {
      expect(itemWithFlag('High').isAbnormal, isTrue);
      expect(itemWithFlag('High').isHigh, isTrue);
      expect(itemWithFlag('High').isLow, isFalse);

      expect(itemWithFlag('Low').isAbnormal, isTrue);
      expect(itemWithFlag('Low').isLow, isTrue);
      expect(itemWithFlag('Low').isHigh, isFalse);
    });

    test('Critical vừa là bất thường vừa là nguy kịch', () {
      final item = itemWithFlag('Critical');
      expect(item.isAbnormal, isTrue);
      expect(item.isCritical, isTrue);
    });

    test('Cờ RỖNG nghĩa là máy chủ không nói gì — KHÔNG tô đỏ', () {
      // Đây là lỗi đã có thật: `flag != 'Normal'` biến một cờ rỗng thành cả bảng đỏ rực.
      expect(itemWithFlag('').isAbnormal, isFalse);
      expect(itemWithFlag('   ').isAbnormal, isFalse);
    });

    test('Thiếu hẳn trường cờ thì mặc định là bình thường', () {
      final item = LabTestItem.fromJson({'testName': 'AST', 'result': '30'});
      expect(item.flag, 'Normal');
      expect(item.isAbnormal, isFalse);
    });

    test('Cờ LẠ vẫn được đánh dấu — thà thừa còn hơn giấu mất', () {
      // Server thêm một giá trị mới mà app chưa biết: không được im lặng bỏ qua.
      expect(itemWithFlag('AbnormalHigh').isAbnormal, isTrue);
      expect(itemWithFlag('Panic').isAbnormal, isTrue);
    });

    test('Không phụ thuộc hoa thường hay khoảng trắng thừa', () {
      expect(itemWithFlag(' normal ').isAbnormal, isFalse);
      expect(itemWithFlag('HIGH').isHigh, isTrue);
      expect(itemWithFlag('critical').isCritical, isTrue);
    });
  });

  group('LabResult — đọc từ JSON máy chủ', () {
    test('Phiếu đầy đủ đọc ra đúng mọi trường', () {
      final json = jsonDecode('''
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "orderCode": "XN-2026-0001",
        "serviceName": "Sinh hoá máu",
        "testCategory": "Sinh hoá",
        "orderDate": "2026-09-09T08:00:00",
        "resultDate": "2026-09-09T10:30:00",
        "orderingDoctor": "BS. Trần Thị B",
        "department": "Khoa Khám bệnh",
        "status": "Completed",
        "hasAbnormal": true,
        "visitId": "22222222-2222-2222-2222-222222222222",
        "testItems": [
          {"testName": "AST", "result": "120", "unit": "U/L",
           "normalRange": "5 - 40", "flag": "High"},
          {"testName": "ALT", "result": "22", "unit": "U/L",
           "normalRange": "5 - 40", "flag": "Normal"}
        ]
      }''') as Map<String, dynamic>;

      final lab = LabResult.fromJson(json);

      expect(lab.orderCode, 'XN-2026-0001');
      expect(lab.title, 'Sinh hoá máu');
      expect(lab.isCompleted, isTrue);
      expect(lab.hasAbnormal, isTrue);
      expect(lab.resultDate, DateTime(2026, 9, 9, 10, 30));
      expect(lab.testItems, hasLength(2));
      expect(lab.testItems.where((i) => i.isAbnormal), hasLength(1));
    });

    test('Phiếu đang chờ kết quả: không có chỉ số, không có ngày trả', () {
      final lab = LabResult.fromJson({
        'id': 'x', 'orderCode': 'XN-2026-0002', 'status': 'Pending',
      });

      expect(lab.isCompleted, isFalse);
      expect(lab.resultDate, isNull);
      expect(lab.testItems, isEmpty);
      expect(lab.title, 'XN-2026-0002', reason: 'không có tên dịch vụ thì lấy mã phiếu làm tiêu đề');
    });

    test('Thiếu hết mọi trường thì vẫn dựng được đối tượng chứ không ném lỗi', () {
      final lab = LabResult.fromJson(const <String, dynamic>{});

      expect(lab.id, isEmpty);
      expect(lab.status, 'Pending', reason: 'không rõ trạng thái thì coi là chưa xong');
      expect(lab.isCompleted, isFalse);
      expect(lab.hasAbnormal, isFalse);
    });

    test('Tên dịch vụ rỗng cũng rơi về mã phiếu, không ra tiêu đề trống', () {
      final lab = LabResult.fromJson({'orderCode': 'XN-0003', 'serviceName': ''});
      expect(lab.title, 'XN-0003');
    });

    test('Ngày sai định dạng thì để trống chứ không làm sập màn hình', () {
      final lab = LabResult.fromJson({'orderCode': 'XN-0004', 'resultDate': 'khong-phai-ngay'});
      expect(lab.resultDate, isNull);
    });
  });

  group('ImagingResult — tiêu đề và ảnh PACS', () {
    test('Ghép kiểu chụp với bộ phận làm tiêu đề', () {
      final img = ImagingResult.fromJson({
        'orderCode': 'CDHA-001', 'modality': 'CT', 'bodyPart': 'Lồng ngực',
      });
      expect(img.title, 'CT · Lồng ngực');
    });

    test('Không có kiểu chụp thì lấy mô tả, không có nữa thì lấy mã phiếu', () {
      expect(
        ImagingResult.fromJson({'orderCode': 'CDHA-002', 'studyDescription': 'Chụp tim phổi'}).title,
        'Chụp tim phổi',
      );
      expect(ImagingResult.fromJson({'orderCode': 'CDHA-003'}).title, 'CDHA-003');
    });

    test('Không có ảnh thì số ảnh là 0 và cờ hasImages tắt', () {
      final img = ImagingResult.fromJson({'orderCode': 'CDHA-004'});
      expect(img.hasImages, isFalse);
      expect(img.imageCount, 0);
    });
  });

  group('PrescriptionItem — dòng liều dùng', () {
    test('Ghép đủ ba vế khi có đủ dữ liệu', () {
      final item = PrescriptionItem.fromJson({
        'drugName': 'Paracetamol 500mg', 'quantity': 20,
        'dosage': '1 viên', 'frequency': '2 lần/ngày', 'durationDays': 7,
      });
      expect(item.schedule, '1 viên · 2 lần/ngày · 7 ngày');
    });

    test('Thiếu vế nào thì bỏ vế đó, không để lại dấu chấm giữa lơ lửng', () {
      final item = PrescriptionItem.fromJson({
        'drugName': 'Vitamin C', 'quantity': 10, 'dosage': '1 viên',
      });
      expect(item.schedule, '1 viên');
    });

    test('Không có gì thì trả chuỗi rỗng, màn hình tự ẩn dòng', () {
      final item = PrescriptionItem.fromJson({'drugName': 'Thuốc', 'quantity': 1});
      expect(item.schedule, isEmpty);
    });

    test('Số ngày bằng 0 không hiện "0 ngày"', () {
      final item = PrescriptionItem.fromJson({
        'drugName': 'Thuốc', 'quantity': 1, 'dosage': '1 viên', 'durationDays': 0,
      });
      expect(item.schedule, '1 viên');
    });

    test('Số lượng lẻ (0.5 viên) đọc được, không bị ép về số nguyên', () {
      final item = PrescriptionItem.fromJson({'drugName': 'Thuốc', 'quantity': 0.5});
      expect(item.quantity, 0.5);
    });
  });
}
