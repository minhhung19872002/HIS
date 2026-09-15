/**
 * API Client cho Phân hệ 11: Telemedicine (Khám bệnh từ xa)
 * Module: Telemedicine
 */

import apiClient from '../../../services/apiClient';

// ==================== INTERFACES ====================

// #region Appointment DTOs

export interface TelemedicineAppointmentDto {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  phone: string;
  email?: string;
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  doctorSpecialty?: string;
  departmentId: string;
  departmentName: string;
  appointmentType: number; // 1-FirstVisit, 2-FollowUp, 3-SecondOpinion
  appointmentTypeName: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  chiefComplaint?: string;
  status: number;
  statusName: string;
  videoRoomUrl?: string;
  sessionId?: string;
  consultationId?: string;
  prescriptionId?: string;
  fee: number;
  paymentStatus: number;
  paymentStatusName: string;
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface CreateTelemedicineAppointmentDto {
  patientId: string;
  doctorId: string;
  departmentId?: string;
  appointmentType: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  chiefComplaint?: string;
  notes?: string;
}

export interface RescheduleAppointmentDto {
  appointmentId: string;
  newDate: string;
  newTime: string;
  reason?: string;
}

export interface AppointmentSearchDto {
  keyword?: string;
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Video Session DTOs

export interface VideoSessionDto {
  id: string;
  sessionCode: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  roomUrl: string;
  roomToken: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  status: number;
  statusName: string;
  quality: number;
  qualityName: string;
  hasRecording: boolean;
  recordingUrl?: string;
  technicalIssues?: string;
  createdAt: string;
}

export interface CreateVideoSessionDto {
  appointmentId: string;
  roomConfig?: VideoRoomConfigDto;
}

export interface VideoRoomConfigDto {
  enableRecording: boolean;
  enableScreenShare: boolean;
  enableChat: boolean;
  maxDurationMinutes: number;
  waitingRoomEnabled: boolean;
}

export interface JoinSessionDto {
  sessionId: string;
  participantType: number; // 1-Doctor, 2-Patient, 3-Observer
  participantId: string;
  deviceInfo?: string;
}

export interface SessionJoinResultDto {
  success: boolean;
  roomUrl: string;
  token: string;
  expiresAt: string;
  errorMessage?: string;
}

// #endregion

// #region Consultation DTOs

export interface TeleconsultationDto {
  id: string;
  consultationCode: string;
  sessionId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
  vitalSigns?: VitalSignsDto;
  physicalExamination?: string;
  assessment?: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  diagnosisSecondary?: string;
  treatmentPlan?: string;
  prescriptionId?: string;
  labOrderIds?: string[];
  imagingOrderIds?: string[];
  referralId?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  consultationNotes?: string;
  status: number;
  statusName: string;
  createdAt: string;
  completedAt?: string;
}

export interface VitalSignsDto {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  reportedBy: string;
  reportedAt: string;
}

export interface CreateConsultationDto {
  sessionId: string;
  appointmentId: string;
  chiefComplaint?: string;
  vitalSigns?: VitalSignsDto;
}

export interface UpdateConsultationDto {
  consultationId: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
  physicalExamination?: string;
  assessment?: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  diagnosisSecondary?: string;
  treatmentPlan?: string;
  consultationNotes?: string;
}

export interface CompleteConsultationDto {
  consultationId: string;
  /** Required by the BE upsert (records are keyed by session). */
  sessionId?: string;
  assessment: string;
  diagnosisMain: string;
  diagnosisMainIcd: string;
  treatmentPlan: string;
  followUpDate?: string;
  followUpInstructions?: string;
}

// #endregion

// #region E-Prescription DTOs
// F8 (2026-06-11): viết lại khớp contract BE THẬT (/telemedicine/prescriptions — TelePrescription*Dto).
// Bộ interface cũ (EPrescriptionDto/CreateEPrescriptionDto/SendToPharmacyDto, field consultationId/deliveryMethod)
// là stub không khớp BE và không page nào dùng — đã gỡ.

/** Item kê đơn tele — map BE TelePrescriptionItemDto (DrugId = Medicine.Id). */
export interface TelePrescriptionItemInput {
  drugId: string;
  drugCode?: string;
  drugName?: string;
  unit?: string;
  quantity: number;
  dosage?: string;
  frequency?: string;
  route?: string;
  durationDays?: number;
  instructions?: string;
}

/** Đơn thuốc tele — map BE TelePrescriptionDto (Status: Draft | Signed | SentToPharmacy | Dispensed). */
export interface TelePrescriptionDto {
  id: string;
  prescriptionCode?: string;
  status?: string;
  items?: TelePrescriptionItemInput[];
}

// #endregion

// #region Patient Portal Integration DTOs

export interface PatientTelemedAccountDto {
  id: string;
  patientId: string;
  patientName: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredLanguage: string;
  notificationPreferences: NotificationPreferencesDto;
  devices: PatientDeviceDto[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface NotificationPreferencesDto {
  emailReminders: boolean;
  smsReminders: boolean;
  pushNotifications: boolean;
  reminderMinutesBefore: number;
}

export interface PatientDeviceDto {
  id: string;
  deviceType: string;
  deviceName: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  lastUsedAt: string;
  isActive: boolean;
}

export interface DoctorAvailabilityDto {
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  slots: TimeSlotDto[];
}

export interface TimeSlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentId?: string;
}

// #endregion

// #region Dashboard DTOs

export interface TelemedicineDashboardDto {
  date: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  averageWaitTimeMinutes: number;
  averageConsultationDurationMinutes: number;
  totalRevenue: number;
  prescriptionsSent: number;
  patientSatisfactionScore?: number;
  upcomingAppointments: TelemedicineAppointmentDto[];
  byDoctor: DoctorTelemedicineStatDto[];
  byDepartment: DepartmentTelemedicineStatDto[];
}

export interface DoctorTelemedicineStatDto {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
  completedCount: number;
  averageDurationMinutes: number;
  revenue: number;
}

export interface DepartmentTelemedicineStatDto {
  departmentId: string;
  departmentName: string;
  appointmentCount: number;
  completedCount: number;
  revenue: number;
}

// #endregion

// #region Common DTOs

import type { PagedResultDto } from '../../../types/pagination';
export type { PagedResultDto } from '../../../types/pagination';

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/telemedicine';

// #region BE contract adapters
// BE (TelemedicineController) returns TeleAppointmentDto[] with string status + appointmentDate/startTime,
// not the paged numeric-status shape this module was written against → the v2 list was always empty.

/** Raw BE TeleAppointmentDto (camelCase). */
interface BeTeleAppointment {
  id: string; appointmentCode: string; patientId: string; patientName?: string; patientCode?: string;
  patientPhone?: string; doctorId: string; doctorName?: string; specialityId?: string; specialityName?: string;
  appointmentDate: string; startTime?: string; endTime?: string; status: string; appointmentType?: string;
  chiefComplaint?: string; fee?: number; paymentStatus?: string; createdAt: string;
  sessionId?: string; videoRoomUrl?: string;
}

const TELE_STATUS: Record<string, number> = { Pending: 0, Confirmed: 1, InProgress: 2, Completed: 3, Cancelled: 4, NoShow: 5 };
const TELE_STATUS_NAME: Record<number, string> = { 0: 'Đã đặt', 1: 'Đã xác nhận', 2: 'Đang khám', 3: 'Hoàn tất', 4: 'Đã huỷ', 5: 'Không tham gia' };

const minutesBetween = (start?: string, end?: string) => {
  const toMin = (t?: string) => { const [h, m] = (t || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN; };
  const d = toMin(end) - toMin(start);
  return Number.isFinite(d) && d > 0 ? d : 30;
};

const mapTeleAppointment = (a: BeTeleAppointment): TelemedicineAppointmentDto => {
  const status = TELE_STATUS[a.status] ?? 0;
  const time = (a.startTime || '').slice(0, 5);
  return {
    id: a.id, appointmentCode: a.appointmentCode, patientId: a.patientId, patientCode: a.patientCode || '',
    patientName: a.patientName || '', phone: a.patientPhone || '', doctorId: a.doctorId, doctorCode: '',
    doctorName: a.doctorName || '', departmentId: a.specialityId || '', departmentName: a.specialityName || '',
    appointmentType: 1, appointmentTypeName: a.appointmentType || '',
    scheduledDate: time ? `${(a.appointmentDate || '').slice(0, 10)}T${time}:00` : a.appointmentDate,
    scheduledTime: time, durationMinutes: minutesBetween(a.startTime, a.endTime),
    chiefComplaint: a.chiefComplaint, status, statusName: TELE_STATUS_NAME[status],
    videoRoomUrl: a.videoRoomUrl || undefined, sessionId: a.sessionId || undefined,
    fee: a.fee || 0, paymentStatus: a.paymentStatus === 'Paid' ? 1 : 0, paymentStatusName: '',
    createdAt: a.createdAt,
  };
};

// #endregion

// #region Appointments

export const getAppointments = async (params: AppointmentSearchDto) => {
  const res = await apiClient.get<BeTeleAppointment[] | PagedResultDto<TelemedicineAppointmentDto>>(`${BASE_URL}/appointments`, { params });
  const raw = res.data;
  const items = Array.isArray(raw) ? raw.map(mapTeleAppointment) : (raw?.items ?? []);
  const data: PagedResultDto<TelemedicineAppointmentDto> = { items, totalCount: items.length, pageNumber: 1, pageSize: items.length, totalPages: 1 };
  return { ...res, data };
};

export const getAppointmentById = async (id: string) => {
  const res = await apiClient.get<BeTeleAppointment>(`${BASE_URL}/appointments/${id}`);
  return { ...res, data: res.data ? mapTeleAppointment(res.data) : (res.data as unknown as TelemedicineAppointmentDto) };
};

export const getPatientAppointments = (patientId: string, status?: number) =>
  apiClient.get<TelemedicineAppointmentDto[]>(`${BASE_URL}/patients/${patientId}/appointments`, { params: { status } });

export const getDoctorAppointments = (doctorId: string, date: string) =>
  apiClient.get<TelemedicineAppointmentDto[]>(`${BASE_URL}/doctors/${doctorId}/appointments`, { params: { date } });

export const createAppointment = (dto: CreateTelemedicineAppointmentDto) =>
  apiClient.post<TelemedicineAppointmentDto>(`${BASE_URL}/appointments`, dto);

export const rescheduleAppointment = (dto: RescheduleAppointmentDto) =>
  apiClient.post<TelemedicineAppointmentDto>(`${BASE_URL}/appointments/reschedule`, dto);

export const cancelAppointment = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/appointments/${id}/cancel`, { reason });

export const confirmAppointment = (id: string) =>
  apiClient.post<TelemedicineAppointmentDto>(`${BASE_URL}/appointments/${id}/confirm`);

export const getDoctorAvailability = (doctorId: string, fromDate: string, toDate: string) =>
  apiClient.get<DoctorAvailabilityDto[]>(`${BASE_URL}/doctors/${doctorId}/availability`, { params: { fromDate, toDate } });

// #endregion

// #region Video Sessions

/** BE TeleSessionDto → roomUrl comes from doctorJoinUrl (Jitsi). */
export const createVideoSession = async (dto: CreateVideoSessionDto) => {
  const res = await apiClient.post<VideoSessionDto & { doctorJoinUrl?: string }>(`${BASE_URL}/sessions/start`, { appointmentId: dto.appointmentId });
  const s = res.data;
  return { ...res, data: s ? { ...s, roomUrl: s.roomUrl || s.doctorJoinUrl || '' } : s };
};

export const getVideoSession = (id: string) =>
  apiClient.get<VideoSessionDto>(`${BASE_URL}/sessions/${id}`);

export const joinSession = (dto: JoinSessionDto) =>
  apiClient.post<SessionJoinResultDto>(`${BASE_URL}/sessions/join`, dto);

export const endSession = (id: string, reason?: string) =>
  apiClient.post<VideoSessionDto>(`${BASE_URL}/sessions/${id}/end`, { reason });

export const reportTechnicalIssue = (sessionId: string, issue: string) =>
  apiClient.post<boolean>(`${BASE_URL}/sessions/${sessionId}/technical-issue`, { issue });

export const getSessionRecording = (sessionId: string) =>
  apiClient.get(`${BASE_URL}/sessions/${sessionId}/recording`, { responseType: 'blob' });

// #endregion

// #region Consultations

export const createConsultation = (dto: CreateConsultationDto) =>
  apiClient.post<TeleconsultationDto>(`${BASE_URL}/consultations`, dto);

export const getConsultation = (id: string) =>
  apiClient.get<TeleconsultationDto>(`${BASE_URL}/consultations/${id}`);

export const getConsultationByAppointment = (appointmentId: string) =>
  apiClient.get<TeleconsultationDto>(`${BASE_URL}/appointments/${appointmentId}/consultation`);

export const updateConsultation = (dto: UpdateConsultationDto) =>
  apiClient.put<TeleconsultationDto>(`${BASE_URL}/consultations/${dto.consultationId}`, dto);

/** BE has no /consultations/complete: the record is an upsert keyed by sessionId (SaveTeleConsultationDto). */
export const completeConsultation = (dto: CompleteConsultationDto) =>
  apiClient.post<TeleconsultationDto>(`${BASE_URL}/consultations`, {
    id: dto.consultationId || undefined,
    sessionId: dto.sessionId,
    assessment: dto.assessment,
    primaryDiagnosis: dto.diagnosisMain,
    primaryDiagnosisICD: dto.diagnosisMainIcd || undefined,
    plan: dto.treatmentPlan,
    followUpDate: dto.followUpDate,
    followUpInstructions: dto.followUpInstructions,
  });

export const getPatientConsultationHistory = (patientId: string, page?: number, pageSize?: number) =>
  apiClient.get<PagedResultDto<TeleconsultationDto>>(`${BASE_URL}/patients/${patientId}/consultations`, { params: { page, pageSize } });

// #endregion

// #region E-Prescriptions (F8 — 3 endpoint BE thật; các fn cũ trỏ endpoint không tồn tại đã gỡ)

/** Kê đơn từ buổi tele (persist TelePrescription + items). */
export const createEPrescription = (sessionId: string, items: TelePrescriptionItemInput[], note?: string) =>
  apiClient.post<TelePrescriptionDto>(`${BASE_URL}/prescriptions`, { sessionId, items, note });

/** BS ký đơn (Draft → Signed). */
export const signEPrescription = (id: string) =>
  apiClient.post<TelePrescriptionDto>(`${BASE_URL}/prescriptions/${id}/sign`);

/** Gửi đơn sang quầy phát thuốc nội viện (tạo Prescription thật, idempotent). */
export const sendToPharmacy = (prescriptionId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/prescriptions/send-to-pharmacy`, { prescriptionId });

// #endregion

// #region Patient Account

export const getPatientTelemedAccount = (patientId: string) =>
  apiClient.get<PatientTelemedAccountDto>(`${BASE_URL}/patients/${patientId}/account`);

export const updateNotificationPreferences = (patientId: string, preferences: NotificationPreferencesDto) =>
  apiClient.put<PatientTelemedAccountDto>(`${BASE_URL}/patients/${patientId}/notification-preferences`, preferences);

export const registerPatientDevice = (patientId: string, device: PatientDeviceDto) =>
  apiClient.post<PatientDeviceDto>(`${BASE_URL}/patients/${patientId}/devices`, device);

export const removePatientDevice = (patientId: string, deviceId: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/patients/${patientId}/devices/${deviceId}`);

// #endregion

// #region Dashboard & Reports

/** BE TelemedicineDashboardDto uses todayX / averageX names — map onto the FE shape (stats tab showed blanks). */
export const getDashboard = async (date: string, departmentId?: string) => {
  type BeDash = Partial<TelemedicineDashboardDto> & {
    todayAppointments?: number; todayCompleted?: number; todayCancelled?: number; todayNoShow?: number;
    todayRevenue?: number; averageWaitMinutes?: number; averageSessionMinutes?: number; averageRating?: number;
  };
  const res = await apiClient.get<BeDash>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });
  const d = res.data;
  const data: TelemedicineDashboardDto | undefined = d ? {
    date: String(d.date ?? date),
    totalAppointments: d.totalAppointments ?? d.todayAppointments ?? 0,
    completedAppointments: d.completedAppointments ?? d.todayCompleted ?? 0,
    cancelledAppointments: d.cancelledAppointments ?? d.todayCancelled ?? 0,
    noShowAppointments: d.noShowAppointments ?? d.todayNoShow ?? 0,
    averageWaitTimeMinutes: d.averageWaitTimeMinutes ?? d.averageWaitMinutes ?? 0,
    averageConsultationDurationMinutes: d.averageConsultationDurationMinutes ?? d.averageSessionMinutes ?? 0,
    totalRevenue: d.totalRevenue ?? d.todayRevenue ?? 0,
    prescriptionsSent: d.prescriptionsSent ?? 0,
    patientSatisfactionScore: d.patientSatisfactionScore ?? d.averageRating,
    upcomingAppointments: d.upcomingAppointments ?? [],
    byDoctor: d.byDoctor ?? [],
    byDepartment: d.byDepartment ?? [],
  } : undefined;
  return { ...res, data };
};

export const getTelemedicineStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportTelemedicineReport = (fromDate: string, toDate: string, format: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { fromDate, toDate, format }, responseType: 'blob' });

// #endregion

export default {
  // Appointments
  getAppointments,
  getAppointmentById,
  getPatientAppointments,
  getDoctorAppointments,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  confirmAppointment,
  getDoctorAvailability,
  // Sessions
  createVideoSession,
  getVideoSession,
  joinSession,
  endSession,
  reportTechnicalIssue,
  getSessionRecording,
  // Consultations
  createConsultation,
  getConsultation,
  getConsultationByAppointment,
  updateConsultation,
  completeConsultation,
  getPatientConsultationHistory,
  // E-Prescriptions (F8)
  createEPrescription,
  signEPrescription,
  sendToPharmacy,
  // Patient Account
  getPatientTelemedAccount,
  updateNotificationPreferences,
  registerPatientDevice,
  removePatientDevice,
  // Dashboard
  getDashboard,
  getTelemedicineStatistics,
  exportTelemedicineReport,
};
