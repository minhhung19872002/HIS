/**
 * API Client cho Phân hệ 14: Vật lý trị liệu/PHCN (Rehabilitation)
 * Module: Rehabilitation
 *
 * ⚠️ Contract đã đối chiếu 1-1 với backend `RehabilitationController.cs` (#418):
 * - Route + request/response shape khớp controller thật (KHÔNG còn route ảo).
 * - Backend trả `status` dạng CHUỖI ("Pending"/"Scheduled"/…) — type là string | number
 *   (number chỉ giữ cho typing legacy của trang v1 sắp retire).
 * - Các hàm create/complete giữ nguyên chữ ký FE cũ, adapter bên trong map sang
 *   đúng request DTO backend (ScheduleSessionRequest, DocumentSessionDto, …).
 */

import apiClient from '../../../services/apiClient';

// ==================== INTERFACES ====================

// #region Referral DTOs (backend: RehabReferralDto)

export interface RehabReferralDto {
  id: string;
  referralCode?: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  patientAge?: number;
  patientGender?: string;
  admissionId?: string;
  visitId?: string;
  sourceDepartment?: string;
  referringDoctor?: string;
  primaryDiagnosis?: string;
  diagnosisICD?: string;
  secondaryDiagnoses?: string[] | string;
  onsetDate?: string;
  medicalHistory?: string;
  currentMedications?: string;
  precautions?: string;
  rehabType?: string; // PT, OT, ST, Combined
  rehabGoals?: string;
  specificRequests?: string;
  urgency?: string; // Routine, Urgent
  status?: string | number; // backend: "Pending"|"Accepted"|"InProgress"|"Completed"|"Cancelled"
  referralDate?: string;
  acceptedDate?: string;
  acceptedBy?: string;
  /** @deprecated các field dưới đây backend KHÔNG trả — chỉ giữ cho trang v1 legacy compile */
  rehabTypeName?: string;
  priority?: number;
  priorityName?: string;
  statusName?: string;
  diagnosis?: string;
  diagnosisIcd?: string;
  referringDepartmentName?: string;
  referringDoctorName?: string;
  referringDepartmentId?: string;
  referringDoctorId?: string;
  referralReason?: string;
  goals?: string;
  frequency?: string;
  duration?: string;
  contraindications?: string;
  scheduledDate?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  medicalRecordCode?: string;
  surgeryHistory?: string;
  acceptedByName?: string;
  notes?: string;
}

/** backend: CreateRehabReferralDto */
export interface CreateRehabReferralDto {
  patientId: string;
  admissionId?: string;
  visitId?: string;
  primaryDiagnosis: string;
  diagnosisICD?: string;
  onsetDate?: string;
  medicalHistory?: string;
  currentMedications?: string;
  precautions?: string;
  rehabType: string;
  rehabGoals?: string;
  specificRequests?: string;
  urgency?: string;
}

