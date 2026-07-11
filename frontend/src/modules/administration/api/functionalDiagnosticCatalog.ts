import apiClient from '../../../services/apiClient';

const BASE = '/functional-diagnostic-catalog';

// ─── DTO interfaces ──────────────────────────────────────────────────────────

export interface FunctionalDiagnosticTestTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface SaveFunctionalDiagnosticTestTypeDto {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface FunctionalDiagnosticTemplateDto {
  id: string;
  code: string;
  name: string;
  testTypeId: string;
  testTypeName?: string;
  content?: string;
  isActive: boolean;
}

export interface SaveFunctionalDiagnosticTemplateDto {
  id?: string;
  code: string;
  name: string;
  testTypeId: string;
  content?: string;
  isActive: boolean;
}

// ─── TestTypes ───────────────────────────────────────────────────────────────

export const getTestTypes = (keyword?: string) =>
  apiClient
    .get<FunctionalDiagnosticTestTypeDto[]>(`${BASE}/test-types`, { params: { keyword } })
    .then(r => r.data);

export const saveTestType = (dto: SaveFunctionalDiagnosticTestTypeDto) =>
  apiClient
    .post<FunctionalDiagnosticTestTypeDto>(`${BASE}/test-types`, {
      ...dto,
      id: dto.id ?? '00000000-0000-0000-0000-000000000000',
    })
    .then(r => r.data);

export const deleteTestType = (id: string) =>
  apiClient.delete(`${BASE}/test-types/${id}`).then(r => r.data);

// ─── Templates ───────────────────────────────────────────────────────────────

export const getTemplates = (testTypeId?: string, keyword?: string) =>
  apiClient
    .get<FunctionalDiagnosticTemplateDto[]>(`${BASE}/templates`, {
      params: { testTypeId, keyword },
    })
    .then(r => r.data);

export const saveTemplate = (dto: SaveFunctionalDiagnosticTemplateDto) =>
  apiClient
    .post<FunctionalDiagnosticTemplateDto>(`${BASE}/templates`, {
      ...dto,
      id: dto.id ?? '00000000-0000-0000-0000-000000000000',
    })
    .then(r => r.data);

export const deleteTemplate = (id: string) =>
  apiClient.delete(`${BASE}/templates/${id}`).then(r => r.data);
