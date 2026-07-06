import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { SigningProvider } from '../contexts/SigningContext';
import AppRoutes from './AppRoutes';

// Router + app-level providers (extracted from App.tsx's ThemedApp, everything BELOW
// <AntdApp> — behavior-preserving refactor #375).
const AppRouter: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <NotificationProvider>
        <SigningProvider>
          <AppRoutes />
        </SigningProvider>
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default AppRouter;
