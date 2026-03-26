import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Row, Col, Select, DatePicker,
  Typography, message, Tabs, Statistic, Spin, Modal, Form, InputNumber,
} from 'antd';
import {
  ReadOutlined, SearchOutlined, ReloadOutlined, PlusOutlined,
  EditOutlined, TeamOutlined, CalendarOutlined,
  FileTextOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import * as heApi from '../api/healthEducation';
import type { HealthCampaign, HealthMaterial, CampaignStats } from '../api/healthEducation';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CAMPAIGN_STATUS_LABELS: Record<number, string> = { 0: 'Kế hoạch', 1: 'Đang diễn ra', 2: 'Hoàn thành', 3: 'Hủy' };
const CAMPAIGN_STATUS_COLORS: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'error' };

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  poster: 'Poster', brochure: 'Tờ rơi', video: 'Video', audio: 'Audio',
  presentation: 'Slide', infographic: 'Infographic', other: 'Khác',
};
const MATERIAL_TYPE_COLORS: Record<string, string> = {
  poster: 'blue', brochure: 'green', video: 'red', audio: 'purple',
  presentation: 'orange', infographic: 'cyan', other: 'default',
};
const MATERIAL_STATUS_LABELS: Record<number, string> = { 0: 'Bản nháp', 1: 'Đã xuất bản', 2: 'Lưu trữ' };

