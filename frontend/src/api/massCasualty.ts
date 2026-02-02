/**
 * API Client cho Phân hệ 20: Cấp cứu thảm họa (Mass Casualty Incident)
 * Module: Mass Casualty
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region MCI Event DTOs

export interface MCIEventDto {
  id: string;
  eventCode: string;
  eventName: string;
  eventType: string; // Natural, Industrial, Transport, Violence, Other
  eventTypeName: string;
  alertLevel: number; // 1-Green, 2-Yellow, 3-Orange, 4-Red
  alertLevelName: string;
  location: string;
  locationCoordinates?: string;
  estimatedCasualties: number;
  confirmedCasualties: number;
  activatedAt: string;
  activatedBy: string;
  activatedByName: string;
  incidentCommanderId?: string;
  incidentCommanderName?: string;
  commandPost?: string;
  // Resource status
  staffActivated: number;
  bedsReserved: number;
  orsReady: number;
  icuBedsReady: number;
  bloodUnitsReady: number;
  // Victim statistics
  totalVictims: number;
  immediateRed: number;
  delayedYellow: number;
  minorGreen: number;
  expectantBlack: number;
  deceased: number;
  discharged: number;
  // Timeline
  phases: MCIPhaseDto[];
  currentPhase: string;
  // Status
  status: number; // 1-Activated, 2-InProgress, 3-Winding, 4-Deactivated
  statusName: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivatedByName?: string;
  deactivationReason?: string;
  totalDurationHours?: number;
  // After action
  afterActionReportId?: string;
  lessonsLearned?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MCIPhaseDto {
  phase: string;
  phaseName: string;
  startedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface ActivateMCIDto {
  eventName: string;
  eventType: string;
  alertLevel: number;
  location: string;
  locationCoordinates?: string;
  estimatedCasualties: number;
  description?: string;
}

export interface MCIActivationResultDto {
  success: boolean;
  eventId: string;
  eventCode: string;
  staffNotified: number;
  bedsReserved: number;
  orsReady: number;
  activationMessages: string[];
  warnings: string[];
}

export interface EscalateAlertDto {
  eventId: string;
  newAlertLevel: number;
  reason: string;
  additionalResources?: string[];
}

export interface DeactivateMCIDto {
  eventId: string;
  reason: string;
  finalNotes?: string;
}

export interface MCIDeactivationResultDto {
  success: boolean;
  eventId: string;
  totalVictimsProcessed: number;
  totalDurationHours: number;
  reportGenerated: boolean;
  reportUrl?: string;
  reportedToAuthority: boolean;
}

// #endregion

// #region Victim Management DTOs

export interface MCIVictimDto {
  id: string;
  victimCode: string;
  eventId: string;
  eventCode: string;
  // Identification
  temporaryId: string;
  patientId?: string;
  patientCode?: string;
  fullName?: string;
  estimatedAge?: number;
  gender?: string;
  identificationStatus: string; // Unknown, Partial, Confirmed
  identificationMethod?: string;
  idDocument?: string;
  // Triage
  triageCategory: string; // Immediate, Delayed, Minor, Expectant, Deceased
  triageCategoryName: string;
  triageColor: string;
  triageTime: string;
  triagedBy: string;
  triagedByName: string;
  retriageHistory: TriageHistoryDto[];
  // Clinical
  chiefComplaint?: string;
  injuries: string[];
  injuryMechanism?: string;
  vitalSigns?: VictimVitalSignsDto;
  gcsScore?: number;
  ambulatory: boolean;
  // Treatment
  assignedArea: string;
  assignedAreaName: string;
  bedNumber?: string;
  attendingDoctorId?: string;
  attendingDoctorName?: string;
  treatmentStatus: string;
  treatmentNotes?: string;
  procedures: VictimProcedureDto[];
  medications: VictimMedicationDto[];
  // Disposition
  disposition?: string; // Admitted, OR, ICU, Discharged, Transferred, Deceased
  dispositionName?: string;
  dispositionTime?: string;
  transferDestination?: string;
  dischargeInstructions?: string;
  // Family
  familyNotified: boolean;
  familyContactName?: string;
  familyContactPhone?: string;
  familyNotifiedAt?: string;
  // Status
  status: number; // 1-Triaged, 2-InTreatment, 3-Disposed
  statusName: string;
  arrivalTime: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VictimVitalSignsDto {
  recordedAt: string;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  gcsEye?: number;
  gcsVerbal?: number;
  gcsMotor?: number;
  painScale?: number;
}

export interface TriageHistoryDto {
  previousCategory: string;
  newCategory: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export interface VictimProcedureDto {
  procedureCode: string;
  procedureName: string;
  performedAt: string;
  performedBy: string;
  notes?: string;
}

export interface VictimMedicationDto {
  medicationName: string;
  dose: string;
  route: string;
  administeredAt: string;
  administeredBy: string;
}

export interface RegisterVictimDto {
  eventId: string;
  temporaryId?: string;
  fullName?: string;
  estimatedAge?: number;
  gender?: string;
  chiefComplaint?: string;
  injuries?: string[];
  injuryMechanism?: string;
  ambulatory: boolean;
}

export interface TriageVictimDto {
  victimId: string;
  // START algorithm inputs
  respiratoryRate?: number;
  pulsePresent: boolean;
  canFollowCommands: boolean;
  canWalk: boolean;
  // Manual override
  manualCategory?: string;
  overrideReason?: string;
  chiefComplaint?: string;
  injuries?: string[];
}

export interface TriageResultDto {
  victimId: string;
  triageCategory: string;
  triageCategoryName: string;
  triageColor: string;
  algorithmUsed: string;
  assignedArea: string;
  queuePosition: number;
  recommendedActions: string[];
}

export interface UpdateVictimDto {
  victimId: string;
  fullName?: string;
  patientId?: string;
  identificationMethod?: string;
  idDocument?: string;
  vitalSigns?: VictimVitalSignsDto;
  treatmentNotes?: string;
  assignedArea?: string;
  attendingDoctorId?: string;
}

export interface DisposeVictimDto {
  victimId: string;
  disposition: string;
  transferDestination?: string;
  dischargeInstructions?: string;
  notes?: string;
}

// #endregion

// #region Resource Management DTOs

export interface MCIResourceDto {
  eventId: string;
  eventCode: string;
  lastUpdated: string;
  // Staff
  staffSummary: StaffResourceDto;
  // Beds
  bedSummary: BedResourceDto;
  // OR
  orSummary: ORResourceDto;
  // Blood
  bloodSummary: BloodResourceDto;
  // Equipment
  equipmentSummary: EquipmentResourceDto;
  // Supplies
  supplySummary: SupplyResourceDto;
}

export interface StaffResourceDto {
  activated: number;
  present: number;
  physicians: number;
  nurses: number;
  technicians: number;
  support: number;
  byDepartment: DepartmentStaffDto[];
}

export interface DepartmentStaffDto {
  departmentId: string;
  departmentName: string;
  physicians: number;
  nurses: number;
  total: number;
}

export interface BedResourceDto {
  totalReserved: number;
  available: number;
  occupied: number;
  icuReserved: number;
  icuAvailable: number;
  icuOccupied: number;
  byArea: AreaBedDto[];
}

export interface AreaBedDto {
  areaCode: string;
  areaName: string;
  reserved: number;
  available: number;
  occupied: number;
}

export interface ORResourceDto {
  totalReady: number;
  available: number;
  inUse: number;
  rooms: ORRoomStatusDto[];
}

export interface ORRoomStatusDto {
  roomId: string;
  roomName: string;
  status: string;
  currentPatient?: string;
  estimatedEndTime?: string;
}

export interface BloodResourceDto {
  unitsReady: number;
  oNegative: number;
  oPositive: number;
  aNegative: number;
  aPositive: number;
  bNegative: number;
  bPositive: number;
  abNegative: number;
  abPositive: number;
  plasmaUnits: number;
  plateletUnits: number;
}

export interface EquipmentResourceDto {
  ventilators: EquipmentStatusDto;
  monitors: EquipmentStatusDto;
  defibrillators: EquipmentStatusDto;
  portableXray: EquipmentStatusDto;
  ultrasound: EquipmentStatusDto;
}

export interface EquipmentStatusDto {
  total: number;
  available: number;
  inUse: number;
}

export interface SupplyResourceDto {
  criticalSupplies: CriticalSupplyDto[];
  lowStockAlerts: string[];
}

export interface CriticalSupplyDto {
  supplyName: string;
  currentStock: number;
  minRequired: number;
  unit: string;
  status: string; // Adequate, Low, Critical
}

export interface AllocateResourceDto {
  eventId: string;
  resourceType: string;
  resourceId: string;
  victimId?: string;
  areaCode?: string;
  notes?: string;
}

export interface RequestAdditionalResourceDto {
  eventId: string;
  resourceType: string;
  quantity: number;
  urgency: number;
  reason: string;
  requestSource?: string;
}

// #endregion

// #region Command Center DTOs

export interface CommandCenterDto {
  eventId: string;
  eventCode: string;
  eventName: string;
  alertLevel: number;
  alertLevelName: string;
  status: string;
  activatedAt: string;
  currentDuration: string;
  // Command structure
  incidentCommander: CommanderDto;
  sectionChiefs: SectionChiefDto[];
  // Real-time stats
  victimStats: VictimStatsDto;
  resourceStats: ResourceStatsDto;
  // Activity
  recentActivities: ActivityLogDto[];
  pendingActions: PendingActionDto[];
  // Alerts
  criticalAlerts: MCIAlertDto[];
}

export interface CommanderDto {
  staffId: string;
  staffName: string;
  position: string;
  phone: string;
  assignedAt: string;
}

export interface SectionChiefDto {
  section: string; // Operations, Planning, Logistics, Finance
  sectionName: string;
  staffId: string;
  staffName: string;
  phone: string;
}

export interface VictimStatsDto {
  total: number;
  byCategory: CategoryCountDto[];
  byStatus: StatusCountDto[];
  arrivalRate: number; // per hour
  dispositionRate: number; // per hour
}

export interface CategoryCountDto {
  category: string;
  categoryName: string;
  color: string;
  count: number;
  percentage: number;
}

export interface StatusCountDto {
  status: string;
  statusName: string;
  count: number;
}

export interface ResourceStatsDto {
  staffPresent: number;
  bedsAvailable: number;
  orsAvailable: number;
  icuBedsAvailable: number;
  bloodUnitsAvailable: number;
  criticalShortages: string[];
}

export interface ActivityLogDto {
  id: string;
  timestamp: string;
  activityType: string;
  description: string;
  performedBy: string;
  details?: string;
}

export interface PendingActionDto {
  id: string;
  actionType: string;
  description: string;
  assignedTo: string;
  priority: number;
  dueTime?: string;
  status: string;
}

export interface MCIAlertDto {
  id: string;
  alertType: string;
  severity: number;
  message: string;
  source: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface AssignCommandDto {
  eventId: string;
  role: string;
  staffId: string;
}

export interface LogActivityDto {
  eventId: string;
  activityType: string;
  description: string;
  details?: string;
}

// #endregion

// #region Family Notification DTOs

export interface FamilyNotificationDto {
  id: string;
  victimId: string;
  victimCode: string;
  victimName?: string;
  contactName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  notificationType: string; // Initial, Update, Discharge, Transfer
  notificationTypeName: string;
  message: string;
  notifiedBy: string;
  notifiedByName: string;
  notifiedAt: string;
  notificationMethod: string; // Phone, SMS, Email, InPerson
  successful: boolean;
  response?: string;
  notes?: string;
}

export interface NotifyFamilyDto {
  victimId: string;
  contactName: string;
  relationship: string;
  phone: string;
  email?: string;
  notificationType: string;
  message: string;
  notificationMethod: string;
}

export interface FamilyInquiryDto {
  id: string;
  eventId: string;
  inquirerName: string;
  inquirerPhone: string;
  inquirerRelationship: string;
  patientDescription: string;
  matchedVictimId?: string;
  matchedVictimCode?: string;
  status: string; // Pending, Matched, NotFound, Resolved
  statusName: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface RegisterInquiryDto {
  eventId: string;
  inquirerName: string;
  inquirerPhone: string;
  inquirerRelationship: string;
  patientDescription: string;
}

export interface ResolveInquiryDto {
  inquiryId: string;
  matchedVictimId?: string;
  notes: string;
}

// #endregion

// #region Reporting DTOs

export interface MCIReportDto {
  id: string;
  eventId: string;
  eventCode: string;
  eventName: string;
  reportType: string; // Situational, Final, AfterAction
  reportTypeName: string;
  generatedAt: string;
  generatedBy: string;
  // Event summary
  eventSummary: EventSummaryDto;
  // Victim statistics
  victimStatistics: VictimStatisticsDto;
  // Resource utilization
  resourceUtilization: ResourceUtilizationDto;
  // Timeline
  eventTimeline: TimelineEventDto[];
  // Lessons learned (for after action)
  lessonsLearned?: string[];
  recommendations?: string[];
  // Authorities
  reportedToAuthorities: AuthorityReportStatusDto[];
  // File
  reportUrl?: string;
}

export interface EventSummaryDto {
  eventName: string;
  eventType: string;
  location: string;
  alertLevel: number;
  activatedAt: string;
  deactivatedAt?: string;
  totalDurationHours?: number;
  peakVictimCount: number;
  totalStaffActivated: number;
}

export interface VictimStatisticsDto {
  totalVictims: number;
  byCategory: CategoryCountDto[];
  byDisposition: DispositionCountDto[];
  deceased: number;
  mortalityRate: number;
  averageTimeToTreatment: number;
  averageLengthOfStay: number;
}

export interface DispositionCountDto {
  disposition: string;
  dispositionName: string;
  count: number;
  percentage: number;
}

export interface ResourceUtilizationDto {
  peakStaffCount: number;
  peakBedOccupancy: number;
  orCasesPerformed: number;
  bloodUnitsUsed: number;
  criticalSupplyShortages: string[];
  externalResourcesRequested: string[];
}

export interface TimelineEventDto {
  timestamp: string;
  eventType: string;
  description: string;
  significance: string;
}

export interface AuthorityReportStatusDto {
  authority: string;
  reportType: string;
  submittedAt?: string;
  acknowledged: boolean;
  reference?: string;
}

export interface GenerateReportDto {
  eventId: string;
  reportType: string;
  includeLessonsLearned?: boolean;
}

// #endregion

// #region Dashboard DTOs

export interface MCIDashboardDto {
  // Active events
  activeEvents: MCIEventDto[];
  hasActiveEvent: boolean;
  // Current event details (if active)
  currentEvent?: MCIEventDto;
  currentResources?: MCIResourceDto;
  currentVictimStats?: VictimStatsDto;
  recentVictims?: MCIVictimDto[];
  criticalAlerts?: MCIAlertDto[];
  // Historical
  eventsThisYear: number;
  totalVictimsThisYear: number;
  averageResponseTime: number;
  // Readiness
  readinessScore: number;
  staffOnCall: number;
  bedsAvailable: number;
  equipmentReady: boolean;
  suppliesAdequate: boolean;
  lastDrillDate?: string;
  // Trend
  eventsByMonth: MonthlyEventStatDto[];
}

export interface MonthlyEventStatDto {
  month: string;
  eventCount: number;
  victimCount: number;
  averageAlertLevel: number;
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

const BASE_URL = '/api/mci';

// #region MCI Events

export const getEvents = (status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<MCIEventDto[]>(`${BASE_URL}/events`, { params: { status, fromDate, toDate } });

export const getEvent = (id: string) =>
  apiClient.get<MCIEventDto>(`${BASE_URL}/events/${id}`);

export const getActiveEvent = () =>
  apiClient.get<MCIEventDto>(`${BASE_URL}/events/active`);

export const activateMCI = (dto: ActivateMCIDto) =>
  apiClient.post<MCIActivationResultDto>(`${BASE_URL}/events/activate`, dto);

export const escalateAlert = (dto: EscalateAlertDto) =>
  apiClient.post<MCIEventDto>(`${BASE_URL}/events/escalate`, dto);

export const updateEventPhase = (eventId: string, phase: string, notes?: string) =>
  apiClient.post<MCIEventDto>(`${BASE_URL}/events/${eventId}/phase`, { phase, notes });

export const deactivateMCI = (dto: DeactivateMCIDto) =>
  apiClient.post<MCIDeactivationResultDto>(`${BASE_URL}/events/deactivate`, dto);

// #endregion

// #region Victims

export const getVictims = (eventId: string, triageCategory?: string, status?: number) =>
  apiClient.get<MCIVictimDto[]>(`${BASE_URL}/events/${eventId}/victims`, { params: { triageCategory, status } });

export const getVictim = (id: string) =>
  apiClient.get<MCIVictimDto>(`${BASE_URL}/victims/${id}`);

export const registerVictim = (dto: RegisterVictimDto) =>
  apiClient.post<MCIVictimDto>(`${BASE_URL}/victims`, dto);

export const triageVictim = (dto: TriageVictimDto) =>
  apiClient.post<TriageResultDto>(`${BASE_URL}/victims/triage`, dto);

export const retriageVictim = (dto: TriageVictimDto) =>
  apiClient.post<TriageResultDto>(`${BASE_URL}/victims/retriage`, dto);

export const updateVictim = (dto: UpdateVictimDto) =>
  apiClient.put<MCIVictimDto>(`${BASE_URL}/victims/${dto.victimId}`, dto);

export const recordVitals = (victimId: string, vitals: VictimVitalSignsDto) =>
  apiClient.post<MCIVictimDto>(`${BASE_URL}/victims/${victimId}/vitals`, vitals);

export const addProcedure = (victimId: string, procedure: VictimProcedureDto) =>
  apiClient.post<MCIVictimDto>(`${BASE_URL}/victims/${victimId}/procedures`, procedure);

export const addMedication = (victimId: string, medication: VictimMedicationDto) =>
  apiClient.post<MCIVictimDto>(`${BASE_URL}/victims/${victimId}/medications`, medication);

export const disposeVictim = (dto: DisposeVictimDto) =>
  apiClient.post<MCIVictimDto>(`${BASE_URL}/victims/dispose`, dto);

export const printVictimTag = (victimId: string) =>
  apiClient.get(`${BASE_URL}/victims/${victimId}/print-tag`, { responseType: 'blob' });

export const searchVictim = (eventId: string, query: string) =>
  apiClient.get<MCIVictimDto[]>(`${BASE_URL}/events/${eventId}/victims/search`, { params: { query } });

// #endregion

// #region Resources

export const getResources = (eventId: string) =>
  apiClient.get<MCIResourceDto>(`${BASE_URL}/events/${eventId}/resources`);

export const allocateResource = (dto: AllocateResourceDto) =>
  apiClient.post<boolean>(`${BASE_URL}/resources/allocate`, dto);

export const releaseResource = (eventId: string, resourceType: string, resourceId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/resources/release`, { eventId, resourceType, resourceId });

export const requestAdditionalResource = (dto: RequestAdditionalResourceDto) =>
  apiClient.post<boolean>(`${BASE_URL}/resources/request`, dto);

export const getBedStatus = (eventId: string) =>
  apiClient.get<BedResourceDto>(`${BASE_URL}/events/${eventId}/resources/beds`);

export const getORStatus = (eventId: string) =>
  apiClient.get<ORResourceDto>(`${BASE_URL}/events/${eventId}/resources/or`);

export const getBloodStatus = (eventId: string) =>
  apiClient.get<BloodResourceDto>(`${BASE_URL}/events/${eventId}/resources/blood`);

// #endregion

// #region Command Center

export const getCommandCenter = (eventId: string) =>
  apiClient.get<CommandCenterDto>(`${BASE_URL}/events/${eventId}/command-center`);

export const assignCommand = (dto: AssignCommandDto) =>
  apiClient.post<boolean>(`${BASE_URL}/command/assign`, dto);

export const logActivity = (dto: LogActivityDto) =>
  apiClient.post<ActivityLogDto>(`${BASE_URL}/command/log`, dto);

export const getActivityLog = (eventId: string, fromTime?: string) =>
  apiClient.get<ActivityLogDto[]>(`${BASE_URL}/events/${eventId}/activity-log`, { params: { fromTime } });

export const getAlerts = (eventId: string, acknowledged?: boolean) =>
  apiClient.get<MCIAlertDto[]>(`${BASE_URL}/events/${eventId}/alerts`, { params: { acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const broadcastMessage = (eventId: string, message: string, recipients: string[]) =>
  apiClient.post<boolean>(`${BASE_URL}/events/${eventId}/broadcast`, { message, recipients });

// #endregion

// #region Family Notification

export const getNotifications = (victimId: string) =>
  apiClient.get<FamilyNotificationDto[]>(`${BASE_URL}/victims/${victimId}/notifications`);

export const notifyFamily = (dto: NotifyFamilyDto) =>
  apiClient.post<FamilyNotificationDto>(`${BASE_URL}/family/notify`, dto);

export const getInquiries = (eventId: string, status?: string) =>
  apiClient.get<FamilyInquiryDto[]>(`${BASE_URL}/events/${eventId}/inquiries`, { params: { status } });

export const registerInquiry = (dto: RegisterInquiryDto) =>
  apiClient.post<FamilyInquiryDto>(`${BASE_URL}/family/inquiry`, dto);

export const resolveInquiry = (dto: ResolveInquiryDto) =>
  apiClient.post<FamilyInquiryDto>(`${BASE_URL}/family/inquiry/resolve`, dto);

// #endregion

// #region Reporting

export const generateReport = (dto: GenerateReportDto) =>
  apiClient.post<MCIReportDto>(`${BASE_URL}/reports/generate`, dto);

export const getReports = (eventId: string) =>
  apiClient.get<MCIReportDto[]>(`${BASE_URL}/events/${eventId}/reports`);

export const getReport = (reportId: string) =>
  apiClient.get<MCIReportDto>(`${BASE_URL}/reports/${reportId}`);

export const downloadReport = (reportId: string) =>
  apiClient.get(`${BASE_URL}/reports/${reportId}/download`, { responseType: 'blob' });

export const reportToAuthority = (eventId: string, authority: string, reportType: string) =>
  apiClient.post<boolean>(`${BASE_URL}/events/${eventId}/report-authority`, { authority, reportType });

// #endregion

// #region Dashboard

export const getDashboard = () =>
  apiClient.get<MCIDashboardDto>(`${BASE_URL}/dashboard`);

export const getReadinessStatus = () =>
  apiClient.get(`${BASE_URL}/readiness`);

export const getMCIStatistics = (year: number) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { year } });

// #endregion

export default {
  // Events
  getEvents,
  getEvent,
  getActiveEvent,
  activateMCI,
  escalateAlert,
  updateEventPhase,
  deactivateMCI,
  // Victims
  getVictims,
  getVictim,
  registerVictim,
  triageVictim,
  retriageVictim,
  updateVictim,
  recordVitals,
  addProcedure,
  addMedication,
  disposeVictim,
  printVictimTag,
  searchVictim,
  // Resources
  getResources,
  allocateResource,
  releaseResource,
  requestAdditionalResource,
  getBedStatus,
  getORStatus,
  getBloodStatus,
  // Command
  getCommandCenter,
  assignCommand,
  logActivity,
  getActivityLog,
  getAlerts,
  acknowledgeAlert,
  broadcastMessage,
  // Family
  getNotifications,
  notifyFamily,
  getInquiries,
  registerInquiry,
  resolveInquiry,
  // Reports
  generateReport,
  getReports,
  getReport,
  downloadReport,
  reportToAuthority,
  // Dashboard
  getDashboard,
  getReadinessStatus,
  getMCIStatistics,
};
