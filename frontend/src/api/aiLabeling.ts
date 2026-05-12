import apiClient from './client';

export interface AiModelConfig {
  modelUrl: string;
  modelName: string;
  modelVersion: string;
  labels: string[];
  labelsVi: string[];
  inputWidth: number;
  inputHeight: number;
  /** DICOM Modality this model was configured for. Server echoes the resolved value. */
  modality: string;
  /** True when the ONNX file is present on the server (or a ModelUrl override is set). */
  available: boolean;
}

/** Summary of every configured modality — used to disable the AI button early when unsupported. */
export interface AiModalitySummary {
  modality: string;
  aliases: string[];
  modelName: string;
  modelVersion: string;
  available: boolean;
  note?: string;
}

export interface AiLabel {
  label: string;
  labelVi: string;
  score: number; // 0..1
  /** Bounding box normalized [0..1] in image space. Optional — set for detection models (YOLO, RetinaNet). */
  bbox?: AiBoundingBox;
  /** Class-activation/saliency map. Optional — set when frontend computes occlusion heatmap or Grad-CAM. */
  heatmap?: AiHeatmap;
}

/** Normalized [0..1] coords. (x,y) is top-left corner, (w,h) is size. */
export interface AiBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Coarse heatmap grid for a single label. Stored as flat row-major Float32 in
 * range [0..1] (renderer interpolates + applies color ramp).
 * Typical sizes: 7x7 (DenseNet feature map) or 14x14 (occlusion grid).
 */
export interface AiHeatmap {
  width: number;
  height: number;
  /** Row-major, length = width*height, each in [0..1]. */
  data: number[];
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

export async function getModelConfig(modality?: string): Promise<AiModelConfig> {
  const url = modality ? `/ai-labeling/config?modality=${encodeURIComponent(modality)}` : '/ai-labeling/config';
  const { data } = await apiClient.get<AiModelConfig>(url);
  return data;
}

export async function listModalities(): Promise<AiModalitySummary[]> {
  const { data } = await apiClient.get<AiModalitySummary[]>('/ai-labeling/modalities');
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

// -------- Phase 3 export helpers --------

/** Open the HTML report in a new tab; user can Ctrl+P to print as PDF. */
export function openAiReportHtml(aiResultId: string): void {
  const token = localStorage.getItem('token') || '';
  // Inline token into URL hash so the new tab can attach it via interceptor.
  // The simpler approach: rely on cookie-based auth. Since this app uses
  // localStorage JWT, we instead fetch the HTML via authenticated axios
  // and open via blob URL.
  apiClient
    .get<Blob>(`/ai-labeling/${aiResultId}/export/html`, { responseType: 'blob' })
    .then((resp) => {
      const blob = new Blob([resp.data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      // Revoke after the new window has had time to load.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (!win) throw new Error('Popup bị chặn — bật popup cho trang này');
    })
    .catch((e) => {
      console.warn('[AI] HTML export failed:', e);
      throw e;
    });
  // Note: token header is injected by the apiClient request interceptor.
}

export interface DicomSrUploadResult {
  instanceId: string;
  studyInstanceUid: string;
}

/** Build DICOM SR + upload back to PACS so the SR appears alongside the
 *  original CR/CT/US in any viewer. Requires PACS:BaseUrl configured. */
export async function uploadAiDicomSr(aiResultId: string): Promise<DicomSrUploadResult> {
  const { data } = await apiClient.post<DicomSrUploadResult>(`/ai-labeling/${aiResultId}/export/dicom-sr/upload`);
  return data;
}

export interface MergeReportResult {
  merged: boolean;
  radiologyReportId?: string;
  message?: string;
}

/** Append accepted AI findings into the matching RadiologyReport.Findings. */
export async function mergeAiToReport(aiResultId: string): Promise<MergeReportResult> {
  const { data } = await apiClient.post<MergeReportResult>(`/ai-labeling/${aiResultId}/merge-to-report`);
  return data;
}

// -------- Phase 4 worklist + providers --------

export interface AiQueueItem {
  id: string;
  studyInstanceUID: string;
  patientId?: string;
  patientName?: string;
  radiologyRequestId?: string;
  requestCode?: string;
  modality?: string;
  queuedAt: string;
  /** True for entries created by the AiWorklistService cron (auto). */
  autoQueued: boolean;
}

export interface AiProviderInfo {
  id: string;
  name: string;
  supportedModalities: string[];
}

export async function getAiQueue(limit = 50): Promise<AiQueueItem[]> {
  const { data } = await apiClient.get<AiQueueItem[]>(`/ai-labeling/queue?limit=${limit}`);
  return data;
}

export async function listAiProviders(): Promise<AiProviderInfo[]> {
  const { data } = await apiClient.get<AiProviderInfo[]>('/ai-labeling/providers');
  return data;
}

export interface RunViaProviderRequest {
  providerId: string;
  studyInstanceUID: string;
  modality: string;
  imageUrl?: string;
  patientId?: string;
  radiologyRequestId?: string;
}

export async function runViaProvider(req: RunViaProviderRequest): Promise<AiResultDto> {
  const { data } = await apiClient.post<AiResultDto>('/ai-labeling/run-via-provider', req);
  return data;
}
