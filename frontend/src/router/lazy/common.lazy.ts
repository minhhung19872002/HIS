import { lazy } from 'react';

// Domain: common (menu groups: overview, portals).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

export const ModuleIndex = lazy(() => import('../../modules/system/pages/ModuleIndex'));
export const DashboardV2 = lazy(() => import('../../pages-v2/Dashboard'));
export const Dashboard3CapV2 = lazy(() => import('../../modules/administration/pages/Dashboard3Cap'));
export const HelpV2 = lazy(() => import('../../modules/radiology/pages/Help'));
export const SatisfactionSurveyV2 = lazy(() => import('../../pages-v2/SatisfactionSurvey'));
