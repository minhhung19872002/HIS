/**
 * RIS/PACS (Radiology Information System) API Client
 * Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng - 28+ chức năng
 *
 * This file is a barrel re-export. Implementation lives in ris/ sub-modules.
 * All original named exports are preserved — callers do not need to change.
 */

// Shared base types (ModalityDto, AttachedImageDto) — single source of truth
export type { ModalityDto, AttachedImageDto } from './ris/_shared';

// Feature sub-modules (named exports)
export * from './ris/worklist';
export * from './ris/pacs';
export * from './ris/order-result';
export * from './ris/prescription';
export * from './ris/report';
export * from './ris/label-tag-qr';
export * from './ris/integration';
export * from './ris/signature';
export * from './ris/consultation';
export * from './ris/help';

// ---------------------------------------------------------------------------
// Default export — preserved for callers that do `import risApi from './ris'`
// ---------------------------------------------------------------------------
import {
  getWaitingList,
  callPatient,
  getDisplayConfig,
  updateDisplayConfig,
  startExam,
  completeExam,
  getRooms,
  saveRoom,
  getRoomSchedule,
  saveSchedule,
  getDutySchedules,
  saveDutySchedule,
  deleteDutySchedule,
  batchCreateDutySchedules,
  assignRoom,
  getRoomQueue,
  callNextPatient,
  getRoomStatistics,
} from './ris/worklist';

import {
  getPACSConnections,
  createPACSConnection,
  updatePACSConnection,
  deletePACSConnection,
  checkPACSConnection,
  getModalities,
  createModality,
  updateModality,
  deleteModality,
  sendWorklistToModality,
  configureDeviceConnection,
  getStudiesFromPACS,
  getSeries,
  getImages,
  getViewerUrl,
  getViewerConfig,
  saveAnnotation,
  getAnnotations,
  markKeyImage,
  getKeyImages,
  editImage,
  getCaptureDevices,
  saveCaptureDevice,
  deleteCaptureDevice,
  testCaptureDeviceConnection,
  getWorkstations,
  saveWorkstation,
  createCaptureSession,
  endCaptureSession,
  saveCapturedMedia,
  getCapturedMedia,
  sendMediaToPacs,
  exportDicomStudy,
  getDicomExportStatus,
  bulkExportDicom,
  sendDicomToRemote,
  getRemoteServers,
  saveRemoteServer,
  deleteRemoteServer,
  getFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
} from './ris/pacs';

import {
  getRadiologyOrders,
  getRadiologyOrder,
  getResultTemplatesByServiceType,
  getResultTemplatesByService,
  getResultTemplatesByGender,
  getAllResultTemplates,
  saveResultTemplate,
  deleteResultTemplate,
  changeResultTemplate,
  enterRadiologyResult,
  getRadiologyResult,
  updateRadiologyResult,
  attachImage,
  removeAttachedImage,
  linkStudyToOrder,
  preliminaryApproveResult,
  finalApproveResult,
  cancelApproval,
  printRadiologyResult,
  printRadiologyResultsBatch,
  sendResultToDepartment,
  getPatientRadiologyHistory,
  getPtttMappingByService,
  checkBatchPtttMappings,
  getDiagnosisTemplates,
  saveDiagnosisTemplate,
  deleteDiagnosisTemplate,
  getAbbreviations,
  saveAbbreviation,
  deleteAbbreviation,
  expandAbbreviations,
  getCLSScreenConfig,
  saveCLSScreenConfig,
  getServiceDescriptionTemplates,
  saveServiceDescriptionTemplate,
  getDiagnosisHistory,
  bulkApproveResults,
  toggleFavorite,
  getFavorites,
  isFavorited,
  addCoReader,
  getCoReaders,
  updateCoReaderOpinion,
  removeCoReader,
  copyReportResult,
  mergeCoReaderOpinions,
} from './ris/order-result';

import {
  getRadiologyPrescriptions,
  createRadiologyPrescription,
  updateRadiologyPrescription,
  deleteRadiologyPrescription,
  createPrescriptionFromNorm,
  getServiceNorm,
  updateServiceNorm,
  searchItems,
  checkItemStock,
} from './ris/prescription';

