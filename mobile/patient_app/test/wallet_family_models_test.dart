import 'package:flutter_test/flutter_test.dart';
import 'package:patient_app/features/documents/domain/document_models.dart';
import 'package:patient_app/features/family/domain/family_models.dart';

/// Ví giấy tờ (HSMT I.2 #8) và quản lý gia đình (HSMT I.2 #7).
///
/// Hai chỗ này khác nhau về nghiệp vụ nhưng giống nhau ở một điểm: **mặc định phải nghiêng về phía
/// chặt**. Một liên kết chưa xác minh mà bị coi là đã xác minh nghĩa là ai đó đọc được hồ sơ bệnh án
/// của người khác — không có cách nào phát hiện từ phía người bệnh.
void main() {
  group('FamilyMember — quyền xem hồ sơ người thân', () {
    test('Chỉ liên kết đã xác minh mới tính là verified', () {
      expect(FamilyMember.fromJson({'status': 'Verified'}).isVerified, isTrue);
      expect(FamilyMember.fromJson({'status': 'Pending'}).isVerified, isFalse);
      expect(FamilyMember.fromJson({'status': 'Revoked'}).isVerified, isFalse);
    });

    test('Thiếu trạng thái thì mặc định là CHƯA xác minh', () {
      // Mặc định phải là "chưa được phép xem", không phải "cho xem đã rồi tính sau".
      final member = FamilyMember.fromJson(const <String, dynamic>{});
      expect(member.status, 'Pending');
      expect(member.isVerified, isFalse);
    });

    test('Thiếu cờ quyền thì mặc định là KHÔNG có quyền', () {
      final member = FamilyMember.fromJson({'status': 'Verified'});

      expect(member.canViewResults, isFalse);
      expect(member.canBookAppointments, isFalse);
      expect(member.canTakeQueueNumber, isFalse);
    });

    test('Ba quyền tách rời nhau, bật cái này không kéo theo cái kia', () {
      final member = FamilyMember.fromJson({
        'status': 'Verified', 'canTakeQueueNumber': true,
      });

      expect(member.canTakeQueueNumber, isTrue);
      expect(member.canViewResults, isFalse,
          reason: 'lấy hộ số thứ tự không đồng nghĩa với được đọc kết quả xét nghiệm');
      expect(member.canBookAppointments, isFalse);
    });

    test('Trạng thái lạ từ máy chủ cũng KHÔNG mở khoá', () {
      expect(FamilyMember.fromJson({'status': 'Approved'}).isVerified, isFalse);
      expect(FamilyMember.fromJson({'status': 'verified'}).isVerified, isFalse,
          reason: 'so khớp đúng chữ với máy chủ; lệch hoa thường là lệch hợp đồng, phải sửa máy chủ');
    });
  });

  group('FamilyList — giới hạn 20 thành viên theo HSMT', () {
    test('Máy chủ không nói thì mặc định vẫn là 20', () {
      expect(FamilyList.fromJson(const <String, dynamic>{}).maxMembers, 20);
    });

    test('Danh sách rỗng đọc ra rỗng chứ không null', () {
      expect(FamilyList.fromJson(const <String, dynamic>{}).items, isEmpty);
    });

    test('Đọc đúng số thành viên và mức trần máy chủ trả về', () {
      final list = FamilyList.fromJson({
        'maxMembers': 20,
        'items': [
          {'id': '1', 'name': 'Mẹ', 'status': 'Verified'},
          {'id': '2', 'name': 'Con', 'status': 'Pending'},
        ],
      });

      expect(list.items, hasLength(2));
      expect(list.items.where((m) => m.isVerified), hasLength(1));
    });
  });

  group('FamilyVerification — hai đường xác minh, không có đường thứ ba', () {
    test('member_otp nhận đúng', () {
      expect(FamilyVerification.parse('member_otp'), FamilyVerification.memberOtp);
    });

    test('Mọi thứ khác rơi về khai giấy tờ — đường CHẶT hơn', () {
      // OTP tự động là đường dễ; nhận nhầm sang OTP thì kẻ khai bừa được cấp quyền mà không phải
      // chứng minh gì. Rơi về khai CCCD/ngày sinh là hướng an toàn.
      expect(FamilyVerification.parse('identity_data'), FamilyVerification.identityData);
      expect(FamilyVerification.parse('phuong_thuc_moi'), FamilyVerification.identityData);
      expect(FamilyVerification.parse(null), FamilyVerification.identityData);
      expect(FamilyVerification.parse(''), FamilyVerification.identityData);
    });

    test('Kết quả thêm người thân giữ nguyên số điện thoại ĐÃ CHE của máy chủ', () {
      final result = AddFamilyMemberResult.fromJson({
        'linkId': 'l1', 'memberName': 'Nguyễn Thị C',
        'verificationMethod': 'member_otp', 'maskedPhone': '+8491****678',
      }, 'Đã gửi mã xác minh.');

      expect(result.verification, FamilyVerification.memberOtp);
      expect(result.maskedPhone, '+8491****678');
      expect(result.maskedPhone, isNot(contains('912345678')));
    });
  });

  group('PatientDocument — loại tệp và cỡ tệp', () {
    PatientDocument doc({String type = 'image/png', int size = 0}) =>
        PatientDocument.fromJson({'contentType': type, 'sizeBytes': size});

    test('Nhận đúng ảnh và PDF', () {
      expect(doc(type: 'application/pdf').isPdf, isTrue);
      expect(doc(type: 'application/pdf').isImage, isFalse);
      expect(doc(type: 'image/jpeg').isImage, isTrue);
      expect(doc(type: 'image/png').isImage, isTrue);
      expect(doc(type: 'image/heic').isImage, isTrue);
    });

    test('Loại tệp lạ không phải ảnh cũng không phải PDF', () {
      // Màn hình sẽ hiện biểu tượng chung chứ không cố mở như ảnh rồi vỡ.
      expect(doc(type: 'application/zip').isImage, isFalse);
      expect(doc(type: 'application/zip').isPdf, isFalse);
      expect(doc(type: '').isImage, isFalse);
    });

    test('Cỡ tệp hiện theo cách người Việt đọc: dấu phẩy thập phân', () {
      expect(doc(size: 1024 * 1024).readableSize, '1,0 MB');
      expect(doc(size: (1.5 * 1024 * 1024).round()).readableSize, '1,5 MB');
      expect(doc(size: 512 * 1024).readableSize, '512 KB');
    });

    test('Tệp bằng 0 byte vẫn hiện được, không chia cho 0', () {
      expect(doc(size: 0).readableSize, '0 KB');
    });

    test('Nguồn mặc định là do người bệnh tự thêm', () {
      expect(PatientDocument.fromJson(const <String, dynamic>{}).source, 'manual');
    });

    test('Nhóm giấy tờ khớp hằng số máy chủ, giá trị lạ rơi về "Khác"', () {
      expect(DocumentCategory.parse('IdentityCard'), DocumentCategory.identityCard);
      expect(DocumentCategory.parse('InsuranceCard'), DocumentCategory.insuranceCard);
      expect(DocumentCategory.parse('MotNhomMoi'), DocumentCategory.other);
      expect(DocumentCategory.parse(null), DocumentCategory.other);

      final values = DocumentCategory.values.map((c) => c.value).toList();
      expect(values.toSet(), hasLength(values.length), reason: 'mã nhóm không được trùng nhau');
    });
  });

  group('DocumentWallet — hạn mức dung lượng', () {
    test('Tỉ lệ đã dùng nằm trong khoảng 0..1', () {
      final wallet = DocumentWallet.fromJson({
        'usedBytes': 50 * 1024 * 1024, 'quotaBytes': 100 * 1024 * 1024,
      });
      expect(wallet.usedRatio, closeTo(0.5, 0.001));
    });

    test('Vượt hạn mức thì thanh chỉ đầy chứ không tràn ra ngoài', () {
      final wallet = DocumentWallet.fromJson({
        'usedBytes': 150 * 1024 * 1024, 'quotaBytes': 100 * 1024 * 1024,
      });
      expect(wallet.usedRatio, 1.0);
    });

    test('Hạn mức bằng 0 (máy chủ chưa trả) KHÔNG làm chia cho 0', () {
      final wallet = DocumentWallet.fromJson(const <String, dynamic>{});
      expect(wallet.usedRatio, 0);
    });

    test('Dòng "đã dùng / tổng" đọc được bằng tiếng Việt', () {
      final wallet = DocumentWallet.fromJson({
        'usedBytes': (2.5 * 1024 * 1024).round(), 'quotaBytes': 100 * 1024 * 1024,
      });
      expect(wallet.readableUsed, '2,5 MB / 100 MB');
    });
  });
}
