import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as file from '../../../services/file.service';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App as AntdApp,
  Badge,
  Calendar,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
} from 'antd';
import {
  getStaff,
  getRoster,
  approveSwapRequest,
  publishRoster,
  copyWeekRoster,
  getShiftDefinitions,
  getDashboard,
  createStaff,
  generateRoster,
  createCMERecord,
  getNonCompliantStaff,
  getExpiringCertifications,
  getCatalogs,
  saveCatalog,
  deleteCatalog,
  getStaffContracts,
  saveContract,
  getExpiringContracts,
  getLeaveRequests,
  createLeaveRequest,
  approveLeave,
  getAttendance,
  recordAttendance,
  getAttendanceSummary,
  getOvertimeRequests,
  createOvertime,
  approveOvertime,
  getStaffAwards,
  saveAward,
  getStaffDisciplines,
  saveDiscipline,
  getReportByDepartment,
  getAttendanceReport,
  getLeaveReport,
  getOvertimeReport,
  getMovementReport,
  type StaffProfileDto,
  type RosterAssignmentDto,
  type DutyRosterDto,
  type CMESummaryDto,
  type MedicalHRDashboardDto,
  type CertificationDto,
  type ShiftDefinitionDto,
  type HRCatalogDto,
  type StaffContractDto,
  type LeaveRequestDto,
  type AttendanceRecordDto,
  type AttendanceSummaryDto,
  type OvertimeRecordDto,
  type StaffAwardDto,
  type StaffDisciplineDto,
  type StaffByDepartmentReportDto,
  type AttendanceReportDto,
  type LeaveReportDto,
  type OvertimeReportDto,
  type StaffMovementReportDto,
} from '../api/medicalHR';
import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SwapOutlined,
  UserOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import TermIcon from '../../../components/layout/terminal/Icon';
import '../../../styles/HR.css';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import {
  ActBtn,
  Btn,
  cf,
  DataTable,
  DrawerShell,
  DrField,
  DrSec,
  Filter,
  KpiStrip,
  Pager,
  TopTabs,
  type ColumnDef,
  type KpiItem,
  type TopTab,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { useTabState } from '../../../hooks/useTabState';

const { RangePicker } = DatePicker;

type ShiftType = 'morning' | 'evening' | 'night' | 'off';

type ShiftMeta = {
  value: ShiftType;
  label: string;
  time: string;
  soft: string;
  border: string;
  text: string;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  department: string;
  quota: number;
};

type SwapRequest = {
  id: string;
  from: string;
  to: string;
  date: string;
  shift: ShiftType;
  reason: string;
  status: 'pending' | 'approved';
};

const SHIFT_TYPES: ShiftMeta[] = [
  { value: 'morning', label: 'Sáng', time: '07:00-15:00', soft: '#e6f6fb', border: '#b9e5f3', text: '#0f766e' },
  { value: 'evening', label: 'Chiều', time: '15:00-23:00', soft: '#fff4e8', border: 'var(--s-warn-bd2)', text: '#c05621' },
  { value: 'night', label: 'Đêm', time: '23:00-07:00', soft: 'var(--s-mag-bg)', border: '#ddd6fe', text: 'var(--s-mag-tx)' },
  { value: 'off', label: 'Nghỉ', time: '—', soft: 'var(--d-1)', border: 'var(--line)', text: 'var(--t-3)' },
];

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const STAFF: StaffMember[] = [
  { id: 'BS001', name: 'BS. Nguyễn Văn Hùng', role: 'Trưởng khoa', department: 'Tim mạch', quota: 6 },
  { id: 'BS002', name: 'BS. Trần Thị Lan', role: 'Bác sĩ chính', department: 'Tim mạch', quota: 6 },
  { id: 'BS003', name: 'BS. Lê Quốc Anh', role: 'Bác sĩ', department: 'Nội', quota: 7 },
  { id: 'BS004', name: 'BS. Phạm Hữu Nam', role: 'Bác sĩ', department: 'Cấp cứu', quota: 8 },
  { id: 'BS005', name: 'BS. Đỗ Thanh Hà', role: 'Bác sĩ', department: 'Sản', quota: 6 },
  { id: 'DD001', name: 'ĐD. Vũ Thuỳ Linh', role: 'Trưởng ĐD', department: 'Tim mạch', quota: 7 },
  { id: 'DD002', name: 'ĐD. Bùi Mai Hương', role: 'Điều dưỡng', department: 'Nội', quota: 8 },
  { id: 'DD003', name: 'ĐD. Trần Văn Thái', role: 'Điều dưỡng', department: 'Cấp cứu', quota: 8 },
  { id: 'DD004', name: 'ĐD. Lý Thuý Vy', role: 'Điều dưỡng', department: 'Sản', quota: 7 },
  { id: 'DD005', name: 'ĐD. Hoàng Thị Bích', role: 'Điều dưỡng', department: 'Hồi sức', quota: 8 },
  { id: 'KTV01', name: 'KTV. Phan Đăng Khoa', role: 'KTV xét nghiệm', department: 'LIS', quota: 6 },
  { id: 'KTV02', name: 'KTV. Tô Anh Đức', role: 'KTV chẩn đoán hình ảnh', department: 'RIS', quota: 6 },
];

// ─── Constants ported từ v1 (pages/hr/constants.ts — KHÔNG import từ pages/) ──

const POSITIONS = [
  { value: 'Doctor', label: 'Bác sĩ' },
  { value: 'Nurse', label: 'Điều dưỡng' },
  { value: 'Technician', label: 'Kỹ thuật viên' },
  { value: 'Allied', label: 'Dược sĩ' },
  { value: 'Admin', label: 'Hành chính' },
  { value: 'Support', label: 'Hỗ trợ' },
];

const CATALOG_TYPES = [
  { value: 'Position', label: 'Chức vụ' },
  { value: 'JobTitle', label: 'Chức danh' },
  { value: 'CivilServantRank', label: 'Ngạch công chức' },
  { value: 'SalaryGrade', label: 'Bậc lương' },
  { value: 'ContractType', label: 'Loại hợp đồng' },
  { value: 'InsuranceType', label: 'Loại bảo hiểm' },
  { value: 'EducationLevel', label: 'Trình độ học vấn' },
  { value: 'AwardType', label: 'Loại khen thưởng' },
  { value: 'DisciplineType', label: 'Loại kỷ luật' },
  { value: 'LeaveType', label: 'Loại nghỉ phép' },
  { value: 'ShiftType', label: 'Ca trực' },
  { value: 'CertificateType', label: 'Loại chứng chỉ' },
  { value: 'Ethnicity', label: 'Dân tộc' },
  { value: 'Religion', label: 'Tôn giáo' },
  { value: 'Nationality', label: 'Quốc tịch' },
];

const LEAVE_STATUS_NAMES: Record<number, { color: string; text: string }> = {
  0: { color: 'gold', text: 'Chờ duyệt' },
  1: { color: 'green', text: 'Đã duyệt' },
  2: { color: 'red', text: 'Từ chối' },
  3: { color: 'default', text: 'Đã hủy' },
};

type HrTab =
  | 'roster'
  | 'employees'
  | 'catalogs'
  | 'contracts'
  | 'attendance'
  | 'leave'
  | 'overtime'
  | 'awards'
  | 'schedule'
  | 'shifts'
  | 'training'
  | 'licenses'
  | 'reports';

function buildEmployeeCardHtml(s: StaffMember): string {
  const row = (label: string, value: string) =>
    `<tr><td style="width:40%;font-weight:600;color:#555;padding:5px 8px;border:1px solid #ccc">${label}</td><td style="padding:5px 8px;border:1px solid #ccc">${esc(value || '—')}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Hồ sơ nhân viên</title>
<style>body{font-family:'Times New Roman',serif;margin:20mm 15mm;font-size:13pt}
h2{text-align:center;font-size:15pt;margin:8px 0}h4{text-align:center;font-size:12pt;font-weight:normal;margin:4px 0 16px}
table{width:100%;border-collapse:collapse}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:11pt">${esc(HOSPITAL_NAME)}</div>
<h2>HỒ SƠ NHÂN VIÊN Y TẾ</h2>
<table style="margin-top:14px">
${row('Mã nhân viên', s.id)}
${row('Họ và tên', s.name)}
${row('Giới tính', '')}
${row('Ngày sinh', '')}
${row('Chức danh', s.role)}
${row('Khoa/Phòng', s.department)}
${row('Số ca định mức/tuần', String(s.quota))}
${row('Ngày tuyển dụng', '')}
${row('Số chứng chỉ hành nghề', '')}
</table>
<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center;font-size:12pt">
<div><b>Nhân viên</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>${esc(s.name)}</b></div>
<div><b>Phòng Tổ chức - Nhân sự</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>................</b></div>
</div>
</body></html>`;
}

/** Hồ sơ nhân viên (StaffProfileDto) — HTML in verbatim theo v1 executePrintEmployeeCard. */
function buildStaffProfileCardHtml(emp: StaffProfileDto): string {
  const mainCert = emp.certifications?.[0];
  return `<!DOCTYPE html><html><head><title>Hồ sơ nhân viên</title>
    <style>body{font-family:'Times New Roman',serif;padding:20px;max-width:800px;margin:auto}.header{text-align:center;margin-bottom:20px}.title{font-size:20px;font-weight:bold;margin:20px 0;text-align:center}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #000;padding:8px;text-align:left}th{background:#f0f0f0;width:30%}@media print{body{padding:0}}</style></head><body>
    <div class="header"><strong>${esc(HOSPITAL_NAME)}</strong><br/>Phòng Tổ chức - Nhân sự</div>
    <div class="title">HỒ SƠ NHÂN VIÊN Y TẾ</div>
    <table><tr><th>Mã nhân viên</th><td>${esc(emp.staffCode)}</td></tr>
    <tr><th>Họ và tên</th><td>${esc(emp.fullName)}</td></tr>
    <tr><th>Giới tính</th><td>${esc(emp.gender === 'Male' ? 'Nam' : emp.gender === 'Female' ? 'Nữ' : emp.gender || '-')}</td></tr>
    <tr><th>Ngày sinh</th><td>${esc(emp.dateOfBirth || '-')}</td></tr>
    <tr><th>Chức vụ</th><td>${esc(emp.positionName || '-')}</td></tr>
    <tr><th>Khoa/Phòng</th><td>${esc(emp.departmentName)}</td></tr>
    <tr><th>Chuyên khoa</th><td>${esc(emp.specialty || '-')}</td></tr>
    <tr><th>Số CCHN</th><td>${esc(mainCert?.licenseNumber || '-')}</td></tr>
    <tr><th>Ngày vào làm</th><td>${esc(emp.hireDate || '-')}</td></tr></table>
    <div style="margin-top:50px;text-align:right"><p>Ngày ${esc(dayjs().format('DD/MM/YYYY'))}</p><p><strong>Trưởng phòng Nhân sự</strong></p></div>
    </body></html>`;
}

function seededValue(seed: number): number {
  const value = Math.sin(seed * 123.456) * 10000;
  return value - Math.floor(value);
}

function buildRotaSeed(staffList: StaffMember[] = STAFF): Record<string, ShiftType[]> {
  return staffList.reduce<Record<string, ShiftType[]>>((accumulator, staff, staffIndex) => {
    accumulator[staff.id] = DAYS.map((_, dayIndex) => {
      if (staff.role === 'Trưởng khoa' || staff.role === 'Trưởng ĐD') {
        return dayIndex === 6 ? 'off' : 'morning';
      }

      const value = seededValue(staffIndex * 11 + dayIndex + 3);
      if (value < 0.46) return 'morning';
      if (value < 0.72) return 'evening';
      if (value < 0.87) return 'night';
      return 'off';
    });
    return accumulator;
  }, {});
}

// ─── API DTO mapper ──────────────────────────────────────────────────────────
//
// Backend StaffProfileDto carries staffType ('Doctor'/'Nurse'/'Technician'/...),
// the v2 grid expects role labels like "Trưởng khoa"/"Bác sĩ"/"Điều dưỡng"/"KTV".
// Map staff type → Vietnamese role; quota defaults to 6 (target shifts/week).

function staffTypeToRole(t?: string): string {
  const v = (t || '').toLowerCase();
  if (v.includes('doctor')) return 'Bác sĩ';
  if (v.includes('nurse'))  return 'Điều dưỡng';
  if (v.includes('tech') || v.includes('technician')) return 'KTV';
  if (v.includes('admin'))  return 'Hành chính';
  if (v.includes('allied') || v.includes('support')) return 'Hỗ trợ';
  return t || 'Nhân viên';
}

function mapProfileToStaff(p: StaffProfileDto): StaffMember {
  return {
    id: p.staffCode || p.id,
    name: p.fullName || p.staffCode,
    role: staffTypeToRole(p.staffType),
    department: p.departmentName || '—',
    quota: 6,
  };
}

function shiftFromName(name?: string): ShiftType {
  const v = (name || '').toLowerCase();
  if (v.includes('sáng') || v.includes('sang') || v.includes('morning')) return 'morning';
  if (v.includes('chiều') || v.includes('chieu') || v.includes('evening') || v.includes('afternoon')) return 'evening';
  if (v.includes('đêm') || v.includes('dem') || v.includes('night')) return 'night';
  return 'off';
}

function buildRotaFromAssignments(
  staffList: StaffMember[],
  assignments: RosterAssignmentDto[],
  weekStart: dayjs.Dayjs,
): Record<string, ShiftType[]> {
  const weekDates = DAYS.map((_, i) => weekStart.add(i, 'day').format('YYYY-MM-DD'));
  const out: Record<string, ShiftType[]> = {};
  for (const s of staffList) {
    out[s.id] = weekDates.map((date) => {
      // Match by date AND (staffCode OR original API id stored in code)
      const a = assignments.find((x) => (x.staffCode === s.id || x.staffId === s.id) && x.date.startsWith(date));
      return a ? shiftFromName(a.shiftName) : 'off';
    });
  }
  return out;
}

/** CSV helper — inline (same pattern as Reports.tsx downloadCsv) */
function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  file.downloadBlob(blob, filename);
}