import {
  getRevenueReport,
  getUltrasoundRegister,
  getRadiologyRegisterByType,
  getRadiologyRegister,
  getFunctionalTestRegister,
  getConsumptionNormReport,
  getRevenueByBaseCostReport,
  syncResultToDoH,
  getStatistics,
  exportReportToExcel,
  getExamStatisticsByServiceType,
} from './ris/report';

import {
  printLabel,
  getLabelConfigs,
  generateQRCode,
  scanQRCode,
  createShareResultQR,
  getTags,
  saveTag,
  deleteTag,
  assignTagsToRequest,
  getRequestsByTag,
} from './ris/label-tag-qr';

import {
  searchIntegrationLogs,
  getIntegrationLogStatistics,
  getIntegrationLogDetail,
  retryIntegrationMessage,
  getHL7CDAConfigs,
  saveHL7CDAConfig,
  sendHL7Message,
  getHL7Messages,
  createCDADocument,
  getCDADocument,
  receiveHL7Order,
  getCaseMessages,
  sendCaseMessage,
} from './ris/integration';

import {
  signResult,
  getSignatureHistory,
  verifySignature,
  getSignatureConfigs,
  getUSBTokenStatus,
  getUSBTokenCertificates,
  signWithUSBToken,
  generateAndSignPdf,
  downloadSignedPdf,
  previewPdf,
} from './ris/signature';

import {
  searchConsultations,
  getConsultationSession,
  saveConsultationSession,
  deleteConsultationSession,
  startConsultation,
  endConsultation,
  addConsultationCase,
  removeConsultationCase,
  inviteParticipant,
  removeParticipant,
  joinConsultation,
  leaveConsultation,
  addConsultationDiscussion,
  getConsultationDiscussions,
  addConsultationImageNote,
  getConsultationImageNotes,
  saveConsultationMinutes,
  getConsultationMinutes,
  approveConsultationMinutes,
  addConsultationAttachment,
  getConsultationAttachments,
} from './ris/consultation';

import {
  getHelpCategories,
  saveHelpCategory,
  searchHelpArticles,
  getHelpArticle,
  saveHelpArticle,
  getTroubleshootingList,
  saveTroubleshooting,
} from './ris/help';

import type { SaveRisFilterPresetDto } from './ris/pacs';

