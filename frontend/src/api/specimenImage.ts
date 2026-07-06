/**
 * API client — SpecimenImage (ảnh kính hiển vi / upload ảnh KQ XN / GPB)
 * Issues: #134 (gắn ảnh KQ), #133/#113 (web-upload + webcam fallback)
 *
 * Điểm tích hợp camera device-side (SDK máy kính) trong tương lai:
 * - POST /api/specimen-image/upload với source="microscope" + magnification
 */
import { apiClient } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────

export interface SpecimenImage {
  id: string;
  imagePath: string;
  fileName?: string;
  mimeType?: string;
  fileSize: number;
  caption?: string;
  source: 'microscope' | 'manual' | 'webcam';
  magnification?: string;
  sortOrder: number;
  includeInReport: boolean;
  capturedAt: string;
}

export interface UploadImageResult {
  id: string;
  imagePath: string;
  fileName?: string;
  fileSize: number;
  caption?: string;
  source: string;
  capturedAt: string;
}

// ─── Upload file (manual / webcam file) ──────────────────────────

export interface UploadFileParams {
  file: File;
  pathologyResultId?: string;
  serviceRequestDetailId?: string;
  serviceRequestId?: string;
  caption?: string;
  magnification?: string;
  source?: 'manual' | 'webcam' | 'microscope';
}

export const uploadSpecimenImageFile = async (
  params: UploadFileParams
): Promise<UploadImageResult> => {
  const form = new FormData();
  form.append('file', params.file);
  if (params.pathologyResultId) form.append('pathologyResultId', params.pathologyResultId);
  if (params.serviceRequestDetailId) form.append('serviceRequestDetailId', params.serviceRequestDetailId);
  if (params.serviceRequestId) form.append('serviceRequestId', params.serviceRequestId);
  if (params.caption) form.append('caption', params.caption);
  if (params.magnification) form.append('magnification', params.magnification);
  form.append('source', params.source ?? 'manual');

  const res = await apiClient.post<UploadImageResult>('/specimen-image/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Upload base64 (từ webcam getUserMedia) ───────────────────────

export interface UploadBase64Params {
  base64Data: string;       // data:image/jpeg;base64,... hoặc raw base64
  mimeType: string;
  pathologyResultId?: string;
  serviceRequestDetailId?: string;
  serviceRequestId?: string;
  caption?: string;
  magnification?: string;
  source?: 'webcam' | 'microscope';
}

export const uploadSpecimenImageBase64 = async (
  params: UploadBase64Params
): Promise<UploadImageResult> => {
  const res = await apiClient.post<UploadImageResult>('/specimen-image/upload-base64', {
    base64Data: params.base64Data,
    mimeType: params.mimeType,
    pathologyResultId: params.pathologyResultId ?? null,
    serviceRequestDetailId: params.serviceRequestDetailId ?? null,
    serviceRequestId: params.serviceRequestId ?? null,
    caption: params.caption ?? null,
    magnification: params.magnification ?? null,
    source: params.source ?? 'webcam',
  });
  return res.data;
};

// ─── List ─────────────────────────────────────────────────────────

export const listByPathologyResult = async (resultId: string): Promise<SpecimenImage[]> => {
  try {
    const res = await apiClient.get<SpecimenImage[]>(`/specimen-image/by-pathology-result/${resultId}`);
    return res.data ?? [];
  } catch {
    console.warn('[specimenImage] listByPathologyResult failed');
    return [];
  }
};

export const listByServiceDetail = async (detailId: string): Promise<SpecimenImage[]> => {
  try {
    const res = await apiClient.get<SpecimenImage[]>(`/specimen-image/by-service-detail/${detailId}`);
    return res.data ?? [];
  } catch {
    console.warn('[specimenImage] listByServiceDetail failed');
    return [];
  }
};

export const listByServiceRequest = async (requestId: string): Promise<SpecimenImage[]> => {
  try {
    const res = await apiClient.get<SpecimenImage[]>(`/specimen-image/by-service-request/${requestId}`);
    return res.data ?? [];
  } catch {
    console.warn('[specimenImage] listByServiceRequest failed');
    return [];
  }
};

// ─── Update / Delete ──────────────────────────────────────────────

export const updateSpecimenImage = async (
  id: string,
  data: { caption?: string; magnification?: string; includeInReport?: boolean; sortOrder?: number }
): Promise<void> => {
  await apiClient.put(`/specimen-image/${id}`, data);
};

export const deleteSpecimenImage = async (id: string): Promise<void> => {
  await apiClient.delete(`/specimen-image/${id}`);
};
