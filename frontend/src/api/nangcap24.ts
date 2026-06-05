import apiClient from './client';

// ============================================================================
// Gap #1 - Bank payment gateways (5 NH VN)
// ============================================================================

export interface SupportedBankDto {
  code: string;
  name: string;
  shortName: string;
  bin: string;
  color: string;
}

export interface BankConfirmDto {
  transactionId: string;
  bankReference?: string;
  paidAt?: string;
  note?: string;
}

export const bankPaymentApi = {
  listBanks: () => apiClient.get<SupportedBankDto[]>('/payment/bank/list').then(r => r.data),
  confirmTransfer: (dto: BankConfirmDto) =>
    apiClient.post('/payment/bank/confirm', dto).then(r => r.data),
  /** Đánh dấu hết hạn các GD QR quá thời hạn. BE route: POST /payment/mark-expired (Admin only). */
  markExpired: () =>
    apiClient.post<{ changed: boolean }>('/payment/mark-expired').then(r => r.data),
};

// ============================================================================
// Gap #2 - Biometric WebAuthn signature
// ============================================================================

export interface BiometricRegisterBeginDto {
  patientId: string;
  ownerType: 'patient' | 'family';
  ownerName?: string;
  deviceName?: string;
}

export interface BiometricRegisterBeginResponseDto {
  challenge: string;
  userHandle: string;
  rpId: string;
  rpName: string;
  userName: string;
  userDisplayName: string;
}

export interface BiometricRegisterFinishDto {
  patientId: string;
  ownerType: string;
  ownerName?: string;
  deviceName?: string;
  credentialId: string;
  publicKey: string;
  userHandle: string;
  aaGuid?: string;
  clientDataJson: string;
  attestationObject: string;
}

export interface BiometricCredentialDto {
  id: string;
  patientId: string;
  credentialId: string;
  ownerType: string;
  ownerName?: string;
  deviceName?: string;
  status: string;
  enrolledAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface BiometricSignBeginDto {
  patientId: string;
  documentType: string;
  documentRef: string;
  ownerType?: string;
}

export interface BiometricAllowedCredentialDto {
  credentialId: string;
  ownerName?: string;
  deviceName?: string;
}

export interface BiometricSignBeginResponseDto {
  challenge: string;
  rpId: string;
  allowCredentials: BiometricAllowedCredentialDto[];
}

export interface BiometricSignFinishDto {
  patientId: string;
  credentialId: string;
  documentType: string;
  documentRef: string;
  challenge: string;
  clientDataJson: string;
  authenticatorData: string;
  signature: string;
}

export interface BiometricSignFinishResponseDto {
  signatureLogId: string;
  isVerified: boolean;
  error?: string;
  signedAt: string;
  signerName: string;
}

export const biometricApi = {
  beginRegister: (dto: BiometricRegisterBeginDto) =>
    apiClient.post<BiometricRegisterBeginResponseDto>('/biometric/register-begin', dto).then(r => r.data),
  finishRegister: (dto: BiometricRegisterFinishDto) =>
    apiClient.post<BiometricCredentialDto>('/biometric/register-finish', dto).then(r => r.data),
  listCredentials: (patientId: string) =>
    apiClient.get<BiometricCredentialDto[]>(`/biometric/credentials/${patientId}`).then(r => r.data),
  revoke: (id: string) => apiClient.delete(`/biometric/credentials/${id}`),
  beginSign: (dto: BiometricSignBeginDto) =>
    apiClient.post<BiometricSignBeginResponseDto>('/biometric/sign-begin', dto).then(r => r.data),
  finishSign: (dto: BiometricSignFinishDto) =>
    apiClient.post<BiometricSignFinishResponseDto>('/biometric/sign-finish', dto).then(r => r.data),
};

// ============================================================================
// Gap #3 - BHXH Inspector portal
// ============================================================================

export interface InspectorLoginDto { username: string; password: string; }
export interface InspectorAccountDto {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  bhxhCode?: string;
  province?: string;
  isActive: boolean;
  lastLoginAt?: string;
}
export interface InspectorLoginResponseDto {
  success: boolean;
  token?: string;
  message?: string;
  inspector?: InspectorAccountDto;
}
export interface InspectorCreateDto {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  bhxhCode?: string;
  province?: string;
}
export interface InspectorSearchRecordDto {
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  departmentCode?: string;
  insuranceNumber?: string;
  treatmentType?: number;
  pageIndex?: number;
  pageSize?: number;
}
export interface InspectorRecordListItemDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  insuranceNumber?: string;
  departmentName: string;
  admissionDate: string;
  dischargeDate?: string;
  diagnosis?: string;
  treatmentType: number;
  treatmentTypeName: string;
  totalAmount: number;
  hasSignedXml: boolean;
}
export interface InspectorRecordDetailDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  patientDob: string;
  patientGender?: string;
  address?: string;
  insuranceNumber?: string;
  departmentName: string;
  admissionDate: string;
  dischargeDate?: string;
  admissionDiagnosis?: string;
  finalDiagnosis?: string;
  services: Array<{ serviceCode: string; serviceName: string; quantity: number; unitPrice: number; totalAmount: number; status?: string }>;
  medicines: Array<{ medicineCode: string; medicineName: string; concentration?: string; quantity: number; unitPrice: number; totalAmount: number }>;
  totalAmount: number;
  bhytAmount: number;
  coPayAmount: number;
}

