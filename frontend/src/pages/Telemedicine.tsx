import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  TimePicker,
  Typography,
  Tabs,
  Avatar,
  Badge,
  Statistic,
  Divider,
  message,
  Alert,
  Descriptions,
  Spin,
} from 'antd';
import {
  VideoCameraOutlined,
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAppointments,
  getDashboard,
  createAppointment,
  cancelAppointment,
  createVideoSession,
  endSession,
  createConsultation,
  completeConsultation,
  createEPrescription,
} from '../api/telemedicine';
import type {
  TelemedicineAppointmentDto,
  TelemedicineDashboardDto,
  VideoSessionDto,
  TeleconsultationDto,
} from '../api/telemedicine';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';
import * as examApi from '../api/examination';

type BookingFormValues = {
  patientId?: string;
  doctorId?: string;
  departmentId?: string;
  appointmentType?: number;
  appointmentDate?: dayjs.Dayjs;
  appointmentTime?: dayjs.Dayjs;
  reason?: string;
  notes?: string;
};

type PrescriptionMedicineValue = {
  drugId: string;
  quantity?: number;
  dosage: string;
  frequency: string;
  route?: string;
  durationDays?: number;
  instruction?: string;
  drugName?: string;
  name?: string;
};

type PrescriptionFormValues = {
  medicines?: PrescriptionMedicineValue[];
  advice?: string;
  diagnosis?: string;
  followUp?: string;
};

const { Title, Text } = Typography;
const { TextArea } = Input;

const NumberTicker = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display.toLocaleString('vi-VN')}</>;
};

