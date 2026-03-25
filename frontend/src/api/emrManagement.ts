import { apiClient } from './client';

// ============ Types ============
export interface EmrShareDto {
  id: string;
  examinationId: string;
  patientName?: string;
  sharedByUserId: string;
  sharedByName?: string;
  shareTargetType: string; // 'User' | 'Department'
  shareTargetId: string;
  shareTargetName?: string;
  shareType: string; // 'Whole' | 'Form'
  formTypes?: string;
  expiresAt?: string;
  accessCount: number;
  note?: string;
  status: string; // 'Active' | 'Revoked' | 'Expired'
  createdAt: string;
}

export interface ShareAccessLogDto {
  id: string;
  shareId: string;
  accessedByUserId: string;
  accessedByName?: string;
  accessedAt: string;
  ipAddress?: string;
  action: string;
}

export interface EmrExtractDto {
  id: string;
  examinationId: string;
  patientName?: string;
  extractedByName?: string;
  extractType: string; // 'Full' | 'Partial'
  formTypes?: string;
  hasWatermark: boolean;
  accessCode?: string;
  accessCount: number;
  maxAccessCount: number;
  expiresAt?: string;
  status: string;
  createdAt: string;
}

export interface EmrSpineDto {
  id: string;
  name: string;
  code?: string;
  sortOrder?: number;
  description?: string;
  isDefault: boolean;
  sections: EmrSpineSectionDto[];
  isActive: boolean;
}

export interface EmrSpineSectionDto {
  id?: string;
  formType: string;
  formName: string;
  sortOrder: number;
  isRequired: boolean;
}

export interface PatientSignatureDto {
  id: string;
  patientId: string;
  patientName?: string;
  examinationId?: string;
  documentType: string;
  signatureData: string;
  signedAt: string;
  verificationCode?: string;
  isVerified: boolean;
  verifiedByName?: string;
  verifiedAt?: string;
}

export interface DocumentLockDto {
  id?: string;
  documentType: string;
  documentId: string;
  isLocked: boolean;
  lockedByUserId?: string;
  lockedByName?: string;
  lockedAt?: string;
  expiresAt?: string;
}

