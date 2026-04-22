import apiClient from './client';

export const ABBREVIATION_SCOPES = {
  GENERAL: 0,
  PRESCRIPTION: 1,
  DIAGNOSIS: 2,
  LAB: 3,
  RADIOLOGY: 4,
  APPOINTMENT: 5,
} as const;

export interface AbbreviationDto {
  id: string;
  code: string;
  expansion: string;
  scope: number;
  scopeName: string;
  scopeKey?: string;
  ownerUserId?: string;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
}

export interface SaveAbbreviationRequest {
  id?: string;
  code: string;
  expansion: string;
  scope: number;
  scopeKey?: string;
  ownerOnly: boolean;
  sortOrder: number;
}

export async function saveAbbreviation(req: SaveAbbreviationRequest) {
  const { data } = await apiClient.post<AbbreviationDto>('/abbreviation', req);
  return data;
}
export async function deleteAbbreviation(id: string) {
  const { data } = await apiClient.delete(`/abbreviation/${id}`);
  return data;
}
export async function searchAbbreviations(scope?: number, scopeKey?: string) {
  const { data } = await apiClient.get<AbbreviationDto[]>('/abbreviation', { params: { scope, scopeKey } });
  return data;
}
export async function incrementAbbreviationUsage(id: string) {
  const { data } = await apiClient.post<AbbreviationDto>(`/abbreviation/${id}/use`);
  return data;
}