/** ⚠️ backend GET /referrals hiện BỎ QUA filter (trả toàn bộ pending) — params giữ cho forward-compat */
export interface ReferralSearchDto {
  keyword?: string;
  rehabType?: string;
  status?: number | string;
  priority?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Assessment DTOs

/** backend: FunctionalAssessmentDto */
export interface FunctionalAssessmentDto {
  id: string;
  referralId: string;
  patientId?: string;
  patientName?: string;
  assessmentDate?: string;
  assessmentType?: string; // Initial, Progress, Discharge
  barthelIndex?: number;
  fimScore?: number;
  moCAScore?: number;
  mmseScore?: number;
  bergBalanceScore?: number;
  tinettiFalls?: string;
  sixMinuteWalkDistance?: number;
  timedUpAndGo?: number;
  muscleTone?: string;
  manualMuscleTest?: Record<string, number>;
  rangeOfMotion?: Record<string, string>;
  coordination?: string;
  balance?: string;
  gait?: string;
  transfers?: string;
  lightTouch?: string;
  proprioception?: string;
  pain?: string;
  feeding?: string;
  grooming?: string;
  bathing?: string;
  dressing?: string;
  toileting?: string;
  mobility?: string;
  speechAssessment?: string;
  languageAssessment?: string;
  swallowingAssessment?: string;
  dysphagiaGrade?: string;
  attention?: string;
  memory?: string;
  executiveFunction?: string;
  perception?: string;
  problemList?: string;
  prognosis?: string;
  recommendedInterventions?: string;
  assessedBy?: string;
  assessorTitle?: string;
}

/** backend: SaveFunctionalAssessmentDto — request thật của POST /assessments */
export interface SaveFunctionalAssessmentDto {
  id?: string;
  referralId: string;
  assessmentType: string;
  barthelIndex?: number;
  fimScore?: number;
  moCAScore?: number;
  bergBalanceScore?: number;
  manualMuscleTest?: Record<string, number>;
  rangeOfMotion?: Record<string, string>;
  gait?: string;
  transfers?: string;
  adlNotes?: string;
  problemList?: string;
  prognosis?: string;
  recommendedInterventions?: string;
}

/** Shape FE-friendly các trang đang build — adapter trong createAssessment() map sang SaveFunctionalAssessmentDto */
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

export interface VitalSignsDto {
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

// #endregion

// #region Treatment Plan DTOs

/** backend: RehabTreatmentPlanDto */
export interface TreatmentPlanDto {
  id: string;
  planCode?: string;
  referralId?: string;
  patientId?: string;
  patientName?: string;
  assessmentId?: string;
  rehabType?: string; // PT, OT, ST
  shortTermGoals?: BackendRehabGoalDto[];
  longTermGoals?: BackendRehabGoalDto[];
  interventions?: RehabInterventionDto[];
  sessionsPerWeek?: number;
  minutesPerSession?: number;
  plannedTotalSessions?: number;
  completedSessions?: number;
  startDate?: string;
  expectedEndDate?: string;
  precautions?: string[];
  contraindications?: string[];
  status?: string | number; // backend: "Active"|"OnHold"|"Completed"|"Discontinued"
  createdBy?: string;
  createdAt?: string;
  lastReviewDate?: string;
  /** @deprecated legacy v1 */
  rehabTypeName?: string;
  statusName?: string;
}

/** backend: RehabGoalDto (khác RehabGoalDto FE-friendly ở trên) */
export interface BackendRehabGoalDto {
  goalNumber: number;
  goalType: string; // ShortTerm, LongTerm
  goalDescription: string;
  measurable?: string;
  targetDate: string;
  status?: string; // NotStarted, InProgress, Achieved, NotAchieved
  progressPercent?: number;
}

/** backend: RehabInterventionDto */
export interface RehabInterventionDto {
  interventionType?: string; // PT, OT, ST
  category?: string;
  interventionName?: string;
  description?: string;
  parameters?: string;
  frequency?: string;
}

/** Shape FE-friendly các trang đang build — adapter trong createTreatmentPlan() map sang request backend */
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

export interface TreatmentInterventionDto {
  id?: string;
  category: string;
  intervention: string;
  description?: string;
  parameters?: string;
  frequency?: string;
  duration?: string;
  precautions?: string;
  isActive: boolean;
}

/** backend: CreateTreatmentPlanDto — request thật của POST/PUT /treatment-plans */
export interface CreateTreatmentPlanRequest {
  referralId: string;
  assessmentId: string;
  shortTermGoals: BackendRehabGoalDto[];
  longTermGoals: BackendRehabGoalDto[];
  interventions: RehabInterventionDto[];
  sessionsPerWeek: number;
  minutesPerSession: number;
  plannedTotalSessions: number;
  startDate: string;
  precautions: string[];
}

// #endregion

// #region Treatment Session DTOs

/** backend: RehabSessionDto */
export interface TreatmentSessionDto {
  id: string;
  sessionCode?: string;
  treatmentPlanId?: string;
  patientId?: string;
  patientName?: string;
  sessionNumber?: number;
  scheduledDate?: string; // DateTime
  scheduledTime?: string; // TimeSpan "HH:mm:ss"
  scheduledDuration?: number;
  therapistName?: string;
  location?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number;
  activities?: SessionActivityDto[];
  patientResponse?: string;
  toleranceLevel?: string; // Good, Fair, Poor
  painLevel?: string;
  vitalSigns?: string;
  clinicalObservations?: string;
  progressNotes?: string;
  homeExercises?: string;
  status?: string | number; // backend: "Scheduled"|"InProgress"|"Completed"|"Cancelled"|"NoShow"
  cancellationReason?: string;
  documentedBy?: string;
  documentedAt?: string;
  /** @deprecated các field dưới đây backend KHÔNG trả — chỉ giữ cho trang v1 legacy compile */
  planId?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  statusName?: string;
  therapistId?: string;
  prePainLevel?: number;
  postPainLevel?: number;
  tolerance?: string;
}

/** backend: SessionActivityDto */
export interface SessionActivityDto {
  activityType?: string;
  activityName?: string;
  parameters?: string;
  durationMinutes?: number;
  patientPerformance?: string;
  notes?: string;
}

/** Shape FE-friendly — adapter trong createSession() map sang ScheduleSessionRequest backend */
export interface CreateTreatmentSessionDto {
  planId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  location: string;
  preVitalSigns?: VitalSignsDto;
  prePainLevel?: number;
  patientStatus?: string;
}

/** Shape FE-friendly — adapter trong completeSession() map sang DocumentSessionDto backend */
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

// #endregion

// #region Progress / Outcome / Dashboard DTOs (backend-true)

/** backend: RehabProgressReportDto — GET /progress/{planId} */
export interface ProgressReportDto {
  treatmentPlanId: string;
  patientId?: string;
  patientName?: string;
  reportDate?: string;
  totalPlannedSessions?: number;
  completedSessions?: number;
  cancelledSessions?: number;
  noShowSessions?: number;
  attendanceRate?: number;
  goalProgress?: GoalProgressDto[];
  scoreTrend?: FunctionalScoreTrendDto[];
  overallProgress?: string; // Improving, Stable, Declining
  therapistNotes?: string;
  recommendations?: string;
  requiresPlanModification?: boolean;
}

export interface GoalProgressDto {
  goalNumber?: number;
  goalDescription?: string;
  status?: string;
  progressPercent?: number;
  notes?: string;
}

export interface FunctionalScoreTrendDto {
  date?: string;
  scaleType?: string;
  score?: number;
  maxScore?: number;
}

/** backend: RehabOutcomeDto — GET /outcome/{planId} · POST /discharge/{planId} */
export interface RehabOutcomeDto {
  id?: string;
  treatmentPlanId?: string;
  patientId?: string;
  patientName?: string;
  admissionBarthel?: number;
  dischargeBarthel?: number;
  barthelChange?: number;
  admissionFIM?: number;
  dischargeFIM?: number;
  fimChange?: number;
  totalGoals?: number;
  achievedGoals?: number;
  partiallyAchievedGoals?: number;
  notAchievedGoals?: number;
  goalAchievementRate?: number;
  dischargeStatus?: string; // Completed, Discharged, Transferred, Discontinued
  dischargeDestination?: string;
  functionalStatus?: string;
  assistanceLevel?: string;
  continueOutpatient?: boolean;
  homeProgram?: string;
  equipmentNeeded?: string;
  followUpInstructions?: string;
  dischargeDate?: string;
  dischargedBy?: string;
}

/** backend: RehabDashboardDto — GET /dashboard · GET /statistics */
export interface RehabDashboardDto {
  date?: string;
  todaySessions?: number;
  completedToday?: number;
  inProgressNow?: number;
  upcomingToday?: number;
  activePatients?: number;
  ptPatients?: number;
  otPatients?: number;
  stPatients?: number;
  pendingReferrals?: number;
  pendingAssessments?: number;
  monthTotalSessions?: number;
  monthCompletedSessions?: number;
  monthAttendanceRate?: number;
  monthNewPatients?: number;
  monthDischarges?: number;
  averageGoalAchievementRate?: number;
  averageFIMGain?: number;
  byTherapist?: TherapistWorkloadDto[];
  alerts?: RehabAlertDto[];
  /** @deprecated các field dưới đây backend KHÔNG trả — chỉ giữ cho trang v1 legacy compile */
  totalActivePatients?: number;
  newReferralsToday?: number;
  dischargesThisWeek?: number;
  scheduledSessionsToday?: number;
  completedSessionsToday?: number;
  cancelledSessionsToday?: number;
  cardiacPatients?: number;
  pulmonaryPatients?: number;
  averageSessionsPerDay?: number;
  cancellationRate?: number;
  noShowRate?: number;
  monthlyDischarges?: number;
  goalAchievementRate?: number;
  patientSatisfaction?: number;
  overdueReassessments?: number;
  authorizationExpiring?: number;
  therapistCaseload?: TherapistCaseloadDto[];
}

export interface TherapistWorkloadDto {
  therapistName?: string;
  specialty?: string;
  todaySessions?: number;
  activePatients?: number;
}

export interface RehabAlertDto {
  alertType?: string;
  patientName?: string;
  message?: string;
  createdAt?: string;
}

/** @deprecated legacy v1 */
export interface TherapistCaseloadDto {
  therapistId: string;
  therapistName: string;
  activePatients: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  utilizationRate: number;
}

// #endregion

// #region Common

import type { PagedResultDto } from '../../../types/pagination';
export type { PagedResultDto } from '../../../types/pagination';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** "3 lần/tuần" → 3 · "45 phút" → 45 */
const parseIntLoose = (s?: string): number | undefined => {
  const m = /\d+/.exec(s || '');
  return m ? Number(m[0]) : undefined;
};

// #endregion

// ==================== API FUNCTIONS ====================
// Route đối chiếu 1-1 với RehabilitationController.cs — KHÔNG thêm route backend không có.

const BASE_URL = '/rehabilitation';

// #region Referrals

/** GET /referrals — ⚠️ backend hiện bỏ qua filter, trả danh sách pending (array, KHÔNG paged) */
export const getReferrals = (params?: ReferralSearchDto) =>
  apiClient.get<RehabReferralDto[]>(`${BASE_URL}/referrals`, { params });

export const getReferralById = (id: string) =>
  apiClient.get<RehabReferralDto>(`${BASE_URL}/referrals/${id}`);

export const getPendingReferrals = () =>
  apiClient.get<RehabReferralDto[]>(`${BASE_URL}/referrals/pending`);

export const createReferral = (dto: CreateRehabReferralDto) =>
  apiClient.post<RehabReferralDto>(`${BASE_URL}/referrals`, dto);

/** POST /referrals/{id}/accept — backend không nhận body */
export const acceptReferral = (id: string) =>
  apiClient.post<RehabReferralDto>(`${BASE_URL}/referrals/${id}/accept`);

export const rejectReferral = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/referrals/${id}/reject`, { reason });

export const printReferral = (id: string) =>
  apiClient.get(`${BASE_URL}/referrals/${id}/print-referral`, { responseType: 'blob' });

// #endregion

// #region Assessments

export const getAssessment = (id: string) =>
  apiClient.get<FunctionalAssessmentDto>(`${BASE_URL}/assessments/${id}`);

/** GET /assessments/history/{referralId} */
export const getAssessmentsByReferral = (referralId: string) =>
  apiClient.get<FunctionalAssessmentDto[]>(`${BASE_URL}/assessments/history/${referralId}`);

/** POST /assessments — adapter: CreateFunctionalAssessmentDto (FE) → SaveFunctionalAssessmentDto (backend) */
export const createAssessment = (dto: CreateFunctionalAssessmentDto) => {
  const body: SaveFunctionalAssessmentDto = {
    referralId: dto.referralId,
    assessmentType: dto.assessmentType,
    barthelIndex: dto.barthelIndex,
    fimScore: dto.fimScore,
    bergBalanceScore: dto.bergBalance,
    adlNotes: dto.painLevel != null ? `Mức đau: ${dto.painLevel}/10` : undefined,
    problemList: [...dto.problemList, ...dto.functionalLimitations].filter(Boolean).join('; '),
    prognosis: dto.prognosis,
    recommendedInterventions: dto.recommendations,
  };
  return apiClient.post<FunctionalAssessmentDto>(`${BASE_URL}/assessments`, body);
};

/** POST /assessments với id → update (backend SaveAssessmentAsync upsert theo Id) */
export const saveAssessment = (dto: SaveFunctionalAssessmentDto) =>
  apiClient.post<FunctionalAssessmentDto>(`${BASE_URL}/assessments`, dto);

// #endregion

// #region Treatment Plans

export const getTreatmentPlan = (id: string) =>
  apiClient.get<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${id}`);

/** GET /treatment-plans/active — danh sách KH đang điều trị (Status=Active) */
export const getActiveTreatmentPlans = () =>
  apiClient.get<TreatmentPlanDto[]>(`${BASE_URL}/treatment-plans/active`);

/** POST /treatment-plans — adapter: CreateTreatmentPlanDto (FE) → CreateTreatmentPlanRequest (backend) */
export const createTreatmentPlan = (dto: CreateTreatmentPlanDto) => {
  const body: CreateTreatmentPlanRequest = {
    referralId: dto.referralId,
    assessmentId: dto.assessmentId || EMPTY_GUID,
    shortTermGoals: [],
    longTermGoals: dto.goals.map((g, i) => ({
      goalNumber: i + 1,
      goalType: 'LongTerm',
      goalDescription: g.description,
      measurable: g.measurableCriteria || '',
      targetDate: g.targetDate || new Date().toISOString(),
      status: 'InProgress',
    })),
    interventions: dto.interventions.map((iv) => ({
      interventionType: iv.category,
      category: iv.category,
      interventionName: iv.intervention,
      description: iv.description || '',
      parameters: iv.parameters || '',
      frequency: iv.frequency || '',
    })),
    sessionsPerWeek: dto.frequency === 'Hàng ngày' ? 7 : (parseIntLoose(dto.frequency) ?? 3),
    minutesPerSession: parseIntLoose(dto.duration) ?? 45,
    plannedTotalSessions: dto.plannedSessions,
    startDate: dto.startDate,
    precautions: dto.precautions ? [dto.precautions] : [],
  };
  return apiClient.post<TreatmentPlanDto>(`${BASE_URL}/treatment-plans`, body);
};

/** PUT /treatment-plans/{id} — backend chỉ dùng sessionsPerWeek/minutesPerSession/plannedTotalSessions */
export const updateTreatmentPlan = (id: string, body: CreateTreatmentPlanRequest) =>
  apiClient.put<TreatmentPlanDto>(`${BASE_URL}/treatment-plans/${id}`, body);

/** PUT /treatment-plans/{planId}/goals/{goalNumber} */
export const updateGoalProgress = (planId: string, goalNumber: number, progressPercent: number, notes?: string) =>
  apiClient.put<boolean>(`${BASE_URL}/treatment-plans/${planId}/goals/${goalNumber}`, { progressPercent, notes: notes || '' });

// #endregion

// #region Treatment Sessions

/** GET /sessions?fromDate&toDate&therapistId */
export const getSessions = (fromDate: string, toDate: string, therapistId?: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/sessions`, { params: { fromDate, toDate, therapistId } });

export const getSession = (id: string) =>
  apiClient.get<TreatmentSessionDto>(`${BASE_URL}/sessions/${id}`);

export const getSessionsByDate = (date: string, therapistId?: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/sessions/by-date`, { params: { date, therapistId } });

/** GET /sessions/patient/{referralId} — buổi tập theo giấy giới thiệu */
export const getPatientSessions = (referralId: string) =>
  apiClient.get<TreatmentSessionDto[]>(`${BASE_URL}/sessions/patient/${referralId}`);

/** POST /sessions/schedule — adapter: CreateTreatmentSessionDto (FE) → ScheduleSessionRequest (backend {planId,date,time,location}) */
export const createSession = (dto: CreateTreatmentSessionDto) =>
  apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions/schedule`, {
    planId: dto.planId,
    date: dto.sessionDate,
    time: dto.startTime.length === 5 ? `${dto.startTime}:00` : dto.startTime, // TimeSpan cần "HH:mm:ss"
    location: dto.location,
  });

/** POST /sessions/{id}/document — adapter: CompleteTreatmentSessionDto (FE) → DocumentSessionDto (backend) */
export const completeSession = (dto: CompleteTreatmentSessionDto) => {
  const now = new Date().toISOString();
  return apiClient.post<TreatmentSessionDto>(`${BASE_URL}/sessions/${dto.sessionId}/document`, {
    sessionId: dto.sessionId,
    actualStartTime: now, // backend tự set EndTime = giờ hiện tại, 2 field này chỉ cần hợp lệ để bind
    actualEndTime: now,
    activities: [],
    patientResponse: dto.patientResponse,
    toleranceLevel: dto.tolerance,
    painLevel: dto.postPainLevel != null ? String(dto.postPainLevel) : '',
    vitalSigns: '',
    clinicalObservations: dto.complications || '',
    progressNotes: dto.progressNotes,
    homeExercises: '',
  });
};

export const cancelSession = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/sessions/${id}/cancel`, { reason });