const EMP_PER_PAGE = 10;

const HRV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useTabState<HrTab>('roster');
  const [week, setWeek] = useState(43);
  const [staffList, setStaffList] = useState<StaffMember[]>(STAFF);
  const [rota, setRota] = useState<Record<string, ShiftType[]>>(() => buildRotaSeed());
  const [usingMock, setUsingMock] = useState(true);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // ─── State ported từ v1 (quản trị nhân sự) ────────────────────────────────
  const [loading, setLoading] = useState(false);
  /** #467 UX: fetch riêng của từng tab (danh mục/HĐ/chấm công/nghỉ phép/OT/khen thưởng/báo cáo). */
  const [tabLoading, setTabLoading] = useState(false);
  /** #467 UX: khoá double-click nút duyệt/từ chối theo dòng — key dạng `leave:<id>`. */
  const [acting, setActing] = useState<string | null>(null);
  /** #467 UX: khoá double-submit nút OK của các modal form (mỗi lúc chỉ 1 modal mở). */
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<StaffProfileDto[]>([]);
  const [rosterAssignments, setRosterAssignments] = useState<RosterAssignmentDto[]>([]);
  const [cmeNonCompliant, setCmeNonCompliant] = useState<CMESummaryDto[]>([]);
  const [dashboard, setDashboard] = useState<MedicalHRDashboardDto | null>(null);
  const [expiringCerts, setExpiringCerts] = useState<CertificationDto[]>([]);
  const [shiftDefs, setShiftDefs] = useState<ShiftDefinitionDto[]>([]);
  const [profileStaff, setProfileStaff] = useState<StaffProfileDto | null>(null);
  const [empPage, setEmpPage] = useState(0);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [shiftForm] = Form.useForm();
  const [trainingForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  const [catalogs, setCatalogs] = useState<HRCatalogDto[]>([]);
  const [selectedCatalogType, setSelectedCatalogType] = useState('Position');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogForm] = Form.useForm();

  const [contracts, setContracts] = useState<StaffContractDto[]>([]);
  const [expiringContractsList, setExpiringContractsList] = useState<StaffContractDto[]>([]);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm] = Form.useForm();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm] = Form.useForm();

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordDto[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummaryDto[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceForm] = Form.useForm();
  const [attView, setAttView] = useState<'records' | 'summary'>('records');

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecordDto[]>([]);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeForm] = Form.useForm();

  const [awards, setAwards] = useState<StaffAwardDto[]>([]);
  const [disciplines, setDisciplines] = useState<StaffDisciplineDto[]>([]);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [awardForm] = Form.useForm();
  const [disciplineForm] = Form.useForm();
  const [awardView, setAwardView] = useState<'awards' | 'disciplines'>('awards');

  const [deptReport, setDeptReport] = useState<StaffByDepartmentReportDto[]>([]);
  const [attendanceReport, setAttendanceReportData] = useState<AttendanceReportDto | null>(null);
  const [leaveReport, setLeaveReportData] = useState<LeaveReportDto | null>(null);
  const [overtimeReport, setOvertimeReportData] = useState<OvertimeReportDto | null>(null);
  const [movementReport, setMovementReportData] = useState<StaffMovementReportDto | null>(null);
  const [reportType, setReportType] = useState('department');

  // ─── Fetches ported verbatim từ v1 ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getStaff({ page: 1, pageSize: 200 }),
        getDashboard(today),
        getNonCompliantStaff(),
        getExpiringCertifications(90),
        getShiftDefinitions(),
        getRoster('', dayjs().year(), dayjs().month() + 1),
      ]);

      if (results[0].status === 'fulfilled') {
        const staffData = results[0].value?.data;
        if (staffData && staffData.items) {
          setEmployees(staffData.items);
        } else if (Array.isArray(staffData)) {
          setEmployees(staffData as unknown as StaffProfileDto[]);
        }
      } else {
        message.warning('Không thể tải danh sách nhân viên');
      }

      if (results[1].status === 'fulfilled') {
        setDashboard(results[1].value?.data || null);
      } else {
        message.warning('Không thể tải tổng quan nhân sự');
      }

      if (results[2].status === 'fulfilled') {
        const cmeData = results[2].value?.data;
        setCmeNonCompliant(Array.isArray(cmeData) ? cmeData : []);
      } else {
        message.warning('Không thể tải danh sách chưa đủ tín chỉ CME');
      }

      if (results[3].status === 'fulfilled') {
        const certData = results[3].value?.data;
        setExpiringCerts(Array.isArray(certData) ? certData : []);
      } else {
        message.warning('Không thể tải danh sách chứng chỉ sắp hết hạn');
      }

      if (results[4].status === 'fulfilled') {
        const shiftData = results[4].value?.data;
        setShiftDefs(Array.isArray(shiftData) ? shiftData : []);
      } else {
        message.warning('Không thể tải định nghĩa ca trực');
      }

      if (results[5].status === 'fulfilled') {
        const rosterData = results[5].value?.data;
        if (rosterData && rosterData.staffAssignments) {
          setRosterAssignments(rosterData.staffAssignments);
        }
      } else {
        message.warning('Không thể tải lịch trực tháng này');
      }
    } catch {
      message.warning('Có lỗi khi tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchCatalogs = useCallback(async (type: string) => {
    setTabLoading(true);
    try {
      const res = await getCatalogs(type);
      setCatalogs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải danh mục nhân sự'));
      setCatalogs([]);
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchCatalogs(selectedCatalogType);
  }, [selectedCatalogType, fetchCatalogs]);

  const fetchContracts = useCallback(async () => {
    setTabLoading(true);
    try {
      const [contractsRes, expiringRes] = await Promise.allSettled([
        getStaffContracts(),
        getExpiringContracts(90),
      ]);
      if (contractsRes.status === 'fulfilled') setContracts(Array.isArray(contractsRes.value?.data) ? contractsRes.value.data : []);
      else message.warning('Không thể tải danh sách hợp đồng lao động');
      if (expiringRes.status === 'fulfilled') setExpiringContractsList(Array.isArray(expiringRes.value?.data) ? expiringRes.value.data : []);
      else message.warning('Không thể tải danh sách hợp đồng sắp hết hạn');
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải dữ liệu hợp đồng lao động'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  const fetchLeave = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await getLeaveRequests();
      setLeaveRequests(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải danh sách đơn nghỉ phép'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  const fetchAttendance = useCallback(async () => {
    setTabLoading(true);
    try {
      const now = dayjs();
      const [recRes, sumRes] = await Promise.allSettled([
        getAttendance(undefined, now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')),
        getAttendanceSummary(now.year(), now.month() + 1),
      ]);
      if (recRes.status === 'fulfilled') setAttendanceRecords(Array.isArray(recRes.value?.data) ? recRes.value.data : []);
      else message.warning('Không thể tải dữ liệu chấm công chi tiết');
      if (sumRes.status === 'fulfilled') setAttendanceSummaries(Array.isArray(sumRes.value?.data) ? sumRes.value.data : []);
      else message.warning('Không thể tải bảng tổng hợp chấm công tháng');
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải dữ liệu chấm công'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  const fetchOvertime = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await getOvertimeRequests();
      setOvertimeRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải danh sách yêu cầu làm thêm giờ'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  const fetchAwardsDiscipline = useCallback(async () => {
    setTabLoading(true);
    try {
      const [aw, di] = await Promise.allSettled([getStaffAwards(), getStaffDisciplines()]);
      if (aw.status === 'fulfilled') setAwards(Array.isArray(aw.value?.data) ? aw.value.data : []);
      else message.warning('Không thể tải danh sách khen thưởng');
      if (di.status === 'fulfilled') setDisciplines(Array.isArray(di.value?.data) ? di.value.data : []);
      else message.warning('Không thể tải danh sách kỷ luật');
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải dữ liệu khen thưởng — kỷ luật'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  const fetchReports = useCallback(async (type: string) => {
    setTabLoading(true);
    try {
      const now = dayjs();
      if (type === 'department') {
        const res = await getReportByDepartment();
        setDeptReport(Array.isArray(res?.data) ? res.data : []);
      } else if (type === 'attendance') {
        const res = await getAttendanceReport(now.year(), now.month() + 1);
        setAttendanceReportData(res?.data || null);
      } else if (type === 'leave') {
        const res = await getLeaveReport(now.year(), now.month() + 1);
        setLeaveReportData(res?.data || null);
      } else if (type === 'overtime') {
        const res = await getOvertimeReport(now.year(), now.month() + 1);
        setOvertimeReportData(res?.data || null);
      } else if (type === 'movement') {
        const res = await getMovementReport(now.startOf('year').format('YYYY-MM-DD'), now.format('YYYY-MM-DD'));
        setMovementReportData(res?.data || null);
      }
    } catch (e) {
      message.warning(friendlyErrorMessage(e, 'Không thể tải báo cáo nhân sự'));
    } finally {
      setTabLoading(false);
    }
  }, [message]);

  // Try real HR API: load staff + current month roster, fall back to seed.
  useEffect(() => {
    (async () => {
      try {
        const now = dayjs();
        const [staffRes, rosterRes] = await Promise.allSettled([
          getStaff({ page: 1, pageSize: 50 }),
          getRoster('', now.year(), now.month() + 1),
        ]);

        let realStaff: StaffMember[] = [];
        if (staffRes.status === 'fulfilled') {
          // Backend may return list directly OR wrapped {items: []}; handle both.
          const body = staffRes.value?.data as unknown;
          const items: StaffProfileDto[] = Array.isArray(body)
            ? body as StaffProfileDto[]
            : ((body as { items?: StaffProfileDto[] })?.items || []);
          if (items.length >= 8) realStaff = items.map(mapProfileToStaff);
        }
        if (realStaff.length === 0) return; // not enough real staff — keep seed

        setStaffList(realStaff);

        // Compute Monday-of-this-week as the rota's reference start
        const weekStart = now.startOf('week').add(1, 'day'); // dayjs week starts Sunday by default
        const rosterBody = rosterRes.status === 'fulfilled'
          ? rosterRes.value?.data as unknown : null;
        // Capture roster id for chốt lịch action
        if (rosterBody && !Array.isArray(rosterBody)) {
          const dto = rosterBody as DutyRosterDto;
          if (dto.id) setRosterId(dto.id);
        }
        const assignments: RosterAssignmentDto[] = (() => {
          if (!rosterBody) return [];
          if (Array.isArray(rosterBody)) return rosterBody as RosterAssignmentDto[];
          const r = rosterBody as { staffAssignments?: RosterAssignmentDto[]; items?: RosterAssignmentDto[] };
          return r.staffAssignments || r.items || [];
        })();
        const rotaMap = assignments.length > 0
          ? buildRotaFromAssignments(realStaff, assignments, weekStart)
          : buildRotaSeed(realStaff);
        setRota(rotaMap);
        setUsingMock(false);
        message.success(`Hiển thị nhân sự thật: ${realStaff.length} người${assignments.length > 0 ? `, ${assignments.length} ca` : ' (lịch trực mẫu)'}`);
      } catch {
        // Silent fallback — keep seed
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    from: '',
    to: '',
    date: '',
    shift: 'morning' as ShiftType,
    reason: '',
  });
  const swapModalForm = useModalForm({
    from: { required: true, message: 'Vui lòng chọn người trực' },
    to: { required: true, message: 'Vui lòng chọn người thay' },
    date: { required: true, message: 'Vui lòng chọn ngày' },
    reason: { required: true, message: 'Vui lòng nhập lý do' },
  }, swapModalOpen);
  // Copy-week modal
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekLoading, setCopyWeekLoading] = useState(false);
  const [copySource, setCopySource] = useState<string>('');
  const [copyTarget, setCopyTarget] = useState<string>('');
  const copyWeekForm = useModalForm({
    source: { required: true, message: 'Vui lòng chọn tuần nguồn' },
    target: {
      required: true,
      message: 'Vui lòng chọn tuần đích',
      validate: (v) => (v && v === copySource ? 'Tuần đích không được trùng tuần nguồn' : undefined),
    },
  }, copyWeekOpen);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([
    { id: 'CH001', from: 'BS003', to: 'BS002', date: '2026-10-23', shift: 'night', reason: 'Việc gia đình', status: 'pending' },
    { id: 'CH002', from: 'DD002', to: 'DD005', date: '2026-10-25', shift: 'evening', reason: 'Khám sức khoẻ', status: 'pending' },
  ]);

  const departments = useMemo(
    () => [...new Set(staffList.map((member) => member.department))],
    [staffList],
  );

  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staffList.filter((member) => {
      if (departmentFilter && member.department !== departmentFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${member.name} ${member.id} ${member.role}`.toLowerCase().includes(query);
    });
  }, [staffList, departmentFilter, search]);

  const shiftCount = (staffId: string): number => (rota[staffId] ?? []).filter((shift) => shift !== 'off').length;

  const overtimeCount = (staffId: string): number => {
    const staff = staffList.find((member) => member.id === staffId);
    if (!staff) {
      return 0;
    }
    return Math.max(0, shiftCount(staffId) - staff.quota);
  };

  const dayStats = useMemo(() => {
    return DAYS.map((_, dayIndex) => {
      const counts = { morning: 0, evening: 0, night: 0, off: 0 };
      visibleStaff.forEach((member) => {
        const shift = rota[member.id]?.[dayIndex] ?? 'off';
        counts[shift] += 1;
      });
      return counts;
    });
  }, [rota, visibleStaff]);

  const weekStart = dayjs('2026-10-20').add(week - 43, 'week');

  const metrics = useMemo(() => {
    const totalShifts = visibleStaff.reduce((sum, member) => sum + shiftCount(member.id), 0);
    const totalQuota = visibleStaff.reduce((sum, member) => sum + member.quota, 0);
    const totalOT = visibleStaff.reduce((sum, member) => sum + overtimeCount(member.id), 0);
    const pending = swapRequests.filter((request) => request.status === 'pending').length;
    const understaffed = dayStats.filter((stat) => stat.morning + stat.evening + stat.night < 6).length;

    return {
      totalShifts,
      totalQuota,
      totalOT,
      pending,
      understaffed,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStats, swapRequests, visibleStaff]);

  const cycleShift = (staffId: string, dayIndex: number): void => {
    setRota((currentRota) => {
      const current = [...(currentRota[staffId] ?? [])];
      const currentIndex = SHIFT_TYPES.findIndex((item) => item.value === current[dayIndex]);
      current[dayIndex] = SHIFT_TYPES[(currentIndex + 1) % SHIFT_TYPES.length].value;
      return { ...currentRota, [staffId]: current };
    });
  };

  const approveSwap = async (requestId: string): Promise<void> => {
    if (acting) return;
    setActing(`swap:${requestId}`);
    try {
      await approveSwapRequest(requestId, true);
      setSwapRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === requestId ? { ...request, status: 'approved' } : request)),
      );
      message.success('Đã duyệt yêu cầu đổi ca');
    } catch {
      message.error('Duyệt đổi ca thất bại');
    } finally {
      setActing(null);
    }
  };

  const rejectSwap = async (requestId: string): Promise<void> => {
    if (acting) return;
    setActing(`swap:${requestId}`);
    try {
      await approveSwapRequest(requestId, false);
      setSwapRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestId));
      message.warning('Đã từ chối yêu cầu đổi ca');
    } catch {
      message.error('Từ chối đổi ca thất bại');
    } finally {
      setActing(null);
    }
  };

  const submitSwapRequest = (): void => {
    const request: SwapRequest = {
      id: `CH${String(Date.now()).slice(-4)}`,
      ...swapForm,
      status: 'pending',
    };

    setSwapRequests((currentRequests) => [...currentRequests, request]);
    setSwapModalOpen(false);
    setSwapForm({ from: '', to: '', date: '', shift: 'morning', reason: '' });
    message.success('Đã gửi yêu cầu đổi ca');
  };

  // ─── Handlers ported verbatim từ v1 ───────────────────────────────────────

  const handleAddShift = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const date = values.date ? dayjs(values.date as string).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const month = dayjs(date).month() + 1;
      const year = dayjs(date).year();
      const emp = employees.find((e) => e.id === values.employeeId);
      await generateRoster({
        departmentId: emp?.departmentId || '',
        year,
        month,
        respectLeaveRequests: true,
        availableStaffIds: [values.employeeId as string],
      });
      message.success('Đã thêm lịch trực');
      setIsShiftModalOpen(false);
      shiftForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể thêm lịch trực');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTraining = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createCMERecord({
        staffId: values.employeeId as string,
        activityType: (values.trainingType as string) || 'Workshop',
        activityName: values.trainingName as string,
        provider: 'Internal',
        startDate: values.startDate ? dayjs(values.startDate as string).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        durationHours: values.credits ? Number(values.credits) : 0,
        credits: values.credits ? Number(values.credits) : 0,
        creditType: 'Category1',
        isOnline: false,
      });
      message.success('Đã đăng ký đào tạo');
      setIsTrainingModalOpen(false);
      trainingForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể đăng ký đào tạo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmployee = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createStaff({
        staffCode: values.staffCode as string,
        fullName: values.fullName as string,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth as string).format('YYYY-MM-DD') : undefined,
        gender: values.gender as string,
        phone: values.phone as string,
        email: values.email as string,
        departmentId: (values.departmentId as string) || '',
        staffType: (values.staffType as string) || 'Doctor',
        specialty: values.specialty as string,
        hireDate: values.hireDate ? dayjs(values.hireDate as string).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      });
      message.success('Đã thêm nhân viên mới');
      setIsAddEmployeeModalOpen(false);
      employeeForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể thêm nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCatalog = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveCatalog({
        id: values.id as string | undefined,
        catalogType: selectedCatalogType,
        code: values.code as string,
        name: values.name as string,
        description: values.description as string | undefined,
        sortOrder: (values.sortOrder as number) || 0,
        isActive: values.isActive !== false,
      });
      message.success('Đã lưu danh mục');
      setIsCatalogModalOpen(false);
      catalogForm.resetFields();
      fetchCatalogs(selectedCatalogType);
    } catch {
      message.warning('Không thể lưu danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    try {
      await deleteCatalog(id);
      message.success('Đã xóa danh mục');
      fetchCatalogs(selectedCatalogType);
    } catch {
      message.warning('Không thể xóa danh mục');
    }
  };

  const handleSaveContract = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveContract({
        id: values.id as string | undefined,
        staffId: values.staffId as string,
        contractType: values.contractType as string,
        contractNumber: values.contractNumber as string,
        startDate: dayjs(values.startDate as string).format('YYYY-MM-DD'),
        endDate: values.endDate ? dayjs(values.endDate as string).format('YYYY-MM-DD') : undefined,
        terms: values.terms as string | undefined,
        notes: values.notes as string | undefined,
      });
      message.success('Đã lưu hợp đồng');
      setIsContractModalOpen(false);
      contractForm.resetFields();
      fetchContracts();
    } catch {
      message.warning('Không thể lưu hợp đồng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLeave = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const dates = values.dates as [Dayjs, Dayjs];
      const totalDays = dates[1].diff(dates[0], 'day') + 1;
      await createLeaveRequest({
        staffId: values.staffId as string,
        leaveType: values.leaveType as string,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        totalDays,
        reason: values.reason as string | undefined,
      });
      message.success('Đã tạo đơn nghỉ phép');
      setIsLeaveModalOpen(false);
      leaveForm.resetFields();
      fetchLeave();
    } catch {
      message.warning('Không thể tạo đơn nghỉ phép');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = async (id: string, approved: boolean) => {
    if (acting) return;
    setActing(`leave:${id}`);
    try {
      await approveLeave(id, approved);
      message.success(approved ? 'Đã duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép');
      fetchLeave();
    } catch {
      message.warning('Không thể xử lý đơn nghỉ phép');
    } finally {
      setActing(null);
    }
  };

  const handleRecordAttendance = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await recordAttendance({
        staffId: values.staffId as string,
        workDate: dayjs(values.workDate as string).format('YYYY-MM-DD'),
        checkInTime: values.checkInTime ? dayjs(values.checkInTime as string).toISOString() : undefined,
        checkOutTime: values.checkOutTime ? dayjs(values.checkOutTime as string).toISOString() : undefined,
        shiftType: values.shiftType as string,
        workHours: (values.workHours as number) || 8,
        overtimeHours: (values.overtimeHours as number) || 0,
        status: (values.status as string) || 'Present',
      });
      message.success('Đã ghi nhận chấm công');
      setIsAttendanceModalOpen(false);
      attendanceForm.resetFields();
      fetchAttendance();
    } catch {
      message.warning('Không thể ghi nhận chấm công');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOvertime = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createOvertime({
        staffId: values.staffId as string,
        overtimeDate: dayjs(values.overtimeDate as string).format('YYYY-MM-DD'),
        startTime: dayjs(values.startTime as string).toISOString(),
        endTime: dayjs(values.endTime as string).toISOString(),
        hours: (values.hours as number) || 0,
        reason: values.reason as string | undefined,
      });
      message.success('Đã tạo yêu cầu làm thêm giờ');
      setIsOvertimeModalOpen(false);
      overtimeForm.resetFields();
      fetchOvertime();
    } catch {
      message.warning('Không thể tạo yêu cầu làm thêm giờ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOvertime = async (id: string, approved: boolean) => {
    if (acting) return;
    setActing(`overtime:${id}`);
    try {
      await approveOvertime(id, approved);
      message.success(approved ? 'Đã duyệt làm thêm giờ' : 'Đã từ chối làm thêm giờ');
      fetchOvertime();
    } catch {
      message.warning('Không thể xử lý yêu cầu');
    } finally {
      setActing(null);
    }
  };

  const handleSaveAward = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveAward({
        staffId: values.staffId as string,
        awardType: values.awardType as string,
        title: values.title as string,
        awardDate: dayjs(values.awardDate as string).format('YYYY-MM-DD'),
        decisionNumber: values.decisionNumber as string | undefined,
        description: values.description as string | undefined,
        issuedBy: values.issuedBy as string | undefined,
      });
      message.success('Đã lưu khen thưởng');
      setIsAwardModalOpen(false);
      awardForm.resetFields();
      fetchAwardsDiscipline();
    } catch {
      message.warning('Không thể lưu khen thưởng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDiscipline = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveDiscipline({
        staffId: values.staffId as string,
        disciplineType: values.disciplineType as string,
        title: values.title as string,
        disciplineDate: dayjs(values.disciplineDate as string).format('YYYY-MM-DD'),
        expiryDate: values.expiryDate ? dayjs(values.expiryDate as string).format('YYYY-MM-DD') : undefined,
        decisionNumber: values.decisionNumber as string | undefined,
        description: values.description as string | undefined,
      });
      message.success('Đã lưu kỷ luật');
      setIsDisciplineModalOpen(false);
      disciplineForm.resetFields();
      fetchAwardsDiscipline();
    } catch {
      message.warning('Không thể lưu kỷ luật');
    } finally {
      setSubmitting(false);
    }
  };

  const executePrintEmployeeCard = () => {
    if (!profileStaff) return;
    openPrintWindow(buildStaffProfileCardHtml(profileStaff), { print: 'onload' });
  };

  // ─── Derived (verbatim từ v1) ─────────────────────────────────────────────

  const activeEmployees = dashboard?.activeStaff ?? employees.filter((e) => e.employmentStatus === 1).length;
  const licenseExpiringSoon = dashboard?.expiringLicenses30Days ?? expiringCerts.length;
  const cmeIncomplete = dashboard?.cmeNonCompliant ?? cmeNonCompliant.length;

  const getStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'green', text: 'Đang làm việc' },
      2: { color: 'orange', text: 'Nghỉ phép' },
      3: { color: 'volcano', text: 'Tạm ngưng' },
      4: { color: 'red', text: 'Đã nghỉ việc' },
    };
    const c = config[status] || { color: 'default', text: 'Không rõ' };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getShiftTag = (shiftName: string, _isNightShift: boolean, isOnCall: boolean) => {
    if (isOnCall) return <Tag color="red">Trực</Tag>;
    const lower = (shiftName || '').toLowerCase();
    if (lower.includes('sang') || lower.includes('morning')) return <Tag color="blue">Sáng</Tag>;
    if (lower.includes('chieu') || lower.includes('afternoon')) return <Tag color="orange">Chiều</Tag>;
    if (lower.includes('dem') || lower.includes('night')) return <Tag color="purple">Đêm</Tag>;
    return <Tag color="blue">{shiftName}</Tag>;
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayShifts = rosterAssignments.filter((s) => s.date && dayjs(s.date).format('YYYY-MM-DD') === dateStr);
    if (dayShifts.length === 0) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayShifts.slice(0, 2).map((shift) => (
          <li key={shift.id}>
            <Badge
              status={shift.isOnCall ? 'error' : shift.shiftName?.toLowerCase().includes('sang') ? 'processing' : 'warning'}
              text={<span style={{ fontSize: 11 }}>{shift.staffName?.split(' ').pop()}</span>}
            />
          </li>
        ))}
        {dayShifts.length > 2 && <li><span style={{ fontSize: 11, color: 'var(--t-2)' }}>+{dayShifts.length - 2} khác</span></li>}
      </ul>
    );
  };

  const licensedEmployees = employees.filter((e) => e.certifications && e.certifications.length > 0);

  const todayAssignments = rosterAssignments.filter((s) => s.date && dayjs(s.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD'));

  const staffOptions = employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }));

  // ─── Columns (DataTable) ──────────────────────────────────────────────────

  const employeeColumns: ColumnDef<StaffProfileDto>[] = [
    {
      key: 'employee', label: 'Nhân viên',
      render: (r) => (
        <div>
          <strong>{r.fullName}</strong>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.staffCode}</div>
        </div>
      ),
    },
    { key: 'position', label: 'Chức vụ', render: (r) => r.positionName || r.staffTypeName || '-' },
    { key: 'departmentName', label: 'Khoa/Phòng' },
    {
      key: 'license', label: 'Số CCHN',
      render: (r) => {
        const cert = r.certifications?.[0];
        if (!cert) return '-';
        const daysUntil = cert.expiryDate ? dayjs(cert.expiryDate).diff(dayjs(), 'day') : 999;
        return (
          <div>
            <div>{cert.licenseNumber}</div>
            {daysUntil <= 90 && daysUntil > 0 && <Tag color="orange">Còn {daysUntil} ngày</Tag>}
            {daysUntil <= 0 && <Tag color="red">Đã hết hạn</Tag>}
          </div>
        );
      },
    },
    { key: 'status', label: 'Trạng thái', width: 120, render: (r) => getStatusTag(r.employmentStatus) },
  ];

  const catalogColumns: ColumnDef<HRCatalogDto>[] = [
    { key: 'code', label: 'Mã', width: 100, code: true },
    { key: 'name', label: 'Tên' },
    { key: 'description', label: 'Mô tả' },
    { key: 'sortOrder', label: 'Thứ tự', width: 80, mono: true },
    { key: 'isActive', label: 'Trạng thái', width: 100, render: (r) => <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Hoạt động' : 'Ngưng'}</Tag> },
  ];

  const contractColumns: ColumnDef<StaffContractDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'contractType', label: 'Loại HĐ' },
    { key: 'contractNumber', label: 'Số HĐ', mono: true },
    { key: 'startDate', label: 'Từ ngày', render: (r) => r.startDate ? dayjs(r.startDate).format('DD/MM/YYYY') : '-' },
    { key: 'endDate', label: 'Đến ngày', render: (r) => r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : 'Vô thời hạn' },
    {
      key: 'status', label: 'Trạng thái',
      render: (r) => {
        if (r.daysUntilExpiry != null && r.daysUntilExpiry <= 90 && r.daysUntilExpiry > 0) return <Tag color="orange">Còn {r.daysUntilExpiry} ngày</Tag>;
        return <Tag color={r.status === 0 ? 'green' : r.status === 1 ? 'red' : 'default'}>{r.statusName}</Tag>;
      },
    },
  ];

  const attendanceColumns: ColumnDef<AttendanceRecordDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'workDate', label: 'Ngày', render: (r) => r.workDate ? dayjs(r.workDate).format('DD/MM/YYYY') : '-' },
    { key: 'shiftType', label: 'Ca' },
    { key: 'workHours', label: 'Giờ làm', mono: true },
    { key: 'overtimeHours', label: 'Tăng ca', mono: true },
    {
      key: 'status', label: 'Trạng thái',
      render: (r) => {
        const colors: Record<string, string> = { Present: 'green', Absent: 'red', Leave: 'orange', Holiday: 'blue', HalfDay: 'gold' };
        return <Tag color={colors[r.status] || 'default'}>{r.status}</Tag>;
      },
    },
  ];

  const attendanceSummaryColumns: ColumnDef<AttendanceSummaryDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'departmentName', label: 'Khoa' },
    { key: 'presentDays', label: 'Ngày công', mono: true },
    { key: 'absentDays', label: 'Vắng', mono: true },
    { key: 'leaveDays', label: 'Phép', mono: true },
    { key: 'totalOvertimeHours', label: 'Giờ tăng ca', mono: true },
  ];

  const leaveColumns: ColumnDef<LeaveRequestDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'leaveType', label: 'Loại' },
    { key: 'startDate', label: 'Từ ngày', render: (r) => r.startDate ? dayjs(r.startDate).format('DD/MM/YYYY') : '-' },
    { key: 'endDate', label: 'Đến ngày', render: (r) => r.endDate ? dayjs(r.endDate).format('DD/MM/YYYY') : '-' },
    { key: 'totalDays', label: 'Số ngày', mono: true },
    { key: 'reason', label: 'Lý do' },
    {
      key: 'status', label: 'Trạng thái',
      render: (r) => {
        const s = LEAVE_STATUS_NAMES[r.status] || { color: 'default', text: 'Không rõ' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ];

  const overtimeColumns: ColumnDef<OvertimeRecordDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'overtimeDate', label: 'Ngày', render: (r) => r.overtimeDate ? dayjs(r.overtimeDate).format('DD/MM/YYYY') : '-' },
    { key: 'hours', label: 'Số giờ', mono: true },
    { key: 'reason', label: 'Lý do' },
    {
      key: 'status', label: 'Trạng thái',
      render: (r) => {
        const colors = ['gold', 'green', 'red'];
        return <Tag color={colors[r.status] || 'default'}>{r.statusName}</Tag>;
      },
    },
  ];

  const awardColumns: ColumnDef<StaffAwardDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'awardType', label: 'Loại' },
    { key: 'title', label: 'Nội dung' },
    { key: 'awardDate', label: 'Ngày', render: (r) => r.awardDate ? dayjs(r.awardDate).format('DD/MM/YYYY') : '-' },
    { key: 'decisionNumber', label: 'Số QĐ', mono: true },
    { key: 'issuedBy', label: 'Cơ quan' },
  ];

  const disciplineColumns: ColumnDef<StaffDisciplineDto>[] = [
    { key: 'staff', label: 'Nhân viên', render: (r) => `${r.staffName} (${r.staffCode})` },
    { key: 'disciplineType', label: 'Hình thức' },
    { key: 'title', label: 'Nội dung' },
    { key: 'disciplineDate', label: 'Ngày', render: (r) => r.disciplineDate ? dayjs(r.disciplineDate).format('DD/MM/YYYY') : '-' },
    { key: 'expiryDate', label: 'Hết hạn', render: (r) => r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '-' },
    { key: 'isExpired', label: 'Trạng thái', render: (r) => r.isExpired ? <Tag color="green">Đã hết hiệu lực</Tag> : <Tag color="red">Còn hiệu lực</Tag> },
  ];

  const rosterShiftColumns: ColumnDef<RosterAssignmentDto>[] = [
    { key: 'staffName', label: 'Nhân viên' },
    { key: 'department', label: 'Khoa', render: (r) => employees.find((e) => e.id === r.staffId)?.departmentName || '-' },
    { key: 'date', label: 'Ngày', render: (r) => r.date ? dayjs(r.date).format('YYYY-MM-DD') : '-' },
    { key: 'shiftType', label: 'Ca', render: (r) => getShiftTag(r.shiftName, false, r.isOnCall) },
    { key: 'time', label: 'Thời gian', render: (r) => `${r.shiftStart || ''} - ${r.shiftEnd || ''}` },
  ];

  const trainingColumns: ColumnDef<CMESummaryDto>[] = [
    { key: 'staffName', label: 'Nhân viên' },
    { key: 'earnedCredits', label: 'Tổng số tiết', render: (r) => `${r.earnedCredits}/${r.requiredCredits}`, mono: true },
    { key: 'category1Credits', label: 'Loại 1', mono: true },
    { key: 'category2Credits', label: 'Loại 2', mono: true },
    { key: 'activitiesCount', label: 'Số hoạt động', mono: true },
    {
      key: 'status', label: 'Trạng thái',
      render: (r) => r.isCompliant ? <Tag color="green">Đủ tiết</Tag> : <Tag color="red">Thiếu {r.shortfall} tiết</Tag>,
    },
  ];

  const licenseColumns: ColumnDef<StaffProfileDto>[] = [
    { key: 'fullName', label: 'Nhân viên' },
    { key: 'position', label: 'Chức vụ', render: (r) => r.positionName || r.staffTypeName || '-' },
    { key: 'licenseNumber', label: 'Số CCHN', render: (r) => r.certifications?.[0]?.licenseNumber || '-', mono: true },
    {
      key: 'licenseExpiry', label: 'Ngày hết hạn',
      render: (r) => {
        const cert = r.certifications?.[0];
        if (!cert?.expiryDate) return '-';
        const daysUntil = dayjs(cert.expiryDate).diff(dayjs(), 'day');
        return <Tag color={daysUntil <= 0 ? 'red' : daysUntil <= 90 ? 'orange' : 'green'}>{cert.expiryDate}</Tag>;
      },
    },
  ];

  const deptReportColumns: ColumnDef<StaffByDepartmentReportDto>[] = [
    { key: 'departmentName', label: 'Khoa/Phòng', render: (r) => r.departmentName === 'Tổng cộng' ? <strong>{r.departmentName}</strong> : r.departmentName },
    { key: 'totalStaff', label: 'Tổng', mono: true, render: (r) => r.departmentName === 'Tổng cộng' ? <strong>{r.totalStaff}</strong> : r.totalStaff },
    { key: 'doctors', label: 'Bác sĩ', mono: true },
    { key: 'nurses', label: 'Điều dưỡng', mono: true },
    { key: 'technicians', label: 'KTV', mono: true },
    { key: 'others', label: 'Khác', mono: true },
  ];

  // Tổng cộng theo phòng — công thức verbatim từ v1 Table.summary
  const deptTotals = deptReport.reduce((acc, r) => ({
    total: acc.total + r.totalStaff,
    doctors: acc.doctors + r.doctors,
    nurses: acc.nurses + r.nurses,
    techs: acc.techs + r.technicians,
    others: acc.others + r.others,
  }), { total: 0, doctors: 0, nurses: 0, techs: 0, others: 0 });
  const deptReportRows: StaffByDepartmentReportDto[] = deptReport.length > 0
    ? [...deptReport, {
        departmentName: 'Tổng cộng',
        totalStaff: deptTotals.total,
        doctors: deptTotals.doctors,
        nurses: deptTotals.nurses,
        technicians: deptTotals.techs,
        others: deptTotals.others,
      }]
    : [];

  // ─── Employee pagination (client-side, thay antd Table pagination v1) ─────

  const empTotalPages = Math.max(1, Math.ceil(employees.length / EMP_PER_PAGE));
  const empPageSafe = Math.min(empPage, empTotalPages - 1);
  const empPaged = employees.slice(empPageSafe * EMP_PER_PAGE, (empPageSafe + 1) * EMP_PER_PAGE);

  // ─── KPI strip (verbatim số liệu từ v1 Statistic) ─────────────────────────

  const mgmtKpis: KpiItem[] = [
    { lbl: 'Đang làm việc', val: activeEmployees, tone: 'ok' },
    { lbl: 'CCHN sắp hết hạn', val: licenseExpiringSoon, tone: licenseExpiringSoon > 0 ? 'warn' : 'ok' },
    { lbl: 'CME chưa đủ', val: cmeIncomplete, tone: cmeIncomplete > 0 ? 'crit' : 'ok' },
    ...(dashboard ? [
      { lbl: 'Bác sĩ', val: dashboard.doctors },
      { lbl: 'Điều dưỡng', val: dashboard.nurses },
      { lbl: 'Ca trực hôm nay', val: dashboard.todayShifts },
      { lbl: 'Nghỉ phép', val: dashboard.onLeaveStaff },
    ] as KpiItem[] : []),
  ];

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const topTabs: TopTab<HrTab>[] = [
    { v: 'roster', l: 'Lịch trực tuần', ic: 'calendar' },
    { v: 'employees', l: 'Nhân sự', ic: 'users' },
    { v: 'catalogs', l: 'Danh mục' },
    { v: 'contracts', l: `Hợp đồng${expiringContractsList.length > 0 ? ` (${expiringContractsList.length})` : ''}` },
    { v: 'attendance', l: 'Chấm công' },
    { v: 'leave', l: 'Nghỉ phép' },
    { v: 'overtime', l: 'Làm thêm giờ' },
    { v: 'awards', l: 'Khen thưởng/KL' },
    { v: 'schedule', l: 'Lịch tháng' },
    { v: 'shifts', l: 'Phân ca' },
    { v: 'training', l: 'Đào tạo' },
    { v: 'licenses', l: `Chứng chỉ${expiringCerts.length > 0 ? ` (${expiringCerts.length})` : ''}` },
    { v: 'reports', l: 'Báo cáo', ic: 'chart' },
  ];

  // Lazy fetch theo tab — verbatim mapping từ v1 onTabClick
  const changeTab = (k: HrTab): void => {
    setTab(k);
    if (k === 'contracts') fetchContracts();
    if (k === 'leave') fetchLeave();
    if (k === 'attendance') fetchAttendance();
    if (k === 'overtime') fetchOvertime();
    if (k === 'awards') fetchAwardsDiscipline();
    if (k === 'reports') fetchReports(reportType);
  };

  const toolbarStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };

  return (
    <div className="hr-v2-page">
      <TopTabs<HrTab>
        tab={tab}
        setTab={changeTab}
        tabs={topTabs}
        actions={(
          <>
            <RefreshButton variant="default" onRefresh={() => { void fetchData(); }} loading={loading} />
            <Btn variant="primary" icon="plus" onClick={() => setIsAddEmployeeModalOpen(true)}>Thêm nhân viên</Btn>
          </>
        )}
      />

      {tab === 'roster' && (
        <>
          <div className="hr-v2-strip">
            <RotaStatCard label="Nhân sự" value={visibleStaff.length} meta={`${new Set(visibleStaff.map((member) => member.department)).size} khoa`} />
            <RotaStatCard label="Ca đã xếp" value={metrics.totalShifts} meta={`/${metrics.totalQuota} quota`} tone="info" />
            <RotaStatCard label="Ngày OT" value={metrics.totalOT} meta="vượt quota" tone={metrics.totalOT > 5 ? 'warn' : 'ok'} />
            <RotaStatCard label="Yêu cầu đổi" value={metrics.pending} meta="chờ duyệt" tone="warn" />
            <RotaStatCard label="Ca thiếu" value={metrics.understaffed} meta="<6 NS/ngày" tone={metrics.understaffed > 0 ? 'critical' : 'ok'} />
            <RotaStatCard label="Tuần" value={`T${week}/2026`} meta={`${weekStart.format('DD/MM')} - ${weekStart.add(6, 'day').format('DD/MM')}`} />
          </div>

          <div className="hr-v2-shell">
            <div className="hr-v2-toolbar">
              <div className="hr-v2-toolbar-left">
                <div className="hr-v2-search">
                  <TermIcon name="search" size={14} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm nhân sự..."
                  />
                </div>
                <Select
                  allowClear
                  className="hr-v2-select"
                  placeholder="Lọc theo khoa"
                  value={departmentFilter || undefined}
                  onChange={(value) => setDepartmentFilter(value ?? '')}
                  options={departments.map((department) => ({ value: department, label: department }))}
                />
                <button type="button" className="hr-v2-btn" onClick={() => setWeek((current) => current - 1)}>
                  <LeftOutlined />
                  Tuần trước
                </button>
                <button type="button" className="hr-v2-btn" onClick={() => setWeek((current) => current + 1)}>
                  Tuần sau
                  <RightOutlined />
                </button>
              </div>

              <div className="hr-v2-toolbar-right">
                <span
                  className={'hr-v2-btn'}
                  style={{
                    cursor: 'default',
                    background: usingMock ? 'var(--a-or-bg)' : 'var(--a-cy-bg)',
                    color:      usingMock ? 'var(--a-or-text)' : 'var(--a-cy-text)',
                  }}
                  title={usingMock ? 'Backend HR rỗng — đang dùng dữ liệu mẫu' : 'Đang hiển thị nhân sự thật từ backend'}
                >
                  {usingMock ? 'Demo' : 'Live'}
                </span>
                <button type="button" className="hr-v2-btn" onClick={() => setSwapModalOpen(true)}>
                  <SwapOutlined />
                  Yêu cầu đổi ca
                </button>
                <button
                  type="button"
                  className="hr-v2-btn"
                  title="Sao chép lịch từ tuần nguồn sang tuần đích"
                  onClick={() => {
                    // Pre-fill: source = previous week, target = current week
                    const prev = dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD');
                    const curr = dayjs(weekStart).format('YYYY-MM-DD');
                    setCopySource(prev);
                    setCopyTarget(curr);
                    setCopyWeekOpen(true);
                  }}
                >
                  <CopyOutlined />
                  Copy tuần trước
                </button>
                <button
                  type="button"
                  className="hr-v2-btn"
                  onClick={() => {
                    const header = 'Nhân sự,Mã NS,Vai trò,Khoa,' + DAYS.join(',');
                    const dataRows = visibleStaff.map((member) => {
                      const shifts = (rota[member.id] ?? []).map((s) => SHIFT_TYPES.find((t) => t.value === s)?.label || s);
                      return [member.name, member.id, member.role, member.department, ...shifts].join(',');
                    });
                    downloadCsv(
                      `lich-truc-tuan-${week}-${dayjs().format('YYYYMMDD')}.csv`,
                      [header, ...dataRows],
                    );
                    message.success(`Đã xuất CSV lịch trực tuần ${week} (${visibleStaff.length} nhân sự)`);
                  }}
                >
                  <DownloadOutlined />
                  Xuất Excel
                </button>
                <button
                  type="button"
                  className="hr-v2-btn primary"
                  disabled={commitLoading}
                  onClick={async () => {
                    if (!rosterId) {
                      message.warning('Không có lịch trực đang hoạt động để chốt (đang dùng dữ liệu mẫu)');
                      return;
                    }
                    setCommitLoading(true);
                    try {
                      await publishRoster(rosterId);
                      message.success('Đã chốt (publish) lịch trực tuần thành công');
                    } catch {
                      message.error('Chốt lịch trực thất bại');
                    } finally {
                      setCommitLoading(false);
                    }
                  }}
                >
                  <CheckOutlined />
                  {commitLoading ? 'Đang chốt…' : 'Chốt tuần'}
                </button>
              </div>
            </div>

            {swapRequests.some((request) => request.status === 'pending') && (
              <div className="hr-v2-alerts">
                <div className="hr-v2-alert-title">Yêu cầu đổi ca chờ duyệt</div>
                <div className="hr-v2-alert-list">
                  {swapRequests.filter((request) => request.status === 'pending').map((request) => {
                    const fromStaff = staffList.find((member) => member.id === request.from);
                    const toStaff = staffList.find((member) => member.id === request.to);
                    const shift = SHIFT_TYPES.find((item) => item.value === request.shift)!;
                    return (
                      <div key={request.id} className="hr-v2-alert-row">
                        <span className="mono">{request.id}</span>
                        <strong>{fromStaff?.name}</strong>
                        <span>→</span>
                        <strong>{toStaff?.name}</strong>
                        <span className="muted">· Ca {shift.label} · {dayjs(request.date).format('DD/MM/YYYY')} · "{request.reason}"</span>
                        <div className="hr-v2-alert-actions">
                          <button
                            type="button"
                            className="hr-v2-btn"
                            disabled={acting === `swap:${request.id}`}
                            onClick={() => cf(
                              `Từ chối yêu cầu đổi ca ${request.id} (${fromStaff?.name ?? request.from} → ${toStaff?.name ?? request.to})? Yêu cầu sẽ bị xoá khỏi danh sách.`,
                              () => { void rejectSwap(request.id); },
                              { tone: 'crit', confirm: 'Từ chối' },
                            )}
                          >
                            {acting === `swap:${request.id}` ? 'Đang xử lý…' : 'Từ chối'}
                          </button>
                          <button
                            type="button"
                            className="hr-v2-btn primary"
                            disabled={acting === `swap:${request.id}`}
                            onClick={() => { void approveSwap(request.id); }}
                          >
                            {acting === `swap:${request.id}` ? 'Đang xử lý…' : 'Duyệt'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hr-v2-table-wrap">
              <table className="hr-v2-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nhân sự</th>
                    {DAYS.map((day, index) => (
                      <th key={day}>
                        {day}
                        <div>{weekStart.add(index, 'day').format('DD/MM')}</div>
                      </th>
                    ))}
                    <th>Ca</th>
                    <th>OT</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map((member) => {
                    const total = shiftCount(member.id);
                    const overtime = overtimeCount(member.id);
                    return (
                      <tr key={member.id}>
                        <td className="sticky-col clickable" onClick={() => setSelectedStaff(member)}>
                          <div className="hr-v2-person">
                            <strong>{member.name}</strong>
                            <span>{member.id} · {member.role} · {member.department}</span>
                          </div>
                        </td>
                        {(rota[member.id] ?? []).map((shiftValue, dayIndex) => {
                          const shift = SHIFT_TYPES.find((item) => item.value === shiftValue)!;
                          return (
                            <td key={`${member.id}-${dayIndex}`}>
                              <button
                                type="button"
                                className="hr-v2-shift"
                                style={{ background: shift.soft, borderColor: shift.border, color: shift.text }}
                                onClick={() => cycleShift(member.id, dayIndex)}
                              >
                                <strong>{shift.label}</strong>
                                <span>{shift.time}</span>
                              </button>
                            </td>
                          );
                        })}
                        <td className="mono strong">{total}/{member.quota}</td>
                        <td className={`mono strong ${overtime > 0 ? 'warn' : 'muted'}`}>{overtime > 0 ? `+${overtime}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="sticky-col">Σ NS theo ca</td>
                    {dayStats.map((stats, index) => (
                      <td key={index}>
                        <MonthStat
                          morning={stats.morning}
                          evening={stats.evening}
                          night={stats.night}
                          total={stats.morning + stats.evening + stats.night}
                        />
                      </td>
                    ))}
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="hr-v2-legend">
              <span className="label">Chú thích</span>
              {SHIFT_TYPES.map((shift) => (
                <span key={shift.value} className="legend-item">
                  <span className="legend-dot" style={{ background: shift.soft, borderColor: shift.border }} />
                  <b>{shift.label}</b>
                  {shift.time !== '—' && <small>{shift.time}</small>}
                </span>
              ))}
              <span className="hint">Click ô để đổi ca · Click tên để xem chi tiết</span>
            </div>
          </div>
        </>
      )}

      {tab !== 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <KpiStrip items={mgmtKpis} />

          {tab === 'employees' && (
            <>
              <DataTable<StaffProfileDto>
                columns={employeeColumns}
                data={empPaged}
                rowKey={(r) => r.id}
                onRowClick={(r) => setProfileStaff(r)}
                actions={(r) => <ActBtn ic="eye" title="Chi tiết" onClick={() => setProfileStaff(r)} />}
                empty={loading ? 'Đang tải…' : 'Không có dữ liệu'}
              />
              <Pager page={empPageSafe} totalPages={empTotalPages} setPage={setEmpPage} total={employees.length} perPage={EMP_PER_PAGE} />
            </>
          )}

          {tab === 'catalogs' && (
            <>
              <div style={toolbarStyle}>
                <Filter
                  value={selectedCatalogType}
                  onChange={setSelectedCatalogType}
                  options={CATALOG_TYPES.map((c) => ({ v: c.value, l: c.label }))}
                />
                <Btn variant="primary" icon="plus" onClick={() => { catalogForm.resetFields(); setIsCatalogModalOpen(true); }}>Thêm mới</Btn>
              </div>
              <DataTable<HRCatalogDto>
                columns={catalogColumns}
                data={catalogs}
                rowKey={(r) => r.id}
                loading={tabLoading}
                actions={(r) => (
                  <>
                    <ActBtn ic="edit" title="Sửa" onClick={() => { catalogForm.setFieldsValue(r); setIsCatalogModalOpen(true); }} />
                    <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => cf('Xóa danh mục này?', () => { void handleDeleteCatalog(r.id); }, { tone: 'crit' })} />
                  </>
                )}
              />
            </>
          )}

          {tab === 'contracts' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="plus" onClick={() => { contractForm.resetFields(); void fetchContracts(); setIsContractModalOpen(true); }}>Thêm hợp đồng</Btn>
              </div>
              {expiringContractsList.length > 0 && (
                <Alert title={`${expiringContractsList.length} hợp đồng sắp hết hạn (90 ngày)`} type="warning" showIcon />
              )}
              <DataTable<StaffContractDto> columns={contractColumns} data={contracts} rowKey={(r) => r.id} loading={tabLoading} />
            </>
          )}

          {tab === 'attendance' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="plus" onClick={() => { attendanceForm.resetFields(); void fetchAttendance(); setIsAttendanceModalOpen(true); }}>Ghi chấm công</Btn>
                <span style={{ flex: 1 }} />
                <Btn size="sm" active={attView === 'records'} onClick={() => setAttView('records')}>Chi tiết</Btn>
                <Btn size="sm" active={attView === 'summary'} onClick={() => setAttView('summary')}>Tổng hợp tháng</Btn>
              </div>
              {attView === 'records' ? (
                <DataTable<AttendanceRecordDto> columns={attendanceColumns} data={attendanceRecords} rowKey={(r) => r.id} loading={tabLoading} />
              ) : (
                <DataTable<AttendanceSummaryDto> columns={attendanceSummaryColumns} data={attendanceSummaries} rowKey={(r) => r.staffId} loading={tabLoading} />
              )}
            </>
          )}

          {tab === 'leave' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="plus" onClick={() => { leaveForm.resetFields(); void fetchLeave(); setIsLeaveModalOpen(true); }}>Tạo đơn nghỉ</Btn>
              </div>
              <DataTable<LeaveRequestDto>
                columns={leaveColumns}
                data={leaveRequests}
                rowKey={(r) => r.id}
                loading={tabLoading}
                actions={(r) => r.status === 0 ? (
                  <>
                    <ActBtn ic="check" title="Duyệt" loading={acting === `leave:${r.id}`} onClick={() => { void handleApproveLeave(r.id, true); }} />
                    <ActBtn
                      ic="x"
                      title="Từ chối"
                      tone="crit"
                      loading={acting === `leave:${r.id}`}
                      onClick={() => cf(
                        'Từ chối đơn nghỉ phép này? Nhân viên sẽ nhận kết quả không được duyệt.',
                        () => { void handleApproveLeave(r.id, false); },
                        { tone: 'crit', confirm: 'Từ chối' },
                      )}
                    />
                  </>
                ) : null}
              />
            </>
          )}

          {tab === 'overtime' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="plus" onClick={() => { overtimeForm.resetFields(); void fetchOvertime(); setIsOvertimeModalOpen(true); }}>Tạo yêu cầu</Btn>
              </div>
              <DataTable<OvertimeRecordDto>
                columns={overtimeColumns}
                data={overtimeRecords}
                rowKey={(r) => r.id}
                loading={tabLoading}
                actions={(r) => r.status === 0 ? (
                  <>
                    <ActBtn ic="check" title="Duyệt" loading={acting === `overtime:${r.id}`} onClick={() => { void handleApproveOvertime(r.id, true); }} />
                    <ActBtn
                      ic="x"
                      title="Từ chối"
                      tone="crit"
                      loading={acting === `overtime:${r.id}`}
                      onClick={() => cf(
                        'Từ chối yêu cầu làm thêm giờ này? Giờ làm thêm sẽ không được tính công.',
                        () => { void handleApproveOvertime(r.id, false); },
                        { tone: 'crit', confirm: 'Từ chối' },
                      )}
                    />
                  </>
                ) : null}
              />
            </>
          )}

          {tab === 'awards' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="star" onClick={() => { awardForm.resetFields(); void fetchAwardsDiscipline(); setIsAwardModalOpen(true); }}>Thêm khen thưởng</Btn>
                <Btn variant="crit" icon="alert" onClick={() => { disciplineForm.resetFields(); void fetchAwardsDiscipline(); setIsDisciplineModalOpen(true); }}>Thêm kỷ luật</Btn>
                <span style={{ flex: 1 }} />
                <Btn size="sm" active={awardView === 'awards'} onClick={() => setAwardView('awards')}>Khen thưởng</Btn>
                <Btn size="sm" active={awardView === 'disciplines'} onClick={() => setAwardView('disciplines')}>Kỷ luật</Btn>
              </div>
              {awardView === 'awards' ? (
                <DataTable<StaffAwardDto> columns={awardColumns} data={awards} rowKey={(r) => r.id} loading={tabLoading} />
              ) : (
                <DataTable<StaffDisciplineDto> columns={disciplineColumns} data={disciplines} rowKey={(r) => r.id} loading={tabLoading} />
              )}
            </>
          )}

          {tab === 'schedule' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'start' }}>
              <div style={{ background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 8, overflowX: 'auto' }}>
                <Calendar cellRender={dateCellRender} />
              </div>
              <div style={{ background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>Lịch trực hôm nay</strong>
                  <Btn size="sm" onClick={() => setIsShiftModalOpen(true)}>Thêm</Btn>
                </div>
                <div>
                  {todayAssignments.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      {getShiftTag(item.shiftName, false, item.isOnCall)}
                      <span>{item.staffName}</span>
                    </div>
                  ))}
                  {todayAssignments.length === 0 && (
                    <span style={{ color: 'var(--t-2)' }}>Không có lịch trực hôm nay</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'shifts' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="calendar" onClick={() => setIsShiftModalOpen(true)}>Phân ca mới</Btn>
              </div>
              <DataTable<RosterAssignmentDto> columns={rosterShiftColumns} data={rosterAssignments} rowKey={(r) => r.id} loading={loading} />
            </>
          )}

          {tab === 'training' && (
            <>
              <div style={toolbarStyle}>
                <Btn variant="primary" icon="plus" onClick={() => setIsTrainingModalOpen(true)}>Đăng ký đào tạo</Btn>
              </div>
              <DataTable<CMESummaryDto> columns={trainingColumns} data={cmeNonCompliant} rowKey={(r) => r.staffId} loading={loading} />
            </>
          )}

          {tab === 'licenses' && (
            <DataTable<StaffProfileDto> columns={licenseColumns} data={licensedEmployees} rowKey={(r) => r.id} loading={loading} />
          )}

          {tab === 'reports' && (
            <>
              <div style={toolbarStyle}>
                <Filter
                  value={reportType}
                  onChange={(v) => { setReportType(v); void fetchReports(v); }}
                  options={[
                    { v: 'department', l: 'Nhân sự theo phòng' },
                    { v: 'attendance', l: 'Báo cáo chấm công' },
                    { v: 'leave', l: 'Báo cáo nghỉ phép' },
                    { v: 'overtime', l: 'Báo cáo làm thêm giờ' },
                    { v: 'movement', l: 'Biến động nhân sự' },
                  ]}
                />
                <Btn icon="chart" onClick={() => { void fetchReports(reportType); }}>Xem báo cáo</Btn>
              </div>

              {reportType === 'department' && (
                <DataTable<StaffByDepartmentReportDto>
                  columns={deptReportColumns}
                  data={deptReportRows}
                  rowKey={(r) => r.departmentName}
                  loading={tabLoading}
                />
              )}

              {reportType === 'attendance' && attendanceReport && (
                <KpiStrip items={[
                  { lbl: 'Tổng NV', val: attendanceReport.totalStaff },
                  { lbl: 'TB ngày công', val: attendanceReport.avgWorkDays },
                  { lbl: 'TB tăng ca (giờ)', val: attendanceReport.avgOvertimeHours },
                  { lbl: 'Tổng ngày vắng', val: attendanceReport.totalAbsentDays },
                ]} />
              )}

              {reportType === 'leave' && leaveReport && (
                <KpiStrip items={[
                  { lbl: 'Tổng đơn', val: leaveReport.totalRequests },
                  { lbl: 'Đã duyệt', val: leaveReport.approvedRequests, tone: 'ok' },
                  { lbl: 'Từ chối', val: leaveReport.rejectedRequests, tone: 'crit' },
                  { lbl: 'Chờ duyệt', val: leaveReport.pendingRequests, tone: 'warn' },
                ]} />
              )}

              {reportType === 'overtime' && overtimeReport && (
                <KpiStrip items={[
                  { lbl: 'Tổng yêu cầu', val: overtimeReport.totalRequests },
                  { lbl: 'Tổng giờ', val: overtimeReport.totalHours },
                  { lbl: 'Giờ đã duyệt', val: overtimeReport.approvedHours, tone: 'ok' },
                ]} />
              )}

              {reportType === 'movement' && movementReport && (
                <KpiStrip items={[
                  { lbl: 'Tuyển mới', val: movementReport.newHires, tone: 'ok' },
                  { lbl: 'Nghỉ việc', val: movementReport.resignations, tone: 'crit' },
                  { lbl: 'HĐ hết hạn', val: movementReport.contractsExpired, tone: 'warn' },
                  { lbl: 'HĐ gia hạn', val: movementReport.contractsRenewed },
                ]} />
              )}
            </>
          )}
        </div>
      )}

      <Drawer
        open={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        placement="right"
        size="large"
        title={selectedStaff?.name}
      >
        {selectedStaff && (
          <div className="hr-v2-drawer">
            <div className="hr-v2-drawer-head">
              <div>
                <strong>{selectedStaff.id}</strong>
                <span>{selectedStaff.role} · {selectedStaff.department}</span>
              </div>
            </div>
            <div className="hr-v2-mini-grid">
              <MiniStat label="Ca tuần này" value={shiftCount(selectedStaff.id)} />
              <MiniStat label="Quota" value={selectedStaff.quota} />
              <MiniStat label="OT" value={overtimeCount(selectedStaff.id)} tone={overtimeCount(selectedStaff.id) > 0 ? 'warn' : 'ok'} />
            </div>
            <div className="hr-v2-section">
              <div className="hr-v2-section-title">Lịch trong tuần</div>
              <div className="hr-v2-drawer-grid">
                {(rota[selectedStaff.id] ?? []).map((shiftValue, index) => {
                  const shift = SHIFT_TYPES.find((item) => item.value === shiftValue)!;
                  return (
                    <div key={index} className="hr-v2-drawer-shift" style={{ background: shift.soft, borderColor: shift.border }}>
                      <span>{DAYS[index]} · {weekStart.add(index, 'day').format('DD/MM')}</span>
                      <strong style={{ color: shift.text }}>{shift.label}</strong>
                      <small>{shift.time}</small>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hr-v2-drawer-actions">
              <button
                type="button"
                className="hr-v2-btn"
                onClick={() => {
                  setSelectedStaff(null);
                  navigate('/v2/employee-profile');
                }}
              >
                <UserOutlined />
                Hồ sơ NS
              </button>
              {/* Nút "Sửa lịch" ẩn onClick — hướng dẫn đã có trong tooltip; click ô bảng là cách thật */}
              <button
                type="button"
                className="hr-v2-btn primary"
                title="Click ô ca trong bảng để đổi ca trực tiếp"
                style={{ cursor: 'default', opacity: 0.6 }}
              >
                <EditOutlined />
                Sửa lịch
              </button>
              <button
                type="button"
                className="hr-v2-btn"
                onClick={() => selectedStaff && openPrintWindow(buildEmployeeCardHtml(selectedStaff), { focus: true, print: { delayMs: 500 } })}
              >
                <PrinterOutlined />
                In hồ sơ
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Drawer chi tiết nhân viên (port từ v1 Detail Modal) */}
      <DrawerShell
        open={!!profileStaff}
        onClose={() => setProfileStaff(null)}
        title={profileStaff?.fullName || 'Chi tiết nhân viên'}
        sub={profileStaff ? `${profileStaff.staffCode} · ${profileStaff.departmentName}` : undefined}
        size="lg"
        footer={(
          <>
            <Btn icon="print" onClick={executePrintEmployeeCard}>In hồ sơ</Btn>
            <Btn onClick={() => setProfileStaff(null)}>Đóng</Btn>
          </>
        )}
      >
        {profileStaff && (
          <>
            <DrSec title="Thông tin chung">
              {profileStaff.photoUrl && (
                <img src={profileStaff.photoUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
              )}
              <DrField lbl="Mã NV">{profileStaff.staffCode}</DrField>
              <DrField lbl="Trạng thái">{getStatusTag(profileStaff.employmentStatus)}</DrField>
              <DrField lbl="Họ tên">{profileStaff.fullName}</DrField>
              <DrField lbl="Chức vụ">{profileStaff.positionName || '-'}</DrField>
              <DrField lbl="Khoa/Phòng">{profileStaff.departmentName}</DrField>
            </DrSec>
            <DrSec title="Chứng chỉ hành nghề">
              {profileStaff.certifications?.length ? profileStaff.certifications.map((cert) => (
                <div key={cert.id} style={{ marginBottom: 8 }}>
                  <DrField lbl="Số CCHN">{cert.licenseNumber}</DrField>
                  <DrField lbl="Hết hạn">{cert.expiryDate || '-'}</DrField>
                </div>
              )) : <span style={{ color: 'var(--t-2)' }}>Chưa có chứng chỉ</span>}
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* Modal sao chép tuần */}
      <Modal
        open={copyWeekOpen}
        title="Sao chép lịch trực theo tuần"
        onCancel={() => setCopyWeekOpen(false)}
        confirmLoading={copyWeekLoading}
        okText="Sao chép"
        cancelText="Huỷ"
        onOk={async () => {
          if (!copyWeekForm.validate({ source: copySource, target: copyTarget })) return;
          setCopyWeekLoading(true);
          try {
            await copyWeekRoster({
              departmentId: '', // truyền rỗng = toàn viện; backend hỗ trợ
              sourceWeekStart: copySource,
              targetWeekStart: copyTarget,
              overwriteExisting: true,
            });
            message.success(`Đã sao chép lịch từ tuần ${dayjs(copySource).format('DD/MM')} → ${dayjs(copyTarget).format('DD/MM')}`);
            setCopyWeekOpen(false);
          } catch {
            message.error('Sao chép lịch tuần thất bại');
          } finally {
            setCopyWeekLoading(false);
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-14)', marginTop: 'var(--space-8)' }}>
          <Field label="Tuần nguồn (ISO date đầu tuần, T2)" required error={copyWeekForm.errors.source}>
            <input
              type="date"
              value={copySource}
              style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
              onChange={(e) => { setCopySource(e.target.value); copyWeekForm.clear('source'); }}
            />
          </Field>
          <Field label="Tuần đích (ISO date đầu tuần, T2)" required error={copyWeekForm.errors.target}>
            <input
              type="date"
              value={copyTarget}
              style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
              onChange={(e) => { setCopyTarget(e.target.value); copyWeekForm.clear('target'); }}
            />
          </Field>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            Lịch tuần đích sẽ bị ghi đè. Nhập ngày T2 (thứ Hai) của mỗi tuần.
          </div>
        </div>
      </Modal>

      <Modal
        open={swapModalOpen}
        title="Yêu cầu đổi ca"
        onCancel={() => setSwapModalOpen(false)}
        onOk={() => { if (swapModalForm.validate(swapForm)) submitSwapRequest(); }}
        okText="Gửi yêu cầu"
        cancelText="Huỷ"
      >
        <div className="hr-v2-form">
          <Field label="Người trực" required error={swapModalForm.errors.from}>
            <Select
              value={swapForm.from || undefined}
              placeholder="Chọn nhân sự"
              onChange={(value) => { setSwapForm((current) => ({ ...current, from: value })); swapModalForm.clear('from'); }}
              options={staffList.map((member) => ({ value: member.id, label: member.name }))}
            />
          </Field>
          <Field label="Người thay" required error={swapModalForm.errors.to}>
            <Select
              value={swapForm.to || undefined}
              placeholder="Chọn người thay"
              onChange={(value) => { setSwapForm((current) => ({ ...current, to: value })); swapModalForm.clear('to'); }}
              options={staffList.map((member) => ({ value: member.id, label: member.name }))}
            />
          </Field>
          <Field label="Ngày" required error={swapModalForm.errors.date}>
            <input
              type="date"
              value={swapForm.date}
              onChange={(event) => { setSwapForm((current) => ({ ...current, date: event.target.value })); swapModalForm.clear('date'); }}
            />
          </Field>
          <label>
            <span>Ca trực</span>
            <Select
              value={swapForm.shift}
              onChange={(value) => setSwapForm((current) => ({ ...current, shift: value }))}
              options={SHIFT_TYPES.filter((shift) => shift.value !== 'off').map((shift) => ({
                value: shift.value,
                label: `${shift.label} (${shift.time})`,
              }))}
            />
          </label>
          <Field className="full" label="Lý do" required error={swapModalForm.errors.reason}>
            <textarea
              rows={4}
              value={swapForm.reason}
              onChange={(event) => { setSwapForm((current) => ({ ...current, reason: event.target.value })); swapModalForm.clear('reason'); }}
              placeholder="Mô tả lý do cần đổi ca..."
            />
          </Field>
        </div>
      </Modal>

      {/* ─── Modals ported từ v1 ─────────────────────────────────────────── */}

      {/* Catalog Modal */}
      <Modal title="Danh mục nhân sự" open={isCatalogModalOpen} onCancel={() => setIsCatalogModalOpen(false)} onOk={() => catalogForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={catalogForm} layout="vertical" onFinish={handleSaveCatalog} scrollToFirstError>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="isActive" label="Trạng thái" initialValue={true}>
            <Select options={[{ value: true, label: 'Hoạt động' }, { value: false, label: 'Ngưng' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Contract Modal */}
      <Modal title="Hợp đồng lao động" open={isContractModalOpen} onCancel={() => setIsContractModalOpen(false)} onOk={() => contractForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={contractForm} layout="vertical" onFinish={handleSaveContract} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="contractType" label="Loại HĐ" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Probation', label: 'Thử việc' },
              { value: 'FixedTerm', label: 'Xác định thời hạn' },
              { value: 'Indefinite', label: 'Không xác định thời hạn' },
              { value: 'Seasonal', label: 'Thời vụ' },
            ]} />
          </Form.Item>
          <Form.Item name="contractNumber" label="Số hợp đồng" rules={[{ required: true }]}><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="endDate" label="Đến ngày"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Leave Modal */}
      <Modal title="Tạo đơn nghỉ phép" open={isLeaveModalOpen} onCancel={() => setIsLeaveModalOpen(false)} onOk={() => leaveForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={leaveForm} layout="vertical" onFinish={handleCreateLeave} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="leaveType" label="Loại nghỉ" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Annual', label: 'Phép năm' },
              { value: 'Sick', label: 'Nghỉ ốm' },
              { value: 'Maternity', label: 'Thai sản' },
              { value: 'Unpaid', label: 'Không lương' },
              { value: 'Compassionate', label: 'Việc riêng' },
              { value: 'Study', label: 'Học tập' },
            ]} />
          </Form.Item>
          <Form.Item name="dates" label="Thời gian" rules={[{ required: true }]}><RangePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Attendance Modal */}
      <Modal title="Ghi chấm công" open={isAttendanceModalOpen} onCancel={() => setIsAttendanceModalOpen(false)} onOk={() => attendanceForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={attendanceForm} layout="vertical" onFinish={handleRecordAttendance} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="workDate" label="Ngày làm việc" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Morning', label: 'Sáng' },
              { value: 'Afternoon', label: 'Chiều' },
              { value: 'Night', label: 'Đêm' },
              { value: 'AllDay', label: 'Cả ngày' },
            ]} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="workHours" label="Giờ làm" initialValue={8}><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="overtimeHours" label="Tăng ca" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="status" label="Trạng thái" initialValue="Present">
            <Select options={[
              { value: 'Present', label: 'Có mặt' },
              { value: 'Absent', label: 'Vắng' },
              { value: 'Leave', label: 'Nghỉ phép' },
              { value: 'Holiday', label: 'Nghỉ lễ' },
              { value: 'HalfDay', label: 'Nửa ngày' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Overtime Modal */}
      <Modal title="Yêu cầu làm thêm giờ" open={isOvertimeModalOpen} onCancel={() => setIsOvertimeModalOpen(false)} onOk={() => overtimeForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={overtimeForm} layout="vertical" onFinish={handleCreateOvertime} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="overtimeDate" label="Ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="hours" label="Số giờ" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0.5} max={12} step={0.5} /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Award Modal */}
      <Modal title="Khen thưởng" open={isAwardModalOpen} onCancel={() => setIsAwardModalOpen(false)} onOk={() => awardForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={awardForm} layout="vertical" onFinish={handleSaveAward} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="awardType" label="Loại khen thưởng" rules={[{ required: true }]}>
            <Select options={[
              { value: 'LDTT', label: 'Lao động tiên tiến' },
              { value: 'CSTT', label: 'Chiến sĩ thi đua cơ sở' },
              { value: 'BK', label: 'Bằng khen' },
              { value: 'GK', label: 'Giấy khen' },
            ]} />
          </Form.Item>
          <Form.Item name="title" label="Nội dung" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="awardDate" label="Ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="decisionNumber" label="Số quyết định"><Input /></Form.Item>
          <Form.Item name="issuedBy" label="Cơ quan cấp"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Discipline Modal */}
      <Modal title="Kỷ luật" open={isDisciplineModalOpen} onCancel={() => setIsDisciplineModalOpen(false)} onOk={() => disciplineForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={disciplineForm} layout="vertical" onFinish={handleSaveDiscipline} scrollToFirstError>
          <Form.Item name="staffId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="disciplineType" label="Hình thức" rules={[{ required: true }]}>
            <Select options={[
              { value: 'KT', label: 'Khiển trách' },
              { value: 'CN', label: 'Cảnh cáo' },
              { value: 'CC', label: 'Cách chức' },
              { value: 'BV', label: 'Buộc thôi việc' },
            ]} />
          </Form.Item>
          <Form.Item name="title" label="Nội dung" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="disciplineDate" label="Ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="expiryDate" label="Hết hiệu lực"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="decisionNumber" label="Số quyết định"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Shift Modal */}
      <Modal title="Phân ca trực" open={isShiftModalOpen} onCancel={() => setIsShiftModalOpen(false)} onOk={() => shiftForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={shiftForm} layout="vertical" onFinish={handleAddShift} scrollToFirstError>
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
            <Select options={shiftDefs.length > 0
              ? shiftDefs.map((sd) => ({ value: sd.id, label: `${sd.name} (${sd.startTime} - ${sd.endTime})` }))
              : [
                { value: 'morning', label: 'Ca sáng (07:00 - 14:00)' },
                { value: 'afternoon', label: 'Ca chiều (14:00 - 21:00)' },
                { value: 'night', label: 'Ca đêm (21:00 - 07:00)' },
                { value: 'on_call', label: 'Trực' },
              ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Training Modal */}
      <Modal title="Đăng ký đào tạo" open={isTrainingModalOpen} onCancel={() => setIsTrainingModalOpen(false)} onOk={() => trainingForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting}>
        <Form form={trainingForm} layout="vertical" onFinish={handleAddTraining} scrollToFirstError>
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="trainingName" label="Tên khóa học" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="trainingType" label="Loại" rules={[{ required: true }]}>
            <Select options={[
              { value: 'Conference', label: 'Hội nghị' },
              { value: 'Workshop', label: 'Hội thảo' },
              { value: 'Course', label: 'Khóa học' },
              { value: 'SelfStudy', label: 'Tự học' },
            ]} />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="credits" label="Số tiết"><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      {/* Add Employee Modal */}
      <Modal title="Thêm nhân viên mới" open={isAddEmployeeModalOpen} onCancel={() => setIsAddEmployeeModalOpen(false)} onOk={() => employeeForm.submit()} okText="Lưu" cancelText="Hủy" confirmLoading={submitting} width={600}>
        <Form form={employeeForm} layout="vertical" onFinish={handleAddEmployee} scrollToFirstError>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="staffCode" label="Mã nhân viên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="gender" label="Giới tính">
              <Select options={[{ value: 'Male', label: 'Nam' }, { value: 'Female', label: 'Nữ' }]} />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="staffType" label="Loại nhân viên" rules={[{ required: true }]}><Select options={POSITIONS} /></Form.Item>
            <Form.Item name="specialty" label="Chuyên khoa"><Input /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
            <Form.Item name="email" label="Email"><Input /></Form.Item>
          </div>
          <Form.Item name="hireDate" label="Ngày vào làm"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

type RotaStatCardProps = {
  label: string;
  value: string | number;
  meta: string;
  tone?: 'critical' | 'warn' | 'info' | 'ok';
};

const RotaStatCard: React.FC<RotaStatCardProps> = ({ label, value, meta, tone }) => (
  <div className={`hr-v2-strip-cell ${tone ?? ''}`.trim()}>
    <span className="label">{label}</span>
    <strong>{value}</strong>
    <span className="meta">{meta}</span>
  </div>
);

type MiniStatProps = {
  label: string;
  value: string | number;
  tone?: 'warn' | 'ok';
};

const MiniStat: React.FC<MiniStatProps> = ({ label, value, tone }) => (
  <div className={`hr-v2-mini-stat ${tone ?? ''}`.trim()}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

type MonthStatProps = {
  morning: number;
  evening: number;
  night: number;
  total: number;
};

const MonthStat: React.FC<MonthStatProps> = ({ morning, evening, night, total }) => (
  <div className="hr-v2-day-stats">
    <div>
      <span className="morning">{morning}</span>
      <span>·</span>
      <span className="evening">{evening}</span>
      <span>·</span>
      <span className="night">{night}</span>
    </div>
    <strong className={total < 6 ? 'warn' : ''}>Σ {total}</strong>
  </div>
);

export default HRV2;
