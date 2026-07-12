import { lazy } from 'react';

// Domain: financial (menu group: finance).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

export const BillingV2 = lazy(() => import('../../modules/billing/pages/Billing'));
export const BillingEditorV2 = lazy(() => import('../../modules/billing/pages/BillingEditor'));
export const FinanceV2 = lazy(() => import('../../modules/reports/pages/Finance'));
export const InsuranceV2 = lazy(() => import('../../modules/insurance/pages/Insurance'));
export const BhytFullCoverageV2 = lazy(() => import('../../modules/insurance/pages/BhytFullCoverage'));
export const BhxhAuditV2 = lazy(() => import('../../modules/insurance/pages/BhxhAudit'));
export const ProcurementV2 = lazy(() => import('../../modules/pharmacy/pages/Procurement'));
export const FinanceCatalogsV2 = lazy(() => import('../../modules/administration/pages/FinanceCatalogs'));
export const BankPaymentsV2 = lazy(() => import('../../pages-v2/BankPayments'));
export const EInvoicesV2 = lazy(() => import('../../modules/billing/pages/EInvoices'));
export const QrPaymentCenterV2 = lazy(() => import('../../modules/billing/pages/QrPaymentCenter'));
export const ReceiptBookAdminV2 = lazy(() => import('../../pages-v2/ReceiptBookAdmin'));
export const BhxhConfigV2 = lazy(() => import('../../pages-v2/BhxhConfig'));
export const PaymentReportsV2 = lazy(() => import('../../pages-v2/PaymentReports'));
export const PaymentTransactionsV2 = lazy(() => import('../../modules/billing/pages/PaymentTransactions'));
