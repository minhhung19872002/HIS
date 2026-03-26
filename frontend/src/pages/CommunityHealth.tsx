import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  Alert,
  InputNumber,
  Checkbox,
  Radio,
} from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  TeamOutlined,
  HeartOutlined,
  EnvironmentOutlined,
  WarningOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as communityApi from '../api/communityHealth';
import type {
  Household,
  NcdScreening,
  CommunityTeam,
  CommunityHealthStats,
} from '../api/communityHealth';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const RISK_COLORS: Record<string, string> = {
  Low: 'green',
  Medium: 'gold',
  High: 'orange',
  VeryHigh: 'red',
};

const RISK_LABELS: Record<string, string> = {
  Low: 'Thap',
  Medium: 'Trung binh',
  High: 'Cao',
  VeryHigh: 'Rat cao',
};

const BP_COLORS: Record<string, string> = {
  Normal: 'green',
  Elevated: 'gold',
  Stage1: 'orange',
  Stage2: 'red',
  Crisis: 'magenta',
};

const BP_LABELS: Record<string, string> = {
  Normal: 'Binh thuong',
  Elevated: 'Tang nhe',
  Stage1: 'THA do 1',
  Stage2: 'THA do 2',
  Crisis: 'Con THA',
};

const BMI_COLORS: Record<string, string> = {
  Underweight: 'orange',
  Normal: 'green',
  Overweight: 'gold',
  Obese: 'red',
};

const BMI_LABELS: Record<string, string> = {
  Underweight: 'Thieu can',
  Normal: 'Binh thuong',
  Overweight: 'Thua can',
  Obese: 'Beo phi',
};

const CommunityHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('households');
  const [households, setHouseholds] = useState<Household[]>([]);
  const [screenings, setScreenings] = useState<NcdScreening[]>([]);
  const [teams, setTeams] = useState<CommunityTeam[]>([]);
  const [stats, setStats] = useState<CommunityHealthStats | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [householdModalOpen, setHouseholdModalOpen] = useState(false);
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [householdForm] = Form.useForm();
  const [screeningForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        communityApi.searchHouseholds(),
        communityApi.searchNcdScreenings(),
        communityApi.searchTeams(),
        communityApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setHouseholds(results[0].value);
      if (results[1].status === 'fulfilled') setScreenings(results[1].value);
      if (results[2].status === 'fulfilled') setTeams(results[2].value);
      if (results[3].status === 'fulfilled') setStats(results[3].value);
    } catch {
      message.warning('Khong the tai du lieu suc khoe cong dong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateHousehold = () => {
    setEditingHousehold(null);
    householdForm.resetFields();
    setHouseholdModalOpen(true);
  };

  const handleEditHousehold = (record: Household) => {
    setEditingHousehold(record);
    householdForm.setFieldsValue(record);
    setHouseholdModalOpen(true);
  };

  const handleViewHousehold = (record: Household) => {
    setSelectedHousehold(record);
    setDetailModalOpen(true);
  };

  const handleSaveHousehold = async () => {
    try {
      const values = await householdForm.validateFields();
      setSubmitting(true);
      if (editingHousehold) {
        await communityApi.updateHousehold(editingHousehold.id, values);
        message.success('Cap nhat ho gia dinh thanh cong');
      } else {
        await communityApi.createHousehold(values);
        message.success('Them ho gia dinh thanh cong');
      }
      setHouseholdModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui long kiem tra lai thong tin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateScreening = () => {
    screeningForm.resetFields();
    setScreeningModalOpen(true);
  };

  const handleSaveScreening = async () => {
    try {
      const values = await screeningForm.validateFields();
      setSubmitting(true);
      const height = values.height / 100; // cm to m
      const bmi = values.weight / (height * height);
      const data = {
        ...values,
        bmi: Math.round(bmi * 10) / 10,
        bmiClassification: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese',
        screeningDate: values.screeningDate?.format('YYYY-MM-DD'),
        followUpDate: values.followUpDate?.format('YYYY-MM-DD'),
      };
      await communityApi.createNcdScreening(data);
      message.success('Luu ket qua sang loc thanh cong');
      setScreeningModalOpen(false);
      fetchData();
    } catch {
      message.warning('Vui long kiem tra lai thong tin');
    } finally {
      setSubmitting(false);
    }
  };

  const householdColumns: ColumnsType<Household> = [
    {
      title: 'Ma HGD',
      dataIndex: 'householdCode',
      key: 'householdCode',
      width: 110,
    },
    {
      title: 'Chu ho',
      dataIndex: 'headName',
      key: 'headName',
      ellipsis: true,
    },
    {
      title: 'Dia chi',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'Thanh vien',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 90,
      align: 'center',
    },
    {
      title: 'Nguy co',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 110,
      render: (level: string) => (
        <Tag color={RISK_COLORS[level] || 'default'}>{RISK_LABELS[level] || level}</Tag>
      ),
    },
    {
      title: 'Doi phu trach',
      dataIndex: 'assignedTeamName',
      key: 'assignedTeamName',
      width: 140,
      render: (v: string) => v || <span className="text-gray-500">Chua phan cong</span>,
    },
    {
      title: 'Tham gan nhat',
      dataIndex: 'lastVisitDate',
      key: 'lastVisitDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Dac diem',
      key: 'features',
      width: 160,
      render: (_: unknown, r: Household) => (
        <Space size={2} wrap>
          {r.hasElderlyMember && <Tag color="purple">Nguoi cao tuoi</Tag>}
          {r.hasChildUnder5 && <Tag color="cyan">Tre {'<'} 5t</Tag>}
          {r.hasPregnant && <Tag color="pink">Thai phu</Tag>}
          {r.hasChronicDisease && <Tag color="red">Benh man tinh</Tag>}
        </Space>
      ),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Household) => (
        <div className="flex items-center gap-1">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewHousehold(record)} />
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditHousehold(record)} />
        </div>
      ),
    },
  ];

  const screeningColumns: ColumnsType<NcdScreening> = [
    {
      title: 'Ma SL',
      dataIndex: 'screeningCode',
      key: 'screeningCode',
      width: 110,
    },
    {
      title: 'Ho ten',
      dataIndex: 'patientName',
      key: 'patientName',
      ellipsis: true,
    },
    {
      title: 'Ngay sang loc',
      dataIndex: 'screeningDate',
      key: 'screeningDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'HA (mmHg)',
      key: 'bp',
      width: 110,
      render: (_: unknown, r: NcdScreening) => (
        <span>{r.systolicBP}/{r.diastolicBP}</span>
      ),
    },
    {
      title: 'Phan loai HA',
      dataIndex: 'bpClassification',
      key: 'bpClassification',
      width: 110,
      render: (v: string) => (
        <Tag color={BP_COLORS[v] || 'default'}>{BP_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: 'BMI',
      dataIndex: 'bmi',
      key: 'bmi',
      width: 70,
      render: (v: number) => v?.toFixed(1) ?? '-',
    },
    {
      title: 'PL BMI',
      dataIndex: 'bmiClassification',
      key: 'bmiClassification',
      width: 100,
      render: (v: string) => (
        <Tag color={BMI_COLORS[v] || 'default'}>{BMI_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: 'Nguy co CVD',
      key: 'cvdRisk',
      width: 120,
      render: (_: unknown, r: NcdScreening) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{r.cvdRiskScore}%</span>
          <Tag color={RISK_COLORS[r.cvdRiskLevel] || 'default'}>{RISK_LABELS[r.cvdRiskLevel] || r.cvdRiskLevel}</Tag>
        </div>
      ),
    },
    {
      title: 'Theo doi',
      dataIndex: 'followUpRequired',
      key: 'followUpRequired',
      width: 80,
      align: 'center',
      render: (v: boolean) => v ? <Tag color="warning">Can</Tag> : <Tag>Khong</Tag>,
    },
  ];

  const teamColumns: ColumnsType<CommunityTeam> = [
    {
      title: 'Ma doi',
      dataIndex: 'teamCode',
      key: 'teamCode',
      width: 100,
    },
    {
      title: 'Ten doi',
      dataIndex: 'teamName',
      key: 'teamName',
      ellipsis: true,
    },
    {
      title: 'Doi truong',
      dataIndex: 'leaderName',
      key: 'leaderName',
      width: 150,
    },
    {
      title: 'Phuong/Xa',
      dataIndex: 'wardAssigned',
      key: 'wardAssigned',
      width: 140,
    },
    {
      title: 'Thanh vien',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 90,
      align: 'center',
    },
    {
      title: 'HGD quan ly',
      dataIndex: 'activeHouseholds',
      key: 'activeHouseholds',
      width: 100,
      align: 'center',
    },
    {
      title: 'Do phu',
      dataIndex: 'visitCoverage',
      key: 'visitCoverage',
      width: 150,
      render: (v: number) => (
        <Progress
          percent={v ?? 0}
          size="small"
          status={v >= 80 ? 'success' : v >= 50 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: number) => (
        <Tag color={s === 0 ? 'success' : 'default'}>
          {s === 0 ? 'Hoat dong' : 'Ngung'}
        </Tag>
      ),
    },
  ];

  const filteredHouseholds = keyword
    ? households.filter(h =>
        h.householdCode?.toLowerCase().includes(keyword.toLowerCase()) ||
        h.headName?.toLowerCase().includes(keyword.toLowerCase()) ||
        h.address?.toLowerCase().includes(keyword.toLowerCase())
      )
    : households;

  const filteredScreenings = keyword
    ? screenings.filter(s =>
        s.screeningCode?.toLowerCase().includes(keyword.toLowerCase()) ||
        s.patientName?.toLowerCase().includes(keyword.toLowerCase())
      )
    : screenings;

  const tabItems = [
    {
      key: 'households',
      label: <span><HomeOutlined /> Ho gia dinh</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem ho gia dinh..."
              allowClear
              onSearch={v => setKeyword(v)}
              onChange={e => !e.target.value && setKeyword('')}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateHousehold}>
              Them HGD
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </Space>
          <Table
            columns={householdColumns}
            dataSource={filteredHouseholds}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} ho` }}
            scroll={{ x: 1200 }}
          />
        </div>
      ),
    },
    {
      key: 'ncd-screening',
      label: <span><HeartOutlined /> Sang loc NCD (WHO PEN)</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem..."
              allowClear
              onSearch={v => setKeyword(v)}
              onChange={e => !e.target.value && setKeyword('')}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateScreening}>
              Sang loc moi
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </Space>
          <Table
            columns={screeningColumns}
            dataSource={filteredScreenings}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} sang loc` }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'teams',
      label: <span><TeamOutlined /> Doi CSSKCD</span>,
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Search
              placeholder="Tim kiem doi..."
              allowClear
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
          </Space>
          <Table
            columns={teamColumns}
            dataSource={teams}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `Tong ${t} doi` }}
            scroll={{ x: 950 }}
          />
        </div>
      ),
    },
    {
      key: 'map',
      label: <span><EnvironmentOutlined /> Ban do</span>,
      children: (
        <Alert
          title="Tich hop ban do cong dong se duoc bo sung"
          type="info"
          showIcon
          description="Hien tai tinh nang hien thi ban do cong dong dang duoc phat trien. Se ho tro hien thi vi tri ho gia dinh, vung nguy co va tuyen tham kham."
        />
      ),
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
    <Spin spinning={loading}>
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h4 className="text-lg font-semibold mb-4">Quan ly suc khoe cong dong</h4>
        </motion.div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Ho gia dinh</div><div className="text-2xl font-semibold" style={{ color: '#1890ff' }}><HomeOutlined className="mr-1" />{stats?.totalHouseholds ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Sang loc NCD</div><div className="text-2xl font-semibold" style={{ color: '#52c41a' }}><HeartOutlined className="mr-1" />{stats?.screeningsThisMonth ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Nguy co cao</div><div className="text-2xl font-semibold" style={{ color: '#ff4d4f' }}><WarningOutlined className="mr-1" />{stats?.highRiskHouseholds ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-gray-500 text-sm mb-1">Doi CSSKCD</div><div className="text-2xl font-semibold" style={{ color: '#13c2c2' }}><TeamOutlined className="mr-1" />{stats?.activeTeams ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>

        {/* Household Detail Modal */}
        <Modal
          title="Chi tiet ho gia dinh"
          open={detailModalOpen}
          onCancel={() => setDetailModalOpen(false)}
          footer={null}
          width={700}
          destroyOnHidden
        >
          {selectedHousehold && (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ma HGD">{selectedHousehold.householdCode}</Descriptions.Item>
              <Descriptions.Item label="Chu ho">{selectedHousehold.headName}</Descriptions.Item>
              <Descriptions.Item label="Dia chi" span={2}>{selectedHousehold.address}</Descriptions.Item>
              <Descriptions.Item label="Phuong/Xa">{selectedHousehold.ward}</Descriptions.Item>
              <Descriptions.Item label="Quan/Huyen">{selectedHousehold.district}</Descriptions.Item>
              <Descriptions.Item label="So thanh vien">{selectedHousehold.memberCount}</Descriptions.Item>
              <Descriptions.Item label="Nguy co">
                <Tag color={RISK_COLORS[selectedHousehold.riskLevel]}>
                  {RISK_LABELS[selectedHousehold.riskLevel]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Doi phu trach">{selectedHousehold.assignedTeamName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Tham gan nhat">
                {selectedHousehold.lastVisitDate ? dayjs(selectedHousehold.lastVisitDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Nguoi cao tuoi">{selectedHousehold.hasElderlyMember ? 'Co' : 'Khong'}</Descriptions.Item>
              <Descriptions.Item label="Tre < 5 tuoi">{selectedHousehold.hasChildUnder5 ? 'Co' : 'Khong'}</Descriptions.Item>
              <Descriptions.Item label="Thai phu">{selectedHousehold.hasPregnant ? 'Co' : 'Khong'}</Descriptions.Item>
              <Descriptions.Item label="Benh man tinh">{selectedHousehold.hasChronicDisease ? 'Co' : 'Khong'}</Descriptions.Item>
              <Descriptions.Item label="Ghi chu" span={2}>{selectedHousehold.notes || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Create/Edit Household Modal */}
        <Modal
          title={editingHousehold ? 'Cap nhat ho gia dinh' : 'Them ho gia dinh moi'}
          open={householdModalOpen}
          onOk={handleSaveHousehold}
          onCancel={() => setHouseholdModalOpen(false)}
          confirmLoading={submitting}
          width={700}
          destroyOnHidden
        >
          <Form form={householdForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="headName" label="Ten chu ho" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="phone" label="So dien thoai">
                  <Input />
                </Form.Item>
              </div>
            </div>
            <Form.Item name="address" label="Dia chi" rules={[{ required: true, message: 'Bat buoc' }]}>
              <Input />
            </Form.Item>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="ward" label="Phuong/Xa" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="district" label="Quan/Huyen">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="province" label="Tinh/TP">
                  <Input />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="memberCount" label="So thanh vien">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="riskLevel" label="Muc do nguy co" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Select placeholder="Chon">
                    <Select.Option value="Low">Thap</Select.Option>
                    <Select.Option value="Medium">Trung binh</Select.Option>
                    <Select.Option value="High">Cao</Select.Option>
                    <Select.Option value="VeryHigh">Rat cao</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="assignedTeamId" label="Doi phu trach">
                  <Select placeholder="Chon doi" allowClear>
                    {teams.map(t => (
                      <Select.Option key={t.id} value={t.id}>{t.teamName}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><Form.Item name="hasElderlyMember" valuePropName="checked"><Checkbox>Nguoi cao tuoi</Checkbox></Form.Item></div>
              <div><Form.Item name="hasChildUnder5" valuePropName="checked"><Checkbox>Tre &lt; 5 tuoi</Checkbox></Form.Item></div>
              <div><Form.Item name="hasPregnant" valuePropName="checked"><Checkbox>Thai phu</Checkbox></Form.Item></div>
              <div><Form.Item name="hasChronicDisease" valuePropName="checked"><Checkbox>Benh man tinh</Checkbox></Form.Item></div>
            </div>
            <Form.Item name="notes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* NCD Screening Modal */}
        <Modal
          title="Sang loc benh khong lay nhiem (WHO PEN)"
          open={screeningModalOpen}
          onOk={handleSaveScreening}
          onCancel={() => setScreeningModalOpen(false)}
          confirmLoading={submitting}
          width={800}
          destroyOnHidden
        >
          <Form form={screeningForm} layout="vertical">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="patientName" label="Ho ten" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <Input />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="dateOfBirth" label="Ngay sinh">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="screeningDate" label="Ngay sang loc" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Huyet ap</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="systolicBP" label="HA tam thu (mmHg)" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <InputNumber min={60} max={300} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="diastolicBP" label="HA tam truong (mmHg)" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <InputNumber min={30} max={200} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="bpClassification" label="Phan loai">
                  <Select placeholder="Chon">
                    <Select.Option value="Normal">Binh thuong</Select.Option>
                    <Select.Option value="Elevated">Tang nhe</Select.Option>
                    <Select.Option value="Stage1">THA do 1</Select.Option>
                    <Select.Option value="Stage2">THA do 2</Select.Option>
                    <Select.Option value="Crisis">Con THA</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Duong huyet</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="fastingGlucose" label="Glucose luc doi (mmol/L)">
                  <InputNumber min={0} max={50} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="randomGlucose" label="Glucose bat ky (mmol/L)">
                  <InputNumber min={0} max={50} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="hba1c" label="HbA1c (%)">
                  <InputNumber min={0} max={20} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Chi so co the</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="height" label="Chieu cao (cm)" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <InputNumber min={50} max={250} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="weight" label="Can nang (kg)" rules={[{ required: true, message: 'Bat buoc' }]}>
                  <InputNumber min={1} max={300} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </div>
              <div>
                <Form.Item label="BMI (tu tinh)">
                  <span className="text-gray-500">Se tinh tu dong khi luu</span>
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Yeu to nguy co</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="isSmoker" valuePropName="checked">
                  <Checkbox>Hut thuoc</Checkbox>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="familyHistoryCVD" valuePropName="checked">
                  <Checkbox>Tien su gia dinh CVD</Checkbox>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="alcoholUse" label="Ruou bia">
                  <Select placeholder="Chon">
                    <Select.Option value="None">Khong</Select.Option>
                    <Select.Option value="Occasional">Thinh thoang</Select.Option>
                    <Select.Option value="Regular">Thuong xuyen</Select.Option>
                    <Select.Option value="Heavy">Nhieu</Select.Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="physicalActivity" label="Van dong">
                  <Select placeholder="Chon">
                    <Select.Option value="Active">Tich cuc</Select.Option>
                    <Select.Option value="Moderate">Vua phai</Select.Option>
                    <Select.Option value="Sedentary">It van dong</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-2 text-center text-sm text-gray-500">Theo doi</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Form.Item name="followUpRequired" valuePropName="checked">
                  <Checkbox>Can theo doi</Checkbox>
                </Form.Item>
              </div>
              <div>
                <Form.Item name="followUpDate" label="Ngay hen">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </div>
              <div>
                <Form.Item name="referralRequired" valuePropName="checked">
                  <Checkbox>Can chuyen tuyen</Checkbox>
                </Form.Item>
              </div>
            </div>
            <Form.Item name="followUpNotes" label="Ghi chu">
              <TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
    </div>
  );
};

export default CommunityHealth;
