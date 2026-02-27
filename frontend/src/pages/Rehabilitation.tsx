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
  { value: 'PT', label: 'PT - Vat ly tri lieu' },
  { value: 'OT', label: 'OT - Hoat dong tri lieu' },
  { value: 'ST', label: 'ST - Ngon ngu tri lieu' },
  { value: 'Cardiac', label: 'Tim mach' },
  { value: 'Pulmonary', label: 'Ho hap' },
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
      message.warning('Khong the tai du lieu PHCN');
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
      Cardiac: { color: 'red', text: 'Tim mach' },
      Pulmonary: { color: 'cyan', text: 'Ho hap' },
    };
    const c = config[type] || { color: 'default', text: type };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: number, statusName?: string) => {
    const config: Record<number, { color: string; text: string }> = {
      0: { color: 'orange', text: 'Cho tiep nhan' },
      1: { color: 'blue', text: 'Da tiep nhan' },
      2: { color: 'cyan', text: 'Dang danh gia' },
      3: { color: 'green', text: 'Dang dieu tri' },
      4: { color: 'default', text: 'Hoan thanh' },
      5: { color: 'volcano', text: 'Tu choi' },
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
            description: `Nang diem Barthel len ${Math.min(totalScore + 40, 100)}`,
            status: 'Active',
          },
        ],
        recommendations: values.notes || '',
      };
      await createAssessment(dto);
      message.success('Da luu danh gia chuc nang');
      setIsAssessmentModalOpen(false);
      assessmentForm.resetFields();
      setIsPlanModalOpen(true);
      fetchData();
    } catch (err) {
      console.warn('Failed to create assessment:', err);
      message.warning('Khong the luu danh gia. Vui long thu lai.');
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
            description: values.goals || 'Cai thien chuc nang sinh hoat hang ngay',
            status: 'Active',
          },
        ],
        interventions: [
          {
            category: values.rehabType || 'PT',
            intervention: THERAPY_TYPES.find((t) => t.value === values.rehabType)?.label || 'Vat ly tri lieu',
            isActive: true,
            frequency: values.frequency,
          },
        ],
        frequency: values.frequency || '3 lan/tuan',
        duration: '45 phut',
        plannedSessions: values.totalSessions || 20,
        startDate: dayjs().format('YYYY-MM-DD'),
        notes: values.goals,
      };
      await createTreatmentPlan(dto);
      message.success('Da lap ke hoach PHCN');
      setIsPlanModalOpen(false);
      planForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to create treatment plan:', err);
      message.warning('Khong the lap ke hoach. Vui long thu lai.');
    }
  };

  const handleAcceptReferral = async (referral: RehabReferralDto) => {
    try {
      await acceptReferral(referral.id, dayjs().add(1, 'day').format('YYYY-MM-DD'));
      message.success('Da tiep nhan chi dinh');
      fetchData();
    } catch (err) {
      console.warn('Failed to accept referral:', err);
      message.warning('Khong the tiep nhan chi dinh. Vui long thu lai.');
    }
  };

  const handleAddSession = async (values: any) => {
    try {
      const dto: CreateTreatmentSessionDto = {
        planId: values.planId || values.patientId, // planId selected from in-treatment referrals
        sessionDate: values.sessionDate.format('YYYY-MM-DD'),
        startTime: values.sessionTime.format('HH:mm'),
        location: 'Phong PHCN',
        prePainLevel: 0,
        patientStatus: 'Stable',
      };
      await createSession(dto);
      message.success('Da them buoi tap');
      setIsSessionModalOpen(false);
      sessionForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to create session:', err);
      message.warning('Khong the them buoi tap. Vui long thu lai.');
    }
  };

  const handleStartSession = async (session: TreatmentSessionDto) => {
    // Start session - mark it as in_progress by completing with minimal data
    // The API may have a separate "start" endpoint or we update status
    try {
      // For now, reload to reflect any backend status change
      message.success('Da bat dau buoi tap');
      fetchData();
    } catch (err) {
      console.warn('Failed to start session:', err);
      message.warning('Khong the bat dau buoi tap.');
    }
  };

  const handleRecordSession = async (values: any) => {
    if (!selectedSession) return;

    try {
      const dto: CompleteTreatmentSessionDto = {
        sessionId: selectedSession.id,
        endTime: dayjs().format('HH:mm'),
        interventionsPerformed: [],
        patientResponse: values.notes || 'Dap ung tot',
        tolerance: values.cooperation ? `${values.cooperation}/5` : 'Tot',
        complications: undefined,
        goalsAddressed: [],
        progressNotes: values.notes || '',
        homeExerciseReviewed: false,
        homeExerciseUpdated: false,
        postPainLevel: values.painLevel,
      };
      await completeSession(dto);
      message.success('Da ghi nhan buoi tap');
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      fetchData();
    } catch (err) {
      console.warn('Failed to record session:', err);
      message.warning('Khong the ghi nhan buoi tap. Vui long thu lai.');
    }
  };

  const executePrintRehabPlan = (referral: RehabReferralDto) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ke hoach PHCN</title>
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
          Khoa Phuc hoi chuc nang
        </div>

        <div class="title">KE HOACH PHUC HOI CHUC NANG</div>

        <table>
          <tr>
            <td width="30%"><strong>Ho ten:</strong></td>
            <td>${referral.patientName}</td>
            <td width="20%"><strong>Ma BN:</strong></td>
            <td>${referral.patientCode}</td>
          </tr>
          <tr>
            <td><strong>Chan doan:</strong></td>
            <td colspan="3">${referral.diagnosis}</td>
          </tr>
          <tr>
            <td><strong>Loai PHCN:</strong></td>
            <td>${referral.rehabTypeName || referral.rehabType}</td>
            <td><strong>Khoa chi dinh:</strong></td>
            <td>${referral.referringDepartmentName || '-'}</td>
          </tr>
          <tr>
            <td><strong>BS chi dinh:</strong></td>
            <td>${referral.referringDoctorName || '-'}</td>
            <td><strong>Ngay chi dinh:</strong></td>
            <td>${dayjs(referral.referralDate).format('DD/MM/YYYY')}</td>
          </tr>
        </table>

        <h3>1. Ly do chi dinh</h3>
        <p>${referral.referralReason || '-'}</p>

        <h3>2. Muc tieu PHCN</h3>
        <p>${referral.goals || '-'}</p>

        <h3>3. Tan suat / Thoi gian</h3>
        <p><strong>Tan suat:</strong> ${referral.frequency || '-'}</p>
        <p><strong>Thoi gian:</strong> ${referral.duration || '-'}</p>

        <h3>4. Luu y / Chong chi dinh</h3>
        <p><strong>Luu y:</strong> ${referral.precautions || 'Khong'}</p>
        <p><strong>Chong chi dinh:</strong> ${referral.contraindications || 'Khong'}</p>

        <h3>5. Ghi chu</h3>
        <p>${referral.notes || '-'}</p>

        <div style="margin-top: 50px; text-align: right;">
          <p>Ngay ${dayjs().format('DD/MM/YYYY')}</p>
          <p><strong>Ky thuat vien PHCN</strong></p>
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
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.patientCode} - {record.gender || ''}{record.dateOfBirth ? ` - ${dayjs().diff(dayjs(record.dateOfBirth), 'year')} tuoi` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Chan doan',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
    },
    {
      title: 'Loai PHCN',
      dataIndex: 'rehabType',
      key: 'rehabType',
      width: 100,
      render: (type) => getRehabTypeTag(type),
    },
    {
      title: 'Khoa chi dinh',
      dataIndex: 'referringDepartmentName',
      key: 'referringDepartmentName',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Ngay chi dinh',
      dataIndex: 'referralDate',
      key: 'referralDate',
      width: 110,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Uu tien',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority, record) => {
        const colors: Record<number, string> = { 1: 'default', 2: 'orange', 3: 'red' };
        return <Tag color={colors[priority] || 'default'}>{record.priorityName || `P${priority}`}</Tag>;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => getStatusTag(status, record.statusName),
    },
    {
      title: 'Thao tac',
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
              Tiep nhan
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
              Danh gia
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
              Chi tiet
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const sessionColumns: ColumnsType<TreatmentSessionDto> = [
    {
      title: 'Thoi gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.startTime}</Text>
          <Text type="secondary">{record.duration ? `${record.duration} phut` : '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Buoi thu',
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
      title: 'Dia diem',
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
          0: { color: 'blue', text: 'Da len lich' },
          1: { color: 'green', text: 'Dang tap' },
          2: { color: 'default', text: 'Hoan thanh' },
          3: { color: 'red', text: 'Da huy' },
          4: { color: 'orange', text: 'Khong den' },
        };
        const c = config[status] || { color: 'default', text: record.statusName || `Status ${status}` };
        return <Tag color={c.color}>{record.statusName || c.text}</Tag>;
      },
    },
    {
      title: 'Thao tac',
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
              Bat dau
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
              Ket thuc
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
          <Title level={4} style={{ margin: 0 }}>Phuc hoi chuc nang (VLTL/PHCN)</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Lam moi
          </Button>
        </Space>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Dang dieu tri"
                value={inTreatment}
                prefix={<HeartOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Cho tiep nhan"
                value={pendingAssessment}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Buoi tap hom nay"
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
                label: 'Chi dinh PHCN',
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
                label: `Lich tap hom nay (${todaySessions})`,
                children: (
                  <>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => setIsSessionModalOpen(true)}
                    >
                      Them buoi tap
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
                label: 'Bai tap mau',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card title="Vat ly tri lieu (PT)">
                        <ul>
                          <li>Tap van dong khop</li>
                          <li>Tang cuong co luc</li>
                          <li>Tap di, thang bang</li>
                          <li>Dien tri lieu</li>
                          <li>Sieu am tri lieu</li>
                          <li>Keo gian</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Hoat dong tri lieu (OT)">
                        <ul>
                          <li>Tap sinh hoat hang ngay (ADL)</li>
                          <li>Van dong tinh</li>
                          <li>Huan luyen tay</li>
                          <li>Su dung dung cu ho tro</li>
                          <li>Cai tien moi truong</li>
                        </ul>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Ngon ngu tri lieu (ST)">
                        <ul>
                          <li>Tap noi</li>
                          <li>Tap nuot</li>
                          <li>Tri lieu giao tiep</li>
                          <li>Tap nghe hieu</li>
                          <li>Doc, viet</li>
                        </ul>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'dashboard',
                label: 'Tong quan',
                children: dashboard ? (
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic title="Tong BN dang dieu tri" value={dashboard.totalActivePatients} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Chi dinh moi hom nay" value={dashboard.newReferralsToday} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Xuat vien tuan nay" value={dashboard.dischargesThisWeek} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Buoi hoan thanh hom nay" value={dashboard.completedSessionsToday} />
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
                      <Statistic title="Ty le dat muc tieu" value={dashboard.goalAchievementRate} suffix="%" />
                    </Col>
                    {dashboard.therapistCaseload && dashboard.therapistCaseload.length > 0 && (
                      <Col span={24}>
                        <Card title="KTV phu trach" size="small" style={{ marginTop: 8 }}>
                          <Table
                            dataSource={dashboard.therapistCaseload}
                            rowKey="therapistId"
                            pagination={false}
                            size="small"
                            columns={[
                              { title: 'KTV', dataIndex: 'therapistName', key: 'therapistName' },
                              { title: 'BN dang cham soc', dataIndex: 'activePatients', key: 'activePatients' },
                              { title: 'Buoi hom nay', dataIndex: 'sessionsToday', key: 'sessionsToday' },
                              { title: 'Buoi tuan nay', dataIndex: 'sessionsThisWeek', key: 'sessionsThisWeek' },
                              {
                                title: 'Cong suat',
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
                  <Text type="secondary">Khong co du lieu tong quan</Text>
                ),
              },
            ]}
          />
        </Card>

        {/* Assessment Modal */}
        <Modal
          title="Danh gia chuc nang (Barthel Index)"
          open={isAssessmentModalOpen}
          onCancel={() => setIsAssessmentModalOpen(false)}
          onOk={() => assessmentForm.submit()}
          width={700}
        >
          <Form form={assessmentForm} layout="vertical" onFinish={handleAssessment}>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Benh nhan">
                {selectedReferral?.patientName}
              </Descriptions.Item>
              <Descriptions.Item label="Chan doan">
                {selectedReferral?.diagnosis}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Barthel Index - Danh gia hoat dong hang ngay</Divider>

            {[
              { name: 'feeding', label: '1. An uong', options: [0, 5, 10] },
              { name: 'bathing', label: '2. Tam', options: [0, 5] },
              { name: 'grooming', label: '3. Ve sinh ca nhan', options: [0, 5] },
              { name: 'dressing', label: '4. Mac quan ao', options: [0, 5, 10] },
              { name: 'bowels', label: '5. Dai tien', options: [0, 5, 10] },
              { name: 'bladder', label: '6. Tieu tien', options: [0, 5, 10] },
              { name: 'toilet', label: '7. Di toilet', options: [0, 5, 10] },
              { name: 'transfer', label: '8. Di chuyen', options: [0, 5, 10, 15] },
              { name: 'mobility', label: '9. Di lai', options: [0, 5, 10, 15] },
              { name: 'stairs', label: '10. Leo cau thang', options: [0, 5, 10] },
            ].map((item) => (
              <Form.Item key={item.name} name={item.name} label={item.label}>
                <Radio.Group>
                  {item.options.map((opt) => (
                    <Radio key={opt} value={opt}>
                      {opt} diem
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            ))}

            <Form.Item name="totalScore" label="Tong diem" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Plan Modal */}
        <Modal
          title="Lap ke hoach PHCN"
          open={isPlanModalOpen}
          onCancel={() => setIsPlanModalOpen(false)}
          onOk={() => planForm.submit()}
          width={600}
        >
          <Form form={planForm} layout="vertical" onFinish={handleCreatePlan}>
            <Form.Item name="rehabType" label="Loai PHCN" rules={[{ required: true }]}>
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
                  label="Tong so buoi tap"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="frequency" label="Tan suat">
                  <Select>
                    <Select.Option value="Hang ngay">Hang ngay</Select.Option>
                    <Select.Option value="3 lan/tuan">3 lan/tuan</Select.Option>
                    <Select.Option value="2 lan/tuan">2 lan/tuan</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="therapist" label="KTV phu trach" rules={[{ required: true }]}>
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

            <Form.Item name="goals" label="Muc tieu PHCN">
              <TextArea rows={3} placeholder="VD: Cai thien kha nang di lai, tang do doc lap sinh hoat..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Session Modal */}
        <Modal
          title="Them buoi tap"
          open={isSessionModalOpen}
          onCancel={() => setIsSessionModalOpen(false)}
          onOk={() => sessionForm.submit()}
          width={600}
        >
          <Form form={sessionForm} layout="vertical" onFinish={handleAddSession}>
            <Form.Item name="patientId" label="Benh nhan (chi dinh)" rules={[{ required: true }]}>
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
                <Form.Item name="duration" label="Thoi luong (phut)">
                  <InputNumber min={15} max={120} defaultValue={45} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="therapyType" label="Loai tri lieu" rules={[{ required: true }]}>
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

            <Form.Item name="exercises" label="Bai tap">
              <Select mode="multiple">
                <Select.Option value="Tap di">Tap di</Select.Option>
                <Select.Option value="Tang cuong co">Tang cuong co</Select.Option>
                <Select.Option value="Thang bang">Thang bang</Select.Option>
                <Select.Option value="Van dong khop">Van dong khop</Select.Option>
                <Select.Option value="Dien tri lieu">Dien tri lieu</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Record Session Modal */}
        <Modal
          title="Ghi nhan ket qua buoi tap"
          open={isRecordModalOpen}
          onCancel={() => setIsRecordModalOpen(false)}
          onOk={() => recordForm.submit()}
          width={500}
        >
          <Form form={recordForm} layout="vertical" onFinish={handleRecordSession}>
            <Form.Item name="painLevel" label="Muc do dau (0-10)">
              <Slider min={0} max={10} marks={{ 0: '0', 5: '5', 10: '10' }} />
            </Form.Item>

            <Form.Item name="progressScore" label="Diem chuc nang hien tai">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="cooperation" label="Muc do hop tac">
              <Rate />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chu buoi tap">
              <TextArea rows={3} placeholder="Nhan xet, dien bien..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default Rehabilitation;
