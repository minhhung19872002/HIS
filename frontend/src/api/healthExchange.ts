/**
 * API Client cho Phân hệ 19: Liên thông Y tế (Health Information Exchange)
 * Module: Health Exchange
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region HIE Connection DTOs

export interface HIEConnectionDto {
  id: string;
  connectionCode: string;
  connectionName: string;
  connectionType: string; // BHXH, MOH, CDC, Hospital, Lab, Pharmacy
  connectionTypeName: string;
  partnerCode: string;
  partnerName: string;
  endpoint: string;
  protocol: string; // REST, SOAP, HL7, FHIR
  protocolName: string;
  authType: string; // OAuth2, APIKey, Certificate, Basic
  status: number; // 1-Active, 2-Inactive, 3-Error
  statusName: string;
  lastConnectedAt?: string;
  lastSyncAt?: string;
  errorCount: number;
  lastError?: string;
  supportedOperations: string[];
  dataExchangeFormat: string; // JSON, XML, HL7v2
  certificateExpiry?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateConnectionDto {
  connectionName: string;
  connectionType: string;
  partnerCode: string;
  partnerName: string;
  endpoint: string;
  protocol: string;
  authType: string;
  credentials: { [key: string]: string };
  supportedOperations: string[];
  dataExchangeFormat: string;
}

export interface ConnectionTestResultDto {
  success: boolean;
  responseTime: number;
  message: string;
  details?: string;
  testedAt: string;
}

// #endregion

// #region Insurance Integration DTOs

export interface InsuranceSubmissionDto {
  id: string;
  submissionCode: string;
  submissionType: string; // XML130, XML131, XML4210, XML7900
  submissionTypeName: string;
  periodFrom: string;
  periodTo: string;
  departmentId?: string;
  departmentName?: string;
  totalRecords: number;
  totalClaimAmount: number;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  // Validation results
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  validationErrors: ValidationErrorDto[];
  // BHXH Response
  bhxhTransactionId?: string;
  bhxhSubmittedAt?: string;
  bhxhStatus?: string;
  bhxhStatusName?: string;
  bhxhResponse?: string;
  bhxhApprovedAmount?: number;
  bhxhRejectedAmount?: number;
  bhxhRejectionReasons?: string[];
  // Status
  status: number; // 1-Draft, 2-Validated, 3-Submitted, 4-Accepted, 5-PartialReject, 6-Rejected
  statusName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ValidationErrorDto {
  recordId: string;
  patientCode?: string;
  patientName?: string;
  field: string;
  errorCode: string;
  errorMessage: string;
  severity: string; // Error, Warning
}

export interface GenerateXMLDto {
  xmlType: string;
  periodFrom: string;
  periodTo: string;
  departmentId?: string;
  patientIds?: string[];
}

export interface XMLGenerationResultDto {
  success: boolean;
  submissionId: string;
  xmlType: string;
  totalRecords: number;
  totalAmount: number;
  validRecords: number;
  invalidRecords: number;
  validationErrors: ValidationErrorDto[];
  xmlFileUrl?: string;
}

export interface SubmitToInsuranceDto {
  submissionId: string;
  signatureRequired: boolean;
  digitalSignature?: string;
}

export interface InsuranceCheckDto {
  patientId: string;
  insuranceNumber: string;
  checkDate: string;
  result: InsuranceCheckResultDto;
}

export interface InsuranceCheckResultDto {
  isValid: boolean;
  holderName: string;
  insuranceNumber: string;
  validFrom: string;
  validTo: string;
  facility?: string;
  coverageType: string;
  remainingBenefits?: number;
  lastUsedDate?: string;
  lastUsedFacility?: string;
  warningMessage?: string;
  errorMessage?: string;
  checkedAt: string;
  bhxhReference?: string;
}

export interface InsuranceStatisticsDto {
  fromDate: string;
  toDate: string;
  totalSubmissions: number;
  totalRecords: number;
  totalClaimAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  pendingAmount: number;
  approvalRate: number;
  bySubmissionType: SubmissionTypeStatDto[];
  byDepartment: DepartmentSubmissionStatDto[];
  byMonth: MonthlySubmissionStatDto[];
  topRejectionReasons: RejectionReasonStatDto[];
}

export interface SubmissionTypeStatDto {
  submissionType: string;
  submissionTypeName: string;
  count: number;
  totalAmount: number;
  approvedAmount: number;
}

export interface DepartmentSubmissionStatDto {
  departmentId: string;
  departmentName: string;
  recordCount: number;
  claimAmount: number;
  approvalRate: number;
}

export interface MonthlySubmissionStatDto {
  month: string;
  submissions: number;
  claimAmount: number;
  approvedAmount: number;
}

export interface RejectionReasonStatDto {
  reason: string;
  count: number;
  percentage: number;
}

// #endregion

// #region EHR Exchange DTOs

export interface EHRExchangeDto {
  id: string;
  exchangeCode: string;
  exchangeType: string; // Import, Export
  exchangeTypeName: string;
  format: string; // FHIR, HL7v2, CDA, Custom
  formatName: string;
  partnerConnectionId: string;
  partnerName: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  resourceTypes: string[]; // Patient, Encounter, Observation, MedicationRequest, etc.
  recordCount: number;
  dataSize: number;
  exchangedAt: string;
  exchangedBy: string;
  exchangedByName: string;
  status: number; // 1-Pending, 2-InProgress, 3-Completed, 4-Failed
  statusName: string;
  errorMessage?: string;
  auditTrail: ExchangeAuditDto[];
}

export interface ExchangeAuditDto {
  timestamp: string;
  action: string;
  user: string;
  details: string;
  status: string;
}

export interface ExportEHRDto {
  patientId: string;
  connectionId: string;
  format: string;
  resourceTypes: string[];
  dateFrom?: string;
  dateTo?: string;
  purpose: string;
  patientConsent: boolean;
}

export interface ImportEHRDto {
  connectionId: string;
  patientId?: string;
  externalPatientId?: string;
  format: string;
  resourceTypes: string[];
}

export interface EHRImportResultDto {
  success: boolean;
  exchangeId: string;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  mappingIssues: MappingIssueDto[];
  importedResources: ImportedResourceDto[];
}

export interface MappingIssueDto {
  resourceType: string;
  field: string;
  issue: string;
  resolution: string;
}

export interface ImportedResourceDto {
  resourceType: string;
  externalId: string;
  localId: string;
  status: string;
}

// #endregion

// #region Electronic Referral DTOs

export interface ElectronicReferralDto {
  id: string;
  referralCode: string;
  referralType: string; // Outbound, Inbound
  referralTypeName: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth: string;
  insuranceNumber?: string;
  // Source
  sourceFacilityCode: string;
  sourceFacilityName: string;
  sourceDepartment: string;
  sourceDoctor: string;
  sourceDoctorName: string;
  // Destination
  destinationFacilityCode: string;
  destinationFacilityName: string;
  destinationDepartment?: string;
  destinationDoctor?: string;
  // Clinical info
  diagnosis: string;
  diagnosisIcd: string;
  reasonForReferral: string;
  clinicalSummary: string;
  treatmentHistory?: string;
  currentMedications?: string;
  allergies?: string;
  labResults?: string;
  imagingResults?: string;
  specialInstructions?: string;
  urgency: number; // 1-Routine, 2-Urgent, 3-Emergency
  urgencyName: string;
  // Attachments
  attachments: ReferralAttachmentDto[];
  // Response
  accepted: boolean;
  acceptedDate?: string;
  acceptedBy?: string;
  rejectionReason?: string;
  appointmentDate?: string;
  responseNotes?: string;
  // Status
  status: number; // 1-Created, 2-Sent, 3-Received, 4-Accepted, 5-Rejected, 6-Completed
  statusName: string;
  sentAt?: string;
  receivedAt?: string;
  completedAt?: string;
  outcome?: string;
  createdAt: string;
  createdBy: string;
}

export interface ReferralAttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string; // LabReport, ImagingReport, DischargeSummary, Other
  url: string;
  uploadedAt: string;
}

export interface CreateReferralDto {
  patientId: string;
  destinationFacilityCode: string;
  destinationDepartment?: string;
  diagnosis: string;
  diagnosisIcd: string;
  reasonForReferral: string;
  clinicalSummary: string;
  treatmentHistory?: string;
  currentMedications?: string;
  allergies?: string;
  specialInstructions?: string;
  urgency: number;
  attachmentIds?: string[];
}

export interface RespondToReferralDto {
  referralId: string;
  accepted: boolean;
  appointmentDate?: string;
  rejectionReason?: string;
  responseNotes?: string;
}

export interface CompleteReferralDto {
  referralId: string;
  outcome: string;
  summaryNotes: string;
  sendReportToSource: boolean;
}

export interface FacilitySearchDto {
  keyword?: string;
  province?: string;
  facilityType?: string;
  specialty?: string;
}

export interface FacilityDto {
  facilityCode: string;
  facilityName: string;
  facilityType: string;
  address: string;
  province: string;
  phone?: string;
  email?: string;
  specialties?: string[];
  acceptsReferrals: boolean;
  isActive: boolean;
}

// #endregion

// #region Teleconsultation Exchange DTOs

export interface TeleconsultationRequestDto {
  id: string;
  requestCode: string;
  requestType: string; // SecondOpinion, Consultation, EmergencyConsult
  requestTypeName: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  // Requesting facility
  requestingFacilityCode: string;
  requestingFacilityName: string;
  requestingDoctor: string;
  requestingDoctorName: string;
  // Consulting facility
  consultingFacilityCode: string;
  consultingFacilityName: string;
  consultingSpecialty: string;
  consultingDoctor?: string;
  consultingDoctorName?: string;
  // Clinical info
  chiefComplaint: string;
  clinicalQuestion: string;
  relevantHistory: string;
  currentFindings: string;
  labResults?: string;
  imagingResults?: string;
  attachments: ReferralAttachmentDto[];
  // Urgency
  urgency: number;
  urgencyName: string;
  // Schedule
  preferredDate?: string;
  preferredTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number;
  videoRoomUrl?: string;
  // Response
  accepted: boolean;
  acceptedDate?: string;
  consultationDate?: string;
  consultationNotes?: string;
  recommendations?: string;
  followUpNeeded: boolean;
  followUpInstructions?: string;
  // Status
  status: number;
  statusName: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTeleconsultRequestDto {
  requestType: string;
  patientId: string;
  consultingFacilityCode: string;
  consultingSpecialty: string;
  chiefComplaint: string;
  clinicalQuestion: string;
  relevantHistory: string;
  currentFindings: string;
  labResults?: string;
  imagingResults?: string;
  attachmentIds?: string[];
  urgency: number;
  preferredDate?: string;
  preferredTime?: string;
}

export interface RespondToTeleconsultDto {
  requestId: string;
  accepted: boolean;
  consultingDoctorId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  rejectionReason?: string;
}

export interface CompleteTeleconsultDto {
  requestId: string;
  consultationNotes: string;
  recommendations: string;
  followUpNeeded: boolean;
  followUpInstructions?: string;
}

// #endregion

// #region Authority Reporting DTOs

export interface AuthorityReportDto {
  id: string;
  reportCode: string;
  reportType: string; // NotifiableDisease, MortalityReport, BirthReport, AdverseEvent
  reportTypeName: string;
  authorityCode: string;
  authorityName: string;
  reportingPeriodFrom?: string;
  reportingPeriodTo?: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  reportContent: { [key: string]: any };
  submittedBy: string;
  submittedByName: string;
  submittedAt?: string;
  authorityReference?: string;
  authorityResponse?: string;
  status: number; // 1-Draft, 2-Submitted, 3-Acknowledged, 4-Rejected
  statusName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAuthorityReportDto {
  reportType: string;
  authorityCode: string;
  reportingPeriodFrom?: string;
  reportingPeriodTo?: string;
  patientId?: string;
  reportContent: { [key: string]: any };
}

export interface NotifiableDiseaseReportDto {
  patientId: string;
  diseaseCode: string;
  diseaseName: string;
  diagnosisDate: string;
  onsetDate?: string;
  symptoms: string[];
  labConfirmed: boolean;
  labResults?: string;
  exposureHistory?: string;
  travelHistory?: string;
  contacts?: ContactDto[];
  outcome?: string;
  reportingDoctor: string;
}

export interface ContactDto {
  name: string;
  relationship: string;
  phone?: string;
  address?: string;
  exposureDate?: string;
  symptomatic: boolean;
}

// #endregion

// #region Dashboard DTOs

export interface HIEDashboardDto {
  date: string;
  // Connections
  totalConnections: number;
  activeConnections: number;
  errorConnections: number;
  // Insurance
  pendingSubmissions: number;
  submittedToday: number;
  totalClaimsPending: number;
  approvalRate: number;
  // Referrals
  outboundReferralsPending: number;
  inboundReferralsPending: number;
  referralsCompletedThisMonth: number;
  // EHR Exchange
  ehrExchangesToday: number;
  importsPending: number;
  exportsPending: number;
  // Alerts
  expiringCertificates: number;
  failedTransactions: number;
  alerts: HIEAlertDto[];
  // Statistics
  connectionStatus: ConnectionStatusDto[];
  insuranceTrend: InsuranceTrendDto[];
  referralsByFacility: FacilityReferralStatDto[];
}

export interface ConnectionStatusDto {
  connectionId: string;
  connectionName: string;
  status: string;
  lastConnected?: string;
  errorCount: number;
}

export interface InsuranceTrendDto {
  date: string;
  submissions: number;
  claimAmount: number;
  approvedAmount: number;
}

export interface FacilityReferralStatDto {
  facilityCode: string;
  facilityName: string;
  outboundCount: number;
  inboundCount: number;
  completionRate: number;
}

export interface HIEAlertDto {
  id: string;
  alertType: string;
  severity: number;
  message: string;
  referenceId?: string;
  createdAt: string;
  acknowledgedAt?: string;
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

const BASE_URL = '/hie';

// #region Connections

export const getConnections = (status?: number) =>
  apiClient.get<HIEConnectionDto[]>(`${BASE_URL}/connections`, { params: { status } });

export const getConnection = (id: string) =>
  apiClient.get<HIEConnectionDto>(`${BASE_URL}/connections/${id}`);

export const createConnection = (dto: CreateConnectionDto) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections`, dto);

export const updateConnection = (id: string, dto: CreateConnectionDto) =>
  apiClient.put<HIEConnectionDto>(`${BASE_URL}/connections/${id}`, dto);

export const testConnection = (id: string) =>
  apiClient.post<ConnectionTestResultDto>(`${BASE_URL}/connections/${id}/test`);

export const activateConnection = (id: string) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections/${id}/activate`);

export const deactivateConnection = (id: string) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections/${id}/deactivate`);

// #endregion

// #region Insurance

export const getInsuranceSubmissions = (status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<InsuranceSubmissionDto[]>(`${BASE_URL}/insurance/submissions`, { params: { status, fromDate, toDate } });

export const getInsuranceSubmission = (id: string) =>
  apiClient.get<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submissions/${id}`);

export const generateXML = (dto: GenerateXMLDto) =>
  apiClient.post<XMLGenerationResultDto>(`${BASE_URL}/insurance/generate-xml`, dto);

export const validateSubmission = (submissionId: string) =>
  apiClient.post<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submissions/${submissionId}/validate`);

export const submitToInsurance = (dto: SubmitToInsuranceDto) =>
  apiClient.post<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submit`, dto);

export const checkInsuranceStatus = (submissionId: string) =>
  apiClient.get<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submissions/${submissionId}/check-status`);

export const downloadXML = (submissionId: string) =>
  apiClient.get(`${BASE_URL}/insurance/submissions/${submissionId}/download`, { responseType: 'blob' });

export const checkPatientInsurance = (insuranceNumber: string, checkDate: string) =>
  apiClient.get<InsuranceCheckResultDto>(`${BASE_URL}/insurance/check`, { params: { insuranceNumber, checkDate } });

export const getInsuranceStatistics = (fromDate: string, toDate: string) =>
  apiClient.get<InsuranceStatisticsDto>(`${BASE_URL}/insurance/statistics`, { params: { fromDate, toDate } });

// #endregion

// #region EHR Exchange

export const getEHRExchanges = (exchangeType?: string, status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<EHRExchangeDto[]>(`${BASE_URL}/ehr-exchanges`, { params: { exchangeType, status, fromDate, toDate } });

export const getEHRExchange = (id: string) =>
  apiClient.get<EHRExchangeDto>(`${BASE_URL}/ehr-exchanges/${id}`);

export const exportEHR = (dto: ExportEHRDto) =>
  apiClient.post<EHRExchangeDto>(`${BASE_URL}/ehr-exchanges/export`, dto);

export const importEHR = (dto: ImportEHRDto) =>
  apiClient.post<EHRImportResultDto>(`${BASE_URL}/ehr-exchanges/import`, dto);

export const getPatientExternalRecords = (patientId: string, connectionId: string) =>
  apiClient.get(`${BASE_URL}/ehr-exchanges/patient/${patientId}/external`, { params: { connectionId } });

// #endregion

// #region Referrals

export const getReferrals = (referralType?: string, status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<ElectronicReferralDto[]>(`${BASE_URL}/referrals`, { params: { referralType, status, fromDate, toDate } });

export const getReferral = (id: string) =>
  apiClient.get<ElectronicReferralDto>(`${BASE_URL}/referrals/${id}`);

export const createReferral = (dto: CreateReferralDto) =>
  apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals`, dto);

export const sendReferral = (referralId: string) =>
  apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals/${referralId}/send`);

export const respondToReferral = (dto: RespondToReferralDto) =>
  apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals/respond`, dto);

export const completeReferral = (dto: CompleteReferralDto) =>
  apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals/complete`, dto);

export const cancelReferral = (referralId: string, reason: string) =>
  apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals/${referralId}/cancel`, { reason });

export const uploadReferralAttachment = (referralId: string, formData: FormData) =>
  apiClient.post<ReferralAttachmentDto>(`${BASE_URL}/referrals/${referralId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const searchFacilities = (params: FacilitySearchDto) =>
  apiClient.get<FacilityDto[]>(`${BASE_URL}/facilities/search`, { params });

export const printReferralLetter = (referralId: string) =>
  apiClient.get(`${BASE_URL}/referrals/${referralId}/print`, { responseType: 'blob' });

// #endregion

// #region Teleconsultation

export const getTeleconsultRequests = (status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<TeleconsultationRequestDto[]>(`${BASE_URL}/teleconsults`, { params: { status, fromDate, toDate } });

export const getTeleconsultRequest = (id: string) =>
  apiClient.get<TeleconsultationRequestDto>(`${BASE_URL}/teleconsults/${id}`);

export const createTeleconsultRequest = (dto: CreateTeleconsultRequestDto) =>
  apiClient.post<TeleconsultationRequestDto>(`${BASE_URL}/teleconsults`, dto);

export const respondToTeleconsult = (dto: RespondToTeleconsultDto) =>
  apiClient.post<TeleconsultationRequestDto>(`${BASE_URL}/teleconsults/respond`, dto);

export const startTeleconsult = (requestId: string) =>
  apiClient.post<{ roomUrl: string, token: string }>(`${BASE_URL}/teleconsults/${requestId}/start`);

export const completeTeleconsult = (dto: CompleteTeleconsultDto) =>
  apiClient.post<TeleconsultationRequestDto>(`${BASE_URL}/teleconsults/complete`, dto);

// #endregion

// #region Authority Reporting

export const getAuthorityReports = (reportType?: string, status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<AuthorityReportDto[]>(`${BASE_URL}/authority-reports`, { params: { reportType, status, fromDate, toDate } });

export const getAuthorityReport = (id: string) =>
  apiClient.get<AuthorityReportDto>(`${BASE_URL}/authority-reports/${id}`);

export const createAuthorityReport = (dto: CreateAuthorityReportDto) =>
  apiClient.post<AuthorityReportDto>(`${BASE_URL}/authority-reports`, dto);

export const submitAuthorityReport = (reportId: string) =>
  apiClient.post<AuthorityReportDto>(`${BASE_URL}/authority-reports/${reportId}/submit`);

export const reportNotifiableDisease = (dto: NotifiableDiseaseReportDto) =>
  apiClient.post<AuthorityReportDto>(`${BASE_URL}/authority-reports/notifiable-disease`, dto);

// #endregion

// #region Dashboard

export const getDashboard = () =>
  apiClient.get<HIEDashboardDto>(`${BASE_URL}/dashboard`);

export const getAlerts = (acknowledged?: boolean) =>
  apiClient.get<HIEAlertDto[]>(`${BASE_URL}/alerts`, { params: { acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const getHIEStatistics = (fromDate: string, toDate: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate } });

export const exportHIEReport = (reportType: string, fromDate: string, toDate: string, format?: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { reportType, fromDate, toDate, format }, responseType: 'blob' });

// #endregion

export default {
  // Connections
  getConnections,
  getConnection,
  createConnection,
  updateConnection,
  testConnection,
  activateConnection,
  deactivateConnection,
  // Insurance
  getInsuranceSubmissions,
  getInsuranceSubmission,
  generateXML,
  validateSubmission,
  submitToInsurance,
  checkInsuranceStatus,
  downloadXML,
  checkPatientInsurance,
  getInsuranceStatistics,
  // EHR
  getEHRExchanges,
  getEHRExchange,
  exportEHR,
  importEHR,
  getPatientExternalRecords,
  // Referrals
  getReferrals,
  getReferral,
  createReferral,
  sendReferral,
  respondToReferral,
  completeReferral,
  cancelReferral,
  uploadReferralAttachment,
  searchFacilities,
  printReferralLetter,
  // Teleconsult
  getTeleconsultRequests,
  getTeleconsultRequest,
  createTeleconsultRequest,
  respondToTeleconsult,
  startTeleconsult,
  completeTeleconsult,
  // Authority
  getAuthorityReports,
  getAuthorityReport,
  createAuthorityReport,
  submitAuthorityReport,
  reportNotifiableDisease,
  // Dashboard
  getDashboard,
  getAlerts,
  acknowledgeAlert,
  getHIEStatistics,
  exportHIEReport,
};