export const inspectorApi = {
  login: (dto: InspectorLoginDto) =>
    apiClient.post<InspectorLoginResponseDto>('/inspector-portal/login', dto).then(r => r.data),
  searchRecords: (dto: InspectorSearchRecordDto) =>
    apiClient.get<{ items: InspectorRecordListItemDto[]; totalCount: number; pageIndex: number; pageSize: number; }>(
      '/inspector-portal/records', { params: dto }).then(r => r.data),
  getRecord: (id: string) =>
    apiClient.get<InspectorRecordDetailDto>(`/inspector-portal/records/${id}`).then(r => r.data),
  downloadXml: (id: string) =>
    apiClient.get<Blob>(`/inspector-portal/records/${id}/signed-xml`, { responseType: 'blob' }).then(r => r.data),
  listAccounts: () =>
    apiClient.get<InspectorAccountDto[]>('/inspector-portal/accounts').then(r => r.data),
  createAccount: (dto: InspectorCreateDto) =>
    apiClient.post<InspectorAccountDto>('/inspector-portal/accounts', dto).then(r => r.data),
  setActive: (id: string, isActive: boolean) =>
    apiClient.put(`/inspector-portal/accounts/${id}/active`, isActive),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/inspector-portal/accounts/${id}/reset-password`, { newPassword }),
};

// ============================================================================
// Gap #4 - HL7 EMR archive export
// ============================================================================

export interface Hl7ExportRequestDto {
  medicalRecordId: string;
  includeServices?: boolean;
  includePrescriptions?: boolean;
  includeLabResults?: boolean;
  includeRadiologyReports?: boolean;
}
export interface Hl7ExportResponseDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  hl7Content: string;
  fileName: string;
  messageCount: number;
  contentSizeBytes: number;
  generatedAt: string;
}

export const emrHl7Api = {
  export: (dto: Hl7ExportRequestDto) =>
    apiClient.post<Hl7ExportResponseDto>('/emr/hl7/export', dto).then(r => r.data),
  downloadFile: (medicalRecordId: string) =>
    apiClient.get<Blob>(`/emr/hl7/export/${medicalRecordId}`, { responseType: 'blob' }).then(r => r.data),
};

// ============================================================================
// Gap #5 - EMR Cloud sync
// ============================================================================

export interface EmrCloudSyncRequestDto {
  medicalRecordId: string;
  fileTypes?: string[];
  syncToDr?: boolean;
}
export interface EmrCloudSyncLogDto {
  id: string;
  medicalRecordId: string;
  fileType: string;
  fileName: string;
  fileSizeBytes: number;
  fileHash?: string;
  destination: string;
  remotePath?: string;
  status: string;
  errorMessage?: string;
  completedAt?: string;
  retryCount: number;
}
export interface EmrCloudSyncResponseDto {
  medicalRecordId: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  logs: EmrCloudSyncLogDto[];
}
export interface EmrCloudSyncStatusDto {
  totalRecordsTracked: number;
  fullySyncedCount: number;
  partialSyncedCount: number;
  failedSyncCount: number;
  lastSyncAt?: string;
}

export const emrCloudSyncApi = {
  sync: (dto: EmrCloudSyncRequestDto) =>
    apiClient.post<EmrCloudSyncResponseDto>('/emr/cloud-sync/sync', dto).then(r => r.data),
  getLogs: (medicalRecordId?: string, status?: string, pageIndex = 1, pageSize = 30) =>
    apiClient.get<EmrCloudSyncLogDto[]>('/emr/cloud-sync/logs', {
      params: { medicalRecordId, status, pageIndex, pageSize }
    }).then(r => r.data),
  getStatus: () =>
    apiClient.get<EmrCloudSyncStatusDto>('/emr/cloud-sync/status').then(r => r.data),
  retryFailed: () =>
    apiClient.post<{ retried: number }>('/emr/cloud-sync/retry-failed').then(r => r.data),
};

// ============================================================================
// Gap #6 - DICOM auto-send + transmission stats
// ============================================================================

export interface DicomAutoSendRuleDto {
  id: string;
  ruleName: string;
  modality?: string;
  sourceAeTitle?: string;
  departmentCode?: string;
  destinationServerId: string;
  destinationName: string;
  encryptBeforeSend: boolean;
  triggerType: string;
  scheduleCron?: string;
  priority: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  timesTriggered: number;
}
export interface DicomAutoSendRuleCreateDto {
  ruleName: string;
  modality?: string;
  sourceAeTitle?: string;
  departmentCode?: string;
  destinationServerId: string;
  encryptBeforeSend?: boolean;
  triggerType?: string;
  scheduleCron?: string;
  priority?: number;
  isActive?: boolean;
}
export interface DicomTransmissionLogDto {
  id: string;
  studyInstanceUid: string;
  autoSendRuleId?: string;
  destinationName: string;
  triggerType: string;
  instanceCount: number;
  totalBytes: number;
  wasEncrypted: boolean;
  encryptionAlgorithm?: string;
  status: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  triggeredByUserName?: string;
}
export interface DicomTransmissionStatsDto {
  fromDate: string;
  toDate: string;
  totalTransmissions: number;
  successCount: number;
  failedCount: number;
  totalBytesSent: number;
  encryptedCount: number;
  byDestination: Array<{ destinationName: string; count: number; bytes: number }>;
  byDay: Array<{ date: string; count: number; bytes: number }>;
}

export const dicomAutoSendApi = {
  listRules: () =>
    apiClient.get<DicomAutoSendRuleDto[]>('/dicom-autosend/rules').then(r => r.data),
  createRule: (dto: DicomAutoSendRuleCreateDto) =>
    apiClient.post<DicomAutoSendRuleDto>('/dicom-autosend/rules', dto).then(r => r.data),
  updateRule: (id: string, dto: DicomAutoSendRuleCreateDto) =>
    apiClient.put<DicomAutoSendRuleDto>(`/dicom-autosend/rules/${id}`, dto).then(r => r.data),
  deleteRule: (id: string) => apiClient.delete(`/dicom-autosend/rules/${id}`),
  sendStudy: (studyInstanceUid: string, destinationServerId: string, encrypt: boolean) =>
    apiClient.post<DicomTransmissionLogDto>('/dicom-autosend/send', {
      studyInstanceUid, destinationServerId, encrypt
    }).then(r => r.data),
  searchTransmissions: (from?: string, to?: string, status?: string, pageIndex = 1, pageSize = 30) =>
    apiClient.get<DicomTransmissionLogDto[]>('/dicom-autosend/transmissions', {
      params: { from, to, status, pageIndex, pageSize }
    }).then(r => r.data),
  getStats: (from: string, to: string) =>
    apiClient.get<DicomTransmissionStatsDto>('/dicom-autosend/stats', { params: { from, to } }).then(r => r.data),
  triggerCheck: () =>
    apiClient.post<{ triggered: number }>('/dicom-autosend/trigger-check').then(r => r.data),
};

// ============================================================================
// Gap #8 - HL7 message retry queue
// ============================================================================

export interface Hl7MessageQueueDto {
  id: string;
  direction: string;
  sourceSystem: string;
  targetSystem: string;
  messageType: string;
  messageControlId: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  firstTryAt?: string;
  lastTryAt?: string;
  nextRetryAt?: string;
  ackedAt?: string;
  endpoint?: string;
  createdAt: string;
  payload?: string;
}
export interface Hl7QueueSearchDto {
  status?: string;
  direction?: string;
  sourceSystem?: string;
  messageType?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}
export interface Hl7QueueSearchResultDto {
  items: Hl7MessageQueueDto[];
  totalCount: number;
  pendingCount: number;
  failedCount: number;
  ackedCount: number;
}
export interface Hl7RetryResultDto {
  retried: number;
  succeededImmediately: number;
  stillFailed: number;
}

export const hl7QueueApi = {
  search: (dto: Hl7QueueSearchDto) =>
    apiClient.get<Hl7QueueSearchResultDto>('/hl7-queue', { params: dto }).then(r => r.data),
  getById: (id: string) =>
    apiClient.get<Hl7MessageQueueDto>(`/hl7-queue/${id}`).then(r => r.data),
  retry: (id: string) =>
    apiClient.post<Hl7MessageQueueDto>(`/hl7-queue/${id}/retry`).then(r => r.data),
  retryAllFailed: () =>
    apiClient.post<Hl7RetryResultDto>('/hl7-queue/retry-all-failed').then(r => r.data),
  demoEnqueue: (data: { direction?: string; source?: string; target?: string; messageType?: string; payload?: string; endpoint?: string }) =>
    apiClient.post<Hl7MessageQueueDto>('/hl7-queue/demo-enqueue', data).then(r => r.data),
};

// ============================================================================
// Gap #9 - Per-study DICOM activity log
// ============================================================================

export interface DicomStudyActivityLogDto {
  id: string;
  studyInstanceUid: string;
  radiologyRequestId?: string;
  action: string;
  actionLabel: string;
  actionDetails?: string;
  performedByName?: string;
  machineName?: string;
  ipAddress?: string;
  performedAt: string;
  relatedReportId?: string;
}
export interface DicomStudyActivityLogSearchDto {
  studyInstanceUid?: string;
  radiologyRequestId?: string;
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}
export interface DicomStudyActivityLogSearchResultDto {
  items: DicomStudyActivityLogDto[];
  totalCount: number;
}

export const dicomStudyLogApi = {
  search: (dto: DicomStudyActivityLogSearchDto) =>
    apiClient.get<DicomStudyActivityLogSearchResultDto>('/dicom-study-log', { params: dto }).then(r => r.data),
  getStudyTimeline: (studyUid: string) =>
    apiClient.get<DicomStudyActivityLogDto[]>(`/dicom-study-log/study/${encodeURIComponent(studyUid)}`).then(r => r.data),
  logActivity: (data: { studyInstanceUid: string; action: string; radiologyRequestId?: string; actionDetails?: string; machineName?: string; relatedReportId?: string }) =>
    apiClient.post('/dicom-study-log/log', data),
};
