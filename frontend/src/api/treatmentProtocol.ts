import apiClient from './client';

export interface TreatmentProtocolSearchDto {
  keyword?: string;
  icdCode?: string;
  diseaseGroup?: string;
  department?: string;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface TreatmentProtocolStepDto {
  id?: string;
  stepOrder: number;
  name: string;
  description?: string;
  activityType?: string;
  medicationName?: string;
  medicationDose?: string;
  medicationRoute?: string;
  medicationFrequency?: string;
  durationDays?: number;
  serviceCode?: string;
  serviceName?: string;
  conditions?: string;
  expectedOutcome?: string;
  notes?: string;
  isOptional: boolean;
}

export interface TreatmentProtocolDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  icdCode?: string;
  icdName?: string;
  diseaseGroup?: string;
  version: number;
  status: number;
  statusName?: string;
  approvedBy?: string;
  approvedDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  department?: string;
  references?: string;
  notes?: string;
  stepCount: number;
  createdAt: string;
  steps: TreatmentProtocolStepDto[];
}

export interface SaveTreatmentProtocolDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  icdCode?: string;
  icdName?: string;
  diseaseGroup?: string;
  department?: string;
  references?: string;
  notes?: string;
  steps: TreatmentProtocolStepDto[];
}

export interface TreatmentProtocolPagedResult {
  items: TreatmentProtocolDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface ProtocolEvaluationDto {
  protocolId: string;
  protocolName: string;
  totalSteps: number;
  completedSteps: number;
  pendingSteps: number;
  complianceRate: number;
  stepEvaluations: {
    stepOrder: number;
    stepName: string;
    activityType: string;
    isCompleted: boolean;
    completedNote?: string;
  }[];
}

const BASE_URL = '/treatment-protocols';

export const searchProtocols = (params: TreatmentProtocolSearchDto) =>
  apiClient.get<TreatmentProtocolPagedResult>(BASE_URL, { params });

export const getProtocolById = (id: string) =>
  apiClient.get<TreatmentProtocolDto>(`${BASE_URL}/${id}`);

export const saveProtocol = (dto: SaveTreatmentProtocolDto) =>
  apiClient.post<TreatmentProtocolDto>(BASE_URL, dto);

export const deleteProtocol = (id: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/${id}`);

export const approveProtocol = (id: string) =>
  apiClient.post<TreatmentProtocolDto>(`${BASE_URL}/${id}/approve`);

export const newVersion = (id: string) =>
  apiClient.post<TreatmentProtocolDto>(`${BASE_URL}/${id}/new-version`);

export const getProtocolsByIcd = (icdCode: string) =>
  apiClient.get<TreatmentProtocolDto[]>(`${BASE_URL}/by-icd/${icdCode}`);

export const evaluatePatient = (protocolId: string, examinationId: string) =>
  apiClient.get<ProtocolEvaluationDto>(`${BASE_URL}/${protocolId}/evaluate/${examinationId}`);

export const getDiseaseGroups = () =>
  apiClient.get<string[]>(`${BASE_URL}/disease-groups`);
