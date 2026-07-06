import { apiClient } from '../services/apiClient';

export interface SigningRequestItem {
  id: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  submittedById: string;
  submittedByName: string;
  assignedToId: string;
  assignedToName: string;
  status: number; // 0=Pending, 1=Approved, 2=Rejected, 3=Cancelled
  statusText: string;
  rejectReason?: string;
  signedAt?: string;
  signatureData?: string;
  patientId?: string;
  patientName?: string;
  departmentName?: string;
  signerRole?: string; // Vai trò người ký
  createdAt: string;
  // Chuỗi ký nhiều cấp (null/1/1 = phiếu đơn cấp cũ). Status 4 = chờ tới lượt.
  chainId?: string | null;
  stepOrder: number;
  totalSteps: number;
  medicalRecordId?: string | null;
}

export interface SigningChainStepInput {
  assignedToId: string;
  assignedToName: string;
  /** Code vai trò cấp ký (EmrSigningRole): BSDT, TK, GD... */
  signerRole?: string;
}

export interface SubmitSigningChainRequest {
  documentType: string;
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  patientId?: string;
  patientName?: string;
  departmentName?: string;
  medicalRecordId?: string;
  steps: SigningChainStepInput[];
}

export interface DocumentChain {
  chainId: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  submittedById: string;
  submittedByName: string;
  createdAt: string;
  /** Pending / InProgress / Completed / Rejected / Cancelled */
  chainStatus: string;
  currentStep?: number | null;
  totalSteps: number;
  steps: SigningRequestItem[];
}

export interface ChainTemplateStep {
  roleCode?: string;
  roleName?: string;
  operationName: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface SigningWorkflowStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  totalCount: number;
  todaySubmitted: number;
  todayApproved: number;
}

export interface SubmitSigningRequest {
  documentType: string;
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  assignedToId: string;
  assignedToName: string;
  patientId?: string;
  patientName?: string;
  departmentName?: string;
  /** Vai trò người ký (tùy chọn): KTV, BacSi, TruongKhoa, GiamDoc, DieuDuong, Duoc */
  signerRole?: string;
}

export const getPendingRequests = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/pending', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load pending signing requests');
    return [];
  }
};

export const getSubmittedRequests = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/submitted', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load submitted signing requests');
    return [];
  }
};

export const getHistory = async (params?: Record<string, unknown>): Promise<SigningRequestItem[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/history', { params });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load signing history');
    return [];
  }
};

export const submitSigningRequest = async (data: SubmitSigningRequest): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post('/signing-workflow/submit', data);
    return resp.data;
  } catch {
    console.warn('Failed to submit signing request');
    return null;
  }
};

export const approveSigningRequest = async (id: string, signatureData?: string): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post(`/signing-workflow/${id}/approve`, { signatureData });
    return resp.data;
  } catch {
    console.warn('Failed to approve signing request');
    return null;
  }
};

export const rejectSigningRequest = async (id: string, rejectReason: string): Promise<SigningRequestItem | null> => {
  try {
    const resp = await apiClient.post(`/signing-workflow/${id}/reject`, { rejectReason });
    return resp.data;
  } catch {
    console.warn('Failed to reject signing request');
    return null;
  }
};

export const cancelSigningRequest = async (id: string): Promise<boolean> => {
  try {
    await apiClient.post(`/signing-workflow/${id}/cancel`);
    return true;
  } catch {
    console.warn('Failed to cancel signing request');
    return false;
  }
};

// ===== Trình ký nhiều cấp (plan-emr-signing-chain) =====

/** Gửi trình ký nhiều cấp. KHÔNG nuốt lỗi — caller hiển thị message 400 (vd đang có chuỗi chưa xử lý). */
export const submitSigningChain = async (data: SubmitSigningChainRequest): Promise<DocumentChain> => {
  const resp = await apiClient.post('/signing-workflow/submit-chain', data);
  return resp.data as DocumentChain;
};

/** Chuỗi ký mới nhất của 1 tài liệu — null nếu chưa trình lần nào. */
export const getDocumentChain = async (documentType: string, documentId: string): Promise<DocumentChain | null> => {
  try {
    const resp = await apiClient.get('/signing-workflow/document-chain', { params: { documentType, documentId } });
    return (resp.data as DocumentChain | null) ?? null;
  } catch {
    console.warn('Failed to load document chain');
    return null;
  }
};

/** Chuỗi ký mặc định theo documentType (danh mục EmrSigningOperations). */
export const getChainTemplate = async (documentType: string): Promise<ChainTemplateStep[]> => {
  try {
    const resp = await apiClient.get('/signing-workflow/chain-template', { params: { documentType } });
    return Array.isArray(resp.data) ? resp.data : [];
  } catch {
    console.warn('Failed to load chain template');
    return [];
  }
};

/** Người gửi hủy cả chuỗi trình ký (khi còn cấp chưa xử lý). */
export const cancelSigningChain = async (chainId: string): Promise<boolean> => {
  try {
    await apiClient.post(`/signing-workflow/chain/${chainId}/cancel`);
    return true;
  } catch {
    console.warn('Failed to cancel signing chain');
    return false;
  }
};

export const getSigningStats = async (): Promise<SigningWorkflowStats | null> => {
  try {
    const resp = await apiClient.get('/signing-workflow/stats');
    return resp.data;
  } catch {
    console.warn('Failed to load signing workflow stats');
    return null;
  }
};
