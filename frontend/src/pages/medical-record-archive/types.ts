/**
 * Type definitions cho MedicalRecordArchive v1 — extracted khỏi
 * pages/MedicalRecordArchive.tsx (K24 Batch 1).
 */

export interface ArchiveExamination {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  medicalRecordCode?: string;
  examinationDate: string;
  departmentName?: string;
  roomName?: string;
  doctorName?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  status: number;
  statusName?: string;
  insuranceNumber?: string;
  conclusionType?: number;
}

export interface ArchiveStats {
  totalRecords: number;
  pendingReview: number;
  handedOver: number;
  approved: number;
}

export interface MedicalRecordNode {
  id: string;
  code: string;
  patientName: string;
  diagnosis?: string;
  createdAt?: string;
}

export interface TreeItem {
  id: string;
  title: string;
  date?: string;
  status?: number;
  detail?: Record<string, unknown>;
}

export interface MedicalRecordTree {
  medicalRecord?: MedicalRecordNode;
  treatmentSheets: TreeItem[];
  serviceOrders: TreeItem[];
  serviceResults: TreeItem[];
  treatmentOrders: TreeItem[];
  nursingCareSheets: TreeItem[];
  vitalSignsRecords: TreeItem[];
  infusionRecords: TreeItem[];
  bloodTransfusionRecords: TreeItem[];
  costSummary: TreeItem[];
  surgeryRecords: TreeItem[];
  admissionExam: TreeItem[];
}

export interface HandoverRecord {
  id: string;
  medicalRecordCode: string;
  patientCode: string;
  patientName: string;
  departmentName: string;
  dischargeDate?: string;
  handoverStatus: number; // 0=pending, 1=sent, 2=received, 3=approved
  handoverDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  comments?: string;
  totalForms: number;
  completedForms: number;
}

export interface HandoverSummary {
  departmentName: string;
  totalPending: number;
  totalSent: number;
  totalReceived: number;
  totalApproved: number;
}

export interface ArchivedRecord {
  id: string;
  patientCode: string;
  patientName: string;
  medicalRecordCode: string;
  archiveDate: string;
  archiveFormat: 'XML' | 'HL7' | 'CDA';
  storageType: 'local' | 'cloud' | 'both';
  fileSize: number; // KB
  verified: boolean;
  departmentName?: string;
  dischargeDate?: string;
}

export interface StorageStatus {
  localUsed: number; // MB
  localTotal: number; // MB
  cloudUsed: number; // MB
  cloudTotal: number; // MB
  lastSyncDate?: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'pending';
  totalArchived: number;
  localOnly: number;
  cloudOnly: number;
  bothStored: number;
}

export type ArchivedRecordsResponse = {
  items?: ArchivedRecord[];
  data?: ArchivedRecord[];
  totalCount?: number;
  total?: number;
};

export type StorageStatusResponse = {
  localUsed?: number;
  localTotal?: number;
  cloudUsed?: number;
  cloudTotal?: number;
  lastSyncDate?: string;
  syncStatus?: StorageStatus['syncStatus'];
  totalArchived?: number;
  localOnly?: number;
  cloudOnly?: number;
  bothStored?: number;
};
