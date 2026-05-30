/**
 * Type definitions cho BhxhAudit v1 — extracted khỏi pages/BhxhAudit.tsx
 * (K29 Batch 1).
 */

export type ClaimSearchItem = {
  id: string;
  maLk?: string;
  claimCode?: string;
  patientCode?: string;
  maBn?: string;
  patientName?: string;
  hoTen?: string;
  insuranceNumber?: string;
  maThe?: string;
  admissionDate?: string;
  ngayVao?: string;
  dischargeDate?: string;
  ngayRa?: string;
  departmentName?: string;
  tenKhoa?: string;
  departmentId?: string;
  diagnosisCode?: string;
  maBenhChinh?: string;
  diagnosisName?: string;
  totalAmount?: number;
  insuranceAmount?: number;
  tienBhyt?: number;
  patientAmount?: number;
  tienNguoibenh?: number;
  auditStatus?: number;
  paymentStatus?: number;
  sentToPortal?: boolean;
  status?: number;
  sentDate?: string;
  submitDate?: string;
  approvedDate?: string;
  rejectReason?: string;
  auditorNote?: string;
};

export type DepartmentItem = {
  id: string;
  name?: string;
  tenKhoa?: string;
};

export type AuditorAccountItem = {
  id?: string;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

export type PortalRecordItem = {
  id?: string;
  maLk?: string;
  claimCode?: string;
  patientName?: string;
  insuranceNumber?: string;
  admissionDate?: string;
  dischargeDate?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  totalAmount?: number;
  insuranceAmount?: number;
  status?: string;
  sentDate?: string;
  hospitalName?: string;
  hospitalCode?: string;
};

export interface AuditRecord {
  id: string;
  maLk: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  departmentName: string;
  departmentId?: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  auditStatus: number; // 0: Pending, 1: Approved, 2: Rejected
  paymentStatus: number; // 0: Unpaid, 1: Paid
  sentToPortal: boolean;
  sentDate?: string;
  approvedDate?: string;
  rejectReason?: string;
  auditorNote?: string;
}

export interface AuditorAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  organization: string;
  role: string; // auditor | senior_auditor | admin
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PortalRecord {
  id: string;
  maLk: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  status: string;
  sentDate: string;
  hospitalName: string;
  hospitalCode: string;
}

export interface ImportPreview {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  records: AuditRecord[];
}

export interface AuditStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}

export interface Department {
  id: string;
  name: string;
}
