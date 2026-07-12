import { lazy } from 'react';

// Domain: diagnostic (menu group: paraclinical).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

export const LaboratoryV2 = lazy(() => import('../../modules/laboratory/pages/Laboratory'));
export const LabQCV2 = lazy(() => import('../../pages-v2/LabQC'));
export const MicrobiologyV2 = lazy(() => import('../../modules/laboratory/pages/Microbiology'));
export const CultureCollectionV2 = lazy(() => import('../../modules/laboratory/pages/CultureCollection'));
export const ScreeningV2 = lazy(() => import('../../modules/laboratory/pages/Screening'));
export const SampleStorageV2 = lazy(() => import('../../modules/laboratory/pages/SampleStorage'));
export const SampleTrackingV2 = lazy(() => import('../../modules/laboratory/pages/SampleTracking'));
export const ReagentManagementV2 = lazy(() => import('../../modules/laboratory/pages/ReagentManagement'));
export const LISConfigV2 = lazy(() => import('../../modules/laboratory/pages/LISConfig'));
export const FunctionalDiagnosticsV2 = lazy(() => import('../../pages-v2/FunctionalDiagnostics'));
export const SpecialTestRuleAdminV2 = lazy(() => import('../../pages-v2/SpecialTestRuleAdmin'));
export const RadiologyV2 = lazy(() => import('../../modules/radiology/pages/Radiology'));
export const DicomViewerV2 = lazy(() => import('../../pages-v2/DicomViewer'));
export const DicomAutoSendV2 = lazy(() => import('../../pages-v2/DicomAutoSend'));
export const DicomStudyAuditLogV2 = lazy(() => import('../../pages-v2/DicomStudyAuditLog'));
export const PathologyV2 = lazy(() => import('../../modules/pathology/pages/Pathology'));
export const IvfLabV2 = lazy(() => import('../../pages-v2/IvfLab'));
export const BloodBankV2 = lazy(() => import('../../modules/blood-bank/pages/BloodBank'));
export const ParaclinicalCatalogsV2 = lazy(() => import('../../modules/administration/pages/ParaclinicalCatalogs'));
export const AnalyzerInboxV2 = lazy(() => import('../../modules/laboratory/pages/AnalyzerInbox'));
export const LisCatalogAdminV2 = lazy(() => import('../../pages-v2/LisCatalogAdmin'));
export const RisCatalogAdminV2 = lazy(() => import('../../pages-v2/RisCatalogAdmin'));
export const SampleReceiveV2 = lazy(() => import('../../pages-v2/SampleReceive'));
export const RadiologyOpsV2 = lazy(() => import('../../pages-v2/RadiologyOps'));
export const RisDispatcherV2 = lazy(() => import('../../modules/radiology/pages/RisDispatcher'));
export const RisAdminV2 = lazy(() => import('../../pages-v2/RisAdmin'));
export const NonDicomCaptureV2 = lazy(() => import('../../pages-v2/NonDicomCapture'));
