import { apiClient } from './client';

// ---- Types ----

export interface TrainingClassDto {
  id: string;
  classCode: string;
  className: string;
  trainingType: number;
  trainingTypeName?: string;
  startDate?: string;
  endDate?: string;
  maxStudents: number;
  enrolledCount: number;
  location?: string;
  instructorId?: string;
  instructorName?: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  creditHours: number;
  status: number;
  statusName?: string;
  fee: number;
  createdAt?: string;
  students?: TrainingStudentDto[];
}

export interface TrainingStudentDto {
  id: string;
  classId: string;
  staffId?: string;
  staffName?: string;
  externalName?: string;
  displayName: string;
  studentType: number;
  studentTypeName?: string;
  attendanceStatus: number;
  attendanceStatusName?: string;
  score?: number;
  certificateNumber?: string;
  certificateDate?: string;
  notes?: string;
}

export interface ClinicalDirectionDto {
  id: string;
  directionType: number;
  directionTypeName?: string;
  partnerHospital: string;
  startDate?: string;
  endDate?: string;
  objectives?: string;
  status: number;
  statusName?: string;
  responsibleDoctorId?: string;
  responsibleDoctorName?: string;
  notes?: string;
  createdAt?: string;
}

export interface ResearchProjectDto {
  id: string;
  projectCode: string;
  title: string;
  level: number;
  levelName?: string;
  principalInvestigatorId?: string;
  principalInvestigatorName?: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  status: number;
  statusName?: string;
  abstract?: string;
  findings?: string;
  publicationInfo?: string;
  createdAt?: string;
}

export interface TrainingDashboardDto {
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
  certificatesIssued: number;
  cmeCompliancePercent: number;
  researchProjects: number;
  researchPublished: number;
  clinicalDirections: number;
  classesByType: { trainingType: number; typeName: string; count: number }[];
  projectsByStatus: { status: number; statusName: string; count: number }[];
}

export interface CreditSummaryDto {
  staffId: string;
  staffName: string;
  departmentName?: string;
  totalCredits: number;
  requiredCredits: number;
  compliancePercent: number;
  isCompliant: boolean;
}

// ---- API Functions ----

export const getTrainingClasses = async (params?: {
  keyword?: string;
  trainingType?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<TrainingClassDto[]>('/training/classes', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch training classes');
    return [];
  }
};

export const getTrainingClassById = async (id: string) => {
  const response = await apiClient.get<TrainingClassDto>(`/training/classes/${id}`);
  return response.data;
};

export const saveTrainingClass = async (data: Partial<TrainingClassDto>, id?: string) => {
  if (id) {
    const response = await apiClient.put<TrainingClassDto>(`/training/classes/${id}`, data);
    return response.data;
  }
  const response = await apiClient.post<TrainingClassDto>('/training/classes', data);
  return response.data;
};

export const getClassStudents = async (classId: string) => {
  try {
    const response = await apiClient.get<TrainingStudentDto[]>(`/training/classes/${classId}/students`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch class students');
    return [];
  }
};

export const enrollStudent = async (data: { classId: string; staffId?: string; externalName?: string; studentType: number; notes?: string }) => {
  const response = await apiClient.post<TrainingStudentDto>('/training/students/enroll', data);
  return response.data;
};

export const updateStudentStatus = async (studentId: string, data: { attendanceStatus: number; score?: number; notes?: string }) => {
  const response = await apiClient.put<TrainingStudentDto>(`/training/students/${studentId}/status`, data);
  return response.data;
};

export const issueCertificate = async (studentId: string, data: { certificateNumber: string; certificateDate?: string }) => {
  const response = await apiClient.put<TrainingStudentDto>(`/training/students/${studentId}/certificate`, data);
  return response.data;
};

export const getClinicalDirections = async (params?: {
  keyword?: string;
  directionType?: number;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<ClinicalDirectionDto[]>('/training/directions', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch clinical directions');
    return [];
  }
};

export const getClinicalDirectionById = async (id: string) => {
  const response = await apiClient.get<ClinicalDirectionDto>(`/training/directions/${id}`);
  return response.data;
};

export const saveClinicalDirection = async (data: Partial<ClinicalDirectionDto>, id?: string) => {
  if (id) {
    const response = await apiClient.put<ClinicalDirectionDto>(`/training/directions/${id}`, data);
    return response.data;
  }
  const response = await apiClient.post<ClinicalDirectionDto>('/training/directions', data);
  return response.data;
};

export const getResearchProjects = async (params?: {
  keyword?: string;
  level?: number;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<ResearchProjectDto[]>('/training/projects', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch research projects');
    return [];
  }
};

export const getResearchProjectById = async (id: string) => {
  const response = await apiClient.get<ResearchProjectDto>(`/training/projects/${id}`);
  return response.data;
};

export const saveResearchProject = async (data: Partial<ResearchProjectDto>, id?: string) => {
  if (id) {
    const response = await apiClient.put<ResearchProjectDto>(`/training/projects/${id}`, data);
    return response.data;
  }
  const response = await apiClient.post<ResearchProjectDto>('/training/projects', data);
  return response.data;
};

export const getTrainingDashboard = async (): Promise<TrainingDashboardDto> => {
  try {
    const response = await apiClient.get<TrainingDashboardDto>('/training/dashboard');
    return response.data;
  } catch {
    console.warn('Failed to fetch training dashboard');
    return {
      totalClasses: 0, activeClasses: 0, totalStudents: 0, certificatesIssued: 0,
      cmeCompliancePercent: 0, researchProjects: 0, researchPublished: 0, clinicalDirections: 0,
      classesByType: [], projectsByStatus: [],
    };
  }
};

export const getCreditSummary = async (): Promise<CreditSummaryDto[]> => {
  try {
    const response = await apiClient.get<CreditSummaryDto[]>('/training/credit-summary');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch credit summary');
    return [];
  }
};
