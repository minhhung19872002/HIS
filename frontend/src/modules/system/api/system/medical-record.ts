/**
 * Module 16: HSBA (Medical Record Archive & Borrow)
 * DTOs + medicalRecordApi
 */

import { apiClient } from '../../../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface MedicalRecordArchiveDto {
  id?: string;
  medicalRecordNumber: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  departmentId: string;
  departmentName: string;
  primaryDiagnosis: string;
  icdCode: string;
  dischargeStatus: string;
  archiveDate: string;
  archiveLocation: string;
  shelfNumber?: string;
  boxNumber?: string;
  archiveStatus: string;
  retentionYears: number;
  destructionDate?: string;
  archivedBy?: string;
  note?: string;
}

export interface MedicalRecordBorrowRequestDto {
  id?: string;
  medicalRecordArchiveId: string;
  medicalRecordNumber: string;
  patientName: string;
  borrowerId: string;
  borrowerName: string;
  borrowerDepartment?: string;
  requestDate: string;
  purpose: string;
  expectedReturnDate: string;
  actualBorrowDate?: string;
  actualReturnDate?: string;
  status: string;
  approvedBy?: string;
  approvedDate?: string;
  processedBy?: string;
  processedDate?: string;
  returnReceivedBy?: string;
  note?: string;
}

export interface CreateBorrowRequestDto {
  medicalRecordArchiveId: string;
  purpose: string;
  expectedReturnDate: string;
  note?: string;
}

// ============================================================================
// API Object
// ============================================================================

export const medicalRecordApi = {
  // Lưu trữ HSBA
  getArchives: (keyword?: string, year?: number, archiveStatus?: string, departmentId?: string) =>
    apiClient.get<MedicalRecordArchiveDto[]>('/medical-records/archives', { params: { keyword, year, archiveStatus, departmentId } }),
  getArchive: (archiveId: string) =>
    apiClient.get<MedicalRecordArchiveDto>(`/medical-records/archives/${archiveId}`),
  saveArchive: (dto: MedicalRecordArchiveDto) =>
    apiClient.post<MedicalRecordArchiveDto>('/medical-records/archives', dto),
  updateArchiveLocation: (archiveId: string, location: string) =>
    apiClient.put<boolean>(`/medical-records/archives/${archiveId}/location`, location),

  // Mượn trả HSBA
  getBorrowRequests: (fromDate?: string, toDate?: string, status?: string, borrowerId?: string) =>
    apiClient.get<MedicalRecordBorrowRequestDto[]>('/medical-records/borrow-requests', { params: { fromDate, toDate, status, borrowerId } }),
  getBorrowRequest: (requestId: string) =>
    apiClient.get<MedicalRecordBorrowRequestDto>(`/medical-records/borrow-requests/${requestId}`),
  createBorrowRequest: (dto: CreateBorrowRequestDto) =>
    apiClient.post<MedicalRecordBorrowRequestDto>('/medical-records/borrow-requests', dto),
  approveBorrowRequest: (requestId: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/approve`),
  rejectBorrowRequest: (requestId: string, reason: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/reject`, reason),
  processBorrow: (requestId: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/process`),
  returnMedicalRecord: (requestId: string, note?: string) =>
    apiClient.put<boolean>(`/medical-records/borrow-requests/${requestId}/return`, note),
};
