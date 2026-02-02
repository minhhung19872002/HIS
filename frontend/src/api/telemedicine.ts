/**
 * API Client cho Phân hệ 11: Telemedicine (Khám bệnh từ xa)
 * Module: Telemedicine
 */

import apiClient from './client';

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
  departmentId: string;
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
  assessment: string;
  diagnosisMain: string;
  diagnosisMainIcd: string;
  treatmentPlan: string;
  followUpDate?: string;
  followUpInstructions?: string;
}

// #endregion

// #region E-Prescription DTOs

export interface EPrescriptionDto {
  id: string;
  prescriptionCode: string;
  consultationId: string;
  patientId: string;
  patientName: string;
  patientDob?: string;
  patientAddress?: string;
  doctorId: string;
  doctorName: string;
  doctorLicenseNumber: string;
  facilityName: string;
  facilityCode: string;
  diagnosisMain?: string;
  diagnosisMainIcd?: string;
  items: EPrescriptionItemDto[];
  instructions?: string;
  totalAmount: number;
  qrCode: string;
  digitalSignature?: string;
  validFrom: string;
  validTo: string;
  status: number;
  statusName: string;
  sentToPharmacy: boolean;
  pharmacyId?: string;
  pharmacyName?: string;
  dispensedAt?: string;
  createdAt: string;
}

export interface EPrescriptionItemDto {
  id: string;
  prescriptionId: string;
  drugId: string;
  drugCode: string;
  drugName: string;
  activeIngredient?: string;
  strength?: string;
  dosageForm?: string;
  quantity: number;
  unit: string;
  dosage: string;
  frequency: string;
  route: string;
  durationDays: number;
  instructions?: string;
  warnings?: string;
  unitPrice: number;
  amount: number;
}

export interface CreateEPrescriptionDto {
  consultationId: string;
  items: CreatePrescriptionItemDto[];
  instructions?: string;
  pharmacyId?: string;
}

export interface CreatePrescriptionItemDto {
  drugId: string;
  quantity: number;
  dosage: string;
  frequency: string;
  route?: string;
  durationDays: number;
  instructions?: string;
}

export interface SendToPharmacyDto {
  prescriptionId: string;
  pharmacyId: string;
  patientAddress?: string;
  deliveryMethod: number; // 1-Pickup, 2-Delivery
  notes?: string;
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

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/api/telemedicine';

// #region Appointments

export const getAppointments = (params: AppointmentSearchDto) =>
  apiClient.get<PagedResultDto<TelemedicineAppointmentDto>>(`${BASE_URL}/appointments`, { params });

export const getAppointmentById = (id: string) =>
  apiClient.get<TelemedicineAppointmentDto>(`${BASE_URL}/appointments/${id}`);

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

export const createVideoSession = (dto: CreateVideoSessionDto) =>
  apiClient.post<VideoSessionDto>(`${BASE_URL}/sessions`, dto);

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

export const completeConsultation = (dto: CompleteConsultationDto) =>
  apiClient.post<TeleconsultationDto>(`${BASE_URL}/consultations/complete`, dto);

export const getPatientConsultationHistory = (patientId: string, page?: number, pageSize?: number) =>
  apiClient.get<PagedResultDto<TeleconsultationDto>>(`${BASE_URL}/patients/${patientId}/consultations`, { params: { page, pageSize } });

// #endregion

// #region E-Prescriptions

export const createEPrescription = (dto: CreateEPrescriptionDto) =>
  apiClient.post<EPrescriptionDto>(`${BASE_URL}/prescriptions`, dto);

export const getEPrescription = (id: string) =>
  apiClient.get<EPrescriptionDto>(`${BASE_URL}/prescriptions/${id}`);

export const getEPrescriptionByQR = (qrCode: string) =>
  apiClient.get<EPrescriptionDto>(`${BASE_URL}/prescriptions/qr/${qrCode}`);

export const sendToPharmacy = (dto: SendToPharmacyDto) =>
  apiClient.post<EPrescriptionDto>(`${BASE_URL}/prescriptions/send-to-pharmacy`, dto);

export const cancelEPrescription = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/prescriptions/${id}/cancel`, { reason });

export const searchPharmacies = (keyword: string, location?: string) =>
  apiClient.get(`${BASE_URL}/pharmacies/search`, { params: { keyword, location } });

export const printEPrescription = (id: string) =>
  apiClient.get(`${BASE_URL}/prescriptions/${id}/print`, { responseType: 'blob' });

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

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<TelemedicineDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

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
  // E-Prescriptions
  createEPrescription,
  getEPrescription,
  getEPrescriptionByQR,
  sendToPharmacy,
  cancelEPrescription,
  searchPharmacies,
  printEPrescription,
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
