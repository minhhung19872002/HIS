import { lazy } from 'react';

// Domain: system (menu group: integration).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

export const HealthExchangeV2 = lazy(() => import('../../modules/system/pages/HealthExchange'));
export const InterHospitalSharingV2 = lazy(() => import('../../modules/system/pages/InterHospitalSharing'));
export const ClinicalGuidanceV2 = lazy(() => import('../../modules/patient/pages/ClinicalGuidance'));
export const SmsManagementV2 = lazy(() => import('../../modules/system/pages/SmsManagement'));
export const ZaloNotificationsV2 = lazy(() => import('../../modules/system/pages/ZaloNotifications'));
export const NationalGatewaysV2 = lazy(() => import('../../modules/system/pages/NationalGateways'));
export const DeAn06LiaisonV2 = lazy(() => import('../../modules/system/pages/DeAn06Liaison'));
export const Hl7MessageQueueV2 = lazy(() => import('../../modules/system/pages/Hl7MessageQueue'));
export const EmrCloudSyncV2 = lazy(() => import('../../modules/system/pages/EmrCloudSync'));
export const EmrHl7ExportV2 = lazy(() => import('../../modules/system/pages/EmrHl7Export'));
