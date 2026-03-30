import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
  message,
  Rate,
  Badge,
  Result,
  Spin,
  Switch,
  TimePicker,
  InputNumber,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  CreditCardOutlined,
  StarOutlined,
  BellOutlined,
  HistoryOutlined,
  ReloadOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  QuestionCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getAccount,
  getMyAppointments,
  bookAppointment,
  getLabResults,
  getBills,
  getFeedbacks,
  submitFeedback,
  getDashboard,
  getNotifications,
  getDepartments,
  getDoctors,
  markNotificationRead,
  getFamilyMembers,
  saveFamilyMember,
  deleteFamilyMember,
  getMedicineReminders,
  saveMedicineReminder,
  deleteMedicineReminder,
  toggleMedicineReminder,
  getHealthMetrics,
  saveHealthMetric,
  deleteHealthMetric,
  getHealthMetricTrends,
  getPatientQuestions,
  createPatientQuestion,
} from '../api/patientPortal';
import type {
  PatientAccountDto,
  OnlineAppointmentDto,
  LabResultDto,
  BillSummaryDto,
  FeedbackDto,
  NotificationDto,
  DepartmentInfoDto,
  DoctorInfoDto,
  PatientPortalDashboardDto,
  PagedResultDto,
  FamilyMemberDto,
  MedicineReminderDto,
  HealthMetricDto,
  HealthMetricTrendDto,
  PatientQuestionDto,
} from '../api/patientPortal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type AppointmentFormValues = {
  type: string;
  departmentId: string;
  specialtyId?: string;
  doctorId?: string;
  date?: string | Date;
  time?: string;
  notes?: string;
};

type FeedbackFormValues = {
  departmentId?: string;
  department?: string;
  comment: string;
  rating: number;
  visitId?: string;
};

const PatientPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<PatientAccountDto | null>(null);
  const [appointments, setAppointments] = useState<OnlineAppointmentDto[]>([]);
  const [labResults, setLabResults] = useState<LabResultDto[]>([]);
  const [bills, setBills] = useState<BillSummaryDto[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfoDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfoDto[]>([]);
  const [dashboard, setDashboard] = useState<PatientPortalDashboardDto | null>(null);

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDto[]>([]);
  const [reminders, setReminders] = useState<MedicineReminderDto[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetricDto[]>([]);
  const [healthTrends, setHealthTrends] = useState<HealthMetricTrendDto[]>([]);
  const [questions, setQuestions] = useState<PatientQuestionDto[]>([]);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyMemberDto | null>(null);
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>('avgSystolic');

  const [appointmentForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();
  const [familyForm] = Form.useForm();
  const [reminderForm] = Form.useForm();
  const [healthForm] = Form.useForm();
  const [questionForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        accountRes,
        appointmentsRes,
        labRes,
        billsRes,
        feedbacksRes,
        dashboardRes,
        notificationsRes,
        departmentsRes,
        doctorsRes,
        familyRes,
        remindersRes,
        metricsRes,
        trendsRes,
        questionsRes,
      ] = await Promise.allSettled([
        getAccount(),
        getMyAppointments(),
        getLabResults(),
        getBills(),
        getFeedbacks(),
        getDashboard(),
        getNotifications(false, 1, 20),
        getDepartments(),
        getDoctors(),
        getFamilyMembers(),
        getMedicineReminders(),
        getHealthMetrics(30),
        getHealthMetricTrends(30),
        getPatientQuestions(),
      ]);

      if (accountRes.status === 'fulfilled') {
        setAccount(accountRes.value.data ?? null);
      }
      if (appointmentsRes.status === 'fulfilled') {
        setAppointments(appointmentsRes.value.data ?? []);
      }
      if (labRes.status === 'fulfilled') {
        setLabResults(labRes.value.data ?? []);
      }
      if (billsRes.status === 'fulfilled') {
        setBills(billsRes.value.data ?? []);
      }
      if (feedbacksRes.status === 'fulfilled') {
        setFeedbacks(feedbacksRes.value.data ?? []);
      }
      if (dashboardRes.status === 'fulfilled') {
        setDashboard(dashboardRes.value.data ?? null);
      }
      if (notificationsRes.status === 'fulfilled') {
        const nData = notificationsRes.value.data;
        setNotifications((nData as PagedResultDto<NotificationDto> | undefined)?.items ?? []);
      }
      if (departmentsRes.status === 'fulfilled') {
        setDepartments(departmentsRes.value.data ?? []);
      }
      if (doctorsRes.status === 'fulfilled') {
        setDoctors(doctorsRes.value.data ?? []);
      }
      if (familyRes.status === 'fulfilled') {
        setFamilyMembers(familyRes.value.data ?? []);
      }
      if (remindersRes.status === 'fulfilled') {
        setReminders(remindersRes.value.data ?? []);
      }
      if (metricsRes.status === 'fulfilled') {
        setHealthMetrics(metricsRes.value.data ?? []);
      }
      if (trendsRes.status === 'fulfilled') {
        setHealthTrends(trendsRes.value.data ?? []);
      }
      if (questionsRes.status === 'fulfilled') {
        setQuestions(questionsRes.value.data ?? []);
      }
    } catch {
      message.warning('Không thể tải dữ liệu cổng bệnh nhân');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from local data
  const upcomingAppointments = dashboard?.upcomingAppointments?.length
    ?? appointments.filter((a) => a.status === 1 || a.status === 2).length;
  const pendingResults = dashboard?.pendingLabResults
    ?? labResults.filter((r) => r.status === 'Pending').length;
  const outstandingBalance = dashboard?.outstandingBalance ?? 0;

  const getAccountStatusTag = (status: number) => {
    const config: Record<number, { color: string; text: string }> = {
      1: { color: 'green', text: 'Hoạt động' },
      2: { color: 'red', text: 'Tạm khóa' },
      3: { color: 'default', text: 'Vô hiệu hóa' },
    };
    const c = config[status] || { color: 'default', text: 'Không rõ' };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleBookAppointment = async (values: AppointmentFormValues) => {
    try {
      await bookAppointment({
        appointmentType: values.type,
        departmentId: values.departmentId,
        specialtyId: values.specialtyId,
        doctorId: values.doctorId,
        preferredDate: values.date ? dayjs(values.date).format('YYYY-MM-DD') : '',
        preferredTime: values.time || '',
        chiefComplaint: values.notes,
        isFirstVisit: values.type === 'NewVisit',
        insuranceUsed: false,
        notes: values.notes,
      });
      message.success('Đã đặt lịch hẹn thành công');
      setIsAppointmentModalOpen(false);
      appointmentForm.resetFields();
      // Refresh appointments
      try {
        const res = await getMyAppointments();
        setAppointments(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Không thể đặt lịch hẹn. Vui lòng thử lại.');
    }
  };

  const handleSubmitFeedback = async (values: FeedbackFormValues) => {
    try {
      await submitFeedback({
        feedbackType: 'General',
        category: 'Service',
        departmentId: values.departmentId,
        subject: values.department || 'Đánh giá dịch vụ',
        message: values.comment,
        rating: values.rating,
        visitId: values.visitId,
      });
      message.success('Cảm ơn quý khách đã góp ý');
      setIsFeedbackModalOpen(false);
      feedbackForm.resetFields();
      // Refresh feedbacks
      try {
        const res = await getFeedbacks();
        setFeedbacks(res.data ?? []);
      } catch { /* ignore refresh error */ }
    } catch {
      message.warning('Không thể gửi đánh giá. Vui lòng thử lại.');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* ignore */ }
  };

  // Family member handlers
  const handleSaveFamily = async (values: Record<string, unknown>) => {
    try {
      await saveFamilyMember({
        id: editingFamily?.id,
        fullName: values.fullName as string,
        relationship: values.relationship as string,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth as string).format('YYYY-MM-DD') : undefined,
        gender: values.gender as string | undefined,
        idNumber: values.idNumber as string | undefined,
        phone: values.phone as string | undefined,
        insuranceNumber: values.insuranceNumber as string | undefined,
      });
      message.success(editingFamily ? 'Đã cập nhật thành viên' : 'Đã thêm thành viên');
      setIsFamilyModalOpen(false);
      setEditingFamily(null);
      familyForm.resetFields();
      try { const res = await getFamilyMembers(); setFamilyMembers(res.data ?? []); } catch { /* ignore */ }
    } catch {
      message.warning('Không thể lưu thành viên. Vui lòng thử lại.');
    }
  };

  const handleDeleteFamily = async (id: string) => {
    try {
      await deleteFamilyMember(id);
      message.success('Đã xóa thành viên');
      setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      message.warning('Không thể xóa thành viên.');
    }
  };

  // Medicine reminder handlers
  const handleSaveReminder = async (values: Record<string, unknown>) => {
    try {
      await saveMedicineReminder({
        medicineName: values.medicineName as string,
        dosage: values.dosage as string,
        frequency: values.frequency as string,
        times: values.times ? dayjs(values.times as string).format('HH:mm') : undefined,
        instructions: values.instructions as string | undefined,
        startDate: values.startDate ? dayjs(values.startDate as string).format('YYYY-MM-DD') : '',
        endDate: values.endDate ? dayjs(values.endDate as string).format('YYYY-MM-DD') : undefined,
        notes: values.notes as string | undefined,
      });
      message.success('Đã lưu lịch nhắc thuốc');
      setIsReminderModalOpen(false);
      reminderForm.resetFields();
      try { const res = await getMedicineReminders(); setReminders(res.data ?? []); } catch { /* ignore */ }
    } catch {
      message.warning('Không thể lưu lịch nhắc thuốc.');
    }
  };

  const handleToggleReminder = async (id: string) => {
    try {
      await toggleMedicineReminder(id);
      setReminders((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
    } catch {
      message.warning('Không thể thay đổi trạng thái.');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteMedicineReminder(id);
      message.success('Đã xóa lịch nhắc');
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      message.warning('Không thể xóa lịch nhắc.');
    }
  };

  // Health metric handlers
  const handleSaveHealth = async (values: Record<string, unknown>) => {
    try {
      await saveHealthMetric({
        recordedAt: values.recordedAt ? dayjs(values.recordedAt as string).toISOString() : new Date().toISOString(),
        bloodPressureSystolic: values.bloodPressureSystolic as number | undefined,
        bloodPressureDiastolic: values.bloodPressureDiastolic as number | undefined,
        heartRate: values.heartRate as number | undefined,
        weight: values.weight as number | undefined,
        height: values.height as number | undefined,
        bloodGlucose: values.bloodGlucose as number | undefined,
        temperature: values.temperature as number | undefined,
        spO2: values.spO2 as number | undefined,
        notes: values.notes as string | undefined,
      });
      message.success('Đã ghi chỉ số sức khỏe');
      setIsHealthModalOpen(false);
      healthForm.resetFields();
      try {
        const [mRes, tRes] = await Promise.allSettled([getHealthMetrics(30), getHealthMetricTrends(30)]);
        if (mRes.status === 'fulfilled') setHealthMetrics(mRes.value.data ?? []);
        if (tRes.status === 'fulfilled') setHealthTrends(tRes.value.data ?? []);
      } catch { /* ignore */ }
    } catch {
      message.warning('Không thể ghi chỉ số sức khỏe.');
    }
  };

  const handleDeleteHealthMetric = async (id: string) => {
    try {
      await deleteHealthMetric(id);
      message.success('Đã xóa chỉ số');
      setHealthMetrics((prev) => prev.filter((m) => m.id !== id));
    } catch {
      message.warning('Không thể xóa chỉ số.');
    }
  };

  // Question handlers
  const handleCreateQuestion = async (values: Record<string, unknown>) => {
    try {
      await createPatientQuestion({
        subject: values.subject as string,
        content: values.content as string,
        category: values.category as string | undefined,
      });
      message.success('Đã gửi câu hỏi');
      setIsQuestionModalOpen(false);
      questionForm.resetFields();
      try { const res = await getPatientQuestions(); setQuestions(res.data ?? []); } catch { /* ignore */ }
    } catch {
      message.warning('Không thể gửi câu hỏi.');
    }
  };

  // Column definitions for new tabs
  const familyColumns: ColumnsType<FamilyMemberDto> = [
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Quan hệ', dataIndex: 'relationship', key: 'relationship' },
    { title: 'Ngày sinh', dataIndex: 'dateOfBirth', key: 'dateOfBirth', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    { title: 'Giới tính', dataIndex: 'gender', key: 'gender', render: (val) => val || '-' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone', render: (val) => val || '-' },
    { title: 'Số BHYT', dataIndex: 'insuranceNumber', key: 'insuranceNumber', render: (val) => val || '-' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingFamily(record);
              familyForm.setFieldsValue({
                ...record,
                dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
              });
              setIsFamilyModalOpen(true);
            }}
          />
          <Popconfirm title="Xóa thành viên này?" onConfirm={() => handleDeleteFamily(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const reminderColumns: ColumnsType<MedicineReminderDto> = [
    { title: 'Tên thuốc', dataIndex: 'medicineName', key: 'medicineName' },
    { title: 'Liều dùng', dataIndex: 'dosage', key: 'dosage' },
    { title: 'Tần suất', dataIndex: 'frequency', key: 'frequency' },
    { title: 'Giờ uống', dataIndex: 'times', key: 'times', render: (val) => val || '-' },
    { title: 'Bắt đầu', dataIndex: 'startDate', key: 'startDate', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    { title: 'Kết thúc', dataIndex: 'endDate', key: 'endDate', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val, record) => (
        <Switch checked={val} onChange={() => handleToggleReminder(record.id)} size="small" />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Xóa lịch nhắc này?" onConfirm={() => handleDeleteReminder(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const healthMetricColumns: ColumnsType<HealthMetricDto> = [
    { title: 'Thời gian', dataIndex: 'recordedAt', key: 'recordedAt', render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '-' },
    { title: 'HA (mmHg)', key: 'bp', render: (_, r) => r.bloodPressureSystolic ? `${r.bloodPressureSystolic}/${r.bloodPressureDiastolic}` : '-' },
    { title: 'Nhịp tim', dataIndex: 'heartRate', key: 'heartRate', render: (val) => val ? `${val} bpm` : '-' },
    { title: 'Cân nặng', dataIndex: 'weight', key: 'weight', render: (val) => val ? `${val} kg` : '-' },
    { title: 'Chiều cao', dataIndex: 'height', key: 'height', render: (val) => val ? `${val} cm` : '-' },
    { title: 'Đường huyết', dataIndex: 'bloodGlucose', key: 'bloodGlucose', render: (val) => val ? `${val} mmol/L` : '-' },
    { title: 'Nhiệt độ', dataIndex: 'temperature', key: 'temperature', render: (val) => val ? `${val} °C` : '-' },
    { title: 'SpO2', dataIndex: 'spO2', key: 'spO2', render: (val) => val ? `${val}%` : '-' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Xóa chỉ số này?" onConfirm={() => handleDeleteHealthMetric(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const questionColumns: ColumnsType<PatientQuestionDto> = [
    { title: 'Chủ đề', dataIndex: 'subject', key: 'subject', ellipsis: true },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', render: (val) => val || '-' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record) => {
        const config: Record<number, { color: string; text: string }> = {
          0: { color: 'orange', text: 'Chờ trả lời' },
          1: { color: 'green', text: 'Đã trả lời' },
          2: { color: 'default', text: 'Đã đóng' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    { title: 'Ngày gửi', dataIndex: 'createdAt', key: 'createdAt', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    { title: 'Người trả lời', dataIndex: 'answeredByName', key: 'answeredByName', render: (val) => val || '-' },
  ];

  const trendMetricOptions = [
    { value: 'avgSystolic', label: 'HA tâm thu' },
    { value: 'avgDiastolic', label: 'HA tâm trương' },
    { value: 'avgHeartRate', label: 'Nhịp tim' },
    { value: 'avgWeight', label: 'Cân nặng' },
    { value: 'avgGlucose', label: 'Đường huyết' },
    { value: 'avgTemperature', label: 'Nhiệt độ' },
    { value: 'avgSpO2', label: 'SpO2' },
  ];

  const appointmentColumns: ColumnsType<OnlineAppointmentDto> = [
    {
      title: 'Ngày',
      dataIndex: 'preferredDate',
      key: 'preferredDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Giờ',
      dataIndex: 'preferredTime',
      key: 'preferredTime',
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (val) => val || '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Loại',
      dataIndex: 'appointmentTypeName',
      key: 'appointmentTypeName',
      render: (val) => val || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Yêu cầu' },
          2: { color: 'green', text: 'Xác nhận' },
          3: { color: 'cyan', text: 'Đã check-in' },
          4: { color: 'default', text: 'Hoàn thành' },
          5: { color: 'red', text: 'Đã hủy' },
          6: { color: 'volcano', text: 'Vắng mặt' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
  ];

  const labResultColumns: ColumnsType<LabResultDto> = [
    {
      title: 'Tên xét nghiệm',
      dataIndex: 'testName',
      key: 'testName',
    },
    {
      title: 'Loại',
      dataIndex: 'testCategory',
      key: 'testCategory',
    },
    {
      title: 'Ngày làm',
      dataIndex: 'testDate',
      key: 'testDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'BS chỉ định',
      dataIndex: 'orderingDoctor',
      key: 'orderingDoctor',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        const color = status === 'Final' ? 'green' : status === 'Partial' ? 'orange' : 'blue';
        return <Tag color={color}>{record.statusName || status}</Tag>;
      },
    },
    {
      title: 'Bất thường',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      render: (val) => val ? <Tag color="red">Có</Tag> : <Tag color="green">Không</Tag>,
    },
  ];

  const billColumns: ColumnsType<BillSummaryDto> = [
    {
      title: 'Mã hóa đơn',
      dataIndex: 'billCode',
      key: 'billCode',
    },
    {
      title: 'Ngày',
      dataIndex: 'billDate',
      key: 'billDate',
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Khoa',
      dataIndex: 'department',
      key: 'department',
      render: (val) => val || '-',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceCoverage',
      key: 'insuranceCoverage',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'BN trả',
      dataIndex: 'patientResponsibility',
      key: 'patientResponsibility',
      render: (val) => `${(val ?? 0).toLocaleString('vi-VN')} VND`,
    },
    {
      title: 'Còn nợ',
      dataIndex: 'amountDue',
      key: 'amountDue',
      render: (val) => (
        <Text strong style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>
          {(val ?? 0).toLocaleString('vi-VN')} VND
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        const color = status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : status === 'PartialPaid' ? 'orange' : 'blue';
        return <Tag color={color}>{record.statusName || status}</Tag>;
      },
    },
  ];

  const feedbackColumns: ColumnsType<FeedbackDto> = [
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      render: (val) => val || '-',
    },
    {
      title: 'Loại',
      dataIndex: 'feedbackTypeName',
      key: 'feedbackTypeName',
    },
    {
      title: 'Chủ đề',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Điểm',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating ? <Rate disabled defaultValue={rating} /> : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const config: Record<number, { color: string; text: string }> = {
          1: { color: 'blue', text: 'Đã gửi' },
          2: { color: 'orange', text: 'Đang xử lý' },
          3: { color: 'green', text: 'Đã giải quyết' },
          4: { color: 'default', text: 'Đã đóng' },
        };
        const c = config[record.status] || { color: 'default', text: record.statusName || 'N/A' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Phản hồi',
      key: 'response',
      render: (_, record) =>
        record.responseMessage ? (
          <Tag color="green">Đã phản hồi</Tag>
        ) : (
          <Tag color="orange">Chưa phản hồi</Tag>
        ),
    },
  ];

  // Compute feedback statistics
  const avgRating = feedbacks.length > 0
    ? feedbacks.filter((f) => f.rating).reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedbacks.filter((f) => f.rating).length
    : 0;
  const responseRate = feedbacks.length > 0
    ? Math.round((feedbacks.filter((f) => f.responseMessage).length / feedbacks.length) * 100)
    : 0;

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Cổng bệnh nhân (Patient Portal)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tài khoản"
                value={account ? 1 : 0}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
                suffix={account ? <Tag color="green" style={{ marginLeft: 8, fontSize: 12 }}>{account.accountStatusName || 'Active'}</Tag> : undefined}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Lịch hẹn sắp tới"
                value={upcomingAppointments}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Kết quả chờ trả"
                value={pendingResults}
                prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Công nợ"
                value={outstandingBalance}
                prefix={<CreditCardOutlined style={{ color: '#ff4d4f' }} />}
                styles={{ content: { color: outstandingBalance > 0 ? '#ff4d4f' : '#52c41a' } }}
                formatter={(val) => `${Number(val).toLocaleString('vi-VN')} VND`}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Card>
          <Tabs
            defaultActiveKey="appointments"
            items={[
              {
                key: 'appointments',
                label: 'Lịch hẹn',
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsAppointmentModalOpen(true)}
                    >
                      Đặt lịch mới
                    </Button>
                    <Table
                      columns={appointmentColumns}
                      dataSource={appointments}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiết lịch hẹn',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Ngày hẹn">{record.preferredDate ? dayjs(record.preferredDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Giờ">{record.preferredTime}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
                                <Descriptions.Item label="Bác sĩ">{record.doctorName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Lý do">{record.chiefComplaint || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                                {record.confirmationCode && (
                                  <Descriptions.Item label="Mã xác nhận">{record.confirmationCode}</Descriptions.Item>
                                )}
                                {record.notes && (
                                  <Descriptions.Item label="Ghi chú">{record.notes}</Descriptions.Item>
                                )}
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'labResults',
                label: 'Kết quả xét nghiệm',
                children: (
                  <Table
                    columns={labResultColumns}
                    dataSource={labResults}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Kết quả: ${record.testName}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngày làm">{record.testDate ? dayjs(record.testDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="BS chỉ định">{record.orderingDoctor}</Descriptions.Item>
                                <Descriptions.Item label="Bất thường">{record.isAbnormal ? 'Có' : 'Không'}</Descriptions.Item>
                                {record.interpretation && (
                                  <Descriptions.Item label="Nhận định" span={2}>{record.interpretation}</Descriptions.Item>
                                )}
                              </Descriptions>
                              {record.results && record.results.length > 0 && (
                                <Table
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  dataSource={record.results}
                                  rowKey="testItemName"
                                  pagination={false}
                                  columns={[
                                    { title: 'Chỉ số', dataIndex: 'testItemName', key: 'testItemName' },
                                    { title: 'Kết quả', dataIndex: 'value', key: 'value', render: (val, row) => (
                                      <Text type={row.isAbnormal ? 'danger' : undefined} strong={row.isAbnormal}>{val} {row.unit || ''}</Text>
                                    )},
                                    { title: 'Tham chiếu', dataIndex: 'referenceRange', key: 'referenceRange' },
                                    { title: 'Flag', dataIndex: 'flag', key: 'flag', render: (val) => val ? <Tag color="red">{val}</Tag> : '-' },
                                  ]}
                                />
                              )}
                            </div>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'bills',
                label: 'Hóa đơn',
                children: (
                  <Table
                    columns={billColumns}
                    dataSource={bills}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Hóa đơn: ${record.billCode}`,
                          width: 600,
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Ngày">{record.billDate ? dayjs(record.billDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">{record.statusName || record.status}</Descriptions.Item>
                                <Descriptions.Item label="Tổng">{(record.subtotal ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BHYT">{(record.insuranceCoverage ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="BN trả">{(record.patientResponsibility ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                                <Descriptions.Item label="Còn nợ">{(record.amountDue ?? 0).toLocaleString('vi-VN')} VND</Descriptions.Item>
                              </Descriptions>
                              {record.items && record.items.length > 0 && (
                                <Table
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  dataSource={record.items}
                                  rowKey="description"
                                  pagination={false}
                                  columns={[
                                    { title: 'Dịch vụ', dataIndex: 'description', key: 'description' },
                                    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
                                    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'Thành tiền', dataIndex: 'amount', key: 'amount', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                    { title: 'BN trả', dataIndex: 'patientPays', key: 'patientPays', render: (v) => `${(v ?? 0).toLocaleString('vi-VN')}` },
                                  ]}
                                />
                              )}
                            </div>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'feedbacks',
                label: 'Đánh giá dịch vụ',
                children: (
                  <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Button
                          type="primary"
                          icon={<StarOutlined />}
                          onClick={() => setIsFeedbackModalOpen(true)}
                        >
                          Gửi đánh giá
                        </Button>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Điểm trung bình"
                            value={avgRating ? avgRating.toFixed(1) : 0}
                            suffix="/5"
                            prefix={<StarOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic title="Tổng đánh giá" value={feedbacks.length} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Tỷ lệ phản hồi"
                            value={responseRate}
                            suffix="%"
                          />
                        </Card>
                      </Col>
                    </Row>
                    <Table
                      columns={feedbackColumns}
                      dataSource={feedbacks}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: 'Chi tiết đánh giá',
                            width: 500,
                            content: (
                              <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                                <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
                                <Descriptions.Item label="Loại">{record.feedbackTypeName}</Descriptions.Item>
                                <Descriptions.Item label="Khoa">{record.departmentName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Điểm">{record.rating ? `${record.rating}/5` : '-'}</Descriptions.Item>
                                <Descriptions.Item label="Nội dung">{record.message}</Descriptions.Item>
                                <Descriptions.Item label="Phản hồi">{record.responseMessage || 'Chưa phản hồi'}</Descriptions.Item>
                                <Descriptions.Item label="Ngày gửi">{record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                              </Descriptions>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'features',
                label: 'Tính năng Portal',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                          <Title level={5}>Đặt lịch khám</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Đặt lịch hẹn trực tuyến, chọn bác sĩ và khung giờ phù hợp
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <FileTextOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                          <Title level={5}>Xem kết quả</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Tra cứu kết quả xét nghiệm, CĐHA trực tuyến
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <MedicineBoxOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                          <Title level={5}>Đơn thuốc</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem đơn thuốc, gửi đến nhà thuốc liên kết
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <CreditCardOutlined style={{ fontSize: 48, color: '#eb2f96' }} />
                          <Title level={5}>Thanh toán</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Thanh toán trực tuyến qua VNPay, Momo, Thẻ
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <HistoryOutlined style={{ fontSize: 48, color: '#faad14' }} />
                          <Title level={5}>Lịch sử khám</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Xem lịch sử khám bệnh, hồ sơ sức khỏe cá nhân
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card>
                        <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                          <StarOutlined style={{ fontSize: 48, color: '#13c2c2' }} />
                          <Title level={5}>Đánh giá</Title>
                          <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                            Gửi đánh giá, góp ý về chất lượng dịch vụ
                          </Paragraph>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'news',
                label: 'Tin tức',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      {[
                        { title: 'Hướng dẫn sử dụng cổng bệnh nhân', date: '2026-03-01', category: 'Hướng dẫn', content: 'Tài liệu hướng dẫn cách đăng ký, đặt lịch, xem kết quả xét nghiệm trực tuyến.' },
                        { title: 'Lịch khám chuyên gia tháng 3/2026', date: '2026-02-28', category: 'Thông báo', content: 'Danh sách bác sĩ chuyên gia khám tại bệnh viện trong tháng 3.' },
                        { title: 'Chương trình khám sức khỏe định kỳ', date: '2026-02-25', category: 'Sự kiện', content: 'Chương trình khám sức khỏe tổng quát giảm 30% từ 01/03 đến 31/03/2026.' },
                        { title: 'Quyền lợi BHYT mới nhất 2026', date: '2026-02-20', category: 'Chính sách', content: 'Cập nhật quyền lợi bảo hiểm y tế theo quy định mới của Chính phủ.' },
                        { title: 'Tạm ngừng phòng khám ngoài giờ', date: '2026-02-15', category: 'Thông báo', content: 'Từ ngày 20/02, tạm ngừng phòng khám ngoài giờ để bảo trì hệ thống.' },
                      ].map((item, idx) => (
                        <Col span={24} key={idx}>
                          <Card size="small" hoverable onClick={() => Modal.info({ title: item.title, width: 600, content: (<div><Tag color={item.category === 'Thông báo' ? 'blue' : item.category === 'Hướng dẫn' ? 'green' : item.category === 'Sự kiện' ? 'purple' : 'orange'}>{item.category}</Tag><Text type="secondary" style={{ marginLeft: 8 }}>{dayjs(item.date).format('DD/MM/YYYY')}</Text><Divider /><Paragraph>{item.content}</Paragraph></div>) })}>
                            <Space>
                              <Tag color={item.category === 'Thông báo' ? 'blue' : item.category === 'Hướng dẫn' ? 'green' : item.category === 'Sự kiện' ? 'purple' : 'orange'}>{item.category}</Tag>
                              <Text strong>{item.title}</Text>
                              <Text type="secondary">{dayjs(item.date).format('DD/MM/YYYY')}</Text>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ),
              },
              {
                key: 'notifications',
                label: (
                  <Badge count={notifications.filter((n) => !n.isRead).length} size="small" offset={[8, 0]}>
                    Thông báo
                  </Badge>
                ),
                children: (
                  <div>
                    {notifications.length === 0 ? (
                      <Result status="info" title="Không có thông báo" />
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '12px 0',
                            borderBottom: '1px solid #f0f0f0',
                            background: item.isRead ? 'transparent' : '#f6ffed',
                            paddingLeft: 8,
                            paddingRight: 8,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (!item.isRead) handleMarkNotificationRead(item.id);
                          }}
                        >
                          <div style={{ marginRight: 16, flexShrink: 0 }}>
                            <Badge dot={!item.isRead}><BellOutlined style={{ fontSize: 24 }} /></Badge>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{item.title}</div>
                            <Space orientation="vertical" size={0}>
                              <Text>{item.message}</Text>
                              <Text type="secondary">
                                {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                              </Text>
                            </Space>
                          </div>
                          {!item.isRead && (
                            <Tag color="blue" style={{ flexShrink: 0 }}>Mới</Tag>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'account',
                label: 'Tài khoản',
                children: account ? (
                  <>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Avatar size={100} icon={<UserOutlined />} src={account.avatarUrl} />
                      </Col>
                      <Col span={18}>
                        <Descriptions bordered size="small" column={2}>
                          <Descriptions.Item label="Họ tên">{account.fullName}</Descriptions.Item>
                          <Descriptions.Item label="Trạng thái">
                            {getAccountStatusTag(account.accountStatus)}
                          </Descriptions.Item>
                          <Descriptions.Item label="SĐT">{account.phone}</Descriptions.Item>
                          <Descriptions.Item label="Email">{account.email || '-'}</Descriptions.Item>
                          <Descriptions.Item label="Ngày sinh">
                            {account.dateOfBirth ? dayjs(account.dateOfBirth).format('DD/MM/YYYY') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="CCCD">{account.idNumber || '-'}</Descriptions.Item>
                          <Descriptions.Item label="BHYT" span={2}>
                            {account.healthInsurance?.cardNumber || 'Không có'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Địa chỉ" span={2}>
                            {account.address || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Liên kết BN">
                            {account.isLinkedToPatient ? (
                              <Tag color="green">Đã liên kết ({account.patientCode})</Tag>
                            ) : (
                              <Tag color="orange">Chưa liên kết</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="2FA">
                            {account.twoFactorEnabled ? (
                              <Tag color="green">Bật</Tag>
                            ) : (
                              <Tag color="default">Tắt</Tag>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Đăng nhập gần nhất">
                            {account.lastLoginAt ? dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Số lần đăng nhập">
                            {account.loginCount}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                    </Row>

                    <Divider>Hóa đơn chưa thanh toán</Divider>

                    {bills.filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid').length > 0 ? (
                      <div>
                        {bills
                          .filter((b) => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PartialPaid')
                          .map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{`Hóa đơn ${item.billCode}`}</div>
                                <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
                                  {`Ngày: ${item.billDate ? dayjs(item.billDate).format('DD/MM/YYYY') : '-'} | ${item.department || ''}`}
                                </div>
                              </div>
                              <Text strong style={{ color: '#ff4d4f' }}>
                                {(item.amountDue ?? 0).toLocaleString('vi-VN')} VND
                              </Text>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <Result status="success" title="Không có hóa đơn chưa thanh toán" />
                    )}
                  </>
                ) : (
                  <Result status="info" title="Chưa có thông tin tài khoản" />
                ),
              },
              {
                key: 'family',
                label: <span><TeamOutlined /> Gia đình</span>,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => {
                        setEditingFamily(null);
                        familyForm.resetFields();
                        setIsFamilyModalOpen(true);
                      }}
                    >
                      Thêm thành viên
                    </Button>
                    <Table
                      columns={familyColumns}
                      dataSource={familyMembers}
                      rowKey="id"
                    />
                  </>
                ),
              },
              {
                key: 'medicine-reminders',
                label: <span><ClockCircleOutlined /> Nhắc thuốc</span>,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => {
                        reminderForm.resetFields();
                        setIsReminderModalOpen(true);
                      }}
                    >
                      Thêm lịch
                    </Button>
                    <Table
                      columns={reminderColumns}
                      dataSource={reminders}
                      rowKey="id"
                    />
                  </>
                ),
              },
              {
                key: 'health',
                label: <span><HeartOutlined /> Sức khỏe</span>,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => {
                        healthForm.resetFields();
                        setIsHealthModalOpen(true);
                      }}
                    >
                      Ghi chỉ số
                    </Button>
                    <Table
                      columns={healthMetricColumns}
                      dataSource={healthMetrics}
                      rowKey="id"
                      style={{ marginBottom: 24 }}
                    />
                    <Card title="Biểu đồ xu hướng" size="small">
                      <Select
                        value={selectedTrendMetric}
                        onChange={setSelectedTrendMetric}
                        style={{ width: 200, marginBottom: 16 }}
                        options={trendMetricOptions}
                      />
                      {healthTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={healthTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(val) => dayjs(val).format('DD/MM')} />
                            <YAxis />
                            <Tooltip labelFormatter={(val) => dayjs(val).format('DD/MM/YYYY')} />
                            <Line
                              type="monotone"
                              dataKey={selectedTrendMetric}
                              stroke="#1890ff"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name={trendMetricOptions.find((o) => o.value === selectedTrendMetric)?.label || ''}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Result status="info" title="Chưa có dữ liệu xu hướng" />
                      )}
                    </Card>
                  </>
                ),
              },
              {
                key: 'qa',
                label: <span><QuestionCircleOutlined /> Hỏi đáp</span>,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => {
                        questionForm.resetFields();
                        setIsQuestionModalOpen(true);
                      }}
                    >
                      Đặt câu hỏi
                    </Button>
                    <Table
                      columns={questionColumns}
                      dataSource={questions}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          Modal.info({
                            title: record.subject,
                            width: 600,
                            content: (
                              <div style={{ marginTop: 16 }}>
                                <Descriptions bordered size="small" column={1}>
                                  <Descriptions.Item label="Danh mục">{record.category || '-'}</Descriptions.Item>
                                  <Descriptions.Item label="Ngày gửi">{record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
                                  <Descriptions.Item label="Trạng thái">{record.statusName}</Descriptions.Item>
                                  <Descriptions.Item label="Nội dung câu hỏi">
                                    <Paragraph>{record.content}</Paragraph>
                                  </Descriptions.Item>
                                  {record.answer && (
                                    <Descriptions.Item label="Trả lời">
                                      <Paragraph>{record.answer}</Paragraph>
                                      <Text type="secondary">
                                        {record.answeredByName} - {record.answeredAt ? dayjs(record.answeredAt).format('DD/MM/YYYY HH:mm') : ''}
                                      </Text>
                                    </Descriptions.Item>
                                  )}
                                </Descriptions>
                              </div>
                            ),
                          });
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
            ]}
          />
        </Card>

        {/* Appointment Modal */}
        <Modal
          title="Đặt lịch hẹn"
          open={isAppointmentModalOpen}
          onCancel={() => setIsAppointmentModalOpen(false)}
          onOk={() => appointmentForm.submit()}
        >
          <Form form={appointmentForm} layout="vertical" onFinish={handleBookAppointment}>
            <Form.Item name="departmentId" label="Khoa" rules={[{ required: true, message: 'Vui lòng chọn khoa' }]}>
              <Select placeholder="Chọn khoa">
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="doctorId" label="Bác sĩ">
              <Select placeholder="Chọn bác sĩ (không bắt buộc)" allowClear>
                {doctors.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.title ? `${d.title} ${d.name}` : d.name} - {d.specialty}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="date" label="Ngày" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="time" label="Giờ" rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}>
                  <Select placeholder="Chọn giờ">
                    <Select.Option value="08:00">08:00</Select.Option>
                    <Select.Option value="08:30">08:30</Select.Option>
                    <Select.Option value="09:00">09:00</Select.Option>
                    <Select.Option value="09:30">09:30</Select.Option>
                    <Select.Option value="10:00">10:00</Select.Option>
                    <Select.Option value="10:30">10:30</Select.Option>
                    <Select.Option value="14:00">14:00</Select.Option>
                    <Select.Option value="14:30">14:30</Select.Option>
                    <Select.Option value="15:00">15:00</Select.Option>
                    <Select.Option value="15:30">15:30</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="type" label="Loại khám" rules={[{ required: true, message: 'Vui lòng chọn loại khám' }]}>
              <Select placeholder="Chọn loại khám">
                <Select.Option value="NewVisit">Khám mới</Select.Option>
                <Select.Option value="FollowUp">Tái khám</Select.Option>
                <Select.Option value="HealthCheck">Khám sức khỏe</Select.Option>
                <Select.Option value="Telemedicine">Khám từ xa</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="notes" label="Lý do khám / Ghi chú">
              <TextArea rows={2} placeholder="Mô tả triệu chứng hoặc lý do khám..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          title="Gửi đánh giá"
          open={isFeedbackModalOpen}
          onCancel={() => setIsFeedbackModalOpen(false)}
          onOk={() => feedbackForm.submit()}
        >
          <Form form={feedbackForm} layout="vertical" onFinish={handleSubmitFeedback}>
            <Form.Item name="departmentId" label="Khoa">
              <Select placeholder="Chọn khoa (không bắt buộc)" allowClear>
                {departments.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="rating" label="Điểm đánh giá" rules={[{ required: true, message: 'Vui lòng chọn điểm' }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="comment" label="Nhận xét" rules={[{ required: true, message: 'Vui lòng nhập nhận xét' }]}>
              <TextArea rows={4} placeholder="Chia sẻ trải nghiệm của bạn..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Family Member Modal */}
        <Modal
          title={editingFamily ? 'Sửa thành viên' : 'Thêm thành viên gia đình'}
          open={isFamilyModalOpen}
          onCancel={() => { setIsFamilyModalOpen(false); setEditingFamily(null); }}
          onOk={() => familyForm.submit()}
        >
          <Form form={familyForm} layout="vertical" onFinish={handleSaveFamily}>
            <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
              <Input placeholder="Nhập họ tên" />
            </Form.Item>
            <Form.Item name="relationship" label="Quan hệ" rules={[{ required: true, message: 'Vui lòng chọn quan hệ' }]}>
              <Select placeholder="Chọn quan hệ">
                <Select.Option value="Vợ/Chồng">Vợ/Chồng</Select.Option>
                <Select.Option value="Con">Con</Select.Option>
                <Select.Option value="Bố/Mẹ">Bố/Mẹ</Select.Option>
                <Select.Option value="Anh/Chị/Em">Anh/Chị/Em</Select.Option>
                <Select.Option value="Ông/Bà">Ông/Bà</Select.Option>
                <Select.Option value="Khác">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dateOfBirth" label="Ngày sinh">
                  <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày sinh" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gender" label="Giới tính">
                  <Select placeholder="Chọn" allowClear>
                    <Select.Option value="Nam">Nam</Select.Option>
                    <Select.Option value="Nữ">Nữ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="idNumber" label="CCCD">
              <Input placeholder="Nhập số CCCD" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="Nhập SĐT" />
            </Form.Item>
            <Form.Item name="insuranceNumber" label="Số BHYT">
              <Input placeholder="Nhập số BHYT" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Medicine Reminder Modal */}
        <Modal
          title="Thêm lịch nhắc thuốc"
          open={isReminderModalOpen}
          onCancel={() => setIsReminderModalOpen(false)}
          onOk={() => reminderForm.submit()}
        >
          <Form form={reminderForm} layout="vertical" onFinish={handleSaveReminder}>
            <Form.Item name="medicineName" label="Tên thuốc" rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}>
              <Input placeholder="Nhập tên thuốc" />
            </Form.Item>
            <Form.Item name="dosage" label="Liều dùng" rules={[{ required: true, message: 'Vui lòng nhập liều dùng' }]}>
              <Input placeholder="VD: 1 viên, 5ml..." />
            </Form.Item>
            <Form.Item name="frequency" label="Tần suất" rules={[{ required: true, message: 'Vui lòng chọn tần suất' }]}>
              <Select placeholder="Chọn tần suất">
                <Select.Option value="1 lần/ngày">1 lần/ngày</Select.Option>
                <Select.Option value="2 lần/ngày">2 lần/ngày</Select.Option>
                <Select.Option value="3 lần/ngày">3 lần/ngày</Select.Option>
                <Select.Option value="4 lần/ngày">4 lần/ngày</Select.Option>
                <Select.Option value="Khi cần">Khi cần</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="times" label="Giờ uống">
              <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ" />
            </Form.Item>
            <Form.Item name="instructions" label="Hướng dẫn">
              <TextArea rows={2} placeholder="VD: Uống sau ăn, uống với nước ấm..." />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endDate" label="Ngày kết thúc">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Health Metric Modal */}
        <Modal
          title="Ghi chỉ số sức khỏe"
          open={isHealthModalOpen}
          onCancel={() => setIsHealthModalOpen(false)}
          onOk={() => healthForm.submit()}
          width={600}
        >
          <Form form={healthForm} layout="vertical" onFinish={handleSaveHealth}>
            <Form.Item name="recordedAt" label="Thời gian đo">
              <DatePicker showTime style={{ width: '100%' }} placeholder="Chọn thời gian (mặc định: hiện tại)" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bloodPressureSystolic" label="HA tâm thu (mmHg)">
                  <InputNumber style={{ width: '100%' }} min={50} max={300} placeholder="VD: 120" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bloodPressureDiastolic" label="HA tâm trương (mmHg)">
                  <InputNumber style={{ width: '100%' }} min={30} max={200} placeholder="VD: 80" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="heartRate" label="Nhịp tim (bpm)">
                  <InputNumber style={{ width: '100%' }} min={30} max={250} placeholder="VD: 72" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="spO2" label="SpO2 (%)">
                  <InputNumber style={{ width: '100%' }} min={50} max={100} placeholder="VD: 98" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="weight" label="Cân nặng (kg)">
                  <InputNumber style={{ width: '100%' }} min={1} max={300} step={0.1} placeholder="VD: 65" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="height" label="Chiều cao (cm)">
                  <InputNumber style={{ width: '100%' }} min={30} max={250} placeholder="VD: 170" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bloodGlucose" label="Đường huyết (mmol/L)">
                  <InputNumber style={{ width: '100%' }} min={0} max={50} step={0.1} placeholder="VD: 5.5" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="temperature" label="Nhiệt độ (°C)">
                  <InputNumber style={{ width: '100%' }} min={34} max={43} step={0.1} placeholder="VD: 36.5" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Question Modal */}
        <Modal
          title="Đặt câu hỏi"
          open={isQuestionModalOpen}
          onCancel={() => setIsQuestionModalOpen(false)}
          onOk={() => questionForm.submit()}
        >
          <Form form={questionForm} layout="vertical" onFinish={handleCreateQuestion}>
            <Form.Item name="subject" label="Chủ đề" rules={[{ required: true, message: 'Vui lòng nhập chủ đề' }]}>
              <Input placeholder="Nhập chủ đề câu hỏi" />
            </Form.Item>
            <Form.Item name="category" label="Danh mục">
              <Select placeholder="Chọn danh mục" allowClear>
                <Select.Option value="Khám bệnh">Khám bệnh</Select.Option>
                <Select.Option value="Xét nghiệm">Xét nghiệm</Select.Option>
                <Select.Option value="Thuốc">Thuốc</Select.Option>
                <Select.Option value="Bảo hiểm">Bảo hiểm</Select.Option>
                <Select.Option value="Thủ tục">Thủ tục</Select.Option>
                <Select.Option value="Khác">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="content" label="Nội dung câu hỏi" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
              <TextArea rows={4} placeholder="Mô tả chi tiết câu hỏi của bạn..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PatientPortal;
