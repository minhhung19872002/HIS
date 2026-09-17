/**
 * Inpatient — Service Orders / Diagnosis (3.3 + G-08 + G-15)
 */
import apiClient from '../../../../services/apiClient';

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

// BE service rows are `{ id, serviceCode, serviceName, serviceType, unitPrice }` — the modal read `code`/`name`,
// so the picker listed "[—] undefined" and ordered lines had no name.
type RawServiceRow = { id: string; serviceCode?: string; serviceName?: string; unitPrice?: number; serviceType?: number };
const toServiceRow = (s: RawServiceRow & Partial<ServiceSearchResultDto>) => ({
  ...s, id: s.id, code: s.code ?? s.serviceCode, name: s.name ?? s.serviceName ?? '', unitPrice: s.unitPrice,
});

// Service.ServiceType labels (BE StatusConstants #217/T2: 1 Khám · 2 XN · 3 CĐHA · 4 TDCN · 5 PTTT)
const SERVICE_TYPE_LABEL: Record<number, string> = { 1: 'Khám bệnh', 2: 'Xét nghiệm', 3: 'Chẩn đoán hình ảnh', 4: 'Thăm dò chức năng', 5: 'Phẫu thuật - thủ thuật' };
const TREE_GROUP_PREFIX = 'type:';

// BE ignores `parentId` and always returns `[{ serviceType, children: [service rows] }]` (no id/name on groups), so
// the lazy tree rendered nodes with undefined keys/titles. Adapt it to the lazy node contract the modal uses:
// root → one group node per serviceType; `type:N` → that group's services as leaves.
export const getServiceTree = async (parentId?: string) => {
  const res = await apiClient.get<Array<{ serviceType: number; children?: RawServiceRow[] }>>(`${BASE_URL}/service-tree`);
  const groups = Array.isArray(res.data) ? res.data : [];
  let nodes: ServiceTreeNodeDto[];
  if (parentId?.startsWith(TREE_GROUP_PREFIX)) {
    const type = Number(parentId.slice(TREE_GROUP_PREFIX.length));
    nodes = (groups.find((g) => g.serviceType === type)?.children ?? [])
      .map((s) => ({
        ...toServiceRow(s), parentId, hasChildren: false,
        serviceType: s.serviceType != null ? String(s.serviceType) : undefined,
      }));
  } else {
    nodes = groups.map((g) => ({
      id: `${TREE_GROUP_PREFIX}${g.serviceType}`,
      name: SERVICE_TYPE_LABEL[g.serviceType] ?? `Loại ${g.serviceType}`,
      hasChildren: true,
    }));
  }
  return { ...res, data: nodes };
};

export const searchServices = async (keyword: string, serviceType?: string) => {
  const res = await apiClient.get<RawServiceRow[]>(`${BASE_URL}/search-services`, { params: { keyword, serviceType } });
  return { ...res, data: (Array.isArray(res.data) ? res.data : []).map(toServiceRow) as ServiceSearchResultDto[] };
};

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

/** Creator or admin only (shared templates: admin only). Empty `items` keeps the services (rename). */
export const updateServiceGroupTemplate = (id: string, dto: ServiceGroupTemplateDto) =>
  apiClient.put<ServiceGroupTemplateDto>(`${BASE_URL}/service-group-templates/${id}`, dto);

export const deleteServiceGroupTemplate = (id: string) =>
  apiClient.delete(`${BASE_URL}/service-group-templates/${id}`);

export const orderByTemplate = (
  admissionId: string,
  templateId: string,
  options?: { mainDiagnosisCode?: string; mainDiagnosis?: string; confirmDuplicates?: boolean },
) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-template`, { admissionId, templateId, ...options });

export const orderByPackage = (admissionId: string, packageId: string) =>
  apiClient.post<InpatientServiceOrderDto>(`${BASE_URL}/order-by-package`, { admissionId, packageId });

export const markServiceAsUrgent = (itemId: string, isUrgent: boolean) =>
  apiClient.post(`${BASE_URL}/service-item/${itemId}/urgent`, isUrgent);

// BE property `TT35Warnings` serializes as `tT35Warnings` (camelCase lowers only the first letter), so
// `tt35Warnings` was always undefined: the TT35 gate fired but the panel listed no reason.
export const checkServiceOrderWarnings = (admissionId: string, items: CreateInpatientServiceItemDto[]) =>
  apiClient.post<ServiceOrderWarningDto>(`${BASE_URL}/service-order-warnings`, { admissionId, items })
    .then((res) => {
      const d = res.data as (ServiceOrderWarningDto & { tT35Warnings?: string[] }) | undefined;
      if (d && !d.tt35Warnings && d.tT35Warnings) d.tt35Warnings = d.tT35Warnings;
      return res;
    });

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
