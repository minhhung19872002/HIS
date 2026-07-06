import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('../pages/Dashboard'));

// Extracted verbatim from App.tsx (behavior-preserving refactor #375).
// Default UI is v2 (Terminal). Visiting "/" redirects to /v2/dashboard unless the
// user has explicitly switched to the legacy v1 layout (persisted in localStorage).
export const HomeEntry: React.FC = () => {
  if (localStorage.getItem('layoutMode') === 'v1') {
    return <Dashboard />;
  }
  return <Navigate to="/v2/dashboard" replace />;
};
