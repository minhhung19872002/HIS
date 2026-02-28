import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  DatePicker, Tag, Tabs, message, Spin, Statistic, Row, Col, Badge, Tooltip
} from 'antd';
import {
  ExperimentOutlined, PlusOutlined, ReloadOutlined, WarningOutlined,
  CheckCircleOutlined, LineChartOutlined, FileTextOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import type { QCLot, QCResult, LeveyJenningsData, QCReport } from '../api/labQC';
import * as labQCApi from '../api/labQC';

const { RangePicker } = DatePicker;

const LabQC: React.FC = () => {
  const [activeTab, setActiveTab] = useState('lots');
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState<QCLot[]>([]);
  const [results, setResults] = useState<QCResult[]>([]);
  const [reports, setReports] = useState<QCReport[]>([]);
  const [ljData, setLjData] = useState<LeveyJenningsData | null>(null);
  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<QCLot | null>(null);
  const [lotForm] = Form.useForm();
  const [runForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lotsRes, resultsRes, reportsRes] = await Promise.allSettled([
        labQCApi.getQCLots(),
        labQCApi.getQCResults(),
        labQCApi.getQCReport(),
      ]);
      if (lotsRes.status === 'fulfilled') setLots(Array.isArray(lotsRes.value) ? lotsRes.value : []);
      if (resultsRes.status === 'fulfilled') setResults(Array.isArray(resultsRes.value) ? resultsRes.value : []);
      if (reportsRes.status === 'fulfilled') setReports(Array.isArray(reportsRes.value) ? reportsRes.value : []);
    } catch {
      message.warning('Không thể tải dữ liệu QC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateLot = async () => {
    try {
      const values = await lotForm.validateFields();
      values.expiryDate = values.expiryDate?.format('YYYY-MM-DD');
      await labQCApi.createQCLot(values);
      message.success('Tạo lô QC thành công');
      setLotModalOpen(false);
      lotForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleRunQC = async () => {
    try {
      const values = await runForm.validateFields();
      await labQCApi.runQC(values);
      message.success('Chạy QC thành công');
      setRunModalOpen(false);
      runForm.resetFields();
      fetchData();
    } catch {
      message.warning('Vui lòng điền đầy đủ thông tin');
    }
  };

  const showLeveyJennings = async (lot: QCLot) => {
    try {
      const data = await labQCApi.getLeveyJenningsData({ testCode: lot.testCode, level: lot.level });
      setLjData(data || {
        testCode: lot.testCode, testName: lot.testName, level: lot.level,
        mean: lot.targetMean, sd: lot.targetSD, unit: lot.unit,
        points: results.filter(r => r.lotId === lot.id).map(r => ({
          date: r.runDate, value: r.value, zScore: r.zScore, violation: r.westgardRule,
        })),
      });
      setChartModalOpen(true);
    } catch {
      // Fallback to local data
      setLjData({
        testCode: lot.testCode, testName: lot.testName, level: lot.level,
        mean: lot.targetMean, sd: lot.targetSD, unit: lot.unit,
        points: results.filter(r => r.lotId === lot.id).map(r => ({
          date: r.runDate, value: r.value, zScore: r.zScore, violation: r.westgardRule,
        })),
      });
      setChartModalOpen(true);
    }
  };

  const lotColumns = [
    { title: 'Số lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 120 },
    { title: 'XN', dataIndex: 'testName', key: 'testName' },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 70, render: (v: number) => <Tag color={v === 1 ? 'blue' : v === 2 ? 'green' : 'orange'}>L{v}</Tag> },
    { title: 'Hãng SX', dataIndex: 'manufacturer', key: 'manufacturer', width: 130 },
    { title: 'Mean', dataIndex: 'targetMean', key: 'targetMean', width: 80 },
    { title: 'SD', dataIndex: 'targetSD', key: 'targetSD', width: 70 },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 70 },
    { title: 'Hạn dùng', dataIndex: 'expiryDate', key: 'expiryDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    {
      title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 90,
      render: (v: boolean) => v ? <Tag color="green">Đang dùng</Tag> : <Tag color="default">Ngừng</Tag>,
    },
    {
      title: 'Thao tác', key: 'action', width: 150,
      render: (_: unknown, record: QCLot) => (
        <Space>
          <Tooltip title="Levey-Jennings"><Button size="small" icon={<LineChartOutlined />} onClick={() => showLeveyJennings(record)} /></Tooltip>
          <Tooltip title="Chạy QC"><Button size="small" type="primary" icon={<ExperimentOutlined />} onClick={() => { setSelectedLot(record); runForm.setFieldsValue({ lotId: record.id }); setRunModalOpen(true); }} /></Tooltip>
        </Space>
      ),
    },
  ];

  const resultColumns = [
    { title: 'Ngày chạy', dataIndex: 'runDate', key: 'runDate', width: 140, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Số lô', dataIndex: 'lotNumber', key: 'lotNumber', width: 100 },
    { title: 'XN', dataIndex: 'testName', key: 'testName' },
    { title: 'Level', dataIndex: 'level', key: 'level', width: 60, render: (v: number) => `L${v}` },
    { title: 'Giá trị', dataIndex: 'value', key: 'value', width: 80 },
    { title: 'Mean', dataIndex: 'mean', key: 'mean', width: 70 },
    { title: 'SD', dataIndex: 'sd', key: 'sd', width: 60 },
    { title: 'Z-Score', dataIndex: 'zScore', key: 'zScore', width: 80, render: (v: number) => <span style={{ color: Math.abs(v) > 2 ? '#f5222d' : Math.abs(v) > 1 ? '#faad14' : '#52c41a' }}>{v?.toFixed(2)}</span> },
    {
      title: 'Vi phạm', dataIndex: 'westgardRule', key: 'westgardRule', width: 100,
      render: (v: string, r: QCResult) => r.isViolation ? <Tag color="red">{v || 'Vi phạm'}</Tag> : <Tag color="green">OK</Tag>,
    },
    { title: 'Máy', dataIndex: 'analyzerName', key: 'analyzerName', width: 120 },
    { title: 'Người chạy', dataIndex: 'operatorName', key: 'operatorName', width: 120 },
  ];

  const reportColumns = [
    { title: 'Xét nghiệm', dataIndex: 'testName', key: 'testName' },
    { title: 'Tổng lần chạy', dataIndex: 'totalRuns', key: 'totalRuns', width: 100 },
    { title: 'Vi phạm', dataIndex: 'violations', key: 'violations', width: 80, render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag> },
    { title: 'Tỉ lệ VP', dataIndex: 'violationRate', key: 'violationRate', width: 90, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: 'Lần chạy cuối', dataIndex: 'lastRunDate', key: 'lastRunDate', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
    {
      title: 'Tình trạng', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => v === 'good' ? <Tag color="green">Tốt</Tag> : v === 'warning' ? <Tag color="orange">Cảnh báo</Tag> : <Tag color="red">Lỗi</Tag>,
    },
  ];

  const violationCount = results.filter(r => r.isViolation).length;

  const tabItems = [
    {
      key: 'lots', label: <span><ExperimentOutlined /> Lô QC</span>,
      children: <Table columns={lotColumns} dataSource={lots} rowKey="id" size="small" pagination={{ pageSize: 15 }} />,
    },
    {
      key: 'results', label: <span><FileTextOutlined /> Kết quả QC</span>,
      children: <Table columns={resultColumns} dataSource={results} rowKey="id" size="small" pagination={{ pageSize: 20 }} />,
    },
    {
      key: 'reports', label: <span><Badge count={violationCount} size="small" offset={[8, 0]}><WarningOutlined /> Báo cáo</Badge></span>,
      children: <Table columns={reportColumns} dataSource={reports} rowKey="testCode" size="small" pagination={{ pageSize: 20 }} />,
    },
  ];

  return (
    <Spin spinning={loading}>
      <Card
        title={<span><ExperimentOutlined /> Kiểm định chất lượng (QC)</span>}
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => { lotForm.resetFields(); setLotModalOpen(true); }}>Thêm lô QC</Button>
            <Button type="primary" icon={<ExperimentOutlined />} onClick={() => { runForm.resetFields(); setRunModalOpen(true); }}>Chạy QC</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Statistic title="Tổng lô QC" value={lots.length} prefix={<ExperimentOutlined />} /></Col>
          <Col span={6}><Statistic title="Lô đang dùng" value={lots.filter(l => l.isActive).length} styles={{ content: { color: '#3f8600' } }} prefix={<CheckCircleOutlined />} /></Col>
          <Col span={6}><Statistic title="Tổng lần chạy" value={results.length} prefix={<LineChartOutlined />} /></Col>
          <Col span={6}><Statistic title="Vi phạm" value={violationCount} styles={{ content: { color: violationCount > 0 ? '#cf1322' : '#3f8600' } }} prefix={<WarningOutlined />} /></Col>
        </Row>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Create Lot Modal */}
      <Modal title="Thêm lô QC" open={lotModalOpen} onOk={handleCreateLot} onCancel={() => setLotModalOpen(false)} width={600} destroyOnHidden>
        <Form form={lotForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="lotNumber" label="Số lô" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="testCode" label="Mã XN" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="testName" label="Tên XN" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="level" label="Level" rules={[{ required: true }]}>
                <Select options={[{ value: 1, label: 'Level 1 (Low)' }, { value: 2, label: 'Level 2 (Normal)' }, { value: 3, label: 'Level 3 (High)' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="targetMean" label="Mean" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="targetSD" label="SD" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="manufacturer" label="Hãng SX"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="expiryDate" label="Hạn dùng"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Run QC Modal */}
      <Modal title={`Chạy QC${selectedLot ? ` - ${selectedLot.testName} L${selectedLot.level}` : ''}`} open={runModalOpen} onOk={handleRunQC} onCancel={() => setRunModalOpen(false)} destroyOnHidden>
        <Form form={runForm} layout="vertical">
          <Form.Item name="lotId" label="Lô QC" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={lots.filter(l => l.isActive).map(l => ({ value: l.id, label: `${l.lotNumber} - ${l.testName} L${l.level}` }))}
            />
          </Form.Item>
          <Form.Item name="value" label="Giá trị đo được" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Levey-Jennings Chart Modal */}
      <Modal title={`Levey-Jennings: ${ljData?.testName || ''} Level ${ljData?.level || ''}`} open={chartModalOpen} onCancel={() => setChartModalOpen(false)} width={900} footer={null}>
        {ljData && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Statistic title="Mean" value={ljData.mean} suffix={ljData.unit} /></Col>
              <Col span={6}><Statistic title="SD" value={ljData.sd} /></Col>
              <Col span={6}><Statistic title="Số điểm" value={ljData.points.length} /></Col>
              <Col span={6}><Statistic title="Vi phạm" value={ljData.points.filter(p => p.violation).length} styles={{ content: { color: '#cf1322' }} /></Col>
            </Row>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={ljData.points.map(p => ({ ...p, date: dayjs(p.date).format('DD/MM') }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[ljData.mean - 4 * ljData.sd, ljData.mean + 4 * ljData.sd]} />
                <RTooltip formatter={(value: number) => value.toFixed(2)} />
                <Legend />
                <ReferenceLine y={ljData.mean} stroke="#1890ff" strokeDasharray="5 5" label="Mean" />
                <ReferenceLine y={ljData.mean + ljData.sd} stroke="#52c41a" strokeDasharray="3 3" label="+1SD" />
                <ReferenceLine y={ljData.mean - ljData.sd} stroke="#52c41a" strokeDasharray="3 3" label="-1SD" />
                <ReferenceLine y={ljData.mean + 2 * ljData.sd} stroke="#faad14" strokeDasharray="3 3" label="+2SD" />
                <ReferenceLine y={ljData.mean - 2 * ljData.sd} stroke="#faad14" strokeDasharray="3 3" label="-2SD" />
                <ReferenceLine y={ljData.mean + 3 * ljData.sd} stroke="#f5222d" strokeDasharray="3 3" label="+3SD" />
                <ReferenceLine y={ljData.mean - 3 * ljData.sd} stroke="#f5222d" strokeDasharray="3 3" label="-3SD" />
                <Line type="monotone" dataKey="value" stroke="#1890ff" dot={{ fill: '#1890ff', r: 4 }} name="Giá trị" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Modal>
    </Spin>
  );
};

export default LabQC;
