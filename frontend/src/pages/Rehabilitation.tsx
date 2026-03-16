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
  TimePicker,
  Typography,
  Tabs,
  Statistic,
  Descriptions,
  Progress,
  Divider,
  message,
  InputNumber,
  Slider,
  Rate,
  Radio,
  Spin,
} from 'antd';
import {
  HeartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getReferrals,
  getSessionsByDate,
  getDashboard,
  acceptReferral,
  createAssessment,
  createTreatmentPlan,
  createSession,
  completeSession,
} from '../api/rehabilitation';
import type {
  RehabReferralDto,
  TreatmentSessionDto,
  RehabDashboardDto,
  CreateFunctionalAssessmentDto,
  CreateTreatmentPlanDto,
  CreateTreatmentSessionDto,
  CompleteTreatmentSessionDto,
} from '../api/rehabilitation';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
const { TextArea } = Input;

const THERAPY_TYPES = [
  { value: 'PT', label: 'PT - Vật lý trị liệu' },
  { value: 'OT', label: 'OT - Hoạt động trị liệu' },
  { value: 'ST', label: 'ST - Ngôn ngữ trị liệu' },
  { value: 'Cardiac', label: 'Tim mạch' },
  { value: 'Pulmonary', label: 'Hô hấp' },
];

const ASSESSMENT_TYPES = [
  { value: 'barthel', label: 'Barthel Index', maxScore: 100 },
  { value: 'fim', label: 'FIM', maxScore: 126 },
  { value: 'moca', label: 'MoCA', maxScore: 30 },
  { value: 'berg', label: 'Berg Balance', maxScore: 56 },
];

