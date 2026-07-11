import apiClient from '../../../services/apiClient';

const BASE = '/adr-report';

// ─── DTO interfaces ──────────────────────────────────────────────────────────

export interface AdrReportDto {
  id: string;
  patientName: string;
  patientCode?: string;
  patientAge: string;
  gender: number;          // 0=Không rõ, 1=Nam, 2=Nữ
  weight?: number;
  prescriptionId?: string;
  drugName: string;
  drugDose?: string;
  drugRoute?: string;
  reactionDescription: string;
  reactionStartDate: string; // ISO datetime
  /** 1=Nhẹ, 2=Trung bình, 3=Nặng, 4=Nguy kịch/Tử vong */
  severity: number;
  outcome?: string;
  managementTaken?: string;
  causality?: string;
  reporterName?: string;
  reportDate: string; // ISO datetime
  notes?: string;
  createdAt?: string;
}

export interface AdrReportSummaryDto {
  totalReports: number;
  severityMild: number;
  severityModerate: number;
  severitySevere: number;
  severityCritical: number;
  fromDate?: string;
  toDate?: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const getAdrReports = (params?: {
  from?: string;
  to?: string;
  keyword?: string;
}) =>
  apiClient
    .get<AdrReportDto[]>(BASE, { params })
    .then(r => r.data);

export const saveAdrReport = (dto: Partial<AdrReportDto>) =>
  apiClient
    .post<AdrReportDto>(BASE, dto)
    .then(r => r.data);

export const deleteAdrReport = (id: string) =>
  apiClient
    .delete(`${BASE}/${id}`)
    .then(r => r.data);

export const getAdrReportSummary = (params?: { from?: string; to?: string }) =>
  apiClient
    .get<AdrReportSummaryDto>(`${BASE}/report`, { params })
    .then(r => r.data);