const HealthEducation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<HealthCampaign[]>([]);
  const [materials, setMaterials] = useState<HealthMaterial[]>([]);
  const [stats, setStats] = useState<CampaignStats>({ campaignsThisYear: 0, ongoingCampaigns: 0, totalParticipants: 0, totalMaterials: 0 });
  const [mainTab, setMainTab] = useState('campaigns');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [campaignForm] = Form.useForm();
  const [materialForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        heApi.searchCampaigns({
          keyword: keyword || undefined,
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        }),
        heApi.searchMaterials({ keyword: keyword || undefined }),
        heApi.getCampaignStats(),
      ]);
      if (results[0].status === 'fulfilled') setCampaigns(results[0].value);
      if (results[1].status === 'fulfilled') setMaterials(results[1].value);
      if (results[2].status === 'fulfilled') setStats(results[2].value);
    } catch {
      message.warning('Không thể tải dữ liệu truyền thông GDSK');
    } finally {
      setLoading(false);
    }
  }, [keyword, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCampaign = async () => {
    try {
      const values = await campaignForm.validateFields();
      setSaving(true);
      await heApi.createCampaign(values);
      message.success('Đã tạo chiến dịch');
      setIsCreateCampaignOpen(false);
      campaignForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo chiến dịch');
    } finally { setSaving(false); }
  };

  const handleCreateMaterial = async () => {
    try {
      const values = await materialForm.validateFields();
      setSaving(true);
      await heApi.createMaterial(values);
      message.success('Đã tạo tài liệu');
      setIsCreateMaterialOpen(false);
      materialForm.resetFields();
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể tạo tài liệu');
    } finally { setSaving(false); }
  };

  const campaignColumns: ColumnsType<HealthCampaign> = [
    { title: 'Mã CD', dataIndex: 'campaignCode', width: 100 },
    { title: 'Tên chiến dịch', dataIndex: 'title', width: 200, ellipsis: true },
    { title: 'Đối tượng', dataIndex: 'targetAudience', width: 150, ellipsis: true },
    { title: 'Địa điểm', dataIndex: 'location', width: 150, ellipsis: true },
    {
      title: 'Bắt đầu', dataIndex: 'startDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Kết thúc', dataIndex: 'endDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    { title: 'Số người TG', dataIndex: 'participantCount', width: 110 },
    { title: 'Người tổ chức', dataIndex: 'organizerName', width: 140 },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: number) => <Tag color={CAMPAIGN_STATUS_COLORS[s]}>{CAMPAIGN_STATUS_LABELS[s]}</Tag>,
    },
  ];

  const materialColumns: ColumnsType<HealthMaterial> = [
    { title: 'Mã TL', dataIndex: 'materialCode', width: 100 },
    { title: 'Tiêu đề', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: 'Loại', dataIndex: 'materialType', width: 120,
      render: (t: string) => <Tag color={MATERIAL_TYPE_COLORS[t]}>{MATERIAL_TYPE_LABELS[t] || t}</Tag>,
    },
    { title: 'Chủ đề', dataIndex: 'topic', width: 150, ellipsis: true },
    { title: 'Tác giả', dataIndex: 'author', width: 140 },
    {
      title: 'Ngày tạo', dataIndex: 'createdDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    { title: 'Lượt tải', dataIndex: 'downloadCount', width: 80 },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{MATERIAL_STATUS_LABELS[s]}</Tag>,
    },
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
            <Col><Title level={4} style={{ margin: 0 }}><ReadOutlined style={{ marginRight: 8 }} />Truyền thông GDSK</Title></Col>
            <Col>
              <Space>
                {mainTab === 'campaigns' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateCampaignOpen(true)}>Tạo chiến dịch</Button>}
                {mainTab === 'materials' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateMaterialOpen(true)}>Tạo tài liệu</Button>}
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
            <Col xs={24} sm={8} md={6}>
              <RangePicker style={{ width: '100%' }} value={dateRange} onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)} format="DD/MM/YYYY" />
            </Col>
          </Row>
        </Card>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card><Statistic title="Chiến dịch năm" value={stats.campaignsThisYear} prefix={<CalendarOutlined />} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Đang diễn ra" value={stats.ongoingCampaigns} prefix={<PlayCircleOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Người tham gia" value={stats.totalParticipants} prefix={<TeamOutlined />} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Tài liệu" value={stats.totalMaterials} prefix={<FileTextOutlined />} styles={{ content: { color: '#fa8c16' } }} /></Card></Col>
        </Row>
        </motion.div>

        <Card>
          <Tabs activeKey={mainTab} onChange={setMainTab} items={[
            { key: 'campaigns', label: <span><CalendarOutlined /> Chiến dịch ({campaigns.length})</span> },
            { key: 'materials', label: <span><FileTextOutlined /> Tài liệu ({materials.length})</span> },
          ]} />
          {mainTab === 'campaigns' && (
            <Table dataSource={campaigns} columns={campaignColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1200 }} />
          )}
          {mainTab === 'materials' && (
            <Table dataSource={materials} columns={materialColumns} rowKey="id" size="small"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bản ghi` }}
              scroll={{ x: 1000 }} />
          )}
        </Card>

        <Modal title="Tạo chiến dịch GDSK" open={isCreateCampaignOpen} onCancel={() => setIsCreateCampaignOpen(false)}
          onOk={handleCreateCampaign} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={campaignForm} layout="vertical">
            <Row gutter={16}>
              <Col span={24}><Form.Item name="title" label="Tên chiến dịch" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="description" label="Mô tả"><TextArea rows={2} /></Form.Item></Col>
              <Col span={12}><Form.Item name="targetAudience" label="Đối tượng"><Input placeholder="Phụ nữ mang thai, NCT..." /></Form.Item></Col>
              <Col span={12}><Form.Item name="location" label="Địa điểm"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="participantCount" label="Dự kiến TG"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="budget" label="Ngân sách"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal title="Tạo tài liệu GDSK" open={isCreateMaterialOpen} onCancel={() => setIsCreateMaterialOpen(false)}
          onOk={handleCreateMaterial} okText="Tạo" cancelText="Hủy" confirmLoading={saving} width={600} destroyOnHidden>
          <Form form={materialForm} layout="vertical">
            <Row gutter={16}>
              <Col span={24}><Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="materialType" label="Loại tài liệu" rules={[{ required: true, message: 'Chọn' }]}>
                <Select options={Object.entries(MATERIAL_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
              <Col span={12}><Form.Item name="topic" label="Chủ đề"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="author" label="Tác giả"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="language" label="Ngôn ngữ" initialValue="vi">
                <Select options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default HealthEducation;