export interface EmrDataTagDto {
  id: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface EmrImageDto {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string;
  imageData?: string;
  thumbnailUrl?: string;
  isShared: boolean;
  createdByName?: string;
  createdAt: string;
}

export interface EmrShortcodeDto {
  id: string;
  code: string;
  fullText: string;
  category?: string;
  scope: string; // 'Global' | 'Department' | 'User'
  isActive: boolean;
}

export interface AutoCheckRuleDto {
  id: string;
  name: string;
  ruleType: string;
  formType?: string;
  fieldName?: string;
  condition: string;
  errorMessage: string;
  severity: string; // 'Error' | 'Warning' | 'Info'
  isActive: boolean;
}

export interface AutoCheckViolationDto {
  ruleName: string;
  formType: string;
  fieldName?: string;
  severity: string;
  message: string;
}

export interface EmrCloseLogDto {
  id: string;
  examinationId: string;
  action: string; // 'Close' | 'Reopen'
  reason?: string;
  performedByName?: string;
  performedAt: string;
}

export interface DeletedRecordDto {
  id: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  deletedByName?: string;
  deletedAt: string;
  canRestore: boolean;
}

const mapShare = (item: any): EmrShareDto => {
  const expiresAt = item.expiresAt ?? undefined;
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  const shareTargetType = item.sharedToUserId ? 'User' : 'Department';
  return {
    id: item.id,
    examinationId: item.examinationId,
    patientName: item.patientName,
    sharedByUserId: item.sharedByUserId,
    sharedByName: item.sharedByUserName ?? item.sharedByUserId,
    shareTargetType,
    shareTargetId: item.sharedToUserId ?? item.sharedToDepartmentId ?? '',
    shareTargetName: item.sharedToUserName ?? item.sharedToDepartmentName ?? item.sharedToUserId ?? item.sharedToDepartmentId,
    shareType: item.shareType === 2 ? 'Form' : 'Whole',
    formTypes: item.formType,
    expiresAt,
    accessCount: item.accessCount ?? 0,
    note: item.note,
    status: item.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active',
    createdAt: item.createdAt,
  };
};

const mapShareAccessLog = (item: any): ShareAccessLogDto => ({
  id: item.id,
  shareId: item.emrShareId,
  accessedByUserId: item.accessedByUserId,
  accessedByName: item.accessedByUserName ?? item.accessedByUserId,
  accessedAt: item.accessedAt,
  action: item.action,
  ipAddress: item.ipAddress,
});

const mapExtract = (item: any): EmrExtractDto => {
  const expiresAt = item.expiresAt ?? undefined;
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  return {
    id: item.id,
    examinationId: item.examinationId,
    patientName: item.patientName,
    extractedByName: item.extractedByUserName ?? item.extractedByUserId,
    extractType: item.extractType === 2 ? 'Partial' : 'Full',
    formTypes: item.formTypes,
    hasWatermark: !!item.watermarkText,
    accessCode: item.accessCode,
    accessCount: item.accessCount ?? 0,
    maxAccessCount: item.maxAccessCount ?? 0,
    expiresAt,
    status: item.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active',
    createdAt: item.createdAt,
  };
};

const mapSpine = (item: any): EmrSpineDto => ({
  id: item.id,
  name: item.name,
  description: item.description,
  isDefault: !!item.isDefault,
  isActive: !!item.isActive,
  code: item.code,
  sortOrder: item.sortOrder ?? 0,
  sections: (item.sections ?? []).map((section: any) => ({
    id: section.id,
    formType: section.formType,
    formName: section.formName,
    sortOrder: section.sortOrder ?? 0,
    isRequired: !!section.isRequired,
  })),
});

const mapPatientSignature = (item: any): PatientSignatureDto => ({
  id: item.id,
  patientId: item.patientId,
  patientName: item.patientName,
  examinationId: item.examinationId,
  documentType: item.documentType,
  signatureData: item.signatureData,
  signedAt: item.signedAt,
  verificationCode: item.verificationCode,
  isVerified: !!item.isVerified,
  verifiedByName: item.verifiedByName,
  verifiedAt: item.verifiedAt,
});

const mapDocumentLock = (item: any): DocumentLockDto => {
  if (!item || item.isLocked === false) {
    return {
      documentType: item?.documentType ?? '',
      documentId: item?.documentId ?? '',
      isLocked: false,
    };
  }

  return {
    id: item.id,
    documentType: item.documentType,
    documentId: item.documentId,
    isLocked: !!item.isActive,
    lockedByUserId: item.lockedByUserId,
    lockedByName: item.lockedByUserName ?? item.lockedByName,
    lockedAt: item.lockedAt,
    expiresAt: item.expiresAt,
  };
};

const mapImage = (item: any): EmrImageDto => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  tags: item.tags,
  imageData: item.imageData,
  thumbnailUrl: item.thumbnailUrl,
  isShared: !!item.isShared,
  createdByName: item.uploadedByUserName ?? item.createdByName ?? item.uploadedByUserId,
  createdAt: item.createdAt,
});

const mapShortcode = (item: any): EmrShortcodeDto => ({
  id: item.id,
  code: item.code,
  fullText: item.fullText,
  category: item.category,
  scope: item.isGlobal ? 'Global' : item.departmentId ? 'Department' : 'User',
  isActive: !!item.isActive,
});

const mapRule = (item: any): AutoCheckRuleDto => ({
  id: item.id,
  name: item.ruleName,
  ruleType: item.ruleType,
  formType: item.formType,
  fieldName: item.fieldName,
  condition: item.condition ?? '',
  errorMessage: item.errorMessage,
  severity: item.severity >= 2 ? 'Error' : item.severity === 1 ? 'Warning' : 'Info',
  isActive: !!item.isActive,
});

const mapViolation = (item: any): AutoCheckViolationDto => ({
  ruleName: item.ruleName,
  formType: item.formType ?? '',
  fieldName: item.fieldName,
  severity: item.severity >= 2 ? 'Error' : item.severity === 1 ? 'Warning' : 'Info',
  message: item.errorMessage ?? item.message ?? '',
});

const mapCloseLog = (item: any): EmrCloseLogDto => ({
  id: item.id,
  examinationId: item.examinationId,
  action: item.status === 2 ? 'Reopen' : 'Close',
  reason: item.note,
  performedByName: item.closedByUserName ?? item.closedByUserId,
  performedAt: item.closedAt,
});

const mapDeletedRecord = (item: any): DeletedRecordDto => ({
  id: item.id,
  entityType: item.entityType,
  entityId: item.id,
  entityName: item.displayName,
  deletedByName: item.deletedBy,
  deletedAt: item.deletedAt,
  canRestore: true,
});

// ============ Sharing (B.1.2) ============
export const getEmrShares = (examinationId: string) =>
  apiClient.get('/emr-management/shares', { params: { examinationId } })
    .then(res => ({ ...res, data: (res.data ?? []).map(mapShare) }));

