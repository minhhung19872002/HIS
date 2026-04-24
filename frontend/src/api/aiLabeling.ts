import apiClient from './client';

export interface AiModelConfig {
  modelUrl: string;
  modelName: string;
  modelVersion: string;
  labels: string[];
  labelsVi: string[];
  inputWidth: number;
  inputHeight: number;
}

export interface AiLabel {
  label: string;
  labelVi: string;
  score: number; // 0..1
}

export interface AiResultDto {
  id: string;
  studyInstanceUID: string;
  modelName: string;
  modelVersion?: string;
  durationMs: number;
  labelsJson: string;
  reviewStatus: number;
  reviewStatusLabel: string;
  acceptedLabelsJson?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  errorMessage?: string;
}

export interface SaveAiResultRequest {
  studyInstanceUID: string;
  patientId?: string;
  radiologyRequestId?: string;
  modelName: string;
  modelVersion?: string;
  modelUrl?: string;
  durationMs: number;
  labelsJson: string;
  inputImageHash?: string;
  inputWidth?: number;
  inputHeight?: number;
  errorMessage?: string;
}

export interface ReviewAiResultRequest {
  reviewStatus: number; // 1=accept all, 2=partial, 3=reject
  acceptedLabelsJson?: string;
  reviewNote?: string;
}

export async function getModelConfig(): Promise<AiModelConfig> {
  const { data } = await apiClient.get<AiModelConfig>('/ai-labeling/config');
  return data;
}

export async function saveAiResult(req: SaveAiResultRequest): Promise<AiResultDto> {
  const { data } = await apiClient.post<AiResultDto>('/ai-labeling', req);
  return data;
}

export async function reviewAiResult(id: string, req: ReviewAiResultRequest): Promise<AiResultDto> {
  const { data } = await apiClient.post<AiResultDto>(`/ai-labeling/${id}/review`, req);
  return data;
}

export async function getAiHistoryByStudy(studyUid: string): Promise<AiResultDto[]> {
  const { data } = await apiClient.get<AiResultDto[]>(`/ai-labeling/by-study/${encodeURIComponent(studyUid)}`);
  return data;
}
