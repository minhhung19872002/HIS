import apiClient from './client';

// Lưu trữ hồ sơ bệnh án. Tách call ra api layer (không gọi axios/client trong component).

/** Danh sách HSBA đã lưu trữ. Route: GET /api/archives/archived */
export const getArchiveList = (params?: {
  keyword?: string;
  format?: string;
  pageIndex?: number;
  pageSize?: number;
}) => apiClient.get('/archives/archived', { params });

/** Lưu trữ ngay 1 hồ sơ bệnh án theo MedicalRecordId. Route: POST /api/archives */
export const createArchive = (dto: {
  medicalRecordId: string;
  storageLocation?: string;
  shelfNumber?: string;
  boxNumber?: string;
}) => apiClient.post('/archives', dto).then(r => r.data);
