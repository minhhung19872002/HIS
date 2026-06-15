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
  code: string;
  name: string;
  description?: string;
  dataType: string;       // Text/Number/Date/Boolean/List
  defaultValue?: string;
  category?: string;
  formType?: string;      // loại tờ phiếu áp dụng (gán thẻ vào mẫu)
  sortOrder: number;
  isSystem: boolean;
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

// ============ Raw backend shapes ============
// BE entity field-name khác FE DTO (vd. sharedByUserName vs sharedByName, isRevoked vs status, severity int vs string).
// Khai loose interface cho từng nhóm để tránh `any` mà vẫn dung sai BE đổi schema nhỏ.
type RawDoc = Record<string, unknown>;

const asStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asNum = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const asBool = (v: unknown): boolean => v === true;

const mapShare = (item: RawDoc): EmrShareDto => {
  const expiresAt = asStr(item.expiresAt);
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  const shareTargetType = item.sharedToUserId ? 'User' : 'Department';
  return {
    id: String(item.id ?? ''),
    examinationId: String(item.examinationId ?? ''),
    patientName: asStr(item.patientName),
    sharedByUserId: String(item.sharedByUserId ?? ''),
    sharedByName: asStr(item.sharedByUserName) ?? asStr(item.sharedByUserId),
    shareTargetType,
    shareTargetId: asStr(item.sharedToUserId) ?? asStr(item.sharedToDepartmentId) ?? '',
    shareTargetName: asStr(item.sharedToUserName) ?? asStr(item.sharedToDepartmentName) ?? asStr(item.sharedToUserId) ?? asStr(item.sharedToDepartmentId),
    shareType: item.shareType === 2 ? 'Form' : 'Whole',
    formTypes: asStr(item.formType),
    expiresAt,
    accessCount: asNum(item.accessCount) ?? 0,
    note: asStr(item.note),
    status: item.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active',
    createdAt: String(item.createdAt ?? ''),
  };
};

const mapShareAccessLog = (item: RawDoc): ShareAccessLogDto => ({
  id: String(item.id ?? ''),
  shareId: String(item.emrShareId ?? ''),
  accessedByUserId: String(item.accessedByUserId ?? ''),
  accessedByName: asStr(item.accessedByUserName) ?? asStr(item.accessedByUserId),
  accessedAt: String(item.accessedAt ?? ''),
  action: String(item.action ?? ''),
  ipAddress: asStr(item.ipAddress),
});

const mapExtract = (item: RawDoc): EmrExtractDto => {
  const expiresAt = asStr(item.expiresAt);
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  return {
    id: String(item.id ?? ''),
    examinationId: String(item.examinationId ?? ''),
    patientName: asStr(item.patientName),
    extractedByName: asStr(item.extractedByUserName) ?? asStr(item.extractedByUserId),
    extractType: item.extractType === 2 ? 'Partial' : 'Full',
    formTypes: asStr(item.formTypes),
    hasWatermark: !!item.watermarkText,
    accessCode: asStr(item.accessCode),
    accessCount: asNum(item.accessCount) ?? 0,
    maxAccessCount: asNum(item.maxAccessCount) ?? 0,
    expiresAt,
    status: item.isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active',
    createdAt: String(item.createdAt ?? ''),
  };
};

const mapSpine = (item: RawDoc): EmrSpineDto => {
  const sections = Array.isArray(item.sections) ? (item.sections as RawDoc[]) : [];
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    description: asStr(item.description),
    isDefault: asBool(item.isDefault),
    isActive: asBool(item.isActive),
    code: asStr(item.code),
    sortOrder: asNum(item.sortOrder) ?? 0,
    sections: sections.map((section) => ({
      id: asStr(section.id),
      formType: String(section.formType ?? ''),
      formName: String(section.formName ?? ''),
      sortOrder: asNum(section.sortOrder) ?? 0,
      isRequired: asBool(section.isRequired),
    })),
  };
};