/** POST /sessions/{id}/no-show — backend không nhận body */
export const markNoShow = (id: string) =>
  apiClient.post<boolean>(`${BASE_URL}/sessions/${id}/no-show`);

// #endregion

// #region Progress / Outcome / Discharge

/** GET /progress/{planId} */
export const getProgressReport = (planId: string) =>
  apiClient.get<ProgressReportDto>(`${BASE_URL}/progress/${planId}`);

/** GET /outcome/{planId} */
export const getOutcome = (planId: string) =>
  apiClient.get<RehabOutcomeDto>(`${BASE_URL}/outcome/${planId}`);

/** POST /discharge/{planId} — backend chỉ dùng functionalStatus làm DischargeSummary */
export const dischargePatient = (planId: string, outcome: Partial<RehabOutcomeDto>) =>
  apiClient.post<RehabOutcomeDto>(`${BASE_URL}/discharge/${planId}`, outcome);

// #endregion

// #region Dashboard & Statistics

export const getDashboard = (date?: string) =>
  apiClient.get<RehabDashboardDto>(`${BASE_URL}/dashboard`, { params: { date } });

/** GET /statistics — backend trả cùng shape dashboard */
export const getRehabStatistics = (fromDate?: string, toDate?: string) =>
  apiClient.get<RehabDashboardDto>(`${BASE_URL}/statistics`, { params: { fromDate, toDate } });

// #endregion

export default {
  // Referrals
  getReferrals,
  getReferralById,
  getPendingReferrals,
  createReferral,
  acceptReferral,
  rejectReferral,
  printReferral,
  // Assessments
  getAssessment,
  getAssessmentsByReferral,
  createAssessment,
  saveAssessment,
  // Treatment Plans
  getTreatmentPlan,
  getActiveTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
  updateGoalProgress,
  // Sessions
  getSessions,
  getSession,
  getSessionsByDate,
  getPatientSessions,
  createSession,
  completeSession,
  cancelSession,
  markNoShow,
  // Progress / Outcome
  getProgressReport,
  getOutcome,
  dischargePatient,
  // Dashboard
  getDashboard,
  getRehabStatistics,
};
