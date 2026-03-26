import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Tag, Space, message,
  Card, Row, Col, Statistic, DatePicker, InputNumber, Progress, Spin, Tooltip,
  Badge,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, EditOutlined, SafetyCertificateOutlined,
  TeamOutlined, ExperimentOutlined, BookOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  getTrainingClasses, saveTrainingClass, getClassStudents, enrollStudent,
  updateStudentStatus, issueCertificate, getClinicalDirections, saveClinicalDirection,
  getResearchProjects, saveResearchProject, getTrainingDashboard, getCreditSummary,
} from '../api/trainingResearch';
import type {
  TrainingClassDto, TrainingStudentDto, ClinicalDirectionDto, ResearchProjectDto,
  TrainingDashboardDto, CreditSummaryDto,
} from '../api/trainingResearch';

const { TextArea } = Input;

const TRAINING_TYPES: Record<number, { label: string; color: string }> = {
  1: { label: 'Noi bo', color: 'blue' },
  2: { label: 'Ben ngoai', color: 'green' },
  3: { label: 'CME', color: 'purple' },
  4: { label: 'Chi dao tuyen', color: 'orange' },
};

const CLASS_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ke hoach', color: 'default' },
  2: { label: 'Dang dien ra', color: 'processing' },
  3: { label: 'Hoan thanh', color: 'success' },
  4: { label: 'Huy', color: 'error' },
};

const DIRECTION_TYPES: Record<number, string> = { 1: 'Tuyen tren', 2: 'Tuyen duoi' };
const DIRECTION_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ke hoach', color: 'default' },
  2: { label: 'Dang thuc hien', color: 'processing' },
  3: { label: 'Hoan thanh', color: 'success' },
};

const RESEARCH_LEVELS: Record<number, string> = { 1: 'Cap Quoc gia', 2: 'Cap Bo', 3: 'Cap Co so' };
const RESEARCH_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'De xuat', color: 'default' },
  2: { label: 'Duyet', color: 'cyan' },
  3: { label: 'Dang thuc hien', color: 'processing' },
  4: { label: 'Hoan thanh', color: 'success' },
  5: { label: 'Da cong bo', color: 'gold' },
};

const PIE_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2'];

