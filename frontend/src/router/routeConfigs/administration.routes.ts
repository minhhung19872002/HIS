import type { RouteEntry } from './index';
import {
  SystemAdminV2, HRV2, PayrollAdminV2, HrDecisionsV2, VppStockCardV2, OfficialDocumentsV2,
  QualityV2, EquipmentV2, AssetManagementV2, InfectionControlV2, LinenManagementV2,
  TrainingResearchV2, PracticeLicenseV2, EndpointSecurityV2, AdministrativeUnitsV2,
  ObstetricRegistersV2, AdrReportsV2, BillingGuarantorsV2, FunctionalDiagnosticCatalogV2,
  ProvincialHealthV2, BackupManagementV2, HisConnectionsV2, KioskSelfServiceV2, ReportsV2,
  WaitingTimeReportV2, ReportCatalogsV2, QualityDashboardLiveV2, WorkloadReportV2,
  CatalogsAdminV2, EmployeeProfileV2,
  DigitalSignatureV2, CentralSigningV2, SigningWorkflowV2, BiometricEnrollmentV2, MasterDataV2,
} from '../lazy/administration.lazy';

// Domain: administration — menu groups management + records.
export const administrationV2Routes: RouteEntry[] = [
  // --- management group ---
  { path: 'admin', Component: SystemAdminV2, meta: { title: 'Quản trị hệ thống', group: 'management' } },
  { path: 'hr', Component: HRV2, meta: { title: 'Nhân sự', group: 'management' } },
  { path: 'payroll', Component: PayrollAdminV2, meta: { title: 'Lương (Payroll)', group: 'management' } },
  { path: 'hr-decisions', Component: HrDecisionsV2, meta: { title: 'Quyết định nhân sự', group: 'management' } },
  { path: 'vpp-stock-card', Component: VppStockCardV2, meta: { title: 'Kho TTB/VPP (thẻ kho)', group: 'management' } },
  { path: 'official-documents', Component: OfficialDocumentsV2, meta: { title: 'Công văn đến/đi', group: 'management' } },
  { path: 'quality', Component: QualityV2, meta: { title: 'Chất lượng BV', group: 'management' } },
  { path: 'equipment', Component: EquipmentV2, meta: { title: 'Thiết bị y tế', group: 'management' } },
  { path: 'asset-management', Component: AssetManagementV2, meta: { title: 'Tài sản - CCDC', group: 'management' } },
  { path: 'infection-control', Component: InfectionControlV2, meta: { title: 'Kiểm soát nhiễm khuẩn', group: 'management' } },
  { path: 'linen-management', Component: LinenManagementV2, meta: { title: 'Đồ giặt & Tiệt trùng', group: 'management' } },
  { path: 'training-research', Component: TrainingResearchV2, meta: { title: 'Đào tạo - NCKH', group: 'management' } },
  { path: 'practice-license', Component: PracticeLicenseV2, meta: { title: 'Chứng chỉ hành nghề', group: 'management' } },
  { path: 'endpoint-security', Component: EndpointSecurityV2, meta: { title: 'An toàn thông tin', group: 'management' } },
  { path: 'administrative-units', Component: AdministrativeUnitsV2, meta: { title: 'DM Địa danh HC', group: 'management' } },
  { path: 'obstetric-registers', Component: ObstetricRegistersV2, meta: { title: 'Sổ sản khoa', group: 'management' } },
  { path: 'adr-reports', Component: AdrReportsV2, meta: { title: 'Báo cáo ADR', group: 'management' } },
  { path: 'billing-guarantors', Component: BillingGuarantorsV2, meta: { title: 'Bảo lãnh viện phí', group: 'management' } },
  { path: 'functional-diagnostic-catalog', Component: FunctionalDiagnosticCatalogV2, meta: { title: 'DM Thăm dò chức năng', group: 'management' } },
  { path: 'provincial-health', Component: ProvincialHealthV2, meta: { title: 'Chỉ đạo tuyến', group: 'management' } },
  { path: 'backup-management', Component: BackupManagementV2, meta: { title: 'Quản lý Backup', group: 'management' } },
  { path: 'his-connections', Component: HisConnectionsV2, meta: { title: 'Kết nối HIS', group: 'management' } },
  { path: 'kiosk', Component: KioskSelfServiceV2, meta: { title: 'Kiosk tự phục vụ', group: 'management' } },
  { path: 'reports', Component: ReportsV2, meta: { title: 'Báo cáo', group: 'management' } },
  { path: 'reports/waiting-time', Component: WaitingTimeReportV2, meta: { title: 'Phân tích thời gian chờ', group: 'management' } },
  { path: 'report-catalogs', Component: ReportCatalogsV2, meta: { title: 'DM Nhóm BC', group: 'management' } },
  { path: 'quality-dashboard-live', Component: QualityDashboardLiveV2, meta: { title: 'DB Chất lượng (live)', group: 'management' } },
  { path: 'settings', redirect: '/v2/admin', meta: { title: 'Cài đặt', group: 'management' } },
  { path: 'workload-report', Component: WorkloadReportV2, meta: { title: 'Báo cáo khối lượng công việc', group: 'management' } },
  { path: 'catalogs-admin', Component: CatalogsAdminV2, meta: { title: 'Quản trị danh mục', group: 'management' } },
  { path: 'employee-profile', Component: EmployeeProfileV2, meta: { title: 'Hồ sơ nhân viên', group: 'management' } },

  // --- records group ---
  { path: 'digital-signature', Component: DigitalSignatureV2, meta: { title: 'Chữ ký số', group: 'records' } },
  { path: 'central-signing', Component: CentralSigningV2, meta: { title: 'Ký số tập trung', group: 'records' } },
  { path: 'signing-workflow', Component: SigningWorkflowV2, meta: { title: 'Quy trình ký', group: 'records' } },
  { path: 'biometric-enrollment', Component: BiometricEnrollmentV2, meta: { title: 'Vân tay BN (WebAuthn)', group: 'records' } },
  { path: 'master-data', Component: MasterDataV2, meta: { title: 'Danh mục', group: 'records' } },
];
