/// Mô hình cho module tra cứu của nhân viên CSKH (HSMT I.3 #2.2).
library;

import '../../../core/json.dart';

DateTime? _date(Object? v) => v is String && v.isNotEmpty ? DateTime.tryParse(v) : null;

class StaffSession {
  const StaffSession({required this.token, required this.fullName, required this.roles});

  final String token;
  final String fullName;
  final List<String> roles;

  factory StaffSession.fromJson(Map<String, dynamic> json) => StaffSession(
        token: json['token'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        roles: (json['roles'] as List<dynamic>? ?? const []).cast<String>(),
      );
}

/// Một người bệnh trong kết quả tra cứu, kèm trạng thái tài khoản app.
class StaffPatient {
  const StaffPatient({
    required this.patientId,
    required this.patientCode,
    required this.fullName,
    required this.hasAppAccount,
    required this.appMustChangePassword,
    this.dateOfBirth,
    this.gender,
    this.phoneNumber,
    this.appAccountStatus,
    this.appLastLoginAt,
  });

  final String patientId;
  final String patientCode;
  final String fullName;
  final DateTime? dateOfBirth;
  final int? gender;
  final String? phoneNumber;

  final bool hasAppAccount;
  final String? appAccountStatus;
  final bool appMustChangePassword;
  final DateTime? appLastLoginAt;

  /// Câu trả lời ngắn cho "tài khoản app của người này đang thế nào".
  String get appStatusLabel {
    if (!hasAppAccount) return 'Chưa có tài khoản app';
    if (appAccountStatus != 'Active') return 'Tài khoản đang bị khoá';
    if (appMustChangePassword) return 'Đang chờ đổi mật khẩu';
    return 'Tài khoản hoạt động bình thường';
  }

  factory StaffPatient.fromJson(Map<String, dynamic> json) => StaffPatient(
        patientId: json['patientId'] as String? ?? '',
        patientCode: json['patientCode'] as String? ?? '',
        fullName: json['fullName'] as String? ?? '',
        dateOfBirth: _date(json['dateOfBirth']),
        gender: tryAsInt(json['gender']),
        phoneNumber: json['phoneNumber'] as String?,
        hasAppAccount: asBool(json['hasAppAccount']),
        appAccountStatus: json['appAccountStatus'] as String?,
        appMustChangePassword: asBool(json['appMustChangePassword']),
        appLastLoginAt: _date(json['appLastLoginAt']),
      );
}

/// Một dòng tóm tắt để hiện trong danh sách — cố ý phẳng, vì màn nhân viên chỉ cần đọc lướt.
class StaffSummaryLine {
  const StaffSummaryLine({required this.title, required this.subtitle, this.highlight = false});
  final String title;
  final String subtitle;
  final bool highlight;
}

/// Tất cả những gì nhân viên cần để trả lời người bệnh, lấy trong một lần gọi.
class StaffPatientSummary {
  const StaffPatientSummary({
    required this.patient,
    required this.queueTickets,
    required this.appointments,
    required this.labResults,
    required this.imagingResults,
    required this.prescriptions,
    required this.admissions,
  });

  final StaffPatient patient;
  final List<StaffSummaryLine> queueTickets;
  final List<StaffSummaryLine> appointments;
  final List<StaffSummaryLine> labResults;
  final List<StaffSummaryLine> imagingResults;
  final List<StaffSummaryLine> prescriptions;
  final List<StaffSummaryLine> admissions;

  static String _day(Object? value) {
    final date = _date(value);
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  static List<StaffSummaryLine> _map(
    Object? raw,
    StaffSummaryLine Function(Map<String, dynamic>) build,
  ) =>
      (raw as List<dynamic>? ?? const [])
          .map((e) => build(e as Map<String, dynamic>))
          .toList();

  factory StaffPatientSummary.fromJson(Map<String, dynamic> json) => StaffPatientSummary(
        patient: StaffPatient.fromJson(json['patient'] as Map<String, dynamic>? ?? const {}),
        queueTickets: _map(json['queueTicketsToday'], (t) => StaffSummaryLine(
              title: t['ticketCode'] as String? ?? '',
              subtitle: [
                if ((t['roomName'] as String?)?.isNotEmpty == true) t['roomName'] as String,
                if (asInt(t['priority']) > 0) 'số ưu tiên',
              ].join(' · '),
              highlight: asInt(t['priority']) > 0,
            )),
        appointments: _map(json['appointments'], (a) => StaffSummaryLine(
              title: a['appointmentCode'] as String? ?? '',
              subtitle: [
                _day(a['appointmentDate']),
                if ((a['departmentName'] as String?)?.isNotEmpty == true)
                  a['departmentName'] as String,
                if ((a['statusName'] as String?)?.isNotEmpty == true) a['statusName'] as String,
              ].where((s) => s.isNotEmpty).join(' · '),
            )),
        labResults: _map(json['labResults'], (l) => StaffSummaryLine(
              title: (l['serviceName'] as String?)?.isNotEmpty == true
                  ? l['serviceName'] as String
                  : l['orderCode'] as String? ?? '',
              subtitle: [
                _day(l['resultDate']),
                if (l['hasAbnormal'] == true) 'có chỉ số bất thường',
              ].where((s) => s.isNotEmpty).join(' · '),
              highlight: l['hasAbnormal'] == true,
            )),
        imagingResults: _map(json['imagingResults'], (i) => StaffSummaryLine(
              title: [i['modality'], i['bodyPart']]
                  .whereType<String>()
                  .where((s) => s.isNotEmpty)
                  .join(' · '),
              subtitle: [
                _day(i['studyDate']),
                if ((i['impression'] as String?)?.isNotEmpty == true) i['impression'] as String,
              ].where((s) => s.isNotEmpty).join(' · '),
            )),
        prescriptions: _map(json['prescriptions'], (p) => StaffSummaryLine(
              title: p['prescriptionCode'] as String? ?? '',
              subtitle: [
                _day(p['prescriptionDate']),
                if ((p['doctorName'] as String?)?.isNotEmpty == true)
                  'BS ${p['doctorName']}',
              ].where((s) => s.isNotEmpty).join(' · '),
            )),
        admissions: _map(json['admissions'], (a) => StaffSummaryLine(
              title: _day(a['admissionDate']),
              subtitle: [
                if ((a['departmentName'] as String?)?.isNotEmpty == true)
                  a['departmentName'] as String,
                if ((a['statusName'] as String?)?.isNotEmpty == true) a['statusName'] as String,
                '${a['daysOfStay'] ?? 0} ngày',
              ].join(' · '),
            )),
      );
}