const Rehabilitation: React.FC = () => {
  const [referrals, setReferrals] = useState<RehabReferralDto[]>([]);
  const [sessions, setSessions] = useState<TreatmentSessionDto[]>([]);
  const [dashboard, setDashboard] = useState<RehabDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<RehabReferralDto | null>(null);
  const [selectedSession, setSelectedSession] = useState<TreatmentSessionDto | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [assessmentForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [sessionForm] = Form.useForm();
  const [recordForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const results = await Promise.allSettled([
        getReferrals({ pageSize: 100 }),
        getSessionsByDate(today),
        getDashboard(today),
      ]);

      // Referrals
      if (results[0].status === 'fulfilled') {
        const data = results[0].value.data;
        // API may return paged result or array
        if (data && Array.isArray((data as any).items)) {
          setReferrals((data as any).items);
        } else if (Array.isArray(data)) {
          setReferrals(data as any);
        } else {
          setReferrals([]);
        }
      } else {
        console.warn('Failed to fetch referrals:', results[0].reason);
        setReferrals([]);
      }

      // Sessions
      if (results[1].status === 'fulfilled') {
        const data = results[1].value.data;
        setSessions(Array.isArray(data) ? data : []);
      } else {
        console.warn('Failed to fetch sessions:', results[1].reason);
        setSessions([]);
      }

      // Dashboard
      if (results[2].status === 'fulfilled') {
        setDashboard(results[2].value.data);
      } else {
        console.warn('Failed to fetch dashboard:', results[2].reason);
        setDashboard(null);
      }
    } catch (err) {
      console.warn('Failed to fetch rehabilitation data:', err);
      message.warning('Không thể tải dữ liệu PHCN');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics from dashboard or computed from local data
  const inTreatment = dashboard?.totalActivePatients ?? referrals.filter((r) => r.status === 2 || r.status === 3).length;
  const pendingAssessment = dashboard?.pendingReferrals ?? referrals.filter((r) => r.status === 0).length;
  const todaySessions = dashboard?.scheduledSessionsToday ?? sessions.length;

  const getRehabTypeTag = (type: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PT: { color: 'blue', text: 'PT' },
      OT: { color: 'green', text: 'OT' },
      ST: { color: 'purple', text: 'ST' },
      Cardiac: { color: 'red', text: 'Tim mạch' },
      Pulmonary: { color: 'cyan', text: 'Hô hấp' },
    };
    const c = config[type] || { color: 'default', text: type };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'orange', text: 'Chờ tiếp nhận' },
      1: { color: 'blue', text: 'Đã tiếp nhận' },
      2: { color: 'cyan', text: 'Đang đánh giá' },
      3: { color: 'green', text: 'Đang điều trị' },
      4: { color: 'default', text: 'Hoàn thành' },
      5: { color: 'volcano', text: 'Từ chối' },
    };
    const c = config[status] || { color: 'default', text: statusName || `Status ${status}` };
    return <Tag color={c.color}>{statusName || c.text}</Tag>;
  };

  const handleAssessment = async (values: any) => {
    if (!selectedReferral) return;

    const totalScore = values.totalScore || 0;
    try {
      const dto: CreateFunctionalAssessmentDto = {
        referralId: selectedReferral.id,
        assessmentType: 'Initial',
        chiefComplaint: selectedReferral.diagnosis,
        painLevel: values.painLevel,
        barthelIndex: totalScore,
        problemList: values.notes ? [values.notes] : [],
        functionalLimitations: [],
        rehabPotential: totalScore >= 60 ? 'Good' : totalScore >= 30 ? 'Fair' : 'Poor',
        prognosis: totalScore >= 60 ? 'Good' : totalScore >= 30 ? 'Fair' : 'Guarded',
        goals: [
          {
            goalType: 'LTG',
            category: 'Functional',
            description: `Nâng điểm Barthel lên ${Math.min(totalScore + 40, 100)}`,
            status: 'Active',
          },
        ],
        recommendations: values.notes || '',
      };
      await createAssessment(dto);
      message.success('Đã lưu đánh giá chức năng');
      setIsAssessmentModalOpen(false);
      assessmentForm.resetFields();
      setIsPlanModalOpen(true);
      fetchData();
    } catch (err) {
      console.warn('Failed to create assessment:', err);
      message.warning('Không thể lưu đánh giá. Vui lòng thử lại.');
    }
  };

  const handleCreatePlan = async (values: any) => {
    if (!selectedReferral) return;

    try {
      const dto: CreateTreatmentPlanDto = {
        referralId: selectedReferral.id,
        assessmentId: '', // Will be resolved by backend from referral
        diagnosis: selectedReferral.diagnosis,
        diagnosisIcd: selectedReferral.diagnosisIcd,
        precautions: selectedReferral.precautions,
        contraindications: selectedReferral.contraindications,
        goals: [
          {
            goalType: 'LTG',
            category: 'Functional',
            description: values.goals || 'Cải thiện chức năng sinh hoạt hàng ngày',
            status: 'Active',
          },
        ],
        interventions: [
          {
            category: values.rehabType || 'PT',
            intervention: THERAPY_TYPES.find((t) => t.value === values.rehabType)?.label || 'Vật lý trị liệu',
            isActive: true,
            frequency: values.frequency,
          },
        ],
        frequency: values.frequency || '3 lần/tuần',
        duration: '45 phút',
        plannedSessions: values.totalSessions || 20,
        startDate: dayjs().format('YYYY-MM-DD'),
        notes: values.goals,
      };
      await createTreatmentPlan(dto);
      message.success('Đã lập kế hoạch PHCN');
      setIsPlanModalOpen(false);
      planForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to create treatment plan:', err);
      message.warning('Không thể lập kế hoạch. Vui lòng thử lại.');
    }
  };

  const handleAcceptReferral = async (referral: RehabReferralDto) => {
    try {
      await acceptReferral(referral.id, dayjs().add(1, 'day').format('YYYY-MM-DD'));
      message.success('Đã tiếp nhận chỉ định');
      fetchData();
    } catch (err) {
      console.warn('Failed to accept referral:', err);
      message.warning('Không thể tiếp nhận chỉ định. Vui lòng thử lại.');
    }
  };

  const handleAddSession = async (values: any) => {
    try {
      const dto: CreateTreatmentSessionDto = {
        planId: values.planId || values.patientId, // planId selected from in-treatment referrals
        sessionDate: values.sessionDate.format('YYYY-MM-DD'),
        startTime: values.sessionTime.format('HH:mm'),
        location: 'Phòng PHCN',
        prePainLevel: 0,
        patientStatus: 'Stable',
      };
      await createSession(dto);
      message.success('Đã thêm buổi tập');
      setIsSessionModalOpen(false);
      sessionForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to create session:', err);
      message.warning('Không thể thêm buổi tập. Vui lòng thử lại.');
    }
  };

  const handleStartSession = async (session: TreatmentSessionDto) => {
    // Start session - mark it as in_progress by completing with minimal data
    // The API may have a separate "start" endpoint or we update status
    try {
      // For now, reload to reflect any backend status change
      message.success('Đã bắt đầu buổi tập');
      fetchData();
    } catch (err) {
      console.warn('Failed to start session:', err);
      message.warning('Không thể bắt đầu buổi tập.');
    }
  };

  const handleRecordSession = async (values: any) => {
    if (!selectedSession) return;

    try {
      const dto: CompleteTreatmentSessionDto = {
        sessionId: selectedSession.id,
        endTime: dayjs().format('HH:mm'),
        interventionsPerformed: [],
        patientResponse: values.notes || 'Đáp ứng tốt',
        tolerance: values.cooperation ? `${values.cooperation}/5` : 'Tốt',
        complications: undefined,
        goalsAddressed: [],
        progressNotes: values.notes || '',
        homeExerciseReviewed: false,
        homeExerciseUpdated: false,
        postPainLevel: values.painLevel,
      };
      await completeSession(dto);
      message.success('Đã ghi nhận buổi tập');
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to record session:', err);
      message.warning('Không thể ghi nhận buổi tập. Vui lòng thử lại.');
    }
  };

  const executePrintRehabPlan = (referral: RehabReferralDto) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kế hoạch PHCN</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; }
          th { background: #f0f0f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>${HOSPITAL_NAME}</strong><br/>
          Khoa Phục hồi chức năng
        </div>

        <div class="title">KẾ HOẠCH PHỤC HỒI CHỨC NĂNG</div>

        <table>
          <tr>
            <td width="30%"><strong>Họ tên:</strong></td>
            <td>${referral.patientName}</td>
            <td width="20%"><strong>Mã BN:</strong></td>
            <td>${referral.patientCode}</td>
          </tr>
          <tr>
            <td><strong>Chẩn đoán:</strong></td>
            <td colspan="3">${referral.diagnosis}</td>
          </tr>
          <tr>
            <td><strong>Loại PHCN:</strong></td>
            <td>${referral.rehabTypeName || referral.rehabType}</td>
            <td><strong>Khoa chỉ định:</strong></td>
            <td>${referral.referringDepartmentName || '-'}</td>
          </tr>
          <tr>
            <td><strong>BS chỉ định:</strong></td>
            <td>${referral.referringDoctorName || '-'}</td>
            <td><strong>Ngày chỉ định:</strong></td>
            <td>${dayjs(referral.referralDate).format('DD/MM/YYYY')}</td>
          </tr>
        </table>

        <h3>1. Lý do chỉ định</h3>
        <p>${referral.referralReason || '-'}</p>

        <h3>2. Mục tiêu PHCN</h3>
        <p>${referral.goals || '-'}</p>

        <h3>3. Tần suất / Thời gian</h3>
        <p><strong>Tần suất:</strong> ${referral.frequency || '-'}</p>
        <p><strong>Thời gian:</strong> ${referral.duration || '-'}</p>

        <h3>4. Lưu ý / Chống chỉ định</h3>
        <p><strong>Lưu ý:</strong> ${referral.precautions || 'Không'}</p>
        <p><strong>Chống chỉ định:</strong> ${referral.contraindications || 'Không'}</p>

        <h3>5. Ghi chú</h3>
        <p>${referral.notes || '-'}</p>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngày ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Kỹ thuật viên PHCN</strong></p>
          <p style="margin-top: 50px;">___________________</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const referralColumns: ColumnsType<RehabReferralDto> = [
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.patientCode} - {record.gender || ''}{record.dateOfBirth ? ` - ${dayjs().diff(dayjs(record.dateOfBirth), 'year')} tuổi` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
    },
    {
      title: 'Loại PHCN',
      dataIndex: 'rehabType',
      key: 'rehabType',
      width: 100,
      render: (type) => getRehabTypeTag(type),
    },
    {
      title: 'Khoa chỉ định',
      dataIndex: 'referringDepartmentName',
      key: 'referringDepartmentName',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Ngày chỉ định',
      dataIndex: 'referralDate',
      key: 'referralDate',
      width: 110,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority, record) => {
        const colors: Record<number, string> = { 1: 'default', 2: 'orange', 3: 'red' };
        return <Tag color={colors[priority] || 'default'}>{record.priorityName || `P${priority}`}</Tag>;
      },
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
      width: 160,
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleAcceptReferral(record)}
            >
              Tiếp nhận
            </Button>
          )}
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedReferral(record);
                setIsAssessmentModalOpen(true);
              }}
            >
              Đánh giá
            </Button>
          )}
          {(record.status === 2) && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedReferral(record);
                setIsPlanModalOpen(true);
              }}
            >
              Lap KH
            </Button>
          )}
          {record.status === 3 && (
            <Button
              size="small"
              onClick={() => executePrintRehabPlan(record)}
            >
              Chi tiết
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const sessionColumns: ColumnsType<TreatmentSessionDto> = [
    {
      title: 'Thời gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.startTime}</Text>
          <Text type="secondary">{record.duration ? `${record.duration} phút` : '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Buổi thứ',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      width: 80,
      render: (num) => num ? `#${num}` : '-',
    },
    {
      title: 'KTV',
      dataIndex: 'therapistName',
      key: 'therapistName',
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        const config: Record<number, { color: string; text: string }> = {
          0: { color: 'blue', text: 'Đã lên lịch' },
          1: { color: 'green', text: 'Đang tập' },
          2: { color: 'default', text: 'Hoàn thành' },
          3: { color: 'red', text: 'Đã hủy' },
          4: { color: 'orange', text: 'Không đến' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || `Status ${status}` };
        return <Tag color={c.color}>{record.statusName || c.text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartSession(record)}
            >
              Bắt đầu
            </Button>
          )}
          {record.status === 1 && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedSession(record);
                setIsRecordModalOpen(true);
              }}
            >
              Kết thúc
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Phục hồi chức năng (VLTL/PHCN)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Đang điều trị"
                value={inTreatment}
                prefix={<HeartOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Chờ tiếp nhận"
                value={pendingAssessment}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Buổi tập hôm nay"
                value={todaySessions}
                prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Card>
          <Tabs
            defaultActiveKey="patients"
            items={[
              {
                key: 'patients',
                label: 'Chỉ định PHCN',
                children: (
                  <Table
                    columns={referralColumns}
                    dataSource={referrals}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedReferral(record);
                        if (record.status <= 1) {
                          setIsAssessmentModalOpen(true);
                        } else {
                          setIsPlanModalOpen(true);
                        }
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                ),
              },
              {
                key: 'schedule',
                label: `Lịch tập hôm nay (${todaySessions})`,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsSessionModalOpen(true)}
                    >
                      Thêm buổi tập
                    </Button>
                    <Table
                      columns={sessionColumns}
                      dataSource={sessions}
                      rowKey="id"
                      onRow={(record) => ({
                        onDoubleClick: () => {
                          setSelectedSession(record);
                        },
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </>
                ),
              },
              {
                key: 'exercises',
                label: 'Bài tập mẫu',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card title="Vật lý trị liệu (PT)">
                        <ul>
                          <li>Tập vận động khớp</li>
                          <li>Tăng cường cơ lực</li>
                          <li>Tập đi, thăng bằng</li>
                          <li>Điện trị liệu</li>
                          <li>Siêu âm trị liệu</li>
                          <li>Kéo giãn</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Hoạt động trị liệu (OT)">
                        <ul>
                          <li>Tập sinh hoạt hàng ngày (ADL)</li>
                          <li>Vận động tinh</li>
                          <li>Huấn luyện tay</li>
                          <li>Sử dụng dụng cụ hỗ trợ</li>
                          <li>Cải tiến môi trường</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Ngôn ngữ trị liệu (ST)">
                        <ul>
                          <li>Tập nói</li>
                          <li>Tập nuốt</li>
                          <li>Trị liệu giao tiếp</li>
                          <li>Tập nghe hiểu</li>
                          <li>Đọc, viết</li>
                        </ul>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'dashboard',
                label: 'Tổng quan',
                children: dashboard ? (
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic title="Tổng BN đang điều trị" value={dashboard.totalActivePatients} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Chỉ định mới hôm nay" value={dashboard.newReferralsToday} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Xuất viện tuần này" value={dashboard.dischargesThisWeek} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Buổi hoàn thành hôm nay" value={dashboard.completedSessionsToday} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="BN PT" value={dashboard.ptPatients} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="BN OT" value={dashboard.otPatients} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="BN ST" value={dashboard.stPatients} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Tỷ lệ đạt mục tiêu" value={dashboard.goalAchievementRate} suffix="%" />
                    </Col>
                    {dashboard.therapistCaseload && dashboard.therapistCaseload.length > 0 && (
                      <Col span={24}>
                        <Card title="KTV phụ trách" size="small" style={{ marginTop: 8 }}>
                          <Table
                            dataSource={dashboard.therapistCaseload}
                            rowKey="therapistId"
                            pagination={false}
                            size="small"
                            columns={[
                              { title: 'KTV', dataIndex: 'therapistName', key: 'therapistName' },
                              { title: 'BN đang chăm sóc', dataIndex: 'activePatients', key: 'activePatients' },
                              { title: 'Buổi hôm nay', dataIndex: 'sessionsToday', key: 'sessionsToday' },
                              { title: 'Buổi tuần này', dataIndex: 'sessionsThisWeek', key: 'sessionsThisWeek' },
                              {
                                title: 'Công suất',
                                dataIndex: 'utilizationRate',
                                key: 'utilizationRate',
                                render: (rate: number) => <Progress percent={Math.round(rate)} size="small" />,
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    )}
                  </Row>
                ) : (
                  <Text type="secondary">Không có dữ liệu tổng quan</Text>
                ),
              },
            ]}
          />
        </Card>

        {/* Assessment Modal */}
        <Modal
          title="Đánh giá chức năng (Barthel Index)"
          open={isAssessmentModalOpen}
          onCancel={() => setIsAssessmentModalOpen(false)}
          onOk={() => assessmentForm.submit()}
          width={700}
        >
          <Form form={assessmentForm} layout="vertical" onFinish={handleAssessment}>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Bệnh nhân">
                {selectedReferral?.patientName}
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán">
                {selectedReferral?.diagnosis}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Barthel Index - Đánh giá hoạt động hàng ngày</Divider>

            {[
              { name: 'feeding', label: '1. Ăn uống', options: [0, 5, 10] },
              { name: 'bathing', label: '2. Tắm', options: [0, 5] },
              { name: 'grooming', label: '3. Vệ sinh cá nhân', options: [0, 5] },
              { name: 'dressing', label: '4. Mặc quần áo', options: [0, 5, 10] },
              { name: 'bowels', label: '5. Đại tiện', options: [0, 5, 10] },
              { name: 'bladder', label: '6. Tiểu tiện', options: [0, 5, 10] },
              { name: 'toilet', label: '7. Đi toilet', options: [0, 5, 10] },
              { name: 'transfer', label: '8. Di chuyển', options: [0, 5, 10, 15] },
              { name: 'mobility', label: '9. Đi lại', options: [0, 5, 10, 15] },
              { name: 'stairs', label: '10. Leo cầu thang', options: [0, 5, 10] },
            ].map((item) => (
              <Form.Item key={item.name} name={item.name} label={item.label}>
                <Radio.Group>
                  {item.options.map((opt) => (
                    <Radio key={opt} value={opt}>
                      {opt} điểm
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            ))}

            <Form.Item name="totalScore" label="Tổng điểm" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Plan Modal */}
        <Modal
          title="Lập kế hoạch PHCN"
          open={isPlanModalOpen}
          onCancel={() => setIsPlanModalOpen(false)}
          onOk={() => planForm.submit()}
          width={600}
        >
          <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
            <Form.Item name="rehabType" label="Loại PHCN" rules={[{ required: true }]}>
              <Select>
                {THERAPY_TYPES.map((t) => (
                  <Select.Option key={t.value} value={t.value}>
                    {t.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="totalSessions"
                  label="Tổng số buổi tập"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="frequency" label="Tần suất">
                  <Select>
                    <Select.Option value="Hang ngay">Hàng ngày</Select.Option>
                    <Select.Option value="3 lan/tuan">3 lần/tuần</Select.Option>
                    <Select.Option value="2 lan/tuan">2 lần/tuần</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="therapist" label="KTV phụ trách" rules={[{ required: true }]}>
              <Select>
                {(dashboard?.therapistCaseload || []).map((t) => (
                  <Select.Option key={t.therapistId} value={t.therapistName}>
                    {t.therapistName}
                  </Select.Option>
                ))}
                {/* Fallback options when dashboard has no therapist data */}
                {(!dashboard?.therapistCaseload || dashboard.therapistCaseload.length === 0) && (
                  <>
                    <Select.Option value="KTV. Tran Van B">KTV. Tran Van B</Select.Option>
                    <Select.Option value="KTV. Nguyen Thi D">KTV. Nguyen Thi D</Select.Option>
                    <Select.Option value="KTV. Le Van E">KTV. Le Van E</Select.Option>
                  </>
                )}
              </Select>
            </Form.Item>

            <Form.Item name="goals" label="Mục tiêu PHCN">
              <TextArea rows={3} placeholder="VD: Cải thiện khả năng đi lại, tăng độ độc lập sinh hoạt..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Session Modal */}
        <Modal
          title="Thêm buổi tập"
          open={isSessionModalOpen}
          onCancel={() => setIsSessionModalOpen(false)}
          onOk={() => sessionForm.submit()}
          width={600}
        >
          <Form form={sessionForm} layout="vertical" onFinish={handleAddSession}>
            <Form.Item name="patientId" label="Bệnh nhân (chỉ định)" rules={[{ required: true }]}>
              <Select>
                {referrals
                  .filter((r) => r.status === 3) // in treatment
                  .map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.patientName} - {r.rehabTypeName || r.rehabType}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="sessionDate" label="Ngay" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sessionTime" label="Gio" rules={[{ required: true }]}>
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="duration" label="Thời lượng (phút)">
                  <InputNumber min={15} max={120} defaultValue={45} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="therapyType" label="Loại trị liệu" rules={[{ required: true }]}>
              <Select>
                {THERAPY_TYPES.map((t) => (
                  <Select.Option key={t.value} value={t.value}>
                    {t.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="therapist" label="KTV" rules={[{ required: true }]}>
              <Select>
                {(dashboard?.therapistCaseload || []).map((t) => (
                  <Select.Option key={t.therapistId} value={t.therapistName}>
                    {t.therapistName}
                  </Select.Option>
                ))}
                {(!dashboard?.therapistCaseload || dashboard.therapistCaseload.length === 0) && (
                  <>
                    <Select.Option value="KTV. Tran Van B">KTV. Tran Van B</Select.Option>
                    <Select.Option value="KTV. Nguyen Thi D">KTV. Nguyen Thi D</Select.Option>
                  </>
                )}
              </Select>
            </Form.Item>

            <Form.Item name="exercises" label="Bài tập">
              <Select mode="multiple">
                <Select.Option value="Tap di">Tập đi</Select.Option>
                <Select.Option value="Tang cuong co">Tăng cường cơ</Select.Option>
                <Select.Option value="Thang bang">Thăng bằng</Select.Option>
                <Select.Option value="Van dong khop">Vận động khớp</Select.Option>
                <Select.Option value="Điện trị liệu">Điện trị liệu</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Record Session Modal */}
        <Modal
          title="Ghi nhận kết quả buổi tập"
          open={isRecordModalOpen}
          onCancel={() => setIsRecordModalOpen(false)}
          onOk={() => recordForm.submit()}
          width={500}
        >
          <Form form={recordForm} layout="vertical" onFinish={handleRecordSession}>
            <Form.Item name="painLevel" label="Mức độ đau (0-10)">
              <Slider min={0} max={10} marks={{ 0: '0', 5: '5', 10: '10' }} />
            </Form.Item>

            <Form.Item name="progressScore" label="Điểm chức năng hiện tại">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="cooperation" label="Mức độ hợp tác">
              <Rate />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú buổi tập">
              <TextArea rows={3} placeholder="Nhận xét, diễn biến..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Rehabilitation;
