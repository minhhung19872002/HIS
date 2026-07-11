import apiClient from '../../../services/apiClient';

const BASE = '/his-connector';

// ─── DTO interfaces ─────────────────────────────────────────────────────────

export interface HisConnectionDto {
  id: string;
  name: string;
  provider?: string;
  baseUrl: string;
  authType?: string;
  /** Tên key trong SystemConfig — không phải secret */
  apiKeyRef?: string;
  isActive: boolean;
  lastCheckedAt?: string;
  lastStatus?: string;   // 'Online' | 'Offline' | 'Unknown'
  notes?: string;
  createdAt: string;
}

export interface SaveHisConnectionDto {
  id?: string;
  name: string;
  provider?: string;
  baseUrl: string;
  authType?: string;
  apiKeyRef?: string;
  isActive: boolean;
  notes?: string;
}

export interface ConnectionTestResultDto {
  connectionId: string;
  connectionName: string;
  status: string;       // 'Online' | 'Offline'
  latencyMs?: number;
  errorMessage?: string;
  isMock: boolean;
  testedAt: string;
}

export interface MissingFormEncounterDto {
  encounterId: string;
  encounterType: string;  // 'OPD' | 'IPD'
  patientCode?: string;
  patientName?: string;
  encounterDate?: string;
  missingFormNames: string[];
}

export interface MissingFormsCheckResultDto {
  totalEncountersChecked: number;
  encountersWithMissingForms: number;
  items: MissingFormEncounterDto[];
  checkedAt: string;
  ruleDescription: string;
}

// ─── Connection CRUD ─────────────────────────────────────────────────────────

export const getConnections = () =>
  apiClient.get<HisConnectionDto[]>(`${BASE}/connections`).then(r => r.data);

export const getConnectionById = (id: string) =>
  apiClient.get<HisConnectionDto>(`${BASE}/connections/${id}`).then(r => r.data);

export const saveConnection = (dto: SaveHisConnectionDto) =>
  apiClient.post<HisConnectionDto>(`${BASE}/connections`, dto).then(r => r.data);

export const deleteConnection = (id: string) =>
  apiClient.delete(`${BASE}/connections/${id}`).then(r => r.data);

// ─── Test Health ──────────────────────────────────────────────────────────────

export const testConnection = (id: string) =>
  apiClient.post<ConnectionTestResultDto>(`${BASE}/test/${id}`).then(r => r.data);

// ─── CheckMissingForms ────────────────────────────────────────────────────────

export const checkMissingForms = (
  fromDate: string,
  toDate: string,
  encounterType?: 'OPD' | 'IPD',
) =>
  apiClient
    .get<MissingFormsCheckResultDto>(`${BASE}/check-missing-forms`, {
      params: { fromDate, toDate, encounterType },
    })
    .then(r => r.data);