const mapPatientSignature = (item: RawDoc): PatientSignatureDto => ({
  id: String(item.id ?? ''),
  patientId: String(item.patientId ?? ''),
  patientName: asStr(item.patientName),
  examinationId: asStr(item.examinationId),
  documentType: String(item.documentType ?? ''),
  signatureData: String(item.signatureData ?? ''),
  signedAt: String(item.signedAt ?? ''),
  verificationCode: asStr(item.verificationCode),
  isVerified: asBool(item.isVerified),
  verifiedByName: asStr(item.verifiedByName),
  verifiedAt: asStr(item.verifiedAt),
});

const mapDocumentLock = (item: RawDoc | null | undefined): DocumentLockDto => {
  if (!item || item.isLocked === false) {
    return {
      documentType: asStr(item?.documentType) ?? '',
      documentId: asStr(item?.documentId) ?? '',
      isLocked: false,
    };
  }

  return {
    id: asStr(item.id),
    documentType: String(item.documentType ?? ''),
    documentId: String(item.documentId ?? ''),
    isLocked: asBool(item.isActive),
    lockedByUserId: asStr(item.lockedByUserId),
    lockedByName: asStr(item.lockedByUserName) ?? asStr(item.lockedByName),
    lockedAt: asStr(item.lockedAt),
    expiresAt: asStr(item.expiresAt),
  };
};

const mapImage = (item: RawDoc): EmrImageDto => ({
  id: String(item.id ?? ''),
  title: String(item.title ?? ''),
  description: asStr(item.description),
  category: asStr(item.category),
  tags: asStr(item.tags),
  imageData: asStr(item.imageData),
  thumbnailUrl: asStr(item.thumbnailUrl),
  isShared: asBool(item.isShared),
  createdByName: asStr(item.uploadedByUserName) ?? asStr(item.createdByName) ?? asStr(item.uploadedByUserId),
  createdAt: String(item.createdAt ?? ''),
});

const mapShortcode = (item: RawDoc): EmrShortcodeDto => ({
  id: String(item.id ?? ''),
  code: String(item.code ?? ''),
  fullText: String(item.fullText ?? ''),
  category: asStr(item.category),
  scope: item.isGlobal ? 'Global' : item.departmentId ? 'Department' : 'User',
  isActive: asBool(item.isActive),
});

const severityLabel = (s: unknown): 'Error' | 'Warning' | 'Info' => {
  const n = typeof s === 'number' ? s : 0;
  if (n >= 2) return 'Error';
  if (n === 1) return 'Warning';
  return 'Info';
};

const mapRule = (item: RawDoc): AutoCheckRuleDto => ({
  id: String(item.id ?? ''),
  name: String(item.ruleName ?? ''),
  ruleType: String(item.ruleType ?? ''),
  formType: asStr(item.formType),
  fieldName: asStr(item.fieldName),
  condition: asStr(item.condition) ?? '',
  errorMessage: String(item.errorMessage ?? ''),
  severity: severityLabel(item.severity),
  isActive: asBool(item.isActive),
});

const mapViolation = (item: RawDoc): AutoCheckViolationDto => ({
  ruleName: String(item.ruleName ?? ''),
  formType: asStr(item.formType) ?? '',
  fieldName: asStr(item.fieldName),
  severity: severityLabel(item.severity),
  message: asStr(item.errorMessage) ?? asStr(item.message) ?? '',
});

const mapCloseLog = (item: RawDoc): EmrCloseLogDto => ({
  id: String(item.id ?? ''),
  examinationId: String(item.examinationId ?? ''),
  action: item.status === 2 ? 'Reopen' : 'Close',
  reason: asStr(item.note),
  performedByName: asStr(item.closedByUserName) ?? asStr(item.closedByUserId),
  performedAt: String(item.closedAt ?? ''),
});

const mapDeletedRecord = (item: RawDoc): DeletedRecordDto => ({
  id: String(item.id ?? ''),
  entityType: String(item.entityType ?? ''),
  entityId: String(item.id ?? ''),
  entityName: asStr(item.displayName),
  deletedByName: asStr(item.deletedBy),
  deletedAt: String(item.deletedAt ?? ''),
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
  apiClient.get<EmrDataTagDto[]>('/emr-management/data-tags');

export const saveEmrDataTag = (data: {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  dataType: string;
  defaultValue?: string;
  category?: string;
  formType?: string;
  sortOrder?: number;
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
