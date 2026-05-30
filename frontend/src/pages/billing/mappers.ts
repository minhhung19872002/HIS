/**
 * DTO → local view-model mapper cho Billing v1.
 * Pure functions. Extracted khỏi pages/Billing.tsx (K16 Batch 1).
 */

import type {
  DepositDto,
  RefundDto,
  UnpaidServiceItemDto,
} from '../../api/billing';
import type { Deposit, RefundRecord, UnpaidService } from './types';

export const mapDepositDto = (d: DepositDto): Deposit => ({
  id: d.id,
  patientId: d.patientId,
  patientName: d.patientName,
  patientCode: d.patientCode,
  amount: d.amount,
  remainingAmount: d.remainingAmount,
  depositDate: d.createdAt,
  cashier: d.cashierName,
  status: d.status,
  note: d.notes,
});

export const mapRefundDto = (r: RefundDto): RefundRecord => ({
  id: r.id,
  patientId: r.patientId,
  patientName: r.patientName,
  patientCode: r.patientCode,
  amount: r.refundAmount,
  reason: r.reason,
  refundDate: r.createdAt,
  requestedBy: r.cashierName,
  approvedBy: r.approvedByName,
  status: r.status,
  paymentMethod: r.refundMethodName,
});

export const mapUnpaidServiceDto = (s: UnpaidServiceItemDto): UnpaidService => ({
  id: s.id,
  serviceCode: s.serviceCode,
  serviceName: s.serviceName,
  quantity: s.quantity,
  unitPrice: s.unitPrice,
  totalPrice: s.amount,
  insuranceCoverage: s.insuranceRate,
  insuranceAmount: s.insuranceAmount,
  patientAmount: s.patientAmount,
  serviceDate: s.orderedAt,
  departmentName: s.executeDepartmentName || s.orderDepartmentName || '',
  doctorName: '',
  serviceType: s.serviceGroup,
});
