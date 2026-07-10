/**
 * RIS API — PACS connections, modalities, DICOM studies/series/images,
 * worklist to modality, viewer URL/config, annotations, key images, editImage,
 * capture devices/workstations/sessions/media, sendToPacs, DICOM export/remote.
 */

import apiClient from '../../../../services/apiClient';
import type { ModalityDto } from './_shared';

// #region Interfaces

export interface CreateModalityDto {
  code: string;
  name: string;
  modalityType: string;
  manufacturer?: string;
  model?: string;
  aeTitle: string;
  ipAddress?: string;
  port?: number;
  roomId: string;
  supportsWorklist: boolean;
  supportsMPPS: boolean;
  isActive: boolean;
}

export interface UpdateModalityDto extends CreateModalityDto {
  id: string;
}

export interface PACSConnectionDto {
  id: string;
  name: string;
  serverType: string;
  aeTitle: string;
  ipAddress: string;
  port: number;
  queryRetrievePort: number;
  protocol: string;
  isConnected: boolean;
  lastSync?: string;
  isActive: boolean;
}

export interface CreatePACSConnectionDto {
  name: string;
  serverType: string;
  aeTitle: string;
  ipAddress: string;
  port: number;
  queryRetrievePort: number;
  protocol: string;
  isActive: boolean;
}

export interface UpdatePACSConnectionDto extends CreatePACSConnectionDto {
  id: string;
}

export interface PACSConnectionStatusDto {
  connectionId: string;
  isConnected: boolean;
  pingTimeMs: number;
  errorMessage?: string;
  checkTime: string;
}

export interface DicomStudyDto {
  studyInstanceUID: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime?: string;
  modality: string;
  studyDescription?: string;
  institutionName?: string;
  referringPhysician?: string;
  numberOfSeries: number;
  numberOfImages: number;
  studyStatus: string;
}

export interface DicomSeriesDto {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  seriesNumber: number;
  modality: string;
  seriesDescription?: string;
  bodyPartExamined?: string;
  numberOfImages: number;
  instanceCount?: number;
  seriesDate?: string;
  // Study level info (for convenience)
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  // Orthanc IDs (from PACS)
  orthancStudyId?: string;
  orthancSeriesId?: string;
}

export interface DicomImageDto {
  sopInstanceUID: string;
  seriesInstanceUID: string;
  instanceNumber: number;
  imageType?: string;
  rows: number;
  columns: number;
  photometricInterpretation?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  wadoUrl?: string;

  // Mammo hanging-protocol metadata
  laterality?: string;       // 'L' | 'R' | 'B'
  viewPosition?: string;     // 'CC' | 'MLO' | 'ML' | 'LM' | ...
  modality?: string;         // 'MG', 'CT', 'MR', ...
  pixelSpacing?: number;     // mm/pixel
}

export interface SendModalityWorklistDto {
  modalityId: string;
  orderIds: string[];
}

export interface SendWorklistResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

export interface DeviceConnectionConfigDto {
  deviceId: string;
  connectionType: string;
  connectionString?: string;
  ipAddress?: string;
  port?: number;
  comPort?: string;
  baudRate?: number;
  protocol?: string;
  folderPath?: string;
}

// DICOM Viewer interfaces
export interface ViewerUrlDto {
  studyInstanceUID: string;
  viewerUrl: string;
  wadoRsUrl?: string;
  dicomWebUrl?: string;
}

export interface DicomViewerConfigDto {
  viewerUrl: string;
  viewerType: string;
  enableAnnotation: boolean;
  enableMeasurement: boolean;
  enableMPR: boolean;
  enable3D: boolean;
  defaultLayout?: string;
  defaultWindowLevel?: string;
}

export interface ImageAnnotationDto {
  id: string;
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  sopInstanceUID: string;
  annotationType: string;
  annotationData: string;
  createdBy?: string;
  createdTime: string;
}

export interface KeyImageDto {
  id: string;
  studyInstanceUID: string;
  sopInstanceUID: string;
  description?: string;
  thumbnailUrl?: string;
  markedBy?: string;
  markedTime: string;
}

export interface MarkKeyImageDto {
  studyInstanceUID: string;
  sopInstanceUID: string;
  description?: string;
  /** Set true to unmark (soft-delete) an existing key image */
  unmark?: boolean;
}

export interface ImageEditDto {
  imageId: string;
  editType: string;
  parameters: string;
}

// Capture Device interfaces
export interface CaptureDeviceDto {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  deviceTypeName: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  modalityId?: string;
  modalityName?: string;
  roomId?: string;
  roomName?: string;
  status: string;
  lastCommunication?: string;
  isActive: boolean;
}

export interface SaveCaptureDeviceDto {
  id?: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  modalityId?: string;
  roomId?: string;
  isActive: boolean;
}

export interface CaptureDeviceStatusDto {
  deviceId: string;
  isConnected: boolean;
  lastCommunication?: string;
  status: string;
  message?: string;
}

