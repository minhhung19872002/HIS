import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner/Spinner';
import { ROUTES } from '../config/route.config';

// Extracted verbatim from App.tsx (behavior-preserving refactor #375).
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: '12px', background: 'var(--d-0)', color: 'var(--t-2)',
      }}>
        <Spinner size="lg" />
        <span style={{ fontSize: 'var(--fs-sm)' }}>Đang xác thực…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};
