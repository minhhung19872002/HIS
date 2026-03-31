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
  InputNumber,
  Drawer,
  Timeline,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as guidanceApi from '../api/clinicalGuidance';
import type {
  GuidanceBatchDto,
  GuidanceActivityDto,
  GuidanceStatisticsDto,
  CreateGuidanceBatchDto,
} from '../api/clinicalGuidance';

const { Title } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const TYPE_LABELS: Record<number, string> = {
  0: 'Khám chữa bệnh',
  1: 'Đào tạo',
  2: 'Chuyển giao KT',
  3: 'Hỗ trợ',
};

const TYPE_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'green',
  2: 'purple',
  3: 'orange',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Kế hoạch',
  1: 'Đang thực hiện',
  2: 'Hoàn thành',
  3: 'Đã hủy',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
  3: 'error',
};

const ACTIVITY_TYPE_LABELS: Record<number, string> = {
  0: 'Khám bệnh',
  1: 'Phẫu thuật',
  2: 'Đào tạo',
  3: 'Hội chẩn',
  4: 'Chuyển giao kỹ thuật',
  5: 'Hỗ trợ vật tư',
};

const ACTIVITY_TYPE_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'red',
  2: 'green',
  3: 'purple',
  4: 'orange',
  5: 'cyan',
};

