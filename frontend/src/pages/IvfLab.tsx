import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Button, Input, Modal, Form, Tag, Card, Statistic, Row, Col,
  Space, DatePicker, Select, InputNumber, message, Spin, Timeline, Progress, Tooltip
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, ExperimentOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import * as ivfApi from '../api/ivfLab';
import type {
  IvfCouple, IvfCycle, IvfEmbryo, IvfSpermSample,
  IvfDashboard, IvfDailyReport
} from '../api/ivfLab';

const { Search } = Input;

const cycleStatusColor: Record<number, string> = {
  1: 'processing', 2: 'warning', 3: 'orange', 4: 'purple', 5: 'cyan', 6: 'success', 7: 'error'
};
const embryoStatusColor: Record<number, string> = {
  1: 'processing', 2: 'green', 3: 'cyan', 4: 'orange', 5: 'success', 6: 'error'
};
const spermStatusColor: Record<number, string> = { 1: 'cyan', 2: 'default', 3: 'error' };
const resultStatusColor: Record<number, string> = { 0: 'default', 1: 'success', 2: 'error' };

// ---- Tab 1: Couples ----
const CouplesTab: React.FC = () => {
  const [data, setData] = useState<IvfCouple[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ivfApi.getCouples({ keyword: keyword || undefined })); }
    catch { message.warning('Khong the tai danh sach cap vo chong'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await ivfApi.saveCouple(values);
      message.success('Luu thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch { message.warning('Luu that bai'); }
  };

  const columns: ColumnsType<IvfCouple> = [
    { title: 'Vo', dataIndex: 'wifeName', key: 'wifeName', render: (v, r) => `${v || ''} (${r.wifeCode || ''})` },
    { title: 'Chong', dataIndex: 'husbandName', key: 'husbandName', render: (v, r) => `${v || ''} (${r.husbandCode || ''})` },
    { title: 'Nguyen nhan', dataIndex: 'infertilityCause', key: 'cause', ellipsis: true },
    { title: 'Thoi gian (thang)', dataIndex: 'infertilityDurationMonths', key: 'duration', width: 130 },
    { title: 'So chu ky', dataIndex: 'cycleCount', key: 'cycleCount', width: 100 },
  ];

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Search placeholder="Tim kiem..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={fetchData} style={{ width: 300 }} enterButton={<SearchOutlined />} />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Dang ky cap</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      <Modal title="Dang ky cap vo chong" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="wifePatientId" label="Ma benh nhan (Vo)" rules={[{ required: true }]}><Input placeholder="Patient ID (Vo)" /></Form.Item></Col>
            <Col span={12}><Form.Item name="husbandPatientId" label="Ma benh nhan (Chong)" rules={[{ required: true }]}><Input placeholder="Patient ID (Chong)" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="infertilityCause" label="Nguyen nhan vo sinh"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="infertilityDurationMonths" label="Thoi gian (thang)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chu"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

// ---- Tab 2: Cycles ----
const CyclesTab: React.FC = () => {
  const [couples, setCouples] = useState<IvfCouple[]>([]);
  const [cycles, setCycles] = useState<IvfCycle[]>([]);
  const [selectedCouple, setSelectedCouple] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { ivfApi.getCouples().then(setCouples); }, []);
  useEffect(() => {
    if (selectedCouple) {
      setLoading(true);
      ivfApi.getCycles(selectedCouple).then(setCycles).finally(() => setLoading(false));
    }
  }, [selectedCouple]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.coupleId = selectedCouple;
      values.startDate = values.startDate?.format?.('YYYY-MM-DD') || values.startDate;
      await ivfApi.saveCycle(values);
      message.success('Luu chu ky thanh cong');
      setModalOpen(false);
      form.resetFields();
      ivfApi.getCycles(selectedCouple).then(setCycles);
    } catch { message.warning('Luu that bai'); }
  };

  const columns: ColumnsType<IvfCycle> = [
    { title: 'Chu ky', dataIndex: 'cycleNumber', key: 'num', width: 80 },
    { title: 'Ngay bat dau', dataIndex: 'startDate', key: 'start', width: 120 },
    { title: 'Trang thai', dataIndex: 'status', key: 'status', render: (s, r) => <Tag color={cycleStatusColor[s]}>{r.statusName || s}</Tag> },
    { title: 'Phac do', dataIndex: 'protocol', key: 'protocol', ellipsis: true },
    { title: 'Bac si', dataIndex: 'doctorName', key: 'doctor' },
    { title: 'Phoi', dataIndex: 'embryoCount', key: 'embryo', width: 60 },
    { title: 'Chuyen', dataIndex: 'transferCount', key: 'transfer', width: 70 },
  ];

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Chon cap vo chong" style={{ width: 350 }} value={selectedCouple || undefined} onChange={setSelectedCouple} showSearch optionFilterProp="label"
          options={couples.map(c => ({ value: c.id, label: `${c.wifeName || ''} & ${c.husbandName || ''}` }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} disabled={!selectedCouple}>Tao chu ky</Button>
      </Space>
      <Table dataSource={cycles} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      <Modal title="Tao chu ky IVF" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={500}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="cycleNumber" label="So chu ky" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="startDate" label="Ngay bat dau"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="protocol" label="Phac do"><Input placeholder="VD: Long protocol, Short protocol, Antagonist..." /></Form.Item>
          <Form.Item name="notes" label="Ghi chu"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

// ---- Tab 3: Embryos ----
const EmbryosTab: React.FC = () => {
  const [embryos, setEmbryos] = useState<IvfEmbryo[]>([]);
  const [loading, setLoading] = useState(false);
  const [cycleId, setCycleId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [freezeModal, setFreezeModal] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [freezeForm] = Form.useForm();

  const fetchEmbryos = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try { setEmbryos(await ivfApi.getEmbryos(cycleId)); }
    catch { message.warning('Khong the tai danh sach phoi'); }
    finally { setLoading(false); }
  }, [cycleId]);

  useEffect(() => { fetchEmbryos(); }, [fetchEmbryos]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.cycleId = cycleId;
      await ivfApi.saveEmbryo(values);
      message.success('Luu phoi thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchEmbryos();
    } catch { message.warning('Luu that bai'); }
  };

  const handleFreeze = async () => {
    try {
      const values = await freezeForm.validateFields();
      values.freezeDate = values.freezeDate?.format?.('YYYY-MM-DD') || values.freezeDate;
      await ivfApi.freezeEmbryo(freezeModal!, values);
      message.success('Dong lanh thanh cong');
      setFreezeModal(null);
      freezeForm.resetFields();
      fetchEmbryos();
    } catch { message.warning('Dong lanh that bai'); }
  };

  const handleThaw = async (id: string) => {
    try {
      await ivfApi.thawEmbryo(id, { thawDate: dayjs().format('YYYY-MM-DD') });
      message.success('Ra dong thanh cong');
      fetchEmbryos();
    } catch { message.warning('Ra dong that bai'); }
  };

  const columns: ColumnsType<IvfEmbryo> = [
    { title: 'Ma phoi', dataIndex: 'embryoCode', key: 'code', width: 100 },
    { title: 'D2', dataIndex: 'day2Grade', key: 'd2', width: 60 },
    { title: 'D3', dataIndex: 'day3Grade', key: 'd3', width: 60 },
    { title: 'D5', dataIndex: 'day5Grade', key: 'd5', width: 60 },
    { title: 'D6', dataIndex: 'day6Grade', key: 'd6', width: 60 },
    { title: 'D7', dataIndex: 'day7Grade', key: 'd7', width: 60 },
    { title: 'Trang thai', dataIndex: 'status', key: 'status', render: (s, r) => <Tag color={embryoStatusColor[s]}>{r.statusName || s}</Tag> },
    { title: 'Binh', dataIndex: 'tankCode', key: 'tank', width: 80 },
    { title: 'Ong', dataIndex: 'strawCode', key: 'straw', width: 80 },
    {
      title: 'Thao tac', key: 'action', width: 200,
      render: (_, r) => (
        <Space>
          {r.status === 1 && <Button size="small" onClick={() => { setFreezeModal(r.id); freezeForm.resetFields(); }}>Dong lanh</Button>}
          {r.status === 3 && <Button size="small" onClick={() => handleThaw(r.id)}>Ra dong</Button>}
        </Space>
      )
    },
  ];

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Nhap Cycle ID" value={cycleId} onChange={e => setCycleId(e.target.value)} style={{ width: 320 }} />
        <Button icon={<SearchOutlined />} onClick={fetchEmbryos}>Tai phoi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} disabled={!cycleId}>Them phoi</Button>
      </Space>
      <Table dataSource={embryos} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
      <Modal title="Them phoi" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item name="embryoCode" label="Ma phoi" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="day2Grade" label="Grade D2"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="day3Grade" label="Grade D3"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="day5Grade" label="Grade D5"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="day6Grade" label="Grade D6"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="day7Grade" label="Grade D7"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Ghi chu"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Dong lanh phoi" open={!!freezeModal} onOk={handleFreeze} onCancel={() => setFreezeModal(null)} width={500}>
        <Form form={freezeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="freezeDate" label="Ngay dong lanh"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="strawCode" label="Ma ong"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="strawColor" label="Mau ong"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="tankCode" label="Binh"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="boxCode" label="Hop"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="rackPosition" label="Vi tri rack"><Input /></Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

// ---- Tab 4: Cryopreservation ----
const CryoTab: React.FC = () => {
  const [frozenEmbryos, setFrozenEmbryos] = useState<IvfEmbryo[]>([]);
  const [expiringSperm, setExpiringSperm] = useState<IvfSpermSample[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sperm] = await Promise.all([
        ivfApi.getExpiringStorage(90),
      ]);
      setExpiringSperm(sperm);
    } catch { message.warning('Khong the tai du lieu tru dong'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const embryoColumns: ColumnsType<IvfEmbryo> = [
    { title: 'Ma phoi', dataIndex: 'embryoCode', key: 'code' },
    { title: 'Binh', dataIndex: 'tankCode', key: 'tank' },
    { title: 'Rack', dataIndex: 'rackPosition', key: 'rack' },
    { title: 'Hop', dataIndex: 'boxCode', key: 'box' },
    { title: 'Ong', dataIndex: 'strawCode', key: 'straw' },
    { title: 'Ngay dong', dataIndex: 'freezeDate', key: 'freeze' },
  ];

  const spermColumns: ColumnsType<IvfSpermSample> = [
    { title: 'Ma mau', dataIndex: 'sampleCode', key: 'code' },
    { title: 'Benh nhan', dataIndex: 'patientName', key: 'patient' },
    { title: 'Binh', dataIndex: 'tankCode', key: 'tank' },
    { title: 'So ong', dataIndex: 'strawCount', key: 'straws' },
    { title: 'Han', dataIndex: 'expiryDate', key: 'expiry', render: v => v ? <Tag color={dayjs(v).isBefore(dayjs()) ? 'error' : dayjs(v).isBefore(dayjs().add(30, 'day')) ? 'warning' : 'default'}>{v}</Tag> : '-' },
    { title: 'Phi', dataIndex: 'storageFee', key: 'fee', render: v => v?.toLocaleString('vi-VN') + ' d' },
  ];

  return (
    <Spin spinning={loading}>
      <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginBottom: 16 }}>Lam moi</Button>
      <h4 style={{ marginBottom: 8 }}>Phoi dong lanh</h4>
      <Table dataSource={frozenEmbryos} columns={embryoColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Nhap Cycle ID o tab Phoi de xem phoi dong lanh' }} />
      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Tinh trung sap het han (90 ngay)</h4>
      <Table dataSource={expiringSperm} columns={spermColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
    </Spin>
  );
};

// ---- Tab 5: Sperm Bank ----
const SpermBankTab: React.FC = () => {
  const [data, setData] = useState<IvfSpermSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ivfApi.getSpermSamples({ keyword: keyword || undefined })); }
    catch { message.warning('Khong the tai ngan hang tinh trung'); }
    finally { setLoading(false); }
  }, [keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.collectionDate = values.collectionDate?.format?.('YYYY-MM-DD') || values.collectionDate;
      values.expiryDate = values.expiryDate?.format?.('YYYY-MM-DD') || values.expiryDate;
      await ivfApi.saveSpermSample(values);
      message.success('Luu thanh cong');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch { message.warning('Luu that bai'); }
  };

  const columns: ColumnsType<IvfSpermSample> = [
    { title: 'Ma mau', dataIndex: 'sampleCode', key: 'code', width: 120 },
    { title: 'Benh nhan', dataIndex: 'patientName', key: 'patient' },
    { title: 'Ngay thu', dataIndex: 'collectionDate', key: 'date', width: 110 },
    { title: 'V (ml)', dataIndex: 'volume', key: 'vol', width: 70 },
    { title: 'Nong do', dataIndex: 'concentration', key: 'conc', width: 80 },
    { title: 'Di dong %', dataIndex: 'motility', key: 'mot', width: 80 },
    { title: 'Hinh thai %', dataIndex: 'morphology', key: 'morph', width: 80 },
    { title: 'Ong', dataIndex: 'strawCount', key: 'straws', width: 60 },
    { title: 'Trang thai', dataIndex: 'status', key: 'status', render: (s, r) => <Tag color={spermStatusColor[s]}>{r.statusName || s}</Tag> },
    { title: 'Han', dataIndex: 'expiryDate', key: 'expiry', width: 110 },
  ];

  return (
    <Spin spinning={loading}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Search placeholder="Tim kiem..." value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={fetchData} style={{ width: 300 }} enterButton={<SearchOutlined />} />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Lam moi</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Them mau</Button>
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      <Modal title="Them mau tinh trung" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={700}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="patientId" label="Ma benh nhan" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="sampleCode" label="Ma mau" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="collectionDate" label="Ngay thu"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="volume" label="The tich (ml)"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="concentration" label="Nong do (trieu/ml)"><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="motility" label="Di dong (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="morphology" label="Hinh thai (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="strawCount" label="So ong"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="tankCode" label="Binh"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="boxCode" label="Hop"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="expiryDate" label="Han su dung"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="storageFee" label="Phi luu tru"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="notes" label="Ghi chu"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </Spin>
  );
};

// ---- Tab 6: Dashboard ----
const DashboardTab: React.FC = () => {
  const [dashboard, setDashboard] = useState<IvfDashboard | null>(null);
  const [report, setReport] = useState<IvfDailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, rep] = await Promise.all([
        ivfApi.getIvfDashboard(),
        ivfApi.getDailyReport()
      ]);
      setDashboard(dash);
      setReport(rep);
    } catch { message.warning('Khong the tai dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Spin spinning={loading}>
      <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginBottom: 16 }}>Lam moi</Button>
      {dashboard && (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Chu ky dang hoat dong" value={dashboard.activeCycles} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Phoi dong lanh" value={dashboard.frozenEmbryos} valueStyle={{ color: '#1890ff' }} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Mau tinh trung" value={dashboard.spermSamples} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Chuyen phoi thang nay" value={dashboard.transfersThisMonth} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Ti le thanh cong" value={dashboard.successRate} suffix="%" prefix={dashboard.successRate > 30 ? <CheckCircleOutlined /> : <CloseCircleOutlined />} valueStyle={{ color: dashboard.successRate > 30 ? '#3f8600' : '#cf1322' }} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Tong cap vo chong" value={dashboard.totalCouples} /></Card></Col>
          <Col xs={12} sm={8} md={6}><Card><Statistic title="Chu ky hoan thanh" value={dashboard.completedCycles} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        </Row>
      )}
      <h4 style={{ marginTop: 24, marginBottom: 8 }}>Bao cao hoat dong hom nay {report?.date ? `(${report.date})` : ''}</h4>
      {report && report.items.length > 0 ? (
        <Timeline
          items={report.items.map(item => ({
            color: 'blue',
            children: (
              <span><strong>{item.activityType}</strong>: {item.count} {item.details ? `- ${item.details}` : ''}</span>
            ),
          }))}
        />
      ) : (
        <p style={{ color: '#999' }}>Chua co hoat dong nao hom nay</p>
      )}
      {dashboard && dashboard.successRate > 0 && (
        <div style={{ marginTop: 16 }}>
          <Tooltip title={`${dashboard.successRate}% ti le thanh cong`}>
            <span>Ti le thanh cong tong the:</span>
            <Progress percent={Number(dashboard.successRate)} status={dashboard.successRate > 30 ? 'success' : 'normal'} style={{ maxWidth: 400 }} />
          </Tooltip>
        </div>
      )}
    </Spin>
  );
};

// ---- Main Component ----
const IvfLab: React.FC = () => {
  const tabItems = [
    { key: 'couples', label: 'Cap vo chong', children: <CouplesTab /> },
    { key: 'cycles', label: 'Chu ky IVF', children: <CyclesTab /> },
    { key: 'embryos', label: 'Phoi', children: <EmbryosTab /> },
    { key: 'cryo', label: 'Tru dong', children: <CryoTab /> },
    { key: 'sperm', label: 'Ngan hang tinh trung', children: <SpermBankTab /> },
    { key: 'dashboard', label: 'Dashboard', children: <DashboardTab /> },
  ];

  return (
    <div style={{ padding: 0, position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2><ExperimentOutlined /> Phong Lab IVF</h2>
      </motion.div>
      <Tabs items={tabItems} defaultActiveKey="couples" />
    </div>
  );
};

export default IvfLab;
