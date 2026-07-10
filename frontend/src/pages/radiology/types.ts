/**
 * Type definitions cho Radiology v1 module — extracted khỏi pages/Radiology.tsx
 * (K14 Batch 1). Pure types, KHÔNG có logic.
 */

import type { RadiologyWaitingListDto } from '../../modules/radiology/api/ris';

export type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  errorFields?: unknown;
};

export type RadiologyWaitingListItem = RadiologyWaitingListDto & {
  id?: string;
  requestCode?: string;
  contrast?: boolean;
  priority?: string | number;
  requestDate?: string;
  scheduledDate?: string;
  statusCode?: number;
  doctorName?: string;
  modalityName?: string;
  studyInstanceUID?: string;
  orthancStudyId?: string;
  hasImages?: boolean;
  gender?: string | number;
  patientId?: string;
};

export interface RadiologyRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  serviceName: string;
  bodyPart?: string;
  contrast: boolean;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  requestDate: string;
  scheduledDate?: string;
  statusCode: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Reported, 5: Approved
  status: string; // Display name for status
  departmentName?: string;
  doctorName?: string;
  clinicalInfo?: string;
  modalityName?: string;
  studyInstanceUID?: string; // DICOM Study Instance UID
  orthancStudyId?: string; // Orthanc internal UUID for sharing
  hasImages?: boolean; // True if DICOM images available
  patientId?: string; // For sharing context
  // Report and signature fields
  description?: string;
  conclusion?: string;
  reportedAt?: string;
  isSigned?: boolean;
  signedBy?: string;
  signedAt?: string;
}

export interface RadiologyExam {
  id: string;
  requestId: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  serviceName: string;
  modalityCode: string;
  modalityName: string;
  accessionNumber: string;
  examDate: string;
  technicianName?: string;
  status: number; // 0: Pending, 1: InProgress, 2: Completed
  startTime?: string;
  endTime?: string;
  dose?: number;
  notes?: string;
}

export interface RadiologyReport {
  id: string;
  examId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  description?: string;
  conclusion?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  radiologistName?: string;
  doctorName?: string;
  reportDate?: string;
  reportedAt?: string;
  status: number; // 0: Draft, 1: Completed, 2: Approved
  approvedBy?: string;
  approvedAt?: string;
  isSigned?: boolean;
  signedBy?: string;
  signedAt?: string;
}
