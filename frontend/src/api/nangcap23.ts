import apiClient from './client';

// ============================================================================
// Batch 1.1: National Prescription Gateway (donthuocquocgia.vn)
// ============================================================================

export interface NationalPrescriptionSubmissionDto {
  id: string;
  prescriptionId: string;
  submissionCode: string;
  facilityCode: string;
  doctorIdNumber: string;
  doctorLicenseNumber: string;
  patientIdNumber: string;
  prescriptionType: string;
  status: number;
  statusName: string;
  gatewayTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  retryCount: number;
  patientName?: string;
  prescriptionCode?: string;
  createdAt: string;
}

export interface NationalPrescriptionSubmissionDetailDto extends NationalPrescriptionSubmissionDto {
  payloadJson?: string;
  responseJson?: string;
}

export interface SubmitNationalPrescriptionDto {
  prescriptionId: string;
  prescriptionType?: string;
  doctorIdNumber: string;
  doctorLicenseNumber: string;
}

export interface NationalGatewayConfigDto {
  nationalPrescriptionBaseUrl: string;
  nationalPharmacyBaseUrl: string;
  facilityCode: string;
  facilityName: string;
  mockMode: boolean;
  autoSubmit: boolean;
  retryCount: number;
  timeoutSeconds: number;
}

export const npGateway = {
  search: async (params?: { keyword?: string; status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<NationalPrescriptionSubmissionDto[]>('/national-prescription-gateway', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<NationalPrescriptionSubmissionDetailDto>(`/national-prescription-gateway/${id}`);
    return data;
  },
  submit: async (dto: SubmitNationalPrescriptionDto) => {
    const { data } = await apiClient.post<NationalPrescriptionSubmissionDto>('/national-prescription-gateway/submit', dto);
    return data;
  },
  retry: async (id: string) => {
    const { data } = await apiClient.post<NationalPrescriptionSubmissionDto>(`/national-prescription-gateway/${id}/retry`);
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await apiClient.post<NationalPrescriptionSubmissionDto>(`/national-prescription-gateway/${id}/cancel`);
    return data;
  },
  getConfig: async () => {
    const { data } = await apiClient.get<NationalGatewayConfigDto>('/national-prescription-gateway/config');
    return data;
  },
  saveConfig: async (cfg: NationalGatewayConfigDto) => {
    const { data } = await apiClient.post<{ success: boolean }>('/national-prescription-gateway/config', cfg);
    return data;
  },
  testConnection: async () => {
    const { data } = await apiClient.get<{ connected: boolean }>('/national-prescription-gateway/test-connection');
    return data;
  }
};

// ============================================================================
// Batch 1.2: National Pharmacy Gateway (duocquocgia.com.vn)
// ============================================================================

export interface NationalPharmacyOutboundReportDto {
  id: string;
  reportCode: string;
  reportType: string;
  periodFrom: string;
  periodTo: string;
  itemCount: number;
  status: number;
  statusName: string;
  gatewayTicketNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  retryCount: number;
  createdAt: string;
  notes?: string;
}

export interface NationalPharmacyOutboundReportDetailDto extends NationalPharmacyOutboundReportDto {
  payloadXml?: string;
  responseXml?: string;
}

export interface GeneratePharmacyReportDto {
  reportType: string;
  periodFrom: string;
  periodTo: string;
  pharmacyId?: string;
  notes?: string;
}

export const nphGateway = {
  search: async (params?: { reportType?: string; status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<NationalPharmacyOutboundReportDto[]>('/national-pharmacy', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<NationalPharmacyOutboundReportDetailDto>(`/national-pharmacy/${id}`);
    return data;
  },
  generate: async (dto: GeneratePharmacyReportDto) => {
    const { data } = await apiClient.post<NationalPharmacyOutboundReportDto>('/national-pharmacy/generate', dto);
    return data;
  },
  retry: async (id: string) => {
    const { data } = await apiClient.post<NationalPharmacyOutboundReportDto>(`/national-pharmacy/${id}/retry`);
    return data;
  },
  testConnection: async () => {
    const { data } = await apiClient.get<{ connected: boolean }>('/national-pharmacy/test-connection');
    return data;
  }
};

// ============================================================================
// Batch 2: Đề án 06 — Birth / Death / Driving License
// ============================================================================

export interface BirthCertificateDto {
  id: string;
  certificateNumber: string;
  motherPatientId: string;
  motherFullName?: string;
  motherIdNumber?: string;
  fatherFullName?: string;
  fatherIdNumber?: string;
  birthDateTime: string;
  childGender: string;
  childName?: string;
  birthWeight: number;
  gestationalAgeWeeks: number;
  birthMethod: string;
  birthLocation: string;
  isLiveBirth: boolean;
  singletonOrMultiple: number;
  notes?: string;
  da06Status: number;
  da06StatusName: string;
  da06SubmissionId?: string;
  da06ErrorMessage?: string;
  da06SubmittedAt?: string;
  da06AcknowledgedAt?: string;
  createdAt: string;
}

export interface SaveBirthCertificateDto {
  id?: string;
  motherPatientId: string;
  motherFullName?: string;
  motherIdNumber?: string;
  fatherFullName?: string;
  fatherIdNumber?: string;
  birthDateTime: string;
  childGender: string;
  childName?: string;
  birthWeight: number;
  gestationalAgeWeeks: number;
  birthMethod: string;
  birthLocation: string;
  isLiveBirth: boolean;
  singletonOrMultiple: number;
  attendingDoctorId?: string;
  midwifeId?: string;
  notes?: string;
}

export interface DeathCertificateDto {
  id: string;
  certificateNumber: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  deathDateTime: string;
  deathLocation: string;
  primaryCauseIcd?: string;
  primaryCauseDescription?: string;
  secondaryCauseIcd?: string;
  secondaryCauseDescription?: string;
  mannerOfDeath: string;
  certifyingDoctorName?: string;
  certifyingDoctorLicense?: string;
  certifyingDate: string;
  informantFullName?: string;
  informantIdNumber?: string;
  informantRelationship?: string;
  notes?: string;
  da06Status: number;
  da06StatusName: string;
  da06SubmissionId?: string;
  da06ErrorMessage?: string;
  da06SubmittedAt?: string;
  da06AcknowledgedAt?: string;
  createdAt: string;
}

export interface SaveDeathCertificateDto {
  id?: string;
  patientId: string;
  deathDateTime: string;
  deathLocation: string;
  primaryCauseIcd?: string;
  primaryCauseDescription?: string;
  secondaryCauseIcd?: string;
  secondaryCauseDescription?: string;
  mannerOfDeath: string;
  certifyingDoctorId?: string;
  certifyingDoctorName?: string;
  certifyingDoctorLicense?: string;
  certifyingDate: string;
  informantFullName?: string;
  informantIdNumber?: string;
  informantRelationship?: string;
  notes?: string;
}

export interface DrivingLicenseHealthCheckDto {
  id: string;
  certificateNumber: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  licenseClass: string;
  examDate: string;
  heightCm: number;
  weightKg: number;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  visionRightWithoutGlasses?: string;
  visionLeftWithoutGlasses?: string;
  visionRightWithGlasses?: string;
  visionLeftWithGlasses?: string;
  colorBlindNormal: boolean;
  colorVisionDetail?: string;
  visionFieldResult?: string;
  hearingNormal: boolean;
  hearingDetail?: string;
  neurologicalNormal: boolean;
  neurologicalDetail?: string;
  psychiatricNormal: boolean;
  psychiatricDetail?: string;
  cardioRespiratoryConclusion?: string;
  musculoskeletalConclusion?: string;
  endocrineConclusion?: string;
  drugTestPerformed: boolean;
  drugTestPositive: boolean;
  drugTestDetail?: string;
  alcoholTestPerformed: boolean;
  alcoholLevelMgPercent?: number;
  eligibleToDrive: boolean;
  conclusion?: string;
  certifyingDoctorName?: string;
  certifyingDoctorLicense?: string;
  issuedAt?: string;
  expiresAt?: string;
  da06Status: number;
  da06StatusName: string;
  da06SubmissionId?: string;
  da06ErrorMessage?: string;
  da06SubmittedAt?: string;
  da06AcknowledgedAt?: string;
  createdAt: string;
}

export interface SaveDrivingLicenseHealthCheckDto {
  id?: string;
  patientId: string;
  examinationId?: string;
  licenseClass: string;
  examDate: string;
  heightCm: number;
  weightKg: number;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  visionRightWithoutGlasses?: string;
  visionLeftWithoutGlasses?: string;
  visionRightWithGlasses?: string;
  visionLeftWithGlasses?: string;
  colorBlindNormal: boolean;
  colorVisionDetail?: string;
  visionFieldResult?: string;
  hearingNormal: boolean;
  hearingDetail?: string;
  neurologicalNormal: boolean;
  neurologicalDetail?: string;
  psychiatricNormal: boolean;
  psychiatricDetail?: string;
  cardioRespiratoryConclusion?: string;
  musculoskeletalConclusion?: string;
  endocrineConclusion?: string;
  drugTestPerformed: boolean;
  drugTestPositive: boolean;
  drugTestDetail?: string;
  alcoholTestPerformed: boolean;
  alcoholLevelMgPercent?: number;
  eligibleToDrive: boolean;
  conclusion?: string;
  certifyingDoctorId?: string;
  certifyingDoctorName?: string;
  certifyingDoctorLicense?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export const deAn06 = {
  searchBirths: async (params?: { keyword?: string; da06Status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<BirthCertificateDto[]>('/de-an-06/birth-certificates', { params });
    return data;
  },
  getBirth: async (id: string) => {
    const { data } = await apiClient.get<BirthCertificateDto>(`/de-an-06/birth-certificates/${id}`);
    return data;
  },
  saveBirth: async (dto: SaveBirthCertificateDto) => {
    const { data } = await apiClient.post<BirthCertificateDto>('/de-an-06/birth-certificates', dto);
    return data;
  },
  submitBirth: async (id: string) => {
    const { data } = await apiClient.post<BirthCertificateDto>(`/de-an-06/birth-certificates/${id}/submit`);
    return data;
  },

  searchDeaths: async (params?: { keyword?: string; da06Status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<DeathCertificateDto[]>('/de-an-06/death-certificates', { params });
    return data;
  },
  getDeath: async (id: string) => {
    const { data } = await apiClient.get<DeathCertificateDto>(`/de-an-06/death-certificates/${id}`);
    return data;
  },
  saveDeath: async (dto: SaveDeathCertificateDto) => {
    const { data } = await apiClient.post<DeathCertificateDto>('/de-an-06/death-certificates', dto);
    return data;
  },
  submitDeath: async (id: string) => {
    const { data } = await apiClient.post<DeathCertificateDto>(`/de-an-06/death-certificates/${id}/submit`);
    return data;
  },

  searchDlhc: async (params?: { keyword?: string; da06Status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<DrivingLicenseHealthCheckDto[]>('/de-an-06/driving-license-checks', { params });
    return data;
  },
  getDlhc: async (id: string) => {
    const { data } = await apiClient.get<DrivingLicenseHealthCheckDto>(`/de-an-06/driving-license-checks/${id}`);
    return data;
  },
  saveDlhc: async (dto: SaveDrivingLicenseHealthCheckDto) => {
    const { data } = await apiClient.post<DrivingLicenseHealthCheckDto>('/de-an-06/driving-license-checks', dto);
    return data;
  },
  submitDlhc: async (id: string) => {
    const { data } = await apiClient.post<DrivingLicenseHealthCheckDto>(`/de-an-06/driving-license-checks/${id}/submit`);
    return data;
  }
};

// ============================================================================
// Batch 3.1: Linen Management
// ============================================================================

export interface LinenItemDto {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit?: string;
  standardWeightKg?: number;
  maxReuseCount?: number;
  currentStock: number;
  inCleaning: number;
  inRepair: number;
  damaged: number;
  minStockAlert: number;
  isActive: boolean;
  notes?: string;
  isLowStock?: boolean;
}

export interface LinenTransactionDto {
  id: string;
  transactionCode: string;
  transactionType: string;
  transactionDate: string;
  fromDepartmentId?: string;
  fromDepartmentName?: string;
  toDepartmentId?: string;
  toDepartmentName?: string;
  dispatcherName?: string;
  receiverName?: string;
  totalItems: number;
  totalWeightKg: number;
  vendorName?: string;
  status: number;
  statusName: string;
  notes?: string;
  detailsJson: string;
  createdAt: string;
}

export interface SaveLinenTransactionDto {
  id?: string;
  transactionType: string;
  transactionDate: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  dispatcherName?: string;
  receiverName?: string;
  vendorName?: string;
  notes?: string;
  detailsJson?: string;
}

export interface SterilizationScheduleDto {
  id: string;
  scheduleCode: string;
  scheduledAt: string;
  areaType: string;
  roomId?: string;
  roomName?: string;
  departmentId?: string;
  departmentName?: string;
  areaCode?: string;
  sterilizationMethod: string;
  agent?: string;
  durationMinutes: number;
  assignedStaff?: string;
  startedAt?: string;
  completedAt?: string;
  status: number;
  statusName: string;
  cultureSampleCode?: string;
  cultureResult?: string;
  notes?: string;
  createdAt: string;
}

export interface SaveSterilizationScheduleDto {
  id?: string;
  scheduledAt: string;
  areaType: string;
  roomId?: string;
  departmentId?: string;
  areaCode?: string;
  sterilizationMethod: string;
  agent?: string;
  durationMinutes: number;
  assignedStaff?: string;
  startedAt?: string;
  completedAt?: string;
  cultureSampleCode?: string;
  cultureResult?: string;
  notes?: string;
}

export const linen = {
  listItems: async (params?: { keyword?: string; category?: string; isActive?: boolean }) => {
    const { data } = await apiClient.get<LinenItemDto[]>('/linen/items', { params });
    return data;
  },
  getItem: async (id: string) => {
    const { data } = await apiClient.get<LinenItemDto>(`/linen/items/${id}`);
    return data;
  },
  saveItem: async (dto: LinenItemDto) => {
    const { data } = await apiClient.post<LinenItemDto>('/linen/items', dto);
    return data;
  },
  deleteItem: async (id: string) => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/linen/items/${id}`);
    return data;
  },

  searchTransactions: async (params?: { transactionType?: string; status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<LinenTransactionDto[]>('/linen/transactions', { params });
    return data;
  },
  getTransaction: async (id: string) => {
    const { data } = await apiClient.get<LinenTransactionDto>(`/linen/transactions/${id}`);
    return data;
  },
  saveTransaction: async (dto: SaveLinenTransactionDto) => {
    const { data } = await apiClient.post<LinenTransactionDto>('/linen/transactions', dto);
    return data;
  },
  updateTransactionStatus: async (id: string, newStatus: number) => {
    const { data } = await apiClient.post<LinenTransactionDto>(`/linen/transactions/${id}/status/${newStatus}`);
    return data;
  },

  searchSchedules: async (params?: { areaType?: string; status?: number; from?: string; to?: string }) => {
    const { data } = await apiClient.get<SterilizationScheduleDto[]>('/linen/sterilization-schedules', { params });
    return data;
  },
  getSchedule: async (id: string) => {
    const { data } = await apiClient.get<SterilizationScheduleDto>(`/linen/sterilization-schedules/${id}`);
    return data;
  },
  saveSchedule: async (dto: SaveSterilizationScheduleDto) => {
    const { data } = await apiClient.post<SterilizationScheduleDto>('/linen/sterilization-schedules', dto);
    return data;
  },
  updateScheduleStatus: async (id: string, newStatus: number, cultureResult?: string) => {
    const { data } = await apiClient.post<SterilizationScheduleDto>(`/linen/sterilization-schedules/${id}/status/${newStatus}`, null, {
      params: cultureResult ? { cultureResult } : undefined
    });
    return data;
  }
};

// ============================================================================
// Batch 3.2: Functional Diagnostics
// ============================================================================

export interface FunctionalDiagnosticTestDto {
  id: string;
  testCode: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  testType: string;
  testTypeName: string;
  performingDoctorId?: string;
  performingDoctorName?: string;
  technicianId?: string;
  performedAt?: string;
  deviceName?: string;
  deviceSerialNumber?: string;
  clinicalIndication?: string;
  findings?: string;
  conclusion?: string;
  recommendation?: string;
  measurementsJson: string;
  imagesJson: string;
  status: number;
  statusName: string;
  verifiedById?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SaveFunctionalDiagnosticTestDto {
  id?: string;
  patientId: string;
  medicalRecordId?: string;
  examinationId?: string;
  serviceRequestDetailId?: string;
  testType: string;
  performingDoctorId?: string;
  performingDoctorName?: string;
  technicianId?: string;
  performedAt?: string;
  deviceName?: string;
  deviceSerialNumber?: string;
  clinicalIndication?: string;
  findings?: string;
  conclusion?: string;
  recommendation?: string;
  measurementsJson?: string;
  imagesJson?: string;
  notes?: string;
}

export interface FunctionalDiagnosticTypeDto {
  code: string;
  name: string;
}

export const fdt = {
  search: async (params?: { keyword?: string; testType?: string; status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<FunctionalDiagnosticTestDto[]>('/functional-diagnostics', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<FunctionalDiagnosticTestDto>(`/functional-diagnostics/${id}`);
    return data;
  },
  save: async (dto: SaveFunctionalDiagnosticTestDto) => {
    const { data } = await apiClient.post<FunctionalDiagnosticTestDto>('/functional-diagnostics', dto);
    return data;
  },
  complete: async (id: string) => {
    const { data } = await apiClient.post<FunctionalDiagnosticTestDto>(`/functional-diagnostics/${id}/complete`);
    return data;
  },
  verify: async (id: string) => {
    const { data } = await apiClient.post<FunctionalDiagnosticTestDto>(`/functional-diagnostics/${id}/verify`);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/functional-diagnostics/${id}`);
    return data;
  },
  getTestTypes: async () => {
    const { data } = await apiClient.get<FunctionalDiagnosticTypeDto[]>('/functional-diagnostics/test-types');
    return data;
  }
};

// ============================================================================
// Batch 4.1: Zalo Notification
// ============================================================================

export interface ZaloNotificationLogDto {
  id: string;
  templateId: string;
  templateName: string;
  targetPhone: string;
  patientId?: string;
  patientName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  payloadJson: string;
  messageId?: string;
  status: number;
  statusName: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  costVnd?: number;
  retryCount: number;
  createdAt: string;
}

export interface SendZaloMessageDto {
  templateId: string;
  targetPhone: string;
  patientId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  templateParams: Record<string, string>;
}

export interface ZaloConfigDto {
  accessToken: string;
  oaId: string;
  baseUrl: string;
  mockMode: boolean;
  isEnabled: boolean;
}

export interface ZaloTemplateDto {
  id: string;
  name: string;
  params_: string[];
}

export const zalo = {
  search: async (params?: { keyword?: string; status?: number; from?: string; to?: string; pageIndex?: number; pageSize?: number }) => {
    const { data } = await apiClient.get<ZaloNotificationLogDto[]>('/zalo-notification', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<ZaloNotificationLogDto>(`/zalo-notification/${id}`);
    return data;
  },
  send: async (dto: SendZaloMessageDto) => {
    const { data } = await apiClient.post<ZaloNotificationLogDto>('/zalo-notification/send', dto);
    return data;
  },
  getConfig: async () => {
    const { data } = await apiClient.get<ZaloConfigDto>('/zalo-notification/config');
    return data;
  },
  saveConfig: async (cfg: ZaloConfigDto) => {
    const { data } = await apiClient.post<{ success: boolean }>('/zalo-notification/config', cfg);
    return data;
  },
  testConnection: async () => {
    const { data } = await apiClient.get<{ connected: boolean }>('/zalo-notification/test-connection');
    return data;
  },
  getTemplates: async () => {
    const { data } = await apiClient.get<ZaloTemplateDto[]>('/zalo-notification/templates');
    return data;
  }
};

// ============================================================================
// Batch 4.2: Quality Dashboard
// ============================================================================

export interface ClinicQueueViewDto {
  roomId: string;
  roomName: string;
  doctorId?: string;
  doctorName?: string;
  waiting: number;
  inProgress: number;
  completed: number;
}

export interface InpatientDepartmentViewDto {
  departmentId: string;
  departmentName: string;
  present: number;
  admitted: number;
  discharged: number;
  totalCost: number;
  totalDeposit: number;
  receivable: number;
}

export interface ParaclinicalTypeStatusDto {
  typeName: string;
  pending: number;
  completed: number;
}

export interface ParaclinicalStatusViewDto {
  items: ParaclinicalTypeStatusDto[];
}

export interface LabCategoryStatusDto {
  categoryName: string;
  pending: number;
  completed: number;
}

export interface LabStatusViewDto {
  categories: LabCategoryStatusDto[];
}

export interface CashierRevenueDto {
  cashierId: string;
  cashierName: string;
  outpatientRevenue: number;
  inpatientRevenue: number;
  total: number;
  receiptCount: number;
}

export interface DailyRevenueViewDto {
  outpatientTotal: number;
  inpatientTotal: number;
  grandTotal: number;
  byCashier: CashierRevenueDto[];
}

export interface QualityDashboardDto {
  asOfDate: string;
  clinicQueues: ClinicQueueViewDto[];
  inpatientByDepartment: InpatientDepartmentViewDto[];
  paraclinical: ParaclinicalStatusViewDto;
  lab: LabStatusViewDto;
  revenue: DailyRevenueViewDto;
}

export const qualityDash = {
  getFull: async (asOfDate?: string) => {
    const { data } = await apiClient.get<QualityDashboardDto>('/quality-dashboard', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  },
  getClinicQueues: async (asOfDate?: string) => {
    const { data } = await apiClient.get<ClinicQueueViewDto[]>('/quality-dashboard/clinic-queues', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  },
  getInpatientByDept: async (asOfDate?: string) => {
    const { data } = await apiClient.get<InpatientDepartmentViewDto[]>('/quality-dashboard/inpatient-by-dept', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  },
  getParaclinical: async (asOfDate?: string) => {
    const { data } = await apiClient.get<ParaclinicalStatusViewDto>('/quality-dashboard/paraclinical', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  },
  getLab: async (asOfDate?: string) => {
    const { data } = await apiClient.get<LabStatusViewDto>('/quality-dashboard/lab', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  },
  getRevenue: async (asOfDate?: string) => {
    const { data } = await apiClient.get<DailyRevenueViewDto>('/quality-dashboard/revenue', { params: asOfDate ? { asOfDate } : undefined });
    return data;
  }
};