const TrainingResearch: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes');

  // Classes state
  const [classes, setClasses] = useState<TrainingClassDto[]>([]);
  const [classFilter, setClassFilter] = useState<{ type?: number; status?: number }>({});
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TrainingClassDto | null>(null);
  const [classForm] = Form.useForm();

  // Students sub-table
  const [selectedClass, setSelectedClass] = useState<TrainingClassDto | null>(null);
  const [students, setStudents] = useState<TrainingStudentDto[]>([]);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [enrollForm] = Form.useForm();
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certStudent, setCertStudent] = useState<TrainingStudentDto | null>(null);
  const [certForm] = Form.useForm();

  // Directions state
  const [directions, setDirections] = useState<ClinicalDirectionDto[]>([]);
  const [dirModalOpen, setDirModalOpen] = useState(false);
  const [editingDir, setEditingDir] = useState<ClinicalDirectionDto | null>(null);
  const [dirForm] = Form.useForm();

  // Research state
  const [projects, setProjects] = useState<ResearchProjectDto[]>([]);
  const [projFilter, setProjFilter] = useState<{ level?: number; status?: number }>({});
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<ResearchProjectDto | null>(null);
  const [projForm] = Form.useForm();

  // Dashboard state
  const [dashboard, setDashboard] = useState<TrainingDashboardDto | null>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummaryDto[]>([]);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const data = await getTrainingClasses({ trainingType: classFilter.type, status: classFilter.status });
    setClasses(data);
    setLoading(false);
  }, [classFilter]);

  const fetchDirections = useCallback(async () => {
    setLoading(true);
    const data = await getClinicalDirections();
    setDirections(data);
    setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const data = await getResearchProjects({ level: projFilter.level, status: projFilter.status });
    setProjects(data);
    setLoading(false);
  }, [projFilter]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const [dash, credits] = await Promise.all([getTrainingDashboard(), getCreditSummary()]);
    setDashboard(dash);
    setCreditSummary(credits);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'classes') fetchClasses();
    else if (activeTab === 'directions') fetchDirections();
    else if (activeTab === 'research') fetchProjects();
    else if (activeTab === 'dashboard') fetchDashboard();
    else if (activeTab === 'certificates') {
      fetchClasses();
      getCreditSummary().then(setCreditSummary);
    }
  }, [activeTab, fetchClasses, fetchDirections, fetchProjects, fetchDashboard]);

  // ---- Class handlers ----
  const handleSaveClass = async () => {
    try {
      const values = await classForm.validateFields();
      const payload = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      await saveTrainingClass(payload, editingClass?.id);
      message.success(editingClass ? 'Cap nhat lop thanh cong' : 'Tao lop thanh cong');
      setClassModalOpen(false);
      classForm.resetFields();
      setEditingClass(null);
      fetchClasses();
    } catch {
      message.warning('Vui long dien day du thong tin');
    }
  };

  const openClassModal = (record?: TrainingClassDto) => {
    setEditingClass(record || null);
    if (record) {
      classForm.setFieldsValue({
        ...record,
        startDate: record.startDate ? dayjs(record.startDate) : undefined,
        endDate: record.endDate ? dayjs(record.endDate) : undefined,
      });
    } else {
      classForm.resetFields();
    }
    setClassModalOpen(true);
  };

  const handleClassRowClick = async (record: TrainingClassDto) => {
    setSelectedClass(record);
    const s = await getClassStudents(record.id);
    setStudents(s);
  };

  // ---- Student handlers ----
  const handleEnroll = async () => {
    try {
      const values = await enrollForm.validateFields();
      await enrollStudent({ ...values, classId: selectedClass!.id });
      message.success('Dang ky hoc vien thanh cong');
      setStudentModalOpen(false);
      enrollForm.resetFields();
      const s = await getClassStudents(selectedClass!.id);
      setStudents(s);
    } catch {
      message.warning('Vui long dien day du thong tin');
    }
  };

  const handleIssueCert = async () => {
    try {
      const values = await certForm.validateFields();
      await issueCertificate(certStudent!.id, {
        certificateNumber: values.certificateNumber,
        certificateDate: values.certificateDate?.format('YYYY-MM-DD'),
      });
      message.success('Cap chung chi thanh cong');
      setCertModalOpen(false);
      certForm.resetFields();
      setCertStudent(null);
      const s = await getClassStudents(selectedClass!.id);
      setStudents(s);
    } catch {
      message.warning('Vui long dien day du thong tin');
    }
  };

  // ---- Direction handlers ----
  const handleSaveDir = async () => {
    try {
      const values = await dirForm.validateFields();
      const payload = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      await saveClinicalDirection(payload, editingDir?.id);
      message.success(editingDir ? 'Cap nhat thanh cong' : 'Tao moi thanh cong');
      setDirModalOpen(false);
      dirForm.resetFields();
      setEditingDir(null);
      fetchDirections();
    } catch {
      message.warning('Vui long dien day du thong tin');
    }
  };

  const openDirModal = (record?: ClinicalDirectionDto) => {
    setEditingDir(record || null);
    if (record) {
      dirForm.setFieldsValue({
        ...record,
        startDate: record.startDate ? dayjs(record.startDate) : undefined,
        endDate: record.endDate ? dayjs(record.endDate) : undefined,
      });
    } else {
      dirForm.resetFields();
    }
    setDirModalOpen(true);
  };

  // ---- Research handlers ----
  const handleSaveProj = async () => {
    try {
      const values = await projForm.validateFields();
      const payload = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      await saveResearchProject(payload, editingProj?.id);
      message.success(editingProj ? 'Cap nhat thanh cong' : 'Tao moi thanh cong');
      setProjModalOpen(false);
      projForm.resetFields();
      setEditingProj(null);
      fetchProjects();
    } catch {
      message.warning('Vui long dien day du thong tin');
    }
  };

  const openProjModal = (record?: ResearchProjectDto) => {
    setEditingProj(record || null);
    if (record) {
      projForm.setFieldsValue({
        ...record,
        startDate: record.startDate ? dayjs(record.startDate) : undefined,
        endDate: record.endDate ? dayjs(record.endDate) : undefined,
      });
    } else {
      projForm.resetFields();
    }
    setProjModalOpen(true);
  };

  // ---- Columns ----
  const classColumns: ColumnsType<TrainingClassDto> = [
    { title: 'Ma lop', dataIndex: 'classCode', key: 'classCode', width: 100 },
    { title: 'Ten lop', dataIndex: 'className', key: 'className', ellipsis: true },
    {
      title: 'Loai', dataIndex: 'trainingType', key: 'trainingType', width: 120,
      render: (v: number) => <Tag color={TRAINING_TYPES[v]?.color}>{TRAINING_TYPES[v]?.label}</Tag>,
    },
    { title: 'Bat dau', dataIndex: 'startDate', key: 'startDate', width: 110 },
    { title: 'Ket thuc', dataIndex: 'endDate', key: 'endDate', width: 110 },
    {
      title: 'Si so', key: 'enrolled', width: 80,
      render: (_: unknown, r: TrainingClassDto) => `${r.enrolledCount}/${r.maxStudents}`,
    },
    { title: 'Tin chi', dataIndex: 'creditHours', key: 'creditHours', width: 70 },
    {
      title: 'Trang thai', dataIndex: 'status', key: 'status', width: 120,
      render: (v: number) => <Badge status={CLASS_STATUS[v]?.color as 'default'} text={CLASS_STATUS[v]?.label} />,
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_: unknown, r: TrainingClassDto) => (
        <Tooltip title="Sua"><Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openClassModal(r); }} /></Tooltip>
      ),
    },
  ];

  const studentColumns: ColumnsType<TrainingStudentDto> = [
    { title: 'Ho ten', key: 'name', render: (_: unknown, r: TrainingStudentDto) => r.staffName || r.externalName },
    {
      title: 'Loai', dataIndex: 'studentType', key: 'studentType', width: 100,
      render: (v: number) => v === 1 ? 'Noi bo' : v === 2 ? 'Ben ngoai' : 'Thuc tap',
    },
    {
      title: 'Trang thai', dataIndex: 'attendanceStatus', key: 'attendanceStatus', width: 110,
      render: (v: number) => <Tag color={v === 3 ? 'green' : v === 4 ? 'red' : 'blue'}>{v === 1 ? 'Da DK' : v === 2 ? 'Dang hoc' : v === 3 ? 'Hoan thanh' : 'Bo hoc'}</Tag>,
    },
    { title: 'Diem', dataIndex: 'score', key: 'score', width: 70 },
    { title: 'So chung chi', dataIndex: 'certificateNumber', key: 'cert', width: 130 },
    {
      title: '', key: 'actions', width: 100,
      render: (_: unknown, r: TrainingStudentDto) => (
        <Space>
          {r.attendanceStatus < 3 && (
            <Button size="small" onClick={() => updateStudentStatus(r.id, { attendanceStatus: r.attendanceStatus + 1 }).then(() => { message.success('Cap nhat'); handleClassRowClick(selectedClass!); })}>
              {r.attendanceStatus === 1 ? 'Bat dau' : 'Hoan thanh'}
            </Button>
          )}
          {r.attendanceStatus === 3 && !r.certificateNumber && (
            <Tooltip title="Cap chung chi">
              <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => { setCertStudent(r); setCertModalOpen(true); }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const dirColumns: ColumnsType<ClinicalDirectionDto> = [
    {
      title: 'Loai', dataIndex: 'directionType', key: 'directionType', width: 120,
      render: (v: number) => <Tag color={v === 1 ? 'blue' : 'green'}>{DIRECTION_TYPES[v]}</Tag>,
    },
    { title: 'Benh vien doi tac', dataIndex: 'partnerHospital', key: 'partner', ellipsis: true },
    { title: 'Bat dau', dataIndex: 'startDate', key: 'startDate', width: 110 },
    { title: 'Ket thuc', dataIndex: 'endDate', key: 'endDate', width: 110 },
    { title: 'Muc tieu', dataIndex: 'objectives', key: 'objectives', ellipsis: true },
    {
      title: 'Trang thai', dataIndex: 'status', key: 'status', width: 130,
      render: (v: number) => <Badge status={DIRECTION_STATUS[v]?.color as 'default'} text={DIRECTION_STATUS[v]?.label} />,
    },
    { title: 'BS phu trach', dataIndex: 'responsibleDoctorName', key: 'doctor', width: 150 },
    {
      title: '', key: 'actions', width: 50,
      render: (_: unknown, r: ClinicalDirectionDto) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDirModal(r)} />
      ),
    },
  ];

  const projColumns: ColumnsType<ResearchProjectDto> = [
    { title: 'Ma', dataIndex: 'projectCode', key: 'code', width: 100 },
    { title: 'Ten de tai', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Cap', dataIndex: 'level', key: 'level', width: 120,
      render: (v: number) => RESEARCH_LEVELS[v],
    },
    { title: 'Chu nhiem', dataIndex: 'principalInvestigatorName', key: 'pi', width: 150 },
    { title: 'Bat dau', dataIndex: 'startDate', key: 'start', width: 110 },
    {
      title: 'Ngan sach', dataIndex: 'budget', key: 'budget', width: 120,
      render: (v: number) => v > 0 ? `${(v / 1_000_000).toFixed(0)} trieu` : '-',
    },
    {
      title: 'Trang thai', dataIndex: 'status', key: 'status', width: 130,
      render: (v: number) => <Tag color={RESEARCH_STATUS[v]?.color}>{RESEARCH_STATUS[v]?.label}</Tag>,
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_: unknown, r: ResearchProjectDto) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openProjModal(r)} />
      ),
    },
  ];

  const creditColumns: ColumnsType<CreditSummaryDto> = [
    { title: 'Nhan vien', dataIndex: 'staffName', key: 'name' },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'dept', width: 150 },
    { title: 'Tin chi', dataIndex: 'totalCredits', key: 'credits', width: 80 },
    { title: 'Yeu cau', dataIndex: 'requiredCredits', key: 'required', width: 80 },
    {
      title: 'Tien do', key: 'progress', width: 200,
      render: (_: unknown, r: CreditSummaryDto) => (
        <Progress percent={Math.round(r.compliancePercent)} size="small" status={r.isCompliant ? 'success' : 'exception'} />
      ),
    },
    {
      title: 'Trang thai', key: 'compliant', width: 100,
      render: (_: unknown, r: CreditSummaryDto) => r.isCompliant ? <Tag color="green">Dat</Tag> : <Tag color="red">Chua dat</Tag>,
    },
  ];

  // ---- Tab content renderers ----

  const renderClasses = () => (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Loai dao tao" allowClear style={{ width: 150 }}
          onChange={(v) => setClassFilter(f => ({ ...f, type: v }))}
          options={Object.entries(TRAINING_TYPES).map(([k, v]) => ({ value: Number(k), label: v.label }))}
        />
        <Select placeholder="Trang thai" allowClear style={{ width: 150 }}
          onChange={(v) => setClassFilter(f => ({ ...f, status: v }))}
          options={Object.entries(CLASS_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchClasses}>Lam moi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openClassModal()}>Tao lop</Button>
      </Space>

      <Row gutter={16}>
        <Col span={selectedClass ? 14 : 24}>
          <Table dataSource={classes} columns={classColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }}
            onRow={(r) => ({ onClick: () => handleClassRowClick(r), style: { cursor: 'pointer' } })}
            rowClassName={(r) => r.id === selectedClass?.id ? 'ant-table-row-selected' : ''}
          />
        </Col>
        {selectedClass && (
          <Col span={10}>
            <Card title={`Hoc vien: ${selectedClass.className}`} size="small"
              extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setStudentModalOpen(true)}>Them</Button>}>
              <Table dataSource={students} columns={studentColumns} rowKey="id" size="small" pagination={false} />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );

  const renderDirections = () => (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchDirections}>Lam moi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDirModal()}>Them moi</Button>
      </Space>
      <Table dataSource={directions} columns={dirColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
    </div>
  );

  const renderResearch = () => (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Cap" allowClear style={{ width: 140 }}
          onChange={(v) => setProjFilter(f => ({ ...f, level: v }))}
          options={Object.entries(RESEARCH_LEVELS).map(([k, v]) => ({ value: Number(k), label: v }))}
        />
        <Select placeholder="Trang thai" allowClear style={{ width: 140 }}
          onChange={(v) => setProjFilter(f => ({ ...f, status: v }))}
          options={Object.entries(RESEARCH_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchProjects}>Lam moi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openProjModal()}>Them de tai</Button>
      </Space>
      <Table dataSource={projects} columns={projColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
    </div>
  );

  const renderCertificates = () => (
    <div>
      <Card title="Tong hop tin chi CME theo nhan vien" size="small">
        <Table dataSource={creditSummary} columns={creditColumns} rowKey="staffId" size="small" pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );

  const renderDashboard = () => {
    if (!dashboard) return <Spin />;
    const pieData = dashboard.classesByType.map(c => ({ name: c.typeName, value: c.count }));
    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Card><Statistic title="Tong lop" value={dashboard.totalClasses} prefix={<BookOutlined />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Dang dien ra" value={dashboard.activeClasses} prefix={<TeamOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Hoc vien" value={dashboard.totalStudents} prefix={<TeamOutlined />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Chung chi cap" value={dashboard.certificatesIssued} prefix={<SafetyCertificateOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="De tai NCKH" value={dashboard.researchProjects} prefix={<ExperimentOutlined />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Da cong bo" value={dashboard.researchPublished} prefix={<TrophyOutlined />} styles={{ content: { color: '#faad14' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Chi dao tuyen" value={dashboard.clinicalDirections} /></Card></Col>
          <Col xs={12} sm={6}>
            <Card>
              <div style={{ marginBottom: 8 }}>CME Compliance</div>
              <Progress type="circle" percent={Math.round(dashboard.cmeCompliancePercent)} size={80}
                status={dashboard.cmeCompliancePercent >= 80 ? 'success' : dashboard.cmeCompliancePercent >= 50 ? 'normal' : 'exception'} />
            </Card>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="Lop theo loai dao tao" size="small">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((_entry, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chua co du lieu</div>}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="De tai NCKH theo trang thai" size="small">
              {dashboard.projectsByStatus.length > 0 ? (
                <div style={{ padding: '16px 0' }}>
                  {dashboard.projectsByStatus.map(p => (
                    <div key={p.status} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <Tag color={RESEARCH_STATUS[p.status]?.color} style={{ width: 120 }}>{p.statusName}</Tag>
                      <Progress percent={dashboard.researchProjects > 0 ? Math.round(p.count / dashboard.researchProjects * 100) : 0}
                        size="small" style={{ flex: 1, marginLeft: 8 }} format={() => `${p.count}`} />
                    </div>
                  ))}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chua co du lieu</div>}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const tabItems = [
    { key: 'classes', label: 'Lop dao tao', children: renderClasses() },
    { key: 'directions', label: 'Chi dao tuyen', children: renderDirections() },
    { key: 'research', label: 'Nghien cuu KH', children: renderResearch() },
    { key: 'certificates', label: 'Chung chi', children: renderCertificates() },
    { key: 'dashboard', label: 'Dashboard', children: renderDashboard() },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '16px 24px' }}>
        <h2>Dao tao - Chi dao tuyen - NCKH</h2>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        {/* Class Modal */}
        <Modal title={editingClass ? 'Sua lop dao tao' : 'Tao lop dao tao'} open={classModalOpen}
          onOk={handleSaveClass} onCancel={() => { setClassModalOpen(false); setEditingClass(null); classForm.resetFields(); }} width={600}>
          <Form form={classForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="classCode" label="Ma lop" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="className" label="Ten lop" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="trainingType" label="Loai dao tao" rules={[{ required: true }]}>
                  <Select options={Object.entries(TRAINING_TYPES).map(([k, v]) => ({ value: Number(k), label: v.label }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Trang thai" initialValue={1}>
                  <Select options={Object.entries(CLASS_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="startDate" label="Ngay bat dau" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="endDate" label="Ngay ket thuc"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="maxStudents" label="Si so toi da" initialValue={30}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="creditHours" label="Tin chi" initialValue={0}><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="fee" label="Hoc phi (VND)" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="location" label="Dia diem"><Input /></Form.Item>
            <Form.Item name="description" label="Mo ta"><TextArea rows={3} /></Form.Item>
          </Form>
        </Modal>

        {/* Enroll Student Modal */}
        <Modal title="Them hoc vien" open={studentModalOpen}
          onOk={handleEnroll} onCancel={() => { setStudentModalOpen(false); enrollForm.resetFields(); }}>
          <Form form={enrollForm} layout="vertical">
            <Form.Item name="studentType" label="Loai hoc vien" initialValue={1} rules={[{ required: true }]}>
              <Select options={[{ value: 1, label: 'Noi bo' }, { value: 2, label: 'Ben ngoai' }, { value: 3, label: 'Thuc tap sinh' }]} />
            </Form.Item>
            <Form.Item name="externalName" label="Ho ten (hoc vien ben ngoai)"><Input /></Form.Item>
            <Form.Item name="notes" label="Ghi chu"><TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>

        {/* Certificate Modal */}
        <Modal title="Cap chung chi" open={certModalOpen}
          onOk={handleIssueCert} onCancel={() => { setCertModalOpen(false); setCertStudent(null); certForm.resetFields(); }}>
          <Form form={certForm} layout="vertical">
            <Form.Item name="certificateNumber" label="So chung chi" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="certificateDate" label="Ngay cap"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Form>
        </Modal>

        {/* Direction Modal */}
        <Modal title={editingDir ? 'Sua chi dao tuyen' : 'Them chi dao tuyen'} open={dirModalOpen}
          onOk={handleSaveDir} onCancel={() => { setDirModalOpen(false); setEditingDir(null); dirForm.resetFields(); }} width={600}>
          <Form form={dirForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="directionType" label="Loai" rules={[{ required: true }]}>
                  <Select options={[{ value: 1, label: 'Tuyen tren' }, { value: 2, label: 'Tuyen duoi' }]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Trang thai" initialValue={1}>
                  <Select options={Object.entries(DIRECTION_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="partnerHospital" label="Benh vien doi tac" rules={[{ required: true }]}><Input /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="startDate" label="Bat dau" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="endDate" label="Ket thuc"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="objectives" label="Muc tieu"><TextArea rows={3} /></Form.Item>
            <Form.Item name="notes" label="Ghi chu"><TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>

        {/* Research Modal */}
        <Modal title={editingProj ? 'Sua de tai' : 'Them de tai'} open={projModalOpen}
          onOk={handleSaveProj} onCancel={() => { setProjModalOpen(false); setEditingProj(null); projForm.resetFields(); }} width={600}>
          <Form form={projForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="projectCode" label="Ma de tai" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="title" label="Ten de tai" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="level" label="Cap" rules={[{ required: true }]}>
                  <Select options={Object.entries(RESEARCH_LEVELS).map(([k, v]) => ({ value: Number(k), label: v }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Trang thai" initialValue={1}>
                  <Select options={Object.entries(RESEARCH_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="startDate" label="Bat dau" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="endDate" label="Ket thuc"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="budget" label="Ngan sach (VND)" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="abstract" label="Tom tat"><TextArea rows={3} /></Form.Item>
            <Form.Item name="findings" label="Ket qua"><TextArea rows={3} /></Form.Item>
            <Form.Item name="publicationInfo" label="Thong tin cong bo"><TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default TrainingResearch;
