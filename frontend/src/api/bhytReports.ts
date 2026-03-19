import client from './client';

export const getBhytReport = (reportId: string, params?: Record<string, unknown>) =>
  client.get(`/reports/bhyt/${reportId}`, { params });

export const getAdminReport = (reportId: string, params?: Record<string, unknown>) =>
  client.get(`/reports/admin/${reportId}`, { params });

export const getPharmacyReport = (reportId: string, params?: Record<string, unknown>) =>
  client.get(`/reports/pharmacy/${reportId}`, { params });
