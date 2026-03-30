import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
} from 'antd';
import {
  CloudOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  WarningOutlined, CheckCircleOutlined, ExperimentOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as envApi from '../api/environmentalHealth';
import type { WasteRecord, MonitoringRecord, WasteStats, MonitoringStats, BiosafetyStatus } from '../api/environmentalHealth';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const WASTE_TYPE_LABELS: Record<string, string> = {
  infectious: 'Lây nhiễm', sharp: 'Sắc nhọn', pharmaceutical: 'Dược phẩm',
  chemical: 'Hóa chất', radioactive: 'Phóng xạ', general: 'Sinh hoạt',
};
const WASTE_TYPE_COLORS: Record<string, string> = {
  infectious: 'red', sharp: 'orange', pharmaceutical: 'purple',
  chemical: 'volcano', radioactive: 'magenta', general: 'default',
};
const MONITORING_TYPE_LABELS: Record<string, string> = {
  air: 'Không khí', water: 'Nước', surface: 'Bề mặt', noise: 'Tiếng ồn', radiation: 'Bức xạ',
};

const EnvironmentalHealth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [monitoringRecords, setMonitoringRecords] = useState<MonitoringRecord[]>([]);
  const [wasteStats, setWasteStats] = useState<WasteStats>({ totalCollectedThisMonth: 0, nonCompliantItems: 0, infectiousWasteKg: 0, generalWasteKg: 0 });
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats>({ totalMonitoringCount: 0, nonCompliantCount: 0 });
  const [biosafetyStatus, setBiosafetyStatus] = useState<BiosafetyStatus>({ level: 0, isCompliant: true });
  const [mainTab, setMainTab] = useState('waste');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [isCreateWasteOpen, setIsCreateWasteOpen] = useState(false);
  const [isCreateMonitoringOpen, setIsCreateMonitoringOpen] = useState(false);
  const [wasteForm] = Form.useForm();
  const [monitoringForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        keyword: keyword || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        envApi.searchWasteRecords(params),
        envApi.searchMonitoring(params),
        envApi.getWasteStats(),
        envApi.getMonitoringStats(),
        envApi.getBiosafetyStatus(),
      ]);
      if (results[0].status === 'fulfilled') setWasteRecords(results[0].value);
      if (results[1].status === 'fulfilled') setMonitoringRecords(results[1].value);
      if (results[2].status === 'fulfilled') setWasteStats(results[2].value);
      if (results[3].status === 'fulfilled') setMonitoringStats(results[3].value);
      if (results[4].status === 'fulfilled') setBiosafetyStatus(results[4].value);
    } catch {
      message.warning('Không thể tải dữ liệu môi trường y tế');
    } finally {
      setLoading(false);
    }
  }, [keyword, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateWaste = async () => {
    try {
      const values = await wasteForm.validateFields();
      setSaving(true);
      await envApi.createWasteRecord(values);
      message.success('Đã tạo phiếu thu gom rác thải');
      setIsCreateWasteOpen(false);
      wasteForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo phiếu');
    } finally { setSaving(false); }
  };

  const handleCreateMonitoring = async () => {
    try {
      const values = await monitoringForm.validateFields();
      setSaving(true);
      await envApi.createMonitoring(values);
      message.success('Đã tạo phiếu giám sát');
      setIsCreateMonitoringOpen(false);
      monitoringForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo phiếu');
    } finally { setSaving(false); }
  };

  const wasteColumns: ColumnsType<WasteRecord> = [
    { title: 'Mã phiếu', dataIndex: 'recordCode', width: 110 },
    {
      title: 'Ngày', dataIndex: 'recordDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loại rác', dataIndex: 'wasteType', width: 120,
      render: (t: string) => <Tag color={WASTE_TYPE_COLORS[t]}>{WASTE_TYPE_LABELS[t] || t}</Tag>,
    },
    { title: 'Khối lượng', key: 'qty', width: 110, render: (_: unknown, r: WasteRecord) => `${r.quantity} ${r.unit}` },
    { title: 'Nguồn', dataIndex: 'source', width: 150, ellipsis: true },
    { title: 'PP xử lý', dataIndex: 'disposalMethod', width: 140, ellipsis: true },
    { title: 'Người XL', dataIndex: 'handlerName', width: 130 },
    {
      title: 'Tuân thủ', dataIndex: 'isCompliant', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Đạt' : 'Không đạt'}</Tag>,
    },
  ];

  const monitoringColumns: ColumnsType<MonitoringRecord> = [
    { title: 'Mã phiếu', dataIndex: 'recordCode', width: 110 },
    {
      title: 'Ngày', dataIndex: 'monitoringDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Loại', dataIndex: 'monitoringType', width: 110,
      render: (t: string) => MONITORING_TYPE_LABELS[t] || t,
    },
    { title: 'Vị trí', dataIndex: 'location', width: 150, ellipsis: true },
    { title: 'Thông số', dataIndex: 'parameter', width: 130 },
    { title: 'Giá trị', key: 'val', width: 100, render: (_: unknown, r: MonitoringRecord) => `${r.value} ${r.unit}` },
    { title: 'Giới hạn', key: 'limit', width: 100, render: (_: unknown, r: MonitoringRecord) => `${r.standardLimit} ${r.unit}` },
    {
      title: 'Tuân thủ', dataIndex: 'isCompliant', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Đạt' : 'Không đạt'}</Tag>,
    },
    { title: 'Người đo', dataIndex: 'measuredBy', width: 130 },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><CloudOutlined style={{ marginRight: 8 }} />Quản lý môi trường y tế</Title></Col>
            <Col>
              <Space>
                {mainTab === 'waste' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateWasteOpen(true)}>Tạo phiếu rác thải</Button>}
                {mainTab === 'monitoring' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateMonitoringOpen(true)}>Tạo phiếu GS</Button>}
                <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={fetchData} allowClear prefix={<SearchOutlined />} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Thu gom tháng (kg)" value={wasteStats.totalCollectedThisMonth} prefix={<DeleteOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Không tuân thủ" value={wasteStats.nonCompliantItems} prefix={<WarningOutlined />} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Giám sát (lượt)" value={monitoringStats.totalMonitoringCount} prefix={<ExperimentOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="An toàn sinh học" value={biosafetyStatus.isCompliant ? 'Đạt' : 'Chưa đạt'}
            prefix={biosafetyStatus.isCompliant ? <CheckCircleOutlined /> : <WarningOutlined />}
            styles={{ content: { color: biosafetyStatus.isCompliant ? '#52c41a' : '#ff4d4f' } }} /></Card></Col>
        </Row>

        <Card>
          <Tabs activeKey={mainTab} onChange={setMainTab} items={[
            { key: 'waste', label: <span><DeleteOutlined /> Rác thải y tế ({wasteRecords.length})</span> },
            { key: 'monitoring', label: <span><ExperimentOutlined /> Giám sát môi trường ({monitoringRecords.length})</span> },
          ]} />
          {mainTab === 'waste' && (
            <Table dataSource={wasteRecords} columns={wasteColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1100 }} />
          )}
          {mainTab === 'monitoring' && (
            <Table dataSource={monitoringRecords} columns={monitoringColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1200 }} />
          )}
        </Card>

        <Modal title="Tạo phiếu thu gom rác thải" open={isCreateWasteOpen} onCancel={() => setIsCreateWasteOpen(false)}
          onOk={handleCreateWaste} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={wasteForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="wasteType" label="Loại rác" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                <Select options={Object.entries(WASTE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={6}><Form.Item name="quantity" label="Khối lượng" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
                <InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="unit" label="Đơn vị" initialValue="kg">
                <Select options={[{ value: 'kg', label: 'kg' }, { value: 'lít', label: 'Lít' }, { value: 'thùng', label: 'Thùng' }]} /></Form.Item></Col>
              <Col span={12}><Form.Item name="source" label="Nguồn" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input placeholder="Khoa/phòng" /></Form.Item></Col>
              <Col span={12}><Form.Item name="disposalMethod" label="PP xử lý"><Input placeholder="Đốt, hấp, chôn..." /></Form.Item></Col>
              <Col span={12}><Form.Item name="handlerName" label="Người xử lý"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Tạo phiếu giám sát môi trường" open={isCreateMonitoringOpen} onCancel={() => setIsCreateMonitoringOpen(false)}
          onOk={handleCreateMonitoring} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={monitoringForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="monitoringType" label="Loại giám sát" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                <Select options={Object.entries(MONITORING_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="location" label="Vị trí" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="parameter" label="Thông số"><Input placeholder="CO2, PM2.5, pH..." /></Form.Item></Col>
              <Col span={6}><Form.Item name="value" label="Giá trị"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="unit" label="Đơn vị"><Input placeholder="ppm, mg/l" /></Form.Item></Col>
              <Col span={12}><Form.Item name="standardLimit" label="Giới hạn cho phép"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="measuredBy" label="Người đo"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default EnvironmentalHealth;
