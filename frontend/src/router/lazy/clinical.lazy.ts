import { lazy } from 'react';

// Domain: clinical (menu groups: clinical, support, public-health).
// v2 lazy page components — grouped by domain for the routeConfigs consumer.

// --- clinical group ---
export const ReceptionV2 = lazy(() => import('../../modules/reception/pages/Reception'));
export const OPDV2 = lazy(() => import('../../modules/reception/pages/OPD'));
export const OpdEditorV2 = lazy(() => import('../../modules/opd/pages/OpdEditor'));
export const InpatientV2 = lazy(() => import('../../modules/inpatient/pages/Inpatient'));
export const PrescriptionV2 = lazy(() => import('../../modules/portal/pages/Prescription'));
export const PrescriptionEditorV2 = lazy(() => import('../../modules/opd/pages/PrescriptionEditor'));
export const SurgeryV2 = lazy(() => import('../../modules/surgery/pages/Surgery'));
export const EMRV2 = lazy(() => import('../../modules/opd/pages/EMR'));
export const EmrEditorV2 = lazy(() => import('../../modules/emr/pages/EmrEditor'));
export const EmrExtractV2 = lazy(() => import('../../modules/emr/pages/EmrExtract'));
export const EmrDataTagsV2 = lazy(() => import('../../modules/emr/pages/EmrDataTags'));
export const TelemedicineV2 = lazy(() => import('../../modules/telemedicine/pages/Telemedicine'));
export const FollowUpV2 = lazy(() => import('../../modules/opd/pages/FollowUp'));
export const BookingManagementV2 = lazy(() => import('../../modules/reception/pages/BookingManagement'));
export const TreatmentProtocolV2 = lazy(() => import('../../modules/patient/pages/TreatmentProtocol'));
export const ChronicDiseaseV2 = lazy(() => import('../../modules/public-health/pages/ChronicDisease'));
export const TbHivManagementV2 = lazy(() => import('../../modules/public-health/pages/TbHivManagement'));
export const ConsultationV2 = lazy(() => import('../../modules/opd/pages/Consultation'));
export const DoctorPortalV2 = lazy(() => import('../../modules/opd/pages/DoctorPortal'));
export const ClinicalCatalogsV2 = lazy(() => import('../../modules/administration/pages/ClinicalCatalogs'));
export const SpecialtyEMRV2 = lazy(() => import('../../modules/emr/pages/SpecialtyEMR'));
export const MedicalRecordArchiveV2 = lazy(() => import('../../modules/medical-record/pages/MedicalRecordArchive'));
export const MedicalRecordPlanningV2 = lazy(() => import('../../modules/medical-record/pages/MedicalRecordPlanning'));
export const EmergencyDisasterV2 = lazy(() => import('../../modules/mci/pages/EmergencyDisaster'));
export const ConsultationRegisterV2 = lazy(() => import('../../modules/reception/pages/ConsultationRegister'));
export const ObservationStayV2 = lazy(() => import('../../modules/inpatient/pages/ObservationStay'));
export const ServiceRequeueV2 = lazy(() => import('../../modules/checkup/pages/ServiceRequeue'));
export const VideoConsultationV2 = lazy(() => import('../../modules/telemedicine/pages/VideoConsultation'));
// NangCap27 — HSMT BV Tâm thần Quảng Ngãi
export const TransportSlipsV2 = lazy(() => import('../../modules/patient/pages/TransportSlips'));
export const CheckupContractsV2 = lazy(() => import('../../modules/checkup/pages/CheckupContracts'));

// --- support group ---
export const PharmacyV2 = lazy(() => import('../../modules/pharmacy/pages/Pharmacy'));
export const HospitalPharmacyV2 = lazy(() => import('../../modules/pharmacy/pages/HospitalPharmacy'));
export const PharmacyStockInV2 = lazy(() => import('../../modules/pharmacy/pages/PharmacyStockIn'));
export const PharmacyStockIssueV2 = lazy(() => import('../../modules/pharmacy/pages/PharmacyStockIssue'));
export const PharmacyApprovalV2 = lazy(() => import('../../modules/pharmacy/pages/PharmacyApproval'));
export const PharmacyStockTakeV2 = lazy(() => import('../../modules/pharmacy/pages/PharmacyStockTake'));
export const MedicalSupplyV2 = lazy(() => import('../../modules/pharmacy/pages/MedicalSupply'));
export const NutritionV2 = lazy(() => import('../../modules/nutrition/pages/Nutrition'));
export const RehabilitationV2 = lazy(() => import('../../modules/rehabilitation/pages/Rehabilitation'));
export const TraditionalMedicineV2 = lazy(() => import('../../modules/traditional-medicine/pages/TraditionalMedicine'));
export const PharmacyCatalogsV2 = lazy(() => import('../../modules/administration/pages/PharmacyCatalogs'));
export const DispensingCounterV2 = lazy(() => import('../../modules/opd/pages/DispensingCounter'));
export const ClinicalPharmacyCheckV2 = lazy(() => import('../../modules/opd/pages/ClinicalPharmacyCheck'));
export const InpatientDispensingV2 = lazy(() => import('../../modules/pharmacy/pages/InpatientDispensing'));
export const StockReportV2 = lazy(() => import('../../modules/pharmacy/pages/StockReport'));
export const OfficeSupplyApprovalV2 = lazy(() => import('../../modules/pharmacy/pages/OfficeSupplyApproval'));
export const EmergencyCabinetV2 = lazy(() => import('../../modules/pharmacy/pages/EmergencyCabinet'));

// --- public-health group ---
export const HealthCheckupV2 = lazy(() => import('../../modules/checkup/pages/HealthCheckup'));
export const ImmunizationV2 = lazy(() => import('../../modules/immunization/pages/Immunization'));
export const EpidemiologyV2 = lazy(() => import('../../modules/public-health/pages/Epidemiology'));
export const SchoolHealthV2 = lazy(() => import('../../modules/public-health/pages/SchoolHealth'));
export const OccupationalHealthV2 = lazy(() => import('../../modules/public-health/pages/OccupationalHealth'));
export const MethadoneTreatmentV2 = lazy(() => import('../../modules/public-health/pages/MethadoneTreatment'));
export const FoodSafetyV2 = lazy(() => import('../../modules/public-health/pages/FoodSafety'));
export const CommunityHealthV2 = lazy(() => import('../../modules/public-health/pages/CommunityHealth'));
export const HivManagementV2 = lazy(() => import('../../modules/public-health/pages/HivManagement'));
export const HealthEducationV2 = lazy(() => import('../../modules/public-health/pages/HealthEducation'));
export const EnvironmentalHealthV2 = lazy(() => import('../../modules/public-health/pages/EnvironmentalHealth'));
export const PopulationHealthV2 = lazy(() => import('../../modules/public-health/pages/PopulationHealth'));
export const ReproductiveHealthV2 = lazy(() => import('../../modules/specialty/pages/ReproductiveHealth'));
export const MentalHealthV2 = lazy(() => import('../../modules/public-health/pages/MentalHealth'));
export const TraumaRegistryV2 = lazy(() => import('../../modules/mci/pages/TraumaRegistry'));
export const MedicalForensicsV2 = lazy(() => import('../../modules/specialty/pages/MedicalForensics'));