export const createEmrShare = (data: {
  examinationId: string;
  shareTargetType: string;
  shareTargetId: string;
  shareType: string;
  formTypes?: string;
  expiresAt?: string;
  note?: string;
}) => apiClient.post('/emr-management/shares', {
  examinationId: data.examinationId,
  sharedToUserId: data.shareTargetType === 'User' ? data.shareTargetId : undefined,
  sharedToDepartmentId: data.shareTargetType === 'Department' ? data.shareTargetId : undefined,
  shareType: data.shareType === 'Form' ? 2 : 1,
  formType: data.formTypes,
  expiresAt: data.expiresAt,
  note: data.note,
}).then(res => ({ ...res, data: mapShare(res.data) }));

export const revokeEmrShare = (id: string) =>
  apiClient.put(`/emr-management/shares/${id}/revoke`);

export const getShareAccessLogs = (shareId: string) =>
  apiClient.get(`/emr-management/shares/${shareId}/access-logs`)
    .then(res => ({ ...res, data: (res.data ?? []).map(mapShareAccessLog) }));

// ============ Extract (B.1.3) ============
export const getEmrExtracts = (examinationId: string) =>
  apiClient.get('/emr-management/extracts', { params: { examinationId } })
    .then(res => ({ ...res, data: (res.data ?? []).map(mapExtract) }));

export const createEmrExtract = (data: {
  examinationId: string;
  extractType: string;
  formTypes?: string;
  maxAccessCount?: number;
  expiresAt?: string;
}) => apiClient.post('/emr-management/extracts', {
  examinationId: data.examinationId,
  extractType: data.extractType === 'Partial' ? 2 : 1,
  formTypes: Array.isArray(data.formTypes) ? data.formTypes.join(',') : data.formTypes,
  maxAccessCount: data.maxAccessCount,
  expiresAt: data.expiresAt,
}).then(res => ({ ...res, data: mapExtract(res.data) }));

export const revokeEmrExtract = (id: string) =>
  apiClient.put(`/emr-management/extracts/${id}/revoke`);

// ============ Spine (B.1.5) ============
export const getEmrSpines = () =>
  apiClient.get('/emr-management/spines')
    .then(res => ({ ...res, data: (res.data ?? []).map(mapSpine) }));

export const saveEmrSpine = (data: {
  id?: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  code?: string;
  sortOrder?: number;
  sections: EmrSpineSectionDto[];
}) => apiClient.post('/emr-management/spines', {
  id: data.id,
  name: data.name,
  code: (data.code ?? data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) || 'emr-spine',
  sortOrder: data.sortOrder ?? 0,
  description: data.description,
  isDefault: data.isDefault ?? false,
  isActive: true,
  sections: data.sections.map((section, index) => ({
    ...section,
    id: section.id,
    emrSpineId: data.id,
    sortOrder: section.sortOrder ?? index + 1,
    isActive: true,
  })),
}).then(res => ({ ...res, data: mapSpine(res.data) }));

export const deleteEmrSpine = (id: string) =>
  apiClient.delete(`/emr-management/spines/${id}`);

// ============ Patient Signature (B.1.7) ============
export const getPatientSignatures = (patientId: string) =>
  apiClient.get('/emr-management/patient-signatures', { params: { patientId } })
    .then(res => ({ ...res, data: (res.data ?? []).map(mapPatientSignature) }));

export const createPatientSignature = (data: {
  patientId: string;
  documentType: string;
  examinationId?: string;
  signatureData: string;
}) => apiClient.post('/emr-management/patient-signatures', data)
  .then(res => ({ ...res, data: mapPatientSignature(res.data) }));

export const verifyPatientSignature = (id: string, verificationCode: string) =>
  apiClient.put(`/emr-management/patient-signatures/${id}/verify`, null, { params: { verificationCode } });

// ============ Document Lock (B.1.11) ============
export const acquireDocumentLock = (data: {
  documentType: string;
  documentId: string;
}) => apiClient.post('/emr-management/locks/acquire', data)
  .then(res => ({ ...res, data: mapDocumentLock(res.data) }));

export const releaseDocumentLock = (data: {
  lockId: string;
}) => apiClient.post('/emr-management/locks/release', data);

export const getDocumentLockStatus = (documentType: string, documentId: string) =>
  apiClient.get('/emr-management/locks/status', { params: { documentType, documentId } })
    .then(res => ({ ...res, data: mapDocumentLock(res.data) }));

