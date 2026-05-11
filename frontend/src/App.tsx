import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
const ModuleIndex = lazy(() => import('./pages-v2/ModuleIndex'));
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
const ConsultationV2 = lazy(() => import('./pages-v2/Consultation'));
const FollowUpV2 = lazy(() => import('./pages-v2/FollowUp'));
const PathologyV2 = lazy(() => import('./pages-v2/Pathology'));
const InsuranceV2 = lazy(() => import('./pages-v2/Insurance'));
const ReportsV2 = lazy(() => import('./pages-v2/Reports'));
const MasterDataV2 = lazy(() => import('./pages-v2/MasterData'));
const EmergencyDisasterV2 = lazy(() => import('./pages-v2/EmergencyDisaster'));
const HRV2 = lazy(() => import('./pages-v2/HR'));
const SystemAdminV2 = lazy(() => import('./pages-v2/SystemAdmin'));
const QualityV2 = lazy(() => import('./pages-v2/Quality'));
const EquipmentV2 = lazy(() => import('./pages-v2/Equipment'));
const ChronicDiseaseV2 = lazy(() => import('./pages-v2/ChronicDisease'));
const HivManagementV2 = lazy(() => import('./pages-v2/HivManagement'));
const TbHivManagementV2 = lazy(() => import('./pages-v2/TbHivManagement'));
const MentalHealthV2 = lazy(() => import('./pages-v2/MentalHealth'));
const TelemedicineV2 = lazy(() => import('./pages-v2/Telemedicine'));
const SmsManagementV2 = lazy(() => import('./pages-v2/SmsManagement'));
const SigningWorkflowV2 = lazy(() => import('./pages-v2/SigningWorkflow'));
const PatientPortalV2 = lazy(() => import('./pages-v2/PatientPortal'));
const DoctorPortalV2 = lazy(() => import('./pages-v2/DoctorPortal'));
const HospitalPharmacyV2 = lazy(() => import('./pages-v2/HospitalPharmacy'));
const ProcurementV2 = lazy(() => import('./pages-v2/Procurement'));
const MedicalSupplyV2 = lazy(() => import('./pages-v2/MedicalSupply'));
const TraumaRegistryV2 = lazy(() => import('./pages-v2/TraumaRegistry'));
const HealthEducationV2 = lazy(() => import('./pages-v2/HealthEducation'));
const PopulationHealthV2 = lazy(() => import('./pages-v2/PopulationHealth'));
const EnvironmentalHealthV2 = lazy(() => import('./pages-v2/EnvironmentalHealth'));
const PracticeLicenseV2 = lazy(() => import('./pages-v2/PracticeLicense'));
const MicrobiologyV2 = lazy(() => import('./pages-v2/Microbiology'));
const ReproductiveHealthV2 = lazy(() => import('./pages-v2/ReproductiveHealth'));
const LabQCV2 = lazy(() => import('./pages-v2/LabQC'));
const ScreeningV2 = lazy(() => import('./pages-v2/Screening'));
const TraditionalMedicineV2 = lazy(() => import('./pages-v2/TraditionalMedicine'));
const EndpointSecurityV2 = lazy(() => import('./pages-v2/EndpointSecurity'));
const ReagentManagementV2 = lazy(() => import('./pages-v2/ReagentManagement'));
const SampleStorageV2 = lazy(() => import('./pages-v2/SampleStorage'));
const SampleTrackingV2 = lazy(() => import('./pages-v2/SampleTracking'));
const InterHospitalSharingV2 = lazy(() => import('./pages-v2/InterHospitalSharing'));
const ClinicalGuidanceV2 = lazy(() => import('./pages-v2/ClinicalGuidance'));
const MedicalForensicsV2 = lazy(() => import('./pages-v2/MedicalForensics'));
const OccupationalHealthV2 = lazy(() => import('./pages-v2/OccupationalHealth'));
const MethadoneTreatmentV2 = lazy(() => import('./pages-v2/MethadoneTreatment'));
const ImmunizationV2 = lazy(() => import('./pages-v2/Immunization'));
const AssetManagementV2 = lazy(() => import('./pages-v2/AssetManagement'));
const BookingManagementV2 = lazy(() => import('./pages-v2/BookingManagement'));
const CommunityHealthV2 = lazy(() => import('./pages-v2/CommunityHealth'));
const CultureCollectionV2 = lazy(() => import('./pages-v2/CultureCollection'));
const EpidemiologyV2 = lazy(() => import('./pages-v2/Epidemiology'));
const FoodSafetyV2 = lazy(() => import('./pages-v2/FoodSafety'));
const HealthCheckupV2 = lazy(() => import('./pages-v2/HealthCheckup'));
const InfectionControlV2 = lazy(() => import('./pages-v2/InfectionControl'));
const IvfLabV2 = lazy(() => import('./pages-v2/IvfLab'));
const LISConfigV2 = lazy(() => import('./pages-v2/LISConfig'));
const MedicalRecordPlanningV2 = lazy(() => import('./pages-v2/MedicalRecordPlanning'));
const NutritionV2 = lazy(() => import('./pages-v2/Nutrition'));
const RehabilitationV2 = lazy(() => import('./pages-v2/Rehabilitation'));
const SchoolHealthV2 = lazy(() => import('./pages-v2/SchoolHealth'));
const TrainingResearchV2 = lazy(() => import('./pages-v2/TrainingResearch'));
const TreatmentProtocolV2 = lazy(() => import('./pages-v2/TreatmentProtocol'));
// Phase B v2 redesigns (ab-* design pack)
const FinanceV2 = lazy(() => import('./pages-v2/Finance'));
const HealthExchangeV2 = lazy(() => import('./pages-v2/HealthExchange'));
const MedicalRecordArchiveV2 = lazy(() => import('./pages-v2/MedicalRecordArchive'));
const BhxhAuditV2 = lazy(() => import('./pages-v2/BhxhAudit'));
const SatisfactionSurveyV2 = lazy(() => import('./pages-v2/SatisfactionSurvey'));
const SpecialtyEMRV2 = lazy(() => import('./pages-v2/SpecialtyEMR'));
// Final 5 v2 native pages
const HelpV2 = lazy(() => import('./pages-v2/Help'));
const Dashboard3CapV2 = lazy(() => import('./pages-v2/Dashboard3Cap'));
const DigitalSignatureV2 = lazy(() => import('./pages-v2/DigitalSignature'));
const CentralSigningV2 = lazy(() => import('./pages-v2/CentralSigning'));
const DicomViewerV2 = lazy(() => import('./pages-v2/DicomViewer'));
// Batch 7: Pharmacy/Stock admin (v1-only routes converted to v2)
const PharmacyApprovalV2 = lazy(() => import('./pages-v2/PharmacyApproval'));
const DispensingCounterV2 = lazy(() => import('./pages-v2/DispensingCounter'));
const ClinicalPharmacyCheckV2 = lazy(() => import('./pages-v2/ClinicalPharmacyCheck'));
const InpatientDispensingV2 = lazy(() => import('./pages-v2/InpatientDispensing'));
const StockReportV2 = lazy(() => import('./pages-v2/StockReport'));
const OfficeSupplyApprovalV2 = lazy(() => import('./pages-v2/OfficeSupplyApproval'));
// Batch 8: Workflow + Finance
const ReceiptBookAdminV2 = lazy(() => import('./pages-v2/ReceiptBookAdmin'));
const ObservationStayV2 = lazy(() => import('./pages-v2/ObservationStay'));
const ServiceRequeueV2 = lazy(() => import('./pages-v2/ServiceRequeue'));
const BhxhConfigV2 = lazy(() => import('./pages-v2/BhxhConfig'));
const PaymentReportsV2 = lazy(() => import('./pages-v2/PaymentReports'));
const PaymentTransactionsV2 = lazy(() => import('./pages-v2/PaymentTransactions'));
// Batch 9: LIS/RIS admin
const LisCatalogAdminV2 = lazy(() => import('./pages-v2/LisCatalogAdmin'));
const RisCatalogAdminV2 = lazy(() => import('./pages-v2/RisCatalogAdmin'));
const SampleReceiveV2 = lazy(() => import('./pages-v2/SampleReceive'));
const RadiologyOpsV2 = lazy(() => import('./pages-v2/RadiologyOps'));
const RisDispatcherV2 = lazy(() => import('./pages-v2/RisDispatcher'));
const RisAdminV2 = lazy(() => import('./pages-v2/RisAdmin'));
// Batch 10: System + Misc
const ConsultationRegisterV2 = lazy(() => import('./pages-v2/ConsultationRegister'));
const WorkloadReportV2 = lazy(() => import('./pages-v2/WorkloadReport'));
const CatalogsAdminV2 = lazy(() => import('./pages-v2/CatalogsAdmin'));
const EmployeeProfileV2 = lazy(() => import('./pages-v2/EmployeeProfile'));
const NonDicomCaptureV2 = lazy(() => import('./pages-v2/NonDicomCapture'));
const VideoConsultationV2 = lazy(() => import('./pages-v2/VideoConsultation'));
// NangCap22 master catalogs
const PharmacyCatalogsV2 = lazy(() => import('./pages-v2/PharmacyCatalogs'));
const FinanceCatalogsV2 = lazy(() => import('./pages-v2/FinanceCatalogs'));
const ParaclinicalCatalogsV2 = lazy(() => import('./pages-v2/ParaclinicalCatalogs'));
const ClinicalCatalogsV2 = lazy(() => import('./pages-v2/ClinicalCatalogs'));
const ReportCatalogsV2 = lazy(() => import('./pages-v2/ReportCatalogs'));

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
const RisCatalogAdmin = lazy(() => import('./pages/RisCatalogAdmin'));
const OfficeSupplyApproval = lazy(() => import('./pages/OfficeSupplyApproval'));
const ReceiptBookAdmin = lazy(() => import('./pages/ReceiptBookAdmin'));
const RadiologyOps = lazy(() => import('./pages/RadiologyOps'));
const SampleReceive = lazy(() => import('./pages/SampleReceive'));
const BhxhConfig = lazy(() => import('./pages/BhxhConfig'));
const ConsultationRegister = lazy(() => import('./pages/ConsultationRegister'));
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
const PharmacyCatalogs = lazy(() => import('./pages/PharmacyCatalogs'));
const FinanceCatalogs = lazy(() => import('./pages/FinanceCatalogs'));
const ParaclinicalCatalogs = lazy(() => import('./pages/ParaclinicalCatalogs'));
const ClinicalCatalogs = lazy(() => import('./pages/ClinicalCatalogs'));
const ReportCatalogs = lazy(() => import('./pages/ReportCatalogs'));
const Reports = lazy(() => import('./pages/Reports'));
const WorkloadReport = lazy(() => import('./pages/WorkloadReport'));
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
          <Route path="ris-catalog-admin" element={<RisCatalogAdmin />} />
          <Route path="office-supply-approval" element={<OfficeSupplyApproval />} />
          <Route path="receipt-book-admin" element={<ReceiptBookAdmin />} />
          <Route path="radiology-ops" element={<RadiologyOps />} />
          <Route path="sample-receive" element={<SampleReceive />} />
          <Route path="bhxh-config" element={<BhxhConfig />} />
          <Route path="consultation-register" element={<ConsultationRegister />} />
          <Route path="workload-report" element={<WorkloadReport />} />
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
          <Route path="pharmacy-catalogs" element={<PharmacyCatalogs />} />
          <Route path="finance-catalogs" element={<FinanceCatalogs />} />
          <Route path="paraclinical-catalogs" element={<ParaclinicalCatalogs />} />
          <Route path="clinical-catalogs" element={<ClinicalCatalogs />} />
          <Route path="report-catalogs" element={<ReportCatalogs />} />
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
            /v2 itself is a standalone 16-module cover page (ModuleIndex) with no chrome.
            /v2/* routes render inside TerminalLayout — the nested pathless route is what
            gives ModuleIndex a bare page while keeping every child wrapped in the shell. */}
        <Route
          path="/v2"
          element={
            <ProtectedRoute>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<ModuleIndex />} />
          <Route element={<TerminalLayout />}>
          {/* Primary pages: v1 content rendered inside the v2 terminal shell so users
              get full functionality (all modals, forms, workflows) in the new layout.
              The hand-ported "native v2" variants remain available under /v2-lite/*
              for visual comparison only — they are simplified read-only views. */}
          <Route path="dashboard" element={<DashboardV2 />} />
          <Route path="reception" element={<ReceptionV2 />} />
          <Route path="opd" element={<OPDV2 />} />
          <Route path="ipd" element={<InpatientV2 />} />
          <Route path="prescription" element={<PrescriptionV2 />} />
          <Route path="pharmacy" element={<PharmacyV2 />} />
          <Route path="surgery" element={<SurgeryV2 />} />
          <Route path="billing" element={<BillingV2 />} />
          <Route path="lab" element={<LaboratoryV2 />} />
          <Route path="radiology" element={<RadiologyV2 />} />
          <Route path="blood-bank" element={<BloodBankV2 />} />
          <Route path="emr" element={<EMRV2 />} />
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
          {/* All v2 routes are native bespoke ab-* design — no v1 fallback. */}
          <Route path="dashboard-3cap" element={<Dashboard3CapV2 />} />
          <Route path="medical-supply" element={<MedicalSupplyV2 />} />
          <Route path="follow-up" element={<FollowUpV2 />} />
          <Route path="booking-management" element={<BookingManagementV2 />} />
          <Route path="sms-management" element={<SmsManagementV2 />} />
          <Route path="lab-qc" element={<LabQCV2 />} />
          <Route path="microbiology" element={<MicrobiologyV2 />} />
          <Route path="culture-collection" element={<CultureCollectionV2 />} />
          <Route path="sample-storage" element={<SampleStorageV2 />} />
          <Route path="screening" element={<ScreeningV2 />} />
          <Route path="reagent-management" element={<ReagentManagementV2 />} />
          <Route path="sample-tracking" element={<SampleTrackingV2 />} />
          <Route path="pathology" element={<PathologyV2 />} />
          <Route path="ivf-lab" element={<IvfLabV2 />} />
          <Route path="finance" element={<FinanceV2 />} />
          <Route path="insurance" element={<InsuranceV2 />} />
          <Route path="master-data" element={<MasterDataV2 />} />
          <Route path="reports" element={<ReportsV2 />} />
          <Route path="admin" element={<SystemAdminV2 />} />
          <Route path="digital-signature" element={<DigitalSignatureV2 />} />
          <Route path="central-signing" element={<CentralSigningV2 />} />
          <Route path="settings" element={<Navigate to="/v2/admin" replace />} />
          <Route path="telemedicine" element={<TelemedicineV2 />} />
          <Route path="nutrition" element={<NutritionV2 />} />
          <Route path="infection-control" element={<InfectionControlV2 />} />
          <Route path="rehabilitation" element={<RehabilitationV2 />} />
          <Route path="equipment" element={<EquipmentV2 />} />
          <Route path="hr" element={<HRV2 />} />
          <Route path="quality" element={<QualityV2 />} />
          <Route path="patient-portal" element={<PatientPortalV2 />} />
          <Route path="health-exchange" element={<HealthExchangeV2 />} />
          <Route path="emergency-disaster" element={<EmergencyDisasterV2 />} />
          <Route path="consultation" element={<ConsultationV2 />} />
          <Route path="help" element={<HelpV2 />} />
          <Route path="radiology/viewer" element={<DicomViewerV2 />} />
          <Route path="medical-record-archive" element={<MedicalRecordArchiveV2 />} />
          <Route path="bhxh-audit" element={<BhxhAuditV2 />} />
          <Route path="doctor-portal" element={<DoctorPortalV2 />} />
          <Route path="satisfaction-survey" element={<SatisfactionSurveyV2 />} />
          <Route path="lis-config" element={<LISConfigV2 />} />
          <Route path="specialty-emr" element={<SpecialtyEMRV2 />} />
          <Route path="signing-workflow" element={<SigningWorkflowV2 />} />
          <Route path="medical-record-planning" element={<MedicalRecordPlanningV2 />} />
          <Route path="endpoint-security" element={<EndpointSecurityV2 />} />
          <Route path="treatment-protocols" element={<TreatmentProtocolV2 />} />
          <Route path="chronic-disease" element={<ChronicDiseaseV2 />} />
          <Route path="hospital-pharmacy" element={<HospitalPharmacyV2 />} />
          <Route path="clinical-guidance" element={<ClinicalGuidanceV2 />} />
          <Route path="tb-hiv" element={<TbHivManagementV2 />} />
          <Route path="health-checkup" element={<HealthCheckupV2 />} />
          <Route path="immunization" element={<ImmunizationV2 />} />
          <Route path="epidemiology" element={<EpidemiologyV2 />} />
          <Route path="school-health" element={<SchoolHealthV2 />} />
          <Route path="occupational-health" element={<OccupationalHealthV2 />} />
          <Route path="methadone-treatment" element={<MethadoneTreatmentV2 />} />
          <Route path="food-safety" element={<FoodSafetyV2 />} />
          <Route path="community-health" element={<CommunityHealthV2 />} />
          <Route path="hiv-management" element={<HivManagementV2 />} />
          <Route path="medical-forensics" element={<MedicalForensicsV2 />} />
          <Route path="traditional-medicine" element={<TraditionalMedicineV2 />} />
          <Route path="reproductive-health" element={<ReproductiveHealthV2 />} />
          <Route path="mental-health" element={<MentalHealthV2 />} />
          <Route path="environmental-health" element={<EnvironmentalHealthV2 />} />
          <Route path="trauma-registry" element={<TraumaRegistryV2 />} />
          <Route path="population-health" element={<PopulationHealthV2 />} />
          <Route path="health-education" element={<HealthEducationV2 />} />
          <Route path="practice-license" element={<PracticeLicenseV2 />} />
          <Route path="inter-hospital" element={<InterHospitalSharingV2 />} />
          <Route path="asset-management" element={<AssetManagementV2 />} />
          <Route path="training-research" element={<TrainingResearchV2 />} />
          <Route path="procurement" element={<ProcurementV2 />} />
          {/* Batch 7: Pharmacy/Stock admin */}
          <Route path="pharmacy-approval" element={<PharmacyApprovalV2 />} />
          <Route path="dispensing-counter" element={<DispensingCounterV2 />} />
          <Route path="clinical-pharmacy-check" element={<ClinicalPharmacyCheckV2 />} />
          <Route path="inpatient-dispensing" element={<InpatientDispensingV2 />} />
          <Route path="stock-report" element={<StockReportV2 />} />
          <Route path="office-supply-approval" element={<OfficeSupplyApprovalV2 />} />
          {/* Batch 8: Workflow + Finance */}
          <Route path="receipt-book-admin" element={<ReceiptBookAdminV2 />} />
          <Route path="observation-stay" element={<ObservationStayV2 />} />
          <Route path="service-requeue" element={<ServiceRequeueV2 />} />
          <Route path="bhxh-config" element={<BhxhConfigV2 />} />
          <Route path="payment-reports" element={<PaymentReportsV2 />} />
          <Route path="payment-transactions" element={<PaymentTransactionsV2 />} />
          {/* Batch 9: LIS/RIS admin */}
          <Route path="lis-catalog-admin" element={<LisCatalogAdminV2 />} />
          <Route path="ris-catalog-admin" element={<RisCatalogAdminV2 />} />
          <Route path="sample-receive" element={<SampleReceiveV2 />} />
          <Route path="radiology-ops" element={<RadiologyOpsV2 />} />
          <Route path="ris-dispatcher" element={<RisDispatcherV2 />} />
          <Route path="ris-admin" element={<RisAdminV2 />} />
          {/* Batch 10: System + Misc */}
          <Route path="consultation-register" element={<ConsultationRegisterV2 />} />
          <Route path="workload-report" element={<WorkloadReportV2 />} />
          <Route path="catalogs-admin" element={<CatalogsAdminV2 />} />
          <Route path="employee-profile" element={<EmployeeProfileV2 />} />
          <Route path="non-dicom-capture" element={<NonDicomCaptureV2 />} />
          <Route path="video-consultation" element={<VideoConsultationV2 />} />
          {/* NangCap22 master catalogs */}
          <Route path="pharmacy-catalogs" element={<PharmacyCatalogsV2 />} />
          <Route path="finance-catalogs" element={<FinanceCatalogsV2 />} />
          <Route path="paraclinical-catalogs" element={<ParaclinicalCatalogsV2 />} />
          <Route path="clinical-catalogs" element={<ClinicalCatalogsV2 />} />
          <Route path="report-catalogs" element={<ReportCatalogsV2 />} />
          <Route path="*" element={<Navigate to="/v2/dashboard" replace />} />
          </Route>
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
