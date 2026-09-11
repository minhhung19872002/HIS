import { publicClient } from '../../../api/publicClient';

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
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  roomName?: string;
  reason?: string;
  status: number;
  statusName: string;
  /** Thời điểm lịch được TẠO (ISO, UTC) — khác ngày hẹn; màn quản lý xếp mặc định theo mốc này. */
  createdAt?: string;
  /** Số thứ tự GIỮ SẴN cho ngày hẹn (migration 187). Rỗng = lịch chưa có số, lấy số tại quầy. */
  queueNumber?: number;
  /** Mã vé hiển thị, VD "B007" — đúng mã hiện trên bảng gọi số. */
  queueCode?: string;
  /** Vé đã nằm trong hàng đợi của ngày khám hay chưa. */
  isInQueue?: boolean;
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

/** `date` (YYYY-MM-DD): có thì `availableDoctors` đếm theo CA TRỰC của ngày đó — cùng quy tắc
 *  với getBookingDoctors, để con số "(N BS)" không lệch với dropdown chọn bác sĩ. */
export const getBookingDepartments = (date?: string) =>
  publicClient.get<BookingDepartmentDto[]>('/booking/departments', { params: { date } }).then(r => r.data);

/** `date` (YYYY-MM-DD): có thì ưu tiên bác sĩ CÓ CA TRỰC ở khoa đó hôm ấy — kể cả bác sĩ khoa
 *  khác được phân trực sang. Khoa chưa khai ca cho ngày đó thì BE rơi về bác sĩ cơ hữu. */
export const getBookingDoctors = (departmentId?: string, date?: string) =>
  publicClient.get<BookingDoctorDto[]>('/booking/doctors', { params: { departmentId, date } }).then(r => r.data);

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
