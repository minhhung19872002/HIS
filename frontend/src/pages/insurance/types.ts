/**
 * Type definitions cho Insurance v1 — extracted khỏi pages/Insurance.tsx
 * (K27 Batch 1).
 */

export interface InsuranceClaim {
  id: string;
  claimCode: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  visitDate: string;
  dischargeDate?: string;
  department: string;
  diagnosis: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number; // 0: Draft, 1: Pending, 2: Submitted, 3: Approved, 4: Rejected, 5: Locked
  xmlStatus?: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectReason?: string;
}

export interface XmlBatch {
  id: string;
  batchCode: string;
  period: string;
  claimCount: number;
  totalAmount: number;
  createdDate: string;
  submittedDate?: string;
  status: number; // 0: Draft, 1: Ready, 2: Submitted, 3: Confirmed
  xmlType: string;
}

export type ApiEnvelope<T> = { data?: T } | T;
