import apiClient from './client';

export interface DoctorWorkloadDto {
  userId: string;
  fullName: string;
  examinationCount: number;
  prescriptionCount: number;
  serviceRequestCount: number;
}

export interface RadiologistWorkloadDto {
  userId: string;
  fullName: string;
  studiesRequested: number;
  studiesPerformedAsTech: number;
  reportsApproved: number;
}

export interface TechnicianWorkloadDto {
  userId: string;
  fullName: string;
  labRequestsOrdered: number;
}

export interface WorkloadReportDto {
  fromDate: string;
  toDate: string;
  doctors: DoctorWorkloadDto[];
  radiologists: RadiologistWorkloadDto[];
  technicians: TechnicianWorkloadDto[];
}

export async function getWorkload(fromDate?: string, toDate?: string): Promise<WorkloadReportDto> {
  const { data } = await apiClient.get<WorkloadReportDto>('/reports/workload', {
    params: { fromDate, toDate },
  });
  return data;
}
