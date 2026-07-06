import type { RouteEntry } from './index';
import {
  BillingV2, BillingEditorV2, FinanceV2, InsuranceV2, BhytFullCoverageV2, BhxhAuditV2,
  ProcurementV2, FinanceCatalogsV2, BankPaymentsV2, EInvoicesV2, QrPaymentCenterV2,
  ReceiptBookAdminV2, BhxhConfigV2, PaymentReportsV2, PaymentTransactionsV2,
} from '../lazy/financial.lazy';

// Domain: financial — menu group finance.
export const financialV2Routes: RouteEntry[] = [
  { path: 'billing', Component: BillingV2, meta: { title: 'Viện phí', group: 'finance' } },
  { path: 'billing/edit', Component: BillingEditorV2, meta: { title: 'Viện phí (chỉnh sửa)', group: 'finance' } },
  { path: 'finance', Component: FinanceV2, meta: { title: 'Quản lý tài chính', group: 'finance' } },
  { path: 'insurance', Component: InsuranceV2, meta: { title: 'Giám định BHYT', group: 'finance' } },
  { path: 'bhyt-full-coverage', Component: BhytFullCoverageV2, meta: { title: 'BN BHYT chi trả 100%', group: 'finance' } },
  { path: 'bhxh-audit', Component: BhxhAuditV2, meta: { title: 'BHXH kiểm tra', group: 'finance' } },
  // dup #375: ProcurementRequestsV2 was dead (RR matched ProcurementV2 first) — dropped, behavior-preserving
  { path: 'procurement', Component: ProcurementV2, meta: { title: 'Đề xuất - Dự trù', group: 'finance' } },
  { path: 'finance-catalogs', Component: FinanceCatalogsV2, meta: { title: 'DM Tài chính', group: 'finance' } },
  { path: 'bank-payments', Component: BankPaymentsV2, meta: { title: 'TT Ngân hàng (BIDV/VCB/...)', group: 'finance' } },
  { path: 'einvoices', Component: EInvoicesV2, meta: { title: 'Hóa đơn điện tử (HĐĐT)', group: 'finance' } },
  { path: 'qr-payment-center', Component: QrPaymentCenterV2, meta: { title: 'QR động & Đối soát VCB', group: 'finance' } },
  { path: 'receipt-book-admin', Component: ReceiptBookAdminV2, meta: { title: 'Quản lý sổ biên lai', group: 'finance' } },
  { path: 'bhxh-config', Component: BhxhConfigV2, meta: { title: 'Cấu hình BHXH', group: 'finance' } },
  { path: 'payment-reports', Component: PaymentReportsV2, meta: { title: 'Báo cáo thanh toán', group: 'finance' } },
  { path: 'payment-transactions', Component: PaymentTransactionsV2, meta: { title: 'Giao dịch thanh toán', group: 'finance' } },
  { path: 'lite/billing', Component: BillingV2, meta: { title: 'Viện phí (lite)', group: 'finance' } },
];