export const forceReleaseDocumentLock = (data: {
  lockId: string;
}) => apiClient.post('/emr-management/locks/force-release', data);

// ============ Data Tags (B.1.13) ============
export const getEmrDataTags = () =>
  apiClient.get('/emr-management/data-tags');

export const saveEmrDataTag = (data: {
  id?: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
}) => apiClient.post('/emr-management/data-tags', data);

export const deleteEmrDataTag = (id: string) =>
  apiClient.delete(`/emr-management/data-tags/${id}`);

// ============ Images (B.1.20) ============
export const getEmrImages = () =>
  apiClient.get('/emr-management/images')
    .then(res => ({ ...res, data: (res.data ?? []).map(mapImage) }));

export const saveEmrImage = (data: {
  id?: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string;
  imageData?: string;
  isShared?: boolean;
}) => apiClient.post('/emr-management/images', data)
  .then(res => ({ ...res, data: mapImage(res.data) }));

export const deleteEmrImage = (id: string) =>
  apiClient.delete(`/emr-management/images/${id}`);

// ============ Shortcodes (B.1.22) ============
export const getShortcodes = () =>
  apiClient.get('/emr-management/shortcodes')
    .then(res => ({ ...res, data: (res.data ?? []).map(mapShortcode) }));

export const saveShortcode = (data: {
  id?: string;
  code: string;
  fullText: string;
  category?: string;
  scope?: string;
}) => apiClient.post('/emr-management/shortcodes', {
  id: data.id,
  code: data.code,
  fullText: data.fullText,
  category: data.category,
  isGlobal: data.scope === 'Global',
  departmentId: undefined,
  userId: undefined,
  sortOrder: 0,
  isActive: true,
}).then(res => ({ ...res, data: mapShortcode(res.data) }));

export const deleteShortcode = (id: string) =>
  apiClient.delete(`/emr-management/shortcodes/${id}`);

export const expandShortcode = (code: string) =>
  apiClient.get('/emr-management/shortcodes/expand', { params: { code } });

// ============ Auto Check (B.1.25) ============
export const getAutoCheckRules = () =>
  apiClient.get('/emr-management/auto-check/rules')
    .then(res => ({ ...res, data: (res.data ?? []).map(mapRule) }));

export const saveAutoCheckRule = (data: {
  id?: string;
  name: string;
  ruleType: string;
  formType?: string;
  fieldName?: string;
  condition: string;
  errorMessage: string;
  severity?: string;
  isActive?: boolean;
}) => apiClient.post('/emr-management/auto-check/rules', {
  id: data.id,
  ruleName: data.name,
  ruleType: data.ruleType,
  formType: data.formType,
  fieldName: data.fieldName,
  errorMessage: data.errorMessage,
  severity: data.severity === 'Error' ? 2 : 1,
  isActive: data.isActive ?? true,
  sortOrder: 0,
}).then(res => ({ ...res, data: mapRule(res.data) }));

export const deleteAutoCheckRule = (id: string) =>
  apiClient.delete(`/emr-management/auto-check/rules/${id}`);

export const runAutoCheck = (examinationId: string) =>
  apiClient.get(`/emr-management/auto-check/run/${examinationId}`)
    .then(res => ({
      ...res,
      data: {
        ...res.data,
        violations: (res.data?.violations ?? []).map(mapViolation),
      },
    }));

// ============ Close EMR (B.2.5) ============
export const closeEmr = (data: {
  examinationId: string;
  reason?: string;
}) => apiClient.post('/emr-management/close', {
  examinationId: data.examinationId,
  note: data.reason,
});

export const reopenEmr = (data: {
  examinationId: string;
  reason: string;
}) => apiClient.post('/emr-management/reopen', {
  examinationId: data.examinationId,
  note: data.reason,
});

export const getEmrCloseLogs = (examinationId: string) =>
  apiClient.get('/emr-management/close-logs', { params: { examinationId } })
    .then(res => ({ ...res, data: (res.data ?? []).map(mapCloseLog) }));

// ============ Data Recovery (B.2.4) ============
export const getDeletedRecords = (entityType: string) =>
  apiClient.get('/emr-management/recovery/deleted', { params: { entityType } })
    .then(res => ({ ...res, data: (res.data ?? []).map(mapDeletedRecord) }));

export const restoreRecord = (data: {
  entityType: string;
  entityId: string;
}) => apiClient.post('/emr-management/recovery/restore', {
  entityType: data.entityType,
  recordId: data.entityId,
});
