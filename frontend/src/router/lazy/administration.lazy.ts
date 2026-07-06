import { lazy } from 'react';

// Domain: administration (menu groups: management, records).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

// --- management group ---
export const SystemAdminV2 = lazy(() => import('../../pages-v2/SystemAdmin'));
export const HRV2 = lazy(() => import('../../pages-v2/HR'));
export const PayrollAdminV2 = lazy(() => import('../../pages-v2/PayrollAdmin'));
export const HrDecisionsV2 = lazy(() => import('../../pages-v2/HrDecisions'));
export const VppStockCardV2 = lazy(() => import('../../pages-v2/VppStockCard'));
export const OfficialDocumentsV2 = lazy(() => import('../../pages-v2/OfficialDocuments'));
export const QualityV2 = lazy(() => import('../../pages-v2/Quality'));
export const EquipmentV2 = lazy(() => import('../../pages-v2/Equipment'));
export const AssetManagementV2 = lazy(() => import('../../pages-v2/AssetManagement'));
export const InfectionControlV2 = lazy(() => import('../../pages-v2/InfectionControl'));
export const LinenManagementV2 = lazy(() => import('../../pages-v2/LinenManagement'));
export const TrainingResearchV2 = lazy(() => import('../../pages-v2/TrainingResearch'));
export const PracticeLicenseV2 = lazy(() => import('../../pages-v2/PracticeLicense'));
export const EndpointSecurityV2 = lazy(() => import('../../pages-v2/EndpointSecurity'));
export const AdministrativeUnitsV2 = lazy(() => import('../../pages-v2/AdministrativeUnits'));
export const ObstetricRegistersV2 = lazy(() => import('../../pages-v2/ObstetricRegisters'));
export const AdrReportsV2 = lazy(() => import('../../pages-v2/AdrReports'));
export const BillingGuarantorsV2 = lazy(() => import('../../pages-v2/BillingGuarantors'));
export const FunctionalDiagnosticCatalogV2 = lazy(() => import('../../pages-v2/FunctionalDiagnosticCatalog'));
export const ProvincialHealthV2 = lazy(() => import('../../pages-v2/ProvincialHealth'));
export const BackupManagementV2 = lazy(() => import('../../pages-v2/BackupManagement'));
export const HisConnectionsV2 = lazy(() => import('../../pages-v2/HisConnections'));
export const KioskSelfServiceV2 = lazy(() => import('../../pages-v2/KioskSelfService'));
export const ReportsV2 = lazy(() => import('../../pages-v2/Reports'));
export const WaitingTimeReportV2 = lazy(() => import('../../pages-v2/WaitingTimeReport'));
export const ReportCatalogsV2 = lazy(() => import('../../pages-v2/ReportCatalogs'));
export const QualityDashboardLiveV2 = lazy(() => import('../../pages-v2/QualityDashboardLive'));
export const WorkloadReportV2 = lazy(() => import('../../pages-v2/WorkloadReport'));
export const CatalogsAdminV2 = lazy(() => import('../../pages-v2/CatalogsAdmin'));
export const EmployeeProfileV2 = lazy(() => import('../../pages-v2/EmployeeProfile'));

// --- records group ---
export const DigitalSignatureV2 = lazy(() => import('../../pages-v2/DigitalSignature'));
export const CentralSigningV2 = lazy(() => import('../../pages-v2/CentralSigning'));
export const SigningWorkflowV2 = lazy(() => import('../../pages-v2/SigningWorkflow'));
export const BiometricEnrollmentV2 = lazy(() => import('../../pages-v2/BiometricEnrollment'));
export const MasterDataV2 = lazy(() => import('../../pages-v2/MasterData'));
