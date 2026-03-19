import { apiClient } from './client';

// ============ Types ============
export interface EmrCoverTypeDto {
  id: string; code: string; name: string; category: string;
  departmentId?: string; departmentName?: string; description?: string;
  sortOrder: number; isActive: boolean;
}

export interface EmrDocumentAttachmentDto {
  id: string; medicalRecordId: string; fileName: string; fileType: string;
  fileSize: number; filePath: string; documentCategory?: string;
  description?: string; uploadedByName?: string; uploadedAt: string;
}

export interface EmrPrintLogDto {
  id: string; medicalRecordId: string; documentType: string; documentTitle: string;
  printedByName?: string; printedAt: string; isStamped: boolean;
  stampedAt?: string; stampedByName?: string; printCount: number;
}

export interface EmrSignerCatalogDto {
  id: string; userId: string; userName: string; fullName: string;
  title?: string; departmentId?: string; departmentName?: string;
  certificateInfo?: string; signatureImagePath?: string; isActive: boolean;
}

export interface EmrSigningRoleDto {
  id: string; code: string; name: string; description?: string;
  sortOrder: number; isActive: boolean;
}

export interface EmrSigningOperationDto {
  id: string; code: string; name: string; roleId?: string; roleName?: string;
  documentType?: string; isRequired: boolean; sortOrder: number; isActive: boolean;
}

export interface EmrDocumentGroupDto {
  id: string; code: string; name: string; category?: string;
  sortOrder: number; isActive: boolean;
}

export interface EmrDocumentTypeDto {
  id: string; code: string; name: string; groupId?: string; groupName?: string;
  formTemplateKey?: string; isRequired: boolean; sortOrder: number; isActive: boolean;
}

export interface EmrCompletenessDto {
  medicalRecordId: string; totalDocuments: number; signedDocuments: number;
  unsignedDocuments: number; missingRequiredDocuments: number;
  completenessPercent: number; isComplete: boolean; isFinalized: boolean;
  items: CompletenessItemDto[]; missingDocumentNames: string[];
}

export interface CompletenessItemDto {
  documentType: string; documentName: string; isRequired: boolean;
  exists: boolean; isSigned: boolean; signedByName?: string; signedAt?: string;
}

export interface ArchiveBarcodeDto {
  archiveId: string; barcodeData: string; patientCode: string;
  patientName: string; medicalRecordCode?: string;
  archiveLocation?: string; archivedAt?: string;
}

// ============ Cover Types ============
export const getCoverTypes = async (keyword?: string, category?: string): Promise<EmrCoverTypeDto[]> => {
  try {
    const resp = await apiClient.get('/emr-admin/cover-types', { params: { keyword, category } });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch { console.warn('Failed to load cover types'); return []; }
};

export const saveCoverType = async (data: Partial<EmrCoverTypeDto>): Promise<EmrCoverTypeDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/cover-types', data); return resp.data; }
  catch { console.warn('Failed to save cover type'); return null; }
};

export const deleteCoverType = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/cover-types/${id}`); return true; }
  catch { console.warn('Failed to delete cover type'); return false; }
};

// ============ Signers ============
export const getSigners = async (keyword?: string, departmentId?: string): Promise<EmrSignerCatalogDto[]> => {
  try {
    const resp = await apiClient.get('/emr-admin/signers', { params: { keyword, departmentId } });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch { console.warn('Failed to load signers'); return []; }
};

export const saveSigner = async (data: Partial<EmrSignerCatalogDto>): Promise<EmrSignerCatalogDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/signers', data); return resp.data; }
  catch { console.warn('Failed to save signer'); return null; }
};

export const deleteSigner = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/signers/${id}`); return true; }
  catch { console.warn('Failed to delete signer'); return false; }
};

// ============ Signing Roles ============
export const getSigningRoles = async (): Promise<EmrSigningRoleDto[]> => {
  try { const resp = await apiClient.get('/emr-admin/signing-roles'); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load signing roles'); return []; }
};

export const saveSigningRole = async (data: Partial<EmrSigningRoleDto>): Promise<EmrSigningRoleDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/signing-roles', data); return resp.data; }
  catch { console.warn('Failed to save signing role'); return null; }
};

export const deleteSigningRole = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/signing-roles/${id}`); return true; }
  catch { console.warn('Failed to delete signing role'); return false; }
};

// ============ Signing Operations ============
export const getSigningOperations = async (documentType?: string): Promise<EmrSigningOperationDto[]> => {
  try { const resp = await apiClient.get('/emr-admin/signing-operations', { params: { documentType } }); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load signing operations'); return []; }
};

export const saveSigningOperation = async (data: Partial<EmrSigningOperationDto>): Promise<EmrSigningOperationDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/signing-operations', data); return resp.data; }
  catch { console.warn('Failed to save signing operation'); return null; }
};

export const deleteSigningOperation = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/signing-operations/${id}`); return true; }
  catch { console.warn('Failed to delete signing operation'); return false; }
};

