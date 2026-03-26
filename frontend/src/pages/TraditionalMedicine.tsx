import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
  Descriptions, Drawer,
} from 'antd';
import {
  ExperimentOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, CheckCircleOutlined, ClockCircleOutlined,
  MedicineBoxOutlined, CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import * as tmApi from '../api/traditionalMedicine';
import type { TraditionalTreatment, TraditionalMedicineStats, HerbalPrescription } from '../api/traditionalMedicine';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const TREATMENT_TYPE_LABELS: Record<string, string> = {
  acupuncture: 'Châm cứu',
  herbal: 'Thuốc thang',
  massage: 'Xoa bóp',
  cupping: 'Giác hơi',
  moxibustion: 'Cứu ngải',
  combined: 'Kết hợp',
};

const TREATMENT_TYPE_COLORS: Record<string, string> = {
  acupuncture: 'green',
  herbal: 'orange',
  massage: 'blue',
  cupping: 'purple',
  moxibustion: 'red',
  combined: 'cyan',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Đang điều trị',
  1: 'Hoàn thành',
  2: 'Hủy',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'processing',
  1: 'success',
  2: 'default',
};

const TraditionalMedicine: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [treatments, setTreatments] = useState<TraditionalTreatment[]>([]);
  const [stats, setStats] = useState<TraditionalMedicineStats>({ activeTreatments: 0, completedThisMonth: 0, acupunctureSessions: 0, herbalPrescriptions: 0 });
  const [activeTab, setActiveTab] = useState('active');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedTreatment, setSelectedTreatment] = useState<TraditionalTreatment | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [herbalPrescriptions, setHerbalPrescriptions] = useState<HerbalPrescription[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHerbalModalOpen, setIsHerbalModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [herbalForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        active: 0, completed: 1, all: undefined,
      };
      const params = {
        keyword: keyword || undefined,
        status: statusMap[activeTab],
        treatmentType: typeFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        tmApi.searchTreatments(params),
        tmApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setTreatments(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu Y học cổ truyền');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (record: TraditionalTreatment) => {
    setSelectedTreatment(record);
    setIsDetailDrawerOpen(true);
    try {
      const rxList = await tmApi.getHerbalPrescriptions(record.id);
      setHerbalPrescriptions(rxList);
    } catch {
      setHerbalPrescriptions([]);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await tmApi.completeTreatment(id);
      message.success('Đã hoàn thành liệu trình');
      fetchData();
    } catch {
      message.warning('Không thể hoàn thành');
    }
  };

  const handleCreateTreatment = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await tmApi.createTreatment(values);
      message.success('Đã tạo liệu trình');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo liệu trình');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateHerbalPrescription = async () => {
    if (!selectedTreatment) return;
    try {
      const values = await herbalForm.validateFields();
      setSaving(true);
      await tmApi.createHerbalPrescription(selectedTreatment.id, values);
      message.success('Đã tạo đơn thuốc thang');
      setIsHerbalModalOpen(false);
      herbalForm.resetFields();
      const rxList = await tmApi.getHerbalPrescriptions(selectedTreatment.id);
      setHerbalPrescriptions(rxList);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo đơn thuốc thang');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<TraditionalTreatment> = [
    { title: 'Mã LT', dataIndex: 'treatmentCode', key: 'treatmentCode', width: 120 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', width: 100 },
    {
      title: 'Loại điều trị', dataIndex: 'treatmentType', key: 'treatmentType', width: 120,
      render: (t: string) => <Tag color={TREATMENT_TYPE_COLORS[t]}>{TREATMENT_TYPE_LABELS[t] || t}</Tag>,
    },
    { title: 'Chẩn đoán', dataIndex: 'diagnosis', key: 'diagnosis', width: 180, ellipsis: true },
    {
      title: 'Ngày bắt đầu', dataIndex: 'startDate', key: 'startDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Lần/Tổng', key: 'sessions', width: 90,
      render: (_: unknown, r: TraditionalTreatment) => `${r.completedSessions || 0}/${r.totalSessions || 0}`,
    },
    { title: 'BS điều trị', dataIndex: 'doctorName', key: 'doctorName', width: 140 },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 180,
      render: (_: unknown, record: TraditionalTreatment) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Xem</Button>
          {record.status === 0 && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleComplete(record.id)}>Xong</Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredTreatments = treatments.filter((t) => {
    if (activeTab === 'active') return t.status === 0;
    if (activeTab === 'completed') return t.status === 1;
    return true;
  });

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
            <Col><Title level={4} style={{ margin: 0 }}><ExperimentOutlined style={{ marginRight: 8 }} />Y học cổ truyền</Title></Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Tạo liệu trình</Button>
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
            <Col xs={12} sm={8} md={4}>
              <Select placeholder="Loại điều trị" allowClear style={{ width: '100%' }} value={typeFilter} onChange={setTypeFilter}
                options={Object.entries(TREATMENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Đang điều trị" value={stats.activeTreatments} prefix={<MedicineBoxOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Hoàn thành tháng" value={stats.completedThisMonth} prefix={<CalendarOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Lượt châm cứu" value={stats.acupunctureSessions} prefix={<ExperimentOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Đơn thuốc thang" value={stats.herbalPrescriptions} prefix={<MedicineBoxOutlined />} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
        </Row>
        </motion.div>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'active', label: <span><ClockCircleOutlined /> Đang ĐT ({treatments.filter((t) => t.status === 0).length})</span> },
            { key: 'completed', label: <span><CheckCircleOutlined /> Hoàn thành ({treatments.filter((t) => t.status === 1).length})</span> },
            { key: 'all', label: `Tất cả (${treatments.length})` },
          ]} />
          <Table dataSource={filteredTreatments} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1300 }}
            onRow={(record) => ({ onDoubleClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })} />
        </Card>

        <Drawer title="Chi tiết liệu trình YHCT" open={isDetailDrawerOpen} onClose={() => setIsDetailDrawerOpen(false)} width={600}>
          {selectedTreatment && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã LT">{selectedTreatment.treatmentCode}</Descriptions.Item>
                <Descriptions.Item label="Loại"><Tag color={TREATMENT_TYPE_COLORS[selectedTreatment.treatmentType]}>{TREATMENT_TYPE_LABELS[selectedTreatment.treatmentType]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Bệnh nhân">{selectedTreatment.patientName}</Descriptions.Item>
                <Descriptions.Item label="BS điều trị">{selectedTreatment.doctorName}</Descriptions.Item>
                <Descriptions.Item label="Chẩn đoán" span={2}>{selectedTreatment.diagnosis}</Descriptions.Item>
                <Descriptions.Item label="Bắt đầu">{selectedTreatment.startDate ? dayjs(selectedTreatment.startDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                <Descriptions.Item label="Tiến độ">{`${selectedTreatment.completedSessions || 0}/${selectedTreatment.totalSessions || 0} lần`}</Descriptions.Item>
              </Descriptions>
              <Row justify="space-between" align="middle" style={{ margin: '16px 0 8px' }}>
                <Col><Title level={5} style={{ margin: 0 }}>Đơn thuốc thang</Title></Col>
                <Col><Button size="small" icon={<PlusOutlined />} onClick={() => { herbalForm.resetFields(); setIsHerbalModalOpen(true); }}>Thêm đơn</Button></Col>
              </Row>
              <Table dataSource={herbalPrescriptions} rowKey="id" size="small" pagination={false}
                columns={[
                  { title: 'Mã đơn', dataIndex: 'prescriptionCode', width: 100 },
                  { title: 'Ngày', dataIndex: 'prescriptionDate', width: 100, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
                  { title: 'Thời gian', key: 'dur', width: 80, render: (_: unknown, r: HerbalPrescription) => `${r.duration} ${r.durationUnit || 'ngày'}` },
                  { title: 'Cách pha chế', dataIndex: 'preparation', ellipsis: true },
                ]} />
            </>
          )}
        </Drawer>

        <Modal title="Tạo liệu trình YHCT" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreateTreatment} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="patientName" label="Bệnh nhân" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientCode" label="Mã BN"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="treatmentType" label="Loại điều trị" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                <Select options={Object.entries(TREATMENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="totalSessions" label="Tổng số lần"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={24}><Form.Item name="diagnosis" label="Chẩn đoán" rules={[{ required: true, message: 'Vui lòng nhập' }]}><TextArea rows={2} /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Tạo đơn thuốc thang" open={isHerbalModalOpen} onCancel={() => setIsHerbalModalOpen(false)}
          onOk={handleCreateHerbalPrescription} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={herbalForm} layout="vertical">
            <Row gutter={16}>
              <Col span={24}><Form.Item name="ingredients" label="Thành phần (JSON)" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
                <TextArea rows={4} placeholder='[{"name": "Hoàng kỳ", "quantity": "12g"}, ...]' /></Form.Item></Col>
              <Col span={12}><Form.Item name="dosage" label="Liều dùng"><Input placeholder="1 thang/ngày" /></Form.Item></Col>
              <Col span={6}><Form.Item name="duration" label="Thời gian"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="durationUnit" label="Đơn vị" initialValue="ngày">
                <Select options={[{ value: 'ngày', label: 'Ngày' }, { value: 'tuần', label: 'Tuần' }]} /></Form.Item></Col>
              <Col span={24}><Form.Item name="preparation" label="Cách pha chế"><TextArea rows={2} placeholder="Sắc với 3 bát nước..." /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default TraditionalMedicine;
