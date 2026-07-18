import type { RouteEntry } from './index';
import {
  HealthExchangeV2, InterHospitalSharingV2, ClinicalGuidanceV2, SmsManagementV2,
  ZaloNotificationsV2, NationalGatewaysV2, DeAn06LiaisonV2, Hl7MessageQueueV2,
  EmrCloudSyncV2, EmrHl7ExportV2,
} from '../lazy/system.lazy';

// Domain: system — menu group integration.
export const systemV2Routes: RouteEntry[] = [
  { path: 'health-exchange', Component: HealthExchangeV2, meta: { permission: 'System.Configure', title: 'Liên thông y tế HIE', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'inter-hospital', Component: InterHospitalSharingV2, meta: { permission: 'System.Configure', title: 'Chia sẻ liên viện', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'clinical-guidance', Component: ClinicalGuidanceV2, meta: { permission: 'MedicalRecord.Read', title: 'Chỉ đạo tuyến', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'sms-management', Component: SmsManagementV2, meta: { permission: 'System.Configure', title: 'SMS Gateway', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'zalo-notifications', Component: ZaloNotificationsV2, meta: { permission: 'System.Configure', title: 'Zalo OA / ZNS', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'national-gateways', Component: NationalGatewaysV2, meta: { permission: 'System.Configure', title: 'Cổng Đơn thuốc / Dược QG', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'de-an-06', Component: DeAn06LiaisonV2, meta: { permission: 'System.Configure', title: 'Đề án 06 (GCS/GBT/Lái xe)', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'hl7-message-queue', Component: Hl7MessageQueueV2, meta: { permission: 'System.Configure', title: 'Hàng đợi HL7 (retry)', group: 'integration', workspace: 'backoffice', module: 'extended' } },
  { path: 'emr-cloud-sync', Component: EmrCloudSyncV2, meta: { permission: 'System.Configure', title: 'Đồng bộ EMR lên Cloud', group: 'integration', workspace: 'clinical', module: 'KHAMBENH' } },
  { path: 'emr-hl7-export', Component: EmrHl7ExportV2, meta: { permission: 'MedicalRecord.Export', title: 'Xuất HL7 v2 HSBA', group: 'integration', workspace: 'clinical', module: 'KHAMBENH' } },
];
