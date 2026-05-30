import apiClient from './client';

// Lưu trữ hồ sơ bệnh án. Tách call ra api layer (không gọi axios/client trong component).

/** Danh sách HSBA đã lưu trữ. */
export const getArchiveList = () => apiClient.get('/inpatient/medical-record-archive/list');
