/**
 * Type definitions cho Billing v1 module — extracted khỏi pages/Billing.tsx
 * (K16 Batch 1). Pure types.
 */

import type { PatientBillingStatusDto } from '../../api/billing';

export interface Patient {
  id: string;
  code: string;
  name: string;
  gender: number;
  dateOfBirth: string;
  phoneNumber: string;
  insuranceNumber?: string;
  patientType: number;
}

export interface UnpaidService {
  id: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCoverage: number;
  insuranceAmount: number;
  patientAmount: number;
  serviceDate: string;
  departmentName: string;
  doctorName: string;
  serviceType: string;
}

export interface Deposit {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  amount: number;
  remainingAmount: number;
  depositDate: string;
  cashier: string;
  status: number;
  note?: string;
}

export interface RefundRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  amount: number;
  reason: string;
  refundDate: string;
  requestedBy: string;
  approvedBy?: string;
  status: number;
  paymentMethod: string;
}

export type PatientSearchItem = PatientBillingStatusDto & {
  gender?: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  insuranceNumber?: string;
  patientType?: number;
};
