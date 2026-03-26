import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Select,
  DatePicker,
  Typography,
  message,
  Tabs,
  Statistic,
  Spin,
  Modal,
  Form,
  Descriptions,
  Progress,
  Divider,
  Drawer,
  Timeline,
  Badge,
  InputNumber,
  Alert,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ExperimentOutlined,
  HeartOutlined,
  BarChartOutlined,
  MedicineBoxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as hivApi from '../api/hivManagement';
import type {
  HivPatient,
  HivLabResult,
  PmtctRecord,
  HivStats,
} from '../api/hivManagement';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const ART_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PreART: { label: 'Truoc ART', color: 'default' },
  OnART: { label: 'Dang ART', color: 'green' },
  Interrupted: { label: 'Gian doan', color: 'orange' },
  Transferred: { label: 'Chuyen', color: 'blue' },
  Deceased: { label: 'Tu vong', color: 'default' },
  Lost: { label: 'Mat dau', color: 'red' },
};

const WHO_STAGE_COLORS: Record<number, string> = {
  1: 'green',
  2: 'gold',
  3: 'orange',
  4: 'red',
};

const PMTCT_STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: 'Truoc sinh', color: 'processing' },
  1: { label: 'Da sinh', color: 'success' },
  2: { label: 'Hau san', color: 'warning' },
  3: { label: 'Hoan tat', color: 'blue' },
};

const ART_REGIMENS = [
  'TDF + 3TC + DTG',
  'TDF + 3TC + EFV',
  'ABC + 3TC + DTG',
  'AZT + 3TC + NVP',
  'AZT + 3TC + EFV',
  'TDF + 3TC + LPV/r',
  'ABC + 3TC + LPV/r',
];

const HivManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState<HivPatient[]>([]);
  const [pmtctRecords, setPmtctRecords] = useState<PmtctRecord[]>([]);
  const [stats, setStats] = useState<HivStats | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<HivPatient | null>(null);
  const [labHistory, setLabHistory] = useState<HivLabResult[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [pmtctModalOpen, setPmtctModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [enrollForm] = Form.useForm();
  const [labForm] = Form.useForm();
  const [pmtctForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        hivApi.searchPatients(),
        hivApi.getPmtctRecords(),
        hivApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setPatients(results[0].value);
      if (results[1].status === 'fulfilled') setPmtctRecords(results[1].value);
      if (results[2].status === 'fulfilled') setStats(results[2].value);
    } catch {
      message.warning('Khong the tai du lieu quan ly HIV');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewPatient = async (record: HivPatient) => {
    setSelectedPatient(record);
    setDrawerOpen(true);
    try {
      const history = await hivApi.getLabHistory(record.id);
      setLabHistory(history);
    } catch {
      console.warn('Failed to load lab history');
    }
  };

  const handleEnrollPatient = () => {
    enrollForm.resetFields();
    setEnrollModalOpen(true);
  };

  const handleSaveEnroll = async () => {
    try {
      const values = await enrollForm.validateFields();
      setSubmitting(true);
      const data = {
        ...values,
        diagnosisDate: values.diagnosisDate?.format('YYYY-MM-DD'),
        enrollmentDate: values.enrollmentDate?.format('YYYY-MM-DD'),
        artStartDate: values.artStartDate?.format('YYYY-MM-DD'),
        dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD'),
      };
      await hivApi.enrollPatient(data);
      message.success('Dang ky benh nhan thanh cong');
      setEnrollModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui long kiem tra lai thong tin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLabResult = () => {
    labForm.resetFields();
    if (selectedPatient) {
      labForm.setFieldValue('patientId', selectedPatient.id);
    }
    setLabModalOpen(true);
  };

  const handleSaveLabResult = async () => {
    try {
      const values = await labForm.validateFields();
      setSubmitting(true);
      const data = {
        ...values,
        testDate: values.testDate?.format('YYYY-MM-DD'),
      };
      await hivApi.addLabResult(data);
      message.success('Luu ket qua xet nghiem thanh cong');
      setLabModalOpen(false);
      if (selectedPatient) {
        const history = await hivApi.getLabHistory(selectedPatient.id);
        setLabHistory(history);
      }
    } catch {
      message.warning('Vui long kiem tra lai thong tin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPmtct = () => {
    pmtctForm.resetFields();
    setPmtctModalOpen(true);
  };

  const handleSavePmtct = async () => {
    try {
      const values = await pmtctForm.validateFields();
      setSubmitting(true);
      const data = {
        ...values,
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        infantTestDate: values.infantTestDate?.format('YYYY-MM-DD'),
      };
      await hivApi.addPmtctRecord(data);
      message.success('Luu thong tin PMTCT thanh cong');
      setPmtctModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui long kiem tra lai thong tin');
    } finally {
      setSubmitting(false);
    }
  };

  const patientColumns: ColumnsType<HivPatient> = [
    {
      title: 'Ma HIV',
      dataIndex: 'hivCode',
      key: 'hivCode',
      width: 110,
    },
    {
      title: 'Ho ten',
      dataIndex: 'fullName',
      key: 'fullName',
      ellipsis: true,
    },
    {
      title: 'Gioi',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: number) => g === 1 ? 'Nam' : 'Nu',
    },
    {
      title: 'ART',
      dataIndex: 'artStatus',
      key: 'artStatus',
      width: 110,
      render: (s: string) => {
        const cfg = ART_STATUS_CONFIG[s];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : s;
      },
    },
    {
      title: 'WHO',
      dataIndex: 'whoStage',
      key: 'whoStage',
      width: 70,
      align: 'center',
      render: (s: number) => (
        <Badge count={`${s}`} style={{ backgroundColor: WHO_STAGE_COLORS[s] || '#999' }} />
      ),
    },
    {
      title: 'Phac do',
      dataIndex: 'currentRegimen',
      key: 'currentRegimen',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'CD4',
      dataIndex: 'lastCd4Count',
      key: 'lastCd4Count',
      width: 80,
      align: 'center',
      render: (v: number) => v != null ? (
        <Text style={{ color: v < 200 ? '#ff4d4f' : v < 350 ? '#fa8c16' : '#52c41a' }}>{v}</Text>
      ) : '-',
    },
    {
      title: 'VL',
      dataIndex: 'lastViralLoad',
      key: 'lastViralLoad',
      width: 100,
      render: (v: number) => v != null ? (
        <Text style={{ color: v >= 200 ? '#ff4d4f' : '#52c41a' }}>
          {v < 200 ? '< 200' : v.toLocaleString()}
        </Text>
      ) : '-',
    },
    {
      title: 'Uc che VR',
      dataIndex: 'viralSuppressed',
      key: 'viralSuppressed',
      width: 90,
      align: 'center',
      render: (v: boolean) => v
        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
        : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 80,
      render: (_: unknown, record: HivPatient) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewPatient(record)}>
          Chi tiet
        </Button>
      ),
    },
  ];

  const pmtctColumns: ColumnsType<PmtctRecord> = [
    {
      title: 'Ho ten me',
      dataIndex: 'patientName',
      key: 'patientName',
      ellipsis: true,
    },
    {
      title: 'ART truoc thai',
      dataIndex: 'artBeforePregnancy',
      key: 'artBeforePregnancy',
      width: 120,
      render: (v: boolean) => v ? <Tag color="green">Co</Tag> : <Tag color="orange">Khong</Tag>,
    },
    {
      title: 'ART trong thai ky',
      dataIndex: 'artDuringPregnancy',
      key: 'artDuringPregnancy',
      width: 130,
      render: (v: boolean) => v ? <Tag color="green">Co</Tag> : <Tag color="red">Khong</Tag>,
    },
    {
      title: 'Phac do',
      dataIndex: 'artRegimen',
      key: 'artRegimen',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'VL khi sinh',
      dataIndex: 'viralLoadAtDelivery',
      key: 'viralLoadAtDelivery',
      width: 100,
      render: (v: number) => v != null ? (v < 200 ? '< 200' : v.toLocaleString()) : '-',
    },
    {
      title: 'Ngay sinh',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Du phong tre',
      dataIndex: 'infantProphylaxis',
      key: 'infantProphylaxis',
      width: 100,
      render: (v: boolean) => v ? <Tag color="green">Co</Tag> : <Tag color="red">Khong</Tag>,
    },
    {
      title: 'KQ XN tre',
      dataIndex: 'infantTestResult',
      key: 'infantTestResult',
      width: 100,
      render: (v: string) => {
        if (!v) return '-';
        const colorMap: Record<string, string> = { Negative: 'green', Positive: 'red', Pending: 'gold', Indeterminate: 'orange' };
        const labelMap: Record<string, string> = { Negative: 'Am tinh', Positive: 'Duong tinh', Pending: 'Cho', Indeterminate: 'Chua ro' };
        return <Tag color={colorMap[v] || 'default'}>{labelMap[v] || v}</Tag>;
      },
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: number) => {
        const cfg = PMTCT_STATUS_CONFIG[s];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
  ];

  const labColumns: ColumnsType<HivLabResult> = [
    {
      title: 'Ngay XN',
      dataIndex: 'testDate',
      key: 'testDate',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loai XN',
      dataIndex: 'testType',
      key: 'testType',
      width: 120,
    },
    {
      title: 'Ket qua',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (v: number, r: HivLabResult) => (
        <Text style={{ color: r.isAbnormal ? '#ff4d4f' : undefined, fontWeight: r.isAbnormal ? 'bold' : undefined }}>
          {v} {r.unit}
        </Text>
      ),
    },
    {
      title: 'Tham chieu',
      dataIndex: 'referenceRange',
      key: 'referenceRange',
      width: 120,
    },
    {
      title: 'Bat thuong',
      dataIndex: 'isAbnormal',
      key: 'isAbnormal',
      width: 90,
      render: (v: boolean) => v ? <Tag color="red">Bat thuong</Tag> : <Tag color="green">Binh thuong</Tag>,
    },
  ];

  const filteredPatients = keyword
    ? patients.filter(p =>
        p.hivCode?.toLowerCase().includes(keyword.toLowerCase()) ||
        p.fullName?.toLowerCase().includes(keyword.toLowerCase()) ||
        p.patientCode?.toLowerCase().includes(keyword.toLowerCase())
      )
    : patients;

  const cascadeMax = Math.max(stats?.cascadeDiagnosed || 1, 1);

  const tabItems = [
    {
      key: 'patients',
      label: <span><UserOutlined /> Danh sach BN</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem benh nhan..."
              allowClear
              onSearch={v => setKeyword(v)}
              onChange={e => !e.target.value && setKeyword('')}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Select placeholder="Trang thai ART" allowClear style={{ width: 150 }} onChange={() => {}}>
              {Object.entries(ART_STATUS_CONFIG).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleEnrollPatient}>
              Dang ky BN
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </Space>
          <Table
            columns={patientColumns}
            dataSource={filteredPatients}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} benh nhan` }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'lab',
      label: <span><ExperimentOutlined /> Xet nghiem</span>,
      children: (
        <div>
          <Alert
            title="Theo doi CD4 va tai luong virus"
            type="info"
            showIcon
            description="Chon benh nhan tu tab Danh sach de xem lich su xet nghiem va them ket qua moi."
            style={{ marginBottom: 16 }}
          />
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Card title="Them ket qua xet nghiem" size="small">
                <Form form={labForm} layout="vertical" onFinish={handleSaveLabResult}>
                  <Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true, message: 'Bat buoc' }]}>
                    <Select placeholder="Chon benh nhan" showSearch optionFilterProp="label"
                      options={patients.map(p => ({ value: p.id, label: `${p.hivCode} - ${p.fullName}` }))}
                    />
                  </Form.Item>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Form.Item name="testType" label="Loai xet nghiem" rules={[{ required: true, message: 'Bat buoc' }]}>
                        <Select placeholder="Chon">
                          <Select.Option value="CD4">CD4</Select.Option>
                          <Select.Option value="ViralLoad">Tai luong virus</Select.Option>
                          <Select.Option value="HIV-DR">Khang thuoc HIV</Select.Option>
                          <Select.Option value="CBC">Cong thuc mau</Select.Option>
                          <Select.Option value="Liver">Chuc nang gan</Select.Option>
                          <Select.Option value="Kidney">Chuc nang than</Select.Option>
                          <Select.Option value="Lipid">Mo mau</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>
                    <div>
                      <Form.Item name="testDate" label="Ngay xet nghiem" rules={[{ required: true, message: 'Bat buoc' }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                      </Form.Item>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Form.Item name="result" label="Ket qua" rules={[{ required: true, message: 'Bat buoc' }]}>
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                    <div>
                      <Form.Item name="unit" label="Don vi">
                        <Input placeholder="cells/uL, copies/mL..." />
                      </Form.Item>
                    </div>
                    <div>
                      <Form.Item name="isAbnormal" label="Bat thuong" initialValue={false}>
                        <Select>
                          <Select.Option value={false}>Binh thuong</Select.Option>
                          <Select.Option value={true}>Bat thuong</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>
                  </div>
                  <Form.Item name="notes" label="Ghi chu">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={submitting}>Luu ket qua</Button>
                </Form>
              </Card>
            </div>
            <div>
              <Card title="Canh bao bat thuong" size="small">
                {patients.filter(p => p.lastCd4Count != null && p.lastCd4Count < 200).length > 0 ? (
                  patients.filter(p => p.lastCd4Count != null && p.lastCd4Count < 200).slice(0, 5).map(p => (
                    <Alert
                      key={p.id}
                      title={`${p.fullName}: CD4 = ${p.lastCd4Count}`}
                      type="error"
                      showIcon
                      style={{ marginBottom: 8 }}
                    />
                  ))
                ) : (
                  <span className="text-gray-500">Khong co canh bao</span>
                )}
                {patients.filter(p => p.lastViralLoad != null && p.lastViralLoad >= 200).length > 0 && (
                  <>
                    <hr className="border-t border-gray-200 my-4" />
                    {patients.filter(p => p.lastViralLoad != null && p.lastViralLoad >= 200).slice(0, 5).map(p => (
                      <Alert
                        key={p.id}
                        title={`${p.fullName}: VL = ${p.lastViralLoad?.toLocaleString()} copies/mL`}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'pmtct',
      label: <span><HeartOutlined /> PMTCT</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPmtct}>
              Them PMTCT
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </Space>
          <Table
            columns={pmtctColumns}
            dataSource={pmtctRecords}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} ban ghi` }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'statistics',
      label: <span><BarChartOutlined /> Thong ke</span>,
      children: (
        <div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Ty le ART" value={stats?.artCoverageRate ?? 0} suffix="%" styles={{ content: { color: '#52c41a' } }} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Ty le uc che VR" value={stats?.viralSuppressionRate ?? 0} suffix="%" styles={{ content: { color: '#13c2c2' } }} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Mat dau" value={stats?.lostToFollowUp ?? 0} styles={{ content: { color: '#ff4d4f' } }} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <Statistic title="Dang ky moi (thang)" value={stats?.newEnrollmentsThisMonth ?? 0} styles={{ content: { color: '#1890ff' } }} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Cascade 90-90-90</div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span>Chan doan</span>
                <Progress percent={100} format={() => stats?.cascadeDiagnosed ?? 0} />
              </div>
              <div>
                <span>Ket noi dieu tri</span>
                <Progress
                  percent={cascadeMax ? Math.round(((stats?.cascadeLinked ?? 0) / cascadeMax) * 100) : 0}
                  format={() => stats?.cascadeLinked ?? 0}
                  strokeColor="#1890ff"
                />
              </div>
              <div>
                <span>Duy tri dieu tri</span>
                <Progress
                  percent={cascadeMax ? Math.round(((stats?.cascadeRetained ?? 0) / cascadeMax) * 100) : 0}
                  format={() => stats?.cascadeRetained ?? 0}
                  strokeColor="#52c41a"
                />
              </div>
              <div>
                <span>Uc che virus</span>
                <Progress
                  percent={cascadeMax ? Math.round(((stats?.cascadeSuppressed ?? 0) / cascadeMax) * 100) : 0}
                  format={() => stats?.cascadeSuppressed ?? 0}
                  strokeColor="#13c2c2"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Ket qua PMTCT</div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-gray-500 text-sm mb-1">Ba me HIV+</div><div className="text-2xl font-semibold"><HeartOutlined className="mr-1" />{stats?.pmtctMothers ?? 0}</div>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-gray-500 text-sm mb-1">Tre phoi nhiem</div><div className="text-2xl font-semibold">{stats?.pmtctInfantsExposed ?? 0}</div>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="text-gray-500 text-sm mb-1">Tre da xet nghiem</div><div className="text-2xl font-semibold">{stats?.pmtctInfantsTested ?? 0}</div>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <Statistic
                  title="Ty le lay truyen"
                  value={stats?.pmtctTransmissionRate ?? 0}
                  suffix="%"
                  styles={{ content: { color: (stats?.pmtctTransmissionRate ?? 0) > 2 ? '#ff4d4f' : '#52c41a' } }}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <h4 className="text-lg font-semibold mb-4">Quan ly HIV/AIDS</h4>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">BN dang theo doi</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><UserOutlined className="mr-1" />{stats?.totalPatients ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Dang ART</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><MedicineBoxOutlined className="mr-1" />{stats?.onArt ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Uc che virus</div><div className="text-2xl font-semibold" style={{ color: '#13c2c2' }}><CheckCircleOutlined className="mr-1" />{stats?.viralSuppressed ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">PMTCT</div><div className="text-2xl font-semibold" style={{ color: '#eb2f96' }}><HeartOutlined className="mr-1" />{stats?.pmtctEnrolled ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>

        {/* Patient Detail Drawer */}
        <Drawer
          title={selectedPatient ? `${selectedPatient.fullName} - ${selectedPatient.hivCode}` : 'Chi tiet benh nhan'}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={700}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddLabResult}>
              Them XN
            </Button>
          }
        >
          {selectedPatient && (
            <div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ma BN">{selectedPatient.patientCode}</Descriptions.Item>
                <Descriptions.Item label="Ma HIV">{selectedPatient.hivCode}</Descriptions.Item>
                <Descriptions.Item label="Ho ten">{selectedPatient.fullName}</Descriptions.Item>
                <Descriptions.Item label="Gioi">{selectedPatient.gender === 1 ? 'Nam' : 'Nu'}</Descriptions.Item>
                <Descriptions.Item label="Ngay sinh">{selectedPatient.dateOfBirth ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="CCCD">{selectedPatient.cccd || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngay chan doan">{selectedPatient.diagnosisDate ? dayjs(selectedPatient.diagnosisDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngay dang ky">{selectedPatient.enrollmentDate ? dayjs(selectedPatient.enrollmentDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="ART">
                  {ART_STATUS_CONFIG[selectedPatient.artStatus] && (
                    <Tag color={ART_STATUS_CONFIG[selectedPatient.artStatus].color}>
                      {ART_STATUS_CONFIG[selectedPatient.artStatus].label}
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="WHO Stage">
                  <Badge count={`${selectedPatient.whoStage}`} style={{ backgroundColor: WHO_STAGE_COLORS[selectedPatient.whoStage] }} />
                </Descriptions.Item>
                <Descriptions.Item label="Phac do">{selectedPatient.currentRegimen || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tuan thu">{selectedPatient.adherenceStatus || '-'}</Descriptions.Item>
                <Descriptions.Item label="CD4 gan nhat">
                  {selectedPatient.lastCd4Count != null ? `${selectedPatient.lastCd4Count} cells/uL` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="VL gan nhat">
                  {selectedPatient.lastViralLoad != null ? `${selectedPatient.lastViralLoad} copies/mL` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Dong nhiem TB">{selectedPatient.tbCoinfection ? 'Co' : 'Khong'}</Descriptions.Item>
                <Descriptions.Item label="Dong nhiem HBV">{selectedPatient.hbvCoinfection ? 'Co' : 'Khong'}</Descriptions.Item>
                <Descriptions.Item label="Bac si">{selectedPatient.assignedDoctorName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hen kham">{selectedPatient.nextAppointmentDate ? dayjs(selectedPatient.nextAppointmentDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              </Descriptions>

              <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Lich su xet nghiem</div>
              <Table
                columns={labColumns}
                dataSource={labHistory}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: 'Chua co xet nghiem' }}
              />
            </div>
          )}
        </Drawer>

        {/* Enroll Patient Modal */}
        <Modal
          title="Dang ky benh nhan HIV"
          open={enrollModalOpen}
          onOk={handleSaveEnroll}
          onCancel={() => setEnrollModalOpen(false)}
          confirmLoading={submitting}
          width={800}
          destroyOnHidden
        >
          <Form form={enrollForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="fullName" label="Ho ten" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="dateOfBirth" label="Ngay sinh" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="gender" label="Gioi tinh" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value={1}>Nam</Select.Option>
                    <Select.Option value={2}>Nu</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="cccd" label="CCCD">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="phone" label="Dien thoai">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="insuranceNumber" label="So the BHYT">
                  <Input />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="address" label="Dia chi">
              <Input />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="diagnosisDate" label="Ngay chan doan" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="enrollmentDate" label="Ngay dang ky" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="whoStage" label="WHO Stage" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value={1}>Stage 1</Select.Option>
                    <Select.Option value={2}>Stage 2</Select.Option>
                    <Select.Option value={3}>Stage 3</Select.Option>
                    <Select.Option value={4}>Stage 4</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="artStatus" label="Trang thai ART" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    {Object.entries(ART_STATUS_CONFIG).map(([k, v]) => (
                      <Select.Option key={k} value={k}>{v.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="artStartDate" label="Ngay bat dau ART">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="currentRegimen" label="Phac do">
                  <Select placeholder="Chon phac do" allowClear>
                    {ART_REGIMENS.map(r => (
                      <Select.Option key={r} value={r}>{r}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Lab Result Modal */}
        <Modal
          title="Them ket qua xet nghiem"
          open={labModalOpen}
          onOk={handleSaveLabResult}
          onCancel={() => setLabModalOpen(false)}
          confirmLoading={submitting}
          width={600}
          destroyOnHidden
        >
          <Form form={labForm} layout="vertical">
            <Form.Item name="patientId" label="Benh nhan" rules={[{ required: true, message: 'Bat buoc' }]}>
              <Select placeholder="Chon benh nhan" showSearch optionFilterProp="label"
                options={patients.map(p => ({ value: p.id, label: `${p.hivCode} - ${p.fullName}` }))}
              />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="testType" label="Loai xet nghiem" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value="CD4">CD4</Select.Option>
                    <Select.Option value="ViralLoad">Tai luong virus</Select.Option>
                    <Select.Option value="HIV-DR">Khang thuoc HIV</Select.Option>
                    <Select.Option value="CBC">Cong thuc mau</Select.Option>
                    <Select.Option value="Liver">Chuc nang gan</Select.Option>
                    <Select.Option value="Kidney">Chuc nang than</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="testDate" label="Ngay XN" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="result" label="Ket qua" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="unit" label="Don vi">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="isAbnormal" label="Bat thuong" initialValue={false}>
                  <Select>
                    <Select.Option value={false}>Binh thuong</Select.Option>
                    <Select.Option value={true}>Bat thuong</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* PMTCT Modal */}
        <Modal
          title="Them ban ghi PMTCT"
          open={pmtctModalOpen}
          onOk={handleSavePmtct}
          onCancel={() => setPmtctModalOpen(false)}
          confirmLoading={submitting}
          width={700}
          destroyOnHidden
        >
          <Form form={pmtctForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientId" label="Ba me" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon benh nhan" showSearch optionFilterProp="label"
                    options={patients.filter(p => p.gender === 2).map(p => ({ value: p.id, label: `${p.hivCode} - ${p.fullName}` }))}
                  />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="gestationalAge" label="Tuoi thai (tuan)">
                  <InputNumber min={1} max={42} style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="artBeforePregnancy" label="ART truoc thai ky" initialValue={false}>
                  <Select>
                    <Select.Option value={true}>Co</Select.Option>
                    <Select.Option value={false}>Khong</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="artDuringPregnancy" label="ART trong thai ky" initialValue={true}>
                  <Select>
                    <Select.Option value={true}>Co</Select.Option>
                    <Select.Option value={false}>Khong</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="artRegimen" label="Phac do">
                  <Select placeholder="Chon" allowClear>
                    {ART_REGIMENS.map(r => (
                      <Select.Option key={r} value={r}>{r}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Thong tin sinh</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="deliveryDate" label="Ngay sinh">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="deliveryMode" label="Phuong phap sinh">
                  <Select placeholder="Chon" allowClear>
                    <Select.Option value="Vaginal">Sinh thuong</Select.Option>
                    <Select.Option value="Cesarean">Mo lay thai</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="infantFeedingMethod" label="Nuoi con">
                  <Select placeholder="Chon" allowClear>
                    <Select.Option value="Exclusive_BF">Bu me hoan toan</Select.Option>
                    <Select.Option value="Formula">Sua cong thuc</Select.Option>
                    <Select.Option value="Mixed">Ket hop</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="infantProphylaxis" label="Du phong tre" initialValue={false}>
                  <Select>
                    <Select.Option value={true}>Co</Select.Option>
                    <Select.Option value={false}>Khong</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="infantTestDate" label="Ngay XN tre">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="infantTestResult" label="KQ XN tre">
                  <Select placeholder="Chon" allowClear>
                    <Select.Option value="Negative">Am tinh</Select.Option>
                    <Select.Option value="Positive">Duong tinh</Select.Option>
                    <Select.Option value="Pending">Cho ket qua</Select.Option>
                    <Select.Option value="Indeterminate">Chua xac dinh</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HivManagement;
