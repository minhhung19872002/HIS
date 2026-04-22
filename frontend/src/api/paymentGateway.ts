/**
 * Payment Gateway API - VNPay / MoMo / ZaloPay
 * Sprint 1 Item 1.1
 */

import apiClient from './client';

export type PaymentProvider = 'vnpay' | 'momo' | 'zalopay';

export interface CreatePaymentUrlRequest {
  provider: PaymentProvider;
  patientId: string;
  medicalRecordId?: string;
  invoiceSummaryId?: string;
  amount: number;
  orderType?: string;
  orderInfo?: string;
  bankCode?: string;
  language?: 'vn' | 'en';
}

export interface PaymentUrlResponse {
  transactionId: string;
  txnRef: string;
  paymentUrl: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  provider: string;
  amount: number;
}

export interface PaymentTransactionDto {
  id: string;
  txnRef: string;
  gatewayTxnRef?: string;
  provider: string;
  orderType: string;
  orderInfo: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  invoiceSummaryId?: string;
  receiptId?: string;
  amount: number;
  status: number;
  statusText: string;
  responseCode?: number;
  responseMessage?: string;
  bankCode?: string;
  cardType?: string;
  payDate?: string;
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
  refundedAmount: number;
}

export interface PaymentSearchRequest {
  keyword?: string;
  provider?: string;
  status?: number;
  patientId?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface PaymentSearchResult {
  items: PaymentTransactionDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalAmount: number;
  totalSuccessAmount: number;
}

export interface PaymentStatsDto {
  fromDate: string;
  toDate: string;
  totalTransactions: number;
  successTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  totalSuccessAmount: number;
  totalRefundedAmount: number;
  byProvider: { provider: string; count: number; amount: number }[];
  byDay: { date: string; count: number; amount: number }[];
}

export async function createPaymentUrl(req: CreatePaymentUrlRequest): Promise<PaymentUrlResponse> {
  const { data } = await apiClient.post<PaymentUrlResponse>('/payment/create-url', req);
  return data;
}

export async function getTransactionById(id: string): Promise<PaymentTransactionDto> {
  const { data } = await apiClient.get<PaymentTransactionDto>(`/payment/transactions/${id}`);
  return data;
}

export async function getTransactionByRef(txnRef: string): Promise<PaymentTransactionDto> {
  const { data } = await apiClient.get<PaymentTransactionDto>(`/payment/transactions/by-ref/${txnRef}`);
  return data;
}

export async function searchTransactions(req: PaymentSearchRequest): Promise<PaymentSearchResult> {
  const { data } = await apiClient.get<PaymentSearchResult>('/payment/transactions', { params: req });
  return data;
}

export async function refundPayment(
  transactionId: string,
  amount: number,
  reason?: string,
): Promise<PaymentTransactionDto> {
  const { data } = await apiClient.post<PaymentTransactionDto>('/payment/refund', {
    transactionId,
    amount,
    reason,
    refundType: '02',
  });
  return data;
}

export async function getPaymentStats(
  fromDate: string,
  toDate: string,
  provider?: string,
): Promise<PaymentStatsDto> {
  const { data } = await apiClient.get<PaymentStatsDto>('/payment/stats', {
    params: { fromDate, toDate, provider },
  });
  return data;
}

export function paymentStatusColor(status: number): string {
  switch (status) {
    case 0: return 'processing';
    case 1: return 'success';
    case 2: return 'error';
    case 3: return 'warning';
    case 4: return 'default';
    default: return 'default';
  }
}
