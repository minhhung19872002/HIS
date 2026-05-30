import apiClient from './client';

// BHXH Audit — giám định BHXH. Tách call ra api layer (không gọi axios/client trong component).

/** Danh sách phiên giám định BHXH. */
export const getAuditSessions = () => apiClient.get('/bhxh-audit/sessions');
