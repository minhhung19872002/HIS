import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Avatar,
  Calendar,
  Badge,
  message,
  Divider,
  Spin,
  InputNumber,
  Popconfirm,
  Alert,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  PrinterOutlined,
  PlusOutlined,
  WarningOutlined,
  ScheduleOutlined,
  ReloadOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  getStaff,
  getShiftDefinitions,
  getDashboard,
  createStaff,
  generateRoster,
  getRoster,
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
} from '../api/medicalHR';
import type {
  StaffProfileDto,
  RosterAssignmentDto,
  CMESummaryDto,
  MedicalHRDashboardDto,
  CertificationDto,
  ShiftDefinitionDto,
  HRCatalogDto,
  StaffContractDto,
  LeaveRequestDto,
  AttendanceRecordDto,
  AttendanceSummaryDto,
  OvertimeRecordDto,
  StaffAwardDto,
  StaffDisciplineDto,
  StaffByDepartmentReportDto,
  AttendanceReportDto,
  LeaveReportDto,
  OvertimeReportDto,
  StaffMovementReportDto,
} from '../api/medicalHR';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

const HR: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<StaffProfileDto[]>([]);
  const [rosterAssignments, setRosterAssignments] = useState<RosterAssignmentDto[]>([]);
  const [cmeNonCompliant, setCmeNonCompliant] = useState<CMESummaryDto[]>([]);
  const [dashboard, setDashboard] = useState<MedicalHRDashboardDto | null>(null);
  const [expiringCerts, setExpiringCerts] = useState<CertificationDto[]>([]);
  const [shiftDefs, setShiftDefs] = useState<ShiftDefinitionDto[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffProfileDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [shiftForm] = Form.useForm();
  const [trainingForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  // New states for enhanced modules
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

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecordDto[]>([]);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeForm] = Form.useForm();

  const [awards, setAwards] = useState<StaffAwardDto[]>([]);
  const [disciplines, setDisciplines] = useState<StaffDisciplineDto[]>([]);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [awardForm] = Form.useForm();
  const [disciplineForm] = Form.useForm();

  const [deptReport, setDeptReport] = useState<StaffByDepartmentReportDto[]>([]);
  const [attendanceReport, setAttendanceReportData] = useState<AttendanceReportDto | null>(null);
  const [leaveReport, setLeaveReportData] = useState<LeaveReportDto | null>(null);
  const [overtimeReport, setOvertimeReportData] = useState<OvertimeReportDto | null>(null);
  const [movementReport, setMovementReportData] = useState<StaffMovementReportDto | null>(null);
  const [reportType, setReportType] = useState('department');

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
      }

      if (results[3].status === 'fulfilled') {
        const certData = results[3].value?.data;
        setExpiringCerts(Array.isArray(certData) ? certData : []);
      }

      if (results[4].status === 'fulfilled') {
        const shiftData = results[4].value?.data;
        setShiftDefs(Array.isArray(shiftData) ? shiftData : []);
      }

      if (results[5].status === 'fulfilled') {
        const rosterData = results[5].value?.data;
        if (rosterData && rosterData.staffAssignments) {
          setRosterAssignments(rosterData.staffAssignments);
        }
      }
    } catch {
      message.warning('Có lỗi khi tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch catalogs when type changes
  const fetchCatalogs = useCallback(async (type: string) => {
    try {
      const res = await getCatalogs(type);
      setCatalogs(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setCatalogs([]);
    }
  }, []);

  useEffect(() => {
    fetchCatalogs(selectedCatalogType);
  }, [selectedCatalogType, fetchCatalogs]);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    try {
      const [contractsRes, expiringRes] = await Promise.allSettled([
        getStaffContracts(),
        getExpiringContracts(90),
      ]);
      if (contractsRes.status === 'fulfilled') setContracts(Array.isArray(contractsRes.value?.data) ? contractsRes.value.data : []);
      if (expiringRes.status === 'fulfilled') setExpiringContractsList(Array.isArray(expiringRes.value?.data) ? expiringRes.value.data : []);
    } catch { /* ignore */ }
  }, []);

  // Fetch leave
  const fetchLeave = useCallback(async () => {
    try {
      const res = await getLeaveRequests();
      setLeaveRequests(Array.isArray(res?.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  // Fetch attendance
  const fetchAttendance = useCallback(async () => {
    try {
      const now = dayjs();
      const [recRes, sumRes] = await Promise.allSettled([
        getAttendance(undefined, now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')),
        getAttendanceSummary(now.year(), now.month() + 1),
      ]);
      if (recRes.status === 'fulfilled') setAttendanceRecords(Array.isArray(recRes.value?.data) ? recRes.value.data : []);
      if (sumRes.status === 'fulfilled') setAttendanceSummaries(Array.isArray(sumRes.value?.data) ? sumRes.value.data : []);
    } catch { /* ignore */ }
  }, []);

  // Fetch overtime
  const fetchOvertime = useCallback(async () => {
    try {
      const res = await getOvertimeRequests();
      setOvertimeRecords(Array.isArray(res?.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  // Fetch awards & discipline
  const fetchAwardsDiscipline = useCallback(async () => {
    try {
      const [aw, di] = await Promise.allSettled([getStaffAwards(), getStaffDisciplines()]);
      if (aw.status === 'fulfilled') setAwards(Array.isArray(aw.value?.data) ? aw.value.data : []);
      if (di.status === 'fulfilled') setDisciplines(Array.isArray(di.value?.data) ? di.value.data : []);
    } catch { /* ignore */ }
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async (type: string) => {
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
    } catch { /* ignore */ }
  }, []);

  // Statistics
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
    if (isOnCall) return <Tag color="red">Truc</Tag>;
    const lower = (shiftName || '').toLowerCase();
    if (lower.includes('sang') || lower.includes('morning')) return <Tag color="blue">Sang</Tag>;
    if (lower.includes('chieu') || lower.includes('afternoon')) return <Tag color="orange">Chieu</Tag>;
    if (lower.includes('dem') || lower.includes('night')) return <Tag color="purple">Dem</Tag>;
    return <Tag color="blue">{shiftName}</Tag>;
  };

  // ============ Handlers ============

  const handleAddShift = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleAddTraining = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleAddEmployee = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleSaveCatalog = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleCreateLeave = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleApproveLeave = async (id: string, approved: boolean) => {
    try {
      await approveLeave(id, approved);
      message.success(approved ? 'Đã duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép');
      fetchLeave();
    } catch {
      message.warning('Không thể xử lý đơn nghỉ phép');
    }
  };

  const handleRecordAttendance = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleCreateOvertime = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleApproveOvertime = async (id: string, approved: boolean) => {
    try {
      await approveOvertime(id, approved);
      message.success(approved ? 'Đã duyệt làm thêm giờ' : 'Đã từ chối làm thêm giờ');
      fetchOvertime();
    } catch {
      message.warning('Không thể xử lý yêu cầu');
    }
  };

  const handleSaveAward = async (values: Record<string, unknown>) => {
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
    }
  };

  const handleSaveDiscipline = async (values: Record<string, unknown>) => {
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
    }
  };

  const executePrintEmployeeCard = () => {
    if (!selectedEmployee) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const mainCert = selectedEmployee.certifications?.[0];
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Hồ sơ nhân viên</title>
      <style>body{font-family:'Times New Roman',serif;padding:20px;max-width:800px;margin:auto}.header{text-align:center;margin-bottom:20px}.title{font-size:20px;font-weight:bold;margin:20px 0;text-align:center}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #000;padding:8px;text-align:left}th{background:#f0f0f0;width:30%}@media print{body{padding:0}}</style></head><body>
      <div class="header"><strong>${HOSPITAL_NAME}</strong><br/>Phòng Tổ chức - Nhân sự</div>
      <div class="title">HỒ SƠ NHÂN VIÊN Y TẾ</div>
      <table><tr><th>Mã nhân viên</th><td>${selectedEmployee.staffCode}</td></tr>
      <tr><th>Họ và tên</th><td>${selectedEmployee.fullName}</td></tr>
      <tr><th>Giới tính</th><td>${selectedEmployee.gender === 'Male' ? 'Nam' : selectedEmployee.gender === 'Female' ? 'Nu' : selectedEmployee.gender || '-'}</td></tr>
      <tr><th>Ngày sinh</th><td>${selectedEmployee.dateOfBirth || '-'}</td></tr>
      <tr><th>Chức vụ</th><td>${selectedEmployee.positionName || '-'}</td></tr>
      <tr><th>Khoa/Phong</th><td>${selectedEmployee.departmentName}</td></tr>
      <tr><th>Chuyên khoa</th><td>${selectedEmployee.specialty || '-'}</td></tr>
      <tr><th>Số CCHN</th><td>${mainCert?.licenseNumber || '-'}</td></tr>
      <tr><th>Ngày vào làm</th><td>${selectedEmployee.hireDate || '-'}</td></tr></table>
      <div style="margin-top:50px;text-align:right"><p>Ngay ${dayjs().format('DD/MM/YYYY')}</p><p><strong>Trưởng phòng Nhân sự</strong></p></div>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    printWindow.document.close();
  };

  // ============ Columns ============

  const employeeColumns: ColumnsType<StaffProfileDto> = [
    {
      title: 'Nhân viên', key: 'employee',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.photoUrl} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.fullName}</Text>
            <Text type="secondary">{record.staffCode}</Text>
          </Space>
        </Space>
      ),
    },
    { title: 'Chức vụ', key: 'position', render: (_, record) => record.positionName || record.staffTypeName || '-' },
    { title: 'Khoa/Phòng', dataIndex: 'departmentName', key: 'departmentName' },
    {
      title: 'Số CCHN', key: 'license',
      render: (_, record) => {
        const cert = record.certifications?.[0];
        if (!cert) return '-';
        const daysUntil = cert.expiryDate ? dayjs(cert.expiryDate).diff(dayjs(), 'day') : 999;
        return (
          <Space orientation="vertical" size={0}>
            <Text>{cert.licenseNumber}</Text>
            {daysUntil <= 90 && daysUntil > 0 && <Tag color="orange" icon={<WarningOutlined />}>Con {daysUntil} ngay</Tag>}
            {daysUntil <= 0 && <Tag color="red" icon={<WarningOutlined />}>Đã hết hạn</Tag>}
          </Space>
        );
      },
    },
    { title: 'Trạng thái', dataIndex: 'employmentStatus', key: 'status', width: 120, render: (status) => getStatusTag(status) },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_, record) => (
        <Button size="small" onClick={() => { setSelectedEmployee(record); setIsDetailModalOpen(true); }}>Chi tiết</Button>
      ),
    },
  ];

  const shiftColumns: ColumnsType<RosterAssignmentDto> = [
    { title: 'Nhân viên', dataIndex: 'staffName', key: 'staffName' },
    { title: 'Khoa', key: 'department', render: (_, record) => employees.find((e) => e.id === record.staffId)?.departmentName || '-' },
    { title: 'Ngay', dataIndex: 'date', key: 'date', render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
    { title: 'Ca', key: 'shiftType', render: (_, record) => getShiftTag(record.shiftName, false, record.isOnCall) },
    { title: 'Thời gian', key: 'time', render: (_, record) => `${record.shiftStart || ''} - ${record.shiftEnd || ''}` },
  ];

  const trainingColumns: ColumnsType<CMESummaryDto> = [
    { title: 'Nhân viên', dataIndex: 'staffName', key: 'staffName' },
    { title: 'Tổng số tiết', key: 'earnedCredits', render: (_, record) => `${record.earnedCredits}/${record.requiredCredits}` },
    { title: 'Loai 1', dataIndex: 'category1Credits', key: 'category1Credits' },
    { title: 'Loai 2', dataIndex: 'category2Credits', key: 'category2Credits' },
    { title: 'Số hoạt động', dataIndex: 'activitiesCount', key: 'activitiesCount' },
    {
      title: 'Trạng thái', key: 'status',
      render: (_, record) => record.isCompliant ? <Tag color="green">Đủ tiết</Tag> : <Tag color="red">Thieu {record.shortfall} tiet</Tag>,
    },
  ];

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
              text={<Text style={{ fontSize: 11 }}>{shift.staffName?.split(' ').pop()}</Text>}
            />
          </li>
        ))}
        {dayShifts.length > 2 && <li><Text type="secondary" style={{ fontSize: 11 }}>+{dayShifts.length - 2} khac</Text></li>}
      </ul>
    );
  };

  const licensedEmployees = employees.filter((e) => e.certifications && e.certifications.length > 0);

  // ============ Tab Items ============

  const tabItems = [
    {
      key: 'employees',
      label: 'Nhân sự',
      children: (
        <Table
          columns={employeeColumns}
          dataSource={employees}
          rowKey="id"
          onRow={(record) => ({
            onDoubleClick: () => { setSelectedEmployee(record); setIsDetailModalOpen(true); },
            style: { cursor: 'pointer' },
          })}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} nhân viên` }}
        />
      ),
    },
    {
      key: 'catalogs',
      label: 'Danh mục',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Select value={selectedCatalogType} onChange={setSelectedCatalogType} style={{ width: 220 }} options={CATALOG_TYPES} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { catalogForm.resetFields(); setIsCatalogModalOpen(true); }}>Thêm mới</Button>
          </Space>
          <Table
            columns={[
              { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
              { title: 'Ten', dataIndex: 'name', key: 'name' },
              { title: 'Mô tả', dataIndex: 'description', key: 'description' },
              { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
              { title: 'Trạng thái', key: 'isActive', width: 100, render: (_, r: HRCatalogDto) => <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Hoạt động' : 'Ngưng'}</Tag> },
              {
                title: 'Thao tác', key: 'action', width: 120,
                render: (_, record: HRCatalogDto) => (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => { catalogForm.setFieldsValue(record); setIsCatalogModalOpen(true); }} />
                    <Popconfirm title="Xóa danh mục này?" onConfirm={() => handleDeleteCatalog(record.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ] as ColumnsType<HRCatalogDto>}
            dataSource={catalogs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'contracts',
      label: (
        <Badge count={expiringContractsList.length} offset={[10, 0]}>Hop dong</Badge>
      ),
      children: (
        <>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { contractForm.resetFields(); fetchContracts(); setIsContractModalOpen(true); }}>Thêm hợp đồng</Button>
          {expiringContractsList.length > 0 && (
            <Alert title={`${expiringContractsList.length} hợp đồng sắp hết hạn (90 ngay)`} type="warning" showIcon style={{ marginBottom: 16 }} />
          )}
          <Table
            columns={[
              { title: 'Nhân viên', key: 'staff', render: (_, r: StaffContractDto) => `${r.staffName} (${r.staffCode})` },
              { title: 'Loại HĐ', dataIndex: 'contractType', key: 'contractType' },
              { title: 'Số HĐ', dataIndex: 'contractNumber', key: 'contractNumber' },
              { title: 'Từ ngày', dataIndex: 'startDate', key: 'startDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Đến ngày', dataIndex: 'endDate', key: 'endDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : 'Vô thời hạn' },
              {
                title: 'Trạng thái', key: 'status',
                render: (_, r: StaffContractDto) => {
                  if (r.daysUntilExpiry != null && r.daysUntilExpiry <= 90 && r.daysUntilExpiry > 0) return <Tag color="orange">Con {r.daysUntilExpiry} ngay</Tag>;
                  return <Tag color={r.status === 0 ? 'green' : r.status === 1 ? 'red' : 'default'}>{r.statusName}</Tag>;
                },
              },
            ] as ColumnsType<StaffContractDto>}
            dataSource={contracts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'attendance',
      label: 'Chấm công',
      children: (
        <>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { attendanceForm.resetFields(); fetchAttendance(); setIsAttendanceModalOpen(true); }}>Ghi chấm công</Button>
          <Tabs defaultActiveKey="records" items={[
            {
              key: 'records', label: 'Chi tiết',
              children: (
                <Table
                  columns={[
                    { title: 'Nhân viên', key: 'staff', render: (_, r: AttendanceRecordDto) => `${r.staffName} (${r.staffCode})` },
                    { title: 'Ngay', dataIndex: 'workDate', key: 'workDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                    { title: 'Ca', dataIndex: 'shiftType', key: 'shiftType' },
                    { title: 'Giờ làm', dataIndex: 'workHours', key: 'workHours' },
                    { title: 'Tăng ca', dataIndex: 'overtimeHours', key: 'overtimeHours' },
                    {
                      title: 'Trạng thái', dataIndex: 'status', key: 'status',
                      render: (s: string) => {
                        const colors: Record<string, string> = { Present: 'green', Absent: 'red', Leave: 'orange', Holiday: 'blue', HalfDay: 'gold' };
                        return <Tag color={colors[s] || 'default'}>{s}</Tag>;
                      },
                    },
                  ] as ColumnsType<AttendanceRecordDto>}
                  dataSource={attendanceRecords}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'summary', label: 'Tổng hợp tháng',
              children: (
                <Table
                  columns={[
                    { title: 'Nhân viên', key: 'staff', render: (_, r: AttendanceSummaryDto) => `${r.staffName} (${r.staffCode})` },
                    { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName' },
                    { title: 'Ngày công', dataIndex: 'presentDays', key: 'presentDays' },
                    { title: 'Vắng', dataIndex: 'absentDays', key: 'absentDays' },
                    { title: 'Phép', dataIndex: 'leaveDays', key: 'leaveDays' },
                    { title: 'Giờ tăng ca', dataIndex: 'totalOvertimeHours', key: 'totalOvertimeHours' },
                  ] as ColumnsType<AttendanceSummaryDto>}
                  dataSource={attendanceSummaries}
                  rowKey="staffId"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]} />
        </>
      ),
    },
    {
      key: 'leave',
      label: 'Nghỉ phép',
      children: (
        <>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { leaveForm.resetFields(); fetchLeave(); setIsLeaveModalOpen(true); }}>Tạo đơn nghỉ</Button>
          <Table
            columns={[
              { title: 'Nhân viên', key: 'staff', render: (_, r: LeaveRequestDto) => `${r.staffName} (${r.staffCode})` },
              { title: 'Loai', dataIndex: 'leaveType', key: 'leaveType' },
              { title: 'Từ ngày', dataIndex: 'startDate', key: 'startDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Đến ngày', dataIndex: 'endDate', key: 'endDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Số ngày', dataIndex: 'totalDays', key: 'totalDays' },
              { title: 'Lý do', dataIndex: 'reason', key: 'reason', ellipsis: true },
              {
                title: 'Trạng thái', key: 'status',
                render: (_, r: LeaveRequestDto) => {
                  const s = LEAVE_STATUS_NAMES[r.status] || { color: 'default', text: 'Không rõ' };
                  return <Tag color={s.color}>{s.text}</Tag>;
                },
              },
              {
                title: 'Thao tác', key: 'action', width: 150,
                render: (_, r: LeaveRequestDto) => r.status === 0 ? (
                  <Space>
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApproveLeave(r.id, true)}>Duyệt</Button>
                    <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleApproveLeave(r.id, false)}>Từ chối</Button>
                  </Space>
                ) : null,
              },
            ] as ColumnsType<LeaveRequestDto>}
            dataSource={leaveRequests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'overtime',
      label: 'Làm thêm giờ',
      children: (
        <>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { overtimeForm.resetFields(); fetchOvertime(); setIsOvertimeModalOpen(true); }}>Tạo yêu cầu</Button>
          <Table
            columns={[
              { title: 'Nhân viên', key: 'staff', render: (_, r: OvertimeRecordDto) => `${r.staffName} (${r.staffCode})` },
              { title: 'Ngay', dataIndex: 'overtimeDate', key: 'overtimeDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
              { title: 'Số giờ', dataIndex: 'hours', key: 'hours' },
              { title: 'Lý do', dataIndex: 'reason', key: 'reason', ellipsis: true },
              {
                title: 'Trạng thái', key: 'status',
                render: (_, r: OvertimeRecordDto) => {
                  const colors = ['gold', 'green', 'red'];
                  return <Tag color={colors[r.status] || 'default'}>{r.statusName}</Tag>;
                },
              },
              {
                title: 'Thao tác', key: 'action', width: 150,
                render: (_, r: OvertimeRecordDto) => r.status === 0 ? (
                  <Space>
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApproveOvertime(r.id, true)}>Duyệt</Button>
                    <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleApproveOvertime(r.id, false)}>Từ chối</Button>
                  </Space>
                ) : null,
              },
            ] as ColumnsType<OvertimeRecordDto>}
            dataSource={overtimeRecords}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'awards',
      label: 'Khen thưởng / Ky luat',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<TrophyOutlined />} onClick={() => { awardForm.resetFields(); fetchAwardsDiscipline(); setIsAwardModalOpen(true); }}>Thêm khen thưởng</Button>
            <Button danger icon={<WarningOutlined />} onClick={() => { disciplineForm.resetFields(); fetchAwardsDiscipline(); setIsDisciplineModalOpen(true); }}>Thêm kỷ luật</Button>
          </Space>
          <Tabs defaultActiveKey="awards" items={[
            {
              key: 'awards', label: 'Khen thưởng',
              children: (
                <Table
                  columns={[
                    { title: 'Nhân viên', key: 'staff', render: (_, r: StaffAwardDto) => `${r.staffName} (${r.staffCode})` },
                    { title: 'Loai', dataIndex: 'awardType', key: 'awardType' },
                    { title: 'Nội dung', dataIndex: 'title', key: 'title' },
                    { title: 'Ngay', dataIndex: 'awardDate', key: 'awardDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                    { title: 'Số QĐ', dataIndex: 'decisionNumber', key: 'decisionNumber' },
                    { title: 'Cơ quan', dataIndex: 'issuedBy', key: 'issuedBy' },
                  ] as ColumnsType<StaffAwardDto>}
                  dataSource={awards}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'disciplines', label: 'Kỷ luật',
              children: (
                <Table
                  columns={[
                    { title: 'Nhân viên', key: 'staff', render: (_, r: StaffDisciplineDto) => `${r.staffName} (${r.staffCode})` },
                    { title: 'Hình thức', dataIndex: 'disciplineType', key: 'disciplineType' },
                    { title: 'Nội dung', dataIndex: 'title', key: 'title' },
                    { title: 'Ngay', dataIndex: 'disciplineDate', key: 'disciplineDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                    { title: 'Hết hạn', dataIndex: 'expiryDate', key: 'expiryDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                    { title: 'Trạng thái', key: 'isExpired', render: (_, r: StaffDisciplineDto) => r.isExpired ? <Tag color="green">Đã hết hiệu lực</Tag> : <Tag color="red">Còn hiệu lực</Tag> },
                  ] as ColumnsType<StaffDisciplineDto>}
                  dataSource={disciplines}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]} />
        </>
      ),
    },
    {
      key: 'schedule',
      label: 'Lịch trực',
      children: (
        <Row gutter={16}>
          <Col span={16}><Calendar cellRender={dateCellRender} /></Col>
          <Col span={8}>
            <Card title="Lịch trực hôm nay" extra={<Button size="small" onClick={() => setIsShiftModalOpen(true)}>Thêm</Button>}>
              <div>
                {rosterAssignments.filter((s) => s.date && dayjs(s.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).map((item) => (
                  <div key={item.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Space>{getShiftTag(item.shiftName, false, item.isOnCall)}<Text>{item.staffName}</Text></Space>
                  </div>
                ))}
                {rosterAssignments.filter((s) => s.date && dayjs(s.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).length === 0 && (
                  <Text type="secondary">Không có lịch trực hôm nay</Text>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'shifts',
      label: 'Phân ca',
      children: (
        <>
          <Button type="primary" icon={<ScheduleOutlined />} style={{ marginBottom: 16 }} onClick={() => setIsShiftModalOpen(true)}>Phan ca moi</Button>
          <Table columns={shiftColumns} dataSource={rosterAssignments} rowKey="id" pagination={{ pageSize: 10 }} />
        </>
      ),
    },
    {
      key: 'training',
      label: 'Đào tạo',
      children: (
        <>
          <Button type="primary" icon={<BookOutlined />} style={{ marginBottom: 16 }} onClick={() => setIsTrainingModalOpen(true)}>Đăng ký đào tạo</Button>
          <Table columns={trainingColumns} dataSource={cmeNonCompliant} rowKey="staffId" pagination={{ pageSize: 10 }} />
        </>
      ),
    },
    {
      key: 'licenses',
      label: <Badge count={expiringCerts.length} offset={[10, 0]}>Chung chi</Badge>,
      children: (
        <Table
          columns={[
            { title: 'Nhân viên', dataIndex: 'fullName', key: 'fullName' },
            { title: 'Chức vụ', key: 'position', render: (_, record: StaffProfileDto) => record.positionName || record.staffTypeName || '-' },
            { title: 'Số CCHN', key: 'licenseNumber', render: (_, record: StaffProfileDto) => record.certifications?.[0]?.licenseNumber || '-' },
            {
              title: 'Ngày hết hạn', key: 'licenseExpiry',
              render: (_, record: StaffProfileDto) => {
                const cert = record.certifications?.[0];
                if (!cert?.expiryDate) return '-';
                const daysUntil = dayjs(cert.expiryDate).diff(dayjs(), 'day');
                return <Tag color={daysUntil <= 0 ? 'red' : daysUntil <= 90 ? 'orange' : 'green'}>{cert.expiryDate}</Tag>;
              },
            },
          ]}
          dataSource={licensedEmployees}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'reports',
      label: 'Báo cáo',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Select value={reportType} onChange={(v) => { setReportType(v); fetchReports(v); }} style={{ width: 250 }}
              options={[
                { value: 'department', label: 'Nhân sự theo phòng' },
                { value: 'attendance', label: 'Bao cao cham cong' },
                { value: 'leave', label: 'Bao cao nghi phep' },
                { value: 'overtime', label: 'Bao cao lam them gio' },
                { value: 'movement', label: 'Bien dong nhan su' },
              ]}
            />
            <Button icon={<BarChartOutlined />} onClick={() => fetchReports(reportType)}>Xem báo cáo</Button>
          </Space>

          {reportType === 'department' && (
            <Table
              columns={[
                { title: 'Khoa/Phòng', dataIndex: 'departmentName', key: 'departmentName' },
                { title: 'Tong', dataIndex: 'totalStaff', key: 'totalStaff' },
                { title: 'Bác sĩ', dataIndex: 'doctors', key: 'doctors' },
                { title: 'Điều dưỡng', dataIndex: 'nurses', key: 'nurses' },
                { title: 'KTV', dataIndex: 'technicians', key: 'technicians' },
                { title: 'Khac', dataIndex: 'others', key: 'others' },
              ] as ColumnsType<StaffByDepartmentReportDto>}
              dataSource={deptReport}
              rowKey="departmentName"
              pagination={false}
              summary={(data) => {
                const totals = data.reduce((acc, r) => ({
                  total: acc.total + r.totalStaff,
                  doctors: acc.doctors + r.doctors,
                  nurses: acc.nurses + r.nurses,
                  techs: acc.techs + r.technicians,
                  others: acc.others + r.others,
                }), { total: 0, doctors: 0, nurses: 0, techs: 0, others: 0 });
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><Text strong>Tong cong</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1}><Text strong>{totals.total}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>{totals.doctors}</Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>{totals.nurses}</Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>{totals.techs}</Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>{totals.others}</Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          )}

          {reportType === 'attendance' && attendanceReport && (
            <Card>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Statistic title="Tong NV" value={attendanceReport.totalStaff} /></Col>
                <Col span={6}><Statistic title="TB ngay cong" value={attendanceReport.avgWorkDays} /></Col>
                <Col span={6}><Statistic title="TB tang ca (gio)" value={attendanceReport.avgOvertimeHours} /></Col>
                <Col span={6}><Statistic title="Tong ngay vang" value={attendanceReport.totalAbsentDays} /></Col>
              </Row>
            </Card>
          )}

          {reportType === 'leave' && leaveReport && (
            <Card>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Statistic title="Tong don" value={leaveReport.totalRequests} /></Col>
                <Col span={6}><Statistic title="Da duyet" value={leaveReport.approvedRequests} styles={{ content: { color: '#52c41a' } }} /></Col>
                <Col span={6}><Statistic title="Tu choi" value={leaveReport.rejectedRequests} styles={{ content: { color: '#ff4d4f' } }} /></Col>
                <Col span={6}><Statistic title="Cho duyet" value={leaveReport.pendingRequests} styles={{ content: { color: '#faad14' } }} /></Col>
              </Row>
            </Card>
          )}

          {reportType === 'overtime' && overtimeReport && (
            <Card>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Statistic title="Tong yeu cau" value={overtimeReport.totalRequests} /></Col>
                <Col span={8}><Statistic title="Tong gio" value={overtimeReport.totalHours} /></Col>
                <Col span={8}><Statistic title="Gio da duyet" value={overtimeReport.approvedHours} styles={{ content: { color: '#52c41a' } }} /></Col>
              </Row>
            </Card>
          )}

          {reportType === 'movement' && movementReport && (
            <Card>
              <Row gutter={16}>
                <Col span={6}><Statistic title="Tuyen moi" value={movementReport.newHires} styles={{ content: { color: '#52c41a' } }} /></Col>
                <Col span={6}><Statistic title="Nghi viec" value={movementReport.resignations} styles={{ content: { color: '#ff4d4f' } }} /></Col>
                <Col span={6}><Statistic title="HD het han" value={movementReport.contractsExpired} styles={{ content: { color: '#faad14' } }} /></Col>
                <Col span={6}><Statistic title="HD gia han" value={movementReport.contractsRenewed} /></Col>
              </Row>
            </Card>
          )}
        </>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Quan ly nhan su y te</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        </Space>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card><Statistic title="Nhan vien dang lam viec" value={activeEmployees} prefix={<TeamOutlined style={{ color: '#52c41a' }} />} styles={{ content: { color: '#52c41a' } }} /></Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card><Statistic title="CCHN sap het han" value={licenseExpiringSoon} prefix={<SafetyCertificateOutlined style={{ color: '#faad14' }} />} styles={{ content: { color: '#faad14' } }} /></Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card><Statistic title="CME chua du" value={cmeIncomplete} prefix={<BookOutlined style={{ color: '#ff4d4f' }} />} styles={{ content: { color: '#ff4d4f' } }} /></Card>
          </Col>
        </Row>

        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Bac si" value={dashboard.doctors} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Dieu duong" value={dashboard.nurses} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Ca truc hom nay" value={dashboard.todayShifts} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Nghi phep" value={dashboard.onLeaveStaff} /></Card></Col>
          </Row>
        )}

        {/* Main Content */}
        <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddEmployeeModalOpen(true)}>Them nhan vien</Button>}>
          <Tabs defaultActiveKey="employees" items={tabItems} onTabClick={(key) => {
            if (key === 'contracts') fetchContracts();
            if (key === 'leave') fetchLeave();
            if (key === 'attendance') fetchAttendance();
            if (key === 'overtime') fetchOvertime();
            if (key === 'awards') fetchAwardsDiscipline();
            if (key === 'reports') fetchReports(reportType);
          }} />
        </Card>

        {/* ============ Modals ============ */}

        {/* Detail Modal */}
        <Modal title="Chi tiet nhan vien" open={isDetailModalOpen} onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={executePrintEmployeeCard}>In ho so</Button>,
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Dong</Button>,
          ]} width={700}>
          {selectedEmployee && (
            <>
              <Row gutter={16}>
                <Col span={6}><Avatar size={100} icon={<UserOutlined />} src={selectedEmployee.photoUrl} /></Col>
                <Col span={18}>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Ma NV">{selectedEmployee.staffCode}</Descriptions.Item>
                    <Descriptions.Item label="Trang thai">{getStatusTag(selectedEmployee.employmentStatus)}</Descriptions.Item>
                    <Descriptions.Item label="Ho ten" span={2}>{selectedEmployee.fullName}</Descriptions.Item>
                    <Descriptions.Item label="Chức vụ">{selectedEmployee.positionName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Khoa/Phong">{selectedEmployee.departmentName}</Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
              <Divider>Chung chi hanh nghe</Divider>
              {selectedEmployee.certifications?.length ? selectedEmployee.certifications.map((cert) => (
                <Descriptions key={cert.id} bordered size="small" column={2} style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="Số CCHN">{cert.licenseNumber}</Descriptions.Item>
                  <Descriptions.Item label="Het han">{cert.expiryDate || '-'}</Descriptions.Item>
                </Descriptions>
              )) : <Text type="secondary">Chua co chung chi</Text>}
            </>
          )}
        </Modal>

        {/* Catalog Modal */}
        <Modal title="Danh muc nhan su" open={isCatalogModalOpen} onCancel={() => setIsCatalogModalOpen(false)} onOk={() => catalogForm.submit()}>
          <Form form={catalogForm} layout="vertical" onFinish={handleSaveCatalog}>
            <Form.Item name="id" hidden><Input /></Form.Item>
            <Form.Item name="code" label="Ma" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Ten" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Mo ta"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="sortOrder" label="Thu tu" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="isActive" label="Trang thai" initialValue={true}>
              <Select options={[{ value: true, label: 'Hoạt động' }, { value: false, label: 'Ngưng' }]} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Contract Modal */}
        <Modal title="Hop dong lao dong" open={isContractModalOpen} onCancel={() => setIsContractModalOpen(false)} onOk={() => contractForm.submit()}>
          <Form form={contractForm} layout="vertical" onFinish={handleSaveContract}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="contractType" label="Loai HD" rules={[{ required: true }]}>
              <Select options={[
                { value: 'Probation', label: 'Thử việc' },
                { value: 'FixedTerm', label: 'Xac dinh thoi han' },
                { value: 'Indefinite', label: 'Khong xac dinh thoi han' },
                { value: 'Seasonal', label: 'Thời vụ' },
              ]} />
            </Form.Item>
            <Form.Item name="contractNumber" label="So hop dong" rules={[{ required: true }]}><Input /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="startDate" label="Tu ngay" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="endDate" label="Den ngay"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="notes" label="Ghi chu"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>

        {/* Leave Modal */}
        <Modal title="Tạo đơn nghỉ phep" open={isLeaveModalOpen} onCancel={() => setIsLeaveModalOpen(false)} onOk={() => leaveForm.submit()}>
          <Form form={leaveForm} layout="vertical" onFinish={handleCreateLeave}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="leaveType" label="Loai nghi" rules={[{ required: true }]}>
              <Select options={[
                { value: 'Annual', label: 'Phép năm' },
                { value: 'Sick', label: 'Nghỉ ốm' },
                { value: 'Maternity', label: 'Thai sản' },
                { value: 'Unpaid', label: 'Không lương' },
                { value: 'Compassionate', label: 'Việc riêng' },
                { value: 'Study', label: 'Học tập' },
              ]} />
            </Form.Item>
            <Form.Item name="dates" label="Thoi gian" rules={[{ required: true }]}><RangePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="reason" label="Ly do"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>

        {/* Attendance Modal */}
        <Modal title="Ghi chấm công" open={isAttendanceModalOpen} onCancel={() => setIsAttendanceModalOpen(false)} onOk={() => attendanceForm.submit()}>
          <Form form={attendanceForm} layout="vertical" onFinish={handleRecordAttendance}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="workDate" label="Ngay lam viec" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
              <Select options={[
                { value: 'Morning', label: 'Sang' },
                { value: 'Afternoon', label: 'Chieu' },
                { value: 'Night', label: 'Dem' },
                { value: 'AllDay', label: 'Ca ngay' },
              ]} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="workHours" label="Gio lam" initialValue={8}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="overtimeHours" label="Tang ca" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="status" label="Trang thai" initialValue="Present">
              <Select options={[
                { value: 'Present', label: 'Co mat' },
                { value: 'Absent', label: 'Vang' },
                { value: 'Leave', label: 'Nghỉ phép' },
                { value: 'Holiday', label: 'Nghỉ lễ' },
                { value: 'HalfDay', label: 'Nửa ngày' },
              ]} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Overtime Modal */}
        <Modal title="Yeu cau lam them gio" open={isOvertimeModalOpen} onCancel={() => setIsOvertimeModalOpen(false)} onOk={() => overtimeForm.submit()}>
          <Form form={overtimeForm} layout="vertical" onFinish={handleCreateOvertime}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="overtimeDate" label="Ngay" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="hours" label="So gio" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0.5} max={12} step={0.5} /></Form.Item>
            <Form.Item name="reason" label="Ly do"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>

        {/* Award Modal */}
        <Modal title="Khen thuong" open={isAwardModalOpen} onCancel={() => setIsAwardModalOpen(false)} onOk={() => awardForm.submit()}>
          <Form form={awardForm} layout="vertical" onFinish={handleSaveAward}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="awardType" label="Loai khen thuong" rules={[{ required: true }]}>
              <Select options={[
                { value: 'LDTT', label: 'Lao dong tien tien' },
                { value: 'CSTT', label: 'Chien si thi dua co so' },
                { value: 'BK', label: 'Bằng khen' },
                { value: 'GK', label: 'Giấy khen' },
              ]} />
            </Form.Item>
            <Form.Item name="title" label="Noi dung" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="awardDate" label="Ngay" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="decisionNumber" label="So quyet dinh"><Input /></Form.Item>
            <Form.Item name="issuedBy" label="Co quan cap"><Input /></Form.Item>
          </Form>
        </Modal>

        {/* Discipline Modal */}
        <Modal title="Ky luat" open={isDisciplineModalOpen} onCancel={() => setIsDisciplineModalOpen(false)} onOk={() => disciplineForm.submit()}>
          <Form form={disciplineForm} layout="vertical" onFinish={handleSaveDiscipline}>
            <Form.Item name="staffId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="disciplineType" label="Hinh thuc" rules={[{ required: true }]}>
              <Select options={[
                { value: 'KT', label: 'Khiển trách' },
                { value: 'CN', label: 'Cảnh cáo' },
                { value: 'CC', label: 'Cách chức' },
                { value: 'BV', label: 'Buộc thôi việc' },
              ]} />
            </Form.Item>
            <Form.Item name="title" label="Noi dung" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="disciplineDate" label="Ngay" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="expiryDate" label="Het hieu luc"><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="decisionNumber" label="So quyet dinh"><Input /></Form.Item>
          </Form>
        </Modal>

        {/* Shift Modal */}
        <Modal title="Phan ca truc" open={isShiftModalOpen} onCancel={() => setIsShiftModalOpen(false)} onOk={() => shiftForm.submit()}>
          <Form form={shiftForm} layout="vertical" onFinish={handleAddShift}>
            <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="date" label="Ngay" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="shiftType" label="Ca" rules={[{ required: true }]}>
              <Select>
                {shiftDefs.length > 0 ? shiftDefs.map((sd) => (
                  <Select.Option key={sd.id} value={sd.id}>{sd.name} ({sd.startTime} - {sd.endTime})</Select.Option>
                )) : (
                  <>
                    <Select.Option value="morning">Ca sang (07:00 - 14:00)</Select.Option>
                    <Select.Option value="afternoon">Ca chieu (14:00 - 21:00)</Select.Option>
                    <Select.Option value="night">Ca dem (21:00 - 07:00)</Select.Option>
                    <Select.Option value="on_call">Truc</Select.Option>
                  </>
                )}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Training Modal */}
        <Modal title="Đăng ký đào tạo" open={isTrainingModalOpen} onCancel={() => setIsTrainingModalOpen(false)} onOk={() => trainingForm.submit()}>
          <Form form={trainingForm} layout="vertical" onFinish={handleAddTraining}>
            <Form.Item name="employeeId" label="Nhan vien" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.staffCode})` }))} />
            </Form.Item>
            <Form.Item name="trainingName" label="Ten khoa hoc" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="trainingType" label="Loai" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Conference">Hoi nghi</Select.Option>
                <Select.Option value="Workshop">Hoi thao</Select.Option>
                <Select.Option value="Course">Khoa hoc</Select.Option>
                <Select.Option value="SelfStudy">Tu hoc</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="startDate" label="Ngay bat dau" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="credits" label="So tiet"><Input type="number" /></Form.Item>
          </Form>
        </Modal>

        {/* Add Employee Modal */}
        <Modal title="Them nhan vien moi" open={isAddEmployeeModalOpen} onCancel={() => setIsAddEmployeeModalOpen(false)} onOk={() => employeeForm.submit()} width={600}>
          <Form form={employeeForm} layout="vertical" onFinish={handleAddEmployee}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="staffCode" label="Mã nhân viên" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="gender" label="Giới tính">
                  <Select><Select.Option value="Male">Nam</Select.Option><Select.Option value="Female">Nu</Select.Option></Select>
                </Form.Item>
              </Col>
              <Col span={12}><Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="staffType" label="Loại nhân viên" rules={[{ required: true }]}><Select options={POSITIONS} /></Form.Item></Col>
              <Col span={12}><Form.Item name="specialty" label="Chuyên khoa"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="phone" label="So dien thoai"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="hireDate" label="Ngày vào làm"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HR;
