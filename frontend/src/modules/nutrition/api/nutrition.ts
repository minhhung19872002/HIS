/**
 * API Client cho Phân hệ 12: Dinh dưỡng lâm sàng (Clinical Nutrition)
 * Module: Nutrition
 */

import apiClient from '../../../services/apiClient';

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
  energyKcal?: number;
  proteinGrams?: number;
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
  /** backend trả chuỗi "Active" | "Discontinued" */
  status: number | string;
  statusName: string;
}

export interface CreateDietOrderDto {
  assessmentId?: string;
  admissionId: string;
  /** Mã (code) hoặc id chế độ ăn — adapter tự resolve sang dietTypeId backend */
  dietType: string;
  dietTypeId?: string;
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
  id?: string;
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
  /** undefined = backend chưa tính định lượng suất ăn (không hiển thị số giả) */
  energyKcal?: number;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
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

import type { PagedResultDto } from '../../../types/pagination';
export type { PagedResultDto } from '../../../types/pagination';

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

// #region Backend adapters (QA-R2)
// Backend NutritionController trả DTO khác shape FE (NutritionDTOs.cs): screening `totalScore/nutritionScore/
// requiresIntervention`, KHÔNG có `status`, dòng "chờ sàng lọc" có id = Guid rỗng; diet order `dietTypeId/
// calorieLevel/proteinLevel`; meal-plans trả MẢNG plan có `items`. Adapter map về shape FE để trang v2 hiển thị
// đúng và gửi đúng request DTO backend (trước đây create screening/diet order luôn 400).

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Raw = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const realDate = (v: unknown): string | undefined => { const s = str(v); return s && !s.startsWith('0001-') ? s : undefined; };

const mapScreening = (raw: unknown): NutritionScreeningDto => {
  const r = (raw || {}) as Raw;
  const admissionId = str(r.admissionId) || '';
  const id = str(r.id);
  const pending = r.riskLevel === 'Pending' || !id || id === EMPTY_GUID;
  return {
    ...(r as unknown as NutritionScreeningDto),
    // dòng chờ sàng lọc chưa có bản ghi → id ổn định theo admission (trước đây mọi dòng cùng Guid rỗng → dedupe còn 1)
    id: pending ? `pending-${admissionId}` : (id as string),
    admissionId,
    medicalRecordCode: str(r.medicalRecordCode) || str(r.patientCode) || '',
    screeningTool: str(r.screeningTool) || (pending ? '' : 'NRS-2002'),
    screeningDate: realDate(r.screeningDate) || '',
    nrsNutritionalScore: num(r.nrsNutritionalScore) ?? num(r.nutritionScore),
    nrsSeverityScore: num(r.nrsSeverityScore) ?? num(r.diseaseScore),
    nrsTotalScore: num(r.nrsTotalScore) ?? num(r.totalScore),
    riskLevel: pending ? '' : (str(r.riskLevel) || ''),
    requiresAssessment: Boolean(r.requiresAssessment ?? r.requiresIntervention),
    status: typeof r.status === 'number' ? r.status : (pending ? 0 : 1),
  };
};

const mapScreeningList = (raw: unknown): NutritionScreeningDto[] => {
  const list = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] } | null)?.items || []);
  return list.map(mapScreening);
};

const mapDietOrder = (raw: unknown): DietOrderDto => {
  const r = (raw || {}) as Raw;
  return {
    ...(r as unknown as DietOrderDto),
    // select "Chế độ ăn" của form dùng code làm value
    dietType: str(r.dietTypeCode) || str(r.dietType) || '',
    energyKcal: num(r.energyKcal) ?? num(r.calorieLevel),
    proteinGrams: num(r.proteinGrams) ?? num(r.proteinLevel),
    fluidMl: num(r.fluidMl) ?? num(r.fluidRestriction),
    sodiumMg: num(r.sodiumMg) ?? num(r.sodiumRestriction),
    orderedByName: str(r.orderedByName) || str(r.orderedBy) || '',
    orderedDate: str(r.orderedDate) || str(r.orderedAt) || '',
    statusName: str(r.statusName) || (r.status === 'Active' ? 'Đang dùng' : r.status === 'Discontinued' ? 'Đã ngưng' : ''),
  };
};

let dietTypeCache: DietTypeDto[] | null = null;
const resolveDietTypeId = async (dto: CreateDietOrderDto): Promise<string | undefined> => {
  const v = dto.dietTypeId || dto.dietType;
  if (!v) return undefined;
  if (GUID_RE.test(v)) return v;
  if (!dietTypeCache) dietTypeCache = (await apiClient.get<DietTypeDto[]>(`${BASE_URL}/diet-types`)).data || [];
  return dietTypeCache.find((t) => t.code === v)?.id;
};

