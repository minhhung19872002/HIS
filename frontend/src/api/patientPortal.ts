/**
 * API Client cho Phân hệ 18: Patient Portal (Cổng Bệnh nhân)
 * Module: Patient Portal
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Account Management DTOs

export interface PatientAccountDto {
  id: string;
  accountCode: string;
  patientId?: string;
  patientCode?: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  idNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  avatarUrl?: string;
  isLinkedToPatient: boolean;
  linkVerificationMethod?: string;
  linkedDate?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  preferredLanguage: string;
  notificationSettings: NotificationSettingsDto;
  emergencyContacts?: EmergencyContactDto[];
  healthInsurance?: InsuranceInfoDto;
  primaryCareProvider?: string;
  accountStatus: number; // 1-Active, 2-Suspended, 3-Deactivated
  accountStatusName: string;
  lastLoginAt?: string;
  loginCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationSettingsDto {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  reminderHoursBefore: number;
  labResultsNotify: boolean;
  prescriptionNotify: boolean;
  billingNotify: boolean;
  promotionalMessages: boolean;
}

export interface EmergencyContactDto {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface InsuranceInfoDto {
  insuranceProvider: string;
  policyNumber: string;
  cardNumber: string;
  holderName: string;
  validFrom: string;
  validTo: string;
  coverageType?: string;
}

export interface RegisterAccountDto {
  fullName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  password: string;
  useEKYC: boolean;
}

export interface LinkPatientDto {
  patientCode: string;
  dateOfBirth: string;
  idNumber?: string;
  verificationMethod: string; // OTP, IDCard, InPerson
}

export interface UpdateAccountDto {
  phone?: string;
  email?: string;
  address?: string;
  preferredLanguage?: string;
  notificationSettings?: NotificationSettingsDto;
  emergencyContacts?: EmergencyContactDto[];
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// #endregion

// #region Appointment Booking DTOs

export interface OnlineAppointmentDto {
  id: string;
  appointmentCode: string;
  accountId: string;
  patientId?: string;
  patientName: string;
  appointmentType: string; // NewVisit, FollowUp, HealthCheck, Telemedicine
  appointmentTypeName: string;
  departmentId: string;
  departmentName: string;
  specialtyId?: string;
  specialtyName?: string;
  doctorId?: string;
  doctorCode?: string;
  doctorName?: string;
  preferredDate: string;
  preferredTime: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  chiefComplaint?: string;
  symptoms?: string[];
  isFirstVisit: boolean;
  insuranceUsed: boolean;
  insuranceNumber?: string;
  estimatedFee?: number;
  paymentStatus: number;
  paymentStatusName: string;
  confirmationCode?: string;
  qrCode?: string;
  checkInTime?: string;
  status: number; // 1-Requested, 2-Confirmed, 3-CheckedIn, 4-Completed, 5-Cancelled, 6-NoShow
  statusName: string;
  cancellationReason?: string;
  cancelledAt?: string;
  rescheduledFrom?: string;
  notes?: string;
  createdAt: string;
}

export interface BookAppointmentDto {
  appointmentType: string;
  departmentId: string;
  specialtyId?: string;
  doctorId?: string;
  preferredDate: string;
  preferredTime: string;
  chiefComplaint?: string;
  symptoms?: string[];
  isFirstVisit: boolean;
  insuranceUsed: boolean;
  insuranceNumber?: string;
  notes?: string;
}

export interface RescheduleAppointmentDto {
  appointmentId: string;
  newDate: string;
  newTime: string;
  reason?: string;
}

export interface DoctorSlotDto {
  doctorId: string;
  doctorName: string;
  doctorTitle?: string;
  specialty: string;
  department: string;
  photoUrl?: string;
  date: string;
  availableSlots: TimeSlotDto[];
  consultationFee?: number;
}

export interface TimeSlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  slotType: string; // Regular, Extended
}

export interface DepartmentInfoDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  specialties: SpecialtyInfoDto[];
  doctors: DoctorInfoDto[];
  operatingHours?: string;
  phone?: string;
}

export interface SpecialtyInfoDto {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface DoctorInfoDto {
  id: string;
  code: string;
  name: string;
  title?: string;
  specialty: string;
  experience?: string;
  education?: string;
  languages?: string[];
  photoUrl?: string;
  bio?: string;
  consultationFee?: number;
  rating?: number;
  reviewCount?: number;
}

// #endregion

// #region Health Records DTOs

export interface PatientHealthRecordDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  immunizations?: ImmunizationDto[];
  visits: VisitSummaryDto[];
  diagnoses: DiagnosisSummaryDto[];
  procedures: ProcedureSummaryDto[];
  vitalSignsTrend: VitalSignTrendDto[];
}

export interface ImmunizationDto {
  vaccineName: string;
  dateAdministered: string;
  provider: string;
  nextDueDate?: string;
}

export interface VisitSummaryDto {
  visitId: string;
  visitDate: string;
  visitType: string;
  department: string;
  doctorName: string;
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
}

export interface DiagnosisSummaryDto {
  diagnosisDate: string;
  diagnosisCode: string;
  diagnosisName: string;
  diagnosisType: string; // Primary, Secondary
  doctorName: string;
  status: string; // Active, Resolved
}

export interface ProcedureSummaryDto {
  procedureDate: string;
  procedureCode: string;
  procedureName: string;
  doctorName: string;
  outcome?: string;
}

export interface VitalSignTrendDto {
  date: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  weight?: number;
  bmi?: number;
  bloodGlucose?: number;
}

export interface MedicalDocumentDto {
  id: string;
  documentType: string; // DischargeSummary, LabReport, ImagingReport, Prescription, Certificate
  documentTypeName: string;
  title: string;
  date: string;
  department?: string;
  doctor?: string;
  summary?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  isDownloadable: boolean;
}

// #endregion

// #region Lab & Imaging Results DTOs

export interface LabResultDto {
  id: string;
  orderId: string;
  orderCode: string;
  testDate: string;
  testName: string;
  testCategory: string;
  sampleType?: string;
  orderingDoctor: string;
  results: LabResultItemDto[];
  interpretation?: string;
  status: string; // Pending, Partial, Final
  statusName: string;
  isAbnormal: boolean;
  reportUrl?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface LabResultItemDto {
  testItemName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  flag?: string; // H, L, HH, LL, Critical
  previousValue?: string;
  previousDate?: string;
}

export interface ImagingResultDto {
  id: string;
  orderId: string;
  orderCode: string;
  studyDate: string;
  modality: string; // XRay, CT, MRI, Ultrasound, etc.
  modalityName: string;
  bodyPart: string;
  studyDescription: string;
  orderingDoctor: string;
  radiologist?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  status: string;
  statusName: string;
  hasImages: boolean;
  thumbnailUrl?: string;
  reportUrl?: string;
  viewerUrl?: string;
  verifiedAt?: string;
}

// #endregion

// #region Prescription DTOs

export interface PrescriptionHistoryDto {
  id: string;
  prescriptionCode: string;
  prescribedDate: string;
  prescribedBy: string;
  department: string;
  diagnosis?: string;
  items: PrescriptionItemDto[];
  instructions?: string;
  validFrom: string;
  validTo: string;
  status: string; // Active, Dispensed, Expired, Cancelled
  statusName: string;
  dispensedAt?: string;
  dispensedBy?: string;
  refillsAllowed?: number;
  refillsUsed?: number;
  qrCode?: string;
}

export interface PrescriptionItemDto {
  drugName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  unit: string;
  instructions?: string;
  warnings?: string;
}

export interface RefillRequestDto {
  prescriptionId: string;
  reason?: string;
  preferredPharmacy?: string;
  deliveryMethod: string; // Pickup, Delivery
  deliveryAddress?: string;
}

export interface RefillResponseDto {
  id: string;
  prescriptionId: string;
  status: string; // Pending, Approved, Denied, Dispensed
  statusName: string;
  approvedBy?: string;
  approvedAt?: string;
  denialReason?: string;
  pickupDate?: string;
  deliveryDate?: string;
}

// #endregion

// #region Payment DTOs

export interface BillSummaryDto {
  id: string;
  billCode: string;
  billDate: string;
  visitId?: string;
  visitDate?: string;
  department?: string;
  doctor?: string;
  items: BillItemDto[];
  subtotal: number;
  discount?: number;
  insuranceCoverage?: number;
  patientResponsibility: number;
  amountPaid: number;
  amountDue: number;
  dueDate?: string;
  status: string; // Pending, PartialPaid, Paid, Overdue
  statusName: string;
  paymentHistory: PaymentRecordDto[];
}

export interface BillItemDto {
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insurancePays?: number;
  patientPays: number;
}

export interface PaymentRecordDto {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  receiptNumber?: string;
  status: string;
}

export interface OnlinePaymentDto {
  billIds: string[];
  paymentMethod: string; // CreditCard, DebitCard, BankTransfer, EWallet
  totalAmount: number;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResultDto {
  success: boolean;
  transactionId: string;
  paymentDate: string;
  amount: number;
  receiptNumber?: string;
  receiptUrl?: string;
  errorMessage?: string;
}

export interface PaymentMethodDto {
  id: string;
  type: string;
  name: string;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
  iconUrl?: string;
}

// #endregion

// #region Feedback DTOs

export interface FeedbackDto {
  id: string;
  feedbackCode: string;
  accountId: string;
  patientName: string;
  feedbackType: string; // Compliment, Suggestion, Complaint, General
  feedbackTypeName: string;
  category: string; // Service, Staff, Facility, Billing, Other
  categoryName: string;
  visitId?: string;
  visitDate?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  subject: string;
  message: string;
  rating?: number;
  attachments?: string[];
  status: number; // 1-Submitted, 2-InReview, 3-Resolved, 4-Closed
  statusName: string;
  responseMessage?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface SubmitFeedbackDto {
  feedbackType: string;
  category: string;
  visitId?: string;
  departmentId?: string;
  doctorId?: string;
  subject: string;
  message: string;
  rating?: number;
}

// #endregion

// #region Dashboard DTOs

export interface PatientPortalDashboardDto {
  accountId: string;
  patientName: string;
  // Appointments
  upcomingAppointments: OnlineAppointmentDto[];
  pastAppointments: OnlineAppointmentDto[];
  // Health Summary
  recentVitals?: VitalSignTrendDto;
  activeConditions?: string[];
  activeMedications?: string[];
  allergies?: string[];
  // Results
  pendingLabResults: number;
  newLabResults: LabResultDto[];
  newImagingResults: ImagingResultDto[];
  // Prescriptions
  activePrescriptions: PrescriptionHistoryDto[];
  refillsDue: PrescriptionHistoryDto[];
  // Billing
  outstandingBalance: number;
  pendingBills: BillSummaryDto[];
  // Notifications
  unreadNotifications: number;
  recentNotifications: NotificationDto[];
  // Quick actions
  canBookAppointment: boolean;
  canRequestRefill: boolean;
  canPayOnline: boolean;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
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

const BASE_URL = '/api/portal';

// #region Account Management

export const getAccount = () =>
  apiClient.get<PatientAccountDto>(`${BASE_URL}/account`);

export const registerAccount = (dto: RegisterAccountDto) =>
  apiClient.post<PatientAccountDto>(`${BASE_URL}/account/register`, dto);

export const updateAccount = (dto: UpdateAccountDto) =>
  apiClient.put<PatientAccountDto>(`${BASE_URL}/account`, dto);

export const linkPatient = (dto: LinkPatientDto) =>
  apiClient.post<PatientAccountDto>(`${BASE_URL}/account/link-patient`, dto);

export const verifyEmail = (token: string) =>
  apiClient.post<boolean>(`${BASE_URL}/account/verify-email`, { token });

export const verifyPhone = (otp: string) =>
  apiClient.post<boolean>(`${BASE_URL}/account/verify-phone`, { otp });

export const requestPhoneOTP = () =>
  apiClient.post<boolean>(`${BASE_URL}/account/request-otp`);

export const changePassword = (dto: ChangePasswordDto) =>
  apiClient.post<boolean>(`${BASE_URL}/account/change-password`, dto);

export const updateAvatar = (formData: FormData) =>
  apiClient.post<string>(`${BASE_URL}/account/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const enableTwoFactor = (method: string) =>
  apiClient.post(`${BASE_URL}/account/2fa/enable`, { method });

export const disableTwoFactor = (password: string) =>
  apiClient.post(`${BASE_URL}/account/2fa/disable`, { password });

export const getLoginHistory = (page?: number, pageSize?: number) =>
  apiClient.get(`${BASE_URL}/account/login-history`, { params: { page, pageSize } });

// #endregion

// #region Appointment Booking

export const getMyAppointments = (status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<OnlineAppointmentDto[]>(`${BASE_URL}/appointments`, { params: { status, fromDate, toDate } });

export const getAppointment = (id: string) =>
  apiClient.get<OnlineAppointmentDto>(`${BASE_URL}/appointments/${id}`);

export const bookAppointment = (dto: BookAppointmentDto) =>
  apiClient.post<OnlineAppointmentDto>(`${BASE_URL}/appointments`, dto);

export const rescheduleAppointment = (dto: RescheduleAppointmentDto) =>
  apiClient.post<OnlineAppointmentDto>(`${BASE_URL}/appointments/reschedule`, dto);

export const cancelAppointment = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/appointments/${id}/cancel`, { reason });

export const getDepartments = () =>
  apiClient.get<DepartmentInfoDto[]>(`${BASE_URL}/departments`);

export const getDoctors = (departmentId?: string, specialtyId?: string) =>
  apiClient.get<DoctorInfoDto[]>(`${BASE_URL}/doctors`, { params: { departmentId, specialtyId } });

export const getDoctorSlots = (doctorId: string, fromDate: string, toDate: string) =>
  apiClient.get<DoctorSlotDto[]>(`${BASE_URL}/doctors/${doctorId}/slots`, { params: { fromDate, toDate } });

export const getAvailableSlots = (departmentId: string, date: string, specialtyId?: string) =>
  apiClient.get<DoctorSlotDto[]>(`${BASE_URL}/slots`, { params: { departmentId, date, specialtyId } });

export const confirmAppointment = (id: string, paymentMethod?: string) =>
  apiClient.post<OnlineAppointmentDto>(`${BASE_URL}/appointments/${id}/confirm`, { paymentMethod });

export const getAppointmentQR = (id: string) =>
  apiClient.get(`${BASE_URL}/appointments/${id}/qr`, { responseType: 'blob' });

// #endregion

// #region Health Records

export const getHealthRecord = () =>
  apiClient.get<PatientHealthRecordDto>(`${BASE_URL}/health-records`);

export const getVisits = (fromDate?: string, toDate?: string, page?: number, pageSize?: number) =>
  apiClient.get<PagedResultDto<VisitSummaryDto>>(`${BASE_URL}/visits`, { params: { fromDate, toDate, page, pageSize } });

export const getVisitDetails = (visitId: string) =>
  apiClient.get(`${BASE_URL}/visits/${visitId}`);

export const getMedicalDocuments = (documentType?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<MedicalDocumentDto[]>(`${BASE_URL}/documents`, { params: { documentType, fromDate, toDate } });

export const downloadDocument = (documentId: string) =>
  apiClient.get(`${BASE_URL}/documents/${documentId}/download`, { responseType: 'blob' });

export const getVitalSignHistory = (fromDate?: string, toDate?: string) =>
  apiClient.get<VitalSignTrendDto[]>(`${BASE_URL}/vitals`, { params: { fromDate, toDate } });

export const requestRecordCopy = (recordTypes: string[], fromDate: string, toDate: string, purpose: string) =>
  apiClient.post(`${BASE_URL}/records/request-copy`, { recordTypes, fromDate, toDate, purpose });

// #endregion

// #region Lab & Imaging Results

export const getLabResults = (fromDate?: string, toDate?: string, status?: string) =>
  apiClient.get<LabResultDto[]>(`${BASE_URL}/lab-results`, { params: { fromDate, toDate, status } });

export const getLabResult = (id: string) =>
  apiClient.get<LabResultDto>(`${BASE_URL}/lab-results/${id}`);

export const downloadLabReport = (id: string) =>
  apiClient.get(`${BASE_URL}/lab-results/${id}/download`, { responseType: 'blob' });

export const getImagingResults = (fromDate?: string, toDate?: string, modality?: string) =>
  apiClient.get<ImagingResultDto[]>(`${BASE_URL}/imaging-results`, { params: { fromDate, toDate, modality } });

export const getImagingResult = (id: string) =>
  apiClient.get<ImagingResultDto>(`${BASE_URL}/imaging-results/${id}`);

export const downloadImagingReport = (id: string) =>
  apiClient.get(`${BASE_URL}/imaging-results/${id}/download`, { responseType: 'blob' });

export const getImageViewer = (id: string) =>
  apiClient.get<string>(`${BASE_URL}/imaging-results/${id}/viewer`);

// #endregion

// #region Prescriptions

export const getPrescriptions = (status?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<PrescriptionHistoryDto[]>(`${BASE_URL}/prescriptions`, { params: { status, fromDate, toDate } });

export const getPrescription = (id: string) =>
  apiClient.get<PrescriptionHistoryDto>(`${BASE_URL}/prescriptions/${id}`);

export const downloadPrescription = (id: string) =>
  apiClient.get(`${BASE_URL}/prescriptions/${id}/download`, { responseType: 'blob' });

export const requestRefill = (dto: RefillRequestDto) =>
  apiClient.post<RefillResponseDto>(`${BASE_URL}/prescriptions/refill`, dto);

export const getRefillRequests = () =>
  apiClient.get<RefillResponseDto[]>(`${BASE_URL}/prescriptions/refill-requests`);

export const cancelRefillRequest = (refillId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/prescriptions/refill/${refillId}/cancel`);

// #endregion

// #region Payments

export const getBills = (status?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<BillSummaryDto[]>(`${BASE_URL}/bills`, { params: { status, fromDate, toDate } });

export const getBill = (id: string) =>
  apiClient.get<BillSummaryDto>(`${BASE_URL}/bills/${id}`);

export const downloadBill = (id: string) =>
  apiClient.get(`${BASE_URL}/bills/${id}/download`, { responseType: 'blob' });

export const downloadReceipt = (paymentId: string) =>
  apiClient.get(`${BASE_URL}/payments/${paymentId}/receipt`, { responseType: 'blob' });

export const initiatePayment = (dto: OnlinePaymentDto) =>
  apiClient.post<{ paymentUrl: string, transactionId: string }>(`${BASE_URL}/payments/initiate`, dto);

export const completePayment = (transactionId: string, gatewayResponse: string) =>
  apiClient.post<PaymentResultDto>(`${BASE_URL}/payments/complete`, { transactionId, gatewayResponse });

export const getPaymentMethods = () =>
  apiClient.get<PaymentMethodDto[]>(`${BASE_URL}/payment-methods`);

export const addPaymentMethod = (dto: PaymentMethodDto) =>
  apiClient.post<PaymentMethodDto>(`${BASE_URL}/payment-methods`, dto);

export const removePaymentMethod = (id: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/payment-methods/${id}`);

export const setDefaultPaymentMethod = (id: string) =>
  apiClient.post<boolean>(`${BASE_URL}/payment-methods/${id}/set-default`);

// #endregion

// #region Feedback

export const getFeedbacks = () =>
  apiClient.get<FeedbackDto[]>(`${BASE_URL}/feedbacks`);

export const getFeedback = (id: string) =>
  apiClient.get<FeedbackDto>(`${BASE_URL}/feedbacks/${id}`);

export const submitFeedback = (dto: SubmitFeedbackDto) =>
  apiClient.post<FeedbackDto>(`${BASE_URL}/feedbacks`, dto);

// #endregion

// #region Dashboard & Notifications

export const getDashboard = () =>
  apiClient.get<PatientPortalDashboardDto>(`${BASE_URL}/dashboard`);

export const getNotifications = (unreadOnly?: boolean, page?: number, pageSize?: number) =>
  apiClient.get<PagedResultDto<NotificationDto>>(`${BASE_URL}/notifications`, { params: { unreadOnly, page, pageSize } });

export const markNotificationRead = (id: string) =>
  apiClient.post<boolean>(`${BASE_URL}/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  apiClient.post<boolean>(`${BASE_URL}/notifications/read-all`);

// #endregion

export default {
  // Account
  getAccount,
  registerAccount,
  updateAccount,
  linkPatient,
  verifyEmail,
  verifyPhone,
  requestPhoneOTP,
  changePassword,
  updateAvatar,
  enableTwoFactor,
  disableTwoFactor,
  getLoginHistory,
  // Appointments
  getMyAppointments,
  getAppointment,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getDepartments,
  getDoctors,
  getDoctorSlots,
  getAvailableSlots,
  confirmAppointment,
  getAppointmentQR,
  // Health Records
  getHealthRecord,
  getVisits,
  getVisitDetails,
  getMedicalDocuments,
  downloadDocument,
  getVitalSignHistory,
  requestRecordCopy,
  // Lab Results
  getLabResults,
  getLabResult,
  downloadLabReport,
  getImagingResults,
  getImagingResult,
  downloadImagingReport,
  getImageViewer,
  // Prescriptions
  getPrescriptions,
  getPrescription,
  downloadPrescription,
  requestRefill,
  getRefillRequests,
  cancelRefillRequest,
  // Payments
  getBills,
  getBill,
  downloadBill,
  downloadReceipt,
  initiatePayment,
  completePayment,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  // Feedback
  getFeedbacks,
  getFeedback,
  submitFeedback,
  // Dashboard
  getDashboard,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
