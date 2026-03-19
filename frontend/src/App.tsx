import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SigningProvider } from './contexts/SigningContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import './App.css';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reception = lazy(() => import('./pages/Reception'));
const OPD = lazy(() => import('./pages/OPD'));
const Inpatient = lazy(() => import('./pages/Inpatient'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const Radiology = lazy(() => import('./pages/Radiology'));
const Billing = lazy(() => import('./pages/Billing'));
const Prescription = lazy(() => import('./pages/Prescription'));
const SystemAdmin = lazy(() => import('./pages/SystemAdmin'));
const Surgery = lazy(() => import('./pages/Surgery'));
const BloodBank = lazy(() => import('./pages/BloodBank'));
const Finance = lazy(() => import('./pages/Finance'));
const Insurance = lazy(() => import('./pages/Insurance'));
const MasterData = lazy(() => import('./pages/MasterData'));
const Reports = lazy(() => import('./pages/Reports'));
const Telemedicine = lazy(() => import('./pages/Telemedicine'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const InfectionControl = lazy(() => import('./pages/InfectionControl'));
const Rehabilitation = lazy(() => import('./pages/Rehabilitation'));
const Equipment = lazy(() => import('./pages/Equipment'));
const HR = lazy(() => import('./pages/HR'));
const Quality = lazy(() => import('./pages/Quality'));
const PatientPortal = lazy(() => import('./pages/PatientPortal'));
const HealthExchange = lazy(() => import('./pages/HealthExchange'));
const EmergencyDisaster = lazy(() => import('./pages/EmergencyDisaster'));
const Consultation = lazy(() => import('./pages/Consultation'));
const Help = lazy(() => import('./pages/Help'));
const DicomViewer = lazy(() => import('./pages/DicomViewer'));
const QueueDisplay = lazy(() => import('./pages/QueueDisplay'));
const EMR = lazy(() => import('./pages/EMR'));
const MedicalSupply = lazy(() => import('./pages/MedicalSupply'));
const FollowUp = lazy(() => import('./pages/FollowUp'));
const AppointmentBooking = lazy(() => import('./pages/AppointmentBooking'));
const BookingManagement = lazy(() => import('./pages/BookingManagement'));
const SmsManagement = lazy(() => import('./pages/SmsManagement'));
const LabQC = lazy(() => import('./pages/LabQC'));
const Microbiology = lazy(() => import('./pages/Microbiology'));
const SampleStorage = lazy(() => import('./pages/SampleStorage'));
const Screening = lazy(() => import('./pages/Screening'));
const ReagentManagement = lazy(() => import('./pages/ReagentManagement'));
const SampleTracking = lazy(() => import('./pages/SampleTracking'));
const Pathology = lazy(() => import('./pages/Pathology'));
const CultureCollection = lazy(() => import('./pages/CultureCollection'));
const DigitalSignature = lazy(() => import('./pages/DigitalSignature'));
const CentralSigning = lazy(() => import('./pages/CentralSigning'));
const MedicalRecordArchive = lazy(() => import('./pages/MedicalRecordArchive'));
const BhxhAudit = lazy(() => import('./pages/BhxhAudit'));
const DoctorPortal = lazy(() => import('./pages/DoctorPortal'));
const SatisfactionSurvey = lazy(() => import('./pages/SatisfactionSurvey'));
const LISConfig = lazy(() => import('./pages/LISConfig'));
const SpecialtyEMR = lazy(() => import('./pages/SpecialtyEMR'));
const SigningWorkflow = lazy(() => import('./pages/SigningWorkflow'));
const MedicalRecordPlanning = lazy(() => import('./pages/MedicalRecordPlanning'));
const EndpointSecurity = lazy(() => import('./pages/EndpointSecurity'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
    <Spin size="large" />
  </div>
);

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/queue-display" element={<QueueDisplay />} />
        <Route path="/dat-lich" element={<AppointmentBooking />} />
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
          <Route path="medical-supply" element={<MedicalSupply />} />
          <Route path="follow-up" element={<FollowUp />} />
          <Route path="booking-management" element={<BookingManagement />} />
          <Route path="sms-management" element={<SmsManagement />} />
          <Route path="lab" element={<Laboratory />} />
          <Route path="lab-qc" element={<LabQC />} />
          <Route path="microbiology" element={<Microbiology />} />
          <Route path="culture-collection" element={<CultureCollection />} />
          <Route path="sample-storage" element={<SampleStorage />} />
          <Route path="screening" element={<Screening />} />
          <Route path="reagent-management" element={<ReagentManagement />} />
          <Route path="sample-tracking" element={<SampleTracking />} />
          <Route path="pathology" element={<Pathology />} />
          <Route path="radiology" element={<Radiology />} />
          <Route path="blood-bank" element={<BloodBank />} />
          <Route path="billing" element={<Billing />} />
          <Route path="finance" element={<Finance />} />
          <Route path="insurance" element={<Insurance />} />
          <Route path="master-data" element={<MasterData />} />
          <Route path="reports" element={<Reports />} />
          <Route path="admin" element={<SystemAdmin />} />
          <Route path="digital-signature" element={<DigitalSignature />} />
          <Route path="central-signing" element={<CentralSigning />} />
          <Route path="settings" element={<div>Cài đặt hệ thống</div>} />
          <Route path="telemedicine" element={<Telemedicine />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="infection-control" element={<InfectionControl />} />
          <Route path="rehabilitation" element={<Rehabilitation />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="hr" element={<HR />} />
          <Route path="quality" element={<Quality />} />
          <Route path="patient-portal" element={<PatientPortal />} />
          <Route path="health-exchange" element={<HealthExchange />} />
          <Route path="emergency-disaster" element={<EmergencyDisaster />} />
          <Route path="emr" element={<EMR />} />
          <Route path="consultation" element={<Consultation />} />
          <Route path="help" element={<Help />} />
          <Route path="radiology/viewer" element={<DicomViewer />} />
          <Route path="medical-record-archive" element={<MedicalRecordArchive />} />
          <Route path="bhxh-audit" element={<BhxhAudit />} />
          <Route path="doctor-portal" element={<DoctorPortal />} />
          <Route path="satisfaction-survey" element={<SatisfactionSurvey />} />
          <Route path="lis-config" element={<LISConfig />} />
          <Route path="specialty-emr" element={<SpecialtyEMR />} />
          <Route path="signing-workflow" element={<SigningWorkflow />} />
          <Route path="medical-record-planning" element={<MedicalRecordPlanning />} />
          <Route path="endpoint-security" element={<EndpointSecurity />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <SigningProvider>
                <AppRoutes />
              </SigningProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
