/// Một giấy tờ trong ví (HSMT I.2 #8).
class PatientDocument {
  const PatientDocument({
    required this.id,
    required this.category,
    required this.title,
    required this.fileName,
    required this.contentType,
    required this.sizeBytes,
    required this.source,
    this.note,
    this.createdAt,
  });

  final String id;
  final String category;
  final String title;
  final String fileName;
  final String contentType;
  final int sizeBytes;

  /// manual = tự thêm · his = bệnh viện xuất ra.
  final String source;
  final String? note;
  final DateTime? createdAt;

  bool get isPdf => contentType == 'application/pdf';
  bool get isImage => contentType.startsWith('image/');

  /// "1,2 MB" — cỡ tệp cho người đọc, không phải cho máy.
  String get readableSize {
    if (sizeBytes >= 1024 * 1024) {
      return '${(sizeBytes / 1024 / 1024).toStringAsFixed(1).replaceAll('.', ',')} MB';
    }
    return '${(sizeBytes / 1024).round()} KB';
  }

  factory PatientDocument.fromJson(Map<String, dynamic> json) => PatientDocument(
        id: json['id'] as String? ?? '',
        category: json['category'] as String? ?? 'Other',
        title: json['title'] as String? ?? '',
        fileName: json['fileName'] as String? ?? '',
        contentType: json['contentType'] as String? ?? '',
        sizeBytes: json['sizeBytes'] as int? ?? 0,
        source: json['source'] as String? ?? 'manual',
        note: json['note'] as String?,
        createdAt: json['createdAt'] is String
            ? DateTime.tryParse(json['createdAt'] as String)
            : null,
      );
}

class DocumentWallet {
  const DocumentWallet({
    required this.items,
    required this.usedBytes,
    required this.quotaBytes,
    required this.maxFileBytes,
  });

  final List<PatientDocument> items;
  final int usedBytes;
  final int quotaBytes;
  final int maxFileBytes;

  double get usedRatio => quotaBytes == 0 ? 0 : (usedBytes / quotaBytes).clamp(0, 1);

  String get readableUsed => '${(usedBytes / 1024 / 1024).toStringAsFixed(1).replaceAll('.', ',')} MB'
      ' / ${(quotaBytes / 1024 / 1024).round()} MB';

  factory DocumentWallet.fromJson(Map<String, dynamic> json) => DocumentWallet(
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((e) => PatientDocument.fromJson(e as Map<String, dynamic>))
            .toList(),
        usedBytes: json['usedBytes'] as int? ?? 0,
        quotaBytes: json['quotaBytes'] as int? ?? 0,
        maxFileBytes: json['maxFileBytes'] as int? ?? 0,
      );
}

/// Nhóm giấy tờ, khớp với hằng số bên máy chủ.
enum DocumentCategory {
  identityCard('IdentityCard', 'CCCD / CMND'),
  insuranceCard('InsuranceCard', 'Thẻ BHYT'),
  referral('Referral', 'Giấy chuyển tuyến'),
  appointment('Appointment', 'Giấy hẹn khám'),
  dischargePaper('DischargePaper', 'Giấy ra viện'),
  prescription('Prescription', 'Toa thuốc'),
  invoice('Invoice', 'Hoá đơn'),
  other('Other', 'Khác');

  const DocumentCategory(this.value, this.label);
  final String value;
  final String label;

  static DocumentCategory parse(String? value) =>
      DocumentCategory.values.firstWhere((c) => c.value == value,
          orElse: () => DocumentCategory.other);
}