export default {
  // Waiting List
  getWaitingList,
  callPatient,
  getDisplayConfig,
  updateDisplayConfig,
  startExam,
  completeExam,

  // PACS & Modality
  getPACSConnections,
  createPACSConnection,
  updatePACSConnection,
  deletePACSConnection,
  checkPACSConnection,
  getModalities,
  createModality,
  updateModality,
  deleteModality,
  sendWorklistToModality,
  configureDeviceConnection,

  // Orders & Results
  getRadiologyOrders,
  getRadiologyOrder,
  getResultTemplatesByServiceType,
  getResultTemplatesByService,
  getResultTemplatesByGender,
  getAllResultTemplates,
  saveResultTemplate,
  deleteResultTemplate,
  changeResultTemplate,
  enterRadiologyResult,
  getRadiologyResult,
  updateRadiologyResult,
  attachImage,
  removeAttachedImage,
  getStudiesFromPACS,
  getSeries,
  getImages,
  linkStudyToOrder,
  preliminaryApproveResult,
  finalApproveResult,
  cancelApproval,
  printRadiologyResult,
  printRadiologyResultsBatch,
  sendResultToDepartment,
  getPatientRadiologyHistory,

  // Prescriptions
  getRadiologyPrescriptions,
  createRadiologyPrescription,
  updateRadiologyPrescription,
  deleteRadiologyPrescription,
  createPrescriptionFromNorm,
  getServiceNorm,
  updateServiceNorm,
  searchItems,
  checkItemStock,

  // Reports
  getRevenueReport,
  getUltrasoundRegister,
  getRadiologyRegisterByType,
  getRadiologyRegister,
  getFunctionalTestRegister,
  getConsumptionNormReport,
  getRevenueByBaseCostReport,
  syncResultToDoH,
  getStatistics,
  exportReportToExcel,

  // DICOM Viewer
  getViewerUrl,
  getViewerConfig,
  saveAnnotation,
  getAnnotations,
  markKeyImage,
  getKeyImages,
  editImage,

  // Rooms & Schedule
  getRooms,
  saveRoom,
  getRoomSchedule,
  saveSchedule,

  // Print Label
  printLabel,
  getLabelConfigs,

  // Diagnosis Templates
  getDiagnosisTemplates,
  saveDiagnosisTemplate,
  deleteDiagnosisTemplate,

  // Abbreviations
  getAbbreviations,
  saveAbbreviation,
  deleteAbbreviation,
  expandAbbreviations,

  // QR Code
  generateQRCode,
  scanQRCode,
  createShareResultQR,

  // Duty Schedule
  getDutySchedules,
  saveDutySchedule,
  deleteDutySchedule,
  batchCreateDutySchedules,

  // Room Assignment
  assignRoom,
  getRoomQueue,
  callNextPatient,
  getRoomStatistics,

  // Tags
  getTags,
  saveTag,
  deleteTag,
  assignTagsToRequest,
  getRequestsByTag,

  // Integration Logs
  searchIntegrationLogs,
  getIntegrationLogStatistics,
  getIntegrationLogDetail,
  retryIntegrationMessage,

  // Digital Signature
  signResult,
  getSignatureHistory,
  verifySignature,
  getSignatureConfigs,

  // USB Token
  getUSBTokenStatus,
  getUSBTokenCertificates,
  signWithUSBToken,

  // PDF Generation & Signing
  generateAndSignPdf,
  downloadSignedPdf,
  previewPdf,

  // Statistics
  getExamStatisticsByServiceType,

  // IV. Capture Device
  getCaptureDevices,
  saveCaptureDevice,
  deleteCaptureDevice,
  testCaptureDeviceConnection,
  getWorkstations,
  saveWorkstation,
  createCaptureSession,
  endCaptureSession,
  saveCapturedMedia,
  getCapturedMedia,
  sendMediaToPacs,

  // V. Consultation
  searchConsultations,
  getConsultationSession,
  saveConsultationSession,
  deleteConsultationSession,
  startConsultation,
  endConsultation,
  addConsultationCase,
  removeConsultationCase,
  inviteParticipant,
  removeParticipant,
  joinConsultation,
  leaveConsultation,
  addConsultationDiscussion,
  getConsultationDiscussions,
  addConsultationImageNote,
  getConsultationImageNotes,
  saveConsultationMinutes,
  getConsultationMinutes,
  approveConsultationMinutes,
  addConsultationAttachment,
  getConsultationAttachments,

  // X. HL7 CDA
  getHL7CDAConfigs,
  saveHL7CDAConfig,
  sendHL7Message,
  getHL7Messages,
  createCDADocument,
  getCDADocument,
  receiveHL7Order,

  // IX. Online Help
  getHelpCategories,
  saveHelpCategory,
  searchHelpArticles,
  getHelpArticle,
  saveHelpArticle,
  getTroubleshootingList,
  saveTroubleshooting,

  // VII. CLS Screen
  getCLSScreenConfig,
  saveCLSScreenConfig,
  getServiceDescriptionTemplates,
  saveServiceDescriptionTemplate,
  getDiagnosisHistory,

  // NangCap15 Features
  getCaseMessages,
  sendCaseMessage,
  getFilterPresets,
  saveFilterPreset: saveFilterPreset as (data: SaveRisFilterPresetDto) => ReturnType<typeof saveFilterPreset>,
  deleteFilterPreset: deleteFilterPreset as (presetId: string) => ReturnType<typeof deleteFilterPreset>,
  exportDicomStudy,
  getDicomExportStatus,
  sendDicomToRemote,
  getRemoteServers,
  saveRemoteServer,
  deleteRemoteServer,
  // F2.8 Favorite
  toggleFavorite,
  getFavorites,
  isFavorited,
  // #139 Co-Reader
  addCoReader,
  getCoReaders,
  updateCoReaderOpinion,
  removeCoReader,
  copyReportResult,
  mergeCoReaderOpinions,
};
