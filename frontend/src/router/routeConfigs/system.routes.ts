import type { RouteEntry } from './index';
import {
  HealthExchangeV2, InterHospitalSharingV2, ClinicalGuidanceV2, SmsManagementV2,
  ZaloNotificationsV2, NationalGatewaysV2, DeAn06LiaisonV2, Hl7MessageQueueV2,
  EmrCloudSyncV2, EmrHl7ExportV2,
} from '../lazy/system.lazy';

// Domain: system — menu group integration.
export const systemV2Routes: RouteEntry[] = [
  { path: 'health-exchange', Component: HealthExchangeV2, meta: { title: 'Liên thông y tế HIE', group: 'integration' } },
  { path: 'inter-hospital', Component: InterHospitalSharingV2, meta: { title: 'Chia sẻ liên viện', group: 'integration' } },
  { path: 'clinical-guidance', Component: ClinicalGuidanceV2, meta: { title: 'Chỉ đạo tuyến', group: 'integration' } },
  { path: 'sms-management', Component: SmsManagementV2, meta: { title: 'SMS Gateway', group: 'integration' } },
  { path: 'zalo-notifications', Component: ZaloNotificationsV2, meta: { title: 'Zalo OA / ZNS', group: 'integration' } },
  { path: 'national-gateways', Component: NationalGatewaysV2, meta: { title: 'Cổng Đơn thuốc / Dược QG', group: 'integration' } },
  { path: 'de-an-06', Component: DeAn06LiaisonV2, meta: { title: 'Đề án 06 (GCS/GBT/Lái xe)', group: 'integration' } },
  { path: 'hl7-message-queue', Component: Hl7MessageQueueV2, meta: { title: 'Hàng đợi HL7 (retry)', group: 'integration' } },
  { path: 'emr-cloud-sync', Component: EmrCloudSyncV2, meta: { title: 'Đồng bộ EMR lên Cloud', group: 'integration' } },
  { path: 'emr-hl7-export', Component: EmrHl7ExportV2, meta: { title: 'Xuất HL7 v2 HSBA', group: 'integration' } },
];
