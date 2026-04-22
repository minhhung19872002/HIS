/**
 * Clinical templates API — Sprint 3 Item 2.1
 * 7 template types: HSBA ngoại trú / PTTT / Kết luận / Diễn biến / Hội chẩn / Cam kết / Chứng nhận
 */

import apiClient from './client';

export const TEMPLATE_TYPES = {
  HSBA_NGOAI_TRU: 1,
  PTTT: 2,
  KET_LUAN_KHAM: 3,
  DIEN_BIEN_BENH: 4,
  HOI_CHAN: 5,
  CAM_KET: 6,
  CHUNG_NHAN: 7,
} as const;

export const TEMPLATE_TYPE_LABELS: Record<number, string> = {
  1: 'HSBA ngoại trú mẫu',
  2: 'Tường trình PTTT mẫu',
  3: 'Kết luận khám mẫu',
  4: 'Diễn biến bệnh mẫu',
  5: 'Hội chẩn mẫu',
  6: 'Cam kết mẫu',
  7: 'Giấy chứng nhận mẫu',
};

export interface ClinicalTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  templateType: number;
  templateTypeName: string;
  icdCode?: string;
  icdName?: string;
  departmentId?: string;
  departmentName?: string;
  gender: number;
  minAgeYears?: number;
  maxAgeYears?: number;
  content: string;
  defaultMembersJson?: string;
  isPublic: boolean;
  ownerUserId?: string;
  ownerName?: string;
  isActive: boolean;
  usageCount: number;
  sortOrder: number;
  createdAt: string;
}

export interface SaveClinicalTemplateRequest {
  id?: string;
  templateName: string;
  templateType: number;
  icdCode?: string;
  icdName?: string;
  departmentId?: string;
  gender: number;
  minAgeYears?: number;
  maxAgeYears?: number;
  content: string;
  defaultMembersJson?: string;
  isPublic: boolean;
  sortOrder: number;
}

export interface ClinicalTemplateSearchRequest {
  templateType?: number;
  icdCode?: string;
  departmentId?: string;
  gender?: number;
  ageYears?: number;
  keyword?: string;
  onlyActive?: boolean;
  pageSize?: number;
}

export async function saveTemplate(req: SaveClinicalTemplateRequest) {
  const { data } = await apiClient.post<ClinicalTemplateDto>('/clinical-template', req);
  return data;
}

export async function deleteTemplate(id: string) {
  const { data } = await apiClient.delete(`/clinical-template/${id}`);
  return data;
}

export async function getTemplateById(id: string) {
  const { data } = await apiClient.get<ClinicalTemplateDto>(`/clinical-template/${id}`);
  return data;
}

export async function searchTemplates(req: ClinicalTemplateSearchRequest) {
  const { data } = await apiClient.get<ClinicalTemplateDto[]>('/clinical-template', { params: req });
  return data;
}

export async function incrementTemplateUsage(id: string) {
  const { data } = await apiClient.post<ClinicalTemplateDto>(`/clinical-template/${id}/use`);
  return data;
}
