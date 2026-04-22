import apiClient from './client';
import { publicClient } from './publicClient';

export interface CreateShareRequest {
  studyInstanceUID: string;
  orthancStudyId?: string;
  patientId?: string;
  password?: string;
  hideDemographics: boolean;
  expiresInMinutes?: number;
  maxViews?: number;
}

export interface ShareLinkDto {
  id: string;
  token: string;
  url: string;
  studyInstanceUID: string;
  hasPassword: boolean;
  hideDemographics: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  createdAt: string;
  isRevoked: boolean;
}

export interface AccessResult {
  studyInstanceUID: string;
  orthancStudyId?: string;
  hideDemographics: boolean;
  patientName?: string;
  patientCode?: string;
  expiresAt?: string;
  requiresPassword: boolean;
}

export interface PeekResult {
  requiresPassword: boolean;
  expiresAt?: string;
  viewCount: number;
  maxViews?: number;
}

export async function createShareLink(req: CreateShareRequest) {
  const { data } = await apiClient.post<ShareLinkDto>('/study-share', req);
  return data;
}
export async function getMyShareLinks() {
  const { data } = await apiClient.get<ShareLinkDto[]>('/study-share/my');
  return data;
}
export async function revokeShareLink(id: string, reason?: string) {
  const { data } = await apiClient.post(`/study-share/${id}/revoke`, { reason });
  return data;
}
export async function peekShare(token: string) {
  const { data } = await publicClient.get<PeekResult>(`/study-share/peek/${token}`);
  return data;
}
export async function accessShare(token: string, password?: string) {
  const { data } = await publicClient.post<AccessResult>(`/study-share/access/${token}`, { password });
  return data;
}
