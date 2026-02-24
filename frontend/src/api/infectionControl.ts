/**
 * API Client cho Phân hệ 13: Kiểm soát nhiễm khuẩn (Infection Control)
 * Module: Infection Control
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region HAI Surveillance DTOs

export interface HAISurveillanceDto {
  id: string;
  caseCode: string;
  admissionId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  departmentId: string;
  departmentName: string;
  bedNumber?: string;
  infectionType: string; // SSI, CAUTI, CLABSI, VAP, CDI, Other
  infectionTypeName: string;
  infectionSite?: string;
  onsetDate: string;
  diagnosisDate: string;
  organism?: string;
  organismCode?: string;
  isMDRO: boolean;
  mdroType?: string; // MRSA, VRE, ESBL, CRE, etc.
  cultureSource?: string;
  cultureDate?: string;
  cultureResult?: string;
  antibioticSensitivity?: string;
  riskFactors: string[];
  deviceAssociated: boolean;
  deviceType?: string;
  deviceDays?: number;
  surgeryRelated: boolean;
  surgeryId?: string;
  surgeryDate?: string;
  surgeryType?: string;
  cdcCriteria: string;
  severity: number; // 1-Mild, 2-Moderate, 3-Severe
  severityName: string;
  outcome?: string;
  reportedBy: string;
  reportedByName: string;
  reportedDate: string;
  investigatedBy?: string;
  investigatedByName?: string;
  investigatedDate?: string;
  requiresIsolation: boolean;
  isolationOrderId?: string;
  requiresOutbreakInvestigation: boolean;
  outbreakId?: string;
  status: number;
  statusName: string;
  notes?: string;
}

export interface CreateHAISurveillanceDto {
  admissionId: string;
  infectionType: string;
  infectionSite?: string;
  onsetDate: string;
  organism?: string;
  isMDRO: boolean;
  mdroType?: string;
  cultureSource?: string;
  cultureDate?: string;
  cultureResult?: string;
  riskFactors: string[];
  deviceAssociated: boolean;
  deviceType?: string;
  deviceDays?: number;
  surgeryRelated: boolean;
  surgeryId?: string;
  cdcCriteria: string;
  severity: number;
  notes?: string;
}

export interface HAISearchDto {
  keyword?: string;
  departmentId?: string;
  infectionType?: string;
  isMDRO?: boolean;
  fromDate?: string;
  toDate?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Isolation Order DTOs

export interface IsolationOrderDto {
  id: string;
  orderCode: string;
  haiCaseId?: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  departmentId: string;
  departmentName: string;
  roomId?: string;
  roomName?: string;
  bedNumber?: string;
  isolationType: string; // Contact, Droplet, Airborne, Protective
  isolationTypeName: string;
  precautions: string[];
  reason: string;
  organism?: string;
  isMDRO: boolean;
  orderedBy: string;
  orderedByName: string;
  orderedDate: string;
  startDate: string;
  endDate?: string;
  discontinuedBy?: string;
  discontinuedByName?: string;
  discontinuedDate?: string;
  discontinuedReason?: string;
  roomRequirements?: string;
  ppeRequirements: string[];
  visitorRestrictions?: string;
  specialInstructions?: string;
  signagePosted: boolean;
  status: number;
  statusName: string;
}

export interface CreateIsolationOrderDto {
  haiCaseId?: string;
  admissionId: string;
  isolationType: string;
  precautions: string[];
  reason: string;
  organism?: string;
  isMDRO: boolean;
  roomId?: string;
  ppeRequirements: string[];
  visitorRestrictions?: string;
  specialInstructions?: string;
}

export interface DiscontinueIsolationDto {
  isolationOrderId: string;
  reason: string;
  clearanceCriteria?: string;
}

// #endregion

// #region Hand Hygiene DTOs

export interface HandHygieneObservationDto {
  id: string;
  observationCode: string;
  departmentId: string;
  departmentName: string;
  unitId?: string;
  unitName?: string;
  observationDate: string;
  observationShift: string;
  observedBy: string;
  observedByName: string;
  staffCategory: string; // Doctor, Nurse, Allied, Support
  staffCategoryName: string;
  totalOpportunities: number;
  correctActions: number;
  complianceRate: number;
  moment1Before: number; // Before patient contact
  moment1Correct: number;
  moment2Before: number; // Before aseptic task
  moment2Correct: number;
  moment3After: number; // After body fluid exposure
  moment3Correct: number;
  moment4After: number; // After patient contact
  moment4Correct: number;
  moment5After: number; // After contact with patient surroundings
  moment5Correct: number;
  productUsed: string; // ABHR, Soap
  gloveUsage?: string;
  notes?: string;
  status: number;
  statusName: string;
}

export interface CreateHandHygieneObservationDto {
  departmentId: string;
  unitId?: string;
  observationDate: string;
  observationShift: string;
  staffCategory: string;
  moment1Before: number;
  moment1Correct: number;
  moment2Before: number;
  moment2Correct: number;
  moment3After: number;
  moment3Correct: number;
  moment4After: number;
  moment4Correct: number;
  moment5After: number;
  moment5Correct: number;
  productUsed: string;
  gloveUsage?: string;
  notes?: string;
}

export interface HandHygieneStatisticsDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  totalObservations: number;
  totalOpportunities: number;
  totalCorrectActions: number;
  overallComplianceRate: number;
  byMoment: MomentComplianceDto[];
  byStaffCategory: CategoryComplianceDto[];
  byDepartment: DepartmentComplianceDto[];
  trend: ComplianceTrendDto[];
}

export interface MomentComplianceDto {
  moment: number;
  momentName: string;
  opportunities: number;
  correctActions: number;
  complianceRate: number;
}

export interface CategoryComplianceDto {
  category: string;
  categoryName: string;
  opportunities: number;
  correctActions: number;
  complianceRate: number;
}

export interface DepartmentComplianceDto {
  departmentId: string;
  departmentName: string;
  opportunities: number;
  correctActions: number;
  complianceRate: number;
}

export interface ComplianceTrendDto {
  period: string;
  complianceRate: number;
}

// #endregion

// #region Outbreak Management DTOs

export interface OutbreakDto {
  id: string;
  outbreakCode: string;
  name: string;
  organism: string;
  organismCode?: string;
  outbreakType: string;
  startDate: string;
  endDate?: string;
  affectedDepartments: string[];
  affectedDepartmentNames: string[];
  initialCaseId: string;
  totalCases: number;
  confirmedCases: number;
  suspectedCases: number;
  recoveredCases: number;
  deaths: number;
  source?: string;
  transmissionMode?: string;
  controlMeasures: string[];
  status: number; // 1-Suspected, 2-Confirmed, 3-Contained, 4-Closed
  statusName: string;
  severity: number; // 1-Low, 2-Medium, 3-High, 4-Critical
  severityName: string;
  reportedToAuthority: boolean;
  reportedDate?: string;
  authorityReference?: string;
  investigationLeadId?: string;
  investigationLeadName?: string;
  teamMembers: OutbreakTeamMemberDto[];
  timeline: OutbreakTimelineDto[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
  closureNotes?: string;
}

export interface OutbreakTeamMemberDto {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  department: string;
  contactNumber?: string;
  email?: string;
  assignedDate: string;
}

export interface OutbreakTimelineDto {
  id: string;
  eventDate: string;
  eventType: string;
  description: string;
  actionsTaken?: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
}

export interface CreateOutbreakDto {
  name: string;
  organism: string;
  outbreakType: string;
  startDate: string;
  affectedDepartments: string[];
  initialCaseId?: string;
  source?: string;
  transmissionMode?: string;
  severity: number;
  investigationLeadId?: string;
}

export interface UpdateOutbreakStatusDto {
  outbreakId: string;
  status: number;
  notes?: string;
  controlMeasures?: string[];
}

export interface AddOutbreakCaseDto {
  outbreakId: string;
  haiCaseId: string;
  caseType: string; // Confirmed, Suspected
  linkageEvidence?: string;
}

export interface ReportToAuthorityDto {
  outbreakId: string;
  reportType: string;
  recipientAuthority: string;
  reportContent?: string;
}

// #endregion

// #region Environmental Surveillance DTOs

export interface EnvironmentalSurveillanceDto {
  id: string;
  surveillanceCode: string;
  departmentId: string;
  departmentName: string;
  areaType: string; // OR, ICU, Ward, Lab, Pharmacy
  areaName: string;
  sampleType: string; // Air, Surface, Water, Equipment
  sampleLocation: string;
  sampledBy: string;
  sampledByName: string;
  sampledDate: string;
  labId?: string;
  labName?: string;
  sentToLabDate?: string;
  resultDate?: string;
  result: string; // Pending, Negative, Positive
  organism?: string;
  cfu?: number;
  acceptableLimit?: number;
  isWithinLimit: boolean;
  correctiveAction?: string;
  followUpDate?: string;
  followUpResult?: string;
  status: number;
  statusName: string;
  notes?: string;
}

export interface CreateEnvironmentalSurveillanceDto {
  departmentId: string;
  areaType: string;
  areaName: string;
  sampleType: string;
  sampleLocation: string;
  sampledDate: string;
  notes?: string;
}

export interface RecordEnvironmentalResultDto {
  surveillanceId: string;
  result: string;
  organism?: string;
  cfu?: number;
  labId?: string;
  notes?: string;
}

// #endregion

// #region Antibiotic Stewardship DTOs

export interface AntibioticUsageDto {
  id: string;
  usageCode: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  departmentId: string;
  departmentName: string;
  antibioticId: string;
  antibioticCode: string;
  antibioticName: string;
  antibioticClass: string;
  indication: string;
  indicationType: string; // Empiric, Targeted, Prophylaxis
  cultureObtained: boolean;
  cultureResult?: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  plannedDuration: number;
  actualEndDate?: string;
  actualDuration?: number;
  prescribedBy: string;
  prescribedByName: string;
  reviewRequired: boolean;
  reviewDate?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewOutcome?: string;
  deEscalated: boolean;
  deEscalationDate?: string;
  deEscalationReason?: string;
  ddd?: number; // Defined Daily Dose
  status: number;
  statusName: string;
  notes?: string;
}

export interface AntibioticStewardshipReviewDto {
  usageId: string;
  reviewDate: string;
  recommendation: string; // Continue, Discontinue, DeEscalate, Change
  recommendedAntibiotic?: string;
  recommendedDosage?: string;
  recommendedDuration?: number;
  rationale: string;
  urgency: number; // 1-Routine, 2-Urgent
  acceptedByPrescriber: boolean;
  acceptedDate?: string;
  prescribersResponse?: string;
}

export interface AntibioticStatisticsDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  totalPrescriptions: number;
  empiricPct: number;
  targetedPct: number;
  prophylaxisPct: number;
  cultureObtainedPct: number;
  averageDuration: number;
  deEscalationRate: number;
  reviewComplianceRate: number;
  dddPer1000PatientDays: number;
  byAntibiotic: AntibioticUsageStatDto[];
  byDepartment: DepartmentAntibioticStatDto[];
  trend: AntibioticTrendDto[];
}

export interface AntibioticUsageStatDto {
  antibioticId: string;
  antibioticName: string;
  antibioticClass: string;
  prescriptionCount: number;
  dddTotal: number;
  dddPer1000PatientDays: number;
}

export interface DepartmentAntibioticStatDto {
  departmentId: string;
  departmentName: string;
  prescriptionCount: number;
  dddPer1000PatientDays: number;
  reviewComplianceRate: number;
}

export interface AntibioticTrendDto {
  period: string;
  dddPer1000PatientDays: number;
  reviewComplianceRate: number;
}

// #endregion

// #region Dashboard DTOs

export interface InfectionControlDashboardDto {
  date: string;
  departmentId?: string;
  // HAI Summary
  totalHAICases: number;
  newHAICasesToday: number;
  activeHAICases: number;
  haiRate: number; // per 1000 patient days
  mdroCases: number;
  // Device-associated infections
  cautiRate: number;
  clabsiRate: number;
  vapRate: number;
  ssiRate: number;
  // Isolation
  activeIsolations: number;
  contactPrecautions: number;
  dropletPrecautions: number;
  airbornePrecautions: number;
  // Hand Hygiene
  hhComplianceRate: number;
  hhObservationsToday: number;
  // Outbreaks
  activeOutbreaks: number;
  containedOutbreaks: number;
  // Alerts
  alertsCount: number;
  criticalAlerts: number;
  // Trends
  haiByType: HAITypeStatDto[];
  haiByDepartment: DepartmentHAIStatDto[];
  monthlyTrend: MonthlyHAITrendDto[];
}

export interface HAITypeStatDto {
  infectionType: string;
  infectionTypeName: string;
  count: number;
  rate: number;
}

export interface DepartmentHAIStatDto {
  departmentId: string;
  departmentName: string;
  haiCount: number;
  haiRate: number;
  patientDays: number;
}

export interface MonthlyHAITrendDto {
  month: string;
  haiCount: number;
  haiRate: number;
  hhCompliance: number;
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

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/infectioncontrol';

// #region HAI Surveillance

export const getHAICases = (params: HAISearchDto) =>
  apiClient.get<PagedResultDto<HAISurveillanceDto>>(`${BASE_URL}/hai-cases`, { params });

export const getHAICaseById = (id: string) =>
  apiClient.get<HAISurveillanceDto>(`${BASE_URL}/hai-cases/${id}`);

export const getHAICasesByAdmission = (admissionId: string) =>
  apiClient.get<HAISurveillanceDto[]>(`${BASE_URL}/admissions/${admissionId}/hai-cases`);

export const createHAICase = (dto: CreateHAISurveillanceDto) =>
  apiClient.post<HAISurveillanceDto>(`${BASE_URL}/hai-cases`, dto);

export const updateHAICase = (id: string, dto: CreateHAISurveillanceDto) =>
  apiClient.put<HAISurveillanceDto>(`${BASE_URL}/hai-cases/${id}`, dto);

export const investigateHAICase = (id: string, findings: string, actions: string[]) =>
  apiClient.post<HAISurveillanceDto>(`${BASE_URL}/hai-cases/${id}/investigate`, { findings, actions });

export const closeHAICase = (id: string, outcome: string, notes?: string) =>
  apiClient.post<HAISurveillanceDto>(`${BASE_URL}/hai-cases/${id}/close`, { outcome, notes });

export const getActiveHAICases = (departmentId?: string) =>
  apiClient.get<HAISurveillanceDto[]>(`${BASE_URL}/hai-cases/active`, { params: { departmentId } });

export const getMDROCases = (departmentId?: string) =>
  apiClient.get<HAISurveillanceDto[]>(`${BASE_URL}/hai-cases/mdro`, { params: { departmentId } });

// #endregion

// #region Isolation Orders

export const getIsolationOrders = (departmentId?: string, status?: number) =>
  apiClient.get<IsolationOrderDto[]>(`${BASE_URL}/isolation-orders`, { params: { departmentId, status } });

export const getIsolationOrderById = (id: string) =>
  apiClient.get<IsolationOrderDto>(`${BASE_URL}/isolation-orders/${id}`);

export const getActiveIsolation = (admissionId: string) =>
  apiClient.get<IsolationOrderDto>(`${BASE_URL}/admissions/${admissionId}/isolation`);

export const createIsolationOrder = (dto: CreateIsolationOrderDto) =>
  apiClient.post<IsolationOrderDto>(`${BASE_URL}/isolation-orders`, dto);

export const updateIsolationOrder = (id: string, dto: CreateIsolationOrderDto) =>
  apiClient.put<IsolationOrderDto>(`${BASE_URL}/isolation-orders/${id}`, dto);

export const discontinueIsolation = (dto: DiscontinueIsolationDto) =>
  apiClient.post<IsolationOrderDto>(`${BASE_URL}/isolation-orders/discontinue`, dto);

export const printIsolationSignage = (id: string) =>
  apiClient.get(`${BASE_URL}/isolation-orders/${id}/print-signage`, { responseType: 'blob' });

// #endregion

// #region Hand Hygiene

export const getHandHygieneObservations = (departmentId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<HandHygieneObservationDto[]>(`${BASE_URL}/hand-hygiene/observations`, { params: { departmentId, fromDate, toDate } });

export const getHandHygieneObservationById = (id: string) =>
  apiClient.get<HandHygieneObservationDto>(`${BASE_URL}/hand-hygiene/observations/${id}`);

export const createHandHygieneObservation = (dto: CreateHandHygieneObservationDto) =>
  apiClient.post<HandHygieneObservationDto>(`${BASE_URL}/hand-hygiene/observations`, dto);

export const updateHandHygieneObservation = (id: string, dto: CreateHandHygieneObservationDto) =>
  apiClient.put<HandHygieneObservationDto>(`${BASE_URL}/hand-hygiene/observations/${id}`, dto);

export const getHandHygieneStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<HandHygieneStatisticsDto>(`${BASE_URL}/hand-hygiene/statistics`, { params: { fromDate, toDate, departmentId } });

// #endregion

// #region Outbreak Management

export const getOutbreaks = (status?: number) =>
  apiClient.get<OutbreakDto[]>(`${BASE_URL}/outbreaks`, { params: { status } });

export const getOutbreakById = (id: string) =>
  apiClient.get<OutbreakDto>(`${BASE_URL}/outbreaks/${id}`);

export const createOutbreak = (dto: CreateOutbreakDto) =>
  apiClient.post<OutbreakDto>(`${BASE_URL}/outbreaks`, dto);

export const updateOutbreak = (id: string, dto: CreateOutbreakDto) =>
  apiClient.put<OutbreakDto>(`${BASE_URL}/outbreaks/${id}`, dto);

export const updateOutbreakStatus = (dto: UpdateOutbreakStatusDto) =>
  apiClient.post<OutbreakDto>(`${BASE_URL}/outbreaks/status`, dto);

export const addOutbreakCase = (dto: AddOutbreakCaseDto) =>
  apiClient.post<OutbreakDto>(`${BASE_URL}/outbreaks/add-case`, dto);

export const addOutbreakTimelineEvent = (outbreakId: string, eventType: string, description: string, actionsTaken?: string) =>
  apiClient.post<OutbreakTimelineDto>(`${BASE_URL}/outbreaks/${outbreakId}/timeline`, { eventType, description, actionsTaken });

export const reportOutbreakToAuthority = (dto: ReportToAuthorityDto) =>
  apiClient.post<OutbreakDto>(`${BASE_URL}/outbreaks/report-authority`, dto);

export const closeOutbreak = (id: string, notes: string) =>
  apiClient.post<OutbreakDto>(`${BASE_URL}/outbreaks/${id}/close`, { notes });

export const getOutbreakCases = (outbreakId: string) =>
  apiClient.get<HAISurveillanceDto[]>(`${BASE_URL}/outbreaks/${outbreakId}/cases`);

// #endregion

// #region Environmental Surveillance

export const getEnvironmentalSurveillance = (departmentId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<EnvironmentalSurveillanceDto[]>(`${BASE_URL}/environmental`, { params: { departmentId, fromDate, toDate } });

export const getEnvironmentalSurveillanceById = (id: string) =>
  apiClient.get<EnvironmentalSurveillanceDto>(`${BASE_URL}/environmental/${id}`);

export const createEnvironmentalSurveillance = (dto: CreateEnvironmentalSurveillanceDto) =>
  apiClient.post<EnvironmentalSurveillanceDto>(`${BASE_URL}/environmental`, dto);

export const recordEnvironmentalResult = (dto: RecordEnvironmentalResultDto) =>
  apiClient.post<EnvironmentalSurveillanceDto>(`${BASE_URL}/environmental/result`, dto);

export const scheduleFollowUpSurveillance = (id: string, followUpDate: string) =>
  apiClient.post<EnvironmentalSurveillanceDto>(`${BASE_URL}/environmental/${id}/follow-up`, { followUpDate });

// #endregion

// #region Antibiotic Stewardship

export const getAntibioticUsage = (departmentId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<AntibioticUsageDto[]>(`${BASE_URL}/antibiotics/usage`, { params: { departmentId, fromDate, toDate } });

export const getAntibioticUsageById = (id: string) =>
  apiClient.get<AntibioticUsageDto>(`${BASE_URL}/antibiotics/usage/${id}`);

export const getPatientAntibioticUsage = (admissionId: string) =>
  apiClient.get<AntibioticUsageDto[]>(`${BASE_URL}/admissions/${admissionId}/antibiotics`);

export const reviewAntibiotic = (dto: AntibioticStewardshipReviewDto) =>
  apiClient.post<AntibioticUsageDto>(`${BASE_URL}/antibiotics/review`, dto);

export const getAntibioticStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<AntibioticStatisticsDto>(`${BASE_URL}/antibiotics/statistics`, { params: { fromDate, toDate, departmentId } });

export const getPendingAntibioticReviews = (departmentId?: string) =>
  apiClient.get<AntibioticUsageDto[]>(`${BASE_URL}/antibiotics/pending-reviews`, { params: { departmentId } });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<InfectionControlDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

export const runDailySurveillance = (date: string) =>
  apiClient.post(`${BASE_URL}/surveillance/daily`, { date });

export const getICAlerts = (departmentId?: string, acknowledged?: boolean) =>
  apiClient.get(`${BASE_URL}/alerts`, { params: { departmentId, acknowledged } });

export const acknowledgeAlert = (alertId: string, notes?: string) =>
  apiClient.post(`${BASE_URL}/alerts/${alertId}/acknowledge`, { notes });

export const exportICReport = (fromDate: string, toDate: string, reportType: string, format: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { fromDate, toDate, reportType, format }, responseType: 'blob' });

// #endregion

export default {
  // HAI Surveillance
  getHAICases,
  getHAICaseById,
  getHAICasesByAdmission,
  createHAICase,
  updateHAICase,
  investigateHAICase,
  closeHAICase,
  getActiveHAICases,
  getMDROCases,
  // Isolation
  getIsolationOrders,
  getIsolationOrderById,
  getActiveIsolation,
  createIsolationOrder,
  updateIsolationOrder,
  discontinueIsolation,
  printIsolationSignage,
  // Hand Hygiene
  getHandHygieneObservations,
  getHandHygieneObservationById,
  createHandHygieneObservation,
  updateHandHygieneObservation,
  getHandHygieneStatistics,
  // Outbreak
  getOutbreaks,
  getOutbreakById,
  createOutbreak,
  updateOutbreak,
  updateOutbreakStatus,
  addOutbreakCase,
  addOutbreakTimelineEvent,
  reportOutbreakToAuthority,
  closeOutbreak,
  getOutbreakCases,
  // Environmental
  getEnvironmentalSurveillance,
  getEnvironmentalSurveillanceById,
  createEnvironmentalSurveillance,
  recordEnvironmentalResult,
  scheduleFollowUpSurveillance,
  // Antibiotic Stewardship
  getAntibioticUsage,
  getAntibioticUsageById,
  getPatientAntibioticUsage,
  reviewAntibiotic,
  getAntibioticStatistics,
  getPendingAntibioticReviews,
  // Dashboard
  getDashboard,
  runDailySurveillance,
  getICAlerts,
  acknowledgeAlert,
  exportICReport,
};
