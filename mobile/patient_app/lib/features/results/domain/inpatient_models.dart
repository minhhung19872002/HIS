/// Mô hình nội trú (HSMT I.2 #6): đợt nằm viện, bảng công khai thuốc, chỉ định cận lâm sàng.
library;

import '../../../core/json.dart';

DateTime? _date(Object? value) =>
    value is String && value.isNotEmpty ? DateTime.tryParse(value) : null;

/// Một đợt nằm viện.
class Admission {
  const Admission({
    required this.id,
    required this.daysOfStay,
    required this.status,
    required this.isInProgress,
    this.medicalRecordCode,
    this.admissionDate,
    this.dischargeDate,
    this.departmentName,
    this.roomName,
    this.bedName,
    this.admittingDoctorName,
    this.reasonForAdmission,
    this.diagnosisOnAdmission,
    this.dischargeDiagnosis,
    this.statusName,
  });

  final String id;
  final String? medicalRecordCode;
  final DateTime? admissionDate;
  final DateTime? dischargeDate;
  final int daysOfStay;
  final String? departmentName;
  final String? roomName;
  final String? bedName;
  final String? admittingDoctorName;
  final String? reasonForAdmission;
  final String? diagnosisOnAdmission;
  final String? dischargeDiagnosis;
  final int status;
  final String? statusName;
  final bool isInProgress;

  /// Chẩn đoán ra viện nếu đã có, nếu chưa thì chẩn đoán lúc vào.
  String? get diagnosis => dischargeDiagnosis?.isNotEmpty == true
      ? dischargeDiagnosis
      : diagnosisOnAdmission;

  factory Admission.fromJson(Map<String, dynamic> json) => Admission(
        id: json['id'] as String? ?? '',
        medicalRecordCode: json['medicalRecordCode'] as String?,
        admissionDate: _date(json['admissionDate']),
        dischargeDate: _date(json['dischargeDate']),
        daysOfStay: asInt(json['daysOfStay']),
        departmentName: json['departmentName'] as String?,
        roomName: json['roomName'] as String?,
        bedName: json['bedName'] as String?,
        admittingDoctorName: json['admittingDoctorName'] as String?,
        reasonForAdmission: json['reasonForAdmission'] as String?,
        diagnosisOnAdmission: json['diagnosisOnAdmission'] as String?,
        dischargeDiagnosis: json['dischargeDiagnosis'] as String?,
        status: asInt(json['status']),
        statusName: json['statusName'] as String?,
        isInProgress: asBool(json['isInProgress']),
      );
}

class MedicineDisclosureItem {
  const MedicineDisclosureItem({
    required this.medicineName,
    required this.quantity,
    required this.unitPrice,
    required this.amount,
    this.prescriptionDate,
    this.activeIngredient,
    this.unit,
    this.paymentSourceName,
    this.dosage,
    this.frequency,
    this.usageInstructions,
  });

  final DateTime? prescriptionDate;
  final String medicineName;
  final String? activeIngredient;
  final String? unit;
  final num quantity;
  final num unitPrice;
  final num amount;
  final String? paymentSourceName;
  final String? dosage;
  final String? frequency;
  final String? usageInstructions;

  factory MedicineDisclosureItem.fromJson(Map<String, dynamic> json) => MedicineDisclosureItem(
        prescriptionDate: _date(json['prescriptionDate']),
        medicineName: json['medicineName'] as String? ?? '',
        activeIngredient: json['activeIngredient'] as String?,
        unit: json['unit'] as String?,
        quantity: asDouble(json['quantity']),
        unitPrice: asDouble(json['unitPrice']),
        amount: asDouble(json['amount']),
        paymentSourceName: json['paymentSourceName'] as String?,
        dosage: json['dosage'] as String?,
        frequency: json['frequency'] as String?,
        usageInstructions: json['usageInstructions'] as String?,
      );
}

/// Bảng công khai thuốc — mẫu 11D/BV-01/TT23 mà khoa dán ở đầu giường.
class MedicineDisclosure {
  const MedicineDisclosure({
    required this.items,
    required this.totalAmount,
    required this.insuranceAmount,
    required this.patientAmount,
    this.fromDate,
    this.toDate,
  });

  final DateTime? fromDate;
  final DateTime? toDate;
  final List<MedicineDisclosureItem> items;
  final num totalAmount;
  final num insuranceAmount;
  final num patientAmount;

  /// Nhóm theo ngày để dựng bảng giống bản in: mỗi ngày một khối.
  Map<DateTime, List<MedicineDisclosureItem>> get byDate {
    final grouped = <DateTime, List<MedicineDisclosureItem>>{};
    for (final item in items) {
      final date = item.prescriptionDate;
      if (date == null) continue;
      final key = DateTime(date.year, date.month, date.day);
      grouped.putIfAbsent(key, () => []).add(item);
    }
    return grouped;
  }

  factory MedicineDisclosure.fromJson(Map<String, dynamic> json) => MedicineDisclosure(
        fromDate: _date(json['fromDate']),
        toDate: _date(json['toDate']),
        items: (json['items'] as List<dynamic>? ?? const [])
            .map((e) => MedicineDisclosureItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalAmount: asDouble(json['totalAmount']),
        insuranceAmount: asDouble(json['insuranceAmount']),
        patientAmount: asDouble(json['patientAmount']),
      );
}

/// Một chỉ định cận lâm sàng trong đợt nội trú, kèm số thứ tự thực hiện.
class ServiceOrder {
  const ServiceOrder({
    required this.id,
    required this.serviceName,
    required this.status,
    required this.peopleAhead,
    this.orderCode,
    this.orderDate,
    this.requestTypeName,
    this.executeRoomName,
    this.orderingDoctor,
    this.statusName,
    this.resultDate,
    this.queueNumber,
  });

  final String id;
  final String? orderCode;
  final DateTime? orderDate;
  final String serviceName;
  final String? requestTypeName;
  final String? executeRoomName;
  final String? orderingDoctor;
  final int status;
  final String? statusName;
  final DateTime? resultDate;

  /// Rỗng khi chưa lấy số hoặc phòng đó không phát số.
  final String? queueNumber;

  /// -1 = không xác định được còn bao nhiêu người trước.
  final int peopleAhead;

  bool get hasResult => status == 2;
  bool get hasQueueNumber => queueNumber?.isNotEmpty == true;

  factory ServiceOrder.fromJson(Map<String, dynamic> json) => ServiceOrder(
        id: json['id'] as String? ?? '',
        orderCode: json['orderCode'] as String?,
        orderDate: _date(json['orderDate']),
        serviceName: json['serviceName'] as String? ?? '',
        requestTypeName: json['requestTypeName'] as String?,
        executeRoomName: json['executeRoomName'] as String?,
        orderingDoctor: json['orderingDoctor'] as String?,
        status: asInt(json['status']),
        statusName: json['statusName'] as String?,
        resultDate: _date(json['resultDate']),
        queueNumber: json['queueNumber'] as String?,
        peopleAhead: asInt(json['peopleAhead'], fallback: -1),
      );
}