const ClinicalGuidance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<GuidanceBatchDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<GuidanceStatisticsDto>({
    inProgress: 0,
    completed: 0,
    totalBudget: 0,
  });
  const [activeTab, setActiveTab] = useState('inProgress');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Modal/Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<GuidanceBatchDto | null>(null);
  const [activities, setActivities] = useState<GuidanceActivityDto[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState<GuidanceBatchDto | null>(null);
  const [batchForm] = Form.useForm();
  const [activityForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, number | undefined> = {
        inProgress: 1,
        planning: 0,
        completed: 2,
        all: undefined,
      };

      const results = await Promise.allSettled([
        guidanceApi.getGuidanceBatches({
          keyword: keyword || undefined,
          status: statusMap[activeTab],
          guidanceType: typeFilter,
          fromDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          toDate: dateRange?.[1]?.format('YYYY-MM-DD'),
          page: pagination.current,
          pageSize: pagination.pageSize,
        }),
        guidanceApi.getGuidanceStatistics(),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        setBatches(data.items || []);
        setTotalCount(data.totalCount || 0);
      }
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value);
      }
    } catch {
      message.warning('Không thể tải dữ liệu chỉ đạo tuyến');
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, typeFilter, dateRange, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = async (record: GuidanceBatchDto) => {
    setSelectedBatch(record);
    setIsDetailDrawerOpen(true);
    setActivitiesLoading(true);
    try {
      const acts = await guidanceApi.getGuidanceActivities(record.id);
      setActivities(acts);
    } catch {
      message.warning('Không thể tải hoạt động chỉ đạo tuyến');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleOpenCreate = (batch?: GuidanceBatchDto) => {
    setEditingBatch(batch || null);
    batchForm.resetFields();
    if (batch) {
      batchForm.setFieldsValue({
        title: batch.title,
        targetFacility: batch.targetFacility,
        guidanceType: batch.guidanceType,
        startDate: batch.startDate ? dayjs(batch.startDate) : undefined,
        endDate: batch.endDate ? dayjs(batch.endDate) : undefined,
        teamMembers: batch.teamMembers,
        budget: batch.budget,
        notes: batch.notes,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveBatch = async () => {
    try {
      const values = await batchForm.validateFields();
      setSaving(true);
      const payload: CreateGuidanceBatchDto = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        endDate: values.endDate?.format('YYYY-MM-DD'),
      };
      if (editingBatch) {
        await guidanceApi.updateGuidanceBatch(editingBatch.id, payload);
        message.success('Đã cập nhật đợt chỉ đạo tuyến');
      } else {
        await guidanceApi.createGuidanceBatch(payload);
        message.success('Đã tạo đợt chỉ đạo tuyến');
      }
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể lưu đợt chỉ đạo tuyến');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await guidanceApi.deleteGuidanceBatch(id);
      message.success('Đã xóa đợt chỉ đạo tuyến');
      fetchData();
    } catch {
      message.warning('Không thể xóa đợt chỉ đạo tuyến');
    }
  };

  const handleAddActivity = async () => {
    try {
      const values = await activityForm.validateFields();
      setSaving(true);
      await guidanceApi.createGuidanceActivity({
        batchId: selectedBatch!.id,
        ...values,
        activityDate: values.activityDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã thêm hoạt động');
      setIsActivityModalOpen(false);
      activityForm.resetFields();
      // Refresh activities
      const acts = await guidanceApi.getGuidanceActivities(selectedBatch!.id);
      setActivities(acts);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.warning('Không thể thêm hoạt động');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<GuidanceBatchDto> = [
    {
      title: 'Mã đợt',
      dataIndex: 'batchCode',
      key: 'batchCode',
      width: 120,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
    },
    {
      title: 'Cơ sở tuyến dưới',
      dataIndex: 'targetFacility',
      key: 'targetFacility',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Loại hình',
      dataIndex: 'guidanceType',
      key: 'guidanceType',
      width: 140,
      render: (t: number) => <Tag color={TYPE_COLORS[t]}>{TYPE_LABELS[t] || 'Khac'}</Tag>,
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: number) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || `${s}`}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: GuidanceBatchDto) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenCreate(record)} />
          </Tooltip>
          {record.status === 0 && (
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading && batches.length === 0}>
      <div>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Chỉ đạo tuyến
              </Title>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate()}>
                  Tạo đợt mới
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  Làm mới
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* KPI Cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Dang thuc hien"
                value={stats.inProgress}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Hoan thanh"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Tổng ngân sách"
                value={stats.totalBudget}
                suffix="đ"
                precision={0}
                prefix={<DollarOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Tìm kiếm đợt chỉ đạo, cơ sở..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchData}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Select
                placeholder="Loại hình"
                allowClear
                style={{ width: '100%' }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 0, label: 'Khám chữa bệnh' },
                  { value: 1, label: 'Dao tao' },
                  { value: 2, label: 'Chuyen giao KT' },
                  { value: 3, label: 'Ho tro' },
                ]}
              />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(val) => setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            </Col>
          </Row>
        </Card>

        {/* Tabs + Table */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => { setActiveTab(key); setPagination({ current: 1, pageSize: 20 }); }}
            items={[
              { key: 'inProgress', label: <span><ClockCircleOutlined /> Dang thuc hien</span> },
              { key: 'planning', label: 'Kế hoạch' },
              { key: 'completed', label: <span><CheckCircleOutlined /> Hoan thanh</span> },
              { key: 'all', label: `Tất cả (${totalCount})` },
            ]}
          />
          <Table
            dataSource={batches}
            columns={columns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: totalCount,
              showSizeChanger: true,
              showTotal: (t) => `Tong ${t} dot`,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onDoubleClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={editingBatch ? 'Chỉnh sửa dot chi dao tuyen' : 'Tao dot chi dao tuyen'}
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleSaveBatch}
          okText={editingBatch ? 'Cập nhật' : 'Tạo mới'}
          cancelText="Hủy"
          confirmLoading={saving}
          width={700}
          destroyOnHidden
        >
          <Form form={batchForm} layout="vertical">
            <Form.Item
              name="title"
              label="Tieu de"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
            >
              <Input placeholder="VD: Chỉ đạo tuyến TTYT Huyện X Q2/2026" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="targetFacility"
                  label="Co so tuyen duoi"
                  rules={[{ required: true, message: 'Vui lòng nhập cơ sở' }]}
                >
                  <Input placeholder="Tên cơ sở y tế tuyến dưới" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="guidanceType"
                  label="Loai hinh"
                  rules={[{ required: true, message: 'Vui lòng chọn loại hình' }]}
                >
                  <Select
                    placeholder="Chọn loại hình"
                    options={[
                      { value: 0, label: 'Khám chữa bệnh' },
                      { value: 1, label: 'Dao tao' },
                      { value: 2, label: 'Chuyen giao ky thuat' },
                      { value: 3, label: 'Ho tro vat tu' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="startDate"
                  label="Ngay bat dau"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="endDate"
                  label="Ngay ket thuc"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="teamMembers" label="Thành viên đoàn">
              <TextArea rows={2} placeholder="Danh sách thành viên tham gia..." />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="budget" label="Ngân sách (VND)">
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="0"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          title={`Chi tiet dot chi dao tuyen - ${selectedBatch?.batchCode || ''}`}
          open={isDetailDrawerOpen}
          onClose={() => { setIsDetailDrawerOpen(false); setSelectedBatch(null); }}
          size="large"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { activityForm.resetFields(); setIsActivityModalOpen(true); }}>
              Them hoat dong
            </Button>
          }
        >
          {selectedBatch && (
            <>
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Mã đợt">{selectedBatch.batchCode}</Descriptions.Item>
                <Descriptions.Item label="Trang thai">
                  <Tag color={STATUS_COLORS[selectedBatch.status]}>{STATUS_LABELS[selectedBatch.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tieu de" span={2}>{selectedBatch.title}</Descriptions.Item>
                <Descriptions.Item label="Co so tuyen duoi">{selectedBatch.targetFacility}</Descriptions.Item>
                <Descriptions.Item label="Loai hinh">
                  <Tag color={TYPE_COLORS[selectedBatch.guidanceType]}>{TYPE_LABELS[selectedBatch.guidanceType]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngay bat dau">
                  {selectedBatch.startDate ? dayjs(selectedBatch.startDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngay ket thuc">
                  {selectedBatch.endDate ? dayjs(selectedBatch.endDate).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Thành viên" span={2}>{selectedBatch.teamMembers || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngân sách">
                  {selectedBatch.budget ? selectedBatch.budget.toLocaleString() + ' d' : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Số hoạt động">{selectedBatch.activityCount || activities.length}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú" span={2}>{selectedBatch.notes || '-'}</Descriptions.Item>
              </Descriptions>

              <Title level={5}>Hoat dong chi dao tuyen</Title>
              <Spin spinning={activitiesLoading}>
                {activities.length > 0 ? (
                  <Timeline
                    items={activities.map((act) => ({
                      color: ACTIVITY_TYPE_COLORS[act.activityType] || 'blue',
                      content: (
                        <div>
                          <strong>{dayjs(act.activityDate).format('DD/MM/YYYY')}</strong>
                          {' - '}
                          <Tag color={ACTIVITY_TYPE_COLORS[act.activityType]}>
                            {ACTIVITY_TYPE_LABELS[act.activityType] || 'Khac'}
                          </Tag>
                          <div style={{ marginTop: 4 }}>{act.description}</div>
                          {act.staffName && <div style={{ color: '#666' }}>Người thực hiện: {act.staffName}</div>}
                          {act.result && <div style={{ color: '#52c41a' }}>Kết quả: {act.result}</div>}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>Chưa có hoạt động nào</div>
                )}
              </Spin>
            </>
          )}
        </Drawer>

        {/* Activity Create Modal */}
        <Modal
          title="Them hoat dong chi dao tuyen"
          open={isActivityModalOpen}
          onCancel={() => setIsActivityModalOpen(false)}
          onOk={handleAddActivity}
          okText="Them"
          cancelText="Hủy"
          confirmLoading={saving}
          destroyOnHidden
        >
          <Form form={activityForm} layout="vertical">
            <Form.Item
              name="activityType"
              label="Loại hoạt động"
              rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
            >
              <Select
                placeholder="Chọn loại hoạt động"
                options={[
                  { value: 0, label: 'Kham benh' },
                  { value: 1, label: 'Phau thuat' },
                  { value: 2, label: 'Dao tao' },
                  { value: 3, label: 'Hoi chan' },
                  { value: 4, label: 'Chuyen giao ky thuat' },
                  { value: 5, label: 'Ho tro vat tu' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="activityDate"
              label="Ngày thực hiện"
              rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mô tả hoạt động"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
            >
              <TextArea rows={3} placeholder="Mô tả chi tiết hoạt động..." />
            </Form.Item>
            <Form.Item name="staffName" label="Người thực hiện">
              <Input placeholder="Tên bác sĩ / chuyên gia" />
            </Form.Item>
            <Form.Item name="result" label="Kết quả">
              <TextArea rows={2} placeholder="Kết quả hoạt động (nếu có)..." />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú">
              <TextArea rows={2} placeholder="Ghi chú thêm..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default ClinicalGuidance;
