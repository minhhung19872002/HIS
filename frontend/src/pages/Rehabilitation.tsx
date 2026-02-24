import React, { useState } from 'react';
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
  Timeline,
  Divider,
  message,
  InputNumber,
  Slider,
  Rate,
  Radio,
} from 'antd';
import {
  HeartOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  PrinterOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Types
interface RehabPatient {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female';
  referralDepartment: string;
  diagnosis: string;
  rehabType: 'pt' | 'ot' | 'st' | 'combined';
  referralDate: string;
  startDate?: string;
  assessmentDate?: string;
  status: 'pending' | 'assessed' | 'in_treatment' | 'completed' | 'discharged';
  initialScore?: number;
  currentScore?: number;
  targetScore?: number;
  sessionsCompleted: number;
  totalSessions: number;
  therapist?: string;
}

interface RehabSession {
  id: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  therapyType: string;
  therapist: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  exercises?: string[];
  notes?: string;
  painLevel?: number;
  progressScore?: number;
}

interface Assessment {
  id: string;
  patientId: string;
  assessmentType: 'barthel' | 'fim' | 'moca' | 'berg';
  assessmentDate: string;
  score: number;
  maxScore: number;
  assessor: string;
  notes?: string;
}

// Mock data
const mockPatients: RehabPatient[] = [
  {
    id: 'RH001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    age: 65,
    gender: 'male',
    referralDepartment: 'Than kinh',
    diagnosis: 'Dot quy nao, liet nua nguoi phai',
    rehabType: 'combined',
    referralDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
    startDate: dayjs().subtract(12, 'day').format('YYYY-MM-DD'),
    assessmentDate: dayjs().subtract(12, 'day').format('YYYY-MM-DD'),
    status: 'in_treatment',
    initialScore: 35,
    currentScore: 55,
    targetScore: 80,
    sessionsCompleted: 10,
    totalSessions: 20,
    therapist: 'KTV. Tran Van B',
  },
  {
    id: 'RH002',
    patientId: 'P002',
    patientName: 'Le Thi C',
    age: 72,
    gender: 'female',
    referralDepartment: 'Chinh hinh',
    diagnosis: 'Sau mo thay khop goi',
    rehabType: 'pt',
    referralDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    startDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    status: 'in_treatment',
    initialScore: 40,
    currentScore: 50,
    targetScore: 90,
    sessionsCompleted: 5,
    totalSessions: 15,
    therapist: 'KTV. Nguyen Thi D',
  },
  {
    id: 'RH003',
    patientId: 'P003',
    patientName: 'Pham Van E',
    age: 45,
    gender: 'male',
    referralDepartment: 'Noi khoa',
    diagnosis: 'Viem da khop dang thap',
    rehabType: 'pt',
    referralDate: dayjs().format('YYYY-MM-DD'),
    status: 'pending',
    sessionsCompleted: 0,
    totalSessions: 0,
  },
];

const mockSessions: RehabSession[] = [
  {
    id: 'RS001',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    sessionDate: dayjs().format('YYYY-MM-DD'),
    sessionTime: '08:00',
    duration: 45,
    therapyType: 'Vat ly tri lieu',
    therapist: 'KTV. Tran Van B',
    status: 'scheduled',
    exercises: ['Tap di', 'Tang cuong co', 'Thang bang'],
  },
  {
    id: 'RS002',
    patientId: 'P001',
    patientName: 'Nguyen Van A',
    sessionDate: dayjs().format('YYYY-MM-DD'),
    sessionTime: '10:00',
    duration: 30,
    therapyType: 'Hoat dong tri lieu',
    therapist: 'KTV. Nguyen Thi D',
    status: 'scheduled',
    exercises: ['Tap sinh hoat hang ngay', 'Van dong tinh'],
  },
  {
    id: 'RS003',
    patientId: 'P002',
    patientName: 'Le Thi C',
    sessionDate: dayjs().format('YYYY-MM-DD'),
    sessionTime: '09:00',
    duration: 45,
    therapyType: 'Vat ly tri lieu',
    therapist: 'KTV. Nguyen Thi D',
    status: 'in_progress',
    exercises: ['Van dong khop goi', 'Dien tri lieu'],
  },
];

const THERAPY_TYPES = [
  { value: 'pt', label: 'PT - Vat ly tri lieu' },
  { value: 'ot', label: 'OT - Hoat dong tri lieu' },
  { value: 'st', label: 'ST - Ngon ngu tri lieu' },
  { value: 'combined', label: 'Ket hop' },
];

const ASSESSMENT_TYPES = [
  { value: 'barthel', label: 'Barthel Index', maxScore: 100 },
  { value: 'fim', label: 'FIM', maxScore: 126 },
  { value: 'moca', label: 'MoCA', maxScore: 30 },
  { value: 'berg', label: 'Berg Balance', maxScore: 56 },
];

const Rehabilitation: React.FC = () => {
  const [patients, setPatients] = useState<RehabPatient[]>(mockPatients);
  const [sessions, setSessions] = useState<RehabSession[]>(mockSessions);
  const [selectedPatient, setSelectedPatient] = useState<RehabPatient | null>(null);
  const [selectedSession, setSelectedSession] = useState<RehabSession | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [assessmentForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [sessionForm] = Form.useForm();
  const [recordForm] = Form.useForm();

  // Statistics
  const inTreatment = patients.filter((p) => p.status === 'in_treatment').length;
  const pendingAssessment = patients.filter((p) => p.status === 'pending').length;
  const todaySessions = sessions.filter(
    (s) => s.sessionDate === dayjs().format('YYYY-MM-DD')
  ).length;

  const getRehabTypeTag = (type: RehabPatient['rehabType']) => {
    const config = {
      pt: { color: 'blue', text: 'PT' },
      ot: { color: 'green', text: 'OT' },
      st: { color: 'purple', text: 'ST' },
      combined: { color: 'orange', text: 'Ket hop' },
    };
    const c = config[type];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const getStatusTag = (status: RehabPatient['status']) => {
    const config = {
      pending: { color: 'orange', text: 'Cho danh gia' },
      assessed: { color: 'blue', text: 'Da danh gia' },
      in_treatment: { color: 'green', text: 'Dang dieu tri' },
      completed: { color: 'default', text: 'Hoan thanh' },
      discharged: { color: 'volcano', text: 'Xuat vien' },
    };
    const c = config[status];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const handleAssessment = (values: any) => {
    if (!selectedPatient) return;

    const score = values.totalScore;
    const targetScore = Math.min(score + 40, 100);

    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? {
              ...p,
              assessmentDate: dayjs().format('YYYY-MM-DD'),
              initialScore: score,
              currentScore: score,
              targetScore,
              status: 'assessed',
            }
          : p
      )
    );

    setIsAssessmentModalOpen(false);
    assessmentForm.resetFields();
    message.success('Da luu danh gia chuc nang');
    setIsPlanModalOpen(true);
  };

  const handleCreatePlan = (values: any) => {
    if (!selectedPatient) return;

    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? {
              ...p,
              rehabType: values.rehabType,
              totalSessions: values.totalSessions,
              therapist: values.therapist,
              status: 'in_treatment',
              startDate: dayjs().format('YYYY-MM-DD'),
            }
          : p
      )
    );

    setIsPlanModalOpen(false);
    planForm.resetFields();
    message.success('Da lap ke hoach PHCN');
  };

  const handleAddSession = (values: any) => {
    const newSession: RehabSession = {
      id: `RS${Date.now()}`,
      patientId: values.patientId,
      patientName:
        patients.find((p) => p.patientId === values.patientId)?.patientName || '',
      sessionDate: values.sessionDate.format('YYYY-MM-DD'),
      sessionTime: values.sessionTime.format('HH:mm'),
      duration: values.duration,
      therapyType: THERAPY_TYPES.find((t) => t.value === values.therapyType)?.label || '',
      therapist: values.therapist,
      status: 'scheduled',
      exercises: values.exercises,
    };

    setSessions((prev) => [...prev, newSession]);
    setIsSessionModalOpen(false);
    sessionForm.resetFields();
    message.success('Da them buoi tap');
  };

  const handleRecordSession = (values: any) => {
    if (!selectedSession) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedSession.id
          ? {
              ...s,
              status: 'completed',
              painLevel: values.painLevel,
              progressScore: values.progressScore,
              notes: values.notes,
            }
          : s
      )
    );

    // Update patient progress
    const patient = patients.find((p) => p.patientId === selectedSession.patientId);
    if (patient) {
      setPatients((prev) =>
        prev.map((p) =>
          p.patientId === selectedSession.patientId
            ? {
                ...p,
                sessionsCompleted: p.sessionsCompleted + 1,
                currentScore: values.progressScore || p.currentScore,
              }
            : p
        )
      );
    }

    setIsRecordModalOpen(false);
    recordForm.resetFields();
    message.success('Da ghi nhan buoi tap');
  };

  const executePrintRehabPlan = () => {
    if (!selectedPatient) return;
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
          .progress-bar { width: 100%; background: #eee; height: 20px; }
          .progress-fill { background: #52c41a; height: 100%; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <strong>BENH VIEN DA KHOA</strong><br/>
          Khoa Phuc hoi chuc nang
        </div>

        <div class="title">KE HOACH PHUC HOI CHUC NANG</div>

        <table>
          <tr>
            <td width="30%"><strong>Ho ten:</strong></td>
            <td>${selectedPatient.patientName}</td>
            <td width="20%"><strong>Tuoi:</strong></td>
            <td>${selectedPatient.age}</td>
          </tr>
          <tr>
            <td><strong>Chan doan:</strong></td>
            <td colspan="3">${selectedPatient.diagnosis}</td>
          </tr>
          <tr>
            <td><strong>Loai PHCN:</strong></td>
            <td>${THERAPY_TYPES.find((t) => t.value === selectedPatient.rehabType)?.label}</td>
            <td><strong>KTV phu trach:</strong></td>
            <td>${selectedPatient.therapist || '-'}</td>
          </tr>
        </table>

        <h3>1. Danh gia chuc nang</h3>
        <table>
          <tr>
            <th>Chi so</th>
            <th>Diem dau vao</th>
            <th>Diem hien tai</th>
            <th>Muc tieu</th>
          </tr>
          <tr>
            <td>Barthel Index</td>
            <td>${selectedPatient.initialScore || '-'}/100</td>
            <td>${selectedPatient.currentScore || '-'}/100</td>
            <td>${selectedPatient.targetScore || '-'}/100</td>
          </tr>
        </table>

        <h3>2. Ke hoach can thiep</h3>
        <p><strong>Tong so buoi tap:</strong> ${selectedPatient.totalSessions}</p>
        <p><strong>Da hoan thanh:</strong> ${selectedPatient.sessionsCompleted} buoi</p>
        <p><strong>Tien do:</strong> ${((selectedPatient.sessionsCompleted / (selectedPatient.totalSessions || 1)) * 100).toFixed(0)}%</p>

        <h3>3. Noi dung can thiep</h3>
        <ul>
          <li>Vat ly tri lieu: Tap van dong, dien tri lieu, sieu am</li>
          <li>Hoat dong tri lieu: Tap sinh hoat hang ngay</li>
          <li>Ngon ngu tri lieu (neu can): Tap noi, nuot</li>
        </ul>

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

  const patientColumns: ColumnsType<RehabPatient> = [
    {
      title: 'Benh nhan',
      key: 'patient',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.patientName}</Text>
          <Text type="secondary">
            {record.age} tuoi - {record.gender === 'male' ? 'Nam' : 'Nu'}
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
      title: 'Tien do',
      key: 'progress',
      width: 150,
      render: (_, record) => {
        if (record.status === 'pending') {
          return <Text type="secondary">Chua bat dau</Text>;
        }
        const percent =
          (record.sessionsCompleted / (record.totalSessions || 1)) * 100;
        return (
          <Space orientation="vertical" size={0} style={{ width: '100%' }}>
            <Progress percent={Math.round(percent)} size="small" />
            <Text type="secondary">
              {record.sessionsCompleted}/{record.totalSessions} buoi
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Diem chuc nang',
      key: 'score',
      width: 120,
      render: (_, record) => {
        if (!record.currentScore) return '-';
        const improvement = (record.currentScore || 0) - (record.initialScore || 0);
        return (
          <Space orientation="vertical" size={0}>
            <Text strong>{record.currentScore}/100</Text>
            {improvement > 0 && (
              <Text type="success" style={{ fontSize: 12 }}>
                +{improvement} diem
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedPatient(record);
                setIsAssessmentModalOpen(true);
              }}
            >
              Danh gia
            </Button>
          )}
          {record.status === 'assessed' && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedPatient(record);
                setIsPlanModalOpen(true);
              }}
            >
              Lap KH
            </Button>
          )}
          {record.status === 'in_treatment' && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setSelectedPatient(record);
                  executePrintRehabPlan();
                }}
              >
                Chi tiet
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const sessionColumns: ColumnsType<RehabSession> = [
    {
      title: 'Thoi gian',
      key: 'time',
      width: 100,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.sessionTime}</Text>
          <Text type="secondary">{record.duration} phut</Text>
        </Space>
      ),
    },
    {
      title: 'Benh nhan',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Loai tri lieu',
      dataIndex: 'therapyType',
      key: 'therapyType',
    },
    {
      title: 'KTV',
      dataIndex: 'therapist',
      key: 'therapist',
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config: Record<string, { color: string; text: string }> = {
          scheduled: { color: 'blue', text: 'Da len lich' },
          in_progress: { color: 'green', text: 'Dang tap' },
          completed: { color: 'default', text: 'Hoan thanh' },
          cancelled: { color: 'red', text: 'Da huy' },
        };
        const c = config[status];
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.status === 'scheduled' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === record.id ? { ...s, status: 'in_progress' } : s
                  )
                );
              }}
            >
              Bat dau
            </Button>
          )}
          {record.status === 'in_progress' && (
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
    <div>
      <Title level={4}>Phuc hoi chuc nang (VLTL/PHCN)</Title>

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
              title="Cho danh gia"
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
              label: 'Benh nhan PHCN',
              children: (
                <Table
                  columns={patientColumns}
                  dataSource={patients}
                  rowKey="id"
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      setSelectedPatient(record);
                      setIsPlanModalOpen(true);
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
                    dataSource={sessions.filter(
                      (s) => s.sessionDate === dayjs().format('YYYY-MM-DD')
                    )}
                    rowKey="id"
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedSession(record);
                        const patient = patients.find(p => p.patientId === record.patientId);
                        if (patient) setSelectedPatient(patient);
                        setIsPlanModalOpen(true);
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
              {selectedPatient?.patientName}
            </Descriptions.Item>
            <Descriptions.Item label="Chan doan">
              {selectedPatient?.diagnosis}
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
                  <Select.Option value="daily">Hang ngay</Select.Option>
                  <Select.Option value="3times">3 lan/tuan</Select.Option>
                  <Select.Option value="2times">2 lan/tuan</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="therapist" label="KTV phu trach" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="KTV. Tran Van B">KTV. Tran Van B</Select.Option>
              <Select.Option value="KTV. Nguyen Thi D">KTV. Nguyen Thi D</Select.Option>
              <Select.Option value="KTV. Le Van E">KTV. Le Van E</Select.Option>
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
          <Form.Item name="patientId" label="Benh nhan" rules={[{ required: true }]}>
            <Select>
              {patients
                .filter((p) => p.status === 'in_treatment')
                .map((p) => (
                  <Select.Option key={p.patientId} value={p.patientId}>
                    {p.patientName}
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
              <Select.Option value="KTV. Tran Van B">KTV. Tran Van B</Select.Option>
              <Select.Option value="KTV. Nguyen Thi D">KTV. Nguyen Thi D</Select.Option>
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
  );
};

export default Rehabilitation;
