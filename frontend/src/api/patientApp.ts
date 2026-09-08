/**
 * API quản trị app bệnh nhân (HSMT I.3).
 *
 * Gọi thẳng BFF `HIS.PatientApp.Api` chứ không qua HIS Core: dữ liệu tài khoản app, liên kết gia
 * đình, ví giấy tờ và chiến dịch thông báo đều thuộc về BFF. Token dùng chung với HIS — BFF xác thực
 * bằng chính khoá của HIS Core (lược đồ `HisStaff`), nên nhân viên không phải đăng nhập lần thứ hai.
 */

import axios from 'axios';

/**
 * Địa chỉ BFF. Mặc định `/patient-api` để reverse proxy định tuyến ở môi trường thật; môi trường
 * phát triển đặt `VITE_PATIENT_APP_API_URL=http://localhost:5200`.
 */
const PATIENT_APP_API_URL: string =
  (import.meta.env.VITE_PATIENT_APP_API_URL as string | undefined) ?? '/patient-api';

const client = axios.create({
  baseURL: `${PATIENT_APP_API_URL.replace(/\/$/, '')}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Bóc vỏ {success,data} giống apiClient của HIS, để trang gọi nhận thẳng payload.
client.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    response.data = body.data;
  }
  return response;
});

// ───────────────────────────────────────────────────────────── kiểu dữ liệu

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface PatientAppDashboard {
  windowDays: number;
  totalAccounts: number;
  linkedAccounts: number;
  lockedAccounts: number;
  newAccounts: number;
  activeAccounts: number;
  devices: number;
  devicesWithPush: number;
  queueTicketsTaken: number;
  appointmentsBooked: number;
  notificationsSent: number;
  notificationsRead: number;
  familyLinks: number;
  documentsStored: number;
  registrationsByDay: DailyCount[];
}

export interface PatientAppAccount {
  id: string;
  phoneNumber: string;
  fullName: string;
  hisPatientId?: string | null;
  hisPatientCode?: string | null;
  status: string;
  mustChangePassword: boolean;
  hasPin: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  deviceCount: number;
}

export interface PatientAppFamilyLink {
  id: string;
  ownerAccountId: string;
  ownerName: string;
  ownerPhone: string;
  memberName: string;
  memberPatientCode: string;
  relationship: string;
  status: string;
  verificationMethod?: string | null;
  verifiedAt?: string | null;
  canViewResults: boolean;
}

export interface PatientAppAuditLog {
  id: number;
  actorAccountId?: string | null;
  actorHisUserId?: string | null;
  actorName: string;
  actorPhone: string;
  actorType: string;
  targetPatientId: string;
  action: string;
  resourceRef?: string | null;
  ip?: string | null;
  createdAt: string;
}

export interface PatientAppCampaign {
  id: string;
  title: string;
  body: string;
  category: string;
  deepLink?: string | null;
  audience: string;
  audienceName: string;
  scheduledAt?: string | null;
  status: string;
  recipientCount: number;
  readCount: number;
  sentAt?: string | null;
  failureReason?: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CreateCampaignPayload {
  title: string;
  body: string;
  category?: string;
  deepLink?: string;
  audience: string;
  accountIds?: string[];
  scheduledAt?: string | null;
}

export interface StaffPatient {
  patientId: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: number | null;
  phoneNumber?: string | null;
  hasAppAccount: boolean;
  appAccountId?: string | null;
  appAccountStatus?: string | null;
  appMustChangePassword: boolean;
  appLastLoginAt?: string | null;
}

export interface StaffPatientSummary {
  patient: StaffPatient;
  appointments: Array<{
    appointmentCode: string;
    appointmentDate: string;
    appointmentTime?: string | null;
    departmentName?: string | null;
    doctorName?: string | null;
    statusName?: string | null;
  }>;
  labResults: Array<{
    id: string;
    orderCode?: string | null;
    serviceName?: string | null;
    resultDate?: string | null;
    status?: string | null;
    hasAbnormal: boolean;
  }>;
  imagingResults: Array<{
    id: string;
    modality?: string | null;
    bodyPart?: string | null;
    studyDate?: string | null;
    impression?: string | null;
    status?: string | null;
  }>;
  prescriptions: Array<{
    id: string;
    prescriptionCode?: string | null;
    prescriptionDate: string;
    doctorName?: string | null;
    status?: string | null;
  }>;
  admissions: Array<{
    id: string;
    admissionDate: string;
    departmentName?: string | null;
    statusName?: string | null;
    daysOfStay: number;
  }>;
  queueTicketsToday: Array<{
    id: string;
    ticketCode: string;
    roomName?: string | null;
    priority: number;
  }>;
}

// ───────────────────────────────────────────────────────────── quản trị

const admin = '/admin/patient-app';

export const getDashboard = (days = 30): Promise<PatientAppDashboard> =>
  client.get(`${admin}/dashboard`, { params: { days } }).then((r) => r.data);

export const getAccounts = (params: {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PatientAppAccount>> =>
  client.get(`${admin}/accounts`, { params }).then((r) => r.data);

export const setAccountStatus = (
  accountId: string,
  status: string,
  reason?: string,
): Promise<void> =>
  client.put(`${admin}/accounts/${accountId}/status`, { status, reason }).then(() => undefined);

/** Trả về mật khẩu tạm để nhân viên đọc cho người bệnh. */
export const resetAccountPassword = (accountId: string): Promise<{ temporaryPassword: string }> =>
  client.post(`${admin}/accounts/${accountId}/reset-password`).then((r) => r.data);

export const getFamilyLinks = (params: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PatientAppFamilyLink>> =>
  client.get(`${admin}/family-links`, { params }).then((r) => r.data);

export const revokeFamilyLink = (linkId: string, reason?: string): Promise<void> =>
  client.delete(`${admin}/family-links/${linkId}`, { params: { reason } }).then(() => undefined);

export const getAuditLogs = (params: {
  patientId?: string;
  accountId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PatientAppAuditLog>> =>
  client.get(`${admin}/audit-logs`, { params }).then((r) => r.data);

export const getCampaigns = (params: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PatientAppCampaign>> =>
  client.get(`${admin}/campaigns`, { params }).then((r) => r.data);

export const createCampaign = (payload: CreateCampaignPayload): Promise<PatientAppCampaign> =>
  client.post(`${admin}/campaigns`, payload).then((r) => r.data);

export const cancelCampaign = (campaignId: string): Promise<void> =>
  client.delete(`${admin}/campaigns/${campaignId}`).then(() => undefined);

// ───────────────────────────────────────────────────────────── tra cứu

const lookup = '/staff/lookup';

export const searchPatients = (keyword: string): Promise<StaffPatient[]> =>
  client.get(`${lookup}/patients`, { params: { keyword } }).then((r) => r.data);

export const getPatientSummary = (patientId: string): Promise<StaffPatientSummary> =>
  client.get(`${lookup}/patients/${patientId}/summary`).then((r) => r.data);

export const resetPatientAppPassword = (
  patientId: string,
): Promise<{ temporaryPassword: string }> =>
  client.post(`${lookup}/patients/${patientId}/reset-app-password`).then((r) => r.data);

export const getPatientAccessLog = (patientId: string): Promise<PatientAppAuditLog[]> =>
  client.get(`${lookup}/patients/${patientId}/access-log`).then((r) => r.data);
