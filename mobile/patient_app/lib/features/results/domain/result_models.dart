/// Mô hình kết quả khám chữa bệnh ngoại trú (HSMT I.2 #5).
///
/// Mọi trường đều chịu được `null`: dữ liệu đến từ bệnh án thật, và bệnh án thật thì luôn có ô trống.
/// Màn hình phải hiển thị được phần đã có thay vì trắng cả trang chỉ vì thiếu một trường.
library;

import '../../../core/json.dart';

DateTime? _date(Object? value) =>
    value is String && value.isNotEmpty ? DateTime.tryParse(value) : null;

/// Một lượt khám.
class Visit {
  const Visit({
    required this.visitId,
    required this.visitDate,
    this.department,
    this.doctorName,
    this.diagnosis,
    this.summary,
  });

  final String visitId;
  final DateTime? visitDate;
  final String? department;
  final String? doctorName;
  final String? diagnosis;
  final String? summary;

  factory Visit.fromJson(Map<String, dynamic> json) => Visit(
        visitId: json['visitId'] as String? ?? '',
        visitDate: _date(json['visitDate']),
        department: json['department'] as String?,
        doctorName: json['doctorName'] as String?,
        diagnosis: json['diagnosis'] as String?,
        summary: json['summary'] as String?,
      );
}

/// Một chỉ số trong phiếu xét nghiệm.
class LabTestItem {
  const LabTestItem({
    required this.testName,
    required this.result,
    required this.flag,
    this.unit,
    this.normalRange,
    this.interpretation,
  });

  final String testName;
  final String result;
  final String? unit;
  final String? normalRange;

  /// Normal · High · Low · Critical — máy chủ đã quy đổi từ cờ của máy xét nghiệm.
  final String flag;
  final String? interpretation;

  /// Cờ rỗng nghĩa là **máy chủ không nói gì**, không phải "bất thường".
  ///
  /// Trước đây phép so là `flag != 'Normal'`, nên một cờ rỗng làm cả bảng đỏ rực kèm cảnh báo
  /// "phiếu này có chỉ số ngoài khoảng tham chiếu" — đúng cái làm người bệnh hoảng, và tệ hơn là làm
  /// chỉ số bất thường thật lẫn vào giữa hàng chục dòng đỏ giả.
  ///
  /// Ngược lại, một cờ **lạ** (server sau này thêm giá trị mới) vẫn tính là bất thường: thà đánh dấu
  /// thừa còn hơn giấu mất một chỉ số nguy hiểm vì app chưa biết tên cờ đó.
  bool get isAbnormal {
    final f = flag.trim();
    return f.isNotEmpty && f.toLowerCase() != 'normal';
  }

  bool get isCritical => flag.trim().toLowerCase() == 'critical';
  bool get isHigh => flag.trim().toLowerCase() == 'high';
  bool get isLow => flag.trim().toLowerCase() == 'low';

  factory LabTestItem.fromJson(Map<String, dynamic> json) => LabTestItem(
        testName: json['testName'] as String? ?? '',
        result: json['result'] as String? ?? '',
        unit: json['unit'] as String?,
        normalRange: json['normalRange'] as String?,
        flag: json['flag'] as String? ?? 'Normal',
        interpretation: json['interpretation'] as String?,
      );
}

class LabResult {
  const LabResult({
    required this.id,
    required this.orderCode,
    required this.status,
    required this.hasAbnormal,
    required this.testItems,
    this.serviceName,
    this.testCategory,
    this.orderDate,
    this.resultDate,
    this.orderingDoctor,
    this.department,
    this.visitId,
  });

  final String id;
  final String orderCode;
  final String? serviceName;
  final String? testCategory;
  final DateTime? orderDate;
  final DateTime? resultDate;
  final String? orderingDoctor;
  final String? department;
  final String status;
  final bool hasAbnormal;
  final String? visitId;
  final List<LabTestItem> testItems;

  bool get isCompleted => status == 'Completed';
  String get title => serviceName?.isNotEmpty == true ? serviceName! : orderCode;