export interface WorkstationDto {
  id: string;
  workstationCode: string;
  workstationName: string;
  computerName: string;
  ipAddress?: string;
  roomId?: string;
  roomName?: string;
  capturePort?: number;
  isActive: boolean;
}

export interface SaveWorkstationDto {
  id?: string;
  workstationCode: string;
  workstationName: string;
  computerName: string;
  ipAddress?: string;
  roomId?: string;
  capturePort?: number;
  isActive: boolean;
}

export interface CaptureSessionDto {
  id: string;
  sessionCode: string;
  radiologyRequestId: string;
  captureDeviceId?: string;
  workstationId?: string;
  startTime: string;
  endTime?: string;
  status: string;
  mediaCount?: number;
}

export interface CreateCaptureSessionDto {
  radiologyRequestId: string;
  captureDeviceId?: string;
  workstationId?: string;
}

export interface CapturedMediaDto {
  id: string;
  captureSessionId: string;
  mediaType: string;
  filePath: string;
  fileSize: number;
  thumbnailPath?: string;
  description?: string;
  capturedAt: string;
}

export interface SaveCapturedMediaDto {
  captureSessionId: string;
  mediaType: string;
  filePath: string;
  fileSize: number;
  thumbnailPath?: string;
  description?: string;
}

export interface SendToPacsRequestDto {
  captureSessionId: string;
  mediaIds: string[];
  studyInstanceUID?: string;
  seriesDescription?: string;
}

export interface SendToPacsResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  studyInstanceUID?: string;
  sentAt: string;
  errors?: string[];
}

// DICOM Export interfaces
export interface DicomExportRequestDto {
  studyInstanceUID: string;
  includeAllSeries: boolean;
  anonymize?: boolean;
}

export interface DicomExportResultDto {
  success: boolean;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  message?: string;
}

