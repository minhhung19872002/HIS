import apiClient from './client';

// F3.4: Danh sach BN BHYT chi tra 100% thuoc dac tri

export interface BhytFullCoveragePatientDto {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  effectiveFrom: string;
  effectiveTo: string;
  medicineScopeJson: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
}

export interface CreateBhytFullCoverageDto {
  patientId: string;
  effectiveFrom: string;
  effectiveTo: string;
  medicineScopeJson?: string | null;
  note?: string | null;
}

export interface BhytFullCoverageSearchDto {
  keyword?: string;
  patientId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const searchBhytFullCoverage = (dto: BhytFullCoverageSearchDto) =>
  apiClient.get<PagedResult<BhytFullCoveragePatientDto>>('/bhyt-full-coverage', { params: dto });

export const getBhytFullCoverageById = (id: string) =>
  apiClient.get<BhytFullCoveragePatientDto>(`/bhyt-full-coverage/${id}`);

export const createBhytFullCoverage = (dto: CreateBhytFullCoverageDto) =>
  apiClient.post<BhytFullCoveragePatientDto>('/bhyt-full-coverage', dto);

export const updateBhytFullCoverage = (id: string, dto: CreateBhytFullCoverageDto) =>
  apiClient.put<BhytFullCoveragePatientDto>(`/bhyt-full-coverage/${id}`, dto);

export const deleteBhytFullCoverage = (id: string) =>
  apiClient.delete<void>(`/bhyt-full-coverage/${id}`);

export const checkBhytFullCoverage = (patientId: string) =>
  apiClient.get<{ patientId: string; isFullCoverageActive: boolean }>(`/bhyt-full-coverage/check/${patientId}`);
