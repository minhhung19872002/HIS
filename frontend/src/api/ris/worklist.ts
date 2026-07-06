/**
 * RIS API — Worklist, rooms, schedules, room queue/assignment/statistics, duty schedules.
 */

import apiClient from '../../services/apiClient';
import type { ModalityDto } from './_shared';

// #region Interfaces

export interface RadiologyWaitingListDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  visitId: string;
  visitCode: string;
  orderId: string;
  orderCode: string;
  orderTime: string;
  orderDoctorName: string;
  departmentName: string;
  serviceName: string;
  serviceTypeName: string;
  roomName: string;
  queueNumber: number;
  status: string;
  patientType: string;
  priority: string;
  calledTime?: string;
  startTime?: string;
  /** Số phút từ lúc chỉ định đến hiện tại */
  tatMinutes: number;
  /** True nếu vượt ngưỡng TAT cấu hình */
  isOverdue: boolean;
  /** F2.6 #136: Tên đoàn khám (KSK theo đoàn). Null nếu không phải KSK theo đoàn. */
  examGroupName?: string;
}

export interface CallPatientDto {
  orderId: string;
  roomId: string;
  message?: string;
  useSpeaker: boolean;
}

export interface CallPatientResultDto {
  success: boolean;
  message: string;
  calledTime: string;
}

export interface WaitingDisplayConfigDto {
  id: string;
  roomId: string;
  roomName: string;
  displayMode: string;
  refreshIntervalSeconds: number;
  showPatientName: boolean;
  showAge: boolean;
  showServiceName: boolean;
  enableSound: boolean;
  soundFile?: string;
  announcementTemplate?: string;
  isActive: boolean;
}

// Room interfaces
export interface RadiologyRoomDto {
  id: string;
  code: string;
  name: string;
  roomType: string;
  departmentId: string;
  departmentName: string;
  capacity: number;
  status: string;
  modalities: ModalityDto[];
  isActive: boolean;
}

export interface SaveRadiologyRoomDto {
  id?: string;
  code: string;
  name: string;
  roomType: string;
  departmentId: string;
  capacity: number;
  isActive: boolean;
}

export interface RadiologyScheduleDto {
  id: string;
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId?: string;
  technicianName?: string;
  doctorId?: string;
  doctorName?: string;
  maxSlots: number;
  bookedSlots: number;
  note?: string;
}

export interface SaveRadiologyScheduleDto {
  id?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId?: string;
  doctorId?: string;
  maxSlots: number;
  note?: string;
}

// Duty Schedule interfaces
export interface DutyScheduleDto {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  userId: string;
  userName: string;
  role: string;
  note?: string;
  status: string;
}

export interface SaveDutyScheduleDto {
  id?: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  userId: string;
  role: string;
  note?: string;
}

export interface BatchCreateDutyScheduleDto {
  fromDate: string;
  toDate: string;
  schedules: DutyScheduleTemplateDto[];
}

export interface DutyScheduleTemplateDto {
  dayOfWeek: number;
  shiftType: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  userId: string;
  role: string;
}

// Room Assignment interfaces
export interface AssignRoomRequestDto {
  orderItemId: string;
  roomId: string;
  priority?: number;
  note?: string;
}

export interface RoomAssignmentDto {
  id: string;
  orderItemId: string;
  orderCode: string;
  patientName: string;
  serviceName: string;
  roomId: string;
  roomName: string;
  queueNumber: number;
  priority: number;
  assignedTime: string;
  calledTime?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  note?: string;
}

export interface RoomQueueDto {
  roomId: string;
  roomName: string;
  currentNumber?: number;
  nextNumber?: number;
  waitingCount: number;
  inProgressCount: number;
  queue: RoomAssignmentDto[];
}

export interface RoomStatisticsDto {
  roomId: string;
  roomName: string;
  date: string;
  totalPatients: number;
  completedPatients: number;
  averageWaitTimeMinutes: number;
  averageExamTimeMinutes: number;
  utilizationPercent: number;
}

// #endregion

// #region 8.1 Waiting List APIs

export const getWaitingList = (
  date: string,
  roomId?: string,
  serviceType?: string,
  status?: string,
  keyword?: string,
  overdueOnly?: boolean,
  examGroupName?: string
) =>
  apiClient.get<RadiologyWaitingListDto[]>('/RISComplete/waiting-list', {
    params: { date, roomId, serviceType, status, keyword, overdueOnly, examGroupName }
  });

export const callPatient = (data: CallPatientDto) =>
  apiClient.post<CallPatientResultDto>('/RISComplete/call-patient', data);

export const getDisplayConfig = (roomId: string) =>
  apiClient.get<WaitingDisplayConfigDto>(`/RISComplete/rooms/${roomId}/display-config`);

export const updateDisplayConfig = (roomId: string, config: WaitingDisplayConfigDto) =>
  apiClient.put(`/RISComplete/rooms/${roomId}/display-config`, config);

export const startExam = (orderId: string) =>
  apiClient.post(`/RISComplete/orders/${orderId}/start`);

export const completeExam = (orderId: string) =>
  apiClient.post(`/RISComplete/orders/${orderId}/complete`);

// #endregion

// #region Room & Schedule APIs

export const getRooms = (keyword?: string, roomType?: string) =>
  apiClient.get<RadiologyRoomDto[]>('/RISComplete/rooms', {
    params: { keyword, roomType }
  });

export const saveRoom = (data: SaveRadiologyRoomDto) =>
  apiClient.post<RadiologyRoomDto>('/RISComplete/rooms', data);

export const getRoomSchedule = (roomId: string, fromDate: string, toDate: string) =>
  apiClient.get<RadiologyScheduleDto[]>(`/RISComplete/rooms/${roomId}/schedule`, {
    params: { fromDate, toDate }
  });

export const saveSchedule = (data: SaveRadiologyScheduleDto) =>
  apiClient.post<RadiologyScheduleDto>('/RISComplete/rooms/schedule', data);

// #endregion

// #region Duty Schedule APIs

export const getDutySchedules = (
  fromDate: string,
  toDate: string,
  roomId?: string,
  userId?: string
) =>
  apiClient.get<DutyScheduleDto[]>('/RISComplete/duty-schedules', {
    params: { fromDate, toDate, roomId, userId }
  });

export const saveDutySchedule = (data: SaveDutyScheduleDto) =>
  apiClient.post<DutyScheduleDto>('/RISComplete/duty-schedules', data);

export const deleteDutySchedule = (scheduleId: string) =>
  apiClient.delete(`/RISComplete/duty-schedules/${scheduleId}`);

export const batchCreateDutySchedules = (data: BatchCreateDutyScheduleDto) =>
  apiClient.post<DutyScheduleDto[]>('/RISComplete/duty-schedules/batch', data);

// #endregion

// #region Room Assignment APIs

export const assignRoom = (data: AssignRoomRequestDto) =>
  apiClient.post<RoomAssignmentDto>('/RISComplete/room-assignments', data);

export const getRoomQueue = (roomId: string) =>
  apiClient.get<RoomQueueDto>(`/RISComplete/rooms/${roomId}/queue`);

export const callNextPatient = (roomId: string) =>
  apiClient.post<RoomAssignmentDto>(`/RISComplete/rooms/${roomId}/call-next`);

export const getRoomStatistics = (date: string) =>
  apiClient.get<RoomStatisticsDto[]>('/RISComplete/rooms/statistics', {
    params: { date }
  });

// #endregion
