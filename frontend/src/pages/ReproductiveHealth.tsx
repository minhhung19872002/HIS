import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
  Descriptions, Alert,
} from 'antd';
import {
  HeartOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, EditOutlined, WarningOutlined, CalendarOutlined,
  TeamOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import * as rhApi from '../api/reproductiveHealth';
import type { PrenatalRecord, FamilyPlanningRecord, ReproductiveHealthStats } from '../api/reproductiveHealth';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const RISK_LABELS: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', very_high: 'Rất cao' };
const RISK_COLORS: Record<string, string> = { low: 'green', medium: 'gold', high: 'orange', very_high: 'red' };

const FP_METHOD_LABELS: Record<string, string> = {
  iud: 'Vòng tránh thai', pill: 'Thuốc tránh thai', injection: 'Thuốc tiêm', implant: 'Que cấy',
  condom: 'Bao cao su', sterilization: 'Triệt sản', natural: 'Tự nhiên', other: 'Khác',
};

const FP_METHOD_COLORS: Record<string, string> = {
  iud: 'blue', pill: 'green', injection: 'purple', implant: 'cyan',
  condom: 'lime', sterilization: 'red', natural: 'gold', other: 'default',
};

const STATUS_LABELS: Record<number, string> = { 0: 'Đang theo dõi', 1: 'Đã sinh', 2: 'Hoàn thành', 3: 'Hủy' };
const STATUS_COLORS: Record<number, string> = { 0: 'processing', 1: 'success', 2: 'blue', 3: 'default' };

const ReproductiveHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [prenatalRecords, setPrenatalRecords] = useState<PrenatalRecord[]>([]);
  const [fpRecords, setFpRecords] = useState<FamilyPlanningRecord[]>([]);
  const [highRiskList, setHighRiskList] = useState<PrenatalRecord[]>([]);
  const [stats, setStats] = useState<ReproductiveHealthStats>({ activePregnancies: 0, highRiskCount: 0, familyPlanningActive: 0, deliveriesThisMonth: 0 });
  const [mainTab, setMainTab] = useState('prenatal');
  const [keyword, setKeyword] = useState('');
  const [riskFilter, setRiskFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [isCreatePrenatalOpen, setIsCreatePrenatalOpen] = useState(false);
  const [isCreateFpOpen, setIsCreateFpOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPrenatal, setSelectedPrenatal] = useState<PrenatalRecord | null>(null);
  const [prenatalForm] = Form.useForm();
  const [fpForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        keyword: keyword || undefined,
        riskLevel: riskFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        rhApi.searchPrenatal(params),
        rhApi.searchFamilyPlanning({ keyword: keyword || undefined }),
        rhApi.getStats(),
        rhApi.getHighRiskPregnancies(),
      ]);
      if (results[0].status === 'fulfilled') setPrenatalRecords(results[0].value);
      if (results[1].status === 'fulfilled') setFpRecords(results[1].value);
      if (results[2].status === 'fulfilled') setStats(results[2].value);
      if (results[3].status === 'fulfilled') setHighRiskList(results[3].value);
    } catch {
      message.warning('Không thể tải dữ liệu sức khỏe sinh sản');
    } finally {
      setLoading(false);
    }
  }, [keyword, riskFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreatePrenatal = async () => {
    try {
      const values = await prenatalForm.validateFields();
      setSaving(true);
      await rhApi.createPrenatal(values);
      message.success('Đã tạo hồ sơ quản thai');
      setIsCreatePrenatalOpen(false);
      prenatalForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ');
    } finally { setSaving(false); }
  };

  const handleCreateFp = async () => {
    try {
      const values = await fpForm.validateFields();
      setSaving(true);
      await rhApi.createFamilyPlanning(values);
      message.success('Đã tạo hồ sơ KHHGĐ');
      setIsCreateFpOpen(false);
      fpForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo hồ sơ');
    } finally { setSaving(false); }
  };

  const prenatalColumns: ColumnsType<PrenatalRecord> = [
    { title: 'Mã HS', dataIndex: 'recordCode', width: 110 },
    { title: 'Thai phụ', dataIndex: 'patientName', width: 160 },
    { title: 'Tuổi thai (tuần)', dataIndex: 'gestationalWeeks', width: 120 },
    {
      title: 'Nguy cơ', dataIndex: 'riskLevel', width: 110,
      render: (r: string) => <Tag color={RISK_COLORS[r]}>{RISK_LABELS[r] || r}</Tag>,
    },
    { title: 'PARA', key: 'para', width: 80, render: (_: unknown, r: PrenatalRecord) => `G${r.gravida}P${r.para}` },
    {
      title: 'Dự sinh', dataIndex: 'expectedDeliveryDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    { title: 'Số lần khám', dataIndex: 'visitCount', width: 100 },
    { title: 'BS theo dõi', dataIndex: 'doctorName', width: 140 },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 120,
      render: (_: unknown, record: PrenatalRecord) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedPrenatal(record); setIsDetailOpen(true); }}>Xem</Button>
        </Space>
      ),
    },
  ];

  const fpColumns: ColumnsType<FamilyPlanningRecord> = [
    { title: 'Mã HS', dataIndex: 'recordCode', width: 110 },
    { title: 'Họ tên', dataIndex: 'patientName', width: 160 },
    {
      title: 'Biện pháp', dataIndex: 'method', width: 140,
      render: (m: string) => <Tag color={FP_METHOD_COLORS[m]}>{FP_METHOD_LABELS[m] || m}</Tag>,
    },
    {
      title: 'Ngày bắt đầu', dataIndex: 'startDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Lần khám tiếp', dataIndex: 'nextVisitDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    { title: 'BS theo dõi', dataIndex: 'doctorName', width: 140 },
    { title: 'Tác dụng phụ', dataIndex: 'sideEffects', width: 160, ellipsis: true },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><HeartOutlined style={{ marginRight: 8 }} />Sức khỏe sinh sản</Title></Col>
            <Col>
              <Space>
                {mainTab === 'prenatal' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreatePrenatalOpen(true)}>Tạo hồ sơ quản thai</Button>}
                {mainTab === 'fp' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateFpOpen(true)}>Tạo hồ sơ KHHGĐ</Button>}
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
              </Space>
            </Col>
          </Row>
        </Card>
        </motion.div>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={fetchData} allowClear prefix={<SearchOutlined />} />
            </Col>
            {mainTab === 'prenatal' && (
              <Col xs={12} sm={8} md={4}>
                <Select placeholder="Mức nguy cơ" allowClear style={{ width: '100%' }} value={riskFilter} onChange={setRiskFilter}
                  options={Object.entries(RISK_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Col>
            )}
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        {highRiskList.length > 0 && (
          <Alert type="warning" showIcon icon={<WarningOutlined />}
            title={`${highRiskList.length} thai phụ nguy cơ cao cần theo dõi đặc biệt`}
            style={{ marginBottom: 16 }} closable />
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Thai đang theo dõi" value={stats.activePregnancies} prefix={<HeartOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Nguy cơ cao" value={stats.highRiskCount} prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="KHHGĐ đang dùng" value={stats.familyPlanningActive} prefix={<TeamOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Sinh trong tháng" value={stats.deliveriesThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
        </Row>
        </motion.div>

        <Card>
          <Tabs activeKey={mainTab} onChange={setMainTab} items={[
            { key: 'prenatal', label: <span><HeartOutlined /> Quản thai ({prenatalRecords.length})</span> },
            { key: 'fp', label: <span><TeamOutlined /> KHHGĐ ({fpRecords.length})</span> },
          ]} />
          {mainTab === 'prenatal' && (
            <Table dataSource={prenatalRecords} columns={prenatalColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1300 }} />
          )}
          {mainTab === 'fp' && (
            <Table dataSource={fpRecords} columns={fpColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1000 }} />
          )}
        </Card>

        <Modal title="Chi tiết hồ sơ quản thai" open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null} width={600}>
          {selectedPrenatal && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Mã HS">{selectedPrenatal.recordCode}</Descriptions.Item>
              <Descriptions.Item label="Thai phụ">{selectedPrenatal.patientName}</Descriptions.Item>
              <Descriptions.Item label="Tuổi thai">{selectedPrenatal.gestationalWeeks} tuần</Descriptions.Item>
              <Descriptions.Item label="Nguy cơ"><Tag color={RISK_COLORS[selectedPrenatal.riskLevel]}>{RISK_LABELS[selectedPrenatal.riskLevel]}</Tag></Descriptions.Item>
              <Descriptions.Item label="PARA">G{selectedPrenatal.gravida}P{selectedPrenatal.para}</Descriptions.Item>
              <Descriptions.Item label="Nhóm máu">{selectedPrenatal.bloodType || '-'}</Descriptions.Item>
              <Descriptions.Item label="Dự sinh">{selectedPrenatal.expectedDeliveryDate ? dayjs(selectedPrenatal.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Số lần khám">{selectedPrenatal.visitCount}</Descriptions.Item>
              <Descriptions.Item label="BS theo dõi">{selectedPrenatal.doctorName}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={STATUS_COLORS[selectedPrenatal.status]}>{STATUS_LABELS[selectedPrenatal.status]}</Tag></Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        <Modal title="Tạo hồ sơ quản thai" open={isCreatePrenatalOpen} onCancel={() => setIsCreatePrenatalOpen(false)}
          onOk={handleCreatePrenatal} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={prenatalForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="patientName" label="Họ tên thai phụ" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientCode" label="Mã BN"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="gestationalWeeks" label="Tuổi thai (tuần)"><InputNumber min={1} max={42} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="gravida" label="Gravida"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="para" label="Para"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="riskLevel" label="Mức nguy cơ">
                <Select options={Object.entries(RISK_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="bloodType" label="Nhóm máu">
                <Select options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => ({ value: b, label: b }))} /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Tạo hồ sơ KHHGĐ" open={isCreateFpOpen} onCancel={() => setIsCreateFpOpen(false)}
          onOk={handleCreateFp} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={500} destroyOnHidden>
          <Form form={fpForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="patientName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientCode" label="Mã BN"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="method" label="Biện pháp" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                <Select options={Object.entries(FP_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default ReproductiveHealth;