/** FE form → backend CreateDietOrderDto (dietTypeId, calorieLevel, proteinLevel, …) */
const toBackendDietOrder = async (dto: CreateDietOrderDto) => ({
  admissionId: dto.admissionId,
  dietTypeId: await resolveDietTypeId(dto),
  texture: dto.texture || undefined,
  calorieLevel: dto.energyKcal,
  proteinLevel: dto.proteinGrams,
  fluidRestriction: dto.fluidMl,
  sodiumRestriction: dto.sodiumMg,
  allergies: dto.allergies,
  restrictions: dto.restrictions,
  specialInstructions: dto.specialInstructions || undefined,
  feedingRoute: dto.feedingRoute || undefined,
  startDate: dto.startDate,
  endDate: dto.endDate || undefined,
});

// #endregion

// #region Screening

/** ⚠️ backend GET /screenings hiện trả CÙNG danh sách chờ sàng lọc (chưa có endpoint liệt kê đã sàng lọc) */
export const getScreenings = (params: ScreeningSearchDto) =>
  apiClient.get<NutritionScreeningDto[]>(`${BASE_URL}/screenings`, { params })
    .then((res) => ({ ...res, data: mapScreeningList(res.data) as NutritionScreeningDto[] & { items?: NutritionScreeningDto[] } }));

export const getScreeningById = (id: string) =>
  apiClient.get<NutritionScreeningDto>(`${BASE_URL}/screenings/${id}`);

/** backend: GET /screenings/admission/{admissionId} (204 khi chưa sàng lọc → data null) */
export const getScreeningByAdmission = (admissionId: string) =>
  apiClient.get<NutritionScreeningDto>(`${BASE_URL}/screenings/admission/${admissionId}`)
    .then((res) => ({ ...res, data: res.data ? mapScreening(res.data) : null }));

/** POST /screenings — adapter sang PerformNutritionScreeningDto backend {admissionId, nutritionScore, diseaseScore, …} */
export const createScreening = (dto: CreateNutritionScreeningDto) =>
  apiClient.post<NutritionScreeningDto>(`${BASE_URL}/screenings`, {
    admissionId: dto.admissionId,
    nutritionScore: dto.nrsNutritionalScore ?? 0,
    diseaseScore: dto.nrsSeverityScore ?? 0,
    notes: dto.notes || undefined,
  }).then((res) => ({ ...res, data: res.data ? mapScreening(res.data) : res.data }));

export const updateScreening = (id: string, dto: CreateNutritionScreeningDto) =>
  apiClient.put<NutritionScreeningDto>(`${BASE_URL}/screenings/${id}`, dto);

export const getPendingScreenings = (departmentId?: string) =>
  apiClient.get<NutritionScreeningDto[]>(`${BASE_URL}/screenings/pending`, { params: { departmentId } })
    .then((res) => ({ ...res, data: mapScreeningList(res.data) }));

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

/** ⚠️ backend GET /diet-orders chỉ trả đơn ĐANG HIỆU LỰC (Active, tối đa 200) và bỏ qua keyword */
export const getDietOrders = (params: ScreeningSearchDto) =>
  apiClient.get<DietOrderDto[]>(`${BASE_URL}/diet-orders`, { params })
    // `items?` chỉ để trang v1 legacy (đọc data.items) còn compile — backend trả mảng
    .then((res) => ({ ...res, data: (Array.isArray(res.data) ? res.data : []).map(mapDietOrder) as DietOrderDto[] & { items?: DietOrderDto[] } }));

export const getDietOrderById = (id: string) =>
  apiClient.get<DietOrderDto>(`${BASE_URL}/diet-orders/${id}`)
    .then((res) => ({ ...res, data: res.data ? mapDietOrder(res.data) : res.data }));

/** Backend không có route theo admission → lọc từ danh sách đơn đang hiệu lực (data null khi chưa có). */
export const getActiveDietOrder = (admissionId: string) =>
  apiClient.get<DietOrderDto[]>(`${BASE_URL}/diet-orders`)
    .then((res) => {
      const found = (Array.isArray(res.data) ? res.data : []).find((o) => o.admissionId === admissionId);
      return { ...res, data: found ? mapDietOrder(found) : null };
    });

export const createDietOrder = async (dto: CreateDietOrderDto) =>
  apiClient.post<DietOrderDto>(`${BASE_URL}/diet-orders`, await toBackendDietOrder(dto));

export const updateDietOrder = async (id: string, dto: CreateDietOrderDto) =>
  apiClient.put<DietOrderDto>(`${BASE_URL}/diet-orders/${id}`, await toBackendDietOrder(dto));

