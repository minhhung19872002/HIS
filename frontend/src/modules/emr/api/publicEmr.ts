import { publicClient } from '../../../api/publicClient';
import { API_URL } from '../../../config/api.config';

// Tra cứu công khai HSBA đã ký số (CCCD + ngày sinh) — KHÔNG cần đăng nhập.
// Dùng publicClient (axios thuần, không gắn JWT, không unwrap envelope).
// Backend trả DTO trực tiếp qua Ok(...) nên đọc thẳng response.data.

export interface PublicEmrLookupRequest {
  identityNumber: string;
  dateOfBirth: string; // yyyy-MM-dd
}

export interface PublicEmrDocument {
  documentId: string;
  documentType: string;
  documentTypeName: string;
  documentCode: string;
  signedAt: string;
  fileName: string;
  signerName?: string;
  caProvider?: string;
}

export interface PublicEmrLookupResponse {
  success: boolean;
  message?: string;
  token?: string;
  patientNameMasked?: string;
  documents: PublicEmrDocument[];
}

export async function lookupPublicEmr(req: PublicEmrLookupRequest): Promise<PublicEmrLookupResponse> {
  const { data } = await publicClient.post<unknown>('/public-emr/lookup', req);
  // API bọc envelope {success,data:{...}} (global wrapper) — publicClient KHÔNG auto-unwrap.
  // Tolerant 2 shape (envelope/bare) theo pattern AuthContext, commit 92d35a2.
  const obj = data as Record<string, unknown> | null;
  if (obj && typeof obj === 'object' && 'data' in obj && obj.data) {
    return obj.data as PublicEmrLookupResponse;
  }
  return data as PublicEmrLookupResponse;
}

/** URL tải/xem PDF đã ký — mở trực tiếp (token cấp ở bước tra cứu). */
export function buildPublicEmrPdfUrl(documentId: string, token: string): string {
  return `${API_URL}/public-emr/document/${documentId}/pdf?token=${encodeURIComponent(token)}`;
}
