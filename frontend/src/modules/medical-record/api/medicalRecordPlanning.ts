import client from '../../../services/apiClient';

// Record Code Management
export const getRecordCodes = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/record-codes', { params });

export const assignRecordCode = (data: { examinationId: string; recordCode?: string }) =>
  client.post('/medical-record-planning/record-codes/assign', data);

export const cancelRecordCode = (data: { recordCodeId: string; reason?: string }) =>
  client.post('/medical-record-planning/record-codes/cancel', data);

// Transfer Management
export const getTransfers = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/transfers', { params });

export const approveTransfer = (data: { transferId: string; approve: boolean; rejectReason?: string }) =>
  client.post('/medical-record-planning/transfers/approve', data);

export const assignTransferNumber = (data: { transferId: string; transferNumber: string }) =>
  client.post('/medical-record-planning/transfers/assign-number', data);

// Record Borrowing
export const getBorrowing = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/borrowing', { params });

export const createBorrow = (data: { medicalRecordId: string; purpose?: string; borrowDays?: number }) =>
  client.post('/medical-record-planning/borrowing/borrow', data);

export const returnRecord = (data: { borrowId: string; note?: string }) =>
  client.post('/medical-record-planning/borrowing/return', data);

export const extendBorrow = (data: { borrowId: string; extendDays?: number; reason?: string }) =>
  client.post('/medical-record-planning/borrowing/extend', data);

// Record Handover
export const getHandover = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/handover', { params });

export const submitHandover = (data: { medicalRecordIds: string[]; note?: string }) =>
  client.post('/medical-record-planning/handover/submit', data);

export const approveHandover = (data: { handoverId: string; approve: boolean; rejectReason?: string }) =>
  client.post('/medical-record-planning/handover/approve', data);

// Outpatient Records
export const getOutpatientRecords = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/outpatient-records', { params });

// Record Copying
export const createRecordCopy = (data: { medicalRecordId: string; requester?: string; purpose?: string; copyCount?: number }) =>
  client.post('/medical-record-planning/record-copy', data);

// Department Attendance
export const getAttendance = (params: Record<string, unknown>) =>
  client.get('/medical-record-planning/attendance', { params });

export const checkIn = (data: { departmentId: string; note?: string }) =>
  client.post('/medical-record-planning/attendance/check-in', data);

// Stats
export const getPlanningStats = () =>
  client.get('/medical-record-planning/stats');

// Bulk Allocate Record Codes
export interface BulkAllocateDto {
  departmentId: string;
  /** Dải số: mã bắt đầu, VD "HS0001" */
  fromCode?: string;
  /** Dải số: mã kết thúc, VD "HS0100" */
  toCode?: string;
  /** Prefix+Count mode: prefix VD "HS" */
  prefix?: string;
  /** Prefix+Count mode: số mã cần sinh */
  count?: number;
  /** Bỏ qua mã đã tồn tại thay vì báo lỗi (default true) */
  skipExisting?: boolean;
}

export interface BulkAllocateResult {
  requested: number;
  allocated: number;
  skipped: number;
  failed: number;
  allocatedCodes: string[];
  skippedCodes: string[];
  errors: string[];
  message: string;
}

export const bulkAllocate = (dto: BulkAllocateDto) =>
  client.post<BulkAllocateResult>('/medical-record-planning/record-codes/bulk-allocate', dto);