export const cancelDietOrder = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/diet-orders/${id}/cancel`, { reason });

export const getDietTypes = () =>
  apiClient.get<DietTypeDto[]>(`${BASE_URL}/diet-types`);

// #endregion

// #region Meal Planning

/**
 * backend GET /meal-plans trả MẢNG plan theo (bữa, khoa) với `items` — gộp thành 1 MealPlanDto có `meals`
 * (trước đây trang đọc `.meals` trên mảng → luôn rỗng). Backend chưa có định lượng/menu/tỉ lệ ăn cho từng suất.
 */
export const getMealPlan = (date: string, departmentId?: string) =>
  apiClient.get<unknown>(`${BASE_URL}/meal-plans`, { params: { date, departmentId } })
    .then((res) => {
      const plans = (Array.isArray(res.data) ? res.data : []) as Raw[];
      if (plans.length === 0) return { ...res, data: null as MealPlanDto | null };
      const meals: PlannedMealDto[] = plans.flatMap((p) => ((p.items as Raw[] | undefined) || []).map((i) => ({
        id: `${String(p.id)}-${String(i.dietOrderId)}`,
        mealPlanId: String(p.id),
        admissionId: '',
        patientId: '',
        patientName: str(i.patientName) || '',
        bedNumber: str(i.bedNumber),
        dietOrderId: String(i.dietOrderId),
        mealType: str(p.mealType) || '',
        mealTime: '',
        menuItems: [],
        specialInstructions: str(i.specialNotes),
        deliveryStatus: i.isDelivered ? 2 : 0,
      })));
      const data: MealPlanDto = {
        id: String(plans[0].id), planCode: '', planDate: date,
        generatedBy: '', generatedByName: '', generatedAt: '',
        totalPatients: plans.reduce((s, p) => s + (num(p.totalPatients) ?? 0), 0),
        meals, status: 0, statusName: str(plans[0].status) || '',
      };
      return { ...res, data };
    });

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

// #region NangCap26 XII.5/XII.6 — Duyệt phiếu suất ăn & màn hình Nhà ăn

export interface MealPlanApprovalResultDto {
  mealPlanId: string;
  status: string;
  approvedAt?: string;
  /** Số suất đã sinh khoản thu trong lần duyệt này. */
  billedItems: number;
  totalItems: number;
}

export interface CanteenQueueItemDto {
  mealPlanId: string;
  date: string;
  mealType: string;
  departmentId?: string;
  departmentName: string;
  totalPatients: number;
  /** Planned | Approved | Rejected | Prepared | Distributed */
  status: string;
  approvedAt?: string;
  preparedAt?: string;
  distributedAt?: string;
}

/** XII.5 — khoa dinh dưỡng duyệt phiếu suất ăn (duyệt → sinh khoản thu cho BN). */
export const approveMealPlan = (id: string) =>
  apiClient.post<MealPlanApprovalResultDto>(`${BASE_URL}/meal-plans/${id}/approve`, {});

/** XII.5 — từ chối phiếu suất ăn (bắt buộc lý do). */
export const rejectMealPlan = (id: string, reason: string) =>
  apiClient.post<MealPlanApprovalResultDto>(`${BASE_URL}/meal-plans/${id}/reject`, { reason });

/** XII.6 — hàng đợi màn hình Nhà ăn. */
export const getCanteenQueue = (date?: string, mealType?: string) =>
  apiClient.get<CanteenQueueItemDto[]>(`${BASE_URL}/canteen/queue`, { params: { date, mealType } });

/** XII.6 — nhà ăn đánh dấu đã chuẩn bị xong. */
export const markCanteenPrepared = (id: string) =>
  apiClient.post<CanteenQueueItemDto>(`${BASE_URL}/canteen/${id}/prepared`, {});

/** XII.6 — nhà ăn đánh dấu đã phát về khoa phòng. */
export const markCanteenDistributed = (id: string) =>
  apiClient.post<CanteenQueueItemDto>(`${BASE_URL}/canteen/${id}/distributed`, {});

// #endregion

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

/** backend NutritionDashboardDto dùng `highRiskCount` — map sang `highRiskPatients`; field backend không tính để undefined (KPI tự fallback). */
export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<NutritionDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } })
    .then((res) => {
      const r = (res.data || {}) as unknown as Raw;
      return {
        ...res,
        data: res.data ? ({
          ...res.data,
          highRiskPatients: num(r.highRiskPatients) ?? num(r.highRiskCount),
          totalPatients: num(r.totalPatients),
          activeAssessments: num(r.activeAssessments),
        } as NutritionDashboardDto) : res.data,
      };
    });

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