// Filter Preset interfaces
export interface RisFilterPresetDto {
  id: string;
  name: string;
  searchText?: string;
  modalityFilter?: string;
  dateRange?: [string, string] | null;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface SaveRisFilterPresetDto {
  id?: string;
  name: string;
  searchText?: string;
  modalityFilter?: string;
  dateRange?: [string, string] | null;
  status?: string;
}

// #endregion

// #region 8.2 PACS & Modality APIs

export const getPACSConnections = () =>
  apiClient.get<PACSConnectionDto[]>('/RISComplete/pacs-connections');

export const createPACSConnection = (data: CreatePACSConnectionDto) =>
  apiClient.post<PACSConnectionDto>('/RISComplete/pacs-connections', data);

export const updatePACSConnection = (id: string, data: UpdatePACSConnectionDto) =>
  apiClient.put<PACSConnectionDto>(`/RISComplete/pacs-connections/${id}`, data);

export const deletePACSConnection = (id: string) =>
  apiClient.delete(`/RISComplete/pacs-connections/${id}`);

export const checkPACSConnection = (connectionId: string) =>
  apiClient.get<PACSConnectionStatusDto>(`/RISComplete/pacs-connections/${connectionId}/status`);

export const getModalities = (keyword?: string, modalityType?: string) =>
  apiClient.get<ModalityDto[]>('/RISComplete/modalities', {
    params: { keyword, modalityType }
  });

export const createModality = (data: CreateModalityDto) =>
  apiClient.post<ModalityDto>('/RISComplete/modalities', data);

export const updateModality = (id: string, data: UpdateModalityDto) =>
  apiClient.put<ModalityDto>(`/RISComplete/modalities/${id}`, data);

export const deleteModality = (id: string) =>
  apiClient.delete(`/RISComplete/modalities/${id}`);

export const sendWorklistToModality = (data: SendModalityWorklistDto) =>
  apiClient.post<SendWorklistResultDto>('/RISComplete/modalities/worklist/send', data);

export const configureDeviceConnection = (deviceId: string, config: DeviceConnectionConfigDto) =>
  apiClient.put(`/RISComplete/devices/${deviceId}/connection`, config);

// #endregion

// #region DICOM Studies/Series/Images (PACS query)

export const getStudiesFromPACS = (patientId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<DicomStudyDto[]>('/RISComplete/pacs/studies', {
    params: { patientId, fromDate, toDate }
  });

export const getSeries = (studyInstanceUID: string) =>
  apiClient.get<DicomSeriesDto[]>(`/RISComplete/pacs/studies/${studyInstanceUID}/series`);

export const getImages = (seriesInstanceUID: string) =>
  apiClient.get<DicomImageDto[]>(`/RISComplete/pacs/series/${seriesInstanceUID}/images`);

// #endregion

// #region DICOM Viewer APIs

export const getViewerUrl = (studyInstanceUID: string) =>
  apiClient.get<ViewerUrlDto>('/RISComplete/viewer/url', {
    params: { studyInstanceUID }
  });

export const getViewerConfig = () =>
  apiClient.get<DicomViewerConfigDto>('/RISComplete/viewer/config');

export const saveAnnotation = (annotation: ImageAnnotationDto) =>
  apiClient.post<ImageAnnotationDto>('/RISComplete/annotations', annotation);

export const getAnnotations = (sopInstanceUID: string) =>
  apiClient.get<ImageAnnotationDto[]>('/RISComplete/annotations', {
    params: { sopInstanceUID }
  });

export const markKeyImage = (data: MarkKeyImageDto) =>
  apiClient.post<KeyImageDto>('/RISComplete/key-images', data);

export const getKeyImages = (studyInstanceUID: string) =>
  apiClient.get<KeyImageDto[]>('/RISComplete/key-images', {
    params: { studyInstanceUID }
  });

export const editImage = (data: ImageEditDto) =>
  apiClient.post('/RISComplete/images/edit', data, {
    responseType: 'blob'
  });

// #endregion

// #region IV. Capture Device APIs

export const getCaptureDevices = (deviceType?: string, keyword?: string, isActive?: boolean) =>
  apiClient.get<CaptureDeviceDto[]>('/RISComplete/capture-devices', {
    params: { deviceType, keyword, isActive }
  });

export const saveCaptureDevice = (data: SaveCaptureDeviceDto) =>
  apiClient.post<CaptureDeviceDto>('/RISComplete/capture-devices', data);

export const deleteCaptureDevice = (deviceId: string) =>
  apiClient.delete(`/RISComplete/capture-devices/${deviceId}`);

export const testCaptureDeviceConnection = (deviceId: string) =>
  apiClient.get<CaptureDeviceStatusDto>(`/RISComplete/capture-devices/${deviceId}/test`);

export const getWorkstations = (roomId?: string) =>
  apiClient.get<WorkstationDto[]>('/RISComplete/workstations', {
    params: { roomId }
  });

export const saveWorkstation = (data: SaveWorkstationDto) =>
  apiClient.post<WorkstationDto>('/RISComplete/workstations', data);

export const createCaptureSession = (data: CreateCaptureSessionDto) =>
  apiClient.post<CaptureSessionDto>('/RISComplete/capture-sessions', data);

export const endCaptureSession = (sessionId: string) =>
  apiClient.post<CaptureSessionDto>(`/RISComplete/capture-sessions/${sessionId}/end`);

export const saveCapturedMedia = (data: SaveCapturedMediaDto) =>
  apiClient.post<CapturedMediaDto>('/RISComplete/captured-media', data);

export const getCapturedMedia = (sessionId: string) =>
  apiClient.get<CapturedMediaDto[]>(`/RISComplete/capture-sessions/${sessionId}/media`);

export const sendMediaToPacs = (data: SendToPacsRequestDto) =>
  apiClient.post<SendToPacsResultDto>('/RISComplete/captured-media/send-to-pacs', data);

// #endregion

// #region DICOM Export & Remote PACS

export const exportDicomStudy = (data: DicomExportRequestDto) =>
  apiClient.post('/RISComplete/dicom/export', data, {
    responseType: 'blob',
    timeout: 120000,
  });

export const getDicomExportStatus = (studyInstanceUID: string) =>
  apiClient.get<DicomExportResultDto>(`/RISComplete/dicom/export-status/${studyInstanceUID}`);

// Bulk export — nhiều study theo patient/list + tùy chọn anonymize (Prompt 8 Đợt 2)
export const bulkExportDicom = (data: { studyIds: string[]; anonymize: boolean }) =>
  apiClient.post('/RISComplete/dicom/bulk-export', data, {
    responseType: 'blob',
    timeout: 300_000, // 5 phút cho nhiều study
  });

// DICOM Send to remote PACS
export const sendDicomToRemote = (data: { studyId: string; remoteServerId: string }) =>
  apiClient.post('/riscomplete/dicom/send', data);

// Remote PACS Server management
export const getRemoteServers = () =>
  apiClient.get('/riscomplete/dicom/remote-servers');

export const saveRemoteServer = (data: { id?: string; name: string; aeTitle: string; host: string; port: number; description?: string; isActive?: boolean }) =>
  apiClient.post('/riscomplete/dicom/remote-servers', data);

export const deleteRemoteServer = (id: string) =>
  apiClient.delete(`/riscomplete/dicom/remote-servers/${id}`);

// #endregion

// #region Filter Presets

export const getFilterPresets = () =>
  apiClient.get<RisFilterPresetDto[]>('/RISComplete/filter-presets');

export const saveFilterPreset = (data: SaveRisFilterPresetDto) =>
  apiClient.post<RisFilterPresetDto>('/RISComplete/filter-presets', data);

export const deleteFilterPreset = (presetId: string) =>
  apiClient.delete(`/RISComplete/filter-presets/${presetId}`);

// #endregion
