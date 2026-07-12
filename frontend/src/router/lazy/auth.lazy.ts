import { lazy } from 'react';

// Domain: auth (standalone portals rendered OUTSIDE /v2, with special/absent guards).
// These are consumed inline by AppRoutes (not via the v2Routes map) — see auth.routes.ts.

export const InspectorPortalStandalone = lazy(() => import('../../modules/quality/pages/InspectorPortal'));
export const PatientPortalSelfLogin = lazy(() => import('../../modules/portal/pages/PatientPortalStandalone'));
export const PatientPortalMobileApp = lazy(() => import('../../pages-mobile/PatientPortalMobile'));
export const DoctorPortalMobileApp = lazy(() => import('../../pages-mobile/DoctorPortalMobile'));
