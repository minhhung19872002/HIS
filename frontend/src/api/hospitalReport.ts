import client from './client';

export interface HospitalReportResult {
  reportCode: string;
  reportName: string;
  generatedAt: string;
  parameters: {
    from?: string;
    to?: string;
    departmentId?: string;
    warehouseId?: string;
  };
  summary: Record<string, unknown>;
  data: Record<string, unknown>[];
  columns: string[];
}

export interface BirthCertificateRequest {
  admissionId: string;
  babyName: string;
  babySex: string;
  birthDate: string;
  birthTime: string;
  birthWeight: number;
  birthLength: number;
  apgarScore: string;
  deliveryMethod: string;
  motherName: string;
  motherDob: string;
  motherIdNumber: string;
  motherAddress: string;
  fatherName: string;
  fatherDob: string;
  fatherIdNumber: string;
}

/**
 * Unified Hospital Report API - calls GET /api/reports/hospital/{reportCode}
 * Returns structured JSON data for any of the 140+ report codes.
 */
export const hospitalReportApi = {
  getReport: (
    reportCode: string,
    from?: string,
    to?: string,
    departmentId?: string,
    warehouseId?: string
  ) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (departmentId) params.append('departmentId', departmentId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    const qs = params.toString();
    return client.get<HospitalReportResult>(
      `/reports/hospital/${reportCode}${qs ? `?${qs}` : ''}`
    );
  },

  printBirthCertificate: (data: BirthCertificateRequest) =>
    client.post('/reports/hospital/print/birth-certificate', data, {
      responseType: 'blob',
    }),
};

export default hospitalReportApi;
