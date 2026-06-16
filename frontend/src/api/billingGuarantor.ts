import apiClient from './client';

const BASE = '/billing-guarantor';

// ─── DTO interfaces ──────────────────────────────────────────────────────────

export interface SponsorOrgDto {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
}

export interface BillingGuarantorDto {
  id: string;
  sponsorOrgId: string;
  /** join từ SponsorOrg — chỉ đọc */
  sponsorOrgName?: string;
  patientId?: string;
  medicalRecordId?: string;
  guaranteeNo?: string;
  /** Tỷ lệ bảo lãnh 0-100 (%) */
  guaranteeRate: number;
  /** Hạn mức tiền (null = không giới hạn) */
  guaranteeAmount?: number;
  fromDate?: string;
  toDate?: string;
  /** 0=Hiệu lực, 1=Hết hạn, 2=Hủy */
  status: number;
  notes?: string;
}

export interface GuarantorDebtReportDto {
  sponsorOrgId: string;
  sponsorOrgName: string;
  totalGuaranteed: number;
  count: number;
}

// ─── SponsorOrg ─────────────────────────────────────────────────────────────

export const getSponsorOrgs = (keyword?: string) =>
  apiClient.get<SponsorOrgDto[]>(`${BASE}/sponsor-orgs`, { params: { keyword } }).then(r => r.data);

export const saveSponsorOrg = (dto: Partial<SponsorOrgDto>) =>
  apiClient.post<SponsorOrgDto>(`${BASE}/sponsor-orgs`, dto).then(r => r.data);

export const deleteSponsorOrg = (id: string) =>
  apiClient.delete(`${BASE}/sponsor-orgs/${id}`).then(r => r.data);

// ─── BillingGuarantor ───────────────────────────────────────────────────────

export const getGuarantors = (params?: {
  patientId?: string;
  medicalRecordId?: string;
  keyword?: string;
}) =>
  apiClient.get<BillingGuarantorDto[]>(`${BASE}/guarantors`, { params }).then(r => r.data);

export const saveGuarantor = (dto: Partial<BillingGuarantorDto>) =>
  apiClient.post<BillingGuarantorDto>(`${BASE}/guarantors`, dto).then(r => r.data);

export const deleteGuarantor = (id: string) =>
  apiClient.delete(`${BASE}/guarantors/${id}`).then(r => r.data);

// ─── Debt report ─────────────────────────────────────────────────────────────

export const getDebtReport = (from?: string, to?: string) =>
  apiClient.get<GuarantorDebtReportDto[]>(`${BASE}/debt-report`, { params: { from, to } }).then(r => r.data);
