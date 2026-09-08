/// Thành viên gia đình đã kết nối (HSMT I.2 #7).
class FamilyMember {
  const FamilyMember({
    required this.id,
    required this.patientCode,
    required this.name,
    required this.status,
    required this.canViewResults,
    required this.canBookAppointments,
    required this.canTakeQueueNumber,
    this.relationship,
    this.verifiedAt,
  });

  final String id;
  final String patientCode;
  final String name;
  final String? relationship;

  /// Pending · Verified · Revoked.
  final String status;
  final bool canViewResults;
  final bool canBookAppointments;
  final bool canTakeQueueNumber;
  final DateTime? verifiedAt;

  /// Chỉ liên kết đã xác minh mới xem được hồ sơ.
  bool get isVerified => status == 'Verified';

  factory FamilyMember.fromJson(Map<String, dynamic> json) => FamilyMember(
        id: json['id'] as String? ?? '',
        patientCode: json['patientCode'] as String? ?? '',
        name: json['name'] as String? ?? '',
        relationship: json['relationship'] as String?,
        status: json['status'] as String? ?? 'Pending',
        canViewResults: json['canViewResults'] as bool? ?? false,
        canBookAppointments: json['canBookAppointments'] as bool? ?? false,
        canTakeQueueNumber: json['canTakeQueueNumber'] as bool? ?? false,
        verifiedAt: json['verifiedAt'] is String
            ? DateTime.tryParse(json['verifiedAt'] as String)
            : null,
      );
}

class FamilyList {
  const FamilyList({required this.items, required this.maxMembers});
  final List<FamilyMember> items;
  final int maxMembers;

  factory FamilyList.fromJson(Map<String, dynamic> json) => FamilyList(
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((e) => FamilyMember.fromJson(e as Map<String, dynamic>))
            .toList(),
        maxMembers: json['maxMembers'] as int? ?? 20,
      );
}

/// Cách máy chủ yêu cầu xác minh sau khi khai người thân.
enum FamilyVerification {
  /// Người thân có tài khoản app: mã OTP gửi tới số của chính họ.
  memberOtp,

  /// Người thân chưa có tài khoản: khai CCCD hoặc ngày sinh trên hồ sơ.
  identityData;

  static FamilyVerification parse(String? value) =>
      value == 'member_otp' ? FamilyVerification.memberOtp : FamilyVerification.identityData;
}

class AddFamilyMemberResult {
  const AddFamilyMemberResult({
    required this.linkId,
    required this.memberName,
    required this.verification,
    required this.message,
    this.maskedPhone,
  });

  final String linkId;
  final String memberName;
  final FamilyVerification verification;
  final String? maskedPhone;
  final String message;

  factory AddFamilyMemberResult.fromJson(Map<String, dynamic> data, String? message) =>
      AddFamilyMemberResult(
        linkId: data['linkId'] as String? ?? '',
        memberName: data['memberName'] as String? ?? '',
        verification: FamilyVerification.parse(data['verificationMethod'] as String?),
        maskedPhone: data['maskedPhone'] as String?,
        message: message ?? '',
      );
}
