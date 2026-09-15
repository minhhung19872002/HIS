import { publicClient } from '../../../api/publicClient';

// Link kết quả xét nghiệm gửi qua SMS (/lab-result?token=…) — KHÔNG cần đăng nhập.
// publicClient: không gắn JWT, không đá về /login khi 401/404; interceptor đã unwrap envelope.

export interface PublicLabResultItem {
  name: string;
  value?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  flag?: string | null;
}

export interface PublicLabResultService {
  serviceName: string;
  resultDate?: string | null;
  result?: string | null;
  conclusion?: string | null;
  items: PublicLabResultItem[];
}

export interface PublicLabResult {
  patientNameMasked: string;
  requestCode: string;
  requestDate?: string | null;
  expiresAt: string;
  pendingCount: number;
  results: PublicLabResultService[];
}

export async function getPublicLabResult(token: string): Promise<PublicLabResult> {
  const { data } = await publicClient.get<PublicLabResult>('/public-lab-result', { params: { token } });
  return data;
}
