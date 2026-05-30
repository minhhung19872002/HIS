/**
 * Type definitions cho Reports v1 — extracted khỏi pages/Reports.tsx
 * (K17 Batch 1). Pure types.
 */

import type {
  SupplierProcurementReportDto,
  RevenueByRecordReportDto,
  DeptCostVsFeesReportDto,
  RecordCostSummaryReportDto,
  FeesVsStandardsReportDto,
  ServiceOrderDoctorsReportDto,
  DispensingVsBillingReportDto,
  DispensingVsStandardsReportDto,
  SupplierProcurementItemDto,
  RevenueByRecordItemDto,
  DeptCostVsFeesItemDto,
  RecordCostSummaryItemDto,
  FeesVsStandardsItemDto,
  ServiceOrderDoctorsItemDto,
  DispensingVsBillingItemDto,
  DispensingVsStandardsItemDto,
} from '../../api/reconciliation';

/** Union DTO covering tất cả response của reconciliationApi.getX(). */
export type ReconciliationReportDto =
  | SupplierProcurementReportDto
  | RevenueByRecordReportDto
  | DeptCostVsFeesReportDto
  | RecordCostSummaryReportDto
  | FeesVsStandardsReportDto
  | ServiceOrderDoctorsReportDto
  | DispensingVsBillingReportDto
  | DispensingVsStandardsReportDto;

/** Union row item — đủ phủ rowKey + render trong getColumns(). */
export type ReconciliationRowItem =
  | SupplierProcurementItemDto
  | RevenueByRecordItemDto
  | DeptCostVsFeesItemDto
  | RecordCostSummaryItemDto
  | FeesVsStandardsItemDto
  | ServiceOrderDoctorsItemDto
  | DispensingVsBillingItemDto
  | DispensingVsStandardsItemDto;

export interface ReportConfig {
  /** Unique report ID - used for API mapping and state */
  id: string;
  /** Report reference code (e.g. "9.1", "9.7") */
  code: string;
  /** Vietnamese report name */
  name: string;
  /** Short description */
  description: string;
}

export interface ReportCategoryConfig {
  title: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportConfig[];
}

export type ApiCategory = 'finance' | 'pharmacy' | 'statistics';

export type ReconciliationReportId =
  | 'supplier-procurement'
  | 'revenue-by-record'
  | 'dept-cost-vs-fees'
  | 'record-cost-summary'
  | 'fees-vs-standards'
  | 'service-order-doctors'
  | 'dispensing-vs-billing'
  | 'dispensing-vs-standards';

export interface ReportField {
  id: string;
  name: string;
  source: string;
  formula?: string;
  format?: string;
  width?: number;
}

export interface CustomReportDef {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  fields: ReportField[];
  filters: { field: string; operator: string; value: string }[];
  groupBy?: string;
  sortBy?: string;
  sortDir?: string;
  createdAt: string;
}

export interface Nc10ReportDef {
  id: string;
  name: string;
  description: string;
}
