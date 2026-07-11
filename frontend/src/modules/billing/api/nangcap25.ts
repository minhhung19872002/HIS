/**
 * NangCap25 — QR động Vietcombank kết nối viện phí (BV VN-Thụy Điển Uông Bí)
 * QR theo ngữ cảnh nghiệp vụ · kiosk · đối soát NH · báo cáo người tạo QR · chi hộ hoàn tiền
 */

import apiClient from '../../../services/apiClient';
import type { PaymentUrlResponse } from './paymentGateway';

// ===== QR động theo ngữ cảnh =====

export type DynamicQrReferenceType =
  | 'service-request'  // I.1/I.4 — phiếu chỉ định CLS
  | 'prescription'     // I.2/I.3 — đơn thuốc
  | 'retail-sale'      // I.7 — bán lẻ quầy thuốc
  | 'deposit'          // II — tạm ứng nội trú (referenceId = medicalRecordId, amount bắt buộc)
  | 'discharge';       // III — thanh toán ra viện (referenceId = admissionId)

export interface DynamicQrRequest {
  referenceType: DynamicQrReferenceType;
  referenceId: string;
  amount?: number;      // chỉ dùng cho deposit
  provider?: string;    // default BE: vietcombank
  orderInfo?: string;
}

export async function createDynamicQr(req: DynamicQrRequest): Promise<PaymentUrlResponse> {
  const { data } = await apiClient.post<PaymentUrlResponse>('/payment/qr/dynamic', req);
  return data;
}

// ===== Kiosk =====

export interface KioskPendingItem {
  serviceRequestId: string;
  requestCode: string;
  requestDate: string;
  amount: number;
}

export interface KioskQrResponse {
  patientName: string;
  patientCode: string;
  pendingCount: number;
  totalAmount: number;
  items: KioskPendingItem[];
  qr?: PaymentUrlResponse | null;
}

export async function createKioskQr(patientCode: string, dateOfBirth: string, provider?: string): Promise<KioskQrResponse> {
  const { data } = await apiClient.post<KioskQrResponse>('/payment/kiosk/qr', { patientCode, dateOfBirth, provider });
  return data;
}

export async function getKioskQrStatus(transactionId: string): Promise<{ status: number; statusText: string }> {
  const { data } = await apiClient.get<{ status: number; statusText: string }>(`/payment/kiosk/qr-status/${transactionId}`);
  return data;
}

// ===== Báo cáo VI.1 / VI.2 =====

export interface QrFinanceItem {
  id: string;
  txnRef: string;
  provider: string;
  referenceType?: string;
  orderInfo: string;
  patientName?: string;
  amount: number;
  status: number;
  statusText: string;
  creatorName: string;
  createdAt: string;
  payDate?: string;
}

export interface QrCreatorStat {
  creatorName: string;
  count: number;
  amount: number;
  paidAmount: number;
}

export interface QrFinanceReport {
  fromDate: string;
  toDate: string;
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  byCreator: QrCreatorStat[];
  items: QrFinanceItem[];
}

export interface BankReconciliationReport {
  fromDate: string;
  toDate: string;
  bankCode?: string;
  totalCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  pendingAmount: number;
  expiredCount: number;
  failedCount: number;
  matchedCount: number;
  unmatchedPaid: QrFinanceItem[];
  byDay: { date: string; count: number; amount: number }[];
  items: QrFinanceItem[];
}

export async function getQrFinanceReport(fromDate: string, toDate: string): Promise<QrFinanceReport> {
  const { data } = await apiClient.get<QrFinanceReport>('/payment/reports/qr-finance', { params: { fromDate, toDate } });
  return data;
}

export async function getBankReconciliation(fromDate: string, toDate: string, bankCode?: string): Promise<BankReconciliationReport> {
  const { data } = await apiClient.get<BankReconciliationReport>('/payment/reports/bank-reconciliation', { params: { fromDate, toDate, bankCode } });
  return data;
}

// ===== Chi hộ hoàn tiền (IV) =====

export interface CreateRefundDisbursementRequest {
  patientId: string;
  medicalRecordId?: string;
  paymentTransactionId?: string;
  amount: number;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  reason?: string;
}

export interface RefundDisbursementDto {
  id: string;
  disbursementCode: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  medicalRecordId?: string;
  paymentTransactionId?: string;
  amount: number;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  reason?: string;
  status: number; // 0 chờ duyệt · 1 đã duyệt · 2 đã chi · 3 thất bại · 4 hủy
  statusText: string;
  transferRef?: string;
  transferredAt?: string;
  failureReason?: string;
  requestedByName?: string;
  approvedByName?: string;
  createdAt: string;
}

export interface RefundDisbursementSearchResult {
  items: RefundDisbursementDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalAmount: number;
  transferredAmount: number;
}

export async function createDisbursement(req: CreateRefundDisbursementRequest): Promise<RefundDisbursementDto> {
  const { data } = await apiClient.post<RefundDisbursementDto>('/payment/disbursement', req);
  return data;
}

export async function executeDisbursement(id: string): Promise<RefundDisbursementDto> {
  const { data } = await apiClient.post<RefundDisbursementDto>(`/payment/disbursement/${id}/execute`, {});
  return data;
}

export async function cancelDisbursement(id: string, reason?: string): Promise<RefundDisbursementDto> {
  const { data } = await apiClient.post<RefundDisbursementDto>(`/payment/disbursement/${id}/cancel`, { reason });
  return data;
}

export async function searchDisbursements(params: {
  keyword?: string; status?: number; fromDate?: string; toDate?: string; pageIndex?: number; pageSize?: number;
}): Promise<RefundDisbursementSearchResult> {
  const { data } = await apiClient.get<RefundDisbursementSearchResult>('/payment/disbursement', { params });
  return data;
}
