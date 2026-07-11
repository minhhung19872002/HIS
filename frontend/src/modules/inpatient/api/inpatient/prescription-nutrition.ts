/**
 * Inpatient — Prescriptions / Nutrition (3.4 + 3.5)
 */
import apiClient from '../../../../services/apiClient';

const BASE_URL = '/inpatient';

// #region 3.4 Kê đơn thuốc nội trú

export interface InpatientPrescriptionDto {
  id: string;
  admissionId: string;
  prescriptionDate: string;
  prescribingDoctorId: string;
  prescribingDoctorName: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  warehouseId: string;
  warehouseName: string;
  // G-07: 1-Thuong qui, 2-Xuat tu truc, 3-Hoan tra, 4-Don xuat vien
  drugOrderType?: number;
  items: InpatientMedicineItemDto[];
  status: number;
  statusName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
}

export interface InpatientMedicineItemDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  dosage?: string;
  morning?: string;
  noon?: string;
  afternoon?: string;
  evening?: string;
  usageInstructions?: string;
  paymentSource: number;
  insuranceRatio: number;
  batchNumber?: string;
  expiryDate?: string;
  status: number;
}

export interface CreateInpatientPrescriptionDto {
  admissionId: string;
  prescriptionDate: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  warehouseId: string;
  // G-07: 1-Thuong qui(default), 2-Xuat tu truc, 3-Hoan tra, 4-Don xuat vien (toa ve)
  drugOrderType?: number;
  items: CreateInpatientMedicineItemDto[];
}

export interface CreateInpatientMedicineItemDto {
  medicineId: string;
  quantity: number;
  dosage?: string;
  morning?: string;
  noon?: string;
  afternoon?: string;
  evening?: string;
  usageInstructions?: string;
  paymentSource: number;
  note?: string;
}

export interface MedicineOrderSummaryDto {
  id: string;
  summaryDate: string;
  departmentId: string;
  departmentName: string;
  roomId?: string;
  roomName?: string;
  warehouseId: string;
  warehouseName: string;
  items: MedicineOrderSummaryItemDto[];
  status: number;
  statusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
}

export interface MedicineOrderSummaryItemDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  totalQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;
  patientCount: number;
  patientDetails: MedicinePatientDetailDto[];
}

export interface MedicinePatientDetailDto {
  admissionId: string;
  patientCode: string;
  patientName: string;
  bedName?: string;
  quantity: number;
  dosage?: string;
}

export interface PrescriptionWarningDto {
  hasDuplicateToday: boolean;
  duplicateMedicines: string[];
  hasDrugInteraction: boolean;
  interactions: DrugInteractionDto[];
  hasAntibioticDuplicate: boolean;
  duplicateAntibiotics: string[];
  exceedsInsuranceCeiling: boolean;
  insuranceCeiling: number;
  prescriptionAmount: number;
  isInsuranceExpiring: boolean;
  daysRemaining: number;
  isOutsideProtocol: boolean;
  protocolWarnings: string[];
  generalWarnings: string[];
}

export interface DrugInteractionDto {
  drug1Name: string;
  drug2Name: string;
  severity: number;
  severityName: string;
  severityColor: string;
  description: string;
  recommendation?: string;
}

export interface PrescriptionTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  description?: string;
  departmentId?: string;
  createdBy?: string;
  createdByName?: string;
  isShared: boolean;
  items: PrescriptionTemplateItemDto[];
}

export interface PrescriptionTemplateItemDto {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  defaultQuantity: number;
  defaultDosage?: string;
  defaultUsage?: string;
}

// Loose DTOs cho search thuốc / cảnh báo chống chỉ định — backend chưa publish schema cố định.
export interface MedicineSearchItemDto {
  id: string;
  code?: string;
  name: string;
  activeIngredient?: string;
  unit?: string;
  unitPrice?: number;
  stock?: number;
  [k: string]: unknown;
}

export interface MedicineContraindicationDto {
  medicineId: string;
  medicineName?: string;
  warnings?: string[];
  allergies?: string[];
  interactions?: DrugInteractionDto[];
  [k: string]: unknown;
}

// Tủ trực cấp cứu — DTO chuẩn của BE chưa cố định, dùng loose interface.
export interface EmergencyCabinetDto {
  id: string;
  code?: string;
  name: string;
  departmentId?: string;
  roomId?: string;
  [k: string]: unknown;
}

// #endregion

// #region 3.5 Chỉ định dinh dưỡng

export interface NutritionOrderDto {
  id: string;
  admissionId: string;
  patientName: string;
  bedName?: string;
  orderDate: string;
  mealType: number;
  mealTypeName: string;
  nutritionLevel: number;
  nutritionLevelName: string;
  menuCode?: string;
  menuName?: string;
  specialRequirements?: string;
  status: number;
}

