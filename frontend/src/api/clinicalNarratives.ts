import apiClient from '../services/apiClient';

const BASE = '/clinical-narratives';

export interface SurgeryNarrativeTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  surgeryServiceName?: string;
  departmentName?: string;
  preOpDiagnosis?: string;
  postOpDiagnosis?: string;
  surgeryMethod?: string;
  anesthesiaMethod?: string;
  narrativeBody?: string;
  complications?: string;
  postOpOrders?: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface OutpatientRecordTemplateDto {
  id: string;
  templateCode: string;
  templateName: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  departmentName?: string;
  chiefComplaint?: string;
  medicalHistory?: string;
  physicalExamination?: string;
  generalExamBody?: string;
  cardiovascularExam?: string;
  respiratoryExam?: string;
  giExam?: string;
  neuroExam?: string;
  conclusion?: string;
  treatmentPlan?: string;
  followUpNotes?: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
}

export const getSurgeryNarratives = (params?: { departmentId?: string; surgeryServiceId?: string; keyword?: string }) =>
  apiClient.get<SurgeryNarrativeTemplateDto[]>(`${BASE}/surgery`, { params });

export const getSurgeryNarrative = (id: string) =>
  apiClient.get<SurgeryNarrativeTemplateDto>(`${BASE}/surgery/${id}`);

export const saveSurgeryNarrative = (data: Partial<SurgeryNarrativeTemplateDto>) =>
  apiClient.post<{ id: string }>(`${BASE}/surgery`, data);

export const deleteSurgeryNarrative = (id: string) =>
  apiClient.delete(`${BASE}/surgery/${id}`);

export const getOutpatientRecordTemplates = (params?: { departmentId?: string; diagnosisCode?: string; keyword?: string }) =>
  apiClient.get<OutpatientRecordTemplateDto[]>(`${BASE}/outpatient-records`, { params });

export const getOutpatientRecordTemplate = (id: string) =>
  apiClient.get<OutpatientRecordTemplateDto>(`${BASE}/outpatient-records/${id}`);

export const saveOutpatientRecordTemplate = (data: Partial<OutpatientRecordTemplateDto>) =>
  apiClient.post<{ id: string }>(`${BASE}/outpatient-records`, data);

export const deleteOutpatientRecordTemplate = (id: string) =>
  apiClient.delete(`${BASE}/outpatient-records/${id}`);
