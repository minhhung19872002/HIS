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
  { path: 'dashboard', Component: DashboardV2, meta: { permission: 'Report.Read', title: 'Tổng quan', group: 'overview', workspace: 'backoffice', module: 'BAOCAO' } },
  { path: 'dashboard-3cap', Component: Dashboard3CapV2, meta: { permission: 'Report.Read', title: 'Dashboard 3 Cấp', group: 'overview', workspace: 'backoffice', module: 'BAOCAO' } },
  { path: 'lite/dashboard', Component: DashboardV2, meta: { permission: 'Report.Read', title: 'Tổng quan (lite)', group: 'overview', workspace: 'backoffice', module: 'BAOCAO' } },
  // portals
  { path: 'help', Component: HelpV2, meta: { permission: 'Patient.Read', title: 'Trợ giúp', group: 'portals', workspace: 'frontoffice', module: 'extended' } },
  { path: 'satisfaction-survey', Component: SatisfactionSurveyV2, meta: { permission: 'Patient.Read', title: 'Khảo sát hài lòng', group: 'portals', workspace: 'frontoffice', module: 'extended' } },
  { path: 'patient-portal', redirect: '/m/patient-portal', meta: { permission: 'Reception.Read', title: 'Cổng bệnh nhân', group: 'portals', workspace: 'frontoffice', module: 'TIEPDON' } },
  // #409: staff-on-behalf v1 (route cũ /patient-portal-staff, MainLayout) port sang v2.
  { path: 'patient-portal-staff', Component: PatientPortalStaffV2, meta: { permission: 'Reception.Read', title: 'Cổng bệnh nhân (Nhân viên)', group: 'portals', workspace: 'frontoffice', module: 'TIEPDON' } },
];
