import { lazy } from 'react';

// Domain: clinical (menu groups: clinical, support, public-health).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

// --- clinical group ---
export const ReceptionV2 = lazy(() => import('../../pages-v2/Reception'));
export const OPDV2 = lazy(() => import('../../pages-v2/OPD'));
export const OpdEditorV2 = lazy(() => import('../../pages-v2/OpdEditor'));
export const InpatientV2 = lazy(() => import('../../pages-v2/Inpatient'));
export const PrescriptionV2 = lazy(() => import('../../pages-v2/Prescription'));
export const PrescriptionEditorV2 = lazy(() => import('../../pages-v2/PrescriptionEditor'));
export const SurgeryV2 = lazy(() => import('../../pages-v2/Surgery'));
export const EMRV2 = lazy(() => import('../../pages-v2/EMR'));
export const EmrEditorV2 = lazy(() => import('../../pages-v2/EmrEditor'));
export const EmrExtractV2 = lazy(() => import('../../pages-v2/EmrExtract'));
export const EmrDataTagsV2 = lazy(() => import('../../pages-v2/EmrDataTags'));
export const TelemedicineV2 = lazy(() => import('../../pages-v2/Telemedicine'));
export const FollowUpV2 = lazy(() => import('../../pages-v2/FollowUp'));
export const BookingManagementV2 = lazy(() => import('../../pages-v2/BookingManagement'));
export const TreatmentProtocolV2 = lazy(() => import('../../pages-v2/TreatmentProtocol'));
export const ChronicDiseaseV2 = lazy(() => import('../../pages-v2/ChronicDisease'));
export const TbHivManagementV2 = lazy(() => import('../../pages-v2/TbHivManagement'));
export const ConsultationV2 = lazy(() => import('../../pages-v2/Consultation'));
export const ClinicalCatalogsV2 = lazy(() => import('../../pages-v2/ClinicalCatalogs'));
export const SpecialtyEMRV2 = lazy(() => import('../../pages-v2/SpecialtyEMR'));
export const MedicalRecordArchiveV2 = lazy(() => import('../../pages-v2/MedicalRecordArchive'));
export const MedicalRecordPlanningV2 = lazy(() => import('../../pages-v2/MedicalRecordPlanning'));
export const EmergencyDisasterV2 = lazy(() => import('../../pages-v2/EmergencyDisaster'));
export const ConsultationRegisterV2 = lazy(() => import('../../pages-v2/ConsultationRegister'));
export const ObservationStayV2 = lazy(() => import('../../pages-v2/ObservationStay'));
export const ServiceRequeueV2 = lazy(() => import('../../pages-v2/ServiceRequeue'));
export const VideoConsultationV2 = lazy(() => import('../../pages-v2/VideoConsultation'));

// --- support group ---
export const PharmacyV2 = lazy(() => import('../../pages-v2/Pharmacy'));
export const HospitalPharmacyV2 = lazy(() => import('../../pages-v2/HospitalPharmacy'));
export const PharmacyStockInV2 = lazy(() => import('../../pages-v2/PharmacyStockIn'));
export const PharmacyStockIssueV2 = lazy(() => import('../../pages-v2/PharmacyStockIssue'));
export const PharmacyApprovalV2 = lazy(() => import('../../pages-v2/PharmacyApproval'));
export const PharmacyStockTakeV2 = lazy(() => import('../../pages-v2/PharmacyStockTake'));
export const MedicalSupplyV2 = lazy(() => import('../../pages-v2/MedicalSupply'));
export const NutritionV2 = lazy(() => import('../../pages-v2/Nutrition'));
export const RehabilitationV2 = lazy(() => import('../../pages-v2/Rehabilitation'));
export const TraditionalMedicineV2 = lazy(() => import('../../pages-v2/TraditionalMedicine'));
export const PharmacyCatalogsV2 = lazy(() => import('../../pages-v2/PharmacyCatalogs'));
export const DispensingCounterV2 = lazy(() => import('../../pages-v2/DispensingCounter'));
export const ClinicalPharmacyCheckV2 = lazy(() => import('../../pages-v2/ClinicalPharmacyCheck'));
export const InpatientDispensingV2 = lazy(() => import('../../pages-v2/InpatientDispensing'));
export const StockReportV2 = lazy(() => import('../../pages-v2/StockReport'));
export const OfficeSupplyApprovalV2 = lazy(() => import('../../pages-v2/OfficeSupplyApproval'));

// --- public-health group ---
export const HealthCheckupV2 = lazy(() => import('../../pages-v2/HealthCheckup'));
export const ImmunizationV2 = lazy(() => import('../../pages-v2/Immunization'));
export const EpidemiologyV2 = lazy(() => import('../../pages-v2/Epidemiology'));
export const SchoolHealthV2 = lazy(() => import('../../pages-v2/SchoolHealth'));
export const OccupationalHealthV2 = lazy(() => import('../../pages-v2/OccupationalHealth'));
export const MethadoneTreatmentV2 = lazy(() => import('../../pages-v2/MethadoneTreatment'));
export const FoodSafetyV2 = lazy(() => import('../../pages-v2/FoodSafety'));
export const CommunityHealthV2 = lazy(() => import('../../pages-v2/CommunityHealth'));
export const HivManagementV2 = lazy(() => import('../../pages-v2/HivManagement'));
export const HealthEducationV2 = lazy(() => import('../../pages-v2/HealthEducation'));
export const EnvironmentalHealthV2 = lazy(() => import('../../pages-v2/EnvironmentalHealth'));
export const PopulationHealthV2 = lazy(() => import('../../pages-v2/PopulationHealth'));
export const ReproductiveHealthV2 = lazy(() => import('../../pages-v2/ReproductiveHealth'));
export const MentalHealthV2 = lazy(() => import('../../pages-v2/MentalHealth'));
export const TraumaRegistryV2 = lazy(() => import('../../pages-v2/TraumaRegistry'));
export const MedicalForensicsV2 = lazy(() => import('../../pages-v2/MedicalForensics'));