const Telemedicine: React.FC = () => {
  const [appointments, setAppointments] = useState<TelemedicineAppointmentDto[]>([]);
  const [dashboard, setDashboard] = useState<TelemedicineDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<TelemedicineAppointmentDto | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<VideoSessionDto | null>(null);
  const [activeConsultation, setActiveConsultation] = useState<TeleconsultationDto | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [consultEnding, setConsultEnding] = useState(false);
  const [medicineSearchLoading, setMedicineSearchLoading] = useState(false);
  const [medicineOptions, setMedicineOptions] = useState<examApi.MedicineDto[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [form] = Form.useForm();
  const [prescriptionForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getAppointments({ fromDate: today, toDate: today, pageSize: 200 }),
        getDashboard(today),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value?.data;
        if (data && data.items) {
          setAppointments(data.items);
        } else if (Array.isArray(data)) {
          setAppointments(data as unknown as TelemedicineAppointmentDto[]);
        } else {
          setAppointments([]);
        }
      } else {
        message.warning('Không thể tải danh sách lịch hẹn');
        setAppointments([]);
      }

      if (results[1].status === 'fulfilled') {
        setDashboard(results[1].value?.data || null);
      } else {
        setDashboard(null);
      }
    } catch {
      message.warning('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMedicineSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setMedicineOptions([]);
      return;
    }

    setMedicineSearchLoading(true);
    try {
      const res = await examApi.searchMedicines(keyword.trim());
      setMedicineOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMedicineOptions([]);
    } finally {
      setMedicineSearchLoading(false);
    }
  };

  const handleConsultModalClose = () => {
    setIsConsultModalOpen(false);
  };

  // Statistics from dashboard or derived from appointments
  const todayTotal = dashboard?.totalAppointments ?? appointments.length;
  const waitingCount = dashboard
    ? ((dashboard.totalAppointments || 0) - (dashboard.completedAppointments || 0) - (dashboard.cancelledAppointments || 0) - (dashboard.noShowAppointments || 0))
    : appointments.filter((a) => a.status === 1 || a.status === 2).length; // 1=scheduled, 2=waiting
  const completedCount = dashboard?.completedAppointments ?? appointments.filter((a) => a.status === 4).length;
  const inProgressCount = appointments.filter((a) => a.status === 3).length; // 3=in_progress

  // Status mapping: API uses numeric status
  const getStatusTag = (status: number, statusName?: string) => {
    const statusConfig: Record<number, { color: string; text: string }> = {
      0: { color: 'default', text: 'Mới tạo' },
      1: { color: 'blue', text: 'Đã đặt lịch' },
      2: { color: 'orange', text: 'Chờ khám' },
      3: { color: 'green', text: 'Đang khám' },
      4: { color: 'default', text: 'Hoàn thành' },
      5: { color: 'red', text: 'Đã hủy' },
      6: { color: 'volcano', text: 'Vắng mặt' },
    };
    const config = statusConfig[status] || { color: 'default', text: statusName || `Status ${status}` };
    return <Tag color={config.color}>{statusName || config.text}</Tag>;
  };

  const getPaymentStatusTag = (paymentStatus: number, paymentStatusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'warning', text: 'Chưa thanh toán' },
      1: { color: 'success', text: 'Đã thanh toán' },
      2: { color: 'error', text: 'Đã hoàn tiền' },
    };
    const c = config[paymentStatus] || { color: 'default', text: paymentStatusName || `Payment ${paymentStatus}` };
    return <Tag color={c.color}>{paymentStatusName || c.text}</Tag>;
  };

  const handleStartConsultation = async (appointment: TelemedicineAppointmentDto) => {
    setSelectedAppointment(appointment);
    setSessionLoading(true);
    setCameraEnabled(true);
    setMicEnabled(true);
    try {
      // Create video session
      const sessionRes = await createVideoSession({ appointmentId: appointment.id });
      const session = sessionRes?.data;
      if (session) {
        setActiveSession(session);
      }

      // Create consultation record
      const consultRes = await createConsultation({
        sessionId: session?.id || '',
        appointmentId: appointment.id,
        chiefComplaint: appointment.chiefComplaint,
      });
      if (consultRes?.data) {
        setActiveConsultation(consultRes.data);
      }

      // Refresh data to get updated status
      fetchData();
      setIsConsultModalOpen(true);
    } catch {
      message.warning('Không thể bắt đầu phiên khám. Vui lòng thử lại.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleEndConsultation = async () => {
    setConsultEnding(true);
    try {
      if (activeSession?.id) {
        await endSession(activeSession.id, 'Kết thúc khám');
      }
      if (activeConsultation?.id && selectedAppointment) {
        await completeConsultation({
          consultationId: activeConsultation.id,
          assessment: 'Completed via telemedicine',
          diagnosisMain: activeConsultation.diagnosisMain || '',
          diagnosisMainIcd: activeConsultation.diagnosisMainIcd || '',
          treatmentPlan: activeConsultation.treatmentPlan || '',
        });
      }
      setActiveSession(null);
      setActiveConsultation(null);
      setIsConsultModalOpen(false);
      message.success('Đã kết thúc buổi khám');
      fetchData();
    } catch {
      message.warning('Lỗi khi kết thúc phiên khám');
    } finally {
      setConsultEnding(false);
    }
  };

  const handleBookAppointment = async (values: BookingFormValues) => {
    setBookingLoading(true);
    try {
      await createAppointment({
        patientId: values.patientId || '',
        doctorId: values.doctorId || '',
        departmentId: values.departmentId || '',
        appointmentType: values.appointmentType || 2, // default FollowUp
        scheduledDate: values.appointmentDate?.format('YYYY-MM-DD') || '',
        scheduledTime: values.appointmentTime?.format('HH:mm') || '',
        durationMinutes: 30,
        chiefComplaint: values.reason,
        notes: values.notes,
      });
      setIsBookingModalOpen(false);
      form.resetFields();
      message.success('Đã đặt lịch hẹn thành công');
      fetchData();
    } catch {
      message.warning('Không thể đặt lịch hẹn. Vui lòng thử lại.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (appointment: TelemedicineAppointmentDto) => {
    Modal.confirm({
      title: 'Xác nhận hủy lịch hẹn',
      content: `Bạn có chắc muốn hủy lịch hẹn của ${appointment.patientName}?`,
      okText: 'Hủy lịch',
      okType: 'danger',
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          await cancelAppointment(appointment.id, 'Hủy bởi bác sĩ');
          message.success('Đã hủy lịch hẹn');
          fetchData();
        } catch {
          message.warning('Không thể hủy lịch hẹn');
        }
      },
    });
  };

  const handleSavePrescription = async () => {
    try {
      const values = await prescriptionForm.validateFields() as PrescriptionFormValues;
      if (!activeConsultation?.id) {
        message.warning('Không có phiên khám để kê đơn');
        return;
      }
      await createEPrescription({
        consultationId: activeConsultation.id,
        items: (values.medicines || []).map((m) => ({
          drugId: m.drugId,
          quantity: Number(m.quantity) || 1,
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          route: m.route || 'Oral',
          durationDays: Number(m.durationDays),
          instructions: m.instruction?.trim(),
        })),
        instructions: values.advice?.trim(),
      });
      message.success('Đã lưu đơn thuốc');
      setIsPrescriptionModalOpen(false);
      prescriptionForm.resetFields();
      fetchData();
    } catch {
      message.warning('Không thể lưu đơn thuốc');
    }
  };

  const handlePrintPrescription = () => {
    const values = prescriptionForm.getFieldsValue();
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedAppointment) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Đơn thuốc điện tử</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .hospital-name { font-size: 18px; font-weight: bold; }
          .title { font-size: 24px; font-weight: bold; margin: 20px 0; }
          .info-row { display: flex; margin-bottom: 10px; }
          .info-label { width: 150px; font-weight: bold; }
          .prescription-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .prescription-table th, .prescription-table td { border: 1px solid #000; padding: 8px; }
          .prescription-table th { background: #f0f0f0; }
          .signature { margin-top: 50px; text-align: right; }
          .digital-signature { color: blue; font-style: italic; margin-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">${HOSPITAL_NAME}</div>
          <div>Địa chỉ: ${HOSPITAL_ADDRESS}</div>
          <div>DT: ${HOSPITAL_PHONE}</div>
        </div>

        <div class="title" style="text-align: center;">ĐƠN THUỐC ĐIỆN TỬ</div>
        <div style="text-align: center; margin-bottom: 20px;">(Khám bệnh từ xa - Telemedicine)</div>

        <div class="info-row">
          <span class="info-label">Họ tên BN:</span>
          <span>${selectedAppointment.patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">SĐT:</span>
          <span>${selectedAppointment.phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Chẩn đoán:</span>
          <span>${values.diagnosis || ''}</span>
        </div>

        <table class="prescription-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên thuốc</th>
              <th>Liều dùng</th>
              <th>Số lượng</th>
              <th>Cách dùng</th>
            </tr>
          </thead>
          <tbody>
            ${(values.medicines || []).map((m: PrescriptionMedicineValue, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.drugName || m.name || ''}</td>
                <td>${m.dosage || ''}</td>
                <td>${m.quantity || ''}</td>
                <td>${m.instruction || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="info-row">
          <span class="info-label">Lời dặn:</span>
          <span>${values.advice || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tái khám:</span>
          <span>${values.followUp || ''}</span>
        </div>

        <div class="signature">
          <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
          <div style="margin-top: 10px; font-weight: bold;">BÁC SĨ KÊ ĐƠN</div>
          <div class="digital-signature">[Chữ ký số]</div>
          <div style="margin-top: 30px; font-weight: bold;">${selectedAppointment.doctorName}</div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getTypeTag = (appointmentType: number, appointmentTypeName?: string) => {
    // appointmentType: 1=FirstVisit, 2=FollowUp, 3=SecondOpinion
    const config: Record<number, { icon: React.ReactNode; color: string; text: string }> = {
      1: { icon: <UserOutlined />, color: 'blue', text: 'Khám lần đầu' },
      2: { icon: <CalendarOutlined />, color: 'green', text: 'Tái khám' },
      3: { icon: <FileTextOutlined />, color: 'purple', text: 'Hội ý' },
    };
    const c = config[appointmentType] || { icon: <VideoCameraOutlined />, color: 'default', text: appointmentTypeName || `Type ${appointmentType}` };
    return (
      <Tag icon={c.icon} color={c.color}>
        {appointmentTypeName || c.text}
      </Tag>
    );
  };

  // Filter appointments for tabs
  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayAppointments = appointments.filter(
    (a) => a.scheduledDate?.substring(0, 10) === todayStr
  );
  const upcomingAppointments = appointments.filter(
    (a) => a.scheduledDate?.substring(0, 10) > todayStr
  );
  const historyAppointments = appointments.filter(
    (a) => a.status === 4 // completed
  );

  const columns: ColumnsType<TelemedicineAppointmentDto> = [
    {
      title: 'Thời gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.scheduledTime}</Text>
          <Text type="secondary">{record.durationMinutes} phút</Text>
        </Space>
      ),
    },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <Space orientation="vertical" size={0}>
            <Text strong>{record.patientName}</Text>
            <Text type="secondary">{record.phone}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Bác sĩ',
      key: 'doctor',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.doctorName}</Text>
          <Text type="secondary">{record.doctorSpecialty || record.departmentName}</Text>
        </Space>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'appointmentType',
      key: 'appointmentType',
      width: 130,
      render: (type, record) => getTypeTag(type, record.appointmentTypeName),
    },
    {
      title: 'Lý do khám',
      dataIndex: 'chiefComplaint',
      key: 'chiefComplaint',
      ellipsis: true,
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      width: 140,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.fee?.toLocaleString('vi-VN')} đ</Text>
          {getPaymentStatusTag(record.paymentStatus, record.paymentStatusName)}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => getStatusTag(status, record.statusName),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          {(record.status === 1 || record.status === 2) && (
            <>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                size="small"
                loading={sessionLoading}
                onClick={() => handleStartConsultation(record)}
              >
                Bắt đầu
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancelAppointment(record)}
              >
                Hủy
              </Button>
            </>
          )}
          {record.status === 3 && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              size="small"
              onClick={() => {
                setSelectedAppointment(record);
                setIsConsultModalOpen(true);
              }}
            >
              Tiếp tục
            </Button>
          )}
          {record.status === 4 && (
            <Button size="small" icon={<FileTextOutlined />}>
              Xem HS
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderDetailModal = (record: TelemedicineAppointmentDto) => {
    Modal.info({
      title: 'Chi tiết lịch khám từ xa',
      width: 500,
      content: (
        <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
          <Descriptions.Item label="Mã lịch hẹn">{record.appointmentCode}</Descriptions.Item>
          <Descriptions.Item label="Bệnh nhân">{record.patientName}</Descriptions.Item>
          <Descriptions.Item label="SĐT">{record.phone}</Descriptions.Item>
          <Descriptions.Item label="Ngày hẹn">{record.scheduledDate?.substring(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="Giờ">{record.scheduledTime}</Descriptions.Item>
          <Descriptions.Item label="Bác sĩ">{record.doctorName}</Descriptions.Item>
          <Descriptions.Item label="Khoa">{record.departmentName}</Descriptions.Item>
          <Descriptions.Item label="Lý do">{record.chiefComplaint || '-'}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{record.statusName || `Status ${record.status}`}</Descriptions.Item>
          <Descriptions.Item label="Phí">{record.fee?.toLocaleString('vi-VN')} đ</Descriptions.Item>
          <Descriptions.Item label="Thanh toán">{record.paymentStatusName || '-'}</Descriptions.Item>
          {record.notes && <Descriptions.Item label="Ghi chú">{record.notes}</Descriptions.Item>}
        </Descriptions>
      ),
    });
  };

  return (
    <Spin spinning={loading}>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Gradient mesh background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Khám bệnh từ xa (Telemedicine)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </Space>
        </motion.div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Lịch hẹn hôm nay"
                value={todayTotal}
                formatter={() => <NumberTicker value={todayTotal} />}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Đang chờ"
                value={waitingCount}
                formatter={() => <NumberTicker value={waitingCount} />}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Đang khám"
                value={inProgressCount}
                formatter={() => <NumberTicker value={inProgressCount} />}
                prefix={<VideoCameraOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <Card style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}>
              <Statistic
                title="Hoàn thành"
                value={completedCount}
                formatter={() => <NumberTicker value={completedCount} />}
                prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Extra dashboard stats if available */}
        {dashboard && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Thời gian chờ TB"
                  value={dashboard.averageWaitTimeMinutes}
                  suffix="phút"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Thời gian khám TB"
                  value={dashboard.averageConsultationDurationMinutes}
                  suffix="phút"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Doanh thu"
                  value={dashboard.totalRevenue}
                  formatter={(val) => `${Number(val).toLocaleString('vi-VN')}d`}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Main Content */}
        <Card
          title="Danh sách lịch hẹn"
          extra={
            <Button type="primary" onClick={() => setIsBookingModalOpen(true)}>
              Đặt lịch mới
            </Button>
          }
        >
          <Alert
            title="Lưu ý"
            description="Chỉ áp dụng cho tái khám, tư vấn, bệnh mạn tính ổn định. Không áp dụng cho cấp cứu, PTTT, thủ thuật xâm lấn."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Tabs
            defaultActiveKey="today"
            items={[
              {
                key: 'today',
                label: `Hôm nay (${todayAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={todayAppointments}
                    rowKey="id"
                    pagination={false}
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'upcoming',
                label: `Sắp tới (${upcomingAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={upcomingAppointments}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'history',
                label: `Lịch sử (${historyAppointments.length})`,
                children: (
                  <Table
                    columns={columns}
                    dataSource={historyAppointments}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => renderDetailModal(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
            ]}
          />
        </Card>

        {/* Booking Modal */}
        <Modal
          title="Đặt lịch khám từ xa"
          open={isBookingModalOpen}
          onCancel={() => setIsBookingModalOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={bookingLoading}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleBookAppointment}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="patientId"
                  label="Mã bệnh nhân"
                  rules={[{ required: true, message: 'Vui lòng nhập mã bệnh nhân' }]}
                >
                  <Input placeholder="VD: P001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="doctorId"
                  label="Mã bác sĩ"
                  rules={[{ required: true, message: 'Vui lòng nhập mã bác sĩ' }]}
                >
                  <Input placeholder="VD: D001" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="departmentId"
                  label="Mã khoa"
                  rules={[{ required: true, message: 'Vui lòng nhập mã khoa' }]}
                >
                  <Input placeholder="VD: DEP001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="appointmentType"
                  label="Loại khám"
                  rules={[{ required: true, message: 'Vui lòng chọn loại khám' }]}
                >
                  <Select placeholder="Chọn loại khám">
                    <Select.Option value={1}>Khám lần đầu</Select.Option>
                    <Select.Option value={2}>Tái khám</Select.Option>
                    <Select.Option value={3}>Hội ý / Second Opinion</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="appointmentDate"
                  label="Ngày khám"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="appointmentTime"
                  label="Giờ khám"
                  rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="reason"
              label="Lý do khám"
              rules={[{ required: true, message: 'Vui lòng nhập lý do khám' }]}
            >
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Consultation Modal */}
        <Modal
          title={
            <Space>
              <Badge status="processing" />
              <span>Phòng khám từ xa</span>
            </Space>
          }
          open={isConsultModalOpen}
          onCancel={handleConsultModalClose}
          footer={null}
          width={900}
          closable
        >
          {selectedAppointment && (
            <Row gutter={16}>
              {/* Video Area */}
              <Col span={16}>
                <Card
                  style={{
                    height: 400,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Space orientation="vertical" align="center">
                    <Avatar size={100} icon={<UserOutlined />} />
                    <Text style={{ color: '#fff' }}>{selectedAppointment.patientName}</Text>
                    <Text style={{ color: '#999' }}>
                      {activeSession?.status === 1
                        ? 'Đang kết nối...'
                        : 'Chờ bệnh nhân tham gia'}
                    </Text>
                    {selectedAppointment.videoRoomUrl && (
                      <Text style={{ color: '#52c41a', fontSize: 12 }}>
                        Room: {selectedAppointment.videoRoomUrl}
                      </Text>
                    )}
                  </Space>
                </Card>
                <Space style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}>
                  <Button icon={<VideoCameraOutlined />} type={cameraEnabled ? 'primary' : 'default'}
                    onClick={() => setCameraEnabled((prev) => !prev)}>
                    {cameraEnabled ? 'Tắt camera' : 'Bật camera'}
                  </Button>
                  <Button icon={<PhoneOutlined />} type={micEnabled ? 'primary' : 'default'}
                    onClick={() => setMicEnabled((prev) => !prev)}>
                    {micEnabled ? 'Tắt mic' : 'Bật mic'}
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={consultEnding}
                    onClick={handleEndConsultation}
                  >
                    Kết thúc
                  </Button>
                </Space>
              </Col>

              {/* Patient Info & Notes */}
              <Col span={8}>
                <Card title="Thông tin bệnh nhân" size="small">
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Họ tên:</Text>
                      <Text strong style={{ marginLeft: 8 }}>
                        {selectedAppointment.patientName}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">SĐT:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.phone}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Khoa:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.departmentName}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Lý do:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.chiefComplaint}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Phí:</Text>
                      <Text style={{ marginLeft: 8 }}>{selectedAppointment.fee?.toLocaleString('vi-VN')}d</Text>
                    </div>
                  </Space>
                </Card>

                <Card title="Ghi chú khám" size="small" style={{ marginTop: 16 }}>
                  <TextArea rows={6} placeholder="Nhập ghi chú..." />
                </Card>

                <Space style={{ marginTop: 16, width: '100%' }} orientation="vertical">
                  <Button
                    type="primary"
                    icon={<MedicineBoxOutlined />}
                    block
                    onClick={() => setIsPrescriptionModalOpen(true)}
                  >
                    Kê đơn thuốc
                  </Button>
                  <Button icon={<FileTextOutlined />} block>
                    Xem hồ sơ
                  </Button>
                </Space>
              </Col>
            </Row>
          )}
        </Modal>

        {/* E-Prescription Modal */}
        <Modal
          title="Kê đơn thuốc điện tử"
          open={isPrescriptionModalOpen}
          onCancel={() => setIsPrescriptionModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setIsPrescriptionModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintPrescription}>
              In đơn
            </Button>,
            <Button key="save" type="primary" onClick={handleSavePrescription}>
              Lưu & Gửi
            </Button>,
          ]}
          width={700}
        >
          <Alert
            title="Đơn thuốc điện tử sẽ được ký số và gửi đến nhà thuốc liên kết"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form form={prescriptionForm} layout="vertical">
            <Form.Item name="diagnosis" label="Chẩn đoán" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.List name="medicines">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={8} key={key}>
                      <Col span={7}>
                        <Form.Item
                          {...restField}
                          name={[name, 'drugName']}
                          rules={[{ required: true, message: 'Chọn thuốc' }]}
                        >
                          <Select
                            showSearch
                            placeholder="Chọn thuốc"
                            filterOption={false}
                            onSearch={handleMedicineSearch}
                            loading={medicineSearchLoading}
                            options={medicineOptions.map((medicine) => ({
                              value: medicine.name,
                              label: `${medicine.name}${medicine.unit ? ` (${medicine.unit})` : ''}`,
                              medicineId: medicine.id,
                            }))}
                            onChange={(_, option) => {
                              prescriptionForm.setFieldValue(
                                ['medicines', name, 'drugId'],
                                (option as { medicineId?: string })?.medicineId || '',
                              );
                            }}
                          />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'drugId']} hidden rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'dosage']} rules={[{ required: true, message: 'Nhập liều dùng' }]}>
                          <Input placeholder="Liều dùng" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true, message: 'SL' }]}>
                          <Input type="number" min={1} placeholder="SL" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'frequency']} rules={[{ required: true, message: 'Tần suất' }]}>
                          <Input placeholder="Tần suất" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...restField} name={[name, 'durationDays']} rules={[{ required: true, message: 'Số ngày' }]}>
                          <Input type="number" min={1} placeholder="Ngày" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...restField} name={[name, 'route']} initialValue="Oral">
                          <Select
                            options={[
                              { value: 'Oral', label: 'Uống' },
                              { value: 'Topical', label: 'Bôi' },
                              { value: 'Injection', label: 'Tiêm' },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...restField} name={[name, 'instruction']}>
                          <Input placeholder="Cách dùng" />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Button danger onClick={() => remove(name)}>
                          Xóa
                        </Button>
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ route: 'Oral', quantity: 1, durationDays: 7 })}
                    block
                  >
                    Thêm thuốc
                  </Button>
                </>
              )}
            </Form.List>
            <Divider />
            <Form.Item name="advice" label="Lời dặn">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="followUp" label="Hẹn tái khám">
              <Input placeholder="VD: Sau 2 tuần" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Telemedicine;
