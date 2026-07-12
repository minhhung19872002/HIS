import { lazy } from 'react';

// Domain: administration (menu groups: management, records).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

// --- management group ---
export const SystemAdminV2 = lazy(() => import('../../modules/system/pages/SystemAdmin'));
export const HRV2 = lazy(() => import('../../modules/hr/pages/HR'));
export const PayrollAdminV2 = lazy(() => import('../../modules/hr/pages/PayrollAdmin'));
export const HrDecisionsV2 = lazy(() => import('../../modules/hr/pages/HrDecisions'));
export const VppStockCardV2 = lazy(() => import('../../modules/pharmacy/pages/VppStockCard'));
export const OfficialDocumentsV2 = lazy(() => import('../../modules/administration/pages/OfficialDocuments'));
export const QualityV2 = lazy(() => import('../../modules/quality/pages/Quality'));
export const EquipmentV2 = lazy(() => import('../../modules/asset/pages/Equipment'));
export const AssetManagementV2 = lazy(() => import('../../modules/asset/pages/AssetManagement'));
export const InfectionControlV2 = lazy(() => import('../../pages-v2/InfectionControl'));
export const LinenManagementV2 = lazy(() => import('../../modules/administration/pages/LinenManagement'));
export const TrainingResearchV2 = lazy(() => import('../../modules/training/pages/TrainingResearch'));
export const PracticeLicenseV2 = lazy(() => import('../../modules/hr/pages/PracticeLicense'));
export const EndpointSecurityV2 = lazy(() => import('../../modules/administration/pages/EndpointSecurity'));
export const AdministrativeUnitsV2 = lazy(() => import('../../modules/administration/pages/AdministrativeUnits'));
export const ObstetricRegistersV2 = lazy(() => import('../../modules/administration/pages/ObstetricRegisters'));
export const AdrReportsV2 = lazy(() => import('../../modules/quality/pages/AdrReports'));
export const BillingGuarantorsV2 = lazy(() => import('../../modules/billing/pages/BillingGuarantors'));
export const FunctionalDiagnosticCatalogV2 = lazy(() => import('../../modules/administration/pages/FunctionalDiagnosticCatalog'));
export const ProvincialHealthV2 = lazy(() => import('../../modules/administration/pages/ProvincialHealth'));
export const BackupManagementV2 = lazy(() => import('../../modules/administration/pages/BackupManagement'));
export const HisConnectionsV2 = lazy(() => import('../../modules/administration/pages/HisConnections'));
export const KioskSelfServiceV2 = lazy(() => import('../../pages-v2/KioskSelfService'));
export const ReportsV2 = lazy(() => import('../../modules/reports/pages/Reports'));
export const WaitingTimeReportV2 = lazy(() => import('../../modules/reception/pages/WaitingTimeReport'));
export const ReportCatalogsV2 = lazy(() => import('../../modules/administration/pages/ReportCatalogs'));
export const QualityDashboardLiveV2 = lazy(() => import('../../modules/quality/pages/QualityDashboardLive'));
export const WorkloadReportV2 = lazy(() => import('../../modules/reports/pages/WorkloadReport'));
export const CatalogsAdminV2 = lazy(() => import('../../pages-v2/CatalogsAdmin'));
export const EmployeeProfileV2 = lazy(() => import('../../modules/hr/pages/EmployeeProfile'));

// --- records group ---
export const DigitalSignatureV2 = lazy(() => import('../../modules/emr/pages/DigitalSignature'));
export const CentralSigningV2 = lazy(() => import('../../modules/emr/pages/CentralSigning'));
export const SigningWorkflowV2 = lazy(() => import('../../modules/emr/pages/SigningWorkflow'));
export const BiometricEnrollmentV2 = lazy(() => import('../../modules/reception/pages/BiometricEnrollment'));
export const MasterDataV2 = lazy(() => import('../../modules/system/pages/MasterData'));
