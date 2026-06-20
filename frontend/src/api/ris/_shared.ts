/**
 * RIS API — Shared types used by multiple sub-modules.
 * Do NOT import from sibling ris/* files here (no circular deps).
 */

// ModalityDto is referenced by RadiologyRoomDto (worklist) AND defined with PACS functions —
// placing here avoids a cross-module reference.
export interface ModalityDto {
  id: string;
  code: string;
  name: string;
  modalityType: string;
  manufacturer?: string;
  model?: string;
  aeTitle: string;
  ipAddress?: string;
  port?: number;
  roomId: string;
  roomName: string;
  connectionStatus: string;
  lastCommunication?: string;
  supportsWorklist: boolean;
  supportsMPPS: boolean;
  isActive: boolean;
}

// AttachedImageDto is used by RadiologyResultDto (order-result) and AttachImageDto (order-result)
// also referenced in consultation image notes context — kept here for single source.
export interface AttachedImageDto {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  thumbnailPath?: string;
  base64Data?: string;
  description?: string;
  sortOrder: number;
  dicomStudyUID?: string;
  dicomSeriesUID?: string;
  dicomInstanceUID?: string;
}
