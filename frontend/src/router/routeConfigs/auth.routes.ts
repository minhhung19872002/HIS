// Domain: auth — standalone portals that live OUTSIDE the /v2 map.
//
// These routes are intentionally NOT part of `v2Routes` (routeConfigs/index.ts):
// they render at absolute paths with special or absent guards, so AppRoutes wires
// them inline as JSX rather than through the data-driven v2 <Route> map:
//   /inspector-portal   -> InspectorPortalStandalone   (NO guard)
//   /patient-portal     -> PatientPortalSelfLogin      (NO guard, self-login)
//   /m/patient-portal   -> PatientPortalMobileApp      (<ProtectedRoute>)
//   /m/doctor-portal    -> DoctorPortalMobileApp        (<ProtectedRoute>)
//
// The lazy components live in ../lazy/auth.lazy.ts and are imported directly by AppRoutes.
// This manifest is documentation only — kept in sync with AppRoutes' inline standalone block.
export const authStandaloneRoutePaths = [
  '/inspector-portal',
  '/patient-portal',
  '/m/patient-portal',
  '/m/doctor-portal',
] as const;