  factory LabResult.fromJson(Map<String, dynamic> json) => LabResult(
        id: json['id'] as String? ?? '',
        orderCode: json['orderCode'] as String? ?? '',
        serviceName: json['serviceName'] as String?,
        testCategory: json['testCategory'] as String?,
        orderDate: _date(json['orderDate']),
        resultDate: _date(json['resultDate']),
        orderingDoctor: json['orderingDoctor'] as String?,
        department: json['department'] as String?,
        status: json['status'] as String? ?? 'Pending',
        hasAbnormal: asBool(json['hasAbnormal']),
        visitId: json['visitId'] as String?,
        testItems: (json['testItems'] as List<dynamic>? ?? const [])
            .map((e) => LabTestItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ImagingResult {
  const ImagingResult({
    required this.id,
    required this.orderCode,
    required this.status,
    required this.hasImages,
    required this.imageCount,
    this.modality,
    this.bodyPart,
    this.studyDescription,
    this.studyDate,
    this.findings,
    this.impression,
    this.recommendations,
    this.reportingDoctor,
    this.orderingDoctor,
    this.visitId,
  });

  final String id;
  final String orderCode;
  final String? modality;
  final String? bodyPart;
  final String? studyDescription;
  final DateTime? studyDate;
  final String? findings;
  final String? impression;
  final String? recommendations;
  final String? reportingDoctor;
  final String? orderingDoctor;
  final String status;
  final bool hasImages;
  final int imageCount;
  final String? visitId;

  bool get isCompleted => status == 'Completed';

  String get title {
    final parts = [modality, bodyPart].where((p) => p?.isNotEmpty == true).cast<String>();
    if (parts.isNotEmpty) return parts.join(' · ');
    return studyDescription?.isNotEmpty == true ? studyDescription! : orderCode;
  }

  factory ImagingResult.fromJson(Map<String, dynamic> json) => ImagingResult(
        id: json['id'] as String? ?? '',
        orderCode: json['orderCode'] as String? ?? '',
        modality: json['modality'] as String?,
        bodyPart: json['bodyPart'] as String?,
        studyDescription: json['studyDescription'] as String?,
        studyDate: _date(json['studyDate']),
        findings: json['findings'] as String?,
        impression: json['impression'] as String?,
        recommendations: json['recommendations'] as String?,
        reportingDoctor: json['reportingDoctor'] as String?,
        orderingDoctor: json['orderingDoctor'] as String?,
        status: json['status'] as String? ?? 'Pending',
        hasImages: asBool(json['hasImages']),
        imageCount: asInt(json['imageCount']),
        visitId: json['visitId'] as String?,
      );
}

/// Một ảnh trong ca chụp. Ảnh tải qua BFF nên app không cần biết địa chỉ PACS.
class ImagingInstance {
  const ImagingInstance({
    required this.instanceId,
    required this.seriesNumber,
    required this.instanceNumber,
    this.seriesDescription,
  });

  final String instanceId;
  final int seriesNumber;
  final int instanceNumber;
  final String? seriesDescription;

  factory ImagingInstance.fromJson(Map<String, dynamic> json) => ImagingInstance(
        instanceId: json['instanceId'] as String? ?? '',
        seriesNumber: asInt(json['seriesNumber']),
        instanceNumber: asInt(json['instanceNumber']),
        seriesDescription: json['seriesDescription'] as String?,
      );
}

class FunctionalMeasurement {
  const FunctionalMeasurement({required this.name, required this.value});
  final String name;
  final String value;

  factory FunctionalMeasurement.fromJson(Map<String, dynamic> json) => FunctionalMeasurement(
        name: json['name'] as String? ?? '',
        value: json['value'] as String? ?? '',
      );
}

class FunctionalResult {
  const FunctionalResult({
    required this.id,
    required this.testCode,
    required this.testTypeName,
    required this.measurements,
    this.performedAt,
    this.performingDoctorName,
    this.deviceName,
    this.clinicalIndication,
    this.findings,
    this.conclusion,
    this.recommendation,
    this.statusName,
  });

  final String id;
  final String testCode;
  final String testTypeName;
  final DateTime? performedAt;
  final String? performingDoctorName;
  final String? deviceName;
  final String? clinicalIndication;
  final String? findings;
  final String? conclusion;
  final String? recommendation;
  final String? statusName;
  final List<FunctionalMeasurement> measurements;

  factory FunctionalResult.fromJson(Map<String, dynamic> json) => FunctionalResult(
        id: json['id'] as String? ?? '',
        testCode: json['testCode'] as String? ?? '',
        testTypeName: json['testTypeName'] as String? ?? json['testType'] as String? ?? '',
        performedAt: _date(json['performedAt']),
        performingDoctorName: json['performingDoctorName'] as String?,
        deviceName: json['deviceName'] as String?,
        clinicalIndication: json['clinicalIndication'] as String?,
        findings: json['findings'] as String?,
        conclusion: json['conclusion'] as String?,
        recommendation: json['recommendation'] as String?,
        statusName: json['statusName'] as String?,
        measurements: (json['measurements'] as List<dynamic>? ?? const [])
            .map((e) => FunctionalMeasurement.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class HealthCheckup {
  const HealthCheckup({
    required this.id,
    required this.certificateIssued,
    this.recordCode,
    this.campaignName,
    this.companyName,
    this.checkupDate,
    this.healthClassification,
    this.conclusion,
    this.recommendation,
    this.certificateNumber,
  });

  final String id;
  final String? recordCode;
  final String? campaignName;
  final String? companyName;
  final DateTime? checkupDate;
  final String? healthClassification;
  final String? conclusion;
  final String? recommendation;
  final bool certificateIssued;
  final String? certificateNumber;

  factory HealthCheckup.fromJson(Map<String, dynamic> json) => HealthCheckup(
        id: json['id'] as String? ?? '',
        recordCode: json['recordCode'] as String?,
        campaignName: json['campaignName'] as String?,
        companyName: json['companyName'] as String?,
        checkupDate: _date(json['checkupDate']),
        healthClassification: json['healthClassification'] as String?,
        conclusion: json['conclusion'] as String?,
        recommendation: json['recommendation'] as String?,
        certificateIssued: asBool(json['certificateIssued']),
        certificateNumber: json['certificateNumber'] as String?,
      );
}

class PrescriptionItem {
  const PrescriptionItem({
    required this.drugName,
    required this.quantity,
    this.strength,
    this.unit,
    this.dosage,
    this.frequency,
    this.durationDays,
    this.instructions,
  });

  final String drugName;
  final String? strength;
  final num quantity;
  final String? unit;
  final String? dosage;
  final String? frequency;
  final int? durationDays;
  final String? instructions;

  /// "1 viên · 2 lần/ngày · 7 ngày" — ghép sẵn để màn hình khỏi lặp logic.
  String get schedule => [
        if (dosage?.isNotEmpty == true) dosage!,
        if (frequency?.isNotEmpty == true) frequency!,
        if ((durationDays ?? 0) > 0) '$durationDays ngày',
      ].join(' · ');

  factory PrescriptionItem.fromJson(Map<String, dynamic> json) => PrescriptionItem(
        drugName: json['drugName'] as String? ?? '',
        strength: json['strength'] as String?,
        quantity: asDouble(json['quantity']),
        unit: json['unit'] as String?,
        dosage: json['dosage'] as String?,
        frequency: json['frequency'] as String?,
        durationDays: tryAsInt(json['durationDays']),
        instructions: json['instructions'] as String?,
      );
}

class Prescription {
  const Prescription({
    required this.id,
    required this.prescriptionCode,
    required this.items,
    required this.isDispensed,
    this.prescriptionDate,
    this.doctorName,
    this.departmentName,
    this.diagnosis,
    this.status,
  });

  final String id;
  final String prescriptionCode;
  final DateTime? prescriptionDate;
  final String? doctorName;
  final String? departmentName;
  final String? diagnosis;
  final String? status;
  final bool isDispensed;
  final List<PrescriptionItem> items;

  factory Prescription.fromJson(Map<String, dynamic> json) => Prescription(
        id: json['id'] as String? ?? '',
        prescriptionCode: json['prescriptionCode'] as String? ?? '',
        prescriptionDate: _date(json['prescriptionDate']),
        doctorName: json['doctorName'] as String?,
        departmentName: json['departmentName'] as String?,
        diagnosis: json['diagnosis'] as String?,
        status: json['status'] as String?,
        isDispensed: asBool(json['isDispensed']),
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((e) => PrescriptionItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
