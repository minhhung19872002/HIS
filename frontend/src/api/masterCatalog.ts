import apiClient from './client';

const BASE = '/master-catalog';

// ───── DTO interfaces ─────
export interface ManufacturerDto {
  id: string;
  code: string;
  name: string;
  country?: string;
  address?: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MedicationRouteDto {
  id: string;
  code: string;
  name: string;
  bhxhCode?: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdditionalChargeDto {
  id: string;
  code: string;
  name: string;
  price: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  unit?: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OtherIncomeDto extends AdditionalChargeDto {}

export interface TransportServiceDto {
  id: string;
  code: string;
  name: string;
  calculationType: number; // 1=km, 2=lượt
  unitPrice: number;
  gasolineFactor?: number;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GasolinePriceDto {
  id: string;
  fuelType: string;
  pricePerLitre: number;
  effectiveFrom: string;
  issuedBy?: string;
  note?: string;
}

export interface MachineCodeDto {
  id: string;
  code: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  departmentId?: string;
  roomId?: string;
  bhxhCode?: string;
  note?: string;
  isLocked: boolean;
  isActive: boolean;
}

export interface MachineServiceDto {
  id: string;
  machineCodeId: string;
  serviceId: string;
  machineName?: string;
  serviceName?: string;
  isDefault: boolean;
  note?: string;
}

export interface InspectionCommitteeMemberDto {
  id: string;
  committeeId: string;
  userId?: string;
  fullName: string;
  title?: string;
  role?: string;
  sortOrder: number;
}

export interface InspectionCommitteeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  members: InspectionCommitteeMemberDto[];
}

export interface NursingCareLevelDto {
  id: string;
  code: string;
  name: string;
  level: number;
  description?: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MedicalRecordTypeDto {
  id: string;
  code: string;
  name: string;
  category: number;
  note?: string;
  sortOrder: number;
  isActive: boolean;
  isLocked: boolean;
}

export interface ParaclinicalRoomPriorityDto {
  id: string;
  serviceId: string;
  serviceName?: string;
  roomId?: string;
  roomName?: string;
  departmentId?: string;
  departmentName?: string;
  priorityLevel: number;
  sequence: number;
  note?: string;
}

export interface ReportServiceGroupTypeDto {
  id: string;
  code: string;
  name: string;
  reportLabel?: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ReportServiceGroupDto {
  id: string;
  groupTypeId: string;
  groupTypeName?: string;
  code: string;
  name: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}

// ───── helper to drop the wrapped {data, success} envelope ─────
const unwrap = <T,>(r: { data: T } | T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = r as any;
  return (body?.data !== undefined && body?.success !== undefined) ? body.data : (r as T);
};

// ───── #1 Manufacturer ─────
export const getManufacturers = (keyword?: string) =>
  apiClient.get<ManufacturerDto[]>(`${BASE}/manufacturers`, { params: { keyword } }).then(r => unwrap<ManufacturerDto[]>(r.data));
export const saveManufacturer = (dto: Partial<ManufacturerDto>) =>
  apiClient.post<ManufacturerDto>(`${BASE}/manufacturers`, dto).then(r => unwrap<ManufacturerDto>(r.data));
export const deleteManufacturer = (id: string) =>
  apiClient.delete(`${BASE}/manufacturers/${id}`);

// ───── #2 MedicationRoute ─────
export const getMedicationRoutes = (keyword?: string) =>
  apiClient.get<MedicationRouteDto[]>(`${BASE}/medication-routes`, { params: { keyword } }).then(r => unwrap<MedicationRouteDto[]>(r.data));
export const saveMedicationRoute = (dto: Partial<MedicationRouteDto>) =>
  apiClient.post<MedicationRouteDto>(`${BASE}/medication-routes`, dto).then(r => unwrap<MedicationRouteDto>(r.data));
export const deleteMedicationRoute = (id: string) =>
  apiClient.delete(`${BASE}/medication-routes/${id}`);

// ───── #3 AdditionalCharge ─────
export const getAdditionalCharges = (keyword?: string) =>
  apiClient.get<AdditionalChargeDto[]>(`${BASE}/additional-charges`, { params: { keyword } }).then(r => unwrap<AdditionalChargeDto[]>(r.data));
export const saveAdditionalCharge = (dto: Partial<AdditionalChargeDto>) =>
  apiClient.post<AdditionalChargeDto>(`${BASE}/additional-charges`, dto).then(r => unwrap<AdditionalChargeDto>(r.data));
export const deleteAdditionalCharge = (id: string) =>
  apiClient.delete(`${BASE}/additional-charges/${id}`);

// ───── #4 OtherIncome ─────
export const getOtherIncomes = (keyword?: string) =>
  apiClient.get<OtherIncomeDto[]>(`${BASE}/other-incomes`, { params: { keyword } }).then(r => unwrap<OtherIncomeDto[]>(r.data));
export const saveOtherIncome = (dto: Partial<OtherIncomeDto>) =>
  apiClient.post<OtherIncomeDto>(`${BASE}/other-incomes`, dto).then(r => unwrap<OtherIncomeDto>(r.data));
export const deleteOtherIncome = (id: string) =>
  apiClient.delete(`${BASE}/other-incomes/${id}`);

// ───── #5 TransportService ─────
export const getTransportServices = (keyword?: string) =>
  apiClient.get<TransportServiceDto[]>(`${BASE}/transport-services`, { params: { keyword } }).then(r => unwrap<TransportServiceDto[]>(r.data));
export const saveTransportService = (dto: Partial<TransportServiceDto>) =>
  apiClient.post<TransportServiceDto>(`${BASE}/transport-services`, dto).then(r => unwrap<TransportServiceDto>(r.data));
export const deleteTransportService = (id: string) =>
  apiClient.delete(`${BASE}/transport-services/${id}`);

// ───── #6 GasolinePrice ─────
export const getGasolinePrices = (fuelType?: string) =>
  apiClient.get<GasolinePriceDto[]>(`${BASE}/gasoline-prices`, { params: { fuelType } }).then(r => unwrap<GasolinePriceDto[]>(r.data));
export const saveGasolinePrice = (dto: Partial<GasolinePriceDto>) =>
  apiClient.post<GasolinePriceDto>(`${BASE}/gasoline-prices`, dto).then(r => unwrap<GasolinePriceDto>(r.data));
export const deleteGasolinePrice = (id: string) =>
  apiClient.delete(`${BASE}/gasoline-prices/${id}`);

// ───── #7 MachineCode ─────
export const getMachineCodes = (keyword?: string) =>
  apiClient.get<MachineCodeDto[]>(`${BASE}/machine-codes`, { params: { keyword } }).then(r => unwrap<MachineCodeDto[]>(r.data));
export const saveMachineCode = (dto: Partial<MachineCodeDto>) =>
  apiClient.post<MachineCodeDto>(`${BASE}/machine-codes`, dto).then(r => unwrap<MachineCodeDto>(r.data));
export const deleteMachineCode = (id: string) =>
  apiClient.delete(`${BASE}/machine-codes/${id}`);

// ───── #8 MachineService ─────
export const getMachineServices = (machineCodeId?: string) =>
  apiClient.get<MachineServiceDto[]>(`${BASE}/machine-services`, { params: { machineCodeId } }).then(r => unwrap<MachineServiceDto[]>(r.data));
export const saveMachineService = (dto: Partial<MachineServiceDto>) =>
  apiClient.post<MachineServiceDto>(`${BASE}/machine-services`, dto).then(r => unwrap<MachineServiceDto>(r.data));
export const deleteMachineService = (id: string) =>
  apiClient.delete(`${BASE}/machine-services/${id}`);

// ───── #9 InspectionCommittee ─────
export const getInspectionCommittees = (keyword?: string) =>
  apiClient.get<InspectionCommitteeDto[]>(`${BASE}/inspection-committees`, { params: { keyword } }).then(r => unwrap<InspectionCommitteeDto[]>(r.data));
export const saveInspectionCommittee = (dto: Partial<InspectionCommitteeDto>) =>
  apiClient.post<InspectionCommitteeDto>(`${BASE}/inspection-committees`, dto).then(r => unwrap<InspectionCommitteeDto>(r.data));
export const deleteInspectionCommittee = (id: string) =>
  apiClient.delete(`${BASE}/inspection-committees/${id}`);

// ───── #10 NursingCareLevel ─────
export const getNursingCareLevels = () =>
  apiClient.get<NursingCareLevelDto[]>(`${BASE}/nursing-care-levels`).then(r => unwrap<NursingCareLevelDto[]>(r.data));
export const saveNursingCareLevel = (dto: Partial<NursingCareLevelDto>) =>
  apiClient.post<NursingCareLevelDto>(`${BASE}/nursing-care-levels`, dto).then(r => unwrap<NursingCareLevelDto>(r.data));
export const deleteNursingCareLevel = (id: string) =>
  apiClient.delete(`${BASE}/nursing-care-levels/${id}`);

// ───── #11 MedicalRecordType ─────
export const getMedicalRecordTypes = () =>
  apiClient.get<MedicalRecordTypeDto[]>(`${BASE}/medical-record-types`).then(r => unwrap<MedicalRecordTypeDto[]>(r.data));
export const saveMedicalRecordType = (dto: Partial<MedicalRecordTypeDto>) =>
  apiClient.post<MedicalRecordTypeDto>(`${BASE}/medical-record-types`, dto).then(r => unwrap<MedicalRecordTypeDto>(r.data));
export const deleteMedicalRecordType = (id: string) =>
  apiClient.delete(`${BASE}/medical-record-types/${id}`);

// ───── #12 ParaclinicalRoomPriority ─────
export const getParaclinicalRoomPriorities = (serviceId?: string) =>
  apiClient.get<ParaclinicalRoomPriorityDto[]>(`${BASE}/paraclinical-room-priorities`, { params: { serviceId } }).then(r => unwrap<ParaclinicalRoomPriorityDto[]>(r.data));
export const saveParaclinicalRoomPriority = (dto: Partial<ParaclinicalRoomPriorityDto>) =>
  apiClient.post<ParaclinicalRoomPriorityDto>(`${BASE}/paraclinical-room-priorities`, dto).then(r => unwrap<ParaclinicalRoomPriorityDto>(r.data));
export const deleteParaclinicalRoomPriority = (id: string) =>
  apiClient.delete(`${BASE}/paraclinical-room-priorities/${id}`);

// ───── #13 ReportServiceGroupType + Group ─────
export const getReportServiceGroupTypes = () =>
  apiClient.get<ReportServiceGroupTypeDto[]>(`${BASE}/report-group-types`).then(r => unwrap<ReportServiceGroupTypeDto[]>(r.data));
export const saveReportServiceGroupType = (dto: Partial<ReportServiceGroupTypeDto>) =>
  apiClient.post<ReportServiceGroupTypeDto>(`${BASE}/report-group-types`, dto).then(r => unwrap<ReportServiceGroupTypeDto>(r.data));
export const deleteReportServiceGroupType = (id: string) =>
  apiClient.delete(`${BASE}/report-group-types/${id}`);

export const getReportServiceGroups = (typeId?: string) =>
  apiClient.get<ReportServiceGroupDto[]>(`${BASE}/report-groups`, { params: { typeId } }).then(r => unwrap<ReportServiceGroupDto[]>(r.data));
export const saveReportServiceGroup = (dto: Partial<ReportServiceGroupDto>) =>
  apiClient.post<ReportServiceGroupDto>(`${BASE}/report-groups`, dto).then(r => unwrap<ReportServiceGroupDto>(r.data));
export const deleteReportServiceGroup = (id: string) =>
  apiClient.delete(`${BASE}/report-groups/${id}`);
