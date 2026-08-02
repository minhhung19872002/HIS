import { lazy } from 'react';

// Domain: diagnostic (menu group: paraclinical).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

export const LaboratoryV2 = lazy(() => import('../../modules/laboratory/pages/Laboratory'));
export const LabQCV2 = lazy(() => import('../../modules/laboratory/pages/LabQC'));
export const MicrobiologyV2 = lazy(() => import('../../modules/laboratory/pages/Microbiology'));
export const CultureCollectionV2 = lazy(() => import('../../modules/laboratory/pages/CultureCollection'));
export const ScreeningV2 = lazy(() => import('../../modules/laboratory/pages/Screening'));
export const SampleStorageV2 = lazy(() => import('../../modules/laboratory/pages/SampleStorage'));
export const SampleTrackingV2 = lazy(() => import('../../modules/laboratory/pages/SampleTracking'));
export const ReagentManagementV2 = lazy(() => import('../../modules/laboratory/pages/ReagentManagement'));
export const LISConfigV2 = lazy(() => import('../../modules/laboratory/pages/LISConfig'));
export const FunctionalDiagnosticsV2 = lazy(() => import('../../modules/radiology/pages/FunctionalDiagnostics'));
export const SpecialTestRuleAdminV2 = lazy(() => import('../../modules/patient/pages/SpecialTestRuleAdmin'));
export const RadiologyV2 = lazy(() => import('../../modules/radiology/pages/Radiology'));
export const DicomViewerV2 = lazy(() => import('../../modules/radiology/pages/DicomViewer'));
export const DicomAutoSendV2 = lazy(() => import('../../modules/radiology/pages/DicomAutoSend'));
export const DicomStudyAuditLogV2 = lazy(() => import('../../modules/radiology/pages/DicomStudyAuditLog'));
export const PathologyV2 = lazy(() => import('../../modules/pathology/pages/Pathology'));
export const IvfLabV2 = lazy(() => import('../../modules/specialty/pages/IvfLab'));
export const BloodBankV2 = lazy(() => import('../../modules/blood-bank/pages/BloodBank'));
export const ParaclinicalCatalogsV2 = lazy(() => import('../../modules/administration/pages/ParaclinicalCatalogs'));
export const AnalyzerInboxV2 = lazy(() => import('../../modules/laboratory/pages/AnalyzerInbox'));
export const LisCatalogAdminV2 = lazy(() => import('../../modules/laboratory/pages/LisCatalogAdmin'));
export const RisCatalogAdminV2 = lazy(() => import('../../modules/radiology/pages/RisCatalogAdmin'));
export const SampleReceiveV2 = lazy(() => import('../../modules/laboratory/pages/SampleReceive'));
export const RadiologyOpsV2 = lazy(() => import('../../modules/radiology/pages/RadiologyOps'));
export const RisDispatcherV2 = lazy(() => import('../../modules/radiology/pages/RisDispatcher'));
export const RisAdminV2 = lazy(() => import('../../modules/radiology/pages/RisAdmin'));
export const NonDicomCaptureV2 = lazy(() => import('../../modules/radiology/pages/NonDicomCapture'));
