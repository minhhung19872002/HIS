import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Extracted verbatim from App.tsx (behavior-preserving refactor #375).
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
