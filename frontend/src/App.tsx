import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reception from './pages/Reception';
import OPD from './pages/OPD';
import Inpatient from './pages/Inpatient';
import Pharmacy from './pages/Pharmacy';
import Laboratory from './pages/Laboratory';
import Radiology from './pages/Radiology';
import Billing from './pages/Billing';
import Prescription from './pages/Prescription';
import SystemAdmin from './pages/SystemAdmin';
import Surgery from './pages/Surgery';
import BloodBank from './pages/BloodBank';
import Finance from './pages/Finance';
import Insurance from './pages/Insurance';
import MasterData from './pages/MasterData';
import Reports from './pages/Reports';
// New modules - Flow 11-18
import Telemedicine from './pages/Telemedicine';
import Nutrition from './pages/Nutrition';
import InfectionControl from './pages/InfectionControl';
import Rehabilitation from './pages/Rehabilitation';
import Equipment from './pages/Equipment';
import HR from './pages/HR';
import Quality from './pages/Quality';
import PatientPortal from './pages/PatientPortal';
// New modules - Flow 19-20
import HealthExchange from './pages/HealthExchange';
import EmergencyDisaster from './pages/EmergencyDisaster';
// RIS/PACS extended modules
import Consultation from './pages/Consultation';
import Help from './pages/Help';
import DicomViewer from './pages/DicomViewer';
import QueueDisplay from './pages/QueueDisplay';
import EMR from './pages/EMR';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/queue-display" element={<QueueDisplay />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="reception" element={<Reception />} />
        <Route path="patients" element={<div>Quản lý bệnh nhân</div>} />
        <Route path="opd" element={<OPD />} />
        <Route path="prescription" element={<Prescription />} />
        <Route path="ipd" element={<Inpatient />} />
        <Route path="surgery" element={<Surgery />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="lab" element={<Laboratory />} />
        <Route path="radiology" element={<Radiology />} />
        <Route path="blood-bank" element={<BloodBank />} />
        <Route path="billing" element={<Billing />} />
        <Route path="finance" element={<Finance />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="master-data" element={<MasterData />} />
        <Route path="reports" element={<Reports />} />
        <Route path="admin" element={<SystemAdmin />} />
        <Route path="settings" element={<div>Cài đặt hệ thống</div>} />
        {/* New modules - Flow 11-18 */}
        <Route path="telemedicine" element={<Telemedicine />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="infection-control" element={<InfectionControl />} />
        <Route path="rehabilitation" element={<Rehabilitation />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="hr" element={<HR />} />
        <Route path="quality" element={<Quality />} />
        <Route path="patient-portal" element={<PatientPortal />} />
        {/* New modules - Flow 19-20 */}
        <Route path="health-exchange" element={<HealthExchange />} />
        <Route path="emergency-disaster" element={<EmergencyDisaster />} />
        {/* RIS/PACS extended modules */}
        <Route path="emr" element={<EMR />} />
        <Route path="consultation" element={<Consultation />} />
        <Route path="help" element={<Help />} />
        <Route path="radiology/viewer" element={<DicomViewer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
