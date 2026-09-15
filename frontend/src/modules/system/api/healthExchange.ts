/**
 * API Client cho Phân hệ 19: Liên thông Y tế (Health Information Exchange)
 * Module: Health Exchange
 */

import apiClient from '../../../services/apiClient';

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
  reportContent: Record<string, unknown>;
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
  reportContent: Record<string, unknown>;
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

export type { PagedResultDto } from '../../../types/pagination';

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/hie';

// #region Connections

export const getConnections = (status?: number) =>
  apiClient.get<HIEConnectionDto[]>(`${BASE_URL}/connections`, { params: { status } });

export const getConnection = (id: string) =>
  apiClient.get<HIEConnectionDto>(`${BASE_URL}/connections/${id}`);

// BE HIEConnectionConfigDto: { connectionName, connectionType, endpoint, authMethod } (authType was not bound).
const toBeConnection = (dto: CreateConnectionDto) => ({
  connectionName: dto.connectionName,
  connectionType: dto.connectionType,
  endpoint: dto.endpoint,
  authMethod: dto.authType,
});

export const createConnection = (dto: CreateConnectionDto) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections`, toBeConnection(dto));

export const updateConnection = (id: string, dto: CreateConnectionDto) =>
  apiClient.put<HIEConnectionDto>(`${BASE_URL}/connections/${id}`, toBeConnection(dto));

export const testConnection = (id: string) =>
  apiClient.post<ConnectionTestResultDto>(`${BASE_URL}/connections/${id}/test`);

export const activateConnection = (id: string) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections/${id}/activate`);

export const deactivateConnection = (id: string) =>
  apiClient.post<HIEConnectionDto>(`${BASE_URL}/connections/${id}/deactivate`);

// #endregion

// #region Insurance

// BE HIEController returns InsuranceXMLSubmissionDto (xmlType/fromDate/toDate/recordCount/totalAmount,
// status as a STRING). The page reads InsuranceSubmissionDto (numeric status 1..6) — adapt here so the
// page stays unchanged. Routes: GET insurance/submissions · POST insurance/xml/generate (query params) ·
// POST insurance/xml/{id}/submit. The old generate-xml / submit routes did not exist (404).
interface HieXmlSubmissionRaw {
  id: string; submissionCode?: string; xmlType?: string;
  fromDate?: string; toDate?: string; submissionDate?: string; generatedAt?: string;
  recordCount?: number; totalAmount?: number; insuranceClaimAmount?: number;
  status?: string; bhxhTransactionId?: string; isValid?: boolean; errorCount?: number; warningCount?: number;
  errors?: { recordId?: string; patientName?: string; fieldName?: string; errorCode?: string; errorMessage?: string; severity?: string }[];
  approvedAmount?: number; rejectedAmount?: number;
}
const HIE_STATUS: Record<string, [number, string]> = {
  draft: [1, 'Nháp'], generated: [1, 'Đã tạo XML'], validated: [2, 'Đã kiểm tra'], submitted: [3, 'Đã gửi'],
  accepted: [4, 'BHXH chấp nhận'], partiallyaccepted: [5, 'Từ chối một phần'], rejected: [6, 'Bị từ chối'],
};
const HIE_STATUS_BY_NUM: Record<number, string> = { 1: 'Draft', 2: 'Validated', 3: 'Submitted', 4: 'Accepted', 5: 'PartiallyAccepted', 6: 'Rejected' };
const realDate = (d?: string) => (d && !d.startsWith('0001-') ? d : '');
const mapHieSubmission = (r: HieXmlSubmissionRaw): InsuranceSubmissionDto => {
  const [status, statusName] = HIE_STATUS[(r.status || '').toLowerCase()] ?? [1, r.status || ''];
  return {
    id: r.id,
    submissionCode: r.submissionCode || '',
    submissionType: r.xmlType || '',
    submissionTypeName: r.xmlType ? `XML ${r.xmlType}` : '',
    periodFrom: realDate(r.fromDate).slice(0, 10),
    periodTo: realDate(r.toDate).slice(0, 10),
    totalRecords: r.recordCount ?? 0,
    totalClaimAmount: r.insuranceClaimAmount || r.totalAmount || 0,
    submittedBy: '',
    submittedByName: '',
    submittedAt: status >= 3 ? realDate(r.submissionDate) : '',
    validRecords: Math.max(0, (r.recordCount ?? 0) - (r.errorCount ?? 0)),
    invalidRecords: r.errorCount ?? 0,
    warningRecords: r.warningCount ?? 0,
    validationErrors: (r.errors ?? []).map((e) => ({
      recordId: e.recordId || '', patientName: e.patientName, field: e.fieldName || '',
      errorCode: e.errorCode || '', errorMessage: e.errorMessage || '', severity: e.severity || 'Error',
    })),
    bhxhTransactionId: r.bhxhTransactionId,
    bhxhApprovedAmount: r.approvedAmount,
    bhxhRejectedAmount: r.rejectedAmount,
    status,
    statusName,
    createdAt: realDate(r.generatedAt),
  };
};

