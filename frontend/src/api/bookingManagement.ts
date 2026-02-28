import client from './client';
import type { BookingStatusDto } from './appointmentBooking';

// === Doctor Schedule DTOs ===

export interface DoctorScheduleListDto {
  id: string;
  doctorId: string;
  doctorName: string;
  title?: string;
  specialty?: string;
  departmentId: string;
  departmentName: string;
  roomId?: string;
  roomName?: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  slotDurationMinutes: number;
  scheduleType: number;
  note?: string;
  isActive: boolean;
  isRecurring: boolean;
  dayOfWeek: number;
  bookedCount: number;
}

export interface SaveDoctorScheduleDto {
  id?: string;
  doctorId: string;
  departmentId: string;
  roomId?: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  maxPatients?: number;
  slotDurationMinutes?: number;
  scheduleType?: number;
  note?: string;
  isRecurring?: boolean;
}

export interface BookingSearchDto {
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  doctorId?: string;
  status?: number;
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface BookingManagementPagedResult {
  items: BookingStatusDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface BookingStatsDto {
  totalBookings: number;
  pending: number;
  confirmed: number;
  attended: number;
  noShow: number;
  cancelled: number;
  noShowRate: number;
  byDepartment: { departmentName: string; count: number }[];
}

export interface BookingCheckinResultDto {
  success: boolean;
  message?: string;
  patientCode?: string;
  patientName?: string;
  phoneNumber?: string;
  patientId?: string;
  departmentId?: string;
  departmentName?: string;
  roomId?: string;
  roomName?: string;
  doctorId?: string;
  doctorName?: string;
  reason?: string;
  appointmentType?: number;
  queueNumber?: number;
}

// === Doctor Schedule API ===

export const getDoctorSchedules = (params: { fromDate?: string; toDate?: string; departmentId?: string; doctorId?: string }) =>
  client.get<DoctorScheduleListDto[]>('/booking-management/schedules', { params }).then(r => r.data);

export const saveDoctorSchedule = (dto: SaveDoctorScheduleDto) =>
  client.post<DoctorScheduleListDto>('/booking-management/schedules', dto).then(r => r.data);

export const deleteDoctorSchedule = (id: string) =>
  client.delete(`/booking-management/schedules/${id}`);

export const generateRecurringSchedules = (id: string, fromDate: string, toDate: string) =>
  client.post(`/booking-management/schedules/${id}/generate`, null, { params: { fromDate, toDate } });

// === Booking Management API ===

export const getBookings = (params: BookingSearchDto) =>
  client.get<BookingManagementPagedResult>('/booking-management/bookings', { params }).then(r => r.data);

export const confirmBooking = (code: string) =>
  client.put<BookingStatusDto>(`/booking-management/bookings/${code}/confirm`).then(r => r.data);

export const checkInBooking = (code: string) =>
  client.put<BookingStatusDto>(`/booking-management/bookings/${code}/checkin`).then(r => r.data);

export const markNoShow = (code: string) =>
  client.put<BookingStatusDto>(`/booking-management/bookings/${code}/no-show`).then(r => r.data);

export const getBookingStats = (date?: string) =>
  client.get<BookingStatsDto>('/booking-management/stats', { params: { date } }).then(r => r.data);

export const checkinFromBooking = (code: string) =>
  client.post<BookingCheckinResultDto>(`/booking-management/bookings/${code}/reception-checkin`).then(r => r.data);
