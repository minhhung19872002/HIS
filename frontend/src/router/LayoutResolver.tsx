import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { resolveHomeRoute } from '../services/permission.service';

const Dashboard = lazy(() => import('../pages/Dashboard'));

// Extracted verbatim from App.tsx (behavior-preserving refactor #375).
// Default UI is v2 (Terminal). Visiting "/" redirects to the actor's PERMITTED home
// (#431 Phase 2.5: role-aware landing — tránh 403 khi gating ON; gating OFF → /v2/dashboard
// như cũ) unless the user has explicitly switched to the legacy v1 layout (localStorage).
export const HomeEntry: React.FC = () => {
  if (localStorage.getItem('layoutMode') === 'v1') {
    return <Dashboard />;
  }
  return <Navigate to={resolveHomeRoute()} replace />;
};
