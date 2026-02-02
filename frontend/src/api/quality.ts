/**
 * API Client cho Phân hệ 17: Quản lý Chất lượng (Quality Management)
 * Module: Quality
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Incident Reporting DTOs

export interface IncidentReportDto {
  id: string;
  incidentCode: string;
  incidentDate: string;
  incidentTime: string;
  reportedDate: string;
  reportedBy: string;
  reportedByName: string;
  departmentId: string;
  departmentName: string;
  locationDescription: string;
  incidentType: string; // PatientSafety, MedicationError, Fall, HAI, Equipment, Other
  incidentTypeName: string;
  severity: number; // 1-NearMiss, 2-NoHarm, 3-Minor, 4-Moderate, 5-Major, 6-Catastrophic
  severityName: string;
  // Patient information (if applicable)
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  admissionId?: string;
  // Incident details
  description: string;
  immediateActions?: string;
  witnessNames?: string[];
  staffInvolved?: StaffInvolvedDto[];
  // Investigation
  investigationRequired: boolean;
  investigatorId?: string;
  investigatorName?: string;
  investigationStartDate?: string;
  investigationCompletedDate?: string;
  investigationFindings?: string;
  rootCauseAnalysis?: string;
  rcaMethod?: string; // 5Whys, Fishbone, FMEA
  contributingFactors?: string[];
  // Classification
  isReportable: boolean;
  reportedToAuthority: boolean;
  authorityReportDate?: string;
  authorityReference?: string;
  // Resolution
  correctiveActions: CorrectiveActionDto[];
  preventiveMeasures?: string;
  lessonLearned?: string;
  // Status
  status: number; // 1-Reported, 2-UnderInvestigation, 3-Investigated, 4-ActionPending, 5-Closed
  statusName: string;
  closedDate?: string;
  closedBy?: string;
  closedByName?: string;
  closureNotes?: string;
  // Attachments
  attachments?: AttachmentDto[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffInvolvedDto {
  staffId: string;
  staffName: string;
  role: string;
  department: string;
  involvement: string;
}

export interface CorrectiveActionDto {
  id: string;
  incidentId: string;
  actionDescription: string;
  actionType: string; // Immediate, ShortTerm, LongTerm
  responsiblePersonId: string;
  responsiblePersonName: string;
  dueDate: string;
  completedDate?: string;
  status: number; // 1-Pending, 2-InProgress, 3-Completed, 4-Overdue
  statusName: string;
  verifiedBy?: string;
  verifiedDate?: string;
  effectiveness?: string;
  notes?: string;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

export interface CreateIncidentReportDto {
  incidentDate: string;
  incidentTime: string;
  departmentId: string;
  locationDescription: string;
  incidentType: string;
  severity: number;
  patientId?: string;
  admissionId?: string;
  description: string;
  immediateActions?: string;
  witnessNames?: string[];
  staffInvolved?: StaffInvolvedDto[];
  isReportable: boolean;
  notes?: string;
}

export interface InvestigateIncidentDto {
  incidentId: string;
  investigationFindings: string;
  rootCauseAnalysis?: string;
  rcaMethod?: string;
  contributingFactors?: string[];
  correctiveActions: CreateCorrectiveActionDto[];
  preventiveMeasures?: string;
  lessonLearned?: string;
}

export interface CreateCorrectiveActionDto {
  actionDescription: string;
  actionType: string;
  responsiblePersonId: string;
  dueDate: string;
}

export interface IncidentSearchDto {
  keyword?: string;
  departmentId?: string;
  incidentType?: string;
  severity?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Quality Indicator DTOs

export interface QualityIndicatorDto {
  id: string;
  indicatorCode: string;
  name: string;
  description?: string;
  category: string; // Clinical, Safety, Experience, Efficiency, Access
  categoryName: string;
  domain: string; // Structure, Process, Outcome
  domainName: string;
  measureType: string; // Rate, Ratio, Count, Score
  numeratorDefinition: string;
  denominatorDefinition?: string;
  exclusions?: string;
  dataSource: string;
  collectionFrequency: string; // Daily, Weekly, Monthly, Quarterly
  targetValue: number;
  targetType: string; // AtLeast, AtMost, EqualTo
  warningThreshold?: number;
  criticalThreshold?: number;
  benchmark?: number;
  benchmarkSource?: string;
  departmentId?: string;
  departmentName?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface QualityIndicatorValueDto {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  periodType: string; // Daily, Weekly, Monthly, Quarterly, Annual
  periodStart: string;
  periodEnd: string;
  numerator: number;
  denominator?: number;
  value: number;
  target: number;
  variance: number;
  variancePct: number;
  status: string; // Met, Warning, Critical
  statusName: string;
  trend: string; // Improving, Stable, Declining
  trendName: string;
  previousValue?: number;
  dataCollectedBy: string;
  dataCollectedByName: string;
  dataCollectedAt: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  comments?: string;
  actionRequired?: string;
}

export interface CreateQualityIndicatorDto {
  indicatorCode: string;
  name: string;
  description?: string;
  category: string;
  domain: string;
  measureType: string;
  numeratorDefinition: string;
  denominatorDefinition?: string;
  exclusions?: string;
  dataSource: string;
  collectionFrequency: string;
  targetValue: number;
  targetType: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  departmentId?: string;
  responsiblePersonId?: string;
  notes?: string;
}

export interface RecordIndicatorValueDto {
  indicatorId: string;
  periodStart: string;
  periodEnd: string;
  numerator: number;
  denominator?: number;
  comments?: string;
}

export interface QITrendDto {
  indicatorId: string;
  indicatorName: string;
  periods: QIPeriodDataDto[];
  target: number;
  overallTrend: string;
}

export interface QIPeriodDataDto {
  period: string;
  value: number;
  status: string;
}

// #endregion

// #region Internal Audit DTOs

export interface InternalAuditDto {
  id: string;
  auditCode: string;
  auditType: string; // Scheduled, Unscheduled, FollowUp, Surveillance
  auditTypeName: string;
  title: string;
  scope: string;
  objective: string;
  criteria: string;
  departmentId: string;
  departmentName: string;
  scheduledDate: string;
  actualDate?: string;
  leadAuditorId: string;
  leadAuditorName: string;
  auditTeam: AuditTeamMemberDto[];
  auditees: AuditeeDto[];
  // Findings
  findings: AuditFindingDto[];
  totalFindings: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  observations: number;
  // Summary
  executiveSummary?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  recommendations?: string[];
  overallConclusion?: string;
  // Closure
  capaRequired: boolean;
  capaId?: string;
  followUpAuditRequired: boolean;
  followUpAuditDate?: string;
  status: number; // 1-Planned, 2-InProgress, 3-Completed, 4-FollowUp, 5-Closed
  statusName: string;
  closedDate?: string;
  closedBy?: string;
  attachments?: AttachmentDto[];
  notes?: string;
  createdAt: string;
}

export interface AuditTeamMemberDto {
  staffId: string;
  staffName: string;
  role: string; // LeadAuditor, Auditor, Observer, TechnicalExpert
  qualifications?: string;
}

export interface AuditeeDto {
  staffId: string;
  staffName: string;
  position: string;
  department: string;
}

export interface AuditFindingDto {
  id: string;
  auditId: string;
  findingNumber: string;
  findingType: string; // Critical, Major, Minor, Observation, Opportunity
  findingTypeName: string;
  area: string;
  clauseReference?: string;
  findingDescription: string;
  evidence: string;
  rootCause?: string;
  risk?: string;
  recommendedAction?: string;
  auditeeResponse?: string;
  responseDate?: string;
  status: number; // 1-Open, 2-ActionPending, 3-Verified, 4-Closed
  statusName: string;
  correctiveAction?: CorrectiveActionDto;
}

export interface CreateAuditDto {
  auditType: string;
  title: string;
  scope: string;
  objective: string;
  criteria: string;
  departmentId: string;
  scheduledDate: string;
  leadAuditorId: string;
  auditTeam: AuditTeamMemberDto[];
  notes?: string;
}

export interface AddAuditFindingDto {
  auditId: string;
  findingType: string;
  area: string;
  clauseReference?: string;
  findingDescription: string;
  evidence: string;
  rootCause?: string;
  risk?: string;
  recommendedAction?: string;
}

export interface CompleteAuditDto {
  auditId: string;
  executiveSummary: string;
  strengths?: string[];
  areasForImprovement?: string[];
  recommendations?: string[];
  overallConclusion: string;
  capaRequired: boolean;
  followUpAuditRequired: boolean;
  followUpAuditDate?: string;
}

// #endregion

// #region Patient Satisfaction DTOs

export interface PatientSurveyDto {
  id: string;
  surveyCode: string;
  surveyTemplateId: string;
  surveyTemplateName: string;
  surveyType: string; // Inpatient, Outpatient, ED, Telemedicine
  surveyTypeName: string;
  patientId?: string;
  patientCode?: string;
  admissionId?: string;
  visitId?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  surveyDate: string;
  completedDate?: string;
  completionMethod: string; // Paper, Tablet, Online, Phone
  responses: SurveyResponseDto[];
  overallScore: number;
  maxScore: number;
  satisfactionPct: number;
  npsScore?: number;
  npsCategory?: string; // Promoter, Passive, Detractor
  comments?: string;
  complaintsRaised: boolean;
  complaintDetails?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  followUpCompletedDate?: string;
  status: number; // 1-Pending, 2-Completed, 3-FollowedUp
  statusName: string;
}

export interface SurveyResponseDto {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseType: string; // Rating, MultiChoice, Text, YesNo
  ratingValue?: number;
  maxRating?: number;
  selectedOptions?: string[];
  textResponse?: string;
  booleanResponse?: boolean;
}

export interface SurveyTemplateDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  surveyType: string;
  questions: SurveyQuestionDto[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SurveyQuestionDto {
  id: string;
  questionOrder: number;
  questionText: string;
  category: string;
  responseType: string;
  isRequired: boolean;
  maxRating?: number;
  options?: string[];
}

export interface CreateSurveyDto {
  surveyTemplateId: string;
  patientId?: string;
  admissionId?: string;
  visitId?: string;
  departmentId?: string;
  doctorId?: string;
  responses: SurveyResponseDto[];
  completionMethod: string;
  comments?: string;
}

export interface SatisfactionStatisticsDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  totalSurveys: number;
  completedSurveys: number;
  responseRate: number;
  averageSatisfaction: number;
  npsScore: number;
  promotersPct: number;
  passivesPct: number;
  detractorsPct: number;
  byDepartment: DepartmentSatisfactionDto[];
  byCategory: CategorySatisfactionDto[];
  byDoctor: DoctorSatisfactionDto[];
  trend: SatisfactionTrendDto[];
  topComplaints: ComplaintCategoryDto[];
}

export interface DepartmentSatisfactionDto {
  departmentId: string;
  departmentName: string;
  surveyCount: number;
  satisfactionScore: number;
  npsScore: number;
}

export interface CategorySatisfactionDto {
  category: string;
  averageScore: number;
  maxScore: number;
  satisfactionPct: number;
}

export interface DoctorSatisfactionDto {
  doctorId: string;
  doctorName: string;
  surveyCount: number;
  satisfactionScore: number;
  npsScore: number;
}

export interface SatisfactionTrendDto {
  period: string;
  satisfactionScore: number;
  npsScore: number;
  surveyCount: number;
}

export interface ComplaintCategoryDto {
  category: string;
  count: number;
  percentage: number;
}

// #endregion

// #region CAPA DTOs

export interface CAPADto {
  id: string;
  capaCode: string;
  sourceType: string; // Incident, Audit, Complaint, QI, External
  sourceTypeName: string;
  sourceId?: string;
  sourceReference?: string;
  title: string;
  description: string;
  departmentId: string;
  departmentName: string;
  priority: number; // 1-Low, 2-Medium, 3-High, 4-Critical
  priorityName: string;
  initiatedBy: string;
  initiatedByName: string;
  initiatedDate: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  dueDate: string;
  // Analysis
  problemStatement: string;
  rootCauseAnalysis?: string;
  contributingFactors?: string[];
  // Actions
  correctiveActions: CAPAActionDto[];
  preventiveActions: CAPAActionDto[];
  // Verification
  verificationMethod?: string;
  verificationCriteria?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedDate?: string;
  verificationResult?: string;
  // Effectiveness
  effectivenessReviewRequired: boolean;
  effectivenessReviewDate?: string;
  effectivenessReviewResult?: string;
  recurrenceCheck?: string;
  // Status
  status: number; // 1-Open, 2-InProgress, 3-PendingVerification, 4-Verified, 5-Closed
  statusName: string;
  closedDate?: string;
  closedBy?: string;
  closedByName?: string;
  closureNotes?: string;
  attachments?: AttachmentDto[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CAPAActionDto {
  id: string;
  capaId: string;
  actionType: string; // Corrective, Preventive
  actionDescription: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  dueDate: string;
  completedDate?: string;
  status: number; // 1-Pending, 2-InProgress, 3-Completed, 4-Overdue
  statusName: string;
  evidence?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  notes?: string;
}

export interface CreateCAPADto {
  sourceType: string;
  sourceId?: string;
  title: string;
  description: string;
  departmentId: string;
  priority: number;
  responsiblePersonId: string;
  dueDate: string;
  problemStatement: string;
  rootCauseAnalysis?: string;
  contributingFactors?: string[];
  correctiveActions: CreateCAPAActionDto[];
  preventiveActions: CreateCAPAActionDto[];
  verificationMethod?: string;
  verificationCriteria?: string;
  effectivenessReviewRequired: boolean;
  effectivenessReviewDate?: string;
}

export interface CreateCAPAActionDto {
  actionType: string;
  actionDescription: string;
  responsiblePersonId: string;
  dueDate: string;
}

export interface UpdateCAPAActionDto {
  actionId: string;
  status: number;
  completedDate?: string;
  evidence?: string;
  notes?: string;
}

export interface VerifyCAPADto {
  capaId: string;
  verificationResult: string;
  verificationNotes?: string;
  effectivenessReviewRequired: boolean;
  effectivenessReviewDate?: string;
}

// #endregion

// #region Dashboard DTOs

export interface QualityDashboardDto {
  date: string;
  departmentId?: string;
  // Incidents
  totalIncidentsYTD: number;
  incidentsThisMonth: number;
  openIncidents: number;
  criticalIncidents: number;
  averageClosureTime: number;
  // Quality Indicators
  totalIndicators: number;
  indicatorsMet: number;
  indicatorsWarning: number;
  indicatorsCritical: number;
  overallPerformance: number;
  // Audits
  auditsCompleted: number;
  auditsPlanned: number;
  openFindings: number;
  // Patient Satisfaction
  overallSatisfaction: number;
  npsScore: number;
  surveysCompleted: number;
  // CAPA
  openCAPAs: number;
  overdueCAPAs: number;
  completedCAPAsThisMonth: number;
  // Trends
  incidentsByType: IncidentTypeStatDto[];
  qiTrends: QITrendSummaryDto[];
  satisfactionTrend: SatisfactionTrendDto[];
  // Alerts
  alerts: QualityAlertDto[];
}

export interface IncidentTypeStatDto {
  incidentType: string;
  incidentTypeName: string;
  count: number;
  percentage: number;
  trend: string;
}

export interface QITrendSummaryDto {
  indicatorId: string;
  indicatorName: string;
  currentValue: number;
  target: number;
  status: string;
  trend: string;
}

export interface QualityAlertDto {
  id: string;
  alertType: string;
  alertTypeName: string;
  severity: number;
  severityName: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
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

const BASE_URL = '/api/quality';

// #region Incident Reporting

export const getIncidents = (params: IncidentSearchDto) =>
  apiClient.get<PagedResultDto<IncidentReportDto>>(`${BASE_URL}/incidents`, { params });

export const getIncidentById = (id: string) =>
  apiClient.get<IncidentReportDto>(`${BASE_URL}/incidents/${id}`);

export const createIncident = (dto: CreateIncidentReportDto) =>
  apiClient.post<IncidentReportDto>(`${BASE_URL}/incidents`, dto);

export const updateIncident = (id: string, dto: CreateIncidentReportDto) =>
  apiClient.put<IncidentReportDto>(`${BASE_URL}/incidents/${id}`, dto);

export const assignInvestigator = (incidentId: string, investigatorId: string) =>
  apiClient.post<IncidentReportDto>(`${BASE_URL}/incidents/${incidentId}/assign`, { investigatorId });

export const investigateIncident = (dto: InvestigateIncidentDto) =>
  apiClient.post<IncidentReportDto>(`${BASE_URL}/incidents/investigate`, dto);

export const closeIncident = (id: string, notes: string) =>
  apiClient.post<IncidentReportDto>(`${BASE_URL}/incidents/${id}/close`, { notes });

export const reportToAuthority = (incidentId: string, authorityName: string, reportContent?: string) =>
  apiClient.post<IncidentReportDto>(`${BASE_URL}/incidents/${incidentId}/report-authority`, { authorityName, reportContent });

export const getOpenIncidents = (departmentId?: string) =>
  apiClient.get<IncidentReportDto[]>(`${BASE_URL}/incidents/open`, { params: { departmentId } });

export const updateCorrectiveAction = (actionId: string, status: number, completedDate?: string, notes?: string) =>
  apiClient.put<CorrectiveActionDto>(`${BASE_URL}/corrective-actions/${actionId}`, { status, completedDate, notes });

export const verifyCorrectiveAction = (actionId: string, effectiveness: string) =>
  apiClient.post<CorrectiveActionDto>(`${BASE_URL}/corrective-actions/${actionId}/verify`, { effectiveness });

export const printIncidentReport = (id: string) =>
  apiClient.get(`${BASE_URL}/incidents/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Quality Indicators

export const getQualityIndicators = (category?: string, departmentId?: string, isActive?: boolean) =>
  apiClient.get<QualityIndicatorDto[]>(`${BASE_URL}/indicators`, { params: { category, departmentId, isActive } });

export const getQualityIndicator = (id: string) =>
  apiClient.get<QualityIndicatorDto>(`${BASE_URL}/indicators/${id}`);

export const createQualityIndicator = (dto: CreateQualityIndicatorDto) =>
  apiClient.post<QualityIndicatorDto>(`${BASE_URL}/indicators`, dto);

export const updateQualityIndicator = (id: string, dto: CreateQualityIndicatorDto) =>
  apiClient.put<QualityIndicatorDto>(`${BASE_URL}/indicators/${id}`, dto);

export const getIndicatorValues = (indicatorId: string, fromDate: string, toDate: string) =>
  apiClient.get<QualityIndicatorValueDto[]>(`${BASE_URL}/indicators/${indicatorId}/values`, { params: { fromDate, toDate } });

export const recordIndicatorValue = (dto: RecordIndicatorValueDto) =>
  apiClient.post<QualityIndicatorValueDto>(`${BASE_URL}/indicators/values`, dto);

export const verifyIndicatorValue = (valueId: string, notes?: string) =>
  apiClient.post<QualityIndicatorValueDto>(`${BASE_URL}/indicators/values/${valueId}/verify`, { notes });

export const getIndicatorTrend = (indicatorId: string, periods: number) =>
  apiClient.get<QITrendDto>(`${BASE_URL}/indicators/${indicatorId}/trend`, { params: { periods } });

export const calculateIndicators = (periodEnd: string) =>
  apiClient.post(`${BASE_URL}/indicators/calculate`, { periodEnd });

export const getIndicatorDashboard = (departmentId?: string) =>
  apiClient.get(`${BASE_URL}/indicators/dashboard`, { params: { departmentId } });

// #endregion

// #region Internal Audits

export const getAudits = (departmentId?: string, status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<InternalAuditDto[]>(`${BASE_URL}/audits`, { params: { departmentId, status, fromDate, toDate } });

export const getAudit = (id: string) =>
  apiClient.get<InternalAuditDto>(`${BASE_URL}/audits/${id}`);

export const createAudit = (dto: CreateAuditDto) =>
  apiClient.post<InternalAuditDto>(`${BASE_URL}/audits`, dto);

export const startAudit = (auditId: string) =>
  apiClient.post<InternalAuditDto>(`${BASE_URL}/audits/${auditId}/start`);

export const addAuditFinding = (dto: AddAuditFindingDto) =>
  apiClient.post<AuditFindingDto>(`${BASE_URL}/audits/findings`, dto);

export const updateAuditFinding = (findingId: string, dto: AddAuditFindingDto) =>
  apiClient.put<AuditFindingDto>(`${BASE_URL}/audits/findings/${findingId}`, dto);

export const respondToFinding = (findingId: string, response: string) =>
  apiClient.post<AuditFindingDto>(`${BASE_URL}/audits/findings/${findingId}/respond`, { response });

export const completeAudit = (dto: CompleteAuditDto) =>
  apiClient.post<InternalAuditDto>(`${BASE_URL}/audits/complete`, dto);

export const closeAudit = (auditId: string, notes?: string) =>
  apiClient.post<InternalAuditDto>(`${BASE_URL}/audits/${auditId}/close`, { notes });

export const printAuditReport = (id: string) =>
  apiClient.get(`${BASE_URL}/audits/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Patient Satisfaction

export const getSurveys = (departmentId?: string, fromDate?: string, toDate?: string, status?: number) =>
  apiClient.get<PatientSurveyDto[]>(`${BASE_URL}/surveys`, { params: { departmentId, fromDate, toDate, status } });

export const getSurvey = (id: string) =>
  apiClient.get<PatientSurveyDto>(`${BASE_URL}/surveys/${id}`);

export const getSurveyTemplates = (surveyType?: string, isActive?: boolean) =>
  apiClient.get<SurveyTemplateDto[]>(`${BASE_URL}/survey-templates`, { params: { surveyType, isActive } });

export const getSurveyTemplate = (id: string) =>
  apiClient.get<SurveyTemplateDto>(`${BASE_URL}/survey-templates/${id}`);

export const createSurvey = (dto: CreateSurveyDto) =>
  apiClient.post<PatientSurveyDto>(`${BASE_URL}/surveys`, dto);

export const followUpSurvey = (surveyId: string, notes: string) =>
  apiClient.post<PatientSurveyDto>(`${BASE_URL}/surveys/${surveyId}/follow-up`, { notes });

export const getSatisfactionStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<SatisfactionStatisticsDto>(`${BASE_URL}/surveys/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportSatisfactionReport = (fromDate: string, toDate: string, departmentId?: string, format?: string) =>
  apiClient.get(`${BASE_URL}/surveys/export`, { params: { fromDate, toDate, departmentId, format }, responseType: 'blob' });

// #endregion

// #region CAPA

export const getCAPAs = (departmentId?: string, status?: number, priority?: number) =>
  apiClient.get<CAPADto[]>(`${BASE_URL}/capas`, { params: { departmentId, status, priority } });

export const getCAPA = (id: string) =>
  apiClient.get<CAPADto>(`${BASE_URL}/capas/${id}`);

export const createCAPA = (dto: CreateCAPADto) =>
  apiClient.post<CAPADto>(`${BASE_URL}/capas`, dto);

export const updateCAPA = (id: string, dto: CreateCAPADto) =>
  apiClient.put<CAPADto>(`${BASE_URL}/capas/${id}`, dto);

export const updateCAPAAction = (dto: UpdateCAPAActionDto) =>
  apiClient.put<CAPAActionDto>(`${BASE_URL}/capas/actions`, dto);

export const verifyCAPA = (dto: VerifyCAPADto) =>
  apiClient.post<CAPADto>(`${BASE_URL}/capas/verify`, dto);

export const reviewEffectiveness = (capaId: string, result: string, notes?: string) =>
  apiClient.post<CAPADto>(`${BASE_URL}/capas/${capaId}/effectiveness`, { result, notes });

export const closeCAPA = (capaId: string, notes?: string) =>
  apiClient.post<CAPADto>(`${BASE_URL}/capas/${capaId}/close`, { notes });

export const getOverdueCAPAs = (departmentId?: string) =>
  apiClient.get<CAPADto[]>(`${BASE_URL}/capas/overdue`, { params: { departmentId } });

export const printCAPAReport = (id: string) =>
  apiClient.get(`${BASE_URL}/capas/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<QualityDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

export const getAlerts = (departmentId?: string, acknowledged?: boolean) =>
  apiClient.get<QualityAlertDto[]>(`${BASE_URL}/alerts`, { params: { departmentId, acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const getQualityStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportQualityReport = (reportType: string, fromDate: string, toDate: string, departmentId?: string, format?: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { reportType, fromDate, toDate, departmentId, format }, responseType: 'blob' });

// #endregion

export default {
  // Incidents
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  assignInvestigator,
  investigateIncident,
  closeIncident,
  reportToAuthority,
  getOpenIncidents,
  updateCorrectiveAction,
  verifyCorrectiveAction,
  printIncidentReport,
  // Quality Indicators
  getQualityIndicators,
  getQualityIndicator,
  createQualityIndicator,
  updateQualityIndicator,
  getIndicatorValues,
  recordIndicatorValue,
  verifyIndicatorValue,
  getIndicatorTrend,
  calculateIndicators,
  getIndicatorDashboard,
  // Audits
  getAudits,
  getAudit,
  createAudit,
  startAudit,
  addAuditFinding,
  updateAuditFinding,
  respondToFinding,
  completeAudit,
  closeAudit,
  printAuditReport,
  // Surveys
  getSurveys,
  getSurvey,
  getSurveyTemplates,
  getSurveyTemplate,
  createSurvey,
  followUpSurvey,
  getSatisfactionStatistics,
  exportSatisfactionReport,
  // CAPA
  getCAPAs,
  getCAPA,
  createCAPA,
  updateCAPA,
  updateCAPAAction,
  verifyCAPA,
  reviewEffectiveness,
  closeCAPA,
  getOverdueCAPAs,
  printCAPAReport,
  // Dashboard
  getDashboard,
  getAlerts,
  acknowledgeAlert,
  getQualityStatistics,
  exportQualityReport,
};
