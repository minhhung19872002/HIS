import api from '../services/apiClient';

// ========================
// Phòng lưu / Observation ngắn hạn (N1.07) — API CLIENT
// Backend: ObservationStayController (route /api/observation), thao tác trực tiếp DbContext.
// Dùng cho màn Cấp cứu (EmergencyDisaster) persist ca cấp cứu thường (F3).
// ========================

/** 1=Đang lưu · 2=Cho về · 3=Chuyển nhập viện · 4=Chuyển viện · 5=Tử vong. */
export type ObservationStatus = 1 | 2 | 3 | 4 | 5;

export interface ObservationStayDto {
  id: string;
  stayCode: string;
  patientCode: string;
  patientName: string;
  gender?: number;
  dateOfBirth?: string;
  departmentName?: string | null;
  roomName?: string | null;
  bedName?: string | null;
  doctorName?: string | null;
  admittedAt: string;
  dischargedAt?: string | null;
  chiefComplaint?: string | null;
  initialDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  status: ObservationStatus;
  triageLevel?: number | null;
  dischargeReason?: string | null;
  ewsScore?: number | null;
  hoursInObservation?: number;
}

export interface CreateObservationStayDto {
  patientId: string;
  medicalRecordId?: string;
  departmentId?: string;
  roomId?: string;
  bedId?: string;
  doctorId?: string;
  chiefComplaint?: string;
  initialDiagnosis?: string;
  notes?: string;
  triageLevel?: number;
}

export interface ObservationVitalDto {
  temperature?: number;
  heartRate?: number;
  respirationRate?: number;
  bloodPressure?: string;
  spO2?: number;
  consciousness?: number;
  nurseNote?: string;
  doctorNote?: string;
}

export interface ObservationDischargeDto {
  finalDiagnosis?: string;
  dischargeReason?: string;
  notes?: string;
}

/** Danh sách phiên lưu (lọc theo trạng thái / từ khoá). */
export const listObservationStays = (status?: number, keyword?: string) =>
  api.get<ObservationStayDto[]>('/observation/list', { params: { status, keyword } });

/** Tiếp nhận vào phòng lưu → trả {id, stayCode}. */
export const createObservationStay = (dto: CreateObservationStayDto) =>
  api.post<{ id: string; stayCode: string }>('/observation', dto);

/** Ghi sinh hiệu / diễn biến → tính MEWS. */
export const addObservationVital = (id: string, dto: ObservationVitalDto) =>
  api.post<{ id: string; ewsScore: number }>(`/observation/${id}/vitals`, dto);

/** Cho về (status=2). */
export const dischargeObservationStay = (id: string, dto: ObservationDischargeDto) =>
  api.put<{ id: string; status: number }>(`/observation/${id}/discharge`, dto);

/** Chuyển nhập viện / escalate (status=3). */
export const escalateObservationStay = (id: string, dto: ObservationDischargeDto) =>
  api.put<{ id: string; status: number }>(`/observation/${id}/escalate`, dto);
