/**
 * Inpatient — Service Orders / Diagnosis (3.3 + G-08 + G-15)
 */
import apiClient from '../client';

const BASE_URL = '/inpatient';

// #region 3.3 Chỉ định dịch vụ nội trú

export interface InpatientServiceOrderDto {
  id: string;
  admissionId: string;
  orderDate: string;
  orderingDoctorId: string;
  orderingDoctorName: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  services: InpatientServiceItemDto[];
  status: number;
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
}

export interface InpatientServiceItemDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroupName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentSource: number;
  insuranceRatio: number;
  executingRoomId?: string;
  executingRoomName?: string;
  scheduledDate?: string;
  isUrgent: boolean;
  isEmergency: boolean;
  status: number;
  statusName: string;
  note?: string;
}

export interface CreateInpatientServiceOrderDto {
  admissionId: string;
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnosisCodes?: string;
  secondaryDiagnoses?: string;
  services: CreateInpatientServiceItemDto[];
}

export interface CreateInpatientServiceItemDto {
  serviceId: string;
  quantity: number;
  paymentSource: number;
  executingRoomId?: string;
  scheduledDate?: string;
  isUrgent: boolean;
  isEmergency: boolean;
  note?: string;
}

export interface ServiceGroupTemplateDto {
  id: string;
  groupCode: string;
  groupName: string;
  description?: string;
  departmentId?: string;
  createdBy?: string;
  isShared: boolean;
  items: ServiceTemplateItemDto[];
}

export interface ServiceTemplateItemDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  defaultQuantity: number;
}

export interface ServiceOrderWarningDto {
  hasDuplicateToday: boolean;
  duplicateServices: string[];
  exceedsDeposit: boolean;
  depositRemaining: number;
  orderAmount: number;
  hasTT35Warnings: boolean;
  tt35Warnings: string[];
  exceedsPackageLimit: boolean;
  packageLimitMessage?: string;
  isOutsideProtocol: boolean;
  protocolWarning?: string;
  generalWarnings: string[];
}

// Service tree / search items dùng shape backend chưa khai DTO chính thức (ServiceCatalog).
// Khai loose interface để FE narrow khi cần; tránh `any` lan toàn module.
export interface ServiceTreeNodeDto {
  id: string;
  code?: string;
  name: string;
  parentId?: string;
  hasChildren?: boolean;
  serviceType?: string;
  [k: string]: unknown;
}

export interface ServiceSearchResultDto {
  id: string;
  code?: string;
  name: string;
  unitPrice?: number;
  groupName?: string;
  [k: string]: unknown;
}

export interface SecondaryDiagnosisItemDto {
  code: string;
  name: string;
}

export interface SaveInpatientDiagnosisDto {
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnoses: SecondaryDiagnosisItemDto[];
}

export interface InpatientDiagnosisDto {
  mainDiagnosisCode?: string;
  mainDiagnosis?: string;
  secondaryDiagnoses: SecondaryDiagnosisItemDto[];
}

// #region G-08 + G-15: Chỉ định CLS nội trú (ServiceRequest)

export interface InpatientServiceRequestItemDto {
  id: string;
  requestCode: string;
  requestDate: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  requestType: number; // 1-XN, 2-CDHA, 3-TDCN, 4-PTTT, 5-Khac
  requestTypeName?: string;
  status: number; // 0-Cho TT, 1-Da TT, 2-Dang TH, 3-Co KQ, 4-Da huy
  statusName?: string;
  patientType: number; // 1-BHYT, 2-Vien phi, 3-Dich vu
  patientTypeName?: string;
  isEmergency: boolean;
}

export interface CancelServiceRequestsDto {
  serviceRequestIds: string[];
  reason: string;
}

export interface CancelServiceRequestsResultDto {
  cancelledCount: number;
  failedIds: string[];
}

export interface UpdateServiceRequestPaymentTypeDto {
  patientType: number; // 1-BHYT, 2-Vien phi, 3-Dich vu
  reason?: string;
}

// #endregion

export const getDiagnosisFromRecord = (admissionId: string) =>
  apiClient.get<InpatientDiagnosisDto>(`${BASE_URL}/diagnosis/${admissionId}`);

export const saveInpatientDiagnosis = (admissionId: string, dto: SaveInpatientDiagnosisDto) =>
  apiClient.post<InpatientDiagnosisDto>(`${BASE_URL}/diagnosis/${admissionId}`, dto);

export const getServiceTree = (parentId?: string) =>
  apiClient.get<ServiceTreeNodeDto[]>(`${BASE_URL}/service-tree`, { params: { parentId } });

export const searchServices = (keyword: string, serviceType?: string) =>
  apiClient.get<ServiceSearchResultDto[]>(`${BASE_URL}/search-services`, { params: { keyword, serviceType } });

export const createServiceOrder = (dto: CreateInpatientServiceOrderDto) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/service-orders`, dto);

export const updateServiceOrder = (id: string, dto: CreateInpatientServiceOrderDto) =>
  apiClient.put<InpatientServiceOrderDto>(`${BASE_URL}/service-orders/${id}`, dto);

export const deleteServiceOrder = (id: string) =>
  apiClient.delete(`${BASE_URL}/service-orders/${id}`);

export const getServiceOrders = (admissionId: string, fromDate?: string, toDate?: string) =>
  apiClient.get<InpatientServiceOrderDto[]>(`${BASE_URL}/service-orders/${admissionId}`, { params: { fromDate, toDate } });

export const getServiceOrderById = (id: string) =>
  apiClient.get<InpatientServiceOrderDto>(`${BASE_URL}/service-order/${id}`);

export const createServiceGroupTemplate = (dto: ServiceGroupTemplateDto) =>
  apiClient.post<ServiceGroupTemplateDto>(`${BASE_URL}/service-group-templates`, dto);

export const getServiceGroupTemplates = (departmentId?: string) =>
  apiClient.get<ServiceGroupTemplateDto[]>(`${BASE_URL}/service-group-templates`, { params: { departmentId } });

export const orderByTemplate = (admissionId: string, templateId: string) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-template`, { admissionId, templateId });

export const orderByPackage = (admissionId: string, packageId: string) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-package`, { admissionId, packageId });

export const markServiceAsUrgent = (itemId: string, isUrgent: boolean) =>
  apiClient.post(`${BASE_URL}/service-item/${itemId}/urgent`, isUrgent);

export const checkServiceOrderWarnings = (admissionId: string, items: CreateInpatientServiceItemDto[]) =>
  apiClient.post<ServiceOrderWarningDto>(`${BASE_URL}/service-order-warnings`, { admissionId, items });

export const printServiceOrder = (orderId: string) =>
  apiClient.get(`${BASE_URL}/print-service-order/${orderId}`, { responseType: 'blob' });

// G-08: Lay danh sach chi dinh CLS chua huy cua dot dieu tri
export const getAdmissionServiceRequests = (admissionId: string) =>
  apiClient.get<InpatientServiceRequestItemDto[]>(`${BASE_URL}/${admissionId}/service-requests`);

// G-08: Huy nhieu chi dinh CLS
export const cancelServiceRequests = (admissionId: string, dto: CancelServiceRequestsDto) =>
  apiClient.post<CancelServiceRequestsResultDto>(`${BASE_URL}/${admissionId}/cancel-service-requests`, dto);

// G-15: Doi doi tuong thanh toan ServiceRequest
export const updateServiceRequestPaymentType = (requestId: string, dto: UpdateServiceRequestPaymentTypeDto) =>
  apiClient.put<InpatientServiceRequestItemDto>(`${BASE_URL}/service-request/${requestId}/payment-type`, dto);