// ============ Document Groups ============
export const getDocumentGroups = async (): Promise<EmrDocumentGroupDto[]> => {
  try { const resp = await apiClient.get('/emr-admin/document-groups'); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load document groups'); return []; }
};

export const saveDocumentGroup = async (data: Partial<EmrDocumentGroupDto>): Promise<EmrDocumentGroupDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/document-groups', data); return resp.data; }
  catch { console.warn('Failed to save document group'); return null; }
};

export const deleteDocumentGroup = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/document-groups/${id}`); return true; }
  catch { console.warn('Failed to delete document group'); return false; }
};

// ============ Document Types ============
export const getDocumentTypes = async (groupId?: string): Promise<EmrDocumentTypeDto[]> => {
  try { const resp = await apiClient.get('/emr-admin/document-types', { params: { groupId } }); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load document types'); return []; }
};

export const saveDocumentType = async (data: Partial<EmrDocumentTypeDto>): Promise<EmrDocumentTypeDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/document-types', data); return resp.data; }
  catch { console.warn('Failed to save document type'); return null; }
};

export const deleteDocumentType = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/document-types/${id}`); return true; }
  catch { console.warn('Failed to delete document type'); return false; }
};

// ============ Completeness ============
export const getCompletenessCheck = async (recordId: string): Promise<EmrCompletenessDto | null> => {
  try { const resp = await apiClient.get(`/emr-admin/completeness/${recordId}`); return resp.data; }
  catch { console.warn('Failed to check completeness'); return null; }
};

// ============ Finalization ============
export const finalizeRecord = async (recordId: string, notes?: string): Promise<{ success: boolean; message?: string } | null> => {
  try { const resp = await apiClient.post(`/emr-admin/finalize/${recordId}`, { notes }); return resp.data; }
  catch { console.warn('Failed to finalize record'); return null; }
};

// ============ Attachments ============
export const getAttachments = async (recordId: string): Promise<EmrDocumentAttachmentDto[]> => {
  try { const resp = await apiClient.get(`/emr-admin/attachments/${recordId}`); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load attachments'); return []; }
};

export const saveAttachment = async (data: Record<string, unknown>): Promise<EmrDocumentAttachmentDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/attachments', data); return resp.data; }
  catch { console.warn('Failed to save attachment'); return null; }
};

export const deleteAttachment = async (id: string): Promise<boolean> => {
  try { await apiClient.delete(`/emr-admin/attachments/${id}`); return true; }
  catch { console.warn('Failed to delete attachment'); return false; }
};

// ============ Print Logs ============
export const getPrintLogs = async (recordId: string): Promise<EmrPrintLogDto[]> => {
  try { const resp = await apiClient.get(`/emr-admin/print-logs/${recordId}`); return Array.isArray(resp.data) ? resp.data : []; }
  catch { console.warn('Failed to load print logs'); return []; }
};

export const logPrint = async (data: { medicalRecordId: string; documentType: string; documentTitle: string }): Promise<EmrPrintLogDto | null> => {
  try { const resp = await apiClient.post('/emr-admin/print-log', data); return resp.data; }
  catch { console.warn('Failed to log print'); return null; }
};

export const stampPrintLog = async (printLogId: string): Promise<boolean> => {
  try { await apiClient.post('/emr-admin/print-log/stamp', { printLogId }); return true; }
  catch { console.warn('Failed to stamp print log'); return false; }
};

// ============ Archive Barcode ============
export const getArchiveBarcode = async (archiveId: string): Promise<ArchiveBarcodeDto | null> => {
  try { const resp = await apiClient.get(`/emr-admin/barcode/${archiveId}`); return resp.data; }
  catch { console.warn('Failed to get archive barcode'); return null; }
};

// ============ HL7 Import/Export ============
export const importHl7 = async (hl7Content: string, sourceFacilityCode?: string): Promise<{ success: boolean; message?: string; importedRecords?: number } | null> => {
  try { const resp = await apiClient.post('/emr-admin/import-hl7', { hl7Content, sourceFacilityCode }); return resp.data; }
  catch { console.warn('Failed to import HL7'); return null; }
};

export const exportHl7 = async (recordId: string): Promise<{ hl7Content: string; authenticatorInfo?: string } | null> => {
  try { const resp = await apiClient.get(`/emr-admin/export-hl7/${recordId}`); return resp.data; }
  catch { console.warn('Failed to export HL7'); return null; }
};
