/**
 * Inpatient — Ward / Bed management (3.1)
 */
import apiClient from '../../../../services/apiClient';

const BASE_URL = '/inpatient';

// #region 3.1 Màn hình chờ buồng bệnh

export interface WardLayoutDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  rooms: RoomLayoutDto[];
}

export interface RoomLayoutDto {
  roomId: string;
  roomCode: string;
  roomName: string;
  roomType: number;
  roomTypeName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  displayColor: string;
  beds: BedLayoutDto[];
}

export interface BedLayoutDto {
  bedId: string;
  bedCode: string;
  bedName: string;
  bedType: number;
  status: number;
  statusName: string;
  displayColor: string;
  position: number;
  currentAdmissionId?: string;
  patientName?: string;
  patientCode?: string;
  gender?: number;
  age?: number;
  isInsurance: boolean;
  admissionDate?: string;
  daysOfStay?: number;
  mainDiagnosis?: string;
  sharedPatients?: SharedBedPatientDto[];
}

export interface SharedBedPatientDto {
  admissionId: string;
  patientName: string;
  patientCode: string;
  age?: number;
  isInsurance: boolean;
}

export interface WardColorConfigDto {
  insurancePatientColor: string;
  feePatientColor: string;
  chronicPatientColor: string;
  emergencyPatientColor: string;
  vipPatientColor: string;
  pediatricPatientColor: string;
}

export interface BedAssignmentDto {
  id: string;
  admissionId: string;
  patientName: string;
  patientCode: string;
  bedId: string;
  bedCode: string;
  bedName: string;
  roomName: string;
  departmentName: string;
  assignedAt: string;
  releasedAt?: string;
  status: number;
  statusName: string;
}

export interface CreateBedAssignmentDto {
  admissionId: string;
  bedId: string;
}

export interface TransferBedDto {
  admissionId: string;
  newBedId: string;
  reason?: string;
}

export interface BedStatusDto {
  bedId: string;
  bedCode: string;
  bedName: string;
  roomName: string;
  departmentName: string;
  bedStatus: number;
  bedStatusName: string;
  currentAdmissionId?: string;
  patientName?: string;
  patientCode?: string;
  admissionDate?: string;
  daysOfStay?: number;
}

// #endregion

// Backend BedLayoutDto.Status is 0 = empty, 1 = occupied, 2 = shared (nằm ghép), 3 = maintenance,
// while every v2 screen reads 1 = empty, 2 = occupied, 3 = maintenance. Without this mapping
// occupied beds rendered as "Trống" and empty beds as occupied on the ward map + dashboard.
const BED_STATUS_NAMES: Record<number, string> = { 1: 'Trống', 2: 'Có bệnh nhân', 3: 'Bảo trì' };
const normalizeBed = (b: BedLayoutDto): BedLayoutDto => {
  const status = b.patientName || b.currentAdmissionId || b.status === 1 || b.status === 2 ? 2 : b.status === 3 ? 3 : 1;
  return { ...b, status, statusName: BED_STATUS_NAMES[status] };
};
const normalizeRoom = (r: RoomLayoutDto): RoomLayoutDto => ({ ...r, beds: (r.beds || []).map(normalizeBed) });

export const getWardLayout = (departmentId: string) =>
  apiClient.get<WardLayoutDto>(`${BASE_URL}/ward-layout/${departmentId}`)
    .then((r) => (r.data ? { ...r, data: { ...r.data, rooms: (r.data.rooms || []).map(normalizeRoom) } } : r));

export const getRoomLayouts = (departmentId: string) =>
  apiClient.get<RoomLayoutDto[]>(`${BASE_URL}/room-layouts/${departmentId}`)
    .then((r) => (Array.isArray(r.data) ? { ...r, data: r.data.map(normalizeRoom) } : r));

export const getBedLayouts = (roomId: string) =>
  apiClient.get<BedLayoutDto[]>(`${BASE_URL}/bed-layouts/${roomId}`)
    .then((r) => (Array.isArray(r.data) ? { ...r, data: r.data.map(normalizeBed) } : r));

export const getSharedBedPatients = (bedId: string) =>
  apiClient.get<SharedBedPatientDto[]>(`${BASE_URL}/shared-bed/${bedId}`);

export const getWardColorConfig = (departmentId?: string) =>
  apiClient.get<WardColorConfigDto>(`${BASE_URL}/ward-color-config`, { params: { departmentId } });

export const updateWardColorConfig = (config: WardColorConfigDto, departmentId?: string) =>
  apiClient.put(`${BASE_URL}/ward-color-config`, config, { params: { departmentId } });

export const assignBed = (dto: CreateBedAssignmentDto) =>
  apiClient.post<BedAssignmentDto>(`${BASE_URL}/assign-bed`, dto);

export const transferBed = (dto: TransferBedDto) =>
  apiClient.post<BedAssignmentDto>(`${BASE_URL}/transfer-bed`, dto);

export const registerSharedBed = (admissionId: string, bedId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/shared-bed`, { admissionId, bedId });

export const releaseBed = (admissionId: string) =>
  apiClient.post(`${BASE_URL}/release-bed/${admissionId}`);

export const getBedStatus = (departmentId?: string, roomId?: string) =>
  apiClient.get<BedStatusDto[]>(`${BASE_URL}/bed-status`, { params: { departmentId, roomId } });
