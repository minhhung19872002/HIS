/**
 * API Client cho Phân hệ 14: Vật lý trị liệu/PHCN (Rehabilitation)
 * Module: Rehabilitation
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Referral DTOs

export interface RehabReferralDto {
  id: string;
  referralCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDepartmentId: string;
  referringDepartmentName: string;
  admissionId?: string;
  medicalRecordCode?: string;
  rehabType: string; // PT, OT, ST, Cardiac, Pulmonary
  rehabTypeName: string;
  priority: number; // 1-Routine, 2-Urgent, 3-Stat
  priorityName: string;
  diagnosis: string;
  diagnosisIcd?: string;
  secondaryDiagnoses?: string;
  surgeryHistory?: string;
  precautions?: string;
  contraindications?: string;
  referralReason: string;
  goals?: string;
  frequency?: string;
  duration?: string;
  referralDate: string;
  acceptedDate?: string;
  acceptedBy?: string;
  acceptedByName?: string;
  scheduledDate?: string;
  status: number;
  statusName: string;
  notes?: string;
}

export interface CreateRehabReferralDto {
  patientId: string;
  admissionId?: string;
  rehabType: string;
  priority: number;
  diagnosis: string;
  diagnosisIcd?: string;
  secondaryDiagnoses?: string;
  surgeryHistory?: string;
  precautions?: string;
  contraindications?: string;
  referralReason: string;
  goals?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface ReferralSearchDto {
  keyword?: string;
  rehabType?: string;
  status?: number;
  priority?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Assessment DTOs

export interface FunctionalAssessmentDto {
  id: string;
  assessmentCode: string;
  referralId: string;
  patientId: string;
  patientName: string;
  assessedBy: string;
  assessedByName: string;
  assessmentDate: string;
  assessmentType: string; // Initial, Progress, Discharge
  assessmentTypeName: string;
  // Medical history
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  surgicalHistory?: string;
  medications?: string;
  allergies?: string;
  socialHistory?: string;
  // Physical examination
  vitalSigns?: VitalSignsDto;
  painLevel?: number;
  painLocation?: string;
  painCharacter?: string;
  rangeOfMotion?: RangeOfMotionDto[];
  muscleStrength?: MuscleStrengthDto[];
  sensation?: string;
  reflexes?: string;
  balance?: string;
  coordination?: string;
  gait?: string;
  posture?: string;
  // Standardized assessments
  barthelIndex?: number;
  fimScore?: number;
  fimMotorScore?: number;
  fimCognitiveScore?: number;
  bergBalance?: number;
  tinettiScore?: number;
  tugTest?: number; // Timed Up and Go (seconds)
  sixMinuteWalk?: number; // meters
  mocaScore?: number;
  mmseScore?: number;
  phq9Score?: number;
  // Function-specific
  adlStatus?: string;
  iadlStatus?: string;
  mobilityStatus?: string;
  transferStatus?: string;
  ambulationStatus?: string;
  equipmentNeeds?: string[];
  homeAccessibility?: string;
  // Assessment summary
  problemList: string[];
  functionalLimitations: string[];
  rehabPotential: string;
  prognosis: string;
  goals: RehabGoalDto[];
  recommendations: string;
  status: number;
  statusName: string;
}

export interface VitalSignsDto {
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

export interface RangeOfMotionDto {
  joint: string;
  movement: string;
  activeRom?: number;
  passiveRom?: number;
  normalRom: number;
  painOnMovement: boolean;
  notes?: string;
}

export interface MuscleStrengthDto {
  muscle: string;
  side: string; // Left, Right, Bilateral
  grade: number; // 0-5 MMT
  notes?: string;
}

export interface RehabGoalDto {
  id?: string;
  goalType: string; // STG (Short-term), LTG (Long-term)
  category: string;
  description: string;
  targetDate?: string;
  measurableCriteria?: string;
  achievedDate?: string;
  achievementPct?: number;
  status: string; // Active, Achieved, Modified, Discontinued
}

export interface CreateFunctionalAssessmentDto {
  referralId: string;
  assessmentType: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  painLevel?: number;
  painLocation?: string;
  rangeOfMotion?: RangeOfMotionDto[];
  muscleStrength?: MuscleStrengthDto[];
  barthelIndex?: number;
  fimScore?: number;
  bergBalance?: number;
  problemList: string[];
  functionalLimitations: string[];
  rehabPotential: string;
  prognosis: string;
  goals: RehabGoalDto[];
  recommendations: string;
}

// #endregion

// #region Treatment Plan DTOs

export interface TreatmentPlanDto {
  id: string;
  planCode: string;
  referralId: string;
  assessmentId: string;
  patientId: string;
  patientName: string;
  createdBy: string;
  createdByName: string;
  createdDate: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  rehabType: string;
  rehabTypeName: string;
  diagnosis: string;
  diagnosisIcd?: string;
  precautions?: string;
  contraindications?: string;
  goals: RehabGoalDto[];
  interventions: TreatmentInterventionDto[];
  frequency: string;
  duration: string;
  plannedSessions: number;
  completedSessions: number;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  dischargeDisposition?: string;
  dischargePlan?: string;
  homeProgram?: string;
  followUpPlan?: string;
  status: number;
  statusName: string;
  notes?: string;
}

export interface TreatmentInterventionDto {
  id?: string;
  category: string; // Therapeutic Exercise, Manual Therapy, Modalities, etc.
  intervention: string;
  description?: string;
  parameters?: string;
  frequency?: string;
  duration?: string;
  precautions?: string;
  isActive: boolean;
}

export interface CreateTreatmentPlanDto {
  referralId: string;
  assessmentId: string;
  diagnosis: string;
  diagnosisIcd?: string;
  precautions?: string;
  contraindications?: string;
  goals: RehabGoalDto[];
  interventions: TreatmentInterventionDto[];
  frequency: string;
  duration: string;
  plannedSessions: number;
  startDate: string;
  notes?: string;
}

export interface UpdateTreatmentPlanDto {
  planId: string;
  goals?: RehabGoalDto[];
  interventions?: TreatmentInterventionDto[];
  frequency?: string;
  duration?: string;
  plannedSessions?: number;
  notes?: string;
}

// #endregion

// #region Treatment Session DTOs

export interface TreatmentSessionDto {
  id: string;
  sessionCode: string;
  planId: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  sessionNumber: number;
  sessionDate: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location: string;
  // Pre-session assessment
  preVitalSigns?: VitalSignsDto;
  prePainLevel?: number;
  patientStatus?: string;
  // Session content
  interventionsPerformed: SessionInterventionDto[];
  exercisesPerformed: ExercisePerformedDto[];
  modalitiesUsed: ModalityUsedDto[];
  // Post-session assessment
  postVitalSigns?: VitalSignsDto;
  postPainLevel?: number;
  patientResponse: string;
  tolerance: string;
  complications?: string;
  // Progress
  goalsAddressed: string[];
  progressNotes: string;
  objectiveMeasures?: string;
  // Next session
  homeExerciseReviewed: boolean;
  homeExerciseUpdated: boolean;
  nextSessionPlan?: string;
  // Billing
  cptCodes?: string[];
  units?: number;
  status: number;
  statusName: string;
  supervisedBy?: string;
  supervisedByName?: string;
}

export interface SessionInterventionDto {
  interventionId: string;
  intervention: string;
  category: string;
  parameters?: string;
  duration?: number;
  sets?: number;
  reps?: number;
  resistance?: string;
  notes?: string;
}

export interface ExercisePerformedDto {
  exerciseName: string;
  sets: number;
  reps: number;
  resistance?: string;
  assistanceLevel?: string;
  notes?: string;
}

export interface ModalityUsedDto {
  modality: string;
  area: string;
  parameters: string;
  duration: number;
  response?: string;
}

export interface CreateTreatmentSessionDto {
  planId: string;
  sessionDate: string;
  startTime: string;
  location: string;
  preVitalSigns?: VitalSignsDto;
  prePainLevel?: number;
  patientStatus?: string;
}

export interface CompleteTreatmentSessionDto {
  sessionId: string;
  endTime: string;
  interventionsPerformed: SessionInterventionDto[];
  exercisesPerformed?: ExercisePerformedDto[];
  modalitiesUsed?: ModalityUsedDto[];
  postVitalSigns?: VitalSignsDto;
  postPainLevel?: number;
  patientResponse: string;
  tolerance: string;
  complications?: string;
  goalsAddressed: string[];
  progressNotes: string;
  nextSessionPlan?: string;
  homeExerciseReviewed: boolean;
  homeExerciseUpdated: boolean;
  cptCodes?: string[];
  units?: number;
}

// #endregion

// #region Progress Report DTOs

export interface ProgressReportDto {
  id: string;
  reportCode: string;
  planId: string;
  patientId: string;
  patientName: string;
  reportType: string; // Progress, Discharge, Re-evaluation
  reportTypeName: string;
  reportDate: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  preparedBy: string;
  preparedByName: string;
  // Summary
  diagnosis: string;
  treatmentFrequency: string;
  sessionsCompleted: number;
  sessionsMissed: number;
  attendanceRate: number;
  // Objective measures comparison
  initialAssessment: AssessmentSummaryDto;
  currentAssessment: AssessmentSummaryDto;
  changeFromInitial: AssessmentChangeDto;
  // Goals progress
  goalsProgress: GoalProgressDto[];
  overallGoalAchievement: number;
  // Functional status
  currentFunctionalStatus: string;
  functionalImprovements: string[];
  remainingLimitations: string[];
  // Plan
  continueCurrentPlan: boolean;
  planModifications?: string;
  additionalInterventions?: string;
  estimatedDischargeDate?: string;
  dischargeRecommendations?: string;
  homeProgram?: string;
  followUpNeeds?: string;
  // Prognosis
  prognosis: string;
  prognosisRationale?: string;
  status: number;
  statusName: string;
}

export interface AssessmentSummaryDto {
  date: string;
  barthelIndex?: number;
  fimTotal?: number;
  fimMotor?: number;
  fimCognitive?: number;
  bergBalance?: number;
  tugTest?: number;
  sixMinuteWalk?: number;
  painLevel?: number;
  otherMeasures?: { [key: string]: number };
}

export interface AssessmentChangeDto {
  barthelIndexChange?: number;
  fimTotalChange?: number;
  bergBalanceChange?: number;
  tugTestChange?: number;
  sixMinuteWalkChange?: number;
  painLevelChange?: number;
}

export interface GoalProgressDto {
  goalId: string;
  goalDescription: string;
  goalType: string;
  targetDate?: string;
  achievementPct: number;
  status: string;
  progressNotes?: string;
}

export interface CreateProgressReportDto {
  planId: string;
  reportType: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  currentAssessment: AssessmentSummaryDto;
  goalsProgress: GoalProgressDto[];
  currentFunctionalStatus: string;
  functionalImprovements: string[];
  remainingLimitations: string[];
  continueCurrentPlan: boolean;
  planModifications?: string;
  prognosis: string;
  prognosisRationale?: string;
}

// #endregion

// #region Outcome DTOs

export interface RehabOutcomeDto {
  id: string;
  planId: string;
  patientId: string;
  patientName: string;
  rehabType: string;
  diagnosis: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  dischargeDisposition: string;
  dischargeDispositionName: string;
  // Functional outcomes
  initialFim: number;
  dischargeFim: number;
  fimGain: number;
  fimEfficiency: number;
  initialBarthel: number;
  dischargeBarthel: number;
  barthelGain: number;
  // Goals
  totalGoals: number;
  goalsAchieved: number;
  goalAchievementRate: number;
  // Patient satisfaction
  satisfactionScore?: number;
  patientFeedback?: string;
  // Follow-up
  followUpScheduled: boolean;
  followUpDate?: string;
  returnToWork?: boolean;
  returnToWorkDate?: string;
  communityReintegration?: string;
}

export interface RehabStatisticsDto {
  fromDate: string;
  toDate: string;
  totalReferrals: number;
  completedCases: number;
  averageLOS: number;
  averageFIMGain: number;
  averageFIMEfficiency: number;
  averageGoalAchievement: number;
  averageSatisfaction?: number;
  byRehabType: RehabTypeStatDto[];
  byDiagnosis: DiagnosisStatDto[];
  byDisposition: DispositionStatDto[];
  trend: RehabTrendDto[];
}

export interface RehabTypeStatDto {
  rehabType: string;
  rehabTypeName: string;
  caseCount: number;
  averageSessions: number;
  averageFIMGain: number;
  goalAchievementRate: number;
}

export interface DiagnosisStatDto {
  diagnosisGroup: string;
  caseCount: number;
  averageLOS: number;
  averageFIMGain: number;
}

export interface DispositionStatDto {
  disposition: string;
  dispositionName: string;
  count: number;
  percentage: number;
}

export interface RehabTrendDto {
  period: string;
  caseCount: number;
  averageFIMGain: number;
  goalAchievementRate: number;
}

// #endregion

// #region Dashboard DTOs

export interface RehabDashboardDto {
  date: string;
  // Caseload
  totalActivePatients: number;
  newReferralsToday: number;
  pendingReferrals: number;
  dischargesThisWeek: number;
  // Today's schedule
  scheduledSessionsToday: number;
  completedSessionsToday: number;
  cancelledSessionsToday: number;
  // By type
  ptPatients: number;
  otPatients: number;
  stPatients: number;
  cardiacPatients: number;
  pulmonaryPatients: number;
  // Performance
  averageSessionsPerDay: number;
  cancellationRate: number;
  noShowRate: number;
  // Outcomes
  monthlyDischarges: number;
  averageFIMGain: number;
  goalAchievementRate: number;
  patientSatisfaction?: number;
  // Alerts
  overdueReassessments: number;
  authorizationExpiring: number;
  // By therapist
  therapistCaseload: TherapistCaseloadDto[];
}

export interface TherapistCaseloadDto {
  therapistId: string;
  therapistName: string;
  activePatients: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  utilizationRate: number;
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

const BASE_URL = '/api/rehabilitation';

// #region Referrals

export const getReferrals = (params: ReferralSearchDto) =>
  apiClient.get<PagedResultDto<RehabReferralDto>>(`${BASE_URL}/referrals`, { params });

export const getReferralById = (id: string) =>
  apiClient.get<RehabReferralDto>(`${BASE_URL}/referrals/${id}`);

export const getPatientReferrals = (patientId: string) =>
  apiClient.get<RehabReferralDto[]>(`${BASE_URL}/patients/${patientId}/referrals`);

export const createReferral = (dto: CreateRehabReferralDto) =>
  apiClient.post<RehabReferralDto>(`${BASE_URL}/referrals`, dto);

export const updateReferral = (id: string, dto: CreateRehabReferralDto) =>
  apiClient.put<RehabReferralDto>(`${BASE_URL}/referrals/${id}`, dto);

export const acceptReferral = (id: string, scheduledDate?: string) =>
  apiClient.post<RehabReferralDto>(`${BASE_URL}/referrals/${id}/accept`, { scheduledDate });

export const rejectReferral = (id: string, reason: string) =>
  apiClient.post<RehabReferralDto>(`${BASE_URL}/referrals/${id}/reject`, { reason });

export const getPendingReferrals = (rehabType?: string) =>
  apiClient.get<RehabReferralDto[]>(`${BASE_URL}/referrals/pending`, { params: { rehabType } });

// #endregion

// #region Assessments

export const getAssessment = (id: string) =>
  apiClient.get<FunctionalAssessmentDto>(`${BASE_URL}/assessments/${id}`);

export const getAssessmentsByReferral = (referralId: string) =>
  apiClient.get<FunctionalAssessmentDto[]>(`${BASE_URL}/referrals/${referralId}/assessments`);

export const createAssessment = (dto: CreateFunctionalAssessmentDto) =>
  apiClient.post<FunctionalAssessmentDto>(`${BASE_URL}/assessments`, dto);

export const updateAssessment = (id: string, dto: CreateFunctionalAssessmentDto) =>
  apiClient.put<FunctionalAssessmentDto>(`${BASE_URL}/assessments/${id}`, dto);

export const getPatientAssessmentHistory = (patientId: string) =>
  apiClient.get<FunctionalAssessmentDto[]>(`${BASE_URL}/patients/${patientId}/assessments`);

export const printAssessmentReport = (id: string) =>
  apiClient.get(`${BASE_URL}/assessments/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Treatment Plans

export const getTreatmentPlan = (id: string) =>
  apiClient.get<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${id}`);

export const getTreatmentPlanByReferral = (referralId: string) =>
  apiClient.get<TreatmentPlanDto>(`${BASE_URL}/referrals/${referralId}/treatment-plan`);

export const createTreatmentPlan = (dto: CreateTreatmentPlanDto) =>
  apiClient.post<TreatmentPlanDto>(`${BASE_URL}/treatment-plans`, dto);

export const updateTreatmentPlan = (dto: UpdateTreatmentPlanDto) =>
  apiClient.put<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${dto.planId}`, dto);

export const approveTreatmentPlan = (id: string) =>
  apiClient.post<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${id}/approve`);

export const dischargeTreatmentPlan = (id: string, disposition: string, notes?: string) =>
  apiClient.post<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${id}/discharge`, { disposition, notes });

export const getActiveTreatmentPlans = (therapistId?: string) =>
  apiClient.get<TreatmentPlanDto[]>(`${BASE_URL}/treatment-plans/active`, { params: { therapistId } });

// #endregion

// #region Treatment Sessions

export const getSessions = (planId: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/treatment-plans/${planId}/sessions`);

export const getSession = (id: string) =>
  apiClient.get<TreatmentSessionDto>(`${BASE_URL}/sessions/${id}`);

export const getSessionsByDate = (date: string, therapistId?: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/sessions/by-date`, { params: { date, therapistId } });

export const createSession = (dto: CreateTreatmentSessionDto) =>
  apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions`, dto);

export const completeSession = (dto: CompleteTreatmentSessionDto) =>
  apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions/complete`, dto);

export const cancelSession = (id: string, reason: string) =>
  apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions/${id}/cancel`, { reason });

export const markNoShow = (id: string, notes?: string) =>
  apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions/${id}/no-show`, { notes });

export const getTherapistSchedule = (therapistId: string, fromDate: string, toDate: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/therapists/${therapistId}/schedule`, { params: { fromDate, toDate } });

export const printSessionNote = (id: string) =>
  apiClient.get(`${BASE_URL}/sessions/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Progress Reports

export const getProgressReports = (planId: string) =>
  apiClient.get<ProgressReportDto[]>(`${BASE_URL}/treatment-plans/${planId}/progress-reports`);

export const getProgressReport = (id: string) =>
  apiClient.get<ProgressReportDto>(`${BASE_URL}/progress-reports/${id}`);

export const createProgressReport = (dto: CreateProgressReportDto) =>
  apiClient.post<ProgressReportDto>(`${BASE_URL}/progress-reports`, dto);

export const updateProgressReport = (id: string, dto: CreateProgressReportDto) =>
  apiClient.put<ProgressReportDto>(`${BASE_URL}/progress-reports/${id}`, dto);

export const printProgressReport = (id: string) =>
  apiClient.get(`${BASE_URL}/progress-reports/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Outcomes

export const getOutcome = (planId: string) =>
  apiClient.get<RehabOutcomeDto>(`${BASE_URL}/treatment-plans/${planId}/outcome`);

export const getOutcomeStatistics = (fromDate: string, toDate: string, rehabType?: string) =>
  apiClient.get<RehabStatisticsDto>(`${BASE_URL}/outcomes/statistics`, { params: { fromDate, toDate, rehabType } });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, therapistId?: string) =>
  apiClient.get<RehabDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, therapistId } });

export const getRehabStatistics = (fromDate: string, toDate: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate } });

export const exportRehabReport = (fromDate: string, toDate: string, reportType: string, format: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { fromDate, toDate, reportType, format }, responseType: 'blob' });

// #endregion

export default {
  // Referrals
  getReferrals,
  getReferralById,
  getPatientReferrals,
  createReferral,
  updateReferral,
  acceptReferral,
  rejectReferral,
  getPendingReferrals,
  // Assessments
  getAssessment,
  getAssessmentsByReferral,
  createAssessment,
  updateAssessment,
  getPatientAssessmentHistory,
  printAssessmentReport,
  // Treatment Plans
  getTreatmentPlan,
  getTreatmentPlanByReferral,
  createTreatmentPlan,
  updateTreatmentPlan,
  approveTreatmentPlan,
  dischargeTreatmentPlan,
  getActiveTreatmentPlans,
  // Sessions
  getSessions,
  getSession,
  getSessionsByDate,
  createSession,
  completeSession,
  cancelSession,
  markNoShow,
  getTherapistSchedule,
  printSessionNote,
  // Progress Reports
  getProgressReports,
  getProgressReport,
  createProgressReport,
  updateProgressReport,
  printProgressReport,
  // Outcomes
  getOutcome,
  getOutcomeStatistics,
  // Dashboard
  getDashboard,
  getRehabStatistics,
  exportRehabReport,
};
