import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SigningProvider } from './contexts/SigningContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
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
const IvfLab = lazy(() => import('./pages/IvfLab'));
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
const TreatmentProtocol = lazy(() => import('./pages/TreatmentProtocol'));
const ChronicDisease = lazy(() => import('./pages/ChronicDisease'));
const HospitalPharmacy = lazy(() => import('./pages/HospitalPharmacy'));
const ClinicalGuidance = lazy(() => import('./pages/ClinicalGuidance'));
const TbHivManagement = lazy(() => import('./pages/TbHivManagement'));
const HealthCheckup = lazy(() => import('./pages/HealthCheckup'));
const Immunization = lazy(() => import('./pages/Immunization'));
const Epidemiology = lazy(() => import('./pages/Epidemiology'));
const SchoolHealth = lazy(() => import('./pages/SchoolHealth'));
const OccupationalHealth = lazy(() => import('./pages/OccupationalHealth'));
const MethadoneTreatment = lazy(() => import('./pages/MethadoneTreatment'));
const FoodSafety = lazy(() => import('./pages/FoodSafety'));
const CommunityHealth = lazy(() => import('./pages/CommunityHealth'));
const HivManagement = lazy(() => import('./pages/HivManagement'));
const MedicalForensics = lazy(() => import('./pages/MedicalForensics'));
const TraditionalMedicine = lazy(() => import('./pages/TraditionalMedicine'));
const ReproductiveHealth = lazy(() => import('./pages/ReproductiveHealth'));
const MentalHealth = lazy(() => import('./pages/MentalHealth'));
const EnvironmentalHealth = lazy(() => import('./pages/EnvironmentalHealth'));
const TraumaRegistry = lazy(() => import('./pages/TraumaRegistry'));
const PopulationHealth = lazy(() => import('./pages/PopulationHealth'));
const HealthEducation = lazy(() => import('./pages/HealthEducation'));
const PracticeLicense = lazy(() => import('./pages/PracticeLicense'));
const InterHospitalSharing = lazy(() => import('./pages/InterHospitalSharing'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const TrainingResearch = lazy(() => import('./pages/TrainingResearch'));

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
          <Route path="patients" element={<Navigate to="/reception" replace />} />
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
          <Route path="ivf-lab" element={<IvfLab />} />
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
          <Route path="settings" element={<Navigate to="/admin" replace />} />
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
          <Route path="treatment-protocols" element={<TreatmentProtocol />} />
          <Route path="chronic-disease" element={<ChronicDisease />} />
          <Route path="hospital-pharmacy" element={<HospitalPharmacy />} />
          <Route path="clinical-guidance" element={<ClinicalGuidance />} />
          <Route path="tb-hiv" element={<TbHivManagement />} />
          <Route path="health-checkup" element={<HealthCheckup />} />
          <Route path="immunization" element={<Immunization />} />
          <Route path="epidemiology" element={<Epidemiology />} />
          <Route path="school-health" element={<SchoolHealth />} />
          <Route path="occupational-health" element={<OccupationalHealth />} />
          <Route path="methadone-treatment" element={<MethadoneTreatment />} />
          <Route path="food-safety" element={<FoodSafety />} />
          <Route path="community-health" element={<CommunityHealth />} />
          <Route path="hiv-management" element={<HivManagement />} />
          <Route path="medical-forensics" element={<MedicalForensics />} />
          <Route path="traditional-medicine" element={<TraditionalMedicine />} />
          <Route path="reproductive-health" element={<ReproductiveHealth />} />
          <Route path="mental-health" element={<MentalHealth />} />
          <Route path="environmental-health" element={<EnvironmentalHealth />} />
          <Route path="trauma-registry" element={<TraumaRegistry />} />
          <Route path="population-health" element={<PopulationHealth />} />
          <Route path="health-education" element={<HealthEducation />} />
          <Route path="practice-license" element={<PracticeLicense />} />
          <Route path="inter-hospital" element={<InterHospitalSharing />} />
          <Route path="asset-management" element={<AssetManagement />} />
          <Route path="training-research" element={<TrainingResearch />} />
          {/* Redirect aliases */}
          <Route path="inpatient" element={<Navigate to="/ipd" replace />} />
          <Route path="laboratory" element={<Navigate to="/lab" replace />} />
          <Route path="system-admin" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#0066CC',
          borderRadius: 6,
          ...(isDark
            ? { colorBgContainer: '#1f1f1f' }
            : { colorBgContainer: '#ffffff' }),
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
        },
      }}
    >
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
};

function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
