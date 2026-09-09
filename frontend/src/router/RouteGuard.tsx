import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner/Spinner';
import { ROUTES } from '../config/route.config';

// Extracted verbatim from App.tsx (behavior-preserving refactor #375).
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  // #216 TC-PERM-015: đang bị buộc đổi mật khẩu thì gõ thẳng URL nghiệp vụ cũng quay về màn đổi.
  // Đây chỉ là lớp UX; lớp thật là PasswordChangeRequiredMiddleware ở server (mọi /api/* → 403).
  if (user?.mustChangePassword) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  return <>{children}</>;
};
