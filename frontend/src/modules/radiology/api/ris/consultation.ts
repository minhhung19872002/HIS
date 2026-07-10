/**
 * RIS API — Consultation sessions/cases/participants/discussion/image-notes/minutes/attachments.
 */

import apiClient from '../../../../services/apiClient';

// #region Interfaces

export interface ConsultationSessionDto {
  id: string;
  sessionCode: string;
  title: string;
  description?: string;
  scheduledTime: string;
  startTime?: string;
  endTime?: string;
  status: number;
  statusName: string;
  meetingUrl?: string;
  createdByUserName: string;
  caseCount: number;
  cases?: ConsultationCaseDto[];
  participants?: ConsultationParticipantDto[];
}

export interface SaveConsultationSessionDto {
  id?: string;
  title: string;
  description?: string;
  scheduledTime: string;
  meetingUrl?: string;
  status?: number;
}

export interface SearchConsultationDto {
  fromDate?: string;
  toDate?: string;
  status?: number;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface ConsultationSearchResultDto {
  items: ConsultationSessionDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface ConsultationCaseDto {
  id: string;
  radiologyRequestId: string;
  patientName?: string;
  patientCode?: string;
  serviceName?: string;
  reason?: string;
  status: number;
}

export interface AddConsultationCaseDto {
  consultationSessionId: string;
  radiologyRequestId: string;
  reason?: string;
}

export interface ConsultationParticipantDto {
  id: string;
  userId: string;
  userName?: string;
  role: string;
  invitedAt?: string;
  joinedAt?: string;
  leftAt?: string;
}

export interface InviteParticipantDto {
  consultationSessionId: string;
  userId: string;
  role?: string;
}

export interface ConsultationDiscussionDto {
  id: string;
  consultationCaseId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface AddConsultationDiscussionDto {
  consultationCaseId: string;
  content: string;
}

export interface ConsultationImageNoteDto {
  id: string;
  studyInstanceUID: string;
  sopInstanceUID?: string;
  annotationType: string;
  annotationData: string;
  note?: string;
  createdByUserName?: string;
  createdAt: string;
}

export interface AddConsultationImageNoteDto {
  consultationCaseId: string;
  studyInstanceUID: string;
  sopInstanceUID?: string;
  annotationType: string;
  annotationData: string;
  note?: string;
}

export interface ConsultationMinutesDto {
  id: string;
  consultationSessionId: string;
  content?: string;
  conclusion?: string;
  recommendations?: string;
  isApproved?: boolean;
  approvedAt?: string;
}

export interface SaveConsultationMinutesDto {
  consultationSessionId: string;
  content?: string;
  conclusion?: string;
  recommendations?: string;
}

export interface ConsultationAttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

export interface AddConsultationAttachmentDto {
  consultationCaseId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
}

// #endregion

// #region V. Consultation APIs

export const searchConsultations = (data: SearchConsultationDto) =>
  apiClient.post<ConsultationSearchResultDto>('/RISComplete/consultations/search', data);

export const getConsultationSession = (sessionId: string) =>
  apiClient.get<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}`);

export const saveConsultationSession = (data: SaveConsultationSessionDto) =>
  apiClient.post<ConsultationSessionDto>('/RISComplete/consultations', data);

export const deleteConsultationSession = (sessionId: string) =>
  apiClient.delete(`/RISComplete/consultations/${sessionId}`);

export const startConsultation = (sessionId: string) =>
  apiClient.post<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}/start`);

export const endConsultation = (sessionId: string) =>
  apiClient.post<ConsultationSessionDto>(`/RISComplete/consultations/${sessionId}/end`);

export const addConsultationCase = (data: AddConsultationCaseDto) =>
  apiClient.post<ConsultationCaseDto>('/RISComplete/consultations/cases', data);

export const removeConsultationCase = (caseId: string) =>
  apiClient.delete(`/RISComplete/consultations/cases/${caseId}`);

export const inviteParticipant = (data: InviteParticipantDto) =>
  apiClient.post<ConsultationParticipantDto>('/RISComplete/consultations/participants', data);

export const removeParticipant = (participantId: string) =>
  apiClient.delete(`/RISComplete/consultations/participants/${participantId}`);

export const joinConsultation = (sessionId: string) =>
  apiClient.post<ConsultationParticipantDto>(`/RISComplete/consultations/${sessionId}/join`);

export const leaveConsultation = (sessionId: string) =>
  apiClient.post(`/RISComplete/consultations/${sessionId}/leave`);

export const addConsultationDiscussion = (data: AddConsultationDiscussionDto) =>
  apiClient.post<ConsultationDiscussionDto>('/RISComplete/consultations/discussions', data);

export const getConsultationDiscussions = (caseId: string) =>
  apiClient.get<ConsultationDiscussionDto[]>(`/RISComplete/consultations/cases/${caseId}/discussions`);

export const addConsultationImageNote = (data: AddConsultationImageNoteDto) =>
  apiClient.post<ConsultationImageNoteDto>('/RISComplete/consultations/image-notes', data);

export const getConsultationImageNotes = (caseId: string) =>
  apiClient.get<ConsultationImageNoteDto[]>(`/RISComplete/consultations/cases/${caseId}/image-notes`);

export const saveConsultationMinutes = (data: SaveConsultationMinutesDto) =>
  apiClient.post<ConsultationMinutesDto>('/RISComplete/consultations/minutes', data);

export const getConsultationMinutes = (sessionId: string) =>
  apiClient.get<ConsultationMinutesDto>(`/RISComplete/consultations/${sessionId}/minutes`);

export const approveConsultationMinutes = (minutesId: string) =>
  apiClient.post<ConsultationMinutesDto>(`/RISComplete/consultations/minutes/${minutesId}/approve`);

export const addConsultationAttachment = (data: AddConsultationAttachmentDto) =>
  apiClient.post<ConsultationAttachmentDto>('/RISComplete/consultations/attachments', data);

export const getConsultationAttachments = (caseId: string) =>
  apiClient.get<ConsultationAttachmentDto[]>(`/RISComplete/consultations/cases/${caseId}/attachments`);

// #endregion
