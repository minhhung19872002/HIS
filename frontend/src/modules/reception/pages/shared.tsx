import dayjs from 'dayjs';
import type { AdmissionDto } from '../api/reception';
import type { StatusTab, TopTab } from '../../../pages-v2/_v2kit';

export type TopKey = 'queue' | 'now' | 'stats';
// 5 trạng thái thực tế tại quầy tiếp đón BV VN:
// Chờ tiếp đón → Đang khám → Chờ KQ CLS → Khám xong, + Vắng/bỏ qua.
export type StatusKey = 'waiting' | 'serving' | 'waitresult' | 'completed' | 'noshow';

export const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'queue', l: 'Hàng đợi tiếp đón', ic: 'users' },
  { v: 'now',   l: 'Bảng gọi số',       ic: 'bell' },
  { v: 'stats', l: 'Thống kê',          ic: 'chart' },
];

export const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'waiting',    l: 'Chờ tiếp đón', tone: 'info' },
  { v: 'serving',    l: 'Đang khám',    tone: 'ok' },
  { v: 'waitresult', l: 'Chờ KQ CLS',   tone: 'warn' },
  { v: 'completed',  l: 'Khám xong',    tone: 'ok' },
  { v: 'noshow',     l: 'Vắng / bỏ qua', tone: 'crit' },
];

export const PRIORITY_OPTS = [
  { v: 'crit', l: 'Cấp cứu' },
  { v: 'high', l: 'Ưu tiên' },
  { v: 'norm', l: 'Thường' },
];
// Hình thức khám — map theo treatmentType backend (1 BHYT · 2 dịch vụ · 3 cấp cứu · 4 yêu cầu)
export const VISIT_TYPE_OPTS = [
  { v: '1', l: 'Khám BHYT' },
  { v: '2', l: 'Khám dịch vụ' },
  { v: '3', l: 'Cấp cứu' },
  { v: '4', l: 'Khám theo yêu cầu' },
];

export const fmtHM = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Loose row helper: backend `Status`/`Gender` come back as strings, the
// frontend interface predates that. Read both shapes.
export type RawRow = AdmissionDto & {
  status: string | number;
  gender?: string | number;
  genderName?: string;
  age?: number;
  statusName?: string;
  isInsuranceValid?: boolean;
  treatmentTypeName?: string;
  priorityName?: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  patientTypeName?: string;
  ticketId?: string;
  ticketStatus?: number;   // QueueTicket.Status: 0 Waiting · 1 Calling · 2 Serving · 3 Completed · 4 Skipped
  admissionType?: string;
  admissionCode?: string;
};

export const statusKey = (row: RawRow): StatusKey => {
  // Vắng/bỏ qua: chỉ phân biệt được qua trạng thái VÉ (=4 Skipped); MR bị reset
  // về Waiting khi skip nên phải ưu tiên kiểm tra ticketStatus trước.
  if (row.ticketStatus === 4) return 'noshow';
  const s = row.status;
  // String form (backend): "Waiting" | "InProgress" | "WaitingResult" | "Completed"
  if (typeof s === 'string') {
    if (s === 'Waiting') return 'waiting';
    if (s === 'InProgress') return 'serving';
    if (s === 'WaitingResult') return 'waitresult';
    return 'completed';
  }
  // Numeric form: 0 chờ · 1 đang khám · 2 chờ KQ CLS · 3 khám xong
  if (s === 0) return 'waiting';
  if (s === 1) return 'serving';
  if (s === 2) return 'waitresult';
  return 'completed';
};
export const statusTone = (s: StatusKey) =>
  STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

export const priorityKey = (row: RawRow): 'crit' | 'high' | 'norm' => {
  if (row.isEmergency) return 'crit';
  if (row.isPriority || (typeof row.priority === 'number' && row.priority >= 2)) return 'high';
  return 'norm';
};
export const priorityLabel = (k: 'crit' | 'high' | 'norm') =>
  k === 'crit' ? 'Cấp cứu' : k === 'high' ? 'Ưu tiên' : 'Thường';

export const genderLabel = (row: RawRow): string => {
  if (row.genderName) return row.genderName;
  if (typeof row.gender === 'string') return row.gender;
  if (row.gender === 1) return 'Nam';
  if (row.gender === 2) return 'Nữ';
  return '—';
};

export const ageOf = (row: RawRow): number | string => {
  if (typeof row.age === 'number' && row.age > 0) return row.age;
  if (row.dateOfBirth) {
    const d = dayjs(row.dateOfBirth);
    if (d.isValid()) return dayjs().diff(d, 'year');
  }
  if (row.yearOfBirth) return new Date().getFullYear() - row.yearOfBirth;
  return '—';
};

export const treatmentLabel = (row: RawRow): string => {
  if (row.treatmentTypeName) return row.treatmentTypeName;
  if (row.patientTypeName) return row.patientTypeName;
  if (row.admissionType) return row.admissionType;
  return row.isEmergency ? 'Cấp cứu' : 'Khám thường';
};

export const hasValidInsurance = (row: RawRow): boolean => {
  if (typeof row.isInsuranceValid === 'boolean') return row.isInsuranceValid;
  return !!row.insuranceNumber;
};

/* ────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────── */
