import { publicClient } from './publicClient';

// === DTOs ===

export interface BookingDepartmentDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  availableRooms: number;
  availableDoctors: number;
}

export interface BookingDoctorDto {
  id: string;
  fullName: string;
  title?: string;
  specialty?: string;
  departmentId?: string;
  departmentName?: string;
  photoUrl?: string;
}

export interface BookingTimeSlot {
  startTime: string;
  endTime: string;
  displayTime: string;
  isAvailable: boolean;
  currentBookings: number;
  maxBookings: number;
}

export interface BookingSlotResult {
  date: string;
  departmentName?: string;
  doctorName?: string;
  morningSlots: BookingTimeSlot[];
  afternoonSlots: BookingTimeSlot[];
  totalAvailable: number;
}

export interface OnlineBookingDto {
  patientName: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  gender?: number;
  identityNumber?: string;
  address?: string;
  appointmentDate: string;
  appointmentTime?: string;
  departmentId?: string;
  doctorId?: string;
  appointmentType?: number;
  reason?: string;
  notes?: string;
  serviceIds?: string[];
}

export interface BookingResultDto {
  success: boolean;
  message?: string;
  appointmentCode: string;
  appointmentDate: string;
  appointmentTime?: string;
  departmentName?: string;
  doctorName?: string;
  roomName?: string;
  estimatedWaitMinutes: number;
}

export interface BookingStatusDto {
  appointmentCode: string;
  patientName: string;
  phoneNumber?: string;
  appointmentDate: string;
  appointmentTime?: string;
  appointmentType: number;
  appointmentTypeName: string;
  departmentName?: string;
  doctorName?: string;
  roomName?: string;
  reason?: string;
  status: number;
  statusName: string;
}

export interface BookingServiceDto {
  id: string;
  code: string;
  name: string;
  category?: string;
  price?: number;
  estimatedMinutes?: number;
}

// === API Functions ===

export const getBookingDepartments = () =>
  publicClient.get<BookingDepartmentDto[]>('/booking/departments').then(r => r.data);

export const getBookingDoctors = (departmentId?: string) =>
  publicClient.get<BookingDoctorDto[]>('/booking/doctors', { params: { departmentId } }).then(r => r.data);

export const getAvailableSlots = (date: string, departmentId?: string, doctorId?: string) =>
  publicClient.get<BookingSlotResult>('/booking/slots', { params: { date, departmentId, doctorId } }).then(r => r.data);

export const bookAppointment = (dto: OnlineBookingDto) =>
  publicClient.post<BookingResultDto>('/booking/book', dto).then(r => r.data);

export const lookupAppointment = (code?: string, phone?: string) =>
  publicClient.get<BookingStatusDto[]>('/booking/lookup', { params: { code, phone } }).then(r => r.data);

export const cancelBooking = (appointmentCode: string, phoneNumber: string, reason?: string) =>
  publicClient.put<BookingStatusDto>(`/booking/${appointmentCode}/cancel`, { phoneNumber, reason }).then(r => r.data);

export const getBookingServices = (departmentId?: string) =>
  publicClient.get<BookingServiceDto[]>('/booking/services', { params: { departmentId } }).then(r => r.data);
