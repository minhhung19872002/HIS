import type { RouteEntry } from './index';
import {
  DashboardV2,
  Dashboard3CapV2,
  HelpV2,
  SatisfactionSurveyV2,
  PatientPortalStaffV2,
} from '../lazy/common.lazy';

// Domain: common — menu groups overview + portals.
export const commonV2Routes: RouteEntry[] = [
  // overview
  { path: 'dashboard', Component: DashboardV2, meta: { title: 'Tổng quan', group: 'overview' } },
  { path: 'dashboard-3cap', Component: Dashboard3CapV2, meta: { title: 'Dashboard 3 Cấp', group: 'overview' } },
  { path: 'lite/dashboard', Component: DashboardV2, meta: { title: 'Tổng quan (lite)', group: 'overview' } },
  // portals
  { path: 'help', Component: HelpV2, meta: { title: 'Trợ giúp', group: 'portals' } },
  { path: 'satisfaction-survey', Component: SatisfactionSurveyV2, meta: { title: 'Khảo sát hài lòng', group: 'portals' } },
  { path: 'patient-portal', redirect: '/m/patient-portal', meta: { title: 'Cổng bệnh nhân', group: 'portals' } },
  // #409: staff-on-behalf v1 (route cũ /patient-portal-staff, MainLayout) port sang v2.
  { path: 'patient-portal-staff', Component: PatientPortalStaffV2, meta: { title: 'Cổng bệnh nhân (Nhân viên)', group: 'portals' } },
];
