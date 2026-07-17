import { apiClient } from '../../../services/apiClient';

// AUTHZ-4 (#370) — admin CRUD cho delegation grants (kill-switch OFF → dormant).

export interface DelegationGrantDto {
  id: string;
  grantorId: string;
  grantorName: string;
  granteeId: string;
  granteeName: string;
  roleId: string;
  roleName: string;
  validFrom: string;
  validTo: string;
  reason?: string;
  status: 0 | 1 | 2; // 0=Active 1=Expired 2=Revoked
  statusText: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
}

export interface CreateDelegationGrantDto {
  granteeId: string;
  roleId: string;
  validFrom: string; // ISO datetime
  validTo: string;   // ISO datetime
  reason?: string;
}

export const getGrants = () =>
  apiClient.get<DelegationGrantDto[]>('/delegation/grants');

export const createGrant = (dto: CreateDelegationGrantDto) =>
  apiClient.post<DelegationGrantDto>('/delegation/grants', dto);

export const revokeGrant = (id: string) =>
  apiClient.post<{ revoked: boolean }>(`/delegation/grants/${id}/revoke`);
