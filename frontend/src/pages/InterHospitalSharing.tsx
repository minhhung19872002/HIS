import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, Badge,
  Timeline, Descriptions,
} from 'antd';
import {
  SwapOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EyeOutlined, CheckCircleOutlined, ClockCircleOutlined,
  SendOutlined, CalendarOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as ihApi from '../api/interHospitalSharing';
import type { InterHospitalRequest, InterHospitalStats } from '../api/interHospitalSharing';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const REQUEST_TYPE_LABELS: Record<string, string> = {
  drug_lookup: 'Tra cứu thuốc', ecpr: 'Hồi sức CPR', patient_transfer: 'Chuyển bệnh nhân',
  consultation: 'Hội chẩn', record_sharing: 'Chia sẻ BA',
};
const REQUEST_TYPE_COLORS: Record<string, string> = {
  drug_lookup: 'green', ecpr: 'red', patient_transfer: 'blue',
  consultation: 'gold', record_sharing: 'cyan',
};
const URGENCY_LABELS: Record<string, string> = { normal: 'Thường', urgent: 'Khẩn', emergency: 'Cấp cứu' };
const URGENCY_COLORS: Record<string, string> = { normal: 'default', urgent: 'orange', emergency: 'red' };
const STATUS_LABELS: Record<number, string> = { 0: 'Chờ xử lý', 1: 'Đã tiếp nhận', 2: 'Đang xử lý', 3: 'Hoàn thành', 4: 'Từ chối' };
const STATUS_COLORS: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'blue', 3: 'success', 4: 'error' };

