import type { RouteEntry } from './index';
import {
  BillingV2, BillingEditorV2, FinanceV2, InsuranceV2, BhytFullCoverageV2, BhxhAuditV2,
  ProcurementV2, FinanceCatalogsV2, BankPaymentsV2, EInvoicesV2, RefundApprovalV2, QrPaymentCenterV2,
  ReceiptBookAdminV2, BhxhConfigV2, PaymentReportsV2, PaymentTransactionsV2,
} from '../lazy/financial.lazy';

// Domain: financial — menu group finance.
export const financialV2Routes: RouteEntry[] = [
  { path: 'billing', Component: BillingV2, meta: { title: 'Viện phí', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'billing/edit', Component: BillingEditorV2, meta: { title: 'Viện phí (chỉnh sửa)', group: 'finance', permission: 'Billing.Collect', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'finance', Component: FinanceV2, meta: { title: 'Quản lý tài chính', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'insurance', Component: InsuranceV2, meta: { permission: 'Insurance.Read', title: 'Giám định BHYT', group: 'finance', workspace: 'backoffice', module: 'BHYT' } },
  { path: 'bhyt-full-coverage', Component: BhytFullCoverageV2, meta: { permission: 'Insurance.Read', title: 'BN BHYT chi trả 100%', group: 'finance', workspace: 'backoffice', module: 'BHYT' } },
  { path: 'bhxh-audit', Component: BhxhAuditV2, meta: { permission: 'Insurance.Read', title: 'BHXH kiểm tra', group: 'finance', workspace: 'backoffice', module: 'BHYT' } },
  // dup #375: ProcurementRequestsV2 was dead (RR matched ProcurementV2 first) — dropped, behavior-preserving
  { path: 'procurement', Component: ProcurementV2, meta: { permission: 'Pharmacy.Read', title: 'Đề xuất - Dự trù', group: 'finance', workspace: 'pharmacy', module: 'DUOCKHO' } },
  { path: 'finance-catalogs', Component: FinanceCatalogsV2, meta: { permission: 'System.Configure', title: 'DM Tài chính', group: 'finance', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'bank-payments', Component: BankPaymentsV2, meta: { title: 'TT Ngân hàng (BIDV/VCB/...)', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'einvoices', Component: EInvoicesV2, meta: { title: 'Hóa đơn điện tử (HĐĐT)', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  // #352: duyệt/chi hoàn tiền — thao tác động tiền nên gate Billing.Collect, không phải Billing.Read
  { path: 'refund-approval', Component: RefundApprovalV2, meta: { title: 'Duyệt hoàn tiền', group: 'finance', permission: 'Billing.Collect', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'qr-payment-center', Component: QrPaymentCenterV2, meta: { title: 'QR động & Đối soát VCB', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'receipt-book-admin', Component: ReceiptBookAdminV2, meta: { title: 'Quản lý sổ biên lai', group: 'finance', permission: 'System.Configure', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'bhxh-config', Component: BhxhConfigV2, meta: { permission: 'System.Configure', title: 'Cấu hình BHXH', group: 'finance', workspace: 'backoffice', module: 'BHYT' } },
  { path: 'payment-reports', Component: PaymentReportsV2, meta: { title: 'Báo cáo thanh toán', group: 'finance', permission: 'Report.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'payment-transactions', Component: PaymentTransactionsV2, meta: { title: 'Giao dịch thanh toán', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
  { path: 'lite/billing', Component: BillingV2, meta: { title: 'Viện phí (lite)', group: 'finance', permission: 'Billing.Read', workspace: 'frontoffice', module: 'THUNGAN' } },
];
