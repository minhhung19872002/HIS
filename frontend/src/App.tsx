import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useGlobalAbbreviationExpander } from './hooks/useAbbreviationExpander';
import { SigningProvider } from './contexts/SigningContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import './App.css';

// Layout v2 (Terminal) - alternative UI for comparison. Lives under /v2/*
const TerminalLayout = lazy(() => import('./layouts/terminal/TerminalLayout'));
const DashboardV2 = lazy(() => import('./pages-v2/Dashboard'));
const ReceptionV2 = lazy(() => import('./pages-v2/Reception'));
const OPDV2 = lazy(() => import('./pages-v2/OPD'));
const InpatientV2 = lazy(() => import('./pages-v2/Inpatient'));
const PrescriptionV2 = lazy(() => import('./pages-v2/Prescription'));
const PharmacyV2 = lazy(() => import('./pages-v2/Pharmacy'));
const SurgeryV2 = lazy(() => import('./pages-v2/Surgery'));
const BillingV2 = lazy(() => import('./pages-v2/Billing'));
const LaboratoryV2 = lazy(() => import('./pages-v2/Laboratory'));
const RadiologyV2 = lazy(() => import('./pages-v2/Radiology'));
const BloodBankV2 = lazy(() => import('./pages-v2/BloodBank'));
const EMRV2 = lazy(() => import('./pages-v2/EMR'));
const WrapV1 = lazy(() => import('./pages-v2/WrapV1'));

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Dashboard3Cap = lazy(() => import('./pages/Dashboard3Cap'));
const Reception = lazy(() => import('./pages/Reception'));
const OPD = lazy(() => import('./pages/OPD'));
const Inpatient = lazy(() => import('./pages/Inpatient'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const Radiology = lazy(() => import('./pages/Radiology'));
const Billing = lazy(() => import('./pages/Billing'));
const PaymentTransactions = lazy(() => import('./pages/PaymentTransactions'));
const PaymentReports = lazy(() => import('./pages/PaymentReports'));
const PharmacyApproval = lazy(() => import('./pages/PharmacyApproval'));
const DispensingCounter = lazy(() => import('./pages/DispensingCounter'));
const ClinicalPharmacyCheck = lazy(() => import('./pages/ClinicalPharmacyCheck'));
const InpatientDispensing = lazy(() => import('./pages/InpatientDispensing'));
const StockReport = lazy(() => import('./pages/StockReport'));
const ObservationStay = lazy(() => import('./pages/ObservationStay'));
const ServiceRequeue = lazy(() => import('./pages/ServiceRequeue'));
const LisCatalogAdmin = lazy(() => import('./pages/LisCatalogAdmin'));
const PublicStudyViewer = lazy(() => import('./pages/PublicStudyViewer'));
const RisDispatcher = lazy(() => import('./pages/RisDispatcher'));
const RisAdmin = lazy(() => import('./pages/RisAdmin'));
const VideoConsultation = lazy(() => import('./pages/VideoConsultation'));
const NonDicomCapture = lazy(() => import('./pages/NonDicomCapture'));
const MobileHome = lazy(() => import('./pages/MobileHome'));
const CatalogsAdmin = lazy(() => import('./pages/CatalogsAdmin'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
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
const Procurement = lazy(() => import('./pages/Procurement'));

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
  useGlobalAbbreviationExpander();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/queue-display" element={<QueueDisplay />} />
        <Route path="/dat-lich" element={<AppointmentBooking />} />
        <Route path="/shared/:token" element={<PublicStudyViewer />} />
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
          <Route path="dashboard-3cap" element={<Dashboard3Cap />} />
          <Route path="reception" element={<Reception />} />
          <Route path="patients" element={<Navigate to="/reception" replace />} />
          <Route path="opd" element={<OPD />} />
          <Route path="prescription" element={<Prescription />} />
          <Route path="ipd" element={<Inpatient />} />
          <Route path="surgery" element={<Surgery />} />
          <Route path="pharmacy" element={<Pharmacy />} />
          <Route path="pharmacy-approval" element={<PharmacyApproval />} />
          <Route path="dispensing-counter" element={<DispensingCounter />} />
          <Route path="clinical-pharmacy-check" element={<ClinicalPharmacyCheck />} />
          <Route path="inpatient-dispensing" element={<InpatientDispensing />} />
          <Route path="stock-report" element={<StockReport />} />
          <Route path="observation-stay" element={<ObservationStay />} />
          <Route path="service-requeue" element={<ServiceRequeue />} />
          <Route path="lis-catalog-admin" element={<LisCatalogAdmin />} />
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
          <Route path="ris-dispatcher" element={<RisDispatcher />} />
          <Route path="ris-admin" element={<RisAdmin />} />
          <Route path="video-consultation" element={<VideoConsultation />} />
          <Route path="non-dicom-capture" element={<NonDicomCapture />} />
          <Route path="mobile" element={<MobileHome />} />
          <Route path="catalogs-admin" element={<CatalogsAdmin />} />
          <Route path="employee-profile" element={<EmployeeProfile />} />
          <Route path="blood-bank" element={<BloodBank />} />
          <Route path="billing" element={<Billing />} />
          <Route path="payment-transactions" element={<PaymentTransactions />} />
          <Route path="payment-reports" element={<PaymentReports />} />
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
          <Route path="procurement" element={<Procurement />} />
          {/* Redirect aliases */}
          <Route path="inpatient" element={<Navigate to="/ipd" replace />} />
          <Route path="laboratory" element={<Navigate to="/lab" replace />} />
          <Route path="system-admin" element={<Navigate to="/admin" replace />} />
        </Route>
        {/* Layout v2 (Terminal) — alternative UI for A/B comparison. Shares API + auth.
            Hand-ported native pages: Dashboard, Reception, OPD, Inpatient.
            All other routes reuse the v1 page inside the terminal shell via WrapV1 —
            this way every menu item works immediately with full backend wiring. */}
        <Route
          path="/v2"
          element={
            <ProtectedRoute>
              <TerminalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/v2/dashboard" replace />} />
          {/* Primary pages: v1 content rendered inside the v2 terminal shell so users
              get full functionality (all modals, forms, workflows) in the new layout.
              The hand-ported "native v2" variants remain available under /v2-lite/*
              for visual comparison only — they are simplified read-only views. */}
          <Route path="dashboard" element={<WrapV1 element={<Dashboard />} title="Tổng quan" />} />
          <Route path="reception" element={<WrapV1 element={<Reception />} title="Tiếp nhận" />} />
          <Route path="opd" element={<WrapV1 element={<OPD />} title="Khám ngoại trú" />} />
          <Route path="ipd" element={<WrapV1 element={<Inpatient />} title="Nội trú" />} />
          <Route path="prescription" element={<WrapV1 element={<Prescription />} title="Kê đơn" />} />
          <Route path="pharmacy" element={<WrapV1 element={<Pharmacy />} title="Nhà thuốc" />} />
          <Route path="surgery" element={<WrapV1 element={<Surgery />} title="Phẫu thuật" />} />
          <Route path="billing" element={<WrapV1 element={<Billing />} title="Thanh toán" />} />
          <Route path="lab" element={<WrapV1 element={<Laboratory />} title="Xét nghiệm" />} />
          <Route path="radiology" element={<WrapV1 element={<Radiology />} title="Chẩn đoán hình ảnh" />} />
          <Route path="blood-bank" element={<WrapV1 element={<BloodBank />} title="Ngân hàng máu" />} />
          <Route path="emr" element={<WrapV1 element={<EMR />} title="Hồ sơ bệnh án" />} />
          {/* Native-designed Terminal pages available at /v2/lite/* for visual comparison */}
          <Route path="lite/dashboard" element={<DashboardV2 />} />
          <Route path="lite/reception" element={<ReceptionV2 />} />
          <Route path="lite/opd" element={<OPDV2 />} />
          <Route path="lite/ipd" element={<InpatientV2 />} />
          <Route path="lite/prescription" element={<PrescriptionV2 />} />
          <Route path="lite/pharmacy" element={<PharmacyV2 />} />
          <Route path="lite/surgery" element={<SurgeryV2 />} />
          <Route path="lite/billing" element={<BillingV2 />} />
          <Route path="lite/lab" element={<LaboratoryV2 />} />
          <Route path="lite/radiology" element={<RadiologyV2 />} />
          <Route path="lite/blood-bank" element={<BloodBankV2 />} />
          <Route path="lite/emr" element={<EMRV2 />} />
          {/* Remaining pages: v1 content inside v2 shell */}
          <Route path="dashboard-3cap" element={<WrapV1 element={<Dashboard3Cap />} title="Dashboard 3 Cấp" />} />
          <Route path="medical-supply" element={<WrapV1 element={<MedicalSupply />} title="Vật tư y tế" />} />
          {/* The 8 pages above (prescription, pharmacy, surgery, billing, lab, radiology, blood-bank, emr)
              are handled natively earlier — keep WrapV1 lines only for the rest. */}
          <Route path="follow-up" element={<WrapV1 element={<FollowUp />} title="Tái khám" />} />
          <Route path="booking-management" element={<WrapV1 element={<BookingManagement />} title="Quản lý đặt lịch" />} />
          <Route path="sms-management" element={<WrapV1 element={<SmsManagement />} title="SMS" />} />
          <Route path="lab-qc" element={<WrapV1 element={<LabQC />} title="Lab QC" />} />
          <Route path="microbiology" element={<WrapV1 element={<Microbiology />} title="Vi sinh" />} />
          <Route path="culture-collection" element={<WrapV1 element={<CultureCollection />} title="Lưu chủng" />} />
          <Route path="sample-storage" element={<WrapV1 element={<SampleStorage />} title="Lưu mẫu" />} />
          <Route path="screening" element={<WrapV1 element={<Screening />} title="Sàng lọc" />} />
          <Route path="reagent-management" element={<WrapV1 element={<ReagentManagement />} title="Hoá chất" />} />
          <Route path="sample-tracking" element={<WrapV1 element={<SampleTracking />} title="Theo dõi mẫu" />} />
          <Route path="pathology" element={<WrapV1 element={<Pathology />} title="Giải phẫu bệnh" />} />
          <Route path="ivf-lab" element={<WrapV1 element={<IvfLab />} title="IVF" />} />
          <Route path="finance" element={<WrapV1 element={<Finance />} title="Tài chính" />} />
          <Route path="insurance" element={<WrapV1 element={<Insurance />} title="Bảo hiểm" />} />
          <Route path="master-data" element={<WrapV1 element={<MasterData />} title="Danh mục" />} />
          <Route path="reports" element={<WrapV1 element={<Reports />} title="Báo cáo" />} />
          <Route path="admin" element={<WrapV1 element={<SystemAdmin />} title="Quản trị" />} />
          <Route path="digital-signature" element={<WrapV1 element={<DigitalSignature />} title="Ký số" />} />
          <Route path="central-signing" element={<WrapV1 element={<CentralSigning />} title="Ký số tập trung" />} />
          <Route path="settings" element={<Navigate to="/v2/admin" replace />} />
          <Route path="telemedicine" element={<WrapV1 element={<Telemedicine />} title="Telemedicine" />} />
          <Route path="nutrition" element={<WrapV1 element={<Nutrition />} title="Dinh dưỡng" />} />
          <Route path="infection-control" element={<WrapV1 element={<InfectionControl />} title="Kiểm soát nhiễm khuẩn" />} />
          <Route path="rehabilitation" element={<WrapV1 element={<Rehabilitation />} title="Phục hồi chức năng" />} />
          <Route path="equipment" element={<WrapV1 element={<Equipment />} title="Trang thiết bị" />} />
          <Route path="hr" element={<WrapV1 element={<HR />} title="Nhân sự" />} />
          <Route path="quality" element={<WrapV1 element={<Quality />} title="Chất lượng" />} />
          <Route path="patient-portal" element={<WrapV1 element={<PatientPortal />} title="Cổng BN" />} />
          <Route path="health-exchange" element={<WrapV1 element={<HealthExchange />} title="HIE" />} />
          <Route path="emergency-disaster" element={<WrapV1 element={<EmergencyDisaster />} title="Cấp cứu / Thảm hoạ" />} />
          <Route path="consultation" element={<WrapV1 element={<Consultation />} title="Hội chẩn" />} />
          <Route path="help" element={<WrapV1 element={<Help />} title="Trợ giúp" />} />
          <Route path="radiology/viewer" element={<WrapV1 element={<DicomViewer />} title="DICOM Viewer" />} />
          <Route path="medical-record-archive" element={<WrapV1 element={<MedicalRecordArchive />} title="Lưu trữ hồ sơ" />} />
          <Route path="bhxh-audit" element={<WrapV1 element={<BhxhAudit />} title="BHXH Audit" />} />
          <Route path="doctor-portal" element={<WrapV1 element={<DoctorPortal />} title="Cổng BS" />} />
          <Route path="satisfaction-survey" element={<WrapV1 element={<SatisfactionSurvey />} title="Khảo sát" />} />
          <Route path="lis-config" element={<WrapV1 element={<LISConfig />} title="LIS Config" />} />
          <Route path="specialty-emr" element={<WrapV1 element={<SpecialtyEMR />} title="BA Chuyên khoa" />} />
          <Route path="signing-workflow" element={<WrapV1 element={<SigningWorkflow />} title="Quy trình ký" />} />
          <Route path="medical-record-planning" element={<WrapV1 element={<MedicalRecordPlanning />} title="Lập kế hoạch BA" />} />
          <Route path="endpoint-security" element={<WrapV1 element={<EndpointSecurity />} title="Bảo mật endpoint" />} />
          <Route path="treatment-protocols" element={<WrapV1 element={<TreatmentProtocol />} title="Phác đồ" />} />
          <Route path="chronic-disease" element={<WrapV1 element={<ChronicDisease />} title="Bệnh mạn tính" />} />
          <Route path="hospital-pharmacy" element={<WrapV1 element={<HospitalPharmacy />} title="Nhà thuốc BV" />} />
          <Route path="clinical-guidance" element={<WrapV1 element={<ClinicalGuidance />} title="Hướng dẫn lâm sàng" />} />
          <Route path="tb-hiv" element={<WrapV1 element={<TbHivManagement />} title="Lao/HIV" />} />
          <Route path="health-checkup" element={<WrapV1 element={<HealthCheckup />} title="Khám sức khoẻ" />} />
          <Route path="immunization" element={<WrapV1 element={<Immunization />} title="Tiêm chủng" />} />
          <Route path="epidemiology" element={<WrapV1 element={<Epidemiology />} title="Dịch tễ" />} />
          <Route path="school-health" element={<WrapV1 element={<SchoolHealth />} title="Y tế học đường" />} />
          <Route path="occupational-health" element={<WrapV1 element={<OccupationalHealth />} title="Y học lao động" />} />
          <Route path="methadone-treatment" element={<WrapV1 element={<MethadoneTreatment />} title="Methadone" />} />
          <Route path="food-safety" element={<WrapV1 element={<FoodSafety />} title="An toàn thực phẩm" />} />
          <Route path="community-health" element={<WrapV1 element={<CommunityHealth />} title="Y tế cộng đồng" />} />
          <Route path="hiv-management" element={<WrapV1 element={<HivManagement />} title="Quản lý HIV" />} />
          <Route path="medical-forensics" element={<WrapV1 element={<MedicalForensics />} title="Giám định" />} />
          <Route path="traditional-medicine" element={<WrapV1 element={<TraditionalMedicine />} title="YHCT" />} />
          <Route path="reproductive-health" element={<WrapV1 element={<ReproductiveHealth />} title="SK Sinh sản" />} />
          <Route path="mental-health" element={<WrapV1 element={<MentalHealth />} title="Tâm thần" />} />
          <Route path="environmental-health" element={<WrapV1 element={<EnvironmentalHealth />} title="SK Môi trường" />} />
          <Route path="trauma-registry" element={<WrapV1 element={<TraumaRegistry />} title="Chấn thương" />} />
          <Route path="population-health" element={<WrapV1 element={<PopulationHealth />} title="SK Dân số" />} />
          <Route path="health-education" element={<WrapV1 element={<HealthEducation />} title="Giáo dục SK" />} />
          <Route path="practice-license" element={<WrapV1 element={<PracticeLicense />} title="Hành nghề" />} />
          <Route path="inter-hospital" element={<WrapV1 element={<InterHospitalSharing />} title="Chia sẻ liên viện" />} />
          <Route path="asset-management" element={<WrapV1 element={<AssetManagement />} title="Tài sản" />} />
          <Route path="training-research" element={<WrapV1 element={<TrainingResearch />} title="Đào tạo & NCKH" />} />
          <Route path="procurement" element={<WrapV1 element={<Procurement />} title="Mua sắm" />} />
          <Route path="*" element={<Navigate to="/v2/dashboard" replace />} />
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
          colorPrimary: '#1677ff',
          borderRadius: 10,
          borderRadiusLG: 12,
          borderRadiusSM: 8,
          colorBgLayout: '#f0f2f5',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 14,
          colorText: '#1f2937',
          colorTextSecondary: '#6b7280',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',
          controlHeight: 36,
          ...(isDark
            ? { colorBgContainer: '#1f1f1f' }
            : { colorBgContainer: '#ffffff' }),
        },
        components: {
          Card: {
            borderRadiusLG: 12,
            boxShadowTertiary: '0 1px 4px rgba(0,0,0,0.06)',
          },
          Button: {
            borderRadius: 8,
            borderRadiusLG: 10,
            borderRadiusSM: 6,
            fontWeight: 500,
            primaryShadow: '0 2px 6px rgba(22,119,255,0.25)',
          },
          Table: {
            headerBg: '#f8f9fc',
            headerColor: '#4a5568',
            headerSplitColor: '#e2e8f0',
            rowHoverBg: '#f0f7ff',
            headerBorderRadius: 10,
            cellFontSize: 13,
          },
          Tag: {
            borderRadiusSM: 6,
            defaultBg: '#f3f4f6',
          },
          Input: {
            borderRadius: 8,
            borderRadiusLG: 10,
          },
          Select: {
            borderRadius: 8,
            borderRadiusLG: 10,
          },
          DatePicker: {
            borderRadius: 8,
          },
          Modal: {
            borderRadiusLG: 16,
            titleFontSize: 16,
          },
          Tabs: {
            inkBarColor: '#1677ff',
            itemSelectedColor: '#1677ff',
            titleFontSize: 14,
          },
          Alert: {
            borderRadiusLG: 10,
          },
          Descriptions: {
            labelBg: '#f8f9fc',
          },
          Statistic: {
            titleFontSize: 13,
            contentFontSize: 28,
          },
          Progress: {
            lineBorderRadius: 6,
          },
          Drawer: {
            borderRadiusLG: 16,
          },
          Form: {
            labelFontSize: 13,
          },
          Notification: {
            borderRadiusLG: 12,
          },
          Message: {
            borderRadiusLG: 10,
          },
        },
      }}
    >
      <AntdApp>
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
      </AntdApp>
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