const InterHospitalSharing: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<InterHospitalRequest[]>([]);
  const [stats, setStats] = useState<InterHospitalStats>({ totalRequests: 0, pendingRequests: 0, completedToday: 0, avgResponseTimeMinutes: 0 });
  const [activeTab, setActiveTab] = useState('incoming');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<InterHospitalRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [respondForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const directionMap: Record<string, string | undefined> = {
        incoming: 'incoming', outgoing: 'outgoing', all: undefined,
      };
      const params = {
        keyword: keyword || undefined,
        direction: directionMap[activeTab],
        requestType: typeFilter || undefined,
        fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const results = await Promise.allSettled([
        ihApi.searchRequests(params),
        ihApi.getStats(),
      ]);
      if (results[0].status === 'fulfilled') setRequests(results[0].value);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
    } catch {
      message.warning('Không thể tải dữ liệu chia sẻ liên viện');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      await ihApi.createRequest(values);
      message.success('Đã tạo yêu cầu liên viện');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo yêu cầu');
    } finally { setSaving(false); }
  };

  const handleRespond = async () => {
    if (!selectedRequest) return;
    try {
      const values = await respondForm.validateFields();
      setSaving(true);
      await ihApi.respondToRequest(selectedRequest.id, values);
      message.success('Đã phản hồi yêu cầu');
      setIsRespondModalOpen(false);
      respondForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể phản hồi');
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<InterHospitalRequest> = [
    { title: 'Mã YC', dataIndex: 'requestCode', width: 110 },
    {
      title: 'Loại', dataIndex: 'requestType', width: 140,
      render: (t: string) => <Tag color={REQUEST_TYPE_COLORS[t]}>{REQUEST_TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Khẩn cấp', dataIndex: 'urgency', width: 100,
      render: (u: string) => <Badge color={URGENCY_COLORS[u]} text={URGENCY_LABELS[u] || u} />,
    },
    {
      title: 'Chiều', dataIndex: 'direction', width: 80,
      render: (d: string) => <Tag color={d === 'incoming' ? 'blue' : 'green'}>{d === 'incoming' ? 'Đến' : 'Đi'}</Tag>,
    },
    { title: 'BV yêu cầu', dataIndex: 'requestingHospital', width: 160, ellipsis: true },
    { title: 'BV phản hồi', dataIndex: 'respondingHospital', width: 160, ellipsis: true },
    { title: 'Nội dung', dataIndex: 'subject', width: 200, ellipsis: true },
    {
      title: 'Ngày YC', dataIndex: 'requestedAt', width: 130,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 160,
      render: (_: unknown, record: InterHospitalRequest) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRequest(record); setIsDetailOpen(true); }}>Xem</Button>
          {record.status === 0 && record.direction === 'incoming' && (
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => {
              setSelectedRequest(record);
              respondForm.resetFields();
              setIsRespondModalOpen(true);
            }}>Phản hồi</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col><Title level={4} style={{ margin: 0 }}><SwapOutlined style={{ marginRight: 8 }} />Chia sẻ liên viện</Title></Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>Tạo yêu cầu</Button>
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
            <Col xs={12} sm={8} md={4}>
              <Select placeholder="Loại YC" allowClear style={{ width: '100%' }} value={typeFilter} onChange={setTypeFilter}
                options={Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Tổng yêu cầu" value={stats.totalRequests} prefix={<SwapOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Chờ xử lý" value={stats.pendingRequests} prefix={<ClockCircleOutlined />} styles={{ content: { color: '#faad14' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Hoàn thành hôm nay" value={stats.completedToday} prefix={<CalendarOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="TB phản hồi (phút)" value={stats.avgResponseTimeMinutes} prefix={<FieldTimeOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            { key: 'incoming', label: <span><SendOutlined style={{ transform: 'rotate(180deg)' }} /> Đến ({requests.filter(r => r.direction === 'incoming').length})</span> },
            { key: 'outgoing', label: <span><SendOutlined /> Đi ({requests.filter(r => r.direction === 'outgoing').length})</span> },
            { key: 'all', label: `Tất cả (${requests.length})` },
          ]} />
          <Table dataSource={requests} columns={columns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
            scroll={{ x: 1500 }}
            onRow={(record) => ({ onDoubleClick: () => { setSelectedRequest(record); setIsDetailOpen(true); }, style: { cursor: 'pointer' } })} />
        </Card>

        <Modal title="Chi tiết yêu cầu liên viện" open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null} width={650}>
          {selectedRequest && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Mã YC">{selectedRequest.requestCode}</Descriptions.Item>
                <Descriptions.Item label="Loại"><Tag color={REQUEST_TYPE_COLORS[selectedRequest.requestType]}>{REQUEST_TYPE_LABELS[selectedRequest.requestType]}</Tag></Descriptions.Item>
                <Descriptions.Item label="Khẩn cấp"><Badge color={URGENCY_COLORS[selectedRequest.urgency]} text={URGENCY_LABELS[selectedRequest.urgency]} /></Descriptions.Item>
                <Descriptions.Item label="Trạng thái"><Tag color={STATUS_COLORS[selectedRequest.status]}>{STATUS_LABELS[selectedRequest.status]}</Tag></Descriptions.Item>
                <Descriptions.Item label="BV yêu cầu">{selectedRequest.requestingHospital}</Descriptions.Item>
                <Descriptions.Item label="BV phản hồi">{selectedRequest.respondingHospital}</Descriptions.Item>
                <Descriptions.Item label="Nội dung" span={2}>{selectedRequest.subject}</Descriptions.Item>
                <Descriptions.Item label="Chi tiết" span={2}>{selectedRequest.details}</Descriptions.Item>
                {selectedRequest.responseNotes && <Descriptions.Item label="Phản hồi" span={2}>{selectedRequest.responseNotes}</Descriptions.Item>}
              </Descriptions>
              <Title level={5} style={{ marginTop: 16 }}>Dòng thời gian</Title>
              <Timeline items={[
                { children: `Yêu cầu tạo: ${selectedRequest.requestedAt ? dayjs(selectedRequest.requestedAt).format('DD/MM/YYYY HH:mm') : '-'} bởi ${selectedRequest.requestedBy}`, color: 'blue' },
                ...(selectedRequest.respondedAt ? [{ children: `Phản hồi: ${dayjs(selectedRequest.respondedAt).format('DD/MM/YYYY HH:mm')} bởi ${selectedRequest.respondedBy || '-'}`, color: 'green' as const }] : []),
                ...(selectedRequest.completedAt ? [{ children: `Hoàn thành: ${dayjs(selectedRequest.completedAt).format('DD/MM/YYYY HH:mm')}`, color: 'green' as const }] : []),
              ]} />
            </>
          )}
        </Modal>

        <Modal title="Tạo yêu cầu liên viện" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreate} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}><Form.Item name="requestType" label="Loại yêu cầu" rules={[{ required: true, message: 'Chọn' }]}>
                <Select options={Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="urgency" label="Mức khẩn" initialValue="normal">
                <Select options={Object.entries(URGENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="respondingHospital" label="BV đích" rules={[{ required: true, message: 'Nhập' }]}><Input placeholder="Tên bệnh viện" /></Form.Item></Col>
              <Col span={12}><Form.Item name="patientName" label="Bệnh nhân"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="subject" label="Nội dung" rules={[{ required: true, message: 'Nhập' }]}><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="details" label="Chi tiết"><TextArea rows={3} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Phản hồi yêu cầu" open={isRespondModalOpen} onCancel={() => setIsRespondModalOpen(false)}
          onOk={handleRespond} okText="Gửi" cancelText="Hủy" confirmLoading={saving} width={500} destroyOnHidden>
          <Form form={respondForm} layout="vertical">
            <Form.Item name="status" label="Quyết định" rules={[{ required: true, message: 'Chọn' }]}>
              <Select options={[
                { value: 1, label: 'Tiếp nhận' },
                { value: 4, label: 'Từ chối' },
              ]} />
            </Form.Item>
            <Form.Item name="responseNotes" label="Ghi chú phản hồi" rules={[{ required: true, message: 'Nhập' }]}>
              <TextArea rows={3} placeholder="Nội dung phản hồi..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default InterHospitalSharing;
