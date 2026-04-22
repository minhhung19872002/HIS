/**
 * Multi-specialty exam workflow — Sprint 1 Item 1.5
 * Đăng ký nhiều phòng + khám thêm chuyên khoa khác + undo bill/completion.
 */

import apiClient from './client';

export interface MultiRoomRegistrationRequest {
  patientId: string;
  patientType?: number;
  roomIds: string[];
  insuranceNumber?: string;
  chiefComplaint?: string;
  initialDiagnosis?: string;
  queueType?: number;
}

export interface RegisteredExamDto {
  examinationId: string;
  roomId: string;
  roomName: string;
  queueNumber: number;
  status: number;
}

export interface MultiRoomRegistrationResult {
  medicalRecordId: string;
  medicalRecordCode: string;
  examinations: RegisteredExamDto[];
}

export interface AddFollowUpSpecialtyRequest {
  parentExaminationId: string;
  roomId: string;
  reason?: string;
}

export interface ChangeRoomBeforeExamRequest {
  examinationId: string;
  newRoomId: string;
  reason?: string;
}

export interface ExamCompletionStatus {
  examinationId: string;
  isCompleted: boolean;
  isBillPrinted: boolean;
  completedAt?: string;
  billPrintedAt?: string;
  canPrintBill: boolean;
  blockReason?: string;
  totalExamsInChain: number;
  completedExamsInChain: number;
}

export async function registerMultipleRooms(req: MultiRoomRegistrationRequest) {
  const { data } = await apiClient.post<MultiRoomRegistrationResult>(
    '/multi-specialty-exam/register-multi-rooms', req);
  return data;
}

export async function addFollowUpSpecialty(req: AddFollowUpSpecialtyRequest) {
  const { data } = await apiClient.post<RegisteredExamDto>('/multi-specialty-exam/add-follow-up', req);
  return data;
}

export async function changeRoomBeforeExam(req: ChangeRoomBeforeExamRequest) {
  const { data } = await apiClient.post<RegisteredExamDto>('/multi-specialty-exam/change-room', req);
  return data;
}

export async function getCompletionStatus(examinationId: string) {
  const { data } = await apiClient.get<ExamCompletionStatus>(
    `/multi-specialty-exam/completion-status/${examinationId}`);
  return data;
}

export async function printBill(examinationId: string) {
  const { data } = await apiClient.post<ExamCompletionStatus>(
    `/multi-specialty-exam/print-bill/${examinationId}`);
  return data;
}

export async function cancelPrintBill(examinationId: string) {
  const { data } = await apiClient.post<ExamCompletionStatus>(
    `/multi-specialty-exam/cancel-print-bill/${examinationId}`);
  return data;
}

export async function cancelCompletion(examinationId: string) {
  const { data } = await apiClient.post<ExamCompletionStatus>(
    `/multi-specialty-exam/cancel-completion/${examinationId}`);
  return data;
}

export async function deleteRegistration(examinationId: string, reason: string) {
  const { data } = await apiClient.post('/multi-specialty-exam/delete-registration', {
    examinationId, reason,
  });
  return data;
}