export const getInsuranceSubmissions = (status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<HieXmlSubmissionRaw[]>(`${BASE_URL}/insurance/submissions`, {
    params: { status: status != null ? HIE_STATUS_BY_NUM[status] : undefined, fromDate, toDate },
  }).then((r) => ({ ...r, data: (Array.isArray(r.data) ? r.data : []).map(mapHieSubmission) }));

export const getInsuranceSubmission = (id: string) =>
  apiClient.get<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submissions/${id}`);

export const generateXML = (dto: GenerateXMLDto) =>
  apiClient.post<HieXmlSubmissionRaw>(`${BASE_URL}/insurance/xml/generate`, null, {
    params: { xmlType: dto.xmlType, fromDate: dto.periodFrom, toDate: dto.periodTo, departmentId: dto.departmentId },
  }).then((r) => {
    const s = mapHieSubmission(r.data);
    const data: XMLGenerationResultDto = {
      success: !!r.data?.id,
      submissionId: s.id,
      xmlType: s.submissionType,
      totalRecords: s.totalRecords,
      totalAmount: r.data?.totalAmount ?? 0,
      validRecords: s.validRecords,
      invalidRecords: s.invalidRecords,
      validationErrors: s.validationErrors,
    };
    return { ...r, data };
  });

export const validateSubmission = (submissionId: string) =>
  apiClient.post<InsuranceSubmissionDto>(`${BASE_URL}/insurance/submissions/${submissionId}/validate`);

export const submitToInsurance = (dto: SubmitToInsuranceDto) =>
  apiClient.post<HieXmlSubmissionRaw>(`${BASE_URL}/insurance/xml/${dto.submissionId}/submit`)
    .then((r) => ({ ...r, data: mapHieSubmission(r.data) }));

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

// BE ElectronicReferralDto: string status (Draft/Sent/Received/Accepted/Declined/Completed), primaryDiagnosis,
// diagnosisICD, treatmentProvided — the table rendered blank columns and the "Gửi" action (status === 1) never showed.
const REFERRAL_STATUS: Record<string, number> = { Draft: 1, Sent: 2, Received: 3, Accepted: 4, Declined: 5, Rejected: 5, Completed: 6 };
const REFERRAL_STATUS_NAME: Record<number, string> = { 1: 'Nháp', 2: 'Đã gửi', 3: 'Đã nhận', 4: 'Chấp nhận', 5: 'Từ chối', 6: 'Hoàn tất' };
type BeReferral = Partial<ElectronicReferralDto> & {
  status?: number | string; primaryDiagnosis?: string; diagnosisICD?: string; treatmentProvided?: string;
  referringDoctor?: string; referralDate?: string;
};
const mapReferral = (r: BeReferral): ElectronicReferralDto => {
  const status = typeof r.status === 'number' ? r.status : (REFERRAL_STATUS[r.status ?? ''] ?? 1);
  return {
    ...(r as ElectronicReferralDto),
    referralType: r.referralType ?? 'Outbound',
    diagnosis: r.diagnosis ?? r.primaryDiagnosis ?? '',
    diagnosisIcd: r.diagnosisIcd ?? r.diagnosisICD ?? '',
    treatmentHistory: r.treatmentHistory ?? r.treatmentProvided,
    sourceDoctorName: r.sourceDoctorName ?? r.referringDoctor ?? '',
    urgency: r.urgency ?? 1,
    status,
    statusName: REFERRAL_STATUS_NAME[status] ?? String(r.status ?? ''),
    createdAt: r.createdAt ?? r.referralDate ?? '',
    attachments: r.attachments ?? [],
  };
};

export const getReferrals = async (referralType?: string, status?: number, fromDate?: string, toDate?: string) => {
  const res = await apiClient.get<BeReferral[]>(`${BASE_URL}/referrals`, { params: { referralType, status, fromDate, toDate } });
  return { ...res, data: (Array.isArray(res.data) ? res.data : []).map(mapReferral) };
};

export const getReferral = (id: string) =>
  apiClient.get<ElectronicReferralDto>(`${BASE_URL}/referrals/${id}`);

// BE CreateElectronicReferralDto names: primaryDiagnosis / diagnosisICD / treatmentProvided. Fields with no BE
// column (medications, allergies, special instructions) are kept in the clinical summary instead of being dropped.
export const createReferral = (dto: CreateReferralDto) => {
  const summary = [
    dto.clinicalSummary,
    dto.currentMedications ? `Thuốc đang dùng: ${dto.currentMedications}` : '',
    dto.allergies ? `Dị ứng: ${dto.allergies}` : '',
    dto.specialInstructions ? `Chỉ dẫn: ${dto.specialInstructions}` : '',
  ].filter(Boolean).join('\n');
  return apiClient.post<ElectronicReferralDto>(`${BASE_URL}/referrals`, {
    patientId: dto.patientId,
    destinationFacilityCode: dto.destinationFacilityCode,
    destinationDepartment: dto.destinationDepartment,
    primaryDiagnosis: dto.diagnosis,
    diagnosisICD: dto.diagnosisIcd || undefined,
    reasonForReferral: dto.reasonForReferral,
    clinicalSummary: summary || undefined,
    treatmentProvided: dto.treatmentHistory,
  });
};

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

// BE TeleconsultationRequestDto: string status (Requested/Scheduled/InProgress/Completed/Cancelled), string urgency,
// scheduledTime (DateTime), requestingDoctor.
const TC_STATUS: Record<string, number> = { Requested: 1, Pending: 1, Scheduled: 2, InProgress: 3, Completed: 4, Cancelled: 5 };
const TC_STATUS_NAME: Record<number, string> = { 1: 'Chờ phản hồi', 2: 'Đã lên lịch', 3: 'Đang hội chẩn', 4: 'Hoàn tất', 5: 'Đã hủy' };
const TC_URGENCY: Record<string, number> = { Routine: 1, Urgent: 2, Emergency: 3 };
type BeTeleconsult = Partial<TeleconsultationRequestDto> & {
  status?: number | string; urgency?: number | string; scheduledTime?: string; requestingDoctor?: string;
};
const mapTeleconsult = (t: BeTeleconsult): TeleconsultationRequestDto => {
  const status = typeof t.status === 'number' ? t.status : (TC_STATUS[t.status ?? ''] ?? 1);
  const sched = t.scheduledTime && t.scheduledTime.length > 10 ? t.scheduledTime : undefined;
  return {
    ...(t as TeleconsultationRequestDto),
    requestingDoctorName: t.requestingDoctorName ?? t.requestingDoctor ?? '',
    urgency: typeof t.urgency === 'number' ? t.urgency : (TC_URGENCY[t.urgency ?? ''] ?? 1),
    scheduledDate: t.scheduledDate ?? sched?.slice(0, 10),
    scheduledTime: sched ? sched.slice(11, 16) : t.scheduledTime,
    status,
    statusName: TC_STATUS_NAME[status] ?? String(t.status ?? ''),
    attachments: t.attachments ?? [],
  };
};

export const getTeleconsultRequests = async (status?: number, fromDate?: string, toDate?: string) => {
  const res = await apiClient.get<BeTeleconsult[]>(`${BASE_URL}/teleconsults`, { params: { status, fromDate, toDate } });
  return { ...res, data: (Array.isArray(res.data) ? res.data : []).map(mapTeleconsult) };
};

export const getTeleconsultRequest = (id: string) =>
  apiClient.get<TeleconsultationRequestDto>(`${BASE_URL}/teleconsults/${id}`);

// BE route is POST /HIE/teleconsultation (POST /teleconsults was 405) with CreateTeleconsultationDto names.
export const createTeleconsultRequest = (dto: CreateTeleconsultRequestDto) => {
  const urgency = ({ 1: 'Routine', 2: 'Urgent', 3: 'Emergency' } as Record<number, string>)[dto.urgency] ?? 'Routine';
  const history = [dto.chiefComplaint ? `Lý do: ${dto.chiefComplaint}` : '', dto.relevantHistory].filter(Boolean).join('\n');
  const preferredTime = dto.preferredDate ? `${dto.preferredDate}T${dto.preferredTime || '08:00'}:00` : undefined;
  return apiClient.post<TeleconsultationRequestDto>(`${BASE_URL}/teleconsultation`, {
    patientId: dto.patientId,
    consultingFacilityCode: dto.consultingFacilityCode,
    consultingSpecialty: dto.consultingSpecialty,
    urgency,
    consultationType: dto.requestType,
    primaryDiagnosis: dto.chiefComplaint || undefined,
    clinicalQuestion: dto.clinicalQuestion,
    patientHistory: history || undefined,
    currentTreatment: dto.currentFindings || undefined,
    preferredTime,
  });
};

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

// BE HIEDashboardDto has pendingReferrals (no outboundReferralsPending) — map the field the page reads.
export const getDashboard = async () => {
  const res = await apiClient.get<HIEDashboardDto & { pendingReferrals?: number }>(`${BASE_URL}/dashboard`);
  const d = res.data;
  return { ...res, data: d ? { ...d, outboundReferralsPending: d.outboundReferralsPending ?? d.pendingReferrals } as HIEDashboardDto : d };
};

/** Sync tất cả HIE connection đang active — ping endpoint, cập nhật trạng thái kết nối. */
export const syncAll = () =>
  apiClient.post(`${BASE_URL}/sync-all`);

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
  syncAll,
  getAlerts,
  acknowledgeAlert,
  getHIEStatistics,
  exportHIEReport,
};
