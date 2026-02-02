/**
 * API Client cho Phân hệ 16: Quản lý Nhân sự Y tế (Medical HR)
 * Module: Medical HR
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Staff Profile DTOs

export interface StaffProfileDto {
  id: string;
  staffCode: string;
  employeeNumber?: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  departmentId: string;
  departmentName: string;
  positionId?: string;
  positionName?: string;
  staffType: string; // Doctor, Nurse, Technician, Allied, Admin, Support
  staffTypeName: string;
  specialty?: string;
  subspecialty?: string;
  hireDate?: string;
  terminationDate?: string;
  employmentStatus: number; // 1-Active, 2-OnLeave, 3-Suspended, 4-Terminated
  employmentStatusName: string;
  workScheduleType?: string;
  contractType?: string;
  qualifications: QualificationDto[];
  certifications: CertificationDto[];
  languages?: string[];
  skills?: string[];
  supervisorId?: string;
  supervisorName?: string;
  photoUrl?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QualificationDto {
  id: string;
  qualificationType: string; // Degree, Diploma, Certificate
  qualificationName: string;
  institution: string;
  country?: string;
  yearObtained: number;
  documentNumber?: string;
  verificationStatus: string;
  verifiedDate?: string;
  verifiedBy?: string;
  expiryDate?: string;
  attachmentUrl?: string;
}

export interface CertificationDto {
  id: string;
  certificationType: string;
  certificationName: string;
  issuingAuthority: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  isExpired: boolean;
  expiringWithin30Days: boolean;
  verificationStatus: string;
  verifiedDate?: string;
  verifiedBy?: string;
  attachmentUrl?: string;
  notes?: string;
}

export interface CreateStaffProfileDto {
  staffCode: string;
  employeeNumber?: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  departmentId: string;
  positionId?: string;
  staffType: string;
  specialty?: string;
  hireDate?: string;
  workScheduleType?: string;
  contractType?: string;
  supervisorId?: string;
  notes?: string;
}

export interface StaffSearchDto {
  keyword?: string;
  departmentId?: string;
  staffType?: string;
  specialty?: string;
  employmentStatus?: number;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Duty Roster DTOs

export interface DutyRosterDto {
  id: string;
  rosterCode: string;
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  totalShifts: number;
  filledShifts: number;
  staffAssignments: RosterAssignmentDto[];
  shiftDefinitions: ShiftDefinitionDto[];
  status: number; // 1-Draft, 2-Submitted, 3-Approved, 4-Published
  statusName: string;
  notes?: string;
}

export interface RosterAssignmentDto {
  id: string;
  rosterId: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  staffType: string;
  date: string;
  dayOfWeek: string;
  shiftId: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  location?: string;
  role?: string;
  isOnCall: boolean;
  isOvertime: boolean;
  overtimeHours?: number;
  swappedWith?: string;
  swappedDate?: string;
  status: number; // 1-Scheduled, 2-Confirmed, 3-Completed, 4-Absent, 5-Swapped
  statusName: string;
  notes?: string;
}

export interface ShiftDefinitionDto {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  isNightShift: boolean;
  breakMinutes?: number;
  color?: string;
  isActive: boolean;
}

export interface GenerateRosterDto {
  departmentId: string;
  year: number;
  month: number;
  requiredDoctorsPerShift?: number;
  requiredNursesPerShift?: number;
  availableStaffIds?: string[];
  excludeStaffIds?: string[];
  respectLeaveRequests: boolean;
  maxConsecutiveNightShifts?: number;
  minRestHoursBetweenShifts?: number;
}

export interface UpdateRosterAssignmentDto {
  assignmentId: string;
  staffId?: string;
  shiftId?: string;
  isOnCall?: boolean;
  notes?: string;
}

export interface ShiftSwapRequestDto {
  id: string;
  requestCode: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  originalAssignmentId: string;
  originalDate: string;
  originalShift: string;
  targetStaffId: string;
  targetStaffName: string;
  targetDate: string;
  targetShift: string;
  reason: string;
  status: number; // 1-Pending, 2-Approved, 3-Rejected
  statusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
}

export interface CreateShiftSwapDto {
  originalAssignmentId: string;
  targetStaffId: string;
  targetAssignmentId: string;
  reason: string;
}

// #endregion

// #region Clinic Assignment DTOs

export interface ClinicAssignmentDto {
  id: string;
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  departmentId: string;
  departmentName: string;
  date: string;
  sessionType: string; // Morning, Afternoon, Evening, AllDay
  sessionTypeName: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  specialty?: string;
  nurseId?: string;
  nurseName?: string;
  maxPatients: number;
  scheduledPatients: number;
  walkinAllowed: boolean;
  status: number; // 1-Scheduled, 2-InProgress, 3-Completed, 4-Cancelled
  statusName: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface CreateClinicAssignmentDto {
  clinicId: string;
  date: string;
  sessionType: string;
  doctorId: string;
  nurseId?: string;
  maxPatients?: number;
  walkinAllowed?: boolean;
  notes?: string;
}

export interface ClinicScheduleDto {
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  departmentName: string;
  weekStart: string;
  weekEnd: string;
  schedule: DayScheduleDto[];
}

export interface DayScheduleDto {
  date: string;
  dayOfWeek: string;
  sessions: ClinicAssignmentDto[];
}

// #endregion

// #region CME Tracking DTOs

export interface CMERecordDto {
  id: string;
  recordCode: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  activityType: string; // Conference, Workshop, Webinar, Course, SelfStudy, Teaching
  activityTypeName: string;
  activityName: string;
  provider: string;
  startDate: string;
  endDate?: string;
  durationHours: number;
  credits: number;
  creditType: string; // Category1, Category2
  accreditationNumber?: string;
  location?: string;
  isOnline: boolean;
  cost?: number;
  sponsoredBy?: string;
  topics?: string[];
  learningObjectives?: string;
  completionStatus: number; // 1-Registered, 2-InProgress, 3-Completed, 4-Cancelled
  completionStatusName: string;
  certificateNumber?: string;
  certificateUrl?: string;
  verificationStatus: string;
  verifiedDate?: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCMERecordDto {
  staffId: string;
  activityType: string;
  activityName: string;
  provider: string;
  startDate: string;
  endDate?: string;
  durationHours: number;
  credits: number;
  creditType: string;
  accreditationNumber?: string;
  location?: string;
  isOnline: boolean;
  cost?: number;
  sponsoredBy?: string;
  topics?: string[];
  notes?: string;
}

export interface CMESummaryDto {
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  requiredCredits: number;
  earnedCredits: number;
  category1Credits: number;
  category2Credits: number;
  isCompliant: boolean;
  shortfall: number;
  activitiesCount: number;
  activities: CMERecordDto[];
}

export interface CMERequirementDto {
  staffType: string;
  specialty?: string;
  periodYears: number;
  totalCreditsRequired: number;
  category1Minimum?: number;
  category2Maximum?: number;
  specialRequirements?: string[];
}

// #endregion

// #region Competency Assessment DTOs

export interface CompetencyAssessmentDto {
  id: string;
  assessmentCode: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  staffType: string;
  department: string;
  assessmentType: string; // Initial, Annual, Skill-specific, Remedial
  assessmentTypeName: string;
  assessmentDate: string;
  assessorId: string;
  assessorName: string;
  competencies: CompetencyItemDto[];
  overallScore: number;
  overallRating: string; // Exceeds, Meets, Below, Unsatisfactory
  overallRatingName: string;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  staffComments?: string;
  staffAcknowledged: boolean;
  staffAcknowledgedDate?: string;
  status: number; // 1-InProgress, 2-Completed, 3-Acknowledged
  statusName: string;
  createdAt: string;
}

export interface CompetencyItemDto {
  competencyId: string;
  competencyName: string;
  category: string;
  description?: string;
  assessmentMethod: string;
  score: number;
  maxScore: number;
  rating: string;
  evidence?: string;
  comments?: string;
}

export interface CreateCompetencyAssessmentDto {
  staffId: string;
  assessmentType: string;
  competencies: CompetencyItemDto[];
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

export interface CompetencyFrameworkDto {
  id: string;
  staffType: string;
  specialty?: string;
  competencies: CompetencyDefinitionDto[];
  lastUpdated: string;
  updatedBy: string;
}

export interface CompetencyDefinitionDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  assessmentCriteria: string[];
  evidenceRequirements?: string[];
  proficiencyLevels: ProficiencyLevelDto[];
  isMandatory: boolean;
  isActive: boolean;
}

export interface ProficiencyLevelDto {
  level: number;
  name: string;
  description: string;
  scoreRange: string;
}

// #endregion

// #region Dashboard DTOs

export interface MedicalHRDashboardDto {
  date: string;
  departmentId?: string;
  // Staff summary
  totalStaff: number;
  activeStaff: number;
  onLeaveStaff: number;
  doctors: number;
  nurses: number;
  technicians: number;
  // Credentials
  expiringLicenses30Days: number;
  expiredLicenses: number;
  cmeNonCompliant: number;
  pendingVerifications: number;
  // Roster
  todayShifts: number;
  filledShifts: number;
  openShifts: number;
  pendingSwapRequests: number;
  // Overtime
  monthlyOvertimeHours: number;
  staffWithExcessiveOvertime: number;
  // Training
  upcomingTrainings: number;
  pendingCompetencyAssessments: number;
  // By department
  staffByDepartment: DepartmentStaffStatDto[];
  // Alerts
  alerts: HRAlertDto[];
}

export interface DepartmentStaffStatDto {
  departmentId: string;
  departmentName: string;
  totalStaff: number;
  doctors: number;
  nurses: number;
  others: number;
  vacancies: number;
}

export interface HRAlertDto {
  id: string;
  staffId?: string;
  staffName?: string;
  alertType: string; // LicenseExpiring, CMEDue, OvertimeExcess, CompetencyDue
  alertTypeName: string;
  severity: number;
  severityName: string;
  dueDate?: string;
  message: string;
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

const BASE_URL = '/api/medicalhr';

// #region Staff Profiles

export const getStaff = (params: StaffSearchDto) =>
  apiClient.get<PagedResultDto<StaffProfileDto>>(`${BASE_URL}/staff`, { params });

export const getStaffById = (id: string) =>
  apiClient.get<StaffProfileDto>(`${BASE_URL}/staff/${id}`);

export const getStaffByCode = (code: string) =>
  apiClient.get<StaffProfileDto>(`${BASE_URL}/staff/code/${code}`);

export const createStaff = (dto: CreateStaffProfileDto) =>
  apiClient.post<StaffProfileDto>(`${BASE_URL}/staff`, dto);

export const updateStaff = (id: string, dto: CreateStaffProfileDto) =>
  apiClient.put<StaffProfileDto>(`${BASE_URL}/staff/${id}`, dto);

export const updateEmploymentStatus = (id: string, status: number, reason?: string, effectiveDate?: string) =>
  apiClient.post<StaffProfileDto>(`${BASE_URL}/staff/${id}/status`, { status, reason, effectiveDate });

export const transferStaff = (id: string, newDepartmentId: string, effectiveDate: string, notes?: string) =>
  apiClient.post<StaffProfileDto>(`${BASE_URL}/staff/${id}/transfer`, { newDepartmentId, effectiveDate, notes });

export const getDepartmentStaff = (departmentId: string, staffType?: string) =>
  apiClient.get<StaffProfileDto[]>(`${BASE_URL}/departments/${departmentId}/staff`, { params: { staffType } });

export const addQualification = (staffId: string, dto: QualificationDto) =>
  apiClient.post<QualificationDto>(`${BASE_URL}/staff/${staffId}/qualifications`, dto);

export const updateQualification = (staffId: string, qualificationId: string, dto: QualificationDto) =>
  apiClient.put<QualificationDto>(`${BASE_URL}/staff/${staffId}/qualifications/${qualificationId}`, dto);

export const addCertification = (staffId: string, dto: CertificationDto) =>
  apiClient.post<CertificationDto>(`${BASE_URL}/staff/${staffId}/certifications`, dto);

export const updateCertification = (staffId: string, certificationId: string, dto: CertificationDto) =>
  apiClient.put<CertificationDto>(`${BASE_URL}/staff/${staffId}/certifications/${certificationId}`, dto);

export const verifyCertification = (staffId: string, certificationId: string, verified: boolean, notes?: string) =>
  apiClient.post<CertificationDto>(`${BASE_URL}/staff/${staffId}/certifications/${certificationId}/verify`, { verified, notes });

export const getExpiringCertifications = (daysWithin?: number) =>
  apiClient.get<CertificationDto[]>(`${BASE_URL}/certifications/expiring`, { params: { daysWithin } });

// #endregion

// #region Duty Roster

export const getRoster = (departmentId: string, year: number, month: number) =>
  apiClient.get<DutyRosterDto>(`${BASE_URL}/rosters`, { params: { departmentId, year, month } });

export const getRosterById = (id: string) =>
  apiClient.get<DutyRosterDto>(`${BASE_URL}/rosters/${id}`);

export const generateRoster = (dto: GenerateRosterDto) =>
  apiClient.post<DutyRosterDto>(`${BASE_URL}/rosters/generate`, dto);

export const updateRosterAssignment = (dto: UpdateRosterAssignmentDto) =>
  apiClient.put<RosterAssignmentDto>(`${BASE_URL}/rosters/assignments`, dto);

export const submitRoster = (rosterId: string) =>
  apiClient.post<DutyRosterDto>(`${BASE_URL}/rosters/${rosterId}/submit`);

export const approveRoster = (rosterId: string, notes?: string) =>
  apiClient.post<DutyRosterDto>(`${BASE_URL}/rosters/${rosterId}/approve`, { notes });

export const publishRoster = (rosterId: string) =>
  apiClient.post<DutyRosterDto>(`${BASE_URL}/rosters/${rosterId}/publish`);

export const getStaffRoster = (staffId: string, year: number, month: number) =>
  apiClient.get<RosterAssignmentDto[]>(`${BASE_URL}/staff/${staffId}/roster`, { params: { year, month } });

export const getShiftDefinitions = () =>
  apiClient.get<ShiftDefinitionDto[]>(`${BASE_URL}/shifts`);

export const printRoster = (rosterId: string) =>
  apiClient.get(`${BASE_URL}/rosters/${rosterId}/print`, { responseType: 'blob' });

// Shift Swaps
export const getSwapRequests = (departmentId?: string, status?: number) =>
  apiClient.get<ShiftSwapRequestDto[]>(`${BASE_URL}/shift-swaps`, { params: { departmentId, status } });

export const createSwapRequest = (dto: CreateShiftSwapDto) =>
  apiClient.post<ShiftSwapRequestDto>(`${BASE_URL}/shift-swaps`, dto);

export const approveSwapRequest = (id: string, isApproved: boolean, notes?: string) =>
  apiClient.post<ShiftSwapRequestDto>(`${BASE_URL}/shift-swaps/${id}/approve`, { isApproved, notes });

// #endregion

// #region Clinic Assignments

export const getClinicAssignments = (clinicId?: string, doctorId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<ClinicAssignmentDto[]>(`${BASE_URL}/clinic-assignments`, { params: { clinicId, doctorId, fromDate, toDate } });

export const getClinicAssignment = (id: string) =>
  apiClient.get<ClinicAssignmentDto>(`${BASE_URL}/clinic-assignments/${id}`);

export const createClinicAssignment = (dto: CreateClinicAssignmentDto) =>
  apiClient.post<ClinicAssignmentDto>(`${BASE_URL}/clinic-assignments`, dto);

export const updateClinicAssignment = (id: string, dto: CreateClinicAssignmentDto) =>
  apiClient.put<ClinicAssignmentDto>(`${BASE_URL}/clinic-assignments/${id}`, dto);

export const cancelClinicAssignment = (id: string, reason: string) =>
  apiClient.post<ClinicAssignmentDto>(`${BASE_URL}/clinic-assignments/${id}/cancel`, { reason });

export const getClinicSchedule = (clinicId: string, weekStart: string) =>
  apiClient.get<ClinicScheduleDto>(`${BASE_URL}/clinics/${clinicId}/schedule`, { params: { weekStart } });

export const getDoctorSchedule = (doctorId: string, fromDate: string, toDate: string) =>
  apiClient.get<ClinicAssignmentDto[]>(`${BASE_URL}/doctors/${doctorId}/schedule`, { params: { fromDate, toDate } });

// #endregion

// #region CME Tracking

export const getCMERecords = (staffId: string, year?: number) =>
  apiClient.get<CMERecordDto[]>(`${BASE_URL}/staff/${staffId}/cme`, { params: { year } });

export const getCMERecord = (id: string) =>
  apiClient.get<CMERecordDto>(`${BASE_URL}/cme/${id}`);

export const createCMERecord = (dto: CreateCMERecordDto) =>
  apiClient.post<CMERecordDto>(`${BASE_URL}/cme`, dto);

export const updateCMERecord = (id: string, dto: CreateCMERecordDto) =>
  apiClient.put<CMERecordDto>(`${BASE_URL}/cme/${id}`, dto);

export const completeCMERecord = (id: string, certificateNumber?: string, certificateUrl?: string) =>
  apiClient.post<CMERecordDto>(`${BASE_URL}/cme/${id}/complete`, { certificateNumber, certificateUrl });

export const verifyCMERecord = (id: string, verified: boolean, notes?: string) =>
  apiClient.post<CMERecordDto>(`${BASE_URL}/cme/${id}/verify`, { verified, notes });

export const getCMESummary = (staffId: string, periodStart: string, periodEnd: string) =>
  apiClient.get<CMESummaryDto>(`${BASE_URL}/staff/${staffId}/cme-summary`, { params: { periodStart, periodEnd } });

export const getCMERequirements = (staffType: string, specialty?: string) =>
  apiClient.get<CMERequirementDto>(`${BASE_URL}/cme/requirements`, { params: { staffType, specialty } });

export const getNonCompliantStaff = () =>
  apiClient.get<CMESummaryDto[]>(`${BASE_URL}/cme/non-compliant`);

export const printCMEReport = (staffId: string, periodStart: string, periodEnd: string) =>
  apiClient.get(`${BASE_URL}/staff/${staffId}/cme/print`, { params: { periodStart, periodEnd }, responseType: 'blob' });

// #endregion

// #region Competency Assessment

export const getCompetencyAssessments = (staffId: string) =>
  apiClient.get<CompetencyAssessmentDto[]>(`${BASE_URL}/staff/${staffId}/competency-assessments`);

export const getCompetencyAssessment = (id: string) =>
  apiClient.get<CompetencyAssessmentDto>(`${BASE_URL}/competency-assessments/${id}`);

export const createCompetencyAssessment = (dto: CreateCompetencyAssessmentDto) =>
  apiClient.post<CompetencyAssessmentDto>(`${BASE_URL}/competency-assessments`, dto);

export const updateCompetencyAssessment = (id: string, dto: CreateCompetencyAssessmentDto) =>
  apiClient.put<CompetencyAssessmentDto>(`${BASE_URL}/competency-assessments/${id}`, dto);

export const acknowledgeAssessment = (id: string, comments?: string) =>
  apiClient.post<CompetencyAssessmentDto>(`${BASE_URL}/competency-assessments/${id}/acknowledge`, { comments });

export const getCompetencyFramework = (staffType: string, specialty?: string) =>
  apiClient.get<CompetencyFrameworkDto>(`${BASE_URL}/competency-framework`, { params: { staffType, specialty } });

export const getPendingAssessments = (departmentId?: string) =>
  apiClient.get<StaffProfileDto[]>(`${BASE_URL}/competency-assessments/pending`, { params: { departmentId } });

export const printCompetencyReport = (id: string) =>
  apiClient.get(`${BASE_URL}/competency-assessments/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<MedicalHRDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

export const getAlerts = (departmentId?: string, acknowledged?: boolean) =>
  apiClient.get<HRAlertDto[]>(`${BASE_URL}/alerts`, { params: { departmentId, acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const runCredentialCheck = () =>
  apiClient.post(`${BASE_URL}/credentials/check`);

export const getHRStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportHRReport = (reportType: string, departmentId?: string, format?: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { reportType, departmentId, format }, responseType: 'blob' });

// #endregion

export default {
  // Staff
  getStaff,
  getStaffById,
  getStaffByCode,
  createStaff,
  updateStaff,
  updateEmploymentStatus,
  transferStaff,
  getDepartmentStaff,
  addQualification,
  updateQualification,
  addCertification,
  updateCertification,
  verifyCertification,
  getExpiringCertifications,
  // Roster
  getRoster,
  getRosterById,
  generateRoster,
  updateRosterAssignment,
  submitRoster,
  approveRoster,
  publishRoster,
  getStaffRoster,
  getShiftDefinitions,
  printRoster,
  getSwapRequests,
  createSwapRequest,
  approveSwapRequest,
  // Clinic
  getClinicAssignments,
  getClinicAssignment,
  createClinicAssignment,
  updateClinicAssignment,
  cancelClinicAssignment,
  getClinicSchedule,
  getDoctorSchedule,
  // CME
  getCMERecords,
  getCMERecord,
  createCMERecord,
  updateCMERecord,
  completeCMERecord,
  verifyCMERecord,
  getCMESummary,
  getCMERequirements,
  getNonCompliantStaff,
  printCMEReport,
  // Competency
  getCompetencyAssessments,
  getCompetencyAssessment,
  createCompetencyAssessment,
  updateCompetencyAssessment,
  acknowledgeAssessment,
  getCompetencyFramework,
  getPendingAssessments,
  printCompetencyReport,
  // Dashboard
  getDashboard,
  getAlerts,
  acknowledgeAlert,
  runCredentialCheck,
  getHRStatistics,
  exportHRReport,
};