export interface CreateNutritionOrderDto {
  admissionId: string;
  orderDate: string;
  mealType: number;
  nutritionLevel: number;
  menuCode?: string;
  specialRequirements?: string;
}

export interface NutritionSummaryDto {
  summaryDate: string;
  departmentId: string;
  departmentName: string;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalSnack: number;
  normalCount: number;
  dietCount: number;
  specialCount: number;
  details: NutritionOrderDto[];
}

// #endregion

export const searchMedicines = (keyword: string, warehouseId: string) =>
  apiClient.get<MedicineSearchItemDto[]>(`${BASE_URL}/search-medicines`, { params: { keyword, warehouseId } });

export const getMedicineContraindications = (medicineId: string, admissionId: string) =>
  apiClient.get<MedicineContraindicationDto>(`${BASE_URL}/medicine-contraindications/${medicineId}`, { params: { admissionId } });

export const getMedicineStock = (medicineId: string, warehouseId: string) =>
  apiClient.get<number>(`${BASE_URL}/medicine-stock/${medicineId}`, { params: { warehouseId } });

export const createPrescription = (dto: CreateInpatientPrescriptionDto) =>
  apiClient.post<InpatientPrescriptionDto>(`${BASE_URL}/prescriptions`, dto);

export const updatePrescription = (id: string, dto: CreateInpatientPrescriptionDto) =>
  apiClient.put<InpatientPrescriptionDto>(`${BASE_URL}/prescriptions/${id}`, dto);

export const deletePrescription = (id: string) =>
  apiClient.delete(`${BASE_URL}/prescriptions/${id}`);

export const getPrescriptions = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<InpatientPrescriptionDto[]>(`${BASE_URL}/prescriptions/${admissionId}`, { params: { fromDate, toDate } });

export const getPrescriptionById = (id: string) =>
  apiClient.get<InpatientPrescriptionDto>(`${BASE_URL}/prescription/${id}`);

export const createEmergencyCabinetPrescription = (admissionId: string, cabinetId: string, items: CreateInpatientMedicineItemDto[]) =>
  apiClient.post<InpatientPrescriptionDto>(`${BASE_URL}/emergency-cabinet-prescription`, { admissionId, cabinetId, items });

export const getEmergencyCabinets = (departmentId: string) =>
  apiClient.get<EmergencyCabinetDto[]>(`${BASE_URL}/emergency-cabinets/${departmentId}`);

export const checkPrescriptionWarnings = (admissionId: string, items: CreateInpatientMedicineItemDto[]) =>
  apiClient.post<PrescriptionWarningDto>(`${BASE_URL}/prescription-warnings`, { admissionId, items });

export const getPrescriptionTemplates = (departmentId?: string) =>
  apiClient.get<PrescriptionTemplateDto[]>(`${BASE_URL}/prescription-templates`, { params: { departmentId } });

export const createPrescriptionTemplate = (dto: PrescriptionTemplateDto) =>
  apiClient.post<PrescriptionTemplateDto>(`${BASE_URL}/prescription-templates`, dto);

export const prescribeByTemplate = (admissionId: string, templateId: string) =>
  apiClient.post<InpatientPrescriptionDto>(`${BASE_URL}/prescribe-by-template`, { admissionId, templateId });

export const createMedicineOrderSummary = (departmentId: string, date: string, warehouseId: string, roomId?: string) =>
  apiClient.post<MedicineOrderSummaryDto>(`${BASE_URL}/medicine-order-summary`, { departmentId, date, roomId, warehouseId });

export const getMedicineOrderSummaries = (departmentId: string, fromDate: string, toDate: string) =>
  apiClient.get<MedicineOrderSummaryDto[]>(`${BASE_URL}/medicine-order-summaries/${departmentId}`, { params: { fromDate, toDate } });

export const printMedicineOrderSummary = (summaryId: string) =>
  apiClient.get(`${BASE_URL}/print-medicine-summary/${summaryId}`, { responseType: 'blob' });

export const createNutritionOrder = (dto: CreateNutritionOrderDto) =>
  apiClient.post<NutritionOrderDto>(`${BASE_URL}/nutrition-orders`, dto);

export const updateNutritionOrder = (id: string, dto: CreateNutritionOrderDto) =>
  apiClient.put<NutritionOrderDto>(`${BASE_URL}/nutrition-orders/${id}`, dto);

export const getNutritionOrders = (admissionId?: string, departmentId?: string, date?: string) =>
  apiClient.get<NutritionOrderDto[]>(`${BASE_URL}/nutrition-orders`, { params: { admissionId, departmentId, date } });

export const getNutritionSummary = (departmentId: string, date: string) =>
  apiClient.get<NutritionSummaryDto>(`${BASE_URL}/nutrition-summary/${departmentId}`, { params: { date } });

export const printNutritionSummary = (departmentId: string, date: string) =>
  apiClient.get(`${BASE_URL}/print-nutrition-summary/${departmentId}`, { params: { date }, responseType: 'blob' });
