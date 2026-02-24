/**
 * API Client cho Phân hệ 12: Dinh dưỡng lâm sàng (Clinical Nutrition)
 * Module: Nutrition
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Screening DTOs

export interface NutritionScreeningDto {
  id: string;
  screeningCode: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  medicalRecordCode: string;
  departmentId: string;
  departmentName: string;
  bedNumber?: string;
  screeningTool: string; // NRS-2002, SGA, MUST
  screeningDate: string;
  screenedBy: string;
  screenedByName: string;
  // NRS-2002 components
  nrsNutritionalScore?: number;
  nrsSeverityScore?: number;
  nrsAgeAdjustment?: number;
  nrsTotalScore?: number;
  // SGA components
  sgaWeightChange?: string;
  sgaDietaryIntake?: string;
  sgaGISymptoms?: string;
  sgaFunctionalCapacity?: string;
  sgaPhysicalExam?: string;
  sgaRating?: string;
  // MUST components
  mustBMIScore?: number;
  mustWeightLossScore?: number;
  mustAcuteIllnessScore?: number;
  mustTotalScore?: number;
  riskLevel: string; // Low, Medium, High
  requiresAssessment: boolean;
  notes?: string;
  status: number;
  statusName: string;
}

export interface CreateNutritionScreeningDto {
  admissionId: string;
  screeningTool: string;
  nrsNutritionalScore?: number;
  nrsSeverityScore?: number;
  sgaWeightChange?: string;
  sgaDietaryIntake?: string;
  sgaGISymptoms?: string;
  sgaFunctionalCapacity?: string;
  sgaPhysicalExam?: string;
  mustBMIScore?: number;
  mustWeightLossScore?: number;
  mustAcuteIllnessScore?: number;
  notes?: string;
}

// #endregion

// #region Assessment DTOs

export interface NutritionAssessmentDto {
  id: string;
  assessmentCode: string;
  screeningId: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  assessmentDate: string;
  assessedBy: string;
  assessedByName: string;
  // Anthropometric data
  weight: number;
  height: number;
  bmi: number;
  idealBodyWeight: number;
  adjustedBodyWeight?: number;
  weightChangePct?: number;
  weightChangePeriod?: string;
  midArmCircumference?: number;
  tricepSkinfold?: number;
  // Biochemical data
  albumin?: number;
  prealbumin?: number;
  transferrin?: number;
  totalLymphocytes?: number;
  hemoglobin?: number;
  bloodGlucose?: number;
  creatinine?: number;
  // Clinical data
  diagnosis: string;
  diagnosisIcd?: string;
  comorbidities?: string;
  medications?: string;
  giFunction?: string;
  feedingRoute: string;
  // Dietary data
  currentIntake?: string;
  appetiteLevel?: string;
  foodAllergies?: string;
  foodIntolerances?: string;
  dietaryRestrictions?: string;
  // Energy & Protein requirements
  bmr: number;
  activityFactor: number;
  stressFactor: number;
  energyRequirement: number;
  proteinRequirement: number;
  fluidRequirement: number;
  // Assessment results
  nutritionDiagnosis: string;
  nutritionDiagnosisCode?: string;
  etiology?: string;
  signsSymptoms?: string;
  goals?: string;
  interventionPlan?: string;
  monitoringPlan?: string;
  status: number;
  statusName: string;
}

export interface CreateNutritionAssessmentDto {
  screeningId: string;
  admissionId: string;
  weight: number;
  height: number;
  idealBodyWeight?: number;
  adjustedBodyWeight?: number;
  midArmCircumference?: number;
  tricepSkinfold?: number;
  albumin?: number;
  prealbumin?: number;
  diagnosis: string;
  diagnosisIcd?: string;
  comorbidities?: string;
  feedingRoute: string;
  currentIntake?: string;
  foodAllergies?: string;
  activityFactor: number;
  stressFactor: number;
  nutritionDiagnosis: string;
  goals?: string;
  interventionPlan?: string;
  monitoringPlan?: string;
}

// #endregion

// #region Diet Order DTOs

export interface DietOrderDto {
  id: string;
  orderCode: string;
  assessmentId?: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  medicalRecordCode: string;
  departmentId: string;
  departmentName: string;
  bedNumber?: string;
  orderedBy: string;
  orderedByName: string;
  orderedDate: string;
  dietType: string;
  dietTypeName: string;
  texture: string; // Regular, Soft, Pureed, Liquid
  consistencyLevel?: number;
  energyKcal: number;
  proteinGrams: number;
  fluidMl?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  phosphorusMg?: number;
  restrictions?: string[];
  allergies?: string[];
  preferences?: string;
  feedingRoute: string;
  mealFrequency: number;
  snacksIncluded: boolean;
  specialInstructions?: string;
  startDate: string;
  endDate?: string;
  status: number;
  statusName: string;
}

export interface CreateDietOrderDto {
  assessmentId?: string;
  admissionId: string;
  dietType: string;
  texture: string;
  consistencyLevel?: number;
  energyKcal: number;
  proteinGrams: number;
  fluidMl?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  phosphorusMg?: number;
  restrictions?: string[];
  allergies?: string[];
  preferences?: string;
  feedingRoute: string;
  mealFrequency: number;
  snacksIncluded: boolean;
  specialInstructions?: string;
  startDate: string;
  endDate?: string;
}

export interface DietTypeDto {
  code: string;
  name: string;
  description?: string;
  defaultEnergy?: number;
  defaultProtein?: number;
  isActive: boolean;
}

// #endregion

// #region Meal Planning DTOs

export interface MealPlanDto {
  id: string;
  planCode: string;
  planDate: string;
  departmentId?: string;
  departmentName?: string;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  totalPatients: number;
  meals: PlannedMealDto[];
  status: number;
  statusName: string;
}

export interface PlannedMealDto {
  id: string;
  mealPlanId: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  bedNumber?: string;
  dietOrderId: string;
  mealType: string; // Breakfast, Lunch, Dinner, Snack
  mealTime: string;
  menuItems: MenuItemDto[];
  energyKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  specialInstructions?: string;
  deliveryStatus: number;
  deliveredAt?: string;
  consumptionPct?: number;
  feedback?: string;
}

export interface MenuItemDto {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  portionSize: string;
  energyKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  sodiumMg?: number;
  allergens?: string[];
}

export interface GenerateMealPlanDto {
  planDate: string;
  departmentId?: string;
  mealTypes?: string[];
}

export interface UpdateMealDeliveryDto {
  plannedMealId: string;
  deliveryStatus: number;
  deliveredAt?: string;
  notes?: string;
}

export interface RecordConsumptionDto {
  plannedMealId: string;
  consumptionPct: number;
  feedback?: string;
  recordedBy: string;
}

// #endregion

// #region Monitoring DTOs

export interface NutritionMonitoringDto {
  id: string;
  monitoringCode: string;
  assessmentId: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  monitoringDate: string;
  monitoredBy: string;
  monitoredByName: string;
  // Anthropometric
  weight: number;
  weightChange: number;
  weightChangePct: number;
  // Intake monitoring
  targetEnergy: number;
  actualEnergy: number;
  energyPct: number;
  targetProtein: number;
  actualProtein: number;
  proteinPct: number;
  fluidIntake?: number;
  // Labs
  albumin?: number;
  prealbumin?: number;
  bloodGlucose?: number;
  // Assessment
  toleranceAssessment?: string;
  giComplications?: string;
  progressNotes: string;
  goalsMetStatus: string;
  adjustmentsNeeded?: string;
  nextMonitoringDate?: string;
  status: number;
  statusName: string;
}

export interface CreateNutritionMonitoringDto {
  assessmentId: string;
  admissionId: string;
  weight: number;
  actualEnergy: number;
  actualProtein: number;
  fluidIntake?: number;
  albumin?: number;
  prealbumin?: number;
  bloodGlucose?: number;
  toleranceAssessment?: string;
  giComplications?: string;
  progressNotes: string;
  goalsMetStatus: string;
  adjustmentsNeeded?: string;
  nextMonitoringDate?: string;
}

// #endregion

// #region TPN DTOs

export interface TPNOrderDto {
  id: string;
  orderCode: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  orderedBy: string;
  orderedByName: string;
  orderedDate: string;
  pharmacyId: string;
  pharmacyName: string;
  // TPN components
  volumeMl: number;
  dextroseGrams: number;
  aminoAcidsGrams: number;
  lipidsGrams: number;
  sodiumMEq: number;
  potassiumMEq: number;
  calciumMEq: number;
  magnesiumMEq: number;
  phosphorusMmol: number;
  multivitamins: boolean;
  traceElements: boolean;
  additives?: string;
  // Energy calculation
  totalEnergy: number;
  proteinEnergy: number;
  nonProteinEnergy: number;
  glucoseLipidRatio: number;
  osmolarity: number;
  // Administration
  infusionRoute: string; // Central, Peripheral
  infusionRateMlHr: number;
  infusionHours: number;
  startTime: string;
  // Monitoring
  glucoseMonitoringFrequency: string;
  electrolytesMonitoringFrequency: string;
  specialInstructions?: string;
  status: number;
  statusName: string;
}

export interface CreateTPNOrderDto {
  admissionId: string;
  pharmacyId: string;
  volumeMl: number;
  dextroseGrams: number;
  aminoAcidsGrams: number;
  lipidsGrams: number;
  sodiumMEq: number;
  potassiumMEq: number;
  calciumMEq: number;
  magnesiumMEq: number;
  phosphorusMmol: number;
  multivitamins: boolean;
  traceElements: boolean;
  additives?: string;
  infusionRoute: string;
  infusionRateMlHr: number;
  infusionHours: number;
  startTime: string;
  glucoseMonitoringFrequency: string;
  electrolytesMonitoringFrequency: string;
  specialInstructions?: string;
}

// #endregion

// #region Dashboard DTOs

export interface NutritionDashboardDto {
  date: string;
  departmentId?: string;
  departmentName?: string;
  totalPatients: number;
  screenedToday: number;
  pendingScreening: number;
  highRiskPatients: number;
  mediumRiskPatients: number;
  lowRiskPatients: number;
  activeAssessments: number;
  activeDietOrders: number;
  tpnPatients: number;
  mealComplianceRate: number;
  averageEnergyMet: number;
  averageProteinMet: number;
  alertsCount: number;
  screeningByDepartment: DepartmentScreeningStatDto[];
  riskDistribution: RiskDistributionDto[];
}

export interface DepartmentScreeningStatDto {
  departmentId: string;
  departmentName: string;
  totalPatients: number;
  screenedCount: number;
  screeningRate: number;
  highRiskCount: number;
}

export interface RiskDistributionDto {
  riskLevel: string;
  count: number;
  percentage: number;
}

// #endregion

// #region Common DTOs

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ScreeningSearchDto {
  keyword?: string;
  departmentId?: string;
  riskLevel?: string;
  fromDate?: string;
  toDate?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/nutrition';

// #region Screening

export const getScreenings = (params: ScreeningSearchDto) =>
  apiClient.get<PagedResultDto<NutritionScreeningDto>>(`${BASE_URL}/screenings`, { params });

export const getScreeningById = (id: string) =>
  apiClient.get<NutritionScreeningDto>(`${BASE_URL}/screenings/${id}`);

export const getScreeningByAdmission = (admissionId: string) =>
  apiClient.get<NutritionScreeningDto>(`${BASE_URL}/admissions/${admissionId}/screening`);

export const createScreening = (dto: CreateNutritionScreeningDto) =>
  apiClient.post<NutritionScreeningDto>(`${BASE_URL}/screenings`, dto);

export const updateScreening = (id: string, dto: CreateNutritionScreeningDto) =>
  apiClient.put<NutritionScreeningDto>(`${BASE_URL}/screenings/${id}`, dto);

export const getPendingScreenings = (departmentId?: string) =>
  apiClient.get<NutritionScreeningDto[]>(`${BASE_URL}/screenings/pending`, { params: { departmentId } });

export const getHighRiskPatients = (departmentId?: string) =>
  apiClient.get<NutritionScreeningDto[]>(`${BASE_URL}/screenings/high-risk`, { params: { departmentId } });

// #endregion

// #region Assessment

export const getAssessments = (params: ScreeningSearchDto) =>
  apiClient.get<PagedResultDto<NutritionAssessmentDto>>(`${BASE_URL}/assessments`, { params });

export const getAssessmentById = (id: string) =>
  apiClient.get<NutritionAssessmentDto>(`${BASE_URL}/assessments/${id}`);

export const getAssessmentByAdmission = (admissionId: string) =>
  apiClient.get<NutritionAssessmentDto>(`${BASE_URL}/admissions/${admissionId}/assessment`);

export const createAssessment = (dto: CreateNutritionAssessmentDto) =>
  apiClient.post<NutritionAssessmentDto>(`${BASE_URL}/assessments`, dto);

export const updateAssessment = (id: string, dto: CreateNutritionAssessmentDto) =>
  apiClient.put<NutritionAssessmentDto>(`${BASE_URL}/assessments/${id}`, dto);

export const calculateRequirements = (weight: number, height: number, age: number, gender: string, activityFactor: number, stressFactor: number) =>
  apiClient.get(`${BASE_URL}/assessments/calculate-requirements`, { params: { weight, height, age, gender, activityFactor, stressFactor } });

// #endregion

// #region Diet Orders

export const getDietOrders = (params: ScreeningSearchDto) =>
  apiClient.get<PagedResultDto<DietOrderDto>>(`${BASE_URL}/diet-orders`, { params });

export const getDietOrderById = (id: string) =>
  apiClient.get<DietOrderDto>(`${BASE_URL}/diet-orders/${id}`);

export const getActiveDietOrder = (admissionId: string) =>
  apiClient.get<DietOrderDto>(`${BASE_URL}/admissions/${admissionId}/diet-order`);

export const createDietOrder = (dto: CreateDietOrderDto) =>
  apiClient.post<DietOrderDto>(`${BASE_URL}/diet-orders`, dto);

export const updateDietOrder = (id: string, dto: CreateDietOrderDto) =>
  apiClient.put<DietOrderDto>(`${BASE_URL}/diet-orders/${id}`, dto);

export const cancelDietOrder = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/diet-orders/${id}/cancel`, { reason });

export const getDietTypes = () =>
  apiClient.get<DietTypeDto[]>(`${BASE_URL}/diet-types`);

// #endregion

// #region Meal Planning

export const getMealPlan = (date: string, departmentId?: string) =>
  apiClient.get<MealPlanDto>(`${BASE_URL}/meal-plans`, { params: { date, departmentId } });

export const generateMealPlan = (dto: GenerateMealPlanDto) =>
  apiClient.post<MealPlanDto>(`${BASE_URL}/meal-plans/generate`, dto);

export const getPatientMeals = (admissionId: string, date: string) =>
  apiClient.get<PlannedMealDto[]>(`${BASE_URL}/admissions/${admissionId}/meals`, { params: { date } });

export const updateMealDelivery = (dto: UpdateMealDeliveryDto) =>
  apiClient.post<PlannedMealDto>(`${BASE_URL}/meals/delivery`, dto);

export const recordConsumption = (dto: RecordConsumptionDto) =>
  apiClient.post<PlannedMealDto>(`${BASE_URL}/meals/consumption`, dto);

export const getMenuItems = (category?: string) =>
  apiClient.get<MenuItemDto[]>(`${BASE_URL}/menu-items`, { params: { category } });

export const printMealTicket = (plannedMealId: string) =>
  apiClient.get(`${BASE_URL}/meals/${plannedMealId}/print`, { responseType: 'blob' });

export const printDepartmentMealList = (date: string, departmentId: string, mealType: string) =>
  apiClient.get(`${BASE_URL}/meal-plans/print`, { params: { date, departmentId, mealType }, responseType: 'blob' });

// #endregion

// #region Monitoring

export const getMonitoringRecords = (assessmentId: string) =>
  apiClient.get<NutritionMonitoringDto[]>(`${BASE_URL}/assessments/${assessmentId}/monitoring`);

export const getMonitoringById = (id: string) =>
  apiClient.get<NutritionMonitoringDto>(`${BASE_URL}/monitoring/${id}`);

export const createMonitoring = (dto: CreateNutritionMonitoringDto) =>
  apiClient.post<NutritionMonitoringDto>(`${BASE_URL}/monitoring`, dto);

export const updateMonitoring = (id: string, dto: CreateNutritionMonitoringDto) =>
  apiClient.put<NutritionMonitoringDto>(`${BASE_URL}/monitoring/${id}`, dto);

export const getPatientNutritionTrend = (admissionId: string) =>
  apiClient.get(`${BASE_URL}/admissions/${admissionId}/trend`);

// #endregion

// #region TPN

export const getTPNOrders = (admissionId: string) =>
  apiClient.get<TPNOrderDto[]>(`${BASE_URL}/admissions/${admissionId}/tpn-orders`);

export const getTPNOrderById = (id: string) =>
  apiClient.get<TPNOrderDto>(`${BASE_URL}/tpn-orders/${id}`);

export const createTPNOrder = (dto: CreateTPNOrderDto) =>
  apiClient.post<TPNOrderDto>(`${BASE_URL}/tpn-orders`, dto);

export const updateTPNOrder = (id: string, dto: CreateTPNOrderDto) =>
  apiClient.put<TPNOrderDto>(`${BASE_URL}/tpn-orders/${id}`, dto);

export const cancelTPNOrder = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/tpn-orders/${id}/cancel`, { reason });

export const printTPNLabel = (id: string) =>
  apiClient.get(`${BASE_URL}/tpn-orders/${id}/print-label`, { responseType: 'blob' });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<NutritionDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

export const getNutritionStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportNutritionReport = (fromDate: string, toDate: string, reportType: string, format: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { fromDate, toDate, reportType, format }, responseType: 'blob' });

// #endregion

export default {
  // Screening
  getScreenings,
  getScreeningById,
  getScreeningByAdmission,
  createScreening,
  updateScreening,
  getPendingScreenings,
  getHighRiskPatients,
  // Assessment
  getAssessments,
  getAssessmentById,
  getAssessmentByAdmission,
  createAssessment,
  updateAssessment,
  calculateRequirements,
  // Diet Orders
  getDietOrders,
  getDietOrderById,
  getActiveDietOrder,
  createDietOrder,
  updateDietOrder,
  cancelDietOrder,
  getDietTypes,
  // Meal Planning
  getMealPlan,
  generateMealPlan,
  getPatientMeals,
  updateMealDelivery,
  recordConsumption,
  getMenuItems,
  printMealTicket,
  printDepartmentMealList,
  // Monitoring
  getMonitoringRecords,
  getMonitoringById,
  createMonitoring,
  updateMonitoring,
  getPatientNutritionTrend,
  // TPN
  getTPNOrders,
  getTPNOrderById,
  createTPNOrder,
  updateTPNOrder,
  cancelTPNOrder,
  printTPNLabel,
  // Dashboard
  getDashboard,
  getNutritionStatistics,
  exportNutritionReport,
};
