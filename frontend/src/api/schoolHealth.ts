import { apiClient } from './client';

// ---- Types ----

export interface SchoolExam {
  id: string;
  studentName: string;
  studentCode: string;
  gender: number;
  dateOfBirth: string;
  schoolName: string;
  schoolCode: string;
  grade: string;
  className: string;
  academicYear: string;
  examDate: string;
  examDoctor: string;
  height: number;
  weight: number;
  bmi: number;
  nutritionStatus: string; // normal, underweight, overweight, obese, stunted
  visionLeft: string;
  visionRight: string;
  visionFlag: boolean;
  hearingFlag: boolean;
  dentalFlag: boolean;
  scoliosisFlag: boolean;
  status: number; // 0=pending, 1=completed, 2=needsFollowUp
  conclusion?: string;
  recommendations?: string;
}

export interface SchoolStats {
  schoolsExamined: number;
  studentsExamined: number;
  completionRate: number;
  needsFollowUp: number;
}

export interface School {
  code: string;
  name: string;
  address: string;
  type: string; // primary, secondary, highschool
}

// ---- API Functions ----

export const searchSchoolExams = async (params?: {
  keyword?: string;
  schoolCode?: string;
  academicYear?: string;
  grade?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<SchoolExam[]>('/school-health/exams', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch school exams');
    return [];
  }
};

export const getSchoolExamById = async (id: string) => {
  const response = await apiClient.get<SchoolExam>(`/school-health/exams/${id}`);
  return response.data;
};

export const createSchoolExam = async (data: Partial<SchoolExam>) => {
  const response = await apiClient.post<SchoolExam>('/school-health/exams', data);
  return response.data;
};

export const updateSchoolExam = async (id: string, data: Partial<SchoolExam>) => {
  const response = await apiClient.put<SchoolExam>(`/school-health/exams/${id}`, data);
  return response.data;
};

export const getSchoolStats = async (): Promise<SchoolStats> => {
  try {
    const response = await apiClient.get<SchoolStats>('/school-health/statistics');
    return response.data;
  } catch {
    console.warn('Failed to fetch school health statistics');
    return { schoolsExamined: 0, studentsExamined: 0, completionRate: 0, needsFollowUp: 0 };
  }
};

export const getSchoolList = async (): Promise<School[]> => {
  try {
    const response = await apiClient.get<School[]>('/school-health/schools');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch school list');
    return [];
  }
};

export const createBatchExam = async (data: {
  schoolCode: string;
  academicYear: string;
  grade: string;
  className: string;
  examDate: string;
  students: Partial<SchoolExam>[];
}) => {
  const response = await apiClient.post('/school-health/exams/batch', data);
  return response.data;
};

export default {
  searchSchoolExams,
  getSchoolExamById,
  createSchoolExam,
  updateSchoolExam,
  getSchoolStats,
  getSchoolList,
  createBatchExam,
};
