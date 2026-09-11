import 'package:dio/dio.dart';

import '../../../core/network/failure_mapper.dart';
import '../../queue/domain/queue_models.dart';
import '../domain/appointment_models.dart';

/// Gọi API đặt khám của BFF (HSMT I.2 #4).
class AppointmentRepository {
  AppointmentRepository(this._client);
  final Dio _client;

  static const _base = '/patient/appointments';

  Future<List<Department>> departments() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>('$_base/departments'));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => Department.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Doctor>> doctors({String? departmentId}) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          '$_base/doctors',
          queryParameters: {if (departmentId != null) 'departmentId': departmentId},
        ));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => Doctor.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SlotResult> slots({
    required DateTime date,
    String? departmentId,
    String? doctorId,
  }) async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(
          '$_base/slots',
          queryParameters: {
            'date': date.toIso8601String().split('T').first,
            if (departmentId != null) 'departmentId': departmentId,
            if (doctorId != null) 'doctorId': doctorId,
          },
        ));
    return SlotResult.fromJson(data['data'] as Map<String, dynamic>? ?? const {});
  }

  Future<List<Appointment>> myAppointments() async {
    final data = await _run(() => _client.get<Map<String, dynamic>>(_base));
    return (data['data'] as List<dynamic>? ?? const [])
        .map((e) => Appointment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Đặt lịch. Trả về thông điệp của server kèm SỐ THỨ TỰ đã giữ sẵn cho ngày khám.
  Future<BookingResult> book({
    required DateTime date,
    String? time,
    String? departmentId,
    String? doctorId,
    int appointmentType = 2,
    String? reason,
  }) async {
    final data = await _run(() => _client.post<Map<String, dynamic>>(
          _base,
          data: {
            'appointmentDate': date.toIso8601String(),
            if (time != null) 'appointmentTime': time,
            if (departmentId != null) 'departmentId': departmentId,
            if (doctorId != null) 'doctorId': doctorId,
            'appointmentType': appointmentType,
            if (reason != null && reason.isNotEmpty) 'reason': reason,
          },
        ));
    return BookingResult.fromJson(data);
  }

  Future<void> cancel(String appointmentCode, {String? reason}) =>
      _run(() => _client.put<Map<String, dynamic>>(
            '$_base/$appointmentCode/cancel',
            data: {'reason': reason},
          )).then((_) {});

  Future<void> reschedule(
    String appointmentCode, {
    required DateTime newDate,
    String? newTime,
    String? newDoctorId,
    String? reason,
  }) =>
      _run(() => _client.put<Map<String, dynamic>>(
            '$_base/$appointmentCode/reschedule',
            data: {
              'newAppointmentDate': newDate.toIso8601String(),
              if (newTime != null) 'newAppointmentTime': newTime,
              if (newDoctorId != null) 'newDoctorId': newDoctorId,
              if (reason != null && reason.isNotEmpty) 'reason': reason,
            },
          )).then((_) {});

  Future<Map<String, dynamic>> _run(
      Future<Response<Map<String, dynamic>>> Function() request) async {
    try {
      final response = await request();
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
