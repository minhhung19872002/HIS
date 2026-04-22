/**
 * Reassign object bulk — Sprint 2 Item 2.7
 */
import apiClient from './client';

export interface ReassignObjectRequest {
  patientId: string;
  medicalRecordId?: string;
  scope: 'service' | 'medicine';
  mode: 'all' | 'detail';
  fromPatientType?: number;
  toPatientType: number;
  itemIds?: string[];
  reason: string;
}

export interface ReassignObjectResult {
  updatedCount: number;
  oldTotal: number;
  newTotal: number;
  warnings: string[];
}

export async function reassignObject(req: ReassignObjectRequest) {
  const { data } = await apiClient.post<ReassignObjectResult>('/billing/reassign-object', req);
  return data;
}
