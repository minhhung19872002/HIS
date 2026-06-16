import apiClient from './client';

const BASE = '/kiosk';

// ─── DTO interfaces ──────────────────────────────────────────────────────────

export interface IssueTicketDto {
  departmentId?: string;
  roomId?: string;
  /** 'OPD' | 'LAB' | 'IMAGING' | 'PHARMACY' */
  serviceType?: string;
  patientName?: string;
  note?: string;
}

export interface CheckinByCardDto {
  citizenId?: string;
  insuranceCard?: string;
  departmentId?: string;
  roomId?: string;
  serviceType?: string;
  note?: string;
}

export interface CallNextDto {
  departmentId?: string;
  roomId?: string;
}

export interface KioskTicketDto {
  id: string;
  ticketNumber: string;
  sequenceNumber: number;
  patientName?: string;
  departmentName?: string;
  roomName?: string;
  serviceType?: string;
  /** 0=Chờ 1=Đã gọi 2=Hoàn tất 3=Hủy */
  status: number;
  statusLabel: string;
  issuedAt: string;
  calledAt?: string;
  note?: string;
  peopleAheadInQueue?: number;
}

export interface CheckinResultDto {
  ticket: KioskTicketDto;
  patientFound: boolean;
  maskedPatientName?: string;
  insuranceWarning?: string;
}

export interface QueueStatusDto {
  departmentId?: string;
  departmentName?: string;
  waitingCount: number;
  currentCalledTicket?: string;
  waitingTickets: KioskTicketDto[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Cấp số — không cần login (AllowAnonymous). */
export const issueTicket = (dto: IssueTicketDto) =>
  apiClient.post<KioskTicketDto>(`${BASE}/issue`, dto).then(r => r.data);

/** Checkin bằng CCCD/BHYT — không cần login. */
export const checkinByCard = (dto: CheckinByCardDto) =>
  apiClient.post<CheckinResultDto>(`${BASE}/checkin`, dto).then(r => r.data);

/** Trạng thái hàng chờ — không cần login. */
export const getQueueStatus = (departmentId?: string, roomId?: string) =>
  apiClient.get<QueueStatusDto>(`${BASE}/queue`, { params: { departmentId, roomId } }).then(r => r.data);

/** Chi tiết một phiếu — không cần login. */
export const getTicketById = (id: string) =>
  apiClient.get<KioskTicketDto>(`${BASE}/ticket/${id}`).then(r => r.data);

/** Gọi số tiếp theo — cần login (nhân viên). */
export const callNext = (dto: CallNextDto) =>
  apiClient.post<KioskTicketDto | { message: string }>(`${BASE}/call-next`, dto).then(r => r.data);

/** Hoàn tất phiếu — cần login. */
export const completeTicket = (id: string) =>
  apiClient.post<KioskTicketDto>(`${BASE}/ticket/${id}/complete`).then(r => r.data);

/** Hủy phiếu — cần login. */
export const cancelTicket = (id: string) =>
  apiClient.post<KioskTicketDto>(`${BASE}/ticket/${id}/cancel`).then(r => r.data);
