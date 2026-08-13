import apiClient from '../services/apiClient';

// ============================================================================
// NangCap27 G1 — Phiếu vận chuyển người bệnh (HSMT 4.1.8/4.1.30, 10.1.9/.11,
// 11.1.12/.14, 18.2.9/.11, 18.3.12/.14).
// Danh mục dịch vụ vận chuyển + giá xăng dùng lại /master-catalog/* sẵn có.
// ============================================================================

/** 0 = Nháp, 1 = Đã duyệt, 2 = Hoàn thành, 3 = Đã hủy */
export type TransportSlipStatus = 0 | 1 | 2 | 3;

export interface PatientTransportSlipDto {
  id: string;
  slipCode: string;
  patientId: string;
  patientCode?: string;
  patientName?: string;
  medicalRecordId?: string;
  examinationId?: string;
  departmentId?: string;
  departmentName?: string;
  transportServiceId: string;
  transportServiceName?: string;
  gasolinePriceId?: string;
  /** Loại nhiên liệu áp giá (RON 95 / E5 RON 92 / Diesel…) */
  fuelType?: string;
  transportDate: string;
  fromPlace: string;
  toPlace: string;
  reason?: string;
  vehiclePlate?: string;
  driverName?: string;
  escortStaff?: string;
  distanceKm: number;
  /** 1 = theo km, 2 = theo lượt */
  calculationType: number;
  unitPrice: number;
  gasolineFactor?: number;
  fuelPricePerLitre?: number;
  serviceAmount: number;
  fuelAmount: number;
  totalAmount: number;
  status: TransportSlipStatus;
  statusName: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  cancelReason?: string;
  note?: string;
  createdAt: string;
}

export interface SaveTransportSlipDto {
  id?: string;
  patientId: string;
  medicalRecordId?: string;
  examinationId?: string;
  departmentId?: string;
  transportServiceId: string;
  /** Loại nhiên liệu — phải khớp danh mục giá xăng, nếu không sẽ không tính được tiền xăng. */
  fuelType?: string;
  transportDate?: string;
  fromPlace: string;
  toPlace: string;
  reason?: string;
  vehiclePlate?: string;
  driverName?: string;
  escortStaff?: string;
  distanceKm: number;
  note?: string;
}

export interface TransportSlipFilter {
  patientId?: string;
  medicalRecordId?: string;
  examinationId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  status?: number;
  keyword?: string;
}

export const transportSlipApi = {
  list: (filter: TransportSlipFilter = {}) =>
    apiClient.get<PatientTransportSlipDto[]>('/transport-slips', { params: filter }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<PatientTransportSlipDto>(`/transport-slips/${id}`).then(r => r.data),
  save: (dto: SaveTransportSlipDto) =>
    apiClient.post<PatientTransportSlipDto>('/transport-slips', dto).then(r => r.data),
  approve: (id: string) =>
    apiClient.post<PatientTransportSlipDto>(`/transport-slips/${id}/approve`).then(r => r.data),
  complete: (id: string) =>
    apiClient.post<PatientTransportSlipDto>(`/transport-slips/${id}/complete`).then(r => r.data),
  cancel: (id: string, reason?: string) =>
    apiClient.post<PatientTransportSlipDto>(`/transport-slips/${id}/cancel`, { reason }).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/transport-slips/${id}`).then(r => r.data),
};

// ============================================================================
// NangCap27 G8 — KSK theo đoàn: danh mục công ty (17.1) + hợp đồng (17.2).
// Đợt khám / import Excel dùng lại /health-checkup/* sẵn có.
// ============================================================================

export interface CheckupCompanyDto {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  contactPhone?: string;
  note?: string;
  isActive: boolean;
  contractCount: number;
}

/** 0 = Nháp, 1 = Hiệu lực, 2 = Hoàn thành, 3 = Đã thanh lý */
export type CheckupContractStatus = 0 | 1 | 2 | 3;

export interface CheckupContractDto {
  id: string;
  contractCode: string;
  checkupCompanyId: string;
  companyName?: string;
  campaignId?: string;
  contractDate: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  packageName?: string;
  unitPrice: number;
  expectedHeadcount: number;
  totalAmount: number;
  status: CheckupContractStatus;
  statusName: string;
  note?: string;
  createdAt: string;
}

export interface SaveCheckupContractDto {
  id?: string;
  contractCode?: string;
  checkupCompanyId: string;
  campaignId?: string;
  contractDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  packageName?: string;
  unitPrice: number;
  expectedHeadcount: number;
  status: number;
  note?: string;
}

export interface CheckupContractFilter {
  checkupCompanyId?: string;
  fromDate?: string;
  toDate?: string;
  status?: number;
  keyword?: string;
}

export const checkupContractApi = {
  listCompanies: (keyword?: string, isActive?: boolean) =>
    apiClient
      .get<CheckupCompanyDto[]>('/checkup-contracts/companies', { params: { keyword, isActive } })
      .then(r => r.data),
  saveCompany: (dto: Partial<CheckupCompanyDto>) =>
    apiClient.post<CheckupCompanyDto>('/checkup-contracts/companies', dto).then(r => r.data),
  removeCompany: (id: string) =>
    apiClient.delete(`/checkup-contracts/companies/${id}`).then(r => r.data),

  list: (filter: CheckupContractFilter = {}) =>
    apiClient.get<CheckupContractDto[]>('/checkup-contracts', { params: filter }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<CheckupContractDto>(`/checkup-contracts/${id}`).then(r => r.data),
  save: (dto: SaveCheckupContractDto) =>
    apiClient.post<CheckupContractDto>('/checkup-contracts', dto).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/checkup-contracts/${id}`).then(r => r.data),
};
